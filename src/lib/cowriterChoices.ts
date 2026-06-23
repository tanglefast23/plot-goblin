export type CowriterChoice = {
  number: number;
  target?: string;
  text: string;
};

type NumberedBlock = {
  number: number;
  body: string;
};

function collectNumberedBlocks(output: string) {
  const blocks: NumberedBlock[] = [];
  let current: NumberedBlock | null = null;

  for (const line of output.replace(/\r\n/g, "\n").split("\n")) {
    const match = /^\s*(\d{1,2})[.)]\s+(.+)$/.exec(line);
    if (match) {
      if (current) blocks.push(current);
      current = { number: Number(match[1]), body: match[2].trim() };
      continue;
    }

    if (!current) continue;
    if (!line.trim()) {
      blocks.push(current);
      current = null;
      continue;
    }

    current.body = `${current.body}\n${line.trim()}`;
  }

  if (current) blocks.push(current);
  return blocks;
}

function splitTargetFromText(body: string) {
  const match = /^([^:\n]{2,80}):\s+([\s\S]+)$/.exec(body.trim());
  if (!match) return { text: body.trim() };

  const target = match[1].replace(/\*\*/g, "").trim();
  if (!target || /[.!?]/.test(target)) return { text: body.trim() };

  return { target, text: match[2].trim() };
}

export function parseCowriterChoices(output: string): CowriterChoice[] {
  return collectNumberedBlocks(output)
    .map((block) => ({
      number: block.number,
      ...splitTargetFromText(block.body),
    }))
    .filter((choice) => choice.text.length > 0)
    .slice(0, 9);
}

export function extractCowriterNotes(output: string) {
  return output
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block && !/^\d{1,2}[.)]\s+/.test(block))
    .join("\n\n");
}

function headingLevel(line: string) {
  return /^(#{1,6})\s+/.exec(line)?.[1].length ?? 0;
}

function normalizeHeading(value: string) {
  return value
    .toLowerCase()
    .replace(/[`*_#]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function targetCandidates(target: string) {
  const pieces = target.split(/\/|,|\band\b|&/i);
  return [target, ...pieces].map(normalizeHeading).filter(Boolean);
}

function headingMatchesTarget(heading: string, target: string) {
  const normalizedHeading = normalizeHeading(heading.replace(/^#{1,6}\s+/, ""));
  return targetCandidates(target).some((candidate) => {
    return normalizedHeading === candidate || normalizedHeading.includes(candidate) || candidate.includes(normalizedHeading);
  });
}

function replaceMarkdownSection(markdown: string, target: string, text: string) {
  const lines = markdown.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const level = headingLevel(lines[index]);
    if (level === 0 || !headingMatchesTarget(lines[index], target)) continue;

    let end = lines.length;
    for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex += 1) {
      const nextLevel = headingLevel(lines[nextIndex]);
      if (nextLevel > 0 && nextLevel <= level) {
        end = nextIndex;
        break;
      }
    }

    const replacementLines = text.split("\n");
    if (end < lines.length && replacementLines.at(-1) !== "") {
      replacementLines.push("");
    }
    lines.splice(index + 1, end - index - 1, ...replacementLines);
    return lines.join("\n");
  }

  return null;
}

export function applyCowriterChoice(markdown: string, choice: CowriterChoice) {
  if (choice.target) {
    const replaced = replaceMarkdownSection(markdown, choice.target, choice.text);
    if (replaced) return replaced;
  }

  return `${markdown.trimEnd()}\n\n## Accepted goblin choice ${choice.number}\n${choice.text}\n`;
}
