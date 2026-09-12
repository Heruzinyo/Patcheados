// One engine, per-page config (src/lib/search/configs.ts). Each listing
// page's bootstrap does: import("/src/lib/search/engine.ts").then(m => m.initListing(config))
// (or a relative import if bundled directly from an Astro page/component).
//
// Filtering/sorting/pagination happen in SQL against /search/<type>.sqlite.

import { slugifyTerms } from "../slug.js";
import { getSqlDb, queryRows, queryScalar, type ListingType } from "./sql.js";
import { SLUGGED_TEXT_FIELDS, type ListingConfig } from "./configs.js";

function normalize(str: unknown): string {
  return (str ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function escapeHtml(str: unknown): string {
  return (str ?? "").toString().replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c as string] as string));
}

function getFormParams(form: HTMLFormElement, config: ListingConfig): URLSearchParams {
  const params = new URLSearchParams();
  const formData = new FormData(form);

  const search = formData.get("search");
  if (search) params.set("search", String(search));

  const order = formData.get("order");
  if (order) params.set("order", String(order));

  for (const field of config.fields) {
    if (field.kind === "multi") {
      const values = formData.getAll(field.name);
      if (values.length) params.set(field.name, values.join(","));
    } else {
      const value = formData.get(field.name);
      if (value) params.set(field.name, String(value));
    }
  }

  for (const range of config.rangeFields ?? []) {
    const from = formData.get(`${range.paramPrefix}-from`);
    const to = formData.get(`${range.paramPrefix}-to`);
    if (from) params.set(`${range.paramPrefix}-from`, String(from));
    if (to) params.set(`${range.paramPrefix}-to`, String(to));
  }

  return params;
}

function applyParamsToForm(form: HTMLFormElement, params: URLSearchParams, config: ListingConfig) {
  const searchInput = form.querySelector<HTMLInputElement>("#search");
  if (searchInput && params.get("search")) searchInput.value = params.get("search")!;

  const orderSelect = form.querySelector<HTMLSelectElement>("#order");
  if (orderSelect && params.get("order")) orderSelect.value = params.get("order")!;

  for (const field of config.fields) {
    if (field.kind === "multi") {
      const values = (params.get(field.name) ?? "").split(",").filter(Boolean);
      if (!values.length) continue;
      form.querySelectorAll<HTMLInputElement>(`input[name="${field.name}"]`).forEach((el) => {
        if (values.includes(el.value)) el.checked = true;
      });
    } else {
      const value = params.get(field.name);
      if (!value) continue;
      const el = form.querySelector<HTMLInputElement>(`[name="${field.name}"]`);
      if (el) el.value = value;
    }
  }

  for (const range of config.rangeFields ?? []) {
    const from = params.get(`${range.paramPrefix}-from`);
    const to = params.get(`${range.paramPrefix}-to`);
    if (from) {
      const el = form.querySelector<HTMLInputElement>(`[name="${range.paramPrefix}-from"]`);
      if (el) el.value = from;
    }
    if (to) {
      const el = form.querySelector<HTMLInputElement>(`[name="${range.paramPrefix}-to"]`);
      if (el) el.value = to;
    }
  }
}

