import request from 'supertest';
import app from '../server.js';
import { describe, it, expect } from 'vitest';

describe('Health endpoint', () => {
  it('GET /healthz returns ok: true', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true });
  });
});

