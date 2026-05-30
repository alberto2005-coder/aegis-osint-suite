const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const apiRouter = require('./routes/api');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Healthcheck/Keep-Alive endpoint
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

app.use(helmet({
  contentSecurityPolicy: false // Deshabilitar CSP para permitir scripts externos de CDNs sin problemas
}));
app.use(compression());

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    try {
      const parsedOrigin = new URL(origin);
      const hostname = parsedOrigin.hostname;
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        allowedOrigins.includes(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error('No permitido por la política CORS de Aegis'));
      }
    } catch (_) {
      callback(new Error('Origen CORS no válido'));
    }
  },
  credentials: true
}));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Máximo 100 peticiones
  message: { error: 'Demasiadas peticiones desde esta IP, por favor inténtalo de nuevo más tarde.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(globalLimiter);

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Rutas de la API modularizada
app.use(apiRouter);

// Servir archivos estáticos del frontend
app.use(express.static(__dirname));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Interceptor global de errores (Evita leakage de stack traces)
app.use((err, req, res, next) => {
  logger.error({ err }, '[Error Global Interceptado]');
  if (!res.headersSent) {
    res.status(500).json({ error: 'Ha ocurrido un error interno en el servidor.' });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`Aegis OSINT Suite escuchando en puerto ${PORT}`);
  });
}

module.exports = app;