// ============================================================
// auth.js — Firebase Authentication Module (v3)
//
// ROOT CAUSE FIX:
//   WRONG (was):  import { auth } from "../../config.js"
//   RIGHT (now):  import { auth } from "../config.js"
//
// From src/js/auth.js, going up ONE level (../) reaches src/,
// where config.js lives. Going up TWO levels (../../) reaches
// the repository root, where there is no config.js — causing a
// silent 404 that crashes the entire ES module graph and leaves
// the whole page frozen and unresponsive.
// ============================================================

import { auth } from "../config.js";               // ← THE CRITICAL FIX
import { t }    from "./lang.js";
import {
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ============================================================
// PROVIDERS (module-level, safe to init before DOM)
// ============================================================
const googleProvider   = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// ============================================================
// INITIALIZATION — runs after DOM is ready
// Called from app.js inside the DOMContentLoaded / readyState
// guard so all getElementById calls are guaranteed to succeed.
// ============================================================
export function initAuth() {
  // ---- DOM References (resolved here, not at module parse time) ----
  const btnGoogleLogin   = document.getElementById("btnGoogleLogin");
  const btnFacebookLogin = document.getElementById("btnFacebookLogin");
  const btnLogout        = document.getElementById("btnLogout");
  const authButtons      = document.getElementById("authButtons");
  const authUserInfo     = document.getElementById("authUserInfo");
  const userGreeting     = document.getElementById("userGreeting");
  const userAvatar       = document.getElementById("userAvatar");

  // Guard: if critical elements are missing, bail silently
  if (!btnGoogleLogin || !btnFacebookLogin || !btnLogout) {
    console.warn("[auth.js] Auth DOM elements not found — skipping auth init.");
    return;
  }

  // ----------------------------------------------------------
  // AUTH STATE OBSERVER
  // Fires immediately on page load with current session state,
  // then again on every login / logout.
  // ----------------------------------------------------------
  onAuthStateChanged(auth, (user) => {
    if (user) {
      _showAuthenticatedState(user, { authButtons, authUserInfo, userGreeting, userAvatar });
    } else {
      _showGuestState({ authButtons, authUserInfo, userGreeting, userAvatar });
    }
  });

  // ----------------------------------------------------------
  // Re-render greeting text when user switches language
  // ----------------------------------------------------------
  document.addEventListener("langchange", () => {
    if (!userGreeting) return;
    const storedName = userGreeting.dataset.name;
    if (storedName) {
      userGreeting.textContent = `${t("welcomeBack")}, ${storedName}!`;
    }
  });

  // ----------------------------------------------------------
  // GOOGLE SIGN-IN
  // ----------------------------------------------------------
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

  // ----------------------------------------------------------
  // FACEBOOK SIGN-IN
  // ----------------------------------------------------------
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

  // ----------------------------------------------------------
  // LOGOUT
  // ----------------------------------------------------------
  btnLogout.addEventListener("click", async () => {
    try {
      await signOut(auth);
      _showToast(t("signedOut"), "info");
    } catch (err) {
      console.error("[auth.js] Logout error:", err);
      _showToast(t("authErrGeneric"), "error");
    }
  });
}

// ============================================================
// PRIVATE HELPERS
// ============================================================

function _showAuthenticatedState(user, els) {
  const { authButtons, authUserInfo, userGreeting, userAvatar } = els;

  if (authButtons)  authButtons.classList.add("hidden");
  if (authUserInfo) authUserInfo.classList.remove("hidden");

  const fullName  = user.displayName || user.email || "User";
  const firstName = fullName.split(" ")[0];

  if (userGreeting) {
    userGreeting.textContent  = `${t("welcomeBack")}, ${firstName}!`;
    userGreeting.dataset.name = firstName; // persisted for langchange re-render
  }

  if (userAvatar) {
    if (user.photoURL) {
      userAvatar.src           = user.photoURL;
      userAvatar.alt           = `${firstName} avatar`;
      userAvatar.style.display = "block";
    } else {
      userAvatar.style.display = "none";
    }
  }

  _showToast(`✅ ${t("welcomeBack")}, ${firstName}!`, "success");
}

function _showGuestState(els) {
  const { authButtons, authUserInfo, userGreeting, userAvatar } = els;

  if (authUserInfo) authUserInfo.classList.add("hidden");
  if (authButtons)  authButtons.classList.remove("hidden");
  if (userAvatar)   { userAvatar.src = ""; userAvatar.style.display = "none"; }
  if (userGreeting) {
    userGreeting.textContent = "";
    delete userGreeting.dataset.name;
  }
}

function _handleAuthError(err, provider) {
  console.error(`[auth.js] ${provider} error [${err.code}]:`, err);

  const errorMap = {
    "auth/popup-closed-by-user":                    t("authErrPopupClosed"),
    "auth/cancelled-popup-request":                 t("authErrPopupClosed"),
    "auth/popup-blocked":                           t("authErrPopupBlocked"),
    "auth/account-exists-with-different-credential":t("authErrAccountExists"),
    "auth/network-request-failed":                  t("authErrNetwork"),
    "auth/unauthorized-domain":
      "This domain is not authorized in Firebase. Add it in Firebase Console → Auth → Authorized Domains.",
  };

  const message = errorMap[err.code] || `${t("authErrGeneric")} (${err.code})`;
  _showToast(`❌ ${message}`, "error", 6000);
}

function _setButtonLoading(btn, isLoading) {
  if (!btn) return;
  btn.disabled = isLoading;
  const span = btn.querySelector("[data-i18n]");
  if (span) {
    span.textContent = isLoading
      ? t("signingIn")
      : t(span.getAttribute("data-i18n") || "");
  }
}

function _showToast(message, type = "info", duration = 3500) {
  if (typeof window.showToast === "function") {
    window.showToast(message, type, duration);
  } else {
    // Fallback: queue a retry in case showToast registers slightly later
    setTimeout(() => {
      if (typeof window.showToast === "function") {
        window.showToast(message, type, duration);
      } else {
        console.info(`[Auth Toast] [${type}] ${message}`);
      }
    }, 500);
  }
}

export { auth };
