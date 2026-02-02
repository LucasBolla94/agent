import type { AuditLogger } from "../audit/auditLogger.js";

export type Channel = "whatsapp" | "tui";
export type RiskLevel = "low" | "medium" | "high";

export type ToolContext = {
  user: string;
  channel: Channel;
  adminMode: boolean;
  logger: AuditLogger;
};

export type ToolResult = {
  ok: boolean;
  output: string;
};

export type ToolHandler = (input: unknown, ctx: ToolContext) => Promise<ToolResult>;

export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  riskLevel: RiskLevel;
  handler: ToolHandler;
};
