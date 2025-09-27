# 🚀 Servidor WhatsApp CorteZapp

Servidor dedicado para envio de notificações via WhatsApp usando WhatsApp Web.js.

## 📋 Pré-requisitos

- Node.js 18+
- NPM ou Yarn
- VPS ou servidor local (não funciona na Vercel)

## 🛠️ Instalação

1. **Clone ou baixe os arquivos**
2. **Instale as dependências:**

   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente (opcional):**
   ```bash
   cp env.example .env
   ```

## 🚀 Como usar

### 1. Subir o Servidor

```bash
npm start
```

Ou para desenvolvimento:

```bash
npm run dev
```

### 2. Autenticar a Sessão

1. **QR Code no Console**: O QR Code aparecerá automaticamente no console quando o servidor iniciar
2. **QR Code na Web**: Acesse `http://localhost:3003/qr` para ver o QR Code no navegador
3. **Escaneie o QR Code** com o WhatsApp do número que será usado
4. A sessão fica salva automaticamente na pasta `.wwebjs_auth`

### 3. Verificar Status

Acesse: `http://localhost:3003/status`

Deve retornar:

```json
{
  "ready": true,
  "authenticated": true,
  "phone": "5511999999999",
  "name": "Seu Nome"
}
```

### 4. Enviar Mensagem de Teste

```bash
curl -X POST http://localhost:3003/send \
  -H "Content-Type: application/json" \
  -d '{"to":"+5585999999999","text":"Mensagem de teste"}'
```

## 📡 Endpoints da API

### GET `/`

Informações gerais do servidor

### GET `/status`

Status do WhatsApp (ready, phone, etc.)

### GET `/qr`

QR Code para autenticação (apenas quando não conectado)

### GET `/info`

Informações detalhadas do cliente WhatsApp

### POST `/send`

Enviar mensagem

```json
{
  "to": "+5585999999999",
  "text": "Sua mensagem aqui"
}
```

### POST `/send-test`

Enviar mensagem de teste

```json
{
  "to": "+5585999999999"
}
```

## 🔧 Configuração para Produção

### Usando PM2

```bash
npm install -g pm2
npm run pm2
```

### Usando Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3003
CMD ["npm", "start"]
```

## ⚠️ Importante

- **Não funciona na Vercel** - precisa de sessão viva
- **Backup da pasta `.wwebjs_auth`** - contém a sessão autenticada
- **Não enviar spam** - use apenas para notificações
- **Volume baixo** - para evitar bloqueios

## 🐛 Troubleshooting

### QR Code não aparece

- Aguarde a inicialização completa
- Verifique se o WhatsApp Web.js está funcionando

### Mensagem não envia

- Verifique se o número está registrado no WhatsApp
- Confirme se o status está "ready: true"

### Sessão perdida

- Não apague a pasta `.wwebjs_auth`
- Faça backup regularmente

## 📝 Logs

O servidor gera logs detalhados no console:

- 🔄 Inicialização
- 📱 QR Code gerado
- ✅ WhatsApp pronto
- 📤 Mensagens enviadas
- ❌ Erros

## 🔗 Integração com CorteZapp

Para integrar com a aplicação principal, use as rotas HTTP:

```javascript
// Verificar status
const status = await fetch("http://localhost:3003/status");

// Enviar notificação
const result = await fetch("http://localhost:3003/send", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    to: "+5585999999999",
    text: "Sua notificação aqui",
  }),
});
```
