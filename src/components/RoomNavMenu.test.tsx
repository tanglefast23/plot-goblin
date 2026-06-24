import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RoomNavMenu } from "./RoomNavMenu";

afterEach(() => {
  cleanup();
});

describe("RoomNavMenu", () => {
  it("lists active rooms as top-row navigation links instead of a dropdown", () => {
    render(<RoomNavMenu />);

    expect(screen.queryByRole("button", { name: "Rooms" })).toBeNull();

    expect(screen.getByRole("link", { name: "Premise" }).getAttribute("href")).toBe("/rooms/premise");
    expect(screen.getByRole("link", { name: "Characters" }).getAttribute("href")).toBe("/rooms/characters");
    expect(screen.getByRole("link", { name: "Theme" }).getAttribute("href")).toBe("/rooms/theme");
    expect(screen.getByRole("link", { name: "Beats" }).getAttribute("href")).toBe("/rooms/beats");
    expect(screen.getByRole("link", { name: "Scenes" }).getAttribute("href")).toBe("/rooms/scenes");
    expect(screen.getByRole("link", { name: "Script Parameters" }).getAttribute("href")).toBe(
      "/rooms/script-parameters",
    );
    expect(screen.getByRole("link", { name: "Create the Script" }).getAttribute("href")).toBe("/rooms/create-script");
    expect(screen.getByRole("link", { name: "DRAFTS" }).getAttribute("href")).toBe("/rooms/drafts");
    expect(screen.queryByText("Coming soon")).toBeNull();
  });
});
