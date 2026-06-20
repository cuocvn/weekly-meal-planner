// ============================================================
// app.js — Main Application Controller
// Generates meal plan UI, handles state, wires up all modules
// ============================================================

import "./auth.js";                   // Mount auth listeners
import { generatePDF } from "./pdfGen.js";

// ============================================================
// CONSTANTS & CONFIG
// ============================================================
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEALS = [
  { id: "breakfast", label: "Breakfast", icon: "☀️", cls: "meal-cell--breakfast",
    placeholder: "e.g. Oatmeal with berries" },
  { id: "lunch",     label: "Lunch",     icon: "🌿", cls: "meal-cell--lunch",
    placeholder: "e.g. Grilled chicken salad" },
  { id: "dinner",    label: "Dinner",    icon: "🌙", cls: "meal-cell--dinner",
    placeholder: "e.g. Salmon with veggies" },
];
const STORAGE_KEY  = "wmp_mealData";
const GROCERY_KEY  = "wmp_groceryData";
const MAX_MEAL_LEN = 120;

// Sample meal plan data
const SAMPLE_PLAN = {
  Monday:    { breakfast: "Greek yogurt parfait with granola & blueberries", lunch: "Turkey & avocado wrap", dinner: "Baked lemon herb salmon with roasted asparagus" },
  Tuesday:   { breakfast: "Scrambled eggs with whole-grain toast", lunch: "Lentil soup with crusty bread", dinner: "Chicken stir-fry with brown rice & broccoli" },
  Wednesday: { breakfast: "Smoothie bowl (banana, spinach, almond milk)", lunch: "Tuna salad on whole-wheat pita", dinner: "Beef tacos with pico de gallo & slaw" },
  Thursday:  { breakfast: "Avocado toast with poached eggs", lunch: "Caprese salad with grilled chicken", dinner: "Shrimp pasta with garlic & cherry tomatoes" },
  Friday:    { breakfast: "Banana oat pancakes with maple syrup", lunch: "Veggie burrito bowl", dinner: "Homemade margherita pizza" },
  Saturday:  { breakfast: "French toast with fresh strawberries", lunch: "BLT sandwich & sweet potato fries", dinner: "Grilled rib-eye steak with mashed potatoes" },
  Sunday:    { breakfast: "Eggs Benedict with smoked salmon", lunch: "Minestrone soup & garlic bread", dinner: "Roast chicken with seasonal vegetables & gravy" },
};

const SAMPLE_GROCERY = `Produce:
- Baby spinach (5 oz bag)
- Avocados (x3)
- Cherry tomatoes (1 pint)
- Broccoli (1 head)
- Asparagus (1 bunch)
- Bananas (x4)
- Blueberries (1 pint)
- Strawberries (1 lb)
- Lemons (x2)

Proteins:
- Salmon fillets (2 lbs)
- Chicken breasts (3 lbs)
- 85% lean ground beef (1 lb)
- Eggs (2 dozen)
- Shrimp (1 lb, peeled)
- Tuna cans (x2)
- Turkey deli slices (½ lb)

Dairy & Grains:
- Greek yogurt (32 oz)
- Granola (1 bag)
- Whole-grain bread (1 loaf)
- Brown rice (2 lb bag)
- Whole-wheat pitas (x4)
- Parmesan cheese (wedge)

Pantry:
- Olive oil (1 bottle)
- Garlic (1 bulb)
- Canned diced tomatoes (x2)
- Chicken broth (32 oz)
- Pasta (1 lb)`;

// ============================================================
// STATE
// ============================================================
let mealState = {}; // { Monday: { breakfast, lunch, dinner }, ... }

// ============================================================
// INIT
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  _setFooterYear();
  _setWeekDateRange();
  _buildMealTable();
  _loadFromStorage();
  _wireGroceryControls();
  _wireActionButtons();
  // Expose toast globally for auth.js
  window.showToast = showToast;
});

