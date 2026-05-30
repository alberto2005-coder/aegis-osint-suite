const request = require('supertest');
const app = require('../server');
const { isPrivateIP, validateTargetHost } = require('../middleware/ssrf');

describe('Seguridad OSINT Suite - Pruebas SSRF', () => {
  
  describe('Función isPrivateIP', () => {
    test('Debe retornar true para IPs locales/privadas (IPv4)', () => {
      expect(isPrivateIP('127.0.0.1')).toBe(true);
      expect(isPrivateIP('192.168.0.1')).toBe(true);
      expect(isPrivateIP('10.0.0.15')).toBe(true);
      expect(isPrivateIP('172.16.0.1')).toBe(true);
      expect(isPrivateIP('0.0.0.0')).toBe(true);
    });

    test('Debe retornar true para IPs locales/privadas (IPv6)', () => {
      expect(isPrivateIP('::1')).toBe(true);
      expect(isPrivateIP('fd00::1')).toBe(true);
    });

    test('Debe retornar false para IPs públicas válidas', () => {
      expect(isPrivateIP('8.8.8.8')).toBe(false);
      expect(isPrivateIP('1.1.1.1')).toBe(false);
      expect(isPrivateIP('142.250.184.238')).toBe(false);
    });
  });

  describe('Función validateTargetHost', () => {
    test('Debe rechazar hosts locales y resolver DNS privados', async () => {
      const isLocalhostAllowed = await validateTargetHost('localhost');
      expect(isLocalhostAllowed).toBe(false);
    });

    test('Debe permitir hosts públicos', async () => {
      const isGoogleAllowed = await validateTargetHost('google.com');
      expect(isGoogleAllowed).toBe(true);
    });
  });

  describe('Endpoint /proxy.php SSRF Protection', () => {
    test('Debe denegar acceso (403) a URLs locales/privadas en action=bypass', async () => {
      const response = await request(app)
        .get('/proxy.php?action=bypass&url=http://127.0.0.1:3000/ping');
      
      expect(response.status).toBe(403);
      const errMsg = response.body?.error || JSON.parse(response.text).error;
      expect(errMsg).toContain('SSRF Protection');
    });

    test('Debe denegar acceso (403) a dominios locales en action=bypass', async () => {
      const response = await request(app)
        .get('/proxy.php?action=bypass&url=http://localhost:3000/ping');
      
      expect(response.status).toBe(403);
      const errMsg = response.body?.error || JSON.parse(response.text).error;
      expect(errMsg).toContain('SSRF Protection');
    });
  });

});
