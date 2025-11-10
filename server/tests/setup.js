// Global Jest setup for server route tests
const path = require('path');

// Ensure predictable environment defaults used by routes
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || 'test-key';
process.env.MAIL_FROM = process.env.MAIL_FROM || 'no-reply@example.com';
process.env.MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || 'AdviSys';
process.env.DISABLE_STT_UPLOAD = process.env.DISABLE_STT_UPLOAD || 'true';

// Shared mock for DB pool query; tests can override implementation per case
global.__mockPoolQuery = jest.fn(async () => {
  throw new Error('mockPoolQuery not implemented in this test');
});

// Mock the DB pool module used by route files
jest.mock('../db/pool', () => ({
  getPool: () => ({
    // Direct pool queries
    query: (...args) => global.__mockPoolQuery(...args),
    // Connection-based transactions used in routes
    getConnection: async () => ({
      beginTransaction: jest.fn(async () => {}),
      commit: jest.fn(async () => {}),
      rollback: jest.fn(async () => {}),
      query: (...args) => global.__mockPoolQuery(...args),
      release: jest.fn(() => {}),
    }),
  }),
}));

// Mock email sending service
jest.mock('../services/email', () => ({
  sendEmail: jest.fn().mockResolvedValue({ ok: true }),
}));

// Mock AI summarization service
jest.mock('../services/ai', () => ({
  summarizeConsultation: jest.fn().mockResolvedValue('Mock summary'),
}));

// Provide a fetch mock for ai_debug route regardless of Node fetch availability
global.fetch = jest.fn(async (url) => {
  const u = String(url || '');
  if (u.includes('generativelanguage.googleapis.com')) {
    return {
      ok: true,
      json: async () => ({ models: [{ name: 'gemini-1.5-pro', supported_generation_methods: ['generateContent'] }] })
    };
  }
  return { ok: true, json: async () => ({}) };
});

// Utility to create an Express app and mount a route under a base path
const express = require('express');
global.__createAppWithRoute = function createAppWithRoute(basePath, routeModule) {
  const app = express();
  app.use(express.json());
  app.use(basePath, routeModule);
  return app;
};

// Silence console noise in tests; tests can re-enable selectively
const origError = console.error;
const origWarn = console.warn;
console.error = (...args) => {
  if (process.env.DEBUG_LOGS === 'true') origError(...args);
};
console.warn = (...args) => {
  if (process.env.DEBUG_LOGS === 'true') origWarn(...args);
};