/** Builds the WHERE clause (+ params) and ORDER BY clause for the current form state. */
function buildQuery(params: URLSearchParams, config: ListingConfig) {
  const whereClauses: string[] = [];
  const args: unknown[] = [];

  for (const field of config.fields) {
    if (field.kind === "multi") {
      const values = (params.get(field.name) ?? "").split(",").filter(Boolean);
      if (!values.length) continue;
      for (const value of values) {
        whereClauses.push(`id IN (SELECT doc_id FROM doc_filters WHERE field = ? AND value = ?)`);
        args.push(field.name, value);
      }
    } else if (field.kind === "text") {
      const raw = params.get(field.name);
      if (!raw) continue;
      if (SLUGGED_TEXT_FIELDS.has(field.name)) {
        // Every space-separated typed term must match SOME stored slug for this field (AND across terms).
        for (const term of slugifyTerms(raw)) {
          whereClauses.push(`id IN (SELECT doc_id FROM doc_filters WHERE field = ? AND value LIKE '%' || ? || '%')`);
          args.push(field.name, term);
        }
      } else {
        const needle = normalize(raw);
        if (!needle) continue;
        whereClauses.push(`id IN (SELECT doc_id FROM doc_filters WHERE field = ? AND value LIKE '%' || ? || '%')`);
        args.push(field.name, needle);
      }
    } else if (field.kind === "exact") {
      const wanted = params.get(field.name);
      if (!wanted) continue;
      if (field.storage === "filter") {
        // Value lives in doc_filters, match if any of the entity's stored values equals it.
        whereClauses.push(`id IN (SELECT doc_id FROM doc_filters WHERE field = ? AND value = ?)`);
        args.push(field.name, wanted);
      } else {
        // Column-backed exact field (nsfw): mirror build.ts's boolean "true"/"false" -> 1/0 conversion.
        const value = wanted === "true" ? 1 : wanted === "false" ? 0 : wanted;
        whereClauses.push(`${field.name} = ?`);
        args.push(value);
      }
    }
  }

  for (const range of config.rangeFields ?? []) {
    const from = params.get(`${range.paramPrefix}-from`);
    const to = params.get(`${range.paramPrefix}-to`);
    if (from) {
      whereClauses.push(`${range.metaKey} >= ?`);
      args.push(Number(from));
    }
    if (to) {
      whereClauses.push(`${range.metaKey} <= ?`);
      args.push(Number(to));
    }
  }

  const searchTerm = normalize(params.get("search"));
  if (searchTerm) {
    whereClauses.push(`title_normalized LIKE '%' || ? || '%'`);
    args.push(searchTerm);
  }

  const where = whereClauses.length ? whereClauses.join(" AND ") : "1=1";

  const sortValue = params.get("order") || config.sorts[0]?.value;
  const sort = config.sorts.find((s) => s.value === sortValue) ?? config.sorts[0];

  let orderBy = "";
  if (sort) {
    const dir = sort.direction === "desc" ? "DESC" : "ASC";
    const orderColumn = sort.metaKey === "title" ? "title_normalized" : sort.metaKey;
    orderBy = sort.missingLast
      ? `ORDER BY (${orderColumn} IS NULL) ASC, ${orderColumn} ${dir}`
      : `ORDER BY ${orderColumn} ${dir}`;
  }

  return { where, args, orderBy, sort };
}

/**
 * Loads every doc_filters row for the given doc ids, grouped as
 * { [docId]: { [field]: [values...] } }, the shape renderCard expects.
 */
function loadFiltersForDocs(db: any, ids: number[]): Record<number, Record<string, string[]>> {
  if (!ids.length) return {};
  const placeholders = ids.map(() => "?").join(",");
  const rows = queryRows(db, `SELECT doc_id, field, value FROM doc_filters WHERE doc_id IN (${placeholders})`, ids);
  const byId: Record<number, Record<string, string[]>> = {};
  for (const row of rows) {
    const docId = row.doc_id as number;
    const field = row.field as string;
    const value = row.value as string;
    (byId[docId] ??= {});
    (byId[docId][field] ??= []).push(value);
  }
  return byId;
}

function rowsToDocs(rows: Record<string, unknown>[], filtersByDocId: Record<number, Record<string, string[]>>) {
  return rows.map((row) => ({
    url: row.url as string,
    meta: row,
    filters: filtersByDocId[row.id as number] ?? {},
  }));
}

