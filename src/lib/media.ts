import type { AuthorEntry, CircleEntry } from "./db";

/**
 * Single source of truth for "does this author/circle have a custom image,
 * or should we fall back to the generic placeholder". Every place that
 * needs an avatar/logo src should call these instead of reading
 * author.data.avatar?.src / circle.data.logo?.src directly, so the
 * fallback can't get missed.
 */

const AVATAR = "/avatar.png";
const LOGO = "/logo.png";

export function resolveAvatarSrc(author: Pick<AuthorEntry, "data">): string {
  return author.data.avatar?.src ?? AVATAR;
}

export function resolveLogoSrc(circle: Pick<CircleEntry, "data">): string {
  return circle.data.logo?.src ?? LOGO;
}