// ============================================================
// BUILD MEAL TABLE
// ============================================================
function _buildMealTable() {
  const wrapper = document.getElementById("mealTableWrapper");
  const today = new Date();
  const todayName = DAYS[today.getDay() === 0 ? 6 : today.getDay() - 1]; // Mon-based

  DAYS.forEach((day) => {
    const dayDate = _getDayDate(day, today);
    const isToday = day === todayName;

    // Initialize state
    mealState[day] = { breakfast: "", lunch: "", dinner: "" };

    // Row container
    const rowEl = document.createElement("div");
    rowEl.className = "day-row";
    rowEl.setAttribute("role", "row");
    rowEl.setAttribute("aria-label", `${day} meals`);
    rowEl.dataset.day = day;
    if (isToday) rowEl.classList.add("day-row--today");

    // Day header
    const headerEl = document.createElement("div");
    headerEl.className = "day-header";
    headerEl.innerHTML = `
      <span class="day-name">${day}</span>
      <span class="day-date">${dayDate}</span>
      ${isToday ? '<span class="day-today-badge">TODAY</span>' : ""}
    `;

    // Meals grid
    const mealsEl = document.createElement("div");
    mealsEl.className = "day-meals";

    MEALS.forEach((meal) => {
      const cellEl = document.createElement("div");
      cellEl.className = `meal-cell ${meal.cls}`;
      cellEl.setAttribute("role", "cell");

      const inputId = `meal-${day.toLowerCase()}-${meal.id}`;
      cellEl.innerHTML = `
        <div class="meal-label">
          <span class="meal-label-icon" aria-hidden="true">${meal.icon}</span>
          ${meal.label}
        </div>
        <textarea
          id="${inputId}"
          class="meal-input"
          placeholder="${meal.placeholder}"
          rows="2"
          maxlength="${MAX_MEAL_LEN}"
          aria-label="${meal.label} for ${day}"
          data-day="${day}"
          data-meal="${meal.id}"
        ></textarea>
        <span class="char-count" id="cc-${inputId}" aria-hidden="true">0/${MAX_MEAL_LEN}</span>
      `;
      mealsEl.appendChild(cellEl);
    });

    rowEl.appendChild(headerEl);
    rowEl.appendChild(mealsEl);
    wrapper.appendChild(rowEl);

    // Wire up textarea events for this row
    MEALS.forEach((meal) => {
      const inputId = `meal-${day.toLowerCase()}-${meal.id}`;
      const textarea = document.getElementById(inputId);
      const charCount = document.getElementById(`cc-${inputId}`);

      textarea.addEventListener("input", () => {
        const val = textarea.value;
        mealState[day][meal.id] = val;

        // Char count display
        const len = val.length;
        charCount.textContent = `${len}/${MAX_MEAL_LEN}`;
        charCount.className = "char-count" +
          (len >= MAX_MEAL_LEN ? " at-limit" : len >= MAX_MEAL_LEN * 0.85 ? " near-limit" : "");

        // Auto-grow
        _autoGrow(textarea);
        _debounce(_saveToStorage, 800)();
      });

      textarea.addEventListener("keydown", (e) => {
        // Tab to next meal input
        if (e.key === "Tab" && !e.shiftKey) {
          // Default tab behavior is fine; just ensure no manual override needed
        }
      });
    });
  });
}

// ============================================================
// GROCERY CONTROLS
// ============================================================
function _wireGroceryControls() {
  const groceryTA = document.getElementById("groceryList");
  const groceryCount = document.getElementById("groceryCount");

  const updateCount = () => {
    const lines = groceryTA.value
      .split("\n")
      .filter(l => l.trim().length > 0);
    const count = lines.length;
    groceryCount.textContent = `${count} item${count !== 1 ? "s" : ""}`;
  };

  groceryTA.addEventListener("input", () => {
    updateCount();
    _debounce(_saveToStorage, 800)();
  });

  // Sort A-Z
  document.getElementById("btnSortGrocery").addEventListener("click", () => {
    const lines = groceryTA.value
      .split("\n")
      .filter(l => l.trim().length > 0)
      .sort((a, b) => a.trim().toLowerCase().localeCompare(b.trim().toLowerCase()));
    groceryTA.value = lines.join("\n");
    updateCount();
    _saveToStorage();
    showToast("✅ Grocery list sorted A–Z", "success");
  });

  // Clear grocery
  document.getElementById("btnClearGrocery").addEventListener("click", () => {
    if (!groceryTA.value.trim()) return;
    if (confirm("Clear the entire grocery list? This cannot be undone.")) {
      groceryTA.value = "";
      updateCount();
      _saveToStorage();
      showToast("🗑️ Grocery list cleared.", "info");
    }
  });

  updateCount();
}

