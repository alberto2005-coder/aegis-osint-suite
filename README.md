# 🛡️ Aegis OSINT Suite & Crypto Box

Aegis OSINT Suite es una plataforma web modular premium de ciberinteligencia, reconocimiento pasivo (OSINT) y criptografía avanzada en tiempo real. Diseñada para analistas de seguridad, investigadores y entusiastas de la privacidad.

---

## 📋 Índice
1. [Características Principales](#-características-principales)
2. [Arquitectura del Proyecto](#-arquitectura-del-proyecto)
3. [Instalación y Uso en Local (Node.js)](#-instalación-y-uso-en-local-nodejs)
4. [Uso con Docker](#-uso-con-docker)
5. [Despliegue en la Nube](#-despliegue-en-la-nube)
6. [Prevención de Fugas de Memoria (Watchdog)](#-prevención-de-fugas-de-memoria-watchdog)
7. [Tecnologías Utilizadas](#-tecnologías-utilizadas)

---

## 🌟 Características Principales

Aegis OSINT Suite se divide en 12 herramientas especializadas accesibles desde la barra lateral:

### 1. 🔍 Buscador de Usuarios (Sherlock)
* Rastrea la presencia de un nombre de usuario en más de 400 plataformas y redes sociales.
* Realiza consultas rápidas en paralelo para redes de alta prioridad (GitHub, Gravatar, Chess.com, etc.).
* Integración de soporte opcional para Tor/Proxies.

### 2. 📧 OSINT de Correos y Filtraciones
* Comprueba si una dirección de correo ha sido expuesta en filtraciones de datos públicas (data breaches).
* Consulta bases de datos de reputación y comportamiento malicioso del remitente.

### 3. 🌐 Dominios / IPs e Infraestructura
* Geolocalización física de direcciones IP y dominios.
* Muestra la ubicación precisa en un mapa interactivo (Leaflet.js).
* Consulta de registros DNS críticos (A, MX, NS).

### 4. 📞 OSINT de Teléfonos
* Análisis de números de teléfono para identificar el código de país, operador de red móvil asignado, validez y formato internacional.

### 5. 👤 Nombres y Rostros
* Genera búsquedas estructuradas de nombres y consultas inversas de rostros en motores de búsqueda de imágenes especializados.

### 6. 📷 Extractor de Metadatos EXIF
* Analiza imágenes (JPEG/JPG) en busca de metadatos ocultos.
* Extrae el modelo de cámara/móvil, fecha de captura, software y coordenadas GPS.
* **Mapa de EXIF**: Muestra el punto exacto donde se tomó la foto en un mapa de Leaflet.
* **Limpiador EXIF**: Descarga una copia de la imagen completamente limpia de metadatos para preservar la privacidad.

### 7. ✉️ Analizador de Cabeceras de Correo (SMTP Path)
* Analiza las cabeceras técnicas de un correo electrónico para trazar la ruta de servidores SMTP.
* **Diagrama Visual de Hops**: Dibuja una línea de tiempo vertical interactiva desde el servidor de origen hasta el de destino.
* Dibuja la ruta geográfica en un mapamundi dinámico.
* Comprueba firmas DKIM y registros SPF.

### 8. 📄 Reportes PDF Profesionales
* Permite exportar informes institucionales de Aegis OSINT Suite en PDF con un formato estructurado y firma de seguridad.
* Disponible en las secciones de **Buscador de Usuarios**, **Metadatos EXIF** y **Auditoría Web**.

### 9. 🐧 Referencia de Comandos Linux
* Una guía de referencia rápida para analistas de comandos comunes en auditoría de sistemas e investigación forense.

### 10. 🕸️ Generador de Google Dorks
* Diseña operadores de búsqueda avanzada para Google Dorking estructurado, facilitando la detección de:
  * Paneles de login expuestos.
  * Archivos de configuración `.env` o bases de datos `.sql`.
  * Listados de directorios abiertos (Index Of).

### 11. 🛡️ Auditoría Web Completa
* Análisis de seguridad profunda para cualquier dominio:
  * Localización e IP del hosting representada en el mapa de auditoría.
  * Análisis de validez del certificado SSL y tiempo restante en días.
  * Calificación (Mozilla Observatory) de directivas de seguridad web (HSTS, CSP, X-Frame-Options).
  * Escáner de puertos comunes vulnerables o abiertos (21, 22, 80, 443, 8080, etc.).
  * Listado de tecnologías expuestas (CMS, Frameworks JS, CDN).
  * Extracción de subdominios registrados en certificados de transparencia pública.

### 12. 🔑 Crypto Box & Esteganografía
* **Cifrado/Descifrado**: Permite cifrar y descifrar textos usando claves secretas bajo múltiples algoritmos:
  * **AES-GCM (Nativo del Navegador)**: Cifrado simétrico moderno de nivel militar con sal (Salt) y vector de inicialización (IV), codificado en Base64.
  * **RC4**: Cifrado clásico por flujo en Hexadecimal.
  * **XOR**: Operación XOR bit a bit con clave cíclica en Hexadecimal.
  * **Vigenère**: Desplazamiento polialfabético a nivel de bytes compatible con caracteres UTF-8.
* **Esteganografía LSB (Least Significant Bit)**: Permite ocultar el mensaje cifrado en los píxeles de cualquier imagen sin alterar su visualización. El receptor puede extraer y descifrar el mensaje únicamente si proporciona la imagen PNG descargada, el algoritmo correspondiente y la clave correcta.

---

## 💻 Instalación y Uso en Local (Node.js)

### Requisitos previos
* [Node.js](https://nodejs.org/) (versión 18 o superior recomendado)
* [Python 3](https://www.python.org/) (necesario para el buscador Sherlock)

### Pasos para iniciar
1. Clona este repositorio o descarga los archivos en tu PC.
2. Abre la terminal en el directorio del proyecto.
3. Instala las dependencias del servidor:
   ```bash
   npm install
   ```
4. Inicia la aplicación:
   ```bash
   npm start
   ```
5. Abre en tu navegador la dirección: [http://localhost:3000](http://localhost:3000)

---

## 🐳 Uso con Docker

El proyecto incluye un `Dockerfile` optimizado basado en Alpine Linux que incluye Tor y Sherlock preconfigurados.

### Pasos para ejecutar en Docker:

1. **Construir la imagen de Docker**:
   ```bash
   docker build -t aegis-osint-suite .
   ```
2. **Ejecutar el contenedor**:
   ```bash
   docker run -d -p 3000:3000 --name aegis-container aegis-osint-suite
   ```
3. Accede a la aplicación en [http://localhost:3000](http://localhost:3000). El contenedor se encargará de ejecutar el servicio de Tor en segundo plano para las consultas que requieran anonimato y proveerá el ambiente Python para Sherlock de forma aislada.

---

## ☁️ Despliegue en la Nube

El proyecto es totalmente compatible con múltiples servicios de alojamiento en la nube, ya que gestiona de manera dinámica el puerto mediante la variable de entorno `PORT` (`process.env.PORT || 3000`).

### Opción A: Plataformas PaaS (Render, Railway, Fly.io, Heroku)
Estas plataformas permiten desplegar el código directamente conectando tu repositorio de GitHub:

1. Crea un nuevo servicio web (Web Service) en el panel de tu plataforma.
2. Conecta el repositorio del proyecto.
3. Define los siguientes parámetros de ejecución:
   * **Entorno (Runtime)**: `Node` (versión 18 o superior)
   * **Comando de Construcción (Build Command)**: `npm install`
   * **Comando de Arranque (Start Command)**: `npm start`
4. Si la plataforma soporta despliegues basados en Docker (como **Fly.io** o **Railway**), puedes seleccionar la opción de desplegar usando el `Dockerfile` adjunto, lo cual configurará de forma automatizada el entorno de Python y el servicio Tor.

### Opción B: Despliegue en VPS (Ubuntu, Debian) mediante PM2
Para desplegar de manera persistente en tu propio servidor virtual privado (VPS):

1. Conéctate a tu VPS y clona el repositorio:
   ```bash
   git clone https://github.com/tu-usuario/aegis-osint-suite.git
   cd aegis-osint-suite
   ```
2. Instala Node.js, Python, Tor y el gestor de procesos `pm2`:
   ```bash
   sudo apt update
   sudo apt install -y nodejs npm python3 python3-pip tor
   sudo npm install -g pm2
   ```
3. Instala Sherlock de manera global en el VPS:
   ```bash
   python3 -m pip install sherlock-project
   ```
4. Inicia la aplicación con PM2 para asegurar que corra en segundo plano y se reinicie ante fallos:
   ```bash
   pm2 start server.js --name "aegis-osint"
   pm2 save
   pm2 startup
   ```

### Opción C: Servicios de Contenedores (GCP Cloud Run, AWS ECS, DigitalOcean)
Puedes empaquetar y subir el contenedor usando el `Dockerfile` provisto:
* **DigitalOcean App Platform**: Selecciona "Deploy from Docker Image" y asocia tu repositorio.
* **Google Cloud Run**: Sube la imagen a Artifact Registry y arráncala exponiendo el puerto `3000`. El contenedor autoejecutará el demonio de Tor y levantará el servidor Node.js en paralelo.

---

## 🛡️ Prevención de Fugas de Memoria (Watchdog)

La suite cuenta con medidas de seguridad avanzadas en el archivo [server.js](file:///c:/Users/alors/Downloads/osint_completo/server.js) para evitar consumir recursos y prevenir caídas de memoria RAM (límite de 512MB en Render):

* **Matado en Desconexión**: Si un usuario recarga la página, cancela el escaneo o cierra la pestaña, el backend de Node captura el evento `req.on('close')` y mata inmediatamente el proceso de Sherlock en segundo plano (`SIGTERM`).
* **Temporizador Watchdog**: Cada búsqueda tiene un límite estricto de **120 segundos**. Si por problemas de red o proxies caídos la consulta de Sherlock excede este tiempo, el watchdog mata el proceso (`SIGKILL`) para liberar memoria del contenedor.

---

## 🛠️ Tecnologías Utilizadas

* **Front-End**: HTML5, Vanilla CSS (diseño premium responsivo con glassmorphism y animaciones), JavaScript modular.
* **Librerías Visuales**: Leaflet.js (Mapas interactivos), FontAwesome 6 (iconografía).
* **Exportador de Informes**: jsPDF (vía CDN).
* **Back-End**: Node.js, Express, Axios.
* **Criptografía**: Web Crypto API (SubtleCrypto nativa del navegador), implementaciones JS puras para ciphers clásicos y Canvas API para esteganografía de imagen.
* **OSINT Engines**: Sherlock (Python3).
