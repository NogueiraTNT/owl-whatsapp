const express = require("express");
const qrcode = require("qrcode");
const qrcodeTerminal = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3003;

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
      dataPath: "./.wwebjs_auth",
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
      ],
    },
    webVersionCache: {
      type: "remote",
      remotePath:
        "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html",
    },
  });

  // Event: QR Code gerado
  client.on("qr", async (qr) => {
    console.log("📱 QR Code gerado!");
    console.log("🔗 Acesse: http://localhost:" + PORT + "/qr");
    console.log("📱 Ou escaneie o QR Code abaixo:");
    console.log("=".repeat(50));

    try {
      // Gerar QR Code para console
      qrcodeTerminal.generate(qr, { small: true });

      // Gerar QR Code para web
      qrCode = await qrcode.toDataURL(qr);
      console.log("=".repeat(50));
      console.log("✅ QR Code convertido para base64");
      console.log(
        "🌐 QR Code também disponível em: http://localhost:" + PORT + "/qr"
      );
    } catch (err) {
      console.error("❌ Erro ao gerar QR Code:", err);
    }
  });

  // Event: Cliente autenticado
  client.on("authenticated", () => {
    console.log("🔐 WhatsApp autenticado com sucesso!");
  });

  // Event: Cliente pronto
  client.on("ready", () => {
    isReady = true;
    qrCode = null;
    clientInfo = client.info;
    console.log("✅ WhatsApp está pronto!");
    console.log(`📱 Número: ${clientInfo?.wid?.user}`);
    console.log(`👤 Nome: ${clientInfo?.pushname}`);
  });

  // Event: Falha na autenticação
  client.on("auth_failure", (msg) => {
    console.error("❌ Falha na autenticação:", msg);
    isReady = false;
  });

  // Event: Desconectado
  client.on("disconnected", (reason) => {
    console.log("🔌 WhatsApp desconectado:", reason);
    isReady = false;
    clientInfo = null;
  });

  // Event: Mensagem recebida
  client.on("message", (message) => {
    console.log("📨 Mensagem recebida:", {
      from: message.from,
      body:
        message.body.substring(0, 50) + (message.body.length > 50 ? "..." : ""),
      timestamp: new Date().toLocaleString("pt-BR"),
    });
  });

  // Inicializar cliente
  client.initialize();
};

// Rotas da API

// Rota principal
app.get("/", (req, res) => {
  res.json({
    message: "Servidor WhatsApp CorteZapp",
    status: isReady ? "ready" : "initializing",
    version: "1.0.0",
    endpoints: {
      status: "/status",
      qr: "/qr",
      send: "/send (POST)",
      info: "/info",
    },
  });
});

// Status do WhatsApp
app.get("/status", (req, res) => {
  res.json({
    ready: isReady,
    authenticated: !!clientInfo,
    phone: clientInfo?.wid?.user || null,
    name: clientInfo?.pushname || null,
    timestamp: new Date().toISOString(),
  });
});

// QR Code para autenticação
app.get("/qr", (req, res) => {
  if (isReady) {
    return res.json({
      success: true,
      message: "WhatsApp já está conectado",
      ready: true,
      phone: clientInfo?.wid?.user,
    });
  }

  if (!qrCode) {
    return res.json({
      success: false,
      message: "QR Code não disponível. Aguarde a inicialização.",
      ready: false,
    });
  }

  res.json({
    success: true,
    qrCode: qrCode,
    ready: false,
    message: "Escaneie o QR Code com seu WhatsApp",
  });
});

// Informações do cliente
app.get("/info", (req, res) => {
  if (!isReady) {
    return res.json({
      success: false,
      message: "WhatsApp não está pronto",
    });
  }

  res.json({
    success: true,
    info: {
      phone: clientInfo?.wid?.user,
      name: clientInfo?.pushname,
      platform: clientInfo?.platform,
      battery: clientInfo?.battery,
      locale: clientInfo?.locale,
      isBusiness: clientInfo?.isBusiness,
    },
  });
});

// Enviar mensagem
app.post("/send", async (req, res) => {
  try {
    const { to, text, type = "text" } = req.body;

    // Validações
    if (!to || !text) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros "to" e "text" são obrigatórios',
      });
    }

    if (!isReady) {
      return res.status(400).json({
        success: false,
        error: "WhatsApp não está pronto. Verifique o status em /status",
      });
    }

    // Formatar número
    let formattedNumber = to.replace(/[^\d]/g, "");
    if (!formattedNumber.startsWith("55")) {
      formattedNumber = "55" + formattedNumber;
    }
    const chatId = formattedNumber + "@c.us";

    // Verificar se o número existe
    const isRegistered = await client.isRegisteredUser(chatId);
    if (!isRegistered) {
      return res.status(400).json({
        success: false,
        error: "Número não está registrado no WhatsApp",
      });
    }

    // Enviar mensagem
    const message = await client.sendMessage(chatId, text);

    console.log("📤 Mensagem enviada:", {
      to: chatId,
      messageId: message.id._serialized,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      messageId: message.id._serialized,
      to: chatId,
      text: text,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Erro ao enviar mensagem:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Enviar mensagem de teste
app.post("/send-test", async (req, res) => {
  try {
    const { to } = req.body;

    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetro "to" é obrigatório',
      });
    }

    const testMessage = `🧪 *CorteZapp - Teste de Conexão*

Servidor WhatsApp funcionando!
📅 Data: ${new Date().toLocaleString("pt-BR")}

Esta é uma mensagem de teste do sistema de notificações.

Se você recebeu esta mensagem, a integração está funcionando perfeitamente! ✅

---
Servidor: owl-whatsapp v1.0.0`;

    const result = await fetch(`http://localhost:${PORT}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: to,
        text: testMessage,
      }),
    });

    const data = await result.json();
    res.json(data);
  } catch (error) {
    console.error("❌ Erro no teste:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Middleware de erro
app.use((err, req, res, next) => {
  console.error("❌ Erro no servidor:", err);
  res.status(500).json({
    success: false,
    error: "Erro interno do servidor",
  });
});

// Rota 404
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Rota não encontrada",
  });
});

// Inicializar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor WhatsApp rodando na porta ${PORT}`);
  console.log(`📱 Acesse http://localhost:${PORT} para ver os endpoints`);
  console.log(`🔗 QR Code: http://localhost:${PORT}/qr`);
  console.log(`📊 Status: http://localhost:${PORT}/status`);

  // Inicializar WhatsApp
  initializeWhatsApp();
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Encerrando servidor...");
  if (client) {
    client.destroy();
  }
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Encerrando servidor...");
  if (client) {
    client.destroy();
  }
  process.exit(0);
});
