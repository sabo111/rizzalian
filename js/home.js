// =====================
// SUPABASE CONFIGURATION
// =====================
const SUPABASE_URL = 'https://ahhsnujwllarmhwunvsv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoaHNudWp3bGxhcm1od3VudnN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3OTA3OTIsImV4cCI6MjA3NzM2Njc5Mn0.KbTR4zYe2vn0i-DLbN1kK738gmXtk2qOBAzU0L9ndsk';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =====================
// HELPERS
// =====================
const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="100%" height="100%" fill="#3c5484"/>' +
  '<circle cx="200" cy="190" r="70" fill="#facc15"/><rect x="100" y="290" width="200" height="140" rx="70" fill="#facc15"/></svg>'
);
const displayName = (u) => u.name || u.username || 'Unknown';

// =====================
// ELEMENTS
// =====================
const deckEl = $('deck');
const deckEmpty = $('deckEmpty');
const deckActions = $('deckActions');
const passBtn = $('passBtn');
const likeBtn = $('likeBtn');
const infoBtn = $('infoBtn');
const userPanel = $('userPanel');
const matchOverlay = $('matchOverlay');

// =====================
// STATE
// =====================
let me = null;          // current user's id (from auth session)
let pool = [];          // every profile not yet swiped
let deck = [];          // pool after filters
let busy = false;
let filters = { program: '', tags: [], show: 'all' };

// =====================
// LOAD PROFILES
// =====================
async function loadProfiles() {
  const [profilesRes, likesRes, passesRes] = await Promise.all([
    supabaseClient.from('public_profiles').select('*'),
    supabaseClient.from('likes').select('liked_id').eq('liker_id', me),
    supabaseClient.from('passes').select('passed_id').eq('passer_id', me),
  ]);

  if (profilesRes.error) {
    console.error('Error loading profiles:', profilesRes.error);
    deckEmpty.hidden = false;
    deckEmpty.querySelector('p').textContent = 'Could not load profiles. Please refresh.';
    deckActions.hidden = true;
    return;
  }

  const seen = new Set([
    ...(likesRes.data || []).map((l) => l.liked_id),
    ...(passesRes.data || []).map((p) => p.passed_id),
  ]);

  pool = (profilesRes.data || []).filter(
    (p) => p.user_id !== me && !seen.has(p.user_id) && (p.name || p.username)
  );

  // shuffle so the order varies
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  applyFilters();
}

function applyFilters() {
  deck = pool.filter((u) => {
    if (filters.show === 'women' && u.gender !== 'Female') return false;
    if (filters.show === 'men' && u.gender !== 'Male') return false;
    if (filters.program && !(u.graduated_course || '').toLowerCase().includes(filters.program)) return false;
    if (filters.tags.length) {
      const h = (u.hobbies || '').toLowerCase();
      if (!filters.tags.some((t) => h.includes(t))) return false;
    }
    return true;
  });
  renderDeck();
}

// =====================
// DECK RENDERING
// =====================
function buildCard(u) {
  const name = displayName(u);
  const card = document.createElement('div');
  card.className = 'swipe-card';
  card.innerHTML = `
    <img class="sc-photo" src="${esc(u.profile_pic_url || PLACEHOLDER)}" alt="${esc(name)}" draggable="false">
    <div class="sc-shade"></div>
    <div class="stamp like">LIKE</div>
    <div class="stamp nope">NOPE</div>
    <div class="sc-info">
      <h2 class="sc-name">${esc(name)}${u.age ? ', ' + esc(u.age) : ''}</h2>
      ${u.graduated_course ? `<p class="sc-sub">🎓 ${esc(u.graduated_course)}</p>` : ''}
      ${u.location ? `<p class="sc-sub">📍 ${esc(u.location)}</p>` : ''}
      ${u.bio ? `<p class="sc-bio">${esc(u.bio)}</p>` : ''}
    </div>`;
  card.querySelector('.sc-photo').onerror = (e) => { e.target.src = PLACEHOLDER; };
  return card;
}

