import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdvisorAvailability from './AdvisorAvailability.jsx';
import { SidebarProvider } from '../../contexts/SidebarContext.jsx';
import { NotificationProvider } from '../../contexts/NotificationContext.jsx';

function setupLocalStorage(user) {
  const store = {
    advisys_user: JSON.stringify(user),
    advisys_token: 'advisor-token',
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

describe('AdvisorAvailability', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setupLocalStorage({ id: 5, role: 'advisor', full_name: 'Dr. Smith' });

    vi.stubGlobal('fetch', vi.fn(async (input, init) => {
      const url = typeof input === 'string' ? input : input?.url || '';
      if (url.includes('/api/profile/me')) {
        return { ok: true, json: async () => ({ full_name: 'Dr. Smith' }) };
      }
      if (url.includes('/api/notifications')) {
        return { ok: true, json: async () => [] };
      }
      if (url.includes('/api/advisors/5/slots') && url.includes('month=')) {
        return { ok: true, json: async () => [] };
      }
      return { ok: true, json: async () => ({}) };
    }));
  });

  const renderWithProviders = (ui) => {
    return render(
      <NotificationProvider>
        <SidebarProvider>
          <MemoryRouter initialEntries={[{ pathname: '/advisor-dashboard/availability' }]}>
            {ui}
          </MemoryRouter>
        </SidebarProvider>
      </NotificationProvider>
    );
  };

  it('shows empty state when no slots for selected day', async () => {
    renderWithProviders(<AdvisorAvailability />);
    expect(await screen.findByText('No consultation slots for this day.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Add Slot' })).toBeInTheDocument();
  });

  it('opens Create Consultation Slot modal when Add Slot clicked', async () => {
    renderWithProviders(<AdvisorAvailability />);
    const addBtn = await screen.findByRole('button', { name: '+ Add Slot' });
    addBtn.click();
    expect(await screen.findByText('Create Consultation Slot')).toBeInTheDocument();
  });
});