// ============================================================
// ACTION BUTTONS
// ============================================================
function _wireActionButtons() {
  // Clear All Meals
  document.getElementById("btnClearAll").addEventListener("click", () => {
    const hasContent = DAYS.some(day =>
      MEALS.some(meal => {
        const el = document.getElementById(`meal-${day.toLowerCase()}-${meal.id}`);
        return el && el.value.trim().length > 0;
      })
    );
    if (!hasContent) return;
    if (confirm("Clear all meal entries for the week? This cannot be undone.")) {
      _clearAllMeals();
      showToast("🗑️ All meals cleared.", "info");
    }
  });

  // Load Sample Plan
  document.getElementById("btnLoadSample").addEventListener("click", () => {
    const hasContent = DAYS.some(day =>
      MEALS.some(meal => {
        const el = document.getElementById(`meal-${day.toLowerCase()}-${meal.id}`);
        return el && el.value.trim().length > 0;
      })
    );
    if (hasContent && !confirm("Loading the sample plan will replace your current entries. Continue?")) return;
    _loadSamplePlan();
    showToast("✨ Sample plan loaded! Feel free to customize it.", "success");
  });

  // Save to localStorage
  document.getElementById("btnSaveLocal").addEventListener("click", () => {
    _saveToStorage();
    showToast("💾 Progress saved to your browser!", "success");
  });

  // Download PDF
  document.getElementById("btnDownloadPdf").addEventListener("click", _handleDownloadPDF);
}

// ============================================================
// PDF GENERATION HANDLER
// ============================================================
async function _handleDownloadPDF() {
  const loadingOverlay = document.getElementById("loadingOverlay");

  // Validate: check if jsPDF is loaded
  if (typeof window.jspdf === "undefined") {
    showToast("⚠️ PDF library not loaded yet. Please wait and try again.", "error");
    return;
  }

  try {
    loadingOverlay.classList.remove("hidden");

    // Collect meal data from DOM
    const mealData = DAYS.map((day) => {
      const today = new Date();
      const todayName = DAYS[today.getDay() === 0 ? 6 : today.getDay() - 1];
      return {
        day,
        date: _getDayDate(day, today),
        isToday: day === todayName,
        breakfast: _getMealValue(day, "breakfast"),
        lunch:     _getMealValue(day, "lunch"),
        dinner:    _getMealValue(day, "dinner"),
      };
    });

    // Collect grocery items
    const groceryTA = document.getElementById("groceryList");
    const groceryItems = groceryTA.value
      .split("\n")
      .filter(l => l.trim().length > 0);

    // Week range label
    const weekRange = document.getElementById("weekDateRange").textContent;

    // Small delay to let the overlay render before heavy PDF work
    await new Promise(r => setTimeout(r, 50));

    generatePDF(mealData, groceryItems, weekRange);
    showToast("🎉 PDF downloaded successfully!", "success");

  } catch (err) {
    console.error("PDF generation error:", err);
    showToast("❌ PDF generation failed. Please try again.", "error");
  } finally {
    loadingOverlay.classList.add("hidden");
  }
}

// ============================================================
// PERSISTENCE (localStorage)
// ============================================================
function _saveToStorage() {
  try {
    const mealSnapshot = {};
    DAYS.forEach(day => {
      mealSnapshot[day] = {};
      MEALS.forEach(meal => {
        mealSnapshot[day][meal.id] = _getMealValue(day, meal.id);
      });
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mealSnapshot));

    const groceryTA = document.getElementById("groceryList");
    if (groceryTA) {
      localStorage.setItem(GROCERY_KEY, groceryTA.value);
    }
  } catch (e) {
    console.warn("localStorage save failed:", e);
  }
}