function renderCard(type: ListingType, doc: any, vocab: any) {
  const url = doc.url;
  const title = escapeHtml(doc.meta?.title ?? "");

  if (type === "circles") {
    const logo = doc.meta?.logo ? `<img src="${doc.meta.logo}" alt="" loading="lazy" />` : "";
    return `<a href="${url}" class="grid card-row gap-sm bordered bg-frame padding-sm align-center pointer action">
      <div class="wrapper logo bordered bg-body flex align-center justify-center">${logo}</div>
      <div class="min-w-0"><span class="target">${title}</span></div>
    </a>`;
  }

  if (type === "authors") {
    const avatar = doc.meta?.avatar ? `<img src="${doc.meta.avatar}" alt="" loading="lazy" />` : "";
    return `<a href="${url}" class="grid card-row gap-sm bordered bg-frame padding-sm align-center pointer action">
      <div class="wrapper icon bordered bg-body">${avatar}</div>
      <div class="min-w-0"><span class="target">${title}</span></div>
    </a>`;
  }

  if (type === "games") {
    const icon = doc.meta?.icon ? `<img src="${doc.meta.icon}" alt="" loading="lazy" />` : "";
    const year = escapeHtml(doc.meta?.release_year ?? "");
    const platforms = (doc.filters?.platform ?? [])
      .map((p: string) => `<span class="bordered bg-body padding-rect-xs small">${escapeHtml(vocab?.platform?.[p] ?? p)}</span>`)
      .join("");
    return `<a href="${url}" class="grid card-row gap-sm bordered bg-frame padding-sm align-center pointer action">
      <div class="wrapper icon bordered bg-body">${icon}</div>
      <div class="flex flex-wrap justify-between align-center gap-sm min-w-0">
        <div class="min-w-0">
          <div><span class="target margin-right-xs">${title}</span><small class="muted">${year}</small></div>
        </div>
        <div class="flex flex-wrap align-center gap-sm min-w-0">${platforms}</div>
      </div>
    </a>`;
  }

  // resources
  const categories = (doc.filters?.category ?? [])
    .map((c: string) => `<span class="bordered bg-body padding-rect-xs small">${escapeHtml(vocab?.category?.[c] ?? c)}</span>`)
    .join("");
  return `<a href="${url}" class="grid card-row gap-sm no-media bordered bg-frame padding-sm align-center pointer action">
    <div class="flex flex-wrap justify-between align-center gap-sm min-w-0">
      <div class="min-w-0"><div><span class="target">${title}</span></div></div>
      <div class="flex flex-wrap align-center gap-sm min-w-0">${categories}</div>
    </div>
  </a>`;
}

const DOTS = "…";

// Builds the windowed page list, e.g. for total=10:
// current 1-3  -> [1,2,3,4,5,DOTS,10]
// current 4-7  -> [1,DOTS,current-1,current,current+1,DOTS,10]
// current 8-10 -> [1,DOTS,6,7,8,9,10]
function getPaginationRange(current: number, total: number, siblingCount = 1): (number | string)[] {
  const range = (start: number, end: number) => {
    const out: number[] = [];
    for (let i = start; i <= end; i++) out.push(i);
    return out;
  };

  const totalPageNumbers = siblingCount * 2 + 5;
  if (totalPageNumbers >= total) return range(1, total);

  const leftSiblingIndex = Math.max(current - siblingCount, 1);
  const rightSiblingIndex = Math.min(current + siblingCount, total);

  const shouldShowLeftDots = leftSiblingIndex > 2;
  const shouldShowRightDots = rightSiblingIndex < total - 2;

  if (!shouldShowLeftDots && shouldShowRightDots) {
    const leftItemCount = 3 + 2 * siblingCount;
    return [...range(1, leftItemCount), DOTS, total];
  }

  if (shouldShowLeftDots && !shouldShowRightDots) {
    const rightItemCount = 3 + 2 * siblingCount;
    return [1, DOTS, ...range(total - rightItemCount + 1, total)];
  }

  return [1, DOTS, ...range(leftSiblingIndex, rightSiblingIndex), DOTS, total];
}

function renderPagination(nav: Element, page: number, totalPages: number, onPageChange: (p: number) => void) {
  nav.innerHTML = "";
  if (totalPages <= 1) return;

  const makeArrow = (label: string, targetPage: number, disabled: boolean, ariaLabel: string) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.innerHTML = label;
    btn.setAttribute("aria-label", ariaLabel);
    btn.disabled = disabled;
    btn.addEventListener("click", () => onPageChange(targetPage));
    return btn;
  };

  const makePageButton = (targetPage: number) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = String(targetPage);
    if (targetPage === page) btn.setAttribute("aria-pressed", "true");
    btn.addEventListener("click", () => onPageChange(targetPage));
    return btn;
  };

  const makeDotsButton = () => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = DOTS;
    btn.dataset.pageJump = "";
    btn.setAttribute("aria-label", "Ir para página");
    btn.addEventListener("click", () => {
      const target = window.prompt(`Ir para qual página? (1–${totalPages})`);
      const parsed = Number(target);
      if (Number.isInteger(parsed) && parsed >= 1 && parsed <= totalPages) {
        onPageChange(parsed);
      }
    });
    return btn;
  };

  const frag = document.createDocumentFragment();
  frag.appendChild(makeArrow("&lt;", page - 1, page <= 1, "Página anterior"));

  for (const entry of getPaginationRange(page, totalPages)) {
    frag.appendChild(entry === DOTS ? makeDotsButton() : makePageButton(entry as number));
  }

  frag.appendChild(makeArrow("&gt;", page + 1, page >= totalPages, "Próxima página"));
  nav.appendChild(frag);
}

