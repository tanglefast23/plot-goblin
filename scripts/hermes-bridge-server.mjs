#!/usr/bin/env node
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { timingSafeEqual } from "node:crypto";

const execFileAsync = promisify(execFile);
const port = Number.parseInt(process.env.PORT || process.env.PLOT_GOBLIN_HERMES_BRIDGE_PORT || "8787", 10);
const host = process.env.PLOT_GOBLIN_HERMES_BRIDGE_HOST || "127.0.0.1";
const maxPromptChars = Number.parseInt(process.env.PLOT_GOBLIN_HERMES_BRIDGE_MAX_PROMPT_CHARS || "24000", 10);
const rateLimit = Number.parseInt(process.env.PLOT_GOBLIN_HERMES_BRIDGE_RATE_LIMIT_PER_MINUTE || "8", 10);
const tokenFile = process.env.PLOT_GOBLIN_HERMES_BRIDGE_TOKEN_FILE || join(homedir(), ".hermes", "secrets", "plot-goblin-hermes-bridge-token");
const buckets = new Map();

function bridgeToken() {
  const fromEnv = process.env.PLOT_GOBLIN_HERMES_BRIDGE_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  return readFileSync(tokenFile, "utf8").trim();
}

function safeEquals(a, b) {
  if (!a || !b) return false;
  const left = Buffer.from(a.trim());
  const right = Buffer.from(b.trim());
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > maxPromptChars + 2000) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(raw || "{}"));
      } catch {
        reject(new Error("Invalid JSON."));
      }
    });
    req.on("error", reject);
  });
}

function checkLimit(id) {
  const now = Date.now();
  const windowMs = 60_000;
  const bucket = buckets.get(id);
  const safeLimit = Math.max(1, rateLimit);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(id, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 60 };
  }

  if (bucket.count >= safeLimit) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
}

async function runHermes(prompt) {
  const { stdout } = await execFileAsync("hermes", ["chat", "-Q", "--source", "plot-goblin-public-bridge", "-q", prompt], {
    timeout: 120_000,
    maxBuffer: 1024 * 1024,
    env: process.env,
  });
  return stdout;
}

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    send(res, 200, { ok: true, service: "plot-goblin-hermes-bridge" });
    return;
  }

  if (req.method !== "POST" || req.url !== "/cowriter") {
    send(res, 404, { error: "Not found." });
    return;
  }

  if (!safeEquals(req.headers["x-hermes-bridge-token"], bridgeToken())) {
    send(res, 401, { error: "Bridge token rejected." });
    return;
  }

  const clientId = req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  const limit = checkLimit(String(clientId).split(",")[0].trim());
  if (!limit.allowed) {
    res.writeHead(429, { "content-type": "application/json; charset=utf-8", "retry-after": String(limit.retryAfterSeconds) });
    res.end(JSON.stringify({ error: `Bridge rate limit reached. Try again in ${limit.retryAfterSeconds}s.` }));
    return;
  }

  try {
    const body = await readJson(req);
    const prompt = typeof body.prompt === "string" ? body.prompt : "";

    if (!prompt.trim()) {
      send(res, 400, { error: "Missing prompt." });
      return;
    }

    if (prompt.length > maxPromptChars) {
      send(res, 413, { error: "Prompt too large." });
      return;
    }

    const output = await runHermes(prompt);
    send(res, 200, { output });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown bridge failure.";
    send(res, 500, { error: `Hermes bridge failed. ${message}` });
  }
});

server.listen(port, host, () => {
  console.log(`Plot Goblin Hermes bridge listening on http://${host}:${port}`);
});
