// Why this shape (temp-route + astro:build:done), not a Vite closeBundle
// hook: `import("astro:content")` fails with "Vite module runner has been
// closed" from every build-time hook tried (closeBundle, buildEnd,
// buildStart, astro:build:start), the content-layer module runner is torn
// down before any of them fire in this Astro/rolldown-vite version. The
// only place astro:content reliably resolves is inside an actual rendered
// route, since page rendering is what drives that runner.
//
// So: src/pages/api/build-search-db.ts is a real prerendered route (never
// linked, noindex) that runs during Astro's normal build/render pass,
// astro:content resolves fine there, and dumps the content-layer Db to
// .search-db-tmp/db.json. This integration's astro:build:done hook runs
// after Vite/Rollup have finished and just reads that JSON back,
// reconstructing static versions of getCollection/getContentDb/
// getCirclesForAuthor/getCircleMembers/getCreditedPatches from it. build.ts
// is unchanged either way, it only sees `deps` as plain functions.
//
// A future cleanup pass may be tempted to remove the placeholder route "for
// cleanliness", don't, unless this Astro/Vite version's runner-lifecycle
// behavior has actually changed and been re-verified against all four hooks
// above.

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { AstroIntegration, AstroIntegrationLogger } from "astro";
import { buildAllDbs } from "./build.js";
import { resolveAvatarSrc, resolveLogoSrc } from "../media.js";
import type { GameEntry, PatchEntry, AuthorEntry, CircleEntry, ResourceEntry } from "../db.js";

// Deliberately NOT imported from "../url.js": that pulls in db.ts, which has
// a top-level `import { getCollection } from "astro:content"`, fine inside
// Astro's build graph, but this file is imported directly by
// astro.config.mjs before astro:content can resolve at all. These four
// don't touch astro:content, so they're duplicated here. If url.ts's route
// shapes ever change, update both places.
function authorUrl(author: AuthorEntry): string {
  return `/autores/${author.id}/`;
}
function circleUrl(circle: CircleEntry): string {
  return `/circulos/${circle.id}/`;
}
function gameUrl(game: GameEntry): string {
  return `/jogos/${game.id}/`;
}
function resourceUrl(resource: ResourceEntry): string {
  return `/recursos/${resource.id}/`;
}

const TMP_DIR = path.join(process.cwd(), ".search-db-tmp");
const TMP_FILE = path.join(TMP_DIR, "db.json");

// Revives ISO-8601 date strings back into Date objects (JSON.stringify
// turned every Date field into this format). build.ts's doc builders call
// .getTime()/.getFullYear() on several of them, so they need to come back
// as real Dates, not strings.
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
function reviveDates(_key: string, value: unknown): unknown {
  return typeof value === "string" && ISO_DATE_RE.test(value) ? new Date(value) : value;
}

interface SerializedDb {
  games: GameEntry[];
  patches: PatchEntry[];
  authors: AuthorEntry[];
  circles: CircleEntry[];
  resources: ResourceEntry[];
  gameById: Record<string, GameEntry>;
  authorById: Record<string, AuthorEntry>;
  circleById: Record<string, CircleEntry>;
  resourceById: Record<string, ResourceEntry>;
  patchesByGameId: Record<string, PatchEntry[]>;
  patchesByAuthorId: Record<string, PatchEntry[]>;
  patchesByCircleId: Record<string, PatchEntry[]>;
  creditedPatchesByAuthorId: Record<string, PatchEntry[]>;
  creditedPatchesByCircleId: Record<string, PatchEntry[]>;
}

function readTempDb(): SerializedDb {
  if (!fs.existsSync(TMP_FILE)) {
    throw new Error(
      `search-db: ${path.relative(process.cwd(), TMP_FILE)} is missing. This means the ` +
        `placeholder route (src/pages/api/build-search-db.ts) didn't run during the build, ` +
        `check that it wasn't skipped by the adapter's prerendering, and that it didn't fail ` +
        `silently. Refusing to ship a stale or empty search DB.`
    );
  }
  const raw = fs.readFileSync(TMP_FILE, "utf-8");
  const db = JSON.parse(raw, reviveDates) as SerializedDb;

  const requiredKeys: (keyof SerializedDb)[] = ["games", "patches", "authors", "circles", "resources"];
  for (const key of requiredKeys) {
    if (!db[key]) {
      throw new Error(`search-db: ${path.relative(process.cwd(), TMP_FILE)} is missing "${key}".`);
    }
  }
  return db;
}

/** Rebuilds a `deps` object matching build.ts's expected shape, backed by static JSON instead of live astro:content calls. */
function buildDeps(db: SerializedDb) {
  const gameById = new Map(Object.entries(db.gameById));
  const patchesByGameId = new Map(Object.entries(db.patchesByGameId));
  const patchesByCircleId = new Map(Object.entries(db.patchesByCircleId));
  const creditedPatchesByAuthorId = new Map(Object.entries(db.creditedPatchesByAuthorId));
  const creditedPatchesByCircleId = new Map(Object.entries(db.creditedPatchesByCircleId));

  async function getCollection(type: "authors" | "circles" | "resources" | "games") {
    return db[type];
  }

  async function getContentDb() {
    return { ...db, gameById, patchesByGameId, patchesByCircleId };
  }

  // Mirrors src/lib/credits.ts's getCirclesForAuthor: circles whose members[] includes this author id.
  async function getCirclesForAuthor(authorId: string) {
    return db.circles.filter((c) => c.data.members.some((m: any) => m.author === authorId));
  }

  // Mirrors src/lib/credits.ts's getCircleMembers, but only as far as
  // build.ts's buildCirclesDocs actually reads (m.author.id), `roles` is
  // hardcoded to [] here since deriving real roles would mean
  // reimplementing credits.ts's cross-referencing against patches, which
  // this static-JSON reconstruction doesn't have available. Safe today only
  // because build.ts's circles builder never reads `.roles`; if that
  // changes, this stub will silently return empty roles instead of erroring,
  // check here first if circle member roles ever go missing.
  async function getCircleMembers(circle: CircleEntry) {
    return circle.data.members
      .filter((m: any) => m.author)
      .map((m: any) => ({ author: { id: m.author }, authorId: m.author, roles: [] }));
  }

  async function getCreditedPatches(id: string, isCircle: boolean) {
    return (isCircle ? creditedPatchesByCircleId : creditedPatchesByAuthorId).get(id) ?? [];
  }

  return {
    getCollection,
    getContentDb,
    getCirclesForAuthor,
    getCircleMembers,
    getCreditedPatches,
    resolveAvatarSrc,
    resolveLogoSrc,
    authorUrl,
    circleUrl,
    gameUrl,
    resourceUrl,
  };
}

