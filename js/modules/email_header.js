document.addEventListener('DOMContentLoaded', () => {
  // --- 8. EMAIL HEADER ANALYZER LOGIC ---
  const btnAnalyzeHeaders = document.getElementById('btn-analyze-headers');
  const headerInput = document.getElementById('header-input');
  const headerResultsContainer = document.getElementById('header-results-container');
  const headerInfoList = document.getElementById('header-info-list');
  const headerHopsList = document.getElementById('header-hops-list');

  // ── Decodificador RFC 2047 (=?UTF-8?B?...?= y =?UTF-8?Q?...?=) ────────
  // Clave: juntar los bytes de TODOS los trozos contiguos antes de hacer
  // el decode UTF-8, para evitar que caracteres multibyte (ñ, á, é…)
  // queden partidos entre dos chunks y salgan rotos.
  function decodeRFC2047(str) {
    if (!str) return str;

    // Paso 1: eliminar espacios entre palabras codificadas contiguas
    let s = str;
    const adj = /(=\?[^?]+\?[BbQq]\?[^?]*\?=)\s+(=\?[^?]+\?[BbQq]\?[^?]*\?=)/g;
    while (adj.test(s)) {
      s = s.replace(adj, '$1$2');
      adj.lastIndex = 0;
    }

    // Paso 2: decodificar cada grupo de palabras contiguas como un bloque
    return s.replace(/((?:=\?[^?]+\?[BbQq]\?[^?]*\?=)+)/g, (group) => {
      const allBytes = [];
      const rx = /=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g;
      let m;
      while ((m = rx.exec(group)) !== null) {
        const [, , enc, text] = m;
        try {
          if (enc.toUpperCase() === 'B') {
            const raw = atob(text);
            for (let i = 0; i < raw.length; i++) allBytes.push(raw.charCodeAt(i));
          } else {
            const qp = text.replace(/_/g, ' ')
              .replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
            for (let i = 0; i < qp.length; i++) allBytes.push(qp.charCodeAt(i));
          }
        } catch { /* ignorar chunk corrupto */ }
      }
      try {
        return new TextDecoder('UTF-8').decode(new Uint8Array(allBytes));
      } catch {
        return group;
      }
    });
  }

  // ── Extrae un campo por clave(s), en inglés o español ──────────────────
  function extractField(raw, ...keys) {
    for (const key of keys) {
      // Soporta multilínea con continuación por espacios/tabs
      const rx = new RegExp(`^${key}:[ \\t]*([\\s\\S]*?)(?=\\n\\S|$)`, 'im');
      const m = raw.match(rx);
      if (m && m[1].trim()) return m[1].replace(/\n[ \t]+/g, ' ').trim();
    }
    return null;
  }

  // ── Extrae el dominio del campo DKIM-Signature (d=...) ─────────────────
  function extractDKIMDomain(raw) {
    const m = raw.match(/^DKIM-Signature:[^]*?d=([a-z0-9._-]+)/im);
    return m ? m[1] : null;
  }

  // ── Extrae IP enviada por (mailed-by / X-Google-Original-From) ─────────
  function extractMailedBy(raw) {
    const m = raw.match(/smtp\.mailfrom=([a-z0-9.@_-]+)/i)
              || raw.match(/mailed-by:\s*([^\s\n]+)/i)
              || raw.match(/Return-Path:\s*<?([a-z0-9.@_-]+)>?/i);
    return m ? m[1] : null;
  }

  if (btnAnalyzeHeaders) {
    btnAnalyzeHeaders.addEventListener('click', () => {
      try {
        const rawHeaders = headerInput.value.trim();
        if (!rawHeaders) {
          window.showToast('Por favor pega las cabeceras del correo.', 'warning');
          return;
        }

        window.showLoader('Analizando cabeceras...');

      // ── Campos básicos ──────────────────────────────────────────────────
      const from    = extractField(rawHeaders, 'From', 'de');
      const to      = extractField(rawHeaders, 'To', 'para');
      const rawSubj = extractField(rawHeaders, 'Subject', 'asunto');
      const subject = decodeRFC2047(rawSubj);           // ← decodifica Base64/QP
      const date    = extractField(rawHeaders, 'Date', 'fecha');
      const mailedBy = extractMailedBy(rawHeaders);
      const dkimDomain = extractDKIMDomain(rawHeaders); // solo el dominio d=

      // ── Saltos Received ─────────────────────────────────────────────────
      const receivedHeaders = [];
      const rxReceived = /^Received:\s*from\s+([^\n\r]+)/gim;
      let match;
      while ((match = rxReceived.exec(rawHeaders)) !== null) {
        receivedHeaders.push(match[1].trim());
      }

      // ── IP origen: último Received no privado ───────────────────────────
      const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/;
      let sourceIp = null;
      for (let i = receivedHeaders.length - 1; i >= 0; i--) {
        const ipMatch = receivedHeaders[i].match(ipRegex);
        if (ipMatch) {
          const found = ipMatch[0];
          if (!found.startsWith('127.') && !found.startsWith('192.168.') && !found.startsWith('10.')) {
            sourceIp = found;
            break;
          }
        }
      }
      // Fallback: buscar en Received-SPF client-ip
      if (!sourceIp) {
        const spfIp = rawHeaders.match(/client-ip=(\d+\.\d+\.\d+\.\d+)/i);
        if (spfIp) sourceIp = spfIp[1];
      }

      // ── SPF / DKIM ──────────────────────────────────────────────────────
      const spfPass  = /spf=pass/i.test(rawHeaders) || /Received-SPF:\s*pass/i.test(rawHeaders);
      const dkimPass = /dkim=pass/i.test(rawHeaders);

      // ── Simplificado vs técnico ─────────────────────────────────────────
      const isSimplified = !rawHeaders.match(/^Received:/im)
        && (rawHeaders.match(/^de:/im) || rawHeaders.match(/^para:/im));

      const ipDisplay = sourceIp
        ? `<span style="color:var(--cyan-color);font-weight:700;">${sourceIp}</span>
           <a href="https://ipinfo.io/${sourceIp}" target="_blank" class="badge"
              style="margin-left:8px;background:rgba(0,240,255,0.1);color:var(--cyan-color);
                     border:1px solid var(--cyan-color);text-decoration:none;
                     padding:2px 8px;border-radius:4px;font-size:0.75rem;">
             <i class="fa-solid fa-globe"></i> Buscar IP
           </a>`
        : `<span style="color:var(--text-muted);">No encontrada</span>`;

      // ── Renderizar filas ────────────────────────────────────────────────
      let rows = `
        <div class="info-item">
          <span class="info-label">Remitente (From)</span>
          <span class="info-value">${from || '<em style="color:var(--text-muted)">Desconocido</em>'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Destinatario (To)</span>
          <span class="info-value">${to || '<em style="color:var(--text-muted)">Desconocido</em>'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Asunto</span>
          <span class="info-value">${subject || '<em style="color:var(--text-muted)">Desconocido</em>'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Fecha</span>
          <span class="info-value">${date || '<em style="color:var(--text-muted)">Desconocida</em>'}</span>
        </div>
      `;

      if (mailedBy) {
        rows += `<div class="info-item">
          <span class="info-label">Enviado por</span>
          <span class="info-value" style="color:var(--text-secondary);">${mailedBy}</span>
        </div>`;
      }
      if (dkimDomain) {
        rows += `<div class="info-item">
          <span class="info-label">Firmado por (DKIM)</span>
          <span class="info-value" style="color:var(--text-secondary);">${dkimDomain}</span>
        </div>`;
      }

      rows += `
        <div class="info-item" style="border-bottom:2px solid rgba(255,255,255,0.1);padding-bottom:12px;margin-bottom:12px;">
          <span class="info-label" style="color:var(--cyan-color);font-weight:700;">IP Origen Estimada</span>
          <span class="info-value">${ipDisplay}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Verificación SPF</span>
          <span class="info-value">${spfPass
            ? '<span class="badge badge-success">PASS ✓</span>'
            : '<span class="badge badge-error">NONE/FAIL</span>'}</span>
        </div>
        <div class="info-item" style="border-bottom:none;">
          <span class="info-label">Firma DKIM</span>
          <span class="info-value">${dkimPass
            ? '<span class="badge badge-success">PASS ✓</span>'
            : '<span class="badge badge-warning">NONE/FAIL</span>'}</span>
        </div>
      `;

      if (isSimplified) {
        rows += `
          <div style="margin-top:1rem;padding:0.75rem 1rem;background:rgba(255,200,0,0.07);
                      border:1px solid rgba(255,200,0,0.3);border-radius:8px;">
            <p style="font-size:0.82rem;color:#f5c518;margin:0;">
              <i class="fa-solid fa-triangle-exclamation"></i>
              <strong>Cabeceras simplificadas detectadas.</strong>
              Para ver la <strong>IP real</strong> del remitente, en Gmail abre el correo →
              tres puntos <strong>⋮</strong> → <em>"Mostrar original"</em> y copia todo el bloque de texto.
            </p>
          </div>`;
      }

      headerInfoList.innerHTML = rows;

      // ── Saltos Received ─────────────────────────────────────────────────
      headerHopsList.innerHTML = '';
      if (receivedHeaders.length === 0) {
        headerHopsList.innerHTML = `<p style="color:var(--text-muted);font-size:0.85rem;">
          ${isSimplified
            ? 'Para ver la ruta de servidores necesitas las cabeceras técnicas completas.'
            : 'No se encontraron saltos de servidor Received.'
          }</p>`;
      } else {
        const timeline = document.createElement('div');
        timeline.className = 'smtp-hops-timeline';
        timeline.style.cssText = 'position:relative; padding-left:25px; margin: 15px 0;';

        const line = document.createElement('div');
        line.style.cssText = 'position:absolute; left:9px; top:10px; bottom:15px; width:2px; background:linear-gradient(to bottom, var(--success-color, #10b981), var(--cyan-color, #06b6d4), var(--error-color, #ef4444));';
        timeline.appendChild(line);

        // Los saltos se procesan en orden cronológico (de origen a destino)
        // receivedHeaders[length - 1] es el origen (primer salto)
        // receivedHeaders[0] es el destino final (último salto)
        const chronologicalHops = [...receivedHeaders].reverse();

        chronologicalHops.forEach((hop, idx) => {
          const hopNum = idx + 1;
          const isOrigin = idx === 0;
          const isDest = idx === chronologicalHops.length - 1;
          
          const ipM = hop.match(ipRegex);
          const ipAddress = ipM ? ipM[0] : '';
          
          const color = isOrigin ? '#ef4444' : (isDest ? '#10b981' : '#06b6d4');
          
          const item = document.createElement('div');
          item.className = 'smtp-hop-node';
          item.style.cssText = 'position:relative; margin-bottom:20px;';
          
          item.innerHTML = `
            <div style="position:absolute; left:-21px; top:15px; width:12px; height:12px; border-radius:50%; background:${color}; border:2px solid #0f172a; box-shadow:0 0 8px ${color}; z-index:2;"></div>
            
            <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:0.8rem 1rem; transition:transform 0.2s, background-color 0.2s;" class="hover-card">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
                <span style="font-weight:700; color:var(--cyan-color); font-size:0.85rem;">
                  SALTO #${hopNum} ${isOrigin ? '<span class="badge badge-error" style="font-size:0.65rem;margin-left:4px;">ORIGEN</span>' : (isDest ? '<span class="badge badge-success" style="font-size:0.65rem;margin-left:4px;">DESTINO</span>' : '')}
                </span>
                ${ipAddress ? `
                  <div style="display:flex; align-items:center; gap:6px;">
                    <span style="font-family:monospace; font-size:0.8rem; background:rgba(6,182,212,0.1); border:1px solid rgba(6,182,212,0.2); padding:1px 6px; border-radius:4px; color:var(--cyan-color);">${ipAddress}</span>
                    <a href="https://ipinfo.io/${ipAddress}" target="_blank" style="color:var(--text-muted); font-size:0.75rem;" title="Analizar IP"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>
                  </div>
                ` : '<span style="color:var(--text-muted); font-size:0.75rem; font-style:italic;">IP no detectada</span>'}
              </div>
              <p style="font-size:0.78rem; color:var(--text-secondary); margin:0.4rem 0 0; line-height:1.4; overflow-wrap:break-word; word-break:break-all;">
                ${hop.substring(0, 220)}
              </p>
            </div>
          `;
          timeline.appendChild(item);
        });
        
        headerHopsList.appendChild(timeline);
      }

        // ── Mapa de ruta de IPs ───────────────────────────────────────────
        const hopIPs = receivedHeaders
          .map(h => { const m = h.match(ipRegex); return m ? m[0] : null; })
          .filter(ip => ip && !ip.startsWith('127.') && !ip.startsWith('192.168.') && !ip.startsWith('10.'));

        if (hopIPs.length > 0) {
          const mapCard = document.getElementById('header-map-card');
          const mapEl   = document.getElementById('header-route-map');
          if (mapCard && mapEl) {
            mapCard.style.display = 'block';
            // Fetch geolocation for each unique IP
            const geoPromises = [...new Set(hopIPs)].map(ip =>
              fetch(`https://ipinfo.io/${ip}/json?token=`)
                .then(r => r.json())
                .then(d => ({ ip, city: d.city || '?', country: d.country || '?', org: d.org || '', loc: d.loc }))
                .catch(() => ({ ip, city: 'Desconocida', country: '?', loc: null }))
            );
            Promise.all(geoPromises).then(geoData => {
              // Destroy existing map if any
              if (window._headerMapInstance) {
                window._headerMapInstance.remove();
                window._headerMapInstance = null;
              }
              const validPoints = geoData.filter(g => g.loc);
              if (validPoints.length === 0) {
                mapCard.style.display = 'none';
                return;
              }
              setTimeout(() => {
                try {
                  const map = L.map('header-route-map').setView([20, 0], 2);
                  window._headerMapInstance = map;
                  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap'
                  }).addTo(map);

                  const coords = [];
                  validPoints.forEach((g, i) => {
                    const [lat, lon] = g.loc.split(',').map(Number);
                    coords.push([lat, lon]);
                    const isOrigin = i === validPoints.length - 1;
                    const color = isOrigin ? '#ef4444' : (i === 0 ? '#10b981' : '#06b6d4');
                    const icon = L.divIcon({
                      className: '',
                      html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 6px ${color};"></div>`,
                      iconSize: [14, 14],
                      iconAnchor: [7, 7]
                    });
                    L.marker([lat, lon], { icon }).addTo(map)
                      .bindPopup(`<b>Salto ${i + 1}</b><br>${g.ip}<br>${g.city}, ${g.country}<br><small>${g.org}</small>`);
                  });

                  if (coords.length > 1) {
                    L.polyline(coords, { color: '#8b5cf6', weight: 2, dashArray: '5,8', opacity: 0.8 }).addTo(map);
                  }
                  map.fitBounds(L.latLngBounds(coords).pad(0.3));
                } catch(err) { console.error('Header map error', err); }
              }, 200);
            });
          }
        }

        headerResultsContainer.style.display = 'block';
        window.hideLoader();
      } catch (err) {
        console.error("Error al analizar cabeceras de correo:", err);
        window.hideLoader();
        window.showToast("Ocurrió un error al procesar las cabeceras del correo.", "error");
      }
    });
  }
});
