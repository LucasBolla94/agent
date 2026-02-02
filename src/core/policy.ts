import type { ToolDefinition } from "./types.js";

export type PolicyDecision = {
  allowed: boolean;
  reason?: string;
};

const DANGEROUS_PATTERNS: RegExp[] = [
  /rm\s+-rf\s+\/(\s|$)/i,
  /\bmkfs(\.|_)?\w*\b/i,
  /\bdd\s+if=/i,
  /\bshutdown\b|\breboot\b/i,
  /\b:\s*\(\)\s*{\s*:\s*\|\s*:\s*;\s*}\s*;/ // fork bomb
];

export function checkPolicy(
  tool: ToolDefinition,
  input: unknown,
  adminMode: boolean
): PolicyDecision {
  if (tool.riskLevel === "high" && !adminMode) {
    return { allowed: false, reason: "Admin mode required for high-risk tools." };
  }

  if (tool.name === "shell") {
    const command = typeof (input as { command?: unknown })?.command === "string"
      ? (input as { command: string }).command
      : "";
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(command)) {
        return { allowed: false, reason: "Command blocked by policy." };
      }
    }
  }

  return { allowed: true };
}
