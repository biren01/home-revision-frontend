// backend/src/services/dynamodb.js
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  GetCommand, 
  QueryCommand, 
  ScanCommand,
  UpdateCommand,
  DeleteCommand
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.NODE_ENV === 'development' ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  } : undefined
});

const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.DYNAMODB_TABLE || 'FamilyQuestionBank';

class DynamoDBService {
  // Create a new question
  async createQuestion(questionData) {
    const questionId = `q_${uuidv4()}`;
    const timestamp = Date.now();
    const imageUrls = Array.isArray(questionData.imageUrls)
      ? questionData.imageUrls.filter(Boolean)
      : [];

    if (questionData.imageUrl && !imageUrls.includes(questionData.imageUrl)) {
      imageUrls.unshift(questionData.imageUrl);
    }
    
    const item = {
      PK: `YEAR#${questionData.year}#SUBJECT#${questionData.subject}`,
      SK: `TOPIC#${questionData.topic}#Q#${questionId}`,
      questionId,
      type: 'QUESTION',
      subject: questionData.subject,
      year: parseInt(questionData.year),
      topic: questionData.topic,
      difficulty: questionData.difficulty || 'Medium',
      questionText: questionData.questionText,
      options: questionData.options || [],
      correctAnswer: questionData.correctAnswer,
      explanation: questionData.explanation || '',
      imageUrl: imageUrls[0] || null,
      imageUrls,
      tags: questionData.tags || [],
      createdBy: questionData.createdBy || 'Admin',
      createdAt: timestamp,
      updatedAt: timestamp,
      selectedForStudents: questionData.selectedForStudents === true || questionData.visibleToStudents === true,
      visibleToStudents: questionData.selectedForStudents === true || questionData.visibleToStudents === true,
      studentDisplayOrder: Number.isFinite(Number(questionData.studentDisplayOrder))
        ? Number(questionData.studentDisplayOrder)
        : null,
      askedCount: 0,
      timesUsed: 0,
      correctCount: 0,
      incorrectCount: 0
    };

    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: item
    });

    await docClient.send(command);
    return item;
  }

  // Create a new student account
  async createStudent(studentData) {
    const timestamp = Date.now();
    const username = String(studentData.username || '').trim().toLowerCase();

    const item = {
      PK: `STUDENT#${username}`,
      SK: 'PROFILE',
      type: 'STUDENT',
      id: username,
      username,
      studentName: studentData.studentName,
      grade: studentData.grade,
      passwordHash: studentData.passwordHash,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
      ConditionExpression: 'attribute_not_exists(PK)'
    });

    await docClient.send(command);
    return item;
  }

  // Get a student by username
  async getStudentByUsername(username) {
    const normalisedUsername = String(username || '').trim().toLowerCase();

    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `STUDENT#${normalisedUsername}`,
        SK: 'PROFILE'
      }
    });

    const response = await docClient.send(command);
    return response.Item || null;
  }

  // Get questions by year and subject
  async getQuestionsByYearAndSubject(year, subject, limit = 50) {
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `YEAR#${year}#SUBJECT#${subject}`
      },
      Limit: limit
    });

    const response = await docClient.send(command);
    return response.Items || [];
  }

  // Get questions by topic
  async getQuestionsByTopic(year, subject, topic) {
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `YEAR#${year}#SUBJECT#${subject}`,
        ':sk': `TOPIC#${topic}#`
      }
    });

    const response = await docClient.send(command);
    return response.Items || [];
  }

  // Get single question
  async getQuestion(year, subject, questionId) {
    // Optimization: Use Global Secondary Index for direct lookup by questionId
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'QuestionIdIndex',
      KeyConditionExpression: 'questionId = :qid',
      ExpressionAttributeValues: {
        ':qid': questionId
      }
    });

    const response = await docClient.send(command);
    return response.Items?.[0] || null;
  }

  // Update question
  async updateQuestion(year, subject, questionId, updates) {
    // First get the existing item to find its SK
    const existing = await this.getQuestion(year, subject, questionId);
    if (!existing) throw new Error('Question not found');

    const protectedFields = new Set([
      'PK',
      'SK',
      'questionId',
      'createdAt',
      'updatedAt',
      'askedCount',
      'timesUsed',
      'correctCount',
      'incorrectCount'
    ]);
    const updateExpressions = [];
    const expressionValues = {};
    const expressionNames = {};

    Object.keys(updates).forEach((key) => {
      if (!protectedFields.has(key) && updates[key] !== undefined) {
        updateExpressions.push(`#${key} = :${key}`);
        expressionValues[`:${key}`] = updates[key];
        expressionNames[`#${key}`] = key;
      }
    });

    updateExpressions.push('#updatedAt = :updatedAt');
    expressionValues[':updatedAt'] = Date.now();
    expressionNames['#updatedAt'] = 'updatedAt';

    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: existing.PK,
        SK: existing.SK
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeValues: expressionValues,
      ExpressionAttributeNames: expressionNames,
      ReturnValues: 'ALL_NEW'
    });

    const response = await docClient.send(command);
    return response.Attributes;
  }

  // Delete question
  async deleteQuestion(year, subject, questionId) {
    const existing = await this.getQuestion(year, subject, questionId);
    if (!existing) throw new Error('Question not found');

    const command = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: existing.PK,
        SK: existing.SK
      }
    });

    await docClient.send(command);
    return { deleted: true, questionId };
  }

  // Get all subjects and years (for dropdowns)
  async getMetadata() {
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      ProjectionExpression: '#year, #subject, #topic',
      ExpressionAttributeNames: {
        '#year': 'year',
        '#subject': 'subject',
        '#topic': 'topic'
      }
    });

    const response = await docClient.send(command);
    
    const years = new Set();
    const subjects = new Set();
    const topics = new Map(); // subject -> Set of topics

    response.Items?.forEach(item => {
      if (item.year) years.add(item.year);
      if (item.subject) {
        subjects.add(item.subject);
        if (!topics.has(item.subject)) {
          topics.set(item.subject, new Set());
        }
        if (item.topic) {
          topics.get(item.subject).add(item.topic);
        }
      }
    });

    return {
      years: Array.from(years).sort((a, b) => a - b),
      subjects: Array.from(subjects).sort(),
      topics: Object.fromEntries(
        Array.from(topics.entries()).map(([subject, topicSet]) => [
          subject,
          Array.from(topicSet).sort()
        ])
      )
    };
  }

  // Update question statistics after practice
  async updateQuestionStats(year, subject, questionId, isCorrect) {
    const existing = await this.getQuestion(year, subject, questionId);
    if (!existing) return null;

    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: existing.PK,
        SK: existing.SK
      },
      UpdateExpression: 'SET timesUsed = timesUsed + :inc, #correctCount = #correctCount + :correctInc, #incorrectCount = #incorrectCount + :incorrectInc',
      ExpressionAttributeValues: {
        ':inc': 1,
        ':correctInc': isCorrect ? 1 : 0,
        ':incorrectInc': isCorrect ? 0 : 1
      },
      ExpressionAttributeNames: {
        '#correctCount': 'correctCount',
        '#incorrectCount': 'incorrectCount'
      },
      ReturnValues: 'UPDATED_NEW'
    });

    const response = await docClient.send(command);
    return response.Attributes;
  }

  // Count how many times a question was shown to students in practice
  async incrementQuestionAskedCount(year, subject, questionId) {
    const existing = await this.getQuestion(year, subject, questionId);
    if (!existing) return null;

    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: existing.PK,
        SK: existing.SK
      },
      UpdateExpression: 'SET #askedCount = if_not_exists(#askedCount, :zero) + :inc, #updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':zero': 0,
        ':inc': 1,
        ':updatedAt': Date.now()
      },
      ExpressionAttributeNames: {
        '#askedCount': 'askedCount',
        '#updatedAt': 'updatedAt'
      },
      ReturnValues: 'UPDATED_NEW'
    });

    const response = await docClient.send(command);
    return response.Attributes;
  }
}

export default new DynamoDBService();
