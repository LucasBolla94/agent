import makeWASocket, {
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  useMultiFileAuthState,
  getContentType
} from "@whiskeysockets/baileys";
import pino from "pino";
import type { Router } from "../../core/router.js";

export async function startWhatsAppChannel(
  router: Router,
  authDir: string
): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();
  const store = makeInMemoryStore({ logger: pino({ level: "silent" }) });

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: "silent" })
  });

  store.bind(sock.ev);

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const reason = (lastDisconnect?.error as { message?: string })?.message ?? "unknown";
      console.log(`WhatsApp connection closed: ${reason}`);
    }
    if (connection === "open") {
      console.log("WhatsApp connected.");
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

  console.log("WhatsApp channel ready. Scan the QR code if prompted.");
}

function extractText(message: Record<string, unknown>): string | null {
  const type = getContentType(message);
  if (!type) return null;
  const content = message[type] as unknown;
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
