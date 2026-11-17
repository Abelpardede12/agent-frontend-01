// Router + board state for the make.fun frontend.
//
//   #/                          bounty board
//   #/bounty/<slug>             one bounty
//   #/bounty/<slug>/leaderboard that bounty's leaderboard
//   #/profile/<handle>         a public profile
//
// window.__shotReady is false while a route loads and true once its data has
// rendered, so a screenshot script knows when to capture.

import { getBounty, getLeaderboard, getProfile, listOpenBounties } from './api.js';
import { boardPage, bountyPage, leaderboardPage, profilePage } from './views.js';
import { takesEntries } from './format.js';

const app = document.getElementById('app');
const quickSearch = document.getElementById('quick-search');
const quickQ = document.getElementById('quick-q');

const PAGE_SIZE = 12;

// Board state lives here so filtering, sorting and paging update only the
// list, never the whole page.
const board = {
  items: null,
  q: '',
  category: '',
  sort: 'deadline',
  onlyOpen: false,
  page: 1,
  categories: [],
  filteredCount: 0,
};

function loading(message) {
  app.innerHTML = `<p class="loading">${message}</p>`;
}

function failed(err) {
  const code = err && err.status === 404 ? 'Not found.' : 'Could not load that from make.fun.';
  app.innerHTML = `<p class="error">${code} <a href="#/">Back to the board</a>.</p>`;
  window.__shotReady = true;
}

function parseRoute() {
  const hash = location.hash || '#/';
  const parts = hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  if (parts[0] === 'bounty' && parts[1] && parts[2] === 'leaderboard') {
    return { name: 'leaderboard', slug: parts[1] };
  }
  if (parts[0] === 'bounty' && parts[1]) return { name: 'bounty', slug: parts[1] };
  if (parts[0] === 'profile' && parts[1]) return { name: 'profile', handle: parts[1] };
  return { name: 'board' };
}

// ---------------------------------------------------------------- board

function applyBoardFilters() {
  const q = board.q.trim().toLowerCase();
  let list = board.items.slice();
  if (q) {
    list = list.filter((b) => [b.title, b.summary, b.description, b.category, ...(b.skills || [])]
      .join(' ').toLowerCase().includes(q));
  }
  if (board.category) list = list.filter((b) => b.category === board.category);
  if (board.onlyOpen) list = list.filter(takesEntries);
  const by = {
    deadline: (a, b) => new Date(a.deadline) - new Date(b.deadline),
    pot: (a, b) => Number(b.potUsd ?? b.rewardAmount) - Number(a.potUsd ?? a.rewardAmount),
    entries: (a, b) => (b.submissionCount || 0) - (a.submissionCount || 0),
    title: (a, b) => String(a.title).localeCompare(String(b.title)),
  };
  list.sort(by[board.sort] || by.deadline);
  return list;
}

function renderBoardList() {
  const list = applyBoardFilters();
  board.filteredCount = list.length;
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  if (board.page > pages) board.page = pages;
  const slice = list.slice((board.page - 1) * PAGE_SIZE, board.page * PAGE_SIZE);
  const state = {
    q: board.q,
    category: board.category,
    sort: board.sort,
    onlyOpen: board.onlyOpen,
    page: board.page,
    categories: board.categories,
    filtered: list.length,
  };
  app.innerHTML = boardPage(state, slice, pages);
  bindBoardControls();
}

function bindBoardControls() {
  const q = document.getElementById('board-q');
  const cat = document.getElementById('board-cat');
  const sort = document.getElementById('board-sort');
  const open = document.getElementById('board-open');
  const prev = document.getElementById('page-prev');
  const next = document.getElementById('page-next');
  if (q) {
    q.addEventListener('input', () => {
      board.q = q.value;
      board.page = 1;
      renderBoardList();
      const again = document.getElementById('board-q');
      if (again) { again.focus(); again.setSelectionRange(again.value.length, again.value.length); }
    });
  }
  if (cat) cat.addEventListener('change', () => { board.category = cat.value; board.page = 1; renderBoardList(); });
  if (sort) sort.addEventListener('change', () => { board.sort = sort.value; board.page = 1; renderBoardList(); });
  if (open) open.addEventListener('change', () => { board.onlyOpen = open.checked; board.page = 1; renderBoardList(); });
  if (prev) prev.addEventListener('click', () => { board.page -= 1; renderBoardList(); });
  if (next) next.addEventListener('click', () => { board.page += 1; renderBoardList(); });
}

async function showBoard() {
  document.title = 'make.fun bounties';
  if (!board.items) {
    loading('Loading live bounties…');
    try {
      board.items = await listOpenBounties();
    } catch (err) {
      failed(err);
      return;
    }
    board.categories = [...new Set(board.items.map((b) => b.category).filter(Boolean))].sort();
  }
  renderBoardList();
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

// ---------------------------------------------------------------- routes

async function showBounty(slug) {
  loading('Loading bounty…');
  try {
    const b = await getBounty(slug);
    document.title = `${b.title} | make.fun bounties`;
    app.innerHTML = bountyPage(b);
  } catch (err) {
    failed(err);
    return;
  }
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

let lbData = null;
let lbSlug = '';
let lbPage = 1;

async function showLeaderboard(slug) {
  loading('Loading leaderboard…');
  try {
    const data = await getLeaderboard(slug);
    lbData = data;
    lbSlug = slug;
    lbPage = 1;
    document.title = `Leaderboard: ${data.competition?.title || slug} | make.fun bounties`;
    app.innerHTML = leaderboardPage(slug, data, lbPage);
    bindLeaderboardPager();
  } catch (err) {
    failed(err);
    return;
  }
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

function bindLeaderboardPager() {
  const prev = document.getElementById('lb-prev');
  const next = document.getElementById('lb-next');
  const flip = (delta) => {
    lbPage += delta;
    app.innerHTML = leaderboardPage(lbSlug, lbData, lbPage);
    bindLeaderboardPager();
  };
  if (prev) prev.addEventListener('click', () => flip(-1));
  if (next) next.addEventListener('click', () => flip(1));
}

async function showProfile(handle) {
  loading('Loading profile…');
  try {
    const p = await getProfile(handle);
    document.title = `@${p.handle} | make.fun bounties`;
    app.innerHTML = profilePage(p);
  } catch (err) {
    failed(err);
    return;
  }
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

async function render() {
  window.__shotReady = false;
  const route = parseRoute();
  if (route.name === 'bounty') return showBounty(route.slug);
  if (route.name === 'leaderboard') return showLeaderboard(route.slug);
  if (route.name === 'profile') return showProfile(route.handle);
  return showBoard();
}

// The header search jumps to the board and filters it there.
quickSearch.addEventListener('submit', (event) => {
  event.preventDefault();
  board.q = quickQ.value;
  board.page = 1;
  if (parseRoute().name === 'board') {
    renderBoardList();
  } else {
    location.hash = '#/';
  }
});

window.addEventListener('hashchange', render);
render();
