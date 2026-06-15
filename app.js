'use strict';

// ══════════════════════════════════════════════════════
//  CONFIG  —  update BACKEND_URL after deploying Apps Script
// ══════════════════════════════════════════════════════
const CONFIG = {
  // This site's own backend (the FAMILY Google Sheet / Apps Script).
  // Paste the Web App URL after you deploy the family Apps Script.
  BACKEND_URL:        'https://script.google.com/macros/s/AKfycbxlwymQDc3pvcmOZ_pQYRo2snrtczq1VsD1xHipeJqcrUX2pbV5jZoCn3gQkQyk5OXl5w/exec',
  // Mirror admin writes (results / locks / prizes) to the OTHER site's backend too,
  // so entering scores once updates BOTH the family and Sam Media poule.
  MIRROR_BACKEND_URL: 'https://script.google.com/macros/s/AKfycbxjuCp1CSdBBEIlV3q4i8iQpCYwQ8bWBgR0381drxz6mfHNXBed11I0GgyOQlMIQr7X/exec',
  // Simple shared password to enter the family poule (no SSO).
  FAMILY_PASSWORD:    'vangaal2026',
};


const MAX_POSSIBLE = 357; // 144 group + 157 knockout + 16 thirds (8×2) + 40 bonus

// Renders a team's flag as an <img> (team.flag is a flagcdn URL).
// NOTE: cannot be used inside <option> elements — they only render text.
const flagImg = (team, cls = 'flag-inline') =>
  team ? `<img class="${cls}" src="${team.flag}" alt="" loading="lazy">` : '';

// Fixed family roster — tap-to-pick login. Each player has a STABLE id, so the
// same person is the same account on every device (no typing, no duplicates).
// Names match the assets/<Name> profile photos.
const FAMILY_ROSTER = [
  { name: 'Jorg',     id: 'u_1778120805113_o2vyy' }, // unchanged — has existing predictions
  { name: 'Lwande',   id: 'fam_lwande' },
  { name: 'Jeremiah', id: 'fam_mumba'  }, // keeps id 'fam_mumba' — scores entered under this account were Jeremiah's
  { name: 'Mumba',    id: 'fam_mumba2' }, // fresh account for the real Mumba to fill in his own scores
  { name: 'Nimon',    id: 'fam_nimon'  },
  { name: 'Storm',  id: 'fam_storm'  },
  { name: 'Temwa',  id: 'fam_temwa'  },
  { name: 'Tezya',  id: 'fam_tezya'  },
];

// ══════════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════════
const S = {
  user:             null,
  predictions:      {},   // { matchId: { home: n, away: n } }
  bonusPredictions: {},   // { questionId: value }
  koPredictions:    {},   // { r32: [{home,away,winner}…], … }
  allUsers:         [],
  allPredictions:   {},   // { userId: { group, bonus, ko } }
  results:          {},   // { matchId: { home, away } } + ko_* + bonus_*
  config:           { locked: {}, prizes: { p1:'TBA', p2:'TBA', p3:'TBA' } },
  activeTab:        'leaderboard',
  activeSub:        'group',
  activeGroup:      'A',
  activeKoRound:    'r32',
  adminGroup:       'A',
  adminKoRound:     'r32',
  adminUnlocked:    false,
  isAdmin:         false,
  adminPw:          '',   // typed by admin, memory-only (never persisted)
  saveTimer:        null,
  backendOk:        false,
  syncErrorShown:   false, // suppress repeat error toasts when backend is down
};

// ══════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    const icon = btn.querySelector('.theme-toggle-icon');
    if (icon) icon.textContent = theme === 'light' ? '☀️' : '🌙';
    btn.setAttribute('aria-label', theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
  }
}
function initTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  applyTheme(saved);
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', next);
      applyTheme(next);
    });
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  loadLocal();

  if (S.user) {
    closeModal();
    updateHeaderUser();
  } else {
    openModal();
  }
  syncAdminVisibility();

  buildColorPicker();
  bindNav();
  initMobileNav();
  updateMobileNavActive();
  bindSubTabs();
  bindModal();
  bindAdmin();
  buildKoRoundTabs();
  buildAdminKoRoundTabs();

  renderActiveView();

  // Fetch remote data in background; re-render when ready
  await fetchRemote();
  renderActiveView();
  // Now that the server roster is loaded, refresh the login picker so the
  // tap-to-login name chips appear on this (possibly new) device.
  if (!S.user) renderLoginPicker();
});

// ══════════════════════════════════════════════════════
//  PERSISTENCE — local storage
// ══════════════════════════════════════════════════════
function loadLocal() {
  try {
    S.user             = JSON.parse(localStorage.getItem('wc26_user'))    || null;
    S.predictions      = JSON.parse(localStorage.getItem('wc26_preds'))   || {};
    S.bonusPredictions = JSON.parse(localStorage.getItem('wc26_bonus'))   || {};
    S.koPredictions    = JSON.parse(localStorage.getItem('wc26_ko'))      || {};
    S.results          = JSON.parse(localStorage.getItem('wc26_results')) || {};
    S.config           = JSON.parse(localStorage.getItem('wc26_config'))  || { locked: {}, prizes: { p1:'TBA', p2:'TBA', p3:'TBA' } };
    S.isAdmin          = localStorage.getItem('wc26_is_admin') === '1';
    // Migrate nickname into the persistent store if not already there
    if (S.user?.id && S.user?.nickname) persistNickname(S.user.id, S.user.nickname);
  } catch(e) { /* corrupted data — start fresh */ }
}

function persistNickname(userId, nickname) {
  try {
    const nicks = JSON.parse(localStorage.getItem('wc26_nicknames') || '{}');
    nicks[userId] = nickname;
    localStorage.setItem('wc26_nicknames', JSON.stringify(nicks));
  } catch(e) {}
}

function lookupUserByName(name) {
  try {
    const map = JSON.parse(localStorage.getItem('wc26_users_by_name') || '{}');
    return map[name] || null;
  } catch(e) { return null; }
}

function persistUserByName(name, user) {
  try {
    const map = JSON.parse(localStorage.getItem('wc26_users_by_name') || '{}');
    map[name] = { id: user.id, nickname: user.nickname, color: user.color };
    localStorage.setItem('wc26_users_by_name', JSON.stringify(map));
  } catch(e) {}
}

// ── Stable cross-device identity ────────────────────────
// A player's NAME is their identity. We normalise it (case/space/accent-
// insensitive) so the same person resolves to the same account on any device,
// regardless of the nickname they type. New players get a deterministic
// `fam_<name>` id so two fresh devices with the same name still converge;
// existing players are matched against the server roster to reuse their id
// (and therefore their predictions).
function normalizeName(name) {
  return String(name || '').trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // strip accents
    .replace(/[^a-z0-9]+/g, '');                        // strip spaces/punctuation
}

function userIdFromName(name) {
  return `fam_${normalizeName(name)}`;
}

// Find a player already on the server by (normalised) name — authoritative id
function findServerUserByName(name) {
  const n = normalizeName(name);
  if (!n) return null;
  return S.allUsers.find(u => normalizeName(u.name) === n) || null;
}

// Merge the local "known users" cache with the server roster (deduped by
// normalised name) so the login picker shows everyone on every device. The
// Once the server roster has loaded it is the single source of truth, so a
// deleted account (e.g. a removed test user) never reappears as a chip. Only
// before the first successful fetch do we fall back to this device's local
// cache, so a fresh page paint isn't empty.
function rosterForPicker() {
  if (S.rosterLoaded) {
    return S.allUsers
      .map(u => ({ name: u.name, id: u.id, nickname: u.nickname || '', color: u.color || '#7DC242' }))
      .filter(u => u.name);
  }
  return listKnownUsers().filter(u => u.name);
}

function lookupNickname(userId) {
  try {
    return JSON.parse(localStorage.getItem('wc26_nicknames') || '{}')[userId] || '';
  } catch(e) { return ''; }
}

function saveLocal() {
  localStorage.setItem('wc26_user',    JSON.stringify(S.user));
  localStorage.setItem('wc26_preds',   JSON.stringify(S.predictions));
  localStorage.setItem('wc26_bonus',   JSON.stringify(S.bonusPredictions));
  localStorage.setItem('wc26_ko',      JSON.stringify(S.koPredictions));
  localStorage.setItem('wc26_results', JSON.stringify(S.results));
  localStorage.setItem('wc26_config',  JSON.stringify(S.config));
}

// ══════════════════════════════════════════════════════
//  PERSISTENCE — remote (Google Apps Script)
// ══════════════════════════════════════════════════════
function isBackendConfigured() {
  return CONFIG.BACKEND_URL && !CONFIG.BACKEND_URL.startsWith('YOUR_');
}

function isMirrorConfigured() {
  return CONFIG.MIRROR_BACKEND_URL && !CONFIG.MIRROR_BACKEND_URL.startsWith('YOUR_');
}

// Fire-and-forget POST to mirror backend so admin entries propagate to BOTH
// poules (family + Sam Media). Errors are swallowed — primary save is what
// the UI confirms; mirror is best-effort.
function mirrorAdminWrite(qs) {
  if (!isMirrorConfigured() || !S.adminPw) return;
  fetch(`${CONFIG.MIRROR_BACKEND_URL}?${qs}`, { redirect: 'follow' })
    .catch(e => console.warn('Mirror write failed:', e.message));
}

// Same intent as mirrorAdminWrite but as a POST — used for large payloads
// (results) that would overflow a GET query string. Best-effort.
function mirrorAdminPost(form) {
  if (!isMirrorConfigured() || !S.adminPw) return;
  fetch(CONFIG.MIRROR_BACKEND_URL, { method: 'POST', body: form, redirect: 'follow' })
    .catch(e => console.warn('Mirror write failed:', e.message));
}

async function fetchRemote() {
  if (!isBackendConfigured()) return;
  try {
    const res  = await fetch(`${CONFIG.BACKEND_URL}?action=getAll`, { redirect: 'follow' });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    S.backendOk      = true;
    S.rosterLoaded   = true;   // server roster is now available for name→id matching
    S.allUsers       = data.users        || [];
    S.allPredictions = data.predictions  || {};
    S.config         = data.config       || S.config;
    // Keep results authoritative from the server, but never let an empty/missing
    // server copy wipe results this device entered locally (e.g. admin scores
    // not yet synced). Mirrors the predictions merge guard below.
    const serverResults = data.results || {};
    if (Object.keys(serverResults).length > 0 || Object.keys(S.results).length === 0) {
      S.results = serverResults;
    }

    // Update How to Play prizes from server config
    updateHowtoPrizes();

    // Update modal player count
    const count = S.allUsers.length;
    const sub = document.getElementById('modal-player-count');
    if (sub) sub.textContent = `Family poule · ${count} ${count === 1 ? 'player' : 'players'}`;

    // Merge: reconcile this device's local picks with the server row.
    if (S.user) {
      const server = S.allPredictions[S.user.id] || {};
      // Hydrate FROM server when this device has nothing yet (new device or
      // cleared cache) — prevents showing blanks and overwriting good data.
      if (server.group && Object.keys(S.predictions).length === 0)      S.predictions      = server.group;
      if (server.bonus && Object.keys(S.bonusPredictions).length === 0) S.bonusPredictions = server.bonus;
      if (server.ko    && !WC.koRounds.some(r => S.koPredictions[r.id]))  S.koPredictions    = server.ko;
      // Keep local if the server has nothing for us yet (local is the only copy).
      if (!server.group) server.group = S.predictions;
      if (!server.bonus) server.bonus = S.bonusPredictions;
      if (!server.ko)    server.ko    = S.koPredictions;
    }
    saveLocal();
  } catch(e) {
    console.warn('Remote fetch failed:', e.message);
  }
}

async function syncRemote() {
  if (!isBackendConfigured() || !S.user) return;
  setStatus('saving');
  try {
    const form = new FormData();
    form.append('action',  'sync');
    form.append('userId',  S.user.id);
    form.append('name',    S.user.nickname || S.user.name.split(' ')[0]);
    form.append('color',   S.user.color || '#7DC242');   // always a hex — never the photo URL
    form.append('avatar',  S.user.picture || '');        // photo URL in separate field
    form.append('email',   S.user.email || '');          // Google email for reminders
    form.append('group',   JSON.stringify(S.predictions));
    form.append('bonus',   JSON.stringify(S.bonusPredictions));
    form.append('ko',      JSON.stringify(S.koPredictions));
    const res = await fetch(CONFIG.BACKEND_URL, { method: 'POST', body: form, redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    S.syncErrorShown = false;
    setStatus('saved');
  } catch(e) {
    console.warn('Sync failed:', e.message);
    setStatus('error');
    if (!S.syncErrorShown) {
      S.syncErrorShown = true;
      setTimeout(() => setStatus('idle'), 4000);
    } else {
      setTimeout(() => setStatus('idle'), 1200);
    }
  }
}

async function syncRemoteResults() {
  if (!isBackendConfigured() || !S.adminPw) return;
  setStatus('saving');
  try {
    // POST (not GET): the results blob is large and overflows a query string,
    // and the backend only accepts saveResults via doPost.
    const form = new FormData();
    form.append('action',  'saveResults');
    form.append('payload', JSON.stringify(S.results));
    form.append('pw',      S.adminPw);
    const res  = await fetch(CONFIG.BACKEND_URL, { method: 'POST', body: form, redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json().catch(() => ({}));
    if (data.error) throw new Error(data.error);
    setStatus('saved');
    mirrorAdminPost(form);
  } catch(e) {
    console.warn('Results save failed:', e.message);
    setStatus('error');
    showToast('Could not save results — check your connection and try again', 'error');
  }
}

async function syncRemoteConfig() {
  if (!isBackendConfigured()) throw new Error('Backend not configured');
  if (!S.adminPw)             throw new Error('Admin not unlocked — enter the admin password first');

  const form = new FormData();
  form.append('action',  'saveConfig');
  form.append('payload', JSON.stringify({ locked: S.config.locked, prizes: S.config.prizes }));
  form.append('pw',      S.adminPw);
  const res = await fetch(CONFIG.BACKEND_URL, { method: 'POST', body: form, redirect: 'follow' });
  if (!res.ok) throw new Error(`Backend HTTP ${res.status}`);
  const data = await res.json().catch(() => ({}));
  if (data.error) throw new Error(data.error);

  // Mirror locks ONLY — prizes are intentionally site-specific (different prizes
  // at work vs. home).
  const qs = new URLSearchParams({
    action:  'saveConfig',
    payload: JSON.stringify({ locked: S.config.locked }),
    pw:      S.adminPw,
  }).toString();
  mirrorAdminWrite(qs);
}

function debouncedSave() {
  setStatus('saving');
  clearTimeout(S.saveTimer);
  S.saveTimer = setTimeout(() => {
    saveLocal();
    syncRemote();
  }, 1200);
}

// ══════════════════════════════════════════════════════
//  STATUS BAR
// ══════════════════════════════════════════════════════
function setStatus(state) {
  const el = document.getElementById('save-status');
  if (!el) return;
  const map = { saving: ['saving','Saving…'], saved: ['saved','✓ Saved'], error: ['error','⚠ Error'], idle: ['',''] };
  const [cls, txt] = map[state] || map.idle;
  el.className = `save-status ${cls}`;
  el.textContent = txt;
  if (state === 'saved') setTimeout(() => el.textContent = '', 3000);
}

// ══════════════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════════════
function bindNav() {
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

function adminAllowed() {
  return S.isAdmin || S.adminUnlocked;
}

function syncAdminVisibility() {
  const tab = document.getElementById('admin-tab');
  if (!tab) return;
  tab.style.display = adminAllowed() ? '' : 'none';
  if (!adminAllowed() && S.activeTab === 'admin') switchTab('leaderboard');
}

function rebuildMobileNavItems() {
  const dropdown = document.getElementById('nav-mobile-dropdown');
  if (!dropdown) return;
  dropdown.innerHTML = '';
  document.querySelectorAll('.nav-tab').forEach(tab => {
    if (tab.dataset.tab === 'admin' && !adminAllowed()) return;
    const item = document.createElement('button');
    item.className = 'nav-mobile-item';
    item.dataset.tab = tab.dataset.tab;
    item.innerHTML = tab.innerHTML;
    item.addEventListener('click', () => switchTab(tab.dataset.tab));
    dropdown.appendChild(item);
  });
  updateMobileNavActive();
}

function initMobileNav() {
  const dropdown = document.getElementById('nav-mobile-dropdown');
  const trigger = document.getElementById('nav-mobile-trigger');
  if (!trigger || !dropdown) return;

  rebuildMobileNavItems();

  trigger.addEventListener('click', e => {
    e.stopPropagation();
    toggleMobileNav();
  });

  // Close when clicking outside
  document.addEventListener('click', e => {
    if (!trigger.contains(e.target) && !dropdown.contains(e.target)) {
      closeMobileNav();
    }
  });

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMobileNav();
  });
}

function toggleMobileNav() {
  const dropdown = document.getElementById('nav-mobile-dropdown');
  const trigger = document.getElementById('nav-mobile-trigger');
  dropdown.classList.toggle('open');
  trigger.classList.toggle('open');
}

function openMobileNav() {
  document.getElementById('nav-mobile-dropdown').classList.add('open');
  document.getElementById('nav-mobile-trigger').classList.add('open');
}

function closeMobileNav() {
  document.getElementById('nav-mobile-dropdown').classList.remove('open');
  document.getElementById('nav-mobile-trigger').classList.remove('open');
}

function updateMobileNavLabel(tab) {
  const label = document.getElementById('nav-mobile-label');
  if (!label) return;
  const tabEl = document.querySelector(`.nav-tab[data-tab="${tab}"] .nav-tab-label`);
  if (tabEl) label.textContent = tabEl.textContent;
}

function updateMobileNavActive() {
  document.querySelectorAll('.nav-mobile-item').forEach(item => {
    item.classList.toggle('active', item.dataset.tab === S.activeTab);
  });
  updateMobileNavLabel(S.activeTab);
}

function switchTab(tab) {
  if (tab === 'admin' && !adminAllowed()) return;
  S.activeTab = tab;
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === `view-${tab}`));
  renderActiveView();
  closeMobileNav();
  updateMobileNavActive();
}

function bindSubTabs() {
  document.querySelectorAll('.sub-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      S.activeSub = btn.dataset.sub;
      document.querySelectorAll('.sub-tab').forEach(b => b.classList.toggle('active', b.dataset.sub === S.activeSub));
      document.querySelectorAll('.sub-view').forEach(v => v.classList.toggle('active', v.id === `sub-${S.activeSub}`));
      renderActiveSub();
    });
  });
}

