# Online Quiz Management System

A DBMS mini project using HTML/CSS/JavaScript, Node.js/Express, and MySQL.

## Setup

1. Install MySQL and create the database by running `database/schema.sql` in MySQL Workbench.
2. Copy `.env.example` to `.env` and enter your MySQL password. Set `DB_PORT=3306` if MySQL uses its default port, or use the port selected during MySQL installation (for example, `3307`).
3. Install packages: `npm install`.
4. Start the application: `npm start`.
5. Visit `http://localhost:3000`, register an account, then promote it to admin with the SQL comment at the bottom of `database/schema.sql`.

## Features

- Student registration and login
- Admin quiz creation, publishing, and question management
- Timed quiz attempts and automatic objective-answer evaluation
- Stored attempts, answers, scores, and result history

## Database relations

`users -> quizzes -> questions -> options` and `users -> attempts -> answers`.
