import { describe, expect, it } from "vitest";
import { createMemoryRateLimiter, hasValidAccessKey } from "./cowriterSecurity";

describe("co-writer access security", () => {
  it("validates access keys without accepting missing or mismatched values", () => {
    expect(hasValidAccessKey("goblin-key", "goblin-key")).toBe(true);
    expect(hasValidAccessKey(" goblin-key ", "goblin-key")).toBe(true);
    expect(hasValidAccessKey("wrong", "goblin-key")).toBe(false);
    expect(hasValidAccessKey("", "goblin-key")).toBe(false);
    expect(hasValidAccessKey("goblin-key", "")).toBe(false);
  });

  it("limits repeated requests within a window", () => {
    const limiter = createMemoryRateLimiter(2, 60_000);

    expect(limiter("joe", 1_000)).toMatchObject({ allowed: true, remaining: 1 });
    expect(limiter("joe", 2_000)).toMatchObject({ allowed: true, remaining: 0 });
    expect(limiter("joe", 3_000)).toMatchObject({ allowed: false, remaining: 0 });
    expect(limiter("joe", 62_000)).toMatchObject({ allowed: true, remaining: 1 });
  });
});
