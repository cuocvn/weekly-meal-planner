// ============================================================
// app.js — Main Application Controller (v3)
//
// INITIALIZATION STRATEGY:
//   ES modules with type="module" are deferred — they execute
//   after HTML is parsed but the DOMContentLoaded event may
//   have already fired by then in some browsers/environments.
//   We use a readyState guard to handle both cases safely:
//
//     if (document.readyState === "loading") → wait for event
//     else → DOM is already ready, run init() immediately
//
// IMPORT CHAIN:
//   app.js → auth.js  (fixed: ../config.js, not ../../config.js)
//   app.js → pdfGen.js
//   app.js → lang.js
// ============================================================

import { initAuth }                                           from "./auth.js";
import { generatePDF }                                        from "./pdfGen.js";
import { t, setLang, initLang, formatItemCount, getCurrentLang } from "./lang.js";

// ============================================================
// CONSTANTS
// ============================================================
const DAYS_KEYS = [
  "dayMonday","dayTuesday","dayWednesday",
  "dayThursday","dayFriday","daySaturday","daySunday",
];

const MEALS = [
  { id:"breakfast", labelKey:"breakfast", icon:"☀️", cls:"meal-cell--breakfast", phKey:"phBreakfast" },
  { id:"lunch",     labelKey:"lunch",     icon:"🌿", cls:"meal-cell--lunch",     phKey:"phLunch"     },
  { id:"dinner",    labelKey:"dinner",    icon:"🌙", cls:"meal-cell--dinner",    phKey:"phDinner"    },
];

const STORAGE_KEY  = "wmp_mealData";
const GROCERY_KEY  = "wmp_groceryData";
const THEME_KEY    = "wmp_theme";
const MAX_MEAL_LEN = 120;

// ============================================================
// SAMPLE PLANS — English & Vietnamese
// ============================================================
const SAMPLE_EN = {
  dayMonday:    { breakfast:"Greek yogurt parfait with granola & blueberries",   lunch:"Turkey & avocado wrap",            dinner:"Baked lemon herb salmon with asparagus"    },
  dayTuesday:   { breakfast:"Scrambled eggs with whole-grain toast",              lunch:"Lentil soup with crusty bread",     dinner:"Chicken stir-fry with brown rice & broccoli"},
  dayWednesday: { breakfast:"Smoothie bowl — banana, spinach, almond milk",      lunch:"Tuna salad on whole-wheat pita",    dinner:"Beef tacos with pico de gallo & slaw"      },
  dayThursday:  { breakfast:"Avocado toast with poached eggs",                   lunch:"Caprese salad with grilled chicken",dinner:"Shrimp pasta with garlic & cherry tomatoes"},
  dayFriday:    { breakfast:"Banana oat pancakes with maple syrup",              lunch:"Veggie burrito bowl",               dinner:"Homemade margherita pizza"                 },
  daySaturday:  { breakfast:"French toast with fresh strawberries",              lunch:"BLT sandwich & sweet potato fries", dinner:"Grilled rib-eye steak with mashed potatoes"},
  daySunday:    { breakfast:"Eggs Benedict with smoked salmon",                  lunch:"Minestrone soup & garlic bread",    dinner:"Roast chicken with seasonal vegetables"    },
};

