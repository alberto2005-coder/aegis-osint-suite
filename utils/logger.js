const pino = require('pino');

let transport;
if (process.env.NODE_ENV === 'development') {
  try {
    require.resolve('pino-pretty');
    transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname'
      }
    };
  } catch (_) {
    // pino-pretty no está disponible
  }
}

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport
});

module.exports = logger;
