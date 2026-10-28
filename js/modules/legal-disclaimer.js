document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('legal-disclaimer-modal');
  const btnAccept = document.getElementById('btn-accept-legal');
  const key = 'aegis_legal_accept_v1';

  if (localStorage.getItem(key) === 'true') {
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = '';
    return;
  }

  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  btnAccept?.addEventListener('click', () => {
    localStorage.setItem(key, 'true');
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = '';
    if (typeof window.showToast === 'function') {
      window.showToast('Descargo de responsabilidad aceptado. Usa esta herramienta de forma ética y legal.', 'success');
    }
  });
});
