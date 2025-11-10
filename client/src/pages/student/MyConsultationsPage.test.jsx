import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MyConsultationsPage from './MyConsultationsPage.jsx';
import { SidebarProvider } from '../../contexts/SidebarContext.jsx';
import { NotificationProvider } from '../../contexts/NotificationContext.jsx';

function setupLocalStorage(user) {
  const store = {
    advisys_user: JSON.stringify(user),
    advisys_token: 'test-token',
  };
  vi.stubGlobal('localStorage', {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = value; },
    removeItem: (key) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    key: (index) => Object.keys(store)[index] ?? null,
    get length() { return Object.keys(store).length; },
  });
}

describe('MyConsultationsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setupLocalStorage({ id: 1, role: 'student', full_name: 'Student User' });

    const future = new Date(Date.now() + 60 * 60 * 1000); // 1 hour ahead
    const futureDate = future.toISOString();
    const futureTimeLabel = future.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    const past = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    const pastDate = past.toISOString();
    const pastTimeLabel = past.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    const consultations = [
      {
        id: 101,
        topic: 'Thesis Review',
        status: 'approved',
        mode: 'online',
        start_datetime: futureDate,
        end_datetime: new Date(future.getTime() + 60 * 60 * 1000).toISOString(),
        date: futureDate,
        time: futureTimeLabel,
        faculty: { avatar: 'A', name: 'Dr. Advisor', title: 'Faculty Advisor' },
      },
      {
        id: 102,
        topic: 'Project Consultation',
        status: 'completed',
        mode: 'in-person',
        start_datetime: pastDate,
        end_datetime: new Date(past.getTime() + 60 * 60 * 1000).toISOString(),
        date: pastDate,
        time: pastTimeLabel,
        faculty: { avatar: 'B', name: 'Prof. Mentor', title: 'Senior Lecturer' },
      },
    ];

    vi.stubGlobal('fetch', vi.fn(async (input, init) => {
      const url = typeof input === 'string' ? input : input?.url || '';
      if (url.includes('/api/students/') && url.includes('/consultations')) {
        return {
          ok: true,
          json: async () => consultations,
        };
      }
      if (url.includes('/api/notifications')) {
        return { ok: true, json: async () => [] };
      }
      if (url.includes('/api/profile/me')) {
        return { ok: true, json: async () => ({ full_name: 'Student User' }) };
      }
      return { ok: true, json: async () => ({}) };
    }));
  });

  const renderWithProviders = (ui) => {
    return render(
      <NotificationProvider>
        <SidebarProvider>
          <MemoryRouter initialEntries={[{ pathname: '/student-dashboard/consultations' }]}>
            {ui}
          </MemoryRouter>
        </SidebarProvider>
      </NotificationProvider>
    );
  };

  it('renders Upcoming Consultations and shows approved future item', async () => {
    renderWithProviders(<MyConsultationsPage />);

    expect(await screen.findByText('Upcoming Consultations')).toBeInTheDocument();
    expect(await screen.findByText('Thesis Review')).toBeInTheDocument();
    expect(screen.getByText(/Approved/i)).toBeInTheDocument();
    expect(screen.getByText(/Add New Consultation/i)).toBeInTheDocument();
  });

  it('navigates to History tab and shows section title', async () => {
    renderWithProviders(<MyConsultationsPage />);

    const historyTab = await screen.findByRole('button', { name: /History/i });
    historyTab.click();

    expect(await screen.findByText('Consultation History')).toBeInTheDocument();
    expect(await screen.findByText('Project Consultation')).toBeInTheDocument();
  });

  it('shows empty state in Requests tab when no pending or declined', async () => {
    renderWithProviders(<MyConsultationsPage />);

    const requestsTab = await screen.findByRole('button', { name: /Requests/i });
    requestsTab.click();

    expect(await screen.findByText('Consultation Requests')).toBeInTheDocument();
    expect(await screen.findByText('No pending requests')).toBeInTheDocument();
  });
});