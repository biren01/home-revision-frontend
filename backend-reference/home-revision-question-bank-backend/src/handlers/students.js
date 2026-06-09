// backend/src/handlers/students.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dynamoDBService from '../services/dynamodb.js';

const router = express.Router();

const normaliseUsername = (username) => String(username || '').trim().toLowerCase();

const toSafeStudent = (student) => ({
  id: student.id || student.username,
  studentName: student.studentName,
  username: student.username,
  grade: student.grade,
});

const generateStudentToken = (student) => jwt.sign(
  {
    role: 'student',
    username: student.username,
    studentName: student.studentName,
    grade: student.grade,
    iat: Math.floor(Date.now() / 1000),
  },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
);

router.post('/signup', async (req, res, next) => {
  try {
    const { studentName, username, password, grade } = req.body;
    const normalisedUsername = normaliseUsername(username);

    if (!studentName || !normalisedUsername || !password || !grade) {
      return res.status(400).json({ error: 'Student name, username, password, and grade are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const student = await dynamoDBService.createStudent({
      studentName: studentName.trim(),
      username: normalisedUsername,
      passwordHash,
      grade,
    });

    const safeStudent = toSafeStudent(student);
    res.status(201).json({
      student: safeStudent,
      token: generateStudentToken(safeStudent),
    });
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      return res.status(409).json({ error: 'This username is already registered.' });
    }
    next(error);
  }
});

router.post('/signin', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const normalisedUsername = normaliseUsername(username);

    if (!normalisedUsername || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const student = await dynamoDBService.getStudentByUsername(normalisedUsername);

    if (!student || !(await bcrypt.compare(password, student.passwordHash))) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const safeStudent = toSafeStudent(student);
    res.json({
      student: safeStudent,
      token: generateStudentToken(safeStudent),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
