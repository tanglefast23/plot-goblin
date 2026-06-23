import { buildScriptBase, type ScriptBase } from "./guidedSetup";

export const PROJECT_STORAGE_KEY = "plot-goblin-current-script";

export function createBlankProject() {
  return buildScriptBase({});
}

export function loadProject(): ScriptBase | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(PROJECT_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ScriptBase;
  } catch {
    window.localStorage.removeItem(PROJECT_STORAGE_KEY);
    return null;
  }
}

export function saveProject(project: ScriptBase) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    PROJECT_STORAGE_KEY,
    JSON.stringify({ ...project, updatedAt: new Date().toISOString() }),
  );
}

export function ensureProject() {
  const existing = loadProject();
  if (existing) return existing;

  const blank = createBlankProject();
  saveProject(blank);
  return blank;
}

export function clearProject() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PROJECT_STORAGE_KEY);
}
