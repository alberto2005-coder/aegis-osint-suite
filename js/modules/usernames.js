document.addEventListener('DOMContentLoaded', () => {
  // --- 1. USERNAME SCANNER ---
  const btnScanUsername = document.getElementById('btn-scan-username');
  const usernameInput = document.getElementById('username-input');
  const usernameResultsContainer = document.getElementById('username-results-container');
  const usernameTableBody = document.getElementById('username-table-body');
  const usernameFilter = document.getElementById('username-filter');
  const btnExportUsername = document.getElementById('btn-export-username');

  const statScanned = document.getElementById('stat-scanned');
  const statFound = document.getElementById('stat-found');
  const statErrors = document.getElementById('stat-errors');

  // ── Plataformas con categorías ─────────────────────────────────────────
  const PLATFORMS = [
    // Social
    { name: 'Instagram',   url: 'https://www.instagram.com/{username}',          checkUrl: 'https://www.instagram.com/{username}/',                           type: 'social',      category: 'social' },
    { name: 'Threads',     url: 'https://www.threads.net/@{username}',            checkUrl: 'https://www.threads.net/@{username}',                              type: 'social',      category: 'social' },
    { name: 'Twitter/X',   url: 'https://x.com/{username}',                       checkUrl: 'https://publish.twitter.com/oembed?url=https://twitter.com/{username}', type: 'twitter_api', category: 'social' },
    { name: 'TikTok',      url: 'https://www.tiktok.com/@{username}',             checkUrl: 'https://www.tiktok.com/@{username}',                               type: 'social',      category: 'social' },
    { name: 'Facebook',    url: 'https://www.facebook.com/{username}',            checkUrl: 'https://www.facebook.com/{username}',                              type: 'social',      category: 'social' },
    { name: 'Pinterest',   url: 'https://www.pinterest.com/{username}',           checkUrl: 'https://www.pinterest.com/{username}/',                            type: 'standard',    category: 'social' },
    { name: 'YouTube',     url: 'https://www.youtube.com/@{username}',            checkUrl: 'https://www.youtube.com/@{username}',                              type: 'standard',    category: 'social' },
    { name: 'Linktree',    url: 'https://linktr.ee/{username}',                   checkUrl: 'https://linktr.ee/{username}',                                     type: 'standard',    category: 'social' },
    // Dev / Gaming
    { name: 'GitHub',      url: 'https://github.com/{username}',                  checkUrl: 'https://github.com/{username}',                                    type: 'standard',    category: 'dev' },
    { name: 'Reddit',      url: 'https://www.reddit.com/user/{username}',         checkUrl: 'https://www.reddit.com/user/{username}',                           type: 'standard',    category: 'dev' },
    { name: 'Twitch',      url: 'https://www.twitch.tv/{username}',               checkUrl: 'https://www.twitch.tv/{username}',                                 type: 'standard',    category: 'dev' },
    { name: 'Steam',       url: 'https://steamcommunity.com/id/{username}',       checkUrl: 'https://steamcommunity.com/id/{username}',                         type: 'standard',    category: 'dev' },
    { name: 'Chess.com',   url: 'https://www.chess.com/member/{username}',        checkUrl: 'https://www.chess.com/member/{username}',                          type: 'standard',    category: 'dev' },
    { name: 'HackerNews',  url: 'https://news.ycombinator.com/user?id={username}',checkUrl: 'https://news.ycombinator.com/user?id={username}',                  type: 'standard',    category: 'dev' },
    { name: 'Dev.to',      url: 'https://dev.to/{username}',                      checkUrl: 'https://dev.to/{username}',                                        type: 'standard',    category: 'dev' },
    { name: 'DockerHub',   url: 'https://hub.docker.com/u/{username}',            checkUrl: 'https://hub.docker.com/v2/users/{username}/',                      type: 'standard',    category: 'dev' },
    { name: 'Keybase',     url: 'https://keybase.io/{username}',                  checkUrl: 'https://keybase.io/{username}',                                    type: 'standard',    category: 'dev' },
    // Música / Arte
    { name: 'Spotify',     url: 'https://open.spotify.com/user/{username}',       checkUrl: 'https://open.spotify.com/user/{username}',                         type: 'standard',    category: 'music' },
    { name: 'SoundCloud',  url: 'https://soundcloud.com/{username}',              checkUrl: 'https://soundcloud.com/{username}',                                type: 'standard',    category: 'music' },
    { name: 'Behance',     url: 'https://www.behance.net/{username}',             checkUrl: 'https://www.behance.net/{username}',                               type: 'standard',    category: 'music' },
    { name: 'Dribbble',    url: 'https://dribbble.com/{username}',                checkUrl: 'https://dribbble.com/{username}',                                  type: 'standard',    category: 'music' },
    { name: 'Letterboxd',  url: 'https://letterboxd.com/{username}',              checkUrl: 'https://letterboxd.com/{username}',                                type: 'standard',    category: 'music' },
    // Profesional
    { name: 'Medium',      url: 'https://medium.com/@{username}',                 checkUrl: 'https://medium.com/@{username}',                                   type: 'standard',    category: 'pro' },
  ];

  // ── Estado ──────────────────────────────────────────────────────────────
  let currentUsernameResults = [];
  let activeCategory = 'all';

  // ── Chips de categoría ──────────────────────────────────────────────────
  const categoryChipsContainer = document.getElementById('username-category-chips');
  if (categoryChipsContainer) {
    const categories = [
      { key: 'all',   label: '&#127758; Todas',        count: PLATFORMS.length },
      { key: 'social', label: '&#128248; Social',      count: PLATFORMS.filter(p=>p.category==='social').length },
      { key: 'dev',    label: '&#128187; Dev / Gaming', count: PLATFORMS.filter(p=>p.category==='dev').length },
      { key: 'music',  label: '&#127925; Arte / Música', count: PLATFORMS.filter(p=>p.category==='music').length },
      { key: 'pro',    label: '&#128188; Profesional',  count: PLATFORMS.filter(p=>p.category==='pro').length },
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
        // Re-render filtered results
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

  if (btnScanUsername) {
    btnScanUsername.addEventListener('click', async () => {
      const username = usernameInput.value.trim();
      if (!username) {
        alert('Por favor introduce un nombre de usuario.');
        return;
      }

      // Determine platforms to scan based on active category
      const platformsToScan = activeCategory === 'all'
        ? PLATFORMS
        : PLATFORMS.filter(p => p.category === activeCategory);

      window.showLoader(`Escaneando ${platformsToScan.length} plataformas para: "${username}"...`);
      usernameResultsContainer.style.display = 'none';
      currentUsernameResults = [];
      usernameTableBody.innerHTML = '';

      let foundCount = 0;
      let errorsCount = 0;

      statScanned.textContent = '0';
      statFound.textContent = '0';
      statErrors.textContent = '0';
      usernameResultsContainer.style.display = 'block';

      const batchSize = 4;
      for (let i = 0; i < platformsToScan.length; i += batchSize) {
        const batch = platformsToScan.slice(i, i + batchSize);
        const promises = batch.map(async (platform) => {
          const checkUrl = platform.checkUrl.replace('{username}', username);
          const profileUrl = platform.url.replace('{username}', username);

          let exists = false;
          let requiresManual = false;
          let finalStatus = 'No Encontrado';

          try {
            let useFallback = false;
            let data = null;

            try {
              const res = await fetch(`proxy.php?action=check&url=${encodeURIComponent(checkUrl)}`);
              if (res.ok) {
                data = await res.json();
              } else {
                console.error(`[Aegis Proxy] proxy.php retornó un status incorrecto: ${res.status} para ${platform.name}`);
                useFallback = true;
              }
            } catch (e) {
              console.error(`[Aegis Proxy] Error de red llamando a proxy.php para ${platform.name}:`, e);
              useFallback = true;
            }

            if (useFallback) {
              // Fallback a corsproxy.io si estamos en local sin PHP
              const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(checkUrl)}`;
              const res = await fetch(proxyUrl);
              if (res.status === 200) {
                exists = true;
                const text = await res.text();
                const html = text.toLowerCase();
                if (html.includes('sorry, this page isn') || 
                    html.includes('page not found') || 
                    html.includes('user not found') || 
                    html.includes('this account doesn') || 
                    html.includes("we can't find that user") || 
                    html.includes('404') || 
                    html.includes('no existe') ||
                    (platform.name === 'SoundCloud' && html.includes("we can't find that user"))) {
                  exists = false;
                }
              } else if (res.status === 403 || res.status === 429 || res.status === 302) {
                requiresManual = true;
              }
            } else if (data) {
              if (data.status === 200 && !data.textNotFound) {
                exists = true;
              } else if (data.status === 404 || data.textNotFound) {
                exists = false;
              } else {
                requiresManual = true;
              }
            }

            if (exists) {
              finalStatus = 'Encontrado';
              foundCount++;
            } else if (requiresManual) {
              finalStatus = 'Revisión Manual';
              errorsCount++;
            }
          } catch (err) {
            console.error("Error escaneando plataforma:", platform.name, err);
            finalStatus = 'Revisión Manual';
            errorsCount++;
          }

          const result = {
            platform: platform.name,
            category: platform.category,
            url: profileUrl,
            status: finalStatus,
            statusCode: exists ? '200' : (requiresManual ? 'BLOCK' : '404')
          };

          currentUsernameResults.push(result);
          appendUsernameRow(result);

          statScanned.textContent = currentUsernameResults.length;
          statFound.textContent = foundCount;
          statErrors.textContent = errorsCount;
        });

        await Promise.all(promises);
      }

      // Save to history
      if (window.osintSaveHistory) window.osintSaveHistory('username', username);

      window.hideLoader();
    });
  }

  function appendUsernameRow(row) {
    let badgeClass = 'badge-error';
    if (row.status === 'Encontrado') badgeClass = 'badge-success';
    if (row.status === 'Revisión Manual') badgeClass = 'badge-warning';
    if (row.status.includes('Error')) badgeClass = 'badge-warning';

    const tr = document.createElement('tr');
    tr.dataset.category = row.category || 'all';
    tr.innerHTML = `
      <td><strong>${row.platform}</strong></td>
      <td><a href="${row.url}" target="_blank" class="profile-link"><i class="fa-solid fa-up-right-from-square"></i> ${row.url}</a></td>
      <td><span class="badge ${badgeClass}">${row.status}</span></td>
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
      downloadAnchor.setAttribute('download', `osint_links_username_${usernameInput.value.trim()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });
  }
});