function renderActiveView() {
  switch (S.activeTab) {
    case 'leaderboard':  renderLeaderboard(); break;
    case 'predictions':  renderActiveSub();   break;
    case 'bonus':        renderBonus();        break;
    case 'browse':       renderBrowse();       break;
    case 'admin':        renderAdmin();        break;
    case 'howto':        updateHowtoPrizes(); break;
  }
}

function renderActiveSub() {
  if (S.activeSub === 'group')    renderGroupStage();
  if (S.activeSub === 'knockout') renderKnockout();
}

// ══════════════════════════════════════════════════════
//  SCORE CALCULATION ENGINE
// ══════════════════════════════════════════════════════
function calcScore(userId) {
  const isSelf = S.user && userId === S.user.id;
  const preds  = isSelf ? S.predictions      : (S.allPredictions[userId]?.group || {});
  const bonus  = isSelf ? S.bonusPredictions : (S.allPredictions[userId]?.bonus || {});
  const ko     = isSelf ? S.koPredictions    : (S.allPredictions[userId]?.ko    || {});

  let groupPts = 0, koPts = 0, bonusPts = 0, thirdsPts = 0;

  // Group stage
  WC.matches.forEach(m => {
    const p = preds[m.id];
    const r = S.results[m.id];
    if (!p || !r || r.home === '' || r.away === '') return;
    const ph = +p.home, pa = +p.away, rh = +r.home, ra = +r.away;
    if (ph === rh && pa === ra) {
      groupPts += WC.scoring.groupExact;
    } else if (Math.sign(ph - pa) === Math.sign(rh - ra)) {
      groupPts += WC.scoring.groupResult;
    }
  });

  // Knockout rounds
  WC.koRounds.forEach(round => {
    const rResults = S.results[`ko_${round.id}`] || [];
    const rPreds   = ko[round.id]                || [];
    rResults.forEach((res, i) => {
      if (!res?.winner) return;
      const pred = rPreds[i] || {};
      // Exact score (both home and away match) = bonus points on top of winner points
      if (res.home !== '' && res.away !== '' &&
          pred.hScore !== '' && pred.aScore !== '' &&
          +pred.hScore === res.home && +pred.aScore === res.away) {
        koPts += round.pts + WC.scoring.groupExact; // winner + exact bonus
      } else if (pred.winner === res.winner) {
        koPts += round.pts; // winner only
      }
    });
  });

  // 3rd-place qualifiers — points per team the user tipped to qualify as a
  // best-third that actually did (team identity, order/slot independent).
  if (WC.groups.every(g => groupResultsComplete(g.id))) {
    const actual = new Set(rankThirds(calcGroupStandingsFromResults).slice(0, 8).map(t => t.code));
    const eff = effectiveThirds(userId);
    eff.qualifyingGroups.forEach(g => {
      const code = eff.thirdsByGroup[g];
      if (code && actual.has(code)) thirdsPts += WC.scoring.thirdQualifier;
    });
  }

  // Bonus questions
  WC.bonusQuestions.forEach(q => {
    const p = bonus[q.id];
    const r = S.results[`bonus_${q.id}`];
    if (!p || r === undefined || r === null || r === '') return;

    if (q.id === 'total_goals') {
      const diff = Math.abs(+p - +r);
      if (diff <= 3)  bonusPts += WC.scoring.bonus.total_goals_3;
      else if (diff <= 8)  bonusPts += WC.scoring.bonus.total_goals_8;
      else if (diff <= 15) bonusPts += WC.scoring.bonus.total_goals_15;
    } else {
      const key = q.id;
      const pts = WC.scoring.bonus[key] || 0;
      if (p.toString().toLowerCase() === r.toString().toLowerCase()) bonusPts += pts;
    }
  });

  return { group: groupPts, ko: koPts, bonus: bonusPts, thirds: thirdsPts,
           total: groupPts + koPts + bonusPts + thirdsPts };
}

function countFilled(userId) {
  const isSelf = S.user && userId === S.user.id;
  const preds = isSelf ? S.predictions : (S.allPredictions[userId]?.group || {});
  return WC.matches.filter(m => {
    const p = preds[m.id];
    return p && p.home !== undefined && p.away !== undefined;
  }).length;
}

function calcGroupStandings(groupId, userId) {
  const group = WC.groups.find(g => g.id === groupId);
  const isSelf = S.user && userId === S.user.id;
  const preds = isSelf ? S.predictions : (S.allPredictions[userId]?.group || {});

  const tbl = {};
  group.teams.forEach(c => { tbl[c] = { code: c, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }; });

  WC.matchesByGroup[groupId].forEach(m => {
    const p = preds[m.id];
    if (!p || p.home === undefined) return;
    const h = +p.home, a = +p.away;
    tbl[m.home].mp++; tbl[m.away].mp++;
    tbl[m.home].gf += h; tbl[m.home].ga += a;
    tbl[m.away].gf += a; tbl[m.away].ga += h;
    if (h > a) {
      tbl[m.home].w++; tbl[m.home].pts += 3; tbl[m.away].l++;
    } else if (h < a) {
      tbl[m.away].w++; tbl[m.away].pts += 3; tbl[m.home].l++;
    } else {
      tbl[m.home].d++; tbl[m.home].pts++;
      tbl[m.away].d++; tbl[m.away].pts++;
    }
  });

  return Object.values(tbl).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const gdA = b.gf - b.ga, gdB = a.gf - a.ga;
    if (gdA !== gdB) return gdA - gdB;
    if (b.gf !== a.gf) return b.gf - a.gf;
    // Head-to-head tiebreaker
    return headToHeadResult(group.id, a.code, b.code, preds);
  });
}

function headToHeadResult(groupId, teamA, teamB, preds) {
  // Head-to-head tiebreaker: when pts, GD, GF are equal, the team that won
  // the head-to-head match ranks higher. Returns -1 if teamA wins h2h, 1 if teamB wins.
  const matches = WC.matchesByGroup[groupId] || [];
  for (const m of matches) {
    if ((m.home === teamA && m.away === teamB) || (m.home === teamB && m.away === teamA)) {
      const p = preds[m.id];
      if (p && p.home !== undefined && p.away !== undefined) {
        const h = +p.home, a = +p.away;
        if (h > a) return m.home === teamA ? -1 : 1;
        if (h < a) return m.home === teamB ? -1 : 1;
        return 0; // draw
      }
      return 0;
    }
  }
  return 0;
}

// ── Actual-results helpers (admin) ──────────────────────
// These mirror the prediction-based standings/bracket logic but read the
// REAL entered results (S.results), so the admin's KO result grid shows the
// genuine qualified teams — never the admin's own bracket predictions.

function groupResultsComplete(groupId) {
  return WC.matchesByGroup[groupId].every(m => {
    const r = S.results[m.id];
    return r && r.home !== undefined && r.home !== '' && r.away !== undefined && r.away !== '';
  });
}

function calcGroupStandingsFromResults(groupId) {
  const group = WC.groups.find(g => g.id === groupId);
  const tbl = {};
  group.teams.forEach(c => { tbl[c] = { code: c, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }; });

  WC.matchesByGroup[groupId].forEach(m => {
    const r = S.results[m.id];
    if (!r || r.home === undefined || r.home === '' || r.away === undefined || r.away === '') return;
    const h = +r.home, a = +r.away;
    tbl[m.home].mp++; tbl[m.away].mp++;
    tbl[m.home].gf += h; tbl[m.home].ga += a;
    tbl[m.away].gf += a; tbl[m.away].ga += h;
    if (h > a) { tbl[m.home].w++; tbl[m.home].pts += 3; tbl[m.away].l++; }
    else if (h < a) { tbl[m.away].w++; tbl[m.away].pts += 3; tbl[m.home].l++; }
    else { tbl[m.home].d++; tbl[m.home].pts++; tbl[m.away].d++; tbl[m.away].pts++; }
  });

  return Object.values(tbl).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const gdA = b.gf - b.ga, gdB = a.gf - a.ga;
    if (gdA !== gdB) return gdA - gdB;
    if (b.gf !== a.gf) return b.gf - a.gf;
    // S.results shares the {home,away} shape headToHeadResult expects
    return headToHeadResult(group.id, a.code, b.code, S.results);
  });
}

// Resolve the 16 Round-of-32 matchups from actual results. Any slot whose
// source group(s) aren't fully played yet resolves to '' (TBD).
function resolveActualR32() {
  const tops = {};
  WC.groups.forEach(g => {
    if (!groupResultsComplete(g.id)) { tops[g.id] = null; return; }
    const s = calcGroupStandingsFromResults(g.id);
    tops[g.id] = { first: s[0]?.code || '', second: s[1]?.code || '' };
  });

  // Third-place ranking + official allocation only make sense once every group
  // is complete (we need all 12 thirds ranked to know which 8 qualify).
  const allComplete = WC.groups.every(g => groupResultsComplete(g.id));
  let thirdSlots = {};
  if (allComplete) {
    const ranked = rankThirds(calcGroupStandingsFromResults);
    const thirdsByGroup = {};
    ranked.forEach(t => { thirdsByGroup[t.group] = t.code; });
    const qualifyingGroups = ranked.slice(0, 8).map(t => t.group);
    thirdSlots = resolveThirdSlots(thirdsByGroup, qualifyingGroups);
  }

  const resolveSide = (side, i) => {
    if (side.groups) return thirdSlots[i] || '';
    const t = tops[side.group];
    if (!t) return '';
    return side.pos === 1 ? (t.first || '') : (t.second || '');
  };

  return R32_PAIRINGS.map((pair, i) => ({
    home: resolveSide(pair.home, i),
    away: resolveSide(pair.away, i),
  }));
}

// Resolve the real matchups for any KO round from entered results. Later
// rounds feed off the winners recorded in the previous round's results.
function resolveActualKoMatchups(roundId) {
  if (roundId === 'r32') return resolveActualR32();

  const winnerOf = (round, i) => S.results[`ko_${round}`]?.[i]?.winner || '';
  const loserOf = (round, i) => {
    const res = S.results[`ko_${round}`]?.[i];
    if (!res || !res.winner) return '';
    const m = resolveActualKoMatchups(round)[i] || {};
    if (res.winner === m.home) return m.away || '';
    if (res.winner === m.away) return m.home || '';
    return '';
  };

  const round = WC.koRounds.find(r => r.id === roundId);
  const n = round?.matches || 0;

  if (roundId === 'r16')   return Array.from({ length: n }, (_, i) => ({ home: winnerOf('r32', i*2), away: winnerOf('r32', i*2+1) }));
  if (roundId === 'qf')    return Array.from({ length: n }, (_, i) => ({ home: winnerOf('r16', i*2), away: winnerOf('r16', i*2+1) }));
  if (roundId === 'sf')    return Array.from({ length: n }, (_, i) => ({ home: winnerOf('qf',  i*2), away: winnerOf('qf',  i*2+1) }));
  if (roundId === 'final') return [{ home: winnerOf('sf', 0), away: winnerOf('sf', 1) }];
  if (roundId === 'third') return [{ home: loserOf('sf', 0),  away: loserOf('sf', 1) }];
  return Array.from({ length: n }, () => ({ home: '', away: '' }));
}

