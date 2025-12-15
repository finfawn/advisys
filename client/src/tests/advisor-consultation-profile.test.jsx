import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SidebarProvider } from '../contexts/SidebarContext.jsx';
import AdvisorSettingsPage from '../pages/advisor/AdvisorSettingsPage.jsx';

const wrap = (ui) => (
  <SidebarProvider>
    <MemoryRouter initialEntries={[{ pathname: '/advisor-dashboard/settings' }]}> {ui} </MemoryRouter>
  </SidebarProvider>
);

describe('Advisor Consultation Profile Editing', () => {
  beforeEach(() => {
    localStorage.setItem('advisys_user', JSON.stringify({ id: 7, role: 'advisor' }));
  });
  afterEach(() => {
    localStorage.clear();
  });

  it('adds a topic', async () => {
    render(wrap(<AdvisorSettingsPage />));
    const consultNavText = await screen.findAllByText(/Consultation/i);
    const consultBtn = consultNavText.map(t => t.closest('button')).find(Boolean);
    if (consultBtn) fireEvent.click(consultBtn);
    fireEvent.click(await screen.findByTestId('consult-edit-btn'));
    const input = await screen.findByPlaceholderText(/Thesis Guidance/i);
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
    const nameInput = await screen.findByPlaceholderText(/Intro to Programming/i);
    const codeInput = await screen.findByPlaceholderText(/CS101/i);
    fireEvent.change(nameInput, { target: { value: 'Intro to Programming' } });
    fireEvent.change(codeInput, { target: { value: 'CS101' } });
    fireEvent.click(screen.getByRole('button', { name: /Add course/i }));
    // Name input should reflect the added row
    expect(await screen.findByDisplayValue(/Intro to Programming/i)).toBeInTheDocument();
    // Code input can be one of multiple textboxes; ensure at least one matches
    const codeInputs = await screen.findAllByDisplayValue(/CS101/i);
    expect(codeInputs.length).toBeGreaterThan(0);
  });
});
