/* global global */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VerifyEmail from '../pages/VerifyEmail.jsx';

const setup = (email = 'new@example.com') => {
  const initialUrl = `/verify-email?email=${encodeURIComponent(email)}`;
  return render(
    <MemoryRouter initialEntries={[initialUrl]}> <VerifyEmail /> </MemoryRouter>
  );
};

describe('Email Verification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('submits 6-digit code and stores auth', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'v-token', user: { id: 9, role: 'student' } })
    });
    setup();
    const codeInput = screen.getByPlaceholderText('••••••');
    fireEvent.change(codeInput, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify/i }));
    await waitFor(() => {
      expect(localStorage.getItem('advisys_token')).toBe('v-token');
      const user = JSON.parse(localStorage.getItem('advisys_user'));
      expect(user.role).toBe('student');
    });
  });

  it('resends code and starts cooldown', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Resend code/i }));
    expect(await screen.findByText(/a new code was sent/i)).toBeInTheDocument();
  });
});