// ══════════════════════════════════════════════════════
//  LEADERBOARD VIEW
// ══════════════════════════════════════════════════════
function renderLeaderboard() {
  // Build ranked user list — union of registered users AND anyone with
  // predictions on the server (the Users sheet can lag the Predictions sheet,
  // so iterating allUsers alone would drop active players).
  const allUserIds = new Set();
  if (S.user) allUserIds.add(S.user.id);
  S.allUsers.forEach(u => allUserIds.add(u.id));
  Object.keys(S.allPredictions).forEach(id => allUserIds.add(id));

  const getUserObj = id => {
    if (S.user && id === S.user.id) return S.user;
    return S.allUsers.find(u => u.id === id) || { id, name: 'Unknown', color: '#555' };
  };

  const ranked = [...allUserIds].map(id => {
    const score  = calcScore(id);
    const filled = countFilled(id);
    return { ...getUserObj(id), score, filled };
  }).sort((a, b) => b.score.total - a.score.total || b.filled - a.filled);

  // Per-photo crop tuning — the source photos are themed full-scene shots
  // with faces at very different sizes/positions, so zoom + shift each one to
  // frame the face like a profile pic. Keyed by photo filename; anyone not
  // listed falls back to no zoom, cropped from the top.
  // To re-tune: bump `zoom` (higher = tighter) and `pos` ('x% y%', lower y =
  // shows more above the face). If you add a dedicated headshot file for
  // someone, just point their key at it via PROFILE_PHOTOS instead.
  const FACE_ADJUST = {
    'Jorg profile.png':     { zoom: 1.2,  pos: 'center 20%' },
    'Nimon profile.png':    { zoom: 1.25, pos: 'center 26%' },
    'Mumba profile.png':    { zoom: 1.4,  pos: '62% 40%' },
    'Tezya profile.png':    { zoom: 1.9,  pos: '55% 55%' },
    'Storm profile.png':    { zoom: 1.5,  pos: 'center 28%' },
    'Lwande profile.png':   { zoom: 1.5,  pos: 'center 25%' },
    'Jeremiah profile.png': { zoom: 2.1,  pos: '43% 30%' },
    'Temwa profile.png':    { zoom: 2.3,  pos: '52% 12%' },
  };

  // Podium: drop the top-3 players' faces + names into the prize cards.
  // Falls back to the static medal silhouette when that rank isn't filled yet.
  ['1','2','3'].forEach(n => {
    const player = ranked[Number(n) - 1];
    const sil  = document.getElementById(`ph-sil-${n}`);
    const name = document.getElementById(`prize-name-${n}`);
    if (!sil) return;
    if (player) {
      const photo = getProfilePhoto(player);
      const dn = displayName(player);
      const adj = FACE_ADJUST[photo];
      const adjStyle = adj ? `style="--face-zoom:${adj.zoom};--face-pos:${adj.pos}"` : '';
      sil.innerHTML = photo
        ? `<img class="prize-player-face" src="assets/${photo}" alt="${esc(dn)}" ${adjStyle} />`
        : `<div class="prize-player-face fallback">${esc((dn[0] || '?').toUpperCase())}</div>`;
      if (name) name.textContent = dn;
    } else if (name) {
      name.textContent = '';
    }
  });

  // Stats
  const totalParticipants = ranked.length;
  document.getElementById('lb-participant-count').textContent =
    `${totalParticipants} ${totalParticipants === 1 ? 'participant' : 'participants'}`;

  const statsEl = document.getElementById('lb-stats');
  const maxScore = ranked[0]?.score.total || 0;
  statsEl.innerHTML = `
    <div class="stat-pill"><div class="val">${totalParticipants}</div><div class="lbl">Participants</div></div>
    <div class="stat-pill"><div class="val">${maxScore}</div><div class="lbl">Highest score</div></div>
    <div class="stat-pill"><div class="val">${Object.keys(S.results).filter(k => !k.startsWith('ko_') && !k.startsWith('bonus_')).length}</div><div class="lbl">Results in</div></div>
    <div class="stat-pill"><div class="val">${WC.matches.length - Object.keys(S.results).filter(k => !k.startsWith('ko_') && !k.startsWith('bonus_')).length}</div><div class="lbl">Matches left</div></div>
  `;

  // List
  const list = document.getElementById('leaderboard-list');
  if (ranked.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="emoji">⚽</div><h3>Be the first!</h3><p>Sign in and make your predictions to appear on the leaderboard.</p></div>`;
    return;
  }

  const topScore = Math.max(...ranked.map(u => u.score.total), 1);

  list.innerHTML = ranked.map((u, i) => {
    const rank = i + 1;
    const isMe = S.user && u.id === S.user.id;
    const rankClass = rank <= 3 ? `rank-${rank}` : '';
    const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
    const barW = Math.round((u.score.total / topScore) * 100);

    return `
    <div class="lb-row${isMe ? ' me' : ''}" data-userid="${u.id}" onclick="showUserInBrowse('${u.id}')">
      <div class="lb-rank ${rankClass}">${rankEmoji}</div>
      <div class="lb-user">
        ${avatarHtml(u, 42)}
        <div>
          <div class="lb-name">${esc(displayName(u))}${isMe ? ' <span style="font-size:11px;color:var(--green)">(you)</span>' : ''}</div>
          <div class="lb-sub">${u.score.group}G · ${u.score.ko}K · ${u.score.thirds || 0}³ · ${u.score.bonus}B pts</div>
        </div>
      </div>
      <div>
        <div class="lb-bar-wrap"><div class="lb-bar" style="width:${barW}%"></div></div>
        <div class="lb-sub" style="text-align:right;margin-top:3px">${u.filled}/72 filled</div>
      </div>
      <div class="lb-pts">${u.score.total} pts</div>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════════════════
//  GROUP STAGE VIEW
// ══════════════════════════════════════════════════════
function renderGroupStage() {
  if (!S.user) { renderLoginPrompt('group-content'); return; }

  // Build group selector buttons if not yet done
  const sel = document.getElementById('group-selector');
  if (!sel.children.length) {
    sel.innerHTML = WC.groups.map(g => `
      <button class="group-btn${g.id === S.activeGroup ? ' active' : ''}" onclick="selectGroup('${g.id}')">
        Group ${g.id}
      </button>`).join('');
  } else {
    sel.querySelectorAll('.group-btn').forEach(b =>
      b.classList.toggle('active', b.textContent.trim() === `Group ${S.activeGroup}`));
  }

  renderGroupContent(S.activeGroup);
}

function selectGroup(id) {
  S.activeGroup = id;
  renderGroupStage();
}

function renderGroupContent(groupId) {
  const el    = document.getElementById('group-content');
  const group = WC.groups.find(g => g.id === groupId);
  const matches = WC.matchesByGroup[groupId];
  const locked  = isRoundLocked('group');

  // Progress for this group
  const filled = matches.filter(m => S.predictions[m.id] !== undefined).length;

  // `matches` is already sorted chronologically (see WC.matchesByGroup). Each
  // group has 3 matchdays of 2 matches, so chunk the sorted list into pairs.
  const matchdays = [matches.slice(0, 2), matches.slice(2, 4), matches.slice(4, 6)];

  const matchCards = matchdays.map((md, i) => {
    if (!md.length) return '';
    const label = md[0].date ? fmtMatchDate(md[0].date).replace(/,.*$/, '') : '';
    return `
    <div class="match-label" style="margin-top:${i > 0 ? '20px' : '0'};color:rgba(20,32,26,0.7)">Matchday ${i + 1}${label ? ` · ${label}` : ''}</div>
    ${md.map(m => matchCard(m, locked)).join('')}`;
  }).join('');

  const standings = calcGroupStandings(groupId, S.user.id);
  const standingsHtml = renderStandingsTable(standings, groupId);

  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div style="font-size:18px;font-weight:700;color:#14201a">Group ${groupId}</div>
      <div class="progress-mini">
        <div class="progress-track"><div class="progress-fill" style="width:${Math.round(filled/6*100)}%"></div></div>
        <span class="progress-label">${filled}/6 filled</span>
      </div>
    </div>
    ${matchCards}
    ${standingsHtml}
  `;

  // Bind events
  el.querySelectorAll('.score-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const { matchid, side, dir } = btn.dataset;
      adjustScore(matchid, side, +dir);
    });
  });
}

function matchCard(m, locked) {
  const pred   = S.predictions[m.id] || { home: 0, away: 0 };
  const result = S.results[m.id];
  const home   = WC.teams[m.home];
  const away   = WC.teams[m.away];
  const h      = pred.home ?? 0;
  const a      = pred.away ?? 0;

  const winClass  = h > a ? 'home-win' : h < a ? 'away-win' : 'draw';
  const winLabel  = h > a ? home.name : h < a ? away.name : 'Draw';
  const homeCls   = h > a ? 'winning' : '';
  const awayCls   = h < a ? 'winning' : '';

  let resultLine = '';
  if (result && result.home !== undefined && result.away !== undefined) {
    const rh = +result.home, ra = +result.away;
    const exact  = +h === rh && +a === ra;
    const correct = Math.sign(h - a) === Math.sign(rh - ra);
    resultLine = `
      <div class="actual-result">
        <span>Result: ${rh}–${ra}</span>
        <span class="${exact ? 'correct' : correct ? 'correct' : 'incorrect'}">
          ${exact ? `+${WC.scoring.groupExact}pts ✓` : correct ? `+${WC.scoring.groupResult}pt ✓` : '0pts ✗'}
        </span>
      </div>`;
  }

  return `
  <div class="match-card${locked ? ' locked' : ''}${result ? ' has-result' : ''}" id="mc-${m.id}">
    <div class="match-label">Group ${m.group}${m.date ? ` · ${fmtMatchDate(m.date)}` : ''}</div>
    <div class="match-row">
      <div class="team-side">
        ${flagImg(home, 'team-flag')}
        <div class="team-name ${homeCls}">${home.name}</div>
      </div>

      <div class="score-block">
        <div class="score-ctrl">
          <button class="score-btn" data-matchid="${m.id}" data-side="home" data-dir="1">+</button>
          <div class="score-num" id="sn-${m.id}-home">${h}</div>
          <button class="score-btn" data-matchid="${m.id}" data-side="home" data-dir="-1">−</button>
        </div>
        <div class="score-sep">:</div>
        <div class="score-ctrl">
          <button class="score-btn" data-matchid="${m.id}" data-side="away" data-dir="1">+</button>
          <div class="score-num" id="sn-${m.id}-away">${a}</div>
          <button class="score-btn" data-matchid="${m.id}" data-side="away" data-dir="-1">−</button>
        </div>
      </div>

      <div class="team-side">
        ${flagImg(away, 'team-flag')}
        <div class="team-name ${awayCls}">${away.name}</div>
      </div>
    </div>

    <div class="match-footer">
      <span class="result-badge ${winClass}">${winLabel}</span>
      ${resultLine}
    </div>
  </div>`;
}

function adjustScore(matchId, side, dir) {
  if (!S.predictions[matchId]) S.predictions[matchId] = { home: 0, away: 0 };
  const cur = S.predictions[matchId][side] ?? 0;
  const next = Math.max(0, cur + dir);
  S.predictions[matchId][side] = next;

  // Update DOM only (no full re-render for snappy UX)
  const numEl = document.getElementById(`sn-${matchId}-${side}`);
  if (numEl) numEl.textContent = next;

  // Update winning class
  const match = WC.matchById[matchId];
  if (match) {
    const card = document.getElementById(`mc-${matchId}`);
    if (card) {
      const h = S.predictions[matchId].home ?? 0;
      const a = S.predictions[matchId].away ?? 0;
      const homeNameEl = card.querySelector('.team-side:first-child .team-name');
      const awayNameEl = card.querySelector('.team-side:last-child .team-name');
      const badgeEl    = card.querySelector('.result-badge');
      if (homeNameEl) homeNameEl.className = `team-name${h > a ? ' winning' : ''}`;
      if (awayNameEl) awayNameEl.className = `team-name${a > h ? ' winning' : ''}`;
      if (badgeEl) {
        const home = WC.teams[match.home], away = WC.teams[match.away];
        badgeEl.className = `result-badge ${h > a ? 'home-win' : h < a ? 'away-win' : 'draw'}`;
        badgeEl.textContent = h > a ? home.name : h < a ? away.name : 'Draw';
      }
    }
  }

  debouncedSave();
}

function renderStandingsTable(standings, groupId) {
  const rows = standings.map((t, i) => {
    const team    = WC.teams[t.code];
    const gd      = t.gf - t.ga;
    const qualCls = i < 2 ? 'qualifies' : i === 2 ? 'qualifies-3rd' : '';
    return `
    <tr class="${qualCls}">
      <td><div class="std-team">${flagImg(team, 'std-flag')}<span>${team.name}</span></div></td>
      <td>${t.mp}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td>
      <td>${t.gf}</td><td>${t.ga}</td><td>${gd >= 0 ? '+' : ''}${gd}</td>
      <td class="std-pts">${t.pts}</td>
    </tr>`;
  }).join('');

  return `
  <div class="standings-card" style="margin-top:20px">
    <div class="standings-title">📊 Predicted Standings — Group ${groupId}
      <span style="float:right;font-weight:400;color:var(--text-dim)">
        <span style="color:var(--green)">■</span> Advance  <span style="color:var(--yellow)">■</span> Possible 3rd
      </span>
    </div>
    <table class="standings-table">
      <thead>
        <tr>
          <th style="text-align:left">Team</th>
          <th>MP</th><th>W</th><th>D</th><th>L</th>
          <th>GF</th><th>GA</th><th>GD</th><th>Pts</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

// ══════════════════════════════════════════════════════
//  KNOCKOUT VIEW — Visual Bracket
// ══════════════════════════════════════════════════════
function buildKoRoundTabs() { /* replaced by full bracket — kept for compat */ }

function renderKnockout() {
  if (!S.user) { renderLoginPrompt('ko-content'); return; }
  // Init any missing rounds
  WC.koRounds.forEach(r => {
    if (!S.koPredictions[r.id])
      S.koPredictions[r.id] = Array.from({length: r.matches}, () => ({home:'',away:'',winner:''}));
  });
  cascadeWinners();
  renderBracket();
}

function cascadeWinners() {
  applyThirdSlots();   // auto-place the 8 qualifying thirds before propagating winners
  const get = (r, i) => S.koPredictions[r]?.[i] || {home:'',away:'',winner:''};
  const setSlot = (r, i, h, a) => {
    const rnd = WC.koRounds.find(x => x.id === r);
    if (!S.koPredictions[r])
      S.koPredictions[r] = Array.from({length: rnd.matches}, () => ({home:'',away:'',winner:''}));
    const slot = S.koPredictions[r][i];
    slot.home = h; slot.away = a;
    if (slot.winner && slot.winner !== h && slot.winner !== a) slot.winner = '';
  };
  // R32 → R16 (pair of 2 → 1)
  for (let i = 0; i < 8; i++)
    setSlot('r16', i, get('r32', i*2).winner, get('r32', i*2+1).winner);
  // R16 → QF
  for (let i = 0; i < 4; i++)
    setSlot('qf', i, get('r16', i*2).winner, get('r16', i*2+1).winner);
  // QF → SF
  for (let i = 0; i < 2; i++)
    setSlot('sf', i, get('qf', i*2).winner, get('qf', i*2+1).winner);
  // SF winners → Final
  setSlot('final', 0, get('sf',0).winner, get('sf',1).winner);
  // SF losers → 3rd Place
  const loser = s => s.winner ? (s.winner === s.home ? s.away : s.home) : '';
  setSlot('third', 0, loser(get('sf',0)), loser(get('sf',1)));
}

function renderBracket() {
  const lkd = id => isRoundLocked(id);
  const col  = (roundId, from, to, hasSelects) =>
    `<div class="bkt-col" data-round="${roundId}">
       ${bktColHdr(roundId)}
       ${Array.from({length: to-from}, (_, i) => bktCard(roundId, from+i, hasSelects, lkd(roundId))).join('')}
     </div>`;

  document.getElementById('ko-content').innerHTML = `
    <div class="bkt-toolbar">
      <button class="btn btn-ghost btn-sm" onclick="autoFillKo()">⚡ Auto-fill R32 from groups</button>
      <span class="bkt-hint">Pick winners — they cascade through the bracket automatically</span>
    </div>
    ${renderThirdsPanel()}
    <div class="bkt-scroll">
      <div class="bkt-tree">
        ${col('r32', 0,  8,  true)}
        ${col('r16', 0,  4,  false)}
        ${col('qf',  0,  2,  false)}
        ${col('sf',  0,  1,  false)}
        <div class="bkt-center-col">
          <div class="bkt-center-lbl">🏆 Final</div>
          ${bktCard('final', 0, false, lkd('final'))}
          <div class="bkt-center-lbl" style="margin-top:20px">🥉 3rd Place</div>
          ${bktCard('third', 0, false, lkd('third'))}
        </div>
        ${col('sf',  1,  2,  false)}
        ${col('qf',  2,  4,  false)}
        ${col('r16', 4,  8,  false)}
        ${col('r32', 8, 16,  true)}
      </div>
    </div>`;

  // Bind team selects (R32 only)
  document.getElementById('ko-content').querySelectorAll('.bkt-sel').forEach(sel => {
    sel.addEventListener('change', () => {
      const {round, idx, side} = sel.dataset;
      setKoTeam(round, +idx, side, sel.value);
    });
  });
  // Bind score inputs
  document.getElementById('ko-content').querySelectorAll('.bkt-score-in').forEach(inp => {
    inp.addEventListener('input', () => {
      const {round, idx, side} = inp.dataset;
      setKoScore(round, +idx, side, inp.value);
    });
  });

  // Bind 3rd-place qualifier chips
  document.getElementById('ko-content').querySelectorAll('.tp-chip[data-group]').forEach(chip => {
    chip.addEventListener('click', () => toggleThirdPick(chip.dataset.group));
  });

  // Auto-scale to fit viewport (no scrollbar)
  fitBracket();
}

// Panel listing the 12 third-placed teams ranked from the player's group
// predictions. The best 8 qualify by default (auto); the player can swap which
// groups qualify. The chosen set drives the bracket's 3rd-place slots.
function renderThirdsPanel() {
  if (!S.user) return '';
  const { ranked, qualifyingGroups, auto, complete, overridden } = effectiveThirds(S.user.id);
  if (ranked.length < 12) {
    return `<div class="tp-panel tp-panel-empty">
      <div class="tp-head"><span class="tp-title">🥉 3rd-place qualifiers</span></div>
      <div class="tp-note">Fill in all 12 group tables to rank the third-placed teams. The best 8 qualify automatically.</div>
    </div>`;
  }
  const qSet = new Set(qualifyingGroups);
  const sameAsAuto = JSON.stringify([...qSet].sort()) === JSON.stringify([...auto].sort());

  const rows = ranked.map((t, i) => {
    const team = WC.teams[t.code];
    const inQ = qSet.has(t.group);
    return `<button type="button" class="tp-chip${inQ ? ' tp-in' : ' tp-out'}" data-group="${t.group}"
              title="${inQ ? 'Qualifies — click to drop' : 'Out — click to qualify'}">
        <span class="tp-rank">${i + 1}</span>
        ${flagImg(team, 'tp-flag')}
        <span class="tp-name">${team.name}</span>
        <span class="tp-grp">Grp ${t.group}</span>
        <span class="tp-pts">${t.pts}p · ${t.gd >= 0 ? '+' : ''}${t.gd}</span>
        <span class="tp-mark">${inQ ? '✓' : ''}</span>
      </button>`;
  }).join('');

  const need = 8 - qSet.size;
  const note = complete
    ? `The 8 best third-placed teams reach the Round of 32. Click any team to add or remove it freely — they're placed into the bracket automatically (official FIFA rules).`
    : `Pick ${need} more — the bracket's 3rd-place slots fill once you've chosen 8.`;

  return `<div class="tp-panel">
    <div class="tp-head">
      <span class="tp-title">🥉 3rd-place qualifiers <span class="tp-count${complete ? '' : ' tp-count-warn'}">${qSet.size}/8</span></span>
      <span class="tp-sub">${overridden && !sameAsAuto ? 'Custom picks' : 'Auto from your group tables'}</span>
      ${overridden ? `<button class="btn btn-ghost btn-sm tp-reset" onclick="resetThirdPicks()">↺ Reset to auto</button>` : ''}
    </div>
    <div class="tp-note">${note}</div>
    <div class="tp-grid">${rows}</div>
  </div>`;
}

// Free toggle: add or remove a group's 3rd-placed team independently. The
// player controls exactly which 8 qualify — partial selections (0–8) are held,
// and the bracket only fills its 3rd-place slots once 8 are chosen.
function toggleThirdPick(group) {
  const { qualifyingGroups } = effectiveThirds(S.user.id);
  const cur = new Set(qualifyingGroups);
  if (cur.has(group)) {
    cur.delete(group);                       // drop — allowed down to 0
  } else {
    if (cur.size >= 8) {                      // soft cap — let the player pick which to drop
      showToast('You already have 8 — drop one first', 'info');
      return;
    }
    cur.add(group);
  }
  setThirdOverride([...cur]);
  cascadeWinners();   // re-place thirds in the bracket (blank until 8 chosen)
  debouncedSave();
  renderBracket();
}

function resetThirdPicks() {
  setThirdOverride(null);
  cascadeWinners();
  debouncedSave();
  renderBracket();
}

function fitBracket() {
  const wrap = document.querySelector('.bkt-scroll');
  const tree = wrap?.querySelector('.bkt-tree');
  if (!wrap || !tree) return;
  // Reset transforms before measuring
  tree.style.transform = '';
  wrap.style.height    = '';
  const wrapW    = wrap.clientWidth;
  const naturalW = tree.scrollWidth;
  const scale    = Math.min(1, (wrapW - 4) / naturalW);

  // Below 55% scale the bracket becomes unreadable — switch to horizontal scroll instead
  if (scale < 0.55) {
    tree.style.transform   = '';
    wrap.style.overflowX   = 'auto';
    wrap.style.height      = `${tree.offsetHeight}px`;
    wrap.style.paddingBottom = '12px';
  } else {
    wrap.style.overflowX      = 'hidden';
    wrap.style.paddingBottom  = '';
    tree.style.transformOrigin = 'top left';
    tree.style.transform       = `scale(${scale})`;
    wrap.style.height          = `${tree.offsetHeight * scale}px`;
  }
}

// Re-fit on window resize when knockout is visible
window.addEventListener('resize', () => {
  if (S.activeTab === 'predictions' && S.activeSub === 'knockout') fitBracket();
});

function setKoScore(roundId, idx, side, val) {
  if (!S.koPredictions[roundId]) return;
  S.koPredictions[roundId][idx][side] = val;
  debouncedSave();
}

function bktColHdr(roundId) {
  const r = WC.koRounds.find(x => x.id === roundId);
  const locked = isRoundLocked(roundId);
  return `<div class="bkt-col-hdr">
    <span class="bkt-col-name">${r.name}</span>
    <span class="bkt-col-pts">${locked ? '🔒' : `+${r.pts}pts`}</span>
  </div>`;
}

// Official FIFA 2026 Round of 32 pairings, ordered so that consecutive pairs
// feed the correct R16 match (r32[2k] & r32[2k+1] -> r16[k]).
// Source: FIFA 2026 published match schedule (matches 73-88).
const R32_PAIRINGS = [
  // r16[0] = M89 (winners of M74 + M77)
  { home: { group: 'E', pos: 1 }, away: { pos: 3, groups: ['A','B','C','D','F'] } }, // M74
  { home: { group: 'I', pos: 1 }, away: { pos: 3, groups: ['C','D','F','G','H'] } }, // M77
  // r16[1] = M90 (winners of M73 + M75)
  { home: { group: 'A', pos: 2 }, away: { group: 'B', pos: 2 } }, // M73
  { home: { group: 'F', pos: 1 }, away: { group: 'C', pos: 2 } }, // M75
  // r16[2] = M93 (winners of M83 + M84)
  { home: { group: 'K', pos: 2 }, away: { group: 'L', pos: 2 } }, // M83
  { home: { group: 'H', pos: 1 }, away: { group: 'J', pos: 2 } }, // M84
  // r16[3] = M94 (winners of M81 + M82)
  { home: { group: 'D', pos: 1 }, away: { pos: 3, groups: ['B','E','F','I','J'] } }, // M81
  { home: { group: 'G', pos: 1 }, away: { pos: 3, groups: ['A','E','H','I','J'] } }, // M82
  // r16[4] = M91 (winners of M76 + M78)
  { home: { group: 'C', pos: 1 }, away: { group: 'F', pos: 2 } }, // M76
  { home: { group: 'E', pos: 2 }, away: { group: 'I', pos: 2 } }, // M78
  // r16[5] = M92 (winners of M79 + M80)
  { home: { group: 'A', pos: 1 }, away: { pos: 3, groups: ['C','E','F','H','I'] } }, // M79
  { home: { group: 'L', pos: 1 }, away: { pos: 3, groups: ['E','H','I','J','K'] } }, // M80
  // r16[6] = M95 (winners of M86 + M88)
  { home: { group: 'J', pos: 1 }, away: { group: 'H', pos: 2 } }, // M86
  { home: { group: 'D', pos: 2 }, away: { group: 'G', pos: 2 } }, // M88
  // r16[7] = M96 (winners of M85 + M87)
  { home: { group: 'B', pos: 1 }, away: { pos: 3, groups: ['E','F','G','I','J'] } }, // M85
  { home: { group: 'K', pos: 1 }, away: { pos: 3, groups: ['D','E','I','J','L'] } }, // M87
];

const R32_MATCH_NUMBERS = [74,77,73,75,83,84,81,82,76,78,79,80,86,88,85,87];

function r32SideLabel(side) {
  if (side.groups) return `3rd place (from ${side.groups.join('/')})`;
  return `Group ${side.group} #${side.pos}`;
}

function getQualifierLabel(roundId, matchIdx) {
  if (roundId === 'r32' && R32_PAIRINGS[matchIdx]) {
    const q = R32_PAIRINGS[matchIdx];
    return `${r32SideLabel(q.home)} vs ${r32SideLabel(q.away)}`;
  }

  // For R16+, show proper round names
  const r = WC.koRounds.find(x => x.id === roundId);
  if (r && r.startMatch != null) {
    const roundNames = {
      r32: 'R32', r16: 'R16', qf: 'QF', sf: 'SF', third: '3rd', final: 'Final'
    };
    const shortName = roundNames[roundId] || r.short;
    return `${shortName} ${matchIdx + 1}`;
  }
  return r?.short || '';
}

function getQualifierGroupsForR32(matchIdx) {
  return R32_PAIRINGS[matchIdx] || null;
}

// ══════════════════════════════════════════════════════
//  THIRD-PLACE QUALIFIER LOGIC
//  The 8 best 3rd-placed teams are derived (not hand-placed); the official
//  FIFA allocation table (THIRD_PLACE_ALLOCATION in data.js) decides which
//  qualifying third faces which group winner. Players only pick winners.
// ══════════════════════════════════════════════════════

// For each R32 pairing index that has a 3rd-place slot, record the first-place
// seed group it's tied to (the side opposite the {groups} side) and that slot's
// candidate groups. Derived from R32_PAIRINGS so the two never drift.
const THIRD_SLOT_SEED = {};        // pairingIndex -> seed group letter
const THIRD_SLOT_CANDIDATES = {};  // seed group letter -> [candidate groups]
R32_PAIRINGS.forEach((pair, i) => {
  const tSide = pair.home.groups ? pair.home : (pair.away.groups ? pair.away : null);
  const seedG = pair.home.groups ? pair.away.group : (pair.away.groups ? pair.home.group : null);
  if (tSide && seedG) { THIRD_SLOT_SEED[i] = seedG; THIRD_SLOT_CANDIDATES[seedG] = tSide.groups; }
});

// Given the 8 groups whose 3rd-placed team qualifies, return seedGroup -> thirdGroup
// using the official table. Falls back to a greedy match if a key is ever missing.
function allocateThirds(qualifyingGroups) {
  const key = [...qualifyingGroups].sort().join('');
  const enc = (typeof THIRD_PLACE_ALLOCATION !== 'undefined') && THIRD_PLACE_ALLOCATION[key];
  if (enc && enc.length === THIRD_PLACE_SEED_ORDER.length) {
    const map = {};
    THIRD_PLACE_SEED_ORDER.forEach((seed, i) => { map[seed] = enc[i]; });
    return map;
  }
  if (qualifyingGroups.length === 8)
    console.warn('[thirds] no allocation entry for', key, '— using greedy fallback');
  return greedyAllocateThirds(qualifyingGroups);
}

function greedyAllocateThirds(qualifyingGroups) {
  const seeds = [...new Set(Object.values(THIRD_SLOT_SEED))];
  const qset = [...qualifyingGroups];
  const result = {}; const used = new Set();
  const solve = (i) => {
    if (i === seeds.length) return true;
    const seed = seeds[i];
    for (const g of qset) {
      if (used.has(g) || g === seed) continue;
      if (!(THIRD_SLOT_CANDIDATES[seed] || []).includes(g)) continue;
      used.add(g); result[seed] = g;
      if (solve(i + 1)) return true;
      used.delete(g); delete result[seed];
    }
    return false;
  };
  solve(0);
  return result;
}

// Rank the 12 third-placed teams from a standings function (pts → GD → GF).
function rankThirds(standingsFn) {
  return WC.groups.map(g => {
    const s = standingsFn(g.id);
    return { group: g.id, code: s[2]?.code || '',
             pts: s[2]?.pts || 0,
             gd: (s[2]?.gf || 0) - (s[2]?.ga || 0),
             gf: s[2]?.gf || 0 };
  }).filter(t => t.code)
    .sort((a, b) => (b.pts - a.pts) || (b.gd - a.gd) || (b.gf - a.gf));
}

// teamCode per R32 third-slot index. thirdsByGroup: groupId -> 3rd-placed teamCode.
function resolveThirdSlots(thirdsByGroup, qualifyingGroups) {
  const seedToThird = allocateThirds(qualifyingGroups);
  const out = {};
  R32_PAIRINGS.forEach((pair, i) => {
    const seed = THIRD_SLOT_SEED[i];
    if (seed == null) return;
    const tg = seedToThird[seed];
    out[i] = tg ? (thirdsByGroup[tg] || '') : '';
  });
  return out;
}

// The override (array of 8 group letters) rides inside the ko blob (key _thirds)
// so it persists and syncs for free; null/absent = auto (top-8 from group picks).
function getThirdOverride(userId) {
  const isSelf = S.user && userId === S.user.id;
  const ko = isSelf ? S.koPredictions : (S.allPredictions[userId]?.ko || {});
  const v = ko && ko._thirds;
  return Array.isArray(v) && v.length >= 1 && v.length <= 8 ? v : null;
}
function setThirdOverride(groups) {
  if (groups && groups.length >= 1 && groups.length <= 8) S.koPredictions._thirds = [...groups].sort();
  else delete S.koPredictions._thirds;
}

// Effective qualifying-third groups for a user: their valid override, else the
// auto top-8 from their group-stage predictions. Also returns thirdsByGroup.
function effectiveThirds(userId) {
  const ranked = rankThirds(gid => calcGroupStandings(gid, userId));
  const thirdsByGroup = {};
  ranked.forEach(t => { thirdsByGroup[t.group] = t.code; });
  const auto = ranked.slice(0, 8).map(t => t.group);
  let qualifyingGroups = auto;
  const ov = getThirdOverride(userId);
  const overridden = !!ov;
  if (ov) {
    // Keep the player's raw selection even when it isn't yet 8 — the bracket
    // only fills its 3rd-place slots once `complete` is true (see applyThirdSlots).
    qualifyingGroups = ov.filter(g => thirdsByGroup[g]);
  }
  const complete = qualifyingGroups.length === 8;
  return { ranked, thirdsByGroup, qualifyingGroups, auto, complete, overridden };
}

// Write the auto-resolved 3rd-place teams into the current user's R32 slots
// (read-only in the UI). Clears a stale winner if its team is replaced.
function applyThirdSlots() {
  if (!S.user || !S.koPredictions.r32) return;
  const { thirdsByGroup, qualifyingGroups, complete } = effectiveThirds(S.user.id);
  // Only resolve via the official 495-row table when exactly 8 thirds are
  // chosen; while the selection is incomplete, leave the 3rd-place sides blank.
  const slots = complete ? resolveThirdSlots(thirdsByGroup, qualifyingGroups) : {};
  R32_PAIRINGS.forEach((pair, i) => {
    const side = pair.home.groups ? 'home' : (pair.away.groups ? 'away' : null);
    if (!side) return;
    const slot = S.koPredictions.r32[i];
    if (!slot) return;
    const team = slots[i] || '';
    if (slot[side] !== team) {
      slot[side] = team;
      if (slot.winner && slot.winner !== slot.home && slot.winner !== slot.away) slot.winner = '';
    }
  });
}

// Team codes already placed somewhere in the R32 (both seed picks and the
// auto-placed 3rd-place qualifiers), skipping one slot/side being edited. Used
// to keep any single team from appearing in two Round-of-32 matches.
function r32TeamsInUse(exceptIdx, exceptSide) {
  const used = new Set();
  (S.koPredictions.r32 || []).forEach((slot, i) => {
    if (!slot) return;
    ['home', 'away'].forEach(side => {
      if (i === exceptIdx && side === exceptSide) return;
      if (slot[side]) used.add(slot[side]);
    });
  });
  return used;
}

function bktCard(roundId, idx, hasSelects, locked) {
  const r    = WC.koRounds.find(x => x.id === roundId);
  const slot = S.koPredictions[roundId]?.[idx] || {home:'',away:'',winner:'',hScore:'',aScore:''};
  const h    = slot.home ? WC.teams[slot.home] : null;
  const a    = slot.away ? WC.teams[slot.away] : null;
  const hw   = slot.winner && slot.winner === slot.home;
  const aw   = slot.winner && slot.winner === slot.away;
  const mNum = getQualifierLabel(roundId, idx);
  const isDraw = slot.hScore !== '' && slot.aScore !== '' && +slot.hScore === +slot.aScore;

  // Score input cell (always present unless locked)
  const scoreInput = (side) => locked
    ? `<span class="bkt-score-display">${slot[side] !== '' ? slot[side] : '–'}</span>`
    : `<input type="number" class="bkt-score-in" min="0" max="20"
              data-round="${roundId}" data-idx="${idx}" data-side="${side}"
              value="${slot[side] !== '' ? slot[side] : ''}" placeholder="–" inputmode="numeric" />`;

  // Is this side an auto-filled 3rd-place slot? Those are read-only — the
  // qualifying thirds are derived + placed via the official FIFA table.
  const sideSpec = roundId === 'r32'
    ? ((side, pair) => pair ? (side === 'home' ? pair.home : pair.away) : null)
    : null;
  const isThirdSide = (side) => {
    if (roundId !== 'r32') return false;
    const spec = sideSpec(side, getQualifierGroupsForR32(idx));
    return !!(spec && spec.groups);
  };

  const teamRow = (side, team, isWinner) => {
    const thirdSlot = isThirdSide(side);
    const editable = hasSelects && !locked && !thirdSlot;
    const teamCell = editable
      ? (() => {
          // R32 group-winner / runner-up slot: only that group's four teams.
          let options = teamOptions(slot[side]);
          const spec = sideSpec(side, getQualifierGroupsForR32(idx));
          if (spec && !spec.groups) {
            const groupData = WC.groups.find(g => g.id === spec.group);
            const used = r32TeamsInUse(idx, side);   // no team twice in the R32
            options = (groupData?.teams || [])
              .filter(code => code === slot[side] || !used.has(code))
              .map(code => {
                const t = WC.teams[code];
                const selected = slot[side] === code ? ' selected' : '';
                return `<option value="${code}"${selected}>${t.name}</option>`;
              })
              .join('');
          }
          return `<select class="bkt-sel" data-round="${roundId}" data-idx="${idx}" data-side="${side}">
                    <option value="">— Pick team —</option>
                    ${options}
                  </select>`;
        })()
      : `<div class="bkt-slot${team ? ' filled' : ''}${isWinner ? ' winner' : ''}${thirdSlot ? ' bkt-third' : ''}">
           ${team
             ? `${thirdSlot ? '<span class="bkt-third-badge" title="Auto-placed 3rd-place qualifier">3rd</span>' : ''}${flagImg(team, 'bkt-flag')}<span class="bkt-tname">${team.name}</span>`
             : `<span class="bkt-tbd">${thirdSlot ? '3rd — TBD' : 'TBD'}</span>`}
         </div>`;
    return `<div class="bkt-team-line">${teamCell}${scoreInput(side === 'home' ? 'hScore' : 'aScore')}</div>`;
  };

  // Winner row: always show if both teams set (so user can pick after a draw)
  const winnerRow = h && a && !locked ? `
    <div class="bkt-winner-row">
      <button class="bkt-flag-btn${hw ? ' chosen' : ''}" title="${h.name} advances"
              onclick="quickPickWinner('${roundId}',${idx},'${slot.home}')">
        ${flagImg(h, 'bkt-btn-flag')}
      </button>
      <span class="bkt-adv">${isDraw ? 'on pens →' : 'advances'}</span>
      <button class="bkt-flag-btn${aw ? ' chosen' : ''}" title="${a.name} advances"
              onclick="quickPickWinner('${roundId}',${idx},'${slot.away}')">
        ${flagImg(a, 'bkt-btn-flag')}
      </button>
    </div>` : '';

  return `<div class="bkt-card${hw||aw ? ' has-winner' : ''}">
    <div class="bkt-card-top">
      <span class="bkt-mnum">${mNum}</span>
      ${locked ? '<span class="bkt-lock">🔒</span>' : ''}
    </div>
    ${teamRow('home', h, hw)}
    ${teamRow('away', a, aw)}
    ${winnerRow}
  </div>`;
}

function quickPickWinner(roundId, idx, teamCode) {
  if (!S.koPredictions[roundId]) return;
  S.koPredictions[roundId][idx].winner = teamCode;
  cascadeWinners();
  debouncedSave();
  renderBracket();
}

function setKoTeam(roundId, idx, side, teamCode) {
  if (!S.koPredictions[roundId]) return;
  // No team may appear in two Round-of-32 matches.
  if (roundId === 'r32' && teamCode && r32TeamsInUse(idx, side).has(teamCode)) {
    showToast(`${WC.teams[teamCode]?.name || teamCode} is already in another Round-of-32 match`, 'error');
    renderBracket();   // revert the dropdown to its previous value
    return;
  }
  S.koPredictions[roundId][idx][side] = teamCode;
  S.koPredictions[roundId][idx].winner = '';
  cascadeWinners();
  debouncedSave();
  renderBracket();
}

function autoFillKo() {
  // Warn if R32 winners are already picked
  const existingWinners = S.koPredictions.r32?.filter(m => m.winner).length || 0;
  if (existingWinners > 0) {
    if (!confirm(`You already have ${existingWinners} R32 winner${existingWinners > 1 ? 's' : ''} picked. Auto-fill will clear all R32 picks. Continue?`)) {
      return;
    }
  }

  const tops = {};
  WC.groups.forEach(g => {
    const s = calcGroupStandings(g.id, S.user.id);
    tops[g.id] = { first: s[0]?.code || '', second: s[1]?.code || '' };
  });

  // Fill only the group winner / runner-up sides from the group tables. The
  // eight 3rd-place sides are filled automatically by applyThirdSlots() (run
  // inside cascadeWinners) using the official FIFA allocation table.
  const sideTeam = (side) => {
    if (side.groups) return '';            // 3rd-place slot — auto-placed
    const t = tops[side.group];
    if (!t) return '';
    return side.pos === 1 ? (t.first || '') : (t.second || '');
  };

  S.koPredictions.r32 = R32_PAIRINGS.map(pair => ({
    home: sideTeam(pair.home), away: sideTeam(pair.away), winner: ''
  }));
  cascadeWinners();
  debouncedSave();
  renderBracket();
  showToast('Bracket auto-filled from your group predictions!', 'success');
}

// ══════════════════════════════════════════════════════
//  BONUS VIEW
// ══════════════════════════════════════════════════════
// ── Locking ────────────────────────────────────────────────────────────
// A round (group stage / each KO round / bonus) is locked when the admin has
// flipped its switch in the lock grid, OR its scheduled lock date has passed —
// whichever comes first. Lock dates live in data.js: WC.groupLockDate,
// WC.bonusLockDate, and `lockDate` on each WC.koRounds entry.
function roundLockDate(roundId) {
  if (roundId === 'group') return WC.groupLockDate;
  if (roundId === 'bonus') return WC.bonusLockDate;
  return WC.koRounds.find(r => r.id === roundId)?.lockDate || null;
}

function autoLockPassed(dateStr) {
  if (!dateStr) return false;
  const t = new Date(dateStr).getTime();
  return Number.isFinite(t) && Date.now() >= t;
}

function isRoundLocked(roundId) {
  return !!S.config.locked?.[roundId] || autoLockPassed(roundLockDate(roundId));
}

// Bonus is just another lockable round.
function isBonusLocked() { return isRoundLocked('bonus'); }

function renderBonus() {
  if (!S.user) { renderLoginPromptInView('bonus-grid'); return; }

  const locked = isBonusLocked();
  const grid = document.getElementById('bonus-grid');

  const banner = document.getElementById('bonus-lock-banner');
  if (banner) {
    if (locked) {
      banner.style.display = '';
      banner.innerHTML = `🔒 Bonus answers are locked — they can no longer be changed.`;
    } else {
      banner.style.display = 'none';
    }
  }

  grid.innerHTML = WC.bonusQuestions.map(q => bonusCard(q, locked)).join('');

  if (locked) return;  // nothing editable, so no listeners to wire

  // Wire up inputs
  grid.querySelectorAll('[data-qid]').forEach(el => {
    const event = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(event, () => {
      S.bonusPredictions[el.dataset.qid] = el.value;
      debouncedSave();
    });
  });

  grid.querySelectorAll('.bool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const qid = btn.dataset.qid;
      const val = btn.dataset.val;
      S.bonusPredictions[qid] = val;
      // Update UI
      btn.closest('.bool-toggle').querySelectorAll('.bool-btn').forEach(b => {
        b.classList.remove('selected-yes', 'selected-no');
      });
      btn.classList.add(val === 'yes' ? 'selected-yes' : 'selected-no');
      debouncedSave();
    });
  });
}