const SAMPLE_VI = {
  dayMonday:    { breakfast:"Cháo yến mạch sữa hạnh nhân & quả mọng",     lunch:"Cơm gà hấp sả gừng",                  dinner:"Cá hồi áp chảo sốt chanh & măng tây"   },
  dayTuesday:   { breakfast:"Bánh mì trứng ốp la & rau cải",               lunch:"Phở bò tái chín đặc biệt",            dinner:"Gà xào bông cải xanh cơm gạo lứt"       },
  dayWednesday: { breakfast:"Sinh tố bowl — chuối, rau bina, sữa dừa",    lunch:"Bánh mì cá ngừ nguyên cám",           dinner:"Bún bò Huế thịt heo & chả lụa"          },
  dayThursday:  { breakfast:"Bánh mì avocado trứng chần",                  lunch:"Salad caprese gà nướng",              dinner:"Mì tôm sốt tỏi cà chua bi"              },
  dayFriday:    { breakfast:"Pancake chuối yến mạch mật ong",              lunch:"Cơm chiên rau củ đậu phụ",            dinner:"Pizza margherita tự làm"                 },
  daySaturday:  { breakfast:"Bánh French toast dâu tây tươi",              lunch:"Bánh mì BLT & khoai lang chiên",      dinner:"Bò nướng lửa than khoai tây nghiền"      },
  daySunday:    { breakfast:"Trứng Benedict cá hồi hun khói",              lunch:"Súp minestrone bánh mì nướng tỏi",    dinner:"Gà nướng rau củ theo mùa"               },
};

const SAMPLE_GROCERY_EN = `Produce:
- Baby spinach (5 oz)
- Avocados ×3
- Cherry tomatoes (1 pint)
- Broccoli (1 head)
- Asparagus (1 bunch)
- Bananas ×4
- Blueberries (1 pint)
- Strawberries (1 lb)
- Lemons ×2

Proteins:
- Salmon fillets (2 lbs)
- Chicken breasts (3 lbs)
- Ground beef 85% lean (1 lb)
- Eggs (2 dozen)
- Shrimp peeled (1 lb)
- Canned tuna ×2

Dairy & Grains:
- Greek yogurt (32 oz)
- Granola (1 bag)
- Whole-grain bread (1 loaf)
- Brown rice (2 lb bag)
- Whole-wheat pitas ×4
- Pasta (1 lb)

Pantry:
- Olive oil (1 bottle)
- Garlic (1 bulb)
- Canned diced tomatoes ×2
- Chicken broth (32 oz)`;

const SAMPLE_GROCERY_VI = `Rau Củ Quả:
- Rau bina (1 bó)
- Bơ ×3 quả
- Cà chua bi (250g)
- Bông cải xanh (1 đầu)
- Măng tây (1 bó)
- Chuối ×4 quả
- Quả mọng tổng hợp (200g)
- Dâu tây (500g)
- Chanh ×2 quả

Đạm & Thịt:
- Phi lê cá hồi (1kg)
- Ức gà (1.5kg)
- Thịt bò xay 80% nạc (500g)
- Trứng gà ×2 vỉ (10 quả)
- Tôm sú lột (500g)
- Cá ngừ đóng hộp ×2

Sữa & Ngũ Cốc:
- Sữa chua Hy Lạp (500g)
- Granola (1 túi)
- Bánh mì nguyên cám (1 ổ)
- Gạo lứt (1kg)
- Mì ống (500g)

Đồ Khô:
- Dầu ô liu (1 chai)
- Tỏi (1 đầu)
- Cà chua hộp ×2
- Nước dùng gà (1 hộp)`;

// ============================================================
// ENTRY POINT — readyState guard (bulletproof for all browsers)
// ============================================================
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", _init);
} else {
  // DOMContentLoaded already fired (can happen with deferred modules)
  _init();
}

// ============================================================
// MAIN INIT
// ============================================================
function _init() {
  // 1. Theme (must be first — prevents flash of wrong theme)
  _applyTheme();

  // 2. Language (updates all data-i18n elements)
  initLang();

  // 3. Firebase Auth (safe — DOM refs resolved inside initAuth)
  initAuth();

  // 4. Expose showToast globally BEFORE auth events can fire
  window.showToast = showToast;

  // 5. Build meal table rows
  _buildMealTable();

  // 6. Load saved data from localStorage
  _loadFromStorage();

  // 7. Wire all UI controls
  _wireThemeToggle();
  _wireLangSwitcher();
  _wireGroceryControls();
  _wireActionButtons();

  // 8. Static footer/header values
  _setFooterYear();
  _setWeekDateRange();

  // 9. Listen for language changes to refresh dynamic elements
  document.addEventListener("langchange", () => {
    _refreshTableLabels();
    _setWeekDateRange();
    _updateGroceryCounter();
  });
}

