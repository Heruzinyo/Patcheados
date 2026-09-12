/**
 * One config object per listing page (games/authors/circles/resources).
 * This is the single source of truth for fields, filter names, range
 * fields, sort definitions, metadata keys, vocabularies, and UI grouping.
 *
 * It is imported from two places, and only two places:
 *   - server-side, by Astro pages/components rendering ListingForm and by
 *     src/lib/search/build.ts (the sqlite build step)
 *   - client-side, by src/lib/search/engine.ts / suggest.ts
 *
 * Do not duplicate any of this shape in the db builder or the query engine.
 */

export type FieldKind = "multi" | "text" | "exact" | "range";

export interface FieldDef {
  name: string; // form field name / doc_filters.field / docs column key
  label: string;
  kind: FieldKind;
  /** For "multi"/"exact" fields backed by a vocab file (checkbox list or <select> options) */
  vocab?: string;
  /** For "exact" fields with a fixed small option set not worth a vocab file (e.g. yes/no) */
  options?: { value: string; label: string }[];
  suggest?: boolean; // render the .suggest-wrapper/.suggest-box autocomplete markup
  storage?: "column" | "filter";
}

export interface SortOption {
  value: string;
  label: string;
  metaKey: string;
  numeric?: boolean;
  direction?: "asc" | "desc";
  /** date sorts should push entries with no value to the end regardless of direction */
  missingLast?: boolean;
}

export interface RangeFieldDef {
  paramPrefix: string; // "release" -> release-from / release-to
  metaKey: string; // docs column holding the numeric value
  label: string;
}

export interface ListingConfig {
  type: "games" | "authors" | "circles" | "resources";
  perPage: number;
  fields: FieldDef[];
  rangeFields?: RangeFieldDef[];
  sorts: SortOption[];
  detailsGroups?: { label: string; fieldNames: string[] }[]; // games listing's two <details> groups
}

const YES_NO: FieldDef["options"] = [
  { value: "", label: "Qualquer" },
  { value: "true", label: "Sim" },
  { value: "false", label: "Não" },
];

export const authorsConfig: ListingConfig = {
  type: "authors",
  perPage: 9, // 3-col grid, kept distinct from the others, not forced to match
  fields: [
    { name: "activity", label: "Atividade", kind: "multi", vocab: "activities" },
    { name: "role", label: "Papel", kind: "multi", vocab: "roles" },
    { name: "circle", label: "Círculo", kind: "text", suggest: true },
    { name: "character", label: "Personagem", kind: "text", suggest: true },
  ],
  sorts: [
    { value: "az", label: "A-Z", metaKey: "title", direction: "asc" },
    { value: "za", label: "Z-A", metaKey: "title", direction: "desc" },
  ],
};

export const circlesConfig: ListingConfig = {
  type: "circles",
  perPage: 10,
  fields: [
    { name: "activity", label: "Atividade", kind: "multi", vocab: "activities" },
    { name: "tag", label: "Tags do Jogo", kind: "multi", vocab: "tags" },
    { name: "author", label: "Autor", kind: "text", suggest: true },
  ],
  sorts: [
    { value: "az", label: "A-Z", metaKey: "title", direction: "asc" },
    { value: "za", label: "Z-A", metaKey: "title", direction: "desc" },
    { value: "recente", label: "Mais recente", metaKey: "date", numeric: true, direction: "desc", missingLast: true },
    { value: "antigo", label: "Mais antigo", metaKey: "date", numeric: true, direction: "asc", missingLast: true },
  ],
};

export const resourcesConfig: ListingConfig = {
  type: "resources",
  perPage: 10,
  fields: [{ name: "category", label: "Categoria", kind: "multi", vocab: "categories" }],
  sorts: [
    { value: "az", label: "A-Z", metaKey: "title", direction: "asc" },
    { value: "za", label: "Z-A", metaKey: "title", direction: "desc" },
    { value: "recente", label: "Publicado recentemente", metaKey: "date", numeric: true, direction: "desc" },
    { value: "atualizado", label: "Atualizado recentemente", metaKey: "lastmod", numeric: true, direction: "desc" },
  ],
};

