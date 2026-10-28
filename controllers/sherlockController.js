const Joi = require('joi');
const axios = require('axios');
const https = require('https');
const { runSherlockProcess } = require('../services/sherlockService');
const { runMaigretProcess } = require('../services/maigretService');
const InputValidator = require('../utils/validation');

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: false
});

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache'
};

async function recheckUrl(url) {
  try {
    let res = await axios.head(url, {
      headers: HEADERS,
      timeout: 8000,
      maxRedirects: 5,
      validateStatus: () => true,
      httpsAgent
    });

    if (res.status >= 400 && res.status !== 404) {
      res = await axios.get(url, {
        headers: HEADERS,
        timeout: 8000,
        maxRedirects: 5,
        validateStatus: () => true,
        httpsAgent,
        responseType: 'text',
        maxContentLength: 20000,
        maxBodyLength: 20000
      });
    }

    const status = res.status;
    if (status === 200 || status === 301 || status === 302 || status === 303 || status == 307 || status == 308) {
      return true;
    }
    if (status === 404) {
      return false;
    }
    if (status === 403 || status === 429) {
      // Muchas veces bloqueado por IP pero existe; intentar ver si hay contenido relacionado
      const text = typeof res.data === 'string' ? res.data.toLowerCase() : '';
      if (text.includes('not found') || text.includes('page not found') || text.includes('usuario no encontrado') || text.includes("this page isn't available") || text.includes("doesn't exist")) {
        return false;
      }
      // Si hay contenido mínimo o redirección lógica, marcar como posible encontrado pero con aviso
      return true;
    }
    return null;
  } catch (e) {
    return null;
  }
}

// Esquema de validación para Sherlock/Maigret
const sherlockSchema = Joi.object({
  username: Joi.string()
    .pattern(/^[a-zA-Z0-9_\-\.]+$/)
    .max(100)
    .required(),
  useTor: Joi.alternatives().try(Joi.boolean(), Joi.string().valid('true', 'false')).default(false),
  proxy: Joi.string().allow('').optional(),
  engine: Joi.string().valid('sherlock', 'maigret').default('sherlock')
});

