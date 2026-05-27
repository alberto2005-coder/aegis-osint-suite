const express = require('express');
const cors = require('cors');
const axios = require('axios');
const tls = require('tls');
const net = require('net');
const path = require('path');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar Tor agent (SOCKS5 local)
const torAgent = new SocksProxyAgent('socks://127.0.0.1:9050');

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

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

// Helper para escanear puertos
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

// Helper para extraer certificado SSL
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

// ── ENDPOINT: /api/sherlock (Server-Sent Events) ───────────
app.get('/api/sherlock', (req, res) => {
  const username = req.query.username;
  if (!username) return res.status(400).json({ error: 'Username es requerido' });

  // Validar username básico para evitar inyección de comandos
  if (!/^[a-zA-Z0-9_\-\.]+$/.test(username)) {
    return res.status(400).json({ error: 'Username contiene caracteres inválidos' });
  }

  // Configurar cabeceras de Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  console.log(`[Sherlock Node] Iniciando escaneo de: ${username}`);

  // Intentamos ejecutar el comando "sherlock" global
  let sherlockProcess;
  try {
    sherlockProcess = spawn('sherlock', [username, '--timeout', '5', '--print-found']);
  } catch (e) {
    console.warn("Comando sherlock directo no disponible, intentando con python3...");
    sherlockProcess = spawn('python3', ['/usr/src/sherlock/sherlock', username, '--timeout', '5', '--print-found']);
  }

  sherlockProcess.stdout.on('data', (data) => {
    const output = data.toString();
    const lines = output.split('\n');
    for (const line of lines) {
      const cleanLine = line.trim();
      if (cleanLine.startsWith('[+]')) {
        // Encontrado: [+] PlatformName: URL
        const match = cleanLine.match(/^\[\+\]\s+([^:]+):\s+(https?:\/\/\S+)/);
        if (match) {
          const platform = match[1].trim();
          const url = match[2].trim();
          res.write(`data: ${JSON.stringify({ status: 'found', platform, url })}\n\n`);
        }
      }
    }
  });

  sherlockProcess.stderr.on('data', (data) => {
    console.error(`[Sherlock Error]: ${data.toString()}`);
  });

  sherlockProcess.on('close', (code) => {
    console.log(`[Sherlock Node] Escaneo terminado con código: ${code}`);
    res.write(`data: ${JSON.stringify({ status: 'done' })}\n\n`);
    res.end();
  });

  sherlockProcess.on('error', (err) => {
    console.error("Error al arrancar Sherlock, intentando con python3 directo...", err);
    try {
      const fallback = spawn('python3', ['/usr/src/sherlock/sherlock/sherlock.py', username, '--timeout', '5', '--print-found']);
      fallback.stdout.on('data', (data) => {
        const output = data.toString();
        const lines = output.split('\n');
        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine.startsWith('[+]')) {
            const match = cleanLine.match(/^\[\+\]\s+([^:]+):\s+(https?:\/\/\S+)/);
            if (match) {
              const platform = match[1].trim();
              const url = match[2].trim();
              res.write(`data: ${JSON.stringify({ status: 'found', platform, url })}\n\n`);
            }
          }
        }
      });
      fallback.on('close', () => {
        res.write(`data: ${JSON.stringify({ status: 'done' })}\n\n`);
        res.end();
      });
    } catch (fallbackErr) {
      res.write(`data: ${JSON.stringify({ status: 'error', message: err.message })}\n\n`);
      res.end();
    }
  });
});