function renderDeck() {
  deckEl.innerHTML = '';
  deckEmpty.hidden = deck.length > 0;
  deckActions.hidden = deck.length === 0;
  if (!deck.length) return;

  const visible = deck.slice(0, 2).reverse(); // last element = top card
  visible.forEach((u, i) => {
    const card = buildCard(u);
    if (i === visible.length - 1) attachDrag(card);
    else card.classList.add('behind');
    deckEl.appendChild(card);
  });
}

function attachDrag(card) {
  const likeStamp = card.querySelector('.stamp.like');
  const nopeStamp = card.querySelector('.stamp.nope');
  let startX = 0, dx = 0, dragging = false, moved = false;

  card.addEventListener('pointerdown', (e) => {
    if (busy) return;
    dragging = true; moved = false; startX = e.clientX; dx = 0;
    card.setPointerCapture(e.pointerId);
    card.style.transition = 'none';
  });

  card.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dx = e.clientX - startX;
    if (Math.abs(dx) > 6) moved = true;
    card.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
    likeStamp.style.opacity = clamp(dx / 100, 0, 1);
    nopeStamp.style.opacity = clamp(-dx / 100, 0, 1);
  });

  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    card.style.transition = '';
    if (dx > 110) act('like');
    else if (dx < -110) act('pass');
    else {
      card.style.transform = '';
      likeStamp.style.opacity = 0;
      nopeStamp.style.opacity = 0;
      if (e.type === 'pointerup' && !moved) openPanel(deck[0]);
    }
    dx = 0;
  };
  card.addEventListener('pointerup', end);
  card.addEventListener('pointercancel', end);
}

// =====================
// SWIPE ACTIONS
// =====================
async function sendLike(u) {
  const { error } = await supabaseClient.from('likes').insert([{ liker_id: me, liked_id: u.user_id }]);
  const duplicate = error && error.code === '23505';
  if (error && !duplicate) return { ok: false, message: 'Could not send like: ' + error.message };

  // The database creates the match itself when the like is mutual
  const [a, b] = me < u.user_id ? [me, u.user_id] : [u.user_id, me];
  const { data: match } = await supabaseClient
    .from('matches').select('*').eq('user1_id', a).eq('user2_id', b).maybeSingle();
  return { ok: true, match: duplicate ? null : match };
}

async function sendPass(u) {
  const { error } = await supabaseClient.from('passes').insert([{ passer_id: me, passed_id: u.user_id }]);
  if (error && error.code !== '23505') return { ok: false, message: 'Could not pass: ' + error.message };
  return { ok: true };
}

async function act(kind) {
  if (busy || !deck.length) return;
  busy = true;
  const u = deck[0];
  const card = deckEl.lastElementChild;

  if (card) {
    const dir = kind === 'like' ? 1 : -1;
    card.style.transition = 'transform 0.35s ease, opacity 0.35s ease';
    card.style.transform = `translateX(${dir * 600}px) rotate(${dir * 30}deg)`;
    card.style.opacity = '0';
  }

  const result = kind === 'like' ? await sendLike(u) : await sendPass(u);
  await sleep(300);

  if (!result.ok) {
    alert(result.message);
    renderDeck();
    busy = false;
    return;
  }

  pool = pool.filter((p) => p.user_id !== u.user_id);
  deck = deck.filter((p) => p.user_id !== u.user_id);
  renderDeck();
  busy = false;

  if (result.match) showMatch(u, result.match);
}

function showMatch(u, match) {
  const name = displayName(u);
  let line;
  if (match.first_mover_id === me) line = 'You make the first move. You have 24 hours to say hi!';
  else if (match.first_mover_id) line = `${name} makes the first move. They have 24 hours.`;
  else line = 'Say hi first. You have 24 hours to start the chat.';
  $('matchText').textContent = `You and ${name} liked each other. ${line}`;
  matchOverlay.hidden = false;
}

