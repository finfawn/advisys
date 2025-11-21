/* global global */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import App from '../App.jsx';

const setAuth = (token, user) => {
  if (token) localStorage.setItem('advisys_token', token);
  if (user) localStorage.setItem('advisys_user', JSON.stringify(user));
};

describe('Routing Guards', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({}) });
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('redirects unauthenticated to /auth', async () => {
    window.history.pushState({}, '', '/student-dashboard');
    render(<App />);
    await waitFor(() => expect(window.location.pathname).toBe('/auth'));
  });

  it('student accessing advisor routes is redirected to student dashboard', async () => {
    setAuth('t', { id: 1, role: 'student' });
    window.history.pushState({}, '', '/advisor-dashboard');
    render(<App />);
    await waitFor(() => expect(window.location.pathname).toBe('/student-dashboard'));
  });

  it('advisor accessing student routes is redirected to advisor dashboard', async () => {
    setAuth('t2', { id: 7, role: 'advisor' });
    window.history.pushState({}, '', '/student-dashboard');
    render(<App />);
    await waitFor(() => expect(window.location.pathname).toBe('/advisor-dashboard'));
  });

  it('admin can access admin routes', async () => {
    setAuth('t3', { id: 99, role: 'admin' });
    window.history.pushState({}, '', '/admin-dashboard');
    render(<App />);
    await waitFor(() => expect(window.location.pathname).toBe('/admin-dashboard'));
  });
});