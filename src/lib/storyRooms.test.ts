import { describe, expect, it } from "vitest";
import {
  getActiveRooms,
  getComingSoonRooms,
  storyRooms,
  structureModes,
} from "./storyRooms";

describe("story room model", () => {
  it("starts with the five MVP rooms in the writing flow order", () => {
    expect(getActiveRooms().map((room) => room.slug)).toEqual([
      "premise",
      "characters",
      "theme",
      "beats",
      "scenes",
    ]);
  });

  it("keeps non-MVP rooms visible as coming soon work rooms", () => {
    expect(getComingSoonRooms().map((room) => room.slug)).toEqual([
      "relationships",
      "world",
      "dialogue",
      "setups-payoffs",
      "revision",
    ]);
  });

  it("uses a hybrid structure: guided defaults without locking the writer into a formula", () => {
    expect(structureModes.default).toBe("guided-three-act");
    expect(structureModes.allowCustomBeats).toBe(true);
    expect(storyRooms.find((room) => room.slug === "beats")?.markdownFile).toBe("beats.md");
  });
});
