import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { spawn } from "node:child_process";

type SetupAnswers = {
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
    const authNumbers = await ask(
      rl,
      "1) Quais números do WhatsApp podem usar? (DDI+DDD, separado por vírgula)\n> "
    );
    const enableWhatsapp = await askYesNo(
      rl,
      "2) Ativar WhatsApp? (Y/n)\n> ",
      true
    );
    const enableTui = await askYesNo(
      rl,
      "3) Ativar TUI local (SSH)? (Y/n)\n> ",
      true
    );
    const auditLogPath = await askDefault(
      rl,
      "4) Caminho do audit log (JSONL)? (enter para default)\n> ",
      "./data/audit.log.jsonl"
    );
    const waAuthDir = await askDefault(
      rl,
      "5) Pasta de autenticação do WhatsApp? (enter para default)\n> ",
      "./data/wa_auth"
    );

    const answers: SetupAnswers = {
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
      "6) Deseja iniciar o servidor agora para conectar via QR Code? (Y/n)\n> ",
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
