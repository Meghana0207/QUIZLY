
const app = document.querySelector('#app'), nav = document.querySelector('#nav');
let me = null;
const categoryIconGlyph = {
  java: '{ }',
  database: '▤',
  algorithm: '⌘',
  network: '⇄',
  system: '◉',
  aptitude: '%',
  career: '✦',
  globe: '◎'
};
const quizPresetDefaults = {
  easy: { targetQuestionCount: 10, durationMinutes: 10 },
  medium: { targetQuestionCount: 15, durationMinutes: 20 },
  difficult: { targetQuestionCount: 20, durationMinutes: 30 },
  full_mock: { targetQuestionCount: 40, durationMinutes: 60 }
};

const difficultyLabel = value => ({
  beginner: 'Easy',
  easy: 'Easy',
  intermediate: 'Medium',
  medium: 'Medium',
  advanced: 'Difficult',
  difficult: 'Difficult',
  full_mock: 'Full Placement Mock'
}[value] || value);

const api = async (url, options = {}) => {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.message || 'Something went wrong.');
    error.data = data;
    throw error;
  }
  return data;
};

const escape = (text = '') =>
  String(text).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[c]));

const notify = (message, error = false) =>
  `<div class="notice ${error ? 'error' : ''}">${escape(message)}</div>`;

function renderPerformanceChart(results) {
  const points = results
    .filter(result => Number(result.total_marks) > 0 && result.submitted_at)
    .map(result => ({
      date: new Date(result.submitted_at),
      score: Math.max(0, Math.min(100, Number(result.score) / Number(result.total_marks) * 100))
    }))
    .filter(point => !Number.isNaN(point.date.getTime()))
    .sort((first, second) => first.date - second.date)
    .slice(-7);

  if (!points.length) {
    return '<div class="chart-empty">Score trends will appear after a quiz is submitted.</div>';
  }

  const left = 42;
  const right = 496;
  const top = 18;
  const bottom = 148;
  const chartPoints = points.map((point, index) => ({
    ...point,
    x: points.length === 1
      ? (left + right) / 2
      : left + index / (points.length - 1) * (right - left),
    y: bottom - point.score / 100 * (bottom - top)
  }));
  const line = chartPoints.map((point, index) =>
    `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`
  ).join(' ');
  const area = `${line} L ${chartPoints.at(-1).x.toFixed(1)} ${bottom} L ${chartPoints[0].x.toFixed(1)} ${bottom} Z`;

  return `
    <div class="performance-chart">
      <svg viewBox="0 0 520 184" role="img" aria-label="Quiz scores by submission date">
        <defs>
          <linearGradient id="score-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="#44c8ff" stop-opacity=".28"></stop>
            <stop offset="100%" stop-color="#44c8ff" stop-opacity="0"></stop>
          </linearGradient>
        </defs>
        ${[0, 25, 50, 75, 100].map(value => {
          const y = bottom - value / 100 * (bottom - top);
          return `<g><line x1="${left}" x2="${right}" y1="${y}" y2="${y}" class="chart-gridline"></line><text x="33" y="${y + 3}" text-anchor="end" class="chart-axis-label">${value}%</text></g>`;
        }).join('')}
        <path d="${area}" fill="url(#score-fill)"></path>
        <path d="${line}" class="chart-line"></path>
        ${chartPoints.map(point => `<circle cx="${point.x}" cy="${point.y}" r="4" class="chart-point"><title>${Math.round(point.score)}% on ${escape(point.date.toLocaleDateString())}</title></circle>`).join('')}
        ${chartPoints.filter((point, index) => index === 0 || index === chartPoints.length - 1 || index === Math.floor((chartPoints.length - 1) / 2)).map(point => `<text x="${point.x}" y="174" text-anchor="middle" class="chart-date-label">${escape(point.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))}</text>`).join('')}
      </svg>
    </div>
  `;
}

function renderWeeklyPerformanceChart(weeklyActivity) {
  const left = 44;
  const right = 496;
  const top = 18;
  const bottom = 124;
  const points = weeklyActivity.map((day, index) => ({
    ...day,
    x: left + index / Math.max(weeklyActivity.length - 1, 1) * (right - left),
    y: day.averageScore === null
      ? null
      : bottom - day.averageScore / 100 * (bottom - top)
  }));
  const scoredPoints = points.filter(point => point.y !== null);
  const line = scoredPoints.map((point, index) =>
    `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`
  ).join(' ');
  const maxActivity = Math.max(1, ...points.map(point => point.quizCount));

  return `
    <div class="performance-chart">
      <svg viewBox="0 0 520 190" role="img" aria-label="Average quiz score and activity for the last seven days">
        ${[0, 25, 50, 75, 100].map(value => {
          const y = bottom - value / 100 * (bottom - top);
          return `<g><line x1="${left}" x2="${right}" y1="${y}" y2="${y}" class="chart-gridline"></line><text x="35" y="${y + 3}" text-anchor="end" class="chart-axis-label">${value}%</text></g>`;
        }).join('')}
        ${line ? `<path d="${line}" class="chart-line"></path>` : ''}
        ${scoredPoints.map(point => `<circle cx="${point.x}" cy="${point.y}" r="4" class="chart-point"><title>${Math.round(point.averageScore)}% average</title></circle>`).join('')}
        ${points.map(point => {
          const height = point.quizCount ? 4 + point.quizCount / maxActivity * 13 : 0;
          return point.quizCount
            ? `<rect x="${point.x - 4}" y="${166 - height}" width="8" height="${height}" rx="3" class="chart-activity"><title>${point.quizCount} ${point.quizCount === 1 ? 'quiz' : 'quizzes'}</title></rect>`
            : '';
        }).join('')}
        ${points.map(point => `<text x="${point.x}" y="184" text-anchor="middle" class="chart-date-label">${escape(new Date(`${point.date}T12:00:00Z`).toLocaleDateString(undefined, { weekday: 'short' }))}</text>`).join('')}
      </svg>
    </div>
  `;
}

function renderStreakCalendar(progress) {
  return `
    <section class="dashboard-panel streak-panel">
      <div class="section-heading">
        <div><p class="eyebrow">DAILY CONSISTENCY</p><h2>Streak calendar</h2></div>
        <span class="section-count">Last 7 days</span>
      </div>
      <div class="streak-summary">
        <div><strong>${progress.currentStreak}</strong><span>Current streak</span></div>
        <div><strong>${progress.longestStreak}</strong><span>Longest streak</span></div>
      </div>
      <div class="streak-days">
        ${progress.week.map(day => `
          <div class="streak-day ${day.quizCount ? 'completed' : 'missed'} ${day.isToday ? 'today' : ''}"
            aria-label="${escape(new Date(`${day.date}T12:00:00Z`).toLocaleDateString())}: ${day.quizCount ? `${day.quizCount} quizzes completed` : 'no quizzes completed'}">
            <span>${escape(new Date(`${day.date}T12:00:00Z`).toLocaleDateString(undefined, { weekday: 'short' }))}</span>
            <i aria-hidden="true">${day.quizCount ? '✓' : ''}</i>
          </div>
        `).join('')}
      </div>
      <p class="streak-legend"><span class="legend-complete"></span>Completed <span class="legend-missed"></span>Missed</p>
    </section>
  `;
}

