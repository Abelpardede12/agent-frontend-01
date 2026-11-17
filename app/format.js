// Small formatting helpers. All user- and API-supplied text goes through esc()
// before it is placed in HTML.

/** Escape text for safe insertion into HTML. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

/** A dollar amount as "$1,000" or "$0.50". */
export function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** An ISO date as "Nov 17, 2026, 12:30 PM UTC". */
export function dateText(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC`;
}

/** Time left until a deadline: "2d 4h left", "35m left", or "ended". */
export function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return 'ended';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

/** Whether a bounty still takes entries: judged by its deadline, not its status. */
export function takesEntries(bounty) {
  return new Date(bounty.deadline).getTime() > Date.now();
}

/** A count with a plural label: "1 entry", "12 entries". */
export function countLabel(n, singular, plural) {
  const v = Number(n) || 0;
  return `${v.toLocaleString('en-US')} ${v === 1 ? singular : plural}`;
}

/** A micro-unit rate (0..1,000,000) as a percentage, e.g. 956066 -> "95.61%". */
export function microPct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${(n / 10000).toFixed(2)}%`;
}
