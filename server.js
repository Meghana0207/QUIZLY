require('dotenv').config();
const path = require('path');
const https = require('https');
const express = require('express');
const session = require('express-session');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const multer = require('multer');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && !process.env.SESSION_SECRET) throw new Error('SESSION_SECRET must be configured in production.');
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost', user: process.env.DB_USER || 'root',
  port: Number(process.env.DB_PORT || 3306),
  password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME || 'online_quiz_db',
  waitForConnections: true, connectionLimit: 10
});
app.use(express.json());
if (isProduction) app.set('trust proxy', 1);
app.use(session({ name: 'quizly.sid', secret: process.env.SESSION_SECRET || 'development-only-secret', resave: false, saveUninitialized: false, cookie: { httpOnly: true, sameSite: 'lax', secure: isProduction } }));
app.use(express.static(path.join(__dirname, 'public')));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const safeError = (status, message) => Object.assign(new Error(message), { status, safeMessage: message });

const generatedQuestionSchema = {
  name: 'quiz_questions',
  strict: true,
  schema: {
    type: 'object', additionalProperties: false, required: ['questions'],
    properties: {
      questions: {
        type: 'array',
        items: {
          type: 'object', additionalProperties: false, required: ['questionText', 'options', 'correctIndex'],
          properties: {
            questionText: { type: 'string' },
            options: { type: 'array', items: { type: 'string' }, minItems: 4, maxItems: 4 },
            correctIndex: { type: 'integer', minimum: 0, maximum: 3 }
          }
        }
      }
    }
  }
};

function normaliseQuestion(question) {
  const questionText = typeof question?.questionText === 'string' ? question.questionText.trim() : '';
  const options = Array.isArray(question?.options) ? question.options.map(option => typeof option === 'string' ? option.trim() : '') : [];
  const correctIndex = Number(question?.correctIndex);
  const marks = question?.marks === undefined ? 1 : Number(question.marks);
  if (!questionText || questionText.length > 10000 || options.length !== 4 || options.some(option => !option || option.length > 500) || new Set(options.map(option => option.toLowerCase())).size !== 4 || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3 || !Number.isInteger(marks) || marks < 1 || marks > 100) throw safeError(400, 'Each question needs text, four distinct options, and one correct answer.');
  return { questionText, options, correctIndex, marks };
}

function callOpenAI(requestBody) {
  return new Promise((resolve, reject) => {
    const request = https.request({ hostname: 'api.openai.com', path: '/v1/chat/completions', method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(requestBody) } }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; if (body.length > 1024 * 1024) request.destroy(safeError(502, 'The AI response was too large. Please try again.')); });
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          const message = response.statusCode === 401 || response.statusCode === 403 ? 'The AI service is not configured correctly.' : response.statusCode === 429 ? 'The AI service is busy. Please try again shortly.' : 'The AI service could not generate questions. Please try again.';
          return reject(safeError(response.statusCode === 429 ? 429 : 502, message));
        }
        try { resolve(JSON.parse(body)); } catch { reject(safeError(502, 'The AI service returned an unreadable response.')); }
      });
      response.on('error', () => reject(safeError(502, 'The AI service could not be reached. Please try again.')));
    });
    request.setTimeout(30000, () => request.destroy(safeError(504, 'The AI request timed out. Please try again.')));
    request.on('error', error => reject(error.safeMessage ? error : safeError(502, 'The AI service could not be reached. Please try again.')));
    request.write(requestBody);
    request.end();
  });
}

async function generateQuestionsWithAI({ subject, topic, count, difficulty }) {
  if (!process.env.OPENAI_API_KEY) throw safeError(503, 'AI question generation is not configured. Add OPENAI_API_KEY on the server.');
  const requestBody = JSON.stringify({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You create accurate educational multiple-choice quiz questions. Return only the requested JSON structure. Every question must have four distinct plausible options and exactly one correct option.' },
      { role: 'user', content: `Create exactly ${count} ${difficulty} multiple-choice questions for subject "${subject}" on the topic "${topic}". Do not include explanations.` }
    ],
    response_format: { type: 'json_schema', json_schema: generatedQuestionSchema },
    max_tokens: Math.min(4000, Math.max(800, count * 350))
  });
  const response = await callOpenAI(requestBody);
  const message = response.choices?.[0]?.message;
  if (message?.refusal || !message?.content) throw safeError(502, 'The AI service did not return usable questions. Please try again.');
  let generated;
  try { generated = JSON.parse(message.content); } catch { throw safeError(502, 'The AI response was not valid question data. Please try again.'); }
  if (!Array.isArray(generated.questions) || generated.questions.length !== count) throw safeError(502, 'The AI returned an incomplete question set. Please try again.');
  try { return generated.questions.map(normaliseQuestion); } catch { throw safeError(502, 'The AI returned incomplete questions. Please try again.'); }
}

