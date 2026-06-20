// ============================================================
// config.js — Firebase App Initialization
// File: src/config.js
// ============================================================
import { initializeApp }  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth }        from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getAnalytics }   from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";

const firebaseConfig = {
  apiKey:            "AIzaSyDtI6k_Pan-6VW_BGcJY8e6oPoQ_f2dnOU",
  authDomain:        "weekly-meal-planner-b45cb.firebaseapp.com",
  projectId:         "weekly-meal-planner-b45cb",
  storageBucket:     "weekly-meal-planner-b45cb.firebasestorage.app",
  messagingSenderId: "410893420105",
  appId:             "1:410893420105:web:3e0de56fd2f2724531a198",
  measurementId:     "G-ZL0VW1WQTR",
};

const app       = initializeApp(firebaseConfig);
const auth      = getAuth(app);
const analytics = getAnalytics(app);

export { app, auth, analytics };