// If the adapter emitted an output page for the placeholder route, strip it
// so it never ships to production. The output shape can be a flat file or a
// directory depending on adapter/version, recursive+force handles either.
function removePlaceholderRouteOutput(outDir: string) {
  fs.rmSync(path.join(outDir, "api", "build-search-db"), { recursive: true, force: true });
  fs.rmSync(path.join(outDir, "api", "build-search-db.html"), { force: true });
}

export default function searchDbIntegration(): AstroIntegration {
  let devBuildTimer: NodeJS.Timeout | undefined;

  // Dev-mode DB build. astro:content does NOT resolve from any integration
  // hook or middleware in this Astro/Vite version - confirmed by testing
  // astro:server:setup AND server.middlewares, both throw the same "Vite
  // module runner has been closed" error as astro:build:done. The ONLY
  // place astro:content reliably resolves is inside an actual rendered
  // route (see comment at top of file). So for dev we reuse that same
  // proven mechanism: hit the existing placeholder route over real HTTP
  // (which forces Astro to actually render it, waking the content-layer
  // runner), then read back the .search-db-tmp/db.json it writes and run
  // it through the same buildDeps()/buildAllDbs() path production uses.
  async function buildDevDb(port: number, outDir: string, logger: AstroIntegrationLogger) {
    try {
      const res = await fetch(`http://localhost:${port}/api/build-search-db`);
      if (!res.ok) {
        throw new Error(`/api/build-search-db responded ${res.status}`);
      }

      const tempDb = readTempDb();
      const deps = buildDeps(tempDb);
      const counts = await buildAllDbs(deps, outDir);

      const summary = Object.entries(counts)
        .map(([type, n]) => `${type}=${n}`)
        .join(" ");
      logger.info(`search-db (dev): built ${summary} -> ${path.relative(process.cwd(), outDir)}/`);
    } catch (err) {
      logger.error(
        `search-db (dev): failed to build search DB for dev server. Search will not work until ` +
          `this is fixed. Original error: ${err instanceof Error ? err.stack : err}`
      );
    } finally {
      fs.rmSync(TMP_DIR, { recursive: true, force: true });
    }
  }

  return {
    name: "search-db",
    hooks: {
      "astro:server:setup": async ({ server, logger }) => {
        // public/ so the dev server serves it like any other static asset,
        // matching how build output ends up reachable at /search/ in prod.
        const devOutDir = path.join(process.cwd(), "public", "search");

        let dbReady: Promise<void> | null = null;
        let hasBuiltOnce = false;

        function triggerBuild(): Promise<void> {
          const port = server.config.server.port ?? 4321;
          dbReady = buildDevDb(port, devOutDir, logger).then(() => {
            hasBuiltOnce = true;
          });
          return dbReady;
        }

        server.middlewares.use(async (req, _res, next) => {
          // Skip the placeholder route's own requests, and skip until the
          // server has actually started listening (fetch would fail before
          // that). hasBuiltOnce/dbReady guards against firing more than once
          // concurrently.
          if (!hasBuiltOnce && !dbReady && req.url !== "/api/build-search-db") {
            triggerBuild().catch(() => {
              // Already logged inside buildDevDb, just prevent an
              // unhandled rejection here.
            });
          }
          next();
        });

        function scheduleRebuild(file: string) {
          if (!file.includes(`${path.sep}content${path.sep}`)) return;
          if (!hasBuiltOnce) return;
          clearTimeout(devBuildTimer);
          devBuildTimer = setTimeout(() => {
            triggerBuild();
          }, 300);
        }
        server.watcher.on("change", scheduleRebuild);
        server.watcher.on("add", scheduleRebuild);
        server.watcher.on("unlink", scheduleRebuild);
      },

      "astro:build:done": async ({ dir, logger }) => {
        const outDir = fileURLToPath(dir);
        const searchOutDir = path.join(outDir, "search");

        try {
          const tempDb = readTempDb();
          const deps = buildDeps(tempDb);

          const counts = await buildAllDbs(deps, searchOutDir);

          const summary = Object.entries(counts)
            .map(([type, n]) => `${type}=${n}`)
            .join(" ");
          logger.info(`search-db: built ${summary} -> ${path.relative(process.cwd(), searchOutDir)}/`);

          removePlaceholderRouteOutput(outDir);
        } finally {
          // Always clean up, success or failure, so a failed run can't leave stale data for the next build.
          fs.rmSync(TMP_DIR, { recursive: true, force: true });
        }
      },
    },
  };
}
