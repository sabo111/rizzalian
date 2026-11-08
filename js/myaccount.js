// =====================
// SUPABASE CONFIGURATION
// =====================
const SUPABASE_URL = 'https://ahhsnujwllarmhwunvsv.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoaHNudWp3bGxhcm1od3VudnN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3OTA3OTIsImV4cCI6MjA3NzM2Njc5Mn0.KbTR4zYe2vn0i-DLbN1kK738gmXtk2qOBAzU0L9ndsk';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const USERNAME_RE = /^[a-zA-Z0-9_.]{3,20}$/;
const PROMPTS = [
  'A perfect weekend looks like...',
  'My go-to study spot is...',
  "I'm weirdly good at...",
  'The way to win me over is...',
  'Two truths and a lie...',
  'My most unpopular opinion is...',
  'Best food near campus...',
  "I'm currently obsessed with...",
  'My love language is...',
];

function buildPromptFields() {
  const wrap = $('promptFields');
  if (!wrap) return;
  wrap.innerHTML = [0, 1, 2].map((i) => `
    <select class="promptQ">
      <option value="">Prompt ${i + 1} (optional)</option>
      ${PROMPTS.map((q) => `<option value="${esc(q)}">${esc(q)}</option>`).join('')}
    </select>
    <input class="promptA" type="text" maxlength="140" placeholder="Your answer (max 140 characters)">`).join('');
}

function fillPrompts(list) {
  const qs = document.querySelectorAll('.promptQ');
  const as = document.querySelectorAll('.promptA');
  qs.forEach((q, i) => {
    const p = Array.isArray(list) ? list[i] : null;
    q.value = p ? p.q : '';
    as[i].value = p ? p.a : '';
  });
}

function readPrompts() {
  const qs = [...document.querySelectorAll('.promptQ')];
  const as = [...document.querySelectorAll('.promptA')];
  const out = [];
  const used = new Set();
  for (let i = 0; i < qs.length; i++) {
    const q = qs[i].value, a = as[i].value.trim();
    if (!q && !a) continue;
    if (!q || !a) return { error: 'Each prompt needs both a question and an answer.' };
    if (used.has(q)) return { error: 'Pick a different question for each prompt.' };
    used.add(q);
    out.push({ q, a });
  }
  return { prompts: out };
}

function ageFrom(b) {
  if (!b) return null;
  const d = new Date(b), t = new Date();
  let a = t.getFullYear() - d.getFullYear();
  const m = t.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--;
  return a;
}

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

// =====================
// ELEMENT SELECTORS
// =====================
const $ = (id) => document.getElementById(id);
const editProfileBtn = $('editProfileBtn');
const editProfileModal = $('editProfileModal');
const cancelEdit = $('cancelEdit');
const saveProfile = $('saveProfile');
const deleteProfileBtn = $('deleteProfileBtn');
const logoutBtn = $('logoutBtn');
const uploadProfilePic = $('uploadProfilePic');
const profilePic = $('profilePic');
const usernameEl = $('username');
const bioEl = $('bio');

const fields = {
  username: $('editUsername'),
  name: $('editName'),
  bio: $('editBio'),
  birthday: $('editBirthday'),
  graduated_course: $('editGraduatedCourse'),
  graduation_year: $('editGraduationYear'),
  current_profession: $('editCurrentProfession'),
  gender: $('editGender'),
  location: $('editLocation'),
  height: $('editHeight'),
  hobbies: $('editHobbies'),
  looking_for: $('editLookingFor'),
};

// =====================
// SESSION
// =====================
let currentUserId = null;

async function init() {
  buildPromptFields();
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = '../pages/rizzalian.html';
    return;
  }
  currentUserId = session.user.id;
  loadProfile();
}

// =====================
// LOAD PROFILE
// =====================
async function fetchProfile() {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('user_id', currentUserId)
    .maybeSingle();
  if (error) console.error('Profile load error:', error);
  return data;
}

async function loadProfile() {
  const data = await fetchProfile();
  if (!data) return;

  usernameEl.textContent = data.name || (data.username ? '@' + data.username : 'New user');
  bioEl.textContent = data.bio || 'No bio yet';
  if (data.profile_pic_url) profilePic.src = data.profile_pic_url;

  $('extraDetails').innerHTML = `
    ${data.birthday ? '' : '<em>Add your birthday (18+) in Edit Profile so others can see your profile.</em><br><br>'}
    <strong>Username:</strong> ${data.username ? '@' + esc(data.username) : '<em>Not set - click Edit Profile</em>'}<br>
    <strong>Age:</strong> ${esc(ageFrom(data.birthday) ?? 'N/A')}<br>
    <strong>Birthday:</strong> ${esc(data.birthday || 'N/A')}<br>
    <strong>Graduated Course:</strong> ${esc(data.graduated_course || 'N/A')}<br>
    <strong>Graduation Year:</strong> ${esc(data.graduation_year || 'N/A')}<br>
    <strong>Current Profession:</strong> ${esc(data.current_profession || 'N/A')}<br>
    <strong>Gender:</strong> ${esc(data.gender || 'N/A')}<br>
    <strong>Location:</strong> ${esc(data.location || 'N/A')}<br>
    <strong>Height:</strong> ${esc(data.height ? data.height + ' cm' : 'N/A')}<br>
    <strong>Hobbies:</strong> ${esc(data.hobbies || 'N/A')}<br>
    <strong>Looking for:</strong> ${esc(data.looking_for || 'N/A')}
    ${(Array.isArray(data.prompts) ? data.prompts : []).map((p) =>
      `<br><br><strong>${esc(p.q)}</strong><br>${esc(p.a)}`).join('')}
  `;
}

