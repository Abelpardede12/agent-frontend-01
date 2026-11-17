// The four surfaces, each a function from live API data to HTML strings.
// Nothing here fetches: main.js owns data, this file owns markup.

import { countLabel, dateText, esc, microPct, money, takesEntries, timeLeft } from './format.js';

/** The live pot: entry fees paid in on top of the base reward. */
export function potOf(b) {
  return money(b.potUsd ?? b.rewardAmount);
}

function bountyUrl(slug) {
  return `#/bounty/${encodeURIComponent(slug)}`;
}

function profileUrl(handle) {
  return `#/profile/${encodeURIComponent(handle)}`;
}

function avatarImg(url, alt) {
  if (!url) return '<span class="avatar-missing" aria-hidden="true">?</span>';
  const src = String(url).startsWith('http') ? url : `https://make.fun${url}`;
  return `<img class="avatar" crossorigin="anonymous" src="${esc(src)}" alt="${esc(alt)}" loading="lazy">`;
}

/** Tiny markdown: "## " headings and "- " bullets, everything else paragraphs. */
function mdLite(text) {
  const lines = String(text ?? '').split('\n');
  let out = '';
  let inList = false;
  const closeList = () => {
    if (inList) { out += '</ul>'; inList = false; }
  };
  for (const line of lines) {
    if (line.startsWith('## ')) {
      closeList();
      out += `<h3>${esc(line.slice(3))}</h3>`;
    } else if (line.startsWith('- ')) {
      if (!inList) { out += '<ul>'; inList = true; }
      out += `<li>${esc(line.slice(2))}</li>`;
    } else if (line.trim() === '') {
      closeList();
    } else {
      closeList();
      out += `<p>${esc(line)}</p>`;
    }
  }
  closeList();
  return out;
}

// ---------------------------------------------------------------- board

const SORTS = [
  ['deadline', 'Ending soon'],
  ['pot', 'Biggest pot'],
  ['entries', 'Most entries'],
  ['title', 'A–Z'],
];

export function boardToolbar(state, categories) {
  const opts = categories.map((c) => `<option value="${esc(c)}"${state.category === c ? ' selected' : ''}>${esc(c)}</option>`).join('');
  const sorts = SORTS.map(([v, label]) => `<option value="${v}"${state.sort === v ? ' selected' : ''}>${label}</option>`).join('');
  return `<div class="toolbar">
    <label>Search <input id="board-q" type="search" value="${esc(state.q)}" placeholder="Title, skill, category…" autocomplete="off"></label>
    <label>Category <select id="board-cat"><option value="">All</option>${opts}</select></label>
    <label>Sort <select id="board-sort">${sorts}</select></label>
    <label class="check"><input id="board-open" type="checkbox"${state.onlyOpen ? ' checked' : ''}> Still taking entries</label>
  </div>`;
}

function bountyCard(b) {
  const open = takesEntries(b);
  const fee = b.entryFeeUsd ? `<span class="fee">${money(b.entryFeeUsd)} entry fee</span>` : '<span class="fee free">Free entry</span>';
  return `<article class="card">
    <h2><a href="${bountyUrl(b.slug)}">${esc(b.title)}</a></h2>
    <p class="card-summary">${esc(b.summary || b.description || '')}</p>
    <p class="card-meta">
      <span class="pot">${potOf(b)}</span>
      ${fee}
      <span class="time${open ? '' : ' ended'}">${timeLeft(b.deadline)}</span>
      <span class="entries">${countLabel(b.submissionCount, 'entry', 'entries')}</span>
    </p>
    <p class="card-foot">
      <span class="cat">${esc(b.category || '')}</span>
      <span class="status ${open ? 'open' : 'closed'}">${open ? 'Open for entries' : 'Entries closed'}</span>
      <a class="card-link" href="${bountyUrl(b.slug)}">Details</a>
      <a class="card-link" href="${bountyUrl(b.slug)}/leaderboard">Leaderboard</a>
    </p>
  </article>`;
}

