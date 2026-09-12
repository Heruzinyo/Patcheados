import type { GameEntry, PatchEntry, Db } from "./db";
import { patchUrl } from "./url";
import { vocabLabel, type VocabMap } from "./search/vocab";

/**
 * Status → CSS highlight class. Keyed by the canonical slug (statuses.yaml
 * id), make sure your statuses.yaml ids match these keys, or swap this to
 * read the class off the vocab entry itself if you'd rather keep it fully
 * data-driven.
 */
export function statusClass(status: string): string {
  return status; // yaml slugs (wip/complete/hiatus/cancelled) match the CSS class names directly
}

export function toLabel(vocab: VocabMap | undefined, slug: string): string {
  return vocabLabel(vocab, slug);
}

/**
 * Resolves the display title for a patch: game title by default, the
 * patch's own title for a translation-named patch, or "Game (Version)" for
 * a version-named patch.
 */
export function displayTitle(game: GameEntry, patch: PatchEntry): string {
  if (patch.data.title_type === "translation" && patch.data.title) {
    return patch.data.title;
  }
  if (patch.data.title_type === "version" && patch.data.title) {
    return `${game.data.title} (${patch.data.title})`;
  }
  return game.data.title;
}

/** Most recent download date for a patch, or null if it has no downloads. */
export function latestDownloadDate(patch: PatchEntry): Date | null {
  if (!patch.data.downloads.length) return null;
  return patch.data.downloads.reduce((latest, d) => (d.date > latest ? d.date : latest), patch.data.downloads[0].date);
}

export function formatDatePtBr(date: Date): string {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
}

export function formatYear(date: Date): string {
  return String(date.getFullYear());
}

export function typeLabel(vocab: VocabMap | undefined, type: string): string {
  return vocabLabel(vocab, type);
}

/** Patch tier for selector ordering: official first, then normal, external, mtl last. */
function patchTier(patch: PatchEntry): number {
  if (patch.data.official) return 1;
  if (patch.data.external) return 3;
  if (patch.data.mtl) return 4;
  return 2;
}

export interface PatchSelectorItem {
  sortKey: string;
  label: string;
  url: string;
  platforms: string; // comma-joined, for client-side platform filtering
}

export interface PatchSelectorData {
  platforms: string[];
  items: PatchSelectorItem[];
}

function resolveCreatorNamesInline(db: Db, patch: PatchEntry): string {
  const names: string[] = [];
  for (const authorId of patch.data.authors) {
    const author = db.authorById.get(authorId);
    names.push(author ? author.data.title : authorId);
  }
  for (const circleId of patch.data.circles) {
    const circle = db.circleById.get(circleId);
    names.push(circle ? circle.data.title : circleId);
  }
  return names.sort((a, b) => a.localeCompare(b, "pt-BR")).join(", ");
}

/**
 * Builds the platform/patch dropdown data for a game. Reads from
 * patchesByGameId (db.ts) instead of re-filtering all patches per call.
 */
export async function getPatchSelectorData(db: Db, game: GameEntry): Promise<PatchSelectorData> {
  const patches = db.patchesByGameId.get(game.id) ?? [];

  const platformSet = new Set<string>();
  for (const patch of patches) {
    for (const p of patch.data.platforms) platformSet.add(p);
  }
  const platforms = [...platformSet].sort();

  const items: PatchSelectorItem[] = [];
  for (const patch of patches) {
    const tier = patchTier(patch);

    const tags: string[] = [];
    if (patch.data.official) tags.push("[Oficial]");
    if (patch.data.mtl) tags.push("[MTL]");
    if (patch.data.external) tags.push("[EXT]");
    const tagStr = tags.join(" ");

    const creatorStr = resolveCreatorNamesInline(db, patch);

    let titleSuffix = "";
    if (patch.data.title_type === "version" && patch.data.title) {
      titleSuffix = ` (${patch.data.title})`;
    } else if (patch.data.title_type === "translation" && patch.data.title) {
      titleSuffix = ` - ${patch.data.title}`;
    }

    let label = creatorStr;
    if (tagStr) label = `${tagStr} ${creatorStr}`;
    label = `${label}${titleSuffix}`;

    items.push({
      sortKey: `${tier}_${label}`,
      label,
      url: patchUrl(game, patch),
      platforms: patch.data.platforms.join(","),
    });
  }
  items.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  return { platforms, items };
}

export interface Warning {
  key: "lost_source" | "lost_media" | "mtl" | "external";
  text: string;
}

const WARNING_TEXT: Record<Warning["key"], string> = {
  lost_source:
    "A distribuição original do patch foi perdida com o tempo, por isso disponibilizamos um link para um backup não oficial.",
  lost_media:
    "Esse patch atualmente é considerado lost media, seja porque versões mais recentes não estão disponíveis, ou porque não há backup conhecido de versões específicas.",
  mtl:
    "Esse patch utiliza tradução por máquina, portanto a qualidade pode ser abaixo do esperado.",
  external:
    'Esse "patch" é disponibilizado de forma externa ao jogo, pois a modificação dos arquivos originais não é possível atualmente.',
};

/** Which warning banners apply to a patch, in fixed display order. */
export function getPatchWarnings(patch: PatchEntry): Warning[] {
  const keys: Warning["key"][] = ["lost_source", "lost_media", "mtl", "external"];
  return keys.filter((k) => patch.data[k]).map((k) => ({ key: k, text: WARNING_TEXT[k] }));
}
