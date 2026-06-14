const request = require('supertest');

jest.mock('node-fetch', () => jest.fn());
const fetch = require('node-fetch');

const app = require('../server');

describe('POST /submit – validation', () => {
  beforeEach(() => {
    fetch.mockReset();
    fetch.mockResolvedValue({ ok: true });
  });

  test('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/submit')
      .send({ email: 'test@example.com', phone: '9876543210' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Name, email and phone are required.');
  });

  test('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/submit')
      .send({ name: 'Test User', phone: '9876543210' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Name, email and phone are required.');
  });

  test('returns 400 when phone is missing', async () => {
    const res = await request(app)
      .post('/submit')
      .send({ name: 'Test User', email: 'test@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Name, email and phone are required.');
  });
});

describe('POST /submit – happy path', () => {
  beforeEach(() => {
    fetch.mockReset();
    fetch.mockResolvedValue({ ok: true });
  });

  test('returns 200 with success:true for valid payload', async () => {
    const res = await request(app).post('/submit').send({
      name: 'Test User',
      email: 'test@example.com',
      phone: '9876543210',
      businessName: 'My Biz',
      service: 'SEO',
      budget: '10k',
      goals: 'Grow traffic',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Lead saved to Google Sheets.');
  });

  test('calls fetch once with the Google Sheets URL', async () => {
    await request(app).post('/submit').send({
      name: 'Test User',
      email: 'test@example.com',
      phone: '9876543210',
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toContain('name=Test+User');
    expect(calledUrl).toContain('email=test%40example.com');
    expect(calledUrl).toContain('phone=9876543210');
  });

  test('URL contains timestamp param', async () => {
    await request(app).post('/submit').send({
      name: 'Test User',
      email: 'test@example.com',
      phone: '9876543210',
    });

    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toMatch(/timestamp=/);
  });
});

describe('POST /submit – error handling', () => {
  beforeEach(() => {
    fetch.mockReset();
  });

  test('returns 500 when fetch throws a network error', async () => {
    fetch.mockRejectedValue(new Error('Network failure'));

    const res = await request(app).post('/submit').send({
      name: 'Test User',
      email: 'test@example.com',
      phone: '9876543210',
    });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Server error. Please try again.');
  });
});

describe('GET /blog – public page routing', () => {
  test('serves the standalone blog page', async () => {
    const res = await request(app).get('/blog');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toContain('Platoons X Blog');
  });

  test('serves blog post routes from the same page', async () => {
    const res = await request(app).get('/blog/sample-post');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toContain('Platoons X Blog');
  });
});
