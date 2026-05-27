FROM node:18-alpine

# Instalar tor y dependencias
RUN apk add --no-cache tor

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
