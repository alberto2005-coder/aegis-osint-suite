const axios = require('axios');
const tls = require('tls');
const net = require('net');
const { torAgent } = require('../services/torService');

const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1'
];

function getRandomUA() {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

function checkPort(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1500);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

function getSSLCert(host) {
  return new Promise((resolve) => {
    let resolved = false;
    const socket = tls.connect(443, host, { servername: host, timeout: 5000, rejectUnauthorized: false }, () => {
      if (resolved) return;
      resolved = true;
      const cert = socket.getPeerCertificate(true);
      if (!cert || Object.keys(cert).length === 0) {
        resolve(null);
      } else {
        const validTo = cert.valid_to;
        const validFrom = cert.valid_from;
        const expireDate = new Date(validTo);
        const daysLeft = Math.ceil((expireDate - new Date()) / (1000 * 60 * 60 * 24));
        resolve({
          subject: cert.subject ? `CN=${cert.subject.CN || 'N/A'}` : 'N/A',
          issuer: cert.issuer ? `CN=${cert.issuer.CN || 'N/A'}` : 'N/A',
          validFrom: validFrom,
          validTo: validTo,
          daysLeft: daysLeft,
          valid: daysLeft > 0
        });
      }
      socket.destroy();
    });
    socket.on('error', (err) => {
      if (resolved) return;
      resolved = true;
      resolve(null);
    });
    socket.on('timeout', () => {
      if (resolved) return;
      resolved = true;
      socket.destroy();
      resolve(null);
    });
  });
}

// ── MÉTODOS DE ACCIÓN DEL PROXY ──

async function actionBypass(req, res) {
  const url = req.query.url;
  const useTor = req.query.useTor === 'true';

  try {
    const options = {
      timeout: 8000,
      headers: { 'User-Agent': getRandomUA() }
    };
    if (useTor) {
      options.httpAgent = torAgent;
      options.httpsAgent = torAgent;
    }
    const response = await axios.get(url, options);
    res.setHeader('Content-Type', response.headers['content-type'] || 'text/plain');
    return res.send(response.data);
  } catch (e) {
    const status = e.response?.status || 500;
    return res.status(status).send(e.response?.data || e.message);
  }
}

async function actionCheck(req, res) {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'URL no proporcionada' });

  let success = false;
  let status = 0;
  let finalUrl = url;
  let body = '';
  let torUsed = false;

  const randomUA = getRandomUA();

  try {
    const response = await axios.get(url, {
      httpAgent: torAgent,
      httpsAgent: torAgent,
      timeout: 5000,
      headers: { 'User-Agent': randomUA }
    });

    status = response.status;
    body = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

    const bodyCheck = body.toLowerCase();
    if (bodyCheck.includes('access denied') || bodyCheck.includes('cloudflare') || bodyCheck.includes('captcha-delivery')) {
      throw new Error('Bloqueado por Tor (Cloudflare/Access Denied)');
    }

    success = true;
    torUsed = true;
  } catch (e) {
    console.warn(`[Tor Skipped/Failed] Para ${url}:`, e.message);
  }

  if (!success) {
    try {
      const response = await axios.get(url, {
        timeout: 5000,
        headers: { 'User-Agent': randomUA },
        validateStatus: (status) => status < 500
      });
      status = response.status;
      body = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      success = true;
      torUsed = false;
    } catch (e) {
      console.error(`[Direct Failed] Fallo absoluto en ${url}:`, e.message);
    }
  }

  if (!success) {
    return res.json({ status: 0, error: true, message: 'Destino inaccesible' });
  }

  const bodyLower = body.toLowerCase();
  const notFoundPatterns = [
    'sorry, this page isn',
    'page not found',
    'user not found',
    'this account doesn',
    "we can't find that user",
    'no existe',
    'no user found',
    'profile_error',
    'cuenta que buscas no existe',
    'usernotfound'
  ];

  let textNotFound = (status === 404) || notFoundPatterns.some(pattern => bodyLower.includes(pattern));

  if (status === 403 || status === 429 || bodyLower.includes('access denied')) {
    return res.json({
      status: status,
      textNotFound: false,
      blocked: true,
      finalUrl,
      torUsed
    });
  }

  return res.json({
    status,
    textNotFound,
    blocked: false,
    finalUrl,
    torUsed
  });
}

