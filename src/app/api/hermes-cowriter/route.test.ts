import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const originalEnv = {
  PLOT_GOBLIN_AI_ACCESS_KEY: process.env.PLOT_GOBLIN_AI_ACCESS_KEY,
  PLOT_GOBLIN_HERMES_BRIDGE_TOKEN: process.env.PLOT_GOBLIN_HERMES_BRIDGE_TOKEN,
  PLOT_GOBLIN_HERMES_BRIDGE_URL: process.env.PLOT_GOBLIN_HERMES_BRIDGE_URL,
  VERCEL: process.env.VERCEL,
};

function restoreEnvValue(key: keyof typeof originalEnv) {
  const value = originalEnv[key];

  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

function cowriterRequest(accessKey: string) {
  return new Request("https://plot-goblin.test/api/hermes-cowriter", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-plot-goblin-key": accessKey,
    },
    body: JSON.stringify({
      mode: "followup",
      answers: { rawIdea: "A haunted screenwriter argues with structure." },
      summary: {},
    }),
  });
}

describe("Hermes co-writer API route", () => {
  afterEach(() => {
    restoreEnvValue("PLOT_GOBLIN_AI_ACCESS_KEY");
    restoreEnvValue("PLOT_GOBLIN_HERMES_BRIDGE_TOKEN");
    restoreEnvValue("PLOT_GOBLIN_HERMES_BRIDGE_URL");
    restoreEnvValue("VERCEL");
    vi.unstubAllGlobals();
  });

  it("explains that a valid public key can still fail when the Mac bridge is unreachable", async () => {
    process.env.VERCEL = "1";
    process.env.PLOT_GOBLIN_AI_ACCESS_KEY = "correct-key";
    process.env.PLOT_GOBLIN_HERMES_BRIDGE_TOKEN = "bridge-token";
    process.env.PLOT_GOBLIN_HERMES_BRIDGE_URL = "https://stale-tunnel.example";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new TypeError("fetch failed")));

    const response = await POST(cowriterRequest("correct-key"));
    const data = (await response.json()) as { error?: string };

    expect(response.status).toBe(502);
    expect(data.error).toContain("could not reach Joe's Mac Hermes bridge");
    expect(data.error).toContain("Cloudflare tunnel");
    expect(data.error).not.toContain("fetch failed");
  });

  it("checks public access without asking Hermes to generate text", async () => {
    process.env.VERCEL = "1";
    process.env.PLOT_GOBLIN_AI_ACCESS_KEY = "correct-key";
    process.env.PLOT_GOBLIN_HERMES_BRIDGE_TOKEN = "bridge-token";
    process.env.PLOT_GOBLIN_HERMES_BRIDGE_URL = "https://live-tunnel.example";
    const fetchSpy = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    const response = await GET(cowriterRequest("correct-key"));
    const data = (await response.json()) as { ok?: boolean };

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://live-tunnel.example/health",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ "x-hermes-bridge-token": "bridge-token" }),
      }),
    );
  });
});
