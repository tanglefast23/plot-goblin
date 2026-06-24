import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { buildCowriterPrompt, cleanHermesOutput, type CowriterRequest } from "@/lib/hermesCowriter";
import { clientIdFromRequest, createMemoryRateLimiter, hasValidAccessKey } from "@/lib/cowriterSecurity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);
const rateLimitPerMinute = Number.parseInt(process.env.PLOT_GOBLIN_RATE_LIMIT_PER_MINUTE ?? "8", 10);
const checkRateLimit = createMemoryRateLimiter(Number.isFinite(rateLimitPerMinute) ? rateLimitPerMinute : 8, 60_000);
const maxRequestBodyBytes = 64_000;
const maxPromptSourceChars = 36_000;
const maxSerializedContextChars = 12_000;
const maxLabelChars = 160;

function jsonResponse(body: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(body, { status, headers });
}

function isCowriterRequest(value: unknown): value is CowriterRequest {
  if (!value || typeof value !== "object") return false;
  const mode = (value as { mode?: unknown }).mode;
  return (
    mode === "followup" ||
    mode === "suggestions" ||
    mode === "logline" ||
    mode === "room" ||
    mode === "beat" ||
    mode === "draft" ||
    mode === "scene" ||
    mode === "scene-suggest"
  );
}

function serializedLength(value: unknown) {
  return JSON.stringify(value ?? {}).length;
}

function validateOptionalString(value: unknown, label: string, maxChars: number) {
  if (value === undefined) return null;
  if (typeof value !== "string") return `${label} must be text.`;
  if (value.length > maxChars) return `${label} is too large.`;
  return null;
}

function validateOptionalRecord(value: unknown, label: string) {
  if (value === undefined) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) return `${label} must be an object.`;
  if (serializedLength(value) > maxSerializedContextChars) return `${label} is too large.`;
  return null;
}

function validateCowriterRequest(value: CowriterRequest) {
  const issues = [
    validateOptionalString(value.room, "Room", maxLabelChars),
    validateOptionalString(value.beat, "Beat", maxLabelChars),
    validateOptionalString(value.writingStyle, "Writing style", maxLabelChars),
    validateOptionalString(value.markdown, "Markdown", maxPromptSourceChars),
    validateOptionalString(value.beatMarkdown, "Beat markdown", maxPromptSourceChars),
    validateOptionalString(value.sceneList, "Scene list", maxPromptSourceChars),
    validateOptionalRecord(value.answers, "Answers"),
    validateOptionalRecord(value.summary, "Summary"),
  ].filter(Boolean);

  return issues[0] ?? null;
}

function bridgeUrl() {
  return process.env.PLOT_GOBLIN_HERMES_BRIDGE_URL?.replace(/\/$/, "");
}

function isPrivateIpv4(hostname: string) {
  const pieces = hostname.split(".").map((piece) => Number.parseInt(piece, 10));
  if (pieces.length !== 4 || pieces.some((piece) => !Number.isInteger(piece) || piece < 0 || piece > 255)) {
    return false;
  }

  const [first, second] = pieces;
  return first === 10 || first === 127 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
}

function isLocalNetworkRequest(request: Request) {
  const hostname = new URL(request.url).hostname.toLowerCase().replace(/^\[|\]$/g, "");

  return (
    hostname === "localhost" ||
    hostname === "::1" ||
    hostname === "0.0.0.0" ||
    hostname.endsWith(".local") ||
    (hostname.includes(":") && (hostname.startsWith("fe80:") || hostname.startsWith("fc") || hostname.startsWith("fd"))) ||
    isPrivateIpv4(hostname)
  );
}

function shouldUsePublicBridge(request: Request) {
  return process.env.VERCEL === "1" && !isLocalNetworkRequest(request);
}

async function callLocalHermes(prompt: string) {
  const { stdout } = await execFileAsync("hermes", [
    "chat",
    "-Q",
    "--source",
    "plot-goblin-cowriter",
    "-q",
    prompt,
  ], {
    timeout: 120_000,
    maxBuffer: 1024 * 1024,
    env: process.env,
  });

  return stdout;
}

async function callRemoteHermesBridge(prompt: string) {
  const url = bridgeUrl();
  const bridgeToken = process.env.PLOT_GOBLIN_HERMES_BRIDGE_TOKEN;

  if (!url || !bridgeToken) {
    throw new Error("Public Hermes bridge is not configured yet. Missing bridge URL or bridge token.");
  }

  const response = await fetch(`${url}/cowriter`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hermes-bridge-token": bridgeToken,
    },
    body: JSON.stringify({ prompt }),
    signal: AbortSignal.timeout(130_000),
  });

  const data = (await response.json().catch(() => ({}))) as { output?: string; error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? `Hermes bridge returned ${response.status}.`);
  }

  return data.output ?? "";
}

