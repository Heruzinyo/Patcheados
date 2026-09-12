// One sql.js database per doc type ("games" | "authors" | "circles" |
// "resources"), fetched from /search/<type>.sqlite and cached per page
// load, a listing page only ever needs its own type's DB.
//
// sql.js's wasm asset is pulled straight from the npm package via `?url`,
// which Vite/Astro fingerprint and copy into the build output like any
// other asset. initSqlJs is imported as a normal (CJS-interop) module.

import initSqlJsFactory from "sql.js/dist/sql-wasm.js";
// eslint-disable-next-line import/no-unresolved -- Vite asset URL import
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";

export type ListingType = "games" | "authors" | "circles" | "resources";

let sqlPromise: Promise<any> | null = null;

function getSQL() {
  sqlPromise ??= initSqlJsFactory({ locateFile: () => sqlWasmUrl });
  return sqlPromise;
}

const dbPromises: Partial<Record<ListingType, Promise<any>>> = {};

export function getSqlDb(type: ListingType) {
  dbPromises[type] ??= (async () => {
    const SQL = await getSQL();

    const response = await fetch(`/search/${type}.sqlite`);
    if (!response.ok) {
      throw new Error(`Failed to fetch /search/${type}.sqlite: ${response.status}`);
    }
    const buf = await response.arrayBuffer();

    return new SQL.Database(new Uint8Array(buf));
  })();

  return dbPromises[type]!;
}

/**
 * Runs a parameterized query and returns rows as plain objects
 * (sql.js's native db.exec() returns {columns, values}, this adapts that
 * to an array of {col: value} rows, which is what the call sites want).
 */
export function queryRows(db: any, sql: string, params: unknown[] = []): Record<string, unknown>[] {
  const res = db.exec(sql, params);
  if (!res.length) return [];
  const { columns, values } = res[0];
  return values.map((row: unknown[]) => Object.fromEntries(columns.map((c: string, i: number) => [c, row[i]])));
}

/** Convenience for COUNT(*)-style single-scalar queries. */
export function queryScalar(db: any, sql: string, params: unknown[] = []): unknown {
  const res = db.exec(sql, params);
  return res.length ? res[0].values[0][0] : null;
}
