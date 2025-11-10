const request = require('supertest');

describe('Dashboard routes', () => {
  let app;
  let route;

  beforeEach(() => {
    jest.resetModules();
    global.__mockPoolQuery.mockReset();
    route = require('../routes/dashboard');
    app = global.__createAppWithRoute('/api/dashboard', route);
  });

  test('GET /api/dashboard/advisors/:id/summary returns aggregated metrics', async () => {
    // The route runs multiple queries; provide sequential mocked responses
    global.__mockPoolQuery
      .mockResolvedValueOnce([[{ total: 12 }]]) // Total completed consultations
      .mockResolvedValueOnce([[{ year_level: '1', count: 5 }]]) // Year distribution
      .mockResolvedValueOnce([[{ mode: 'online', count: 8 }]]) // Mode breakdown
      .mockResolvedValueOnce([[{ avg_minutes: 45 }]]) // Average session length
      .mockResolvedValueOnce([[{ y: 2024, m: 5 }]]) // monthNow
      .mockResolvedValueOnce([[{ y: 2024, m: 4 }]]) // monthPrev
      .mockResolvedValueOnce([[{ d: 1, count: 2 }, { d: 2, count: 3 }]]) // monthCurrRows
      .mockResolvedValueOnce([[{ d: 1, count: 1 }, { d: 2, count: 2 }]]) // monthPrevRows
      .mockResolvedValueOnce([[{ dow: 2, count: 1 }, { dow: 3, count: 2 }]]) // weekCurrRows
      .mockResolvedValueOnce([[{ dow: 2, count: 0 }, { dow: 3, count: 1 }]]) // weekPrevRows
      .mockResolvedValueOnce([[{ name: 'Enrollment', count: 7 }]]); // Top topics

    const res = await request(app).get('/api/dashboard/advisors/10/summary').expect(200);
    expect(res.body.totalCompleted).toBe(12);
    expect(res.body.modeBreakdown.online).toBe(8);
    expect(res.body.yearDistribution[1]).toBe(5);
    expect(res.body.averageSessionMinutes).toBe(45);
    expect(res.body.trend.month.current).toEqual([{ day: 1, count: 2 }, { day: 2, count: 3 }]);
    expect(res.body.trend.week.current).toEqual([{ day: 'Mon', count: 1 }, { day: 'Tue', count: 2 }]);
    expect(res.body.topTopics).toEqual([{ name: 'Enrollment', count: 7 }]);
  });
});