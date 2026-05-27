document.addEventListener('DOMContentLoaded', () => {
  // --- 9. PDF METADATA ANALYZER LOGIC ---
  const pdfDropZone = document.getElementById('pdf-drop-zone');
  const pdfFileInput = document.getElementById('pdf-file-input');
  const pdfFileName = document.getElementById('pdf-file-name');
  const pdfResultsContainer = document.getElementById('pdf-results-container');
  const pdfInfoList = document.getElementById('pdf-info-list');

  if (pdfDropZone) {
    pdfDropZone.addEventListener('click', () => pdfFileInput.click());

    pdfDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      pdfDropZone.classList.add('dragover');
    });

    pdfDropZone.addEventListener('dragleave', () => pdfDropZone.classList.remove('dragover'));

    pdfDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      pdfDropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length) {
        pdfFileInput.files = e.dataTransfer.files;
        handlePdfFile();
      }
    });
  }

  if (pdfFileInput) {
    pdfFileInput.addEventListener('change', handlePdfFile);
  }

  function handlePdfFile() {
    const file = pdfFileInput.files[0];
    if (!file) return;

    pdfFileName.textContent = `Archivo: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    pdfFileName.style.display = 'block';

    window.showLoader("Escaneando metadatos del PDF...");

    const reader = new FileReader();
    reader.onload = function(e) {
      const text = e.target.result;

      // Helper function to decode UTF-16BE and basic escaping
      const parsePdfString = (val) => {
        if (!val) return null;
        
        // Check for UTF-16BE Byte Order Mark (FE FF in latin1/unicode)
        if (val.charCodeAt(0) === 0xFE && val.charCodeAt(1) === 0xFF) {
          let decoded = "";
          for (let i = 2; i < val.length; i += 2) {
            if (i + 1 < val.length) {
              const code = (val.charCodeAt(i) << 8) | val.charCodeAt(i + 1);
              decoded += String.fromCharCode(code);
            }
          }
          return decoded.trim();
        }
        
        // Remove parenthesis escapes
        return val.replace(/\\([()])/g, '$1').trim();
      };

      // Helper to decode Hexadecimal PDF values <FEFF00430056>
      const decodePdfHex = (hex) => {
        let bytes = "";
        for (let i = 0; i < hex.length; i += 2) {
          bytes += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
        }
        return parsePdfString(bytes);
      };

      // Search tags either inside () or <Hex>
      const getMeta = (tag) => {
        // Option A: Parenthesis /Title (My Title)
        const parenRegex = new RegExp(`/${tag}\\s*\\(([^)]*)\\)`, 'i');
        const parenMatch = text.match(parenRegex);
        if (parenMatch) return parsePdfString(parenMatch[1]);

        // Option B: Hex brackets /Title <FEFF0041>
        const hexRegex = new RegExp(`/${tag}\\s*<([0-9a-fA-F]+)>`, 'i');
        const hexMatch = text.match(hexRegex);
        if (hexMatch) return decodePdfHex(hexMatch[1]);

        return null;
      };

      const title = getMeta('Title') || 'No especificado';
      const author = getMeta('Author') || 'No especificado';
      const creator = getMeta('Creator') || 'No especificado';
      const producer = getMeta('Producer') || 'No especificado';

      const creationDateRaw = getMeta('CreationDate');
      const modDateRaw = getMeta('ModDate');

      const formatPdfDate = (rawDate) => {
        if (!rawDate) return 'No especificado';
        // Handle dates starting with D: e.g., D:20260503122620
        let cleanDate = rawDate.startsWith('D:') ? rawDate.substring(2) : rawDate;
        if (cleanDate.length >= 14) {
          const y = cleanDate.substring(0, 4);
          const m = cleanDate.substring(4, 6);
          const d = cleanDate.substring(6, 8);
          const h = cleanDate.substring(8, 10);
          const min = cleanDate.substring(10, 12);
          const s = cleanDate.substring(12, 14);
          return `${y}-${m}-${d} ${h}:${min}:${s}`;
        }
        return rawDate;
      };

      // Find Page Count
      const countMatch = text.match(/\/Count\s+(\d+)/);
      const pageCount = countMatch ? countMatch[1] : 'No especificado';

      pdfInfoList.innerHTML = `
        <div class="info-item"><span class="info-label">Título del Documento</span><span class="info-value" style="font-weight: 700; color: var(--text-primary);">${title}</span></div>
        <div class="info-item"><span class="info-label">Autor del Archivo</span><span class="info-value" style="color: var(--cyan-color); font-weight: 700;">${author}</span></div>
        <div class="info-item"><span class="info-label">Número de Páginas</span><span class="info-value">${pageCount}</span></div>
        <div class="info-item"><span class="info-label">Creador / Aplicación</span><span class="info-value">${creator}</span></div>
        <div class="info-item"><span class="info-label">Productor del PDF</span><span class="info-value">${producer}</span></div>
        <div class="info-item"><span class="info-label">Fecha de Creación</span><span class="info-value">${formatPdfDate(creationDateRaw)}</span></div>
        <div class="info-item" style="border-bottom: none;"><span class="info-label">Última Modificación</span><span class="info-value">${formatPdfDate(modDateRaw)}</span></div>
      `;

      pdfResultsContainer.style.display = 'block';
      window.hideLoader();
    };
    const slice = file.slice(0, 120 * 1024);
    reader.readAsText(slice, "latin1");
  }
});
