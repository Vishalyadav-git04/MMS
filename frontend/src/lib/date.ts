/** Date helpers — UI uses dd/mm/yyyy; APIs typically use yyyy-mm-dd (ISO). */

const DMY_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DMY_DASH_RE = /^(\d{2})-(\d{2})-(\d{4})$/;

const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

export function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (year < MIN_YEAR || year > MAX_YEAR) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const dt = new Date(year, month - 1, day);
  return (
    dt.getFullYear() === year &&
    dt.getMonth() === month - 1 &&
    dt.getDate() === day
  );
}

/** Format digit stream as dd/mm/yyyy while typing (max 8 digits → 10 chars). */
export function maskDmyInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  const dd = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);
  let out = dd;
  if (mm) out += `/${mm}`;
  if (yyyy) out += `/${yyyy}`;
  return out;
}

export function isoToDmy(iso: string): string {
  const m = ISO_RE.exec(iso.trim());
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function dmyToIso(dmy: string): string | null {
  const m = DMY_RE.exec(dmy.trim());
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (!isValidCalendarDate(year, month, day)) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Accept ISO, dd/mm/yyyy, or dd-MM-yyyy and return ISO (or ""). */
export function toIsoDate(value: string): string {
  const v = value.trim();
  if (!v) return "";
  if (ISO_RE.test(v)) {
    const m = ISO_RE.exec(v)!;
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    return isValidCalendarDate(year, month, day) ? v : "";
  }
  if (DMY_RE.test(v)) return dmyToIso(v) ?? "";
  if (DMY_DASH_RE.test(v)) {
    const m = DMY_DASH_RE.exec(v)!;
    return dmyToIso(`${m[1]}/${m[2]}/${m[3]}`) ?? "";
  }
  return "";
}

/** Display value for a controlled ISO (or compatible) date string. */
export function toDmyDisplay(value: string): string {
  const iso = toIsoDate(value);
  return iso ? isoToDmy(iso) : "";
}

/** ISO → DD-MM-YYYY (for APIs that expect dashed DMY). */
export function isoToDmyDash(iso: string): string {
  const dmy = isoToDmy(iso);
  return dmy ? dmy.replace(/\//g, "-") : "";
}

/**
 * True when display text is non-empty but not a valid complete dd/mm/yyyy.
 * Used to block search/save while the box shows an invalid entry.
 */
export function isInvalidDateText(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (t.length < 10) return true;
  return dmyToIso(t) === null;
}

/** Returns true if any open date field currently shows an invalid entry. */
export function pageHasInvalidDateInputs(root: ParentNode = document): boolean {
  return root.querySelectorAll('[data-date-invalid="true"]').length > 0;
}
