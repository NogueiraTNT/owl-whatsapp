const express = require("express");
const qrcode = require("qrcode");
const qrcodeTerminal = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3003;

// URL base para produção
const getBaseUrl = () => {
  if (process.env.RAILWAY_PRIVATE_DOMAIN) {
    return `https://${process.env.RAILWAY_PRIVATE_DOMAIN}`;
  }
  if (process.env.RAILWAY_STATIC_URL) {
    return process.env.RAILWAY_STATIC_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.HEROKU_APP_NAME) {
    return `https://${process.env.HEROKU_APP_NAME}.herokuapp.com`;
  }
  // Fallback para desenvolvimento local
  return `http://localhost:${PORT}`;
};

const BASE_URL = getBaseUrl();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Estado global do WhatsApp
let client = null;
let isReady = false;
let qrCode = null;
let clientInfo = null;

// Configuração do cliente WhatsApp
const initializeWhatsApp = () => {
  console.log("🔄 Inicializando cliente WhatsApp...");

  client = new Client({
    authStrategy: new LocalAuth({
      clientId: "cortezapp-whatsapp",
      dataPath: "app/.wwebjs_auth",
    }),
    puppeteer: {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-extensions",
        "--disable-default-apps",
        "--disable-sync",
        "--disable-translate",
        "--hide-scrollbars",
        "--metrics-recording-only",
        "--mute-audio",
        "--no-default-browser-check",
        "--safebrowsing-disable-auto-update",
        "--disable-ipc-flooding-protection",
        "--disable-hang-monitor",
        "--disable-prompt-on-repost",
        "--disable-client-side-phishing-detection",
        "--disable-component-extensions-with-background-pages",
        "--disable-background-networking",
        "--disable-default-apps",
        "--disable-sync",
        "--disable-translate",
        "--hide-scrollbars",
        "--metrics-recording-only",
        "--mute-audio",
        "--no-default-browser-check",
        "--safebrowsing-disable-auto-update",
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    },
    // Dica: use 'latest' para evitar quebrar com versão antiga.
    webVersionCache: {
      type: "remote",
      remotePath:
        "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/latest.html",
    },
  });

  // Event: QR Code gerado
  client.on("qr", async (qr) => {
    console.log("📱 QR Code gerado!");
    try {
      qrcodeTerminal.generate(qr, { small: true }); // console
      qrCode = await qrcode.toDataURL(qr); // base64 p/ /qr
      console.log(`🌐 QR pronto em: ${BASE_URL}/qr`);
    } catch (err) {
      console.error("❌ Erro ao gerar QR Code:", err);
    }
  });

  client.on("authenticated", () => {
    console.log("🔐 WhatsApp autenticado com sucesso!");
  });

  client.on("ready", () => {
    isReady = true;
    qrCode = null;
    clientInfo = client.info;
    console.log("✅ WhatsApp está pronto!");
    console.log(`📱 Número: ${clientInfo?.wid?._serialized} (me)`);
    console.log(`👤 Nome: ${clientInfo?.pushname}`);
  });

  client.on("auth_failure", (msg) => {
    console.error("❌ Falha na autenticação:", msg);
    isReady = false;
  });

  client.on("disconnected", (reason) => {
    console.log("🔌 WhatsApp desconectado:", reason);
    isReady = false;
    clientInfo = null;
    // Opcional: reinitialize
    // setTimeout(initializeWhatsApp, 5000)
  });

  client.on("message", (message) => {
    console.log("📨 Mensagem recebida:", {
      from: message.from,
      body:
        (message.body || "").substring(0, 80) +
        ((message.body || "").length > 80 ? "..." : ""),
      ts: new Date().toLocaleString("pt-BR"),
    });
  });

  client.initialize();
};

// Helpers
const normalizeDigits = (input) => input.replace(/[^\d]/g, ""); // só dígitos

// Rotas da API
app.get("/", (req, res) => {
  res.json({
    message: "Servidor WhatsApp CorteZapp",
    status: isReady ? "ready" : "initializing",
    version: "1.0.1",
    endpoints: {
      status: "/status",
      qr: "/qr",
      send: "/send (POST)",
      info: "/info",
    },
  });
});

app.get("/status", (req, res) => {
  res.json({
    ready: isReady,
    authenticated: !!clientInfo,
    me: clientInfo?.wid?._serialized || null,
    phone: clientInfo?.wid?.user || null,
    name: clientInfo?.pushname || null,
    timestamp: new Date().toISOString(),
  });
});

