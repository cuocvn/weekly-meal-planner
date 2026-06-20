// ============================================================
// auth.js — Firebase Authentication Module
// Handles Google & Facebook Sign-In / Sign-Out
// ============================================================

import { auth } from "../../config.js";
import {
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ---- DOM References ----
const btnGoogleLogin  = document.getElementById("btnGoogleLogin");
const btnFacebookLogin= document.getElementById("btnFacebookLogin");
const btnLogout       = document.getElementById("btnLogout");
const authButtons     = document.getElementById("authButtons");
const authUserInfo    = document.getElementById("authUserInfo");
const userGreeting    = document.getElementById("userGreeting");
const userAvatar      = document.getElementById("userAvatar");

// ---- Providers ----
const googleProvider   = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

// Configure Google to always show account picker
googleProvider.setCustomParameters({ prompt: "select_account" });

// ---- Auth State Observer ----
// Fires on page load and whenever the user logs in or out
onAuthStateChanged(auth, (user) => {
  if (user) {
    _showAuthenticatedState(user);
  } else {
    _showGuestState();
  }
});

// ---- Google Sign-In ----
btnGoogleLogin.addEventListener("click", async () => {
  try {
    btnGoogleLogin.disabled = true;
    btnGoogleLogin.textContent = "Signing in…";
    await signInWithPopup(auth, googleProvider);
    // onAuthStateChanged handles UI update
  } catch (err) {
    _handleAuthError(err, "Google");
  } finally {
    btnGoogleLogin.disabled = false;
    btnGoogleLogin.innerHTML = `
      <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        <path fill="none" d="M0 0h48v48H0z"/>
      </svg>
      Sign in with Google`;
  }
});

// ---- Facebook Sign-In ----
btnFacebookLogin.addEventListener("click", async () => {
  try {
    btnFacebookLogin.disabled = true;
    btnFacebookLogin.textContent = "Signing in…";
    await signInWithPopup(auth, facebookProvider);
    // onAuthStateChanged handles UI update
  } catch (err) {
    _handleAuthError(err, "Facebook");
  } finally {
    btnFacebookLogin.disabled = false;
    btnFacebookLogin.innerHTML = `
      <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#fff" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
      Sign in with Facebook`;
  }
});

// ---- Logout ----
btnLogout.addEventListener("click", async () => {
  try {
    await signOut(auth);
    _showToast("👋 You've been signed out.", "info");
  } catch (err) {
    console.error("Logout error:", err);
    _showToast("⚠️ Logout failed. Please try again.", "error");
  }
});

// ---- Private Helpers ----
function _showAuthenticatedState(user) {
  authButtons.classList.add("hidden");
  authUserInfo.classList.remove("hidden");

  const name = user.displayName || user.email || "User";
  const firstName = name.split(" ")[0];
  userGreeting.textContent = `Hi, ${firstName}!`;

  if (user.photoURL) {
    userAvatar.src = user.photoURL;
    userAvatar.style.display = "block";
  } else {
    // Use initials avatar fallback
    userAvatar.style.display = "none";
  }
  _showToast(`✅ Welcome back, ${firstName}!`, "success");
}

function _showGuestState() {
  authUserInfo.classList.add("hidden");
  authButtons.classList.remove("hidden");
  userAvatar.src = "";
  userGreeting.textContent = "";
}

function _handleAuthError(err, provider) {
  console.error(`${provider} auth error:`, err);
  const userFacingErrors = {
    "auth/popup-closed-by-user":  "Sign-in cancelled. Please try again.",
    "auth/popup-blocked":         "Popup was blocked. Please allow popups for this site.",
    "auth/account-exists-with-different-credential":
                                  "An account already exists with this email. Try a different sign-in method.",
    "auth/network-request-failed":"Network error. Please check your connection.",
  };
  const message = userFacingErrors[err.code] || `Sign-in failed: ${err.message}`;
  _showToast(`❌ ${message}`, "error");
}

// ---- Toast helper (mirrors app.js but auth.js may load independently) ----
function _showToast(message, type = "info") {
  // Defer to app.js showToast if it exists, else use a lightweight fallback
  if (typeof window.showToast === "function") {
    window.showToast(message, type);
  } else {
    console.info(`[Auth Toast] ${message}`);
  }
}

// ---- Exports ----
export { auth };
