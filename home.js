// =====================
// SUPABASE CONFIGURATION
// =====================
const SUPABASE_URL = 'https://ahhsnujwllarmhwunvsv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoaHNudWp3bGxhcm1od3VudnN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3OTA3OTIsImV4cCI6MjA3NzM2Njc5Mn0.KbTR4zYe2vn0i-DLbN1kK738gmXtk2qOBAzU0L9ndsk';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =====================
// DOM ELEMENTS
// =====================
const feed = document.getElementById("feed");
const userPanel = document.getElementById("userPanel");
const closePanel = document.getElementById("closePanel");
const panelName = document.getElementById("panelName");
const panelMainImg = document.getElementById("panelMainImg");
const userDetails = document.getElementById("userDetails");
const lookingFor = document.getElementById("lookingFor");
const likeBtn = document.getElementById("likeBtn");
const dislikeBtn = document.getElementById("dislikeBtn");
const matchBtn = document.getElementById("matchBtn");
const leftArrow = document.getElementById("leftArrow");
const rightArrow = document.getElementById("rightArrow");
const searchInput = document.getElementById("searchInput");
const clearSearch = document.getElementById("clearSearch");

// Filter Elements
const openFilterBtn = document.getElementById("openFilterBtn");
const filterDropdown = document.getElementById("filterDropdown");
const filterForm = document.getElementById("filterForm");
const clearFilter = document.getElementById("clearFilter");

// =====================
// STATE
// =====================
let users = [];
let filteredUsers = [];
let currentIndex = 0;
let currentUser = null;

// =====================
// GET CURRENT USER
// =====================
const currentUserId = localStorage.getItem('currentUserId');
if (!currentUserId) {
  alert("Please log in first!");
  window.location.href = "rizzalian.html";
}

// =====================
// LOAD PROFILES
// =====================
async function loadProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select(`*, users!inner(id, username)`)
    .neq('user_id', currentUserId);

  console.log("Profiles loaded:", data); // ✅ Debugging line

  if (error) {
    console.error("Error loading profiles:", error);
    feed.innerHTML = "<p style='color:white;text-align:center;'>Error loading profiles.</p>";
    return;
  }

  users = data || [];
  filteredUsers = users;
  renderProfiles();
}

// =====================
// RENDER PROFILES
// =====================
function renderProfiles() {
  feed.innerHTML = "";
  if (!filteredUsers.length) {
    feed.innerHTML = "<p style='color:white;text-align:center;'>No profiles found.</p>";
    return;
  }

  filteredUsers.forEach(user => {
    const card = document.createElement("div");
    card.className = "profile-card";
    card.dataset.id = user.user_id || "";
    card.dataset.name = user.name || "";
    card.dataset.program = user.graduated_course || "";
    card.dataset.tags = user.hobbies || "";

    const img = user.profile_pic_url || "https://via.placeholder.com/300x300?text=No+Photo";
    const name = user.name || user.users?.username || "Unknown";
    const age = user.age || "?";
    const bio = user.bio || "No bio available";

    card.innerHTML = `
      <img src="${img}" class="profile-pic" alt="${name}">
      <h2 class="name">${name}, ${age}</h2>
      <p class="bio">${bio}</p>
    `;

    card.addEventListener("click", () => openPanel(user));
    feed.appendChild(card);
  });
  updateCarousel();
}

// =====================
// SEARCH FUNCTION
// =====================
searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) {
    filteredUsers = users;
  } else {
    filteredUsers = users.filter(u => {
      const name = (u.name || "").toLowerCase();
      const username = (u.users?.username || "").toLowerCase();
      const hobbies = (u.hobbies || "").toLowerCase();
      const bio = (u.bio || "").toLowerCase();
      const location = (u.location || "").toLowerCase();
      return name.includes(q) || username.includes(q) || hobbies.includes(q) || bio.includes(q) || location.includes(q);
    });
  }
  renderProfiles();
});

clearSearch.addEventListener("click", () => {
  searchInput.value = "";
  filteredUsers = users;
  renderProfiles();
});

// =====================
// FILTER FUNCTIONS
// =====================
openFilterBtn.addEventListener("click", e => {
  e.stopPropagation();
  filterDropdown.hidden = !filterDropdown.hidden;
  openFilterBtn.setAttribute("aria-expanded", String(!filterDropdown.hidden));
});