// =====================
// EDIT PROFILE
// =====================
editProfileBtn?.addEventListener('click', async () => {
  editProfileModal.classList.add('active');
  const data = await fetchProfile();
  if (!data) return;
  for (const key of Object.keys(fields)) {
    if (fields[key]) fields[key].value = data[key] ?? '';
  }
  fillPrompts(data.prompts);
  fields.birthday.disabled = !!data.birthday; // set once, can't be changed
});

cancelEdit?.addEventListener('click', () => editProfileModal.classList.remove('active'));

saveProfile?.addEventListener('click', async () => {
  const username = fields.username.value.trim();
  if (username && !USERNAME_RE.test(username)) {
    alert('Username must be 3-20 characters: letters, numbers, _ or . only.');
    return;
  }

  const birthday = fields.birthday.value;
  if (!birthday) {
    alert('Please enter your birthday. Only users 18 or older can use Rizzalian.');
    return;
  }
  if (ageFrom(birthday) < 18) {
    alert('You must be 18 or older.');
    return;
  }

  const { prompts, error: promptError } = readPrompts();
  if (promptError) {
    alert(promptError);
    return;
  }

  const details = {
    name: fields.name.value.trim(),
    bio: fields.bio.value.trim(),
    birthday: fields.birthday.value || null,
    graduated_course: fields.graduated_course.value.trim(),
    graduation_year: parseInt(fields.graduation_year.value) || null,
    current_profession: fields.current_profession.value.trim(),
    gender: fields.gender.value,
    location: fields.location.value.trim(),
    height: parseFloat(fields.height.value) || null, // cm
    hobbies: fields.hobbies.value.trim(),
    looking_for: fields.looking_for.value.trim(),
  };

  const { error } = await supabaseClient
    .from('profiles')
    .update({ ...details, username: username || null, prompts })
    .eq('user_id', currentUserId);

  if (error) {
    if (error.code === '23505') alert('That username is already taken.');
    else if (error.code === '23514') alert('Invalid username format.');
    else alert('Error updating profile: ' + error.message);
    return;
  }

  // history log (profile_updates has no username column)
  await supabaseClient.from('profile_updates').insert([{ user_id: currentUserId, ...details }]);

  editProfileModal.classList.remove('active');
  alert('Profile updated!');
  loadProfile();
});

// =====================
// PROFILE PIC UPLOAD
// =====================
// Shrink photos before upload (keeps the free 1 GB storage lasting): max 800px, JPEG
function compressImage(file, maxSize = 800, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not process image'))), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Not a valid image')); };
    img.src = url;
  });
}

uploadProfilePic?.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert('Please choose an image file.');
    return;
  }
  if (file.size > 15 * 1024 * 1024) {
    alert('Image must be under 15 MB.');
    return;
  }

  let blob;
  try {
    blob = await compressImage(file);
  } catch (err) {
    alert(err.message);
    return;
  }

  const oldUrl = (await fetchProfile())?.profile_pic_url || '';
  const filePath = `${currentUserId}/${Date.now()}.jpg`; // folder = user id (storage policy)

  const { error: uploadError } = await supabaseClient.storage
    .from('profile-pics')
    .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });
  if (uploadError) {
    alert('Upload failed: ' + uploadError.message);
    return;
  }

  const { data: urlData } = supabaseClient.storage.from('profile-pics').getPublicUrl(filePath);
  const { error } = await supabaseClient
    .from('profiles')
    .update({ profile_pic_url: urlData.publicUrl })
    .eq('user_id', currentUserId);
  if (error) {
    alert('Could not save picture: ' + error.message);
    return;
  }

  // delete the previous photo so storage doesn't fill up
  const oldPath = oldUrl.split('/profile-pics/')[1];
  if (oldPath && oldPath !== filePath) {
    await supabaseClient.storage.from('profile-pics').remove([decodeURIComponent(oldPath)]);
  }

  profilePic.src = urlData.publicUrl;
  alert('Profile picture updated!');
});

// =====================
// DELETE ACCOUNT
// =====================
deleteProfileBtn?.addEventListener('click', async () => {
  const displayName = usernameEl?.textContent || 'this profile';
  if (!confirm(`Are you sure you want to DELETE ${displayName}?\nThis removes your profile, likes, matches and account.\n\nThis action CANNOT be undone!`)) return;

  const { error } = await supabaseClient.rpc('delete_my_account');
  if (error) {
    alert('Could not delete account: ' + error.message);
    return;
  }
  await supabaseClient.auth.signOut();
  alert('Account deleted.');
  window.location.href = '../pages/rizzalian.html';
});

// =====================
// LOGOUT
// =====================
logoutBtn?.addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  window.location.href = '../pages/rizzalian.html';
});

init();
