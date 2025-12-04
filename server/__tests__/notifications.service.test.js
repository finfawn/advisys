jest.mock('../db/pool', () => ({
  getPool: () => ({
    query: async () => { throw new Error('no-db'); },
  }),
}));

const svc = require('../services/notifications');

test('exports notify and getNotificationSettings', () => {
  expect(typeof svc.notify).toBe('function');
  expect(typeof svc.getNotificationSettings).toBe('function');
});

test('getNotificationSettings returns safe defaults without DB', async () => {
  const s = await svc.getNotificationSettings(1);
  expect(s).toMatchObject({
    email_notifications: false,
    notifications_muted: false,
  });
});

test('notify handles errors and does not throw', async () => {
  await expect(svc.notify(null, 1, 'system_announcement', 't', 'm')).resolves.toBeNull();
});
