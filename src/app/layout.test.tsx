import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PlotGoblinMascot } from "@/components/PlotGoblinMascot";

afterEach(() => cleanup());

describe("PlotGoblinMascot", () => {
  it("renders the teasing Plot Goblin mascot", () => {
    render(<PlotGoblinMascot />);

    expect(screen.getByRole("img", { name: /teasing plot goblin mascot/i })).toBeDefined();
    expect(screen.getByText("Need a plot? Cute.")).toBeDefined();
  });

  it("opens a room picker from the Rooms nav control", () => {
    render(<PlotGoblinMascot />);

    const roomsButton = screen.getByRole("button", { name: "Rooms" });
    expect(roomsButton.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(roomsButton);

    expect(roomsButton.getAttribute("aria-expanded")).toBe("true");
    const roomList = screen.getByRole("list", { name: "All screenplay rooms" });
    expect(within(roomList).getByRole("link", { name: /Premise/ }).getAttribute("href")).toBe("/rooms/premise");
    expect(within(roomList).getByRole("link", { name: /Script Parameters/ }).getAttribute("href")).toBe(
      "/rooms/script-parameters",
    );
    expect(within(roomList).getByText("Relationships")).toBeDefined();
    expect(within(roomList).getAllByText("Coming soon")).toHaveLength(5);
  });
});
