# Weekly Meal Planner & Grocery List Generator

A clean, fast, and beautiful weekly meal planning tool with PDF export and Google/Facebook authentication.

## 🌐 Live Tool
Plan your 7-day meals and download a beautifully formatted PDF grocery list — all client-side, no server needed.

## ✨ Features
- 📅 **7-Day Meal Planner** — Enter Breakfast, Lunch & Dinner for each day
- 🛒 **Grocery List Generator** — Add ingredients line-by-line
- 📄 **PDF Export** — Beautifully formatted A4 PDF with checkboxes (powered by jsPDF)
- 🔐 **Firebase Auth** — Google & Facebook sign-in
- 💾 **Auto-Save** — Progress saved to browser localStorage
- 📱 **Fully Responsive** — Works on desktop, tablet, and mobile
- 🎨 **Google AdSense Ready** — Strategic ad placement containers

## 📁 Project Structure

```
weekly-meal-planner/
├── public/
│   └── index.html          # Main HTML file
├── src/
│   ├── css/
│   │   └── style.css       # Complete design system
│   ├── js/
│   │   ├── app.js          # Main app controller & UI generator
│   │   ├── auth.js         # Firebase Google & Facebook auth
│   │   └── pdfGen.js       # jsPDF formatting & export
│   └── config.js           # Firebase credentials
├── .gitignore
└── README.md
```

## 🚀 Quick Start

Since this is a pure static site (HTML/CSS/JS), simply open `public/index.html` in a browser.

**For local development with live reload:**
```bash
# Option 1: Use VS Code Live Server extension (recommended)
# Right-click index.html → "Open with Live Server"

# Option 2: Python HTTP server
python -m http.server 8080
# Then open http://localhost:8080/public/

# Option 3: Node.js serve
npx serve .
# Then open http://localhost:3000/public/
```

## 🔐 Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Enable **Google** and **Facebook** authentication providers
3. Add your domain to **Authorized Domains** (Settings > Authentication > Authorized Domains)

For Facebook login:
- Create a Facebook App at [developers.facebook.com](https://developers.facebook.com)
- Add the OAuth redirect URI from Firebase Console

## 💰 Google AdSense Setup

Replace the AdSense placeholder comments in `public/index.html`:
- **Top Banner**: `div.ad-banner-top` → 728×90 leaderboard
- **Sidebar**: `div.ad-sidebar` → 300×250 medium rectangle  
- **Bottom Banner**: `div.ad-banner-bottom` → 728×90 leaderboard

## 🛠️ Tech Stack
- **HTML5** — Semantic markup with ARIA accessibility
- **Vanilla CSS** — Custom design system with CSS variables
- **JavaScript ES6+** — Modular, clean code
- **Firebase v10** — Authentication (Google & Facebook)
- **jsPDF v2.5** — Client-side PDF generation

## 📄 License
MIT License — free to use and modify.
