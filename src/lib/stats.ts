import { getDb } from "./db";

export interface SiteStats {
  games: number;
  patches: number;
  authors: number;
  circles: number;
}

export async function getSiteStats(): Promise<SiteStats> {
  const db = await getDb();
  return {
    games: db.games.length,
    patches: db.patches.length,
    authors: db.authors.length,
    circles: db.circles.length,
  };
}
