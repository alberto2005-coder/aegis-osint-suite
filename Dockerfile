FROM node:18-alpine

# Instalar tor, python3 y pip
RUN apk add --no-cache tor python3 py3-pip

# Instalar Sherlock globalmente
RUN python3 -m pip install --break-system-packages sherlock-project

# Configurar Tor para ejecutarse como servicio
RUN echo "SocksPort 9050" > /etc/tor/torrc && \
    echo "RunAsDaemon 1" >> /etc/tor/torrc

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

# Arrancamos tor como demonio y luego iniciamos Node.js
CMD tor -f /etc/tor/torrc && npm start


