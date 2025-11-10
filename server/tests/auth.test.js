const request = require('supertest');

describe('Auth routes', () => {
  let app;
  let route;

  beforeEach(() => {
    jest.resetModules();
    global.__mockPoolQuery.mockReset();
    route = require('../routes/auth');
    app = global.__createAppWithRoute('/api/auth', route);
  });

  test('POST /api/auth/register creates user and returns token', async () => {
    const insertedId = 101;
    // Align with route implementation: it expects firstName/lastName, and checks existing email
    global.__mockPoolQuery
      .mockResolvedValueOnce([[]]) // check existing email: no rows
      .mockResolvedValueOnce([{ insertId: insertedId }]) // insert user
      .mockResolvedValueOnce([{}]) // insert student/advisor profile (generic success)
      .mockResolvedValueOnce([{}]); // insert advisor_modes when advisor (no-op for student)

    const res = await request(app)
      .post('/api/auth/register')
      .send({ firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com', password: 'Secret123', role: 'student' })
      .expect(200);

    expect(res.body.token).toBeDefined();
    expect(res.body.user).toMatchObject({ id: insertedId, role: 'student' });
  });

  test('POST /api/auth/login with invalid credentials returns 401', async () => {
    // user lookup returns one row, but bcrypt.compare will be mocked to fail
    global.__mockPoolQuery.mockResolvedValueOnce([[{ id: 5, email: 'x@example.com', password_hash: 'hash', role: 'advisor' }]]);
    jest.doMock('bcrypt', () => ({ hash: jest.fn(), compare: jest.fn().mockResolvedValue(false) }));
    // re-require route under this bcrypt mock
    jest.resetModules();
    route = require('../routes/auth');
    app = global.__createAppWithRoute('/api/auth', route);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'x@example.com', password: 'wrong' })
      .expect(401);

    // Route returns 'Invalid credentials' on failure
    expect(res.body.error).toMatch(/Invalid credentials/i);
  });

  test('POST /api/auth/forgot-password sends email even if user exists', async () => {
    global.__mockPoolQuery.mockResolvedValueOnce([[{ id: 22, email: 'bob@example.com', full_name: 'Bob' }]]);
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'bob@example.com' })
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/auth/change-password validates current password', async () => {
    // authMiddleware depends on Authorization; mock JWT verify to return user id.
    // Mock jsonwebtoken BEFORE re-requiring the route, so the middleware uses the mock.
    jest.resetModules();
    jest.doMock('jsonwebtoken', () => ({
      verify: jest.fn(() => ({ id: 7, email: 'c@example.com' })),
    }));

    // user lookup and update
    global.__mockPoolQuery
      .mockResolvedValueOnce([[{ id: 7, password_hash: 'old-hash' }]]) // read current user
      .mockResolvedValueOnce([{ affectedRows: 1 }]); // update hash

    // bcrypt.compare returns true to validate current password
    jest.doMock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('new-hash'), compare: jest.fn().mockResolvedValue(true) }));
    route = require('../routes/auth');
    app = global.__createAppWithRoute('/api/auth', route);

    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', 'Bearer token')
      .send({ currentPassword: 'Old', newPassword: 'NewStrong123' })
      .expect(200);
    expect(res.body.success).toBe(true);
  });
});