export function boardPage(state, pageItems, totalPages) {
  const cards = pageItems.map(bountyCard).join('');
  const pager = totalPages > 1
    ? `<nav class="pager" aria-label="Pages">
        <button id="page-prev" ${state.page <= 1 ? 'disabled' : ''}>← Previous</button>
        <span>Page ${state.page} of ${totalPages}</span>
        <button id="page-next" ${state.page >= totalPages ? 'disabled' : ''}>Next →</button>
      </nav>`
    : '';
  return `<h1>Live bounties</h1>
    <p class="lede">${countLabel(state.filtered, 'bounty', 'bounties')} on the board — rewards, entry fees and time left, live from make.fun.</p>
    ${boardToolbar(state, state.categories)}
    <div class="board" id="board-list">${cards || '<p class="empty">No bounties match that search.</p>'}</div>
    ${pager}`;
}

// ---------------------------------------------------------------- bounty

function rewardsTable(b) {
  const rewards = b.rewardsNow || b.rewards;
  if (!rewards || typeof rewards !== 'object') return '';
  const rows = Object.entries(rewards)
    .map(([place, amount]) => `<tr><td>${esc(place)}</td><td>${money(amount)}</td></tr>`)
    .join('');
  return `<table class="rewards">
    <thead><tr><th>Place</th><th>Reward</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function rulesBlock(b) {
  const rules = b.rules;
  if (!rules) return '';
  const body = Array.isArray(rules)
    ? `<ul>${rules.map((r) => `<li>${esc(typeof r === 'string' ? r : JSON.stringify(r))}</li>`).join('')}</ul>`
    : mdLite(rules);
  return `<h2>Rules</h2>${body}`;
}

export function bountyPage(b) {
  const open = takesEntries(b);
  const fee = b.entryFeeUsd
    ? `<dt>Entry fee</dt><dd>${money(b.entryFeeUsd)}</dd>`
    : '<dt>Entry fee</dt><dd>Free</dd>';
  return `<p class="crumbs"><a href="#/">← All bounties</a></p>
  <h1>${esc(b.title)}</h1>
  <p class="statusline"><span class="status ${open ? 'open' : 'closed'}">${open ? 'Open for entries' : 'Entries closed'}</span>
    <span>· ${esc(b.status || '')}</span>
    <span>· ${esc(b.category || '')}</span></p>
  <p class="lede">${esc(b.summary || '')}</p>
  <dl class="facts">
    <dt>Live pot</dt><dd class="pot-big">${potOf(b)}</dd>
    ${fee}
    <dt>Deadline</dt><dd>${dateText(b.deadline)} (${timeLeft(b.deadline)})</dd>
    <dt>Published</dt><dd>${dateText(b.publishedAt)}</dd>
    <dt>Entries</dt><dd>${countLabel(b.submissionCount, 'entry', 'entries')}</dd>
    ${b.sponsor ? `<dt>Sponsor</dt><dd>${esc(b.sponsor.name || '')}</dd>` : ''}
  </dl>
  <p><a class="button" href="${bountyUrl(b.slug)}/leaderboard">View leaderboard →</a></p>
  <h2>Rewards</h2>
  ${rewardsTable(b)}
  <h2>Description</h2>
  <div class="description">${mdLite(b.description || '')}</div>
  ${rulesBlock(b)}
  ${Array.isArray(b.skills) && b.skills.length ? `<h2>Skills</h2><p class="tags">${b.skills.map((s) => `<span class="tag">${esc(s)}</span>`).join(' ')}</p>` : ''}`;
}

// ---------------------------------------------------------------- leaderboard

export function leaderboardPage(slug, data, page = 1, pageSize = 25) {
  const cols = (data.columns || []).filter((c) => !c.hidden);
  const rankKey = data.rank_key || 'judge';
  const all = data.entries || [];
  const pages = Math.max(1, Math.ceil(all.length / pageSize));
  const safePage = Math.min(Math.max(1, page), pages);
  const rows = all.slice((safePage - 1) * pageSize, safePage * pageSize).map((e) => {
    const rate = e.values ? e.values[rankKey] : null;
    return `<tr>
      <td class="rank">${e.rank ?? '—'}</td>
      <td>${avatarImg(e.image, e.handle)} <a href="${profileUrl(e.handle)}">${esc(e.handle)}</a></td>
      <td>${esc(e.title || '')}</td>
      <td class="num">${rate != null ? microPct(rate) : esc(e.display && e.display[rankKey] ? e.display[rankKey] : '—')}</td>
      <td class="num">${e.values && e.values.bytes != null ? Number(e.values.bytes).toLocaleString('en-US') : '—'}</td>
    </tr>`;
  }).join('');
  const colNote = cols.length
    ? `<p class="lede">Ranked by ${esc(cols.find((c) => c.key === rankKey)?.title || rankKey)}.</p>` : '';
  return `<p class="crumbs"><a href="#/bounty/${encodeURIComponent(slug)}">← ${esc(data.competition?.title || slug)}</a> · <a href="#/">All bounties</a></p>
  <h1>Leaderboard</h1>
  <h2 class="subhead">${esc(data.competition?.title || slug)}</h2>
  ${colNote}
  ${rows
    ? `<table class="leaderboard">
        <thead><tr><th>#</th><th>Entrant</th><th>Entry</th><th>Win rate</th><th>Size (bytes)</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`
    : '<p class="empty">No entries on this leaderboard yet.</p>'}
  ${data.rest != null ? `<p class="lede">${countLabel(data.rest, 'more entry', 'more entries')} beyond this list.</p>` : ''}
  ${pages > 1 ? `<nav class="pager" aria-label="Pages">
    <button id="lb-prev" ${safePage <= 1 ? 'disabled' : ''}>← Previous</button>
    <span>Page ${safePage} of ${pages}</span>
    <button id="lb-next" ${safePage >= pages ? 'disabled' : ''}>Next →</button>
  </nav>` : ''}`;
}

// ---------------------------------------------------------------- profile

export function profilePage(p) {
  const rec = p.record || {};
  const solutions = Array.isArray(p.solutions) ? p.solutions : [];
  const entries = solutions.map((s) => {
    const comp = s.competition || {};
    return `<li>
      <a href="${bountyUrl(comp.slug)}">${esc(s.title || comp.title || '')}</a>
      <span class="entry-comp">${esc(comp.title || '')}</span>
      <span class="entry-meta">${s.placement ? `Placed #${s.placement}` : 'Unplaced'}${s.prize_usd ? ` · ${money(s.prize_usd)} won` : ''}${s.score?.display ? ` · score ${esc(s.score.display)}` : ''}</span>
    </li>`;
  }).join('');
  return `<div class="profile-head">
    ${avatarImg(p.avatar?.url || p.image, p.handle)}
    <div>
      <h1>@${esc(p.handle)}</h1>
      ${p.display_name ? `<p class="display-name">${esc(p.display_name)}</p>` : ''}
      ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}
      <p class="joined">Joined ${dateText(p.joined_at)}</p>
    </div>
  </div>
  <dl class="facts stats">
    <dt>Competitions entered</dt><dd>${rec.competitions_entered ?? 0}</dd>
    <dt>Placed</dt><dd>${rec.competitions_placed ?? 0}</dd>
    <dt>Won</dt><dd>${rec.competitions_won ?? 0}</dd>
    <dt>Best placement</dt><dd>${rec.best_placement ? `#${rec.best_placement}` : '—'}</dd>
    <dt>Total prizes</dt><dd>${money(rec.prize_usd)}</dd>
  </dl>
  <h2>Entries</h2>
  ${entries ? `<ul class="entries">${entries}</ul>` : '<p class="empty">No entries yet.</p>'}`;
}
