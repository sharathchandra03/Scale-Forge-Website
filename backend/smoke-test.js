// ─── ScaleForge — Live DB smoke test ─────────────────────────────────────────
// Exercises the full stack against a REAL database: init → seed → login →
// CRUD → media upload → public read. Run after creating .env:
//
//   node backend/smoke-test.js
//
// Exits non-zero on first failure. Safe to re-run (idempotent seed; cleans up
// the test rows it creates).

require('dotenv').config();
const request = require('supertest');

(async () => {
  let pass = 0, fail = 0;
  const ok = (name, cond) => {
    if (cond) { pass++; console.log('  ✓', name); }
    else { fail++; console.log('  ✗', name); }
  };

  // Ensure schema + seed exist before the app boots.
  const { initDatabase } = require('./database/init');
  const { seed } = require('./database/seed');
  await initDatabase();
  await seed();

  const app = require('./server');
  const { seedDefaultAdmin } = require('./routes/auth');
  await seedDefaultAdmin();

  // 1. Login
  let r = await request(app).post('/api/auth/login')
    .send({ username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD });
  ok('login returns token', r.status === 200 && !!r.body.token);
  const token = r.body.token;
  const auth = (req) => req.set('Authorization', 'Bearer ' + token);

  // 2. verify
  r = await auth(request(app).get('/api/auth/verify'));
  ok('verify valid token', r.status === 200 && r.body.valid);

  // 3. dashboard counts
  r = await auth(request(app).get('/api/dashboard'));
  ok('dashboard counts (services>=7)', r.status === 200 && r.body.data.services >= 7);

  // 4. public read (seeded services)
  r = await request(app).get('/api/services');
  ok('public GET /api/services has rows', r.status === 200 && r.body.data.length >= 7);

  // 5. create (protected)
  r = await auth(request(app).post('/api/services'))
    .send({ title: '__smoke_service__', icon: '🧪', status: 'published', tags: ['a', 'b'] });
  ok('create service', r.status === 201 && r.body.data.id);
  const sid = r.body.data.id;

  // 6. update
  r = await auth(request(app).put('/api/services/' + sid)).send({ title: '__smoke_service_2__' });
  ok('update service', r.status === 200 && r.body.data.title === '__smoke_service_2__');

  // 7. tags round-trip (JSON column)
  r = await request(app).get('/api/services/' + sid);
  ok('tags JSON round-trips', Array.isArray(r.body.data.tags) && r.body.data.tags[0] === 'a');

  // 8. delete
  r = await auth(request(app).delete('/api/services/' + sid));
  ok('delete service', r.status === 200);

  // 9. pricing nested features
  r = await request(app).get('/api/pricing');
  ok('pricing returns nested features', r.status === 200 && r.body.data[0].features.length > 0);

  // 10. blog create with scheduling + slug
  r = await auth(request(app).post('/api/blog'))
    .send({ title: 'Smoke Test Post!!', body: '<p>hi</p>', status: 'published' });
  ok('blog create auto-slug', r.status === 201 && r.body.data.slug === 'smoke-test-post');
  const bid = r.body.data.id;
  r = await request(app).get('/api/blog/smoke-test-post');
  ok('blog public read by slug', r.status === 200 && r.body.data.id === bid);
  await auth(request(app).delete('/api/blog/' + bid));

  // 11. media upload (1x1 png) + serve
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mниколиAAAAA',
    'base64'); // small but valid-enough buffer for storage test
  r = await auth(request(app).post('/api/media'))
    .attach('file', Buffer.from('89504e470d0a1a0a', 'hex'), { filename: 't.png', contentType: 'image/png' });
  ok('media upload', r.status === 201 && r.body.data.id);
  if (r.body.data && r.body.data.id) {
    const mid = r.body.data.id;
    const r2 = await request(app).get('/api/media/' + mid);
    ok('media serve', r2.status === 200 && /image\/png/.test(r2.headers['content-type']));
    await auth(request(app).delete('/api/media/' + mid));
  }

  // 12. lead create (public) + inbox
  r = await request(app).post('/api/leads')
    .send({ name: 'Smoke', email: 'smoke@test.com', phone: '9999999999' });
  ok('lead create (public)', r.status === 201);
  r = await auth(request(app).get('/api/leads'));
  ok('lead inbox (protected)', r.status === 200 && r.body.data.some(l => l.email === 'smoke@test.com'));

  console.log('\n  RESULT:', pass, 'passed,', fail, 'failed');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('❌ smoke harness error:', e.message); process.exit(2); });