// ============================================================
// THEME — Dark / Light
// ============================================================
function _applyTheme() {
  let saved = "light";
  try { saved = localStorage.getItem(THEME_KEY) || "light"; } catch (_) {}

  // Respect OS preference on first visit
  if (!localStorage.getItem(THEME_KEY)) {
    saved = window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  document.documentElement.setAttribute("data-theme", saved);
}

function _wireThemeToggle() {
  const btn = document.getElementById("themeToggle");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    const next    = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem(THEME_KEY, next); } catch (_) {}
    showToast(next === "dark" ? t("toastThemeDark") : t("toastThemeLight"), "info", 2200);
  });
}

// ============================================================
// LANGUAGE SWITCHER
// ============================================================
function _wireLangSwitcher() {
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang;
      if (!lang || lang === getCurrentLang()) return;
      setLang(lang);
      // langchange event triggers _refreshTableLabels & _setWeekDateRange via listener above
    });
  });
}

// ============================================================
// BUILD MEAL TABLE (called once on init)
// ============================================================
function _buildMealTable() {
  const wrapper = document.getElementById("mealTableWrapper");
  if (!wrapper) return;

  const today      = new Date();
  const todayDayIdx = today.getDay() === 0 ? 6 : today.getDay() - 1; // 0=Mon…6=Sun

  DAYS_KEYS.forEach((dayKey, idx) => {
    const isToday = idx === todayDayIdx;
    const dayDate = _getDayDate(idx, today);

    // ---- Row wrapper ----
    const rowEl = document.createElement("div");
    rowEl.className    = "day-row";
    rowEl.role         = "row";
    rowEl.dataset.day  = dayKey;
    if (isToday) rowEl.classList.add("day-row--today");

    // ---- Day header ----
    const headerEl = document.createElement("div");
    headerEl.className = "day-header";

    const nameSpan = document.createElement("span");
    nameSpan.className   = "day-name";
    nameSpan.textContent = t(dayKey);

    const dateSpan = document.createElement("span");
    dateSpan.className   = "day-date";
    dateSpan.textContent = dayDate;

    headerEl.appendChild(nameSpan);
    headerEl.appendChild(dateSpan);

    if (isToday) {
      const badge = document.createElement("span");
      badge.className   = "day-today-badge";
      badge.textContent = t("todayBadge");
      headerEl.appendChild(badge);
    }

    // ---- Meals grid ----
    const mealsEl = document.createElement("div");
    mealsEl.className = "day-meals";

    MEALS.forEach((meal) => {
      const inputId = `meal-${dayKey}-${meal.id}`;

      const cellEl = document.createElement("div");
      cellEl.className = `meal-cell ${meal.cls}`;
      cellEl.setAttribute("role", "cell");

      // Label
      const labelEl = document.createElement("div");
      labelEl.className = "meal-label";
      labelEl.setAttribute("data-meal", meal.id);

      const iconSpan = document.createElement("span");
      iconSpan.className       = "meal-label-icon";
      iconSpan.setAttribute("aria-hidden", "true");
      iconSpan.textContent     = meal.icon;

      labelEl.appendChild(iconSpan);
      labelEl.appendChild(document.createTextNode(t(meal.labelKey)));

      // Textarea
      const inputEl = document.createElement("textarea");
      inputEl.id          = inputId;
      inputEl.className   = "meal-input";
      inputEl.rows        = 2;
      inputEl.maxLength   = MAX_MEAL_LEN;
      inputEl.placeholder = t(meal.phKey);
      inputEl.setAttribute("aria-label", `${t(meal.labelKey)} – ${t(dayKey)}`);
      inputEl.dataset.day  = dayKey;
      inputEl.dataset.meal = meal.id;

      // Char counter
      const ccEl = document.createElement("span");
      ccEl.id        = `cc-${inputId}`;
      ccEl.className = "char-count";
      ccEl.setAttribute("aria-hidden", "true");

      // Input event
      inputEl.addEventListener("input", () => {
        const len = inputEl.value.length;
        ccEl.textContent = `${len}/${MAX_MEAL_LEN}`;
        ccEl.className   = "char-count"
          + (len >= MAX_MEAL_LEN       ? " at-limit"   : "")
          + (len >= MAX_MEAL_LEN * 0.85 && len < MAX_MEAL_LEN ? " near-limit" : "");
        _autoGrow(inputEl);
        _debounce("autosave", _saveToStorage, 900)();
      });

      cellEl.appendChild(labelEl);
      cellEl.appendChild(inputEl);
      cellEl.appendChild(ccEl);
      mealsEl.appendChild(cellEl);
    });

    rowEl.appendChild(headerEl);
    rowEl.appendChild(mealsEl);
    wrapper.appendChild(rowEl);
  });
}

