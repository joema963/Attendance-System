// 📁 backend/server.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'your_jwt_secret';

app.use(express.json());
app.use(cors());

const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend')));

const db = new sqlite3.Database('./attendance.db');

// Create Tables
const initializeDB = () => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'user'
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    date TEXT,
    status TEXT,
    UNIQUE(userId, date)
  )`);
};

initializeDB();

// Middleware to verify token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Register
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hashedPassword], function (err) {
    if (err) return res.status(400).json({ message: 'User already exists' });
    res.json({ id: this.lastID });
  });
});

// Login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY);
    res.json({ token });
  });
});

// Mark attendance
app.post('/attendance', authenticateToken, (req, res) => {
  const date = new Date().toISOString().split('T')[0];
  const status = req.body.status;
  const userId = req.user.id;
  db.run(`INSERT OR IGNORE INTO attendance (userId, date, status) VALUES (?, ?, ?)`, [userId, date, status], function (err) {
    if (err) return res.status(500).json({ message: 'Error marking attendance' });
    res.json({ message: 'Attendance marked' });
  });
});

// Get current user's attendance
app.get('/attendance', authenticateToken, (req, res) => {
  db.all(`SELECT date, status FROM attendance WHERE userId = ? ORDER BY date DESC`, [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Error fetching attendance' });
    res.json(rows);
  });
});

// Admin - view specific user attendance
app.get('/attendance/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
  db.all(`SELECT date, status FROM attendance WHERE userId = ? ORDER BY date DESC`, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Error fetching user attendance' });
    res.json(rows);
  });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});
