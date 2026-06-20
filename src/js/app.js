// ============================================================
// app.js — Main Application Controller (v2)
// Manages: UI generation, Theme toggle, Language switch,
//          Auto-save, Sample plan, PDF export, Toast system
// ============================================================

import "./auth.js";                               // Mount Firebase auth listeners
import { generatePDF }                from "./pdfGen.js";
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
// SAMPLE PLAN DATA (bilingual content)
// ============================================================
const SAMPLE_PLAN_EN = {
  dayMonday:    { breakfast:"Greek yogurt parfait with granola & blueberries", lunch:"Turkey & avocado wrap",          dinner:"Baked lemon herb salmon with roasted asparagus" },
  dayTuesday:   { breakfast:"Scrambled eggs with whole-grain toast",            lunch:"Lentil soup with crusty bread",  dinner:"Chicken stir-fry with brown rice & broccoli" },
  dayWednesday: { breakfast:"Smoothie bowl (banana, spinach, almond milk)",     lunch:"Tuna salad on whole-wheat pita", dinner:"Beef tacos with pico de gallo & slaw" },
  dayThursday:  { breakfast:"Avocado toast with poached eggs",                  lunch:"Caprese salad with grilled chicken", dinner:"Shrimp pasta with garlic & cherry tomatoes" },
  dayFriday:    { breakfast:"Banana oat pancakes with maple syrup",             lunch:"Veggie burrito bowl",            dinner:"Homemade margherita pizza" },
  daySaturday:  { breakfast:"French toast with fresh strawberries",             lunch:"BLT sandwich & sweet potato fries", dinner:"Grilled rib-eye steak with mashed potatoes" },
  daySunday:    { breakfast:"Eggs Benedict with smoked salmon",                 lunch:"Minestrone soup & garlic bread", dinner:"Roast chicken with seasonal vegetables & gravy" },
};
const SAMPLE_PLAN_VI = {
  dayMonday:    { breakfast:"Cháo yến mạch với sữa hạnh nhân & quả mọng",        lunch:"Cơm gà hấp sả gừng",              dinner:"Cá hồi áp chảo sốt chanh & măng tây" },
  dayTuesday:   { breakfast:"Bánh mì trứng ốp la & rau cải",                      lunch:"Phở bò tái chín đặc biệt",        dinner:"Thịt gà xào bông cải xanh cơm gạo lứt" },
  dayWednesday: { breakfast:"Sinh tố bowl (chuối, rau bina, sữa dừa)",            lunch:"Bánh mì cá ngừ nguyên cám",       dinner:"Bún bò Huế thịt heo & chả lụa" },
  dayThursday:  { breakfast:"Bánh mì avocado trứng chần",                         lunch:"Salad caprese gà nướng",          dinner:"Mì tôm sốt tỏi cà chua bi" },
  dayFriday:    { breakfast:"Bánh pancake chuối yến mạch mật ong",                lunch:"Cơm chiên rau củ đậu phụ",        dinner:"Pizza margherita tự làm" },
  daySaturday:  { breakfast:"Bánh French toast dâu tây tươi",                     lunch:"Bánh mì kẹp BLT & khoai lang chiên", dinner:"Bò nướng lửa than khoai tây nghiền" },
  daySunday:    { breakfast:"Trứng Benedict cá hồi hun khói",                     lunch:"Súp minestrone bánh mì nướng tỏi", dinner:"Gà nướng rau củ theo mùa" },
};

const SAMPLE_GROCERY_EN = `Produce:
- Baby spinach (5 oz bag)
- Avocados × 3
- Cherry tomatoes (1 pint)
- Broccoli (1 head)
- Asparagus (1 bunch)
- Bananas × 4
- Blueberries (1 pint)
- Strawberries (1 lb)
- Lemons × 2

Proteins:
- Salmon fillets (2 lbs)
- Chicken breasts (3 lbs)
- Ground beef 85% lean (1 lb)
- Eggs (2 dozen)
- Shrimp peeled (1 lb)
- Canned tuna × 2

Dairy & Grains:
- Greek yogurt (32 oz)
- Granola (1 bag)
- Whole-grain bread (1 loaf)
- Brown rice (2 lb bag)
- Whole-wheat pitas × 4

Pantry:
- Olive oil (1 bottle)
- Garlic (1 bulb)
- Canned diced tomatoes × 2
- Chicken broth (32 oz)
- Pasta (1 lb)`;

