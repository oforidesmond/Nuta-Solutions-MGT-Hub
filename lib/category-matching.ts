import type { HubCategory } from "@/lib/types/domain";

export const STRONG_MATCH_THRESHOLD = 0.92;
export const WEAK_MATCH_THRESHOLD = 0.75;

export type CategoryMatchType = "exact" | "normalized" | "fuzzy";

export type CategoryMatch = {
  category: HubCategory;
  score: number;
  matchType: CategoryMatchType;
};

/** Trim, collapse whitespace, lowercase, strip punctuation for comparison. */
export function normalizeCategoryName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "");
}

/** Title Case for display and create (e.g. "skin care" → "Skin Care"). */
export function formatCategoryName(name: string): string {
  const collapsed = name.trim().replace(/\s+/g, " ");
  if (!collapsed) return "";
  return collapsed
    .split(" ")
    .map((word) => {
      if (!word) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);

  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }

  return prev[b.length];
}

function levenshteinRatio(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const dist = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  return 1 - dist / maxLen;
}

function tokenJaccard(a: string, b: string): number {
  const tokensA = a.split(/\s+/).filter(Boolean);
  const tokensB = b.split(/\s+/).filter(Boolean);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function scoreCategoryMatch(input: string, categoryName: string): CategoryMatch | null {
  const trimmedInput = input.trim();
  const trimmedCategory = categoryName.trim();
  if (!trimmedInput || !trimmedCategory) return null;

  if (trimmedInput.toLowerCase() === trimmedCategory.toLowerCase()) {
    return { category: { id: "", name: categoryName }, score: 1.0, matchType: "exact" };
  }

  const normInput = normalizeCategoryName(trimmedInput);
  const normCategory = normalizeCategoryName(trimmedCategory);
  if (!normInput || !normCategory) return null;

  if (normInput === normCategory) {
    return { category: { id: "", name: categoryName }, score: 0.99, matchType: "normalized" };
  }

  const levScore = levenshteinRatio(normInput, normCategory);
  const jaccardScore = tokenJaccard(normInput, normCategory);
  const containsScore =
    normCategory.includes(normInput) || normInput.includes(normCategory) ? 0.88 : 0;

  const score = Math.max(levScore, jaccardScore, containsScore);
  if (score < WEAK_MATCH_THRESHOLD) return null;

  return {
    category: { id: "", name: categoryName },
    score: Math.min(score, 0.98),
    matchType: "fuzzy",
  };
}

/** Find similar categories sorted by score (highest first). */
export function findCategoryMatches(
  input: string,
  categories: HubCategory[],
): CategoryMatch[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const seen = new Map<string, CategoryMatch>();

  for (const category of categories) {
    const partial = scoreCategoryMatch(trimmed, category.name);
    if (!partial) continue;

    const existing = seen.get(category.id);
    const match: CategoryMatch = {
      category,
      score: partial.score,
      matchType: partial.matchType,
    };

    if (!existing || match.score > existing.score) {
      seen.set(category.id, match);
    }
  }

  return [...seen.values()].sort((a, b) => b.score - a.score);
}

/** Filter categories by substring on normalized name. */
export function filterCategoriesBySearch(
  query: string,
  categories: HubCategory[],
): HubCategory[] {
  const trimmed = query.trim();
  if (!trimmed) return categories;

  const normQuery = normalizeCategoryName(trimmed);
  if (!normQuery) return categories;

  return categories.filter((c) => normalizeCategoryName(c.name).includes(normQuery));
}

export function getTopCategoryMatch(
  input: string,
  categories: HubCategory[],
): CategoryMatch | null {
  const matches = findCategoryMatches(input, categories);
  return matches[0] ?? null;
}

export function isStrongCategoryMatch(match: CategoryMatch | null): boolean {
  return match != null && match.score >= STRONG_MATCH_THRESHOLD;
}

export function isWeakCategoryMatch(match: CategoryMatch | null): boolean {
  return (
    match != null &&
    match.score >= WEAK_MATCH_THRESHOLD &&
    match.score < STRONG_MATCH_THRESHOLD
  );
}