function bonusCard(q, locked = false) {
  const val  = S.bonusPredictions[q.id] || '';
  const links = q.links.map(l => `<a class="odds-link" href="${l.url}" target="_blank" rel="noopener">${l.label}</a>`).join('');
  const dis = locked ? 'disabled' : '';

  let input = '';
  if (q.type === 'team') {
    input = `<select class="bonus-input" data-qid="${q.id}" ${dis}>
      <option value="">— Select team —</option>
      ${WC.teamList.map(t => `<option value="${t.code}" ${val === t.code ? 'selected' : ''}>${t.name}</option>`).join('')}
    </select>`;
  } else if (q.type === 'player') {
    const opts = WC.playerList.map(p => `<option value="${esc(p)}" ${val === p ? 'selected' : ''}>${esc(p)}</option>`).join('');
    input = `<select class="bonus-input" data-qid="${q.id}" ${dis}>
      <option value="">— Select player —</option>
      ${opts}
    </select>`;
  } else if (q.type === 'number') {
    input = `<input class="bonus-input" type="number" data-qid="${q.id}"
               value="${val}" placeholder="e.g. 280" min="0" max="500" ${dis} />`;
  } else if (q.type === 'boolean') {
    const yesClass = val === 'yes' ? 'selected-yes' : '';
    const noClass  = val === 'no'  ? 'selected-no'  : '';
    input = `<div class="bool-toggle">
      <button class="bool-btn ${yesClass}" data-qid="${q.id}" data-val="yes" ${dis}>✅ Yes</button>
      <button class="bool-btn ${noClass}"  data-qid="${q.id}" data-val="no" ${dis}>❌ No</button>
    </div>`;
  }

  const ptsDisplay = typeof q.points === 'number' ? `${q.points} pts` : q.points;

  return `
  <div class="bonus-card${locked ? ' locked' : ''}">
    <div class="bonus-card-top">
      <span class="bonus-emoji">${q.emoji}</span>
      <span class="bonus-pts">${locked ? '🔒' : ''} ${ptsDisplay}</span>
    </div>
    <div class="bonus-question">${q.question}</div>
    <div class="bonus-tip">${q.tip}</div>
    ${input}
    ${links ? `<div class="bonus-links">${links}</div>` : ''}
  </div>`;
}

