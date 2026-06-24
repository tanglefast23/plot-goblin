import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PlotGoblinMascot } from "@/components/PlotGoblinMascot";

afterEach(() => cleanup());

describe("PlotGoblinMascot", () => {
  it("renders the teasing Plot Goblin mascot", () => {
    render(<PlotGoblinMascot />);

    const mascot = screen.getByRole("img", { name: /teasing plot goblin mascot/i });

    expect(mascot).toBeDefined();
    expect(mascot.querySelector('[data-mascot-part="glasses"]')).toBeTruthy();
    expect(mascot.querySelector('[data-mascot-part="fang"]')).toBeTruthy();
    expect(screen.getByText("Need a plot? Cute.")).toBeDefined();
  });

  it("does not render the old top-left Setup and Rooms nav controls", () => {
    render(<PlotGoblinMascot />);

    expect(screen.queryByRole("link", { name: "Setup" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Rooms" })).toBeNull();
  });
});
