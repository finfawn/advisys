import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AuthPage from './AuthPage';

const mockFetch = () => {
  return vi.spyOn(global, 'fetch');
};

describe('AuthPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('shows validation errors for empty email and password', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/auth' }]}>
        <AuthPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    expect(await screen.findByText(/Email is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/Password is required/i)).toBeInTheDocument();
  });

  it('logs in student and redirects to student dashboard', async () => {
    const fetchSpy = mockFetch();
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'abc', user: { id: 1, role: 'student' } })
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: '/auth' }]}>
        <AuthPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: 's1@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(localStorage.getItem('advisys_token')).toBe('abc');
      const user = JSON.parse(localStorage.getItem('advisys_user'));
      expect(user.role).toBe('student');
    });
  });

  it('registers advisor and redirects to advisor dashboard', async () => {
    const fetchSpy = mockFetch();
    // First call is register
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'xyz', user: { id: 7, role: 'advisor' } })
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: '/auth' }]}>
        <AuthPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Create account/i }));

    fireEvent.change(screen.getByPlaceholderText(/First Name/i), { target: { value: 'Ada' } });
    fireEvent.change(screen.getByPlaceholderText(/Last Name/i), { target: { value: 'Lovelace' } });
    fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: 'ada@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'secret123' } });

    // Select Advisor role via Lightswind Select: click placeholder then pick item
    const selectRoleButton = await screen.findByTestId('role-select-trigger');
    fireEvent.click(selectRoleButton);
    fireEvent.click(screen.getByText(/Advisor/i));

      // Department select
      const selectDepartmentButton = await screen.findByTestId('department-select-trigger');
    fireEvent.click(selectDepartmentButton);
    fireEvent.click(screen.getByText(/College of Information Technology/i));

    fireEvent.click(screen.getByRole('button', { name: /Register/i }));

    await waitFor(() => {
      expect(localStorage.getItem('advisys_token')).toBe('xyz');
      const user = JSON.parse(localStorage.getItem('advisys_user'));
      expect(user.role).toBe('advisor');
    });
  });

  it('shows server error on failed login', async () => {
    const fetchSpy = mockFetch();
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid credentials' })
    });

    render(
      <MemoryRouter>
        <AuthPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: 'bad@example.com' } });
    // Use a valid-length password so validation passes and server error can be displayed
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    expect(await screen.findByText(/Invalid credentials/i)).toBeInTheDocument();
  });
});