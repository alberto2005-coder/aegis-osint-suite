const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

describe('BASELINE - File Integrity', () => {
  const requiredFiles = [
    'index.html',
    'server.js',
    'package.json',
    'README.md',
    'favicon.png',
    'css/layout.css',
    'css/components.css',
    'css/variables.css',
    'js/app.js',
    'js/utils/api.js',
    'js/modules/linux.js',
    'js/modules/usernames.js',
    'js/modules/email.js',
    'js/modules/domain.js',
    'js/modules/phone.js',
    'js/modules/names.js',
    'js/modules/exif.js',
    'js/modules/email_header.js',
    'js/modules/pdf.js',
    'js/modules/dorks.js',
    'js/modules/webanalyzer.js',
    'js/modules/crypto.js',
    'middleware/ssrf.js',
    'services/sherlockService.js',
    'services/torService.js',
    'routes/api.js'
  ];

  test.each(requiredFiles)('Debe existir: %s', (file) => {
    const fullPath = path.join(root, file);
    expect(fs.existsSync(fullPath)).toBe(true);
  });

  test('package.json debe tener script start y test', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    expect(pkg.scripts.start).toBeDefined();
    expect(pkg.scripts.test).toBeDefined();
    expect(pkg.dependencies).toBeDefined();
    expect(pkg.devDependencies).toBeDefined();
  });
});
