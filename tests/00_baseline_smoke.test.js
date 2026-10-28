const request = require('supertest');
const app = require('../server');

describe('BASELINE - Smoke Tests', () => {
  test('GET /ping debe responder pong con status 200', async () => {
    const res = await request(app).get('/ping');
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('pong');
  });

  test('La app Express debe cargar correctamente', () => {
    expect(app).toBeDefined();
    expect(typeof app.listen).toBe('function');
  });

  test('GET / debe servir index.html (status 200)', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
  });
});
