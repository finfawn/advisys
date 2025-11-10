const request = require('supertest');

describe('Availability routes', () => {
  let app;
  let route;

  beforeEach(() => {
    jest.resetModules();
    global.__mockPoolQuery.mockReset();
    route = require('../routes/availability');
    app = global.__createAppWithRoute('/api/availability', route);
  });

  test('GET /api/availability/today returns advisors available today', async () => {
    // Mock one availability row for today
    global.__mockPoolQuery.mockResolvedValueOnce([
      [
        {
          id: 9,
          full_name: 'Adv Nine',
          title: 'Professor',
          department: 'CS',
          start_time: '09:00:00',
          end_time: '11:00:00',
          online_enabled: 1,
          in_person_enabled: 0,
        },
      ],
    ]);
    const res = await request(app).get('/api/availability/today').expect(200);
    expect(res.body[0]).toMatchObject({ id: 9, name: 'Adv Nine' });
  });

  test('GET /api/availability/calendar returns monthly view', async () => {
    // First call: cleanup delete query (no-op)
    global.__mockPoolQuery.mockResolvedValueOnce([[]]);
    // Second call: slots for month
    global.__mockPoolQuery.mockResolvedValueOnce([
      [
        {
          id: 7,
          full_name: 'Adv Seven',
          start_datetime: '2024-05-01T08:00:00.000Z',
          end_datetime: '2024-05-01T10:00:00.000Z',
          mode: 'online',
          status: 'available',
        },
      ],
    ]);
    const res = await request(app).get('/api/availability/calendar?month=2024-05').expect(200);
    expect(res.body['2024-05-01'][0]).toMatchObject({ id: 7, name: 'Adv Seven', mode: 'Online' });
    expect(typeof res.body['2024-05-01'][0].slots).toBe('string');
  });
});