import { getCollection } from "astro:content";

export type VocabValue =
  | string
  | string[]
  | { label: string; short?: string; url?: string; };
export type VocabMap = Record<string, VocabValue>;

let cache: Map<string, VocabMap> | null = null;

export async function getVocab(): Promise<Map<string, VocabMap>> {
  if (cache) return cache;
  const entries = await getCollection("vocab");
  const map = new Map<string, VocabMap>();
  for (const entry of entries) {
    const key = entry.id.replace(/\.ya?ml$/, "");
    map.set(key, entry.data as VocabMap);
  }
  cache = map;
  return map;
}

/** Display label for a slug within a given vocab map. Falls back to the raw slug if missing. */
export function vocabLabel(vocab: VocabMap | undefined, slug: string): string {
  const v = vocab?.[slug];
  if (!v) return slug;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return slug; // installs.yaml has no label, fall back to slug
  return v.label;
}

/** Short display label for a slug, falling back to the full label, then the raw slug. */
export function vocabShort(vocab: VocabMap | undefined, slug: string): string {
  const v = vocab?.[slug];
  if (!v) return slug;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return slug;
  return v.short ?? v.label;
}

/** URL for a slug's vocab entry (e.g. licenses.yaml), if it has one. */
export function vocabUrl(vocab: VocabMap | undefined, slug: string): string | null {
  const v = vocab?.[slug];
  if (!v || typeof v === "string" || Array.isArray(v)) return null;
  return v.url ?? null;
}

/** Ordered install instructions for a given install-method slug (installs.yaml). */
export function vocabInstructions(vocab: VocabMap | undefined, slug: string): string[] {
  const v = vocab?.[slug];
  return Array.isArray(v) ? v : [];
}

export async function getVocabLabel(vocabName: string, slug: string): Promise<string> {
  const vocab = await getVocab();
  return vocabLabel(vocab.get(vocabName), slug);
}

/** {value,label} list for listing-page checkboxes/selects, sorted by label. */
export async function getVocabOptions(name: string): Promise<{ value: string; label: string }[]> {
  const vocab = await getVocab();
  const map = vocab.get(name) ?? {};
  return Object.entries(map)
    .map(([value, v]) => ({ value, label: typeof v === "string" ? v : v.label }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}
