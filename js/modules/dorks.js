document.addEventListener('DOMContentLoaded', () => {
  const btnSearch   = document.getElementById('btn-generate-dork');
  const inputTarget = document.getElementById('dork-target');
  const selectType  = document.getElementById('dork-type');
  const resultsArea = document.getElementById('dork-results-area');
  const btnCopy     = document.getElementById('btn-copy-dork');
  const dorkCode    = document.getElementById('dork-code');
  const previewBox  = document.getElementById('dork-preview-box');

  if (!btnSearch) return;

  // ── Rutas comunes a probar via proxy ──────────────────────
  const ADMIN_PATHS = [
    '/admin', '/administrator', '/admin.php', '/admin/login', '/wp-admin',
    '/wp-login.php', '/login', '/cpanel', '/phpmyadmin', '/pma',
    '/panel', '/dashboard', '/manager', '/control', '/backend',
    '/admin/index.php', '/user/login', '/auth/login', '/admincp',
  ];
  const CONFIG_PATHS = [
    '/.env', '/config.php', '/config.yml', '/config.json', '/config.xml',
    '/.git/config', '/wp-config.php', '/settings.php', '/configuration.php',
    '/app/config/parameters.yml', '/config/database.yml', '/web.config',
    '/.htaccess', '/server.xml', '/docker-compose.yml', '/.npmrc',
    '/credentials.json', '/secrets.json', '/api_key.txt', '/passwd',
  ];
  const DIR_PATHS = [
    '/', '/backup', '/old', '/test', '/tmp', '/uploads', '/files',
    '/static', '/assets', '/media', '/images', '/docs', '/data',
    '/logs', '/archive', '/bak',
  ];
  const DB_PATHS = [
    '/backup.sql', '/dump.sql', '/database.sql', '/db.sql', '/data.sql',
    '/backup.db', '/data.db', '/database.db', '/db.sqlite', '/app.db',
    '/backup.zip', '/db_backup.sql', '/mysqldump.sql',
  ];
  const DOC_PATHS = [
    '/readme.txt', '/README.md', '/CHANGELOG.md', '/INSTALL.txt',
    '/robots.txt', '/sitemap.xml', '/crossdomain.xml',
    '/humans.txt', '/security.txt', '/.well-known/security.txt',
  ];

  // ── Helper: probar rutas via corsproxy ────────────────────
  async function probePaths(baseUrl, paths, checkFn) {
    const found = [];
    const BATCH = 6;
    for (let i = 0; i < paths.length; i += BATCH) {
      const batch = paths.slice(i, i + BATCH);
      const results = await Promise.allSettled(batch.map(async (path) => {
        const url = baseUrl + path;
        const useTor = window.isTorActive?.() ? 'true' : 'false';
        const proxy = `proxy.php?action=bypass&useTor=${useTor}&url=${encodeURIComponent(url)}`;
        const res = await fetch(proxy, { signal: AbortSignal.timeout(6000) });
        const text = await res.text();
        if (checkFn(res.status, text, path)) {
          return { path, url, status: res.status };
        }
        return null;
      }));
      results.forEach(r => { if (r.status === 'fulfilled' && r.value) found.push(r.value); });
    }
    return found;
  }

  // ── Render helpers ────────────────────────────────────────
  function card(title, icon, content) {
    return `<div class="glass-card" style="margin-bottom:1.5rem;">
      <h3 style="margin-bottom:1rem;"><i class="fa-solid ${icon}"></i> ${title}</h3>
      ${content}
    </div>`;
  }

  function resultRow(item, badgeClass = 'badge-error', badgeText = 'EXPUESTO') {
    return `<div class="dns-record-badge" style="display:flex;justify-content:space-between;align-items:center;">
      <span style="font-family:monospace;font-size:0.85rem;color:var(--cyan-color);">${item.path}</span>
      <div style="display:flex;gap:0.5rem;align-items:center;">
        <span class="badge ${badgeClass}">${badgeText}</span>
        <a href="${item.url}" target="_blank" class="btn btn-secondary btn-sm" style="padding:0.2rem 0.6rem;font-size:0.75rem;">
          <i class="fa-solid fa-up-right-from-square"></i>
        </a>
      </div>
    </div>`;
  }

  function emptyResult(msg) {
    return `<p style="color:var(--success-color);font-size:0.9rem;"><i class="fa-solid fa-circle-check"></i> ${msg}</p>`;
  }

  // ── MAIN ──────────────────────────────────────────────────
  btnSearch.addEventListener('click', async () => {
    let raw = inputTarget.value.trim().replace(/^https?:\/\//i, '').replace(/\/$/, '');
    if (!raw) { window.showToast('Introduce un dominio (ej: ejemplo.com).', 'warning'); return; }
    const domain  = raw.replace(/^www\./i, '');
    const baseUrl = `https://${domain}`;
    const type    = selectType.value;

    resultsArea.innerHTML = `<div class="glass-card" style="text-align:center;padding:2rem;">
      <i class="fa-solid fa-spinner fa-spin" style="font-size:2rem;color:var(--accent-color);"></i>
      <p style="margin-top:1rem;color:var(--text-secondary);">Analizando <strong>${domain}</strong>…</p>
    </div>`;
    previewBox.style.display = 'none';
    window.showLoader(`Analizando ${domain}…`);

    let html = '';

    try {
      // ── Subdominios ──────────────────────────────────────
      if (type === 'subdomains') {
        let list = [];
        try {
          // 1. Intentar primero desde proxy.php
          const res = await fetch(`proxy.php?action=subdomains&domain=${encodeURIComponent(domain)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.subdomains && Array.isArray(data.subdomains)) {
              list = data.subdomains;
            }
          }
        } catch (e) {
          console.warn("Error en proxy para dorks subdominios, usando fallback directo...", e);
        }

        // 2. Fallback 1: crt.sh directo
        if (list.length === 0) {
          try {
            const res = await fetch(`https://crt.sh/?q=%.${domain}&output=json`);
            const certs = await res.json();
            const subs = new Set();
            if (Array.isArray(certs)) {
              for (const cert of certs) {
                for (const name of (cert.name_value || '').split('\n')) {
                  const n = name.trim().toLowerCase();
                  if (n && n.endsWith('.' + domain) && !n.startsWith('*')) subs.add(n);
                }
              }
            }
            list = [...subs].sort();
          } catch (e) {
            console.error("Error en fallback crt.sh en dorks:", e);
          }
        }

        // 3. Fallback 2: HackerTarget
        if (list.length === 0) {
          try {
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
                list = [...subs].sort();
              }
            }
          } catch (e) {
            console.error("Error en fallback HackerTarget en dorks:", e);
          }
        }

        const rows = list.map(s => `
          <div class="dns-record-badge" style="display:flex;justify-content:space-between;align-items:center;">
            <span style="color:var(--cyan-color);font-family:monospace;font-size:0.85rem;">${s}</span>
            <a href="https://${s}" target="_blank" class="btn btn-secondary btn-sm" style="padding:0.2rem 0.6rem;font-size:0.75rem;">
              <i class="fa-solid fa-up-right-from-square"></i>
            </a>
          </div>`).join('');

        html = card(
          `${list.length} subdominios encontrados para ${domain}`,
          'fa-sitemap',
          list.length
            ? `<p style="color:var(--text-muted);font-size:0.8rem;margin-bottom:0.75rem;">Fuente: Certificate Transparency Logs / DNS</p>
               <div style="display:flex;flex-direction:column;gap:0.4rem;max-height:400px;overflow-y:auto;">${rows}</div>`
            : emptyResult('No se encontraron subdominios en certificados públicos ni en registros DNS.')
        );
      }

      // ── Paneles Admin ────────────────────────────────────
      else if (type === 'admin-panels') {
        const found = await probePaths(baseUrl, ADMIN_PATHS,
          (status, text) => status === 200 && !text.toLowerCase().includes('404') && !text.toLowerCase().includes('not found'));
        html = card(
          `Paneles de administración detectados`,
          'fa-key',
          found.length
            ? `<p style="color:var(--warning-color);font-size:0.85rem;margin-bottom:0.75rem;">⚠️ Se encontraron ${found.length} rutas accesibles:</p>
               <div style="display:flex;flex-direction:column;gap:0.4rem;">${found.map(f => resultRow(f, 'badge-warning', 'ACCESIBLE')).join('')}</div>`
            : emptyResult('No se detectaron paneles de administración accesibles.')
        );
      }

      // ── Config files ─────────────────────────────────────
      else if (type === 'config-files') {
        const found = await probePaths(baseUrl, CONFIG_PATHS,
          (status, text) => status === 200 && text.length > 10);
        html = card(
          `Archivos de configuración expuestos`,
          'fa-file-shield',
          found.length
            ? `<p style="color:var(--error-color);font-size:0.85rem;margin-bottom:0.75rem;">🚨 ${found.length} archivo(s) potencialmente expuesto(s):</p>
               <div style="display:flex;flex-direction:column;gap:0.4rem;">${found.map(f => resultRow(f)).join('')}</div>`
            : emptyResult('No se encontraron archivos de configuración expuestos.')
        );
      }

      // ── Directory listing ────────────────────────────────
      else if (type === 'directory-listing') {
        const found = await probePaths(baseUrl, DIR_PATHS,
          (status, text) => status === 200 && (text.toLowerCase().includes('index of') || text.toLowerCase().includes('directory listing')));
        html = card(
          `Directorios abiertos (Index Of)`,
          'fa-folder-open',
          found.length
            ? `<p style="color:var(--error-color);font-size:0.85rem;margin-bottom:0.75rem;">🚨 ${found.length} directorio(s) con listado activo:</p>
               <div style="display:flex;flex-direction:column;gap:0.4rem;">${found.map(f => resultRow(f)).join('')}</div>`
            : emptyResult('No se encontraron directorios con listado activo.')
        );
      }

      // ── Docs públicos ────────────────────────────────────
      else if (type === 'public-docs') {
        const found = await probePaths(baseUrl, DOC_PATHS,
          (status) => status === 200);
        html = card(
          `Archivos y documentos accesibles`,
          'fa-file-lines',
          found.length
            ? `<p style="color:var(--warning-color);font-size:0.85rem;margin-bottom:0.75rem;">📄 ${found.length} archivo(s) encontrado(s):</p>
               <div style="display:flex;flex-direction:column;gap:0.4rem;">${found.map(f => resultRow(f, 'badge-warning', 'VISIBLE')).join('')}</div>`
            : emptyResult('No se encontraron documentos públicos en rutas comunes.')
        );
      }

      // ── Database files ───────────────────────────────────
      else if (type === 'database-leaks') {
        const found = await probePaths(baseUrl, DB_PATHS,
          (status, text) => status === 200 && text.length > 100);
        html = card(
          `Archivos de base de datos expuestos`,
          'fa-database',
          found.length
            ? `<p style="color:var(--error-color);font-size:0.85rem;margin-bottom:0.75rem;">🚨 CRÍTICO — ${found.length} archivo(s) de base de datos accesible(s):</p>
               <div style="display:flex;flex-direction:column;gap:0.4rem;">${found.map(f => resultRow(f)).join('')}</div>`
            : emptyResult('No se encontraron archivos de base de datos expuestos.')
        );
      }

    } catch (err) {
      html = `<div class="glass-card" style="border-color:var(--error-color);">
        <p style="color:var(--error-color);"><i class="fa-solid fa-triangle-exclamation"></i> Error: ${err.message}</p>
      </div>`;
    }

    resultsArea.innerHTML = html;
    window.hideLoader();
  });

  // ── Copiar (por si queda el botón) ───────────────────────
  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      navigator.clipboard.writeText(dorkCode.textContent).then(() => {
        const orig = btnCopy.innerHTML;
        btnCopy.innerHTML = '<i class="fa-solid fa-check"></i> ¡Copiado!';
        setTimeout(() => { btnCopy.innerHTML = orig; }, 2000);
      });
    });
  }
});
