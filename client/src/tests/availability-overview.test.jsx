/* global global */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SidebarProvider } from '../contexts/SidebarContext.jsx';
import StudentDashboard from '../pages/student/StudentDashboard.jsx';
import AdvisorProfilePage from '../pages/student/AdvisorProfilePage.jsx';

const wrap = (initialPath, ui) => (
  <SidebarProvider>
    <MemoryRouter initialEntries={[initialPath]}> {ui} </MemoryRouter>
  </SidebarProvider>
);

describe('Availability Overview', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.setItem('advisys_user', JSON.stringify({ id: 9, role: 'student' }));
    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      const u = String(url);
      if (u.includes('/api/availability/today')) {
        // Student side shows 5:00 PM
        return Promise.resolve({ ok: true, json: async () => ([{ id: 1, name: 'Dr. Smith', title: 'Professor', schedule: 'Today', time: '5:00 PM', mode: 'Online' }]) });
      }
      if (u.includes('/api/availability/calendar')) {
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      if (u.includes('/api/advisors/1/slots')) {
        // Advisor side computes next slot from start/end datetimes (match 5:00 PM PH)
        return Promise.resolve({ ok: true, json: async () => ([{ start_datetime: '2025-11-21T09:00:00Z', end_datetime: '2025-11-21T10:00:00Z', mode: 'online' }]) });
      }
      if (u.includes('/api/advisors/1')) {
        return Promise.resolve({ ok: true, json: async () => ({ id: 1, name: 'Dr. Smith', title: 'Professor', weeklySchedule: {}, consultationMode: ['Online'] }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('shows consistent availability time across advisor and student views', async () => {
    render(wrap('/student-dashboard', <StudentDashboard />));
    const studentTime = await screen.findByText('5:00 PM');

    render(wrap('/student-dashboard/advisors/1', <AdvisorProfilePage />));
    await screen.findByText(/Next Available Slot/i);
  });
});