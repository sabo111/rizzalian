// =====================
// SUPABASE CONFIGURATION
// =====================
const SUPABASE_URL = 'https://ahhsnujwllarmhwunvsv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoaHNudWp3bGxhcm1od3VudnN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3OTA3OTIsImV4cCI6MjA3NzM2Njc5Mn0.KbTR4zYe2vn0i-DLbN1kK738gmXtk2qOBAzU0L9ndsk';

// Initialize Supabase client properly
let supabase;
try {
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabaseClient = supabase;
    console.log('✅ Supabase client initialized successfully');
  } else {
    console.error('❌ Supabase library not loaded. Make sure to include Supabase JS SDK.');
  }
} catch (err) {
  console.error('❌ Error initializing Supabase:', err);
}

// =====================
// WAREHOUSE HELPER FUNCTIONS
// =====================
async function updateWarehouseTables() {
  if (!supabase) return;
  
  const today = new Date();
  const dateKey = parseInt(today.toISOString().slice(0, 10).replace(/-/g, ''));
  const fullDate = today.toISOString().slice(0, 10);
  
  try {
    const { error: dateError } = await supabase
      .from('dim_date')
      .upsert({
        date_key: dateKey,
        full_date: fullDate,
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        day_of_month: today.getDate(),
        day_name: today.toLocaleDateString('en-US', { weekday: 'long' }),
        is_weekend: today.getDay() === 0 || today.getDay() === 6
      }, { onConflict: 'date_key' });
    
    if (dateError) console.error("Date dimension error:", dateError);
  } catch (err) {
    console.error("Warehouse update error:", err);
  }
}

// =====================
// ELEMENT REFERENCES
// =====================
const editProfileBtn = document.getElementById("editProfileBtn");
const editProfileModal = document.getElementById("editProfileModal");
const cancelEdit = document.getElementById("cancelEdit");
const saveProfile = document.getElementById("saveProfile");

const username = document.getElementById("username");
const bio = document.getElementById("bio");

const editName = document.getElementById("editName");
const editAge = document.getElementById("editAge");
const editBio = document.getElementById("editBio");
const editBirthday = document.getElementById("editBirthday");
const editGraduatedCourse = document.getElementById("editGraduatedCourse");
const editGraduationYear = document.getElementById("editGraduationYear");
const editCurrentProfession = document.getElementById("editCurrentProfession");
const editGender = document.getElementById("editGender");
const editLocation = document.getElementById("editLocation");
const editHeight = document.getElementById("editHeight");
const editHobbies = document.getElementById("editHobbies");
const editLookingFor = document.getElementById("editLookingFor");

const uploadProfilePic = document.getElementById("uploadProfilePic");
const profilePic = document.getElementById("profilePic");

const homeBtn = document.getElementById("homeBtn");
const logoutBtn = document.getElementById("logoutBtn");
const deleteProfileBtn = document.getElementById("deleteProfileBtn");

// =====================
// GET CURRENT USER
// =====================
const currentUserId = localStorage.getItem('currentUserId');
const currentUsername = localStorage.getItem('currentUsername');

if (!currentUserId) {
  alert("Please log in first!");
  window.location.href = "rizzalian.html";
}

// Make userId globally accessible
window.currentUserId = currentUserId;

// =====================
// LOAD USER PROFILE
// =====================
async function loadProfile() {
  if (!supabase) {
    console.error('Cannot load profile: Supabase not initialized');
    return;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', currentUserId)
      .single();

    if (error) {
      console.error("Error loading profile:", error);
      return;
    }

    if (data) {
      username.textContent = data.name || currentUsername;
      bio.textContent = data.bio || "No bio yet";

      if (data.profile_pic_url) {
        profilePic.src = data.profile_pic_url;
      }

      const extra = `
        <strong>Age:</strong> ${data.age || "N/A"}<br>
        <strong>Birthday:</strong> ${data.birthday || "N/A"}<br>
        <strong>Graduated Course:</strong> ${data.graduated_course || "N/A"}<br>
        <strong>Graduation Year:</strong> ${data.graduation_year || "N/A"}<br>
        <strong>Current Profession:</strong> ${data.current_profession || "N/A"}<br>
        <strong>Gender:</strong> ${data.gender || "N/A"}<br>
        <strong>Location:</strong> ${data.location || "N/A"}<br>
        <strong>Height:</strong> ${data.height || "N/A"}<br>
        <strong>Hobbies:</strong> ${data.hobbies || "N/A"}<br>
        <strong>Looking for:</strong> ${data.looking_for || "N/A"}
      `;

      document.getElementById("extraDetails").innerHTML = extra;
    }
  } catch (err) {
    console.error("Load profile error:", err);
  }
}

// Load profile on page load
loadProfile();

// =====================
// EDIT PROFILE HANDLING
// =====================
if (editProfileBtn) {
  editProfileBtn.addEventListener("click", async () => {
    if (!supabase) {
      alert('Error: Database connection not available');
      return;
    }

    editProfileModal.classList.add("active");

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', currentUserId)
        .single();

      if (data) {
        editName.value = data.name || "";
        editAge.value = data.age || "";
        editBio.value = data.bio || "";
        editBirthday.value = data.birthday || "";
        editGraduatedCourse.value = data.graduated_course || "";
        editGraduationYear.value = data.graduation_year || "";
        editCurrentProfession.value = data.current_profession || "";
        editGender.value = data.gender || "";
        editLocation.value = data.location || "";
        editHeight.value = data.height || "";
        editHobbies.value = data.hobbies || "";
        editLookingFor.value = data.looking_for || "";
      }
    } catch (err) {
      console.error("Error loading edit form:", err);
    }
  });
}

