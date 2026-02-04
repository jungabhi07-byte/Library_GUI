#!/usr/bin/env bash
set -e

ROOT_DIR="Library_GUI"
mkdir -p "$ROOT_DIR"
cd "$ROOT_DIR"

echo "Creating project in $(pwd)"

# package.json
cat > package.json <<'EOF'
{
  "name": "library-gui-backend",
  "version": "1.0.0",
  "description": "Library management backend (Express + MySQL) with simple frontend",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "seed-admin": "node create_admin.js"
  },
  "dependencies": {
    "bcrypt": "^5.1.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.0",
    "mysql2": "^3.3.0"
  }
}
EOF

# db.js
cat > db.js <<'EOF'
// db.js - mysql2 promise pool
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'Abhi07@$', // keep secrets in .env in actual usage
  database: process.env.DB_NAME || 'library',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
EOF

# server.js
cat > server.js <<'EOF'
// server.js - Express API
require('dotenv').config();
const express = require('express');
const pool = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(cors()); // In production, restrict origins: cors({ origin: 'https://yourpages.github.io' })
app.use(express.json());
app.use(express.static('public')); // optional: serves backend-root static files

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const JWT_EXPIRES = '8h';

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  try {
    const [rows] = await pool.query('SELECT id, username, password_hash, name, role FROM staff WHERE username = ?', [username]);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, username: user.username, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

app.get('/api/tables', authMiddleware, async (req, res) => {
  try {
    const dbName = process.env.DB_NAME || 'library';
    const [rows] = await pool.query(`SHOW TABLES FROM \`${dbName}\``);
    const tableKey = Object.keys(rows[0] || {})[0];
    const tables = rows.map(r => r[tableKey]);
    res.json({ tables });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

app.get('/api/tables/:table', authMiddleware, async (req, res) => {
  const table = req.params.table;
  try {
    const dbName = process.env.DB_NAME || 'library';
    const [trows] = await pool.query(`SHOW TABLES FROM \`${dbName}\``);
    const tableKey = Object.keys(trows[0] || {})[0];
    const tables = trows.map(r => r[tableKey]);
    if (!tables.includes(table)) return res.status(400).json({ error: 'Invalid table' });

    const [rows] = await pool.query(`SELECT * FROM \`${table}\` LIMIT 500`);
    res.json({ rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

app.get('/api/tables/:table/:id', authMiddleware, async (req, res) => {
  const { table, id } = req.params;
  try {
    const dbName = process.env.DB_NAME || 'library';
    const [trows] = await pool.query(`SHOW TABLES FROM \`${dbName}\``);
    const tableKey = Object.keys(trows[0] || {})[0];
    const tables = trows.map(r => r[tableKey]);
    if (!tables.includes(table)) return res.status(400).json({ error: 'Invalid table' });
    const [rows] = await pool.query(`SELECT * FROM \`${table}\` WHERE id = ? LIMIT 1`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ row: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
EOF

# create_admin.js
cat > create_admin.js <<'EOF'
// create_admin.js - run `npm run seed-admin` to create a staff user with a hashed password
// Usage: set env DB_* like in .env or rely on defaults. It will insert username=libadmin unless overwritten.

const bcrypt = require('bcrypt');
const pool = require('./db');
require('dotenv').config();

async function createAdmin() {
  const username = process.env.SEED_USER || 'libadmin';
  const password = process.env.SEED_PASS || 'Abhi07@$'; // default - change for production
  const name = process.env.SEED_NAME || 'Library Admin';
  const role = process.env.SEED_ROLE || 'librarian';
  const hashed = await bcrypt.hash(password, 10);

  try {
    const [existing] = await pool.query('SELECT id FROM staff WHERE username = ?', [username]);
    if (existing.length) {
      console.log('User already exists:', username);
      process.exit(0);
    }
    await pool.query('INSERT INTO staff (username, password_hash, name, role) VALUES (?, ?, ?, ?)', [username, hashed, name, role]);
    console.log(`Created user ${username} with password ${password} (hashed stored in DB)`);
    process.exit(0);
  } catch (err) {
    console.error('Error seeding admin:', err);
    process.exit(1);
  }
}

createAdmin();
EOF

# create_library.sql
cat > create_library.sql <<'EOF'
-- create_library.sql
-- Run with: mysql -u root -p < create_library.sql
CREATE DATABASE IF NOT EXISTS library CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE library;

-- staff table: staff login accounts (password_hash stored as bcrypt hash)
CREATE TABLE IF NOT EXISTS staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- sample books table
CREATE TABLE IF NOT EXISTS books (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  author VARCHAR(255),
  isbn VARCHAR(50),
  copies INT DEFAULT 1,
  available INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- loans table
CREATE TABLE IF NOT EXISTS loans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  book_id INT NOT NULL,
  borrower_name VARCHAR(255),
  loan_date DATE,
  due_date DATE,
  return_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- Optionally insert sample books
INSERT INTO books (title, author, isbn, copies, available) VALUES
('Introduction to Algorithms', 'Cormen, Leiserson, Rivest, Stein', '0262033844', 2, 2),
('Clean Code', 'Robert C. Martin', '0132350882', 1, 1);
EOF

# README.md
cat > README.md <<'EOF'
# Library_GUI

This repository contains:
- Backend (Node.js + Express + mysql2) at repository root
- Frontend demo (static) under docs/ for publishing with GitHub Pages

Quick start (local backend + MySQL)
1. Install dependencies:
   ```bash
   npm install
