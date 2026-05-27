document.addEventListener('DOMContentLoaded', () => {
  // --- 4. PHONE OSINT LOGIC ---
  const btnScanPhone = document.getElementById('btn-scan-phone');
  const phoneInput = document.getElementById('phone-input');
  const phoneResultsContainer = document.getElementById('phone-results-container');
  const phoneInfoList = document.getElementById('phone-info-list');
  const phoneLinksGrid = document.getElementById('phone-links-grid');
  const phoneSuggestionsList = document.getElementById('phone-suggestions-list');

  if (btnScanPhone) {
    btnScanPhone.addEventListener('click', () => {
      const phone = phoneInput.value.trim();
      if (!phone) {
        alert('Por favor introduce un número de teléfono (ej: +34 600000000).');
        return;
      }

      const cleanPhone = phone.replace(/[^0-9+]/g, '');
      const dialingCodes = {
        '+1': 'USA/Canada',
        '+34': 'España',
        '+52': 'México',
        '+54': 'Argentina',
        '+55': 'Brasil',
        '+57': 'Colombia',
        '+56': 'Chile',
        '+51': 'Perú',
        '+44': 'Reino Unido',
        '+33': 'Francia',
        '+49': 'Alemania',
        '+39': 'Italia',
        '+7': 'Rusia',
        '+86': 'China',
        '+91': 'India'
      };

      let detectedCountry = 'Internacional / Desconocido';
      for (const code of Object.keys(dialingCodes)) {
        if (cleanPhone.startsWith(code)) {
          detectedCountry = dialingCodes[code];
          break;
        }
      }

      phoneInfoList.innerHTML = `
        <div class="info-item"><span class="info-label">Número Introducido</span><span class="info-value">${phone}</span></div>
        <div class="info-item"><span class="info-label">Formato de Marcación</span><span class="info-value">${cleanPhone}</span></div>
        <div class="info-item"><span class="info-label">País Identificado</span><span class="info-value">${detectedCountry}</span></div>
      `;

      phoneLinksGrid.innerHTML = `
        <a href="https://www.truecaller.com/search/${encodeURIComponent(cleanPhone.replace('+', ''))}" target="_blank" class="osint-link-btn">
          <i class="fa-solid fa-address-card"></i>
          <span>Truecaller</span>
          <small>Buscar nombre de propietario</small>
        </a>
        <a href="https://sync.me/search/?number=${encodeURIComponent(cleanPhone)}" target="_blank" class="osint-link-btn">
          <i class="fa-solid fa-sync"></i>
          <span>Sync.me Search</span>
          <small>Buscar fotos y perfiles asociados</small>
        </a>
        <a href="https://www.numlookup.com/phone-lookup/${encodeURIComponent(cleanPhone)}" target="_blank" class="osint-link-btn">
          <i class="fa-solid fa-phone-slash"></i>
          <span>NumLookup</span>
          <small>Identificación de operador gratis</small>
        </a>
        <a href="https://www.spokeo.com/search?q=${encodeURIComponent(cleanPhone)}" target="_blank" class="osint-link-btn">
          <i class="fa-solid fa-users-viewfinder"></i>
          <span>Spokeo (EEUU)</span>
          <small>Buscar personas vinculadas</small>
        </a>
      `;

      phoneSuggestionsList.innerHTML = `
        <li>Agrega el número de teléfono temporalmente a tus contactos para buscar perfiles públicos en WhatsApp, Telegram o Signal.</li>
        <li>Busca el número con su formato exacto entre comillas en Google: ("${cleanPhone}") y con espacios.</li>
        <li>Verifica el operador telefónico nacional a través de registros CNMC de tu región o país específico.</li>
      `;

      phoneResultsContainer.style.display = 'block';
      if (window.osintSaveHistory) window.osintSaveHistory('phone', phone);
    });
  }
});
