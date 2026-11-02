# Online Quiz Management System

A DBMS mini project using HTML/CSS/JavaScript, Node.js/Express, and MySQL.

## Setup

1. Install MySQL and create the database by running `database/schema.sql` in MySQL Workbench.
2. Copy `.env.example` to `.env` and enter your MySQL password. Set `DB_PORT=3306` if MySQL uses its default port, or use the port selected during MySQL installation (for example, `3307`).
3. Install packages: `npm install`.
4. For an existing database, run `npm run db:migrate`. This safely adds categories, topics, quiz difficulty, supported question types, explanations, and seed keys without deleting existing rows. It is also safe to run on a fresh install.
5. Start the app with `npm start`, visit `http://localhost:3000`, and register an account. Promote an account to admin with the SQL comment at the bottom of `database/schema.sql`.
6. Run `npm run db:seed` to add the categories/topics and 32 published sample quizzes (405 questions total). The seed is repeatable, preserves quiz content when a seeded quiz has attempts, and refreshes its category/topic assignment.
7. To seed only company placement and interview quizzes, run `npm run db:seed -- --company-interview-only`.
8. To add only the seven Placement Preparation quizzes using the existing category and topics, run `npm run db:seed -- --placement-preparation-quizzes-only`. This scoped command does not update other categories or existing quiz content.
9. To add only the Placement Preparation topics without updating other categories or quizzes, run `npm run db:seed -- --placement-preparation-topics-only`.
10. To update all categories and topics without touching quizzes or questions, run `npm run db:seed -- --taxonomy-only`.

## Features

- Student registration and login
- Admin quiz creation, publishing, and question management
- Category/topic browsing, quiz difficulty, and category filtering
- Timed quiz attempts and automatic objective-answer evaluation
- Stored attempts, answers, scores, result history, and answer explanations

## Question formats

The current engine supports single-answer multiple choice, True/False, and code-output prediction as a selectable-answer question. Multiple Select and free-text Fill in the Blanks require changes to answer storage and scoring and are not enabled.

## Database relations

`users -> quizzes -> questions -> options`, `categories -> topics -> quizzes`, and `users -> attempts -> answers`.
