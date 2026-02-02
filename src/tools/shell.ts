import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { ToolDefinition } from "../core/types.js";

const execAsync = promisify(exec);

export const shellTool: ToolDefinition = {
  name: "shell",
  description: "Run a shell command on the server",
  inputSchema: {
    type: "object",
    properties: {
      command: { type: "string" }
    },
    required: ["command"]
  },
  riskLevel: "high",
  handler: async (input) => {
    const command = typeof (input as { command?: unknown })?.command === "string"
      ? (input as { command: string }).command
      : "";

    if (!command) {
      return { ok: false, output: "Missing command." };
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 30_000,
        maxBuffer: 1_000_000
      });
      const output = [stdout, stderr].filter(Boolean).join("\n").trim();
      return { ok: true, output: output || "Command completed." };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Shell error.";
      return { ok: false, output: message };
    }
  }
};
