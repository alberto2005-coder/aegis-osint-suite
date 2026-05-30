const Joi = require('joi');
const axios = require('axios');
const { runSherlockProcess } = require('../services/sherlockService');
const InputValidator = require('../utils/validation');

// Esquema de validación para Sherlock
const sherlockSchema = Joi.object({
  username: Joi.string()
    .pattern(/^[a-zA-Z0-9_\-\.]+$/)
    .max(100)
    .required(),
  useTor: Joi.alternatives().try(Joi.boolean(), Joi.string().valid('true', 'false')).default(false),
  proxy: Joi.string().allow('').optional()
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

  const { username, proxy: customProxy } = value;
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
        foundFastPlatforms.add(item.platform.toLowerCase());
        res.write(`data: ${JSON.stringify({ status: 'found', platform: item.platform, url })}\n\n`);
      }
    }).catch(() => {});
  });

  const sherlockProcInfo = runSherlockProcess(username, { useTor, customProxy });

  function setupProcessHandlers(proc) {
    proc.stdout.on('data', (data) => {
      const output = data.toString();
      const lines = output.split('\n');
      for (const line of lines) {
        const cleanLine = line.trim();
        if (cleanLine.startsWith('[+]')) {
          const match = cleanLine.match(/^\[\+\]\s+([^:]+):\s+(https?:\/\/\S+)/);
          if (match) {
            const platform = match[1].trim();
            const url = match[2].trim();
            const platKey = platform.toLowerCase();
            
            if (!foundFastPlatforms.has(platKey) && !res.writableEnded) {
              res.write(`data: ${JSON.stringify({ status: 'found', platform, url })}\n\n`);
            }
          }
        } else if (cleanLine.startsWith('[-]')) {
          const match = cleanLine.match(/^\[-\]\s+([^:]+):/);
          if (match) {
            const platform = match[1].trim();
            const platKey = platform.toLowerCase();
            if (!foundFastPlatforms.has(platKey) && !res.writableEnded) {
              res.write(`data: ${JSON.stringify({ status: 'not_found', platform })}\n\n`);
            }
          }
        }
      }
    });

    proc.stderr.on('data', (data) => {
      console.error(`[Sherlock Error]: ${data.toString()}`);
    });

    proc.on('close', (code) => {
      clearTimeout(watchdogTimeout);
      clearInterval(heartbeatInterval);
      if (proc.hasErrored) {
        return;
      }
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ status: 'done' })}\n\n`);
        res.end();
      }
    });
  }

  try {
    const sherlockProcess = sherlockProcInfo.spawnDirect();
    currentChild = sherlockProcess;

    sherlockProcess.on('error', (err) => {
      sherlockProcess.hasErrored = true;
      console.warn("Comando 'sherlock' directo falló, intentando fallback con 'python3 -m sherlock'...", err.message);
      try {
        const fallbackProcess = sherlockProcInfo.spawnFallback();
        currentChild = fallbackProcess;
        setupProcessHandlers(fallbackProcess);
        fallbackProcess.on('error', (fallbackErr) => {
          fallbackProcess.hasErrored = true;
          console.error("Fallo absoluto en el fallback de Sherlock:", fallbackErr);
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

    setupProcessHandlers(sherlockProcess);
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
