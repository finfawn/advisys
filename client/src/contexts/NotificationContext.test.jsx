import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { NotificationProvider, useNotifications } from './NotificationContext';

const wrapper = ({ children }) => (
  <NotificationProvider>{children}</NotificationProvider>
);

describe('NotificationContext', () => {
  let setIntervalSpy;
  let clearIntervalSpy;

  beforeEach(() => {
    // Mock setInterval and clearInterval to prevent polling during tests
    setIntervalSpy = vi.spyOn(global, 'setInterval').mockReturnValue(123); // Return a dummy ID
    clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    // Mock fetch to return empty notifications by default
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => [] });
    // Mock Notification API
    global.Notification = function(title, opts) {
      // no-op stub
      this.title = title;
      this.opts = opts;
      this.close = () => {};
    };
    global.Notification.permission = 'granted';
    global.Notification.requestPermission = vi.fn().mockResolvedValue('granted');
    // Simulate unfocused tab to enable native notification path
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.hasFocus = () => false;
    localStorage.clear();
    // Seed current user
    localStorage.setItem('advisys_user', JSON.stringify({ id: 42, role: 'student' }));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('adds a notification and increments unreadCount', async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });
    expect(result.current.unreadCount).toBe(0);

    act(() => {
      result.current.addNotification({ title: 'Test', message: 'Hello' });
    });

    expect(result.current.notifications.length).toBe(1);
    expect(result.current.unreadCount).toBe(1);
  });

  it('marks a notification as read and updates unreadCount', async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });
    act(() => {
      result.current.addNotification({ title: 'A', message: 'B' });
      result.current.addNotification({ title: 'C', message: 'D' });
    });
    const firstId = result.current.notifications[0].id;
    expect(result.current.unreadCount).toBe(2);

    // Patch endpoint returns ok
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    await act(async () => {
      await result.current.markAsRead(firstId);
    });
    expect(result.current.unreadCount).toBe(1);
    expect(result.current.notifications.find(n => n.id === firstId)?.isRead).toBe(true);
  });

  it('marks all as read and sets unreadCount to 0', async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });
    act(() => {
      result.current.addNotification({ title: 'X' });
      result.current.addNotification({ title: 'Y' });
      result.current.addNotification({ title: 'Z' });
    });
    expect(result.current.unreadCount).toBe(3);

    // PATCH returns ok
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    await act(async () => {
      await result.current.markAllAsRead();
    });
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications.every(n => n.isRead)).toBe(true);
  });
});