const SAMPLE_GROCERY_VI = `Rau Củ Quả:
- Rau bina (1 bó)
- Bơ × 3 quả
- Cà chua bi (250g)
- Bông cải xanh (1 đầu)
- Măng tây (1 bó)
- Chuối × 4 quả
- Quả mọng tổng hợp (200g)
- Dâu tây (500g)
- Chanh × 2 quả

Đạm & Thịt:
- Phi lê cá hồi (1kg)
- Ức gà (1.5kg)
- Thịt bò xay 80% nạc (500g)
- Trứng gà (2 vỉ × 10)
- Tôm sú đã lột (500g)
- Cá ngừ đóng hộp × 2

Sữa & Ngũ Cốc:
- Sữa chua Hy Lạp (500g)
- Granola (1 túi)
- Bánh mì nguyên cám (1 ổ)
- Gạo lứt (1kg)
- Mì ống (500g)

Đồ Khô:
- Dầu ô liu (1 chai)
- Tỏi (1 đầu)
- Cà chua hộp × 2
- Nước dùng gà (1 hộp)
- Bột mì đa dụng (500g)`;

// ============================================================
// INIT
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  _initTheme();
  initLang();             // sets language from localStorage/browser
  _setFooterYear();
  _setWeekDateRange();
  _buildMealTable();
  _loadFromStorage();
  _wireGroceryControls();
  _wireActionButtons();
  _wireLangSwitcher();
  _wireThemeToggle();

  // Expose toast globally for auth.js
  window.showToast = showToast;
});

// ============================================================
// THEME — Dark / Light
// ============================================================
function _initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
}

function _wireThemeToggle() {
  const btn = document.getElementById("themeToggle");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next    = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(THEME_KEY, next);
    showToast(next === "dark" ? t("toastThemeDark") : t("toastThemeLight"), "info", 2000);
  });
}

// ============================================================
// LANGUAGE SWITCHER
// ============================================================
function _wireLangSwitcher() {
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang;
      if (lang === getCurrentLang()) return;
      setLang(lang);
      // Refresh day/meal labels inside the already-rendered table
      _refreshTableLabels();
      // Refresh grocery placeholder & counter
      _updateGroceryCounter();
    });
  });

  // Also react to programmatic lang changes
  document.addEventListener("langchange", () => {
    _refreshTableLabels();
    _setWeekDateRange();
  });
}

/** Re-render day names, meal type labels, and placeholders inside the table */
function _refreshTableLabels() {
  DAYS_KEYS.forEach((dayKey, idx) => {
    const row = document.querySelector(`[data-day="${dayKey}"]`);
    if (!row) return;
    const nameEl = row.querySelector(".day-name");
    if (nameEl) nameEl.textContent = t(dayKey);

    MEALS.forEach((meal) => {
      const labelEl = row.querySelector(`.meal-label[data-meal="${meal.id}"]`);
      if (labelEl) {
        const icon = labelEl.querySelector(".meal-label-icon");
        labelEl.textContent = "";
        if (icon) labelEl.appendChild(icon);
        labelEl.appendChild(document.createTextNode(t(meal.labelKey)));
      }
      const inputEl = document.getElementById(`meal-${dayKey}-${meal.id}`);
      if (inputEl) inputEl.placeholder = t(meal.phKey);
    });
  });
}

