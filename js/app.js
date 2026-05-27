document.addEventListener('DOMContentLoaded', () => {
  // Navigation Tabs
  const navItems = document.querySelectorAll('.nav-item');
  const tabPanels = document.querySelectorAll('.tab-panel');
  const tabTitle = document.getElementById('tab-title');
  const tabSubtitle = document.getElementById('tab-subtitle');

  const tabMeta = {
    'username-tab': {
      title: 'Buscador de Usuarios (Sherlock)',
      subtitle: 'Busca coincidencias de cuentas de usuario en decenas de redes sociales y foros en tiempo real.'
    },
    'email-tab': {
      title: 'Análisis de Correos Electrónicos',
      subtitle: 'Comprueba si la cuenta de correo existe en los servidores y genera enlaces de búsqueda.'
    },
    'domain-tab': {
      title: 'Análisis de Dominios e IPs',
      subtitle: 'Resolución de registros DNS vía Cloudflare y geolocalización de servidores IP.'
    },
    'phone-tab': {
      title: 'Investigación de Teléfonos',
      subtitle: 'Valida prefijos de marcación e investiga orígenes a través de directorios públicos.'
    },
    'name-face-tab': {
      title: 'Búsqueda por Nombre y Reconocimiento Facial',
      subtitle: 'Genera consultas para personas por nombre real o realiza búsquedas inversas de rostros en plataformas externas.'
    },
    'exif-tab': {
      title: 'Metadatos EXIF',
      subtitle: 'Analiza metadatos de imágenes JPG/JPEG para extraer fechas, cámaras y geolocalización.'
    },
    'header-tab': {
      title: 'Analizador de Cabeceras de Correo',
      subtitle: 'Pega el código de cabeceras de un email para rastrear la IP del remitente e historial de saltos.'
    },
    'pdf-tab': {
      title: 'OSINT de Documentos PDF',
      subtitle: 'Inspecciona metadatos internos de archivos PDF sin subirlos a internet (100% local).'
    },
    'linux-tab': {
      title: 'Comandos y Herramientas Linux',
      subtitle: 'Genera comandos listos para instalar y ejecutar herramientas OSINT de terminal.'
    },
    'dorks-tab': {
      title: 'Reconocimiento de Dominios',
      subtitle: 'Descubre subdominios, paneles de administración, archivos expuestos y más — directamente en la app.'
    },
    'webaudit-tab': {
      title: 'Auditoría Web Completa',
      subtitle: 'Analiza seguridad HTTP, tecnologías, SSL, subdominios e IP de cualquier dominio.'
    }
  };

  // ── Tab input map: tab ID → input field ID ────────────────────────────
  const tabInputMap = {
    'username-tab': 'username-input',
    'email-tab':    'email-input',
    'domain-tab':   'domain-input',
    'phone-tab':    'phone-input',
  };

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.getAttribute('data-tab');

      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');

      tabPanels.forEach(panel => panel.classList.remove('active'));
      document.getElementById(targetTab).classList.add('active');

      if (tabMeta[targetTab]) {
        tabTitle.textContent = tabMeta[targetTab].title;
        tabSubtitle.textContent = tabMeta[targetTab].subtitle;
      }
    });
  });

  // Global Loader Functions (exposed on window for modules)
  const loader = document.getElementById('loading-overlay');
  const loaderText = document.getElementById('loading-text');

  window.showLoader = (text = 'Buscando en bases de datos de OSINT...') => {
    if (loaderText && loader) {
      loaderText.textContent = text;
      loader.style.display = 'flex';
    }
  };

  window.hideLoader = () => {
    if (loader) {
      loader.style.display = 'none';
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // HISTORIAL DE BÚSQUEDAS RECIENTES
  // ─────────────────────────────────────────────────────────────────────────
  const HISTORY_KEY = 'aegis_osint_history';
  const MAX_HISTORY = 12;

  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
    catch(e) { return []; }
  }

  function saveHistory(type, value) {
    if (!value || !value.trim()) return;
    let history = loadHistory();
    // Remove duplicate
    history = history.filter(h => !(h.type === type && h.value === value));
    // Prepend new entry
    history.unshift({ type, value, ts: Date.now() });
    // Keep only MAX_HISTORY entries
    history = history.slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistory();
  }

  function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
  }

  // Expose globally so modules can call it
  window.osintSaveHistory = saveHistory;

  const typeIcon = {
    username: 'fa-user',
    email:    'fa-envelope',
    domain:   'fa-globe',
    phone:    'fa-phone',
  };

  const typeTab = {
    username: 'username-tab',
    email:    'email-tab',
    domain:   'domain-tab',
    phone:    'phone-tab',
  };

  const typeColor = {
    username: 'var(--accent-color)',
    email:    'var(--cyan-color)',
    domain:   'var(--success-color)',
    phone:    'var(--warning-color)',
  };

  function renderHistory() {
    const container = document.getElementById('sidebar-history');
    if (!container) return;
    const history = loadHistory();

    if (history.length === 0) {
      container.innerHTML = `<p style="color:var(--text-muted);font-size:0.75rem;padding:0.25rem 0.5rem;">Sin búsquedas recientes</p>`;
      return;
    }

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:0.25rem 0.5rem 0.5rem;">
        <span style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;">Historial</span>
        <button id="btn-clear-history" title="Borrar historial" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.75rem;padding:0;">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
      <div style="display:flex;flex-direction:column;gap:0.3rem;">
        ${history.map(h => `
          <button class="history-pill" data-type="${h.type}" data-value="${h.value}"
            title="Buscar: ${h.value}" style="
              background: rgba(255,255,255,0.04);
              border: 1px solid rgba(255,255,255,0.07);
              border-radius: 6px;
              padding: 0.3rem 0.6rem;
              display: flex;
              align-items: center;
              gap: 0.4rem;
              cursor: pointer;
              text-align: left;
              width: 100%;
              overflow: hidden;
              transition: background 0.2s;
            ">
            <i class="fa-solid ${typeIcon[h.type] || 'fa-search'}" style="color:${typeColor[h.type] || 'var(--text-muted)'};font-size:0.7rem;flex-shrink:0;"></i>
            <span style="font-size:0.78rem;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${h.value}</span>
          </button>
        `).join('')}
      </div>
    `;

    // Clear button
    document.getElementById('btn-clear-history')?.addEventListener('click', clearHistory);

    // History pill clicks — navigate to tab and pre-fill input
    container.querySelectorAll('.history-pill').forEach(pill => {
      pill.addEventListener('mouseenter', () => { pill.style.background = 'rgba(255,255,255,0.09)'; });
      pill.addEventListener('mouseleave', () => { pill.style.background = 'rgba(255,255,255,0.04)'; });
      pill.addEventListener('click', () => {
        const type = pill.getAttribute('data-type');
        const value = pill.getAttribute('data-value');
        const tabId = typeTab[type];
        const inputId = tabInputMap[tabId];
        if (tabId) {
          const navBtn = document.querySelector(`[data-tab="${tabId}"]`);
          if (navBtn) navBtn.click();
        }
        if (inputId) {
          const input = document.getElementById(inputId);
          if (input) {
            input.value = value;
            input.focus();
          }
        }
      });
    });
  }

  // Initial render
  renderHistory();

  // ── CONTROL DE ENRUTADO TOR GLOBAL ──────────────────────────────────────────
  const globalTorCheckbox = document.getElementById('global-tor-checkbox');
  const torSwitchLabel = document.getElementById('tor-switch-label-el');

  function updateTorUI(active) {
    if (active) {
      torSwitchLabel?.classList.add('active');
    } else {
      torSwitchLabel?.classList.remove('active');
    }
  }

  // Leer preferencia guardada
  const isTorEnabled = localStorage.getItem('aegis_tor_enabled') === 'true';
  if (globalTorCheckbox) {
    globalTorCheckbox.checked = isTorEnabled;
    updateTorUI(isTorEnabled);

    globalTorCheckbox.addEventListener('change', (e) => {
      const active = e.target.checked;
      localStorage.setItem('aegis_tor_enabled', active);
      updateTorUI(active);
      
      // Sincronizar también el checkbox local de Sherlock si existe y está visible
      const localTor = document.getElementById('username-use-tor');
      if (localTor) {
        localTor.checked = active;
      }
    });
  }

  window.isTorActive = () => {
    return globalTorCheckbox ? globalTorCheckbox.checked : false;
  };
});
