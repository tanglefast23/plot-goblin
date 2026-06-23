import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Home from "./page";

afterEach(() => cleanup());

describe("Plot Goblin homepage", () => {
  it("presents Plot Goblin as a screenplay structure workspace", () => {
    render(<Home />);

    expect(screen.getByText("Plot Goblin")).toBeDefined();
    expect(
      screen.getByRole("heading", { name: /feed the goblin before the script eats you/i }),
    ).toBeDefined();
    expect(screen.getByText(/premise → characters → theme → beats → scenes/i)).toBeDefined();
    expect(screen.getByText(/tiny structural menace/i)).toBeDefined();
  });

  it("shows active rooms and greyed coming-soon rooms", () => {
    render(<Home />);

    const activeRooms = screen.getByLabelText("Active MVP work rooms");
    expect(within(activeRooms).getByText("Premise")).toBeDefined();
    expect(within(activeRooms).getByText("Characters")).toBeDefined();
    expect(within(activeRooms).getByText("Theme")).toBeDefined();
    expect(within(activeRooms).getByText("Beats")).toBeDefined();
    expect(within(activeRooms).getByText("Scenes")).toBeDefined();

    const comingSoon = screen.getByLabelText("Coming soon work rooms");
    expect(within(comingSoon).getByText("Relationships")).toBeDefined();
    expect(within(comingSoon).getAllByText("Coming soon").length).toBeGreaterThanOrEqual(5);
  });

  it("explains the hybrid structure choice", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: /guided three-act defaults/i })).toBeDefined();
    expect(screen.getByText(/customize, rename, skip, or add beats/i)).toBeDefined();
  });
});
