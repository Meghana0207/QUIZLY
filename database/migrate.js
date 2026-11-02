require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  port: Number(process.env.DB_PORT || 3306),
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'online_quiz_db',
  waitForConnections: true,
  connectionLimit: 2
});

async function ensureColumn(table, column, definition) {
  const [columns] = await pool.query(`SHOW COLUMNS FROM \`${table}\``);
  if (!columns.some(item => item.Field === column)) {
    await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
}

async function ensureDifficultyPresets() {
  const [columns] = await pool.query("SHOW COLUMNS FROM quizzes LIKE 'difficulty'");
  const existingValues = (columns[0]?.Type.match(/'([^']+)'/g) || [])
    .map(value => value.slice(1, -1));
  const requiredValues = ['easy', 'medium', 'difficult', 'full_mock'];

  if (requiredValues.some(value => !existingValues.includes(value))) {
    const values = [...new Set([...existingValues, ...requiredValues])];
    const enumValues = values.map(value => pool.escape(value)).join(', ');
    await pool.query(
      `ALTER TABLE quizzes MODIFY difficulty ENUM(${enumValues}) NULL DEFAULT NULL`
    );
  }
}

async function ensureForeignKey(table, constraint, column, referencedTable) {
  const [keys] = await pool.execute(
    `SELECT CONSTRAINT_NAME
     FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
       AND REFERENCED_TABLE_NAME = ?`,
    [table, column, referencedTable]
  );

  if (!keys.length) {
    await pool.query(
      `ALTER TABLE \`${table}\`
       ADD CONSTRAINT \`${constraint}\`
       FOREIGN KEY (\`${column}\`)
       REFERENCES \`${referencedTable}\`(\`${referencedTable === 'categories' ? 'category_id' : 'topic_id'}\`)
       ON DELETE SET NULL`
    );
  }
}

async function ensureUniqueIndex(table, indexName, column) {
  const [indexes] = await pool.execute(
    `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, indexName]
  );

  if (!indexes.length) {
    await pool.query(
      `CREATE UNIQUE INDEX \`${indexName}\` ON \`${table}\`(\`${column}\`)`
    );
  }
}

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      category_id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      slug VARCHAR(120) NOT NULL UNIQUE,
      description VARCHAR(500) NOT NULL,
      icon VARCHAR(32) NOT NULL DEFAULT 'grid',
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS topics (
      topic_id INT AUTO_INCREMENT PRIMARY KEY,
      category_id INT NOT NULL,
      name VARCHAR(120) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_topics_category_name (category_id, name),
      CONSTRAINT fk_topics_category FOREIGN KEY (category_id)
        REFERENCES categories(category_id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);

  await ensureColumn('quizzes', 'category_id', 'INT NULL');
  await ensureColumn('quizzes', 'topic_id', 'INT NULL');
  await ensureColumn('quizzes', 'difficulty', "ENUM('beginner','intermediate','advanced') NULL DEFAULT NULL");
  await ensureColumn('quizzes', 'target_question_count', 'SMALLINT UNSIGNED NULL');
  await ensureColumn('quizzes', 'seed_key', 'VARCHAR(80) NULL');
  await ensureDifficultyPresets();
  await ensureColumn('questions', 'question_type', "ENUM('multiple_choice','true_false','code_output') NOT NULL DEFAULT 'multiple_choice'");
  await ensureColumn('questions', 'explanation', 'TEXT NULL');
  await ensureColumn('questions', 'seed_key', 'VARCHAR(100) NULL');

  await pool.query(`
    UPDATE quizzes q
    SET target_question_count = (
      SELECT COUNT(*) FROM questions WHERE quiz_id = q.quiz_id
    )
    WHERE q.target_question_count IS NULL
      AND EXISTS (SELECT 1 FROM questions WHERE quiz_id = q.quiz_id)
  `);

  await ensureUniqueIndex('quizzes', 'uq_quizzes_seed_key', 'seed_key');
  await ensureUniqueIndex('questions', 'uq_questions_seed_key', 'seed_key');
  await ensureForeignKey('quizzes', 'fk_quizzes_category', 'category_id', 'categories');
  await ensureForeignKey('quizzes', 'fk_quizzes_topic', 'topic_id', 'topics');

  console.log('QUIZLY category and question migration completed.');
}

migrate()
  .catch(error => {
    console.error('Migration failed:', error.code || error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
