import { describe, expect, it } from "vitest";
import { buildScriptBase } from "./guidedSetup";
import { buildMarkdownArchiveFile, buildScreenplayExportFile, screenplayExportFormats } from "./screenplayExport";

describe("screenplay export files", () => {
  it("offers the five screenplay-friendly export formats", () => {
    expect(screenplayExportFormats.map((format) => format.id)).toEqual(["fountain", "fdx", "pdf", "docx", "rtf"]);
  });

  it("exports Fountain as plain, readable screenplay text", () => {
    const project = buildScriptBase({ rawIdea: "A detective investigates a murder on the moon." });
    project.rooms.scenes = "# Scenes Room\n\n### Scene: crater chase\n\nINT. MOON BASE - NIGHT\n\nThe detective finds silver dust.";

    const exported = buildScreenplayExportFile(project.rooms, "fountain");

    expect(exported.filename).toBe("plot-goblin-script.fountain");
    expect(exported.mimeType).toBe("text/plain;charset=utf-8");
    expect(exported.contents).toContain("Title: Plot Goblin Export");
    expect(exported.contents).toContain("# Scenes Room");
    expect(exported.contents).toContain("INT. MOON BASE - NIGHT");
  });

  it("exports the generated screenplay draft instead of the whole room workbook when a draft exists", () => {
    const project = buildScriptBase({ rawIdea: "A detective investigates a murder on the moon." });
    project.rooms.premise = "# Premise Room\n\nWorkbook-only premise notes should stay out of screenplay export.";
    project.rooms["create-script"] = `# Create the Script Room

## Generated screenplay draft
TITLE: MOON DUST

INT. MOON BASE - NIGHT

The detective finds silver dust.

DETECTIVE
(quiet)
Nobody leaves.

CUT TO:
`;

    const exported = buildScreenplayExportFile(project.rooms, "fountain");

    expect(exported.contents).toContain("Title: MOON DUST");
    expect(exported.contents).toContain("INT. MOON BASE - NIGHT");
    expect(exported.contents).toContain("DETECTIVE");
    expect(exported.contents).not.toContain("Workbook-only premise notes");
    expect(exported.contents).not.toContain("# Create the Script Room");
  });

  it("exports FDX with escaped room text", () => {
    const project = buildScriptBase({ rawIdea: "A detective & rival investigate <moon dust>." });

    const exported = buildScreenplayExportFile(project.rooms, "fdx");

    expect(exported.filename).toBe("plot-goblin-script.fdx");
    expect(exported.mimeType).toBe("application/vnd.finaldraft.fdx");
    expect(exported.contents).toContain("<FinalDraft");
    expect(exported.contents).toContain("A detective &amp; rival investigate &lt;moon dust&gt;.");
  });

  it("exports FDX screenplay paragraph types for generated drafts", () => {
    const project = buildScriptBase({});
    project.rooms["create-script"] = `# Create the Script Room

## Generated screenplay draft
TITLE: MOON DUST

INT. MOON BASE - NIGHT

The detective finds silver dust.

DETECTIVE
(quiet)
Nobody leaves.

CUT TO:
`;

    const exported = buildScreenplayExportFile(project.rooms, "fdx");

    expect(exported.contents).toContain('<Paragraph Type="Scene Heading"><Text>INT. MOON BASE - NIGHT</Text></Paragraph>');
    expect(exported.contents).toContain('<Paragraph Type="Action"><Text>The detective finds silver dust.</Text></Paragraph>');
    expect(exported.contents).toContain('<Paragraph Type="Character"><Text>DETECTIVE</Text></Paragraph>');
    expect(exported.contents).toContain('<Paragraph Type="Parenthetical"><Text>(quiet)</Text></Paragraph>');
    expect(exported.contents).toContain('<Paragraph Type="Dialogue"><Text>Nobody leaves.</Text></Paragraph>');
    expect(exported.contents).toContain('<Paragraph Type="Transition"><Text>CUT TO:</Text></Paragraph>');
  });

  it("exports RTF with escaped rich text", () => {
    const project = buildScriptBase({ rawIdea: "A detective investigates {moon dust}." });

    const exported = buildScreenplayExportFile(project.rooms, "rtf");

    expect(exported.filename).toBe("plot-goblin-script.rtf");
    expect(exported.mimeType).toBe("application/rtf;charset=utf-8");
    expect(exported.contents).toContain("{\\rtf1");
    expect(exported.contents).toContain("\\{moon dust\\}");
  });

  it("exports a minimal PDF document", () => {
    const project = buildScriptBase({ rawIdea: "A detective investigates a murder on the moon." });

    const exported = buildScreenplayExportFile(project.rooms, "pdf");

    expect(exported.filename).toBe("plot-goblin-script.pdf");
    expect(exported.mimeType).toBe("application/pdf");
    expect(exported.contents).toMatch(/^%PDF-1\.4/);
    expect(exported.contents).toContain("%%EOF");
  });

  it("keeps smart apostrophes readable in PDF exports", () => {
    const project = buildScriptBase({});
    project.rooms["create-script"] = `# Create the Script Room

## Generated screenplay draft
TITLE: ONE-ARM SMALL BALL

EXT. BUSTED BATTING CAGE - DAWN

He hops into the batter’s box.

JOE
We’re just learning each other’s toxic patterns.
`;

    const exported = buildScreenplayExportFile(project.rooms, "pdf");

    expect(exported.contents).toContain("batter's box");
    expect(exported.contents).toContain("We're just learning each other's toxic");
    expect(exported.contents).not.toContain("batter?s box");
    expect(exported.contents).not.toContain("We?re just learning each other?s toxic patterns.");
  });

  it("paginates PDF exports without dropping later screenplay pages", () => {
    const project = buildScriptBase({});
    const longAction = Array.from({ length: 260 }, (_value, index) => `Action line ${index + 1}.`).join("\n");
    project.rooms["create-script"] = `# Create the Script Room

## Generated screenplay draft
TITLE: LONG DRAFT

INT. LONG ROOM - DAY

${longAction}
`;

    const exported = buildScreenplayExportFile(project.rooms, "pdf");

    expect(exported.contents).toContain("/Count 5");
    expect(exported.contents).toContain("Action line 260.");
  });

  it("exports a minimal DOCX package", () => {
    const project = buildScriptBase({ rawIdea: "A detective investigates a murder on the moon." });

    const exported = buildScreenplayExportFile(project.rooms, "docx");

    expect(exported.filename).toBe("plot-goblin-script.docx");
    expect(exported.mimeType).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(exported.contents).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(exported.contents as Uint8Array)).toContain("word/document.xml");
  });

  it("exports DOCX screenplay styles for generated drafts", () => {
    const project = buildScriptBase({});
    project.rooms["create-script"] = `# Create the Script Room

## Generated screenplay draft
TITLE: MOON DUST

INT. MOON BASE - NIGHT

DETECTIVE
Nobody leaves.
`;

    const exported = buildScreenplayExportFile(project.rooms, "docx");
    const packageText = new TextDecoder().decode(exported.contents as Uint8Array);

    expect(packageText).toContain("word/styles.xml");
    expect(packageText).toContain('w:styleId="SceneHeading"');
    expect(packageText).toContain('w:pStyle w:val="SceneHeading"');
    expect(packageText).toContain('w:pStyle w:val="Character"');
    expect(packageText).toContain("Courier New");
  });

  it("includes saved drafts in the markdown backup when provided", () => {
    const project = buildScriptBase({ rawIdea: "A detective investigates a murder on the moon." });

    const exported = buildMarkdownArchiveFile(project.rooms, [
      {
        body: "TITLE: MOON DUST\n\nINT. MOON BASE - NIGHT\nThe detective finds silver dust.",
        createdAt: "2026-06-24T00:00:00.000Z",
        id: "draft-1",
        title: "MOON DUST",
        updatedAt: "2026-06-24T00:00:00.000Z",
      },
    ]);

    expect(exported.contents).toContain("# Saved Screenplay Drafts");
    expect(exported.contents).toContain("## MOON DUST");
    expect(exported.contents).toContain("INT. MOON BASE - NIGHT");
  });
});
