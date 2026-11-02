
require('dotenv').config();
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const multer = require('multer');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET must be configured in production.');
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  port: Number(process.env.DB_PORT || 3306),
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'online_quiz_db',
  waitForConnections: true,
  connectionLimit: 10
});

app.use(express.json());

if (isProduction) app.set('trust proxy', 1);

app.use(session({
  name: 'quizly.sid',
  secret: process.env.SESSION_SECRET || 'development-only-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction
  }
}));

app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }
});

const asyncRoute = handler => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const safeError = (status, message) =>
  Object.assign(new Error(message), {
    status,
    safeMessage: message
  });

const generatedQuestionSchema = {
  name: 'quiz_questions',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['questions'],
    properties: {
      questions: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['questionText', 'options', 'correctIndex'],
          properties: {
            questionText: { type: 'string' },
            options: {
              type: 'array',
              items: { type: 'string' },
              minItems: 4,
              maxItems: 4
            },
            correctIndex: {
              type: 'integer',
              minimum: 0,
              maximum: 3
            }
          }
        }
      }
    }
  }
};

function normaliseQuestion(question) {
  const questionText =
    typeof question?.questionText === 'string'
      ? question.questionText.trim()
      : '';

  const options = Array.isArray(question?.options)
    ? question.options.map(option =>
        typeof option === 'string' ? option.trim() : ''
      )
    : [];

  const correctIndex = Number(question?.correctIndex);
  const marks =
    question?.marks === undefined ? 1 : Number(question.marks);

  if (
    !questionText ||
    questionText.length > 10000 ||
    options.length !== 4 ||
    options.some(option => !option || option.length > 500) ||
    new Set(options.map(option => option.toLowerCase())).size !== 4 ||
    !Number.isInteger(correctIndex) ||
    correctIndex < 0 ||
    correctIndex > 3 ||
    !Number.isInteger(marks) ||
    marks < 1 ||
    marks > 100
  ) {
    throw safeError(
      400,
      'Each question needs text, four distinct options, and one correct answer.'
    );
  }

  return { questionText, options, correctIndex, marks };
}

const quizDifficulties = [
  'beginner', 'intermediate', 'advanced', 'easy', 'medium', 'difficult', 'full_mock'
];
const quizPresetDefaults = {
  beginner: { targetQuestionCount: 10, durationMinutes: 10 },
  easy: { targetQuestionCount: 10, durationMinutes: 10 },
  intermediate: { targetQuestionCount: 15, durationMinutes: 20 },
  medium: { targetQuestionCount: 15, durationMinutes: 20 },
  advanced: { targetQuestionCount: 20, durationMinutes: 30 },
  difficult: { targetQuestionCount: 20, durationMinutes: 30 },
  full_mock: { targetQuestionCount: 40, durationMinutes: 60 }
};
const questionTypes = ['multiple_choice', 'true_false', 'code_output'];
const categoryIconKeys = new Set([
  'java', 'database', 'algorithm', 'network', 'system', 'aptitude', 'career', 'globe'
]);

function normaliseQuestionDraft(body) {
  const questionText = typeof body.questionText === 'string'
    ? body.questionText.trim()
    : '';
  const questionType = body.questionType || 'multiple_choice';
  const correctIndex = Number(body.correctIndex);
  const marks = Number(body.marks ?? 1);
  const explanation = typeof body.explanation === 'string'
    ? body.explanation.trim()
    : '';
  const options = questionType === 'true_false'
    ? ['True', 'False']
    : Array.isArray(body.options)
      ? body.options.map(option => typeof option === 'string' ? option.trim() : '')
      : [];

  if (
    !questionText ||
    questionText.length > 10000 ||
    !questionTypes.includes(questionType) ||
    options.length < 2 ||
    options.length > 8 ||
    options.some(option => !option || option.length > 500) ||
    new Set(options.map(option => option.toLowerCase())).size !== options.length ||
    !Number.isInteger(correctIndex) ||
    correctIndex < 0 ||
    correctIndex >= options.length ||
    !Number.isInteger(marks) ||
    marks < 1 ||
    marks > 100 ||
    explanation.length > 5000
  ) {
    throw safeError(400, 'Add a question, valid options, one correct answer, marks, and a valid explanation.');
  }

  return { questionText, questionType, options, correctIndex, marks, explanation };
}

function makeSlug(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function callOpenAI(requestBody) {
  return new Promise((resolve, reject) => {
    const request = https.request({
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    }, response => {
      let body = '';

      response.setEncoding('utf8');

      response.on('data', chunk => {
        body += chunk;

        if (body.length > 1024 * 1024) {
          request.destroy(
            safeError(502, 'The AI response was too large. Please try again.')
          );
        }
      });

      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          const message =
            response.statusCode === 401 || response.statusCode === 403
              ? 'The AI service is not configured correctly.'
              : response.statusCode === 429
                ? 'The AI service is busy. Please try again shortly.'
                : 'The AI service could not generate questions. Please try again.';

          return reject(
            safeError(response.statusCode === 429 ? 429 : 502, message)
          );
        }

        try {
          resolve(JSON.parse(body));
        } catch {
          reject(safeError(502, 'The AI service returned an unreadable response.'));
        }
      });

      response.on('error', () =>
        reject(safeError(502, 'The AI service could not be reached. Please try again.'))
      );
    });

    request.setTimeout(30000, () =>
      request.destroy(
        safeError(504, 'The AI request timed out. Please try again.')
      )
    );

    request.on('error', error =>
      reject(
        error.safeMessage
          ? error
          : safeError(502, 'The AI service could not be reached. Please try again.')
      )
    );

    request.write(requestBody);
    request.end();
  });
}

