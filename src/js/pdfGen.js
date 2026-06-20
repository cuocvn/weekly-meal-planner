// ============================================================
// pdfGen.js — PDF Generation Module (v2)
// Bilingual A4 PDF via jsPDF (UMD CDN build)
// Reads active language from lang.js t() function
// ============================================================

import { t, getCurrentLang } from "./lang.js";

/**
 * Generate and download a beautifully formatted A4 PDF.
 * @param {Array}  mealData     - Array of day objects: { day, date, isToday, breakfast, lunch, dinner }
 * @param {Array}  groceryItems - Array of non-empty grocery strings
 * @param {string} weekRange    - Human-readable week range label
 */
export function generatePDF(mealData, groceryItems, weekRange) {
  const { jsPDF } = window.jspdf;
  const lang = getCurrentLang();

  // ---- Document ----
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW  = doc.internal.pageSize.getWidth();   // 210
  const pageH  = doc.internal.pageSize.getHeight();  // 297
  const margin = 14;
  const usableW = pageW - margin * 2;
  let y = 0;

  // ---- Color palette (RGB tuples) ----
  const C = {
    accent:    [99,  102, 241],
    purple:    [139, 92,  246],
    green:     [16,  185, 129],
    amber:     [245, 158, 11 ],
    violet:    [124, 58,  237],
    emerald:   [5,   150, 105],
    dark:      [26,  29,  46 ],
    gray:      [100, 116, 139],
    lightGray: [226, 232, 240],
    accentLt:  [238, 242, 255],
    surface:   [250, 252, 255],
    white:     [255, 255, 255],
    greenLt:   [236, 253, 245],
    footerText:[200, 210, 255],
  };

  // ---- Helpers ----
  const fillColor   = (c) => doc.setFillColor(...c);
  const strokeColor = (c) => doc.setDrawColor(...c);
  const textColor   = (c) => doc.setTextColor(...c);
  const fontSize    = (n) => doc.setFontSize(n);
  const fontStyle   = (s) => doc.setFont("helvetica", s);

  const setFont = (size, style, color) => {
    fontSize(size);
    fontStyle(style || "normal");
    textColor(color || C.dark);
  };

  const rRect = (x, rY, w, h, r, mode = "F") =>
    doc.roundedRect(x, rY, w, h, r, r, mode);

  // ============================================================
  // HEADER — Page 1
  // ============================================================
  // Background gradient simulation (two-tone)
  fillColor(C.accent);
  doc.rect(0, 0, pageW, 44, "F");
  fillColor(C.purple);
  doc.rect(pageW - 44, 0, 44, 44, "F");

  // Decorative circle accent
  fillColor([80, 70, 220]);
  doc.ellipse(pageW - 10, 10, 18, 18, "F");

  // Title
  setFont(21, "bold", C.white);
  doc.text(`🥗 ${t("pdfTitle")}`, margin, 18);

  setFont(9, "normal", C.footerText);
  doc.text(`${t("weekOf")} ${weekRange}`, margin, 26);
  doc.text(t("pdfSubtitle"), margin, 32);
  doc.text(
    new Date().toLocaleDateString(lang === "vi" ? "vi-VN" : "en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    }),
    margin,
    38
  );

  y = 52;

  // ============================================================
  // SECTION TITLE — Meal Plan
  // ============================================================
  _drawSectionTitle(doc, margin, y, t("mealPlanTitle"), C.accent, rRect, setFont, strokeColor);
  y += 9;

  // ============================================================
  // MEAL TABLE
  // ============================================================
  const dayColW  = 30;
  const mealColW = (usableW - dayColW) / 3;
  const rowH     = 15;
  const hdrH     = 9;

  // Table header row
  fillColor(C.accent);
  rRect(margin, y, usableW, hdrH, 2);

  setFont(7, "bold", C.white);
  doc.text(lang === "vi" ? "NGÀY" : "DAY",   margin + 3, y + 6);
  doc.text(lang === "vi" ? "☀️ SÁNG"  : "☀️ BREAKFAST", margin + dayColW + 3, y + 6);
  doc.text(lang === "vi" ? "🌿 TRƯA"  : "🌿 LUNCH",     margin + dayColW + mealColW + 3,  y + 6);
  doc.text(lang === "vi" ? "🌙 TỐI"   : "🌙 DINNER",    margin + dayColW + mealColW * 2 + 3, y + 6);
  y += hdrH;

  mealData.forEach((item, idx) => {
    // New page check
    if (y + rowH > pageH - 16) {
      doc.addPage();
      _drawRunningHeader(doc, pageW, C, t, weekRange);
      y = 50;
    }

    const rowY  = y;
    const even  = idx % 2 === 0;

    // Row bg
    fillColor(item.isToday ? C.accentLt : even ? C.surface : C.white);
    rRect(margin, rowY, usableW, rowH, 0);

    // Row border
    strokeColor(C.lightGray);
    doc.setLineWidth(0.2);
    doc.rect(margin, rowY, usableW, rowH, "S");

    // Today left accent bar
    if (item.isToday) {
      fillColor(C.accent);
      doc.rect(margin, rowY, 2.5, rowH, "F");
    }

    // Day name
    setFont(7.5, "bold", C.dark);
    doc.text(item.day.slice(0, 3).toUpperCase(), margin + 4, rowY + 6);
    setFont(6, "normal", C.gray);
    if (item.date) doc.text(item.date, margin + 4, rowY + 11);

    // Column separators
    strokeColor(C.lightGray);
    doc.setLineWidth(0.2);
    [dayColW, dayColW + mealColW, dayColW + mealColW * 2].forEach((offset) => {
      doc.line(margin + offset, rowY, margin + offset, rowY + rowH);
    });

    // Meal text
    const renderMeal = (text, xBase) => {
      const val = text && text.trim() ? text.trim() : "—";
      const lines = doc.splitTextToSize(val, mealColW - 5);
      setFont(7, "normal", C.dark);
      doc.text(lines.slice(0, 2).join(" "), xBase + 3, rowY + 6, { maxWidth: mealColW - 5 });
    };
    renderMeal(item.breakfast, margin + dayColW);
    renderMeal(item.lunch,     margin + dayColW + mealColW);
    renderMeal(item.dinner,    margin + dayColW + mealColW * 2);

    y += rowH;
  });

  // ============================================================
  // GROCERY LIST SECTION
  // ============================================================
  y += 14;
  if (y + 50 > pageH - 16) {
    doc.addPage();
    _drawRunningHeader(doc, pageW, C, t, weekRange);
    y = 50;
  }

  _drawSectionTitle(doc, margin, y, t("pdfGroceryTitle"), C.green, rRect, setFont, strokeColor);
  y += 9;

  // Hint strip
  fillColor(C.greenLt);
  rRect(margin, y, usableW, 8.5, 2);
  setFont(7, "italic", C.emerald);
  doc.text(
    `${groceryItems.length} ${lang === "vi" ? "mặt hàng" : "item" + (groceryItems.length !== 1 ? "s" : "")} — ${t("pdfGroceryHint")}`,
    margin + 4,
    y + 5.8
  );
  y += 13;

  // Grocery items — 2 columns
  if (groceryItems.length === 0) {
    setFont(9, "italic", C.gray);
    doc.text(t("pdfNoGrocery"), margin + 4, y);
    y += 10;
  } else {
    const numCols  = 2;
    const colGap   = 8;
    const grocColW = (usableW - colGap) / numCols;
    const itemH    = 7.5;
    const numRows  = Math.ceil(groceryItems.length / numCols);

    groceryItems.forEach((item, idx) => {
      const col    = idx % numCols;
      const rowIdx = Math.floor(idx / numCols);
      const xPos   = margin + col * (grocColW + colGap);
      const yPos   = y + rowIdx * itemH;

      // Page overflow — only break on new row (col === 0)
      if (col === 0 && yPos + itemH > pageH - 16) {
        doc.addPage();
        _drawRunningHeader(doc, pageW, C, t, weekRange);
        // Recalculate positions after page break
        const rowsOnThisPage  = Math.floor((pageH - 66) / itemH);
        const rowsBefore       = rowIdx;
        const yOffset = rowsBefore * itemH - (pageH - 66 - itemH);
        y = 50 - yOffset;
      }

      const finalY = y + rowIdx * itemH;

      // Checkbox
      strokeColor(C.gray);
      fillColor(C.white);
      doc.setLineWidth(0.5);
      doc.roundedRect(xPos, finalY - 4.2, 4.5, 4.5, 0.8, 0.8, "FD");

      // Text
      const label = item.trim();
      const clipped = doc.splitTextToSize(label, grocColW - 11)[0];
      setFont(8, "normal", C.dark);
      doc.text(clipped || label, xPos + 6.5, finalY);
    });

    y += numRows * itemH + 6;
  }

  // ============================================================
  // PAGE FOOTER — all pages
  // ============================================================
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    fillColor(C.accent);
    doc.rect(0, pageH - 10, pageW, 10, "F");
    setFont(7, "normal", C.footerText);
    doc.text(
      `${t("pdfFooter")} | ${t("pdfPage")} ${p} ${t("pdfOf")} ${totalPages}`,
      pageW / 2,
      pageH - 3.5,
      { align: "center" }
    );
  }

  // ============================================================
  // SAVE
  // ============================================================
  const safe = weekRange.replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`meal-plan-${safe}.pdf`);
}

// ---- Private: section title with underline ----
function _drawSectionTitle(doc, margin, y, label, color, rRect, setFont, strokeColor) {
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...color);
  doc.text(label, margin, y);
  doc.setDrawColor(...color);
  doc.setLineWidth(0.5);
  doc.line(margin, y + 2, margin + Math.min(label.length * 4.2, 80), y + 2);
}

// ---- Private: running header on subsequent pages ----
function _drawRunningHeader(doc, pageW, C, t, weekRange) {
  doc.setFillColor(...C.accent);
  doc.rect(0, 0, pageW, 14, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(200, 210, 255);
  doc.text(`🥗 ${t("pdfTitle")} — ${weekRange} (${doc.internal.getCurrentPageInfo().pageNumber})`, 14, 9);
}
