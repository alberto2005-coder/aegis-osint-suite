const Redis = require('ioredis');

// Caché en memoria local (Map) como fallback
const localCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutos en milisegundos
const CACHE_TTL_SEC = 60 * 60; // 60 minutos en segundos

let redisClient = null;

// Intentar inicializar Redis si se proporciona la URL de conexión
if (process.env.REDIS_URL) {
  try {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: true
    });
    
    redisClient.on('error', (err) => {
      console.warn('[Cache] Error de conexión en Redis, usando fallback de memoria:', err.message);
    });
    
    redisClient.connect().catch(() => {});
  } catch (err) {
    console.warn('[Cache] No se pudo instanciar Redis, usando fallback de memoria.');
  }
}

/**
 * Middleware para cachear respuestas GET en Redis o Memoria local.
 * @param {number} ttlSeconds - Tiempo de vida en segundos (default 3600).
 */
function cacheMiddleware(ttlSeconds = CACHE_TTL_SEC) {
  return async (req, res, next) => {
    // Solo cachear peticiones GET
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `aegis:cache:${req.originalUrl || req.url}`;
    const now = Date.now();

    // 1. INTENTO LEER CACHÉ
    try {
      if (redisClient && redisClient.status === 'ready') {
        const cachedValue = await redisClient.get(cacheKey);
        if (cachedValue) {
          res.setHeader('X-Cache', 'HIT (Redis)');
          res.setHeader('Content-Type', 'application/json');
          return res.send(cachedValue);
        }
      }
    } catch (err) {
      console.warn('[Cache] Fallo al leer de Redis:', err.message);
    }

    // Fallback a memoria local
    if (localCache.has(cacheKey)) {
      const entry = localCache.get(cacheKey);
      if (now < entry.expiry) {
        res.setHeader('X-Cache', 'HIT (Memory)');
        res.setHeader('Content-Type', 'application/json');
        return res.send(entry.data);
      } else {
        localCache.delete(cacheKey); // Expira
      }
    }

    // 2. INTERCEPTAR RESPUESTA PARA GUARDARLA EN CACHÉ
    res.setHeader('X-Cache', 'MISS');
    
    const originalJson = res.json;
    const originalSend = res.send;

    res.send = function (body) {
      // Restaurar métodos originales
      res.send = originalSend;
      res.json = originalJson;

      // Intentar almacenar solo respuestas exitosas (200 OK)
      if (res.statusCode === 200) {
        // Guardar en memoria local
        localCache.set(cacheKey, {
          data: body,
          expiry: now + (ttlSeconds * 1000)
        });

        // Guardar en Redis
        if (redisClient && redisClient.status === 'ready') {
          redisClient.set(cacheKey, body, 'EX', ttlSeconds).catch((err) => {
            console.warn('[Cache] Error al guardar en Redis:', err.message);
          });
        }
      }

      return originalSend.call(this, body);
    };

    res.json = function (obj) {
      return res.send(JSON.stringify(obj));
    };

    next();
  };
}

module.exports = {
  cacheMiddleware,
  localCache
};
