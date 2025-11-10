const request = require('supertest');

describe('Stream routes', () => {
  let app;
  let route;

  beforeEach(() => {
    jest.resetModules();
    process.env.STREAM_API_KEY = 'stream-key';
    process.env.STREAM_API_SECRET = 'stream-secret';
    // Mock Stream SDK
    jest.doMock('@stream-io/node-sdk', () => {
      const upsertUsers = jest.fn().mockResolvedValue({});
      const createToken = jest.fn(() => 'user-token');
      const getOrCreate = jest.fn().mockResolvedValue({});
      return {
        StreamClient: class {
          constructor() {}
          upsertUsers = upsertUsers;
          createToken = createToken;
          video = { call: (type, id) => ({ getOrCreate }) };
        },
      };
    });
    route = require('../routes/stream');
    app = global.__createAppWithRoute('/api/stream', route);
  });

  test('GET /api/stream/debug confirms client readiness', async () => {
    const res = await request(app).get('/api/stream/debug').expect(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.clientReady).toBe(true);
  });

  test('POST /api/stream/token returns token and apiKey', async () => {
    const res = await request(app)
      .post('/api/stream/token')
      .send({ userId: 'user-1', name: 'User 1', callId: 'call-1', type: 'default' })
      .expect(200);
    expect(res.body.token).toBe('user-token');
    expect(res.body.apiKey).toBe('stream-key');
    expect(res.body.user).toMatchObject({ id: 'user-1' });
  });
});