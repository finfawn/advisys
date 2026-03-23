import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SidebarProvider } from '../contexts/SidebarContext.jsx';
import AdvisorSettingsPage from '../pages/advisor/AdvisorSettingsPage.jsx';

const wrap = (ui) => (
  <SidebarProvider>
    <MemoryRouter initialEntries={[{ pathname: '/advisor-dashboard/profile' }]}> {ui} </MemoryRouter>
  </SidebarProvider>
);

describe('Advisor Consultation Profile Editing', () => {
  beforeEach(() => {
    localStorage.setItem('advisys_user', JSON.stringify({ id: 7, role: 'advisor' }));
    global.fetch = vi.fn(async (input, init = {}) => {
      const url = String(input);
      const method = String(init?.method || 'GET').toUpperCase();

      if (url.includes('/api/profile/me') && method === 'GET') {
        return {
          ok: true,
          json: async () => ({
            full_name: 'Taylor Advisor',
            department: 'College of Information Technology',
            title: 'Faculty Advisor',
            email: 'advisor@example.com',
          }),
        };
      }

      if (url.includes('/api/advisors/7') && method === 'GET') {
        return {
          ok: true,
          json: async () => ({
            bio: 'Advisor bio',
            topicsCanHelpWith: [],
            consultationGuidelines: [],
            coursesTaught: [],
          }),
        };
      }

      if (url.includes('/api/settings/users/7/notifications') && method === 'GET') {
        return {
          ok: true,
          json: async () => ({ emailNotifications: true, notificationsMuted: false }),
        };
      }

      if (url.includes('/api/settings/advisors/7') && method === 'GET') {
        return {
          ok: true,
          json: async () => ({ autoAcceptRequests: false, maxDailyConsultations: 10 }),
        };
      }

      if (url.includes('/api/departments') && method === 'GET') {
        return {
          ok: true,
          json: async () => [{ id: 1, name: 'College of Information Technology' }],
        };
      }

      if (url.includes('/api/consultation-catalog') && method === 'GET') {
        return {
          ok: true,
          json: async () => ({
            topics: [{ id: 1, name: 'Course Planning and Enrollment' }],
            subjects: [{ id: 1, subject_code: 'CS201', subject_name: 'Database Systems' }],
          }),
        };
      }

      return {
        ok: true,
        json: async () => ({}),
      };
    });
  });
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('adds a topic', async () => {
    render(wrap(<AdvisorSettingsPage />));
    const consultNavText = await screen.findAllByText(/Consultation/i);
    const consultBtn = consultNavText.map(t => t.closest('button')).find(Boolean);
    if (consultBtn) fireEvent.click(consultBtn);
    fireEvent.click(await screen.findByTestId('consult-edit-btn'));
    fireEvent.click(await screen.findByRole('button', { name: /select a category/i }));
    fireEvent.click(await screen.findByText(/Other, specify/i));
    const input = await screen.findByPlaceholderText(/Specify another topic/i);
    fireEvent.change(input, { target: { value: 'Thesis Guidance' } });
    fireEvent.click(screen.getByRole('button', { name: /Add topic/i }));
    expect(await screen.findByText('Thesis Guidance')).toBeInTheDocument();
  });

  it('adds a guideline', async () => {
    render(wrap(<AdvisorSettingsPage />));
    const consultNavText2 = await screen.findAllByText(/Consultation/i);
    const consultBtn2 = consultNavText2.map(t => t.closest('button')).find(Boolean);
    if (consultBtn2) fireEvent.click(consultBtn2);
    fireEvent.click(await screen.findByTestId('consult-edit-btn'));
    const input = await screen.findByPlaceholderText(/agenda 24 hours/i);
    fireEvent.change(input, { target: { value: 'Submit agenda 24 hours before' } });
    fireEvent.click(screen.getByRole('button', { name: /Add guideline/i }));
    expect(await screen.findByText(/Submit agenda 24 hours before/i)).toBeInTheDocument();
  });

  it('adds a course', async () => {
    render(wrap(<AdvisorSettingsPage />));
    const consultNavText3 = await screen.findAllByText(/Consultation/i);
    const consultBtn3 = consultNavText3.map(t => t.closest('button')).find(Boolean);
    if (consultBtn3) fireEvent.click(consultBtn3);
    fireEvent.click(await screen.findByTestId('consult-edit-btn'));
    fireEvent.click(await screen.findByRole('button', { name: /select a subject/i }));
    fireEvent.click(await screen.findByText(/Other, specify/i));
    const codeInput = await screen.findByPlaceholderText(/Code \(e\.g\., CS101\)/i);
    const nameInput = await screen.findByPlaceholderText(/Subject name/i);
    fireEvent.change(codeInput, { target: { value: 'CS401' } });
    fireEvent.change(nameInput, { target: { value: 'Software Engineering' } });
    fireEvent.click(screen.getByRole('button', { name: /Add subject/i }));
    expect(await screen.findByText(/Software Engineering \(CS401\)/i)).toBeInTheDocument();
  });
});
