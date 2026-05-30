const { spawn } = require('child_process');

/**
 * Prepara los argumentos y proporciona métodos para iniciar el proceso Sherlock (directo o fallback).
 * @param {string} username - Nombre de usuario a escanear.
 * @param {Object} options - Opciones de escaneo (useTor, customProxy).
 * @returns {Object} Configuración y métodos de spawn.
 */
function runSherlockProcess(username, options = {}) {
  const { useTor, customProxy } = options;
  const args = [username, '--timeout', '5', '--print-all', '--no-color'];
  
  if (customProxy) {
    args.push('--proxy', customProxy);
  } else if (useTor) {
    args.push('--proxy', 'socks5://127.0.0.1:9050');
  }

  return {
    args,
    spawnDirect: () => spawn('sherlock', args),
    spawnFallback: () => spawn('python3', ['-m', 'sherlock', ...args])
  };
}

module.exports = {
  runSherlockProcess
};
