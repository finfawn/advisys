const request = require('supertest');

describe('Uploads routes', () => {
  let app;
  let route;

  beforeEach(() => {
    jest.resetModules();
    // Mock jsonwebtoken before requiring the route so auth middleware uses the mock
    jest.doMock('jsonwebtoken', () => ({
      verify: jest.fn(() => ({ id: 12 })),
    }));
    route = require('../routes/uploads');
    app = global.__createAppWithRoute('/api/uploads', route);
  });

  test('POST /api/uploads/avatar rejects non-image', async () => {
    const res = await request(app)
      .post('/api/uploads/avatar')
      .set('Authorization', 'Bearer t')
      .attach('avatar', Buffer.from('not-an-image'), 'file.txt')
      .expect(500);
    expect(res.body.error).toMatch(/Failed to upload avatar|Only image files/i);
  });

  test('POST /api/uploads/avatar accepts image and returns url', async () => {
    const pngBuffer = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108020000009077c53d0000000a4944415408d763f8ffff3f0005fe02fea0f5ad0d0000000049454e44ae426082',
      'hex'
    );
    const res = await request(app)
      .post('/api/uploads/avatar')
      .set('Authorization', 'Bearer t')
      .attach('avatar', pngBuffer, 'avatar.png')
      .expect(200);
    expect(res.body.url).toMatch(/\/uploads\/avatars\/avatar_/);
  });
});