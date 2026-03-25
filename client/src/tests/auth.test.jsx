/* global global */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AuthPage from '../pages/AuthPage.jsx';

const okJson = (body) => ({
  ok: true,
  status: 200,
  json: async () => body,
});

const failJson = (status, body) => ({
  ok: false,
  status,
  json: async () => body,
});

const installFetchMock = (handlers = {}) => {
  return vi.spyOn(global, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes('/healthz')) return okJson({ ok: true });
    if (url.includes('/api/auth/login') && handlers.login) return handlers.login(url);
    if (url.includes('/api/auth/register') && handlers.register) return handlers.register(url);
    if (url.includes('/api/auth/forgot-password') && handlers.forgotPassword) return handlers.forgotPassword(url);
    return failJson(500, { error: `Unhandled fetch: ${url}` });
  });
};

const setup = (path = '/auth') => {
  return render(
    <MemoryRouter initialEntries={[{ pathname: path }]}> <AuthPage /> </MemoryRouter>
  );
};

describe('Authentication', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('validates empty login form', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));
    expect(await screen.findByText(/Email is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/Password is required/i)).toBeInTheDocument();
  });

  it('rejects invalid email format on login', async () => {
    setup();
    fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: 'invalid' } });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));
    expect(await screen.findByText(/Email is invalid/i)).toBeInTheDocument();
  });

  it('logs in student and stores token/user', async () => {
    installFetchMock({
      login: async () => okJson({ token: 't-stu', user: { id: 9, role: 'student' } }),
    });
    setup();
    fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: 's@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));
    await waitFor(() => {
      expect(localStorage.getItem('advisys_token')).toBe('t-stu');
      const user = JSON.parse(localStorage.getItem('advisys_user'));
      expect(user.role).toBe('student');
    });
  });

  it('logs in admin and navigates to admin dashboard', async () => {
    installFetchMock({
      login: async () => okJson({ token: 't-admin', user: { id: 1, role: 'admin' } }),
    });
    setup();
    fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: 'admin@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));
    await waitFor(() => {
      expect(localStorage.getItem('advisys_token')).toBe('t-admin');
      const user = JSON.parse(localStorage.getItem('advisys_user'));
      expect(user.role).toBe('admin');
    });
  });

  it('shows error for invalid credentials', async () => {
    installFetchMock({
      login: async () => failJson(400, { error: 'Invalid credentials' }),
    });
    setup();
    fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: 'bad@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));
    expect(await screen.findByText(/Invalid credentials/i)).toBeInTheDocument();
  });

  it('sends forgot password request to backend', async () => {
    const spy = installFetchMock({
      forgotPassword: async () => okJson({}),
    });
    setup('/auth');
    fireEvent.click(screen.getByText(/Forgot password\?/i));
    const dialog = await screen.findByRole('dialog');
    const emailInput = within(dialog).getByPlaceholderText(/Email/i);
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    const sendBtn = within(dialog).getByRole('button', { name: /Send link/i });
    fireEvent.click(sendBtn);
    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('/api/auth/forgot-password'), expect.any(Object));
    });
  });

  it('redirects to verification when email not verified (403)', async () => {
    installFetchMock({
      login: async () => failJson(403, { error: 'Email not verified' }),
    });
    setup();
    fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));
    expect(await screen.findByText(/Email not verified/i)).toBeInTheDocument();
  });

  it('shows deactivated notice on 403 with deactivated code', async () => {
    installFetchMock({
      login: async () => failJson(403, { error: 'Account deactivated', code: 'ACCOUNT_DEACTIVATED' }),
    });
    setup();
    fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: 'x@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));
    expect(await screen.findByText(/This account has been deactivated/i)).toBeInTheDocument();
  });

  it('registers student and stores token/user', async () => {
    installFetchMock({
      register: async () => okJson({ token: 't-new', user: { id: 11, role: 'student' } }),
    });

    setup();
    fireEvent.click(screen.getByRole('button', { name: /Create account/i }));
    fireEvent.change(screen.getByPlaceholderText(/First Name/i), { target: { value: 'Juan' } });
    fireEvent.change(screen.getByPlaceholderText(/Last Name/i), { target: { value: 'Cruz' } });
    fireEvent.change(screen.getByPlaceholderText(/^Email$/i), { target: { value: 'stud@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/^Password$/i), { target: { value: 'secret123' } });
    const progBtn = await screen.findByTestId('program-select-trigger');
    fireEvent.click(progBtn);
    fireEvent.click(screen.getByText(/Bachelor of Science in Information Technology/i));
    const yearBtn = await screen.findByTestId('yearlevel-select-trigger');
    fireEvent.click(yearBtn);
    fireEvent.click(screen.getByText(/3rd Year/i));
    fireEvent.click(screen.getByRole('button', { name: /Register/i }));
    await waitFor(() => {
      expect(localStorage.getItem('advisys_token')).toBe('t-new');
      const user = JSON.parse(localStorage.getItem('advisys_user'));
      expect(user.role).toBe('student');
    });
  });

  it('registers advisor via role select', async () => {
    installFetchMock({
      register: async () => okJson({ token: 't-adv', user: { id: 7, role: 'advisor' } }),
    });
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Create account/i }));
    const selectRoleButton = await screen.findByTestId('role-select-trigger');
    fireEvent.click(selectRoleButton);
    fireEvent.click(screen.getByText(/Advisor/i));
    fireEvent.change(screen.getByPlaceholderText(/First Name/i), { target: { value: 'Ada' } });
    fireEvent.change(screen.getByPlaceholderText(/Last Name/i), { target: { value: 'Lovelace' } });
    fireEvent.change(screen.getByPlaceholderText(/^Email$/i), { target: { value: 'ada@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/^Password$/i), { target: { value: 'secret123' } });
    const deptBtn = await screen.findByTestId('department-select-trigger');
    fireEvent.click(deptBtn);
    fireEvent.click(screen.getByText(/College/i));
    fireEvent.click(screen.getByRole('button', { name: /Register/i }));
    await waitFor(() => {
      expect(localStorage.getItem('advisys_token')).toBe('t-adv');
      const user = JSON.parse(localStorage.getItem('advisys_user'));
      expect(user.role).toBe('advisor');
    });
  });
});
