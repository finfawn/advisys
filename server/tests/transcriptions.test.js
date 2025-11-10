const request = require('supertest');

describe('Transcriptions routes', () => {
  let app;
  let route;

  beforeEach(() => {
    jest.resetModules();
    global.__mockPoolQuery.mockReset();
    route = require('../routes/transcriptions');
    app = global.__createAppWithRoute('/api', route); // routes are /transcriptions...
  });

  test('POST /api/transcriptions rejects missing required fields', async () => {
    const res = await request(app).post('/api/transcriptions').send({ text: 'hi' }).expect(400);
    expect(res.body.error).toMatch(/meetingId, text, and timestamp are required/i);
  });

  test('POST /api/transcriptions accepts entry and stores in DB', async () => {
    // Resolve consultation by meetingId via direct id format
    global.__mockPoolQuery.mockResolvedValueOnce([{ insertId: 55 }]);
    const res = await request(app)
      .post('/api/transcriptions')
      .send({ meetingId: 'advisys-42', text: 'Hello', timestamp: new Date().toISOString(), speaker: 'advisor' })
      .expect(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/transcriptions/upload bypasses STT when DISABLE_STT_UPLOAD=true', async () => {
    const webm = Buffer.from('1a45dfa3', 'hex'); // minimal bytes
    global.__mockPoolQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await request(app)
      .post('/api/transcriptions/upload')
      .attach('file', webm, 'audio.webm')
      .field('consultationId', '100')
      .expect(200);
    expect(res.body.bypassed).toBe(true);
  });
});