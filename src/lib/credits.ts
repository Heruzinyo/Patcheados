import type { PatchEntry } from "./db";
import { getDb } from "./db";
import { toLabel } from "./game";
import { circleUrl, authorUrl } from "./url";
import { getVocab } from "./search/vocab";
import { resolveAvatarSrc, resolveLogoSrc } from "./media";

/**
 * Resolves a patch's authors + circles (the flat ownership arrays, not the
 * detailed credits[] roles breakdown) to display titles, sorted. Falls back
 * to the raw slug if a referenced author/circle entry doesn't exist.
 */
export async function resolveCreatorNames(patch: PatchEntry): Promise<string[]> {
  const db = await getDb();
  const names: string[] = [];

  for (const authorId of patch.data.authors) {
    const author = db.authorById.get(authorId);
    names.push(author ? author.data.title : authorId);
  }
  for (const circleId of patch.data.circles) {
    const circle = db.circleById.get(circleId);
    names.push(circle ? circle.data.title : circleId);
  }

  return names.sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export async function resolveCreatorNamesLabel(patch: PatchEntry): Promise<string> {
  return (await resolveCreatorNames(patch)).join(", ");
}

/**
 * All patches where `id` appears in the detailed credits[] array, distinct from
 * the flat ownership authors[]/circles[] arrays (see db.ts's creditedPatchesBy*Id
 * indexes). `isCircle` disambiguates author vs. circle ids that might collide.
 */
export async function getCreditedPatches(id: string, isCircle: boolean): Promise<PatchEntry[]> {
  const db = await getDb();
  const index = isCircle ? db.creditedPatchesByCircleId : db.creditedPatchesByAuthorId;
  return index.get(id) ?? [];
}

/** Joins character names */
function formatCharacterList(characters: string[]): string {
  if (characters.length === 0) return "";
  if (characters.length === 1) return characters[0];
  return `${characters.slice(0, -1).join(", ")} e ${characters[characters.length - 1]}`;
}

/** Formats a single roles[] entry as "Role" or "Role (Character e Character)". */
function formatRoleLabel(
  rolesVocab: import("./vocab").VocabMap | undefined,
  r: { role: string; characters?: string[] }
): string {
  const roleLabel = toLabel(rolesVocab, r.role);
  const chars = r.characters ?? [];
  return chars.length > 0 ? `${roleLabel} (${formatCharacterList(chars)})` : roleLabel;
}

/** Role labels for a credited entity on a patch, formatted as "Role" or "Role (Character e Character)". */
export function getCreditRoles(
  patch: PatchEntry,
  id: string,
  isCircle: boolean,
  rolesVocab: import("./vocab").VocabMap | undefined
): string[] {
  const labels: string[] = [];
  for (const credit of patch.data.credits) {
    const creditId = "circle" in credit ? credit.circle : credit.author;
    const creditIsCircle = "circle" in credit;
    if (creditId !== id || creditIsCircle !== isCircle) continue;
    for (const r of credit.roles) {
      labels.push(formatRoleLabel(rolesVocab, r));
    }
  }
  return labels.sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export async function getCreditRolesLabel(patch: PatchEntry, id: string, isCircle: boolean): Promise<string> {
  const vocab = await getVocab();
  return getCreditRoles(patch, id, isCircle, vocab.get("roles")).join(", ");
}

/** Circles this author is a member of, per circles[].members[].author, small collection, plain filter is fine. */
export async function getCirclesForAuthor(authorId: string) {
  const db = await getDb();
  return db.circles.filter((c) => c.data.members.some((m) => m.author === authorId));
}

export interface ResolvedCredit {
  id: string;
  title: string;
  href: string | null;
  image?: string;
  roles: string[];
}

/** Groups a patch's credits[] into circles and authors, aggregating role labels per name in first-appearance order. */
export async function resolvePatchCredits(
  patch: PatchEntry
): Promise<{ circles: ResolvedCredit[]; authors: ResolvedCredit[] }> {
  const db = await getDb();
  const vocab = await getVocab();
  const rolesVocab = vocab.get("roles");

  const circleOrder: string[] = [];
  const authorOrder: string[] = [];
  const circleRoles = new Map<string, string[]>();
  const authorRoles = new Map<string, string[]>();

  for (const credit of patch.data.credits) {
    const isCircle = "circle" in credit;
    const creditId = isCircle ? credit.circle : credit.author;
    const order = isCircle ? circleOrder : authorOrder;
    const rolesMap = isCircle ? circleRoles : authorRoles;

    if (!rolesMap.has(creditId)) {
      rolesMap.set(creditId, []);
      order.push(creditId);
    }
    const labels = rolesMap.get(creditId)!;
    for (const r of credit.roles) {
      labels.push(formatRoleLabel(rolesVocab, r));
    }
  }

  const circles: ResolvedCredit[] = circleOrder.map((id) => {
    const circle = db.circleById.get(id);
    return {
      id,
      title: circle?.data.title ?? id,
      href: circle ? circleUrl(circle) : null,
      image: circle ? resolveLogoSrc(circle) : undefined,
      roles: (circleRoles.get(id) ?? []).sort((a, b) => a.localeCompare(b, "pt-BR")),
    };
  });

  const authors: ResolvedCredit[] = authorOrder.map((id) => {
    const author = db.authorById.get(id);
    return {
      id,
      title: author?.data.title ?? id,
      href: author ? authorUrl(author) : null,
      image: author ? resolveAvatarSrc(author) : undefined,
      roles: (authorRoles.get(id) ?? []).sort((a, b) => a.localeCompare(b, "pt-BR")),
    };
  });

  circles.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
  authors.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));

  return { circles, authors };
}

export interface ResolvedMember {
  author: import("./db").AuthorEntry | null;
  authorId: string;
  roles: string[];
}

/** Resolves a circle's members to author entries via the index, no per-member getEntry. */
export async function getCircleMembers(circle: import("./db").CircleEntry): Promise<ResolvedMember[]> {
  const db = await getDb();
  const vocab = await getVocab();
  const rolesVocab = vocab.get("roles");
  return circle.data.members
    .filter((m) => m.author)
    .map((m) => ({
      author: db.authorById.get(m.author as string) ?? null,
      authorId: m.author as string,
      roles: m.roles.map((r) => toLabel(rolesVocab, r)).sort((a, b) => a.localeCompare(b, "pt-BR")),
    }))
    .sort((a, b) => (a.author?.data.title ?? "").localeCompare(b.author?.data.title ?? "", "pt-BR"));
}