const requireLogin = (req, res, next) => req.session.user ? next() : res.status(401).json({ message: 'Please log in first.' });
const requireAdmin = (req, res, next) => req.session.user?.role === 'admin' ? next() : res.status(403).json({ message: 'Admin access required.' });
const isBcryptHash = value => typeof value === 'string' && /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value);
const establishSession = (req, user) => new Promise((resolve, reject) => req.session.regenerate(error => {
  if (error) return reject(error);
  req.session.user = user;
  resolve();
}));

app.post('/api/auth/register', async (req, res) => {
  const { fullName, email, password } = req.body;
  if (!fullName || !email || !password || password.length < 6) return res.status(400).json({ message: 'Enter your name, email, and a password of at least 6 characters.' });
  try {
    const [result] = await pool.execute('INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)', [fullName.trim(), email.trim().toLowerCase(), await bcrypt.hash(password, 12)]);
    await establishSession(req, { id: result.insertId, name: fullName.trim(), role: 'student' });
    res.status(201).json({ user: req.session.user });
  } catch (error) { console.error('Registration failed:', error.code || error.message); res.status(error.code === 'ER_DUP_ENTRY' ? 409 : 500).json({ message: error.code === 'ER_DUP_ENTRY' ? 'This email is already registered.' : 'Could not create account.' }); }
});
app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [(req.body.email || '').trim().toLowerCase()]);
  const user = rows[0];
  if (!user || !isBcryptHash(user.password_hash) || !(await bcrypt.compare(req.body.password || '', user.password_hash))) return res.status(401).json({ message: 'Invalid email or password.' });
  await establishSession(req, { id: user.user_id, name: user.full_name, role: user.role });
  res.json({ user: req.session.user });
}));
app.post('/api/auth/logout', (req, res, next) => req.session.destroy(error => {
  if (error) return next(error);
  res.clearCookie('quizly.sid', { httpOnly: true, sameSite: 'lax', secure: isProduction });
  res.json({ ok: true });
}));
app.get('/api/auth/me', (req, res) => res.json({ user: req.session.user || null }));

app.get('/api/quizzes', requireLogin, asyncRoute(async (req, res) => {
  const admin = req.session.user.role === 'admin';
  const [rows] = await pool.execute(`SELECT q.quiz_id, q.title, q.description, q.duration_minutes, q.is_published, q.created_at, COUNT(DISTINCT qu.question_id) AS question_count
    FROM quizzes q LEFT JOIN questions qu ON qu.quiz_id = q.quiz_id ${admin ? '' : 'WHERE q.is_published = TRUE'} GROUP BY q.quiz_id ORDER BY q.created_at DESC`);
  res.json(rows);
}));
app.post('/api/quizzes', requireAdmin, asyncRoute(async (req, res) => {
  const { title, description, durationMinutes } = req.body;
  if (!title) return res.status(400).json({ message: 'Quiz title is required.' });
  const [result] = await pool.execute('INSERT INTO quizzes (title, description, duration_minutes, created_by) VALUES (?, ?, ?, ?)', [title.trim(), description?.trim() || null, Math.max(1, Number(durationMinutes) || 10), req.session.user.id]);
  res.status(201).json({ quizId: result.insertId });
}));
app.patch('/api/quizzes/:quizId/publish', requireAdmin, asyncRoute(async (req, res) => {
  const [result] = await pool.execute('UPDATE quizzes SET is_published = ? WHERE quiz_id = ?', [req.body.isPublished ? 1 : 0, req.params.quizId]);
  if (!result.affectedRows) return res.status(404).json({ message: 'Quiz not found.' });
  res.json({ ok: true });
}));
app.get('/api/quizzes/:quizId/questions', requireAdmin, asyncRoute(async (req, res) => {
  const [questions] = await pool.execute('SELECT * FROM questions WHERE quiz_id = ? ORDER BY display_order, question_id', [req.params.quizId]);
  for (const q of questions) [q.options] = await pool.execute('SELECT option_id, option_text, is_correct FROM options WHERE question_id = ?', [q.question_id]);
  res.json(questions);
}));
app.post('/api/quizzes/:quizId/questions', requireAdmin, asyncRoute(async (req, res) => {
  const { questionText, marks, options, correctIndex } = req.body;
  if (!questionText || !Array.isArray(options) || options.length < 2 || correctIndex < 0 || correctIndex >= options.length || options.some(o => !String(o).trim())) return res.status(400).json({ message: 'Add a question, at least two options, and one correct answer.' });
  const conn = await pool.getConnection();
  try { await conn.beginTransaction(); const [[order]] = await conn.execute('SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM questions WHERE quiz_id = ?', [req.params.quizId]);
    const [question] = await conn.execute('INSERT INTO questions (quiz_id, question_text, marks, display_order) VALUES (?, ?, ?, ?)', [req.params.quizId, questionText.trim(), Math.max(1, Number(marks) || 1), order.next_order]);
    for (let i = 0; i < options.length; i++) await conn.execute('INSERT INTO options (question_id, option_text, is_correct) VALUES (?, ?, ?)', [question.insertId, options[i].trim(), i === Number(correctIndex)]);
    await conn.commit(); res.status(201).json({ ok: true });
  } catch (e) { await conn.rollback(); res.status(500).json({ message: 'Could not save question.' }); } finally { conn.release(); }
}));