// ══════════════════════════════════════════════════════
//  BROWSE VIEW
// ══════════════════════════════════════════════════════
function renderBrowse() {
  renderUserGrid('');
  const search = document.getElementById('browse-search');
  if (search) {
    search.oninput = () => renderUserGrid(search.value.toLowerCase());
  }
}

function renderUserGrid(filter) {
  const allIds = new Set();
  if (S.user) allIds.add(S.user.id);
  S.allUsers.forEach(u => allIds.add(u.id));
  Object.keys(S.allPredictions).forEach(id => allIds.add(id));

  const getUserObj = id => {
    if (S.user && id === S.user.id) return S.user;
    return S.allUsers.find(u => u.id === id) || { id, name: 'Unknown', color: '#555' };
  };

  const filtered = [...allIds]
    .map(id => getUserObj(id))
    .filter(u => !filter || displayName(u).toLowerCase().includes(filter));

  const el = document.getElementById('browse-users');
  if (filtered.length === 0) {
    el.innerHTML = !isBackendConfigured()
      ? `<div class="empty-state" style="grid-column:1/-1"><div class="emoji">🔗</div><h3>Backend not connected</h3><p>Connect Google Sheets to see everyone's predictions.</p></div>`
      : `<div style="color:var(--text-sub);padding:20px">No users found.</div>`;
    return;
  }

  el.innerHTML = filtered.map(u => {
    const score = calcScore(u.id);
    const isMe  = S.user && u.id === S.user.id;
    return `
    <div class="browse-user-card${isMe ? ' me' : ''}" onclick="viewUserPredictions('${u.id}')">
      ${avatarHtml(u, 32)}
      <div class="browse-user-info">
        <div class="browse-user-name">${esc(displayName(u))}${isMe ? ' (you)' : ''}</div>
        <div class="browse-user-pts">${score.total} pts · ${countFilled(u.id)}/72</div>
      </div>
    </div>`;
  }).join('');
}

