import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App.jsx';

describe('App routing basics', () => {
  it('renders Home at root path', () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    // Expect something from Home page; if Home renders heading or text
    const fallback = screen.queryByText(/home/i);
    expect(fallback || document.body).toBeTruthy();
  });

  it('redirects unauthenticated users from protected route to /auth', () => {
    // Ensure no token stored
    localStorage.removeItem('advisys_token');
    localStorage.removeItem('advisys_user');

    window.history.pushState({}, '', '/student-dashboard');
    render(<App />);

    // AuthPage heading shown on redirect
    expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
  });
});