import { buildExportMarkdown, type RoomMarkdown } from "./guidedSetup";
import type { SavedDraft } from "./draftStorage";
import { getActiveRooms, getComingSoonRooms } from "./storyRooms";

export type ScreenplayExportFormatId = "fountain" | "fdx" | "pdf" | "docx" | "rtf";

export type ScreenplayExportFile = {
  filename: string;
  mimeType: string;
  contents: string | Uint8Array;
};

type ScreenplayBlockType =
  | "Action"
  | "Blank"
  | "Character"
  | "Dialogue"
  | "Parenthetical"
  | "Scene Heading"
  | "Title"
  | "Transition";

type ScreenplayBlock = {
  text: string;
  type: ScreenplayBlockType;
};

export const screenplayExportFormats: { id: ScreenplayExportFormatId; label: string }[] = [
  { id: "fountain", label: "Fountain" },
  { id: "fdx", label: "Final Draft" },
  { id: "pdf", label: "PDF" },
  { id: "docx", label: "Word" },
  { id: "rtf", label: "RTF" },
];

function safeFilenamePart(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72) || "untitled-draft"
  );
}

function orderedRoomEntries(rooms: RoomMarkdown) {
  const knownRooms = [...getActiveRooms(), ...getComingSoonRooms()];
  const knownSlugs = knownRooms.map((room) => room.slug);
  const otherSlugs = Object.keys(rooms).filter((slug) => !knownSlugs.includes(slug));
  const roomBySlug = new Map(knownRooms.map((room) => [room.slug, room]));

  return [...knownSlugs, ...otherSlugs]
    .filter((slug) => rooms[slug] !== undefined)
    .map((slug) => ({
      filename: roomBySlug.get(slug)?.markdownFile ?? `${slug}.md`,
      slug,
      text: rooms[slug] ?? "",
      title: roomBySlug.get(slug)?.title ?? slug,
    }));
}