app.post('/api/quizzes/:quizId/questions/generate', requireAdmin, asyncRoute(async (req, res) => {
  const subject = typeof req.body.subject === 'string' ? req.body.subject.trim() : '';
  const topic = typeof req.body.topic === 'string' ? req.body.topic.trim() : '';
  const count = Number(req.body.count);
  const difficulty = req.body.difficulty;
  if (!subject || subject.length > 100 || !topic || topic.length > 250 || !Number.isInteger(count) || count < 1 || count > 10 || !['Easy', 'Medium', 'Hard'].includes(difficulty)) return res.status(400).json({ message: 'Provide a subject, topic, 1–10 questions, and a valid difficulty.' });
  const [[quiz]] = await pool.execute('SELECT quiz_id FROM quizzes WHERE quiz_id = ?', [req.params.quizId]);
  if (!quiz) return res.status(404).json({ message: 'Quiz not found.' });
  const questions = await generateQuestionsWithAI({ subject, topic, count, difficulty });
  res.json({ questions });
}));

app.post('/api/quizzes/:quizId/questions/bulk', requireAdmin, asyncRoute(async (req, res) => {
  if (!Array.isArray(req.body.questions) || !req.body.questions.length || req.body.questions.length > 20) return res.status(400).json({ message: 'Select 1–20 reviewed questions to save.' });
  const questions = req.body.questions.map(normaliseQuestion);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[quiz]] = await conn.execute('SELECT quiz_id FROM quizzes WHERE quiz_id = ?', [req.params.quizId]);
    if (!quiz) throw safeError(404, 'Quiz not found.');
    const [[order]] = await conn.execute('SELECT COALESCE(MAX(display_order), 0) AS last_order FROM questions WHERE quiz_id = ?', [req.params.quizId]);
    for (let index = 0; index < questions.length; index++) {
      const question = questions[index];
      const [result] = await conn.execute('INSERT INTO questions (quiz_id, question_text, marks, display_order) VALUES (?, ?, ?, ?)', [req.params.quizId, question.questionText, question.marks, order.last_order + index + 1]);
      for (let optionIndex = 0; optionIndex < question.options.length; optionIndex++) await conn.execute('INSERT INTO options (question_id, option_text, is_correct) VALUES (?, ?, ?)', [result.insertId, question.options[optionIndex], optionIndex === question.correctIndex]);
    }
    await conn.commit();
    res.status(201).json({ saved: questions.length });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}));