export const gamesConfig: ListingConfig = {
  type: "games",
  perPage: 10,
  fields: [
    { name: "tag", label: "Tags", kind: "multi", vocab: "tags" },
    { name: "language", label: "Idioma Original", kind: "multi", vocab: "languages" },
    { name: "platform", label: "Plataformas", kind: "multi", vocab: "platforms" },
    { name: "region", label: "Região", kind: "multi", vocab: "regions" },
    { name: "developer", label: "Desenvolvedora", kind: "text", suggest: true },
    { name: "publisher", label: "Distribuidora", kind: "text", suggest: true },
    { name: "nsfw", label: "NSFW", kind: "exact", options: YES_NO },

    { name: "status", label: "Status da Tradução", kind: "multi", vocab: "statuses" },
    { name: "origin", label: "Traduzido do", kind: "multi", vocab: "languages" },
    { name: "patchplatform", label: "Plataformas do Patch", kind: "multi", vocab: "platforms" },
    { name: "patchregion", label: "Região do Patch", kind: "multi", vocab: "regions" },
    { name: "creator", label: "Criador", kind: "text", suggest: true },
    { name: "patchpublisher", label: "Distribuidora do Patch", kind: "text", suggest: true },
    { name: "subs", label: "Legendas", kind: "exact", vocab: "coverage", storage: "filter" },
    { name: "graphics", label: "Gráficos", kind: "exact", vocab: "coverage", storage: "filter" },
    { name: "dub", label: "Dublagem", kind: "exact", vocab: "coverage", storage: "filter" },
    { name: "lost_source", label: "Fonte Perdida", kind: "exact", options: YES_NO, storage: "filter" },
    { name: "lost_media", label: "Lost Media", kind: "exact", options: YES_NO, storage: "filter" },
    { name: "official", label: "Oficial", kind: "exact", options: YES_NO, storage: "filter" },
    { name: "archive", label: "Reupload", kind: "exact", options: YES_NO, storage: "filter" },
    { name: "mtl", label: "MTL", kind: "exact", options: YES_NO, storage: "filter" },
    { name: "external", label: "Patch Externo", kind: "exact", options: YES_NO, storage: "filter" },
  ],
  rangeFields: [
    { paramPrefix: "release", metaKey: "release_year", label: "Ano de Lançamento" },
    { paramPrefix: "patchrelease", metaKey: "patch_release_year", label: "Ano de Lançamento do Patch" },
    { paramPrefix: "players", metaKey: "players", label: "Jogadores" },
  ],
  detailsGroups: [
    {
      label: "Detalhes do Jogo",
      fieldNames: ["tag", "language", "platform", "region", "developer", "publisher", "range:release", "range:players", "nsfw"],
    },
    {
      label: "Detalhes do Patch",
      fieldNames: [
        "status",
        "origin",
        "patchplatform",
        "patchregion",
        "creator",
        "patchpublisher",
        "range:patchrelease",
        "subs",
        "graphics",
        "dub",
        "lost_source",
        "lost_media",
        "official",
        "archive",
        "mtl",
        "external",
      ],
    },
  ],
  sorts: [
    { value: "az", label: "A-Z", metaKey: "title", direction: "asc" },
    { value: "za", label: "Z-A", metaKey: "title", direction: "desc" },
    { value: "recente", label: "Lançamento recente", metaKey: "release_year", numeric: true, direction: "desc" },
    { value: "antigo", label: "Lançamento antigo", metaKey: "release_year", numeric: true, direction: "asc" },
    { value: "patch_recente", label: "Patch Recente", metaKey: "patch_newest", numeric: true, direction: "desc", missingLast: true },
    { value: "patch_antigo", label: "Patch Antigo", metaKey: "patch_oldest", numeric: true, direction: "asc", missingLast: true },
    { value: "patch_atualizado", label: "Patch Atualizado", metaKey: "patch_updated", numeric: true, direction: "desc", missingLast: true },
  ],
};

export const listingConfigs: Record<ListingConfig["type"], ListingConfig> = {
  games: gamesConfig,
  authors: authorsConfig,
  circles: circlesConfig,
  resources: resourcesConfig,
};

/**
 * Text fields whose filter values are stored as slugs (see slug.ts) rather
 * than raw free text. Single source of truth shared by the build step, the
 * browser query engine, and suggest.ts.
 */
export const SLUGGED_TEXT_FIELDS = new Set([
  "developer",
  "publisher",
  "patchpublisher",
  "character",
  "creator",
  "circle",
  "author",
]);
