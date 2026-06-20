// ============================================================
// pdfGen.js — Bilingual PDF Generation Module (v3)
// Uses jsPDF loaded via CDN (window.jspdf UMD global)
// Language-aware: reads getCurrentLang() at call time
// ============================================================

import { t, getCurrentLang } from "./lang.js";

/**
 * Generate and auto-download a formatted A4 PDF.
 *
 * @param {Array<{day:string, date:string, isToday:boolean,
 *                breakfast:string, lunch:string, dinner:string}>} mealData
 * @param {string[]} groceryItems  — non-empty grocery lines
 * @param {string}   weekRange     — human-readable week label
 */
export function generatePDF(mealData, groceryItems, weekRange) {
  // Safety check: jsPDF must be loaded via CDN script tag
  if (!window.jspdf || !window.jspdf.jsPDF) {
    console.error("[pdfGen.js] jsPDF is not loaded. Check CDN script tag.");
    throw new Error("jsPDF not available");
  }

  const { jsPDF } = window.jspdf;
  const lang      = getCurrentLang();

  // ---- Document setup ----
  const doc    = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW  = doc.internal.pageSize.getWidth();   // 210 mm
  const pageH  = doc.internal.pageSize.getHeight();  // 297 mm
  const margin  = 14;
  const usableW = pageW - margin * 2;
  let y = 0;

  // ---- Color palette (plain RGB arrays) ----
  const C = {
    accent:   [99,  102, 241],
    purple:   [139, 92,  246],
    green:    [16,  185, 129],
    emerald:  [5,   150, 105],
    amber:    [245, 158, 11 ],
    dark:     [26,  29,  46 ],
    gray:     [100, 116, 139],
    border:   [226, 232, 240],
    accentLt: [238, 242, 255],
    surface:  [250, 252, 255],
    greenLt:  [236, 253, 245],
    white:    [255, 255, 255],
    dimText:  [200, 210, 255],
  };

  // ---- Tiny helpers ----
  const fc = (c)          => doc.setFillColor(...c);
  const dc = (c)          => doc.setDrawColor(...c);
  const tc = (c)          => doc.setTextColor(...c);
  const fs = (n)          => doc.setFontSize(n);
  const fw = (s)          => doc.setFont("helvetica", s);
  const setStyle = (size, weight, color) => { fs(size); fw(weight || "normal"); tc(color || C.dark); };

  const rr = (x, ry, w, h, r, mode = "F") =>
    doc.roundedRect(x, ry, w, h, r, r, mode);

  // ============================================================
  // PAGE 1 — BRANDED HEADER
  // ============================================================
  fc(C.accent);
  doc.rect(0, 0, pageW, 44, "F");
  fc(C.purple);
  doc.rect(pageW - 44, 0, 44, 44, "F");

  // Decorative circle
  fc([80, 65, 220]);
  doc.ellipse(pageW - 8, 8, 16, 16, "F");

  setStyle(21, "bold", C.white);
  doc.text(`\uD83E\uDD57 ${t("pdfTitle")}`, margin, 18);

  setStyle(9, "normal", C.dimText);
  doc.text(`${t("weekOf")} ${weekRange}`, margin, 26);
  doc.text(t("pdfSubtitle"), margin, 32);
  doc.text(
    new Date().toLocaleDateString(lang === "vi" ? "vi-VN" : "en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    }),
    margin, 38
  );

  y = 52;

  // ============================================================
  // SECTION TITLE — Meal Plan
  // ============================================================
  _sectionTitle(doc, margin, y, t("pdfTitle"), C.accent, setStyle);
  y += 10;

  // ============================================================
  // MEAL TABLE
  // ============================================================
  const dayColW  = 30;
  const mealColW = (usableW - dayColW) / 3;
  const hdrH     = 9;
  const rowH     = 15;

  // Table header
  fc(C.accent);
  rr(margin, y, usableW, hdrH, 2);
  setStyle(7.5, "bold", C.white);
  doc.text(lang === "vi" ? "NGÀY"   : "DAY",       margin + 3,                          y + 6);
  doc.text(lang === "vi" ? "☀️ SÁNG" : "☀️ BREAKFAST", margin + dayColW + 3,               y + 6);
  doc.text(lang === "vi" ? "🌿 TRƯA" : "🌿 LUNCH",     margin + dayColW + mealColW + 3,     y + 6);
  doc.text(lang === "vi" ? "🌙 TỐI"  : "🌙 DINNER",    margin + dayColW + mealColW * 2 + 3, y + 6);
  y += hdrH;

  // Table rows
  mealData.forEach((item, idx) => {
    // Page overflow guard
    if (y + rowH > pageH - 16) {
      doc.addPage();
      _runningHeader(doc, pageW, C, t, weekRange, setStyle);
      y = 48;
    }

    const even = idx % 2 === 0;
    fc(item.isToday ? C.accentLt : even ? C.surface : C.white);
    rr(margin, y, usableW, rowH, 0);

    dc(C.border);
    doc.setLineWidth(0.2);
    doc.rect(margin, y, usableW, rowH, "S");

    if (item.isToday) {
      fc(C.accent);
      doc.rect(margin, y, 2.5, rowH, "F");
    }

    // Day label
    const dayStr  = (item.day || "").slice(0, 3).toUpperCase();
    setStyle(7.5, "bold", C.dark);
    doc.text(dayStr, margin + 4, y + 6);
    if (item.date) {
      setStyle(6, "normal", C.gray);
      doc.text(String(item.date), margin + 4, y + 11);
    }

    // Column separator lines
    dc(C.border);
    doc.setLineWidth(0.2);
    [dayColW, dayColW + mealColW, dayColW + mealColW * 2].forEach((offset) => {
      doc.line(margin + offset, y, margin + offset, y + rowH);
    });

    // Meal cell text
    const renderCell = (text, xBase) => {
      const val   = (text && text.trim()) ? text.trim() : "—";
      const lines = doc.splitTextToSize(val, mealColW - 5);
      setStyle(7, "normal", C.dark);
      doc.text(lines.slice(0, 2).join(" "), xBase + 3, y + 6, { maxWidth: mealColW - 5 });
    };
    renderCell(item.breakfast, margin + dayColW);
    renderCell(item.lunch,     margin + dayColW + mealColW);
    renderCell(item.dinner,    margin + dayColW + mealColW * 2);

    y += rowH;
  });

  // ============================================================
  // GROCERY LIST SECTION
  // ============================================================
  y += 14;

  if (y + 50 > pageH - 16) {
    doc.addPage();
    _runningHeader(doc, pageW, C, t, weekRange, setStyle);
    y = 48;
  }

  _sectionTitle(doc, margin, y, t("pdfGroceryTitle"), C.green, setStyle);
  y += 10;

  // Hint strip
  fc(C.greenLt);
  rr(margin, y, usableW, 8.5, 2);
  setStyle(7, "italic", C.emerald);
  const itemWord  = lang === "vi"
    ? `${groceryItems.length} mặt hàng`
    : `${groceryItems.length} item${groceryItems.length !== 1 ? "s" : ""}`;
  doc.text(`${itemWord} — ${t("pdfGroceryHint")}`, margin + 4, y + 5.8);
  y += 13;

  // Items — 2 columns with checkboxes
  if (groceryItems.length === 0) {
    setStyle(9, "italic", C.gray);
    doc.text(t("pdfNoGrocery"), margin + 4, y);
    y += 10;
  } else {
    const numCols  = 2;
    const colGap   = 8;
    const grocColW = (usableW - colGap) / numCols;
    const itemH    = 7.5;
    let   baseY    = y;

    groceryItems.forEach((item, idx) => {
      const col    = idx % numCols;
      const rowIdx = Math.floor(idx / numCols);
      const xPos   = margin + col * (grocColW + colGap);
      const yPos   = baseY + rowIdx * itemH;

      // New page when column 0 overflows
      if (col === 0 && yPos + itemH > pageH - 16) {
        doc.addPage();
        _runningHeader(doc, pageW, C, t, weekRange, setStyle);
        baseY = 48 - rowIdx * itemH;
      }

      const finalY = baseY + rowIdx * itemH;

      // Checkbox square
      dc(C.gray);
      fc(C.white);
      doc.setLineWidth(0.5);
      doc.roundedRect(xPos, finalY - 4.2, 4.5, 4.5, 0.8, 0.8, "FD");

      // Item text (single line, clipped)
      const clipped = doc.splitTextToSize((item || "").trim(), grocColW - 11)[0] || "";
      setStyle(8, "normal", C.dark);
      doc.text(clipped, xPos + 6.5, finalY);
    });

    const numRows = Math.ceil(groceryItems.length / numCols);
    y = baseY + numRows * itemH + 6;
  }

  // ============================================================
  // FOOTER on every page
  // ============================================================
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    fc(C.accent);
    doc.rect(0, pageH - 10, pageW, 10, "F");
    setStyle(7, "normal", C.dimText);
    doc.text(
      `${t("pdfFooter")}  |  ${t("pdfPage")} ${p} ${t("pdfOf")} ${totalPages}`,
      pageW / 2,
      pageH - 3.5,
      { align: "center" }
    );
  }

  // ============================================================
  // SAVE FILE
  // ============================================================
  const safeRange = weekRange.replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`meal-plan-${safeRange}.pdf`);
}

// ---- Private: draw a section title with coloured underline ----
function _sectionTitle(doc, margin, y, label, color, setStyle) {
  setStyle(13, "bold", color);
  doc.text(label, margin, y);
  doc.setDrawColor(...color);
  doc.setLineWidth(0.5);
  // Cap underline at 80 mm or full label width estimate
  const lineW = Math.min(label.length * 3.8, 90);
  doc.line(margin, y + 2, margin + lineW, y + 2);
}

// ---- Private: minimal running header on continuation pages ----
function _runningHeader(doc, pageW, C, t, weekRange, setStyle) {
  doc.setFillColor(...C.accent);
  doc.rect(0, 0, pageW, 14, "F");
  setStyle(8, "bold", [200, 210, 255]);
  doc.text(
    `\uD83E\uDD57 ${t("pdfTitle")} — ${weekRange}`,
    14, 9
  );
}
