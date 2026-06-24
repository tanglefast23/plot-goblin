const WORDS_PER_PAGE = 250;

export function estimatePageCount(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.round(words / WORDS_PER_PAGE);
}

export function shouldTopUp(totalPages: number, targetPages: number): boolean {
  if (targetPages <= 0) return false;
  return totalPages < targetPages * 0.9;
}
