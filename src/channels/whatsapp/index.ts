import makeWASocket, {
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  getContentType,
  DisconnectReason
} from "@whiskeysockets/baileys";
import pino from "pino";
import qrcode from "qrcode-terminal";
import type { Router } from "../../core/router.js";
import fs from "node:fs";

export async function startWhatsAppChannel(
  router: Router,
  authDir: string,
  authNumbers: string[]
): Promise<void> {
  await runSocket(router, authDir, authNumbers);
}

async function runSocket(
  router: Router,
  authDir: string,
  authNumbers: string[]
): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" })
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log("QR Code para conexao WhatsApp (escaneie com o celular):");
      qrcode.generate(qr, { small: true });
    }
    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } })?.output
        ?.statusCode;
      if (statusCode === DisconnectReason.loggedOut) {
        console.log("WhatsApp desconectado pelo telefone. Gerando novo QR...");
        resetAuth(authDir);
        setTimeout(() => {
          runSocket(router, authDir, authNumbers).catch((err) => {
            console.log(`Falha ao reiniciar WhatsApp: ${String(err)}`);
          });
        }, 1500);
        return;
      }
      console.log("Conexao com WhatsApp perdida. Tentando reconectar...");
    }
    if (connection === "open") {
      console.log("WhatsApp conectado.");
      await notifyAuthorizedUsers(sock, authNumbers);
    }
  });

  sock.ev.on("messages.upsert", async (msg) => {
    if (msg.type !== "notify") return;
    for (const message of msg.messages) {
      if (!message.message || message.key.fromMe) continue;
      const jid = message.key.remoteJid;
      if (!jid) continue;
      const user = jid.split("@")[0];
      const text = extractText(message.message);
      if (!text) continue;

      const response = await router.handleMessage({
        text,
        user,
        channel: "whatsapp"
      });

      await sock.sendMessage(jid, { text: response.text });
    }
  });

  console.log("WhatsApp pronto. Se aparecer QR, escaneie com o celular.");
}

function extractText(message: unknown): string | null {
  const type = getContentType(message as Record<string, unknown>);
  if (!type) return null;
  const content = (message as Record<string, unknown>)[type] as unknown;
  if (!content) return null;

  if (type === "conversation" && typeof content === "string") {
    return content;
  }
  if (type === "extendedTextMessage") {
    const text = (content as { text?: unknown }).text;
    return typeof text === "string" ? text : null;
  }
  if (type === "imageMessage" || type === "videoMessage") {
    const caption = (content as { caption?: unknown }).caption;
    return typeof caption === "string" ? caption : null;
  }

  return null;
}

async function notifyAuthorizedUsers(
  sock: ReturnType<typeof makeWASocket>,
  authNumbers: string[]
): Promise<void> {
  const text = "Turion conectado com sucesso. Tudo pronto para usar.";
  for (const number of authNumbers) {
    const jid = `${number}@s.whatsapp.net`;
    try {
      await sock.sendMessage(jid, { text });
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown";
      console.log(`Falha ao notificar ${number}: ${message}`);
    }
  }
}

function resetAuth(authDir: string): void {
  try {
    if (fs.existsSync(authDir)) {
      fs.rmSync(authDir, { recursive: true, force: true });
      fs.mkdirSync(authDir, { recursive: true });
    } else {
      fs.mkdirSync(authDir, { recursive: true });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.log(`Falha ao limpar sessao do WhatsApp: ${message}`);
  }
}