function viewUserPredictions(userId) {
  const getUserObj = id => {
    if (S.user && id === S.user.id) return S.user;
    return S.allUsers.find(u => u.id === id) || { id, name: '?', color: '#555' };
  };

  const user = getUserObj(userId);
  const isSelf = S.user && userId === S.user.id;
  const preds  = isSelf ? S.predictions      : (S.allPredictions[userId]?.group || {});
  const bonus  = isSelf ? S.bonusPredictions : (S.allPredictions[userId]?.bonus || {});
  const score  = calcScore(userId);

  const detail = document.getElementById('browse-detail');

  // Group predictions table — all matches in kickoff order (across every group)
  // so it's easy to follow predictions chronologically rather than by group.
  const allMatches = [...WC.matches].sort((a, b) => new Date(a.date) - new Date(b.date));
  const groupRows = allMatches.map(m => {
      const p    = preds[m.id];
      const res  = S.results[m.id];
      const home = WC.teams[m.home], away = WC.teams[m.away];
      const predTxt = p ? `${p.home}–${p.away}` : '—';
      const resTxt  = res ? `${res.home}–${res.away}` : '—';
      let pts = '', cls = 'pred-empty';
      if (p && res) {
        const ph = +p.home, pa = +p.away, rh = +res.home, ra = +res.away;
        if (ph === rh && pa === ra) { pts = `+${WC.scoring.groupExact}`; cls = 'pred-correct'; }
        else if (Math.sign(ph-pa) === Math.sign(rh-ra)) { pts = `+${WC.scoring.groupResult}`; cls = 'pred-partial'; }
        else { pts = '0'; cls = 'pred-incorrect'; }
      }
      return `
      <tr>
        <td>${flagImg(home)} ${home.name} vs ${flagImg(away)} ${away.name}${m.date ? `<div style="color:var(--text-sub);font-size:11px;margin-top:2px">Group ${m.group} · ${fmtMatchDate(m.date)}</div>` : ''}</td>
        <td><span class="pred-score ${cls}">${predTxt}</span></td>
        <td style="color:var(--text-sub)">${resTxt}</td>
        <td><span class="${cls}">${pts}</span></td>
      </tr>`;
    }).join('');

  // Bonus answers
  const bonusRows = WC.bonusQuestions.map(q => {
    const p = bonus[q.id] || '—';
    const r = S.results[`bonus_${q.id}`];
    let display = esc(p);
    if (q.type === 'team' && p !== '—') {
      const t = WC.teams[p];
      display = t ? `${flagImg(t)} ${esc(t.name)}` : esc(p);
    }
    return `<tr>
      <td>${q.emoji} ${q.question}</td>
      <td><strong>${display}</strong></td>
      <td style="color:var(--text-sub)">${r || '—'}</td>
    </tr>`;
  }).join('');

  detail.innerHTML = `
  <div style="margin-bottom:32px;scroll-margin-top:80px">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
      ${avatarHtml(user, 40)}
      <div>
        <div style="font-size:18px;font-weight:700">${esc(displayName(user))}</div>
        <div style="color:var(--text-sub);font-size:13px">${score.total} pts · ${countFilled(userId)}/72 matches filled</div>
      </div>
      <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="closeBrowseDetail()">✕ Close</button>
    </div>

    <div class="compare-table-wrap" style="margin-bottom:24px">
      <table class="compare-table">
        <thead><tr><th>Match</th><th>Prediction</th><th>Result</th><th>Points</th></tr></thead>
        <tbody>${groupRows}</tbody>
      </table>
    </div>

    <div style="font-size:15px;font-weight:700;margin-bottom:12px">⭐ Bonus Predictions</div>
    <div class="compare-table-wrap">
      <table class="compare-table">
        <thead><tr><th>Question</th><th>Answer</th><th>Actual</th></tr></thead>
        <tbody>${bonusRows}</tbody>
      </table>
    </div>
  </div>`;
  detail.firstElementChild?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeBrowseDetail() {
  document.getElementById('browse-detail').innerHTML = '';
}

function showUserInBrowse(userId) {
  switchTab('browse');
  viewUserPredictions(userId);
}

// ══════════════════════════════════════════════════════
//  ADMIN VIEW
// ══════════════════════════════════════════════════════
function bindAdmin() {
  document.getElementById('admin-login-btn')?.addEventListener('click', unlockAdmin);
  document.getElementById('admin-pw-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') unlockAdmin();
  });
}

async function unlockAdmin() {
  const btn = document.getElementById('admin-login-btn');
  const pw  = document.getElementById('admin-pw-input').value;
  if (!pw) return;

  btn.disabled = true;
  btn.textContent = 'Checking…';

  try {
    if (!isBackendConfigured()) throw new Error('no-backend');
    const form = new FormData();
    form.append('action', 'checkAdmin');
    form.append('pw', pw);
    const res  = await fetch(CONFIG.BACKEND_URL, { method: 'POST', body: form, redirect: 'follow' });
    const data = await res.json();
    if (data.error) throw new Error('bad-password');
  } catch(e) {
    btn.disabled = false;
    btn.textContent = 'Unlock';
    showToast(e.message === 'bad-password' ? 'Incorrect password' : 'Cannot reach backend', 'error');
    return;
  }

  S.adminPw       = pw;
  S.adminUnlocked = true;
  localStorage.setItem('wc26_is_admin', '1');
  S.isAdmin = true;
  syncAdminVisibility();
  rebuildMobileNavItems();
  btn.disabled    = false;
  btn.textContent = 'Unlock';
  document.getElementById('admin-gate-wrap').classList.add('hidden');
  document.getElementById('admin-content').classList.add('active');
  document.getElementById('admin-content').scrollIntoView({ behavior: 'smooth', block: 'start' });
  renderAdminContent();
}

function renderAdmin() {
  if (S.adminUnlocked) renderAdminContent();
}

function renderAdminContent() {
  document.getElementById('admin-gate-wrap').classList.add('hidden');
  document.getElementById('admin-content').classList.add('active');
  renderLockGrid();
  renderAdminGroupSelector();
  renderAdminResultGrid(S.adminGroup);
  renderAdminKoResultGrid(S.adminKoRound);
  renderAdminBonusResultGrid();
  renderPrizeInputs();
  updateHowtoPrizes();
  renderAdminUsers();

  document.getElementById('save-prizes-btn')?.addEventListener('click', savePrizes);
  document.getElementById('admin-export-btn')?.addEventListener('click', exportCSV);
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function renderAdminUsers() {
  const wrap = document.getElementById('admin-users-list');
  if (!wrap) return;

  // Registered players (Users tab) + orphans: ids that have predictions but
  // no Users row (deleted accounts, old duplicates, test rows). Orphans show
  // as "Unknown" on the leaderboard, so list them here so they're deletable.
  const registeredIds = new Set(S.allUsers.map(u => u.id));
  const registered = S.allUsers.map(u => ({ id: u.id, name: u.name, orphan: false }));
  const orphans = Object.keys(S.allPredictions)
    .filter(id => !registeredIds.has(id))
    .map(id => ({ id, name: '(no account — predictions only)', orphan: true }));
  const all = [...registered, ...orphans];

  if (!all.length) {
    wrap.innerHTML = '<p style="color:var(--text-sub);font-size:13px">No players yet.</p>';
    return;
  }

  wrap.innerHTML = all.map(u => {
    const safeName = escapeHtml(u.name || '(no name)');
    const tag = u.orphan
      ? ' <span style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--red);border:1px solid var(--red);border-radius:4px;padding:1px 5px;margin-left:6px">orphan</span>'
      : '';
    return `
      <div class="admin-user-row">
        <div class="admin-user-info">
          <div class="admin-user-name">${safeName}${tag}</div>
          <div class="admin-user-id">${escapeHtml(u.id)}</div>
        </div>
        <button class="btn btn-ghost btn-sm admin-user-delete" data-uid="${escapeHtml(u.id)}" data-name="${escapeHtml(u.orphan ? u.id : (u.name || '(no name)'))}">🗑️ Remove</button>
      </div>
    `;
  }).join('');
  wrap.querySelectorAll('.admin-user-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteUserAdmin(btn.dataset.uid, btn.dataset.name));
  });
}

async function deleteUserAdmin(id, name) {
  if (!confirm(`Remove "${name}"?\n\nThis deletes the account and all their predictions. Cannot be undone.`)) return;
  if (!isBackendConfigured()) { showToast('Backend not configured', 'error'); return; }
  if (!S.adminPw)             { showToast('Admin not unlocked', 'error'); return; }
  try {
    const form = new FormData();
    form.append('action', 'deleteUser');
    form.append('userId', id);
    form.append('pw',     S.adminPw);
    const res = await fetch(CONFIG.BACKEND_URL, { method: 'POST', body: form, redirect: 'follow' });
    const data = await res.json().catch(() => ({}));
    if (data.error) throw new Error(data.error);
    S.allUsers = S.allUsers.filter(u => u.id !== id);
    delete S.allPredictions[id];
    renderAdminUsers();
    renderLeaderboard();   // drop the removed row from the standings immediately
    showToast(`Removed ${name}`, 'success');
  } catch (e) {
    showToast(`Delete failed: ${e.message}`, 'error');
  }
}

function renderLockGrid() {
  const grid = document.getElementById('lock-grid');
  if (!grid) return;
  const rounds = [
    { id: 'group', label: 'Group Stage' },
    ...WC.koRounds.map(r => ({ id: r.id, label: r.name })),
    { id: 'bonus', label: 'Bonus Questions' },
  ];
  grid.innerHTML = rounds.map(r => {
    const manual = !!S.config.locked?.[r.id];
    const auto   = autoLockPassed(roundLockDate(r.id));
    // Once the scheduled time has passed the round is locked no matter what,
    // so disable the toggle and show it as auto-locked.
    const status = auto ? '🔒 Locked (auto)' : manual ? '🔒 Locked' : '🔓 Open';
    return `
    <div class="lock-item">
      <span class="lock-label">${r.label}</span>
      <label class="toggle-switch">
        <input type="checkbox" ${manual || auto ? 'checked' : ''} ${auto ? 'disabled' : ''}
               onchange="toggleLock('${r.id}', this.checked)" />
        <span class="toggle-slider"></span>
      </label>
      <span style="font-size:12px;color:var(--text-dim)">${status}</span>
    </div>`;
  }).join('');
}

function toggleLock(roundId, locked) {
  if (!S.config.locked) S.config.locked = {};
  S.config.locked[roundId] = locked;
  saveLocal();
  syncRemoteConfig();
  showToast(`${roundId} ${locked ? 'locked 🔒' : 'unlocked 🔓'}`, 'info');
  renderLockGrid();
}

function renderAdminGroupSelector() {
  const sel = document.getElementById('admin-group-selector');
  if (!sel) return;
  sel.innerHTML = WC.groups.map(g => `
    <button class="group-btn${g.id === S.adminGroup ? ' active' : ''}"
            onclick="selectAdminGroup('${g.id}')">Group ${g.id}</button>`).join('');
}

function selectAdminGroup(id) {
  S.adminGroup = id;
  renderAdminGroupSelector();
  renderAdminResultGrid(id);
}

function renderAdminResultGrid(groupId) {
  const el = document.getElementById('admin-result-grid');
  if (!el) return;
  const matches = WC.matchesByGroup[groupId];
  el.innerHTML = matches.map(m => {
    const res = S.results[m.id] || {};
    const home = WC.teams[m.home], away = WC.teams[m.away];
    return `
    <div class="result-entry-card">
      <div class="result-entry-label">Group ${m.group}${m.date ? ` · ${fmtMatchDate(m.date)}` : ''} · ${flagImg(home)} vs ${flagImg(away)}</div>
      <div class="result-entry-row">
        <span>${home.name}</span>
        <input type="number" id="adm-${m.id}-home" value="${res.home ?? ''}" min="0" max="20"
               onchange="saveResult('${m.id}','home',this.value)" />
        <span>–</span>
        <input type="number" id="adm-${m.id}-away" value="${res.away ?? ''}" min="0" max="20"
               onchange="saveResult('${m.id}','away',this.value)" />
        <span>${away.name}</span>
      </div>
    </div>`;
  }).join('');
}

function saveResult(matchId, side, value) {
  if (!S.results[matchId]) S.results[matchId] = {};
  S.results[matchId][side] = value === '' ? undefined : +value;
  saveLocal();
  syncRemoteResults();
}

function renderAdminBonusResultGrid() {
  const el = document.getElementById('admin-bonus-result-grid');
  if (!el) return;
  el.innerHTML = WC.bonusQuestions.map(q => {
    const val = S.results[`bonus_${q.id}`] ?? '';
    let input = '';
    if (q.type === 'team') {
      input = `<select onchange="saveBonusResult('${q.id}', this.value)"
                 style="flex:1;background:var(--bg-input);border:1px solid var(--border);border-radius:4px;color:var(--text);padding:6px">
        <option value="">— Not decided —</option>
        ${WC.teamList.map(t => `<option value="${t.code}" ${val === t.code ? 'selected' : ''}>${t.name}</option>`).join('')}
      </select>`;
    } else if (q.type === 'number') {
      input = `<input type="number" min="0" max="500" placeholder="e.g. 280"
                 value="${val}" onchange="saveBonusResult('${q.id}', this.value)"
                 style="flex:1;background:var(--bg-input);border:1px solid var(--border);border-radius:4px;color:var(--text);padding:6px">`;
    } else { // player (or any free-text)
      input = `<input type="text" placeholder="Player name…"
                 value="${esc(val)}" onchange="saveBonusResult('${q.id}', this.value)"
                 style="flex:1;background:var(--bg-input);border:1px solid var(--border);border-radius:4px;color:var(--text);padding:6px">`;
    }
    return `
    <div class="result-entry-card">
      <div class="result-entry-label">${q.emoji} ${q.question}</div>
      <div class="result-entry-row">
        <span>Answer:</span>
        ${input}
      </div>
    </div>`;
  }).join('');
}

function saveBonusResult(qid, value) {
  const key = `bonus_${qid}`;
  if (value === '' || value === null || value === undefined) {
    delete S.results[key];
  } else {
    S.results[key] = value;
  }
  saveLocal();
  syncRemoteResults();
  // Scores depend on bonus results, so refresh the standings if they're showing.
  if (S.activeTab === 'leaderboard') renderLeaderboard();
}

function buildAdminKoRoundTabs() {
  const el = document.getElementById('admin-ko-round-tabs');
  if (!el) return;
  el.innerHTML = WC.koRounds.map(r => `
    <button class="ko-round-btn${r.id === S.adminKoRound ? ' active' : ''}"
            onclick="selectAdminKoRound('${r.id}')">
      ${r.short}
    </button>`).join('');
}

