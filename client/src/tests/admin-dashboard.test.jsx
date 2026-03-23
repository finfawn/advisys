/* global global */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SidebarProvider } from '../contexts/SidebarContext.jsx';
import AdminDashboard from '../pages/admin/AdminDashboard.jsx';

const wrap = (ui) => (
  <SidebarProvider>
    <MemoryRouter initialEntries={[{ pathname: '/admin-dashboard' }]}>
      {ui}
    </MemoryRouter>
  </SidebarProvider>
);

describe('Admin Dashboard - backend data loading', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.setItem('advisys_token', 't');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('fetches summary and monthly mode and renders cards', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      if (String(url).includes('/api/settings/academic/terms')) {
        return {
          ok: true,
          json: async () => ([
            { id: 9, year_label: '2026-2027', semester_label: 'First', is_current: 1 },
            { id: 8, year_label: '2025-2026', semester_label: 'Second', is_current: 0 },
          ]),
        };
      }
      if (String(url).includes('/api/dashboard/admin/summary')) {
        return {
          ok: true,
          json: async () => ({
            totalCompleted: 10,
            studentsByYear: [],
            modeBreakdown: [],
            averageSessionMinutes: 45,
            statusBreakdown: [],
            trend: {
              month: { current: [], previous: [] },
              week: { current: [], previous: [] },
            },
            topTopics: [],
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });
    render(wrap(<AdminDashboard />));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(screen.getByLabelText(/Dashboard scope/i)).toBeInTheDocument();
    expect(screen.getByText(/Students Consulted/i)).toBeInTheDocument();
  });
});
