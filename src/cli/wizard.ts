import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { spawn } from "node:child_process";

type SetupAnswers = {
  ownerNumber: string;
  authNumbers: string;
  enableWhatsapp: boolean;
  enableTui: boolean;
  auditLogPath: string;
  waAuthDir: string;
};

export async function runSetupWizard(): Promise<void> {
  console.log("Bem-vindo ao setup do AgentTUR.");
  console.log("Vamos configurar passo a passo.\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
  });

  try {
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const action = await askDefault(
        rl,
        "0) Ja existe configuracao. Escolha: (1) Reconfigurar (2) Zerar tudo (3) Cancelar\n> ",
        "1"
      );
      if (action === "3") {
        console.log("Setup cancelado.");
        return;
      }
      if (action === "2") {
        resetAll(envPath);
        console.log("Configuracao anterior apagada.");
      }
    }

    const ownerNumber = await ask(
      rl,
      "1) Numero do DONO (WhatsApp, formato internacional, sem +)\n> "
    );
    const extraNumbers = await ask(
      rl,
      "2) Outros numeros autorizados (opcional, separados por virgula)\n> "
    );
    const authNumbers = mergeNumbers(ownerNumber, extraNumbers);
    const enableWhatsapp = await askYesNo(
      rl,
      "3) Ativar WhatsApp? (Y/n)\n> ",
      true
    );
    const enableTui = await askYesNo(
      rl,
      "4) Ativar TUI local (SSH)? (Y/n)\n> ",
      true
    );
    const auditLogPath = await askDefault(
      rl,
      "5) Caminho do audit log (JSONL)? (enter para default)\n> ",
      "./data/audit.log.jsonl"
    );
    const waAuthDir = await askDefault(
      rl,
      "6) Pasta de autenticacao do WhatsApp? (enter para default)\n> ",
      "./data/wa_auth"
    );

    const answers: SetupAnswers = {
      ownerNumber,
      authNumbers,
      enableWhatsapp,
      enableTui,
      auditLogPath,
      waAuthDir
    };

    writeEnvFile(answers);
    console.log("\nArquivo .env criado com sucesso.");

    const startNow = await askYesNo(
      rl,
      "7) Deseja iniciar o servidor agora para conectar via QR Code? (Y/n)\n> ",
      true
    );

    if (startNow) {
      await startServer();
    } else {
      console.log("Pronto. Quando quiser iniciar: npm run start (ou node dist/index.js).");
    }
  } finally {
    rl.close();
  }
}

function writeEnvFile(answers: SetupAnswers): void {
  const lines = [
    `OWNER_NUMBER="${answers.ownerNumber}"`,
    `AUTH_NUMBERS="${answers.authNumbers}"`,
    `ENABLE_WHATSAPP="${answers.enableWhatsapp}"`,
    `ENABLE_TUI="${answers.enableTui}"`,
    `AUDIT_LOG_PATH="${answers.auditLogPath}"`,
    `WA_AUTH_DIR="${answers.waAuthDir}"`
  ];

  const envPath = path.join(process.cwd(), ".env");
  fs.writeFileSync(envPath, lines.join("\n") + "\n", "utf8");
}

async function startServer(): Promise<void> {
  const distPath = path.join(process.cwd(), "dist", "index.js");
  if (!fs.existsSync(distPath)) {
    console.log("Build não encontrado. Rode: npm run build");
    return;
  }

  console.log("\nIniciando servidor...");
  console.log("Se for a primeira vez, o QR Code vai aparecer aqui.");

  const child = spawn("node", [distPath], { stdio: "inherit" });
  await new Promise<void>((resolve) => {
    child.on("exit", () => resolve());
  });
}

function ask(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => rl.question(prompt, (answer) => resolve(answer.trim())));
}

function mergeNumbers(ownerNumber: string, extraNumbers: string): string {
  const set = new Set<string>();
  if (ownerNumber.trim()) set.add(ownerNumber.trim());
  extraNumbers
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean)
    .forEach((n) => set.add(n));
  return Array.from(set).join(",");
}

function resetAll(envPath: string): void {
  if (fs.existsSync(envPath)) {
    fs.rmSync(envPath, { force: true });
  }
  const dataDir = path.join(process.cwd(), "data");
  if (fs.existsSync(dataDir)) {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
}

async function askDefault(
  rl: readline.Interface,
  prompt: string,
  defaultValue: string
): Promise<string> {
  const answer = await ask(rl, prompt);
  return answer || defaultValue;
}

async function askYesNo(
  rl: readline.Interface,
  prompt: string,
  defaultValue: boolean
): Promise<boolean> {
  const answer = (await ask(rl, prompt)).toLowerCase();
  if (!answer) return defaultValue;
  return answer === "y" || answer === "yes" || answer === "s" || answer === "sim";
}
