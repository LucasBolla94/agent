import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

export type EnvConfig = {
  nodeEnv: string;
  authNumbers: string[];
  auditLogPath: string;
  waAuthDir: string;
  enableWhatsapp: boolean;
  enableTui: boolean;
};

export function loadEnv(): EnvConfig {
  dotenv.config();

  const nodeEnv = process.env.NODE_ENV ?? "development";
  const authNumbersRaw = process.env.AUTH_NUMBERS ?? "";
  const authNumbers = authNumbersRaw
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);

  if (authNumbers.length === 0) {
    throw new Error("AUTH_NUMBERS is required (comma-separated international numbers).");
  }

  const auditLogPath = process.env.AUDIT_LOG_PATH ?? "./data/audit.log.jsonl";
  const waAuthDir = process.env.WA_AUTH_DIR ?? "./data/wa_auth";
  const enableWhatsapp = (process.env.ENABLE_WHATSAPP ?? "true") === "true";
  const enableTui = (process.env.ENABLE_TUI ?? "true") === "true";

  ensureDir(path.dirname(auditLogPath));
  ensureDir(waAuthDir);

  return {
    nodeEnv,
    authNumbers,
    auditLogPath,
    waAuthDir,
    enableWhatsapp,
    enableTui
  };
}

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
