const request = require('supertest');

describe('Auth middleware', () => {
  let app;

  beforeEach(() => {
    jest.resetModules();
    const { authMiddleware } = require('../middleware/auth');
    const express = require('express');
    app = express();
    app.get('/protected', authMiddleware, (req, res) => {
      res.json({ ok: true, user: req.user });
    });
  });

  test('rejects missing Authorization header', async () => {
    await request(app)
      .get('/protected')
      .expect(401);
  });

  test('accepts valid JWT and sets req.user', async () => {
    const jwt = require('jsonwebtoken');
    jest.spyOn(jwt, 'verify').mockImplementation(() => ({ id: 3, email: 't@example.com', role: 'student' }));
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer abc123')
      .expect(200);
    expect(res.body.user).toMatchObject({ id: 3, email: 't@example.com' });
  });
});