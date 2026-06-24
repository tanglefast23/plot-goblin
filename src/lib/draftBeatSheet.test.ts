import { describe, expect, it } from "vitest";
import { parseBeatSheet } from "./draftBeatSheet";

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

    expect(parseBeatSheet(raw)).toHaveLength(1);
    expect(parseBeatSheet(raw)[0].index).toBe(1);
  });

  it("renumbers indices sequentially even if the model misnumbers", () => {
    const raw = "BEAT 7 | PAGES: 2 | TITLE: A\nINTENT: x\n---\nBEAT 9 | PAGES: 2 | TITLE: B\nINTENT: y";
    const sheet = parseBeatSheet(raw);
    expect(sheet.map((b) => b.index)).toEqual([1, 2]);
  });
});
