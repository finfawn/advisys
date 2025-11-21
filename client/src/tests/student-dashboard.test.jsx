/* global global */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SidebarProvider } from '../contexts/SidebarContext.jsx';
import { NotificationProvider } from '../contexts/NotificationContext.jsx';
import StudentDashboard from '../pages/student/StudentDashboard.jsx';

const wrap = (ui) => (
  <NotificationProvider>
    <SidebarProvider>
      <MemoryRouter initialEntries={[{ pathname: '/student-dashboard' }]}>
        {ui}
      </MemoryRouter>
    </SidebarProvider>
  </NotificationProvider>
);

describe('Student Dashboard', () => {
  beforeEach(() => {
    localStorage.setItem('advisys_user', JSON.stringify({ id: 9, role: 'student', token: 't' }));
    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      const u = String(url);
      if (u.includes('/api/students/')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      if (u.includes('/api/availability/today')) {
        return Promise.resolve({ ok: true, json: async () => ([{ id: 1, name: 'Dr. Smith', title: 'Professor', schedule: '10:00 AM', time: '10:00 AM', mode: 'online' }]) });
      }
      if (u.includes('/api/availability/calendar')) {
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('shows Upcoming Consultations section', async () => {
    render(wrap(<StudentDashboard />));
    expect(await screen.findByText(/Upcoming Consultations/i)).toBeInTheDocument();
  });

  it('shows Available Today with CTA', async () => {
    render(wrap(<StudentDashboard />));
    expect(await screen.findByText(/Available Today/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Browse All Advisors/i })).toBeInTheDocument();
  });
});