app.get("/qr", (req, res) => {
  if (isReady) {
    return res.send(`
      <html><body style="font-family:sans-serif">
        <h3>✅ WhatsApp já está conectado</h3>
        <p>Número: ${clientInfo?.wid?.user || "-"}</p>
      </body></html>
    `);
  }
  if (!qrCode) {
    return res.send(`
      <html><body style="font-family:sans-serif">
        <h3>QR Code não disponível. Aguarde a inicialização.</h3>
      </body></html>
    `);
  }
  res.send(`
    <html><body style="display:grid;place-items:center;height:100vh;font-family:sans-serif">
      <div>
        <h3>Escaneie o QR no WhatsApp</h3>
        <img src="${qrCode}" style="width:300px;height:300px"/>
        <p>WhatsApp > Dispositivos conectados > Conectar</p>
      </div>
    </body></html>
  `);
});

app.get("/info", (req, res) => {
  if (!isReady) {
    return res.json({ success: false, message: "WhatsApp não está pronto" });
  }
  res.json({
    success: true,
    info: {
      me: clientInfo?.wid?._serialized,
      phone: clientInfo?.wid?.user,
      name: clientInfo?.pushname,
      platform: clientInfo?.platform,
      battery: clientInfo?.battery,
      locale: clientInfo?.locale,
      isBusiness: clientInfo?.isBusiness,
    },
  });
});

// Enviar mensagem (corrigido)
app.post("/send", async (req, res) => {
  try {
    const { to, text } = req.body;

    if (!to || !text) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros "to" e "text" são obrigatórios',
      });
    }
    if (!isReady) {
      return res.status(503).json({
        success: false,
        error: "WhatsApp não está pronto. Verifique /status",
      });
    }

    // 1) Normaliza e valida número
    const digits = normalizeDigits(to);
    if (digits.length < 10) {
      return res.status(400).json({ success: false, error: "Número inválido" });
    }

    // 2) Descobre o JID correto via getNumberId (evita erro de domínio)
    const numberId = await client.getNumberId(digits);
    if (!numberId) {
      return res
        .status(400)
        .json({ success: false, error: "Esse número não tem WhatsApp" });
    }
    const jid = numberId._serialized; // já vem como 55...@c.us

    // 3) Evita mandar para si mesmo (pode não entregar)
    const me = clientInfo?.wid?._serialized;
    if (jid === me) {
      console.warn(
        "[WARN] Tentando enviar para o próprio número. Teste com outro número para validar entrega."
      );
    }

    // 4) Envia
    const message = await client.sendMessage(jid, text);

    console.log("📤 Mensagem enviada:", {
      to: jid,
      id: message.id._serialized,
      ts: new Date().toISOString(),
    });

    res.json({
      success: true,
      messageId: message.id._serialized,
      to: jid,
      text,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Erro ao enviar mensagem:", error);
    res
      .status(500)
      .json({ success: false, error: error.message || "Erro desconhecido" });
  }
});

// Enviar mensagem de teste
app.post("/send-test", async (req, res) => {
  try {
    const { to } = req.body;
    if (!to)
      return res
        .status(400)
        .json({ success: false, error: 'Parâmetro "to" é obrigatório' });

    const testMessage = `🧪 *CorteZapp - Teste de Conexão*
Servidor WhatsApp funcionando!
📅 ${new Date().toLocaleString("pt-BR")}
Se você recebeu esta mensagem, a integração está OK. ✅
— owl-whatsapp v1.0.1`;

    // Chama a própria rota /send (poderia chamar client direto também)
    const r = await fetch(`${BASE_URL}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, text: testMessage }),
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (error) {
    console.error("❌ Erro no teste:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Middleware de erro
app.use((err, req, res, next) => {
  console.error("❌ Erro no servidor:", err);
  res.status(500).json({ success: false, error: "Erro interno do servidor" });
});

// 404
app.use("*", (req, res) => {
  res.status(404).json({ success: false, error: "Rota não encontrada" });
});

// Inicializar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor WhatsApp rodando na porta ${PORT}`);
  console.log(`🔗 QR:     ${BASE_URL}/qr`);
  console.log(`📊 Status: ${BASE_URL}/status`);
  console.log(`🌐 Base URL: ${BASE_URL}`);
  initializeWhatsApp();
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Encerrando servidor...");
  if (client) client.destroy();
  process.exit(0);
});
process.on("SIGTERM", () => {
  console.log("\n🛑 Encerrando servidor...");
  if (client) client.destroy();
  process.exit(0);
});
