# Dockerfile
FROM node:18-bullseye-slim

# Instalar dependências do sistema necessárias para o Puppeteer
RUN apt-get update && apt-get install -y \
  wget \
  gnupg \
  ca-certificates \
  procps \
  libxss1 \
  && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
  && apt-get update \
  && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
  && rm -rf /var/lib/apt/lists/*

# Instalar dependências adicionais necessárias
RUN apt-get update && apt-get install -y \
  libgconf-2-4 \
  libgobject-2.0-0 \
  libgconf2-4 \
  libxrandr2 \
  libasound2 \
  libpangocairo-1.0-0 \
  libatk1.0-0 \
  libcairo-gobject2 \
  libgtk-3-0 \
  libgdk-pixbuf2.0-0 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrender1 \
  libxtst6 \
  libglib2.0-0 \
  libnss3 \
  libxss1 \
  libgconf-2-4 \
  libxrandr2 \
  libasound2 \
  libpangocairo-1.0-0 \
  libatk1.0-0 \
  libcairo-gobject2 \
  libgtk-3-0 \
  libgdk-pixbuf2.0-0 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrender1 \
  libxtst6 \
  libglib2.0-0 \
  libnss3 \
  libxss1 \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libdrm2 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libgbm1 \
  libxss1 \
  libgconf-2-4 \
  && rm -rf /var/lib/apt/lists/*

# Configurações do Puppeteer para usar o Chrome instalado
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
ENV CHROME_BIN=/usr/bin/google-chrome-stable

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

# A porta do Railway vem em $PORT, mas deixo 8080 por padrão
ENV PORT=8080
EXPOSE 8080

CMD ["node", "index.js"]
