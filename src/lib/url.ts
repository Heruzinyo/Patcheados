import type { GameEntry, PatchEntry, AuthorEntry, CircleEntry, ResourceEntry } from "./db";
import { gameIdForPatch, patchSlug } from "./db";

/**
 * Every route is Portuguese. This is the single place that builds hrefs,
 * every card/component should import from here instead of hand-building
 * strings, to avoid links pointing at the wrong route.
 */

export function gameUrl(game: GameEntry): string {
  return `/jogos/${game.id}/`;
}

export function patchUrl(game: GameEntry, patch: PatchEntry): string {
  return `/jogos/${game.id}/${patchSlug(patch)}/`;
}

/** Convenience for call sites that only have the patch (id already encodes the game slug). */
export function patchUrlFromPatch(patch: PatchEntry): string {
  return `/jogos/${gameIdForPatch(patch)}/${patchSlug(patch)}/`;
}

export function authorUrl(author: AuthorEntry): string {
  return `/autores/${author.id}/`;
}

export function circleUrl(circle: CircleEntry): string {
  return `/circulos/${circle.id}/`;
}

export function resourceUrl(resource: ResourceEntry): string {
  return `/recursos/${resource.id}/`;
}

export function gamesListUrl(params?: Record<string, string>): string {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
  return `/jogos/${qs}`;
}
