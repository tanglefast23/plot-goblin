import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PlotGoblinMascot } from "@/components/PlotGoblinMascot";

afterEach(() => cleanup());

describe("PlotGoblinMascot", () => {
  it("renders the teasing Plot Goblin mascot", () => {
    render(<PlotGoblinMascot />);

    expect(screen.getByRole("img", { name: /teasing plot goblin mascot/i })).toBeDefined();
    expect(screen.getByText("Need a plot? Cute.")).toBeDefined();
  });
});
