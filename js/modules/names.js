document.addEventListener('DOMContentLoaded', () => {
  // --- 5. NAME SEARCH LOGIC ---
  const btnScanName = document.getElementById('btn-scan-name');
  const nameInput = document.getElementById('name-input');
  const lastnameInput = document.getElementById('lastname-input');
  const nameResultsContainer = document.getElementById('name-results-container');
  const nameLinksGrid = document.getElementById('name-links-grid');

  if (btnScanName) {
    btnScanName.addEventListener('click', () => {
      const firstName = nameInput.value.trim();
      const lastName = lastnameInput.value.trim();

      if (!firstName && !lastName) {
        alert('Por favor, introduce al menos un nombre o apellido.');
        return;
      }

      const fullName = `${firstName} ${lastName}`.trim();
      const encodedName = encodeURIComponent(fullName);

      nameLinksGrid.innerHTML = `
        <a href="https://webmii.com/people?n=${encodedName}" target="_blank" class="osint-link-btn">
          <i class="fa-solid fa-users"></i>
          <span>Webmii Search</span>
          <small>Buscar visibilidad web y redes sociales</small>
        </a>
        <a href="https://www.google.com/search?q=%22${encodedName}%22" target="_blank" class="osint-link-btn">
          <i class="fa-brands fa-google"></i>
          <span>Búsqueda Exacta Google</span>
          <small>Dorking exacto para "${fullName}"</small>
        </a>
        <a href="https://www.linkedin.com/pub/dir?first=${encodeURIComponent(firstName)}&last=${encodeURIComponent(lastName)}" target="_blank" class="osint-link-btn">
          <i class="fa-brands fa-linkedin"></i>
          <span>Directorio LinkedIn</span>
          <small>Buscar perfiles profesionales</small>
        </a>
      `;

      nameResultsContainer.style.display = 'block';
    });
  }
});