function plainTextExport(rooms: RoomMarkdown) {
  const lines = ["Title: Plot Goblin Export", "Credit: Built from Plot Goblin rooms", ""];

  for (const room of orderedRoomEntries(rooms)) {
    lines.push(`# ${room.title}`, `// ${room.filename}`, "", room.text.trim(), "");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function generatedDraftBody(rooms: RoomMarkdown) {
  const marker = "## Generated screenplay draft";
  const markdown = rooms["create-script"] ?? "";
  const markerIndex = markdown.indexOf(marker);
  if (markerIndex === -1) return "";

  return markdown.slice(markerIndex + marker.length).trim();
}

function screenplaySourceText(rooms: RoomMarkdown) {
  const draftBody = generatedDraftBody(rooms);
  return draftBody || plainTextExport(rooms);
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function isSceneHeading(value: string) {
  return /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(value);
}

function isTransition(value: string) {
  return /^[A-Z0-9 .'-]+ TO:$/.test(value) || /^(FADE IN:|FADE OUT\.|SMASH CUT:|MATCH CUT:)$/.test(value);
}

function isCharacterCue(value: string) {
  return (
    value.length > 0 &&
    value.length <= 40 &&
    /^[A-Z0-9 ()'.-]+$/.test(value) &&
    /[A-Z]/.test(value) &&
    !isSceneHeading(value) &&
    !isTransition(value) &&
    !/[.!?]$/.test(value)
  );
}

function nextMeaningfulLine(lines: string[], startIndex: number) {
  for (let index = startIndex; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (trimmed) return trimmed;
  }

  return "";
}

function parseScreenplayBlocks(source: string): ScreenplayBlock[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ScreenplayBlock[] = [];
  let inDialogue = false;

  lines.forEach((line, index) => {
    const text = line.trimEnd();
    const trimmed = text.trim();

    if (!trimmed) {
      blocks.push({ text: "", type: "Blank" });
      inDialogue = false;
      return;
    }

    const titleMatch = /^title:\s*(.+)$/i.exec(trimmed);
    if (titleMatch) {
      blocks.push({ text: titleMatch[1].trim(), type: "Title" });
      inDialogue = false;
      return;
    }

    if (isSceneHeading(trimmed)) {
      blocks.push({ text: trimmed.toUpperCase(), type: "Scene Heading" });
      inDialogue = false;
      return;
    }

    if (isTransition(trimmed)) {
      blocks.push({ text: trimmed.toUpperCase(), type: "Transition" });
      inDialogue = false;
      return;
    }

    const nextLine = nextMeaningfulLine(lines, index + 1);
    if (isCharacterCue(trimmed) && nextLine && !isSceneHeading(nextLine) && !isTransition(nextLine)) {
      blocks.push({ text: trimmed.toUpperCase(), type: "Character" });
      inDialogue = true;
      return;
    }

    if (inDialogue && /^\(.+\)$/.test(trimmed)) {
      blocks.push({ text: trimmed, type: "Parenthetical" });
      return;
    }

    if (inDialogue) {
      blocks.push({ text: trimmed, type: "Dialogue" });
      return;
    }

    blocks.push({ text: trimmed, type: "Action" });
  });

  return trimBlankBlocks(blocks);
}

function trimBlankBlocks(blocks: ScreenplayBlock[]) {
  const trimmed = [...blocks];
  while (trimmed[0]?.type === "Blank") trimmed.shift();
  while (trimmed.at(-1)?.type === "Blank") trimmed.pop();
  return trimmed;
}

function screenplayBlocks(rooms: RoomMarkdown) {
  return parseScreenplayBlocks(screenplaySourceText(rooms));
}

function fountainText(rooms: RoomMarkdown) {
  const blocks = screenplayBlocks(rooms);
  const title = blocks.find((block) => block.type === "Title")?.text ?? "Plot Goblin Script";
  const body = blocks
    .filter((block) => block.type !== "Title")
    .map((block) => block.text)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return `Title: ${title}\nCredit: Built with Plot Goblin\n\n${body}\n`;
}

function fdxExport(rooms: RoomMarkdown) {
  const paragraphs = screenplayBlocks(rooms)
    .filter((block) => block.type !== "Blank" && block.type !== "Title")
    .map((block) => {
      return `    <Paragraph Type="${block.type}"><Text>${escapeXml(block.text)}</Text></Paragraph>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<FinalDraft DocumentType="Script" Template="No" Version="5">
  <Content>
${paragraphs}
  </Content>
</FinalDraft>
`;
}

function escapeRtf(value: string) {
  return value.replace(/[\\{}]/g, (match) => `\\${match}`).replace(/\n/g, "\\par\n");
}

function rtfExport(rooms: RoomMarkdown) {
  return `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Courier New;}}\n\\f0\\fs24\n${screenplayBlocks(rooms)
    .map((block) => rtfParagraph(block))
    .join("")}}`;
}

function rtfParagraph(block: ScreenplayBlock) {
  if (block.type === "Blank") return "\\par\n";

  const text = escapeRtf(block.type === "Title" ? `Title: ${block.text}` : block.text);

  switch (block.type) {
    case "Character":
      return `\\pard\\li2520\\b ${text}\\b0\\par\n`;
    case "Dialogue":
      return `\\pard\\li1800\\ri1440 ${text}\\par\n`;
    case "Parenthetical":
      return `\\pard\\li2160 ${text}\\par\n`;
    case "Scene Heading":
    case "Transition":
      return `\\pard\\b ${text}\\b0\\par\n`;
    case "Title":
      return `\\pard\\qc\\b ${text}\\b0\\par\\pard\n`;
    default:
      return `\\pard ${text}\\par\n`;
  }
}

function pdfReadableText(value: string) {
  return value
    .replace(/[\u2018\u2019\u201b\u2032]/g, "'")
    .replace(/[\u201c\u201d\u201f\u2033]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00a0/g, " ");
}

function pdfEscape(value: string) {
  return pdfReadableText(value)
    .replace(/[\\()]/g, (match) => `\\${match}`)
    .replace(/[^\x20-\x7e]/g, "?");
}

function wrapLine(line: string, limit = 88) {
  const words = line.split(/\s+/);
  const wrapped: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > limit && current) {
      wrapped.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) wrapped.push(current);
  return wrapped.length > 0 ? wrapped : [""];
}

function pdfLines(rooms: RoomMarkdown) {
  return screenplayBlocks(rooms).flatMap((block) => {
    if (block.type === "Blank") return [""];

    const text = block.type === "Title" ? `Title: ${block.text}` : block.text;
    const indented = pdfIndentedLine(block.type, text);
    const wrapLimit = block.type === "Dialogue" ? 42 : block.type === "Parenthetical" ? 32 : 74;

    return wrapLine(indented, wrapLimit);
  });
}

function pdfIndentedLine(type: ScreenplayBlockType, text: string) {
  switch (type) {
    case "Character":
      return `${" ".repeat(24)}${text}`;
    case "Dialogue":
      return `${" ".repeat(16)}${text}`;
    case "Parenthetical":
      return `${" ".repeat(20)}${text}`;
    case "Transition":
      return `${" ".repeat(Math.max(0, 58 - text.length))}${text}`;
    default:
      return text;
  }
}

function pdfExport(rooms: RoomMarkdown) {
  const visibleLines = pdfLines(rooms);
  const pages = [];

  for (let index = 0; index < visibleLines.length; index += 55) {
    pages.push(visibleLines.slice(index, index + 55));
  }

  if (pages.length === 0) pages.push(["Plot Goblin Export"]);

  const objects: string[] = [];
  const pageObjectIds: number[] = [];
  const contentObjectIds: number[] = [];

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>";

  pages.forEach((pageLines, index) => {
    const pageObjectId = 4 + index * 2;
    const contentObjectId = pageObjectId + 1;
    const stream = [
      `BT`,
      `/F1 10 Tf`,
      `72 740 Td`,
      `12 TL`,
      ...pageLines.map((line) => `(${pdfEscape(line)}) Tj T*`),
      `ET`,
    ].join("\n");

    pageObjectIds.push(pageObjectId);
    contentObjectIds.push(contentObjectId);
    objects[pageObjectId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`;
    objects[contentObjectId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;

  const encoder = new TextEncoder();
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (let id = 1; id < objects.length; id += 1) {
    if (!objects[id]) continue;
    offsets[id] = encoder.encode(pdf).length;
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }

  const xrefStart = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;

  for (let id = 1; id < objects.length; id += 1) {
    pdf += `${String(offsets[id] ?? 0).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return pdf;
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(bytes: number[], value: number) {
  bytes.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeUint32(bytes: number[], value: number) {
  bytes.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function writeBytes(bytes: number[], chunk: Uint8Array) {
  for (const byte of chunk) bytes.push(byte);
}

function buildZip(files: { name: string; text: string }[]) {
  const encoder = new TextEncoder();
  const bytes: number[] = [];
  const centralDirectory: number[] = [];

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const contentBytes = encoder.encode(file.text);
    const crc = crc32(contentBytes);
    const localHeaderOffset = bytes.length;

    writeUint32(bytes, 0x04034b50);
    writeUint16(bytes, 20);
    writeUint16(bytes, 0);
    writeUint16(bytes, 0);
    writeUint16(bytes, 0);
    writeUint16(bytes, 0);
    writeUint32(bytes, crc);
    writeUint32(bytes, contentBytes.length);
    writeUint32(bytes, contentBytes.length);
    writeUint16(bytes, nameBytes.length);
    writeUint16(bytes, 0);
    writeBytes(bytes, nameBytes);
    writeBytes(bytes, contentBytes);

    writeUint32(centralDirectory, 0x02014b50);
    writeUint16(centralDirectory, 20);
    writeUint16(centralDirectory, 20);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint32(centralDirectory, crc);
    writeUint32(centralDirectory, contentBytes.length);
    writeUint32(centralDirectory, contentBytes.length);
    writeUint16(centralDirectory, nameBytes.length);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint32(centralDirectory, 0);
    writeUint32(centralDirectory, localHeaderOffset);
    writeBytes(centralDirectory, nameBytes);
  }

  const centralDirectoryOffset = bytes.length;
  bytes.push(...centralDirectory);
  writeUint32(bytes, 0x06054b50);
  writeUint16(bytes, 0);
  writeUint16(bytes, 0);
  writeUint16(bytes, files.length);
  writeUint16(bytes, files.length);
  writeUint32(bytes, centralDirectory.length);
  writeUint32(bytes, centralDirectoryOffset);
  writeUint16(bytes, 0);

  return new Uint8Array(bytes);
}

function docxStyleId(type: ScreenplayBlockType) {
  switch (type) {
    case "Scene Heading":
      return "SceneHeading";
    case "Character":
      return "Character";
    case "Dialogue":
      return "Dialogue";
    case "Parenthetical":
      return "Parenthetical";
    case "Transition":
      return "Transition";
    case "Title":
      return "TitlePage";
    default:
      return "Action";
  }
}

function docxParagraphXml(block: ScreenplayBlock) {
  const styleId = docxStyleId(block.type);
  const text = block.type === "Title" ? `Title: ${block.text}` : block.text;
  const textXml = block.type === "Blank" ? "" : `<w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;

  return `<w:p><w:pPr><w:pStyle w:val="${styleId}"/></w:pPr>${textXml}</w:p>`;
}

function docxDocumentXml(rooms: RoomMarkdown) {
  const paragraphs = screenplayBlocks(rooms).map(docxParagraphXml).join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${paragraphs}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="1080"/></w:sectPr></w:body>
</w:document>`;
}

function docxStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Action">
    <w:name w:val="Action"/>
    <w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/><w:sz w:val="24"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="SceneHeading">
    <w:name w:val="Scene Heading"/>
    <w:basedOn w:val="Action"/>
    <w:rPr><w:b/><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/><w:sz w:val="24"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Character">
    <w:name w:val="Character"/>
    <w:basedOn w:val="Action"/>
    <w:pPr><w:ind w:left="2520"/></w:pPr>
    <w:rPr><w:b/><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/><w:sz w:val="24"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Dialogue">
    <w:name w:val="Dialogue"/>
    <w:basedOn w:val="Action"/>
    <w:pPr><w:ind w:left="1800" w:right="1440"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/><w:sz w:val="24"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Parenthetical">
    <w:name w:val="Parenthetical"/>
    <w:basedOn w:val="Action"/>
    <w:pPr><w:ind w:left="2160" w:right="1800"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/><w:sz w:val="24"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Transition">
    <w:name w:val="Transition"/>
    <w:basedOn w:val="Action"/>
    <w:pPr><w:jc w:val="right"/></w:pPr>
    <w:rPr><w:b/><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/><w:sz w:val="24"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="TitlePage">
    <w:name w:val="Title Page"/>
    <w:basedOn w:val="Action"/>
    <w:pPr><w:jc w:val="center"/></w:pPr>
    <w:rPr><w:b/><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/><w:sz w:val="28"/></w:rPr>
  </w:style>
</w:styles>`;
}

function docxExport(rooms: RoomMarkdown) {
  return buildZip([
    {
      name: "[Content_Types].xml",
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`,
    },
    {
      name: "_rels/.rels",
      text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
    },
    { name: "word/document.xml", text: docxDocumentXml(rooms) },
    { name: "word/styles.xml", text: docxStylesXml() },
  ]);
}

export function buildScreenplayExportFile(rooms: RoomMarkdown, format: ScreenplayExportFormatId): ScreenplayExportFile {
  switch (format) {
    case "fountain":
      return {
        contents: fountainText(rooms),
        filename: "plot-goblin-script.fountain",
        mimeType: "text/plain;charset=utf-8",
      };
    case "fdx":
      return {
        contents: fdxExport(rooms),
        filename: "plot-goblin-script.fdx",
        mimeType: "application/vnd.finaldraft.fdx",
      };
    case "pdf":
      return {
        contents: pdfExport(rooms),
        filename: "plot-goblin-script.pdf",
        mimeType: "application/pdf",
      };
    case "docx":
      return {
        contents: docxExport(rooms),
        filename: "plot-goblin-script.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };
    case "rtf":
      return {
        contents: rtfExport(rooms),
        filename: "plot-goblin-script.rtf",
        mimeType: "application/rtf;charset=utf-8",
      };
  }
}

export function buildSavedDraftExportFile(draft: SavedDraft, format: ScreenplayExportFormatId): ScreenplayExportFile {
  const file = buildScreenplayExportFile(
    { "create-script": `# Create the Script Room\n\n## Generated screenplay draft\n${draft.body}` },
    format,
  );
  const extension = file.filename.split(".").pop() ?? format;

  return {
    ...file,
    filename: `plot-goblin-draft-${safeFilenamePart(draft.title)}.${extension}`,
  };
}

function savedDraftsMarkdown(savedDrafts: SavedDraft[]) {
  if (savedDrafts.length === 0) return "";

  const lines = ["", "# Saved Screenplay Drafts", ""];

  for (const draft of savedDrafts) {
    lines.push(`## ${draft.title}`, "", `Saved: ${draft.updatedAt}`, "", draft.body.trim(), "");
  }

  return lines.join("\n").trimEnd();
}

export function buildMarkdownArchiveFile(rooms: RoomMarkdown, savedDrafts: SavedDraft[] = []): ScreenplayExportFile {
  const draftMarkdown = savedDraftsMarkdown(savedDrafts);
  const contents = draftMarkdown ? `${buildExportMarkdown(rooms).trimEnd()}\n\n${draftMarkdown}\n` : buildExportMarkdown(rooms);

  return {
    contents,
    filename: "plot-goblin-export.md",
    mimeType: "text/markdown;charset=utf-8",
  };
}
