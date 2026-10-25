const fs = require('fs');
const path = require('path');

const refHtmlPath = 'C:/Users/Yash Gaurav/.gemini/antigravity/brain/543423fd-f502-4f26-80e6-b8aaddce013f/.user_uploaded/media_1792887360160_1c8ee930.html';
const outMainPath = path.resolve(__dirname, '../src/main.js');

const html = fs.readFileSync(refHtmlPath, 'utf8');
const scriptStartToken = '<script>\n\'use strict\';';
const scriptStart = html.indexOf(scriptStartToken);
const scriptEnd = html.lastIndexOf('</script>');

if (scriptStart === -1 || scriptEnd === -1) {
  console.error('Failed to locate script block in reference HTML');
  process.exit(1);
}

let rawScript = html.slice(scriptStart + scriptStartToken.length, scriptEnd).trim();

// Remove the outer wrapping IIFE ending if present at the end
// Notice the script ended with:
// })();
// })();
// The first is for reveal(), the second is the closing of landing()
// We can check the end

console.log('Raw script length:', rawScript.length);

// 1. Deduplicate ENGINE_DB
const dbMatch = rawScript.match(/const ENGINE_DB=\{([\s\S]*?)\n\};/);
if (dbMatch) {
  const content = dbMatch[1];
  const entries = content.split('\n').filter(l => l.trim().length > 0);
  const map = new Map();
  entries.forEach(entry => {
    const keyMatch = entry.trim().match(/^([A-Za-z0-9_]+):/);
    if (keyMatch) {
      let cleanEntry = entry.trim();
      if (!cleanEntry.endsWith(',')) cleanEntry += ',';
      map.set(keyMatch[1], '  ' + cleanEntry);
    }
  });
  const mapArr = Array.from(map.values());
  // Remove comma from the last item
  if (mapArr.length > 0) {
    mapArr[mapArr.length - 1] = mapArr[mapArr.length - 1].replace(/,$/, '');
  }
  const newDb = 'const ENGINE_DB={\n' + mapArr.join('\n') + '\n};';
  rawScript = rawScript.replace(/const ENGINE_DB=\{[\s\S]*?\n\};/, newDb);
  console.log(`Deduplicated ENGINE_DB: reduced ${entries.length} -> ${map.size} unique powerplants.`);
}

// 2. Fix outputEncoding and texture encoding for Three.js r186
rawScript = rawScript.replaceAll('outputEncoding=THREE.sRGBEncoding', 'outputColorSpace=THREE.SRGBColorSpace');
rawScript = rawScript.replaceAll('outputEncoding = THREE.sRGBEncoding', 'outputColorSpace = THREE.SRGBColorSpace');
rawScript = rawScript.replaceAll('tex.encoding=THREE.sRGBEncoding', 'tex.colorSpace=THREE.SRGBColorSpace');
rawScript = rawScript.replaceAll('new THREE.OrbitControls(', 'new OrbitControls(');

// 3. Safeguard frame(noCam) so aircraft NEVER disappears on click or navigation
rawScript = rawScript.replace(
  'const b=boxOf(obj);if(SB.on&&SB.AF)',
  'if(!obj) obj = (S.AF && S.AF.root) || curRoot();\n  const b=boxOf(obj);if(SB.on&&SB.AF)'
);

// 4. Update simTick to drive procedural audio in real time
rawScript = rawScript.replace(
  'SIM.subs.forEach(f=>f(SIM.u));}',
  `SIM.subs.forEach(f=>f(SIM.u));
  if (window.audio && window.S && window.S.ac) {
    const st = window.S.simSt || (window.S.ac ? simStateLite(window.S.ac, SIM.u) : null);
    const n1 = SIM.tlaOn ? SIM.n1Live : (st && st.n1 ? st.n1[0] : 0);
    const run = st ? st.engRun : true;
    const isProp = window.S.ac ? (window.S.ac.e.type === 'TP' || window.S.ac.e.type === 'PS') : false;
    window.audio.updateEngine(n1, run, isProp);
  }}`
);

rawScript = rawScript.replace(
  'const S={ac:null,AF:null',
  'window.S = S = {ac:null,AF:null'
);

// Defensive checks for splash element
rawScript = rawScript.replace(
  "$('spMsg').textContent=",
  "if ($('spMsg')) $('spMsg').textContent="
);
rawScript = rawScript.replace(
  "setTimeout(()=>$('splash').classList.add('out')",
  "if ($('splash')) setTimeout(()=>$('splash').classList.add('out')"
);

