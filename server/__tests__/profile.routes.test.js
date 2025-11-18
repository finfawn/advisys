jest.mock('../middleware/auth', () => ({
  authMiddleware: (req, _res, next) => {
    req.user = { id: 1, role: 'student' };
    next();
  },
}));

const express = require('express');
const request = require('supertest');

const queries = [];
jest.mock('../db/pool', () => ({
  getPool: () => ({
    query: async (sql, params) => {
      queries.push({ sql, params });
      if (/FROM users WHERE id = \?/i.test(sql)) {
        return [[{ id: 1, role: 'student', email: 'student@example.com', full_name: 'Juan Dela Cruz' }]];
      }
      if (/FROM student_profiles WHERE user_id = \?/i.test(sql)) {
        return [[{ program: 'BS Computer Science', year_level: '3', avatar_url: null }]];
      }
      if (/UPDATE users SET/i.test(sql)) {
        return [{ affectedRows: 1 }];
      }
      if (/UPDATE student_profiles SET/i.test(sql)) {
        return [{ affectedRows: 1 }];
      }
      return [[/* default empty */]];
    },
  }),
}));

const router = require('../routes/profile');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/profile', router);
  return app;
}

test('GET /api/profile/me returns current user profile', async () => {
  const app = makeApp();
  const res = await request(app)
    .get('/api/profile/me')
    .set('Authorization', 'Bearer test');

  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({
    id: 1,
    role: 'student',
    email: 'student@example.com',
    program: 'BS Computer Science',
    year_level: '3',
  });
});

test('PATCH /api/profile/me updates user and student profile fields', async () => {
  queries.length = 0;
  const app = makeApp();
  const payload = {
    firstName: 'Juan',
    lastName: 'Cruz',
    email: 'student@example.com',
    program: 'BS IT',
    year_level: '4',
  };
  const res = await request(app)
    .patch('/api/profile/me')
    .set('Authorization', 'Bearer test')
    .send(payload);

  expect(res.status).toBe(200);
  expect(res.body).toEqual({ success: true });

  const sqls = queries.map(q => q.sql);
  expect(sqls.some(s => /UPDATE users SET/i.test(s))).toBe(true);
  expect(sqls.some(s => /UPDATE student_profiles SET/i.test(s))).toBe(true);
});