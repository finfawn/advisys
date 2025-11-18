const router = require('../routes/auth');

test('exports an Express router', () => {
  expect(typeof router).toBe('function');
  expect(typeof router.use).toBe('function');
});