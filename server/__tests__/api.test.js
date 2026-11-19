const request = require('supertest');
const express = require('express');
const cors = require('cors');
const pool = require('../db');

// Mock database pour les tests
jest.mock('../db', () => ({
  query: jest.fn(),
  on: jest.fn(),
}));

const questionsRouter = require('../routes/questions');
const scoresRouter = require('../routes/scores');
const authRouter = require('../routes/auth');

function createTestApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/questions', questionsRouter);
  app.use('/api/scores', scoresRouter);
  app.use('/api/auth', authRouter);
  return app;
}

describe('API Questions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/questions - Récupérer les questions', async () => {
    const mockQuestions = [
      { id: 1, question: 'Test question', choices: ['A', 'B', 'C', 'D'], answer: 0, category: 'test', difficulty: 'easy' },
    ];
    pool.query.mockResolvedValue({ rows: mockQuestions });

    const app = createTestApp();
    const response = await request(app).get('/api/questions');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body[0]).toHaveProperty('question');
    expect(response.body[0]).toHaveProperty('correctIndex');
  });

  test('GET /api/questions avec filtres', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const app = createTestApp();
    const response = await request(app).get('/api/questions?category=web&difficulty=easy');

    expect(response.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('category'),
      expect.arrayContaining(['web', 'easy'])
    );
  });
});

describe('API Scores', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/scores - Soumettre un score', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1, question: 'Q1', choices: ['A', 'B', 'C', 'D'], answer: 0 }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, pseudo: 'TestUser', score: 1, points: 100 }] });

    const app = createTestApp();
    const response = await request(app)
      .post('/api/scores')
      .send({ pseudo: 'TestUser', answers: [0], points: 100, mode: 'solo' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('score');
    expect(response.body).toHaveProperty('total');
  });

  test('POST /api/scores - Données invalides', async () => {
    const app = createTestApp();
    const response = await request(app).post('/api/scores').send({ pseudo: 'Test' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  test('GET /api/scores - Récupérer le leaderboard', async () => {
    const mockScores = [
      { pseudo: 'User1', score: 10, points: 3000, mode: 'solo', created_at: '2024-01-01' },
    ];
    pool.query.mockResolvedValue({ rows: mockScores });

    const app = createTestApp();
    const response = await request(app).get('/api/scores');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});

describe('API Auth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/auth/register - Inscription valide', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 1, pseudo: 'NewUser', created_at: '2024-01-01' }] });

    const app = createTestApp();
    const response = await request(app)
      .post('/api/auth/register')
      .send({ pseudo: 'NewUser', password: 'password123' });

    expect(response.status).toBe(201);
    expect(response.body.user).toHaveProperty('pseudo', 'NewUser');
  });

  test('POST /api/auth/register - Pseudo déjà utilisé', async () => {
    const error = new Error('duplicate key');
    error.code = '23505';
    pool.query.mockRejectedValue(error);

    const app = createTestApp();
    const response = await request(app)
      .post('/api/auth/register')
      .send({ pseudo: 'ExistingUser', password: 'password123' });

    expect(response.status).toBe(409);
    expect(response.body.error).toContain('déjà utilisé');
  });

  test('POST /api/auth/register - Mot de passe trop court', async () => {
    const app = createTestApp();
    const response = await request(app)
      .post('/api/auth/register')
      .send({ pseudo: 'NewUser', password: '123' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('min 4 caractères');
  });

  test('GET /api/auth/me - Sans token', async () => {
    const app = createTestApp();
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.error).toContain('Token');
  });
});
