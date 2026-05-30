const express = require('express');
const router = express.Router();

const { handleSherlock } = require('../controllers/sherlockController');
const { handleGroq } = require('../controllers/groqController');
const {
  actionBypass,
  actionCheck,
  actionSubdomains,
  actionObservatory,
  actionPorts,
  actionAnalyze
} = require('../controllers/proxyController');

const { ssrfProtector } = require('../middleware/ssrf');
const { cacheMiddleware } = require('../middleware/cache');

// Ruta Sherlock
router.get('/api/sherlock', handleSherlock);

// Ruta unificada proxy.php (con soporte para todos los métodos GET/POST)
router.all('/proxy.php', cacheMiddleware(), ssrfProtector, async (req, res, next) => {
  const action = req.query.action || 'groq';

  try {
    switch (action) {
      case 'groq':
        return await handleGroq(req, res);
      case 'bypass':
        return await actionBypass(req, res);
      case 'check':
        return await actionCheck(req, res);
      case 'subdomains':
        return await actionSubdomains(req, res);
      case 'observatory':
        return await actionObservatory(req, res);
      case 'ports':
        return await actionPorts(req, res);
      case 'analyze':
        return await actionAnalyze(req, res);
      default:
        return res.status(400).json({ error: 'Acción de proxy no válida o no soportada' });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
