import readline from "node:readline";
import type { Router } from "../../core/router.js";

export async function startTuiChannel(router: Router): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
  });

  rl.on("line", async (line) => {
    const response = await router.handleMessage({
      text: line,
      user: "local",
      channel: "tui"
    });
    process.stdout.write(`${response.text}\n`);
  });

  process.stdout.write("TUI channel ready. Type a command.\n");
}
