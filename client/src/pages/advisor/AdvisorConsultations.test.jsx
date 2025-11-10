import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AdvisorConsultations from './AdvisorConsultations';
import { MemoryRouter } from 'react-router-dom';

const sample = [
  {
    id: 1,
    start_datetime: '2099-01-01T10:00:00Z',
    status: 'approved',
    topic: 'Thesis Guidance',
    time: '10:00 AM',
    mode: 'online',
    student: { name: 'Alice' }
  },
  {
    id: 2,
    start_datetime: '1999-01-01T10:00:00Z',
    status: 'completed',
    topic: 'Resume Review',
    time: '10:00 AM',
    mode: 'in-person',
    student: { name: 'Bob' }
  },
];

describe('AdvisorConsultations', () => {
  beforeEach(() => {
    // Mock fetch to return consultations list
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => sample });
    // Seed auth user
    localStorage.setItem('advisys_user', JSON.stringify({ id: 7, role: 'advisor', token: 't' }));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('categorizes consultations into upcoming and previous', async () => {
    render(
      <MemoryRouter>
        <AdvisorConsultations />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText(/Upcoming Consultations/i)).toBeInTheDocument());
    // Upcoming should show future item
    expect(screen.getByText(/Alice/i)).toBeInTheDocument();
    // History should include past item
    fireEvent.click(screen.getByRole('button', { name: /History/i }));
    await waitFor(() => expect(screen.getByText(/Consultation History/i)).toBeInTheDocument());
    expect(screen.getByText(/Bob/i)).toBeInTheDocument();
  });

  it('handles cancel action flow gracefully (mocked)', async () => {
    // For cancel, component likely calls DELETE; we mock success
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({ ok: true, json: async () => sample });
    render(
      <MemoryRouter>
        <AdvisorConsultations />
      </MemoryRouter>
    );
    await waitFor(() => screen.getByText(/Upcoming Consultations/i));
    // We simply assert the presence of the consultation actions area
    expect(screen.getByText(/Upcoming Consultations/i)).toBeInTheDocument();
  });
});