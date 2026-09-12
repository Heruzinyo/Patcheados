import { getCollection, type CollectionEntry } from "astro:content";

export type GameEntry = CollectionEntry<"games">;
export type PatchEntry = CollectionEntry<"patches">;
export type AuthorEntry = CollectionEntry<"authors">;
export type CircleEntry = CollectionEntry<"circles">;
export type ResourceEntry = CollectionEntry<"resources">;

/** Patch ids come out of the glob loader as "{game}/{patch}"; this pulls the game slug back out. */
export function gameIdForPatch(patch: PatchEntry): string {
  const parts = patch.id.split("/");
  return parts[0];
}

export function patchSlug(patch: PatchEntry): string {
  const parts = patch.id.split("/");
  return parts[parts.length - 1];
}

export interface Db {
  games: GameEntry[];
  patches: PatchEntry[];
  authors: AuthorEntry[];
  circles: CircleEntry[];
  resources: ResourceEntry[];

  gameById: Map<string, GameEntry>;
  authorById: Map<string, AuthorEntry>;
  circleById: Map<string, CircleEntry>;
  resourceById: Map<string, ResourceEntry>;

  patchesByGameId: Map<string, PatchEntry[]>;
  patchesByAuthorId: Map<string, PatchEntry[]>;
  patchesByCircleId: Map<string, PatchEntry[]>;

  /** Indexed off the detailed credits[] array (role/character breakdown), distinct from
   * patchesByAuthorId/CircleId above, which index the flat ownership authors[]/circles[] arrays. */
  creditedPatchesByAuthorId: Map<string, PatchEntry[]>;
  creditedPatchesByCircleId: Map<string, PatchEntry[]>;
}

let cached: Db | null = null;

/**
 * Loads every collection once per build and builds every derived index off
 * that single pass. Every other lib/ helper should read from these Maps
 * instead of calling getCollection/getEntry again.
 */
export async function getDb(): Promise<Db> {
  if (cached) return cached;

  const [games, patches, authors, circles, resources] = await Promise.all([
    getCollection("games"),
    getCollection("patches"),
    getCollection("authors"),
    getCollection("circles"),
    getCollection("resources"),
  ]);

  const gameById = new Map(games.map((g) => [g.id, g]));
  const authorById = new Map(authors.map((a) => [a.id, a]));
  const circleById = new Map(circles.map((c) => [c.id, c]));
  const resourceById = new Map(resources.map((r) => [r.id, r]));

  const patchesByGameId = new Map<string, PatchEntry[]>();
  const patchesByAuthorId = new Map<string, PatchEntry[]>();
  const patchesByCircleId = new Map<string, PatchEntry[]>();
  const creditedPatchesByAuthorId = new Map<string, PatchEntry[]>();
  const creditedPatchesByCircleId = new Map<string, PatchEntry[]>();

  for (const patch of patches) {
    const gameId = gameIdForPatch(patch);
    if (!patchesByGameId.has(gameId)) patchesByGameId.set(gameId, []);
    patchesByGameId.get(gameId)!.push(patch);

    for (const authorId of patch.data.authors) {
      if (!patchesByAuthorId.has(authorId)) patchesByAuthorId.set(authorId, []);
      patchesByAuthorId.get(authorId)!.push(patch);
    }
    for (const circleId of patch.data.circles) {
      if (!patchesByCircleId.has(circleId)) patchesByCircleId.set(circleId, []);
      patchesByCircleId.get(circleId)!.push(patch);
    }

    const seenCreditAuthors = new Set<string>();
    const seenCreditCircles = new Set<string>();
    for (const credit of patch.data.credits) {
      const isCircle = "circle" in credit;
      const creditId = isCircle ? credit.circle : credit.author;
      const target = isCircle ? creditedPatchesByCircleId : creditedPatchesByAuthorId;
      const seen = isCircle ? seenCreditCircles : seenCreditAuthors;
      if (seen.has(creditId)) continue;
      seen.add(creditId);
      if (!target.has(creditId)) target.set(creditId, []);
      target.get(creditId)!.push(patch);
    }
  }

  cached = {
    games,
    patches,
    authors,
    circles,
    resources,
    gameById,
    authorById,
    circleById,
    resourceById,
    patchesByGameId,
    patchesByAuthorId,
    patchesByCircleId,
    creditedPatchesByAuthorId,
    creditedPatchesByCircleId,
  };
  return cached;
}

export function getGameForPatch(db: Db, patch: PatchEntry): GameEntry | undefined {
  return db.gameById.get(gameIdForPatch(patch));
}

export interface PatchWithGame {
  patch: PatchEntry;
  game: GameEntry;
}

/** Pairs patches with their resolved game via the index, no per-patch getEntry. */
export function withGames(db: Db, patches: PatchEntry[]): PatchWithGame[] {
  const out: PatchWithGame[] = [];
  for (const patch of patches) {
    const game = getGameForPatch(db, patch);
    if (game) out.push({ patch, game });
  }
  return out;
}
