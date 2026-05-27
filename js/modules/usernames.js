document.addEventListener('DOMContentLoaded', () => {
  // --- 1. USERNAME SCANNER CON APIs PÚBLICAS SIN REQUERIMIENTOS ---
  const btnScanUsername = document.getElementById('btn-scan-username');
  const usernameInput = document.getElementById('username-input');
  const usernameResultsContainer = document.getElementById('username-results-container');
  const usernameTableBody = document.getElementById('username-table-body');
  const usernameFilter = document.getElementById('username-filter');
  const btnExportUsername = document.getElementById('btn-export-username');

  const statScanned = document.getElementById('stat-scanned');
  const statFound = document.getElementById('stat-found');
  const statErrors = document.getElementById('stat-errors');

  // ── APIs PÚBLICAS SIN REQUERIMIENTOS ──────────────────────────────────
  const PUBLIC_APIS = {
    // GitHub - API pública oficial
    'GitHub': {
      endpoint: 'https://api.github.com/search/users?q={username}+in:login&per_page=1',
      method: 'GET',
      parse: (response) => {
        if (response.total_count > 0 && response.items.length > 0) {
          return { exists: true, username: response.items[0].login };
        }
        return { exists: false };
      }
    },

    // Reddit - API JSON pública
    'Reddit': {
      endpoint: 'https://www.reddit.com/user/{username}/about.json',
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      parse: (response) => {
        if (response.data && response.data.name) {
          return { exists: true, username: response.data.name };
        }
        return { exists: false };
      }
    },

    // Dev.to - API pública
    'Dev.to': {
      endpoint: 'https://dev.to/api/users/by_username?username={username}',
      method: 'GET',
      parse: (response) => {
        if (response.id && response.username) {
          return { exists: true, username: response.username };
        }
        return { exists: false };
      }
    },

    // HackerNews - Firebase API pública
    'HackerNews': {
      endpoint: 'https://hacker-news.firebaseio.com/v0/user/{username}.json',
      method: 'GET',
      parse: (response) => {
        if (response && response.id) {
          return { exists: true, username: response.id };
        }
        return { exists: false };
      }
    },

    // Twitch - API pública (kraken)
    'Twitch': {
      endpoint: 'https://api.twitch.tv/kraken/users/{username}',
      method: 'GET',
      parse: (response) => {
        if (response._id && response.name) {
          return { exists: true, username: response.name };
        }
        return { exists: false };
      }
    },

    // Chess.com - API pública
    'Chess.com': {
      endpoint: 'https://api.chess.com/pub/player/{username}',
      method: 'GET',
      parse: (response) => {
        if (response.username) {
          return { exists: true, username: response.username };
        }
        return { exists: false };
      }
    },

    // Docker Hub - API pública
    'DockerHub': {
      endpoint: 'https://hub.docker.com/v2/users/{username}/',
      method: 'GET',
      parse: (response) => {
        if (response.id && response.username) {
          return { exists: true, username: response.username };
        }
        return { exists: false };
      }
    },

    // Keybase - API pública
    'Keybase': {
      endpoint: 'https://keybase.io/api/1.0/user/lookup?usernames={username}',
      method: 'GET',
      parse: (response) => {
        if (response.them && response.them.length > 0) {
          return { exists: true, username: response.them[0].basics.username };
        }
        return { exists: false };
      }
    },

    // SoundCloud - API embed pública
    'SoundCloud': {
      endpoint: 'https://soundcloud.com/oembed?url=https://soundcloud.com/{username}&format=json',
      method: 'GET',
      parse: (response) => {
        if (response.author_name && response.author_url) {
          return { exists: true, username: response.author_name };
        }
        return { exists: false };
      }
    },

    // Behance - API pública (key incluida)
    'Behance': {
      endpoint: 'https://www.behance.net/api/v2/users/{username}?api_key=6n34r2Z6B7vEHn2nNpXDMVPcMrNBa3v7',
      method: 'GET',
      parse: (response) => {
        if (response.user && response.user.id) {
          return { exists: true, username: response.user.username };
        }
        return { exists: false };
      }
    },

    // Spotify - Búsqueda pública (scraping JSON)
    'Spotify': {
      endpoint: 'https://open.spotify.com/search?q={username}&type=user',
      method: 'GET',
      parse: (response) => {
        return null; // Fallback a HTTP
      }
    },

    // Instagram - Búsqueda pública API
    'Instagram': {
      endpoint: 'https://www.instagram.com/web/search/topsearch/?query={username}',
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      parse: (response) => {
        if (response.users && response.users.length > 0) {
          // Buscar coincidencia exacta
          const user = response.users.find(u => u.user.username === '{username}'.toLowerCase());
          if (user) {
            return { exists: true, username: user.user.username };
          }
        }
        return { exists: false };
      }
    },

    // TikTok - API pública
    'TikTok': {
      endpoint: 'https://www.tiktok.com/api/user/detail/?uniqueId={username}',
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      parse: (response) => {
        if (response.userDetail && response.userDetail.user) {
          return { exists: true, username: response.userDetail.user.uniqueId };
        }
        return { exists: false };
      }
    },

    // Facebook - Búsqueda pública
    'Facebook': {
      endpoint: 'https://www.facebook.com/public/{username}',
      method: 'GET',
      parse: (response) => {
        return null; // Fallback a HTTP
      }
    },

    // Twitter/X - Búsqueda pública
    'Twitter/X': {
      endpoint: 'https://twitter.com/{username}',
      method: 'GET',
      parse: (response) => {
        return null; // Fallback a HTTP
      }
    },

    // YouTube - Búsqueda de canal
    'YouTube': {
      endpoint: 'https://www.youtube.com/@{username}',
      method: 'GET',
      parse: (response) => {
        return null; // Fallback a HTTP
      }
    },

    // Pinterest - Búsqueda pública
    'Pinterest': {
      endpoint: 'https://www.pinterest.com/{username}/',
      method: 'GET',
      parse: (response) => {
        return null; // Fallback a HTTP
      }
    },

    // Threads - Búsqueda pública
    'Threads': {
      endpoint: 'https://www.threads.net/@{username}',
      method: 'GET',
      parse: (response) => {
        return null; // Fallback a HTTP
      }
    },

    // Medium - Búsqueda pública
    'Medium': {
      endpoint: 'https://medium.com/@{username}',
      method: 'GET',
      parse: (response) => {
        return null; // Fallback a HTTP
      }
    },

    // Dribbble - Búsqueda pública
    'Dribbble': {
      endpoint: 'https://dribbble.com/{username}',
      method: 'GET',
      parse: (response) => {
        return null; // Fallback a HTTP
      }
    },

    // Letterboxd - Búsqueda pública
    'Letterboxd': {
      endpoint: 'https://letterboxd.com/{username}/',
      method: 'GET',
      parse: (response) => {
        return null; // Fallback a HTTP
      }
    },

    // Steam - Búsqueda pública XML
    'Steam': {
      endpoint: 'https://steamcommunity.com/id/{username}/?xml=1',
      method: 'GET',
      parse: (response) => {
        if (response && response.profile) {
          return { exists: true, username: response.profile.customURL };
        }
        return { exists: false };
      }
    },

    // Linktree - Búsqueda pública
    'Linktree': {
      endpoint: 'https://linktr.ee/{username}',
      method: 'GET',
      parse: (response) => {
        return null; // Fallback a HTTP
      }
    }
  };

  // ── DETECTORES AVANZADOS PARA HTTP FALLBACK ──────────────────────────
  const PATTERN_DETECTORS = {
    'Instagram': (html, username) => {
      return !html.includes('User not found') &&
        (html.includes(username) || html.includes('profile_page') || html.length > 5000);
    },
    'TikTok': (html, username) => {
      return !html.includes("Couldn't find this account") &&
        !html.includes("doesn't exist") &&
        (html.includes(username) || html.includes('uniqueId') || html.length > 5000);
    },
    'Threads': (html, username) => {
      return !html.includes("Isn't available") &&
        (html.includes(username) || html.includes('profile') || html.length > 5000);
    },
    'Facebook': (html, username) => {
      return !html.includes('Sorry') &&
        !html.includes('not found') &&
        (html.includes(username) || html.length > 5000);
    },
    'Twitter/X': (html, username) => {
      return !html.includes('account does not exist') &&
        (html.includes(username) || html.includes('timeline') || html.length > 10000);
    },
    'YouTube': (html, username) => {
      return !html.includes('Not found') &&
        (html.includes('yt-simple-endpoint') || html.includes('subscriber') || html.length > 10000);
    },
    'Pinterest': (html, username) => {
      return !html.includes('not found') &&
        (html.includes('pwa-app') || html.includes(username) || html.length > 5000);
    },
    'Medium': (html, username) => {
      return !html.includes('story not found') &&
        (html.includes('author') || html.includes(username) || html.length > 5000);
    },
    'Dribbble': (html, username) => {
      return !html.includes('Shot not found') &&
        (html.includes('dribbble') || html.includes(username) || html.length > 5000);
    },
    'Letterboxd': (html, username) => {
      return !html.includes('not found') &&
        (html.includes('letterboxd') || html.includes(username) || html.length > 3000);
    },
    'Spotify': (html, username) => {
      return !html.includes('not found') &&
        (html.includes('spotify') || html.includes(username) || html.length > 5000);
    },
    'Linktree': (html, username) => {
      return !html.includes('404') &&
        (html.includes('linktree') || html.includes(username) || html.length > 3000);
    },
    'default': (html, username) => {
      return html.length > 1000 &&
        !html.toLowerCase().includes('not found') &&
        !html.toLowerCase().includes('404');
    }
  };

  // ── Plataformas con categorías ──────────────────────────────────────────
  const PLATFORMS = [
    // Social
    { name: 'Instagram', url: 'https://www.instagram.com/{username}', checkUrl: 'https://www.instagram.com/web/search/topsearch/?query={username}', type: 'api', category: 'social', icon: '📷' },
    { name: 'Threads', url: 'https://www.threads.net/@{username}', checkUrl: 'https://www.threads.net/@{username}', type: 'http', category: 'social', icon: '💬' },
    { name: 'Twitter/X', url: 'https://x.com/{username}', checkUrl: 'https://x.com/{username}', type: 'http', category: 'social', icon: '𝕏' },
    { name: 'TikTok', url: 'https://www.tiktok.com/@{username}', checkUrl: 'https://www.tiktok.com/api/user/detail/?uniqueId={username}', type: 'api', category: 'social', icon: '🎵' },
    { name: 'Facebook', url: 'https://www.facebook.com/{username}', checkUrl: 'https://www.facebook.com/public/{username}', type: 'http', category: 'social', icon: '👥' },
    { name: 'Pinterest', url: 'https://www.pinterest.com/{username}', checkUrl: 'https://www.pinterest.com/{username}/', type: 'http', category: 'social', icon: '📌' },
    { name: 'YouTube', url: 'https://www.youtube.com/@{username}', checkUrl: 'https://www.youtube.com/@{username}', type: 'http', category: 'social', icon: '📺' },
    { name: 'Linktree', url: 'https://linktr.ee/{username}', checkUrl: 'https://linktr.ee/{username}', type: 'http', category: 'social', icon: '🔗' },
    // Dev / Gaming
    { name: 'GitHub', url: 'https://github.com/{username}', checkUrl: 'https://api.github.com/search/users?q={username}+in:login&per_page=1', type: 'api', category: 'dev', icon: '🐙' },
    { name: 'Reddit', url: 'https://www.reddit.com/user/{username}', checkUrl: 'https://www.reddit.com/user/{username}/about.json', type: 'api', category: 'dev', icon: '🤖' },
    { name: 'Twitch', url: 'https://www.twitch.tv/{username}', checkUrl: 'https://api.twitch.tv/kraken/users/{username}', type: 'api', category: 'dev', icon: '📡' },
    { name: 'Steam', url: 'https://steamcommunity.com/id/{username}', checkUrl: 'https://steamcommunity.com/id/{username}/?xml=1', type: 'http', category: 'dev', icon: '🎮' },
    { name: 'Chess.com', url: 'https://www.chess.com/member/{username}', checkUrl: 'https://api.chess.com/pub/player/{username}', type: 'api', category: 'dev', icon: '♟️' },
    { name: 'HackerNews', url: 'https://news.ycombinator.com/user?id={username}', checkUrl: 'https://hacker-news.firebaseio.com/v0/user/{username}.json', type: 'api', category: 'dev', icon: '📰' },
    { name: 'Dev.to', url: 'https://dev.to/{username}', checkUrl: 'https://dev.to/api/users/by_username?username={username}', type: 'api', category: 'dev', icon: '💻' },
    { name: 'DockerHub', url: 'https://hub.docker.com/u/{username}', checkUrl: 'https://hub.docker.com/v2/users/{username}/', type: 'api', category: 'dev', icon: '🐳' },
    { name: 'Keybase', url: 'https://keybase.io/{username}', checkUrl: 'https://keybase.io/api/1.0/user/lookup?usernames={username}', type: 'api', category: 'dev', icon: '🔐' },
    // Música / Arte
    { name: 'Spotify', url: 'https://open.spotify.com/user/{username}', checkUrl: 'https://open.spotify.com/search?q={username}&type=user', type: 'http', category: 'music', icon: '🎵' },
    { name: 'SoundCloud', url: 'https://soundcloud.com/{username}', checkUrl: 'https://soundcloud.com/oembed?url=https://soundcloud.com/{username}&format=json', type: 'api', category: 'music', icon: '🎼' },
    { name: 'Behance', url: 'https://www.behance.net/{username}', checkUrl: 'https://www.behance.net/api/v2/users/{username}?api_key=6n34r2Z6B7vEHn2nNpXDMVPcMrNBa3v7', type: 'api', category: 'music', icon: '🎨' },
    { name: 'Dribbble', url: 'https://dribbble.com/{username}', checkUrl: 'https://dribbble.com/{username}', type: 'http', category: 'music', icon: '🎯' },
    { name: 'Letterboxd', url: 'https://letterboxd.com/{username}', checkUrl: 'https://letterboxd.com/{username}', type: 'http', category: 'music', icon: '🎬' },
    // Profesional
    { name: 'Medium', url: 'https://medium.com/@{username}', checkUrl: 'https://medium.com/@{username}', type: 'http', category: 'pro', icon: '✍️' },
  ];

  // ── Estado ──────────────────────────────────────────────────────────────
  let currentUsernameResults = [];
  let activeCategory = 'all';

  // ── Chips de categoría ──────────────────────────────────────────────────
  const categoryChipsContainer = document.getElementById('username-category-chips');
  if (categoryChipsContainer) {
    const categories = [
      { key: 'all', label: '&#127758; Todas', count: PLATFORMS.length },
      { key: 'social', label: '&#128248; Social', count: PLATFORMS.filter(p => p.category === 'social').length },
      { key: 'dev', label: '&#128187; Dev / Gaming', count: PLATFORMS.filter(p => p.category === 'dev').length },
      { key: 'music', label: '&#127925; Arte / Música', count: PLATFORMS.filter(p => p.category === 'music').length },
      { key: 'pro', label: '&#128188; Profesional', count: PLATFORMS.filter(p => p.category === 'pro').length },
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

  // ── FUNCIÓN AVANZADA DE VERIFICACIÓN ────────────────────────────────────
  async function verifyUsername(platform, username) {
    const checkUrl = platform.checkUrl.replace('{username}', username);
    const profileUrl = platform.url.replace('{username}', username);

    try {
      const apiConfig = PUBLIC_APIS[platform.name];

      if (apiConfig) {
        try {
          const headers = apiConfig.headers || {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          };

          const response = await fetch(checkUrl, {
            method: apiConfig.method || 'GET',
            headers: headers,
            timeout: 6000
          });

          if (response.ok) {
            const data = await response.json();
            const result = apiConfig.parse(data);

            if (result !== null) {
              return {
                exists: result.exists,
                confidence: result.exists ? 95 : 85,
                method: 'API',
                status: result.exists ? '✅ Encontrado' : '❌ No Encontrado'
              };
            }
          } else if (response.status === 404) {
            return {
              exists: false,
              confidence: 90,
              method: 'API',
              status: '❌ No Encontrado'
            };
          }
        } catch (apiErr) {
          console.warn(`[API] Error en ${platform.name}:`, apiErr.message);
        }
      }

      // FALLBACK: HTTP directo
      const httpHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      };

      const httpRes = await fetch(checkUrl, {
        headers: httpHeaders,
        redirect: 'follow',
        timeout: 8000
      });

      if (httpRes.status === 200) {
        const html = await httpRes.text();

        if (html.length < 500) {
          return {
            exists: false,
            confidence: 40,
            method: 'HTTP',
            status: '❌ No Encontrado'
          };
        }

        const detector = PATTERN_DETECTORS[platform.name] || PATTERN_DETECTORS['default'];
        const exists = detector(html.toLowerCase(), username.toLowerCase());

        return {
          exists: exists,
          confidence: exists ? 70 : 75,
          method: 'HTTP',
          status: exists ? '✅ Encontrado' : '❌ No Encontrado'
        };
      } else if (httpRes.status === 404) {
        return {
          exists: false,
          confidence: 90,
          method: 'HTTP',
          status: '❌ No Encontrado'
        };
      } else if (httpRes.status === 403 || httpRes.status === 429) {
        return {
          exists: null,
          confidence: 0,
          method: 'HTTP',
          status: '⚠️ Bloqueado'
        };
      }

      return {
        exists: null,
        confidence: 10,
        method: 'HTTP',
        status: `⚠️ HTTP ${httpRes.status}`
      };

    } catch (err) {
      console.error(`Error verificando ${platform.name}:`, err);
      return {
        exists: null,
        confidence: 0,
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

      window.showLoader(`Escaneando ${platformsToScan.length} plataformas para: "${username}"...`);
      usernameResultsContainer.style.display = 'none';
      currentUsernameResults = [];
      usernameTableBody.innerHTML = '';

      let foundCount = 0;
      let errorCount = 0;

      statScanned.textContent = '0';
      statFound.textContent = '0';
      statErrors.textContent = '0';
      usernameResultsContainer.style.display = 'block';

      const batchSize = 3;
      for (let i = 0; i < platformsToScan.length; i += batchSize) {
        const batch = platformsToScan.slice(i, i + batchSize);
        const promises = batch.map(async (platform) => {
          const result = await verifyUsername(platform, username);
          const profileUrl = platform.url.replace('{username}', username);

          if (result.exists === true) {
            foundCount++;
          } else if (result.exists === null) {
            errorCount++;
          }

          const resultObj = {
            platform: platform.name,
            category: platform.category,
            url: profileUrl,
            status: result.status,
            method: result.method,
            icon: platform.icon
          };

          currentUsernameResults.push(resultObj);
          appendUsernameRow(resultObj);

          statScanned.textContent = currentUsernameResults.length;
          statFound.textContent = foundCount;
          statErrors.textContent = errorCount;
        });

        await Promise.all(promises);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      if (window.osintSaveHistory) window.osintSaveHistory('username', username);
      window.hideLoader();
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