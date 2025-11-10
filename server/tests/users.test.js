const request = require('supertest');

describe('Users routes', () => {
  let app;
  let route;

  beforeEach(() => {
    jest.resetModules();
    global.__mockPoolQuery.mockReset();
    route = require('../routes/users');
    app = global.__createAppWithRoute('/api/users', route);
  });

  test('GET /api/users/students returns list of students', async () => {
    global.__mockPoolQuery.mockResolvedValueOnce([[{ id: 1, name: 'Stu A', email: 'a@x.com', status: 'active', program: 'CS', year_level: 1 }]]);
    const res = await request(app).get('/api/users?role=student').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toMatchObject({ id: 1, name: 'Stu A', role: 'student' });
  });

  test('GET /api/users/advisors returns list of advisors', async () => {
    global.__mockPoolQuery.mockResolvedValueOnce([[{ id: 2, name: 'Adv B', email: 'b@x.com', status: 'active', department: 'Math', title: 'Professor' }]]);
    const res = await request(app).get('/api/users?role=advisor').expect(200);
    expect(res.body[0]).toMatchObject({ id: 2, name: 'Adv B', role: 'advisor' });
  });
});