if (cancelEdit) {
  cancelEdit.addEventListener("click", () => {
    editProfileModal.classList.remove("active");
  });
}

if (saveProfile) {
  saveProfile.addEventListener("click", async () => {
    if (!supabase) {
      alert('Error: Database connection not available');
      return;
    }

    try {
      const profileData = {
        name: editName.value,
        age: parseInt(editAge.value) || null,
        bio: editBio.value,
        birthday: editBirthday.value || null,
        graduated_course: editGraduatedCourse.value,
        graduation_year: parseInt(editGraduationYear.value) || null,
        current_profession: editCurrentProfession.value,
        gender: editGender.value,
        location: editLocation.value,
        height: parseFloat(editHeight.value) || null,
        hobbies: editHobbies.value,
        looking_for: editLookingFor.value,
      };

      // 1️⃣ Update the profiles table
      const { data, error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('user_id', currentUserId);

      if (error) {
        alert("Error updating profile: " + error.message);
        console.error("Update error:", error);
        return;
      }

      // 2️⃣ Log the update in profile_updates
      const { error: logError } = await supabase
        .from('profile_updates')
        .insert([
          {
            user_id: currentUserId,
            ...profileData,  // Spread the updated fields
          }
        ]);

      if (logError) {
        console.error("Logging update error:", logError);
      } else {
        console.log("✅ Profile update logged successfully");
      }

      // 3️⃣ Continue existing flow
      await updateWarehouseTables();
      editProfileModal.classList.remove("active");
      alert("✅ Profile updated successfully!");
      loadProfile();

    } catch (err) {
      console.error("Save profile error:", err);
      alert("An unexpected error occurred.");
    }
  });
}


// =====================
// PROFILE PIC UPLOAD
// =====================
if (uploadProfilePic) {
  uploadProfilePic.addEventListener("change", async (event) => {
    if (!supabase) {
      alert('Error: Database connection not available');
      return;
    }

    const file = event.target.files[0];
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUserId}-${Date.now()}.${fileExt}`;
      const filePath = `${currentUserId}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-pics')
        .upload(filePath, file, {
          upsert: true
        });

      if (uploadError) {
        alert("Error uploading image: " + uploadError.message);
        console.error("Upload error:", uploadError);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('profile-pics')
        .getPublicUrl(filePath);

      const publicURL = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_pic_url: publicURL })
        .eq('user_id', currentUserId);

      if (updateError) {
        alert("Error updating profile picture: " + updateError.message);
        console.error("Update error:", updateError);
        return;
      }

      profilePic.src = publicURL;
      await updateWarehouseTables();
      alert("✅ Profile picture updated!");

    } catch (err) {
      console.error("Profile pic upload error:", err);
      alert("An unexpected error occurred.");
    }
  });
}

// =====================
// NAVIGATION BUTTONS
// =====================
if (homeBtn) {
  homeBtn.addEventListener("click", () => {
    window.location.href = "home.html";
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to log out?")) {
      localStorage.removeItem('currentUserId');
      localStorage.removeItem('currentUsername');
      window.location.href = "rizzalian.html";
    }
  });
}

// =====================
// DELETE PROFILE FUNCTIONALITY (FIXED)
// =====================
if (deleteProfileBtn) {
  deleteProfileBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    
    console.log('[delete] Delete button clicked');
    
    const displayName = username?.textContent || 'this profile';
    
    if (!confirm(`⚠️ WARNING: Are you sure you want to permanently delete ${displayName}?\n\nThis will:\n- Delete your profile\n- Delete your account\n- Log you out immediately\n\nThis action CANNOT be undone!`)) {
      console.log('[delete] User cancelled deletion');
      return;
    }

    if (!supabase) {
      console.error('[delete] Supabase client not available');
      alert('❌ Error: Database connection not available. Cannot delete profile.');
      return;
    }

    const userId = localStorage.getItem('currentUserId');
    
    if (!userId) {
      console.error('[delete] No user ID found in localStorage');
      alert('❌ Error: Could not identify user. Please log in again.');
      window.location.href = "rizzalian.html";
      return;
    }

    console.log('[delete] Attempting to delete both profile and user for user ID:', userId);

    try {
      // Delete profile first
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (profileError) {
        console.error('[delete] Profile deletion failed:', profileError);
        alert(`❌ Failed to delete profile: ${profileError.message}`);
        return;
      }

      // Then delete user account
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (userError) {
        console.error('[delete] User deletion failed:', userError);
        alert(`❌ Failed to delete account: ${userError.message}`);
        return;
      }

      // Success
      console.log('[delete] Profile and user deleted successfully');
      localStorage.removeItem('currentUserId');
      localStorage.removeItem('currentUsername');
      
      alert('✅ Account deleted successfully. You will now be logged out.');
      window.location.href = "rizzalian.html";

    } catch (err) {
      console.error('[delete] Unexpected error during deletion:', err);
      alert(`❌ An unexpected error occurred: ${err.message}\n\nPlease try again or contact support.`);
    }
  });
  
  console.log('[delete] Delete profile handler attached successfully');
} else {
  console.warn('[delete] deleteProfileBtn element not found in DOM');
}

// =====================
// DEBUG INFO
// =====================
console.log('=== MyAccount.js Debug Info ===');
console.log('Supabase initialized:', !!supabase);
console.log('Current User ID:', currentUserId);
console.log('Current Username:', currentUsername);
console.log('Delete button exists:', !!deleteProfileBtn);
console.log('==============================');
