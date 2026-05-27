document.addEventListener('DOMContentLoaded', () => {
  // --- 3. DOMAIN / IP OSINT LOGIC ---
  const btnScanDomain = document.getElementById('btn-scan-domain');
  const domainInput = document.getElementById('domain-input');
  const domainResultsContainer = document.getElementById('domain-results-container');
  const geoipCard = document.getElementById('geoip-card');
  const geoipInfoList = document.getElementById('geoip-info-list');
  const dnsCard = document.getElementById('dns-card');
  const dnsRecordsList = document.getElementById('dns-records-list');
  const domainLinksRow = document.getElementById('domain-links-row');

  let ipMapInstance = null;

  function updateIPMap(lat, lon, label) {
    if (ipMapInstance) {
      ipMapInstance.remove();
      ipMapInstance = null;
    }
    
    // Add brief timeout to allow container display state to calculate size correctly
    setTimeout(() => {
      try {
        ipMapInstance = L.map('ip-map').setView([lat, lon], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(ipMapInstance);

        L.marker([lat, lon]).addTo(ipMapInstance)
          .bindPopup(label)
          .openPopup();
      } catch (err) {
        console.error("Map render failed", err);
      }
    }, 100);
  }

  if (btnScanDomain) {
    btnScanDomain.addEventListener('click', async () => {
      const target = domainInput.value.trim();
      if (!target) {
        alert('Por favor introduce un dominio o dirección IP válida.');
        return;
      }

      window.showLoader(`Resolviendo registros DNS y geolocalizando target "${target}"...`);

      const isIp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(target) || target.includes(':');

      geoipCard.style.display = 'none';
      dnsCard.style.display = 'none';

      if (isIp) {
        try {
          const response = await fetch(`https://ipapi.co/${target}/json/`);
          const geoip = await response.json();
          if (geoip && !geoip.error) {
            geoipCard.style.display = 'block';
            geoipInfoList.innerHTML = `
              <div class="info-item"><span class="info-label">IP</span><span class="info-value">${geoip.ip}</span></div>
              <div class="info-item"><span class="info-label">País</span><span class="info-value">${geoip.country_name} (${geoip.country_code})</span></div>
              <div class="info-item"><span class="info-label">Región / Ciudad</span><span class="info-value">${geoip.region} / ${geoip.city}</span></div>
              <div class="info-item"><span class="info-label">Organización / ISP</span><span class="info-value">${geoip.org}</span></div>
              <div class="info-item"><span class="info-label">Coordenadas</span><span class="info-value">${geoip.latitude}, ${geoip.longitude}</span></div>
            `;
            if (geoip.latitude && geoip.longitude) {
              updateIPMap(geoip.latitude, geoip.longitude, `IP: ${geoip.ip}<br>${geoip.city}, ${geoip.country_name}`);
            }
          }
        } catch (err) {
          console.error(err);
        }
      } else {
        dnsCard.style.display = 'block';
        dnsRecordsList.innerHTML = '';
        const dnsTypes = ['A', 'AAAA', 'MX', 'TXT', 'NS'];

        let ipToGeolocate = null;

        for (const type of dnsTypes) {
          try {
            const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${target}&type=${type}`, {
              headers: { 'accept': 'application/dns-json' }
            });
            const dnsData = await res.json();
            if (dnsData.Answer && dnsData.Answer.length > 0) {
              const sec = document.createElement('div');
              sec.className = 'dns-type-section';
              sec.innerHTML = `
                <h4>Registro ${type}</h4>
                <div>
                  ${dnsData.Answer.map(ans => `<div class="dns-record-badge">${ans.data}</div>`).join('')}
                </div>
              `;
              dnsRecordsList.appendChild(sec);

              if (type === 'A' && !ipToGeolocate) {
                ipToGeolocate = dnsData.Answer[0].data;
              }
            }
          } catch (e) {
            console.error(e);
          }
        }

        if (dnsRecordsList.innerHTML === '') {
          dnsRecordsList.innerHTML = '<p class="card-desc">No se encontraron registros DNS públicos activos.</p>';
        }

        if (ipToGeolocate) {
          try {
            const response = await fetch(`https://ipapi.co/${ipToGeolocate}/json/`);
            const geoip = await response.json();
            if (geoip && !geoip.error) {
              geoipCard.style.display = 'block';
              geoipInfoList.innerHTML = `
                <div class="info-item"><span class="info-label">IP del Servidor</span><span class="info-value">${geoip.ip}</span></div>
                <div class="info-item"><span class="info-label">País del Hosting</span><span class="info-value">${geoip.country_name} (${geoip.country_code})</span></div>
                <div class="info-item"><span class="info-label">Región / Ciudad</span><span class="info-value">${geoip.region} / ${geoip.city}</span></div>
                <div class="info-item"><span class="info-label">Organización / ISP</span><span class="info-value">${geoip.org}</span></div>
                <div class="info-item"><span class="info-label">Coordenadas</span><span class="info-value">${geoip.latitude}, ${geoip.longitude}</span></div>
              `;
              if (geoip.latitude && geoip.longitude) {
                updateIPMap(geoip.latitude, geoip.longitude, `Hosting IP: ${geoip.ip}<br>${geoip.city}, ${geoip.country_name}`);
              }
            }
          } catch (err) {
            console.error(err);
          }
        }
      }

      domainLinksRow.innerHTML = `
        <a href="https://who.is/whois/${encodeURIComponent(target)}" target="_blank" class="btn btn-secondary">
          <i class="fa-solid fa-address-card"></i> Consultar WHOIS Completo
        </a>
        <a href="https://dnsdumpster.com/" target="_blank" class="btn btn-secondary">
          <i class="fa-solid fa-network-wired"></i> Mapear subdominios en DNSDumpster
        </a>
      `;

      domainResultsContainer.style.display = 'block';
      if (window.osintSaveHistory) window.osintSaveHistory('domain', target);
      window.hideLoader();
    });
  }
});
