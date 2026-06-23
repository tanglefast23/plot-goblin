import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ACCESS_KEY_STORAGE_KEY, ACCESS_MODE_STORAGE_KEY } from "@/lib/cowriterAccess";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

import Home from "./page";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  pushMock.mockClear();
  vi.unstubAllGlobals();
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
    expect(within(activeRooms).getByText("Create the Script")).toBeDefined();

    const comingSoon = screen.getByLabelText("Coming soon work rooms");
    expect(within(comingSoon).getByText("Relationships")).toBeDefined();
    expect(within(comingSoon).getAllByText("Coming soon").length).toBeGreaterThanOrEqual(5);
  });

  it("explains the hybrid structure choice", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: /guided three-act defaults/i })).toBeDefined();
    expect(screen.getByText(/customize, rename, skip, or add beats/i)).toBeDefined();
  });

  it("keeps AI access out of the initial view until the goblin is fed", () => {
    render(<Home />);

    expect(screen.queryByRole("dialog", { name: "AI access setup" })).toBeNull();
    expect(screen.getByRole("button", { name: "Feed the goblin" })).toBeDefined();
  });

  it("pops up the AI access dialog when feeding the goblin", () => {
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: "Feed the goblin" }));

    const dialog = screen.getByRole("dialog", { name: "AI access setup" });
    expect(within(dialog).getByLabelText("Access key for public site")).toBeDefined();
    expect(within(dialog).getByRole("button", { name: "Use local" })).toBeDefined();
  });

  it("tests the public key before continuing to guided setup", async () => {
    const fetchSpy = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchSpy);
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: "Feed the goblin" }));
    const dialog = screen.getByRole("dialog", { name: "AI access setup" });

    fireEvent.change(within(dialog).getByLabelText("Access key for public site"), {
      target: { value: "friend-public-key" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Test and save key" }));

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/hermes-cowriter",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ "x-plot-goblin-key": "friend-public-key" }),
      }),
    );
    await waitFor(() => {
      expect(window.localStorage.getItem(ACCESS_KEY_STORAGE_KEY)).toBe("friend-public-key");
      expect(window.localStorage.getItem(ACCESS_MODE_STORAGE_KEY)).toBe("public");
      expect(pushMock).toHaveBeenCalledWith("/guided-setup");
    });
  });

  it("stays in the dialog when the public key test fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Public Hermes bridge could not reach Joe's Mac Hermes bridge." }),
      }),
    );
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: "Feed the goblin" }));
    const dialog = screen.getByRole("dialog", { name: "AI access setup" });

    fireEvent.change(within(dialog).getByLabelText("Access key for public site"), {
      target: { value: "friend-public-key" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Test and save key" }));

    expect(await within(dialog).findByText(/could not reach Joe's Mac Hermes bridge/i)).toBeDefined();
    expect(window.localStorage.getItem(ACCESS_KEY_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(ACCESS_MODE_STORAGE_KEY)).toBeNull();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("does not continue when saving an empty public key", () => {
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: "Feed the goblin" }));
    const dialog = screen.getByRole("dialog", { name: "AI access setup" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Test and save key" }));

    expect(window.localStorage.getItem(ACCESS_MODE_STORAGE_KEY)).toBeNull();
    expect(pushMock).not.toHaveBeenCalled();
    expect(within(dialog).getByText(/paste a public key or use local/i)).toBeDefined();
  });

  it("saves local mode and continues to guided setup", () => {
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: "Feed the goblin" }));
    const dialog = screen.getByRole("dialog", { name: "AI access setup" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Use local" }));

    expect(window.localStorage.getItem(ACCESS_KEY_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(ACCESS_MODE_STORAGE_KEY)).toBe("local");
    expect(pushMock).toHaveBeenCalledWith("/guided-setup");
  });

  it("skips the dialog and goes straight to guided setup when a preference is saved", () => {
    window.localStorage.setItem(ACCESS_MODE_STORAGE_KEY, "local");
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: "Feed the goblin" }));

    expect(screen.queryByRole("dialog", { name: "AI access setup" })).toBeNull();
    expect(pushMock).toHaveBeenCalledWith("/guided-setup");
  });

  it("asks again when public mode is saved without an access key", () => {
    window.localStorage.setItem(ACCESS_MODE_STORAGE_KEY, "public");
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: "Feed the goblin" }));

    expect(screen.getByRole("dialog", { name: "AI access setup" })).toBeDefined();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
