const request = require('supertest');

// Ensure JWT is mocked so authMiddleware accepts our test token
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(() => ({ id: 11, email: 'n@example.com' })),
}));

describe('Notifications routes', () => {
  let app;
  let route;

  beforeEach(() => {
    jest.resetModules();
    global.__mockPoolQuery.mockReset();
    route = require('../routes/notifications');
    app = global.__createAppWithRoute('/api/notifications', route);
  });

  test('GET /api/notifications/users/:userId/notifications returns user notifications', async () => {
    // Route expects pool.query to return [rows]; provide one notification row
    global.__mockPoolQuery.mockResolvedValueOnce([[{
      id: 1,
      user_id: 11,
      type: 'info',
      title: 'Test',
      message: 'Hello',
      data_json: null,
      is_read: 0,
      created_at: new Date().toISOString(),
    }]]);

    const res = await request(app)
      .get('/api/notifications/users/11/notifications')
      .set('Authorization', 'Bearer t')
      .expect(200);

    expect(res.body[0]).toMatchObject({ message: 'Hello', type: 'info' });
  });

  test('POST /api/notifications creates a notification', async () => {
    // First INSERT returns [result] where result.insertId is used
    // Second SELECT returns [[row]] for the created notification
    global.__mockPoolQuery
      .mockResolvedValueOnce([{ insertId: 99 }])
      .mockResolvedValueOnce([[{
        id: 99,
        user_id: 11,
        type: 'test',
        title: 'Test Notification',
        message: 'New',
        data_json: null,
        is_read: 0,
        created_at: new Date().toISOString(),
      }]]);

    const res = await request(app)
      .post('/api/notifications')
      .send({ user_id: 11, type: 'test', title: 'Test Notification', message: 'New' })
      .expect(201);

    expect(res.body.id).toBe(99);
    expect(res.body).toMatchObject({ message: 'New', type: 'test', title: 'Test Notification' });
  });
});