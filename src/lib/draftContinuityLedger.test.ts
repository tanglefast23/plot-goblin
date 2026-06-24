import { describe, expect, it } from "vitest";
import {
  emptyContinuityLedger,
  mergeContinuityLedgers,
  parseContinuityLedger,
  renderContinuityLedger,
  seedContinuityLedger,
} from "./draftContinuityLedger";

describe("parseContinuityLedger", () => {
  it("parses people, objects, locations, events, and warnings from a chunk ledger block", () => {
    const ledger = parseContinuityLedger(
      [
        "PEOPLE:",
        "- Joe Kaplan | protagonist; one-armed pitcher",
        "OBJECTS:",
        "- Brenda | Joe's pitching machine",
        "LOCATIONS:",
        "- busted batting cage | Joe's recurring practice spot",
        "EVENTS:",
        "- River Dogs open tryout | this Saturday / Saturday, May 18; flyer found on cage fence",
        "WARNINGS:",
        "- Possible duplicate tryout flyer discovery avoided.",
      ].join("\n"),
    );

    expect(ledger.people).toEqual([{ name: "Joe Kaplan", note: "protagonist; one-armed pitcher", source: "generated" }]);
    expect(ledger.objects).toEqual([{ name: "Brenda", note: "Joe's pitching machine", source: "generated" }]);
    expect(ledger.locations).toEqual([
      { name: "busted batting cage", note: "Joe's recurring practice spot", source: "generated" },
    ]);
    expect(ledger.events).toEqual([
      {
        name: "River Dogs open tryout",
        note: "this Saturday / Saturday, May 18; flyer found on cage fence",
        source: "generated",
      },
    ]);
    expect(ledger.warnings).toEqual(["Possible duplicate tryout flyer discovery avoided."]);
  });

  it("ignores NONE lines and empty sections", () => {
    const ledger = parseContinuityLedger("PEOPLE:\n- NONE\nOBJECTS:\nNONE\nWARNINGS:\n- none");
    expect(ledger).toEqual(emptyContinuityLedger());
  });
});

describe("mergeContinuityLedgers", () => {
  it("adds genuinely new anchors and keeps exact duplicate names only once", () => {
    const base = parseContinuityLedger("OBJECTS:\n- Brenda | Joe's pitching machine", "seeded");
    const incoming = parseContinuityLedger(
      ["OBJECTS:", "- Brenda | the dented pitching machine", "- leather taco glove | Joe's bad glove"].join("\n"),
    );

    const merged = mergeContinuityLedgers(base, incoming);

    expect(merged.objects).toEqual([
      { name: "Brenda", note: "Joe's pitching machine", source: "seeded" },
      { name: "leather taco glove", note: "Joe's bad glove", source: "generated" },
    ]);
  });

  it("warns instead of adding a generated person with the same first name and role as a seeded person", () => {
    const base = parseContinuityLedger("PEOPLE:\n- Joe Kaplan | protagonist; one-armed pitcher", "seeded");
    const incoming = parseContinuityLedger("PEOPLE:\n- Joe Hart | protagonist; washed-up pitcher", "generated");

    const merged = mergeContinuityLedgers(base, incoming);

    expect(merged.people).toEqual([{ name: "Joe Kaplan", note: "protagonist; one-armed pitcher", source: "seeded" }]);
    expect(merged.warnings).toEqual([
      "Possible person name conflict: Joe Hart looks like Joe Kaplan. Keep Joe Kaplan unless the user changes it.",
    ]);
  });
});

describe("renderContinuityLedger", () => {
  it("renders a stable prompt section with NONE for empty categories", () => {
    const ledger = parseContinuityLedger("PEOPLE:\n- Joe Kaplan | protagonist\nEVENTS:\n- River Dogs open tryout | this Saturday");

    expect(renderContinuityLedger(ledger)).toBe(
      [
        "PEOPLE:",
        "- Joe Kaplan | protagonist",
        "OBJECTS:",
        "- NONE",
        "LOCATIONS:",
        "- NONE",
        "EVENTS:",
        "- River Dogs open tryout | this Saturday",
        "WARNINGS:",
        "- NONE",
      ].join("\n"),
    );
  });
});

describe("seedContinuityLedger", () => {
  it("seeds obvious character, object, location, and event anchors from room exports", () => {
    const ledger = seedContinuityLedger(
      [
        "## characters.md",
        "Protagonist: Joe Kaplan, a one-armed pitcher.",
        "Mia Kaplan is his sister.",
        "",
        "## scenes.md",
        "Mia finds the River Dogs open tryout flyer on the busted cage fence.",
        "The tryout is this Saturday, May 18.",
        "Joe calls the pitching machine Brenda.",
      ].join("\n"),
    );

    expect(ledger.people).toContainEqual({ name: "Joe Kaplan", note: "seeded from rooms", source: "seeded" });
    expect(ledger.people).toContainEqual({ name: "Mia Kaplan", note: "seeded from rooms", source: "seeded" });
    expect(ledger.objects).toContainEqual({ name: "Brenda", note: "seeded from rooms", source: "seeded" });
    expect(ledger.locations).toContainEqual({ name: "busted cage fence", note: "seeded from rooms", source: "seeded" });
    expect(ledger.events).toContainEqual({
      name: "River Dogs open tryout",
      note: "seeded from rooms; this Saturday, May 18",
      source: "seeded",
    });
  });
});
