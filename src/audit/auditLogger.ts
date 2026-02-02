import fs from "node:fs";
import path from "node:path";

export type AuditEntry = {
  time: string;
  user: string;
  channel: "whatsapp" | "tui";
  intent: string;
  actions: Array<{
    tool: string;
    input: unknown;
    ok: boolean;
    error?: string;
  }>;
  success: boolean;
};

export class AuditLogger {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  log(entry: AuditEntry): void {
    const line = JSON.stringify(entry);
    fs.appendFileSync(this.filePath, `${line}\n`, "utf8");
  }
}