$('matchKeep').addEventListener('click', () => { matchOverlay.hidden = true; });
$('matchChat').addEventListener('click', () => { window.location.href = '../pages/matches.html'; });

passBtn.addEventListener('click', () => act('pass'));
likeBtn.addEventListener('click', () => act('like'));
infoBtn.addEventListener('click', () => deck[0] && openPanel(deck[0]));

document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, select, textarea')) return;
  if (e.key === 'Escape') { userPanel.classList.remove('active'); matchOverlay.hidden = true; return; }
  if (userPanel.classList.contains('active') || !matchOverlay.hidden) return;
  if (e.key === 'ArrowRight') act('like');
  else if (e.key === 'ArrowLeft') act('pass');
  else if (e.key === 'ArrowUp' && deck[0]) openPanel(deck[0]);
});

// =====================
// PROFILE PANEL
// =====================
function openPanel(u) {
  if (!u) return;
  userPanel.classList.add('active');
  $('panelName').textContent = `${displayName(u)}${u.age ? ', ' + u.age : ''}`;
  $('panelMainImg').src = u.profile_pic_url || PLACEHOLDER;

  const rows = [
    ['Graduated Course', u.graduated_course],
    ['Graduation Year', u.graduation_year],
    ['Current Profession', u.current_profession],
    ['Gender', u.gender],
    ['Location', u.location],
    ['Height', u.height ? u.height + ' cm' : ''],
    ['Hobbies', u.hobbies],
  ];
  const prompts = Array.isArray(u.prompts) ? u.prompts.filter((p) => p && p.q && p.a) : [];

  $('userDetails').innerHTML =
    (u.bio ? `<div class="prompt-block"><span class="q">About</span><p class="a">${esc(u.bio)}</p></div>` : '') +
    prompts.map((p) => `<div class="prompt-block"><span class="q">${esc(p.q)}</span><p class="a">${esc(p.a)}</p></div>`).join('') +
    rows.map(([label, val]) => `
      <div class="detail-row">
        <span class="detail-label">${label}:</span>
        <span class="detail-value">${esc(val || 'N/A')}</span>
      </div>`).join('');

  $('lookingFor').textContent = u.looking_for || 'No preference specified';
}

$('closePanel').addEventListener('click', () => userPanel.classList.remove('active'));
userPanel.addEventListener('click', (e) => { if (e.target === userPanel) userPanel.classList.remove('active'); });

// =====================
// FILTER
// =====================
const openFilterBtn = $('openFilterBtn');
const filterDropdown = $('filterDropdown');

openFilterBtn.addEventListener('click', () => {
  filterDropdown.hidden = !filterDropdown.hidden;
  openFilterBtn.setAttribute('aria-expanded', String(!filterDropdown.hidden));
});

document.addEventListener('click', (e) => {
  if (!filterDropdown.hidden && !filterDropdown.contains(e.target) && e.target !== openFilterBtn) {
    filterDropdown.hidden = true;
  }
});

$('filterForm').addEventListener('submit', (e) => {
  e.preventDefault();
  filters = {
    show: $('filterShow').value,
    program: $('filterProgram').value.trim().toLowerCase(),
    tags: $('filterMeta').value.toLowerCase().split(',').map((t) => t.trim()).filter(Boolean),
  };
  filterDropdown.hidden = true;
  applyFilters();
});

$('clearFilter').addEventListener('click', () => {
  $('filterForm').reset();
  filters = { program: '', tags: [], show: 'all' };
  filterDropdown.hidden = true;
  applyFilters();
});

// =====================
// LOGOUT + INIT
// =====================
$('logoutBtn').addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  window.location.href = '../pages/rizzalian.html';
});

(async function init() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = '../pages/rizzalian.html';
    return;
  }
  me = session.user.id;
  loadProfiles();
})();