import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SidebarProvider } from '../contexts/SidebarContext.jsx';
import AdvisorDashboard from '../pages/advisor/AdvisorDashboard.jsx';

const wrap = (ui) => (
  <SidebarProvider>
    <MemoryRouter initialEntries={[{ pathname: '/advisor-dashboard' }]}> {ui} </MemoryRouter>
  </SidebarProvider>
);

describe('Advisor Dashboard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.setItem('advisys_user', JSON.stringify({ id: 7, role: 'advisor' }));
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      if (String(url).includes('/api/advisors/7')) {
        return {
          ok: true,
          json: async () => ({
            id: 7,
            topicsCanHelpWith: [],
            consultationGuidelines: [],
            consultationMode: [],
            weeklySchedule: {},
          }),
        };
      }
      if (String(url).includes('/api/advisors/7/slots')) {
        return { ok: true, json: async () => [] };
      }
      if (String(url).includes('/api/dashboard/advisors/7/summary')) {
        return { ok: true, json: async () => ({ totalCompleted: 100, yearDistribution: { 1: 20, 2: 30, 3: 25, 4: 25 }, modeBreakdown: { online: 50, in_person: 50 }, averageSessionMinutes: 45 }) };
      }
      if (String(url).includes('/api/consultations/advisors/7/consultations')) {
        return { ok: true, json: async () => ([]) };
      }
      return { ok: true, json: async () => ({}) };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('renders key analytics cards', async () => {
    render(wrap(<AdvisorDashboard />));
    expect(await screen.findByText(/Consultation Trend/i)).toBeInTheDocument();
  });
});