// Interceptor de proxy.php para no tener que modificar rutas en JS
app.all('/proxy.php', async (req, res) => {
  const action = req.query.action || 'groq';

  // ── ACCIÓN: check (Buscador Sherlock de redes) ────────────
  if (action === 'check') {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: 'URL no proporcionada' });

    let success = false;
    let status = 0;
    let finalUrl = url;
    let body = '';
    let torUsed = false;

    const randomUA = getRandomUA();

    // 1. INTENTO POR TOR (Solo para sitios que lo permiten)
    try {
      const response = await axios.get(url, {
        httpAgent: torAgent,
        httpsAgent: torAgent,
        timeout: 5000,
        headers: { 'User-Agent': randomUA }
        // Eliminamos validateStatus para que si da 403/404 salte al catch de inmediato
      });

      status = response.status;
      body = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

      // Si el body de Tor contiene rastros de bloqueo de Cloudflare o denegación, forzamos fallo para ir a Directo
      const bodyCheck = body.toLowerCase();
      if (bodyCheck.includes('access denied') || bodyCheck.includes('cloudflare') || bodyCheck.includes('captcha-delivery')) {
        throw new Error('Bloqueado por Tor (Cloudflare/Access Denied)');
      }

      success = true;
      torUsed = true;
    } catch (e) {
      console.warn(`[Tor Skipped/Failed] Para ${url}:`, e.message);
    }

    // 2. FALLBACK SEGURO: Intento directo desde la IP de Render (Sin Tor)
    if (!success) {
      try {
        const response = await axios.get(url, {
          timeout: 5000,
          headers: { 'User-Agent': randomUA },
          validateStatus: (status) => status < 500 // Aceptamos 404, 403 para analizarlos
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

    // Lista de patrones reales para saber si NO existe el usuario
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

    // Si devuelve 404 de cabeza es que no existe. Si es 200, buscamos los textos de "no encontrado"
    let textNotFound = (status === 404) || notFoundPatterns.some(pattern => bodyLower.includes(pattern));

    // Si la IP directa también se come un 403, no podemos asegurar si existe o no (Marcamos bloqueo)
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

  // ── ACCIÓN: subdomains ────────────────────────────────────
  if (action === 'subdomains') {
    const domain = req.query.domain;
    if (!domain) return res.status(400).json({ error: 'Dominio no proporcionado' });

    const subs = new Set();

    // 1. crt.sh
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

    // 2. Subdomain Center
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

    // 3. HackerTarget
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

  // ── ACCIÓN: observatory ───────────────────────────────────
  if (action === 'observatory') {
    const domain = req.query.domain;
    if (!domain) return res.status(400).json({ error: 'Dominio no proporcionado' });

    try {
      // Trigger scan
      await axios.post(`https://observatory.mozilla.org/api/v1/analyze/?host=${domain}&hidden=true&rescan=false`, {}, { timeout: 6000 }).catch(() => { });

      // Wait
      await new Promise(r => setTimeout(r, 1500));

      // Get scan
      const resObs = await axios.get(`https://observatory.mozilla.org/api/v1/analyze/?host=${domain}`, { timeout: 6000 });
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

  // ── ACCIÓN: ports ─────────────────────────────────────────
  if (action === 'ports') {
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

  // ── ACCIÓN: analyze ───────────────────────────────────────
  if (action === 'analyze') {
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

      // Cabeceras de seguridad
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

      // Tecnologías detección rápida
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

      // SSL
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

  // ── ACCIÓN: groq ──────────────────────────────────────────
  if (action === 'groq') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Usa POST para Groq' });

    const base64Image = req.body.image;
    if (!base64Image) return res.status(400).json({ error: 'Falta campo image' });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(400).json({ error: { message: 'Clave API de Groq no configurada en Render' } });

    try {
      const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'Eres un experto en geolocalización visual y OSINT. Analiza minuciosamente esta foto e intenta identificar monumentos, arquitectura o geografía específica en español y concluye con la localización exacta.' },
            { type: 'image_url', image_url: { url: base64Image } }
          ]
        }],
        temperature: 0.2,
        max_tokens: 1024
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return res.json(response.data);
    } catch (e) {
      const msg = e.response?.data?.error?.message || e.message;
      return res.status(500).json({ error: { message: msg } });
    }
  }
});
// Servir archivos estáticos del frontend
app.use(express.static(__dirname));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Aegis OSINT Suite escuchando en puerto ${PORT}`);
});