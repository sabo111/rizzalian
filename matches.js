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
const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100%" height="100%" fill="#3c5484"/>' +
  '<circle cx="50" cy="38" r="17" fill="#facc15"/><rect x="24" y="60" width="52" height="38" rx="19" fill="#facc15"/></svg>'
);
const nameOf = (p) => (p && (p.name || p.username)) || 'Unknown';

function fmtLeft(ms) {
  if (ms == null) return '';
  const mins = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(mins / 60);
  return h > 0 ? `${h}h ${mins % 60}m` : mins > 0 ? `${mins}m` : '<1m';
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// =====================
// STATE
// =====================
let me = null;
let entries = [];            // [{ match, other, msgs }]
const byId = new Map();      // match id -> entry
let active = null;           // entry open in chat

// =====================
// STATUS RULES (the database enforces the same rules)
// =====================
function statusOf(e) {
  const m = e.match, n = e.msgs.length, name = nameOf(e.other);
  const exp = m.expires_at ? new Date(m.expires_at) : null;
  const left = exp ? exp - Date.now() : null;

  if (exp && left <= 0) {
    return { text: 'Expired', cls: 'expired', canSend: false, hint: 'This match has expired.' };
  }
  if (n === 0) {
    if (m.first_mover_id && m.first_mover_id !== me) {
      return {
        text: `Waiting for ${name} to message first - ${fmtLeft(left)} left`,
        cls: 'waiting', canSend: false, hint: `${name} has to send the first message.`,
      };
    }
    return { text: `Say hi! ${fmtLeft(left)} left`, cls: 'action', canSend: true };
  }
  const last = e.msgs[n - 1];
  if (!exp) return { text: last.body, cls: 'active', canSend: true };
  if (last.sender_id === me) {
    return { text: `Waiting for a reply - ${fmtLeft(left)} left`, cls: 'waiting', canSend: true };
  }
  return { text: `Reply within ${fmtLeft(left)}`, cls: 'action', canSend: true };
}

const lastActivity = (e) => new Date(e.msgs.length ? e.msgs[e.msgs.length - 1].created_at : e.match.created_at).getTime();

// =====================
// LOAD
// =====================
async function loadAll() {
  const { data: matches, error } = await supabaseClient
    .from('matches').select('*').order('created_at', { ascending: false });
  if (error) { console.error('Matches load error:', error); return; }

  const ids = (matches || []).map((m) => m.id);
  const otherIds = (matches || []).map((m) => (m.user1_id === me ? m.user2_id : m.user1_id));

  let profiles = [], messages = [];
  if (ids.length) {
    const [p, msg] = await Promise.all([
      supabaseClient.from('public_profiles').select('user_id, name, username, profile_pic_url').in('user_id', otherIds),
      supabaseClient.from('messages').select('*').in('match_id', ids).order('created_at', { ascending: true }),
    ]);
    profiles = p.data || [];
    messages = msg.data || [];
  }

  byId.clear();
  entries = (matches || []).map((m) => {
    const otherId = m.user1_id === me ? m.user2_id : m.user1_id;
    const e = {
      match: m,
      other: profiles.find((p) => p.user_id === otherId) || { user_id: otherId },
      msgs: messages.filter((x) => x.match_id === m.id),
    };
    byId.set(m.id, e);
    return e;
  });

  if (active) active = byId.get(active.match.id) || null;
  renderList();
  if (active) renderChat(); else if (!$('chatView').hidden) showList();
}

async function refreshMatch(entry) {
  const { data } = await supabaseClient.from('matches').select('*').eq('id', entry.match.id).maybeSingle();
  if (data) entry.match = data;
}

// =====================
// LIST
// =====================
function renderList() {
  const live = entries.filter((e) => statusOf(e).cls !== 'expired').sort((a, b) => lastActivity(b) - lastActivity(a));
  const dead = entries.filter((e) => statusOf(e).cls === 'expired').sort((a, b) => lastActivity(b) - lastActivity(a));
  const sorted = [...live, ...dead];

  $('listEmpty').hidden = sorted.length > 0;
  $('matchList').innerHTML = sorted.map((e) => {
    const s = statusOf(e);
    return `
      <button class="match-row ${s.cls}" data-id="${esc(e.match.id)}" type="button">
        <img class="avatar" src="${esc(e.other.profile_pic_url || PLACEHOLDER)}" alt="">
        <div class="who">
          <strong>${esc(nameOf(e.other))}</strong>
          <span class="status">${esc(s.text)}</span>
        </div>
      </button>`;
  }).join('');
  document.querySelectorAll('#matchList .avatar').forEach((img) => { img.onerror = () => { img.src = PLACEHOLDER; }; });
}

$('matchList').addEventListener('click', (e) => {
  const row = e.target.closest('.match-row');
  if (!row) return;
  const entry = byId.get(row.dataset.id);
  if (entry) openChat(entry);
});

function showList() {
  active = null;
  $('chatView').hidden = true;
  $('listView').hidden = false;
  renderList();
}

// =====================
// CHAT
// =====================
function openChat(entry) {
  active = entry;
  $('listView').hidden = true;
  $('chatView').hidden = false;
  renderChat();
  $('chatInput').focus();
}

function renderChat() {
  const e = active;
  if (!e) return;
  const s = statusOf(e);

  $('chatName').textContent = nameOf(e.other);
  $('chatStatus').textContent = s.text;
  const av = $('chatAvatar');
  av.src = e.other.profile_pic_url || PLACEHOLDER;
  av.onerror = () => { av.src = PLACEHOLDER; };

  const box = $('messages');
  box.innerHTML = e.msgs.length
    ? e.msgs.map((m) => `
        <div class="msg ${m.sender_id === me ? 'mine' : 'theirs'}">
          ${esc(m.body)}<time>${esc(fmtTime(m.created_at))}</time>
        </div>`).join('')
    : `<p class="chat-note">${esc(s.canSend ? 'Say hi and start the conversation!' : s.hint)}</p>`;
  box.scrollTop = box.scrollHeight;

  const input = $('chatInput');
  input.disabled = !s.canSend;
  $('sendBtn').disabled = !s.canSend;
  input.placeholder = s.canSend ? 'Type a message' : s.hint;
}

function addMessage(entry, msg) {
  if (entry.msgs.some((x) => x.id === msg.id)) return;
  entry.msgs.push(msg);
}

$('backBtn').addEventListener('click', showList);

// ⋮ menu: unmatch / report / block
$('menuBtn').addEventListener('click', (e) => { e.stopPropagation(); $('chatMenu').hidden = !$('chatMenu').hidden; });
document.addEventListener('click', () => { $('chatMenu').hidden = true; });
$('chatMenu').addEventListener('click', async (e) => {
  const act = e.target.dataset.act;
  if (!act || !active) return;
  const { match, other } = active;
  const name = nameOf(other);
  let ok = false;
  if (act === 'unmatch') ok = await Safety.unmatch(match.id, name);
  else if (act === 'block') ok = await Safety.block(other.user_id, name);
  else if (act === 'report') {
    const r = await Safety.report(other.user_id, name, match.id);
    ok = r.blocked;
  }
  if (ok) { active = null; showList(); loadAll(); }
});

$('chatForm').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const input = $('chatInput');
  const body = input.value.trim();
  if (!body || !active) return;

  $('sendBtn').disabled = true;
  const entry = active;
  const { data, error } = await supabaseClient
    .from('messages')
    .insert([{ match_id: entry.match.id, sender_id: me, body }])
    .select()
    .single();

  if (error) {
    alert(error.message); // e.g. "This match has expired"
  } else {
    input.value = '';
    addMessage(entry, data);
    await refreshMatch(entry);
  }
  if (active === entry) renderChat();
});

// =====================
// REALTIME + REFRESH
// =====================
supabaseClient
  .channel('messages-feed')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
    const msg = payload.new;
    const entry = byId.get(msg.match_id);
    if (!entry) { await loadAll(); return; }
    addMessage(entry, msg);
    await refreshMatch(entry);
    renderList();
    if (active && active.match.id === entry.match.id) renderChat();
  })
  .subscribe();

// countdowns
setInterval(() => {
  if ($('listView').hidden) { if (active) renderChat(); } else renderList();
}, 30000);
// pick up brand-new matches
setInterval(() => { if (me) loadAll(); }, 30000);

// =====================
// LOGOUT + INIT
// =====================
$('logoutBtn').addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  window.location.href = 'rizzalian.html';
});

(async function init() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = 'rizzalian.html';
    return;
  }
  me = session.user.id;
  loadAll();
})();