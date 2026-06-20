// ============================================================
// auth.js — Firebase Authentication Module (v2)
// Handles Google & Facebook Sign-In / Sign-Out
// Language-aware error messages via lang.js
// ============================================================

import { auth } from "../../config.js";
import { t } from "./lang.js";
import {
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ---- DOM References ----
const btnGoogleLogin   = document.getElementById("btnGoogleLogin");
const btnFacebookLogin = document.getElementById("btnFacebookLogin");
const btnLogout        = document.getElementById("btnLogout");
const authButtons      = document.getElementById("authButtons");
const authUserInfo     = document.getElementById("authUserInfo");
const userGreeting     = document.getElementById("userGreeting");
const userAvatar       = document.getElementById("userAvatar");

// ---- Providers ----
const googleProvider   = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// ============================================================
// AUTH STATE OBSERVER
// Fires on page load + every login/logout
// ============================================================
onAuthStateChanged(auth, (user) => {
  if (user) {
    _showAuthenticatedState(user);
  } else {
    _showGuestState();
  }
});

// ============================================================
// Re-render auth button labels when language changes
// ============================================================
document.addEventListener("langchange", () => {
  // The data-i18n spans inside buttons are updated by lang.js setLang()
  // Here we just ensure dynamic state messages stay correct
  const greeting = userGreeting.dataset.name;
  if (greeting) {
    userGreeting.textContent = `${t("welcomeBack")}, ${greeting}!`;
  }
});

// ============================================================
// GOOGLE SIGN-IN
// ============================================================
btnGoogleLogin.addEventListener("click", async () => {
  _setButtonLoading(btnGoogleLogin, true);
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (err) {
    _handleAuthError(err, "Google");
  } finally {
    _setButtonLoading(btnGoogleLogin, false);
  }
});

// ============================================================
// FACEBOOK SIGN-IN
// ============================================================
btnFacebookLogin.addEventListener("click", async () => {
  _setButtonLoading(btnFacebookLogin, true);
  try {
    await signInWithPopup(auth, facebookProvider);
  } catch (err) {
    _handleAuthError(err, "Facebook");
  } finally {
    _setButtonLoading(btnFacebookLogin, false);
  }
});

// ============================================================
// LOGOUT
// ============================================================
btnLogout.addEventListener("click", async () => {
  try {
    await signOut(auth);
    _toast(t("signedOut"), "info");
  } catch (err) {
    console.error("Logout error:", err);
    _toast(t("authErrGeneric"), "error");
  }
});

// ============================================================
// PRIVATE HELPERS
// ============================================================
function _showAuthenticatedState(user) {
  authButtons.classList.add("hidden");
  authUserInfo.classList.remove("hidden");

  const name      = user.displayName || user.email || "User";
  const firstName = name.split(" ")[0];

  userGreeting.textContent     = `${t("welcomeBack")}, ${firstName}!`;
  userGreeting.dataset.name    = firstName; // store for lang-change re-render

  if (user.photoURL) {
    userAvatar.src           = user.photoURL;
    userAvatar.style.display = "block";
    userAvatar.alt           = `${firstName} avatar`;
  } else {
    userAvatar.style.display = "none";
  }

  _toast(`✅ ${t("welcomeBack")}, ${firstName}!`, "success");
}

function _showGuestState() {
  authUserInfo.classList.add("hidden");
  authButtons.classList.remove("hidden");
  userAvatar.src           = "";
  userGreeting.textContent = "";
  delete userGreeting.dataset.name;
}

function _handleAuthError(err, provider) {
  console.error(`${provider} auth error [${err.code}]:`, err);
  const errorMap = {
    "auth/popup-closed-by-user":                    t("authErrPopupClosed"),
    "auth/popup-blocked":                           t("authErrPopupBlocked"),
    "auth/account-exists-with-different-credential":t("authErrAccountExists"),
    "auth/network-request-failed":                  t("authErrNetwork"),
  };
  const message = errorMap[err.code] || t("authErrGeneric");
  _toast(`❌ ${message}`, "error");
}

function _setButtonLoading(btn, isLoading) {
  btn.disabled = isLoading;
  const span = btn.querySelector("[data-i18n]");
  if (span) span.textContent = isLoading ? t("signingIn") : t(span.getAttribute("data-i18n"));
}

function _toast(message, type = "info") {
  if (typeof window.showToast === "function") {
    window.showToast(message, type);
  } else {
    console.info(`[Auth] ${message}`);
  }
}

export { auth };
