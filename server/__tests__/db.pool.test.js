const { getPool } = require('../db/pool');

test('getPool returns a pool-like object', () => {
  const pool = getPool();
  expect(pool).toBeTruthy();
  expect(typeof pool.query).toBe('function');
});