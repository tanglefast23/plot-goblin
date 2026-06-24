import { buildExportMarkdown, type RoomMarkdown } from "./guidedSetup";
import { getActiveRooms, getComingSoonRooms } from "./storyRooms";

export type ScreenplayExportFormatId = "fountain" | "fdx" | "pdf" | "docx" | "rtf";

export type ScreenplayExportFile = {
  filename: string;
  mimeType: string;
  contents: string | Uint8Array;
};

export const screenplayExportFormats: { id: ScreenplayExportFormatId; label: string }[] = [
  { id: "fountain", label: "Fountain" },
  { id: "fdx", label: "Final Draft" },
  { id: "pdf", label: "PDF" },
  { id: "docx", label: "Word" },
  { id: "rtf", label: "RTF" },
];

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

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function paragraphType(line: string) {
  const trimmed = line.trim();

  if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(trimmed)) return "Scene Heading";
  if (/^#+\s+/.test(trimmed)) return "General";
  if (/^[A-Z0-9 ()'.-]{2,35}$/.test(trimmed) && /[A-Z]/.test(trimmed)) return "Character";

  return "Action";
}

function fdxExport(rooms: RoomMarkdown) {
  const paragraphs = plainTextExport(rooms)
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const text = line.replace(/^#+\s+/, "").replace(/^\/\/\s+/, "");
      return `    <Paragraph Type="${paragraphType(line)}"><Text>${escapeXml(text)}</Text></Paragraph>`;
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
  return `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Courier New;}}\n\\f0\\fs24\n${escapeRtf(plainTextExport(rooms))}}`;
}

function pdfEscape(value: string) {
  return value.replace(/[\\()]/g, (match) => `\\${match}`).replace(/[^\x20-\x7e]/g, "?");
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

function pdfExport(rooms: RoomMarkdown) {
  const visibleLines = plainTextExport(rooms)
    .replace(/\r\n/g, "\n")
    .split("\n")
    .flatMap((line) => wrapLine(line))
    .slice(0, 220);
  const pages = [];

  for (let index = 0; index < visibleLines.length; index += 48) {
    pages.push(visibleLines.slice(index, index + 48));
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
    const stream = [`BT`, `/F1 10 Tf`, `72 740 Td`, `12 TL`, ...pageLines.map((line) => `(${pdfEscape(line)}) Tj T*`), `ET`].join("\n");

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

function docxDocumentXml(rooms: RoomMarkdown) {
  const paragraphs = plainTextExport(rooms)
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => `<w:p><w:r><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${paragraphs}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body>
</w:document>`;
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
  ]);
}

export function buildScreenplayExportFile(rooms: RoomMarkdown, format: ScreenplayExportFormatId): ScreenplayExportFile {
  switch (format) {
    case "fountain":
      return {
        contents: plainTextExport(rooms),
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

export function buildMarkdownArchiveFile(rooms: RoomMarkdown): ScreenplayExportFile {
  return {
    contents: buildExportMarkdown(rooms),
    filename: "plot-goblin-export.md",
    mimeType: "text/markdown;charset=utf-8",
  };
}
