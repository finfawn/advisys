const request = require('supertest');

describe('Advisors routes', () => {
  let app;
  let route;

  beforeEach(() => {
    jest.resetModules();
    global.__mockPoolQuery.mockReset();
    route = require('../routes/advisors');
    app = global.__createAppWithRoute('/api/advisors', route);
  });

  test('GET /api/advisors returns advisor list with availability', async () => {
    global.__mockPoolQuery
      .mockResolvedValueOnce([[{ id: 10, full_name: 'Advisor X', department: 'CS' }]]) // Advisors list
      .mockResolvedValueOnce([[{ day_of_week: 'monday', start_time: '09:00', end_time: '17:00' }]]) // Advisor availability
      .mockResolvedValueOnce([[{ online_enabled: 1, in_person_enabled: 0 }]]); // Advisor modes
    const res = await request(app).get('/api/advisors').expect(200);
    expect(res.body[0]).toMatchObject({
      id: 10,
      name: 'Advisor X',
      department: 'CS',
      schedule: 'Mon',
      time: '9:00 AM–5:00 PM',
      mode: 'Online',
    });
  });

  test('GET /api/advisors/:id returns profile detail', async () => {
    global.__mockPoolQuery
      .mockResolvedValueOnce([[{ id: 10, full_name: 'Advisor X', title: 'CS', department: 'CS', bio: '...', office_location: 'Office 101' }]]) // Advisor profile
      .mockResolvedValueOnce([[{ topic: 'Math' }]]) // Topics
      .mockResolvedValueOnce([[{ guideline_text: 'Be prepared' }]]) // Guidelines
      .mockResolvedValueOnce([[{ course_name: 'Calculus' }]]) // Courses
      .mockResolvedValueOnce([[{ online_enabled: 1, in_person_enabled: 1 }]]) // Modes
      .mockResolvedValueOnce([[{ day_of_week: 'monday', start_time: '09:00', end_time: '17:00' }]]); // Availability
    const res = await request(app).get('/api/advisors/10').expect(200);
    expect(res.body).toMatchObject({
      id: 10,
      name: 'Advisor X',
      title: 'CS',
      department: 'CS',
      bio: '...',
      officeLocation: 'Office 101',
      topicsCanHelpWith: ['Math'],
      consultationGuidelines: ['Be prepared'],
      coursesTaught: ['Calculus'],
      weeklySchedule: {
        monday: '9:00 AM - 5:00 PM',
        tuesday: 'Unavailable',
        wednesday: 'Unavailable',
        thursday: 'Unavailable',
        friday: 'Unavailable',
        saturday: 'Unavailable',
        sunday: 'Unavailable'
      },
      consultationMode: ['In-person', 'Online'],
    });
  });
});