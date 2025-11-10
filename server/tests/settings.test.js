const request = require('supertest');

describe('Settings routes', () => {
  let app;
  let route;

  beforeEach(() => {
    jest.resetModules();
    global.__mockPoolQuery.mockReset();
    route = require('../routes/settings');
    app = global.__createAppWithRoute('/api/settings', route);
  });

  test('GET /api/settings/users/:id/notifications returns defaults when not set', async () => {
    global.__mockPoolQuery.mockResolvedValueOnce([[null]]);
    const res = await request(app).get('/api/settings/users/5/notifications').expect(200);
    expect(res.body).toMatchObject({ userId: 5, emailNotifications: true });
  });

  test('PATCH /api/settings/advisors/:id updates settings', async () => {
    global.__mockPoolQuery
      .mockResolvedValueOnce([[{ advisor_user_id: 7 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await request(app)
      .patch('/api/settings/advisors/7')
      .send({ autoAcceptRequests: true, maxDailyConsultations: 8 })
      .expect(200);
    expect(res.body.success).toBe(true);
  });
});