// ============================================================
// BUILD MEAL TABLE
// ============================================================
function _buildMealTable() {
  const wrapper   = document.getElementById("mealTableWrapper");
  const today     = new Date();
  const todayIdx  = today.getDay() === 0 ? 6 : today.getDay() - 1; // 0=Mon…6=Sun

  DAYS_KEYS.forEach((dayKey, idx) => {
    const isToday  = idx === todayIdx;
    const dayDate  = _getDayDate(idx, today);

    // Row
    const rowEl = document.createElement("div");
    rowEl.className = "day-row";
    rowEl.setAttribute("role", "row");
    rowEl.dataset.day = dayKey;
    if (isToday) rowEl.classList.add("day-row--today");

    // Day header
    const headerEl = document.createElement("div");
    headerEl.className = "day-header";
    headerEl.innerHTML = `
      <span class="day-name">${t(dayKey)}</span>
      <span class="day-date">${dayDate}</span>
      ${isToday ? `<span class="day-today-badge">${t("todayBadge")}</span>` : ""}
    `;

    // Meals grid
    const mealsEl = document.createElement("div");
    mealsEl.className = "day-meals";

    MEALS.forEach((meal) => {
      const inputId = `meal-${dayKey}-${meal.id}`;
      const cellEl  = document.createElement("div");
      cellEl.className = `meal-cell ${meal.cls}`;
      cellEl.setAttribute("role", "cell");

      // Label element (we keep a reference via data-meal for refreshing)
      const labelEl = document.createElement("div");
      labelEl.className  = "meal-label";
      labelEl.setAttribute("data-meal", meal.id);
      labelEl.innerHTML = `<span class="meal-label-icon" aria-hidden="true">${meal.icon}</span>`;
      labelEl.appendChild(document.createTextNode(t(meal.labelKey)));

      const inputEl = document.createElement("textarea");
      inputEl.id          = inputId;
      inputEl.className   = "meal-input";
      inputEl.rows        = 2;
      inputEl.maxLength   = MAX_MEAL_LEN;
      inputEl.placeholder = t(meal.phKey);
      inputEl.setAttribute("aria-label", `${t(meal.labelKey)} – ${t(dayKey)}`);
      inputEl.dataset.day  = dayKey;
      inputEl.dataset.meal = meal.id;

      const ccEl = document.createElement("span");
      ccEl.className = "char-count";
      ccEl.id        = `cc-${inputId}`;
      ccEl.setAttribute("aria-hidden", "true");

      cellEl.appendChild(labelEl);
      cellEl.appendChild(inputEl);
      cellEl.appendChild(ccEl);
      mealsEl.appendChild(cellEl);

      // Events
      inputEl.addEventListener("input", () => {
        const len = inputEl.value.length;
        ccEl.textContent = `${len}/${MAX_MEAL_LEN}`;
        ccEl.className   = "char-count" +
          (len >= MAX_MEAL_LEN ? " at-limit" : len >= MAX_MEAL_LEN * 0.85 ? " near-limit" : "");
        _autoGrow(inputEl);
        _debounce("save", _saveToStorage, 800)();
      });
    });

    rowEl.appendChild(headerEl);
    rowEl.appendChild(mealsEl);
    wrapper.appendChild(rowEl);
  });
}

// ============================================================
// GROCERY CONTROLS
// ============================================================
function _wireGroceryControls() {
  const groceryTA = document.getElementById("groceryList");

  groceryTA.addEventListener("input", () => {
    _updateGroceryCounter();
    _debounce("save", _saveToStorage, 800)();
  });

  // Sort A–Z
  document.getElementById("btnSortGrocery").addEventListener("click", () => {
    const lines = groceryTA.value
      .split("\n")
      .filter(l => l.trim())
      .sort((a, b) => a.trim().toLowerCase().localeCompare(b.trim().toLowerCase(), getCurrentLang()));
    groceryTA.value = lines.join("\n");
    _updateGroceryCounter();
    _saveToStorage();
    showToast(t("toastSorted"), "success");
  });

  // Clear grocery
  document.getElementById("btnClearGrocery").addEventListener("click", () => {
    if (!groceryTA.value.trim()) return;
    if (confirm(t("confirmClearGrocery"))) {
      groceryTA.value = "";
      _updateGroceryCounter();
      _saveToStorage();
      showToast(t("toastGroceryCleared"), "info");
    }
  });

  _updateGroceryCounter();
}

function _updateGroceryCounter() {
  const groceryTA  = document.getElementById("groceryList");
  const countEl    = document.getElementById("groceryCount");
  const lines      = groceryTA.value.split("\n").filter(l => l.trim());
  countEl.textContent = formatItemCount(lines.length);
}

// ============================================================
// ACTION BUTTONS
// ============================================================
function _wireActionButtons() {
  // Clear All Meals
  document.getElementById("btnClearAll").addEventListener("click", () => {
    if (!_hasAnyMealContent()) return;
    if (confirm(t("confirmClearMeals"))) {
      _clearAllMeals();
      showToast(t("toastAllCleared"), "info");
    }
  });

  // Load Sample Plan
  document.getElementById("btnLoadSample").addEventListener("click", () => {
    if (_hasAnyMealContent() && !confirm(t("confirmLoadSample"))) return;
    _loadSamplePlan();
    showToast(t("toastSampleLoaded"), "success");
  });

  // Save Progress
  document.getElementById("btnSaveLocal").addEventListener("click", () => {
    _saveToStorage();
    showToast(t("toastSaved"), "success");
  });

  // Download PDF
  document.getElementById("btnDownloadPdf").addEventListener("click", _handleDownloadPDF);
}

