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

  it("rejects oversized markdown before building or forwarding a prompt", async () => {
    process.env.VERCEL = "1";
    process.env.PLOT_GOBLIN_AI_ACCESS_KEY = "correct-key";
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await POST(
      new Request("https://plot-goblin.test/api/hermes-cowriter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-plot-goblin-key": "correct-key",
        },
        body: JSON.stringify({
          mode: "room",
          markdown: "x".repeat(36_001),
          room: "Premise",
        }),
      }),
    );
    const data = (await response.json()) as { error?: string };

    expect(response.status).toBe(413);
    expect(data.error).toContain("too large");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("accepts the scene mode and forwards it to the Hermes bridge", async () => {
    process.env.VERCEL = "1";
    process.env.PLOT_GOBLIN_AI_ACCESS_KEY = "correct-key";
    process.env.PLOT_GOBLIN_HERMES_BRIDGE_TOKEN = "bridge-token";
    process.env.PLOT_GOBLIN_HERMES_BRIDGE_URL = "https://live-tunnel.example";
    const fetchSpy = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ output: "PLOT_GOBLIN_FINAL:\n1. Scene title: Last Tryout" }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    const response = await POST(
      new Request("https://plot-goblin.test/api/hermes-cowriter", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-plot-goblin-key": "correct-key" },
        body: JSON.stringify({
          mode: "scene",
          beat: "Inciting Incident",
          beatMarkdown: "Joe spots a flyer for one last open tryout.",
          markdown: "# Plot Goblin Export",
        }),
      }),
    );
    const data = (await response.json()) as { output?: string; error?: string };

    expect(response.status).toBe(200);
    expect(data.error).toBeUndefined();
    expect(data.output).toContain("1. Scene title: Last Tryout");
    expect(fetchSpy).toHaveBeenCalledWith("https://live-tunnel.example/cowriter", expect.anything());
  });

  it("rejects malformed co-writer fields before Hermes work", async () => {
    const response = await POST(
      new Request("https://plot-goblin.test/api/hermes-cowriter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "beat",
          beat: ["Opening Image"],
          beatMarkdown: "Write the opening.",
        }),
      }),
    );
    const data = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid co-writer request");
  });
});
