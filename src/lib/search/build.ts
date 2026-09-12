// Pure sqlite-building logic, schema, per-type doc construction, insertion.
// Deliberately has ZERO import of "astro:content": it's called from
// src/lib/search/integration.ts, which passes in getCollection/
// getContentDb/etc. as plain function arguments (`deps`). Keeping
// astro:content out of this file means it stays a normal Node module
// (importable, unit-testable with fake collections) instead of something
// that only works inside Astro's build graph.
//
// Per-type doc construction mirrors the aggregation logic already used by
// each detail page (src/pages/{authors,circles,resources}/[id].astro and
// src/pages/games/[game]/index.astro), reuse those helpers via `deps`
// rather than re-deriving the business rules here.

import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { slugify, slugifyAll } from "../slug.js";
import { listingConfigs, SLUGGED_TEXT_FIELDS, type ListingConfig } from "./configs.js";

function normalizeTitle(str: unknown): string {
  return (str ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Same transform as engine.ts's query-side normalize(). Non-slugged
// text-kind filter values must go through this too, or an accented search
// term (or its unaccented form) can fail to match against this column.
function normalizeFilterValue(str: unknown): string {
  return (str ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

type SourceDoc = {
  url: string;
  title: string;
  meta: Record<string, unknown>;
  filters: Record<string, unknown>;
};

function splitExactFieldsIntoMeta(
  config: ListingConfig,
  meta: Record<string, unknown>,
  filters: Record<string, unknown>
) {
  const outMeta = { ...meta };
  const outFilters = { ...filters };
  for (const field of config.fields) {
    if (field.kind !== "exact" || field.storage === "filter" || !(field.name in outFilters)) continue;
    const raw = outFilters[field.name];
    delete outFilters[field.name];
    outMeta[field.name] = raw === "true" ? 1 : raw === "false" ? 0 : raw;
  }
  return { meta: outMeta, filters: outFilters };
}

// deps: the same content-access helpers the Astro pages already use
// (getCollection, getContentDb, getCirclesForAuthor, getCircleMembers,
// getCreditedPatches, resolveAvatarSrc, resolveLogoSrc, authorUrl,
// circleUrl, gameUrl, resourceUrl). See integration.ts for how these are
// supplied.
type BuildDeps = Record<string, any>;

async function buildAuthorsDocs(deps: BuildDeps, config: ListingConfig): Promise<SourceDoc[]> {
  const { getCollection, getCirclesForAuthor, getCreditedPatches, resolveAvatarSrc, authorUrl } = deps;
  const authors = await getCollection("authors");
  const docs: SourceDoc[] = [];
  for (const author of authors) {
    const memberCircles = await getCirclesForAuthor(author.id);
    const creditedPatches = await getCreditedPatches(author.id, false);

    const roleSlugs = new Set<string>();
    const characters = new Set<string>();
    for (const patch of creditedPatches) {
      for (const credit of patch.data.credits) {
        if ("circle" in credit || credit.author !== author.id) continue;
        for (const r of credit.roles) {
          roleSlugs.add(r.role);
          for (const c of r.characters ?? []) characters.add(c);
        }
      }
    }

    const { meta, filters } = splitExactFieldsIntoMeta(
      config,
      { title: author.data.title, avatar: resolveAvatarSrc(author) },
      {
        circle: memberCircles.map((c: any) => c.id),
        role: [...roleSlugs],
        character: slugifyAll([...characters]),
        activity: author.data.activity,
      }
    );

    docs.push({ url: authorUrl(author), title: author.data.title, meta, filters });
  }
  return docs;
}

async function buildCirclesDocs(deps: BuildDeps, config: ListingConfig): Promise<SourceDoc[]> {
  const { getCollection, getContentDb, getCircleMembers, resolveLogoSrc, circleUrl } = deps;
  const circles = await getCollection("circles");
  const db = await getContentDb();
  const docs: SourceDoc[] = [];
  for (const circle of circles) {
    const members = await getCircleMembers(circle);
    const ownedPatches = db.patchesByCircleId.get(circle.id) ?? [];

    const gameTags = new Set<string>();
    for (const patch of ownedPatches) {
      const game = db.gameById.get(patch.id.split("/")[0]);
      if (!game) continue;
      for (const tag of game.data.tags) gameTags.add(tag);
    }

    const { meta, filters } = splitExactFieldsIntoMeta(
      config,
      { title: circle.data.title, logo: resolveLogoSrc(circle), date: circle.data.date?.getTime() },
      {
        author: members.filter((m: any) => m.author).map((m: any) => m.author.id),
        tag: [...gameTags],
        activity: circle.data.activity,
      }
    );

    docs.push({ url: circleUrl(circle), title: circle.data.title, meta, filters });
  }
  return docs;
}

async function buildResourcesDocs(deps: BuildDeps, config: ListingConfig): Promise<SourceDoc[]> {
  const { getCollection, resourceUrl } = deps;
  const resources = await getCollection("resources");
  return resources.map((resource: any) => {
    const { meta, filters } = splitExactFieldsIntoMeta(
      config,
      {
        title: resource.data.title,
        date: resource.data.date.getTime(),
        lastmod: resource.data.lastmod.getTime(),
      },
      { category: resource.data.categories }
    );
    const url = resourceUrl ? resourceUrl(resource) : `/resources/${resource.id}`;
    return { url, title: resource.data.title, meta, filters };
  });
}

async function buildGamesDocs(deps: BuildDeps, config: ListingConfig): Promise<SourceDoc[]> {
  const { getCollection, getContentDb, gameUrl } = deps;
  const games = await getCollection("games");
  const db = await getContentDb();
  const docs: SourceDoc[] = [];

  for (const game of games) {
    const patches = db.patchesByGameId.get(game.id) ?? [];

    const patchPlatforms = new Set<string>();
    const patchRegions = new Set<string>();
    const patchPublishers = new Set<string>();
    const statuses = new Set<string>();
    const origins = new Set<string>();
    const creators = new Set<string>();
    const coverage = { subs: new Set<string>(), graphics: new Set<string>(), dub: new Set<string>() };
    const patchDates: Date[] = [];
    const downloadDates: Date[] = [];
    const boolFlagValues = {
      lost_source: new Set<string>(),
      lost_media: new Set<string>(),
      official: new Set<string>(),
      mtl: new Set<string>(),
      external: new Set<string>(),
      archive: new Set<string>(),
    };

    for (const patch of patches) {
      for (const p of patch.data.platforms) patchPlatforms.add(p);
      statuses.add(patch.data.status);
      origins.add(patch.data.origin);
      coverage.subs.add(patch.data.subs);
      coverage.graphics.add(patch.data.graphics);
      coverage.dub.add(patch.data.dub);
      if (patch.data.date) patchDates.push(patch.data.date);
      for (const authorId of patch.data.authors) creators.add(authorId);
      for (const circleId of patch.data.circles) creators.add(circleId);
      for (const d of patch.data.downloads) {
        patchRegions.add(d.region);
        boolFlagValues.archive.add(String(!!d.archive));
        downloadDates.push(d.date);
      }
      for (const pub of patch.data.publishers) patchPublishers.add(pub);
      boolFlagValues.lost_source.add(String(!!patch.data.lost_source));
      boolFlagValues.lost_media.add(String(!!patch.data.lost_media));
      boolFlagValues.official.add(String(!!patch.data.official));
      boolFlagValues.mtl.add(String(!!patch.data.mtl));
      boolFlagValues.external.add(String(!!patch.data.external));
    }

    const patchTimestamps = patchDates.map((d) => d.getTime());
    const newestPatchTime = patchTimestamps.length ? Math.max(...patchTimestamps) : undefined;
    const oldestPatchTime = patchTimestamps.length ? Math.min(...patchTimestamps) : undefined;
    const newestDownloadTime = downloadDates.length ? Math.max(...downloadDates.map((d) => d.getTime())) : undefined;

    const { meta, filters } = splitExactFieldsIntoMeta(
      config,
      {
        title: game.data.title,
        release_year: game.data.date.getFullYear(),
        patch_release_year: newestPatchTime !== undefined ? new Date(newestPatchTime).getFullYear() : undefined,
        patch_newest: newestPatchTime,
        patch_oldest: oldestPatchTime,
        patch_updated: newestDownloadTime,
        players: game.data.players,
        icon: game.data.icon?.src,
      },
      {
        tag: game.data.tags,
        language: game.data.language,
        platform: game.data.platforms,
        region: game.data.regions,
        developer: slugifyAll(game.data.developers),
        publisher: slugifyAll(game.data.publishers),
        nsfw: String(game.data.nsfw),

        status: [...statuses],
        origin: [...origins],
        patchplatform: [...patchPlatforms],
        patchregion: [...patchRegions],
        creator: [...creators],
        patchpublisher: slugifyAll([...patchPublishers]),
        subs: [...coverage.subs],
        graphics: [...coverage.graphics],
        dub: [...coverage.dub],
        lost_source: [...boolFlagValues.lost_source],
        lost_media: [...boolFlagValues.lost_media],
        official: [...boolFlagValues.official],
        archive: [...boolFlagValues.archive],
        mtl: [...boolFlagValues.mtl],
        external: [...boolFlagValues.external],
      }
    );

    docs.push({ url: gameUrl(game), title: game.data.title, meta, filters });
  }

  return docs;
}

const BUILDERS: Record<ListingConfig["type"], (deps: BuildDeps, config: ListingConfig) => Promise<SourceDoc[]>> = {
  authors: buildAuthorsDocs,
  circles: buildCirclesDocs,
  resources: buildResourcesDocs,
  games: buildGamesDocs,
};

// Scalar (non doc_filters) column list per type, beyond id/url/title/title_normalized.
const SCALAR_COLUMNS: Record<ListingConfig["type"], string[]> = {
  authors: ["avatar"],
  circles: ["logo", "date"],
  resources: ["date", "lastmod"],
  games: [
    "icon",
    "release_year",
    "patch_release_year",
    "players",
    "patch_newest",
    "patch_oldest",
    "patch_updated",
    "nsfw",
  ],
};

// configs.ts field names are trusted directly into SQL rather than
// parameterized, since they're developer-controlled, not user input. That's
// safe, but a typo (a field whose name doesn't match its SCALAR_COLUMNS
// entry, or a rangeField whose metaKey isn't a real column) would otherwise
// only surface as a "no such column" error at query time in engine.ts, far
// from the config that caused it. Catch that here at build time instead.
function assertConfigMatchesColumns(config: ListingConfig) {
  const cols = new Set(["title", ...SCALAR_COLUMNS[config.type]]);
  for (const field of config.fields) {
    if (field.kind === "exact" && field.storage !== "filter" && !cols.has(field.name)) {
      throw new Error(
        `search config error: "${config.type}" field "${field.name}" is kind:"exact" with scalar ` +
          `storage, but there's no matching column in SCALAR_COLUMNS.${config.type}. Add it there, ` +
          `or set storage: "filter" if it should live in doc_filters instead.`
      );
    }
  }
  for (const range of config.rangeFields ?? []) {
    if (!cols.has(range.metaKey)) {
      throw new Error(
        `search config error: "${config.type}" rangeField "${range.paramPrefix}" has metaKey ` +
          `"${range.metaKey}", which isn't in SCALAR_COLUMNS.${config.type}.`
      );
    }
  }
}

function createSchema(db: Database.Database, type: ListingConfig["type"]) {
  const cols = SCALAR_COLUMNS[type].map((c) => `${c} INTEGER`);
  db.exec(`
    CREATE TABLE docs (
      id INTEGER PRIMARY KEY,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      title_normalized TEXT NOT NULL,
      ${cols.join(",\n      ")}
    );

    CREATE TABLE doc_filters (
      doc_id INTEGER NOT NULL REFERENCES docs(id),
      field  TEXT NOT NULL,
      value  TEXT NOT NULL,
      PRIMARY KEY (doc_id, field, value)
    );
    CREATE INDEX idx_doc_filters_field_value ON doc_filters(field, value);
  `);

  if (type === "games") {
    db.exec(`
      CREATE INDEX idx_games_release_year ON docs(release_year);
      CREATE INDEX idx_games_patch_release_year ON docs(patch_release_year);
      CREATE INDEX idx_games_players ON docs(players);
    `);
  }
}

function insertDocs(db: Database.Database, type: ListingConfig["type"], sourceDocs: SourceDoc[], config: ListingConfig) {
  const scalarCols = ["url", "title", "title_normalized", ...SCALAR_COLUMNS[type]];
  const insertDoc = db.prepare(
    `INSERT INTO docs (${scalarCols.join(",")}) VALUES (${scalarCols.map(() => "?").join(",")})`
  );
  const insertFilter = db.prepare(`INSERT OR IGNORE INTO doc_filters (doc_id, field, value) VALUES (?, ?, ?)`);
  const filterStoredFields = config.fields.filter(
    (f) => f.kind === "multi" || f.kind === "text" || f.storage === "filter"
  );

  const insertAll = db.transaction((docs: SourceDoc[]) => {
    for (const doc of docs) {
      const values = scalarCols.map((col) => {
        if (col === "title_normalized") return normalizeTitle(doc.title);
        if (col === "url" || col === "title") return (doc as any)[col];
        return doc.meta?.[col] ?? null;
      });
      const info = insertDoc.run(...values);
      const docId = info.lastInsertRowid as number;

      for (const field of filterStoredFields) {
        const raw = doc.filters?.[field.name];
        if (raw == null) continue;
        const rawValues = Array.isArray(raw) ? raw : [raw];
        for (const v of rawValues) {
          if (v == null || v === "") continue;
          // Slugged fields (developer/publisher/character/etc.) get the
          // slug transform. Other text-kind fields get the same normalize()
          // transform the query engine applies to the typed search term,
          // stored here rather than done on-the-fly in SQL, since SQLite
          // has no built-in accent-folding.
          const stored = SLUGGED_TEXT_FIELDS.has(field.name)
            ? slugify(String(v))
            : field.kind === "text"
              ? normalizeFilterValue(v)
              : String(v);
          if (stored) insertFilter.run(docId, field.name, stored);
        }
      }
    }
  });

  insertAll(sourceDocs);
}

async function buildOne(deps: BuildDeps, outDir: string, type: ListingConfig["type"]) {
  const config = listingConfigs[type];
  assertConfigMatchesColumns(config);
  const dbPath = path.join(outDir, `${type}.sqlite`);
  fs.rmSync(dbPath, { force: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = DELETE"); // read-only shipped file; WAL buys nothing here

  createSchema(db, type);
  const sourceDocs = await BUILDERS[type](deps, config);
  insertDocs(db, type, sourceDocs, config);

  db.exec("VACUUM");
  db.close();

  return sourceDocs.length;
}

/**
 * deps: {
 *   getCollection, getContentDb, getCirclesForAuthor, getCircleMembers,
 *   getCreditedPatches, resolveAvatarSrc, resolveLogoSrc, authorUrl,
 *   circleUrl, gameUrl, resourceUrl?
 * }
 * Writes games.sqlite / authors.sqlite / circles.sqlite / resources.sqlite
 * directly into `outDir`. Returns { [type]: docCount }.
 */
export async function buildAllDbs(deps: BuildDeps, outDir: string): Promise<Record<string, number>> {
  fs.mkdirSync(outDir, { recursive: true });
  const counts: Record<string, number> = {};
  for (const type of Object.keys(listingConfigs) as ListingConfig["type"][]) {
    counts[type] = await buildOne(deps, outDir, type);
  }
  return counts;
}
