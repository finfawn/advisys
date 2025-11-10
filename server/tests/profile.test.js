const request = require('supertest');

describe('Profile routes', () => {
  let app;
  let route;

  beforeEach(() => {
    jest.resetModules();
    global.__mockPoolQuery.mockReset();
    // Mock jsonwebtoken before requiring the route so auth middleware uses the mock
    jest.doMock('jsonwebtoken', () => ({
      verify: jest.fn(() => ({ id: 5, email: 'x@example.com', role: 'student' })),
    }));
    route = require('../routes/profile');
    app = global.__createAppWithRoute('/api/profile', route);
  });

  test('GET /api/profile/me returns current user profile', async () => {
    global.__mockPoolQuery
      .mockResolvedValueOnce([[{ id: 5, full_name: 'User X', email: 'x@example.com', role: 'student' }]])
      .mockResolvedValueOnce([[]]); // student_profiles empty
    const res = await request(app).get('/api/profile/me').set('Authorization', 'Bearer t').expect(200);
    expect(res.body).toMatchObject({ id: 5, full_name: 'User X' });
  });

  test('PATCH /api/profile/me updates user profile', async () => {
    global.__mockPoolQuery
      .mockResolvedValueOnce([{}]) // UPDATE users
      .mockResolvedValueOnce([[{ role: 'student' }]]) // SELECT role
      .mockResolvedValueOnce([{}]); // UPDATE student_profiles
    const res = await request(app)
      .patch('/api/profile/me')
      .set('Authorization', 'Bearer t')
      .send({ full_name: 'User X New' })
      .expect(200);
    expect(res.body.success).toBe(true);
  });
});