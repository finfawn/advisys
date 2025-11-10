import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import { SidebarProvider } from '../../contexts/SidebarContext';

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const wrap = (ui) => (
    <SidebarProvider>
      <MemoryRouter initialEntries={[{ pathname: '/admin-dashboard' }]}>
        {ui}
      </MemoryRouter>
    </SidebarProvider>
  );

  it('renders top navbar and sidebar', () => {
    render(wrap(<AdminDashboard />));
    // Assert unique navbar elements to avoid ambiguous text matches
    // Logo has accessible alt text "AdviSys" and Notifications button has an aria-label
    expect(screen.getByAltText(/AdviSys/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Notifications/i)).toBeInTheDocument();
  });

  it('shows loading cards and then renders dashboard cards', () => {
    render(wrap(<AdminDashboard />));
    // Initially loading state; after 800ms, content should be loaded
    vi.advanceTimersByTime(900);
    // Cards are present (AdminTotalConsultationsCard, AdminDailyConsultationsCard, AdminTopTopicsCard)
    expect(screen.getByText(/Total Consultations/i)).toBeInTheDocument();
    expect(screen.getByText(/Daily Consultations/i)).toBeInTheDocument();
    expect(screen.getByText(/Top Consultation Topics/i)).toBeInTheDocument();
  });
});