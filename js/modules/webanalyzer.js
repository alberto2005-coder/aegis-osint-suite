document.addEventListener('DOMContentLoaded', () => {
  const btnAudit   = document.getElementById('btn-webaudit');
  const auditInput = document.getElementById('webaudit-input');
  const results    = document.getElementById('webaudit-results');

  if (!btnAudit) return;

  let webauditMapInstance = null;
  let currentWebauditData = null;
  let currentWebdomain = "";

  function updateWebauditMap(lat, lon, label) {
    const mapEl = document.getElementById('webaudit-map');
    if (!mapEl) return;
    mapEl.style.display = 'block';
    if (webauditMapInstance) {
      webauditMapInstance.remove();
      webauditMapInstance = null;
    }
    setTimeout(() => {
      try {
        webauditMapInstance = L.map('webaudit-map').setView([lat, lon], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(webauditMapInstance);
        L.marker([lat, lon]).addTo(webauditMapInstance).bindPopup(label).openPopup();
      } catch (err) {
        console.error("Error al renderizar el mapa de auditoría web:", err);
      }
    }, 100);
  }

  // ── helpers ──────────────────────────────────────────────
  const infoRow = (label, value, color = '') =>
    `<div class="info-item">
       <span class="info-label">${label}</span>
       <span class="info-value" style="${color ? 'color:'+color : ''}">${value}</span>
     </div>`;

  const badge = (ok, okText = 'OK', failText = 'Falta') =>
    ok ? `<span class="badge badge-success">${okText}</span>`
       : `<span class="badge badge-error">${failText}</span>`;

  // ── main handler ──────────────────────────────────────────
  btnAudit.addEventListener('click', async () => {
    let raw = auditInput.value.trim();
    if (!raw) { alert('Introduce un dominio o URL.'); return; }

    // Normalize domain
    raw = raw.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/^www\./i, '');
    const domain = raw;
    currentWebdomain = domain;
    currentWebauditData = {};

    const mapEl = document.getElementById('webaudit-map');
    if (mapEl) mapEl.style.display = 'none';

    window.showLoader(`Auditando ${domain}…`);
    results.style.display = 'none';

    // Run all queries in parallel (including proxy.php for SSL + ports)
    const [obsData, crtData, dnsData, techData, proxyAnalysis, portsData] = await Promise.allSettled([
      fetchObservatory(domain),
      fetchSubdomains(domain),
      fetchDNS(domain),
      fetchTech(domain),
      fetch(`proxy.php?action=analyze&url=${encodeURIComponent('https://' + domain)}`).then(r => r.json()),
      fetch(`proxy.php?action=ports&domain=${encodeURIComponent(domain)}`).then(r => r.json()),
    ]);

    const proxyData = proxyAnalysis.status === 'fulfilled' ? proxyAnalysis.value : null;

    // ── 1. Overview + IP ──────────────────────────────────
    const overviewList = document.getElementById('webaudit-overview-list');
    const dns = dnsData.status === 'fulfilled' ? dnsData.value : null;
    const ip  = dns?.ip || 'No resuelto';

    currentWebauditData["IP del Servidor"] = ip;
    if (dns?.mx?.length) currentWebauditData["Servidor de Correo (MX)"] = dns.mx[0];
    if (dns?.nameservers?.length) currentWebauditData["Nameservers"] = dns.nameservers.slice(0, 2).join(', ');

    let overviewHtml = infoRow('Dominio analizado', `<strong>${domain}</strong>`);
    overviewHtml += infoRow('IP del servidor', ip, 'var(--cyan-color)');

    if (ip && ip !== 'No resuelto') {
      overviewHtml += infoRow('Geolocalización IP',
        `<a href="https://ipinfo.io/${ip}" target="_blank" class="badge"
            style="background:rgba(0,240,255,0.1);color:var(--cyan-color);border:1px solid var(--cyan-color);text-decoration:none;padding:2px 8px;border-radius:4px;font-size:0.75rem;">
           <i class="fa-solid fa-globe"></i> Ver en ipinfo.io
         </a>`);
      
      // Geolocalizar en el mapa interactivo Leaflet
      fetch(`https://ipapi.co/${ip}/json/`)
        .then(r => r.json())
        .then(geoip => {
          if (geoip && geoip.latitude && geoip.longitude) {
            currentWebauditData["Ubicación Servidor"] = `${geoip.city}, ${geoip.country_name} (${geoip.org})`;
            updateWebauditMap(geoip.latitude, geoip.longitude, `Hosting IP: ${ip}<br>${geoip.city}, ${geoip.country_name}<br><small>${geoip.org}</small>`);
          }
        }).catch(err => {
          console.error("Error geolocalizando IP de auditoría:", err);
        });
    }

    if (dns?.mx?.length) {
      overviewHtml += infoRow('Servidor de correo (MX)', dns.mx[0]);
    }
    if (dns?.nameservers?.length) {
      overviewHtml += infoRow('Nameservers', dns.nameservers.slice(0, 2).join(', '));
    }
    overviewList.innerHTML = overviewHtml;

    // ── 2. SSL — siempre desde proxy.php, Observatory como complemento ──
    const sslList = document.getElementById('webaudit-ssl-list');
    const obs = obsData.status === 'fulfilled' ? obsData.value : null;

    if (proxyData?.ssl) {
      // Datos reales del certificado vía proxy.php (siempre disponible)
      const ssl = proxyData.ssl;
      const daysLeft = ssl.daysLeft ?? null;
      const valid    = ssl.valid;
      const daysColor = daysLeft === null ? 'var(--text-muted)'
                      : daysLeft > 60   ? 'var(--success-color)'
                      : daysLeft > 14   ? 'var(--warning-color)'
                      : 'var(--error-color)';
      const daysLabel = daysLeft !== null
        ? `<span style="color:${daysColor};font-weight:700;">${daysLeft} días</span>`
        : 'N/A';

      // Extraer CN del subject
      const subjectCN = (ssl.subject || '').replace(/.*CN=([^,]+).*/i, '$1') || ssl.subject || 'N/A';
      const issuerCN  = (ssl.issuer  || '').replace(/.*CN=([^,]+).*/i, '$1') || ssl.issuer  || 'N/A';

      sslList.innerHTML =
        infoRow('Estado del Certificado', badge(valid, 'Válido ✓', 'Expirado / Inválido ✗')) +
        infoRow('Domínio / CN', subjectCN) +
        infoRow('Emisor (CA)', issuerCN, 'var(--text-secondary)') +
        infoRow('Válido desde', ssl.validFrom  || 'N/A') +
        infoRow('Expira el',    ssl.validTo    || 'N/A', daysColor) +
        infoRow('Tiempo restante', daysLabel) +
        (obs?.tests?.strict_transport_security?.pass
          ? infoRow('HSTS', '<span class="badge badge-success">Activo ✓</span>')
          : infoRow('HSTS', '<span class="badge badge-error">No configurado</span>')) +
        infoRow('Análisis SSL completo', `<a href="https://www.ssllabs.com/ssltest/analyze.html?d=${domain}" target="_blank" style="color:var(--cyan-color);">Ver en SSL Labs ↗</a>`);

    } else if (obs?.tests?.strict_transport_security) {
      const hsts = obs.tests.strict_transport_security;
      const passed = hsts.pass;
      sslList.innerHTML =
        infoRow('HTTPS / HSTS', badge(passed, 'Activo', 'No configurado')) +
        infoRow('Política HSTS', passed ? (hsts.data?.header || 'Presente') : 'No detectada') +
        infoRow('Certificado', `<a href="https://www.ssllabs.com/ssltest/analyze.html?d=${domain}" target="_blank" style="color:var(--cyan-color);">Ver análisis SSL Labs ↗</a>`);
    } else {
      sslList.innerHTML =
        infoRow('SSL/TLS', `<span style="color:var(--text-muted);">No se pudo obtener datos del certificado.<br>Asegúrate de que proxy.php está configurado.</span>`) +
        infoRow('Análisis externo', `<a href="https://www.ssllabs.com/ssltest/analyze.html?d=${domain}" target="_blank" style="color:var(--cyan-color);">Analizar en SSL Labs ↗</a>`);
    }

    // ── 3. Security headers: Observatory → fallback proxy.php ────
    const headersList = document.getElementById('webaudit-headers-list');
    const scoreBadge  = document.getElementById('webaudit-score-badge');
    const scoreDesc   = document.getElementById('webaudit-score-desc');

    if (obs && obs.grade) {
      // ── Fuente: Mozilla Observatory ─────────────────────────────────
      const gradeColor = obs.grade.startsWith('A') ? 'var(--success-color)'
                       : obs.grade.startsWith('B') ? 'var(--cyan-color)'
                       : obs.grade.startsWith('C') ? 'var(--warning-color)'
                       : 'var(--error-color)';
      scoreBadge.innerHTML = `<span style="color:${gradeColor}">${obs.grade}</span>`;
      scoreDesc.textContent = `Puntuaci\u00f3n: ${obs.score}/100 \u2014 Mozilla Observatory`;

      const testMap = {
        content_security_policy:    'Content-Security-Policy (CSP)',
        strict_transport_security:  'HSTS (Strict-Transport-Security)',
        x_frame_options:            'X-Frame-Options',
        x_content_type_options:     'X-Content-Type-Options',
        referrer_policy:            'Referrer-Policy',
        cookies:                    'Seguridad de Cookies',
        cross_origin_resource_policy: 'Cross-Origin-Resource-Policy',
        redirection:                'Redirecci\u00f3n HTTPS',
      };

      let hHtml = '';
      for (const [key, label] of Object.entries(testMap)) {
        const t = obs.tests?.[key];
        if (!t) continue;
        const ok = t.pass;
        const desc = t.result || '';
        hHtml += `
          <div style="display:flex;justify-content:space-between;align-items:center;
                      padding:0.6rem 0.8rem;border-radius:8px;
                      background:${ok ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)'};
                      border:1px solid ${ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}">
            <div>
              <strong style="font-size:0.9rem;">${label}</strong>
              ${desc ? `<p style="font-size:0.78rem;color:var(--text-muted);margin:0.1rem 0 0;">${desc}</p>` : ''}
            </div>
            ${badge(ok, 'PASS \u2713', 'FAIL \u2717')}
          </div>`;
      }
      headersList.innerHTML = hHtml || '<p style="color:var(--text-muted)">Sin datos de cabeceras.</p>';

    } else {
      // ── Fallback: proxy.php?action=analyze ──────────────────────────
      scoreBadge.innerHTML = '<span style="color:var(--warning-color)"><i class="fa-solid fa-spinner fa-spin" style="font-size:1.2rem;"></i></span>';
      scoreDesc.textContent = 'Observatory no disponible \u2014 analizando cabeceras directamente desde el servidor...';

      try {
        const proxyRes = await fetch(`proxy.php?action=analyze&url=${encodeURIComponent('https://' + domain)}`);
        const proxyData = await proxyRes.json();

        if (proxyData.securityHeaders && proxyData.securityHeaders.length > 0) {
          const score = proxyData.securityScore ?? 0;
          const scoreColor = score >= 75 ? 'var(--success-color)'
                           : score >= 50 ? 'var(--cyan-color)'
                           : score >= 25 ? 'var(--warning-color)'
                           : 'var(--error-color)';

          scoreBadge.innerHTML = `<span style="color:${scoreColor}">${score}<small style="font-size:1rem;">/100</small></span>`;
          scoreDesc.textContent = `Puntuaci\u00f3n: ${score}/100 \u2014 An\u00e1lisis directo v\u00eda proxy (cabeceras HTTP reales)`;

          // Descripci\u00f3n de severidad
          const severityColors = { high: '#ef4444', medium: '#f59e0b', low: '#06b6d4' };

          const hHtml = proxyData.securityHeaders.map(h => `
            <div style="display:flex;justify-content:space-between;align-items:flex-start;
                        padding:0.6rem 0.8rem;border-radius:8px;
                        background:${h.present ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)'};
                        border:1px solid ${h.present ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}">
              <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:0.4rem;">
                  <strong style="font-size:0.9rem;">${h.header}</strong>
                  <span style="font-size:0.7rem;color:${severityColors[h.severity] || 'var(--text-muted)'};background:rgba(255,255,255,0.05);border-radius:4px;padding:1px 6px;">${h.severity?.toUpperCase()}</span>
                </div>
                <p style="font-size:0.78rem;color:var(--text-muted);margin:0.15rem 0 0;">${h.desc}</p>
                ${h.value ? `<code style="font-size:0.72rem;color:var(--cyan-color);display:block;margin-top:0.25rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%;">${h.value}</code>` : ''}
              </div>
              <div style="margin-left:0.75rem;flex-shrink:0;">
                ${badge(h.present, 'PRESENT \u2713', 'MISSING \u2717')}
              </div>
            </div>`).join('');

          headersList.innerHTML = hHtml;

          // Tambi\u00e9n actualizar SSL si proxy tiene datos
          if (proxyData.ssl) {
            const ssl = proxyData.ssl;
            const sslListEl = document.getElementById('webaudit-ssl-list');
            const daysColor = ssl.daysLeft > 30 ? 'var(--success-color)' : ssl.daysLeft > 7 ? 'var(--warning-color)' : 'var(--error-color)';
            sslListEl.innerHTML =
              infoRow('Estado SSL', badge(ssl.valid, 'V\u00e1lido', 'Expirado / Inv\u00e1lido')) +
              infoRow('Emisor', ssl.issuer || 'N/A') +
              infoRow('V\u00e1lido hasta', ssl.validTo || 'N/A', daysColor) +
              infoRow('D\u00edas restantes', ssl.daysLeft !== null ? `${ssl.daysLeft} d\u00edas` : 'N/A', daysColor) +
              infoRow('Certificado', `<a href="https://www.ssllabs.com/ssltest/analyze.html?d=${domain}" target="_blank" style="color:var(--cyan-color);">Ver an\u00e1lisis SSL Labs \u2197</a>`);
          }

        } else {
          throw new Error('Sin datos de cabeceras en proxy');
        }

      } catch (proxyErr) {
        console.warn('Proxy fallback error:', proxyErr);
        scoreBadge.innerHTML = '<span style="color:var(--text-muted)">N/D</span>';
        scoreDesc.textContent = 'No se pudo analizar las cabeceras. Aseg\u00farate de ejecutar la app en un servidor PHP (proxy.php).';
        headersList.innerHTML = `
          <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
            <a href="https://observatory.mozilla.org/analyze/${domain}" target="_blank"
               class="btn btn-secondary" style="align-self:flex-start;">
              <i class="fa-solid fa-external-link"></i> Ver en Mozilla Observatory
            </a>
            <a href="https://securityheaders.com/?q=${domain}&followRedirects=on" target="_blank"
               class="btn btn-secondary" style="align-self:flex-start;">
              <i class="fa-solid fa-shield-halved"></i> Ver en SecurityHeaders.com
            </a>
          </div>`;
      }
    }

    // ── 4. Tecnologías ───────────────────────────────────
    const techGrid  = document.getElementById('webaudit-tech-grid');
    const techEmpty = document.getElementById('webaudit-tech-empty');
    
    let techs = techData.status === 'fulfilled' ? techData.value : [];
    if (proxyData?.technologies && Array.isArray(proxyData.technologies)) {
      const seen = new Set(techs.map(t => t.name.toLowerCase()));
      for (const t of proxyData.technologies) {
        if (!seen.has(t.name.toLowerCase())) {
          techs.push(t);
          seen.add(t.name.toLowerCase());
        }
      }
    }

    if (techs.length === 0) {
      techGrid.style.display = 'none';
      techEmpty.style.display = 'block';
    } else {
      techGrid.style.display = '';
      techEmpty.style.display = 'none';
      techGrid.innerHTML = techs.map(t => `
        <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border-color);
                    border-radius:10px;padding:0.8rem 1rem;display:flex;flex-direction:column;gap:0.25rem;">
          <strong style="font-size:0.9rem;"><i class="fa-solid ${t.icon || 'fa-cube'}"></i> ${t.name}</strong>
          <small style="color:var(--text-muted);">${t.category}</small>
        </div>`).join('');
    }

    // ── 5. Subdominios ───────────────────────────────────
    const subList  = document.getElementById('webaudit-subdomains-list');
    const subCount = document.getElementById('webaudit-sub-count');
    const subs = crtData.status === 'fulfilled' ? crtData.value : [];

    if (subs.length === 0) {
      subList.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">No se encontraron subdominios en certificados públicos.</p>';
      subCount.style.display = 'none';
    } else {
      subCount.textContent = `${subs.length} encontrados`;
      subCount.style.display = 'inline-block';
      subList.innerHTML = subs.map(s => `
        <div class="dns-record-badge" style="display:flex;justify-content:space-between;align-items:center;">
          <span style="color:var(--cyan-color);font-family:monospace;font-size:0.85rem;">${s}</span>
          <a href="https://${s}" target="_blank" class="btn btn-secondary btn-sm" style="padding:0.2rem 0.6rem;font-size:0.75rem;">
            <i class="fa-solid fa-up-right-from-square"></i>
          </a>
        </div>`).join('');
    }

    // ── 6. Escaneo de puertos (proxy.php?action=ports) ────────
    const portsEl    = document.getElementById('webaudit-ports-list');
    const portsBadge = document.getElementById('webaudit-ports-count');
    const portsCard  = document.getElementById('webaudit-ports-card');

    if (portsCard && portsEl) {
      const pd = portsData.status === 'fulfilled' ? portsData.value : null;
      if (pd && pd.ports && !pd.error) {
        const openPorts = pd.ports.filter(p => p.open);
        portsBadge.textContent = `${openPorts.length} abiertos / ${pd.scanned} escaneados`;
        portsBadge.style.display = 'inline-block';
        const dangerColor = openPorts.length > 0 ? 'var(--error-color)' : 'var(--success-color)';
        portsBadge.style.cssText += `;background:rgba(255,255,255,0.04);color:${dangerColor};border:1px solid ${dangerColor};border-radius:6px;padding:2px 10px;font-size:0.8rem;`;

        const riskColor = { high: '#ef4444', medium: '#f59e0b', low: '#06b6d4' };
        const riskLabel = { high: 'ALTO', medium: 'MEDIO', low: 'BAJO' };

        portsEl.innerHTML = pd.ports.map(p => {
          const rc = riskColor[p.risk] || 'var(--text-muted)';
          return `
            <div style="display:flex;justify-content:space-between;align-items:center;
                        padding:0.55rem 0.8rem;border-radius:8px;
                        background:${p.open ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.02)'};
                        border:1px solid ${p.open ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.06)'}">
              <div style="display:flex;align-items:center;gap:0.75rem;flex:1;min-width:0;">
                <span style="font-family:monospace;font-weight:700;font-size:0.9rem;
                             color:${p.open ? 'var(--error-color)' : 'var(--text-muted)'};
                             min-width:50px;">${p.port}</span>
                <div>
                  <span style="font-weight:600;font-size:0.88rem;color:${p.open ? 'var(--text-primary)' : 'var(--text-secondary)'}">${p.service}</span>
                  <p style="font-size:0.75rem;color:var(--text-muted);margin:0.1rem 0 0;">${p.desc}</p>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:0.5rem;flex-shrink:0;">
                <span style="font-size:0.7rem;color:${rc};background:rgba(255,255,255,0.04);
                             border:1px solid ${rc};border-radius:4px;padding:1px 6px;">${riskLabel[p.risk] || p.risk}</span>
                ${p.open
                  ? '<span class="badge badge-error">ABIERTO</span>'
                  : '<span class="badge" style="background:rgba(255,255,255,0.04);color:var(--text-muted);border:1px solid rgba(255,255,255,0.08);">CERRADO</span>'}
              </div>
            </div>`;
        }).join('');
      } else {
        portsBadge.style.display = 'none';
        portsEl.innerHTML = `
          <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:0.75rem;">
            El escaneo requiere ejecutar la app en un servidor PHP con <code style="color:var(--cyan-color);">proxy.php</code>. Usa estas alternativas:
          </p>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
            <a href="https://www.shodan.io/search?query=${domain}" target="_blank" class="btn btn-secondary btn-sm">
              <i class="fa-solid fa-bug"></i> Shodan
            </a>
            <a href="https://search.censys.io/search?resource=hosts&q=${domain}" target="_blank" class="btn btn-secondary btn-sm">
              <i class="fa-solid fa-satellite"></i> Censys
            </a>
          </div>`;
      }
    }

    // ── 7. External tools ────────────────────────────────
    document.getElementById('webaudit-external-links').innerHTML = [
      { icon:'fa-bug',           label:'Shodan',          sub:'Puertos y servicios expuestos',  href:`https://www.shodan.io/search?query=${domain}` },
      { icon:'fa-shield-virus',  label:'VirusTotal',      sub:'Reputación y malware',            href:`https://www.virustotal.com/gui/domain/${domain}` },
      { icon:'fa-magnifying-glass',label:'URLScan.io',   sub:'Captura y análisis de la web',    href:`https://urlscan.io/search/#domain:${domain}` },
      { icon:'fa-satellite',     label:'Censys',          sub:'Certificados e infraestructura',  href:`https://search.censys.io/search?resource=hosts&q=${domain}` },
      { icon:'fa-cloud',         label:'SecurityHeaders', sub:'Análisis de cabeceras HTTP',      href:`https://securityheaders.com/?q=${domain}&followRedirects=on` },
      { icon:'fa-database',      label:'DNSdumpster',     sub:'Mapa DNS completo',               href:`https://dnsdumpster.com/` },
    ].map(t => `
      <a href="${t.href}" target="_blank" class="osint-link-btn">
        <i class="fa-solid ${t.icon}"></i>
        <span>${t.label}</span>
        <small>${t.sub}</small>
      </a>`).join('');

    currentWebauditData = {
      "IP del Servidor": ip,
      "Servidor de Correo (MX)": dns?.mx?.[0] || "Ninguno",
      "Nameservers": dns?.nameservers?.slice(0, 2).join(', ') || "Ninguno",
      "Ubicación Servidor": currentWebauditData["Ubicación Servidor"] || "Desconocida",
      ssl: proxyData?.ssl || null,
      scoreValue: (obs && typeof obs.score === 'number') ? obs.score : (proxyData?.securityScore ?? null),
      grade: obs?.grade || null,
      headers: (obs && obs.tests) 
        ? Object.entries({
            content_security_policy: 'Content-Security-Policy (CSP)',
            strict_transport_security: 'HSTS (Strict-Transport-Security)',
            x_frame_options: 'X-Frame-Options',
            x_content_type_options: 'X-Content-Type-Options',
            referrer_policy: 'Referrer-Policy',
            cookies: 'Seguridad de Cookies',
            cross_origin_resource_policy: 'Cross-Origin-Resource-Policy',
            redirection: 'Redirección HTTPS'
          }).map(([k, label]) => ({ header: label, present: obs.tests[k]?.pass || false, severity: 'N/A' }))
        : (proxyData?.securityHeaders || []),
      techs: techs || [],
      subdomains: subs || [],
      ports: (portsData.status === 'fulfilled' && portsData.value?.ports) ? portsData.value.ports.filter(p => p.open) : []
    };

    const btnExportPdf = document.getElementById('btn-export-webaudit-pdf');
    if (btnExportPdf) btnExportPdf.style.display = 'inline-block';

    results.style.display = 'block';
    window.hideLoader();
  });

  // ── API: Mozilla Observatory ─────────────────────────────
  async function fetchObservatory(domain) {
    try {
      // 1. Intentar primero desde el servidor proxy PHP para evitar el bloqueo de CORS del navegador
      const res = await fetch(`proxy.php?action=observatory&domain=${encodeURIComponent(domain)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && !data.error) {
          return data;
        }
      }
    } catch (e) {
      console.warn("No se pudo conectar con el proxy para Mozilla Observatory, usando fallback directo...", e);
    }

    try {
      // 2. Fallback: llamada directa (puede dar CORS si Mozilla tiene bloqueos de cabecera)
      await fetch(`https://observatory.mozilla.org/api/v1/analyze/?host=${domain}&hidden=true&rescan=false`, { method: 'POST' }).catch(() => {});
      await new Promise(r => setTimeout(r, 2500));
      const res = await fetch(`https://observatory.mozilla.org/api/v1/analyze/?host=${domain}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const testsRes = await fetch(`https://observatory.mozilla.org/api/v1/getScanResults?scan=${data.scan_id}`).catch(() => null);
      const tests = testsRes ? await testsRes.json() : {};
      return { ...data, tests };
    } catch (e) {
      console.error("Error en fallback de Observatory:", e);
      return { error: true, grade: null, score: null, tests: {} };
    }
  }

  // ── API: crt.sh subdomains ───────────────────────────────
  async function fetchSubdomains(domain) {
    try {
      // 1. Intentar primero con el proxy PHP para evitar problemas de CORS del navegador
      const res = await fetch(`proxy.php?action=subdomains&domain=${encodeURIComponent(domain)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.subdomains && Array.isArray(data.subdomains)) {
          return data.subdomains;
        }
      }
    } catch (e) {
      console.warn("No se pudo obtener subdominios desde proxy.php, usando fallback directo con CORS...", e);
    }

    try {
      // 2. Fallback: Llamada local al bypass proxy utilizando proxy.php
      const useTor = window.isTorActive?.() ? 'true' : 'false';
      const corsUrl = `proxy.php?action=bypass&useTor=${useTor}&url=${encodeURIComponent(`https://crt.sh/?q=%.${domain}&output=json`)}`;
      const res  = await fetch(corsUrl);
      const certs = await res.json();
      const subs  = new Set();
      if (Array.isArray(certs)) {
        for (const cert of certs) {
          for (const name of (cert.name_value || '').split('\n')) {
            const n = name.trim().toLowerCase();
            if (n && n.endsWith('.' + domain) && !n.startsWith('*')) subs.add(n);
          }
        }
      }
      if (subs.size > 0) {
        return [...subs].sort();
      }
    } catch (e) {
      console.error("Error en fallback de subdominios crt.sh:", e);
    }

    try {
      // 3. Segundo Fallback: HackerTarget Hostsearch (admite CORS y es ultra estable)
      const res = await fetch(`https://api.hackertarget.com/hostsearch/?q=${domain}`);
      if (res.ok) {
        const text = await res.text();
        if (text && !text.includes("API count exceeded") && !text.includes("error")) {
          const subs = new Set();
          const lines = text.split('\n');
          for (const line of lines) {
            const parts = line.split(',');
            if (parts[0]) {
              const n = parts[0].trim().toLowerCase();
              if (n && n.endsWith('.' + domain) && n !== domain) {
                subs.add(n);
              }
            }
          }
          return [...subs].sort();
        }
      }
    } catch (e) {
      console.error("Error en fallback HackerTarget de subdominios:", e);
    }

    return [];
  }

  // ── API: Cloudflare DNS (IP, MX, NS) ────────────────────
  async function fetchDNS(domain) {
    try {
      const [aRes, mxRes, nsRes] = await Promise.allSettled([
        fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=A`,   { headers: { Accept: 'application/dns-json' } }).then(r => r.json()),
        fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=MX`,  { headers: { Accept: 'application/dns-json' } }).then(r => r.json()),
        fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=NS`,  { headers: { Accept: 'application/dns-json' } }).then(r => r.json()),
      ]);
      return {
        ip:          aRes.value?.Answer?.[0]?.data || null,
        mx:          mxRes.value?.Answer?.map(r => r.data.replace(/^\d+\s+/, '')) || [],
        nameservers: nsRes.value?.Answer?.map(r => r.data) || [],
      };
    } catch (e) {
      console.error("Error en fetch DNS:", e);
      return { ip: null, mx: [], nameservers: [] };
    }
  }

  // ── Tech fingerprint via corsproxy.io (patrones precisos) ───
  async function fetchTech(domain) {
    try {
      const useTor = window.isTorActive?.() ? 'true' : 'false';
      const proxy = `proxy.php?action=bypass&useTor=${useTor}&url=${encodeURIComponent('https://' + domain)}`;
      const res = await fetch(proxy, { signal: AbortSignal.timeout(8000) });
      const html = await res.text();
      const headers = res.headers;
      const techs = [];
      const add = (name, category, icon) => techs.push({ name, category, icon });

      // ── Cabeceras HTTP (muy fiables) ──────────────────────
      const server  = headers.get('server')       || '';
      const powered = headers.get('x-powered-by') || '';
      const cfRay   = headers.get('cf-ray')        || '';
      const vercel  = headers.get('x-vercel-id')   || '';
      const aws     = headers.get('x-amzn-requestid') || headers.get('x-amz-cf-id') || '';
      const azure   = headers.get('x-azure-ref')   || '';

      if (server)  add(server,  'Servidor Web', 'fa-server');
      if (powered) add(powered, 'Backend',      'fa-code');
      if (cfRay)   add('Cloudflare', 'CDN', 'fa-cloud');
      if (vercel)  add('Vercel',     'Hosting', 'fa-v');
      if (aws)     add('AWS',        'Cloud',   'fa-aws');
      if (azure)   add('Azure',      'Cloud',   'fa-microsoft');

    // ── Patrones precisos en HTML ─────────────────────────
    // (buscamos en src/href de scripts, namespaces JS, meta generators)
    const check = (pattern) => pattern.test(html);

    // CMS — scripts/paths característicos
    if (check(/\/(wp-content|wp-includes)\//i))                        add('WordPress',    'CMS',          'fa-wordpress');
    if (check(/cdn\.shopify\.com/i) || check(/Shopify\.\w/))          add('Shopify',      'E-Commerce',   'fa-bag-shopping');
    if (check(/\bcontent="Joomla/i) || check(/\/media\/jui\//i))      add('Joomla',       'CMS',          'fa-joomla');
    if (check(/jQuery\.extend\(Drupal/i) || check(/\/misc\/drupal\.js/i)) add('Drupal',   'CMS',          'fa-drupal');
    if (check(/static\.parastorage\.com|wix-thunderbolt/i))            add('Wix',          'Builder',      'fa-wix');
    if (check(/assets\.squarespace\.com/i))                             add('Squarespace',  'Builder',      'fa-square');
    if (check(/ghost-theme|content="Ghost/i))                          add('Ghost',        'CMS',          'fa-ghost');

    // JS Frameworks — archivos reales o namespaces globales únicos
    if (check(/react(?:\.production\.min|\.development)\.js|__reactFiber|__reactProps/i)) add('React', 'Framework JS', 'fa-react');
    if (check(/vue(?:\.runtime)?(?:\.esm|\.min)?\.js|__vue__|createApp\(/i))              add('Vue.js','Framework JS', 'fa-vuejs');
    if (check(/(?:src|href)="[^"]*angular(?:\.min)?\.js|ng-version=/i))                   add('Angular','Framework JS','fa-angular');
    if (check(/next\/dist|__NEXT_DATA__|_next\/static/i))              add('Next.js',      'Framework JS', 'fa-n');
    if (check(/__nuxt__|_nuxt\//i))                                    add('Nuxt.js',      'Framework JS', 'fa-n');
    if (check(/gatsby-chunk-mapping|___gatsby/i))                      add('Gatsby',       'Framework JS', 'fa-g');
    if (check(/svelte(?:\.min)?\.js|\bsvelte\b.*version/i))            add('Svelte',       'Framework JS', 'fa-s');

    // Librerías JS — solo en src de script, no en texto libre
    if (check(/(?:src|href)="[^"]*jquery[.\-][\d]/i))                 add('jQuery',       'Librería JS',  'fa-js');
    if (check(/(?:src|href)="[^"]*bootstrap(?:\.bundle)?\.min\.js/i)) add('Bootstrap',    'CSS Framework','fa-bootstrap');
    if (check(/cdn\.tailwindcss\.com|tailwind\.config/i))             add('Tailwind CSS', 'CSS Framework','fa-wind');
    if (check(/lodash(?:\.min)?\.js/i))                               add('Lodash',       'Librería JS',  'fa-js');

    // E-commerce
    if (check(/magento\/pub|requirejs.*magento/i))                    add('Magento',      'E-Commerce',   'fa-cart-shopping');
    if (check(/woocommerce|wc-blocks-middleware/i))                   add('WooCommerce',  'E-Commerce',   'fa-cart-shopping');
    if (check(/\.prestashop\.|prestashop.*version/i))                 add('PrestaShop',   'E-Commerce',   'fa-cart-shopping');

    // CDN / Hosting (solo si no viene ya de cabeceras)
    if (!cfRay && check(/cdnjs\.cloudflare\.com|cloudflare-static/i)) add('Cloudflare (CDN assets)', 'CDN', 'fa-cloud');
    if (check(/fastly\.net\//i))                                      add('Fastly',       'CDN',          'fa-bolt');
    if (check(/akamaized\.net\//i))                                   add('Akamai',       'CDN',          'fa-network-wired');

    // Analytics — IDs y funciones propias, no palabras sueltas
    if (check(/googletagmanager\.com\/gtm\.js|gtag\('config'/i))      add('Google Tag Manager / Analytics', 'Analytics', 'fa-chart-line');
    if (check(/fbq\('init'|connect\.facebook\.net\/en_US\/fbevents/i)) add('Facebook Pixel',  'Analytics', 'fa-facebook');
    if (check(/_hjSettings\s*=|hotjar\.com\/c\//i))                   add('Hotjar',           'Analytics', 'fa-fire');
    if (check(/plausible\.io\/js|plausible\('pageview'/i))            add('Plausible',         'Analytics', 'fa-chart-bar');
    if (check(/mixpanel\.init|cdn\.mxpnl\.com/i))                    add('Mixpanel',          'Analytics', 'fa-chart-pie');

    // Chatbots / soporte
    if (check(/intercomcdn\.com|Intercom\('boot'/i))                  add('Intercom',     'Chat/Soporte', 'fa-comment');
    if (check(/js\.hs-scripts\.com|hubspot\.com\/hubfs/i))            add('HubSpot',      'Marketing',    'fa-h');
    if (check(/static\.zdassets\.com|zopim\./i))                      add('Zendesk',      'Soporte',      'fa-headset');

    return techs;
    } catch (e) {
      console.error("Error en fetchTech:", e);
      return [];
    }
  }

  const btnExportPdf = document.getElementById('btn-export-webaudit-pdf');
  if (btnExportPdf) {
    btnExportPdf.addEventListener('click', () => {
      try {
        if (!currentWebauditData) return;
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Cabecera institucional
        doc.setFillColor(15, 23, 42); // Navy background
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.text("AEGIS OSINT SUITE", 15, 25);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("REPORTE DE AUDITORÍA WEB Y SEGURIDAD", 15, 33);
        
        // Info general
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(11);
        doc.text(`Dominio analizado: ${currentWebdomain}`, 15, 50);
        doc.text(`Fecha del análisis: ${new Date().toLocaleString()}`, 15, 57);
        
        let y = 70;
        
        // Sección 1: Información de Servidor y DNS
        doc.setFont("helvetica", "bold");
        doc.text("1. INFORMACIÓN DEL SERVIDOR Y DNS", 15, y);
        doc.line(15, y + 2, 195, y + 2);
        doc.setFont("helvetica", "normal");
        y += 10;
        
        const details = [
          ["IP del Servidor:", currentWebauditData["IP del Servidor"] || "No resuelta"],
          ["Ubicación de Hosting:", currentWebauditData["Ubicación Servidor"] || "Desconocida"],
          ["Servidor de Correo (MX):", currentWebauditData["Servidor de Correo (MX)"] || "Ninguno"],
          ["Nameservers:", currentWebauditData["Nameservers"] || "Ninguno"]
        ];
        
        details.forEach(([lbl, val]) => {
          doc.setFont("helvetica", "bold");
          doc.text(lbl, 15, y);
          doc.setFont("helvetica", "normal");
          doc.text(String(val), 70, y);
          y += 7;
        });
        
        y += 5;
        
        // Sección 2: Seguridad y SSL
        doc.setFont("helvetica", "bold");
        doc.text("2. SEGURIDAD SSL Y CERTIFICADO", 15, y);
        doc.line(15, y + 2, 195, y + 2);
        doc.setFont("helvetica", "normal");
        y += 10;
        
        if (currentWebauditData.ssl) {
          const ssl = currentWebauditData.ssl;
          const sslDetails = [
            ["Estado:", ssl.valid ? "Válido" : "Expirado / Inválido"],
            ["Emisor:", ssl.issuer || "N/A"],
            ["Vence el:", ssl.validTo || "N/A"],
            ["Días restantes:", ssl.daysLeft !== null ? `${ssl.daysLeft} días` : "N/A"]
          ];
          sslDetails.forEach(([lbl, val]) => {
            doc.setFont("helvetica", "bold");
            doc.text(lbl, 15, y);
            doc.setFont("helvetica", "normal");
            doc.text(String(val), 70, y);
            y += 7;
          });
        } else {
          doc.text("Sin datos de certificado SSL o análisis directo no disponible.", 15, y);
          y += 7;
        }
        
        y += 5;
        
        // Sección 3: Puntuación de Cabeceras de Seguridad
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFont("helvetica", "bold");
        doc.text("3. PUNTUACIÓN Y CABECERAS DE SEGURIDAD", 15, y);
        doc.line(15, y + 2, 195, y + 2);
        doc.setFont("helvetica", "normal");
        y += 10;
        
        const scoreStr = currentWebauditData.scoreValue !== null ? `${currentWebauditData.scoreValue}/100` : "N/D";
        const gradeStr = currentWebauditData.grade ? ` (Grado: ${currentWebauditData.grade})` : "";
        doc.setFont("helvetica", "bold");
        doc.text("Puntuación General:", 15, y);
        doc.setFont("helvetica", "normal");
        doc.text(`${scoreStr}${gradeStr}`, 70, y);
        y += 10;
        
        if (currentWebauditData.headers && currentWebauditData.headers.length > 0) {
          doc.setFont("helvetica", "bold");
          doc.text("Cabecera", 15, y);
          doc.text("Estado", 100, y);
          doc.text("Severidad", 150, y);
          doc.line(15, y + 2, 195, y + 2);
          y += 8;
          doc.setFont("helvetica", "normal");
          
          currentWebauditData.headers.forEach(h => {
            if (y > 270) { doc.addPage(); y = 20; }
            const name = h.header || h.name || "";
            const present = h.present ? "Presente" : "Falta";
            const severity = h.severity || "N/A";
            doc.text(String(name).substring(0, 40), 15, y);
            doc.text(String(present), 100, y);
            doc.text(String(severity).toUpperCase(), 150, y);
            y += 7;
          });
        }
        
        y += 5;
        
        // Sección 4: Tecnologías Detectadas
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFont("helvetica", "bold");
        doc.text("4. TECNOLOGÍAS DETECTADAS", 15, y);
        doc.line(15, y + 2, 195, y + 2);
        y += 10;
        doc.setFont("helvetica", "normal");
        
        if (currentWebauditData.techs && currentWebauditData.techs.length > 0) {
          currentWebauditData.techs.forEach(t => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.setFont("helvetica", "bold");
            doc.text(String(t.name), 15, y);
            doc.setFont("helvetica", "normal");
            doc.text(`Categoría: ${t.category}`, 80, y);
            y += 7;
          });
        } else {
          doc.text("No se detectaron tecnologías mediante huellas digitales.", 15, y);
          y += 7;
        }
        
        y += 5;
        
        // Sección 5: Puertos Abiertos
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFont("helvetica", "bold");
        doc.text("5. PUERTOS ABIERTOS DETECTADOS", 15, y);
        doc.line(15, y + 2, 195, y + 2);
        y += 10;
        doc.setFont("helvetica", "normal");
        
        if (currentWebauditData.ports && currentWebauditData.ports.length > 0) {
          currentWebauditData.ports.forEach(p => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.setFont("helvetica", "bold");
            doc.text(`Puerto ${p.port}`, 15, y);
            doc.setFont("helvetica", "normal");
            doc.text(`${p.service} - Riesgo: ${p.risk}`, 80, y);
            y += 7;
          });
        } else {
          doc.text("No se detectaron puertos abiertos críticos en el escaneo rápido.", 15, y);
          y += 7;
        }
        
        y += 5;
        
        // Sección 6: Subdominios Encontrados
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFont("helvetica", "bold");
        doc.text("6. SUBDOMINIOS DETECTADOS (CERTIFICADOS)", 15, y);
        doc.line(15, y + 2, 195, y + 2);
        y += 10;
        doc.setFont("helvetica", "normal");
        
        if (currentWebauditData.subdomains && currentWebauditData.subdomains.length > 0) {
          const list = currentWebauditData.subdomains.slice(0, 30);
          list.forEach(s => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.text(String(s), 15, y);
            y += 7;
          });
          if (currentWebauditData.subdomains.length > 30) {
            doc.text(`... y ${currentWebauditData.subdomains.length - 30} subdominios más.`, 15, y);
            y += 7;
          }
        } else {
          doc.text("No se encontraron subdominios públicos registrados.", 15, y);
          y += 7;
        }
        
        doc.save(`aegis_webaudit_${currentWebdomain.replace(/\s+/g, '_')}.pdf`);
      } catch (err) {
        console.error("Error al exportar reporte PDF de Auditoría Web:", err);
      }
    });
  }
});