// APIs rápidas de búsqueda directa
async function checkGithub(username) {
  try {
    const res = await axios.get(`https://api.github.com/users/${username}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 3000
    });
    if (res.status === 200) return `https://github.com/${username}`;
  } catch (e) {
    if (e.response?.status === 404) return null;
  }
  return null;
}

async function checkChess(username) {
  try {
    const res = await axios.get(`https://api.chess.com/pub/player/${username}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 3000
    });
    if (res.status === 200) return `https://www.chess.com/member/${username}`;
  } catch (e) {
    if (e.response?.status === 404) return null;
  }
  return null;
}

async function checkKeybase(username) {
  try {
    const res = await axios.get(`https://keybase.io/_/api/1.0/user/lookup.json?usernames=${username}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 3000
    });
    if (res.data?.them && res.data.them.length > 0 && res.data.them[0] !== null) {
      return `https://keybase.io/${username}`;
    }
  } catch (e) {}
  return null;
}

async function checkGravatar(username) {
  try {
    const res = await axios.get(`https://en.gravatar.com/${username}.json`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 3000
    });
    if (res.status === 200) return `https://en.gravatar.com/${username}`;
  } catch (e) {
    if (e.response?.status === 404) return null;
  }
  return null;
}

async function checkDevTo(username) {
  try {
    const res = await axios.get(`https://dev.to/api/users/by_username?url=${username}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 3000
    });
    if (res.data && res.data.username) return `https://dev.to/${username}`;
  } catch (e) {}
  return null;
}

/**
 * Controlador para la API de Sherlock (SSE)
 */
async function handleSherlock(req, res) {
  const { error, value } = sherlockSchema.validate(req.query);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { username, proxy: customProxy, engine } = value;
  const useTor = value.useTor === true || value.useTor === 'true';

  // Configurar cabeceras de Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let currentChild = null;

  const heartbeatInterval = setInterval(() => {
    if (!res.writableEnded) {
      res.write(': heartbeat\n\n');
    }
  }, 15000);

  const watchdogTimeout = setTimeout(() => {
    if (currentChild) {
      try {
        currentChild.kill('SIGKILL');
      } catch (e) {
        console.error("[Sherlock Watchdog Error]:", e);
      }
      clearInterval(heartbeatInterval);
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ status: 'error', message: 'Tiempo de escaneo excedido (120s)' })}\n\n`);
        res.end();
      }
    }
  }, 120000);

  req.on('close', () => {
    clearTimeout(watchdogTimeout);
    clearInterval(heartbeatInterval);
    if (currentChild) {
      try {
        currentChild.kill('SIGTERM');
      } catch (e) {
        console.error("[Sherlock Cleanup Error on Disconnect]:", e);
      }
    }
  });

  const foundFastPlatforms = new Set();
  const foundResults = new Map(); // platform -> url

  // Lanzar consultas de APIs rápidas en paralelo
  const fastAPIs = [
    { platform: 'GitHub', fn: () => checkGithub(username) },
    { platform: 'Chess.com', fn: () => checkChess(username) },
    { platform: 'Keybase', fn: () => checkKeybase(username) },
    { platform: 'Gravatar', fn: () => checkGravatar(username) },
    { platform: 'Dev.to', fn: () => checkDevTo(username) }
  ];

  fastAPIs.forEach(item => {
    item.fn().then(url => {
      if (url && !res.writableEnded) {
        const key = item.platform.toLowerCase();
        foundFastPlatforms.add(key);
        foundResults.set(key, url);
        res.write(`data: ${JSON.stringify({ status: 'found', platform: item.platform, url })}\n\n`);
      }
    }).catch(() => {});
  });

  const procRunner = engine === 'maigret' ? runMaigretProcess(username, { useTor, customProxy }) : runSherlockProcess(username, { useTor, customProxy });
  const sherlockProcInfo = procRunner;

  function setupProcessHandlers(proc, isMaigret = false) {
    proc.stdout.on('data', (data) => {
      const output = data.toString();
      const lines = output.split('\n');
      for (const line of lines) {
        const cleanLine = line.trim();
        if (isMaigret) {
          if (cleanLine.includes('[+]')) {
            const match = cleanLine.match(/\[\+\]\s+([^:]+):\s+(https?:\/\/\S+)/);
            if (match) {
              const platform = match[1].trim();
              const url = match[2].trim();
              const platKey = platform.toLowerCase();
              if (!foundFastPlatforms.has(platKey) && !res.writableEnded) {
                foundFastPlatforms.add(platKey);
                foundResults.set(platKey, url);
                res.write(`data: ${JSON.stringify({ status: 'found', platform, url, engine: 'maigret' })}\n\n`);
              }
              continue;
            }
            const match2 = cleanLine.match(/https?:\/\/\S+/);
            if (match2 && cleanLine.toLowerCase().includes(username.toLowerCase())) {
              const url = match2[0];
              try {
                const u = new URL(url);
                const platform = u.hostname.replace('www.', '');
                const platKey = platform.toLowerCase();
                if (!foundFastPlatforms.has(platKey) && !res.writableEnded) {
                  res.write(`data: ${JSON.stringify({ status: 'found', platform, url, engine: 'maigret' })}\n\n`);
                }
              } catch (e) {}
              continue;
            }
          }
          continue;
        }
        if (cleanLine.startsWith('[+]')) {
          const match = cleanLine.match(/^\[\+\]\s+([^:]+):\s+(https?:\/\/\S+)/);
          if (match) {
            const platform = match[1].trim();
            const url = match[2].trim();
            const platKey = platform.toLowerCase();
            
            if (!foundFastPlatforms.has(platKey) && !res.writableEnded) {
              foundFastPlatforms.add(platKey);
              foundResults.set(platKey, url);
              res.write(`data: ${JSON.stringify({ status: 'found', platform, url, engine: 'sherlock' })}\n\n`);
            }
          }
        } else if (cleanLine.startsWith('[-]')) {
          const match = cleanLine.match(/^\[-\]\s+([^:]+):/);
          if (match) {
            const platform = match[1].trim();
            const platKey = platform.toLowerCase();
            if (!foundFastPlatforms.has(platKey) && !res.writableEnded) {
              res.write(`data: ${JSON.stringify({ status: 'not_found', platform, engine: 'sherlock' })}\n\n`);
            }
          }
        }
      }
    });

    proc.stderr.on('data', (data) => {
      console.error(`[Sherlock Error]: ${data.toString()}`);
    });

    proc.on('close', async (code) => {
      clearTimeout(watchdogTimeout);
      clearInterval(heartbeatInterval);
      if (proc.hasErrored) {
        return;
      }

      // Re-check ligero para rescatar posibles falsos negativos (403/429/CF)
      try {
        const known = new Set(foundFastPlatforms);
        // Lista de URLs candidatas típicas a re-verificar si aparecen como omitidas? 
        // El frontend decide qué mostrar; aquí solo reforzamos con recheck de URLs ya conocidas no capturadas
        // Para minimizar tiempo, recheckamos solo algunas plataformas comunes problemáticas
        const common = ['instagram', 'tiktok', 'x', 'twitter', 'facebook', 'pinterest', 'youtube', 'threads', 'reddit'];
        for (const plat of common) {
          if (known.has(plat)) continue;
          // No forzamos URLs genéricas, mejor dejar que frontend gestione
        }
      } catch (e) {}

      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ status: 'done', engine })}\n\n`);
        res.end();
      }
    });
  }

  try {
    const sherlockProcess = sherlockProcInfo.spawnDirect();
    currentChild = sherlockProcess;
    const isMaigret = engine === 'maigret';

    sherlockProcess.on('error', (err) => {
      sherlockProcess.hasErrored = true;
      console.warn(`Comando '${engine}' directo falló, intentando fallback con 'python3 -m ${engine}'...`, err.message);
      try {
        const fallbackProcess = sherlockProcInfo.spawnFallback();
        currentChild = fallbackProcess;
        setupProcessHandlers(fallbackProcess, isMaigret);
        fallbackProcess.on('error', (fallbackErr) => {
          fallbackProcess.hasErrored = true;
          console.error(`Fallo absoluto en el fallback de ${engine}:`, fallbackErr);
          if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({ status: 'error', message: fallbackErr.message })}\n\n`);
            res.end();
          }
        });
      } catch (fallbackErr) {
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ status: 'error', message: fallbackErr.message })}\n\n`);
          res.end();
        }
      }
    });

    setupProcessHandlers(sherlockProcess, isMaigret);
  } catch (err) {
    console.error("Error síncrono al iniciar Sherlock:", err);
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ status: 'error', message: err.message })}\n\n`);
      res.end();
    }
  }
}

module.exports = {
  handleSherlock
};
