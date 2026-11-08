// =====================
// SUPABASE CONFIGURATION
// =====================
const SUPABASE_URL = 'https://ahhsnujwllarmhwunvsv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoaHNudWp3bGxhcm1od3VudnN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3OTA3OTIsImV4cCI6MjA3NzM2Njc5Mn0.KbTR4zYe2vn0i-DLbN1kK738gmXtk2qOBAzU0L9ndsk';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Optional email-domain allowlist. Empty = any email can sign up.
const ALLOWED_EMAIL_DOMAINS = [];

// Cloudflare Turnstile CAPTCHA (free). Paste your PUBLIC site key; leave '' to disable.
const TURNSTILE_SITE_KEY = '';
const CAPTCHA_ENABLED = TURNSTILE_SITE_KEY !== '';
const captcha = { login: { id: null, token: null }, signup: { id: null, token: null } };

const USERNAME_RE = /^[a-zA-Z0-9_.]{3,20}$/;

function renderCaptcha(which, selector) {
  if (!CAPTCHA_ENABLED || captcha[which].id !== null || !window.turnstile) return;
  captcha[which].id = window.turnstile.render(selector, {
    sitekey: TURNSTILE_SITE_KEY,
    callback: (t) => { captcha[which].token = t; },
    'expired-callback': () => { captcha[which].token = null; },
    'error-callback': () => { captcha[which].token = null; },
  });
}
function resetCaptcha(which) {
  captcha[which].token = null;
  if (CAPTCHA_ENABLED && captcha[which].id !== null && window.turnstile) window.turnstile.reset(captcha[which].id);
}
window.onloadTurnstile = () => renderCaptcha('login', '#loginCaptcha');

// =====================
// ELEMENT REFERENCES
// =====================
const loginForm = document.getElementById("loginForm");
const signUpForm = document.getElementById("signUpForm");
const toSignUp = document.getElementById("toSignUp");
const toLogin = document.getElementById("toLogin");
const termsPage = document.getElementById("termsPage");
const acceptTerms = document.getElementById("acceptTerms");
const continueToSignUp = document.getElementById("continueToSignUp");
const termsToLogin = document.getElementById("termsToLogin");

// Already signed in? Skip the login screen.
supabaseClient.auth.getSession().then(({ data }) => {
  if (data.session) window.location.href = "myaccount.html";
});

// Latest birthday (ISO yyyy-mm-dd) that is still 18 or older today
function adultCutoff() {
  const t = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${t.getFullYear() - 18}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
}
const signUpBirthday = document.getElementById("signUpBirthday");
signUpBirthday.max = adultCutoff();

// =====================
// FORM TOGGLE
// =====================
toSignUp.addEventListener("click", (e) => {
  e.preventDefault();
  loginForm.classList.remove("active");
  signUpForm.classList.remove("active");
  termsPage.classList.add("active");
});

toLogin.addEventListener("click", (e) => {
  e.preventDefault();
  signUpForm.classList.remove("active");
  loginForm.classList.add("active");
  termsPage.classList.remove("active");
});

acceptTerms.addEventListener("change", () => {
  continueToSignUp.disabled = !acceptTerms.checked;
});

continueToSignUp.addEventListener("click", () => {
  if (!acceptTerms.checked) return;
  termsPage.classList.remove("active");
  signUpForm.classList.add("active");
  renderCaptcha('signup', '#signupCaptcha');
});

termsToLogin.addEventListener("click", (e) => {
  e.preventDefault();
  termsPage.classList.remove("active");
  loginForm.classList.add("active");
});

// =====================
// SIGN UP
// =====================
signUpForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("signUpEmail").value.trim().toLowerCase();
  const username = document.getElementById("signUpUsername").value.trim();
  const name = document.getElementById("signUpName").value.trim();
  const gender = document.getElementById("signUpGender").value;
  const password = document.getElementById("signUpPassword").value;
  const birthday = signUpBirthday.value;

  if (!email || !username || !name || !gender || !birthday || !password) {
    alert("Please fill out all fields!");
    return;
  }
  if (!USERNAME_RE.test(username)) {
    alert("Username must be 3-20 characters: letters, numbers, _ or . only.");
    return;
  }
  if (birthday > adultCutoff() || birthday < "1900-01-01") {
    alert("You must be 18 or older to create an account.");
    return;
  }
  if (CAPTCHA_ENABLED && !captcha.signup.token) {
    alert("Please complete the captcha.");
    return;
  }
  if (password.length < 8) {
    alert("Password must be at least 8 characters.");
    return;
  }
  if (
    ALLOWED_EMAIL_DOMAINS.length &&
    !ALLOWED_EMAIL_DOMAINS.some((d) => email.endsWith("@" + d))
  ) {
    alert("Please sign up with your school email (" + ALLOWED_EMAIL_DOMAINS.map((d) => "@" + d).join(", ") + ").");
    return;
  }

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: { birthday }, // checked again by the database
        captchaToken: captcha.signup.token || undefined,
      },
    });

    if (error) {
      if (/already registered|already been registered/i.test(error.message)) {
        alert("That email is already registered. Try logging in.");
      } else if (/database error/i.test(error.message)) {
        alert("Could not create account. You must be 18 or older.");
      } else {
        alert("Error creating account: " + error.message);
      }
      return;
    }

    // Email confirmation is off, so a session is returned and the user is already signed in.
    // Save the required profile details right away so the profile shows up on the swipe deck.
    if (data.session) {
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({ username, name, gender, birthday })
        .eq('user_id', data.user.id);

      if (profileError) {
        console.error('Profile save error:', profileError);
        if (profileError.code === '23505') {
          alert("Account created, but that username is already taken. Please choose another one in Edit Profile.");
        } else {
          alert("Account created, but your profile details could not be saved. Please complete them in Edit Profile.");
        }
      }
      window.location.href = "myaccount.html";
      return;
    }

    // Fallback (e.g. if confirmation is turned back on later)
    alert("Account created! Check your email and click the confirmation link, then log in and complete your profile in Edit Profile.");
    signUpForm.reset();
    signUpForm.classList.remove("active");
    loginForm.classList.add("active");
  } catch (err) {
    console.error("Sign up error:", err);
    alert("An unexpected error occurred. Please try again.");
  } finally {
    resetCaptcha('signup');
  }
});

// =====================
// LOGIN (email + password)
// =====================
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("loginUsername").value.trim().toLowerCase();
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) {
    alert("Please fill out all fields!");
    return;
  }
  if (CAPTCHA_ENABLED && !captcha.login.token) {
    alert("Please complete the captcha.");
    return;
  }

  try {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken: captcha.login.token || undefined },
    });

    if (error) {
      if (/confirm/i.test(error.message)) {
        alert("Please confirm your email first. Check your inbox.");
      } else {
        alert("Incorrect email or password.");
      }
      return;
    }

    window.location.href = "myaccount.html";
  } catch (err) {
    console.error("Login error:", err);
    alert("An unexpected error occurred. Please try again.");
  } finally {
    resetCaptcha('login');
  }
});