// ============================================================
// PDF HANDLER
// ============================================================
async function _handleDownloadPDF() {
  const overlay = document.getElementById("loadingOverlay");
  if (typeof window.jspdf === "undefined") {
    showToast(t("toastPdfNotReady"), "warning");
    return;
  }
  try {
    overlay.classList.remove("hidden");

    const today   = new Date();
    const todayIdx = today.getDay() === 0 ? 6 : today.getDay() - 1;
    const mealData = DAYS_KEYS.map((dayKey, idx) => ({
      day:       t(dayKey),
      date:      _getDayDate(idx, today),
      isToday:   idx === todayIdx,
      breakfast: _getMealValue(dayKey, "breakfast"),
      lunch:     _getMealValue(dayKey, "lunch"),
      dinner:    _getMealValue(dayKey, "dinner"),
    }));

    const groceryTA   = document.getElementById("groceryList");
    const groceryItems = groceryTA.value.split("\n").filter(l => l.trim());
    const weekRange   = document.getElementById("weekDateRange").textContent;

    await new Promise(r => setTimeout(r, 60)); // let overlay render
    generatePDF(mealData, groceryItems, weekRange);
    showToast(t("toastPdfSuccess"), "success");
  } catch (err) {
    console.error("PDF error:", err);
    showToast(t("toastPdfError"), "error");
  } finally {
    overlay.classList.add("hidden");
  }
}

// ============================================================
// PERSISTENCE — localStorage
// ============================================================
function _saveToStorage() {
  try {
    const snapshot = {};
    DAYS_KEYS.forEach(dayKey => {
      snapshot[dayKey] = {};
      MEALS.forEach(meal => { snapshot[dayKey][meal.id] = _getMealValue(dayKey, meal.id); });
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    const ta = document.getElementById("groceryList");
    if (ta) localStorage.setItem(GROCERY_KEY, ta.value);
  } catch (e) {
    console.warn("Save failed:", e);
  }
}

function _loadFromStorage() {
  try {
    const savedMeals = localStorage.getItem(STORAGE_KEY);
    if (savedMeals) {
      const data = JSON.parse(savedMeals);
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
    const ta = document.getElementById("groceryList");
    if (savedGrocery && ta) {
      ta.value = savedGrocery;
      _updateGroceryCounter();
    }
  } catch (e) {
    console.warn("Load failed:", e);
  }
}

// ============================================================
// SAMPLE PLAN
// ============================================================
function _loadSamplePlan() {
  const lang = getCurrentLang();
  const plan = lang === "vi" ? SAMPLE_PLAN_VI : SAMPLE_PLAN_EN;

  DAYS_KEYS.forEach(dayKey => {
    MEALS.forEach(meal => {
      const el = document.getElementById(`meal-${dayKey}-${meal.id}`);
      if (el && plan[dayKey]) {
        el.value = plan[dayKey][meal.id] || "";
        _autoGrow(el);
      }
    });
  });

  const ta = document.getElementById("groceryList");
  if (ta) {
    ta.value = lang === "vi" ? SAMPLE_GROCERY_VI : SAMPLE_GROCERY_EN;
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
  textarea.style.height = "auto";
  textarea.style.height = Math.max(textarea.scrollHeight, 36) + "px";
}

function _getDayDate(dayIndex, referenceDate) {
  // dayIndex: 0=Monday…6=Sunday
  const today      = new Date(referenceDate);
  const currentIdx = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const diff       = dayIndex - currentIdx;
  const target     = new Date(today);
  target.setDate(today.getDate() + diff);
  const lang = getCurrentLang();
  return target.toLocaleDateString(lang === "vi" ? "vi-VN" : "en-US", { month: "short", day: "numeric" });
}

function _setWeekDateRange() {
  const today      = new Date();
  const dayOfWeek  = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const monday     = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const lang = getCurrentLang();
  const locale = lang === "vi" ? "vi-VN" : "en-US";
  const opts   = { month: "short", day: "numeric" };
  const range  = `${monday.toLocaleDateString(locale, opts)} – ${sunday.toLocaleDateString(locale, { ...opts, year: "numeric" })}`;
  const el = document.getElementById("weekDateRange");
  if (el) el.textContent = range;
}

function _setFooterYear() {
  const el = document.getElementById("footerYear");
  if (el) el.textContent = new Date().getFullYear();
}

// ============================================================
// DEBOUNCE
// ============================================================
const _debounceTimers = {};
function _debounce(key, fn, delay) {
  return (...args) => {
    clearTimeout(_debounceTimers[key]);
    _debounceTimers[key] = setTimeout(() => fn(...args), delay);
  };
}

// ============================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================
export function showToast(message, type = "info", duration = 3500) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const icons = { success: "✅", error: "❌", warning: "⚠️", info: "ℹ️" };
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

// Expose globally for auth.js
window.showToast = showToast;
