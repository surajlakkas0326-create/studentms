const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001; // use 3001 to avoid conflicts

// --- middleware ---
app.use(cors());
app.use(express.json());

// (helps you see requests in the terminal)
app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});

// --- tiny health check route ---
app.get('/ping', (req, res) => res.status(200).send('pong'));

// --- "database" file ---
const DATA_FILE = path.join(__dirname, 'students.json');

function readAll() {
  try {
    const txt = fs.readFileSync(DATA_FILE, 'utf8') || '[]';
    return JSON.parse(txt);
  } catch {
    return [];
  }
}
function writeAll(list) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), 'utf8');
}
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function validateStudent(body) {
  const errors = [];
  const { name, age, course } = body;
  if (!name || !name.trim()) errors.push('Name is required.');
  if (!age || isNaN(Number(age))) errors.push('Age must be a number.');
  if (!course || !course.trim()) errors.push('Course is required.');
  return errors;
}

// --- API routes ---
const BASE = '/api/students';

// GET all
app.get(BASE, (req, res) => {
  const students = readAll();
  res.status(200).json(students);
});

// POST create
app.post(BASE, (req, res) => {
  const errors = validateStudent(req.body);
  if (errors.length) return res.status(400).json({ errors });

  const students = readAll();
  const newStudent = {
    id: genId(),
    name: req.body.name.trim(),
    age: Number(req.body.age),
    course: req.body.course.trim()
  };
  students.push(newStudent);
  writeAll(students);
  res.status(200).json(newStudent);
});

// PUT update
app.put(`${BASE}/:id`, (req, res) => {
  const { id } = req.params;
  const students = readAll();
  const idx = students.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Student not found' });

  const errors = validateStudent(req.body);
  if (errors.length) return res.status(400).json({ errors });

  students[idx] = {
    ...students[idx],
    name: req.body.name.trim(),
    age: Number(req.body.age),
    course: req.body.course.trim()
  };
  writeAll(students);
  res.status(200).json(students[idx]);
});

// DELETE remove
app.delete(`${BASE}/:id`, (req, res) => {
  const { id } = req.params;
  const students = readAll();
  const exists = students.some(s => s.id === id);
  if (!exists) return res.status(404).json({ error: 'Student not found' });

  writeAll(students.filter(s => s.id !== id));
  res.status(200).json({ message: 'Deleted' });
});

// --- start server (bind to all) ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
