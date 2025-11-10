import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StudentDashboard from './StudentDashboard';
import { SidebarProvider } from '../../contexts/SidebarContext';
import { NotificationProvider } from '../../contexts/NotificationContext';

const wrap = (ui) => (
  <NotificationProvider>
    <SidebarProvider>
      <MemoryRouter initialEntries={[{ pathname: '/student-dashboard' }]}> {ui} </MemoryRouter>
    </SidebarProvider>
  </NotificationProvider>
);

describe('StudentDashboard', () => {
  beforeEach(() => {
    // Stub localStorage user
    localStorage.setItem('advisys_user', JSON.stringify({ id: 9, role: 'student', token: 't' }));
    // Default fetch mocks for consultations, availability today, and calendar
    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      if (String(url).includes('/api/students/')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      if (String(url).includes('/api/availability/today')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      if (String(url).includes('/api/availability/calendar')) {
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('renders Upcoming Consultations header on mobile section', async () => {
    render(wrap(<StudentDashboard />));
    await waitFor(() => {
      expect(screen.getAllByText(/Upcoming Consultations/i)[0]).toBeInTheDocument();
    });
  });

  it('shows an upcoming consultation when present', async () => {
    const future = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      if (String(url).includes('/api/students/')) {
        return Promise.resolve({ ok: true, json: async () => ([{
          id: 101,
          start_datetime: future,
          end_datetime: new Date(Date.now() + 25 * 3600 * 1000).toISOString(),
          status: 'approved',
          topic: 'Thesis Guidance',
          mode: 'online',
          time: '2:00 PM',
          date: future,
          faculty: { name: 'Dr. Maria Santos', title: 'Professor of Computer Science' }
        }]) });
      }
      if (String(url).includes('/api/availability/today')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      if (String(url).includes('/api/availability/calendar')) {
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(wrap(<StudentDashboard />));
    await waitFor(() => {
      expect(screen.getAllByText(/Upcoming Consultations/i)[0]).toBeInTheDocument();
    });
    expect(screen.getByText(/Thesis Guidance/i)).toBeInTheDocument();
  });
});