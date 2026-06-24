export const ACCESS_KEY_STORAGE_KEY = "plot-goblin-ai-access-key";
export const ACCESS_MODE_STORAGE_KEY = "plot-goblin-ai-access-mode";

export type CowriterAccessMode = "local" | "public";

export function clearCowriterAccess() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_KEY_STORAGE_KEY);
  window.localStorage.removeItem(ACCESS_MODE_STORAGE_KEY);
}
