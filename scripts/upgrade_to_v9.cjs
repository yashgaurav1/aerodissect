const fs = require('fs');
const path = require('path');

const v9Path = 'C:/Users/Yash Gaurav/.gemini/antigravity/brain/543423fd-f502-4f26-80e6-b8aaddce013f/.user_uploaded/media_1792887360160_1c8ee930.html';
const rawHtml = fs.readFileSync(v9Path, 'utf8');

// 1. EXTRACT CSS
const p1 = rawHtml.indexOf('<style>', 500);
const p2 = rawHtml.indexOf('</style>', p1);
let v9Css = rawHtml.slice(p1 + 7, p2).trim();

// Remove the default :root block from v9Css so our dual-theme root can take precedence
v9Css = v9Css.replace(
  /:root\{[\s\S]*?color-scheme:light;\s*\}/,
  ''
);

const themeCss = `/* =====================================================================
   AERODISSECT WORKBENCH v9 — DUAL THEME AVIATION DESIGN SYSTEM
   Default: Obsidian Cockpit + Aviation Yellow (#fbbc19) & Amber
   Light CAD: Technical Drafting Paper
   ===================================================================== */
:root {
  /* Default Dark Avionics Theme */
  --bg: #07090e;
  --chrome: #0a0d14;
  --panel: #0e121a;
  --panel2: #141924;
  --hover: #19202e;
  --line: #1c2433;
  --line2: #283347;
  --fg: #f1f5f9;
  --dim: #94a3b8;
  --faint: #64748b;
  --cyan: #fbbc19;
  --sel: #2a2210;
  --selfg: #ffd45a;
  --gold: #f59e0b;
  --hot: #ef4444;
  --ok: #10b981;
  --warn: #f59e0b;
  --ink: #ffffff;
  --vp: #04060a;
  --vp2: #090c13;
  --f-ui: 'Geist', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --f-mono: 'Geist Mono', 'JetBrains Mono', ui-monospace, Menlo, monospace;
  --f-disp: var(--f-ui);
  --f-body: var(--f-ui);
  --f-hero: var(--f-ui);
  --t1: 13px;
  --t2: 12px;
  --t3: 11px;
  --r: 8px;
  --r2: 6px;
  color-scheme: dark;
}

/* Light CAD Mode (User Toggleable via #themeBtn) */
:root[data-theme="light"], body.theme-light {
  --bg: #f4f4f5;
  --chrome: #fbfbfb;
  --panel: #ffffff;
  --panel2: #f6f6f7;
  --hover: #f0f0f2;
  --line: #e6e6e9;
  --line2: #d6d6db;
  --fg: #111111;
  --dim: #5b5d66;
  --faint: #9a9ca5;
  --cyan: #b57f00;
  --sel: #fff3cc;
  --selfg: #6a4a00;
  --gold: #d9620b;
  --hot: #d4351c;
  --ok: #15924a;
  --warn: #c78100;
  --ink: #ffffff;
  --vp: #e9ebee;
  --vp2: #f6f7f8;
  color-scheme: light;
}

/* Sound & Theme Button Custom Styles */
.l-sound-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: rgba(255,250,235,.08);
  border: 1px solid var(--ln2);
  color: var(--tx)!important;
  cursor: pointer;
  transition: all .2s;
  backdrop-filter: blur(10px);
}
.l-sound-btn:hover {
  background: rgba(255,250,235,.15);
  color: var(--am)!important;
  transform: translateY(-1px);
}
.l-sound-btn.muted svg {
  opacity: 0.45;
}
.si-snd, .si-thm {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.ib.sm.muted .si-snd {
  opacity: 0.4;
}
`;

const fullCss = themeCss + '\n' + v9Css;
fs.writeFileSync(path.resolve(__dirname, '../src/style.css'), fullCss, 'utf8');
console.log('Saved src/style.css! Bytes:', fullCss.length);

// 2. EXTRACT HTML BODY
const landingStart = rawHtml.indexOf('<div id="landing">');
const scriptTag = rawHtml.indexOf('<script src="https://cdnjs.cloudflare.com');
let bodyHtml = rawHtml.slice(landingStart, scriptTag).trim();

// Insert sound button in landing nav bar
bodyHtml = bodyHtml.replace(
  '<button type="button" class="l-cta" data-open="">',
  `<button type="button" class="l-sound-btn" id="lSoundBtn" aria-label="Toggle procedural audio" title="Toggle audio">
      <svg viewBox="0 0 20 20" class="si-snd"><use href="#i-sound"/></svg>
    </button>
    <button type="button" class="l-cta" data-open="">`
);

// Insert theme & sound buttons in workbench header
bodyHtml = bodyHtml.replace(
  '<div class="cmpfold">\n        <button class="tbb" id="cmpBtn"',
  `<!-- Theme Toggle: Dark Avionics vs Light CAD -->
      <button class="ib sm" id="themeBtn" type="button" aria-label="Toggle dark/light theme" title="Toggle Dark/Light Theme">
        <svg class="si-thm"><use href="#i-theme"/></svg>
      </button>

      <!-- Sound Toggle -->
      <button class="ib sm" id="soundBtn" type="button" aria-label="Toggle procedural cockpit audio" title="Toggle Audio (M)">
        <svg class="si-snd"><use href="#i-sound"/></svg>
      </button>

      <div class="cmpfold">
        <button class="tbb" id="cmpBtn"`
);

// Insert extra SVG symbols for theme and sound
const extraSymbols = `  <symbol id="i-sound" viewBox="0 0 20 20">
    <path d="M9.5 4.5L5.5 8H2.5v4h3l4 3.5v-11z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M13.5 7a4 4 0 010 6M15.5 5a7 7 0 010 10" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
  </symbol>
  <symbol id="i-theme" viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
    <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
  </symbol>
</svg>`;

bodyHtml = bodyHtml.replace('</svg>', extraSymbols);

const indexHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>Global Aircraft Dissection Encyclopedia // AeroDissect Workbench</title>
  <meta name="description" content="AeroDissect Workbench: an airframe engineering viewer for 74 aircraft with ATA-coded dissection, live flight simulation, glass cockpit avionics and parametric CAD inspection.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap">
  <script>
    // Initial routing state: site (overview landing) vs lab (CAD workbench)
    document.documentElement.classList.add(location.hash === '#lab' ? 'lab' : 'site');
    // Initial theme: dark avionics baseline or saved preference
    const savedTheme = localStorage.getItem('aerodissect.theme') || 'dark';
    if (savedTheme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  </script>
</head>
<body>
${bodyHtml}

  <script type="module" src="/src/main.js"></script>
</body>
</html>
`;

fs.writeFileSync(path.resolve(__dirname, '../index.html'), indexHtml, 'utf8');
console.log('Saved index.html! Bytes:', indexHtml.length);
