import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Home from "./page";
import { ACCESS_KEY_STORAGE_KEY, ACCESS_MODE_STORAGE_KEY } from "@/lib/cowriterAccess";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

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
    expect(within(activeRooms).getByText("Script Parameters")).toBeDefined();

    const comingSoon = screen.getByLabelText("Coming soon work rooms");
    expect(within(comingSoon).getByText("Relationships")).toBeDefined();
    expect(within(comingSoon).getAllByText("Coming soon").length).toBeGreaterThanOrEqual(5);
  });

  it("explains the hybrid structure choice", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: /guided three-act defaults/i })).toBeDefined();
    expect(screen.getByText(/customize, rename, skip, or add beats/i)).toBeDefined();
  });

  it("asks for AI access before setup and lets local users skip the public key", () => {
    render(<Home />);

    const accessPanel = screen.getByRole("region", { name: "AI access setup" });
    expect(within(accessPanel).getByLabelText("Access key for public site")).toBeDefined();
    expect(within(accessPanel).getByRole("button", { name: "Use local" })).toBeDefined();

    fireEvent.change(within(accessPanel).getByLabelText("Access key for public site"), {
      target: { value: "friend-public-key" },
    });
    fireEvent.click(within(accessPanel).getByRole("button", { name: "Save public key" }));

    expect(window.localStorage.getItem(ACCESS_KEY_STORAGE_KEY)).toBe("friend-public-key");
    expect(window.localStorage.getItem(ACCESS_MODE_STORAGE_KEY)).toBe("public");

    fireEvent.click(within(accessPanel).getByRole("button", { name: "Use local" }));

    expect(window.localStorage.getItem(ACCESS_KEY_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(ACCESS_MODE_STORAGE_KEY)).toBe("local");
    expect(within(accessPanel).getByText("Local mode selected")).toBeDefined();
  });
});