async function checkRemoteHermesBridge() {
  const url = bridgeUrl();
  const bridgeToken = process.env.PLOT_GOBLIN_HERMES_BRIDGE_TOKEN;

  if (!url || !bridgeToken) {
    throw new Error("Public Hermes bridge is not configured yet. Missing bridge URL or bridge token.");
  }

  const response = await fetch(`${url}/health`, {
    method: "GET",
    headers: {
      "x-hermes-bridge-token": bridgeToken,
    },
    signal: AbortSignal.timeout(10_000),
  });

  const data = (await response.json().catch(() => ({}))) as { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? `Hermes bridge returned ${response.status}.`);
  }
}

function publicBridgeFailureMessage(caught: unknown) {
  const message = caught instanceof Error ? caught.message : "Unknown public Hermes bridge failure.";

  if (message === "fetch failed") {
    return "Public Hermes bridge could not reach Joe's Mac Hermes bridge. Make sure the Cloudflare tunnel is running and PLOT_GOBLIN_HERMES_BRIDGE_URL points at the current tunnel URL.";
  }

  return `Public Hermes bridge failed. ${message}`;
}

export async function GET(request: Request) {
  if (!shouldUsePublicBridge(request)) {
    return jsonResponse({ ok: true });
  }

  const expectedAccessKey = process.env.PLOT_GOBLIN_AI_ACCESS_KEY;
  const providedAccessKey = request.headers.get("x-plot-goblin-key");

  if (!expectedAccessKey) {
    return jsonResponse({ error: "Plot Goblin AI access key is not configured on Vercel yet." }, 503);
  }

  if (!hasValidAccessKey(providedAccessKey, expectedAccessKey)) {
    return jsonResponse({ error: "Enter the Plot Goblin access key to ask the public Hermes bridge." }, 401);
  }

  try {
    await checkRemoteHermesBridge();
    return jsonResponse({ ok: true });
  } catch (caught) {
    return jsonResponse({ error: publicBridgeFailureMessage(caught) }, 502);
  }
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > maxRequestBodyBytes) {
    return jsonResponse({ error: "Co-writer request body is too large." }, 413);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON. The goblin refuses to chew that." }, 400);
  }

  if (!isCowriterRequest(body)) {
    return jsonResponse({ error: "Invalid co-writer request." }, 400);
  }

  const validationError = validateCowriterRequest(body);
  if (validationError) {
    const status = validationError.includes("too large") ? 413 : 400;
    return jsonResponse({ error: `Invalid co-writer request. ${validationError}` }, status);
  }

  if (shouldUsePublicBridge(request)) {
    const expectedAccessKey = process.env.PLOT_GOBLIN_AI_ACCESS_KEY;
    const providedAccessKey = request.headers.get("x-plot-goblin-key");

    if (!expectedAccessKey) {
      return jsonResponse({ error: "Plot Goblin AI access key is not configured on Vercel yet." }, 503);
    }

    if (!hasValidAccessKey(providedAccessKey, expectedAccessKey)) {
      return jsonResponse({ error: "Enter the Plot Goblin access key to ask the public Hermes bridge." }, 401);
    }

    const limit = checkRateLimit(clientIdFromRequest(request));
    if (!limit.allowed) {
      return jsonResponse(
        { error: `Too many goblin summons. Try again in ${limit.retryAfterSeconds}s.` },
        429,
        { "Retry-After": String(limit.retryAfterSeconds) },
      );
    }

    try {
      const prompt = buildCowriterPrompt(body);
      const output = await callRemoteHermesBridge(prompt);
      return jsonResponse({ output: cleanHermesOutput(output), remaining: limit.remaining });
    } catch (caught) {
      return jsonResponse({ error: publicBridgeFailureMessage(caught) }, 502);
    }
  }

  try {
    const prompt = buildCowriterPrompt(body);
    const output = await callLocalHermes(prompt);
    return jsonResponse({ output: cleanHermesOutput(output) });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Unknown Hermes bridge failure.";
    return jsonResponse(
      {
        error: `Hermes local bridge failed. Make sure Hermes is installed and authenticated on this Mac. ${message}`,
      },
      500,
    );
  }
}
