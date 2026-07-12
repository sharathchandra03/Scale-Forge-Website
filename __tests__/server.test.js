const request = require('supertest');

// Mock the database so tests don't need MySQL
jest.mock('../backend/database/connection', () => ({
  query: jest.fn().mockResolvedValue([]),
  raw: jest.fn().mockResolvedValue(undefined),
  closePool: jest.fn(),
}));

const app = require('../backend/server');

describe('GET /api/health', () => {
  test('returns 200 with service name', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.service).toBe('scaleforge');
  });
});

describe('GET /blog – public page routing', () => {
  test('serves the standalone blog page', async () => {
    const res = await request(app).get('/blog');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toContain('ScaleForge Blog');
  });

  test('serves blog post routes from the same page', async () => {
    const res = await request(app).get('/blog/sample-post');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toContain('ScaleForge Blog');
  });
});

describe('GET /admin – admin panel', () => {
  test('serves the admin panel HTML', async () => {
    const res = await request(app).get('/admin');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toContain('ScaleForge');
  });
});

describe('GET / – homepage', () => {
  test('serves the main index.html', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toContain('ScaleForge');
  });
});

describe('API 404 handling', () => {
  test('returns JSON 404 for unknown API routes', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
