// backend/src/handlers/practice.js
import express from 'express';
import dynamoDBService from '../services/dynamodb.js';

const router = express.Router();

const isVisibleToStudents = (question) => (
  question.selectedForStudents === true ||
  question.visibleToStudents === true ||
  question.isSelectedForStudents === true ||
  question.isVisibleToStudents === true
);

const getStudentDisplayOrder = (question, fallbackIndex) => {
  const order = Number(question.studentDisplayOrder ?? question.displayOrder ?? question.selectionOrder);
  return Number.isFinite(order) ? order : fallbackIndex + 1;
};

// Get practice session questions
router.post('/session', async (req, res, next) => {
  try {
    const { year, subject, topic, difficulty, count = 10 } = req.body;
    
    if (!year || !subject) {
      return res.status(400).json({ error: 'Year and subject are required' });
    }

    // Get all questions for the criteria
    let questions = await dynamoDBService.getQuestionsByYearAndSubject(
      parseInt(year), 
      subject, 
      100
    );

    questions = questions
      .filter(isVisibleToStudents)
      .sort((a, b) => getStudentDisplayOrder(a, 0) - getStudentDisplayOrder(b, 0));

    // Filter by topic if specified
    if (topic) {
      questions = questions.filter(q => q.topic === topic);
    }

    // Filter by difficulty if specified
    if (difficulty) {
      questions = questions.filter(q => q.difficulty === difficulty);
    }

    // Select questions in the order chosen by admin
    const selected = questions.slice(0, parseInt(count));

    await Promise.all(
      selected.map((question) => dynamoDBService.incrementQuestionAskedCount(
        parseInt(question.year),
        question.subject,
        question.questionId
      ))
    );

    // Remove correct answers before sending to student
    const practiceQuestions = selected.map((q, index) => {
      const { correctAnswer, explanation, ...questionForStudent } = q;
      return {
        ...questionForStudent,
        studentDisplayNumber: index + 1
      };
    });

    const sessionId = `session_${Date.now()}`;
    
    res.json({
      sessionId,
      questions: practiceQuestions,
      metadata: {
        year,
        subject,
        topic,
        difficulty,
        totalQuestions: practiceQuestions.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// Submit practice answers
router.post('/submit', async (req, res, next) => {
  try {
    const { sessionId, answers } = req.body;
    
    const results = [];
    let correctCount = 0;
    let totalAnswered = 0;

    for (const answer of answers) {
      const { questionId, year, subject, selectedAnswer } = answer;
      
      const question = await dynamoDBService.getQuestion(
        parseInt(year), 
        subject, 
        questionId
      );
      
      if (question) {
        const isCorrect = question.correctAnswer === selectedAnswer;
        if (isCorrect) correctCount++;
        totalAnswered++;

        // Update question statistics
        await dynamoDBService.updateQuestionStats(
          parseInt(year), 
          subject, 
          questionId, 
          isCorrect
        );

        results.push({
          questionId,
          isCorrect,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation
        });
      }
    }

    const score = totalAnswered > 0 ? (correctCount / totalAnswered) * 100 : 0;

    res.json({
      sessionId,
      results,
      summary: {
        totalQuestions: answers.length,
        answered: totalAnswered,
        correct: correctCount,
        incorrect: totalAnswered - correctCount,
        score: Math.round(score)
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