async function actionSubdomains(req, res) {
  const domain = req.query.domain;
  if (!domain) return res.status(400).json({ error: 'Dominio no proporcionado' });

  const subs = new Set();

  try {
    const crtRes = await axios.get(`https://crt.sh/?q=%25.${domain}&output=json`, { timeout: 8000 });
    if (Array.isArray(crtRes.data)) {
      crtRes.data.forEach(cert => {
        (cert.name_value || '').split('\n').forEach(name => {
          const n = name.trim().toLowerCase();
          if (n && n.endsWith('.' + domain) && !n.startsWith('*')) subs.add(n);
        });
      });
    }
  } catch (e) {
    console.warn("crt.sh falló en Node, usando backups...");
  }

  try {
    const scRes = await axios.get(`https://api.subdomain.center/?domain=${domain}`, { timeout: 6000 });
    if (Array.isArray(scRes.data)) {
      scRes.data.forEach(sub => {
        const n = sub.trim().toLowerCase();
        if (n && n.endsWith('.' + domain)) subs.add(n);
      });
    }
  } catch (e) {
    console.warn("Subdomain Center falló en Node...");
  }

  try {
    const htRes = await axios.get(`https://api.hackertarget.com/hostsearch/?q=${domain}`, { timeout: 6000 });
    if (htRes.data && typeof htRes.data === 'string' && !htRes.data.includes("API count exceeded")) {
      htRes.data.split('\n').forEach(line => {
        const parts = line.split(',');
        if (parts[0]) {
          const n = parts[0].trim().toLowerCase();
          if (n && n.endsWith('.' + domain) && n !== domain) subs.add(n);
        }
      });
    }
  } catch (e) {
    console.warn("HackerTarget falló en Node...");
  }

  return res.json({
    domain,
    subdomains: [...subs].sort(),
    count: subs.size
  });
}

async function actionObservatory(req, res) {
  const domain = req.query.domain;
  if (!domain) return res.status(400).json({ error: 'Dominio no proporcionado' });

  try {
    await axios.post(`https://observatory.mozilla.org/api/v1/analyze?host=${domain}&hidden=true&rescan=false`, {}, { timeout: 6000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1500));

    const resObs = await axios.get(`https://observatory.mozilla.org/api/v1/analyze?host=${domain}`, { timeout: 6000 });
    const data = resObs.data;

    if (data && data.scan_id) {
      const resTests = await axios.get(`https://observatory.mozilla.org/api/v1/getScanResults?scan=${data.scan_id}`, { timeout: 6000 });
      data.tests = resTests.data || {};
    }
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ error: 'Error consultando Observatory: ' + e.message });
  }
}

