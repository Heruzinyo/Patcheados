// Placeholder route, NOT a real API endpoint, never linked from anywhere
// in the site. Its only job is to run during `astro build`'s normal
// prerendering pass, which is the one point in the build where the
// content-layer Vite module runner is still alive (see the comment block
// at the top of ../../lib/search/integration.ts for why this is required).
//
// It dumps the full content-layer `Db` (getContentDb()'s collections +
// derived Maps) to `.search-db-tmp/db.json` at the repo root.
// `astro:build:done` (in integration.ts) picks that file up afterwards,
// once Vite has already torn its runner down, and reconstructs static
// versions of getCollection/getContentDb/getCirclesForAuthor/
// getCircleMembers/getCreditedPatches from it.
//
// Must NOT be crawlable or indexed:
//   - excluded from the sitemap (see astro.config.mjs, add the `api/`
//     glob exclusion there once a sitemap integration is added; none is
//     configured yet in this repo)
//   - no <a> anywhere should ever point to /api/build-search-db
//   - returns X-Robots-Tag: noindex and a trivial body regardless

import type { APIRoute } from "astro";
import path from "node:path";
import fs from "node:fs";
import { getDb } from "../../lib/db";

export const prerender = true;

// Map -> plain object. Arrays/entries are left alone (already JSON-safe
// content-collection data); Dates round-trip via JSON.stringify's default
// toJSON() and are revived on the read side in integration.ts.
function mapToObject<V>(map: Map<string, V>): Record<string, V> {
  return Object.fromEntries(map.entries());
}

export const GET: APIRoute = async () => {
  // Let this throw, a broken content collection should fail the build
  // loudly rather than silently ship an empty/partial search DB.
  const db = await getDb();

  const serializable = {
    games: db.games,
    patches: db.patches,
    authors: db.authors,
    circles: db.circles,
    resources: db.resources,

    gameById: mapToObject(db.gameById),
    authorById: mapToObject(db.authorById),
    circleById: mapToObject(db.circleById),
    resourceById: mapToObject(db.resourceById),

    patchesByGameId: mapToObject(db.patchesByGameId),
    patchesByAuthorId: mapToObject(db.patchesByAuthorId),
    patchesByCircleId: mapToObject(db.patchesByCircleId),

    creditedPatchesByAuthorId: mapToObject(db.creditedPatchesByAuthorId),
    creditedPatchesByCircleId: mapToObject(db.creditedPatchesByCircleId),
  };

  const tmpDir = path.join(process.cwd(), ".search-db-tmp");
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.writeFileSync(path.join(tmpDir, "db.json"), JSON.stringify(serializable));

  return new Response("", {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "X-Robots-Tag": "noindex",
    },
  });
};
