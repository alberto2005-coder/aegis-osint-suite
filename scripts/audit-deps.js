const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const out = [];
out.push('# DEPENDENCIES_AUDIT');
out.push(`Fecha: ${new Date().toISOString()}`);
out.push(`Proyecto: ${pkg.name} v${pkg.version}`);
out.push('');
out.push('## Node.js Dependencies');
out.push('');

const deps = Object.keys(pkg.dependencies || {});
const devDeps = Object.keys(pkg.devDependencies || {});

function checkPkg(name, type) {
  try {
    const info = execSync(`npm view ${name} version 2>&1`, { cwd: root, timeout: 30000 }).toString().trim();
    const latest = info.split(/\s+/).pop();
    const current = (type === 'dep' ? pkg.dependencies[name] : pkg.devDependencies[name]).replace(/[\^~>=<]/g, '');
    out.push(`| ${name} | ${type} | ${pkg.dependencies[name] || pkg.devDependencies[name]} | ${current} | ${latest} | - |`);
  } catch (e) {
    const spec = (type === 'dep' ? pkg.dependencies[name] : pkg.devDependencies[name]);
    out.push(`| ${name} | ${type} | ${spec} | (check) | (check) | ERROR |`);
  }
}

out.push('| Paquete | Tipo | Spec | Current (parsed) | Latest | Notas |');
out.push('| --- | --- | --- | --- | --- | --- |');
for (const d of deps) checkPkg(d, 'dep');
for (const d of devDeps) checkPkg(d, 'dev');

out.push('');
out.push('## npm audit (summary)');
out.push('');
try {
  const audit = execSync('npm audit --json 2>&1', { cwd: root, timeout: 60000 }).toString();
  try {
    const j = JSON.parse(audit);
    out.push(`- Vulnerabilities: ${j.metadata?.vulnerabilities?.total ?? 'N/A'}`);
    out.push(`- Info: ${j.metadata?.vulnerabilities?.info ?? 0}, Low: ${j.metadata?.vulnerabilities?.low ?? 0}, Moderate: ${j.metadata?.vulnerabilities?.moderate ?? 0}, High: ${j.metadata?.vulnerabilities?.high ?? 0}, Critical: ${j.metadata?.vulnerabilities?.critical ?? 0}`);
  } catch {
    out.push(audit.substring(0, 2000));
  }
} catch (e) {
  out.push('Sin datos de audit o error al ejecutar');
}

out.push('');
out.push('## Python (pip) - sherlock-project');
out.push('');
try {
  const pipShow = execSync('pip show sherlock-project 2>&1', { timeout: 30000 }).toString();
  out.push('```');
  out.push(pipShow);
  out.push('```');
} catch (e) {
  out.push('_No instalado o no encontrado_');
  out.push('');
  try {
    const pipList = execSync('pip list 2>&1 | findstr /i sherlock', { timeout: 30000 }).toString();
    out.push(pipList || '_Sin coincidencias_');
  } catch {}
}

out.push('');
out.push('## Frontend CDNs (index.html)');
out.push('');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const cdns = html.match(/https?:\/\/[^\s"']+/g) || [];
const uniq = [...new Set(cdns)].filter(u => u.includes('unpkg') || u.includes('cdnjs') || u.includes('jsdelivr') || u.includes('fonts.googleapis') || u.includes('fonts.gstatic'));
for (const u of uniq) out.push(`- ${u}`);

fs.writeFileSync(path.join(root, 'DEPENDENCIES_AUDIT.md'), out.join('\n'));
console.log('Generado DEPENDENCIES_AUDIT.md');