function _loadFromStorage() {
  try {
    // Meals
    const savedMeals = localStorage.getItem(STORAGE_KEY);
    if (savedMeals) {
      const data = JSON.parse(savedMeals);
      DAYS.forEach(day => {
        if (data[day]) {
          MEALS.forEach(meal => {
            const el = document.getElementById(`meal-${day.toLowerCase()}-${meal.id}`);
            if (el && data[day][meal.id]) {
              el.value = data[day][meal.id];
              mealState[day][meal.id] = data[day][meal.id];
              _autoGrow(el);
            }
          });
        }
      });
    }

    // Grocery
    const savedGrocery = localStorage.getItem(GROCERY_KEY);
    const groceryTA = document.getElementById("groceryList");
    if (savedGrocery && groceryTA) {
      groceryTA.value = savedGrocery;
      // Trigger count update
      const lines = groceryTA.value.split("\n").filter(l => l.trim().length > 0);
      document.getElementById("groceryCount").textContent =
        `${lines.length} item${lines.length !== 1 ? "s" : ""}`;
    }
  } catch (e) {
    console.warn("localStorage load failed:", e);
  }
}

// ============================================================
// SAMPLE PLAN LOADER
// ============================================================
function _loadSamplePlan() {
  DAYS.forEach(day => {
    MEALS.forEach(meal => {
      const el = document.getElementById(`meal-${day.toLowerCase()}-${meal.id}`);
      if (el && SAMPLE_PLAN[day]) {
        const val = SAMPLE_PLAN[day][meal.id] || "";
        el.value = val;
        mealState[day][meal.id] = val;
        _autoGrow(el);
        // Update char count
        const charCount = document.getElementById(`cc-meal-${day.toLowerCase()}-${meal.id}`);
        if (charCount) charCount.textContent = `${val.length}/${MAX_MEAL_LEN}`;
      }
    });
  });

  // Load sample grocery
  const groceryTA = document.getElementById("groceryList");
  if (groceryTA) {
    groceryTA.value = SAMPLE_GROCERY;
    const lines = groceryTA.value.split("\n").filter(l => l.trim().length > 0);
    document.getElementById("groceryCount").textContent =
      `${lines.length} item${lines.length !== 1 ? "s" : ""}`;
  }

  _saveToStorage();
}

// ============================================================
// CLEAR ALL MEALS
// ============================================================
function _clearAllMeals() {
  DAYS.forEach(day => {
    MEALS.forEach(meal => {
      const el = document.getElementById(`meal-${day.toLowerCase()}-${meal.id}`);
      if (el) {
        el.value = "";
        el.style.height = "auto";
        mealState[day][meal.id] = "";
        const charCount = document.getElementById(`cc-meal-${day.toLowerCase()}-${meal.id}`);
        if (charCount) {
          charCount.textContent = `0/${MAX_MEAL_LEN}`;
          charCount.className = "char-count";
        }
      }
    });
  });
  _saveToStorage();
}

// ============================================================
// HELPERS
// ============================================================
function _getMealValue(day, mealId) {
  const el = document.getElementById(`meal-${day.toLowerCase()}-${mealId}`);
  return el ? el.value.trim() : "";
}

function _autoGrow(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = Math.max(textarea.scrollHeight, 38) + "px";
}

function _getDayDate(dayName, referenceDate) {
  // Get this week's date for a given day name (Mon-based)
  const today = new Date(referenceDate);
  const currentDayIdx = today.getDay() === 0 ? 6 : today.getDay() - 1; // 0=Mon..6=Sun
  const targetIdx = DAYS.indexOf(dayName);
  const diff = targetIdx - currentDayIdx;
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + diff);
  return targetDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function _setWeekDateRange() {
  const today = new Date();
  // Find Monday of current week
  const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const opts = { month: "short", day: "numeric" };
  const range = `${monday.toLocaleDateString("en-US", opts)} – ${sunday.toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
  document.getElementById("weekDateRange").textContent = range;
}

function _setFooterYear() {
  const el = document.getElementById("footerYear");
  if (el) el.textContent = new Date().getFullYear();
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

  // Auto-dismiss
  const dismiss = () => {
    toast.classList.add("hiding");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  };
  setTimeout(dismiss, duration);

  // Click to dismiss early
  toast.addEventListener("click", dismiss);
}

// Make showToast globally available for auth.js
window.showToast = showToast;

// ============================================================
// DEBOUNCE UTILITY
// ============================================================
const _debounceTimers = {};
function _debounce(fn, delay) {
  const key = fn.name || "fn";
  return (...args) => {
    clearTimeout(_debounceTimers[key]);
    _debounceTimers[key] = setTimeout(() => fn(...args), delay);
  };
}
