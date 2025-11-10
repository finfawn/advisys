// Global setup for Vitest + Testing Library
import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Ensure DOM is cleaned up between tests
afterEach(() => {
  cleanup();
});

// Provide minimal mocks for browser APIs commonly used in components
if (!('matchMedia' in window)) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });
}

// ResizeObserver mock
if (typeof window.ResizeObserver === 'undefined') {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Stub Notification API for tests that may trigger native notifications
if (typeof window.Notification === 'undefined') {
  window.Notification = function(title, opts) {
    this.title = title;
    this.opts = opts;
    this.close = () => {};
  };
  window.Notification.permission = 'granted';
  window.Notification.requestPermission = vi.fn().mockResolvedValue('granted');
}
// Default visibility/focus to avoid test flakiness around native notifications
try {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  document.hasFocus = () => true;
} catch (_) {}

// IntersectionObserver mock
if (typeof window.IntersectionObserver === 'undefined') {
  window.IntersectionObserver = class {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
    root = null;
    rootMargin = '';
    thresholds = [];
  };
}

// Stub localStorage for tests that use it directly
if (!('localStorage' in globalThis)) {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}