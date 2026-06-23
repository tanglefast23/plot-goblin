import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { afterEach, describe, expect, it } from "vitest";

let bridgeProcess: ChildProcess | null = null;

async function availablePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not allocate test port.");
  const port = address.port;
  server.close();
  await once(server, "close");
  return port;
}

async function waitForBridge(port: number) {
  const deadline = Date.now() + 5_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`, {
        headers: { "x-hermes-bridge-token": "bridge-token" },
      });
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  throw new Error("Bridge server did not start.");
}

describe("Hermes bridge server", () => {
  afterEach(() => {
    bridgeProcess?.kill();
    bridgeProcess = null;
  });

  it("requires the bridge token for health checks", async () => {
    const port = await availablePort();
    bridgeProcess = spawn(process.execPath, ["scripts/hermes-bridge-server.mjs"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PLOT_GOBLIN_HERMES_BRIDGE_HOST: "127.0.0.1",
        PLOT_GOBLIN_HERMES_BRIDGE_PORT: String(port),
        PLOT_GOBLIN_HERMES_BRIDGE_TOKEN: "bridge-token",
      },
      stdio: "ignore",
    });
    await waitForBridge(port);

    const response = await fetch(`http://127.0.0.1:${port}/health`);
    const data = (await response.json()) as { error?: string };

    expect(response.status).toBe(401);
    expect(data.error).toBe("Bridge token rejected.");
  });
});
