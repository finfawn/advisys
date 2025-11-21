/* global global */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SidebarProvider } from '../contexts/SidebarContext.jsx';
import AdvisorListPage from '../pages/student/AdvisorListPage.jsx';

const wrap = (ui) => (
  <SidebarProvider>
    <MemoryRouter initialEntries={[{ pathname: '/student-dashboard/advisors' }]}> 
      {ui} 
    </MemoryRouter>
  </SidebarProvider>
);

describe('Browse Advisors', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      const u = String(url);
      if (u.includes('/api/advisors')) {
        return Promise.resolve({ ok: true, json: async () => ([
          { id: 1, name: 'Dr. Smith', title: 'Professor', avatar: null, schedule: 'Tue, Thu', time: '10:00 AM', mode: 'Online' },
          { id: 2, name: 'Dr. Reyes', title: 'Associate Professor', avatar: null, schedule: 'Mon, Wed', time: '1:00 PM', mode: 'In-person' },
        ]) });
      }
      if (u.includes('/api/consultations/students/')) {
        return Promise.resolve({ ok: true, json: async () => ([]) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    localStorage.setItem('advisys_user', JSON.stringify({ id: 9, role: 'student' }));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('renders advisor list with basic details', async () => {
    render(wrap(<AdvisorListPage />));
    expect(await screen.findByText(/Faculty Advisors/i)).toBeInTheDocument();
    // Header and advisor cards render
    expect(await screen.findByText('Dr. Smith')).toBeInTheDocument();
    expect(await screen.findByText('Dr. Reyes')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /View Profile/i }).length).toBeGreaterThan(0);
  });
});