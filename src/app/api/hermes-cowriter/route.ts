import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { buildCowriterPrompt, cleanHermesOutput, type CowriterRequest } from "@/lib/hermesCowriter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function isCowriterRequest(value: unknown): value is CowriterRequest {
  if (!value || typeof value !== "object") return false;
  const mode = (value as { mode?: unknown }).mode;
  return mode === "followup" || mode === "suggestions" || mode === "room";
}

export async function POST(request: Request) {
  if (process.env.VERCEL === "1") {
    return jsonResponse(
      {
        error:
          "Local Hermes bridge is disabled on public Vercel. Run Plot Goblin locally on Joe's Mac to use Hermes as co-writer.",
      },
      501,
    );
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

  const prompt = buildCowriterPrompt(body);

  try {
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

    return jsonResponse({ output: cleanHermesOutput(stdout) });
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
