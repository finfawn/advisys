import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

const setAuth = (token, user) => {
  if (token) localStorage.setItem('advisys_token', token);
  if (user) localStorage.setItem('advisys_user', JSON.stringify(user));
};

describe('RequireAuth routing guards', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({}) });
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('redirects unauthenticated users to /auth', async () => {
    window.history.pushState({}, '', '/student-dashboard');
    render(<App />);
    await waitFor(() => expect(window.location.pathname).toBe('/auth'));
  });

  it('allows student to access student routes', async () => {
    setAuth('token123', { id: 1, role: 'student' });
    window.history.pushState({}, '', '/student-dashboard');
    render(<App />);
    await waitFor(() => expect(window.location.pathname).toBe('/student-dashboard'));
  });

  it('redirects student away from advisor route to student dashboard', async () => {
    setAuth('token123', { id: 1, role: 'student' });
    window.history.pushState({}, '', '/advisor-dashboard');
    render(<App />);
    await waitFor(() => expect(window.location.pathname).toBe('/student-dashboard'));
  });

  it('redirects advisor away from student route to advisor dashboard', async () => {
    setAuth('token123', { id: 7, role: 'advisor' });
    window.history.pushState({}, '', '/student-dashboard');
    render(<App />);
    await waitFor(() => expect(window.location.pathname).toBe('/advisor-dashboard'));
  });
});