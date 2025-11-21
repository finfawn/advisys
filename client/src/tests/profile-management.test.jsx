/* global global */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SidebarProvider } from '../contexts/SidebarContext.jsx';
import StudentSettingsPage from '../pages/student/StudentSettingsPage.jsx';

const wrap = (ui) => (
  <SidebarProvider>
    <MemoryRouter initialEntries={[{ pathname: '/student-dashboard/settings' }]}>
      {ui}
    </MemoryRouter>
  </SidebarProvider>
);

describe('Profile Management - avatar upload backend', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.setItem('advisys_token', 't');
    localStorage.setItem('advisys_user', JSON.stringify({ id: 9, role: 'student' }));
    vi.spyOn(global, 'fetch').mockImplementation(async (url, opts) => {
      const u = String(url);
      if (u.includes('/api/profile/me') && (!opts || !String(opts.method).toUpperCase().includes('PATCH'))) {
        return { ok: true, json: async () => ({ id: 9, full_name: 'Juan Dela Cruz', program: 'BSCS', year_level: '3', email: 's@example.com', avatar_url: null }) };
      }
      if (u.includes('/api/uploads/avatar')) {
        return { ok: true, json: async () => ({ url: '/uploads/avatars/x.png' }) };
      }
      return { ok: true, json: async () => ({}) };
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('shows uploaded avatar after successful backend upload', async () => {
    render(wrap(<StudentSettingsPage />));

    const file = new File(['x'], 'avatar.png', { type: 'image/png' });
    const inputEl = document.getElementById('profile-upload');
    Object.defineProperty(inputEl, 'files', { value: [file] });
    fireEvent.change(inputEl);
    const img = await screen.findByAltText('Profile');
    expect(img).toBeInTheDocument();
  });
});