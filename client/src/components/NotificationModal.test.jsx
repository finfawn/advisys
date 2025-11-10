import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotificationModal from './NotificationModal';
import { NotificationProvider } from '../contexts/NotificationContext';

const wrapper = ({ children }) => (
  <MemoryRouter>
    <NotificationProvider>{children}</NotificationProvider>
  </MemoryRouter>
);

describe('NotificationModal', () => {
  it('renders tabs and empty state', () => {
    render(
      wrapper({
        children: <NotificationModal isOpen={true} onClose={() => {}} userType="student" />
      })
    );
    // Tabs present
    expect(screen.getByText(/View all/i)).toBeInTheDocument();
    expect(screen.getByText(/Unread/i)).toBeInTheDocument();
    // Empty state when no notifications
    expect(screen.getByText(/No notifications to show/i)).toBeInTheDocument();
  });

  it('switches to Unread tab', () => {
    render(
      wrapper({
        children: <NotificationModal isOpen={true} onClose={() => {}} userType="student" />
      })
    );
    const unreadTab = screen.getByText(/Unread/i);
    fireEvent.click(unreadTab);
    expect(unreadTab).toHaveClass('active');
  });
});