// ============================================================
// REFRESH TABLE LABELS (on language switch)
// ============================================================
function _refreshTableLabels() {
  DAYS_KEYS.forEach((dayKey, idx) => {
    const rowEl = document.querySelector(`[data-day="${dayKey}"]`);
    if (!rowEl) return;

    // Day name
    const nameEl = rowEl.querySelector(".day-name");
    if (nameEl) nameEl.textContent = t(dayKey);

    // Today badge (may not exist on non-today rows)
    const badge = rowEl.querySelector(".day-today-badge");
    if (badge) badge.textContent = t("todayBadge");

    // Date (locale-aware)
    const dateEl = rowEl.querySelector(".day-date");
    if (dateEl) dateEl.textContent = _getDayDate(idx, new Date());

    // Meal labels + placeholders
    MEALS.forEach((meal) => {
      const labelEl = rowEl.querySelector(`.meal-label[data-meal="${meal.id}"]`);
      if (labelEl) {
        const icon = labelEl.querySelector(".meal-label-icon");
        // Clear and rebuild text node after icon
        while (labelEl.lastChild && labelEl.lastChild !== icon) {
          labelEl.removeChild(labelEl.lastChild);
        }
        labelEl.appendChild(document.createTextNode(t(meal.labelKey)));
      }

      const inputEl = document.getElementById(`meal-${dayKey}-${meal.id}`);
      if (inputEl) {
        inputEl.placeholder = t(meal.phKey);
        inputEl.setAttribute("aria-label", `${t(meal.labelKey)} – ${t(dayKey)}`);
      }
    });
  });
}

// ============================================================
// GROCERY CONTROLS
// ============================================================
function _wireGroceryControls() {
  const groceryTA  = document.getElementById("groceryList");
  const sortBtn    = document.getElementById("btnSortGrocery");
  const clearBtn   = document.getElementById("btnClearGrocery");

  if (!groceryTA) return;

  groceryTA.addEventListener("input", () => {
    _updateGroceryCounter();
    _debounce("autosave", _saveToStorage, 900)();
  });

  if (sortBtn) {
    sortBtn.addEventListener("click", () => {
      const lines = groceryTA.value
        .split("\n")
        .filter(l => l.trim().length > 0)
        .sort((a, b) =>
          a.trim().toLowerCase().localeCompare(b.trim().toLowerCase(), getCurrentLang())
        );
      groceryTA.value = lines.join("\n");
      _updateGroceryCounter();
      _saveToStorage();
      showToast(t("toastSorted"), "success");
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (!groceryTA.value.trim()) return;
      if (!window.confirm(t("confirmClearGrocery"))) return;
      groceryTA.value = "";
      _updateGroceryCounter();
      _saveToStorage();
      showToast(t("toastGroceryCleared"), "info");
    });
  }

  _updateGroceryCounter();
}

function _updateGroceryCounter() {
  const groceryTA = document.getElementById("groceryList");
  const countEl   = document.getElementById("groceryCount");
  if (!groceryTA || !countEl) return;
  const n = groceryTA.value.split("\n").filter(l => l.trim().length > 0).length;
  countEl.textContent = formatItemCount(n);
}

