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
      if (String(url).includes('/api/dashboard/admin/summary')) {
        return { ok: true, json: async () => ({ totalCompleted: 10, studentsByYear: [], modeBreakdown: {}, averageSessionMinutes: 45, statusBreakdown: {}, trend: [], topTopics: [] }) };
      }
      if (String(url).includes('/api/dashboard/admin/monthly-mode')) {
        return { ok: true, json: async () => ({}) };
      }
      return { ok: true, json: async () => ({}) };
    });
    render(wrap(<AdminDashboard />));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(screen.getByText(/Export/i)).toBeInTheDocument();
  });
});