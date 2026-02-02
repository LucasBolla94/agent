import type { AuditLogger } from "../audit/auditLogger.js";
import type { Channel, ToolContext } from "./types.js";
import { checkPolicy } from "./policy.js";
import { ToolRegistry } from "./toolRegistry.js";

type RouterRequest = {
  text: string;
  user: string;
  channel: Channel;
};

type RouterResponse = {
  text: string;
};

export class Router {
  private registry: ToolRegistry;
  private logger: AuditLogger;
  private authNumbers: string[];

  constructor(registry: ToolRegistry, logger: AuditLogger, authNumbers: string[]) {
    this.registry = registry;
    this.logger = logger;
    this.authNumbers = authNumbers;
  }

  async handleMessage(req: RouterRequest): Promise<RouterResponse> {
    const normalized = req.text.trim();
    const { adminMode, cleanedText } = extractAdminMode(normalized);

    if (!this.isAuthorized(req.user, req.channel)) {
      this.logger.log({
        time: new Date().toISOString(),
        user: req.user,
        channel: req.channel,
        intent: "unauthorized",
        actions: [],
        success: false
      });
      return { text: "Not authorized." };
    }

    const intent = parseIntent(cleanedText);
    if (!intent) {
      this.logger.log({
        time: new Date().toISOString(),
        user: req.user,
        channel: req.channel,
        intent: "unknown",
        actions: [],
        success: true
      });
      return { text: "AgentTUR online. Try: mode:admin shell: ls" };
    }

    const tool = this.registry.get(intent.tool);
    if (!tool) {
      this.logger.log({
        time: new Date().toISOString(),
        user: req.user,
        channel: req.channel,
        intent: intent.tool,
        actions: [],
        success: false
      });
      return { text: `Unknown tool: ${intent.tool}` };
    }

    const policy = checkPolicy(tool, intent.input, adminMode);
    if (!policy.allowed) {
      this.logger.log({
        time: new Date().toISOString(),
        user: req.user,
        channel: req.channel,
        intent: intent.tool,
        actions: [
          {
            tool: intent.tool,
            input: intent.input,
            ok: false,
            error: policy.reason ?? "Policy denied"
          }
        ],
        success: false
      });
      return { text: policy.reason ?? "Policy denied." };
    }

    const ctx: ToolContext = {
      user: req.user,
      channel: req.channel,
      adminMode,
      logger: this.logger
    };

    try {
      const result = await tool.handler(intent.input, ctx);
      this.logger.log({
        time: new Date().toISOString(),
        user: req.user,
        channel: req.channel,
        intent: intent.tool,
        actions: [
          {
            tool: intent.tool,
            input: intent.input,
            ok: result.ok,
            error: result.ok ? undefined : result.output
          }
        ],
        success: result.ok
      });
      return { text: result.output };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error.";
      this.logger.log({
        time: new Date().toISOString(),
        user: req.user,
        channel: req.channel,
        intent: intent.tool,
        actions: [
          {
            tool: intent.tool,
            input: intent.input,
            ok: false,
            error: message
          }
        ],
        success: false
      });
      return { text: `Error: ${message}` };
    }
  }

  private isAuthorized(user: string, channel: Channel): boolean {
    if (channel === "tui") {
      return true;
    }
    return this.authNumbers.includes(user);
  }
}

function extractAdminMode(text: string): { adminMode: boolean; cleanedText: string } {
  if (text.toLowerCase().startsWith("mode:admin")) {
    const cleanedText = text.slice("mode:admin".length).trimStart();
    return { adminMode: true, cleanedText };
  }
  return { adminMode: false, cleanedText: text };
}

function parseIntent(text: string): { tool: string; input: unknown } | null {
  if (text.toLowerCase().startsWith("shell:")) {
    return { tool: "shell", input: { command: text.slice("shell:".length).trim() } };
  }
  if (text.toLowerCase().startsWith("/sh ")) {
    return { tool: "shell", input: { command: text.slice(4).trim() } };
  }
  return null;
}
