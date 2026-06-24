import { describe, expect, it } from "vitest";
import { parseBeatSheet, mergeSetups, pageBudgetTotal, parseStoryBrief, renderBeatSheet } from "./draftBeatSheet";

describe("parseBeatSheet", () => {
  it("parses labeled beat blocks into typed beats", () => {
    const raw = [
      "BEAT 1 | PAGES: 3 | TITLE: Cold open at the impound lot",
      "INTENT: Mara hot-wires the wrong car and meets the antagonist.",
      "---",
      "BEAT 2 | PAGES: 5 | TITLE: The wager",
      "INTENT: She bets the deed to win the car back.",
      "---",
    ].join("\n");

    const sheet = parseBeatSheet(raw);

    expect(sheet).toHaveLength(2);
    expect(sheet[0]).toEqual({
      index: 1,
      pageBudget: 3,
      title: "Cold open at the impound lot",
      intent: "Mara hot-wires the wrong car and meets the antagonist.",
      setups: [],
    });
    expect(sheet[1].pageBudget).toBe(5);
    expect(sheet[1].title).toBe("The wager");
  });

  it("ignores junk lines and tolerates a missing trailing divider", () => {
    const raw = [
      "Here is your beat sheet:",
      "BEAT 1 | PAGES: 4 | TITLE: Opening",
      "INTENT: Something happens.",
    ].join("\n");

    const sheet = parseBeatSheet(raw);
    expect(sheet).toHaveLength(1);
    expect(sheet[0].index).toBe(1);
  });

  it("renumbers indices sequentially even if the model misnumbers", () => {
    const raw = "BEAT 7 | PAGES: 2 | TITLE: A\nINTENT: x\n---\nBEAT 9 | PAGES: 2 | TITLE: B\nINTENT: y";
    const sheet = parseBeatSheet(raw);
    expect(sheet.map((b) => b.index)).toEqual([1, 2]);
  });

  it("parses a useful plan when pages are on their own line", () => {
    const raw = [
      "STORY_BRIEF:",
      "premise: Mara steals a moon rock.",
      "",
      "BEAT 1: Cold open at the impound lot",
      "PAGES: 3",
      "INTENT: Mara hot-wires the wrong car and meets the antagonist.",
      "---",
      "BEAT 2: The wager",
      "PAGES: 5",
      "INTENT: She bets the deed to win the car back.",
    ].join("\n");

    const sheet = parseBeatSheet(raw);

    expect(sheet).toHaveLength(2);
    expect(sheet[0]).toEqual({
      index: 1,
      pageBudget: 3,
      title: "Cold open at the impound lot",
      intent: "Mara hot-wires the wrong car and meets the antagonist.",
      setups: [],
    });
    expect(sheet[1].pageBudget).toBe(5);
    expect(sheet[1].title).toBe("The wager");
  });

  it("parses beat blocks with markdown list numbering", () => {
    const raw = [
      "1. BEAT 1 | PAGES: 3 | TITLE: Cold open at the impound lot",
      "INTENT: Mara hot-wires the wrong car.",
      "---",
      "2. BEAT 2 | PAGES: 5 | TITLE: The wager",
      "INTENT: She bets the deed.",
    ].join("\n");

    const sheet = parseBeatSheet(raw);

    expect(sheet.map((beat) => beat.title)).toEqual(["Cold open at the impound lot", "The wager"]);
    expect(sheet.map((beat) => beat.pageBudget)).toEqual([3, 5]);
  });
});

describe("mergeSetups", () => {
  it("appends a planted note to the matching beat without mutating the input", () => {
    const sheet = parseBeatSheet("BEAT 1 | PAGES: 3 | TITLE: A\nINTENT: x\n---\nBEAT 2 | PAGES: 3 | TITLE: B\nINTENT: y");
    const next = mergeSetups(sheet, [{ beatIndex: 2, note: "cellar door left unlocked" }]);

    expect(next[1].setups).toEqual(["cellar door left unlocked"]);
    expect(sheet[1].setups).toEqual([]);
  });

  it("ignores setups whose beat index is out of range", () => {
    const sheet = parseBeatSheet("BEAT 1 | PAGES: 3 | TITLE: A\nINTENT: x");
    const next = mergeSetups(sheet, [{ beatIndex: 99, note: "nope" }]);
    expect(next).toHaveLength(1);
    expect(next[0].setups).toEqual([]);
  });
});

describe("pageBudgetTotal", () => {
  it("sums every beat's page budget", () => {
    const sheet = parseBeatSheet("BEAT 1 | PAGES: 3 | TITLE: A\nINTENT: x\n---\nBEAT 2 | PAGES: 5 | TITLE: B\nINTENT: y");
    expect(pageBudgetTotal(sheet)).toBe(8);
  });
});

describe("renderBeatSheet", () => {
  it("renders beats back to text including planted setups", () => {
    const sheet = mergeSetups(
      parseBeatSheet("BEAT 1 | PAGES: 3 | TITLE: A\nINTENT: x"),
      [{ beatIndex: 1, note: "gun on the mantel" }],
    );
    const text = renderBeatSheet(sheet);
    expect(text).toContain("BEAT 1 | PAGES: 3 | TITLE: A");
    expect(text).toContain("INTENT: x");
    expect(text).toContain("PLANTED: gun on the mantel");
  });

  it("produces output that re-parses into an equivalent sheet", () => {
    const sheet = parseBeatSheet("BEAT 1 | PAGES: 3 | TITLE: A\nINTENT: x\n---\nBEAT 2 | PAGES: 5 | TITLE: B\nINTENT: y");
    const roundTripped = parseBeatSheet(renderBeatSheet(sheet));
    expect(roundTripped).toEqual(sheet);
  });
});

describe("parseStoryBrief", () => {
  it("extracts the compact brief from a plan response", () => {
    const raw = [
      "STORY_BRIEF:",
      "premise: Mara steals a moon rock.",
      "characters: Mara wants proof.",
      "",
      "BEAT 1 | PAGES: 3 | TITLE: Theft",
      "INTENT: Mara steals the rock.",
    ].join("\n");

    expect(parseStoryBrief(raw)).toBe("premise: Mara steals a moon rock.\ncharacters: Mara wants proof.");
  });

  it("stops before a loose beat header when extracting the compact brief", () => {
    const raw = [
      "STORY_BRIEF:",
      "premise: Mara steals a moon rock.",
      "",
      "BEAT 1: Theft",
      "PAGES: 3",
      "INTENT: Mara steals the rock.",
    ].join("\n");

    expect(parseStoryBrief(raw)).toBe("premise: Mara steals a moon rock.");
  });
});
