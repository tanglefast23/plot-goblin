---
status: complete
priority: p2
issue_id: "002"
tags: [code-review, security, performance, ai]
dependencies: []
---

# Cowriter Request Bounds

## Problem Statement

The Next.js co-writer route validates only `mode` before building a prompt and invoking local or remote Hermes. The standalone bridge caps prompt size, but the Next route accepts arbitrary request shape and size first. A malformed or very large request can waste server memory, call Hermes with oversized context, or forward unnecessary load to the bridge.

## Findings

- `src/app/api/hermes-cowriter/route.ts` accepts any object with mode `followup`, `suggestions`, `room`, or `beat`.
- `buildCowriterPrompt` runs before public rate limiting and before any explicit size cap.
- `scripts/hermes-bridge-server.mjs` has a `maxPromptChars` limit, showing the system already recognizes this boundary as important.

## Proposed Solutions

1. Add shared request validation and prompt-size limits in the Next route before building or forwarding prompts.
   - Pros: Reduces abuse, accidental huge prompts, and inconsistent behavior between local and public paths.
   - Cons: Requires tests for rejected payloads.
   - Effort: Small.
   - Risk: Low.

2. Move prompt-size enforcement into `buildCowriterPrompt`.
   - Pros: Centralizes the final prompt boundary.
   - Cons: Route still parses arbitrary body size before reaching it.
   - Effort: Small.
   - Risk: Low.

## Recommended Action

Completed.

## Acceptance Criteria

- The API rejects oversized markdown/answer payloads with a clear 413 or 400 response.
- Public rate limiting or cheap validation happens before expensive prompt construction.
- Local and public Hermes paths enforce comparable limits.
- Route tests cover invalid shapes, oversized payloads, and valid requests.

## Work Log

### 2026-06-23 - Review Capture

**By:** Codex

**Actions:**
- Reviewed the Next route, bridge server, and co-writer prompt builder.
- Verified tests/build pass, so this is a hardening gap rather than a current test failure.

**Learnings:**
- The bridge already has a useful guard; the app route should match it.

### 2026-06-23 - Fix

**By:** Codex

**Actions:**
- Added request body, prompt-source, label, and serialized context bounds in `src/app/api/hermes-cowriter/route.ts`.
- Moved prompt construction behind validation/auth/rate-limit checks.
- Added route tests for oversized markdown and malformed beat payloads.

**Verification:**
- `npm test`
- `npm run lint`
- `npm run build`
- Production browser pass on `/`, `/rooms`, `/rooms/premise`, `/rooms/beats`, `/rooms/scenes`, `/rooms/script-parameters`, and `/rooms/create-script` with no console errors.
