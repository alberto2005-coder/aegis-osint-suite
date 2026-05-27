# Plan de Implementación: Enrutamiento Tor Global y CORS Proxy Seguro

Este plan detalla los pasos para agregar un control de enrutamiento Tor en la cabecera de la aplicación y un endpoint de proxy CORS seguro en el backend (`server.js`), reemplazando el uso de `corsproxy.io` en el frontend por peticiones locales a través del servidor.

## User Review Required

> [!IMPORTANT]
> - El enrutamiento Tor requiere que el servicio Tor (`tor` / puerto SOCKS5 `9050`) esté ejecutándose localmente o dentro del contenedor Docker. Si el servicio de Tor no está activo, las peticiones que tengan activado el toggle fallarán (dando timeout o error de conexión).
> - Se guardará la preferencia de Tor en el `localStorage` del navegador para que persista al recargar o cambiar de módulo.

---

## Proposed Changes

### Backend Component

#### [MODIFY] [server.js](file:///c:/Users/alors/Downloads/osint_completo/server.js)
- Agregar una nueva acción `bypass` dentro del endpoint `/proxy.php` que acepte una query `url` y una query opcional `useTor`.
- Si `useTor === 'true'`, la petición realizada mediante `axios` se enrutará usando `torAgent`. Si no, se hará directamente.
- Modificar el comportamiento de `proxy.php?action=check` para que respete el parámetro `useTor` enviado por el frontend (en lugar de intentar Tor siempre por defecto primero).

---

### Frontend Component

#### [MODIFY] [index.html](file:///c:/Users/alors/Downloads/osint_completo/index.html)
- Modificar el `<header class="app-header">` para incluir el interruptor de Tor con diseño Glassmorphism responsivo.
- Añadir reglas CSS necesarias en la etiqueta `<style>` interna para el diseño y comportamiento animado del switch selector (`.switch`, `.slider`, etc.).
- Incluir un pequeño script de inicialización y control en el frontend para:
  - Leer y guardar la preferencia de Tor en `localStorage`.
  - Exponer una función global `window.isTorActive()` que devuelva `true` o `false`.
  - Cambiar visualmente los colores del icono y texto del estado de Tor cuando se active.

#### [MODIFY] [webanalyzer.js](file:///c:/Users/alors/Downloads/osint_completo/js/modules/webanalyzer.js)
- Reemplazar las URL directas de `corsproxy.io` por llamadas a tu propio backend: `proxy.php?action=bypass&url=...` e incluir la variable de estado `useTor`.

#### [MODIFY] [email.js](file:///c:/Users/alors/Downloads/osint_completo/js/modules/email.js)
- Reemplazar la URL de `corsproxy.io` utilizada al verificar emails por tu backend con el parámetro de Tor.

#### [MODIFY] [dorks.js](file:///c:/Users/alors/Downloads/osint_completo/js/modules/dorks.js)
- Reemplazar el proxy `corsproxy.io` del método `probePaths` por llamadas a tu backend con el parámetro de Tor.

---

## Verification Plan

### Automated/Manual Tests
1. **Arrancar el servidor:** Iniciar la suite ejecutando `npm start`.
2. **Verificar interfaz:** Validar que el botón de Tor aparece en la cabecera, es estético y cambia de estado (y texto de descripción) al clicarlo.
3. **Verificar persistencia:** Activar el toggle de Tor, recargar la página y verificar que se mantiene activado.
4. **Probar auditoría de emails:** Analizar un email y comprobar en la pestaña de red de las herramientas de desarrollador (F12) que la petición va a `proxy.php?action=bypass` en lugar de a `corsproxy.io`.
5. **Probar con Tor apagado / encendido:**
   - Si Tor está apagado y el toggle está desactivado: Las búsquedas deben funcionar a velocidad normal de internet.
   - Si Tor está apagado y el toggle está activado: El sistema debe dar error o avisar de que no se puede conectar con el proxy.
