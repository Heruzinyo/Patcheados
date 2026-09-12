// Wires every [data-suggest-for] input site-wide. Reads candidate values
// from doc_filters in that listing type's sqlite DB. Each input is tagged
// with data-suggest-type="{config.type}" (rendered by ListingForm) since
// one sqlite file per type means this needs to know which type's DB to query.

import { slugify, slugToLabel } from "../slug.js";
import { getSqlDb, queryRows, type ListingType } from "./sql.js";
import { SLUGGED_TEXT_FIELDS } from "./configs.js";

function normalize(str: unknown): string {
  return (str ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function initSuggestInput(input: HTMLInputElement) {
  const field = input.dataset.suggestFor!;
  const type = input.dataset.suggestType as ListingType | undefined;
  const box = input.parentElement?.querySelector<HTMLElement>(`.suggest-box[data-suggest-for="${field}"]`);
  if (!box || !type) return;

  const isSlugged = SLUGGED_TEXT_FIELDS.has(field);
  let cachedValues: string[] | null = null;

  async function getValues(): Promise<string[]> {
    if (cachedValues) return cachedValues;
    const db = await getSqlDb(type!);
    const rows = queryRows(db, `SELECT DISTINCT value FROM doc_filters WHERE field = ?`, [field]);
    cachedValues = rows.map((r) => r.value as string);
    return cachedValues;
  }

  // For slugged multi-term fields ("capcom arc-system"), only the term being
  // typed right now (after the last space) drives suggestions/replacement,
  // earlier terms are left alone so multiple values can be built up together.
  function currentTerm(): string {
    if (!isSlugged) return input.value;
    const parts = input.value.split(/(\s+)/);
    return parts[parts.length - 1] ?? "";
  }

  function replaceCurrentTerm(newTerm: string): string {
    if (!isSlugged) return newTerm;
    const parts = input.value.split(/(\s+)/);
    parts[parts.length - 1] = newTerm;
    return parts.join("");
  }

  async function render() {
    const term = currentTerm();
    const needle = isSlugged ? slugify(term) : normalize(term);
    if (!needle) {
      box!.style.display = "none";
      box!.innerHTML = "";
      return;
    }
    const values = await getValues();
    const matches = isSlugged
      ? values.filter((v) => v.includes(needle)).slice(0, 8)
      : values.filter((v) => normalize(v).includes(needle)).slice(0, 8);

    if (!matches.length) {
      box!.style.display = "none";
      box!.innerHTML = "";
      return;
    }

    box!.innerHTML = matches
      .map((v) => {
        const label = isSlugged ? slugToLabel(v) : v.replace(/_/g, " ");
        return `<div class="suggest-option padding-xs pointer action" data-value="${v}">${label}</div>`;
      })
      .join("");
    box!.style.display = "block";
  }

  input.addEventListener("input", render);
  input.addEventListener("focus", render);
  input.addEventListener("blur", () => {
    // slight delay so a click on a suggestion registers before the box hides
    setTimeout(() => {
      box!.style.display = "none";
    }, 150);
  });

  box.addEventListener("mousedown", (e) => {
    const option = (e.target as Element).closest<HTMLElement>("[data-value]");
    if (!option) return;
    input.value = isSlugged ? replaceCurrentTerm(option.dataset.value!) : option.dataset.value!;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    box.style.display = "none";
    input.focus();
  });
}

document.querySelectorAll<HTMLInputElement>("input[data-suggest-for]").forEach(initSuggestInput);
