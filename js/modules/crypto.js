document.addEventListener('DOMContentLoaded', () => {
  const btnExecute = document.getElementById('btn-crypto-execute');
  const inputEl = document.getElementById('crypto-input');
  const outputEl = document.getElementById('crypto-output');
  const keyEl = document.getElementById('crypto-key');
  const modeEl = document.getElementById('crypto-mode');
  const algoEl = document.getElementById('crypto-algorithm');
  const targetTypeEl = document.getElementById('crypto-target-type');
  const btnToggleKey = document.getElementById('btn-toggle-crypto-key');
  const btnCopy = document.getElementById('btn-crypto-copy');

  // Steganography elements
  const stegoContainer = document.getElementById('stego-image-container');
  const stegoDropZone = document.getElementById('stego-drop-zone');
  const stegoDropZoneText = document.getElementById('stego-drop-zone-text');
  const stegoImageInput = document.getElementById('stego-image-input');
  const stegoPreview = document.getElementById('stego-preview');
  const stegoNoImage = document.getElementById('stego-no-image');
  const btnStegoDownload = document.getElementById('btn-stego-download');

  if (!btnExecute) return;

  let loadedImageSrc = null;  // Almacena la imagen base cargada
  let encodedImageSrc = null; // Almacena la imagen con el mensaje ya oculto

  // Mostrar / ocultar contenedor de esteganografía según tipo de objetivo
  if (targetTypeEl) {
    targetTypeEl.addEventListener('change', () => {
      try {
        const isImage = targetTypeEl.value === 'image';
        stegoContainer.style.display = isImage ? 'block' : 'none';
        
        // Resetear estado del stego
        if (!isImage) {
          btnStegoDownload.style.display = 'none';
        } else {
          updateStegoUI();
        }
      } catch (err) {
        console.error("Error al cambiar tipo de objetivo:", err);
      }
    });
  }

  if (modeEl) {
    modeEl.addEventListener('change', () => {
      try {
        updateStegoUI();
      } catch (err) {
        console.error("Error al cambiar modo de operación:", err);
      }
    });
  }

  function updateStegoUI() {
    if (targetTypeEl.value !== 'image') return;
    const isEncrypt = modeEl.value === 'encrypt';
    
    if (isEncrypt) {
      stegoDropZoneText.textContent = "Arrastra la imagen portadora aquí o haz clic";
      if (encodedImageSrc) {
        btnStegoDownload.style.display = 'block';
      } else {
        btnStegoDownload.style.display = 'none';
      }
    } else {
      stegoDropZoneText.textContent = "Arrastra la imagen con mensaje oculto aquí o haz clic";
      btnStegoDownload.style.display = 'none'; // Descarga no aplica al descifrar
    }
  }

  // Manejo de carga de imagen para esteganografía (Dropzone)
  stegoDropZone.addEventListener('click', () => stegoImageInput.click());

  stegoDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    stegoDropZone.style.borderColor = 'var(--cyan-color)';
    stegoDropZone.style.background = 'rgba(6,182,212,0.03)';
  });

  stegoDropZone.addEventListener('dragleave', () => {
    stegoDropZone.style.borderColor = 'var(--border-color)';
    stegoDropZone.style.background = 'rgba(255,255,255,0.01)';
  });

  stegoDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    stegoDropZone.style.borderColor = 'var(--border-color)';
    stegoDropZone.style.background = 'rgba(255,255,255,0.01)';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleStegoFile(file);
    }
  });

  stegoImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      handleStegoFile(file);
    }
  });

  function handleStegoFile(file) {
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        loadedImageSrc = event.target.result;
        encodedImageSrc = null; // Limpiar resultado anterior
        stegoPreview.src = loadedImageSrc;
        stegoPreview.style.display = 'block';
        stegoNoImage.style.display = 'none';
        btnStegoDownload.style.display = 'none';
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Error al leer archivo de imagen:", err);
    }
  }

  // Descarga de la imagen codificada
  btnStegoDownload.addEventListener('click', () => {
    try {
      if (!encodedImageSrc) return;
      const link = document.createElement('a');
      link.href = encodedImageSrc;
      link.download = 'aegis_secure_stego.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Error al descargar imagen stego:", err);
    }
  });

  // Alternar visibilidad de la contraseña
  btnToggleKey.addEventListener('click', () => {
    try {
      const type = keyEl.getAttribute('type') === 'password' ? 'text' : 'password';
      keyEl.setAttribute('type', type);
      const icon = btnToggleKey.querySelector('i');
      if (icon) {
        icon.className = type === 'password' ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
      }
    } catch (err) {
      console.error("Error toggle key visibility:", err);
    }
  });

  // Copiar al portapapeles
  btnCopy.addEventListener('click', async () => {
    try {
      const text = outputEl.value;
      if (!text || text.startsWith("[ERROR:")) return;
      await navigator.clipboard.writeText(text);
      const originalText = btnCopy.innerHTML;
      btnCopy.innerHTML = '<i class="fa-solid fa-check"></i> ¡Copiado!';
      setTimeout(() => {
        btnCopy.innerHTML = originalText;
      }, 2000);
    } catch (err) {
      console.error("Error al copiar texto:", err);
    }
  });

  // Ejecución de Cifrado / Descifrado
  btnExecute.addEventListener('click', async () => {
    const isImage = targetTypeEl.value === 'image';
    const text = inputEl.value.trim();
    const key = keyEl.value.trim();
    const mode = modeEl.value; 
    const algo = algoEl.value; 

    if (isImage && !loadedImageSrc) {
      alert("Por favor, carga una imagen portadora primero.");
      return;
    }
    if (!isImage && !text) {
      alert("Por favor, introduce el mensaje de entrada.");
      return;
    }
    if (!key) {
      alert("Por favor, introduce la clave secreta.");
      return;
    }

    window.showLoader("Procesando criptografía...");
    outputEl.value = "";

    try {
      if (mode === 'encrypt') {
        // ── MODO CIFRAR ──
        // 1. Cifrar el texto
        let encryptedText = "";
        if (algo === 'aes-gcm') {
          encryptedText = await encryptAESGCM(text, key);
        } else if (algo === 'rc4') {
          encryptedText = encryptRC4(text, key);
        } else if (algo === 'xor') {
          encryptedText = encryptXOR(text, key);
        } else if (algo === 'vigenere') {
          encryptedText = encryptVigenere(text, key);
        }

        if (isImage) {
          // 2. Ocultar en la imagen
          const img = await loadImage(loadedImageSrc);
          encodedImageSrc = embedTextInImage(img, encryptedText);
          stegoPreview.src = encodedImageSrc;
          btnStegoDownload.style.display = 'block';
          outputEl.value = encryptedText; // También mostrar texto cifrado
          alert("¡Mensaje cifrado e insertado en la imagen con éxito! Puedes descargar la imagen portadora ahora.");
        } else {
          outputEl.value = encryptedText;
        }
      } else {
        // ── MODO DESCIFRAR ──
        let textToDecrypt = text;
        if (isImage) {
          // 1. Extraer el texto oculto de la imagen
          const img = await loadImage(loadedImageSrc);
          textToDecrypt = extractTextFromImage(img);
        }

        // 2. Descifrar el texto
        let decryptedText = "";
        if (algo === 'aes-gcm') {
          decryptedText = await decryptAESGCM(textToDecrypt, key);
        } else if (algo === 'rc4') {
          decryptedText = decryptRC4(textToDecrypt, key);
        } else if (algo === 'xor') {
          decryptedText = decryptXOR(textToDecrypt, key);
        } else if (algo === 'vigenere') {
          decryptedText = decryptVigenere(textToDecrypt, key);
        }

        outputEl.value = decryptedText;
      }
    } catch (err) {
      console.error("Error en operación criptográfica:", err);
      outputEl.value = "[ERROR: No se pudo descifrar. Verifica que el algoritmo seleccionado, la clave secreta o la imagen cargada sean los correctos.]";
    } finally {
      window.hideLoader();
    }
  });

  // Cargador de Imagen asíncrono
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Error al cargar la imagen."));
      img.src = src;
    });
  }

  // ── Esteganografía LSB (Canvas) ──────────────────────────────────────────
  function embedTextInImage(imgElement, text) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = imgElement.naturalWidth;
    canvas.height = imgElement.naturalHeight;
    ctx.drawImage(imgElement, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    // Convertir el texto a UTF-8 bytes y añadir carácter nulo como marcador
    const enc = new TextEncoder();
    const bytes = enc.encode(text + "\0");
    
    const requiredBits = bytes.length * 8;
    const availableChannels = (data.length / 4) * 3; // R, G, B de cada píxel
    if (requiredBits > availableChannels) {
      throw new Error("La imagen es demasiado pequeña para contener este mensaje.");
    }

    // Convertir bytes a array de bits
    const bits = [];
    for (let i = 0; i < bytes.length; i++) {
      for (let bit = 7; bit >= 0; bit--) {
        bits.push((bytes[i] >> bit) & 1);
      }
    }

    // Insertar bits en el LSB de los canales R, G, B
    let bitIdx = 0;
    for (let i = 0; i < data.length; i += 4) {
      for (let channel = 0; channel < 3; channel++) {
        if (bitIdx >= bits.length) {
          ctx.putImageData(imgData, 0, 0);
          return canvas.toDataURL('image/png');
        }
        data[i + channel] = (data[i + channel] & 0xFE) | bits[bitIdx];
        bitIdx++;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL('image/png');
  }

  function extractTextFromImage(imgElement) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = imgElement.naturalWidth;
    canvas.height = imgElement.naturalHeight;
    ctx.drawImage(imgElement, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    const bits = [];
    for (let i = 0; i < data.length; i += 4) {
      for (let channel = 0; channel < 3; channel++) {
        bits.push(data[i + channel] & 1);
      }
    }

    // Reconstruir bytes
    const bytes = [];
    for (let i = 0; i < bits.length; i += 8) {
      if (i + 8 > bits.length) break;
      let byteValue = 0;
      for (let bit = 0; bit < 8; bit++) {
        byteValue = (byteValue << 1) | bits[i + bit];
      }
      if (byteValue === 0) {
        break; // Marcador nulo encontrado
      }
      bytes.push(byteValue);
    }

    const dec = new TextDecoder();
    return dec.decode(new Uint8Array(bytes));
  }

  // ── Algoritmo 1: AES-GCM Nativo ──────────────────────────────────────────
  async function getKeyMaterial(password) {
    const enc = new TextEncoder();
    return window.crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );
  }

  async function getEncryptionKey(password, salt) {
    const keyMaterial = await getKeyMaterial(password);
    return window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function encryptAESGCM(text, password) {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await getEncryptionKey(password, salt);
    
    const enc = new TextEncoder();
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      enc.encode(text)
    );

    const encryptedArray = new Uint8Array(encrypted);
    const combined = new Uint8Array(salt.length + iv.length + encryptedArray.length);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(encryptedArray, salt.length + iv.length);

    return btoa(String.fromCharCode.apply(null, combined));
  }

  async function decryptAESGCM(base64Text, password) {
    const combined = new Uint8Array(
      atob(base64Text)
        .split("")
        .map(c => c.charCodeAt(0))
    );

    if (combined.length < 28) {
      throw new Error("Formato cifrado inválido.");
    }

    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encryptedData = combined.slice(28);

    const key = await getEncryptionKey(password, salt);
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encryptedData
    );

    const dec = new TextDecoder();
    return dec.decode(decrypted);
  }

  // ── Algoritmo 2: RC4 ─────────────────────────────────────────────────────
  function rc4KSA(keyBytes) {
    const s = new Uint8Array(256);
    for (let i = 0; i < 256; i++) s[i] = i;
    let j = 0;
    for (let i = 0; i < 256; i++) {
      j = (j + s[i] + keyBytes[i % keyBytes.length]) % 256;
      const tmp = s[i];
      s[i] = s[j];
      s[j] = tmp;
    }
    return s;
  }

  function rc4PRGA(s, len) {
    const out = new Uint8Array(len);
    let i = 0, j = 0;
    for (let k = 0; k < len; k++) {
      i = (i + 1) % 256;
      j = (j + s[i]) % 256;
      const tmp = s[i];
      s[i] = s[j];
      s[j] = tmp;
      const t = (s[i] + s[j]) % 256;
      out[k] = s[t];
    }
    return out;
  }

  function encryptRC4(text, password) {
    const enc = new TextEncoder();
    const textBytes = enc.encode(text);
    const keyBytes = enc.encode(password);
    const s = rc4KSA(keyBytes);
    const keystream = rc4PRGA(s, textBytes.length);
    
    const cipherBytes = new Uint8Array(textBytes.length);
    for (let i = 0; i < textBytes.length; i++) {
      cipherBytes[i] = textBytes[i] ^ keystream[i];
    }
    
    return Array.from(cipherBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function decryptRC4(hexText, password) {
    if (!/^[0-9a-fA-F]+$/.test(hexText) || hexText.length % 2 !== 0) {
      throw new Error("El formato del texto no es Hexadecimal válido.");
    }
    const cipherBytes = new Uint8Array(
      hexText.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
    );
    const enc = new TextEncoder();
    const keyBytes = enc.encode(password);
    const s = rc4KSA(keyBytes);
    const keystream = rc4PRGA(s, cipherBytes.length);
    
    const plainBytes = new Uint8Array(cipherBytes.length);
    for (let i = 0; i < cipherBytes.length; i++) {
      plainBytes[i] = cipherBytes[i] ^ keystream[i];
    }
    
    const dec = new TextDecoder();
    return dec.decode(plainBytes);
  }

  // ── Algoritmo 3: XOR ─────────────────────────────────────────────────────
  function encryptXOR(text, password) {
    const enc = new TextEncoder();
    const textBytes = enc.encode(text);
    const keyBytes = enc.encode(password);
    
    const cipherBytes = new Uint8Array(textBytes.length);
    for (let i = 0; i < textBytes.length; i++) {
      cipherBytes[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    
    return Array.from(cipherBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function decryptXOR(hexText, password) {
    if (!/^[0-9a-fA-F]+$/.test(hexText) || hexText.length % 2 !== 0) {
      throw new Error("El formato del texto no es Hexadecimal válido.");
    }
    const cipherBytes = new Uint8Array(
      hexText.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
    );
    const enc = new TextEncoder();
    const keyBytes = enc.encode(password);
    
    const plainBytes = new Uint8Array(cipherBytes.length);
    for (let i = 0; i < cipherBytes.length; i++) {
      plainBytes[i] = cipherBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    
    const dec = new TextDecoder();
    return dec.decode(plainBytes);
  }

  // ── Algoritmo 4: Vigenère ────────────────────────────────────────────────
  function encryptVigenere(text, password) {
    const enc = new TextEncoder();
    const textBytes = enc.encode(text);
    const keyBytes = enc.encode(password);
    
    const cipherBytes = new Uint8Array(textBytes.length);
    for (let i = 0; i < textBytes.length; i++) {
      const shift = keyBytes[i % keyBytes.length];
      cipherBytes[i] = (textBytes[i] + shift) % 256;
    }
    
    return Array.from(cipherBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function decryptVigenere(hexText, password) {
    if (!/^[0-9a-fA-F]+$/.test(hexText) || hexText.length % 2 !== 0) {
      throw new Error("El formato del texto no es Hexadecimal válido.");
    }
    const cipherBytes = new Uint8Array(
      hexText.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
    );
    const enc = new TextEncoder();
    const keyBytes = enc.encode(password);
    
    const plainBytes = new Uint8Array(cipherBytes.length);
    for (let i = 0; i < cipherBytes.length; i++) {
      const shift = keyBytes[i % keyBytes.length];
      plainBytes[i] = (cipherBytes[i] - shift + 256) % 256;
    }
    
    const dec = new TextDecoder();
    return dec.decode(plainBytes);
  }
});
