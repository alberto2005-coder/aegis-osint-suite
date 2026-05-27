document.addEventListener('DOMContentLoaded', () => {
  // --- 1. USERNAME SCANNER CON RUTEO VÍA SERVIDOR + TOR ---
  const btnScanUsername = document.getElementById('btn-scan-username');
  const usernameInput = document.getElementById('username-input');
  const usernameResultsContainer = document.getElementById('username-results-container');
  const usernameTableBody = document.getElementById('username-table-body');
  const usernameFilter = document.getElementById('username-filter');
  const btnExportUsername = document.getElementById('btn-export-username');

  const statScanned = document.getElementById('stat-scanned');
  const statFound = document.getElementById('stat-found');
  const statErrors = document.getElementById('stat-errors');
  const btnStopUsername = document.getElementById('btn-stop-username');
  let currentEventSource = null;

  // Recuperar proxy guardado
  const customProxyInput = document.getElementById('username-custom-proxy');
  if (customProxyInput) {
    customProxyInput.value = localStorage.getItem('username_custom_proxy') || '';
  }

  const localTorCheckbox = document.getElementById('username-use-tor');
  if (localTorCheckbox) {
    localTorCheckbox.checked = window.isTorActive?.() || false;
  }

  // ── CONFIGURACIÓN DE PLATAFORMAS ──────────────────────────────────────────
  const PLATFORMS = [
    // Social
    { name: 'Instagram', url: 'https://www.instagram.com/{username}', checkUrl: 'https://www.instagram.com/{username}/', category: 'social', icon: '📷' },
    { name: 'Threads', url: 'https://www.threads.net/@{username}', checkUrl: 'https://www.threads.net/@{username}', category: 'social', icon: '💬' },
    { name: 'Twitter/X', url: 'https://x.com/{username}', checkUrl: 'https://x.com/{username}', category: 'social', icon: '𝕏' },
    { name: 'TikTok', url: 'https://www.tiktok.com/@{username}', checkUrl: 'https://www.tiktok.com/@{username}', category: 'social', icon: '🎵' },
    { name: 'Facebook', url: 'https://www.facebook.com/{username}', checkUrl: 'https://www.facebook.com/{username}', category: 'social', icon: '👥' },
    { name: 'Pinterest', url: 'https://www.pinterest.com/{username}', checkUrl: 'https://www.pinterest.com/{username}/', category: 'social', icon: '📌' },
    { name: 'YouTube', url: 'https://www.youtube.com/@{username}', checkUrl: 'https://www.youtube.com/@{username}', category: 'social', icon: '📺' },
    { name: 'Linktree', url: 'https://linktr.ee/{username}', checkUrl: 'https://linktr.ee/{username}', category: 'social', icon: '🔗' },
    // Dev / Gaming
    { name: 'GitHub', url: 'https://github.com/{username}', checkUrl: 'https://github.com/{username}', category: 'dev', icon: '🐙' },
    { name: 'Reddit', url: 'https://www.reddit.com/user/{username}', checkUrl: 'https://www.reddit.com/user/{username}/', category: 'dev', icon: '🤖' },
    { name: 'Twitch', url: 'https://www.twitch.tv/{username}', checkUrl: 'https://www.twitch.tv/{username}', category: 'dev', icon: '📡' },
    { name: 'Steam', url: 'https://steamcommunity.com/id/{username}', checkUrl: 'https://steamcommunity.com/id/{username}/', category: 'dev', icon: '🎮' },
    { name: 'Chess.com', url: 'https://www.chess.com/member/{username}', checkUrl: 'https://www.chess.com/member/{username}', category: 'dev', icon: '♟️' },
    { name: 'HackerNews', url: 'https://news.ycombinator.com/user?id={username}', checkUrl: 'https://news.ycombinator.com/user?id={username}', category: 'dev', icon: '📰' },
    { name: 'Dev.to', url: 'https://dev.to/{username}', checkUrl: 'https://dev.to/{username}', category: 'dev', icon: '💻' },
    { name: 'DockerHub', url: 'https://hub.docker.com/u/{username}', checkUrl: 'https://hub.docker.com/u/{username}/', category: 'dev', icon: '🐳' },
    { name: 'Keybase', url: 'https://keybase.io/{username}', checkUrl: 'https://keybase.io/{username}', category: 'dev', icon: '🔐' },
    // Música / Arte
    { name: 'Spotify', url: 'https://open.spotify.com/user/{username}', checkUrl: 'https://open.spotify.com/user/{username}', category: 'music', icon: '🎵' },
    { name: 'SoundCloud', url: 'https://soundcloud.com/{username}', checkUrl: 'https://soundcloud.com/{username}', category: 'music', icon: '🎼' },
    { name: 'Behance', url: 'https://www.behance.net/{username}', checkUrl: 'https://www.behance.net/{username}', category: 'music', icon: '🎨' },
    { name: 'Dribbble', url: 'https://dribbble.com/{username}', checkUrl: 'https://dribbble.com/{username}', category: 'music', icon: '🎯' },
    { name: 'Letterboxd', url: 'https://letterboxd.com/{username}', checkUrl: 'https://letterboxd.com/{username}/', category: 'music', icon: '🎬' },
    // Profesional
    { name: 'Medium', url: 'https://medium.com/@{username}', checkUrl: 'https://medium.com/@{username}', category: 'pro', icon: '✍️' },
  ];

  let currentUsernameResults = [];
  let activeCategory = 'all';

  // ── CHIPS DE CATEGORÍA ──────────────────────────────────────────────────
  const categoryChipsContainer = document.getElementById('username-category-chips');
  if (categoryChipsContainer) {
    const categories = [
      { key: 'all', label: '🌎 Todas', count: PLATFORMS.length },
      { key: 'social', label: '📸 Social', count: PLATFORMS.filter(p => p.category === 'social').length },
      { key: 'dev', label: '💻 Dev / Gaming', count: PLATFORMS.filter(p => p.category === 'dev').length },
      { key: 'music', label: '🎵 Arte / Música', count: PLATFORMS.filter(p => p.category === 'music').length },
      { key: 'pro', label: '💼 Profesional', count: PLATFORMS.filter(p => p.category === 'pro').length },
    ];

    categoryChipsContainer.innerHTML = categories.map(c => `
      <button class="category-chip ${c.key === 'all' ? 'active' : ''}" data-cat="${c.key}">
        ${c.label} <span class="chip-count">${c.count}</span>
      </button>
    `).join('');

    categoryChipsContainer.querySelectorAll('.category-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        categoryChipsContainer.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activeCategory = chip.getAttribute('data-cat');
        renderFilteredResults();
      });
    });
  }

  function renderFilteredResults() {
    const filterText = usernameFilter ? usernameFilter.value.toLowerCase() : '';
    const filtered = currentUsernameResults.filter(r => {
      const matchCat = activeCategory === 'all' || r.category === activeCategory;
      const matchText = r.platform.toLowerCase().includes(filterText);
      return matchCat && matchText;
    });
    usernameTableBody.innerHTML = '';
    filtered.forEach(appendUsernameRow);
  }

  // ── FUNCIÓN DE VERIFICACIÓN CAMBIADA A TU PROPIO PROXY ──────────────────
  async function verifyUsername(platform, username) {
    // Generar la URL final del perfil objetivo
    const targetUrl = platform.checkUrl.replaceAll('{username}', username);

    try {
      // LLAMADA A TU PROPIO BACKEND (Evita CORS y usa Tor simultáneamente)
      const proxyUrl = `/proxy.php?action=check&url=${encodeURIComponent(targetUrl)}`;

      const response = await fetch(proxyUrl, { method: 'GET' });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const data = await response.json();

      // Si el destino es totalmente inaccesible (error de red en servidor)
      if (data.error) {
        return { exists: null, method: 'Proxy->Tor', status: '❌ Error' };
      }

      // Analizamos las respuestas basados en el status code o patrones del body de tu server.js
      // Un 404 claro significa que el usuario no existe.
      // Si el servidor nos avisa de que la IP está bloqueada por la plataforma
      if (data.blocked === true) {
        return {
          exists: null,
          method: data.torUsed ? 'Tor 🧅' : 'Direct 🌐',
          status: '⚠️ Bloqueado (IP)'
        };
      }

      // Si el destino es un 404 o tiene patrones de "No encontrado"
      if (data.status === 404 || data.textNotFound === true) {
        return {
          exists: false,
          method: data.torUsed ? 'Tor 🧅' : 'Direct 🌐',
          status: '❌ No Encontrado'
        };
      }

      if (data.status === 200 && data.textNotFound === false) {
        return {
          exists: true,
          method: data.torUsed ? 'Tor 🧅' : 'Direct 🌐',
          status: '✅ Encontrado'
        };
      }

      if (data.status === 200 && data.textNotFound === false) {
        return {
          exists: true,
          method: data.torUsed ? 'Tor 🧅' : 'Direct 🌐',
          status: '✅ Encontrado'
        };
      }

      // Fallbacks para códigos raros como 403, 429 capturados por el server
      return {
        exists: null,
        method: 'Proxy',
        status: `⚠️ HTTP ${data.status || 'Desconocido'}`
      };

    } catch (err) {
      console.error(`Error verificando ${platform.name} mediante proxy:`, err);
      return {
        exists: null,
        method: 'ERROR',
        status: '❌ Error'
      };
    }
  }

  function updateStats() {
    if (!statScanned || !statFound || !statErrors) return;
    const found = currentUsernameResults.filter(r => r.status.includes('✅')).length;
    const errors = currentUsernameResults.filter(r => r.status.includes('❌') || r.status.includes('⚠️')).length;
    const scanned = currentUsernameResults.filter(r => !r.status.includes('🔍')).length;

    statScanned.textContent = scanned;
    statFound.textContent = found;
    statErrors.textContent = errors;
  }

  if (btnScanUsername) {
    btnScanUsername.addEventListener('click', async () => {
      const username = usernameInput.value.trim();
      if (!username) {
        alert('Por favor introduce un nombre de usuario.');
        return;
      }

      // Validación sintáctica en frontend (mismos criterios que el backend)
      if (!/^[a-zA-Z0-9_\-\.]+$/.test(username)) {
        alert('El nombre de usuario contiene caracteres no válidos. Solo se permiten letras, números, guiones, guiones bajos y puntos.');
        return;
      }

      const platformsToScan = activeCategory === 'all'
        ? PLATFORMS
        : PLATFORMS.filter(p => p.category === activeCategory);

      // En lugar de bloquear la pantalla completa, cambiamos el estado del botón
      btnScanUsername.disabled = true;
      btnScanUsername.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Escaneando...';
      
      // Mostrar la tabla de resultados de inmediato para ver el avance en tiempo real
      usernameResultsContainer.style.display = 'block';
      
      // Inicializar resultados con estado "Buscando..."
      currentUsernameResults = [];
      platformsToScan.forEach(platform => {
        const profileUrl = platform.url.replace('{username}', username);
        currentUsernameResults.push({
          platform: platform.name,
          category: platform.category,
          url: profileUrl,
          status: '🔍 Buscando...',
          method: 'Sherlock OSINT',
          icon: platform.icon
        });
      });

      renderFilteredResults();
      updateStats();

      if (btnStopUsername) {
        btnStopUsername.style.display = 'inline-flex';
      }

      // 2. Iniciar conexión SSE con el backend de Sherlock
      const useTor = (window.isTorActive?.() || document.getElementById('username-use-tor')?.checked) ? 'true' : 'false';
      const customProxy = customProxyInput ? customProxyInput.value.trim() : '';
      if (customProxyInput) {
        localStorage.setItem('username_custom_proxy', customProxy);
      }
      let isFinished = false;
      currentEventSource = new EventSource(`/api/sherlock?username=${encodeURIComponent(username)}&useTor=${useTor}&proxy=${encodeURIComponent(customProxy)}`);

      currentEventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.status === 'found') {
            const platName = data.platform.toLowerCase();
            
            // Buscar si ya existe en la lista base
            const item = currentUsernameResults.find(r => r.platform.toLowerCase() === platName);
            if (item) {
              item.status = '✅ Encontrado';
            } else {
              // Si es una plataforma adicional, la añadimos al vuelo
              currentUsernameResults.push({
                platform: data.platform,
                category: 'social', // Categoría por defecto para extras
                url: data.url,
                status: '✅ Encontrado',
                method: 'Sherlock OSINT',
                icon: '🌐'
              });
            }
            renderFilteredResults();
            updateStats();
          }

          if (data.status === 'not_found') {
            const platName = data.platform.toLowerCase();
            const item = currentUsernameResults.find(r => r.platform.toLowerCase() === platName);
            if (item) {
              item.status = '❌ No Encontrado';
              renderFilteredResults();
              updateStats();
            }
          }

          if (data.status === 'done') {
            isFinished = true;
            if (currentEventSource) {
              currentEventSource.close();
              currentEventSource = null;
            }

            // Marcar cualquier plataforma base que siga en "Buscando..." como "No Encontrado"
            currentUsernameResults.forEach(r => {
              if (r.status.includes('🔍')) {
                r.status = '❌ No Encontrado';
              }
            });

            renderFilteredResults();
            updateStats();
            btnScanUsername.disabled = false;
            btnScanUsername.innerHTML = '<i class="fa-solid fa-radar-chart"></i> Escanear';
            if (btnStopUsername) {
              btnStopUsername.style.display = 'none';
            }
          }
        } catch (err) {
          console.error("Error parseando mensaje de Sherlock:", err);
        }
      };

      currentEventSource.onerror = (err) => {
        if (isFinished) return;
        console.error("Error en conexión EventSource con Sherlock:", err);
        if (currentEventSource) {
          currentEventSource.close();
          currentEventSource = null;
        }

        // Si falla la conexión, marcamos las pendientes como omitidas
        currentUsernameResults.forEach(r => {
          if (r.status.includes('🔍')) {
            r.status = '❌ Error / Omitido';
          }
        });

        renderFilteredResults();
        updateStats();
        btnScanUsername.disabled = false;
        btnScanUsername.innerHTML = '<i class="fa-solid fa-radar-chart"></i> Escanear';
        if (btnStopUsername) {
          btnStopUsername.style.display = 'none';
        }
      };

      if (window.osintSaveHistory) window.osintSaveHistory('username', username);
    });
  }

  if (btnStopUsername) {
    btnStopUsername.addEventListener('click', () => {
      if (currentEventSource) {
        currentEventSource.close();
        currentEventSource = null;
      }
      currentUsernameResults.forEach(r => {
        if (r.status.includes('🔍')) {
          r.status = '❌ Detenido';
        }
      });
      renderFilteredResults();
      updateStats();
      btnScanUsername.disabled = false;
      btnScanUsername.innerHTML = '<i class="fa-solid fa-radar-chart"></i> Escanear';
      btnStopUsername.style.display = 'none';
    });
  }

  function appendUsernameRow(row) {
    let badgeClass = 'badge-error';
    if (row.status.includes('✅')) badgeClass = 'badge-success';
    if (row.status.includes('⚠️') || row.status.includes('🔍')) badgeClass = 'badge-warning';

    const tr = document.createElement('tr');
    tr.dataset.category = row.category || 'all';
    tr.innerHTML = `
      <td><strong>${row.icon} ${row.platform}</strong></td>
      <td><a href="${row.url}" target="_blank" class="profile-link"><i class="fa-solid fa-up-right-from-square"></i> ${row.url}</a></td>
      <td><span class="badge ${badgeClass}">${row.status}</span><br><small style="color:#666;font-size:0.75em;">${row.method}</small></td>
      <td><button class="btn btn-secondary btn-sm" onclick="window.open('${row.url}', '_blank')"><i class="fa-solid fa-external-link"></i> Abrir</button></td>
    `;
    usernameTableBody.appendChild(tr);
  }

  if (usernameFilter) {
    usernameFilter.addEventListener('input', () => {
      renderFilteredResults();
    });
  }

  if (btnExportUsername) {
    btnExportUsername.addEventListener('click', () => {
      try {
        if (currentUsernameResults.length === 0) return;
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(currentUsernameResults, null, 2))}`;
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', jsonString);
        downloadAnchor.setAttribute('download', `osint_usernames_${usernameInput.value.trim()}_${new Date().getTime()}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      } catch (err) {
        console.error("Error al exportar JSON de nombres de usuario:", err);
      }
    });
  }

  const btnExportUsernamePdf = document.getElementById('btn-export-username-pdf');
  if (btnExportUsernamePdf) {
    btnExportUsernamePdf.addEventListener('click', () => {
      try {
        if (currentUsernameResults.length === 0) return;
        const username = usernameInput.value.trim() || 'usuario';
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
        doc.text("REPORTE DE BÚSQUEDA DE USUARIOS", 15, 33);
        
        // Info general
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(11);
        doc.text(`Objetivo (Nombre de usuario): ${username}`, 15, 50);
        doc.text(`Fecha del análisis: ${new Date().toLocaleString()}`, 15, 57);
        
        let y = 70;
        doc.setFont("helvetica", "bold");
        doc.text("Plataforma", 15, y);
        doc.text("Estado", 85, y);
        doc.text("Enlace de Perfil", 125, y);
        doc.line(15, y + 2, 195, y + 2);
        
        doc.setFont("helvetica", "normal");
        y += 8;
        currentUsernameResults.forEach(res => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.text(String(res.platform), 15, y);
          doc.text(String(res.status), 85, y);
          doc.setFontSize(9);
          doc.text(String(res.url).substring(0, 45), 125, y);
          doc.setFontSize(11);
          y += 8;
        });
        
        doc.save(`aegis_usernames_${username}.pdf`);
      } catch (err) {
        console.error("Error al exportar reporte PDF de nombres de usuario:", err);
      }
    });
  }
});