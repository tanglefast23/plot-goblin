export const DRAFT_STORAGE_KEY = "plot-goblin-saved-drafts";

export type SavedDraft = {
  body: string;
  createdAt: string;
  id: string;
  title: string;
  updatedAt: string;
};

function nowIso() {
  return new Date().toISOString();
}

function draftId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function inferDraftTitle(body: string) {
  const titleLine = body
    .split("\n")
    .map((line) => line.trim())
    .find((line) => /^title:\s*\S/i.test(line));

  if (titleLine) return titleLine.replace(/^title:\s*/i, "").trim();

  const firstLine = body
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  return firstLine?.replace(/^#+\s*/, "").slice(0, 72) || "Untitled draft";
}

export function loadSavedDrafts(): SavedDraft[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as SavedDraft[];
    return Array.isArray(parsed) ? parsed.filter((draft) => draft.id && draft.body !== undefined) : [];
  } catch {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    return [];
  }
}

function writeSavedDrafts(drafts: SavedDraft[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
}

export function saveNewDraft(body: string) {
  const trimmedBody = body.trim();
  if (!trimmedBody) return null;

  const createdAt = nowIso();
  const draft: SavedDraft = {
    body: trimmedBody,
    createdAt,
    id: draftId(),
    title: inferDraftTitle(trimmedBody),
    updatedAt: createdAt,
  };

  writeSavedDrafts([draft, ...loadSavedDrafts()]);
  return draft;
}

export function updateSavedDraft(id: string, patch: Pick<SavedDraft, "body" | "title">) {
  const updatedDrafts = loadSavedDrafts().map((draft) =>
    draft.id === id ? { ...draft, ...patch, title: patch.title.trim() || inferDraftTitle(patch.body), updatedAt: nowIso() } : draft,
  );
  writeSavedDrafts(updatedDrafts);
  return updatedDrafts;
}

export function deleteSavedDraft(id: string) {
  const updatedDrafts = loadSavedDrafts().filter((draft) => draft.id !== id);
  writeSavedDrafts(updatedDrafts);
  return updatedDrafts;
}
