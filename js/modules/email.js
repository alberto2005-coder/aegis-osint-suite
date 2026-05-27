document.addEventListener('DOMContentLoaded', () => {
  // --- 2. EMAIL OSINT LOGIC ---
  const btnScanEmail = document.getElementById('btn-scan-email');
  const emailInput = document.getElementById('email-input');
  const emailResultsContainer = document.getElementById('email-results-container');
  const emailInfoList = document.getElementById('email-info-list');
  const emailLinksGrid = document.getElementById('email-links-grid');
  const emailSuggestionsList = document.getElementById('email-suggestions-list');

  if (btnScanEmail) {
    btnScanEmail.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      if (!email) {
        window.showToast('Por favor introduce un correo válido.', 'warning');
        return;
      }

      const parts = email.split('@');
      if (parts.length !== 2) {
        window.showToast('Formato de correo inválido.', 'error');
        return;
      }

      const localPart = parts[0];
      const domain = parts[1];
      window.showLoader(`Analizando existencia y entregabilidad para "${email}"...`);

      let mxRecords = [];
      let isDeliverable = 'Verificando...';
      let isDeliverableBadge = 'badge-warning';

      try {
        const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=MX`, {
          headers: { 'accept': 'application/dns-json' }
        });
        const data = await response.json();
        if (data.Answer) {
          mxRecords = data.Answer.map(ans => ({
            exchange: ans.data,
            priority: ans.data.split(' ')[0]
          }));
        }
      } catch (error) {
        console.error(error);
      }

      try {
        const evaUrl = `https://api.eva.pingutil.com/email?email=${encodeURIComponent(email)}`;
        const useTor = window.isTorActive?.() ? 'true' : 'false';
        const proxyUrl = `proxy.php?action=bypass&useTor=${useTor}&url=${encodeURIComponent(evaUrl)}`;
        const response = await fetch(proxyUrl);
        const resData = await response.json();

        if (resData.status === 'success' && resData.data) {
          if (resData.data.deliverable) {
            isDeliverable = 'Existe (Entregable)';
            isDeliverableBadge = 'badge-success';
          } else {
            isDeliverable = 'No Existe / Inactivo';
            isDeliverableBadge = 'badge-error';
          }
        } else {
          isDeliverable = mxRecords.length > 0 ? 'Probable (Tiene MX)' : 'Improbable';
          isDeliverableBadge = mxRecords.length > 0 ? 'badge-success' : 'badge-error';
        }
      } catch (error) {
        console.error(error);
        isDeliverable = mxRecords.length > 0 ? 'Probable (Tiene MX)' : 'Improbable';
        isDeliverableBadge = mxRecords.length > 0 ? 'badge-success' : 'badge-error';
      }

      // ── SPF / DMARC / DKIM via Cloudflare DNS ──────────────────────────
      let spfRecord = null, dmarcRecord = null, dkimRecord = null;
      try {
        const [spfRes, dmarcRes, dkimRes] = await Promise.allSettled([
          fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=TXT`, { headers: { accept: 'application/dns-json' } }).then(r => r.json()),
          fetch(`https://cloudflare-dns.com/dns-query?name=_dmarc.${domain}&type=TXT`, { headers: { accept: 'application/dns-json' } }).then(r => r.json()),
          fetch(`https://cloudflare-dns.com/dns-query?name=default._domainkey.${domain}&type=TXT`, { headers: { accept: 'application/dns-json' } }).then(r => r.json()),
        ]);
        const extractTXT = (res) => (res?.value?.Answer || []).map(a => a.data).join(' ');
        const spfFull = extractTXT(spfRes);
        if (spfFull.includes('v=spf1')) spfRecord = spfFull.match(/v=spf1[^"\s]*/)?.[0] || 'Detectado';
        const dmarcFull = extractTXT(dmarcRes);
        if (dmarcFull.includes('v=DMARC1')) dmarcRecord = dmarcFull.match(/v=DMARC1[^"\s]*/)?.[0] || 'Detectado';
        const dkimFull = extractTXT(dkimRes);
        if (dkimFull.includes('v=DKIM1') || dkimFull.includes('p=')) dkimRecord = 'Clave pública publicada';
      } catch(e) { console.error('DNS check error', e); }

      const authBadge = (val, presentLabel='OK', missingLabel='No configurado') =>
        val ? `<span class="badge badge-success">&#10003; ${presentLabel}</span>`
            : `<span class="badge badge-error">&#10007; ${missingLabel}</span>`;

      // Populate Info List
      emailInfoList.innerHTML = `
        <div class="info-item">
          <span class="info-label">Email Analizado</span>
          <span class="info-value">${email}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Dominio</span>
          <span class="info-value">${domain}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Existencia de Cuenta</span>
          <span class="info-value"><span class="badge ${isDeliverableBadge}">${isDeliverable}</span></span>
        </div>
        <div class="info-item">
          <span class="info-label">Registros MX Encontrados</span>
          <span class="info-value">${mxRecords.length > 0 ? `<span class="badge badge-success">Sí (${mxRecords.length})</span>` : '<span class="badge badge-warning">Ninguno / Verificar</span>'}</span>
        </div>
        <div class="info-item" title="${spfRecord || 'No encontrado'}">
          <span class="info-label">SPF <small style="color:var(--text-muted);">(Anti-spoofing)</small></span>
          <span class="info-value">${authBadge(spfRecord, spfRecord ? spfRecord.substring(0,35)+'...' : 'Activo')}</span>
        </div>
        <div class="info-item" title="${dmarcRecord || 'No encontrado'}">
          <span class="info-label">DMARC <small style="color:var(--text-muted);">(Política)</small></span>
          <span class="info-value">${authBadge(dmarcRecord, dmarcRecord ? dmarcRecord.substring(0,35)+'...' : 'Activo')}</span>
        </div>
        <div class="info-item">
          <span class="info-label">DKIM <small style="color:var(--text-muted);">(Firma)</small></span>
          <span class="info-value">${authBadge(dkimRecord, 'Clave pública detectada', 'No detectado en default')}</span>
        </div>
      `;

      if (mxRecords.length > 0) {
        emailInfoList.innerHTML += `
          <div class="info-item" style="flex-direction: column; align-items: flex-start; gap: 0.5rem;">
            <span class="info-label">Servidores MX de Correo:</span>
            <div style="width: 100%;">
              ${mxRecords.map(mx => `<div style="font-family: monospace; font-size: 0.85rem; padding: 0.25rem 0; border-bottom: 1px dashed rgba(255,255,255,0.05);">${mx.exchange}</div>`).join('')}
            </div>
          </div>
        `;
      }

      // ── Cross-link a Sherlock ────────────────────────────────────────────
      emailInfoList.innerHTML += `
        <div class="info-item" style="border-bottom:none; padding-top:0.5rem; flex-wrap:wrap; gap:0.5rem;">
          <span class="info-label" style="color:var(--accent-color);"><i class="fa-solid fa-at"></i> Investigar username</span>
          <button class="btn btn-secondary btn-sm" id="btn-email-to-sherlock"
            style="border-color:var(--accent-color);color:var(--accent-color);"
            title="Buscar '${localPart}' en Sherlock (Buscador de Usuarios)">
            <i class="fa-solid fa-user-magnifying-glass"></i> Buscar '${localPart}' en Sherlock
          </button>
        </div>
      `;

      document.getElementById('btn-email-to-sherlock')?.addEventListener('click', () => {
        const usernameNav = document.querySelector('[data-tab="username-tab"]');
        const uInput = document.getElementById('username-input');
        if (usernameNav && uInput) {
          usernameNav.click();
          uInput.value = localPart;
          uInput.focus();
          if (window.osintSaveHistory) window.osintSaveHistory('username', localPart);
        }
      });

      emailLinksGrid.innerHTML = `
        <a href="https://epieos.com/?q=${encodeURIComponent(email)}" target="_blank" class="osint-link-btn" style="border: 1px solid var(--accent); background: rgba(0, 240, 255, 0.05);">
          <i class="fa-solid fa-address-book"></i>
          <span>Epieos OSINT</span>
          <small>Buscar cuentas vinculadas (Google, Skype, Duolingo...)</small>
        </a>
        <a href="https://haveibeenpwned.com/" target="_blank" class="osint-link-btn">
          <i class="fa-solid fa-fire"></i>
          <span>Have I Been Pwned</span>
          <small>Verificar brechas de seguridad y leaks</small>
        </a>
        <a href="https://www.dehashed.com/search?query=${encodeURIComponent(email)}" target="_blank" class="osint-link-btn">
          <i class="fa-solid fa-user-ninja"></i>
          <span>DeHashed Search</span>
          <small>Comprobar contraseñas filtradas</small>
        </a>
        <a href="https://intelx.io/?s=${encodeURIComponent(email)}" target="_blank" class="osint-link-btn">
          <i class="fa-solid fa-magnifying-glass-chart"></i>
          <span>Intelx.io</span>
          <small>Buscar en leaks y dumps públicos</small>
        </a>
        <a href="https://leakcheck.io/check?key=free&type=email&value=${encodeURIComponent(email)}" target="_blank" class="osint-link-btn">
          <i class="fa-solid fa-unlock-keyhole"></i>
          <span>LeakCheck</span>
          <small>Verificar bases de datos expuestas</small>
        </a>
        <a href="https://hunter.io/email-verifier/${encodeURIComponent(email)}" target="_blank" class="osint-link-btn">
          <i class="fa-solid fa-bullseye"></i>
          <span>Hunter.io Verification</span>
          <small>Verificar validez profesional</small>
        </a>
      `;

      emailSuggestionsList.innerHTML = `
        <li>Utiliza el botón de <strong>Epieos OSINT</strong> arriba para identificar perfiles vinculados (Google Calendar, fotos, nombres reales, cuentas de Skype/Microsoft, etc.).</li>
        <li>Prueba herramientas de consola en Linux como <strong>Holehe</strong> para comprobar el registro de este correo en más de 120 plataformas sociales de manera automatizada.</li>
        <li>Busca la dirección de correo en Google entre comillas ("${email}") para rastrear menciones en texto plano.</li>
        <li>Verifica en HaveIBeenPwned si el correo ha sido expuesto en brechas conocidas para rastrear el origen de contraseñas.</li>
        ${!spfRecord ? '<li><strong style="color:var(--warning-color);">&#9888; El dominio no tiene SPF configurado</strong> — cualquiera puede enviar correos que parezcan venir de este dominio (spoofing posible).</li>' : ''}
        ${!dmarcRecord ? '<li><strong style="color:var(--warning-color);">&#9888; Sin política DMARC activa</strong> — los correos fraudulentos pueden llegar a la bandeja de entrada del destinatario sin aviso.</li>' : ''}
      `;

      if (window.osintSaveHistory) window.osintSaveHistory('email', email);

      emailResultsContainer.style.display = 'block';
      window.hideLoader();
    });
  }
});
