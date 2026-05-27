# Aegis OSINT Suite

Aegis es una suite de herramientas web para realizar reconocimiento pasivo (OSINT), análisis forense de archivos/correos y operaciones de criptografía/esteganografía directamente desde el navegador.

---

## Indice
1. [Caracteristicas](#caracteristicas)
2. [Instalacion Local](#instalacion-local)
3. [Uso con Docker](#uso-con-docker)
4. [Despliegue en la Nube](#despliegue-en-la-nube)
5. [Gestion de Recursos](#gestion-de-recursos)
6. [Stack Tecnologico](#stack-tecnologico)

---

## Caracteristicas

La suite incluye las siguientes herramientas accesibles desde el panel lateral:

* **Buscador de Usuarios (Sherlock)**: Búsqueda de perfiles en cientos de redes sociales de forma paralela. Integra soporte opcional para Tor/Proxies y resoluciones rápidas en APIs clave (GitHub, Chess.com, etc.).
* **Auditoría de Correos**: Verificación rápida de direcciones de email expuestas en filtraciones públicas (Breaches).
* **Dominios e IPs**: Consulta DNS (registros A, MX, NS) y geolocalización de IPs reflejada en un mapa interactivo (Leaflet.js).
* **OSINT Telefónico**: Análisis y formateo internacional de números de teléfono, identificando operadora y país.
* **Nombres y Rostros**: Enlaces directos a búsquedas estructuradas y reconocimiento facial inverso.
* **Extractor y Limpiador EXIF**: Obtiene metadatos de imágenes JPEG (cámara, fecha, coordenadas GPS en mapa) y permite descargar una copia de la imagen completamente limpia de metadatos.
* **Analizador de Cabeceras de Correo**: Traza el flujo de servidores SMTP de un correo, dibuja la ruta geográfica en un mapa mundial y genera una línea de tiempo vertical visual de los saltos de red.
* **Reportes PDF**: Exportación directa de informes en formato PDF con diseño limpio para Sherlock, EXIF y la Auditoría Web.
* **Comandos Linux**: Chuleta rápida de comandos útiles para análisis de sistemas y seguridad.
* **Google Dorks**: Generador de búsquedas avanzadas para localizar bases de datos expuestas, logins, directorios indexados y configuraciones desprotegidas.
* **Auditoría Web**: Escaneo de tecnologías (CMS, librerías, CDN), subdominios en certificados de transparencia, escáner de puertos comunes y puntuación de seguridad (Mozilla Observatory).
* **Caja de Cifrado (Crypto Box)**: Cifrado y descifrado de texto y archivos usando claves simétricas (AES-GCM, RC4, XOR, Vigenère).
* **Esteganografía LSB**: Oculta texto cifrado dentro de los píxeles de cualquier imagen sin alterar su diseño visual. El mensaje solo se puede extraer si se proporciona la imagen PNG correcta, el método exacto y la clave secreta.

---

## Instalacion Local

### Requisitos
* **Node.js** (v18+)
* **Python 3** (requerido si vas a usar la herramienta de Sherlock localmente)

### Pasos
1. Clona el repositorio e ingresa a la carpeta:
   ```bash
   git clone https://github.com/alberto2005-coder/aegis-osint-suite.git
   cd aegis-osint-suite
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Arranca la aplicación:
   ```bash
   npm start
   ```
4. Abre en tu navegador: `http://localhost:3000`

---

## Uso con Docker

El proyecto incluye un `Dockerfile` que empaqueta todo el entorno (incluyendo el servicio de Tor y Sherlock en Python).

1. Construye la imagen:
   ```bash
   docker build -t aegis-osint .
   ```
2. Levanta el contenedor mapeando el puerto 3000:
   ```bash
   docker run -d -p 3000:3000 --name aegis aegis-osint
   ```
3. Entra en `http://localhost:3000`. El contenedor correrá Tor en segundo plano de forma automática para las consultas anonimizadas.

---

## Despliegue en la Nube

La aplicación escucha en el puerto definido por la variable de entorno `PORT` (`process.env.PORT || 3000`), lo que facilita su despliegue en múltiples servicios.

### 1. Plataformas PaaS (Railway, Render, Fly.io, Heroku)
Conecta tu repositorio de GitHub al servicio y define:
* **Entorno**: Node.js
* **Build Command**: `npm install`
* **Start Command**: `npm start`
* **Nota**: Si la plataforma admite despliegues con Docker, selecciona usar el `Dockerfile` para tener Tor y Sherlock preconfigurados de forma nativa en el contenedor.

### 2. Servidor VPS (Ubuntu/Debian) usando PM2
Si quieres montar la app en tu propio servidor:
```bash
# Instalar dependencias
sudo apt update && sudo apt install -y nodejs npm python3 python3-pip tor
sudo npm install -g pm2
python3 -m pip install sherlock-project

# Clonar e iniciar
git clone https://github.com/alberto2005-coder/aegis-osint-suite.git
cd aegis-osint-suite
npm install
pm2 start server.js --name "aegis"
pm2 save
pm2 startup
```

---

## Gestion de Recursos

Para evitar bloqueos y no exceder límites de consumo de recursos en servidores en la nube (como el límite de 512MB de RAM en cuentas gratuitas):

* **Limpieza de procesos huérfanos**: Cuando un usuario cancela un escaneo en el buscador o cierra la pestaña, el servidor detecta la desconexión (`req.on('close')`) y mata inmediatamente el proceso de Sherlock que corría en el sistema (`SIGTERM`).
* **Watchdog (Tiempo Límite)**: Cada consulta de Sherlock tiene asignado un temporizador máximo de 120 segundos. Si un proxy lento o una red bloqueada congela el proceso, el servidor lo fuerza a cerrarse (`SIGKILL`) para no dejar procesos consumiendo memoria RAM.

---

## Stack Tecnologico

* **Front-End**: HTML5, CSS (diseño responsivo oscuro con estética glassmorphism), JS Vanilla, Leaflet.js (mapas), FontAwesome 6, jsPDF.
* **Back-End**: Node.js, Express, Axios.
* **Criptografía**: Web Crypto API (SubtleCrypto nativo para AES-GCM) y manipulación de canales RGB (Canvas API) para esteganografía LSB.
