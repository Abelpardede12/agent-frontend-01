// Read-only client for make.fun's public API (GET only, any origin via CORS).
// Responses are cached in memory and revalidated with ETag: an If-None-Match
// sent inside the same minute answers 304 and the cached body is reused.

const BASE = 'https://make.fun/api';

// url -> { etag, body, fetchedAt }
const cache = new Map();

async function fetchJson(path) {
  const url = BASE + path;
  const hit = cache.get(url);
  const headers = {};
  if (hit && hit.etag) headers['If-None-Match'] = hit.etag;
  const res = await fetch(url, { headers });
  if (res.status === 304 && hit) {
    hit.fetchedAt = Date.now();
    return hit.body;
  }
  if (!res.ok) {
    const err = new Error(`make.fun API ${res.status} for ${path}`);
    err.status = res.status;
    throw err;
  }
  const body = await res.json();
  const etag = res.headers.get('ETag');
  cache.set(url, { etag, body, fetchedAt: Date.now() });
  return body;
}

/** All open bounties, following the API's cursor pages. */
export async function listOpenBounties() {
  const out = [];
  let cursor = '';
  for (let page = 0; page < 20; page += 1) {
    const path = `/competitions?status=open&activity=times&limit=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    const data = await fetchJson(path);
    out.push(...(data.items || []));
    cursor = data.next_cursor || '';
    if (!cursor) break;
  }
  return out;
}

/** One bounty, by slug. */
export function getBounty(slug) {
  return fetchJson(`/competitions/${encodeURIComponent(slug)}`);
}

/** A bounty's leaderboard: ranked entries, best first. */
export function getLeaderboard(slug, view = 'overall') {
  return fetchJson(`/competitions/${encodeURIComponent(slug)}/leaderboard?rows=all&view=${encodeURIComponent(view)}`);
}

/** A public profile, by handle. */
export function getProfile(handle) {
  return fetchJson(`/profiles/${encodeURIComponent(handle)}`);
}