async function generateQuestionsWithAI({
  subject,
  topic,
  count,
  difficulty
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw safeError(
      503,
      'AI question generation is not configured. Add OPENAI_API_KEY on the server.'
    );
  }

  const requestBody = JSON.stringify({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You create accurate educational multiple-choice quiz questions. Return only the requested JSON structure. Every question must have four distinct plausible options and exactly one correct option.'
      },
      {
        role: 'user',
        content:
          `Create exactly ${count} ${difficulty} multiple-choice questions for subject "${subject}" on the topic "${topic}". Do not include explanations.`
      }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: generatedQuestionSchema
    },
    max_tokens: Math.min(4000, Math.max(800, count * 350))
  });

  const response = await callOpenAI(requestBody);
  const message = response.choices?.[0]?.message;

  if (message?.refusal || !message?.content) {
    throw safeError(
      502,
      'The AI service did not return usable questions. Please try again.'
    );
  }

  let generated;

  try {
    generated = JSON.parse(message.content);
  } catch {
    throw safeError(502, 'The AI response was not valid question data. Please try again.');
  }

  if (
    !Array.isArray(generated.questions) ||
    generated.questions.length !== count
  ) {
    throw safeError(502, 'The AI returned an incomplete question set. Please try again.');
  }

  try {
    return generated.questions.map(normaliseQuestion);
  } catch {
    throw safeError(502, 'The AI returned incomplete questions. Please try again.');
  }
}

const requireLogin = (req, res, next) =>
  req.session.user
    ? next()
    : res.status(401).json({ message: 'Please log in first.' });

const requireAdmin = (req, res, next) =>
  req.session.user?.role === 'admin'
    ? next()
    : res.status(403).json({ message: 'Admin access required.' });

const isBcryptHash = value =>
  typeof value === 'string' &&
  /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value);

const establishSession = (req, user) =>
  new Promise((resolve, reject) =>
    req.session.regenerate(error => {
      if (error) return reject(error);
      req.session.user = user;
      resolve();
    })
  );

// ===============================
// AUTHENTICATION
// ===============================

app.post('/api/auth/register', async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password || password.length < 6) {
    return res.status(400).json({
      message: 'Enter your name, email, and a password of at least 6 characters.'
    });
  }

  try {
    const [result] = await pool.execute(
      'INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)',
      [
        fullName.trim(),
        email.trim().toLowerCase(),
        await bcrypt.hash(password, 12)
      ]
    );

    await establishSession(req, {
      id: result.insertId,
      name: fullName.trim(),
      role: 'student'
    });

    res.status(201).json({ user: req.session.user });
  } catch (error) {
    console.error('Registration failed:', error.code || error.message);

    res.status(error.code === 'ER_DUP_ENTRY' ? 409 : 500).json({
      message:
        error.code === 'ER_DUP_ENTRY'
          ? 'This email is already registered.'
          : 'Could not create account.'
    });
  }
});

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE email = ?',
    [(req.body.email || '').trim().toLowerCase()]
  );

  const user = rows[0];

  if (
    !user ||
    !isBcryptHash(user.password_hash) ||
    !(await bcrypt.compare(req.body.password || '', user.password_hash))
  ) {
    return res.status(401).json({
      message: 'Invalid email or password.'
    });
  }

  await establishSession(req, {
    id: user.user_id,
    name: user.full_name,
    role: user.role
  });

  res.json({ user: req.session.user });
}));

app.post('/api/auth/logout', (req, res, next) =>
  req.session.destroy(error => {
    if (error) return next(error);

    res.clearCookie('quizly.sid', {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction
    });

    res.json({ ok: true });
  })
);

app.get('/api/auth/me', (req, res) =>
  res.json({ user: req.session.user || null })
);

// ===============================
// QUIZ LIST AND CREATION
// ===============================

app.get('/api/categories', requireLogin, asyncRoute(async (req, res) => {
  const admin = req.session.user.role === 'admin';
  const quizVisibility = admin ? '' : 'AND q.is_published = TRUE';
  const [categories] = await pool.query(`
    SELECT c.category_id, c.name, c.slug, c.description, c.icon, c.sort_order,
      COUNT(DISTINCT q.quiz_id) AS quiz_count,
      COUNT(DISTINCT CASE WHEN q.difficulty IN ('beginner', 'easy') THEN q.quiz_id END) AS easy_count,
      COUNT(DISTINCT CASE WHEN q.difficulty IN ('intermediate', 'medium') THEN q.quiz_id END) AS medium_count,
      COUNT(DISTINCT CASE WHEN q.difficulty IN ('advanced', 'difficult') THEN q.quiz_id END) AS difficult_count,
      COUNT(DISTINCT CASE WHEN q.difficulty = 'full_mock' THEN q.quiz_id END) AS full_mock_count
    FROM categories c
    LEFT JOIN quizzes q ON q.category_id = c.category_id ${quizVisibility}
    GROUP BY c.category_id
    ORDER BY c.sort_order, c.name
  `);
  const [topics] = await pool.query(`
    SELECT t.topic_id, t.category_id, t.name,
      COUNT(DISTINCT q.quiz_id) AS quiz_count
    FROM topics t
    LEFT JOIN quizzes q ON q.topic_id = t.topic_id ${quizVisibility}
    GROUP BY t.topic_id
    ORDER BY t.name
  `);

  res.json(categories.map(category => ({
    ...category,
    topics: topics.filter(topic => topic.category_id === category.category_id)
  })));
}));

