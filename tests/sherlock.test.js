const request = require('supertest');
const app = require('../server');

describe('Endpoint /api/sherlock - Test de Validación', () => {

  test('Debe retornar 400 si no se proporciona el username', async () => {
    const response = await request(app).get('/api/sherlock');
    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });

  test('Debe retornar 400 si el username contiene caracteres inválidos', async () => {
    const response = await request(app).get('/api/sherlock?username=invalid name!');
    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });

});
