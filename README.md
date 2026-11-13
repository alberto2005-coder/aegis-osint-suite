# Aegis OSINT Suite

[![Node.js](https://img.shields.io/badge/Node.js-22.13%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-API-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Docker](https://img.shields.io/badge/Docker-listado-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![GPL-3.0](https://img.shields.io/badge/Licencia-GPL--3.0-blue)](LICENSE)

[Español](#español) · [English](#english)

---

## Español

### Índice

- [Descripción](#descripción)
- [Módulos](#módulos)
- [Demo](#demo)
- [Requisitos](#requisitos)
- [Instalación local](#instalación-local)
- [Docker](#docker)
- [Despliegue en la nube](#despliegue-en-la-nube)
- [Gestión de recursos](#gestión-de-recursos)
- [Stack tecnológico](#stack-tecnológico)
- [Uso responsable](#uso-responsable)
- [Licencia](#licencia)

### Descripción

**Aegis OSINT Suite** reúne en una sola interfaz varias herramientas de **inteligencia de fuentes abiertas (OSINT)**, análisis de metadatos, auditoría web y criptografía/esteganografía. Cada función es un módulo independiente accesible desde la barra lateral.

### Módulos

- **Buscador de usuarios (Sherlock)**: rastreo en paralelo por cientos de servicios, con proxies y enrutado opcional por Tor.
- **Auditoría de correos**: reputación y presencia en filtraciones públicas.
- **Dominios e IPs**: DNS (A, MX, NS) y geolocalización del hosting en un mapa.
- **OSINT telefónico**: validación y formato de números, operador y país.
- **Nombres y rostros**: enlaces a motores de búsqueda estructurada.
- **Metadatos EXIF**: cámara, fecha, GPS y descarga de copias sin metadatos.
- **Cabeceras de correo**: servidores intermedios, SPF/DKIM, ruta y cronología.
- **Informes PDF** de Sherlock, EXIF y auditoría web.
- **Comandos Linux** de referencia forense.
- **Google Dorks** para construir consultas avanzadas.
- **Auditoría web**: tecnologías, subdominios, SSL, cabeceras HTTP y puertos.
- **Crypto Box y esteganografía LSB**: AES-GCM, RC4, XOR y Vigenère, con ocultación de mensajes en PNG.
- **Geolocalización asistida por IA**: análisis de una foto con un modelo de visión de Groq para estimar el lugar (requiere clave de Groq).

### Demo

**Instancia pública:** <https://aegis-osint-suite.onrender.com/>

### Requisitos

- **Node.js 22.13+** (recomendado 24 LTS).
- **Python 3** solo para el rastreo de Sherlock en local.
- **Docker** (opcional).
- **Tor** (opcional, para enrutar consultas).

### Instalación local

```bash
git clone https://github.com/alberto2005-coder/aegis-osint-suite.git
cd aegis-osint-suite
npm install
npm start
```

Abre <http://localhost:3000>.

Para usar la geolocalización por IA, define `GROQ_API_KEY` en el entorno o envía la clave desde la interfaz.

### Docker

La imagen incluye Alpine Linux, el demonio de Tor y Sherlock:

```bash
docker build -t aegis-osint .
docker run -d -p 3000:3000 --name aegis aegis-osint
```

### Despliegue en la nube

La aplicación escucha en `process.env.PORT || 3000`.

**PaaS (Railway, Render, Fly.io, Heroku)**

- Entorno: Node.js.
- Build: `npm install`.
- Start: `npm start`.
- Si el proveedor admite Docker, usa el `Dockerfile` para que Python y Tor estén disponibles.

**VPS Ubuntu/Debian con PM2**

```bash
sudo apt update && sudo apt install -y nodejs npm python3 python3-pip tor
sudo npm install -g pm2
python3 -m pip install sherlock-project

git clone https://github.com/alberto2005-coder/aegis-osint-suite.git
cd aegis-osint-suite
npm install
pm2 start server.js --name "aegis"
pm2 save
pm2 startup
```

### Gestión de recursos

- **Limpieza al desconectar**: el backend escucha `req.on('close')` y termina el subproceso de Sherlock si el usuario cierra la pestaña o cancela.
- **Watchdog de 120 s**: cada escaneo tiene un temporizador que mata el proceso hijo con `SIGKILL` si se pasa del tiempo.

Esto evita agotar la memoria en instancias pequeñas (por ejemplo, 512 MB).

### Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | HTML5, CSS3 con glassmorphism, JavaScript vanilla, Leaflet, jsPDF |
| Backend | Node.js, Express, Axios |
| Criptografía | Web Crypto API (AES-GCM) y Canvas API (LSB) |
| Contenedores | Docker con Alpine, Tor y Sherlock |

### Uso responsable

La suite está pensada para **educación, aprendizaje y auditoría autorizada**. No la uses para acosar, vigilar o investigar a terceros sin consentimiento ni base legal. El usuario es el único responsable del uso que haga de estas herramientas y de cumplir la ley de su país, incluido el RGPD cuando aplique.

### Licencia

**GNU General Public License v3.0 (GPL-3.0)** — consulta [LICENSE](LICENSE).

---

## English

### Table of contents

- [Overview](#overview)
- [Modules](#modules)
- [Demo](#demo)
- [Requirements](#requirements)
- [Local installation](#local-installation)
- [Docker](#docker)
- [Cloud deployment](#cloud-deployment)
- [Resource management](#resource-management)
- [Tech stack](#tech-stack)
- [Responsible use](#responsible-use)
- [License](#license)

### Overview

**Aegis OSINT Suite** brings together several **open-source intelligence (OSINT)** tools, metadata forensics, web auditing and cryptography/steganography in one interface. Each capability is an independent module reachable from the sidebar.

### Modules

- **User lookup (Sherlock)**: parallel search across hundreds of services, with proxies and optional Tor routing.
- **Email audit**: reputation and presence in public breaches.
- **Domains and IPs**: DNS (A, MX, NS) and hosting geolocation on a map.
- **Phone OSINT**: number validation and formatting, carrier and country.
- **Names and faces**: links to structured search engines.
- **EXIF metadata**: camera, date, GPS and stripped-copy downloads.
- **Email headers**: relay servers, SPF/DKIM, route and timeline.
- **PDF reports** for Sherlock, EXIF and web audits.
- **Linux commands** as a forensics reference.
- **Google Dorks** to build advanced queries.
- **Web audit**: technologies, subdomains, SSL, HTTP headers and ports.
- **Crypto Box and LSB steganography**: AES-GCM, RC4, XOR and Vigenère, hiding messages in PNG files.
- **AI-assisted geolocation**: analyses a photo with a Groq vision model to estimate the location (requires a Groq key).

### Demo

**Public instance:** <https://aegis-osint-suite.onrender.com/>

### Requirements

- **Node.js 22.13+** (24 LTS recommended).
- **Python 3** only for local Sherlock scans.
- **Docker** (optional).
- **Tor** (optional, for routed queries).

### Local installation

```bash
git clone https://github.com/alberto2005-coder/aegis-osint-suite.git
cd aegis-osint-suite
npm install
npm start
```

Open <http://localhost:3000>.

For AI geolocation, set `GROQ_API_KEY` in the environment or provide the key from the UI.

### Docker

The image bundles Alpine Linux, the Tor daemon and Sherlock:

```bash
docker build -t aegis-osint .
docker run -d -p 3000:3000 --name aegis aegis-osint
```

### Cloud deployment

The app listens on `process.env.PORT || 3000`.

**PaaS (Railway, Render, Fly.io, Heroku)**

- Environment: Node.js.
- Build: `npm install`.
- Start: `npm start`.
- If the provider supports Docker, use the `Dockerfile` so Python and Tor are available.

**Ubuntu/Debian VPS with PM2**

```bash
sudo apt update && sudo apt install -y nodejs npm python3 python3-pip tor
sudo npm install -g pm2
python3 -m pip install sherlock-project

git clone https://github.com/alberto2005-coder/aegis-osint-suite.git
cd aegis-osint-suite
npm install
pm2 start server.js --name "aegis"
pm2 save
pm2 startup
```

### Resource management

- **Cleanup on disconnect**: the backend listens to `req.on('close')` and kills the Sherlock subprocess if the user closes the tab or cancels.
- **120 s watchdog**: every scan has a timer that kills the child process with `SIGKILL` once it expires.

This prevents memory exhaustion on small instances (for example, 512 MB).

### Tech stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, glassmorphism CSS3, vanilla JavaScript, Leaflet, jsPDF |
| Backend | Node.js, Express, Axios |
| Cryptography | Web Crypto API (AES-GCM) and Canvas API (LSB) |
| Containers | Docker with Alpine, Tor and Sherlock |

### Responsible use

The suite is meant for **education, learning and authorised auditing**. Do not use it to harass, monitor or investigate third parties without consent or a legal basis. You are solely responsible for your use of these tools and for complying with your country's law, including the GDPR where it applies.

### License

**GNU General Public License v3.0 (GPL-3.0)** — see [LICENSE](LICENSE).
