// backend/src/handlers/admin.js (updated version with enhanced auth)
import express from 'express';
import dynamoDBService from '../services/dynamodb.js';
import s3Service from '../services/s3.js';
import { 
  authenticateAdmin, 
  generateAdminToken, 
  validateAdminPassword,
  rateLimitLogin,
  recordLoginAttempt,
  auditLog,
  validateOrigin
} from '../middleware/auth.js';

const router = express.Router();

// Apply middleware to all admin routes
router.use(auditLog);
router.use(validateOrigin);

// Admin login with rate limiting
router.post('/login', rateLimitLogin, async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      recordLoginAttempt(req, false);
      return res.status(400).json({ error: 'Password is required' });
    }

    const isValid = await validateAdminPassword(password);
    
    if (!isValid) {
      recordLoginAttempt(req, false);
      return res.status(401).json({ error: 'Invalid password' });
    }

    recordLoginAttempt(req, true);
    
    const token = generateAdminToken({ 
      authenticatedAt: new Date().toISOString() 
    });
    
    // Set token in HTTP-only cookie for additional security (optional)
    res.cookie('adminToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({ 
      token,
      message: 'Login successful',
      expiresIn: '24h'
    });
  } catch (error) {
    console.error('Login error:', error);
    recordLoginAttempt(req, false);
    res.status(500).json({ error: 'Authentication error' });
  }
});

// Logout endpoint
router.post('/logout', authenticateAdmin, (req, res) => {
  // Clear the auth cookie if you're using cookies
  res.clearCookie('adminToken');
  res.json({ message: 'Logged out successfully' });
});

// Verify token endpoint (useful for frontend to check if still authenticated)
router.get('/verify', authenticateAdmin, (req, res) => {
  res.json({ 
    authenticated: true,
    role: req.admin.role,
    timestamp: new Date().toISOString()
  });
});

// Protected routes with authentication
router.post('/questions', authenticateAdmin, async (req, res, next) => {
  try {
    const questionData = {
      ...req.body,
      createdBy: 'admin'
    };
    
    const question = await dynamoDBService.createQuestion(questionData);
    res.status(201).json(question);
  } catch (error) {
    next(error);
  }
});

router.put('/questions/:year/:subject/:questionId', authenticateAdmin, async (req, res, next) => {
  try {
    const { year, subject, questionId } = req.params;
    const updated = await dynamoDBService.updateQuestion(
      parseInt(year), 
      subject, 
      questionId, 
      req.body
    );
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete('/questions/:year/:subject/:questionId', authenticateAdmin, async (req, res, next) => {
  try {
    const { year, subject, questionId } = req.params;
    const result = await dynamoDBService.deleteQuestion(
      parseInt(year), 
      subject, 
      questionId
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/questions/bulk', authenticateAdmin, async (req, res, next) => {
  try {
    const { questions } = req.body;
    const results = [];
    
    for (const q of questions) {
      try {
        const created = await dynamoDBService.createQuestion({
          ...q,
          createdBy: 'admin'
        });
        results.push({ success: true, question: created });
      } catch (error) {
        results.push({ success: false, error: error.message, question: q });
      }
    }

    res.json({
      total: questions.length,
      succeeded: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/images/:key', authenticateAdmin, async (req, res, next) => {
  try {
    const { key } = req.params;
    const result = await s3Service.deleteFile(key);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;