async function actionPorts(req, res) {
  let host = req.query.domain || '';
  if (!host) return res.status(400).json({ error: 'Host no proporcionado' });

  host = host.replace(/^https?:\/\//i, '').split('/')[0];

  const PORTS = {
    21: ['FTP', 'high', 'Transferencia de archivos en texto plano'],
    22: ['SSH', 'medium', 'Acceso remoto seguro'],
    23: ['Telnet', 'high', 'Acceso remoto sin cifrar'],
    25: ['SMTP', 'medium', 'Envío de correo electrónico'],
    53: ['DNS', 'low', 'Servidor de nombres'],
    80: ['HTTP', 'low', 'Servidor web sin cifrar'],
    110: ['POP3', 'medium', 'Recepción de correo'],
    143: ['IMAP', 'medium', 'Acceso a correo'],
    443: ['HTTPS', 'low', 'Servidor web cifrado'],
    445: ['SMB', 'high', 'Compartición de archivos Windows'],
    3306: ['MySQL', 'high', 'Base de datos MySQL'],
    3389: ['RDP', 'high', 'Escritorio remoto Windows'],
    5432: ['PostgreSQL', 'high', 'Base de datos PostgreSQL'],
    6379: ['Redis', 'high', 'Redis sin contraseña'],
    8080: ['HTTP-Alt', 'medium', 'Administración web alternativa'],
    8443: ['HTTPS-Alt', 'low', 'Puerto HTTPS alternativo'],
    9200: ['Elasticsearch', 'high', 'Motor de búsqueda expuesto'],
    27017: ['MongoDB', 'high', 'Base de datos MongoDB']
  };

  const promises = Object.entries(PORTS).map(async ([portStr, [service, risk, desc]]) => {
    const port = parseInt(portStr);
    const open = await checkPort(host, port);
    return { port, service, open, risk, desc };
  });

  const results = await Promise.all(promises);
  const openCount = results.filter(r => r.open).length;

  return res.json({
    host,
    scanned: results.length,
    openCount,
    ports: results
  });
}

async function actionAnalyze(req, res) {
  let rawInput = req.query.url || req.query.domain || '';
  if (!rawInput) return res.status(400).json({ error: 'Falta URL o Dominio' });

  if (!/^https?:\/\//i.test(rawInput)) rawInput = 'https://' + rawInput;
  const hostname = rawInput.replace(/^https?:\/\//i, '').split('/')[0];

  try {
    const t0 = Date.now();
    const response = await axios.get(rawInput, {
      timeout: 10000,
      headers: { 'User-Agent': getRandomUA() },
      validateStatus: () => true
    });
    const respTime = Date.now() - t0;
    const headers = response.headers;

    const secChecks = {
      'strict-transport-security': { name: 'HSTS', desc: 'Fuerza HTTPS en el navegador', severity: 'high' },
      'content-security-policy': { name: 'Content-Security-Policy', desc: 'Previene XSS', severity: 'high' },
      'x-frame-options': { name: 'X-Frame-Options', desc: 'Previene Clickjacking', severity: 'medium' },
      'x-content-type-options': { name: 'X-Content-Type-Options', desc: 'Previene MIME-sniffing', severity: 'medium' },
      'referrer-policy': { name: 'Referrer-Policy', desc: 'Controla el envío de cabecera referer', severity: 'low' },
      'permissions-policy': { name: 'Permissions-Policy', desc: 'Restringe APIs del navegador', severity: 'low' }
    };

    const securityHeaders = Object.entries(secChecks).map(([key, info]) => {
      const val = headers[key] || null;
      return {
        header: info.name,
        key,
        present: !!val,
        value: val,
        desc: info.desc,
        severity: info.severity
      };
    });

    const missing = securityHeaders.filter(h => !h.present).length;
    const securityScore = Math.round(((securityHeaders.length - missing) / securityHeaders.length) * 100);

    const techs = [];
    const add = (name, category, icon) => techs.push({ name, category, icon });

    if (headers['server']) add(headers['server'], 'Servidor Web', 'fa-server');
    if (headers['x-powered-by']) add(headers['x-powered-by'], 'Backend', 'fa-code');

    const bodyLow = (response.data || '').toString().toLowerCase();
    if (bodyLow.includes('wp-content')) add('WordPress', 'CMS', 'fa-wordpress');
    if (bodyLow.includes('react')) add('React', 'Framework JS', 'fa-react');
    if (bodyLow.includes('vue')) add('Vue.js', 'Framework JS', 'fa-vuejs');
    if (bodyLow.includes('jquery')) add('jQuery', 'Librería JS', 'fa-js');
    if (bodyLow.includes('cloudflare') || headers['cf-ray']) add('Cloudflare', 'CDN', 'fa-cloud');

    const ssl = await getSSLCert(hostname);

    return res.json({
      url: rawInput,
      statusCode: response.status,
      responseTimeMs: respTime,
      primaryIp: response.socket?.remoteAddress || 'N/A',
      serverHeaders: headers,
      securityHeaders,
      securityScore,
      technologies: techs,
      ssl
    });
  } catch (e) {
    return res.status(500).json({ error: 'Error analizando dominio: ' + e.message });
  }
}

module.exports = {
  actionBypass,
  actionCheck,
  actionSubdomains,
  actionObservatory,
  actionPorts,
  actionAnalyze
};
