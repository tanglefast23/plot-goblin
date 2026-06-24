export type ContinuityLedgerSource = "seeded" | "generated";

export type ContinuityLedgerEntry = {
  name: string;
  note: string;
  source: ContinuityLedgerSource;
};

export type ContinuityLedger = {
  people: ContinuityLedgerEntry[];
  objects: ContinuityLedgerEntry[];
  locations: ContinuityLedgerEntry[];
  events: ContinuityLedgerEntry[];
  warnings: string[];
};

type LedgerCategory = Exclude<keyof ContinuityLedger, "warnings">;

const categoryHeaders: Record<string, LedgerCategory | "warnings"> = {
  PEOPLE: "people",
  OBJECTS: "objects",
  LOCATIONS: "locations",
  EVENTS: "events",
  WARNINGS: "warnings",
};

const roleWords = [
  "protagonist",
  "antagonist",
  "sister",
  "brother",
  "coach",
  "scout",
  "friend",
  "rival",
  "father",
  "mother",
  "mentor",
  "pitcher",
];

export function emptyContinuityLedger(): ContinuityLedger {
  return { people: [], objects: [], locations: [], events: [], warnings: [] };
}

function cleanLine(line: string) {
  return line.replace(/^[-*]\s*/, "").trim();
}

function isNone(value: string) {
  return /^none$/i.test(value.trim());
}

function splitEntry(line: string, source: ContinuityLedgerSource): ContinuityLedgerEntry | null {
  const cleaned = cleanLine(line);
  if (!cleaned || isNone(cleaned)) return null;

  const [rawName, ...rawNote] = cleaned.split("|");
  const name = rawName.trim();
  if (!name) return null;

  return { name, note: rawNote.join("|").trim(), source };
}

function normalizedName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function firstName(value: string) {
  return normalizedName(value).split(" ")[0] ?? "";
}

function roles(value: string) {
  const normalized = normalizedName(value);
  return roleWords.filter((word) => normalized.includes(word));
}

function sameRole(left: string, right: string) {
  const leftRoles = roles(left);
  const rightRoles = roles(right);
  return leftRoles.some((role) => rightRoles.includes(role));
}

export function parseContinuityLedger(
  block: string | null,
  source: ContinuityLedgerSource = "generated",
): ContinuityLedger {
  const ledger = emptyContinuityLedger();
  if (!block) return ledger;

  let current: LedgerCategory | "warnings" | null = null;
  for (const rawLine of block.replace(/\r\n|\r/g, "\n").split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const header = /^([A-Z ]+):$/i.exec(line);
    if (header) {
      current = categoryHeaders[header[1].trim().toUpperCase()] ?? null;
      continue;
    }

    if (!current) continue;

    if (current === "warnings") {
      const warning = cleanLine(line);
      if (warning && !isNone(warning)) ledger.warnings.push(warning);
      continue;
    }

    const entry = splitEntry(line, source);
    if (entry) ledger[current].push(entry);
  }

  return ledger;
}

function appendEntry(
  base: ContinuityLedger,
  category: LedgerCategory,
  incoming: ContinuityLedgerEntry,
): void {
  const duplicate = base[category].some((entry) => normalizedName(entry.name) === normalizedName(incoming.name));
  if (duplicate) return;

  if (category === "people" && incoming.source === "generated") {
    const conflict = base.people.find(
      (entry) =>
        entry.source === "seeded" &&
        firstName(entry.name) === firstName(incoming.name) &&
        sameRole(entry.note, incoming.note),
    );
    if (conflict) {
      base.warnings.push(
        `Possible person name conflict: ${incoming.name} looks like ${conflict.name}. Keep ${conflict.name} unless the user changes it.`,
      );
      return;
    }
  }

  base[category].push(incoming);
}

export function mergeContinuityLedgers(base: ContinuityLedger, incoming: ContinuityLedger): ContinuityLedger {
  const merged: ContinuityLedger = {
    people: [...base.people],
    objects: [...base.objects],
    locations: [...base.locations],
    events: [...base.events],
    warnings: [...base.warnings],
  };

  for (const category of ["people", "objects", "locations", "events"] satisfies LedgerCategory[]) {
    for (const entry of incoming[category]) appendEntry(merged, category, entry);
  }

  for (const warning of incoming.warnings) {
    if (!merged.warnings.includes(warning)) merged.warnings.push(warning);
  }

  return merged;
}

function renderEntries(entries: ContinuityLedgerEntry[]) {
  if (entries.length === 0) return "- NONE";
  return entries.map((entry) => `- ${entry.name}${entry.note ? ` | ${entry.note}` : ""}`).join("\n");
}

export function renderContinuityLedger(ledger: ContinuityLedger): string {
  return [
    "PEOPLE:",
    renderEntries(ledger.people),
    "OBJECTS:",
    renderEntries(ledger.objects),
    "LOCATIONS:",
    renderEntries(ledger.locations),
    "EVENTS:",
    renderEntries(ledger.events),
    "WARNINGS:",
    ledger.warnings.length > 0 ? ledger.warnings.map((warning) => `- ${warning}`).join("\n") : "- NONE",
  ].join("\n");
}

function uniqueEntries(entries: ContinuityLedgerEntry[]) {
  const ledger = emptyContinuityLedger();
  for (const entry of entries) appendEntry(ledger, "people", entry);
  return ledger.people;
}

function titleCaseNames(text: string): ContinuityLedgerEntry[] {
  const matches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g) ?? [];
  return uniqueEntries(
    matches
      .filter((name) => !/\b(?:Plot Goblin|River Dogs)\b/.test(name))
      .map((name) => ({ name, note: "seeded from rooms", source: "seeded" })),
  );
}

export function seedContinuityLedger(roomExport: string): ContinuityLedger {
  const ledger = emptyContinuityLedger();
  ledger.people = titleCaseNames(roomExport);

  const brenda = /\bBrenda\b/.exec(roomExport);
  if (brenda) ledger.objects.push({ name: "Brenda", note: "seeded from rooms", source: "seeded" });

  const cageFence = /\bbusted cage fence\b/i.exec(roomExport);
  if (cageFence) ledger.locations.push({ name: "busted cage fence", note: "seeded from rooms", source: "seeded" });

  const tryout = /\bRiver Dogs open tryout\b/i.exec(roomExport);
  if (tryout) {
    const date = /\bthis Saturday,?\s+May\s+\d{1,2}\b/i.exec(roomExport)?.[0];
    ledger.events.push({
      name: "River Dogs open tryout",
      note: date ? `seeded from rooms; ${date}` : "seeded from rooms",
      source: "seeded",
    });
  }

  return ledger;
}
