const net = require('net');
const ipaddr = require('ipaddr.js');
const dnsPromises = require('dns').promises;

function isPrivateIP(ipString) {
  try {
    if (!ipString) return true;
    
    let addr = ipaddr.parse(ipString);
    if (addr.kind() === 'ipv6' && addr.isIPv4MappedAddress()) {
      addr = addr.toIPv4Address();
    }
    
    const range = addr.range();
    const privateRanges = [
      'unspecified',
      'broadcast',
      'multicast',
      'linkLocal',
      'loopback',
      'private',
      'uniqueLocal'
    ];
    return privateRanges.includes(range);
  } catch (err) {
    return true;
  }
}

async function validateTargetHost(host) {
  try {
    if (!host) return false;
    const cleanHost = host.trim().split(':')[0];
    if (net.isIP(cleanHost)) {
      return !isPrivateIP(cleanHost);
    }
    const addresses = await dnsPromises.resolve(cleanHost).catch(async () => {
      const result = await dnsPromises.lookup(cleanHost);
      return [result.address];
    });
    for (const addr of addresses) {
      if (isPrivateIP(addr)) return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

async function ssrfProtector(req, res, next) {
  const action = req.query.action || 'groq';

  if (['check', 'subdomains', 'observatory', 'ports', 'analyze', 'bypass'].includes(action)) {
    let hostToValidate = '';
    
    if (action === 'check' || action === 'bypass') {
      const targetUrl = req.query.url;
      if (!targetUrl) return res.status(400).json({ error: 'URL no proporcionada' });
      try {
        const parsed = new URL(targetUrl);
        hostToValidate = parsed.hostname;
      } catch (e) {
        return res.status(400).json({ error: 'URL inválida' });
      }
    } else if (action === 'subdomains' || action === 'observatory') {
      hostToValidate = req.query.domain;
    } else if (action === 'ports') {
      hostToValidate = req.query.domain || '';
      hostToValidate = hostToValidate.replace(/^https?:\/\//i, '').split('/')[0];
    } else if (action === 'analyze') {
      let rawInput = req.query.url || req.query.domain || '';
      if (!rawInput) return res.status(400).json({ error: 'Falta URL o Dominio' });
      if (!/^https?:\/\//i.test(rawInput)) rawInput = 'https://' + rawInput;
      hostToValidate = rawInput.replace(/^https?:\/\//i, '').split('/')[0];
    }

    if (hostToValidate) {
      const allowed = await validateTargetHost(hostToValidate);
      if (!allowed) {
        return res.status(403).json({ error: 'Acceso denegado: El destino especificado es privado, inválido o no está permitido (SSRF Protection)' });
      }
    }
  }

  next();
}

module.exports = {
  isPrivateIP,
  validateTargetHost,
  ssrfProtector
};
