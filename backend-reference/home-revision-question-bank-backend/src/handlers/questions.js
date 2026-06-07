// backend/src/handlers/questions.js
import express from 'express';
import dynamoDBService from '../services/dynamodb.js';
import s3Service from '../services/s3.js';

const router = express.Router();

// Get all available years, subjects, and topics
router.get('/metadata', async (req, res, next) => {
  try {
    const metadata = await dynamoDBService.getMetadata();
    res.json(metadata);
  } catch (error) {
    next(error);
  }
});

// Get questions by year and subject
router.get('/', async (req, res, next) => {
  try {
    const { year, subject, topic, limit } = req.query;
    
    if (!year || !subject) {
      return res.status(400).json({ error: 'Year and subject are required' });
    }

    let questions;
    if (topic) {
      questions = await dynamoDBService.getQuestionsByTopic(
        parseInt(year), 
        subject, 
        topic
      );
    } else {
      questions = await dynamoDBService.getQuestionsByYearAndSubject(
        parseInt(year), 
        subject, 
        limit ? parseInt(limit) : 50
      );
    }

    res.json({
      questions,
      count: questions.length,
      filters: { year, subject, topic }
    });
  } catch (error) {
    next(error);
  }
});

// Get single question
router.get('/:year/:subject/:questionId', async (req, res, next) => {
  try {
    const { year, subject, questionId } = req.params;
    const question = await dynamoDBService.getQuestion(
      parseInt(year), 
      subject, 
      questionId
    );
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    res.json(question);
  } catch (error) {
    next(error);
  }
});

// Get pre-signed URL for image upload
router.post('/upload-url', async (req, res, next) => {
  try {
    const { fileName, fileType } = req.body;
    
    if (!fileName || !fileType) {
      return res.status(400).json({ error: 'fileName and fileType are required' });
    }

    const uploadData = await s3Service.getUploadUrl(fileName, fileType);
    res.json(uploadData);
  } catch (error) {
    next(error);
  }
});

export default router;