# Aegis OSINT Suite

Plataforma de inteligencia de fuentes abiertas (OSINT), análisis forense de metadatos y herramientas de criptografía/esteganografía en tiempo real.

![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=flat-square&logo=javascript&logoColor=%23F7DF1E)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=flat-square&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=flat-square&logo=express&logoColor=%2361DAFB)
![Python](https://img.shields.io/badge/python-3670A0?style=flat-square&logo=python&logoColor=ffdd54)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=flat-square&logo=docker&logoColor=white)
![Tor](https://img.shields.io/badge/Tor_Project-7D4698?style=flat-square&logo=Tor-Project&logoColor=white)

---

## Indice
- [Aegis OSINT Suite](#aegis-osint-suite)
  - [Indice](#indice)
  - [Caracteristicas](#caracteristicas)
  - [Instalacion Local](#instalacion-local)
    - [Requisitos](#requisitos)
    - [Ejecucion de comandos](#ejecucion-de-comandos)
  - [Uso con Docker](#uso-con-docker)
  - [Despliegue en la Nube](#despliegue-en-la-nube)
    - [PaaS (Railway, Render, Fly.io, Heroku)](#paas-railway-render-flyio-heroku)
    - [Servidores Virtuales (VPS Ubuntu/Debian) con PM2](#servidores-virtuales-vps-ubuntudebian-con-pm2)
  - [Gestion de Recursos](#gestion-de-recursos)
  - [Stack Tecnologico](#stack-tecnologico)
  - [Descargo de Responsabilidad](#descargo-de-responsabilidad)

---

## Caracteristicas

La suite se compone de módulos independientes accesibles desde la barra de navegación lateral:

* **Buscador de Usuarios (Sherlock)**: Rastreo de perfiles en paralelo sobre cientos de servicios de internet. Soporta proxies y enrutado opcional a través de Tor.
* **Auditoría de Correos**: Consulta de reputación de direcciones de email y presencia en filtraciones de datos públicas (Breaches).
* **Dominios e IPs**: Resolución DNS (A, MX, NS) y geolocalización física del hosting dibujada en un mapa interactivo.
* **OSINT Telefonico**: Formateo y validación de números móviles, indicando el operador y país asignado.
* **Nombres y Rostros**: Enlaces directos a motores de búsqueda estructurada e identificación facial inversa.
* **Metadatos EXIF**: Extracción de información interna de fotos (marca de cámara, modelo, fecha, coordenadas GPS en mapa) y descarga de copias sin metadatos.
* **Analizador de Cabeceras de Correo**: Detección de servidores SMTP intermedios, validación SPF/DKIM, mapa de la trayectoria mundial del mensaje y representación en una línea de tiempo vertical de saltos.
* **Reportes PDF**: Generación y exportación instantánea de reportes en PDF para Sherlock, metadatos EXIF y auditoría web.
* **Comandos Linux**: Referencia rápida de comandos útiles en sistemas operativos UNIX para tareas forenses.
* **Google Dorks**: Asistente para construir consultas de indexación de Google avanzadas (logins, bases de datos expuestas, ficheros de configuración).
* **Auditoría Web**: Fingerprint de tecnologías de desarrollo, listado de subdominios, análisis SSL con días restantes, calificación de cabeceras HTTP y escáner de puertos.
* **Crypto Box & Esteganografia (LSB)**: Cifrado simétrico de texto (AES-GCM, RC4, XOR, Vigenère) e incrustación de mensajes cifrados en píxeles de imágenes PNG, permitiendo descifrarlos únicamente al subir la imagen portadora con su respectivo método y contraseña.

---

## Instalacion Local

### Requisitos
* Node.js (v18+)
* Python 3 (requerido únicamente para el rastreo de Sherlock en local)

### Ejecucion de comandos
1. Clona el repositorio e ingresa a la carpeta:
   ```bash
   git clone https://github.com/alberto2005-coder/aegis-osint-suite.git
   cd aegis-osint-suite
   ```
2. Instala las dependencias necesarias:
   ```bash
   npm install
   ```
3. Arranca la aplicación local:
   ```bash
   npm start
   ```
4. Navega a `http://localhost:3000` en tu explorador.

---

## Uso con Docker

El proyecto incluye un entorno preconfigurado dentro de un contenedor Alpine Linux con el demonio de Tor y la instalación de Sherlock lista.

1. Construye la imagen de contenedor:
   ```bash
   docker build -t aegis-osint .
   ```
2. Inicia el contenedor exponiendo el puerto de red:
   ```bash
   docker run -d -p 3000:3000 --name aegis aegis-osint
   ```
3. Accede a `http://localhost:3000`. Las consultas de red que utilicen Tor serán enrutadas internamente en el contenedor de forma automática.

---

## Despliegue en la Nube

La aplicación escucha dinámicamente en el puerto indicado por la variable de entorno `PORT` (`process.env.PORT || 3000`).

### PaaS (Railway, Render, Fly.io, Heroku)
Conecta tu repositorio de GitHub y define las siguientes variables:
* **Entorno**: Node.js
* **Build Command**: `npm install`
* **Start Command**: `npm start`
* **Nota**: Si tu proveedor soporta despliegues con Docker, selecciona utilizar el `Dockerfile` directamente para asegurar que las dependencias de Python y el servicio de Tor arranquen de forma correcta en producción.

### Servidores Virtuales (VPS Ubuntu/Debian) con PM2
Si deseas alojar la aplicación de forma persistente en un servidor dedicado:
```bash
# Instalacion de software
sudo apt update && sudo apt install -y nodejs npm python3 python3-pip tor
sudo npm install -g pm2
python3 -m pip install sherlock-project

# Despliegue e inicio de servicio
git clone https://github.com/alberto2005-coder/aegis-osint-suite.git
cd aegis-osint-suite
npm install
pm2 start server.js --name "aegis"
pm2 save
pm2 startup
```

---

## Gestion de Recursos

Para garantizar estabilidad operativa y evitar superar límites de memoria en servidores con recursos limitados (como las instancias gratuitas de 512MB RAM):

* **Limpieza en desconexión**: El backend escucha el evento `req.on('close')`. Si el usuario interrumpe un escaneo o cierra la pestaña, el subproceso de Sherlock asociado se finaliza de inmediato (`SIGTERM`).
* **Watchdog de Timeout**: Cada escaneo de Sherlock tiene asignado un temporizador de 120 segundos. Al expirar este plazo, el proceso hijo se termina forzosamente (`SIGKILL`) para liberar recursos de la memoria RAM del servidor.

---

## Stack Tecnologico

* **Front-End**: HTML5 / CSS3 (diseño glassmorphism responsivo), JavaScript Vanilla, Leaflet.js (mapeado de geolocalización), jsPDF (generación de informes).
* **Back-End**: Node.js, Express, Axios.
* **Criptografia**: Web Crypto API (SubtleCrypto para AES-GCM), Canvas API (lectura/escritura de canales RGB para esteganografía LSB).

---

## Descargo de Responsabilidad

Este proyecto ha sido desarrollado con fines exclusivamente educativos, de aprendizaje y de auditoría de seguridad personal (autorizada). El uso de esta herramienta para realizar actividades maliciosas, espionaje, acoso o accesos no autorizados a sistemas de terceros está estrictamente prohibido y puede ser constitutivo de delito penal. 

El creador de esta herramienta no se hace responsable del uso indebido, ilegal o negligente que terceras personas puedan hacer de este software. La responsabilidad recae única y exclusivamente sobre el usuario final.