function selectAdminKoRound(id) {
  S.adminKoRound = id;
  document.querySelectorAll('#admin-ko-round-tabs .ko-round-btn').forEach(b => {
    b.classList.toggle('active', b.textContent.trim() === WC.koRounds.find(r => r.id === id).short);
  });
  renderAdminKoResultGrid(id);
}

function renderAdminKoResultGrid(roundId) {
  const el    = document.getElementById('admin-ko-result-grid');
  if (!el) return;
  const round = WC.koRounds.find(r => r.id === roundId);
  const resArr = S.results[`ko_${roundId}`] || Array(round.matches).fill(null);
  // Matchups come from ACTUAL entered results, not the admin's own bracket —
  // so teams only appear once the feeding results are in (TBD otherwise).
  const matchups = resolveActualKoMatchups(roundId);

  el.innerHTML = Array.from({ length: round.matches }, (_, i) => {
    const res  = resArr[i] || {};
    const mu   = matchups[i] || {};
    const homeTeam = mu.home ? WC.teams[mu.home] : null;
    const awayTeam = mu.away ? WC.teams[mu.away] : null;
    const homeScore = res.home ?? '';
    const awayScore = res.away ?? '';
    const winner = res.winner || '';
    return `
    <div class="result-entry-card">
      <div class="result-entry-label">${round.name} · Match ${i + 1}</div>
      <div class="result-entry-row" style="margin-bottom:8px">
        <span>Match:</span>
        <span style="flex:1;text-align:center;font-weight:bold">
          ${homeTeam ? flagImg(homeTeam) + ' ' + homeTeam.name : 'TBD'}
          &nbsp;vs&nbsp;
          ${awayTeam ? flagImg(awayTeam) + ' ' + awayTeam.name : 'TBD'}
        </span>
      </div>
      <div class="result-entry-row">
        <span>Score:</span>
        <input type="number" min="0" max="20" placeholder="–"
               style="width:60px;background:var(--bg-input);border:1px solid var(--border);border-radius:4px;color:var(--text);padding:6px;text-align:center"
               value="${homeScore}" data-idx="${i}" data-side="home"
               onchange="saveKoResultScore('${roundId}',${i},'home',this.value)">
        <span>-</span>
        <input type="number" min="0" max="20" placeholder="–"
               style="width:60px;background:var(--bg-input);border:1px solid var(--border);border-radius:4px;color:var(--text);padding:6px;text-align:center"
               value="${awayScore}" data-idx="${i}" data-side="away"
               onchange="saveKoResultScore('${roundId}',${i},'away',this.value)">
        <span style="margin-left:12px">Winner:</span>
        <select style="flex:1;background:var(--bg-input);border:1px solid var(--border);border-radius:4px;color:var(--text);padding:6px"
                onchange="saveKoResult('${roundId}',${i},this.value)">
          <option value="">— Auto / Draw —</option>
          ${homeTeam ? `<option value="${mu.home}" ${winner === mu.home ? 'selected' : ''}>${homeTeam.name}</option>` : ''}
          ${awayTeam ? `<option value="${mu.away}" ${winner === mu.away ? 'selected' : ''}>${awayTeam.name}</option>` : ''}
        </select>
      </div>
    </div>`;
  }).join('');
}

function saveKoResult(roundId, idx, winner) {
  if (!S.results[`ko_${roundId}`]) S.results[`ko_${roundId}`] = [];
  if (!S.results[`ko_${roundId}`][idx]) S.results[`ko_${roundId}`][idx] = {};
  S.results[`ko_${roundId}`][idx].winner = winner;
  saveLocal();
  syncRemoteResults();
}

function saveKoResultScore(roundId, idx, side, val) {
  if (!S.results[`ko_${roundId}`]) S.results[`ko_${roundId}`] = [];
  if (!S.results[`ko_${roundId}`][idx]) S.results[`ko_${roundId}`][idx] = {};
  const num = val === '' ? '' : Math.max(0, Math.min(20, parseInt(val, 10) || 0));
  S.results[`ko_${roundId}`][idx][side] = num;
  // Auto-determine winner from scores if both are set — using the ACTUAL
  // matchup derived from results, not the admin's bracket predictions.
  const res = S.results[`ko_${roundId}`][idx];
  if (res.home !== '' && res.away !== '') {
    const mu = resolveActualKoMatchups(roundId)[idx] || {};
    if (res.home > res.away) {
      res.winner = mu.home || '';
    } else if (res.away > res.home) {
      res.winner = mu.away || '';
    } else {
      res.winner = ''; // draw, no winner yet
    }
  }
  saveLocal();
  syncRemoteResults();
}

function renderPrizeInputs() {
  ['1','2','3'].forEach(n => {
    const el = document.getElementById(`prize-input-${n}`);
    if (el) el.value = S.config.prizes?.[`p${n}`] || '';
  });
}

async function savePrizes() {
  const btn = document.getElementById('save-prizes-btn');
  const prev = S.config.prizes;
  S.config.prizes = {
    p1: document.getElementById('prize-input-1')?.value || 'TBA',
    p2: document.getElementById('prize-input-2')?.value || 'TBA',
    p3: document.getElementById('prize-input-3')?.value || 'TBA',
  };
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
  try {
    await syncRemoteConfig();
    saveLocal();
    updateHowtoPrizes();
    showToast('Prizes saved to server!', 'success');
  } catch (e) {
    S.config.prizes = prev;
    renderPrizeInputs();
    showToast(`Save failed: ${e.message}`, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save prizes'; }
  }
}

function updateHowtoPrizes() {
  ['1','2','3'].forEach(n => {
    const el = document.getElementById(`howto-prize-${n}`);
    if (el) {
      const val = S.config.prizes?.[`p${n}`] || '';
      el.textContent = (val && val !== 'TBA') ? val : 'Prize TBA (set by admin)';
    }
  });
}

function exportCSV() {
  const allIds = new Set([
    ...(S.user ? [S.user.id] : []),
    ...S.allUsers.map(u => u.id),
    ...Object.keys(S.allPredictions),
  ]);
  const getUserObj = id => {
    if (S.user && id === S.user.id) return S.user;
    return S.allUsers.find(u => u.id === id) || { name: 'Unknown' };
  };

  const rows = [['Name','Group Pts','Knockout Pts','3rd-Place Pts','Bonus Pts','Total','Filled']];
  [...allIds].forEach(id => {
    const u = getUserObj(id);
    const s = calcScore(id);
    rows.push([u.name, s.group, s.ko, s.thirds || 0, s.bonus, s.total, countFilled(id)]);
  });

  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'wc2026-scores.csv';
  a.click();
}

// ══════════════════════════════════════════════════════
//  GOOGLE SSO
// ══════════════════════════════════════════════════════
function initGoogleSSO() {
  const hasClientId = CONFIG.GOOGLE_CLIENT_ID && !CONFIG.GOOGLE_CLIENT_ID.startsWith('YOUR_');

  if (!hasClientId) {
    // Client ID not configured — fall back to manual name/colour login
    const ssoBlock = document.getElementById('sso-block');
    const manualBlock = document.getElementById('manual-login-block');
    if (ssoBlock) ssoBlock.style.display = 'none';
    if (manualBlock) manualBlock.style.display = '';
    buildColorPicker();
    return;
  }

  // Wait for the GSI library to load then render the button
  const tryInit = () => {
    if (typeof google === 'undefined') { setTimeout(tryInit, 150); return; }
    google.accounts.id.initialize({
      client_id:   CONFIG.GOOGLE_CLIENT_ID,
      callback:    handleGoogleSignIn,
      hd:          'sam-media.com',   // restrict to sam-media.com workspace
      auto_select: false,
    });
    const btnEl = document.getElementById('google-signin-btn');
    if (btnEl) {
      google.accounts.id.renderButton(btnEl, {
        theme:          'filled_black',
        size:           'large',
        shape:          'rectangular',
        text:           'signin_with',
        logo_alignment: 'left',
        width:          280,
      });
    }
  };
  tryInit();
}

window.handleGoogleSignIn = function(response) {
  try {
    // Decode JWT payload (no library needed — just base64url decode)
    const b64 = response.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(b64));

    if (!payload.email?.endsWith('@sam-media.com')) {
      showToast('Please use your @sam-media.com Google account', 'error');
      return;
    }

    const userId = `g_${payload.sub}`;
    // Look up nickname from persistent store (survives sign-out)
    // Also fall back to wc26_user in case they never signed out
    const existing = JSON.parse(localStorage.getItem('wc26_user') || 'null');
    const existingNick = lookupNickname(userId)
      || (existing?.id === userId ? existing.nickname : '')
      || '';

    S.user = {
      id:       userId,
      name:     payload.name,
      email:    payload.email,
      picture:  payload.picture || '',
      color:    '#7DC242',
      nickname: existingNick || '',
    };

    saveLocal();
    // Show nickname step — only skip if they already have one
    if (S.user.nickname) {
      closeModal();
      updateHeaderUser();
      syncAdminVisibility();
      syncRemote();
      renderActiveView();
      showToast(`Welcome back, ${S.user.nickname}! ⚽`, 'success');
    } else {
      showNicknameStep(payload.given_name || payload.name.split(' ')[0]);
    }
  } catch(e) {
    console.error('SSO error', e);
    showToast('Sign-in failed — please try again', 'error');
  }
};

function signOut() {
  if (typeof google !== 'undefined') google.accounts.id.disableAutoSelect();
  // Save nickname before wiping the session
  if (S.user?.id && S.user?.nickname) persistNickname(S.user.id, S.user.nickname);
  S.user = null;
  localStorage.removeItem('wc26_user');
  closeUserMenu();
  updateHeaderUser();
  syncAdminVisibility();
  openModal();
  renderActiveView();
}

// Returns the name to display publicly for any user object
// The family roster is authoritative for id → name. A server record whose name
// lags (e.g. Jeremiah's account is still stored under the old "Mumba" name) is
// overridden here so the right name AND profile photo show everywhere.
function rosterName(user) {
  if (!user?.id) return null;
  return FAMILY_ROSTER.find(p => p.id === user.id)?.name || null;
}

function displayName(user) {
  if (!user) return '?';
  if (S.user && user.id === S.user.id) {
    return S.user.nickname || String(S.user.name || '').split(' ')[0] || '?';
  }
  return rosterName(user) || user.name || user.id || '?';   // for other users, name IS their stored nickname
}

function showNicknameStep(suggestedName) {
  // Hide SSO/manual blocks, show nickname block
  if (document.getElementById('sso-block')) document.getElementById('sso-block').style.display = 'none';
  if (document.getElementById('manual-login-block')) document.getElementById('manual-login-block').style.display = 'none';
  if (document.getElementById('nickname-block')) document.getElementById('nickname-block').style.display = '';
  const input = document.getElementById('nickname-input');
  if (input) { input.value = suggestedName || ''; input.focus(); input.select(); }
}

function saveNickname(isChange = false) {
  const input = document.getElementById('nickname-input');
  const nick  = input?.value.trim();
  if (!nick) { input?.focus(); showToast('Please enter a nickname', 'error'); return; }
  if (nick.length > 20) { showToast('Max 20 characters', 'error'); return; }

  S.user.nickname = nick;
  persistNickname(S.user.id, nick);
  saveLocal();
  closeModal();
  // Reset modal to initial state for next open
  const nb = document.getElementById('nickname-block');
  if (nb) nb.style.display = 'none';
  const sb = document.getElementById('sso-block');
  if (sb) sb.style.display = '';
  updateHeaderUser();
  syncAdminVisibility();
  syncRemote();
  renderActiveView();
  showToast(isChange ? `Nickname updated to "${nick}" ✓` : `Let's go, ${nick}! ⚽`, 'success');
}

function changeNickname() {
  closeUserMenu();
  const current = S.user?.nickname || S.user?.name?.split(' ')[0] || '';
  const next = prompt('New nickname (max 20 characters):', current);
  if (next === null) return;
  const nick = next.trim().slice(0, 20);
  if (!nick) { showToast('Nickname cannot be empty', 'error'); return; }
  S.user.nickname = nick;
  persistNickname(S.user.id, nick);
  saveLocal();
  updateHeaderUser();
  syncRemote();
  renderActiveView();
  showToast(`Nickname updated to "${nick}" ✓`, 'success');
}

// ══════════════════════════════════════════════════════
//  MODAL (Login)
// ══════════════════════════════════════════════════════
function buildColorPicker() {
  const AVATAR_COLORS = [
    '#7DC242','#3B82F6','#EC4899','#F97316','#8B5CF6',
    '#06B6D4','#EF4444','#10B981','#F59E0B','#6366F1',
  ];
  const el = document.getElementById('color-picker');
  if (!el) return;
  const selected = S.user?.color || AVATAR_COLORS[0];
  el.innerHTML = AVATAR_COLORS.map(c => `
    <div class="color-dot${c === selected ? ' selected' : ''}"
         style="background:${c}" data-color="${c}"
         onclick="pickColor(this,'${c}')"></div>`).join('');
}

function pickColor(el, color) {
  document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
  el.classList.add('selected');
  if (S.user) { S.user.color = color; updateHeaderUser(); }
}

// ── Family-password "trusted device" helpers ──
function familyPwFingerprint(pw) {
  // tiny hash so a password change invalidates the trust flag
  let h = 0;
  for (let i = 0; i < pw.length; i++) h = ((h << 5) - h + pw.charCodeAt(i)) | 0;
  return `v1_${h}`;
}
function isFamilyTrusted() {
  try {
    return localStorage.getItem('wc26_family_trusted') === familyPwFingerprint(CONFIG.FAMILY_PASSWORD);
  } catch(e) { return false; }
}
function markFamilyTrusted() {
  try { localStorage.setItem('wc26_family_trusted', familyPwFingerprint(CONFIG.FAMILY_PASSWORD)); } catch(e) {}
}
function clearFamilyTrust() {
  try { localStorage.removeItem('wc26_family_trusted'); } catch(e) {}
}

function listKnownUsers() {
  try {
    const map = JSON.parse(localStorage.getItem('wc26_users_by_name') || '{}');
    return Object.entries(map).map(([name, u]) => ({ name, ...u }));
  } catch(e) { return []; }
}

function renderLoginPicker() {
  const wrap   = document.getElementById('login-picker');
  const badge  = document.getElementById('login-trusted-badge');
  const pwGrp  = document.getElementById('login-family-pw-group');
  const untrust = document.getElementById('login-untrust-btn');
  if (!wrap) return;

  const trusted = isFamilyTrusted();

  // Toggle the password field visibility (only needed first time on a device)
  if (pwGrp)   pwGrp.style.display   = trusted ? 'none' : '';
  if (badge)   badge.style.display   = trusted ? '' : 'none';
  if (untrust) untrust.style.display = trusted ? '' : 'none';

  wrap.innerHTML = `
    <div class="login-picker-label">${trusted ? 'Tap your name to start' : 'Who are you?'}</div>
    <div class="login-picker-chips">
      ${FAMILY_ROSTER.map(p => {
        const photo = getProfilePhoto({ name: p.name });
        const avatar = photo
          ? `<span class="login-chip-avatar" style="padding:0;overflow:hidden"><img src="assets/${photo}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover"></span>`
          : `<span class="login-chip-avatar" style="background:#7DC242">${esc(p.name.slice(0,1).toUpperCase())}</span>`;
        return `
        <button type="button" class="login-chip" data-name="${esc(p.name)}">
          ${avatar}
          <span class="login-chip-text"><span class="login-chip-nick">${esc(p.name)}</span></span>
        </button>`;
      }).join('')}
    </div>
  `;

  wrap.querySelectorAll('.login-chip').forEach(chip => {
    chip.addEventListener('click', () => selectRosterPlayer(chip.dataset.name));
  });
}

