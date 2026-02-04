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
