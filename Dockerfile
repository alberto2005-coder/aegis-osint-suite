# Node 24 LTS: soporte de seguridad hasta abril de 2028.
# Node 18 (y 20) ya estan fuera de soporte (EOL).
FROM node:24-alpine

# Instalar tor, python3 y pip + usuario sin privilegios
RUN apk add --no-cache tor python3 py3-pip && \
    addgroup -S aegis && adduser -S aegis -G aegis

# Instalar Sherlock + Maigret globalmente
RUN python3 -m pip install --no-cache-dir --break-system-packages sherlock-project maigret

# Configurar Tor (SocksPort local + directorio de datos escribible por el usuario de la app)
RUN mkdir -p /var/lib/tor && \
    printf 'SocksPort 9050\nDataDirectory /var/lib/tor\n' > /etc/tor/torrc && \
    chown -R aegis:aegis /var/lib/tor && \
    chmod 700 /var/lib/tor

WORKDIR /usr/src/app

# Instalacion reproducible a partir del lockfile (sin dependencias de desarrollo)
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Ejecutar como usuario sin privilegios (ya creado arriba)
RUN chown -R aegis:aegis /usr/src/app
USER aegis

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3000/ping || exit 1

# Arrancamos tor en segundo plano y Node.js en primer plano (PID 1 via exec)
CMD ["sh", "-c", "tor -f /etc/tor/torrc & exec node server.js"]
