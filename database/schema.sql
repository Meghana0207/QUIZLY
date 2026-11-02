CREATE DATABASE IF NOT EXISTS online_quiz_db;
USE online_quiz_db;

CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'student') NOT NULL DEFAULT 'student',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  description VARCHAR(500) NOT NULL,
  icon VARCHAR(32) NOT NULL DEFAULT 'grid',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE topics (
  topic_id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_topics_category_name (category_id, name),
  CONSTRAINT fk_topics_category FOREIGN KEY (category_id)
    REFERENCES categories(category_id) ON DELETE CASCADE
);

CREATE TABLE quizzes (
  quiz_id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  duration_minutes INT NOT NULL DEFAULT 10,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_by INT NOT NULL,
  category_id INT NULL,
  topic_id INT NULL,
  difficulty ENUM('beginner', 'intermediate', 'advanced', 'easy', 'medium', 'difficult', 'full_mock') NULL DEFAULT NULL,
  target_question_count SMALLINT UNSIGNED NULL,
  seed_key VARCHAR(80) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_quizzes_category FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL,
  CONSTRAINT fk_quizzes_topic FOREIGN KEY (topic_id) REFERENCES topics(topic_id) ON DELETE SET NULL,
  CONSTRAINT fk_quiz_creator FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE CASCADE,
  UNIQUE KEY uq_quizzes_seed_key (seed_key)
);

CREATE TABLE questions (
  question_id INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id INT NOT NULL,
  question_text TEXT NOT NULL,
  marks INT NOT NULL DEFAULT 1,
  display_order INT NOT NULL DEFAULT 1,
  question_type ENUM('multiple_choice', 'true_false', 'code_output') NOT NULL DEFAULT 'multiple_choice',
  explanation TEXT,
  seed_key VARCHAR(100) NULL,
  CONSTRAINT fk_question_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id) ON DELETE CASCADE,
  UNIQUE KEY uq_questions_seed_key (seed_key)
);

CREATE TABLE options (
  option_id INT AUTO_INCREMENT PRIMARY KEY,
  question_id INT NOT NULL,
  option_text VARCHAR(500) NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_option_question FOREIGN KEY (question_id) REFERENCES questions(question_id) ON DELETE CASCADE
);

CREATE TABLE attempts (
  attempt_id INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id INT NOT NULL,
  user_id INT NOT NULL,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  submitted_at TIMESTAMP NULL,
  score INT NOT NULL DEFAULT 0,
  total_marks INT NOT NULL DEFAULT 0,
  status ENUM('in_progress', 'submitted') NOT NULL DEFAULT 'in_progress',
  CONSTRAINT fk_attempt_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id) ON DELETE CASCADE,
  CONSTRAINT fk_attempt_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE answers (
  answer_id INT AUTO_INCREMENT PRIMARY KEY,
  attempt_id INT NOT NULL,
  question_id INT NOT NULL,
  selected_option_id INT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE KEY unique_attempt_question (attempt_id, question_id),
  CONSTRAINT fk_answer_attempt FOREIGN KEY (attempt_id) REFERENCES attempts(attempt_id) ON DELETE CASCADE,
  CONSTRAINT fk_answer_question FOREIGN KEY (question_id) REFERENCES questions(question_id) ON DELETE CASCADE,
  CONSTRAINT fk_answer_option FOREIGN KEY (selected_option_id) REFERENCES options(option_id) ON DELETE SET NULL
);

-- Create an admin account after registering through the app:
-- UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
