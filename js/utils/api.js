/**
 * Aegis OSINT Suite - Client API Wrapper
 * Proporciona llamadas fetch unificadas, inyección de configuraciones de localStorage (como claves API o preferencia de Tor)
 * y manejo estandarizado de errores.
 */
(function() {
  const AegisAPI = {
    /**
     * Realiza una petición fetch con control de errores e integración de configuración.
     * @param {string} url - URL o ruta relativa.
     * @param {Object} options - Opciones de fetch estándar.
     * @returns {Promise<any>} Datos en formato JSON o respuesta procesada.
     */
    async request(url, options = {}) {
      // Inyectar headers comunes si es necesario
      options.headers = options.headers || {};
      
      // Inyectar la API key de Groq desde localStorage si está guardada y es una petición a Groq
      if (url.includes('action=groq') || url.includes('/proxy.php')) {
        const savedGroqKey = localStorage.getItem('groq_api_key');
        if (savedGroqKey && !options.headers['x-groq-api-key']) {
          options.headers['x-groq-api-key'] = savedGroqKey;
        }
      }

      // Si la URL es relativa y es una llamada a proxy, y deseamos forzar el uso de Tor si está marcado globalmente
      // (a menos que se especifique lo contrario en la query string)
      if (url.startsWith('proxy.php') && !url.includes('useTor=')) {
        const torEnabled = localStorage.getItem('global_tor_enabled') === 'true';
        if (torEnabled) {
          const separator = url.includes('?') ? '&' : '?';
          url = `${url}${separator}useTor=true`;
        }
      }

      try {
        const response = await fetch(url, options);
        
        if (!response.ok) {
          let errorMsg = `Error de red (${response.status}): ${response.statusText}`;
          try {
            const errData = await response.json();
            if (errData && errData.error) {
              errorMsg = typeof errData.error === 'string' ? errData.error : (errData.error.message || errorMsg);
            }
          } catch (_) {}
          throw new Error(errorMsg);
        }

        // Determinar tipo de respuesta
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          return await response.json();
        } else {
          return await response.text();
        }
      } catch (err) {
        console.error(`[AegisAPI Error] en llamada a ${url}:`, err);
        throw err;
      }
    }
  };

  window.AegisAPI = AegisAPI;
})();
