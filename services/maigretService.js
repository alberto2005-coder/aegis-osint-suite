const { spawn } = require('child_process');

function runMaigretProcess(username, options = {}) {
  const { useTor, customProxy } = options;
  const args = [username, '--timeout', '10', '--no-color', '--print-found', '--no-progressbar', '--disable-color'];

  if (customProxy) {
    args.push('--proxy', customProxy);
  } else if (useTor) {
    args.push('--proxy', 'socks5h://127.0.0.1:9050');
  }

  return {
    args,
    spawnDirect: () => spawn('maigret', args),
    spawnFallback: () => spawn('python3', ['-m', 'maigret', ...args])
  };
}

module.exports = {
  runMaigretProcess
};