// 5. Build procedural audio engine code
const audioCode = `
/* =====================================================================
   PROCEDURAL COCKPIT AUDIO SYNTHESIZER (Web Audio API)
   ===================================================================== */
class CockpitAudio {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.n1Osc = null;
    this.n1Osc2 = null;
    this.n1Filter = null;
    this.n1Gain = null;
    this.noiseNode = null;
    this.noiseFilter = null;
    this.noiseGain = null;
    this.muted = localStorage.getItem('aerodissect.muted') === 'true';
    this.initialized = false;
    this.lastPtuTime = 0;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.35, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.initEngineSound();
      this.initialized = true;
      this.updateUI();
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  initEngineSound() {
    if (!this.ctx) return;
    try {
      // 1. Turbofan Spool / Rotor Whine (Harmonically tuned oscillators)
      this.n1Osc = this.ctx.createOscillator();
      this.n1Osc.type = 'sine';
      this.n1Osc.frequency.setValueAtTime(140, this.ctx.currentTime);

      this.n1Osc2 = this.ctx.createOscillator();
      this.n1Osc2.type = 'triangle';
      this.n1Osc2.frequency.setValueAtTime(280, this.ctx.currentTime);

      this.n1Filter = this.ctx.createBiquadFilter();
      this.n1Filter.type = 'bandpass';
      this.n1Filter.Q.setValueAtTime(3.8, this.ctx.currentTime);
      this.n1Filter.frequency.setValueAtTime(280, this.ctx.currentTime);

      this.n1Gain = this.ctx.createGain();
      this.n1Gain.gain.setValueAtTime(0.001, this.ctx.currentTime);

      const oscMix = this.ctx.createGain();
      oscMix.gain.setValueAtTime(0.5, this.ctx.currentTime);
      this.n1Osc.connect(oscMix);
      this.n1Osc2.connect(oscMix);
      oscMix.connect(this.n1Filter);
      this.n1Filter.connect(this.n1Gain);
      this.n1Gain.connect(this.masterGain);

      this.n1Osc.start();
      this.n1Osc2.start();

      // 2. Core Combustion Rumble (Pink/Brown noise generation)
      const bufSize = Math.max(256, this.ctx.sampleRate * 2);
      const noiseBuf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.055;
        b6 = white * 0.115926;
      }
      this.noiseNode = this.ctx.createBufferSource();
      this.noiseNode.buffer = noiseBuf;
      this.noiseNode.loop = true;

      this.noiseFilter = this.ctx.createBiquadFilter();
      this.noiseFilter.type = 'lowpass';
      this.noiseFilter.frequency.setValueAtTime(140, this.ctx.currentTime);

      this.noiseGain = this.ctx.createGain();
      this.noiseGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

      this.noiseNode.connect(this.noiseFilter);
      this.noiseFilter.connect(this.noiseGain);
      this.noiseGain.connect(this.masterGain);

      this.noiseNode.start();
    } catch (e) {
      console.warn('[Audio] Engine sound initialization notice:', e);
    }
  }

  updateEngine(n1Pct, running = true, isProp = false) {
    if (!this.initialized || !this.ctx || this.muted) return;
    try {
      const now = this.ctx.currentTime;
      const n1 = Math.max(0, Math.min(105, n1Pct || 0));
      const runGain = running ? (0.18 + (n1 / 100) * 0.82) : 0;

      // Pitch mapping: 20% N1 (idle) -> ~160Hz, 100% N1 (TOGA) -> ~920Hz
      const baseFreq = isProp ? 75 + n1 * 3.8 : 110 + Math.pow(n1 / 100, 1.35) * 820;
      if (this.n1Osc && this.n1Osc.frequency) {
        this.n1Osc.frequency.setTargetAtTime(baseFreq, now, 0.12);
      }
      if (this.n1Osc2 && this.n1Osc2.frequency) {
        this.n1Osc2.frequency.setTargetAtTime(baseFreq * (isProp ? 2.0 : 1.5), now, 0.12);
      }
      if (this.n1Filter && this.n1Filter.frequency) {
        this.n1Filter.frequency.setTargetAtTime(baseFreq * 1.45, now, 0.12);
      }
      if (this.n1Gain && this.n1Gain.gain) {
        this.n1Gain.gain.setTargetAtTime(running ? 0.07 * runGain : 0.0001, now, 0.18);
      }
      if (this.noiseFilter && this.noiseFilter.frequency) {
        const rumbleCutoff = 90 + (n1 / 100) * 320;
        this.noiseFilter.frequency.setTargetAtTime(rumbleCutoff, now, 0.18);
      }
      if (this.noiseGain && this.noiseGain.gain) {
        this.noiseGain.gain.setTargetAtTime(running ? 0.12 * runGain : 0.0001, now, 0.22);
      }
    } catch (e) {}
  }

  playClick() {
    this.ensureContext();
    if (!this.ctx || this.muted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1600, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.022);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.022);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.025);
    } catch (e) {}
  }

  playPtuBark() {
    this.ensureContext();
    if (!this.ctx || this.muted) return;
    try {
      const now = this.ctx.currentTime;
      if (now - this.lastPtuTime < 2.0) return;
      this.lastPtuTime = now;
      for (let i = 0; i < 4; i++) {
        const t = now + i * 0.13;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130 + Math.random() * 20, t);
        osc.frequency.linearRampToValueAtTime(250, t + 0.05);
        osc.frequency.linearRampToValueAtTime(80, t + 0.10);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.10);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.11);
      }
    } catch (e) {}
  }

  toggleMute() {
    this.ensureContext();
    this.muted = !this.muted;
    try { localStorage.setItem('aerodissect.muted', String(this.muted)); } catch (e) {}
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.35, this.ctx.currentTime, 0.08);
    }
    if (!this.muted) {
      this.playClick();
    }
    this.updateUI();
    return this.muted;
  }

  updateUI() {
    const sndBtns = [document.getElementById('soundBtn'), document.getElementById('lSoundBtn')];
    sndBtns.forEach(btn => {
      if (btn) {
        btn.setAttribute('aria-pressed', String(!this.muted));
        btn.classList.toggle('muted', this.muted);
        btn.title = this.muted ? 'Unmute Procedural Audio (M)' : 'Mute Procedural Audio (M)';
      }
    });
  }
}
const audio = new CockpitAudio();
window.audio = audio;
`;