function parseCsv(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) { const char = text[i], next = text[i + 1];
    if (char === '"' && quoted && next === '"') { cell += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(cell.trim()); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) { if (char === '\r' && next === '\n') i++; row.push(cell.trim()); if (row.some(v => v)) rows.push(row); row = []; cell = ''; }
    else cell += char;
  }
  row.push(cell.trim()); if (row.some(v => v)) rows.push(row);
  return rows;
}
app.post('/api/quizzes/:quizId/questions/import', requireAdmin, upload.single('questionsFile'), asyncRoute(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Choose a CSV file first.' });
  const rows = parseCsv(req.file.buffer.toString('utf8').replace(/^\uFEFF/, ''));
  const headers = rows.shift()?.map(h => h.toLowerCase().replace(/\s+/g, '_'));
  const required = ['question', 'option_1', 'option_2', 'option_3', 'option_4', 'correct_option'];
  if (!headers || required.some(h => !headers.includes(h))) return res.status(400).json({ message: 'CSV headers must be: question, option_1, option_2, option_3, option_4, correct_option, marks.' });
  const index = Object.fromEntries(headers.map((h, i) => [h, i]));
  const questions = rows.map((row, i) => ({ text: row[index.question], options: [row[index.option_1], row[index.option_2], row[index.option_3], row[index.option_4]], correct: Number(row[index.correct_option]), marks: Number(row[index.marks] || 1), line: i + 2 }));
  if (!questions.length || questions.some(q => !q.text || q.options.some(o => !o) || !Number.isInteger(q.correct) || q.correct < 1 || q.correct > 4 || !Number.isInteger(q.marks) || q.marks < 1)) return res.status(400).json({ message: 'Check each CSV row: all four options are required, correct_option must be 1-4, and marks must be at least 1.' });
  const conn = await pool.getConnection();
  try { await conn.beginTransaction(); const [[exists]] = await conn.execute('SELECT quiz_id FROM quizzes WHERE quiz_id = ?', [req.params.quizId]); if (!exists) throw new Error('Quiz not found.');
    const [[order]] = await conn.execute('SELECT COALESCE(MAX(display_order), 0) AS last_order FROM questions WHERE quiz_id = ?', [req.params.quizId]);
    for (let n = 0; n < questions.length; n++) { const q = questions[n]; const [question] = await conn.execute('INSERT INTO questions (quiz_id, question_text, marks, display_order) VALUES (?, ?, ?, ?)', [req.params.quizId, q.text, q.marks, order.last_order + n + 1]);
      for (let i = 0; i < 4; i++) await conn.execute('INSERT INTO options (question_id, option_text, is_correct) VALUES (?, ?, ?)', [question.insertId, q.options[i], i + 1 === q.correct]); }
    await conn.commit(); res.status(201).json({ message: `${questions.length} questions uploaded.` });
  } catch (error) { await conn.rollback(); res.status(400).json({ message: error.message || 'Could not upload questions.' }); } finally { conn.release(); }
}));

async function closeExpiredAttempt(conn, attemptId, quizId) {
  const [questions] = await conn.execute('SELECT question_id, marks FROM questions WHERE quiz_id = ?', [quizId]);
  const totalMarks = questions.reduce((total, question) => total + question.marks, 0);
  await conn.execute('INSERT INTO answers (attempt_id, question_id, selected_option_id, is_correct) SELECT ?, question_id, NULL, FALSE FROM questions WHERE quiz_id = ?', [attemptId, quizId]);
  await conn.execute('UPDATE attempts SET submitted_at = NOW(), score = 0, total_marks = ?, status = "submitted" WHERE attempt_id = ? AND status = "in_progress"', [totalMarks, attemptId]);
  return totalMarks;
}

app.get('/api/quizzes/:quizId/attempt', requireLogin, asyncRoute(async (req, res) => {
  const [[quiz]] = await pool.execute('SELECT quiz_id, title, description, duration_minutes FROM quizzes WHERE quiz_id = ? AND is_published = TRUE', [req.params.quizId]);
  if (!quiz) return res.status(404).json({ message: 'Quiz is not available.' });
  const [questions] = await pool.execute('SELECT question_id, question_text, marks, display_order FROM questions WHERE quiz_id = ? ORDER BY display_order', [quiz.quiz_id]);
  for (const q of questions) [q.options] = await pool.execute('SELECT option_id, option_text FROM options WHERE question_id = ?', [q.question_id]);
  if (!questions.length) return res.json({ quiz, questions });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[activeAttempt]] = await conn.execute(`SELECT attempt_id, started_at, TIMESTAMPADD(MINUTE, ?, started_at) AS deadline_at,
      NOW() > TIMESTAMPADD(MINUTE, ?, started_at) AS is_expired FROM attempts
      WHERE quiz_id = ? AND user_id = ? AND status = "in_progress" ORDER BY started_at DESC LIMIT 1 FOR UPDATE`, [quiz.duration_minutes, quiz.duration_minutes, quiz.quiz_id, req.session.user.id]);
    if (activeAttempt?.is_expired) await closeExpiredAttempt(conn, activeAttempt.attempt_id, quiz.quiz_id);
    let attempt = activeAttempt?.is_expired ? null : activeAttempt;
    if (!attempt) {
      const [result] = await conn.execute('INSERT INTO attempts (quiz_id, user_id, started_at, status) VALUES (?, ?, NOW(), "in_progress")', [quiz.quiz_id, req.session.user.id]);
      [[attempt]] = await conn.execute('SELECT attempt_id, started_at, TIMESTAMPADD(MINUTE, ?, started_at) AS deadline_at FROM attempts WHERE attempt_id = ?', [quiz.duration_minutes, result.insertId]);
    }
    await conn.commit();
    res.json({ quiz, questions, attempt: { attemptId: attempt.attempt_id, startedAt: attempt.started_at, deadlineAt: attempt.deadline_at } });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}));