// ============================================================
// ACTION BUTTONS
// ============================================================
function _wireActionButtons() {
  // Clear All Meals
  const clearAllBtn = document.getElementById("btnClearAll");
  if (clearAllBtn) {
    clearAllBtn.addEventListener("click", () => {
      if (!_hasAnyMealContent()) return;
      if (!window.confirm(t("confirmClearMeals"))) return;
      _clearAllMeals();
      showToast(t("toastAllCleared"), "info");
    });
  }

  // Load Sample Plan
  const sampleBtn = document.getElementById("btnLoadSample");
  if (sampleBtn) {
    sampleBtn.addEventListener("click", () => {
      if (_hasAnyMealContent() && !window.confirm(t("confirmLoadSample"))) return;
      _loadSamplePlan();
      showToast(t("toastSampleLoaded"), "success");
    });
  }

  // Save Progress
  const saveBtn = document.getElementById("btnSaveLocal");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      _saveToStorage();
      showToast(t("toastSaved"), "success");
    });
  }

  // Download PDF
  const pdfBtn = document.getElementById("btnDownloadPdf");
  if (pdfBtn) {
    pdfBtn.addEventListener("click", _handleDownloadPDF);
  }
}

// ============================================================
// PDF EXPORT HANDLER
// ============================================================
async function _handleDownloadPDF() {
  const overlay = document.getElementById("loadingOverlay");

  if (!window.jspdf || !window.jspdf.jsPDF) {
    showToast(t("toastPdfNotReady"), "warning");
    return;
  }

  if (overlay) overlay.classList.remove("hidden");

  try {
    const today      = new Date();
    const todayDayIdx = today.getDay() === 0 ? 6 : today.getDay() - 1;

    const mealData = DAYS_KEYS.map((dayKey, idx) => ({
      day:       t(dayKey),
      date:      _getDayDate(idx, today),
      isToday:   idx === todayDayIdx,
      breakfast: _getMealValue(dayKey, "breakfast"),
      lunch:     _getMealValue(dayKey, "lunch"),
      dinner:    _getMealValue(dayKey, "dinner"),
    }));

    const groceryTA    = document.getElementById("groceryList");
    const groceryItems = groceryTA
      ? groceryTA.value.split("\n").filter(l => l.trim().length > 0)
      : [];

    const weekRange = document.getElementById("weekDateRange")?.textContent?.trim() || "";

    // Small delay so the loading overlay paints before heavy PDF work
    await new Promise(r => setTimeout(r, 60));

    generatePDF(mealData, groceryItems, weekRange);
    showToast(t("toastPdfSuccess"), "success");

  } catch (err) {
    console.error("[app.js] PDF generation error:", err);
    showToast(t("toastPdfError"), "error");
  } finally {
    if (overlay) overlay.classList.add("hidden");
  }
}

// ============================================================
// LOCALSTORAGE — Save & Load
// ============================================================
function _saveToStorage() {
  try {
    const snapshot = {};
    DAYS_KEYS.forEach(dayKey => {
      snapshot[dayKey] = {};
      MEALS.forEach(meal => {
        snapshot[dayKey][meal.id] = _getMealValue(dayKey, meal.id);
      });
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));

    const groceryTA = document.getElementById("groceryList");
    if (groceryTA) localStorage.setItem(GROCERY_KEY, groceryTA.value);
  } catch (e) {
    console.warn("[app.js] localStorage save failed:", e);
  }
}

function _loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      DAYS_KEYS.forEach(dayKey => {
        if (!data[dayKey]) return;
        MEALS.forEach(meal => {
          const el = document.getElementById(`meal-${dayKey}-${meal.id}`);
          if (el && data[dayKey][meal.id]) {
            el.value = data[dayKey][meal.id];
            _autoGrow(el);
          }
        });
      });
    }

    const savedGrocery = localStorage.getItem(GROCERY_KEY);
    const groceryTA    = document.getElementById("groceryList");
    if (savedGrocery && groceryTA) {
      groceryTA.value = savedGrocery;
      _updateGroceryCounter();
    }
  } catch (e) {
    console.warn("[app.js] localStorage load failed:", e);
  }
}

