const { SocksProxyAgent } = require('socks-proxy-agent');
const net = require('net');

const TOR_URL = 'socks://127.0.0.1:9050';
const torAgent = new SocksProxyAgent(TOR_URL);

/**
 * Verifica si el servicio local de Tor está activo respondiendo en el puerto 9050.
 * @returns {Promise<boolean>}
 */
function checkTorStatus() {
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
    socket.connect(9050, '127.0.0.1');
  });
}

module.exports = {
  torAgent,
  checkTorStatus,
  TOR_URL
};
