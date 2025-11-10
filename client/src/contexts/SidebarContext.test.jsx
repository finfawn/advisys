import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { SidebarProvider, useSidebar } from './SidebarContext';

const wrapper = ({ children }) => (
  <SidebarProvider>{children}</SidebarProvider>
);

describe('SidebarContext', () => {
  it('exposes collapsed state and toggles', () => {
    const { result } = renderHook(() => useSidebar(), { wrapper });
    expect(result.current.collapsed).toBe(false);
    act(() => result.current.toggleSidebar());
    expect(result.current.collapsed).toBe(true);
    act(() => result.current.setCollapsed(false));
    expect(result.current.collapsed).toBe(false);
  });
});