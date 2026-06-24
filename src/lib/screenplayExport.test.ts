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

  it("exports FDX with escaped room text", () => {
    const project = buildScriptBase({ rawIdea: "A detective & rival investigate <moon dust>." });

    const exported = buildScreenplayExportFile(project.rooms, "fdx");

    expect(exported.filename).toBe("plot-goblin-script.fdx");
    expect(exported.mimeType).toBe("application/vnd.finaldraft.fdx");
    expect(exported.contents).toContain("<FinalDraft");
    expect(exported.contents).toContain("A detective &amp; rival investigate &lt;moon dust&gt;.");
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

  it("exports a minimal DOCX package", () => {
    const project = buildScriptBase({ rawIdea: "A detective investigates a murder on the moon." });

    const exported = buildScreenplayExportFile(project.rooms, "docx");

    expect(exported.filename).toBe("plot-goblin-script.docx");
    expect(exported.mimeType).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(exported.contents).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(exported.contents as Uint8Array)).toContain("word/document.xml");
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
