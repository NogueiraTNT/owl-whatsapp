# Dockerfile
FROM node:20-bullseye

# Pacotes que o Chromium precisa
RUN apt-get update && apt-get install -y \
  chromium \
  ca-certificates \
  fonts-liberation \
  libnss3 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libasound2 \
  libpangocairo-1.0-0 \
  libpango-1.0-0 \
  libcairo2 \
  libatspi2.0-0 \
  libx11-xcb1 \
  libxshmfence1 \
  && rm -rf /var/lib/apt/lists/*

# Não baixar o Chromium do Puppeteer (vamos usar o do sistema)
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROMIUM_PATH=/usr/bin/chromium

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

# A porta do Railway vem em $PORT, mas deixo 8080 por padrão
ENV PORT=8080
EXPOSE 8080

CMD ["node", "index.js"]