// resultsEl/paginationEl are found as descendants of `root`, but the filter
// <aside><form> typically lives as a *sibling* of root, not inside it, a
// plain `root.querySelector` wouldn't find it. Walk up from root to the
// nearest ancestor containing a matching form, so a second unrelated
// listing widget elsewhere on the page can't be picked up by mistake.
function findNearestScoped<T extends Element>(root: Element, selector: string): T | null {
  let el: Element | null = root.parentElement;
  while (el) {
    const found = el.querySelector<T>(selector);
    if (found) return found;
    el = el.parentElement;
  }
  // No shared ancestor found (unusual layout), last resort.
  return document.querySelector<T>(selector);
}

export async function initListing(config: ListingConfig, vocab: any = {}) {
  const root = document.querySelector(`[data-${config.type}-search]`);
  if (!root) return;

  const form = findNearestScoped<HTMLFormElement>(root, "aside form");
  const resultsEl = root.querySelector(`[data-${config.type}-results]`);
  const paginationEl = root.querySelector(`[data-${config.type}-pagination]`);
  if (!form || !resultsEl || !paginationEl) return;

  let currentPage = 1;
  let allDocs: any[] = [];

  function updateUrl(params: URLSearchParams) {
    const qs = params.toString();
    history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
  }

  function renderPage(total: number) {
    resultsEl!.innerHTML = allDocs.map((doc) => renderCard(config.type, doc, vocab)).join("");

    const totalPages = Math.max(1, Math.ceil(total / config.perPage));
    renderPagination(paginationEl!, currentPage, totalPages, (page) => {
      currentPage = page;
      runSearch({ resetPage: false });
      window.scrollTo({ top: (root as HTMLElement).offsetTop, behavior: "smooth" });
    });
  }

  async function runSearch({ resetPage = true } = {}) {
    const params = getFormParams(form!, config);
    updateUrl(params);
    if (resetPage) currentPage = 1;

    const db = await getSqlDb(config.type);
    const { where, args, orderBy, sort } = buildQuery(params, config);

    const total = (queryScalar(db, `SELECT COUNT(*) FROM docs WHERE ${where}`, args) as number) ?? 0;

    const perPage = config.perPage;
    const offset = (currentPage - 1) * perPage;
    const rows = queryRows(db, `SELECT * FROM docs WHERE ${where} ${orderBy} LIMIT ? OFFSET ?`, [
      ...args,
      perPage,
      offset,
    ]);

    const filtersByDocId = loadFiltersForDocs(db, rows.map((r) => r.id as number));
    let docs = rowsToDocs(rows, filtersByDocId);

    // SQL's ORDER BY on title is byte order, not locale-aware, narrow to
    // this page's rowset in SQL, then re-sort just that page in JS with localeCompare.
    if (sort && !sort.numeric) {
      const dir = sort.direction === "desc" ? -1 : 1;
      docs = [...docs].sort(
        (a, b) => String(a.meta?.[sort.metaKey] ?? "").localeCompare(String(b.meta?.[sort.metaKey] ?? ""), "pt-BR") * dir
      );
    }

    allDocs = docs;
    renderPage(total);
  }

  // Populate sort <select> options from config, so per-page sort lists can't drift from what the engine supports.
  const orderSelect = form.querySelector<HTMLSelectElement>("#order");
  if (orderSelect && !orderSelect.options.length) {
    for (const sort of config.sorts) {
      const opt = document.createElement("option");
      opt.value = sort.value;
      opt.textContent = sort.label;
      orderSelect.appendChild(opt);
    }
  }

  // Restore state from URL on load.
  const initialParams = new URLSearchParams(location.search);
  applyParamsToForm(form, initialParams, config);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    runSearch();
  });
  form.addEventListener("change", (e) => {
    // checkboxes/selects apply immediately
    if ((e.target as Element).matches('input[type="checkbox"], select')) runSearch();
  });

  let debounceTimer: number;
  form.addEventListener("input", (e) => {
    // text/number inputs apply after a short pause in typing
    if ((e.target as Element).matches('input[type="text"], input[type="search"], input[type="number"]')) {
      clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => runSearch(), 250);
    }
  });

  runSearch();
}
