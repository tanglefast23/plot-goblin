import { afterEach, describe, expect, it, vi } from "vitest";
import { isCowriterRequestForTest } from "./route";
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

  it("does not expose the full Hermes prompt when the public bridge command fails", async () => {
    process.env.VERCEL = "1";
    process.env.PLOT_GOBLIN_AI_ACCESS_KEY = "correct-key";
    process.env.PLOT_GOBLIN_HERMES_BRIDGE_TOKEN = "bridge-token";
    process.env.PLOT_GOBLIN_HERMES_BRIDGE_URL = "https://live-tunnel.example";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error:
            "Hermes bridge failed. Command failed: hermes chat -Q --source plot-goblin-public-bridge -q You are Plot Goblin, a helpfully annoying screenplay co-writer.",
        }),
      }),
    );

    const response = await POST(cowriterRequest("correct-key"));
    const data = (await response.json()) as { error?: string };

    expect(response.status).toBe(502);
    expect(data.error).toContain("Hermes command failed");
    expect(data.error).not.toContain("You are Plot Goblin");
    expect(data.error).not.toContain("-q");
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

  it("keeps local-network requests on local Hermes even when Vercel env vars are present", async () => {
    process.env.VERCEL = "1";
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await GET(new Request("http://localhost:3000/api/hermes-cowriter"));
    const data = (await response.json()) as { ok?: boolean; error?: string };

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.error).toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
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

  it("accepts the logline mode and forwards strongest setup facts to the Hermes bridge", async () => {
    process.env.VERCEL = "1";
    process.env.PLOT_GOBLIN_AI_ACCESS_KEY = "correct-key";
    process.env.PLOT_GOBLIN_HERMES_BRIDGE_TOKEN = "bridge-token";
    process.env.PLOT_GOBLIN_HERMES_BRIDGE_URL = "https://live-tunnel.example";
    const fetchSpy = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ output: "PLOT_GOBLIN_FINAL:\nWhen Joe risks one last tryout, rival players force him to accept help before he loses his home." }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    const response = await POST(
      new Request("https://plot-goblin.test/api/hermes-cowriter", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-plot-goblin-key": "correct-key" },
        body: JSON.stringify({
          mode: "logline",
          answers: { rawIdea: "A one-armed pitcher gets one last shot at the majors." },
          summary: { strongestKnownPieces: ["Joe refuses help.", "The tryout is his last chance."] },
        }),
      }),
    );
    const data = (await response.json()) as { output?: string; error?: string };

    expect(response.status).toBe(200);
    expect(data.error).toBeUndefined();
    expect(data.output).toContain("When Joe risks one last tryout");
    expect(fetchSpy).toHaveBeenCalledWith("https://live-tunnel.example/cowriter", expect.anything());
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body).prompt).toContain("Joe refuses help.");
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

describe("cowriter request validation", () => {
  it("accepts the full-script planning and sample modes", () => {
    expect(isCowriterRequestForTest({ mode: "plan" })).toBe(true);
    expect(isCowriterRequestForTest({ mode: "chunk" })).toBe(true);
    expect(isCowriterRequestForTest({ mode: "sample" })).toBe(true);
  });

  it("rejects an unknown mode", () => {
    expect(isCowriterRequestForTest({ mode: "nonsense" })).toBe(false);
  });
});
