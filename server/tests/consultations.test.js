const request = require('supertest');

describe('Consultations routes', () => {
  let app;
  let route;

  beforeEach(() => {
    jest.resetModules();
    global.__mockPoolQuery.mockReset();
    // Mock jsonwebtoken before requiring the route so auth middleware uses the mock
    jest.doMock('jsonwebtoken', () => ({
      verify: jest.fn(() => ({ id: 20, email: 's@example.com', role: 'student' })),
    }));
    route = require('../routes/consultations');
    // Mount under '/api' to match production server mounting
    app = global.__createAppWithRoute('/api', route);
  });

  test('POST /api/consultations returns 400 when required fields missing', async () => {
    const res = await request(app)
      .post('/api/consultations')
      .set('Authorization', 'Bearer t')
      .send({})
      .expect(400);
    expect(res.body.error).toBeDefined();
  });

  test('GET /api/consultations/students/:id returns list for student', async () => {
    // First query: main consultations join result
    global.__mockPoolQuery.mockResolvedValueOnce([
      [
        {
          id: 1,
          topic: 'Enrollment',
          status: 'scheduled',
          mode: 'online',
          start_datetime: '2025-01-01T10:00:00.000Z',
          end_datetime: '2025-01-01T10:30:00.000Z',
          advisor_user_id: 99,
          advisor_name: 'Prof X',
          advisor_title: 'Professor',
        },
      ],
    ]);
    // Second query: guidelines for consultation id
    global.__mockPoolQuery.mockResolvedValueOnce([
      [
        { guideline_text: 'Be prepared' },
        { guideline_text: 'Bring ID' },
      ],
    ]);
    const res = await request(app)
      .get('/api/students/20/consultations')
      .set('Authorization', 'Bearer t')
      .expect(200);
    expect(res.body[0]).toMatchObject({ topic: 'Enrollment' });
  });
});