app.post('/api/quizzes/:quizId/submit', requireLogin, asyncRoute(async (req, res) => {
  const attemptId = Number(req.body.attemptId);
  if (!Number.isInteger(attemptId) || attemptId < 1) return res.status(400).json({ message: 'A valid attempt is required.' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[attempt]] = await conn.execute(`SELECT a.attempt_id, a.status, q.quiz_id, q.is_published,
      NOW() > TIMESTAMPADD(MINUTE, q.duration_minutes, a.started_at) AS is_expired
      FROM attempts a JOIN quizzes q ON q.quiz_id = a.quiz_id
      WHERE a.attempt_id = ? AND a.quiz_id = ? AND a.user_id = ? FOR UPDATE`, [attemptId, req.params.quizId, req.session.user.id]);
    if (!attempt) {
      await conn.rollback();
      return res.status(404).json({ message: 'Attempt not found.' });
    }
    if (!attempt.is_published) {
      await conn.rollback();
      return res.status(404).json({ message: 'Quiz is not available.' });
    }
    if (attempt.status !== 'in_progress') {
      await conn.rollback();
      return res.status(409).json({ message: 'This attempt has already been submitted.' });
    }
    if (attempt.is_expired) {
      const totalMarks = await closeExpiredAttempt(conn, attempt.attempt_id, attempt.quiz_id);
      await conn.commit();
      return res.status(410).json({ message: 'Time expired. This attempt was submitted with a score of zero.', expired: true, attemptId: attempt.attempt_id, score: 0, totalMarks });
    }
    const [questions] = await conn.execute('SELECT question_id, marks FROM questions WHERE quiz_id = ?', [attempt.quiz_id]);
    const totalMarks = questions.reduce((total, question) => total + question.marks, 0);
    let score = 0;
    for (const question of questions) { const selected = req.body.answers?.[question.question_id] || null; let correct = false;
      if (selected) { const [[option]] = await conn.execute('SELECT is_correct FROM options WHERE option_id = ? AND question_id = ?', [selected, question.question_id]); correct = Boolean(option?.is_correct); }
      if (correct) score += question.marks;
      await conn.execute('INSERT INTO answers (attempt_id, question_id, selected_option_id, is_correct) VALUES (?, ?, ?, ?)', [attempt.attempt_id, question.question_id, selected, correct]);
    }
    await conn.execute('UPDATE attempts SET submitted_at = NOW(), score = ?, total_marks = ?, status = "submitted" WHERE attempt_id = ?', [score, totalMarks, attempt.attempt_id]);
    await conn.commit();
    res.json({ attemptId: attempt.attempt_id, score, totalMarks });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}));
app.get('/api/results', requireLogin, asyncRoute(async (req, res) => { const [rows] = await pool.execute('SELECT a.attempt_id, q.title, a.score, a.total_marks, a.submitted_at FROM attempts a JOIN quizzes q ON q.quiz_id = a.quiz_id WHERE a.user_id = ? AND a.status = "submitted" ORDER BY a.submitted_at DESC', [req.session.user.id]); res.json(rows); }));
app.get('/api/stats', requireLogin, asyncRoute(async (req, res) => {
  const [[stats]] = await pool.execute('SELECT COUNT(*) AS attempt_count, COALESCE(ROUND(AVG(CASE WHEN total_marks > 0 THEN score / total_marks * 100 END), 1), 0) AS average_score FROM attempts WHERE user_id = ? AND status = "submitted"', [req.session.user.id]);
  res.json({ attemptCount: Number(stats.attempt_count), averageScore: Number(stats.average_score) });
}));
app.get('/api/admin/results', requireAdmin, asyncRoute(async (req, res) => { const [rows] = await pool.execute('SELECT u.full_name, u.email, q.title, a.score, a.total_marks, a.submitted_at FROM attempts a JOIN users u ON u.user_id = a.user_id JOIN quizzes q ON q.quiz_id = a.quiz_id WHERE a.status = "submitted" ORDER BY a.submitted_at DESC'); res.json(rows); }));

app.use((error, req, res, next) => {
  console.error('Request failed:', error.code || 'unexpected_error');
  if (res.headersSent) return next(error);
  if (error instanceof multer.MulterError) return res.status(400).json({ message: 'The uploaded file could not be processed.' });
  if (error.safeMessage) return res.status(error.status || 500).json({ message: error.safeMessage });
  res.status(500).json({ message: 'Unable to complete the request. Please try again.' });
});

app.get('*', (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(process.env.PORT || 3000, () => console.log(`Quiz app: http://localhost:${process.env.PORT || 3000}`));
