const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

describe('BASELINE - Frontend Structure', () => {
  let html;

  beforeAll(() => {
    html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  });

  test('index.html debe tener DOCTYPE html', () => {
    expect(html.toLowerCase()).toMatch(/<!doctype html>/);
  });

  test('index.html debe tener lang="es"', () => {
    expect(html).toMatch(/<html[^>]+lang="es"/);
  });

  test('index.html debe tener viewport meta', () => {
    expect(html).toMatch(/name="viewport"/);
  });

  test('Debe existir la pestaña Comandos Linux (linux-tab)', () => {
    expect(html).toMatch(/id="linux-tab"/);
  });

  test('Debe existir el selector de herramientas Linux (#linux-tool)', () => {
    expect(html).toMatch(/id="linux-tool"/);
  });

  test('Debe existir el botón generar comando Linux (#btn-generate-linux)', () => {
    expect(html).toMatch(/id="btn-generate-linux"/);
  });

  test('Debe cargarse js/modules/linux.js', () => {
    expect(html).toMatch(/js\/modules\/linux\.js/);
  });

  test('js/modules/linux.js debe existir y tener contenido', () => {
    const content = fs.readFileSync(path.join(root, 'js/modules/linux.js'), 'utf8');
    expect(content.length).toBeGreaterThan(100);
  });

  test('js/app.js debe existir y tener contenido', () => {
    const content = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
    expect(content.length).toBeGreaterThan(100);
  });
});