// Tap a name. If the device is already trusted, log straight in; otherwise
// stage the pick and ask for the family password once.
function selectRosterPlayer(name) {
  const entry = FAMILY_ROSTER.find(p => normalizeName(p.name) === normalizeName(name));
  if (!entry) return;
  S.pendingPick = entry;
  document.querySelectorAll('.login-chip').forEach(c =>
    c.classList.toggle('selected', normalizeName(c.dataset.name) === normalizeName(name)));

  if (isFamilyTrusted()) {
    completeRosterLogin();
  } else {
    const btn = document.getElementById('login-btn');
    if (btn) btn.textContent = `Continue as ${entry.name} ⚽`;
    document.getElementById('login-family-pw')?.focus();
  }
}

async function completeRosterLogin() {
  const entry = S.pendingPick;
  if (!entry) { showToast('Tap your name first', 'error'); return; }

  if (!isFamilyTrusted()) {
    const pwEl = document.getElementById('login-family-pw');
    if (pwEl?.value !== CONFIG.FAMILY_PASSWORD) {
      pwEl?.focus();
      showToast('Wrong family password', 'error');
      return;
    }
    markFamilyTrusted();
  }

  S.user = {
    id:       entry.id,
    name:     entry.name,
    nickname: lookupNickname(entry.id) || '',   // optional fun nickname, set later from the menu
    color:    '#7DC242',
    email:    '',
  };
  persistNickname(entry.id, S.user.nickname);
  persistUserByName(entry.name, S.user);
  saveLocal();
  S.pendingPick = null;
  closeModal();
  updateHeaderUser();
  syncAdminVisibility();

  // Pull THIS account's saved predictions from the server BEFORE rendering or
  // saving, so a fresh device (phone, cleared cache) shows the existing picks
  // instead of blanks. fetchRemote() hydrates S.predictions when local is empty.
  await fetchRemote();
  renderActiveView();

  // Safe-sync: only write back once we actually have something to save — either
  // hydrated from the server above or entered locally. NEVER push an all-empty
  // payload, which would overwrite a populated account on the server.
  const hasPicks = Object.keys(S.predictions).length
                || Object.keys(S.koPredictions).length
                || Object.keys(S.bonusPredictions).length;
  if (hasPicks) syncRemote();

  showToast(`Welcome, ${displayName(S.user)}! ⚽`, 'success');
}

function openModal() {
  document.getElementById('modal-overlay').classList.add('open');
  renderLoginPicker();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

function openUserMenu() {
  const menu = document.getElementById('user-menu');
  if (!menu || !S.user) return;
  document.getElementById('user-menu-name').textContent  = displayName(S.user);
  document.getElementById('user-menu-email').textContent = S.user.email || S.user.name;
  menu.style.display = '';
  // close on outside click
  setTimeout(() => document.addEventListener('click', closeUserMenuOnOutside, { once: true }), 0);
}

function closeUserMenu() {
  const menu = document.getElementById('user-menu');
  if (menu) menu.style.display = 'none';
}

function closeUserMenuOnOutside(e) {
  if (!document.getElementById('user-menu')?.contains(e.target)) closeUserMenu();
}

function bindModal() {
  // Tap-to-pick roster login
  const btn = document.getElementById('login-btn');
  const pw  = document.getElementById('login-family-pw');

  btn?.addEventListener('click', completeRosterLogin);
  pw?.addEventListener('keydown', e => { if (e.key === 'Enter') completeRosterLogin(); });

  // "Use a different family password" — clears trust flag and re-renders picker
  document.getElementById('login-untrust-btn')?.addEventListener('click', () => {
    clearFamilyTrust();
    renderLoginPicker();
    document.getElementById('login-family-pw')?.focus();
  });

  // Header user button — open menu if logged in, modal if not
  document.getElementById('user-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (S.user) openUserMenu();
    else openModal();
  });
}

async function registerUser() {
  const nameEl     = document.getElementById('login-name');
  const nickEl     = document.getElementById('login-nickname');
  const pwEl       = document.getElementById('login-family-pw');
  const name       = nameEl?.value.trim();
  const nickname   = nickEl?.value.trim();
  const familyPw   = pwEl?.value;

  if (!name)     { nameEl?.focus(); showToast('Please enter your name', 'error'); return; }
  if (!nickname) { nickEl?.focus(); showToast('Please enter a nickname', 'error'); return; }
  if (!isFamilyTrusted()) {
    if (familyPw !== CONFIG.FAMILY_PASSWORD) {
      pwEl?.focus();
      showToast('Wrong family password', 'error');
      return;
    }
    markFamilyTrusted();
  }

  const selectedDot = document.querySelector('.color-dot.selected');
  const color = selectedDot?.dataset.color || '#7DC242';

  // Make sure the server roster is loaded before resolving identity, so a fast
  // tap on a fresh device can't miss the match and fork a duplicate account.
  if (isBackendConfigured() && !S.rosterLoaded) {
    showToast('Connecting…', 'info');
    await fetchRemote();
  }

  // Returning user? Match by name — first the server roster (authoritative,
  // works across devices), then this device's local cache. Reusing the id
  // keeps their existing predictions. New players get a deterministic id
  // derived from their name, so logging in from another device (or with a
  // different nickname) lands on the SAME account instead of forking.
  const existing = findServerUserByName(name) || lookupUserByName(name);

  if (existing) {
    S.user = { ...S.user, id: existing.id, name, nickname: nickname || existing.nickname || '', color, email: '' };
  } else {
    const newId = userIdFromName(name);
    S.user = S.user
      ? { ...S.user, id: newId, name, nickname, color }
      : { id: newId, name, nickname, color, email: '' };
  }
  persistUserByName(name, S.user);

  persistNickname(S.user.id, S.user.nickname);
  saveLocal();
  closeModal();
  updateHeaderUser();
  syncAdminVisibility();
  syncRemote();
  renderActiveView();
  showToast(`Welcome${existing ? ' back' : ''}, ${S.user.nickname}! 🎉`, 'success');
}

function updateHeaderUser() {
  const av = document.getElementById('header-avatar');
  const nm = document.getElementById('header-name');

  if (!S.user) {
    if (av) { av.innerHTML = '?'; av.style.background = '#333'; }
    if (nm) nm.textContent = 'Sign in';
    return;
  }

  if (av) {
    if (S.user.picture) {
      av.innerHTML = `<img src="${S.user.picture}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
      av.style.background = 'transparent';
    } else {
      const initials = (S.user.nickname || S.user.name).split(' ').map(p => p[0]).slice(0,2).join('').toUpperCase();
      av.innerHTML = initials;
      av.style.background = S.user.color || '#7DC242';
    }
  }
  if (nm) nm.textContent = displayName(S.user);
}

// ══════════════════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════════════════
function showToast(msg, type = 'info') {
  const el  = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ══════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Format a match's absolute kickoff instant in Malaysia time (UTC+8).
// e.g. "Thu 11 Jun, 03:00". Returns '' when no date is known.
function fmtMatchDate(iso) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur',
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(iso));
}

function avatarHtml(user, size = 28) {
  const displayStr = String(user?.nickname || user?.name || '?');
  const initials = displayStr.split(' ').map(p => p[0] || '').slice(0, 2).join('').toUpperCase() || '?';
  const profilePhoto = getProfilePhoto(user);
  if (profilePhoto) {
    return `<img class="avatar" src="assets/${profilePhoto}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover" alt="${esc(displayStr)}" />`;
  }
  return `<div class="avatar" style="background:${user.color};width:${size}px;height:${size}px;font-size:${Math.floor(size*0.4)}px">${initials}</div>`;
}

const PROFILE_PHOTOS = {
  storm:    'Storm profile.png',
  mumba:    'Mumba profile.png',
  jeremiah: 'Jeremiah profile.png',
  temwa:  'Temwa profile.png',
  jorg:   'Jorg profile.png',
  nimon:  'Nimon profile.png',
  tezya:  'Tezya profile.png',
  lwande: 'Lwande profile.png',
};

function getProfilePhoto(user) {
  // Prefer the authoritative roster name (by id) so a lagging server record
  // still maps to the right photo; fall back to nickname/name for the picker.
  const key = String(rosterName(user) || user?.nickname || user?.name || '')
    .toLowerCase().replace(/\s+/g, '');
  return PROFILE_PHOTOS[key] || null;
}

function teamOptions(selected = '') {
  const none = `<option value="">— Select team —</option>`;
  const opts = WC.teamList.map(t =>
    `<option value="${t.code}" ${selected === t.code ? 'selected' : ''}>${t.name}</option>`
  ).join('');
  return none + opts;
}

function renderLoginPrompt(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div class="empty-state"><div class="emoji">👋</div><h3>Sign in to predict</h3><p>Click your name in the top-right corner to get started.</p><button class="btn btn-primary" onclick="openModal()">Sign in</button></div>`;
}

function renderLoginPromptInView(containerId) {
  renderLoginPrompt(containerId);
}

// ══════════════════════════════════════════════════════
//  LIVE SCORES — API-Football integration
// ══════════════════════════════════════════════════════
const LIVE = {
  API_KEY:    '',          // Add your RapidAPI key here
  RAPID_HOST: 'api-football1.p.rapidapi.com',
  POLL_MS:    60000,       // Poll every 60s
  interval:   null,
  active:     false,
  demoMode:   false,

  async fetch(path, queryParams = {}) {
    if (!this.API_KEY) return null;
    const qs = new URLSearchParams(queryParams).toString();
    const url = `https://${this.RAPID_HOST}${path}${qs ? '?' + qs : ''}`;
    try {
      const res = await fetch(url, {
        headers: {
          'x-rapidapi-key':  this.API_KEY,
          'x-rapidapi-host': this.RAPID_HOST,
        },
        redirect: 'follow',
      });
      return res.ok ? await res.json() : null;
    } catch { return null; }
  },

  async getFixtures(fixtureId = null) {
    const params = { league: '8', season: '2026' };
    if (fixtureId) params.id = fixtureId;
    const data = await this.fetch('/fixtures', params);
    return data?.response || [];
  },

  async pollLiveScores() {
    if (!this.active) return;
    const fixtures = await this.getFixtures();
    const now = Date.now();
    let updated = false;

    fixtures.forEach(fix => {
      const { id, league, teams, goals, fixture: f } = fix;
      const matchId = String(id);
      const status = f?.status?.short || '';
      const homeScore = goals?.home ?? null;
      const awayScore = goals?.away ?? null;

      // Only process if we have scores and match is final/timed
      if (homeScore == null) return;

      const wasEmpty = !S.results[matchId];
      const changed  = S.results[matchId]?.home !== homeScore
                    || S.results[matchId]?.away !== awayScore;

      if (changed) {
        S.results[matchId] = { home: homeScore, away: awayScore };
        localStorage.setItem('wc26_results', JSON.stringify(S.results));
        updated = true;
      }

      // Auto-lock: match is finished (FT, AET, PEN)
      const isFinished = ['FT', 'AET', 'PEN', 'PEN'].includes(status);
      if (isFinished && wasEmpty) {
        const roundId = WC.matches.find(m => String(m.id) === matchId)?.round;
        if (roundId) {
          S.config.locked[roundId] = true;
          syncRemoteConfig();
        }
      }
    });

    if (updated) {
      renderLeaderboard();
      renderBracket();
      this.showLiveBadge(fixtures.filter(f => ['1H','2H','HT','ET','PEN'].includes(f.fixture?.status?.short)));
    }
  },

  start() {
    if (this.interval) return;
    this.active = true;
    this.pollLiveScores(); // immediate first poll
    this.interval = setInterval(() => this.pollLiveScores(), this.POLL_MS);
    console.log('[LiveScores] Started — polling every', this.POLL_MS / 1000, 's');
  },

  stop() {
    this.active = false;
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
    console.log('[LiveScores] Stopped');
  },

  showLiveBadge(liveMatches) {
    const badge = document.getElementById('live-badge');
    if (!badge) return;
    if (liveMatches.length > 0) {
      badge.style.display = 'flex';
      badge.innerHTML = `🔴 LIVE — ${liveMatches.length} match${liveMatches.length > 1 ? 'es' : ''} in progress`;
    } else {
      badge.style.display = 'none';
    }
  },

  init() {
    // Manual mode — scores are entered by admin in the Results panel
    // No API polling, no demo mode
    console.log('[LiveScores] Manual mode — use Admin > Results to enter scores');
  },

  // Map API fixture IDs to app match IDs
  // API-Football uses numeric fixture IDs; app uses group+num like "A1", "r32_0", etc.
  // Override this map with real IDs once you have them from the API
  getAppMatchId(apiId) {
    // For now, demo only — real integration needs a mapping table
    return null;
  },

  startDemo() {
    this.demoMode = true;
    this.active = true;
    // Demo: simulate 2 group matches and 1 KO match
    const demoMatches = [
      { id: 'A1', home: 1, away: 0, minute: 23, round: 'group' },
      { id: 'B2', home: 0, away: 2, minute: 67, round: 'group' },
    ];
    const badge = document.getElementById('live-badge') || this.createLiveBadge();
    badge.style.display = 'flex';
    badge.innerHTML = '🟡 DEMO — Live scores simulation mode (no API key)';

    this.interval = setInterval(() => {
      if (!this.active) return;
      demoMatches.forEach(m => {
        if (Math.random() > 0.6) {
          m.home = Math.min(m.home + (Math.random() > 0.5 ? 1 : 0), 5);
          m.away = Math.min(m.away + (Math.random() > 0.5 ? 1 : 0), 4);
          S.results[m.id] = { home: m.home, away: m.away };
        }
        m.minute = Math.min(m.minute + 1, 90);
      });
      localStorage.setItem('wc26_results', JSON.stringify(S.results));
      renderLeaderboard();
      if (document.getElementById('bracket-view')) renderBracket();
      if (document.getElementById('predictions-view')) renderGroupView();
      const m = demoMatches[0];
      badge.innerHTML = `🟡 DEMO — ${m.home}-${m.away} (${m.minute}') · Click to stop`;
    }, 5000);
    console.log('[LiveScores] Demo mode started — 5s update interval');
  },

  createLiveBadge() {
    const el = document.createElement('div');
    el.id = 'live-badge';
    el.style.cssText = 'display:none;position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#1a1a1a;color:#7DC242;padding:10px 20px;border-radius:20px;font-size:13px;font-weight:600;z-index:9999;border:1px solid #7DC242;cursor:pointer;';
    el.onclick = () => this.stopDemo();
    document.body.appendChild(el);
    return el;
  },

  stopDemo() {
    this.stop();
    this.demoMode = false;
    const badge = document.getElementById('live-badge');
    if (badge) badge.remove();
    console.log('[LiveScores] Demo stopped');
  },

  addApiKey(key) {
    this.API_KEY = key;
    if (this.demoMode) this.stopDemo();
    this.start();
  },
};

// Auto-init when app loads
LIVE.init();
