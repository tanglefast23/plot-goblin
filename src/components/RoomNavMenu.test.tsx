import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RoomNavMenu } from "./RoomNavMenu";

afterEach(() => {
  cleanup();
});

describe("RoomNavMenu", () => {
  it("labels the rooms overview link as Home", () => {
    render(<RoomNavMenu />);

    fireEvent.click(screen.getByRole("button", { name: "Rooms" }));

    expect(screen.getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/rooms");
    expect(screen.queryByRole("link", { name: /Rooms dashboard/i })).toBeNull();
  });

  it("describes active rooms by what the writer should work on", () => {
    render(<RoomNavMenu />);

    fireEvent.click(screen.getByRole("button", { name: "Rooms" }));

    const premiseLink = screen.getByRole("link", { name: /Premise/i });

    expect(within(premiseLink).getByText("Logline, dramatic question, stakes, and story promise.")).toBeTruthy();
    expect(within(premiseLink).queryByText("premise.md")).toBeNull();
  });
});
