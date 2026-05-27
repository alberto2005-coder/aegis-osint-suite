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

  // Recuperar proxy guardado
  const customProxyInput = document.getElementById('username-custom-proxy');
  if (customProxyInput) {
    customProxyInput.value = localStorage.getItem('username_custom_proxy') || '';
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

  if (btnScanUsername) {
    btnScanUsername.addEventListener('click', async () => {
      const username = usernameInput.value.trim();
      if (!username) {
        alert('Por favor introduce un nombre de usuario.');
        return;
      }

      const platformsToScan = activeCategory === 'all'
        ? PLATFORMS
        : PLATFORMS.filter(p => p.category === activeCategory);

      window.showLoader(`Buscando "${username}" en redes vía Sherlock...`);
      usernameResultsContainer.style.display = 'none';
      currentUsernameResults = [];
      usernameTableBody.innerHTML = '';

      let foundCount = 0;
      let errorCount = 0;

      statScanned.textContent = '0';
      statFound.textContent = '0';
      statErrors.textContent = '0';
      usernameResultsContainer.style.display = 'block';

      // 1. Mostrar las plataformas base como "Buscando..." para feedback inmediato
      const platformRows = {};
      platformsToScan.forEach(platform => {
        const cleanName = platform.name.replace(/[^a-zA-Z0-9]/g, '');
        const profileUrl = platform.url.replace('{username}', username);
        const tr = document.createElement('tr');
        tr.dataset.category = platform.category || 'all';
        tr.innerHTML = `
          <td><strong>${platform.icon} ${platform.name}</strong></td>
          <td><a href="${profileUrl}" target="_blank" class="profile-link"><i class="fa-solid fa-up-right-from-square"></i> ${profileUrl}</a></td>
          <td><span class="badge badge-warning" id="status-${cleanName}">🔍 Buscando...</span><br><small style="color:#888;font-size:0.75em;">Sherlock OSINT</small></td>
          <td><button class="btn btn-secondary btn-sm" onclick="window.open('${profileUrl}', '_blank')"><i class="fa-solid fa-external-link"></i> Abrir</button></td>
        `;
        usernameTableBody.appendChild(tr);
        
        platformRows[platform.name.toLowerCase()] = {
          element: tr,
          statusSpan: tr.querySelector(`#status-${cleanName}`),
          url: profileUrl,
          icon: platform.icon,
          category: platform.category,
          updated: false
        };
      });

      // 2. Iniciar conexión SSE con el backend de Sherlock
      const useTor = document.getElementById('username-use-tor')?.checked ? 'true' : 'false';
      const customProxy = customProxyInput ? customProxyInput.value.trim() : '';
      if (customProxyInput) {
        localStorage.setItem('username_custom_proxy', customProxy);
      }
      let isFinished = false;
      const eventSource = new EventSource(`/api/sherlock?username=${encodeURIComponent(username)}&useTor=${useTor}&proxy=${encodeURIComponent(customProxy)}`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.status === 'found') {
            const platName = data.platform.toLowerCase();
            const resultObj = {
              platform: data.platform,
              category: 'social',
              url: data.url,
              status: '✅ Encontrado',
              method: 'Sherlock OSINT',
              icon: '🌐'
            };

            // Si es una de las plataformas de la lista base, la actualizamos
            if (platformRows[platName]) {
              // Si ya había sido actualizada por la API rápida, evitamos duplicar la lógica
              if (platformRows[platName].updated) return;
              
              platformRows[platName].statusSpan.className = 'badge badge-success';
              platformRows[platName].statusSpan.textContent = '✅ Encontrado';
              platformRows[platName].updated = true;
              resultObj.category = platformRows[platName].category;
              resultObj.icon = platformRows[platName].icon;
            } else {
              // Si es una plataforma adicional encontrada, la creamos al vuelo
              const tr = document.createElement('tr');
              tr.dataset.category = 'social';
              tr.innerHTML = `
                <td><strong>🌐 ${data.platform}</strong></td>
                <td><a href="${data.url}" target="_blank" class="profile-link"><i class="fa-solid fa-up-right-from-square"></i> ${data.url}</a></td>
                <td><span class="badge badge-success">✅ Encontrado</span><br><small style="color:#888;font-size:0.75em;">Sherlock OSINT</small></td>
                <td><button class="btn btn-secondary btn-sm" onclick="window.open('${data.url}', '_blank')"><i class="fa-solid fa-external-link"></i> Abrir</button></td>
              `;
              usernameTableBody.appendChild(tr);
            }

            currentUsernameResults.push(resultObj);
            foundCount++;
            statFound.textContent = foundCount;
            statScanned.textContent = currentUsernameResults.length;
          }

          if (data.status === 'not_found') {
            const platName = data.platform.toLowerCase();
            if (platformRows[platName] && !platformRows[platName].updated) {
              platformRows[platName].statusSpan.className = 'badge badge-error';
              platformRows[platName].statusSpan.textContent = '❌ No Encontrado';
              platformRows[platName].updated = true;

              currentUsernameResults.push({
                platform: platformRows[platName].element.querySelector('strong').textContent.replace(platformRows[platName].icon, '').trim(),
                category: platformRows[platName].category,
                url: platformRows[platName].url,
                status: '❌ No Encontrado',
                method: 'Sherlock OSINT',
                icon: platformRows[platName].icon
              });

              statScanned.textContent = currentUsernameResults.length;
            }
          }

          if (data.status === 'done') {
            isFinished = true;
            eventSource.close();

            // 3. Todo lo que no se haya encontrado ni reportado por Sherlock, se marca como No Encontrado
            Object.keys(platformRows).forEach(key => {
              if (!platformRows[key].updated) {
                platformRows[key].statusSpan.className = 'badge badge-error';
                platformRows[key].statusSpan.textContent = '❌ No Encontrado';
                platformRows[key].updated = true;
                
                currentUsernameResults.push({
                  platform: key.charAt(0).toUpperCase() + key.slice(1),
                  category: platformRows[key].category,
                  url: platformRows[key].url,
                  status: '❌ No Encontrado',
                  method: 'Sherlock OSINT',
                  icon: platformRows[key].icon
                });
              }
            });

            statScanned.textContent = currentUsernameResults.length;
            window.hideLoader();
          }
        } catch (err) {
          console.error("Error parseando mensaje de Sherlock:", err);
        }
      };

      eventSource.onerror = (err) => {
        if (isFinished) return;
        console.error("Error en conexión EventSource con Sherlock:", err);
        eventSource.close();

        // Si falla la conexión, marcamos las pendientes como omitidas
        Object.keys(platformRows).forEach(key => {
          if (!platformRows[key].updated) {
            platformRows[key].statusSpan.className = 'badge badge-error';
            platformRows[key].statusSpan.textContent = '❌ Error / Omitido';
            errorCount++;
          }
        });

        statErrors.textContent = errorCount;
        window.hideLoader();
      };

      if (window.osintSaveHistory) window.osintSaveHistory('username', username);
    });
  }

  function appendUsernameRow(row) {
    let badgeClass = 'badge-error';
    if (row.status.includes('✅')) badgeClass = 'badge-success';
    if (row.status.includes('⚠️')) badgeClass = 'badge-warning';

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
      if (currentUsernameResults.length === 0) return;
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(currentUsernameResults, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `osint_usernames_${usernameInput.value.trim()}_${new Date().getTime()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });
  }
});