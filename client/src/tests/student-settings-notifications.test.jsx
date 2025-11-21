/* global global */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SidebarProvider } from '../contexts/SidebarContext.jsx';
import StudentSettingsPage from '../pages/student/StudentSettingsPage.jsx';

const wrap = (ui) => (
  <SidebarProvider>
    <MemoryRouter initialEntries={[{ pathname: '/student-dashboard/settings' }]}> {ui} </MemoryRouter>
  </SidebarProvider>
);

describe('Student Settings - Notification Preferences', () => {
  beforeEach(() => {
    localStorage.setItem('advisys_token', 't');
    localStorage.setItem('advisys_user', JSON.stringify({ id: 9, role: 'student' }));
    vi.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input?.url || '';
      if (url.includes('/api/profile/me')) {
        return { ok: true, json: async () => ({ id: 9, full_name: 'Juan Dela Cruz', program: 'BSCS', year_level: '3', email: 's@example.com', avatar_url: null }) };
      }
      if (url.includes('/api/settings/users/9/notifications') && !String(input?.method).toUpperCase().includes('PATCH')) {
        return { ok: true, json: async () => ({ emailNotifications: true, notificationsMuted: false }) };
      }
      if (url.includes('/api/programs')) {
        return { ok: true, json: async () => ([]) };
      }
      if (url.includes('/api/settings/users/9/notifications') && String(input?.method).toUpperCase() === 'PATCH') {
        return { ok: true, json: async () => ({ success: true }) };
      }
      return { ok: true, json: async () => ({}) };
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('toggles email notifications and persists to localStorage', async () => {
    render(wrap(<StudentSettingsPage />));
    const navLabel = await screen.findByText(/Notifications/i);
    await userEvent.click(navLabel);
    const checkboxes = await screen.findAllByRole('checkbox');
    const emailToggle = checkboxes[0];
    await userEvent.click(emailToggle);
    const stored = localStorage.getItem('advisys_email_notifications_9');
    expect(stored === 'true' || stored === 'false').toBe(true);
  });

  it('toggles mute all and persists to localStorage', async () => {
    render(wrap(<StudentSettingsPage />));
    const navLabel = await screen.findByText(/Notifications/i);
    await userEvent.click(navLabel);
    const checkboxes = await screen.findAllByRole('checkbox');
    const muteToggle = checkboxes[1];
    await userEvent.click(muteToggle);
    const stored = localStorage.getItem('advisys_notifications_muted_9');
    expect(stored === 'true' || stored === 'false').toBe(true);
  });
});