// ============================================================
// SAMPLE PLAN
// ============================================================
function _loadSamplePlan() {
  const lang = getCurrentLang();
  const plan  = lang === "vi" ? SAMPLE_VI : SAMPLE_EN;

  DAYS_KEYS.forEach(dayKey => {
    MEALS.forEach(meal => {
      const el = document.getElementById(`meal-${dayKey}-${meal.id}`);
      if (el && plan[dayKey]) {
        el.value = plan[dayKey][meal.id] || "";
        _autoGrow(el);
      }
    });
  });

  const groceryTA = document.getElementById("groceryList");
  if (groceryTA) {
    groceryTA.value = lang === "vi" ? SAMPLE_GROCERY_VI : SAMPLE_GROCERY_EN;
    _updateGroceryCounter();
  }

  _saveToStorage();
}

// ============================================================
// CLEAR ALL MEALS
// ============================================================
function _clearAllMeals() {
  DAYS_KEYS.forEach(dayKey => {
    MEALS.forEach(meal => {
      const el = document.getElementById(`meal-${dayKey}-${meal.id}`);
      if (!el) return;
      el.value        = "";
      el.style.height = "auto";
      const cc = document.getElementById(`cc-meal-${dayKey}-${meal.id}`);
      if (cc) { cc.textContent = `0/${MAX_MEAL_LEN}`; cc.className = "char-count"; }
    });
  });
  _saveToStorage();
}

// ============================================================
// UTILITY HELPERS
// ============================================================
function _getMealValue(dayKey, mealId) {
  const el = document.getElementById(`meal-${dayKey}-${mealId}`);
  return el ? el.value.trim() : "";
}

function _hasAnyMealContent() {
  return DAYS_KEYS.some(dayKey =>
    MEALS.some(meal => _getMealValue(dayKey, meal.id).length > 0)
  );
}

function _autoGrow(textarea) {
  if (!textarea) return;
  textarea.style.height = "auto";
  textarea.style.height = Math.max(textarea.scrollHeight, 36) + "px";
}

function _getDayDate(dayIndex, referenceDate) {
  // dayIndex: 0=Monday … 6=Sunday
  const ref        = new Date(referenceDate);
  const currentIdx = ref.getDay() === 0 ? 6 : ref.getDay() - 1;
  const target     = new Date(ref);
  target.setDate(ref.getDate() + (dayIndex - currentIdx));
  const locale = getCurrentLang() === "vi" ? "vi-VN" : "en-US";
  return target.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

function _setWeekDateRange() {
  const el = document.getElementById("weekDateRange");
  if (!el) return;
  const today     = new Date();
  const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const monday    = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const locale = getCurrentLang() === "vi" ? "vi-VN" : "en-US";
  const opts   = { month: "short", day: "numeric" };
  el.textContent = [
    monday.toLocaleDateString(locale, opts),
    "–",
    sunday.toLocaleDateString(locale, { ...opts, year: "numeric" }),
  ].join(" ");
}

function _setFooterYear() {
  const el = document.getElementById("footerYear");
  if (el) el.textContent = new Date().getFullYear();
}

// ============================================================
// DEBOUNCE
// ============================================================
const _timers = {};
function _debounce(key, fn, delay) {
  return (...args) => {
    clearTimeout(_timers[key]);
    _timers[key] = setTimeout(() => fn(...args), delay);
  };
}

// ============================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================
export function showToast(message, type = "info", duration = 3500) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const icons = { success:"✅", error:"❌", warning:"⚠️", info:"ℹ️" };
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.setAttribute("role", "alert");
  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${icons[type] || "ℹ️"}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  const dismiss = () => {
    toast.classList.add("hiding");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  };
  const timer = setTimeout(dismiss, duration);
  toast.addEventListener("click", () => { clearTimeout(timer); dismiss(); });
}

// Make showToast available globally (auth.js calls window.showToast)
window.showToast = showToast;