function renderAchievements(achievements) {
  return `
    <section class="dashboard-panel achievements-panel">
      <div class="section-heading">
        <div><p class="eyebrow">MILESTONES</p><h2>Achievements</h2></div>
        <span class="section-count">${achievements.filter(item => item.unlocked).length} / ${achievements.length} unlocked</span>
      </div>
      <div class="achievement-grid">
        ${achievements.map(item => `
          <article class="achievement-card ${item.unlocked ? 'unlocked' : 'locked'}">
            <span class="achievement-mark" aria-hidden="true">${item.icon}</span>
            <div><h3>${escape(item.name)}</h3><p>${escape(item.description)}</p>
              <small>${item.unlocked ? 'Unlocked' : 'Locked'}</small>
            </div>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function buildPlacementAnalytics(results) {
  const scored = results
    .filter(result => Number(result.total_marks) > 0)
    .map(result => ({
      ...result,
      scorePercent: Math.max(0, Math.min(100,
        Number(result.score) / Number(result.total_marks) * 100
      ))
    }));
  const latestByQuiz = new Map();

  [...scored]
    .sort((first, second) => new Date(first.submitted_at) - new Date(second.submitted_at))
    .forEach(result => latestByQuiz.set(result.quiz_id || result.title, result));

  const latestResults = [...latestByQuiz.values()];
  const domainMatches = {
    aptitude: result => result.category_slug === 'aptitude-logical-reasoning' ||
      (result.category_slug?.startsWith('company-') &&
        /aptitude|reasoning|verbal/i.test(result.topic_name || '')),
    coding: result => ['java-programming', 'dsa'].includes(result.category_slug) ||
      (/coding|java|dsa/i.test(result.topic_name || '') &&
        result.category_slug?.startsWith('company-')),
    technical: result => [
      'dbms', 'computer-networks', 'operating-systems', 'software-engineering'
    ].includes(result.category_slug) ||
      (/technical|dbms|network|operating systems/i.test(result.topic_name || '') &&
        result.category_slug?.startsWith('company-')),
    mock: result => result.difficulty === 'full_mock' ||
      Number(result.target_question_count) >= 40 ||
      /mock/i.test(result.title || '') ||
      (result.category_slug === 'company-placement-preparation' &&
        /mixed company assessment/i.test(result.topic_name || ''))
  };
  const domainLabels = {
    aptitude: 'Aptitude',
    coding: 'Coding',
    technical: 'Technical',
    mock: 'Mock tests'
  };
  const domains = Object.entries(domainMatches).map(([key, matches]) => {
    const domainResults = latestResults.filter(matches);
    return {
      key,
      label: domainLabels[key],
      score: domainResults.length
        ? Math.round(domainResults.reduce((total, result) => total + result.scorePercent, 0) / domainResults.length)
        : null,
      quizCount: domainResults.length
    };
  });
  const availableDomains = domains.filter(domain => domain.score !== null);
  const readiness = availableDomains.length
    ? Math.round(availableDomains.reduce((total, domain) => total + domain.score, 0) / availableDomains.length)
    : null;

  const topicResults = new Map();
  for (const result of latestResults) {
    if (!result.topic_name || !result.category_id) continue;
    const key = result.topic_id || `${result.category_id}:${result.topic_name}`;
    const topic = topicResults.get(key) || {
      name: result.topic_name,
      category: result.category_name || 'Placement practice',
      scores: []
    };
    topic.scores.push(result.scorePercent);
    topicResults.set(key, topic);
  }

  const topics = [...topicResults.values()]
    .map(topic => ({
      ...topic,
      score: Math.round(topic.scores.reduce((total, score) => total + score, 0) / topic.scores.length)
    }))
    .sort((first, second) => second.score - first.score);
  const split = Math.ceil(topics.length / 2);
  const strongTopics = topics.slice(0, Math.min(2, split));
  const focusTopics = topics.slice(split).reverse().slice(0, 2);
  const orderedScores = [...scored].sort(
    (first, second) => new Date(first.submitted_at) - new Date(second.submitted_at)
  );
  const improvement = orderedScores.length > 1
    ? Math.round(orderedScores.at(-1).scorePercent - orderedScores[0].scorePercent)
    : null;

  return { domains, readiness, availableDomainCount: availableDomains.length, strongTopics, focusTopics, improvement };
}

function renderPlacementReadiness(results) {
  const analytics = buildPlacementAnalytics(results);
  const topicList = (topics, emptyText) => topics.length
    ? topics.map(topic => `
        <li><span><strong>${escape(topic.name)}</strong><small>${escape(topic.category)}</small></span><b>${topic.score}%</b></li>
      `).join('')
    : `<li class="topic-empty">${escape(emptyText)}</li>`;

  return `
    <section class="placement-readiness" id="placement-readiness">
      <div class="section-heading readiness-heading">
        <div><p class="eyebrow">BASED ON YOUR SUBMITTED QUIZZES</p><h2>Placement readiness</h2></div>
        <div class="readiness-score ${analytics.readiness === null ? 'unavailable' : ''}">
          <strong>${analytics.readiness === null ? '—' : `${analytics.readiness}%`}</strong>
          <span>${analytics.readiness === null ? 'No data yet' : 'Overall readiness'}</span>
        </div>
      </div>
      <div class="readiness-domains">
        ${analytics.domains.map(domain => `
          <article class="readiness-domain">
            <div><span>${escape(domain.label)}</span><strong>${domain.score === null ? '—' : `${domain.score}%`}</strong></div>
            <div class="domain-track" role="progressbar" aria-label="${escape(domain.label)} performance" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${domain.score ?? 0}"><span style="width:${domain.score ?? 0}%"></span></div>
            <small>${domain.score === null ? 'No categorized attempts' : `Latest scores across ${domain.quizCount} ${domain.quizCount === 1 ? 'quiz' : 'quizzes'}`}</small>
          </article>
        `).join('')}
      </div>
      <div class="topic-analysis">
        <section><h3>Strong topics</h3><ul>${topicList(analytics.strongTopics, 'Complete categorized quizzes to identify strengths.')}</ul></section>
        <section><h3>Focus topics</h3><ul>${topicList(analytics.focusTopics, 'More topic results are needed to identify focus areas.')}</ul></section>
      </div>
      <p class="improvement-note">${analytics.improvement === null
        ? 'Improvement trend appears after at least two submitted attempts.'
        : `Change from first to latest submitted attempt: ${analytics.improvement > 0 ? '+' : ''}${analytics.improvement} percentage points.`}</p>
    </section>
  `;
}

function renderNav() {
  nav.innerHTML = me
    ? `<span>Hi, ${escape(me.name)}</span><button class="secondary" id="logout">Log out</button>`
    : '';

  document.querySelector('#logout')?.addEventListener('click', logout);
}

async function logout() {
  try {
    await api('/api/auth/logout', { method: 'POST' });
    me = null;
    renderNav();
    renderAuth();
  } catch (err) {
    alert(err.message);
  }
}

async function renderAuth() {
  document.body.classList.remove('dashboard-active');
  app.innerHTML = document.querySelector('#auth-template').innerHTML;

  const nameInput = document.querySelector('#register-form input[name="fullName"]');
  const nameValidationMessage = 'Name should contain only letters and spaces.';
  const loginForm = document.querySelector('#login-form');
  const loginButton = loginForm.querySelector('button:not(.password-toggle)');
  loginButton.classList.add('login-submit');
  const loginError = document.createElement('div');
  let loginPending = false;
  loginError.className = 'notice error login-error';
  loginError.setAttribute('role', 'alert');
  loginError.hidden = true;
  loginForm.querySelector('h2').insertAdjacentElement('afterend', loginError);
  loginForm.querySelectorAll('input[name="email"], input[name="password"]')
    .forEach(input => input.addEventListener('input', () => {
      loginError.hidden = true;
      loginError.textContent = '';
    }));

  const validateName = () => {
    const name = nameInput.value.trim();
    nameInput.setCustomValidity(
      /^[A-Za-z ]+$/.test(name) ? '' : nameValidationMessage
    );
  };
  nameInput.addEventListener('input', validateName);
  validateName();

  for (const formId of ['login-form', 'register-form']) {
    const passwordInput = document.querySelector(`#${formId} input[name="password"]`);
    const passwordToggle = document.querySelector(`#${formId} .password-toggle`);

    passwordToggle?.addEventListener('click', () => {
      const isVisible = passwordInput.type === 'password';
      passwordInput.type = isVisible ? 'text' : 'password';
      passwordToggle.setAttribute('aria-pressed', String(isVisible));
      passwordToggle.setAttribute('aria-label', isVisible ? 'Hide password' : 'Show password');
      passwordToggle.querySelector('[data-password-show-icon]').hidden = isVisible;
      passwordToggle.querySelector('[data-password-hide-icon]').hidden = !isVisible;
    });
  }

  for (const id of ['login-form', 'register-form']) {
    document.querySelector(`#${id}`).addEventListener('submit', async e => {
      e.preventDefault();
      if (id === 'login-form') {
        if (loginPending) return;
        loginPending = true;
        loginError.hidden = true;
        loginError.textContent = '';
        loginButton.disabled = true;
        loginButton.textContent = 'Logging in…';
        loginButton.setAttribute('aria-busy', 'true');
      }

      const form = Object.fromEntries(new FormData(e.target));
      if (id === 'register-form') form.fullName = form.fullName.trim();

      try {
        const result = await api(
          `/api/auth/${id === 'login-form' ? 'login' : 'register'}`,
          {
            method: 'POST',
            body: JSON.stringify(form)
          }
        );

        me = result.user;
        renderNav();
        renderDashboard();
      } catch (err) {
        if (id === 'login-form') {
          loginError.textContent = err.message;
          loginError.hidden = false;
        } else {
          e.target.insertAdjacentHTML('afterbegin', notify(err.message, true));
        }
      } finally {
        if (id === 'login-form') {
          loginPending = false;
          loginButton.disabled = false;
          loginButton.textContent = 'Log in';
          loginButton.setAttribute('aria-busy', 'false');
        }
      }
    });
  }
}

async function renderDashboard() {
  document.body.classList.add('dashboard-active');
  app.innerHTML = '<div class="dashboard-loading" role="status">Loading your dashboard…</div>';

  const [quizState, categoryState, resultState, progressState] = await Promise.all([
    api('/api/quizzes')
      .then(rows => ({ rows }))
      .catch(error => ({ error })),
    api('/api/categories')
      .then(categories => ({ categories }))
      .catch(error => ({ error })),
    api(me.role === 'admin' ? '/api/admin/results' : '/api/results')
      .then(rows => ({ rows }))
      .catch(error => ({ error })),
    me.role === 'admin'
      ? Promise.resolve({})
      : api('/api/dashboard/progress')
        .then(progress => ({ progress }))
        .catch(error => ({ error }))
  ]);
  const quizzes = quizState.rows || [];
  const categories = categoryState.categories || [];
  const results = resultState.rows || [];
  const progress = progressState.progress;
  const isAdmin = me.role === 'admin';
  const placementPreparation = categories.find(
    category => category.slug === 'placement-preparation'
  );
  const placementTopics = placementPreparation?.topics || [];
  const questionCount = quizzes.reduce(
    (total, quiz) => total + Number(quiz.question_count || 0),
    0
  );
  const publishedCount = quizzes.filter(quiz =>
    quiz.is_published === true || quiz.is_published === 1 || quiz.is_published === '1'
  ).length;
  const scoredResults = results.filter(result => Number(result.total_marks) > 0);
  const averageScore = scoredResults.length
    ? Math.round(scoredResults.reduce(
        (total, result) => total + Number(result.score) / Number(result.total_marks) * 100,
        0
      ) / scoredResults.length)
    : null;
  const quizActivity = quizzes
    .filter(quiz => quiz.created_at)
    .map(quiz => ({
      date: new Date(quiz.created_at),
      title: quiz.title,
      detail: isAdmin ? 'Quiz added to your library' : 'New quiz available',
      type: 'quiz'
    }));
  const resultActivity = results
    .filter(result => result.submitted_at)
    .map(result => ({
      date: new Date(result.submitted_at),
      title: isAdmin
        ? `${result.full_name} completed ${result.title}`
        : `You completed ${result.title}`,
      detail: `${result.score} of ${result.total_marks} points`,
      type: 'result'
    }));
  const recentActivity = [...quizActivity, ...resultActivity]
    .filter(item => !Number.isNaN(item.date.getTime()))
    .sort((first, second) => second.date - first.date)
    .slice(0, 3);
  const summaryCards = isAdmin
    ? [
        ['Quiz library', quizState.error ? '—' : quizzes.length, 'Across all statuses'],
        ['Published', quizState.error ? '—' : publishedCount, 'Visible to students'],
        ['Questions', quizState.error ? '—' : questionCount, 'Across your quizzes'],
        ['Submissions', resultState.error ? '—' : results.length, 'Completed attempts']
      ]
    : [
        ['Quizzes attempted', progressState.error ? '—' : progress.attemptCount, 'Submitted quizzes'],
        ['Average score', resultState.error ? '—' : averageScore === null ? '—' : `${averageScore}%`, averageScore === null ? 'No scores yet' : 'Across completed quizzes'],
        ['Current streak', progressState.error ? '—' : `${progress.currentStreak} days`, 'Keep the habit going'],
        ['Achievements', progressState.error ? '—' : `${progress.achievements.filter(item => item.unlocked).length} / ${progress.achievements.length}`, 'Milestones unlocked']
      ];
  const studentProgressPanels = isAdmin
    ? ''
    : progressState.error
      ? `<div class="notice error progress-error">${escape(progressState.error.message)}</div>`
      : `
      <section class="dashboard-panel xp-panel">
        <div class="xp-heading">
          <div><p class="eyebrow">LEVEL PROGRESSION</p><h2>Level ${progress.level}</h2></div>
          <strong>${progress.totalXp} <span>XP</span></strong>
        </div>
        <div class="xp-track" role="progressbar" aria-label="Progress to next level" aria-valuenow="${progress.xpIntoLevel}" aria-valuemin="0" aria-valuemax="${progress.xpPerLevel}">
          <span style="width:${progress.levelProgress}%"></span>
        </div>
        <div class="xp-footnote"><span>${progress.xpIntoLevel} / ${progress.xpPerLevel} XP</span><span>${progress.xpRemaining} XP to level ${progress.level + 1}</span></div>
        <p class="xp-rules">100 XP per completed quiz · 25 XP perfect-score bonus</p>
      </section>
      <div class="student-analytics-grid">
        <section class="dashboard-panel performance-panel">
          <div class="section-heading">
            <div><p class="eyebrow">YOUR PROGRESS</p><h2>Weekly performance</h2></div>
            <span class="chart-key"><i></i>Average score <i class="activity-key"></i>Daily activity</span>
          </div>
          ${renderWeeklyPerformanceChart(progress.week)}
        </section>
        ${renderStreakCalendar(progress)}
      </div>
      ${renderAchievements(progress.achievements)}
    `;

  app.innerHTML = `
    <div class="dashboard-shell">
      <aside class="dashboard-sidebar" aria-label="Dashboard navigation">
            <a class="dashboard-brand" href="#dashboard-home"><span class="dashboard-brand-mark" aria-hidden="true">Q</span>QUIZ<span>LY</span></a>
        <nav class="dashboard-nav" aria-label="Main navigation">
              ${isAdmin ? `
                <a class="active" href="#dashboard-home" data-dashboard-view="dashboard"><span aria-hidden="true">⌂</span>Dashboard</a>
                <a href="#available-quizzes" data-dashboard-view="quizzes"><span aria-hidden="true">▦</span>My Quizzes</a>
                <a href="#results-history" data-dashboard-view="results"><span aria-hidden="true">▤</span>Participant Results</a>
              ` : `
                <a class="active" href="#dashboard-home" data-dashboard-view="dashboard"><span aria-hidden="true">⌂</span>Dashboard</a>
                <a href="#available-quizzes" data-category-slugs="aptitude-logical-reasoning"><span aria-hidden="true">％</span>Aptitude Practice</a>
                <a href="#available-quizzes" data-category-slugs="java-programming,dsa"><span aria-hidden="true">⌘</span>Coding Practice</a>
                <a href="#available-quizzes" data-category-slugs="dbms,computer-networks,operating-systems,software-engineering"><span aria-hidden="true">▤</span>Core CS Subjects</a>
                <a href="#available-quizzes" data-category-slugs="placement-mock-tests"><span aria-hidden="true">◈</span>Placement Mock Tests</a>
                <a href="#available-quizzes" data-category-slugs="company-placement-preparation,company-tcs,company-infosys,company-wipro,company-accenture,company-deloitte,company-cognizant" data-practice-title="Company Placement Preparation" data-practice-description="Practice company placement subjects and company-specific quizzes."><span aria-hidden="true">◇</span>Company Placement Preparation</a>
                <a href="#available-quizzes" data-category-slugs="interview-preparation" data-practice-title="Interview Preparation" data-practice-description="Practice technical and behavioral interview topics."><span aria-hidden="true">◌</span>Interview Preparation</a>
                <a href="#available-quizzes" data-category-slugs="placement-preparation"><span aria-hidden="true">◈</span>Placement Preparation</a>
                <a href="#placement-readiness" data-dashboard-view="performance"><span aria-hidden="true">▥</span>My Performance</a>
                <a href="#student-profile" data-dashboard-view="profile"><span aria-hidden="true">●</span>Profile</a>
              `}
        </nav>
        <button class="sidebar-logout" id="dashboard-logout" type="button"><span aria-hidden="true">↪</span>Log out</button>
      </aside>

      <div class="dashboard-workspace" id="dashboard-home">
        <div class="dashboard-topbar">
          <div class="topbar-context">${isAdmin ? 'QUIZLY / MANAGEMENT' : 'QUIZLY / LEARNING DASHBOARD'}</div>
          <div class="topbar-actions">
            <time class="date-pill">${escape(new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }))}</time>
            <span class="topbar-avatar" aria-label="Signed in as ${escape(me.name)}">${escape(me.name.charAt(0).toUpperCase())}</span>
          </div>
        </div>
        <div class="dashboard-columns">
          <div class="dashboard-primary">
            <section class="dashboard-welcome">
              <div>
                <p class="eyebrow">${isAdmin ? 'QUIZ MANAGEMENT' : 'YOUR LEARNING SPACE'}</p>
                    <h1>Welcome back, ${escape(me.name)}.</h1>
                <p>${isAdmin ? 'Keep your quiz library organized and follow learner progress.' : 'Small steps, steady practice, stronger placement confidence.'}</p>
                ${isAdmin ? '' : `<div class="welcome-meta"><span>Level ${progressState.error ? '—' : progress.level}</span><span>${progressState.error ? '—' : progress.currentStreak} day streak</span></div>`}
              </div>
              ${isAdmin ? '<button id="new-quiz" type="button">＋ Create quiz</button>' : '<button id="start-first-quiz" type="button">Start a quiz <span aria-hidden="true">→</span></button>'}
            </section>

            <section class="practice-page-heading" id="practice-page-heading" hidden>
              <div><p class="eyebrow">PRACTICE AREA</p><h1 id="practice-page-title"></h1><p id="practice-page-description"></p></div>
              <a class="button secondary" href="#dashboard-home" data-practice-reset>Dashboard</a>
            </section>
            <div id="practice-route-message" hidden></div>

            <div id="message"></div>

            <section class="summary-grid" aria-label="Dashboard summary">
              ${summaryCards.map(([label, value, note], index) => `
                <article class="summary-card summary-accent-${index + 1}">
                  <span>${escape(label)}</span>
                  <strong>${escape(value)}</strong>
                  <small>${escape(note)}</small>
                </article>
              `).join('')}
            </section>

            ${isAdmin ? `<section class="dashboard-panel performance-panel">
              <div class="section-heading">
                <div>
                  <p class="eyebrow">${isAdmin ? 'LEARNER PERFORMANCE' : 'YOUR PROGRESS'}</p>
                  <h2>Performance overview</h2>
                </div>
                <strong class="progress-value">${resultState.error || averageScore === null ? '—' : `${averageScore}%`}</strong>
              </div>
              ${resultState.error
                ? `<div class="chart-empty">${escape(resultState.error.message)}</div>`
                : renderPerformanceChart(scoredResults)}
            </section>` : studentProgressPanels}
              ${isAdmin ? '' : renderPlacementReadiness(results)}

            <section class="category-browser" id="category-browse">
              <div class="section-heading quiz-section-heading">
                <div>
                  <p class="eyebrow">BROWSE BY SUBJECT</p>
                  <h2>Quiz categories</h2>
                </div>
                <span class="section-count">${categories.length} ${categories.length === 1 ? 'category' : 'categories'}</span>
              </div>
              <div class="category-filters" aria-label="Filter quizzes by category">
                <button class="category-filter active" data-category-filter="all" type="button">All quizzes</button>
                ${categories.map(category => `
                  <button class="category-filter" data-category-filter="${category.category_id}" type="button">
                    ${escape(category.name)} <span>${Number(category.quiz_count)}</span>
                  </button>
                `).join('')}
                ${quizzes.some(quiz => !quiz.category_id)
                  ? '<button class="category-filter" data-category-filter="uncategorized" type="button">Uncategorized</button>'
                  : ''}
              </div>
              ${categoryState.error
                ? notify(categoryState.error.message, true)
                : `<div class="category-grid">
                    ${categories.map(category => {
                      const difficultyLevels = [
                        ['Easy', 'easy_count'],
                        ['Medium', 'medium_count'],
                        ['Difficult', 'difficult_count'],
                        ['Full Mock', 'full_mock_count']
                      ].filter(([, key]) => Number(category[key]) > 0);
                      return `
                        <button class="category-card" data-category-filter="${category.category_id}" type="button" aria-pressed="false">
                          <span class="category-icon" aria-hidden="true">${escape(categoryIconGlyph[category.icon] || '▦')}</span>
                          <span class="category-card-title">${escape(category.name)}</span>
                          <span class="category-description">${escape(category.description)}</span>
                          <span class="category-quiz-count">${Number(category.quiz_count)} ${Number(category.quiz_count) === 1 ? 'quiz' : 'quizzes'}</span>
                          <span class="category-difficulties">${difficultyLevels.map(([label, key]) =>
                            `<span>${label} ${Number(category[key])}</span>`
                          ).join('') || '<span>No quizzes yet</span>'}</span>
                        </button>
                      `;
                    }).join('')}
                  </div>`}
              ${isAdmin ? `
                <details class="category-admin-tools">
                  <summary>Manage categories and topics</summary>
                  <div class="category-admin-grid">
                    <form id="category-create-form">
                      <h3>Create category</h3>
                      <label>Name<input name="name" maxlength="120" required></label>
                      <label>Description<textarea name="description" maxlength="500" required></textarea></label>
                      <label>Icon<select name="icon" required>
                        <option value="java">Java</option><option value="database">Database</option>
                        <option value="algorithm">Algorithms</option><option value="network">Networks</option>
                        <option value="system">Operating systems</option><option value="aptitude">Aptitude</option>
                        <option value="career">Placement</option><option value="globe">General knowledge</option>
                      </select></label>
                      <button type="submit">Create category</button>
                    </form>
                    <form id="topic-create-form">
                      <h3>Add topic</h3>
                      <label>Category<select name="categoryId" required>
                        <option value="">Choose a category</option>
                        ${categories.map(category => `<option value="${category.category_id}">${escape(category.name)}</option>`).join('')}
                      </select></label>
                      <label>Topic name<input name="name" maxlength="120" required></label>
                      <button type="submit">Add topic</button>
                    </form>
                  </div>
                </details>
              ` : ''}
            </section>

            <section class="quiz-section" id="available-quizzes">
              <div class="section-heading quiz-section-heading">
                <div>
                  <p class="eyebrow">${isAdmin ? 'YOUR LIBRARY' : 'RECENTLY ADDED FIRST'}</p>
                  <h2>${isAdmin ? 'Manage quizzes' : 'Available quizzes'}</h2>
                </div>
                <span class="section-count" id="quiz-count">${quizState.error ? 'Unavailable' : `${quizzes.length} ${quizzes.length === 1 ? 'quiz' : 'quizzes'}`}</span>
              </div>
              ${quizState.error ? notify(quizState.error.message, true) : ''}
              <div class="quiz-grid">
                ${quizzes.map(quiz => {
                  const isPublished = quiz.is_published === true || quiz.is_published === 1 || quiz.is_published === '1';
                  return `
                    <article class="quiz-card dashboard-quiz-card" data-category-id="${quiz.category_id || ''}" data-category-slug="${escape(categories.find(category => String(category.category_id) === String(quiz.category_id))?.slug || '')}" data-topic-id="${quiz.topic_id || ''}">
                      <div class="quiz-card-topline">
                        <span class="quiz-mark" aria-hidden="true">${escape(quiz.title.trim().charAt(0).toUpperCase() || 'Q')}</span>
                        ${isAdmin ? `<span class="quiz-status ${isPublished ? 'published' : 'draft'}">${isPublished ? 'Published' : 'Draft'}</span>` : '<span class="quiz-status published">Available</span>'}
                      </div>
                      <h3>${escape(quiz.title)}</h3>
                      <div class="quiz-taxonomy">
                        <span>${escape(quiz.category_name || 'Uncategorized')}</span>
                        ${quiz.topic_name ? `<span>${escape(quiz.topic_name)}</span>` : ''}
                        ${quiz.difficulty ? `<span class="difficulty-${escape(quiz.difficulty)}">${escape(difficultyLabel(quiz.difficulty))}</span>` : ''}
                      </div>
                      <p class="quiz-description">${escape(quiz.description || 'No description provided.')}</p>
                      <div class="quiz-facts">
                        <span>${Number(quiz.question_count)} questions</span>
                        <span>${Number(quiz.duration_minutes)} min</span>
                      </div>
                      ${isAdmin ? `
                        <form class="quiz-metadata-form" data-id="${quiz.quiz_id}">
                          <label>Category<select name="categoryId" data-metadata-category required>
                            <option value="">Choose category</option>
                            ${categories.map(category => `<option value="${category.category_id}" ${String(category.category_id) === String(quiz.category_id) ? 'selected' : ''}>${escape(category.name)}</option>`).join('')}
                          </select></label>
                          <label>Topic<select name="topicId" data-metadata-topic>
                            <option value="">No specific topic</option>
                            ${(categories.find(category => String(category.category_id) === String(quiz.category_id))?.topics || []).map(topic =>
                              `<option value="${topic.topic_id}" ${String(topic.topic_id) === String(quiz.topic_id) ? 'selected' : ''}>${escape(topic.name)}</option>`
                            ).join('')}
                          </select></label>
                          <label>Difficulty<select name="difficulty" required>
                            <option value="">Choose difficulty</option>
                            <option value="easy" ${quiz.difficulty === 'easy' ? 'selected' : ''}>Easy</option>
                            <option value="medium" ${quiz.difficulty === 'medium' ? 'selected' : ''}>Medium</option>
                            <option value="difficult" ${quiz.difficulty === 'difficult' ? 'selected' : ''}>Difficult</option>
                            <option value="full_mock" ${quiz.difficulty === 'full_mock' ? 'selected' : ''}>Full Placement Mock</option>
                            ${['beginner', 'intermediate', 'advanced'].includes(quiz.difficulty) ? `<option value="${quiz.difficulty}" selected>${difficultyLabel(quiz.difficulty)} (legacy)</option>` : ''}
                          </select></label>
                          <button type="submit">Save category and level</button>
                        </form>
                        <div class="quiz-admin-actions">
                          <button class="secondary manage" data-id="${quiz.quiz_id}" type="button">Questions</button>
                          <button class="publish" data-id="${quiz.quiz_id}" data-published="${isPublished}" type="button">${isPublished ? 'Unpublish' : 'Publish'}</button>
                        </div>
                        <form class="duration-form" data-id="${quiz.quiz_id}">
                          <label>Duration in minutes<input name="durationMinutes" type="number" min="1" max="180" value="${Number(quiz.duration_minutes)}" required></label>
                          <label>Target question count<input name="targetQuestionCount" type="number" min="1" max="200" value="${Number(quiz.target_question_count || quiz.question_count || 10)}" required></label>
                          <button type="submit">Save duration</button>
                        </form>
                      ` : `<button class="attempt" data-id="${quiz.quiz_id}" type="button">Start quiz</button>`}
                    </article>
                  `;
                }).join('') || `<div class="empty-state"><strong>${isAdmin ? 'Your quiz library is empty' : 'No quizzes available yet'}</strong><p>${isAdmin ? 'Create your first quiz to get started.' : 'Published quizzes will appear here when they are ready.'}</p></div>`}
              </div>
              <div class="placement-topic-list" id="placement-topic-list" hidden>
                ${placementTopics.map(topic => `
                  <section class="dashboard-panel placement-topic-group" data-placement-topic-group="${topic.topic_id}">
                    <div class="section-heading">
                      <div><p class="eyebrow">PLACEMENT TOPIC</p><h2>${escape(topic.name)}</h2></div>
                      <span class="section-count" data-topic-quiz-count></span>
                    </div>
                    <div class="quiz-grid placement-topic-quizzes"></div>
                    <p class="empty-state placement-topic-empty">No quizzes available yet.</p>
                  </section>
                `).join('')}
                <section class="dashboard-panel placement-topic-group" data-placement-topic-group="unassigned" hidden>
                  <div class="section-heading">
                    <div><p class="eyebrow">PLACEMENT TOPIC</p><h2>Other Placement Preparation quizzes</h2></div>
                    <span class="section-count" data-topic-quiz-count></span>
                  </div>
                  <div class="quiz-grid placement-topic-quizzes"></div>
                </section>
              </div>
              <p class="quiz-filter-empty" id="quiz-filter-empty" hidden>No quizzes are assigned to this practice area yet.</p>
            </section>

          </div>

          <aside class="dashboard-rail">
            <section class="rail-panel">
              <div class="rail-heading"><div><p class="eyebrow">THE LATEST</p><h2>Recent activity</h2></div></div>
              <div class="activity-list">
                ${recentActivity.map(item => `
                  <article class="activity-item">
                    <span class="activity-dot ${item.type}" aria-hidden="true"></span>
                    <div><strong>${escape(item.title)}</strong><p>${escape(item.detail)}</p><time datetime="${item.date.toISOString()}">${escape(item.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))}</time></div>
                  </article>
                `).join('') || `<p class="rail-empty">Activity will appear here as you ${isAdmin ? 'create quizzes or receive submissions' : 'complete quizzes'}.</p>`}
              </div>
            </section>

            <section class="rail-panel" id="recent-results">
              <div class="rail-heading">
                <div><p class="eyebrow">${isAdmin ? 'LATEST SUBMISSIONS' : 'YOUR SCORES'}</p><h2>Recent results</h2></div>
                <a class="text-link" href="#results-history">View all</a>
              </div>
              ${resultState.error
                ? notify(resultState.error.message, true)
                : results.slice(0, 3).map(result => {
                    const percentage = Number(result.total_marks) > 0
                      ? Math.round(Number(result.score) / Number(result.total_marks) * 100)
                      : null;
                    return `
                      <article class="recent-result">
                        <div><strong>${escape(result.title)}</strong>${isAdmin ? `<span>${escape(result.full_name)}</span>` : ''}<time>${escape(new Date(result.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))}</time></div>
                        <b>${percentage === null ? `${Number(result.score)} / ${Number(result.total_marks)}` : `${percentage}%`}</b>
                      </article>
                    `;
                  }).join('') || '<p class="rail-empty">No submitted attempts yet.</p>'}
            </section>
          </aside>
        </div>

        <section class="dashboard-panel history-panel" id="results-history">
          <div class="section-heading">
            <div>
              <p class="eyebrow">${isAdmin ? 'LEARNER ACTIVITY' : 'PAST ATTEMPTS'}</p>
          ${isAdmin ? '' : `
            <section class="dashboard-panel student-profile-panel" id="student-profile">
              <div class="section-heading">
                <div><p class="eyebrow">YOUR ACCOUNT</p><h2>Profile</h2></div>
                <span class="topbar-avatar" aria-hidden="true">${escape(me.name.charAt(0).toUpperCase())}</span>
              </div>
              <dl class="profile-details">
                <div><dt>Name</dt><dd>${escape(me.name)}</dd></div>
                <div><dt>Account type</dt><dd>Student</dd></div>
              </dl>
            </section>
          `}
              <h2>${isAdmin ? 'Participant results' : 'Results history'}</h2>
            </div>
            <span class="section-count">${resultState.error ? 'Unavailable' : `${results.length} ${results.length === 1 ? 'result' : 'results'}`}</span>
          </div>
          <div id="results">${resultState.error ? notify(resultState.error.message, true) : ''}</div>
        </section>
      </div>
    </div>
  `;

  document.querySelector('#dashboard-logout')?.addEventListener('click', logout);
  document.querySelector('#start-first-quiz')?.addEventListener('click', () => {
    document.querySelector('#available-quizzes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  let selectedCategoryFilter = 'all';
  let selectedCategorySlugs = null;
  const practicePage = document.querySelector('#practice-page-heading');
  const practiceTitle = document.querySelector('#practice-page-title');
  const practiceDescription = document.querySelector('#practice-page-description');
  const practiceRouteMessage = document.querySelector('#practice-route-message');
  const quizGrid = document.querySelector('#available-quizzes > .quiz-grid');
  const placementTopicList = document.querySelector('#placement-topic-list');
  const placementTopicGroups = new Map(
    [...(placementTopicList?.querySelectorAll('[data-placement-topic-group]') || [])]
      .map(group => [group.dataset.placementTopicGroup, group])
  );
  const quizCards = [...quizGrid.querySelectorAll('.dashboard-quiz-card')];
  const applyQuizFilters = () => {
    const showPlacementTopics = selectedCategorySlugs?.length === 1 &&
      selectedCategorySlugs[0] === 'placement-preparation';
    let visibleCount = 0;

    quizGrid.append(...quizCards);
    placementTopicList.hidden = !showPlacementTopics;
    quizGrid.hidden = showPlacementTopics;

    quizCards.forEach(card => {
      if (showPlacementTopics && card.dataset.categorySlug === 'placement-preparation') {
        const topicGroup = placementTopicGroups.get(card.dataset.topicId) ||
          placementTopicGroups.get('unassigned');
        topicGroup?.querySelector('.placement-topic-quizzes').append(card);
      }

      const matchesCategory = selectedCategorySlugs
        ? selectedCategorySlugs.includes(card.dataset.categorySlug)
        : selectedCategoryFilter === 'all' ||
          (selectedCategoryFilter === 'uncategorized'
            ? !card.dataset.categoryId
            : card.dataset.categoryId === selectedCategoryFilter);
      card.hidden = !matchesCategory;
      if (!card.hidden) visibleCount += 1;
    });

    placementTopicGroups.forEach((group, topicId) => {
      const groupCards = [...group.querySelectorAll('.dashboard-quiz-card')];
      const groupCount = groupCards.filter(card => !card.hidden).length;
      const count = group.querySelector('[data-topic-quiz-count]');
      const empty = group.querySelector('.placement-topic-empty');
      if (count) {
        count.textContent = `${groupCount} ${groupCount === 1 ? 'quiz' : 'quizzes'}`;
      }
      if (empty) empty.hidden = groupCount > 0;
      if (topicId === 'unassigned') group.hidden = groupCount === 0;
    });

    const count = document.querySelector('#quiz-count');
    const empty = document.querySelector('#quiz-filter-empty');
    if (count) {
      count.textContent = `${visibleCount} ${visibleCount === 1 ? 'quiz' : 'quizzes'}`;
    }
    if (empty) {
      empty.hidden = showPlacementTopics || visibleCount > 0 ||
        (selectedCategoryFilter === 'all' && !selectedCategorySlugs);
    }
  };

  const setPracticeRoute = (slugs, categoryId = null, updateHash = true, routeLink = null) => {
    const isUncategorized = slugs?.length === 1 && slugs[0] === 'uncategorized';
    selectedCategoryFilter = categoryId || (isUncategorized ? 'uncategorized' : slugs ? 'practice' : 'all');
    selectedCategorySlugs = isUncategorized ? null : slugs;
    const activeSlugs = isUncategorized ? [] : slugs || [];
    const matchedCategories = categories.filter(category => activeSlugs.includes(category.slug));
    const isPracticePage = activeSlugs.length > 0 || isUncategorized;
    document.querySelector('.dashboard-shell').classList.toggle('practice-view', isPracticePage);
    practicePage.hidden = !isPracticePage;
    if (isPracticePage) {
      practiceTitle.textContent = routeLink?.dataset.practiceTitle || (matchedCategories.length
        ? matchedCategories.map(category => category.name).join(' / ')
        : isUncategorized ? 'Uncategorized quizzes' : 'Practice area');
      practiceDescription.textContent = isUncategorized
        ? 'Quizzes without a category.'
        : routeLink?.dataset.practiceDescription || (matchedCategories.length === 1
        ? matchedCategories[0].description
        : 'Choose a quiz to continue practicing.');
      if (practiceRouteMessage) {
        practiceRouteMessage.innerHTML = categoryState.error
          ? notify(categoryState.error.message, true)
          : matchedCategories.length || isUncategorized
            ? ''
            : notify('This practice category is not available in the current database. Refresh the category data or contact an administrator.', true);
        practiceRouteMessage.hidden = !practiceRouteMessage.innerHTML;
      }
    } else if (practiceRouteMessage) {
      practiceRouteMessage.innerHTML = '';
      practiceRouteMessage.hidden = true;
    }

    document.querySelectorAll('.category-filter').forEach(filter => {
      filter.classList.toggle('active', !isPracticePage && filter.dataset.categoryFilter === 'all');
    });
    document.querySelectorAll('.category-card').forEach(card => {
      card.setAttribute('aria-pressed', String(isPracticePage && activeSlugs.includes(card.dataset.categorySlug)));
    });
    applyQuizFilters();

    if (updateHash) {
      const nextHash = isPracticePage
        ? `#practice/${(isUncategorized ? ['uncategorized'] : activeSlugs).map(encodeURIComponent).join(',')}`
        : '#dashboard-home';
      if (window.location.hash !== nextHash) window.location.hash = nextHash;
    }
    if (isPracticePage) {
      document.querySelector('#available-quizzes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  document.querySelectorAll('[data-category-filter]').forEach(button => {
    button.addEventListener('click', () => {
      if (button.dataset.categoryFilter === 'all') {
        setPracticeRoute(null);
        document.querySelectorAll('.dashboard-nav a').forEach(link => {
          link.classList.toggle('active', link.dataset.dashboardView === 'dashboard');
        });
        document.querySelector('#available-quizzes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      if (button.dataset.categoryFilter === 'uncategorized') {
        setPracticeRoute(['uncategorized'], 'uncategorized');
        return;
      }

      const category = categories.find(item => String(item.category_id) === button.dataset.categoryFilter);
      if (category) setPracticeRoute([category.slug], String(category.category_id));
    });
  });

  document.querySelectorAll('.dashboard-nav a').forEach(link => {
    link.addEventListener('click', event => {
      const view = link.dataset.dashboardView;
      const categorySlugs = link.dataset.categorySlugs
        ?.split(',')
        .map(slug => slug.trim())
        .filter(Boolean);

      document.querySelectorAll('.dashboard-nav a').forEach(item => {
        item.classList.toggle('active', item === link);
      });

      if (categorySlugs?.length) {
        event.preventDefault();
        setPracticeRoute(categorySlugs, null, true, link);
      } else if (view === 'performance') {
        event.preventDefault();
        setPracticeRoute(null);
        document.querySelector('#placement-readiness')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (view === 'profile') {
        event.preventDefault();
        setPracticeRoute(null);
        document.querySelector('#student-profile')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  const readPracticeHash = () => {
    const match = window.location.hash.match(/^#practice\/(.+)$/);
    const slugs = match
      ? match[1].split(',').map(slug => decodeURIComponent(slug)).filter(Boolean)
      : null;
    const routeLink = slugs
      ? [...document.querySelectorAll('.dashboard-nav a')].find(link => {
          const navSlugs = link.dataset.categorySlugs?.split(',').map(slug => slug.trim()) || [];
          return navSlugs.length === slugs.length && navSlugs.every(slug => slugs.includes(slug));
        })
      : null;
    setPracticeRoute(slugs, null, false, routeLink);
    if (slugs) {
      document.querySelectorAll('.dashboard-nav a').forEach(link => {
        const navSlugs = link.dataset.categorySlugs?.split(',').map(slug => slug.trim()) || [];
        const selected = navSlugs.length === slugs.length &&
          navSlugs.every(slug => slugs.includes(slug));
        link.classList.toggle('active', selected);
      });
    }
  };
  window.onhashchange = readPracticeHash;
  document.querySelector('[data-practice-reset]')?.addEventListener('click', event => {
    event.preventDefault();
    setPracticeRoute(null);
    document.querySelectorAll('.dashboard-nav a').forEach(link => {
      link.classList.toggle('active', link.dataset.dashboardView === 'dashboard');
    });
  });
  readPracticeHash();

  document.querySelector('#category-create-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;

    try {
      await api('/api/categories', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(new FormData(form)))
      });
      await renderDashboard();
      document.querySelector('#message').innerHTML = notify('Category created.');
    } catch (error) {
      form.insertAdjacentHTML('afterbegin', notify(error.message, true));
    }
  });

  document.querySelector('#topic-create-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    try {
      await api(`/api/categories/${data.categoryId}/topics`, {
        method: 'POST',
        body: JSON.stringify({ name: data.name })
      });
      await renderDashboard();
      document.querySelector('#message').innerHTML = notify('Topic added.');
    } catch (error) {
      form.insertAdjacentHTML('afterbegin', notify(error.message, true));
    }
  });

  document.querySelector('#new-quiz')?.addEventListener('click', createQuiz);

  document.querySelectorAll('.manage').forEach(button => {
    button.addEventListener('click', () => manageQuestions(button.dataset.id));
  });

  document.querySelectorAll('.publish').forEach(button => {
    button.addEventListener('click', () => publishQuiz(button));
  });

  document.querySelectorAll('.attempt').forEach(button => {
    button.addEventListener('click', () => takeQuiz(button.dataset.id));
  });

  document.querySelectorAll('.quiz-metadata-form').forEach(form => {
    const categorySelect = form.querySelector('[data-metadata-category]');
    const topicSelect = form.querySelector('[data-metadata-topic]');

    categorySelect.addEventListener('change', () => {
      const category = categories.find(item =>
        String(item.category_id) === categorySelect.value
      );
      topicSelect.innerHTML = `
        <option value="">No specific topic</option>
        ${(category?.topics || []).map(topic =>
          `<option value="${topic.topic_id}">${escape(topic.name)}</option>`
        ).join('')}
      `;
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;

      try {
        await api(`/api/quizzes/${form.dataset.id}/metadata`, {
          method: 'PATCH',
          body: JSON.stringify(Object.fromEntries(new FormData(form)))
        });
        await renderDashboard();
        document.querySelector('#message').innerHTML = notify('Quiz category and difficulty updated.');
      } catch (error) {
        form.insertAdjacentHTML('afterbegin', notify(error.message, true));
      } finally {
        if (button.isConnected) button.disabled = false;
      }
    });
  });

  // Save a revised quiz duration.
  document.querySelectorAll('.duration-form').forEach(form => {
    form.addEventListener('submit', async e => {
      e.preventDefault();

      const button = form.querySelector('button[type="submit"]');
      const durationInput = form.elements.durationMinutes;
      const durationMinutes = Number(durationInput.value);
      const targetQuestionCount = Number(form.elements.targetQuestionCount.value);
      const message = document.querySelector('#message');

      if (
        !Number.isInteger(durationMinutes) ||
        durationMinutes < 1 ||
        durationMinutes > 180
      ) {
        message.innerHTML = notify(
          'Duration must be between 1 and 180 minutes.',
          true
        );
        return;
      }

      if (
        !Number.isInteger(targetQuestionCount) ||
        targetQuestionCount < 1 ||
        targetQuestionCount > 200
      ) {
        message.innerHTML = notify(
          'Target question count must be between 1 and 200.',
          true
        );
        return;
      }

      button.disabled = true;

      try {
        const result = await api(
          `/api/quizzes/${form.dataset.id}/duration`,
          {
            method: 'PATCH',
            body: JSON.stringify({ durationMinutes, targetQuestionCount })
          }
        );

        message.innerHTML = notify(result.message || 'Quiz duration updated successfully.');

        // Refresh the dashboard to show the saved duration.
        await renderDashboard();
      } catch (error) {
        message.innerHTML = notify(error.message, true);
      } finally {
        // The dashboard may have been redrawn, so only update the old button
        // if it is still connected to the page.
        if (button.isConnected) {
          button.disabled = false;
        }
      }
    });
  });

  if (!resultState.error) renderResults(results);
}

async function createQuiz() {
  document.body.classList.remove('dashboard-active');
  const categories = await api('/api/categories');
  app.innerHTML = `
    <div class="page-head">
      <h1>Create a quiz</h1>
      <button class="secondary" id="back">Back</button>
    </div>

    <form id="quiz-form" class="card">
      <label>Quiz title<input name="title" required></label>
      <label>Description<textarea name="description"></textarea></label>
      <label>Category<select name="categoryId" id="quiz-category" required>
        <option value="">Choose a category</option>
        ${categories.map(category => `<option value="${category.category_id}">${escape(category.name)}</option>`).join('')}
      </select></label>
      <label>Topic<select name="topicId" id="quiz-topic">
        <option value="">No specific topic</option>
      </select></label>
      <label>Quiz configuration<select name="difficulty" id="quiz-difficulty" required>
        <option value="easy" selected>Easy · 10 questions · 10 minutes</option>
        <option value="medium">Medium · 15 questions · 20 minutes</option>
        <option value="difficult">Difficult · 20 questions · 30 minutes</option>
        <option value="full_mock">Full Placement Mock · 40 questions · 60 minutes</option>
      </select></label>
      <label>Target question count<input name="targetQuestionCount" id="quiz-target-count" type="number" min="1" max="200" value="10" required></label>
      <label>Duration in minutes<input name="durationMinutes" id="quiz-duration" type="number" min="1" max="180" value="10" required></label>
      <button>Create quiz</button>
    </form>
  `;

  document.querySelector('#back').onclick = renderDashboard;

  document.querySelector('#quiz-category').addEventListener('change', event => {
    const category = categories.find(item =>
      String(item.category_id) === event.target.value
    );
    const topic = document.querySelector('#quiz-topic');
    topic.innerHTML = `
      <option value="">No specific topic</option>
      ${(category?.topics || []).map(item =>
        `<option value="${item.topic_id}">${escape(item.name)}</option>`
      ).join('')}
    `;
  });

  document.querySelector('#quiz-difficulty').addEventListener('change', event => {
    const preset = quizPresetDefaults[event.target.value];
    if (!preset) return;
    document.querySelector('#quiz-target-count').value = preset.targetQuestionCount;
    document.querySelector('#quiz-duration').value = preset.durationMinutes;
  });

  document.querySelector('#quiz-form').onsubmit = async e => {
    e.preventDefault();

    try {
      const { quizId } = await api('/api/quizzes', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(new FormData(e.target)))
      });

      manageQuestions(quizId);
    } catch (err) {
      e.target.insertAdjacentHTML('afterbegin', notify(err.message, true));
    }
  };
}

function renderQuestionEditor(question = null, number = 0) {
  const type = question?.question_type || 'multiple_choice';
  const options = Array.from({ length: 4 }, (_, index) =>
    question?.options?.[index]?.option_text || ''
  );
  const correctIndex = question
    ? Math.max(0, question.options.findIndex(option => Number(option.is_correct) === 1))
    : 0;
  const editing = Boolean(question);

  return `
    <form class="question-editor" ${editing ? `data-question-id="${question.question_id}"` : 'id="question-form"'}>
      <h3>${editing ? `Edit question ${number}` : 'Add one question'}</h3>
      <label>
        Question format
        <select name="questionType">
          <option value="multiple_choice" ${type === 'multiple_choice' ? 'selected' : ''}>Multiple choice</option>
          <option value="true_false" ${type === 'true_false' ? 'selected' : ''}>True or False</option>
          <option value="code_output" ${type === 'code_output' ? 'selected' : ''}>Code output prediction</option>
        </select>
      </label>
      <label>Question or code prompt<textarea name="questionText" required>${escape(question?.question_text || '')}</textarea></label>
      <div class="question-option-fields">
        ${options.map((option, index) => `
          <label data-option-field>Option ${index + 1}<input name="option" value="${escape(option)}" ${index < 2 ? 'required' : ''}></label>
        `).join('')}
      </div>
      <div class="question-editor-row">
        <label>Correct option<select name="correctIndex">
          ${options.map((_, index) => `<option value="${index}" ${correctIndex === index ? 'selected' : ''}>Option ${index + 1}</option>`).join('')}
        </select></label>
        <label>Marks<input name="marks" type="number" min="1" max="100" value="${Number(question?.marks || 1)}" required></label>
      </div>
      <label>Answer explanation<textarea name="explanation" maxlength="5000" placeholder="Explain why the correct answer is right.">${escape(question?.explanation || '')}</textarea></label>
      <button type="submit">${editing ? 'Save question' : 'Add question'}</button>
    </form>
  `;
}

function configureQuestionEditor(form, resetTrueFalse = false) {
  const isTrueFalse = form.elements.questionType.value === 'true_false';
  const optionFields = [...form.querySelectorAll('[data-option-field]')];
  const correctOptions = [...form.elements.correctIndex.options];

  optionFields.forEach((field, index) => {
    field.hidden = isTrueFalse && index > 1;
    const input = field.querySelector('input');
    input.required = index < 2;
    if (isTrueFalse && resetTrueFalse && index < 2) {
      input.value = index === 0 ? 'True' : 'False';
    }
  });

  correctOptions.forEach((option, index) => {
    option.hidden = isTrueFalse && index > 1;
    option.textContent = isTrueFalse && index < 2
      ? ['True', 'False'][index]
      : `Option ${index + 1}`;
  });

  if (isTrueFalse && Number(form.elements.correctIndex.value) > 1) {
    form.elements.correctIndex.value = '0';
  }
}

async function manageQuestions(id) {
  document.body.classList.remove('dashboard-active');
  const questions = await api(`/api/quizzes/${id}/questions`);

  app.innerHTML = `
    <div class="page-head">
      <div>
        <p class="eyebrow">QUIZ #${id}</p>
        <h1>Questions</h1>
      </div>
      <button class="secondary" id="back">Dashboard</button>
    </div>

    <div id="message"></div>

    <section class="card">
      <h2>Upload questions from CSV</h2>
      <p>
        Upload a CSV with this header:
        <code>question,option_1,option_2,option_3,option_4,correct_option,marks</code>.
        Correct option must be 1, 2, 3, or 4.
      </p>
      <form id="upload-form">
        <label>CSV file<input name="questionsFile" type="file" accept=".csv,text/csv" required></label>
        <button>Upload all questions</button>
      </form>
    </section>

    <section class="card" style="margin-top:20px">
      <p class="format-support-note">
        Supported formats: single-answer multiple choice, True or False, and code-output prediction with selectable answers.
        Multiple Select and free-text Fill in the Blanks require expanded answer storage and scoring, so they are not enabled.
      </p>
      ${renderQuestionEditor()}
    </section>

    <section class="card" style="margin-top:20px">
      <h2>Saved questions (${questions.length})</h2>
      ${questions.map((q, i) => `
        <details class="saved-question">
          <summary>${i + 1}. ${escape(q.question_text.slice(0, 120))}<span>${escape((q.question_type || 'multiple_choice').replaceAll('_', ' '))}</span></summary>
          <div class="saved-question-content">
            <p>${q.options.map(o =>
              `${Number(o.is_correct) === 1 ? '✓ ' : ''}${escape(o.option_text)}`
            ).join('<br>')}</p>
            ${q.explanation ? `<p class="saved-explanation">${escape(q.explanation)}</p>` : ''}
            ${renderQuestionEditor(q, i + 1)}
          </div>
        </details>
      `).join('') || '<p>No questions added yet.</p>'}
    </section>
  `;

  document.querySelector('#back').onclick = renderDashboard;

  document.querySelector('#upload-form').onsubmit = async e => {
    e.preventDefault();

    try {
      const response = await fetch(`/api/quizzes/${id}/questions/import`, {
        method: 'POST',
        body: new FormData(e.target)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      manageQuestions(id);
    } catch (err) {
      document.querySelector('#message').innerHTML = notify(err.message, true);
    }
  };

  document.querySelectorAll('.question-editor').forEach(form => {
    configureQuestionEditor(form);
    form.elements.questionType.addEventListener('change', () => {
      configureQuestionEditor(form, true);
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();

      const data = new FormData(form);
      const questionType = data.get('questionType');
      const options = questionType === 'true_false'
        ? ['True', 'False']
        : data.getAll('option').map(value => value.trim()).filter(Boolean);
      const correctIndex = Number(data.get('correctIndex'));

      if (correctIndex >= options.length) {
        document.querySelector('#message').innerHTML = notify(
          'Choose a correct option that is filled in.',
          true
        );
        return;
      }

      try {
        await api(
          form.dataset.questionId
            ? `/api/quizzes/${id}/questions/${form.dataset.questionId}`
            : `/api/quizzes/${id}/questions`,
          {
            method: form.dataset.questionId ? 'PATCH' : 'POST',
            body: JSON.stringify({
              questionText: data.get('questionText'),
              questionType,
              marks: data.get('marks'),
              explanation: data.get('explanation'),
              options,
              correctIndex
            })
          }
        );

        await manageQuestions(id);
      } catch (error) {
        form.insertAdjacentHTML('afterbegin', notify(error.message, true));
      }
    });
  });
}

function renderGeneratedQuestions(quizId, questions) {
  const holder = document.querySelector('#generated-questions');

  if (!questions.length) {
    holder.innerHTML = notify('No generated questions are available to save.', true);
    return;
  }

  holder.innerHTML = `
    <section class="card" style="margin-top:20px">
      <h2>Review generated questions</h2>
      <p>Edit each item, select its correct option, or remove it before saving.</p>

      <div id="generated-question-list">
        ${questions.map((question, index) => `
          <div class="question generated-question">
            <strong>Question ${index + 1}</strong>

            <label>Question<textarea data-question-text>${escape(question.questionText)}</textarea></label>
            <label>Option 1<input data-option value="${escape(question.options[0])}"></label>
            <label>Option 2<input data-option value="${escape(question.options[1])}"></label>
            <label>Option 3<input data-option value="${escape(question.options[2])}"></label>
            <label>Option 4<input data-option value="${escape(question.options[3])}"></label>

            <label>
              Correct option
              <select data-correct-index>
                <option value="0" ${question.correctIndex === 0 ? 'selected' : ''}>Option 1</option>
                <option value="1" ${question.correctIndex === 1 ? 'selected' : ''}>Option 2</option>
                <option value="2" ${question.correctIndex === 2 ? 'selected' : ''}>Option 3</option>
                <option value="3" ${question.correctIndex === 3 ? 'selected' : ''}>Option 4</option>
              </select>
            </label>

            <button type="button" class="secondary remove-generated">Remove question</button>
          </div>
        `).join('')}
      </div>

      <button type="button" id="save-generated">Save reviewed questions</button>
    </section>
  `;

  holder.querySelectorAll('.remove-generated').forEach(button => {
    button.addEventListener('click', () => {
      button.closest('.generated-question').remove();

      if (!holder.querySelectorAll('.generated-question').length) {
        holder.innerHTML = notify('No generated questions are available to save.', true);
      }
    });
  });

  holder.querySelector('#save-generated').addEventListener('click', async () => {
    const reviewed = [
      ...holder.querySelectorAll('.generated-question')
    ].map(card => ({
      questionText: card.querySelector('[data-question-text]').value,
      options: [...card.querySelectorAll('[data-option]')].map(input => input.value),
      correctIndex: Number(card.querySelector('[data-correct-index]').value)
    }));

    if (!reviewed.length) return;

    try {
      const result = await api(`/api/quizzes/${quizId}/questions/bulk`, {
        method: 'POST',
        body: JSON.stringify({ questions: reviewed })
      });

      await manageQuestions(quizId);

      const message = document.querySelector('#message');
      if (message) {
        message.innerHTML = notify(
          `${result.saved} reviewed question${result.saved === 1 ? '' : 's'} saved.`
        );
      }
    } catch (error) {
      const message = document.querySelector('#generation-message');
      if (message) message.innerHTML = notify(error.message, true);
    }
  });
}

const baseManageQuestions = manageQuestions;

manageQuestions = async function (id) {
  await baseManageQuestions(id);

  const manualSection = document.querySelector('#question-form').closest('section');

  manualSection.insertAdjacentHTML('beforebegin', `
    <section class="card" style="margin-top:20px">
      <h2>Generate questions with AI</h2>
      <p>Review and edit generated questions before they are saved to this quiz.</p>

      <form id="generate-form">
        <label>Subject/category<input name="subject" maxlength="100" required></label>
        <label>Topic<input name="topic" maxlength="250" required></label>
        <label>Number of questions<input name="count" type="number" min="1" max="10" value="5" required></label>
        <label>
          Difficulty
          <select name="difficulty">
            <option value="beginner">Beginner</option>
            <option value="intermediate" selected>Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>
        <button>Generate questions</button>
      </form>

      <div id="generation-message"></div>
      <div id="generated-questions"></div>
    </section>
  `);

  document.querySelector('#generate-form').onsubmit = async event => {
    event.preventDefault();

    const button = event.target.querySelector('button');
    button.disabled = true;

    document.querySelector('#generation-message').innerHTML = notify('Generating questions…');
    document.querySelector('#generated-questions').innerHTML = '';

    try {
      const result = await api(`/api/quizzes/${id}/questions/generate`, {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(new FormData(event.target)))
      });

      document.querySelector('#generation-message').innerHTML = notify(
        `${result.questions.length} questions generated. Review them before saving.`
      );

      renderGeneratedQuestions(id, result.questions);
    } catch (error) {
      document.querySelector('#generation-message').innerHTML = notify(error.message, true);
    } finally {
      button.disabled = false;
    }
  };
};

async function publishQuiz(button) {
  try {
    await api(`/api/quizzes/${button.dataset.id}/publish`, {
      method: 'PATCH',
      body: JSON.stringify({
        isPublished: button.dataset.published !== 'true' &&
          button.dataset.published !== '1'
      })
    });

    renderDashboard();
  } catch (error) {
    const message = document.querySelector('#message');
    if (message) message.innerHTML = notify(error.message, true);
  }
}

async function takeQuiz(id) {
  document.body.classList.remove('dashboard-active');
  const { quiz, questions, attempt } = await api(`/api/quizzes/${id}/attempt`);

  if (!questions.length) {
    app.innerHTML = notify('This quiz has no questions yet.', true);
    return;
  }

  app.innerHTML = `
    <div class="page-head">
      <div>
        <p class="eyebrow">${quiz.duration_minutes} MINUTES</p>
        <h1>${escape(quiz.title)}</h1>
        <p>${escape(quiz.description || '')}</p>
      </div>
      <div class="card"><strong id="timer"></strong></div>
    </div>

    <form id="attempt-form">
      ${questions.map((q, i) => `
        <section class="question">
          <strong>
            ${i + 1}. ${q.question_type === 'code_output' ? 'Predict the output' : escape(q.question_text)}
            (${q.marks} mark${q.marks > 1 ? 's' : ''})
          </strong>
          ${q.question_type === 'code_output'
            ? `<pre class="question-code"><code>${escape(q.question_text)}</code></pre>`
            : ''}
          ${q.question_type === 'true_false' ? '<span class="question-type-label">True or False</span>' : ''}

          ${q.options.map(o => `
            <label class="option">
              <input type="radio" name="q_${q.question_id}" value="${o.option_id}">
              ${escape(o.option_text)}
            </label>
          `).join('')}
        </section>
      `).join('')}

      <button>Submit quiz</button>
    </form>
  `;

  let remaining = Math.max(
    0,
    Math.ceil((new Date(attempt.deadlineAt).getTime() - Date.now()) / 1000)
  );

  const timer = document.querySelector('#timer');
  let interval;
  let submitting = false;

  const showResult = result => {
    app.innerHTML = `
      <section class="card">
        <p class="eyebrow">QUIZ SUBMITTED</p>
        <h1>Your result</h1>
        <div class="score">${result.score} / ${result.totalMarks}</div>
        <p>
          ${result.expired
            ? 'Time expired, so this attempt was submitted with no answers.'
            : 'Your attempt and answers have been saved.'}
        </p>
        ${Array.isArray(result.review) && result.review.length ? `
          <section class="answer-review">
            <h2>Answer review</h2>
            ${result.review.map((item, index) => `
              <article class="answer-review-item ${item.isCorrect ? 'correct' : 'incorrect'}">
                <strong>${index + 1}. ${escape(item.questionText)}</strong>
                <p>Your answer: ${escape(item.selectedOption || 'No answer selected')}</p>
                ${!item.isCorrect ? `<p>Correct answer: ${escape(item.correctOption || 'Unavailable')}</p>` : ''}
                <p>${escape(item.explanation || 'No explanation was provided for this question.')}</p>
              </article>
            `).join('')}
          </section>
        ` : ''}
        <button id="dash">Back to dashboard</button>
      </section>
    `;

    document.querySelector('#dash').onclick = renderDashboard;
  };

  const tick = () => {
    timer.textContent =
      `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')} remaining`;

    if (remaining <= 0) {
      clearInterval(interval);
      document.querySelector('#attempt-form').requestSubmit();
      return;
    }

    remaining -= 1;
  };

  interval = setInterval(tick, 1000);
  tick();

  document.querySelector('#attempt-form').onsubmit = async e => {
    e.preventDefault();

    if (submitting) return;
    submitting = true;
    clearInterval(interval);

    const submitButton = e.target.querySelector('button[type="submit"], button:not([type])');
    if (submitButton) submitButton.disabled = true;

    const form = new FormData(e.target);
    const answers = {};

    questions.forEach(q => {
      const value = form.get(`q_${q.question_id}`);
      if (value) answers[q.question_id] = value;
    });

    try {
      const result = await api(`/api/quizzes/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ attemptId: attempt.attemptId, answers })
      });

      showResult(result);
    } catch (err) {
      if (err.data?.expired) {
        showResult(err.data);
      } else {
        submitting = false;
        if (submitButton) submitButton.disabled = false;
        app.insertAdjacentHTML('afterbegin', notify(err.message, true));
      }
    }
  };
}

async function renderResults(rows = null) {
  if (!rows) rows = await api(me.role === 'admin' ? '/api/admin/results' : '/api/results');
  const holder = document.querySelector('#results');

  if (!holder) return;

  if (!rows.length) {
    holder.textContent = 'No submitted attempts yet.';
    return;
  }

  holder.innerHTML = `
    <table>
      <thead>
        <tr>
          ${me.role === 'admin' ? '<th>Student</th><th>Quiz</th>' : '<th>Quiz</th>'}
          <th>Score</th>
          <th>Submitted</th>
          ${me.role === 'admin' ? '' : '<th>Performance</th><th>Details</th>'}
        </tr>
      </thead>

      <tbody>
        ${rows.map(r => {
          const percentage = Number(r.total_marks) > 0
            ? Math.round(Number(r.score) / Number(r.total_marks) * 100)
            : null;
          const performance = percentage === null
            ? 'unavailable'
            : percentage >= 80 ? 'strong' : percentage >= 50 ? 'developing' : 'practice';
          return `
          <tr>
            ${me.role === 'admin'
              ? `<td>${escape(r.full_name)}<br><small>${escape(r.email)}</small></td><td>${escape(r.title)}</td>`
              : `<td>${escape(r.title)}</td>`}
            <td>${Number(r.score)} / ${Number(r.total_marks)}${percentage === null ? '' : ` <small>(${percentage}%)</small>`}</td>
            <td>${escape(new Date(r.submitted_at).toLocaleString())}</td>
            ${me.role === 'admin' ? '' : `<td><span class="performance-tag ${performance}">${performance === 'strong' ? 'Strong' : performance === 'developing' ? 'Developing' : 'Keep practicing'}</span></td><td><button class="secondary result-details-button" type="button" data-result-id="${Number(r.attempt_id)}">View details</button></td>`}
          </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  holder.querySelectorAll('.result-details-button').forEach(button => {
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        const result = await api(`/api/results/${button.dataset.resultId}`);
        const dialog = document.createElement('dialog');
        dialog.className = 'result-details-dialog';
        dialog.innerHTML = `
          <div class="result-dialog-heading">
            <div><p class="eyebrow">ATTEMPT REVIEW</p><h2>${escape(result.title)}</h2>
              <p>${Number(result.score)} / ${Number(result.totalMarks)} points · ${escape(new Date(result.submittedAt).toLocaleString())}</p>
            </div>
            <form method="dialog"><button class="secondary" aria-label="Close details">Close</button></form>
          </div>
          <div class="result-dialog-review">
            ${result.review.map((item, index) => `
              <article class="answer-review-item ${item.correct ? 'correct' : 'incorrect'}">
                <strong>${index + 1}. ${escape(item.question)}</strong>
                <p>Your answer: ${escape(item.selectedAnswer || 'No answer selected')}</p>
                ${item.correct ? '' : `<p>Correct answer: ${escape(item.correctAnswer || 'Not available')}</p>`}
                ${item.explanation ? `<p>${escape(item.explanation)}</p>` : ''}
              </article>
            `).join('')}
          </div>
        `;
        holder.append(dialog);
        dialog.addEventListener('close', () => dialog.remove(), { once: true });
        dialog.showModal();
      } catch (error) {
        holder.insertAdjacentHTML('afterbegin', notify(error.message, true));
      } finally {
        button.disabled = false;
      }
    });
  });
}

(async () => {
  try {
    me = (await api('/api/auth/me')).user;
    renderNav();
    me ? renderDashboard() : renderAuth();
  } catch {
    renderAuth();
  }
})();
