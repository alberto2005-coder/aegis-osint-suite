document.addEventListener('DOMContentLoaded', () => {
  // --- 7. EXIF METADATA EXTRACTION LOGIC ---
  const exifDropZone = document.getElementById('exif-drop-zone');
  const exifImageInput = document.getElementById('exif-image-input');
  const exifPreview = document.getElementById('exif-preview');
  const exifInfoContainer = document.getElementById('exif-info-container');
  const exifInfoList = document.getElementById('exif-info-list');
  const exifMapCard = document.getElementById('exif-map-card');
  const exifNoGpsCard = document.getElementById('exif-no-gps-card');
  const exifCleanBtn = document.getElementById('btn-exif-clean-download');

  // Wizard elements
  const btnToggleGeoWizard = document.getElementById('btn-toggle-geo-wizard');
  const exifGeoWizard = document.getElementById('exif-geo-wizard');
  const btnCalculateGeoWizard = document.getElementById('btn-calculate-geo-wizard');
  const exifWizardResults = document.getElementById('exif-wizard-results');
  const exifWizardCountriesList = document.getElementById('exif-wizard-countries-list');

  let exifMapInstance = null;

  // Toggle Wizard panel
  if (btnToggleGeoWizard) {
    btnToggleGeoWizard.addEventListener('click', () => {
      if (exifGeoWizard.style.display === 'none') {
        exifGeoWizard.style.display = 'block';
        btnToggleGeoWizard.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Cerrar Asistente';
      } else {
        exifGeoWizard.style.display = 'none';
        btnToggleGeoWizard.innerHTML = '<i class="fa-solid fa-map-pin"></i> Abrir Asistente de Pistas Visuales';
      }
    });
  }

  // Visual Geolocation Database (OSINT & Geoguessr tips)
  const GEO_DATABASE = [
    { name: 'España', drive: 'right', plate: 'euro', alphabet: 'latin', lines: 'any', tip: 'Matrícula con banda azul europea (E). Conducción derecha. Letreros en español. Señales viales estandarizadas de la UE.' },
    { name: 'Reino Unido', drive: 'left', plate: 'yellow-rear', alphabet: 'latin', lines: 'any', tip: 'Conducción izquierda. Matrícula delantera blanca y trasera amarilla. Bolardos reflectantes con bandas rojas.' },
    { name: 'Estados Unidos', drive: 'right', plate: 'us', alphabet: 'latin', lines: 'yellow-center', tip: 'Línea amarilla doble en el centro de la carretera. Semáforos colgando en medio de las intersecciones. Matrículas cortas y cuadradas.' },
    { name: 'Rusia', drive: 'right', plate: 'euro', alphabet: 'cyrillic', lines: 'any', tip: 'Letreros en alfabeto cirílico. Matrículas con bandera de Rusia sin banda azul europea. Postes con pintura blanca y negra en la base.' },
    { name: 'Japón', drive: 'left', plate: 'us', alphabet: 'cjk', lines: 'any', tip: 'Conducción izquierda. Letreros en kanji/kana. Matrículas cortas con números verdes o verdes/blancas. Postes eléctricos muy densos.' },
    { name: 'Sudáfrica', drive: 'left', plate: 'yellow-both', alphabet: 'latin', lines: 'yellow-outer', tip: 'Líneas amarillas continuas en los bordes exteriores de la carretera. Conducción izquierda. Señales de tráfico en inglés.' },
    { name: 'Australia', drive: 'left', plate: 'us', alphabet: 'latin', lines: 'any', tip: 'Conducción izquierda. Señales amarillas de advertencia con iconos de fauna local. Postes de madera rústicos o de metal fino.' },
    { name: 'Tailandia', drive: 'left', plate: 'any', alphabet: 'thai', lines: 'any', tip: 'Conducción izquierda. Sistema de escritura tailandés. Postes eléctricos cuadrados de cemento con agujeros.' },
    { name: 'Grecia', drive: 'right', plate: 'euro', alphabet: 'greek', lines: 'any', tip: 'Letreros viales bilingües en griego y alfabeto latín. Matrícula con banda azul europea (GR).' },
    { name: 'Colombia', drive: 'right', plate: 'yellow-both', alphabet: 'latin', lines: 'yellow-center', tip: 'Matrículas de color amarillo brillante (tanto delanteras como traseras) obligatorias en vehículos de transporte público y comercial.' },
    { name: 'México', drive: 'right', plate: 'us', alphabet: 'latin', lines: 'yellow-center', tip: 'Línea central amarilla. Letreros de parada escritos como "ALTO". Arquitectura típica de América Latina.' },
    { name: 'Ucrania', drive: 'right', plate: 'euro', alphabet: 'cyrillic', lines: 'any', tip: 'Uso de la letra cirílica "i" (no presente en el ruso). Conducción derecha. Banda azul de Ucrania (UA) en matrículas.' },
    { name: 'Brasil', drive: 'right', plate: 'euro', alphabet: 'latin', lines: 'yellow-center', tip: 'Líneas centrales amarillas. Letreros de parada escritos como "PARE". Matrículas con el formato Mercosur (banda azul superior).' },
    { name: 'Francia', drive: 'right', plate: 'euro', alphabet: 'latin', lines: 'any', tip: 'Matrícula con banda azul de la UE (F). Conducción derecha. Frecuente presencia de bolardos blancos con caperuza roja.' },
    { name: 'Alemania', drive: 'right', plate: 'euro', alphabet: 'latin', lines: 'any', tip: 'Matrículas europeas (D). Letreros con fuentes góticas suavizadas y caracteres con diéresis (ä, ö, ü). Bolardos con reflectores rectangulares.' }
  ];

  // Calculate Geolocation estimation
  if (btnCalculateGeoWizard) {
    btnCalculateGeoWizard.addEventListener('click', () => {
      const selectedDrive = document.getElementById('wizard-drive').value;
      const selectedPlate = document.getElementById('wizard-plate').value;
      const selectedAlphabet = document.getElementById('wizard-alphabet').value;
      const selectedLines = document.getElementById('wizard-lines').value;

      let results = [];

      GEO_DATABASE.forEach(country => {
        let score = 0;
        let totalCriteria = 0;

        if (selectedDrive !== 'any') {
          totalCriteria++;
          if (country.drive === selectedDrive) score++;
        }
        if (selectedPlate !== 'any') {
          totalCriteria++;
          if (country.plate === selectedPlate || country.plate === 'any') score++;
        }
        if (selectedAlphabet !== 'any') {
          totalCriteria++;
          if (country.alphabet === selectedAlphabet || country.alphabet === 'any') score++;
        }
        if (selectedLines !== 'any') {
          totalCriteria++;
          if (country.lines === selectedLines || country.lines === 'any') score++;
        }

        if (totalCriteria > 0) {
          const matchPercent = Math.round((score / totalCriteria) * 100);
          if (matchPercent >= 50) {
            results.push({ name: country.name, percent: matchPercent, tip: country.tip });
          }
        }
      });

      // Sort results by matching percentage
      results.sort((a, b) => b.percent - a.percent);

      exifWizardCountriesList.innerHTML = '';
      if (results.length === 0) {
        exifWizardCountriesList.innerHTML = '<p style="color: var(--text-muted);">No se encontraron coincidencias claras. Intenta seleccionar más pistas o cambiar las actuales.</p>';
      } else {
        results.forEach(res => {
          const div = document.createElement('div');
          div.className = 'info-item';
          div.style.flexDirection = 'column';
          div.style.alignItems = 'stretch';
          div.style.gap = '0.25rem';
          div.innerHTML = `
            <div style="display: flex; justify-content: space-between; font-weight: 600;">
              <span>${res.name}</span>
              <span style="color: var(--cyan-color);">${res.percent}% coincidencia</span>
            </div>
            <div style="background: rgba(255,255,255,0.05); height: 4px; border-radius: 2px; overflow: hidden; margin: 0.25rem 0;">
              <div style="background: var(--cyan-color); width: ${res.percent}%; height: 100%;"></div>
            </div>
            <small style="color: var(--text-secondary); line-height: 1.3;">💡 <strong>Tip OSINT:</strong> ${res.tip}</small>
          `;
          exifWizardCountriesList.appendChild(div);
        });
      }

      exifWizardResults.style.display = 'block';
    });
  }

  if (exifDropZone) {
    exifDropZone.addEventListener('click', () => exifImageInput.click());

    exifDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      exifDropZone.classList.add('dragover');
    });

    exifDropZone.addEventListener('dragleave', () => exifDropZone.classList.remove('dragover'));

    exifDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      exifDropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length) {
        exifImageInput.files = e.dataTransfer.files;
        handleExifFile();
      }
    });
  }

  if (exifImageInput) {
    exifImageInput.addEventListener('change', handleExifFile);
  }

  function handleExifFile() {
    const file = exifImageInput.files[0];
    if (!file) return;

    // Reset wizard
    if (exifGeoWizard) exifGeoWizard.style.display = 'none';
    if (exifWizardResults) exifWizardResults.style.display = 'none';
    if (btnToggleGeoWizard) btnToggleGeoWizard.innerHTML = '<i class="fa-solid fa-map-pin"></i> Abrir Asistente de Pistas Visuales';

    // Show image preview
    const reader = new FileReader();
    reader.onload = (e) => {
      exifPreview.src = e.target.result;
      exifPreview.style.display = 'block';
      exifDropZone.querySelector('i').style.display = 'none';
      exifDropZone.querySelector('p').textContent = `Archivo: ${file.name}`;
      
      // Update image dimensions in UI once image loads in DOM
      exifPreview.onload = () => {
        const items = document.querySelectorAll('#exif-info-list .info-item');
        for (let item of items) {
          if (item.querySelector('.info-label').textContent === 'Dimensión de Imagen') {
            item.querySelector('.info-value').textContent = `${exifPreview.naturalWidth} x ${exifPreview.naturalHeight} px`;
            break;
          }
        }
      };
    };
    reader.readAsDataURL(file);

    window.showLoader("Extrayendo metadatos EXIF...");

    // Call Exif.js
    EXIF.getData(file, function() {
      const allMetaData = EXIF.getAllTags(this);
      
      if (!allMetaData || Object.keys(allMetaData).length === 0) {
        exifInfoList.innerHTML = `<p style="color: var(--warning-color); font-weight: 500;">No se encontraron etiquetas EXIF en la imagen. Puede que hayan sido borradas o que la imagen no tenga metadatos.</p>`;
        exifInfoContainer.style.display = 'block';
        exifMapCard.style.display = 'none';
        exifNoGpsCard.style.display = 'block';
        window.hideLoader();
        return;
      }

      // Populate camera details
      exifInfoList.innerHTML = `
        <div class="info-item"><span class="info-label">Fabricante</span><span class="info-value">${allMetaData.Make || 'Desconocido'}</span></div>
        <div class="info-item"><span class="info-label">Modelo</span><span class="info-value">${allMetaData.Model || 'Desconocido'}</span></div>
        <div class="info-item"><span class="info-label">Fecha/Hora de Captura</span><span class="info-value">${allMetaData.DateTimeOriginal || allMetaData.DateTime || 'Desconocido'}</span></div>
        <div class="info-item"><span class="info-label">Software de Edición</span><span class="info-value">${allMetaData.Software || 'Ninguno'}</span></div>
        <div class="info-item"><span class="info-label">Dimensión de Imagen</span><span class="info-value">${allMetaData.PixelXDimension || file.width || '?' } x ${allMetaData.PixelYDimension || file.height || '?' } px</span></div>
        <div class="info-item"><span class="info-label">Exposición</span><span class="info-value">${allMetaData.ExposureTime ? (allMetaData.ExposureTime.numerator || allMetaData.ExposureTime) + '/' + (allMetaData.ExposureTime.denominator || 1) + 's' : 'Desconocido'}</span></div>
        <div class="info-item"><span class="info-label">Apertura</span><span class="info-value">${allMetaData.FNumber ? 'f/' + allMetaData.FNumber : 'Desconocido'}</span></div>
        <div class="info-item"><span class="info-label">ISO</span><span class="info-value">${allMetaData.ISOSpeedRatings || 'Desconocido'}</span></div>
      `;

      // GPS Data parsing
      if (allMetaData.GPSLatitude && allMetaData.GPSLongitude) {
        const lat = convertGPS(allMetaData.GPSLatitude, allMetaData.GPSLatitudeRef);
        const lon = convertGPS(allMetaData.GPSLongitude, allMetaData.GPSLongitudeRef);

        if (lat && lon) {
          exifInfoList.innerHTML += `
            <div class="info-item" style="border-bottom: none;"><span class="info-label" style="color: var(--cyan-color);">Coordenadas GPS</span><span class="info-value" style="color: var(--cyan-color);">${lat.toFixed(6)}, ${lon.toFixed(6)}</span></div>
          `;
          exifMapCard.style.display = 'block';
          exifNoGpsCard.style.display = 'none';
          renderExifMap(lat, lon, `Foto tomada aquí<br>Lat: ${lat.toFixed(5)}<br>Lon: ${lon.toFixed(5)}`);
        } else {
          exifMapCard.style.display = 'none';
          exifNoGpsCard.style.display = 'block';
        }
      } else {
        exifMapCard.style.display = 'none';
        exifNoGpsCard.style.display = 'block';
      }

      exifInfoContainer.style.display = 'block';

      // ── Limpiador EXIF (canvas) ─────────────────────────────
      if (exifCleanBtn) {
        exifCleanBtn.style.display = 'inline-flex';
        exifCleanBtn.onclick = () => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((blob) => {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              const originalName = file.name.replace(/\.[^.]+$/, '');
              a.href = url;
              a.download = `${originalName}_limpia_sin_exif.jpg`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }, 'image/jpeg', 0.95);
          };
          img.src = exifPreview.src;
        };
      }

      window.hideLoader();
    });
  }

  function convertGPS(rational, ref) {
    if (!rational || rational.length < 3) return null;
    
    // Support rational number calculation
    const calcRational = (val) => {
      if (typeof val === 'number') return val;
      if (val && typeof val === 'object' && val.denominator) {
        return val.numerator / val.denominator;
      }
      return parseFloat(val);
    };

    const degrees = calcRational(rational[0]);
    const minutes = calcRational(rational[1]);
    const seconds = calcRational(rational[2]);
    
    let decimal = degrees + (minutes / 60) + (seconds / 3600);
    if (ref === 'S' || ref === 'W') decimal = -decimal;
    return decimal;
  }

  function renderExifMap(lat, lon, label) {
    if (exifMapInstance) {
      exifMapInstance.remove();
      exifMapInstance = null;
    }
    setTimeout(() => {
      try {
        exifMapInstance = L.map('exif-map').setView([lat, lon], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(exifMapInstance);
        L.marker([lat, lon]).addTo(exifMapInstance).bindPopup(label).openPopup();
      } catch (err) {
        console.error("EXIF map error", err);
      }
    }, 150);
  }

  // --- Groq Vision AI Integration ---
  const groqKeyInput = document.getElementById('groq-key');
  const saveGroqKeyCheckbox = document.getElementById('save-groq-key');
  const btnScanGroq = document.getElementById('btn-scan-groq');
  const exifGroqResults = document.getElementById('exif-groq-results');
  const exifGroqResponse = document.getElementById('exif-groq-response');

  if (groqKeyInput && saveGroqKeyCheckbox) {
    const savedKey = localStorage.getItem('groq_api_key');
    if (savedKey) {
      groqKeyInput.value = savedKey;
      saveGroqKeyCheckbox.checked = true;
    }
  }

  if (btnScanGroq) {
    btnScanGroq.addEventListener('click', async () => {
      const apiKey = groqKeyInput.value.trim();
      
      if (!exifImageInput.files || exifImageInput.files.length === 0) {
        alert("Por favor sube una imagen primero.");
        return;
      }

      if (apiKey) {
        if (saveGroqKeyCheckbox.checked) {
          localStorage.setItem('groq_api_key', apiKey);
        } else {
          localStorage.removeItem('groq_api_key');
        }
      }

      window.showLoader("Analizando imagen con Groq Vision (Llama 4)...");
      exifGroqResults.style.display = 'none';

      const file = exifImageInput.files[0];
      const reader = new FileReader();

      reader.onload = async (e) => {
        const base64Image = e.target.result;

        try {
          let response;
          if (apiKey) {
            // Direct Client call to Groq API
            response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: 'meta-llama/llama-4-scout-17b-16e-instruct',
                messages: [
                  {
                    role: 'user',
                    content: [
                      {
                        type: 'text',
                        text: 'Eres un experto en geolocalización visual y OSINT (inteligencia de fuentes abiertas). Analiza minuciosamente los detalles de esta foto (monumentos conocidos como la Alhambra u otros, arquitectura, vegetación, postes, marcas viales, matrículas, letreros, geología) e intenta identificar monumentos, edificios o accidentes geográficos específicos para precisar la ciudad o punto exacto de la toma. Explica tus deducciones paso a paso de forma clara y estructurada en español y concluye con la localización exacta estimada.'
                      },
                      {
                        type: 'image_url',
                        image_url: {
                          url: base64Image
                        }
                      }
                    ]
                  }
                ],
                temperature: 0.2,
                max_tokens: 1024
              })
            });
          } else {
            // Server-side call through proxy.php
            response = await fetch('proxy.php', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                image: base64Image
              })
            });
          }

          const data = await response.json();

          if (data.error) {
            alert(`Error: ${data.error.message}`);
          } else if (data.choices && data.choices[0]) {
            // Render markdown content using marked.js
            exifGroqResponse.innerHTML = marked.parse(data.choices[0].message.content);
            exifGroqResults.style.display = 'block';
          } else {
            alert("No se recibió respuesta válida.");
          }
        } catch (err) {
          console.error(err);
          alert(apiKey ? "Error de conexión con la API de Groq." : "Error de conexión con proxy.php. Asegúrate de ejecutar la app en un entorno web con soporte PHP.");
        } finally {
          window.hideLoader();
        }
      };

      reader.readAsDataURL(file);
    });
  }
});