// 6. Build Theme Switcher Code
const themeCode = `
/* =====================================================================
   DUAL THEME ENGINE: Dark Avionics Glass Cockpit vs Light CAD Drafting
   ===================================================================== */
function applyTheme(theme, save = true) {
  if (save) {
    try { localStorage.setItem('aerodissect.theme', theme); } catch (e) {}
  }
  const isDark = theme === 'dark';
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }

  // Update Three.js scene and lighting to match UI theme
  const bgCol = isDark ? 0x07090e : 0xeeede9;
  const fogCol = bgCol;
  const gridCol1 = isDark ? 0x1c2433 : 0xc9c6bd;
  const gridCol2 = isDark ? 0x111622 : 0xdcdad3;

  if (typeof scene !== 'undefined' && scene) {
    scene.background.setHex(bgCol);
    if (scene.fog) scene.fog.color.setHex(fogCol);
  }
  if (typeof grid !== 'undefined' && grid && grid.material) {
    grid.material.color.setHex(gridCol1);
  }
  if (typeof key !== 'undefined' && key) {
    key.intensity = isDark ? 1.05 : 0.95;
  }
  if (typeof rim !== 'undefined' && rim) {
    rim.color.setHex(isDark ? 0x00e5ff : 0xa9c6ff);
    rim.intensity = isDark ? 0.75 : 0.55;
  }
  if (typeof fill !== 'undefined' && fill) {
    fill.color.setHex(isDark ? 0xf59e0b : 0xffdcae);
    fill.intensity = isDark ? 0.45 : 0.3;
  }

  const themeBtn = document.getElementById('themeBtn');
  if (themeBtn) {
    themeBtn.setAttribute('aria-pressed', String(isDark));
    themeBtn.title = isDark ? 'Switch to Light CAD Drafting Mode' : 'Switch to Dark Avionics Glass Cockpit';
  }
}
window.applyTheme = applyTheme;
`;

// 7. Assemble full main.js
const header = `import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Polyfill globals for debug and window inspection
window.THREE = THREE;
window.OrbitControls = OrbitControls;
let S = null;

${audioCode}
${themeCode}
`;

// At the end of the file, initialize audio unlock, theme listener, and keyboard shortcuts
const footer = `
/* ---------- Global Sound & Theme Initialization ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('aerodissect.theme') || 'dark';
  applyTheme(savedTheme, false);

  const themeBtn = document.getElementById('themeBtn');
  if (themeBtn) {
    themeBtn.onclick = () => {
      const cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      const next = cur === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      audio.playClick();
    };
  }

  const soundBtn = document.getElementById('soundBtn');
  if (soundBtn) {
    soundBtn.onclick = () => audio.toggleMute();
  }
  const lSoundBtn = document.getElementById('lSoundBtn');
  if (lSoundBtn) {
    lSoundBtn.onclick = () => audio.toggleMute();
  }

  // Audio gesture unlock
  const unlockAudio = () => {
    audio.ensureContext();
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('pointerdown', unlockAudio);
  };
  window.addEventListener('click', unlockAudio);
  window.addEventListener('keydown', unlockAudio);
  window.addEventListener('pointerdown', unlockAudio);

  // Global tactile keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'm' || e.key === 'M') {
      audio.toggleMute();
    } else if (e.key === 't' || e.key === 'T') {
      const cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      applyTheme(cur === 'dark' ? 'light' : 'dark');
      audio.playClick();
    }
  });

  // Sound triggers on UI buttons and detents
  document.querySelectorAll('button, [role="button"], .det').forEach(el => {
    el.addEventListener('click', () => {
      if (audio && !el.id.includes('sound')) audio.playClick();
    });
  });

  // Initial theme sync with 3D scene after render loop starts
  setTimeout(() => applyTheme(savedTheme, false), 150);

  // Expose core navigation and workbench functions for global accessibility
  window.go = go;
  window.setAircraft = setAircraft;
  window.ascend = ascend;
  window.dissect = dissect;
  window.setMode = setMode;
  window.setUnits = setUnits;
  window.setExplode = setExplode;
  window.setXray = setXray;
});
`;

const finalScript = header + '\n' + rawScript + '\n' + footer;

fs.writeFileSync(outMainPath, finalScript, 'utf8');
console.log('Successfully written main.js! File size:', finalScript.length, 'bytes.');
