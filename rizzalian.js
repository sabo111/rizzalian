// =====================
// SUPABASE CONFIGURATION
// =====================
const SUPABASE_URL = 'https://ahhsnujwllarmhwunvsv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoaHNudWp3bGxhcm1od3VudnN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3OTA3OTIsImV4cCI6MjA3NzM2Njc5Mn0.KbTR4zYe2vn0i-DLbN1kK738gmXtk2qOBAzU0L9ndsk';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =====================
// ELEMENT REFERENCES
// =====================
const loginForm = document.getElementById("loginForm");
const signUpForm = document.getElementById("signUpForm");
const toSignUp = document.getElementById("toSignUp");
const toLogin = document.getElementById("toLogin");

// =====================
// FORM TOGGLE
// =====================
toSignUp.addEventListener("click", (e) => {
  e.preventDefault();
  loginForm.classList.remove("active");
  signUpForm.classList.add("active");
});

toLogin.addEventListener("click", (e) => {
  e.preventDefault();
  signUpForm.classList.remove("active");
  loginForm.classList.add("active");
});

// =====================
// SIGN UP FUNCTIONALITY
// =====================
signUpForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("signUpUsername").value.trim();
  const email = document.getElementById("signUpEmail").value.trim();
  const password = document.getElementById("signUpPassword").value.trim();

  if (!username || !email || !password) {
    alert("Please fill out all fields!");
    return;
  }

  try {
    // Insert into users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([
        { username, email, password } // Note: In production, hash the password!
      ])
      .select()
      .single();

    if (userError) {
      if (userError.code === '23505') { // Unique violation
        alert("Username or email already exists!");
      } else {
        alert("Error creating account: " + userError.message);
      }
      return;
    }

    // Create empty profile for the user
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        { user_id: userData.id }
      ]);

    if (profileError) {
      console.error("Profile creation error:", profileError);
    }

    alert("Account created successfully! You can now log in ❤️");
    signUpForm.reset();
    signUpForm.classList.remove("active");
    loginForm.classList.add("active");

  } catch (err) {
    console.error("Sign up error:", err);
    alert("An unexpected error occurred. Please try again.");
  }
});

// =====================
// LOGIN FUNCTIONALITY
// =====================
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const loginUsername = document.getElementById("loginUsername").value.trim();
  const loginPassword = document.getElementById("loginPassword").value.trim();

  if (!loginUsername || !loginPassword) {
    alert("Please fill out all fields!");
    return;
  }

  try {
    // Query user by username or email
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .or(`username.eq.${loginUsername},email.eq.${loginUsername}`)
      .single();

    if (error || !users) {
      alert("No account found. Please create one first.");
      return;
    }

    // Check password (Note: In production, use proper password hashing!)
    if (loginPassword === users.password) {
      // Store user session in localStorage
      localStorage.setItem('currentUserId', users.id);
      localStorage.setItem('currentUsername', users.username);
      
      alert("Login successful! Welcome back, " + users.username + " 💕");
      window.location.href = "myaccount.html";
    } else {
      alert("Incorrect username or password.");
    }

  } catch (err) {
    console.error("Login error:", err);
    alert("An unexpected error occurred. Please try again.");
  }
});