app.post('/api/categories', requireAdmin, asyncRoute(async (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const description = typeof req.body.description === 'string'
    ? req.body.description.trim()
    : '';
  const icon = req.body.icon;
  const sortOrder = Number(req.body.sortOrder ?? 0);
  const slug = makeSlug(name);

  if (
    !name || name.length > 120 || !slug ||
    !description || description.length > 500 ||
    !categoryIconKeys.has(icon) ||
    !Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10000
  ) {
    return res.status(400).json({
      message: 'Provide a category name, description, supported icon, and valid order.'
    });
  }

  try {
    const [result] = await pool.execute(
      'INSERT INTO categories (name, slug, description, icon, sort_order) VALUES (?, ?, ?, ?, ?)',
      [name, slug, description, icon, sortOrder]
    );

    res.status(201).json({ categoryId: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw safeError(409, 'A category with this name already exists.');
    }
    throw error;
  }
}));

app.post('/api/categories/:categoryId/topics', requireAdmin, asyncRoute(async (req, res) => {
  const categoryId = Number(req.params.categoryId);
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';

  if (!Number.isInteger(categoryId) || categoryId < 1 || !name || name.length > 120) {
    return res.status(400).json({ message: 'Provide a valid category and topic name.' });
  }

  const [[category]] = await pool.execute(
    'SELECT category_id FROM categories WHERE category_id = ?',
    [categoryId]
  );
  if (!category) return res.status(404).json({ message: 'Category not found.' });

  try {
    const [result] = await pool.execute(
      'INSERT INTO topics (category_id, name) VALUES (?, ?)',
      [categoryId, name]
    );

    res.status(201).json({ topicId: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw safeError(409, 'This topic already exists in the category.');
    }
    throw error;
  }
}));

app.get('/api/quizzes', requireLogin, asyncRoute(async (req, res) => {
  const admin = req.session.user.role === 'admin';

  const [rows] = await pool.execute(`
    SELECT
      q.quiz_id,
      q.title,
      q.description,
      q.duration_minutes,
      q.is_published,
      q.created_at,
      q.category_id,
      q.topic_id,
      q.difficulty,
      q.target_question_count,
      c.name AS category_name,
      t.name AS topic_name,
      COUNT(DISTINCT qu.question_id) AS question_count
    FROM quizzes q
    LEFT JOIN questions qu ON qu.quiz_id = q.quiz_id
    LEFT JOIN categories c ON c.category_id = q.category_id
    LEFT JOIN topics t ON t.topic_id = q.topic_id
    ${admin ? '' : 'WHERE q.is_published = TRUE'}
    GROUP BY q.quiz_id, c.name, t.name
    ORDER BY q.created_at DESC
  `);

  res.json(rows);
}));

app.post('/api/quizzes', requireAdmin, asyncRoute(async (req, res) => {
  const { title, description, durationMinutes } = req.body;
  const categoryId = req.body.categoryId === undefined || req.body.categoryId === ''
    ? null
    : Number(req.body.categoryId);
  const topicId = req.body.topicId === undefined || req.body.topicId === ''
    ? null
    : Number(req.body.topicId);
  const difficulty = req.body.difficulty || null;
  const preset = quizPresetDefaults[difficulty];
  const targetQuestionCount = req.body.targetQuestionCount === undefined || req.body.targetQuestionCount === ''
    ? preset?.targetQuestionCount ?? null
    : Number(req.body.targetQuestionCount);

  if (!title) {
    return res.status(400).json({
      message: 'Quiz title is required.'
    });
  }

  const duration = Number(durationMinutes ?? preset?.durationMinutes ?? 10);

  if (!Number.isInteger(duration) || duration < 1 || duration > 180) {
    return res.status(400).json({
      message: 'Duration must be between 1 and 180 minutes.'
    });
  }

  if (
    (categoryId !== null && (!Number.isInteger(categoryId) || categoryId < 1)) ||
    (topicId !== null && (!Number.isInteger(topicId) || topicId < 1)) ||
    (difficulty !== null && !quizDifficulties.includes(difficulty)) ||
    (targetQuestionCount !== null && (!Number.isInteger(targetQuestionCount) || targetQuestionCount < 1 || targetQuestionCount > 200))
  ) {
    return res.status(400).json({ message: 'Choose a valid category, topic, and difficulty.' });
  }

  if (categoryId !== null) {
    const [[category]] = await pool.execute(
      'SELECT category_id FROM categories WHERE category_id = ?',
      [categoryId]
    );
    if (!category) return res.status(400).json({ message: 'Choose an existing category.' });
  }

  if (topicId !== null) {
    const [[topic]] = await pool.execute(
      'SELECT topic_id FROM topics WHERE topic_id = ? AND category_id = ?',
      [topicId, categoryId]
    );
    if (!topic) return res.status(400).json({ message: 'Choose a topic in the selected category.' });
  }

  const [result] = await pool.execute(
    `INSERT INTO quizzes
      (title, description, duration_minutes, created_by, category_id, topic_id, difficulty, target_question_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title.trim(),
      description?.trim() || null,
      duration,
      req.session.user.id,
      categoryId,
      topicId,
      difficulty,
      targetQuestionCount
    ]
  );

  res.status(201).json({ quizId: result.insertId });
}));

// =========================================
// ADMIN: UPDATE EXISTING QUIZ DURATION
// =========================================

app.patch(
  '/api/quizzes/:quizId/duration',
  requireAdmin,
  asyncRoute(async (req, res) => {
    const quizId = Number(req.params.quizId);
    const duration = Number(req.body.durationMinutes);
    const targetQuestionCount = req.body.targetQuestionCount === undefined || req.body.targetQuestionCount === ''
      ? null
      : Number(req.body.targetQuestionCount);

    if (!Number.isInteger(quizId) || quizId < 1) {
      return res.status(400).json({
        message: 'Invalid quiz ID.'
      });
    }

    if (!Number.isInteger(duration) || duration < 1 || duration > 180) {
      return res.status(400).json({
        message: 'Duration must be between 1 and 180 minutes.'
      });
    }

    if (
      targetQuestionCount !== null &&
      (!Number.isInteger(targetQuestionCount) || targetQuestionCount < 1 || targetQuestionCount > 200)
    ) {
      return res.status(400).json({
        message: 'Target question count must be between 1 and 200.'
      });
    }

    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      // Lock this quiz while checking and updating its duration.
      const [[quiz]] = await conn.execute(
        'SELECT quiz_id FROM quizzes WHERE quiz_id = ? FOR UPDATE',
        [quizId]
      );

      if (!quiz) {
        await conn.rollback();

        return res.status(404).json({
          message: 'Quiz not found.'
        });
      }

      // Do not change the duration while an attempt is in progress.
      const [[active]] = await conn.execute(
        `SELECT attempt_id
         FROM attempts
         WHERE quiz_id = ? AND status = 'in_progress'
         LIMIT 1`,
        [quizId]
      );

      if (active) {
        await conn.rollback();

        return res.status(409).json({
          message: 'A student is currently attempting this quiz. Try again after the active attempt is submitted or expires.'
        });
      }

      await conn.execute(
        `UPDATE quizzes
         SET duration_minutes = ?, target_question_count = COALESCE(?, target_question_count)
         WHERE quiz_id = ?`,
        [duration, targetQuestionCount, quizId]
      );

      await conn.commit();

      res.json({
        message: 'Quiz duration updated successfully.',
        quizId,
        durationMinutes: duration,
        targetQuestionCount
      });
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  })
);

app.patch('/api/quizzes/:quizId/metadata', requireAdmin, asyncRoute(async (req, res) => {
  const quizId = Number(req.params.quizId);
  const categoryId = Number(req.body.categoryId);
  const topicId = req.body.topicId === undefined || req.body.topicId === ''
    ? null
    : Number(req.body.topicId);
  const difficulty = req.body.difficulty;

  if (
    !Number.isInteger(quizId) || quizId < 1 ||
    !Number.isInteger(categoryId) || categoryId < 1 ||
    (topicId !== null && (!Number.isInteger(topicId) || topicId < 1)) ||
    !quizDifficulties.includes(difficulty)
  ) {
    return res.status(400).json({ message: 'Choose a category, topic, and difficulty.' });
  }

  const [[category]] = await pool.execute(
    'SELECT category_id FROM categories WHERE category_id = ?',
    [categoryId]
  );
  if (!category) return res.status(400).json({ message: 'Choose an existing category.' });

  if (topicId !== null) {
    const [[topic]] = await pool.execute(
      'SELECT topic_id FROM topics WHERE topic_id = ? AND category_id = ?',
      [topicId, categoryId]
    );
    if (!topic) return res.status(400).json({ message: 'Choose a topic in the selected category.' });
  }

  const [result] = await pool.execute(
    'UPDATE quizzes SET category_id = ?, topic_id = ?, difficulty = ? WHERE quiz_id = ?',
    [categoryId, topicId, difficulty, quizId]
  );
  if (!result.affectedRows) return res.status(404).json({ message: 'Quiz not found.' });

  res.json({ ok: true, quizId, categoryId, topicId, difficulty });
}));

app.patch('/api/quizzes/:quizId/publish', requireAdmin, asyncRoute(async (req, res) => {
  const quizId = Number(req.params.quizId);
  if (!Number.isInteger(quizId) || quizId < 1) {
    return res.status(400).json({ message: 'Invalid quiz ID.' });
  }

  const [[quiz]] = await pool.execute(
    `SELECT q.target_question_count, COUNT(question.question_id) AS question_count
     FROM quizzes q
     LEFT JOIN questions question ON question.quiz_id = q.quiz_id
     WHERE q.quiz_id = ?
     GROUP BY q.quiz_id`,
    [quizId]
  );
  if (!quiz) return res.status(404).json({ message: 'Quiz not found.' });

  const isPublished = Boolean(req.body.isPublished);
  if (
    isPublished && quiz.target_question_count &&
    Number(quiz.question_count) < Number(quiz.target_question_count)
  ) {
    return res.status(409).json({
      message: `Add at least ${quiz.target_question_count} questions before publishing this quiz.`
    });
  }

  await pool.execute(
    'UPDATE quizzes SET is_published = ? WHERE quiz_id = ?',
    [isPublished ? 1 : 0, quizId]
  );

  res.json({ ok: true });
}));

// ===============================
// ADMIN: QUESTIONS
// ===============================

app.get('/api/quizzes/:quizId/questions', requireAdmin, asyncRoute(async (req, res) => {
  const [questions] = await pool.execute(
    'SELECT * FROM questions WHERE quiz_id = ? ORDER BY display_order, question_id',
    [req.params.quizId]
  );

  for (const q of questions) {
    [q.options] = await pool.execute(
      'SELECT option_id, option_text, is_correct FROM options WHERE question_id = ?',
      [q.question_id]
    );
  }

  res.json(questions);
}));

app.post('/api/quizzes/:quizId/questions', requireAdmin, asyncRoute(async (req, res) => {
  const questionDraft = normaliseQuestionDraft(req.body);

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [[order]] = await conn.execute(
      'SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM questions WHERE quiz_id = ?',
      [req.params.quizId]
    );

    const [question] = await conn.execute(
      `INSERT INTO questions
        (quiz_id, question_text, marks, display_order, question_type, explanation)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.params.quizId,
        questionDraft.questionText,
        questionDraft.marks,
        order.next_order,
        questionDraft.questionType,
        questionDraft.explanation || null
      ]
    );

    for (let i = 0; i < questionDraft.options.length; i++) {
      await conn.execute(
        'INSERT INTO options (question_id, option_text, is_correct) VALUES (?, ?, ?)',
        [question.insertId, questionDraft.options[i], i === questionDraft.correctIndex]
      );
    }

    await conn.commit();
    res.status(201).json({ ok: true });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}));

app.patch('/api/quizzes/:quizId/questions/:questionId', requireAdmin, asyncRoute(async (req, res) => {
  const quizId = Number(req.params.quizId);
  const questionId = Number(req.params.questionId);
  const questionDraft = normaliseQuestionDraft(req.body);

  if (!Number.isInteger(quizId) || quizId < 1 || !Number.isInteger(questionId) || questionId < 1) {
    return res.status(400).json({ message: 'Invalid quiz or question ID.' });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [[question]] = await conn.execute(
      'SELECT question_id FROM questions WHERE question_id = ? AND quiz_id = ? FOR UPDATE',
      [questionId, quizId]
    );

    if (!question) {
      await conn.rollback();
      return res.status(404).json({ message: 'Question not found.' });
    }

    const [[attempts]] = await conn.execute(
      'SELECT COUNT(*) AS attempt_count FROM attempts WHERE quiz_id = ?',
      [quizId]
    );

    if (Number(attempts.attempt_count) > 0) {
      await conn.rollback();
      return res.status(409).json({
        message: 'Questions cannot be edited after a quiz attempt has started. Create a new quiz version to preserve existing results.'
      });
    }

    await conn.execute(
      `UPDATE questions
       SET question_text = ?, marks = ?, question_type = ?, explanation = ?
       WHERE question_id = ? AND quiz_id = ?`,
      [
        questionDraft.questionText,
        questionDraft.marks,
        questionDraft.questionType,
        questionDraft.explanation || null,
        questionId,
        quizId
      ]
    );

    await conn.execute('DELETE FROM options WHERE question_id = ?', [questionId]);

    for (let index = 0; index < questionDraft.options.length; index++) {
      await conn.execute(
        'INSERT INTO options (question_id, option_text, is_correct) VALUES (?, ?, ?)',
        [questionId, questionDraft.options[index], index === questionDraft.correctIndex]
      );
    }

    await conn.commit();
    res.json({ ok: true });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}));

// ===============================
// AI QUESTION GENERATION
// ===============================

app.post('/api/quizzes/:quizId/questions/generate', requireAdmin, asyncRoute(async (req, res) => {
  const subject = typeof req.body.subject === 'string' ? req.body.subject.trim() : '';
  const topic = typeof req.body.topic === 'string' ? req.body.topic.trim() : '';
  const count = Number(req.body.count);
  const difficulty = req.body.difficulty;

  if (
    !subject ||
    subject.length > 100 ||
    !topic ||
    topic.length > 250 ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > 10 ||
    ![...quizDifficulties, 'Easy', 'Medium', 'Hard'].includes(difficulty)
  ) {
    return res.status(400).json({
      message: 'Provide a subject, topic, 1–10 questions, and a valid difficulty.'
    });
  }

  const [[quiz]] = await pool.execute(
    'SELECT quiz_id FROM quizzes WHERE quiz_id = ?',
    [req.params.quizId]
  );

  if (!quiz) {
    return res.status(404).json({ message: 'Quiz not found.' });
  }

  const questions = await generateQuestionsWithAI({
    subject,
    topic,
    count,
    difficulty
  });

  res.json({ questions });
}));

app.post('/api/quizzes/:quizId/questions/bulk', requireAdmin, asyncRoute(async (req, res) => {
  if (
    !Array.isArray(req.body.questions) ||
    !req.body.questions.length ||
    req.body.questions.length > 20
  ) {
    return res.status(400).json({
      message: 'Select 1–20 reviewed questions to save.'
    });
  }

  const questions = req.body.questions.map(normaliseQuestion);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [[quiz]] = await conn.execute(
      'SELECT quiz_id FROM quizzes WHERE quiz_id = ?',
      [req.params.quizId]
    );

    if (!quiz) throw safeError(404, 'Quiz not found.');

    const [[order]] = await conn.execute(
      'SELECT COALESCE(MAX(display_order), 0) AS last_order FROM questions WHERE quiz_id = ?',
      [req.params.quizId]
    );

    for (let index = 0; index < questions.length; index++) {
      const question = questions[index];

      const [result] = await conn.execute(
        'INSERT INTO questions (quiz_id, question_text, marks, display_order) VALUES (?, ?, ?, ?)',
        [
          req.params.quizId,
          question.questionText,
          question.marks,
          order.last_order + index + 1
        ]
      );

      for (let optionIndex = 0; optionIndex < question.options.length; optionIndex++) {
        await conn.execute(
          'INSERT INTO options (question_id, option_text, is_correct) VALUES (?, ?, ?)',
          [
            result.insertId,
            question.options[optionIndex],
            optionIndex === question.correctIndex
          ]
        );
      }
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

// ===============================
// CSV IMPORT
// ===============================

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i++;
      row.push(cell.trim());
      if (row.some(v => v)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some(v => v)) rows.push(row);

  return rows;
}

app.post('/api/quizzes/:quizId/questions/import', requireAdmin, upload.single('questionsFile'), asyncRoute(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Choose a CSV file first.' });
  }

  const rows = parseCsv(
    req.file.buffer.toString('utf8').replace(/^\uFEFF/, '')
  );

  const headers = rows.shift()?.map(h =>
    h.toLowerCase().replace(/\s+/g, '_')
  );

  const required = [
    'question',
    'option_1',
    'option_2',
    'option_3',
    'option_4',
    'correct_option'
  ];

  if (!headers || required.some(h => !headers.includes(h))) {
    return res.status(400).json({
      message: 'CSV headers must be: question, option_1, option_2, option_3, option_4, correct_option, marks.'
    });
  }

  const index = Object.fromEntries(headers.map((h, i) => [h, i]));

  const questions = rows.map((row, i) => ({
    text: row[index.question],
    options: [
      row[index.option_1],
      row[index.option_2],
      row[index.option_3],
      row[index.option_4]
    ],
    correct: Number(row[index.correct_option]),
    marks: Number(row[index.marks] || 1),
    line: i + 2
  }));

  if (
    !questions.length ||
    questions.some(q =>
      !q.text ||
      q.options.some(o => !o) ||
      !Number.isInteger(q.correct) ||
      q.correct < 1 ||
      q.correct > 4 ||
      !Number.isInteger(q.marks) ||
      q.marks < 1
    )
  ) {
    return res.status(400).json({
      message: 'Check each CSV row: all four options are required, correct_option must be 1-4, and marks must be at least 1.'
    });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [[exists]] = await conn.execute(
      'SELECT quiz_id FROM quizzes WHERE quiz_id = ?',
      [req.params.quizId]
    );

    if (!exists) throw safeError(404, 'Quiz not found.');

    const [[order]] = await conn.execute(
      'SELECT COALESCE(MAX(display_order), 0) AS last_order FROM questions WHERE quiz_id = ?',
      [req.params.quizId]
    );

    for (let n = 0; n < questions.length; n++) {
      const q = questions[n];

      const [question] = await conn.execute(
        'INSERT INTO questions (quiz_id, question_text, marks, display_order) VALUES (?, ?, ?, ?)',
        [
          req.params.quizId,
          q.text,
          q.marks,
          order.last_order + n + 1
        ]
      );

      for (let i = 0; i < 4; i++) {
        await conn.execute(
          'INSERT INTO options (question_id, option_text, is_correct) VALUES (?, ?, ?)',
          [question.insertId, q.options[i], i + 1 === q.correct]
        );
      }
    }

    await conn.commit();

    res.status(201).json({
      message: `${questions.length} questions uploaded.`
    });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}));

// ===============================
// ATTEMPT EXPIRY HELPER
// ===============================

async function getQuizQuestionSet(conn, quizId, targetQuestionCount, includeReview = false) {
  const columns = includeReview
    ? 'question_id, question_text, marks, explanation'
    : 'question_id, question_text, marks, display_order, question_type';
  const target = Number(targetQuestionCount);
  const hasTarget = Number.isInteger(target) && target > 0;
  const query = `SELECT ${columns} FROM questions WHERE quiz_id = ? ORDER BY display_order, question_id${hasTarget ? ' LIMIT ?' : ''}`;
  const [questions] = await conn.execute(
    query,
    hasTarget ? [quizId, target] : [quizId]
  );

  return questions;
}

function shuffleOptions(options) {
  const shuffled = [...options];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = crypto.randomInt(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function clearAttemptOptionOrder(session, attemptId) {
  const optionOrders = { ...(session.quizOptionOrders || {}) };
  delete optionOrders[String(attemptId)];
  session.quizOptionOrders = optionOrders;
}

async function closeExpiredAttempt(conn, attemptId, quizId, targetQuestionCount = null) {
  const questions = await getQuizQuestionSet(
    conn,
    quizId,
    targetQuestionCount
  );

  const totalMarks = questions.reduce(
    (total, question) => total + question.marks,
    0
  );

  for (const question of questions) {
    await conn.execute(
      'INSERT INTO answers (attempt_id, question_id, selected_option_id, is_correct) VALUES (?, ?, NULL, FALSE)',
      [attemptId, question.question_id]
    );
  }

  await conn.execute(
    'UPDATE attempts SET submitted_at = NOW(), score = 0, total_marks = ?, status = "submitted" WHERE attempt_id = ? AND status = "in_progress"',
    [totalMarks, attemptId]
  );

  return totalMarks;
}

// ===============================
// STUDENT: START OR RESUME QUIZ
// ===============================

app.get('/api/quizzes/:quizId/attempt', requireLogin, asyncRoute(async (req, res) => {
  const [[quiz]] = await pool.execute(
    'SELECT quiz_id, title, description, duration_minutes, target_question_count FROM quizzes WHERE quiz_id = ? AND is_published = TRUE',
    [req.params.quizId]
  );

  if (!quiz) {
    return res.status(404).json({ message: 'Quiz is not available.' });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Lock the quiz row so duration updates cannot race with new attempts.
    const [[lockedQuiz]] = await conn.execute(
      'SELECT quiz_id, duration_minutes, target_question_count FROM quizzes WHERE quiz_id = ? AND is_published = TRUE FOR UPDATE',
      [quiz.quiz_id]
    );

    if (!lockedQuiz) {
      await conn.rollback();

      return res.status(404).json({
        message: 'Quiz is not available.'
      });
    }

    // Use the latest saved duration after obtaining the lock.
    quiz.duration_minutes = lockedQuiz.duration_minutes;
    quiz.target_question_count = lockedQuiz.target_question_count;

    const questions = await getQuizQuestionSet(
      conn,
      quiz.quiz_id,
      quiz.target_question_count
    );

    if (
      quiz.target_question_count &&
      questions.length < Number(quiz.target_question_count)
    ) {
      await conn.rollback();
      return res.status(409).json({
        message: 'This quiz does not have enough questions for its configured difficulty.'
      });
    }

    if (!questions.length) {
      await conn.rollback();
      return res.json({ quiz, questions });
    }

    const [[activeAttempt]] = await conn.execute(
      `SELECT attempt_id, started_at,
        TIMESTAMPADD(MINUTE, ?, started_at) AS deadline_at,
        NOW() > TIMESTAMPADD(MINUTE, ?, started_at) AS is_expired
       FROM attempts
       WHERE quiz_id = ? AND user_id = ? AND status = "in_progress"
       ORDER BY started_at DESC
       LIMIT 1 FOR UPDATE`,
      [
        quiz.duration_minutes,
        quiz.duration_minutes,
        quiz.quiz_id,
        req.session.user.id
      ]
    );

    if (activeAttempt?.is_expired) {
      await closeExpiredAttempt(
        conn,
        activeAttempt.attempt_id,
        quiz.quiz_id,
        quiz.target_question_count
      );
    }

    let attempt = activeAttempt?.is_expired ? null : activeAttempt;

    if (!attempt) {
      const [result] = await conn.execute(
        'INSERT INTO attempts (quiz_id, user_id, started_at, status) VALUES (?, ?, NOW(), "in_progress")',
        [quiz.quiz_id, req.session.user.id]
      );

      [[attempt]] = await conn.execute(
        'SELECT attempt_id, started_at, TIMESTAMPADD(MINUTE, ?, started_at) AS deadline_at FROM attempts WHERE attempt_id = ?',
        [quiz.duration_minutes, result.insertId]
      );
    }

    const attemptId = String(attempt.attempt_id);
    const sessionOptionOrders = req.session.quizOptionOrders || {};
    const storedAttemptOrders = activeAttempt?.is_expired
      ? {}
      : sessionOptionOrders[attemptId] || {};
    const attemptOptionOrders = {};

    for (const question of questions) {
      const [options] = await conn.execute(
        'SELECT option_id, option_text FROM options WHERE question_id = ?',
        [question.question_id]
      );
      const optionIds = options.map(option => String(option.option_id));
      const storedOrder = storedAttemptOrders[String(question.question_id)];
      const storedOrderIds = Array.isArray(storedOrder)
        ? storedOrder.map(String)
        : [];
      const storedOrderIsValid = storedOrderIds.length === optionIds.length &&
        new Set(storedOrderIds).size === optionIds.length &&
        storedOrderIds.every(optionId => optionIds.includes(optionId));
      const optionOrder = storedOrderIsValid
        ? storedOrderIds
        : shuffleOptions(optionIds);
      const optionsById = new Map(options.map(option => [String(option.option_id), option]));

      question.options = optionOrder.map(optionId => optionsById.get(optionId));
      attemptOptionOrders[String(question.question_id)] = optionOrder;
    }

    await conn.commit();

    const optionOrders = { ...(req.session.quizOptionOrders || {}) };
    if (activeAttempt?.is_expired) {
      delete optionOrders[String(activeAttempt.attempt_id)];
    }
    optionOrders[attemptId] = attemptOptionOrders;
    req.session.quizOptionOrders = optionOrders;

    res.json({
      quiz,
      questions,
      attempt: {
        attemptId: attempt.attempt_id,
        startedAt: attempt.started_at,
        deadlineAt: attempt.deadline_at
      }
    });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}));

// ===============================
// STUDENT: SUBMIT QUIZ
// ===============================

app.post('/api/quizzes/:quizId/submit', requireLogin, asyncRoute(async (req, res) => {
  const attemptId = Number(req.body.attemptId);

  if (!Number.isInteger(attemptId) || attemptId < 1) {
    return res.status(400).json({
      message: 'A valid attempt is required.'
    });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [[attempt]] = await conn.execute(
      `SELECT a.attempt_id, a.status, q.quiz_id, q.is_published,
        q.target_question_count,
        NOW() > TIMESTAMPADD(MINUTE, q.duration_minutes, a.started_at) AS is_expired
       FROM attempts a
       JOIN quizzes q ON q.quiz_id = a.quiz_id
       WHERE a.attempt_id = ? AND a.quiz_id = ? AND a.user_id = ?
       FOR UPDATE`,
      [attemptId, req.params.quizId, req.session.user.id]
    );

    if (!attempt) {
      await conn.rollback();

      return res.status(404).json({
        message: 'Attempt not found.'
      });
    }

    if (!attempt.is_published) {
      await conn.rollback();

      return res.status(404).json({
        message: 'Quiz is not available.'
      });
    }

    if (attempt.status !== 'in_progress') {
      await conn.rollback();

      return res.status(409).json({
        message: 'This attempt has already been submitted.'
      });
    }

    if (attempt.is_expired) {
      const totalMarks = await closeExpiredAttempt(
        conn,
        attempt.attempt_id,
        attempt.quiz_id,
        attempt.target_question_count
      );

      await conn.commit();
      clearAttemptOptionOrder(req.session, attempt.attempt_id);

      return res.status(410).json({
        message: 'Time expired. This attempt was submitted with a score of zero.',
        expired: true,
        attemptId: attempt.attempt_id,
        score: 0,
        totalMarks
      });
    }

    const questions = await getQuizQuestionSet(
      conn,
      attempt.quiz_id,
      attempt.target_question_count,
      true
    );

    const totalMarks = questions.reduce(
      (total, question) => total + question.marks,
      0
    );

    let score = 0;
    const review = [];

    for (const question of questions) {
      const selected = req.body.answers?.[question.question_id] || null;
      const [options] = await conn.execute(
        'SELECT option_id, option_text, is_correct FROM options WHERE question_id = ?',
        [question.question_id]
      );
      const selectedOption = options.find(option =>
        String(option.option_id) === String(selected)
      );
      const correctOption = options.find(option => Boolean(option.is_correct));
      const correct = Boolean(selectedOption?.is_correct);

      if (correct) score += question.marks;

      await conn.execute(
        'INSERT INTO answers (attempt_id, question_id, selected_option_id, is_correct) VALUES (?, ?, ?, ?)',
        [attempt.attempt_id, question.question_id, selectedOption?.option_id || null, correct]
      );

      review.push({
        questionText: question.question_text,
        selectedOption: selectedOption?.option_text || null,
        correctOption: correctOption?.option_text || null,
        isCorrect: correct,
        explanation: question.explanation || ''
      });
    }

    await conn.execute(
      'UPDATE attempts SET submitted_at = NOW(), score = ?, total_marks = ?, status = "submitted" WHERE attempt_id = ?',
      [score, totalMarks, attempt.attempt_id]
    );

    await conn.commit();
    clearAttemptOptionOrder(req.session, attempt.attempt_id);

    res.json({
      attemptId: attempt.attempt_id,
      score,
      totalMarks,
      review
    });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}));

// ===============================
// RESULTS AND STATISTICS
// ===============================

app.get('/api/results', requireLogin, asyncRoute(async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT a.attempt_id, q.quiz_id, q.title, a.score, a.total_marks, a.submitted_at,
       q.category_id, c.slug AS category_slug, c.name AS category_name,
       q.topic_id, t.name AS topic_name, q.difficulty, q.target_question_count
     FROM attempts a
     JOIN quizzes q ON q.quiz_id = a.quiz_id
     LEFT JOIN categories c ON c.category_id = q.category_id
     LEFT JOIN topics t ON t.topic_id = q.topic_id
     WHERE a.user_id = ? AND a.status = "submitted"
     ORDER BY a.submitted_at DESC`,
    [req.session.user.id]
  );

  res.json(rows);
}));

app.get('/api/results/:attemptId', requireLogin, asyncRoute(async (req, res) => {
  const attemptId = Number(req.params.attemptId);
  if (!Number.isInteger(attemptId) || attemptId < 1) {
    return res.status(400).json({ message: 'A valid attempt is required.' });
  }

  const [rows] = await pool.execute(
    `SELECT a.attempt_id, a.score, a.total_marks, a.submitted_at, q.title,
       qs.question_text, qs.marks, qs.explanation, ans.is_correct,
       selected.option_text AS selected_answer, correct.option_text AS correct_answer
     FROM attempts a
     JOIN quizzes q ON q.quiz_id = a.quiz_id
     JOIN answers ans ON ans.attempt_id = a.attempt_id
     JOIN questions qs ON qs.question_id = ans.question_id
     LEFT JOIN options selected ON selected.option_id = ans.selected_option_id
     LEFT JOIN options correct ON correct.question_id = qs.question_id AND correct.is_correct = TRUE
     WHERE a.attempt_id = ? AND a.user_id = ? AND a.status = "submitted"
     ORDER BY qs.display_order, qs.question_id`,
    [attemptId, req.session.user.id]
  );

  if (!rows.length) {
    return res.status(404).json({ message: 'That submitted attempt could not be found.' });
  }

  res.json({
    attemptId: rows[0].attempt_id,
    title: rows[0].title,
    score: rows[0].score,
    totalMarks: rows[0].total_marks,
    submittedAt: rows[0].submitted_at,
    review: rows.map(row => ({
      question: row.question_text,
      marks: row.marks,
      correct: Boolean(row.is_correct),
      selectedAnswer: row.selected_answer,
      correctAnswer: row.correct_answer,
      explanation: row.explanation || ''
    }))
  });
}));

app.get('/api/dashboard/progress', requireLogin, asyncRoute(async (req, res) => {
  const userId = req.session.user.id;
  const [[{ server_date: serverDate }]] = await pool.execute(
    "SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS server_date"
  );
  const [dailyRows] = await pool.execute(
    `SELECT DATE_FORMAT(DATE(a.submitted_at), '%Y-%m-%d') AS activity_date,
       COUNT(*) AS quiz_count,
       AVG(CASE WHEN a.total_marks > 0 THEN a.score / a.total_marks * 100 END) AS average_score,
       SUM(CASE WHEN a.total_marks > 0 AND a.score = a.total_marks THEN 1 ELSE 0 END) AS perfect_count,
       SUM(CASE WHEN c.slug IN ('java-programming', 'dsa') THEN 1 ELSE 0 END) AS coding_count,
       SUM(CASE WHEN c.slug = 'aptitude-logical-reasoning' THEN 1 ELSE 0 END) AS aptitude_count
     FROM attempts a
     JOIN quizzes q ON q.quiz_id = a.quiz_id
     LEFT JOIN categories c ON c.category_id = q.category_id
     WHERE a.user_id = ? AND a.status = "submitted" AND a.submitted_at IS NOT NULL
     GROUP BY DATE_FORMAT(DATE(a.submitted_at), '%Y-%m-%d')
     ORDER BY activity_date ASC`,
    [userId]
  );

  const activityByDate = new Map(dailyRows.map(row => [row.activity_date, row]));
  const shiftDate = (date, offset) => {
    const shifted = new Date(`${date}T00:00:00.000Z`);
    shifted.setUTCDate(shifted.getUTCDate() + offset);
    return shifted.toISOString().slice(0, 10);
  };
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = shiftDate(serverDate, index - 6);
    const activity = activityByDate.get(date);
    return {
      date,
      quizCount: Number(activity?.quiz_count || 0),
      averageScore: activity?.average_score == null
        ? null
        : Math.round(Number(activity.average_score)),
      isToday: date === serverDate
    };
  });
  const attemptCount = dailyRows.reduce((total, row) => total + Number(row.quiz_count), 0);
  const perfectScoreCount = dailyRows.reduce((total, row) => total + Number(row.perfect_count), 0);
  const codingQuizCount = dailyRows.reduce((total, row) => total + Number(row.coding_count), 0);
  const aptitudeQuizCount = dailyRows.reduce((total, row) => total + Number(row.aptitude_count), 0);

  let longestStreak = 0;
  let runningStreak = 0;
  let previousDate = null;
  for (const row of dailyRows) {
    const isConsecutive = previousDate && shiftDate(previousDate, 1) === row.activity_date;
    runningStreak = isConsecutive ? runningStreak + 1 : 1;
    longestStreak = Math.max(longestStreak, runningStreak);
    previousDate = row.activity_date;
  }

  let currentStreak = 0;
  let streakDate = activityByDate.has(serverDate) ? serverDate : shiftDate(serverDate, -1);
  while (activityByDate.has(streakDate)) {
    currentStreak += 1;
    streakDate = shiftDate(streakDate, -1);
  }

  const xpPerLevel = 500;
  const totalXp = attemptCount * 100 + perfectScoreCount * 25;
  const xpIntoLevel = totalXp % xpPerLevel;
  const achievements = [
    { id: 'first-step', name: 'First Step', description: 'Complete your first quiz.', icon: '01', unlocked: attemptCount >= 1 },
    { id: 'consistent-learner', name: 'Consistent Learner', description: 'Maintain a 7-day streak.', icon: '7d', unlocked: longestStreak >= 7 },
    { id: 'perfect-score', name: 'Perfect Score', description: 'Achieve 100% on a quiz.', icon: '100', unlocked: perfectScoreCount > 0 },
    { id: 'code-master', name: 'Code Master', description: 'Complete 10 coding quizzes.', icon: '10', unlocked: codingQuizCount >= 10 },
    { id: 'brain-power', name: 'Brain Power', description: 'Complete 20 aptitude quizzes.', icon: '20', unlocked: aptitudeQuizCount >= 20 },
    { id: 'quiz-champion', name: 'Quiz Champion', description: 'Complete 50 quizzes.', icon: '50', unlocked: attemptCount >= 50 }
  ];

  res.json({
    serverDate,
    attemptCount,
    currentStreak,
    longestStreak,
    totalXp,
    level: Math.floor(totalXp / xpPerLevel) + 1,
    xpPerLevel,
    xpIntoLevel,
    xpRemaining: xpPerLevel - xpIntoLevel,
    levelProgress: Math.round(xpIntoLevel / xpPerLevel * 100),
    achievements,
    week
  });
}));

app.get('/api/stats', requireLogin, asyncRoute(async (req, res) => {
  const [[stats]] = await pool.execute(
    `SELECT COUNT(*) AS attempt_count,
      COALESCE(
        ROUND(
          AVG(CASE WHEN total_marks > 0 THEN score / total_marks * 100 END),
          1
        ),
        0
      ) AS average_score
     FROM attempts
     WHERE user_id = ? AND status = "submitted"`,
    [req.session.user.id]
  );

  res.json({
    attemptCount: Number(stats.attempt_count),
    averageScore: Number(stats.average_score)
  });
}));

app.get('/api/admin/results', requireAdmin, asyncRoute(async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT u.full_name, u.email, q.title, a.score, a.total_marks, a.submitted_at
     FROM attempts a
     JOIN users u ON u.user_id = a.user_id
     JOIN quizzes q ON q.quiz_id = a.quiz_id
     WHERE a.status = "submitted"
     ORDER BY a.submitted_at DESC`
  );

  res.json(rows);
}));

// ===============================
// ERROR HANDLING
// ===============================

app.use((error, req, res, next) => {
  console.error(
    `Request failed: ${req.method} ${req.path}`,
    error.code || 'unexpected_error',
    error.message
  );

  if (res.headersSent) return next(error);

  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      message: 'The uploaded file could not be processed.'
    });
  }

  if (error.safeMessage) {
    return res.status(error.status || 500).json({
      message: error.safeMessage
    });
  }

  res.status(500).json({
    message: 'Unable to complete the request. Please try again.'
  });
});

app.get('*', (_, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
);

app.listen(
  process.env.PORT || 3000,
  () => console.log(`Quiz app: http://localhost:${process.env.PORT || 3000}`)
);
