/**
 * Normalizes free-text credit values (developer, publisher, character, etc.)
 * into a stable slug so the same entity typed differently ("Arc System
 * Works", "arc-system-works") collapses to one filterable/suggestible value.
 */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics (á -> a)
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Slugify every item of an array, dropping empties. */
export function slugifyAll(values: (string | undefined | null)[]): string[] {
  return values
    .filter((v): v is string => Boolean(v && v.trim()))
    .map(slugify);
}

/** Splits on whitespace and slugifies each token, used for "must match all typed terms" behavior. */
export function slugifyTerms(value: string | undefined | null): string[] {
  return (value ?? "")
    .toString()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(slugify)
    .filter(Boolean);
}

/** Slug -> friendly display label for the suggest dropdown ("arc-system-works" -> "Arc System Works"). */
export function slugToLabel(slug: string | undefined | null): string {
  return (slug ?? "")
    .toString()
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
