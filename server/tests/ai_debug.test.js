const request = require('supertest');

describe('AI Debug routes', () => {
  let app;
  let route;

  beforeEach(() => {
    jest.resetModules();
    route = require('../routes/ai_debug');
    app = global.__createAppWithRoute('/api', route);
  });

  test('GET /api/ai/models returns list when API key set', async () => {
    process.env.AI_SUMMARY_API_KEY = 'key';
    const res = await request(app).get('/api/ai/models').expect(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.endpoints[0].count).toBeGreaterThanOrEqual(1);
  });

  test('GET /api/ai/models 400 when API key missing', async () => {
    delete process.env.AI_SUMMARY_API_KEY;
    const res = await request(app).get('/api/ai/models').expect(400);
    expect(res.body.error).toMatch(/AI_SUMMARY_API_KEY is not set/i);
  });
});