document.addEventListener("click", e => {
  if (!filterDropdown.hidden && !filterDropdown.contains(e.target) && e.target !== openFilterBtn) {
    filterDropdown.hidden = true;
    openFilterBtn.setAttribute("aria-expanded", "false");
  }
});

clearFilter.addEventListener("click", () => {
  filterForm.reset();
  filteredUsers = [...users];
  renderProfiles();
  filterDropdown.hidden = true;
  openFilterBtn.setAttribute("aria-expanded", "false");
});

filterForm.addEventListener("submit", e => {
  e.preventDefault();
  applyFilter();
});

// ✅ FIXED APPLY FILTER FUNCTION (matches your real fields)
function applyFilter() {
  const id = document.getElementById("filterId").value.trim().toLowerCase();
  const name = document.getElementById("filterLastName").value.trim().toLowerCase(); // uses input for 'Last name'
  const program = document.getElementById("filterProgram").value.trim().toLowerCase();
  const metaRaw = document.getElementById("filterMeta").value.trim().toLowerCase();
  const metaTags = metaRaw ? metaRaw.split(",").map(t => t.trim()).filter(Boolean) : [];

  if (!id && !name && !program && metaTags.length === 0) {
    filteredUsers = [...users];
    renderProfiles();
    filterDropdown.hidden = true;
    openFilterBtn.setAttribute("aria-expanded", "false");
    return;
  }

  filteredUsers = users.filter(u => {
    const uid = (u.user_id || "").toString().toLowerCase();
    const uname = (u.name || "").toLowerCase();
    const prog = (u.graduated_course || "").toLowerCase();
    const hobbies = (u.hobbies || "").toLowerCase();

    let match = true;

    if (id && !uid.includes(id)) match = false;
    if (name && !uname.includes(name)) match = false;
    if (program && !prog.includes(program)) match = false;

    if (metaTags.length) {
      const userTags = hobbies.split(",").map(tag => tag.trim()).filter(Boolean);
      const hasAllTags = metaTags.every(tag => userTags.includes(tag));
      if (!hasAllTags) match = false;
    }

    return match;
  });

  renderProfiles();
  filterDropdown.hidden = true;
  openFilterBtn.setAttribute("aria-expanded", "false");
}

// =====================
// PANEL HANDLERS
// =====================
function openPanel(user) {
  currentUser = user;
  userPanel.classList.add("active");

  const name = user.name || user.users?.username || "Unknown";
  const age = user.age || "?";
  const img = user.profile_pic_url || "https://via.placeholder.com/300x300?text=No+Photo";

  panelName.textContent = `${name}, ${age}`;
  panelMainImg.src = img;
  matchBtn.style.display = "none";
  likeBtn.style.display = "block";
  dislikeBtn.style.display = "block";

  userDetails.innerHTML = `
    <div><b>Birthday:</b> ${user.birthday || "N/A"}</div>
    <div><b>Graduated Course:</b> ${user.graduated_course || "N/A"}</div>
    <div><b>Graduation Year:</b> ${user.graduation_year || "N/A"}</div>
    <div><b>Profession:</b> ${user.current_profession || "N/A"}</div>
    <div><b>Gender:</b> ${user.gender || "N/A"}</div>
    <div><b>Location:</b> ${user.location || "N/A"}</div>
    <div><b>Height:</b> ${user.height || "N/A"}</div>
    <div><b>Hobbies:</b> ${user.hobbies || "N/A"}</div>
  `;
  lookingFor.textContent = user.looking_for || "Not specified";
}

closePanel.addEventListener("click", () => {
  userPanel.classList.remove("active");
});

// =====================
// SIMPLE CAROUSEL
// =====================
function updateCarousel() {
  const cardWidth = 260;
  const gap = 30;
  const scrollAmount = (cardWidth + gap) * currentIndex;
  feed.style.transform = `translateX(-${scrollAmount}px)`;
  leftArrow.disabled = currentIndex === 0;
  rightArrow.disabled = currentIndex >= filteredUsers.length - 1;
}

leftArrow.addEventListener("click", () => {
  if (currentIndex > 0) currentIndex--;
  updateCarousel();
});

rightArrow.addEventListener("click", () => {
  if (currentIndex < filteredUsers.length - 1) currentIndex++;
  updateCarousel();
});

// =====================
// INITIALIZE
// =====================
loadProfiles();
