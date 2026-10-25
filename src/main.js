import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Polyfill globals for debug and window inspection
window.THREE = THREE;
window.OrbitControls = OrbitControls;
let S = null;


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


/* =====================================================================
   GLOBAL_FLEET_DB — compact tabular registry. Every aircraft row drives
   the parametric synthesizer: airframe silhouette, propulsion, gear,
   cockpit, fuselage and empennage are all derived from these columns.
   ===================================================================== */
const CATS={AB:'Airbus Commercial',BO:'Boeing Commercial',RG:'Regional Jets & Turboprops',EA:'Next-Gen Global & Eastern',SH:'Supersonic, Tri-Jets & Historic',BG:'Business & General Aviation',MI:'Military Transports, Fighters & Stealth'};

/* ENGINE_DB: [name, OEM, type, rating (kN thrust | shp | hp), bypass ratio, OPR, fan/prop blades,
   fan/prop diameter m, 'LPC/HPC/HPT/LPT' stages (piston: cylinders), N1 rpm (prop/fan), N2 rpm (core), EGT limit °C, flags]
   type: TF turbofan · TFI internal turbofan · TP turboprop · PS piston · TJAB afterburning turbojet · TFAB afterburning turbofan · TRJ turbo-ramjet
   flags: G geared fan · 3S three-spool */
const ENGINE_DB={
  PW1500G:['PW1500G GTF','Pratt & Whitney','TF',103,12,40,18,1.85,'3/8/2/3',3300,22300,1054,'G'],
  CFM56_5B:['CFM56-5B4','CFM International','TF',120,5.7,32.6,36,1.73,'4/9/1/4',5000,15183,950,''],
  LEAP1A:['LEAP-1A','CFM International','TF',143,11,40,18,1.98,'3/10/2/7',3900,19391,1060,''],
  LEAP1B:['LEAP-1B','CFM International','TF',130,9,40,18,1.76,'3/10/2/5',4586,20171,1060,''],
  LEAP1C:['LEAP-1C','CFM International','TF',130,11,40,18,1.98,'3/10/2/7',3900,19391,1060,''],
  CFM56_7B:['CFM56-7B27','CFM International','TF',121,5.1,32.8,24,1.55,'3/9/1/4',5175,14460,950,''],
  CF6_80C2:['CF6-80C2','GE Aerospace','TF',262,5.1,31,38,2.36,'4/14/2/5',3854,10400,960,''],
  CF6_50:['CF6-50C2','GE Aerospace','TF',234,4.3,30,38,2.19,'3/14/2/4',3600,10000,940,''],
  CF6_80D:['CF6-80C2D1F','GE Aerospace','TF',273,5.1,31,38,2.36,'4/14/2/5',3854,10400,960,''],
  F138:['F138-GE-100 (CF6-80C2L1F)','GE Aerospace','TF',225,5.3,31,38,2.36,'4/14/2/5',3854,10400,960,''],
  T700:['Trent 772B','Rolls-Royce','TF',316,5,36,26,2.47,'8/6/1/4',3300,10611,900,'3S'],
  T7000:['Trent 7000-72','Rolls-Royce','TF',320,10,50,20,2.84,'8/6/1/6',2800,12000,950,'3S'],
  T500:['Trent 556','Rolls-Royce','TF',249,7.5,36,26,2.47,'8/6/1/5',3200,10611,920,'3S'],
  TXWB84:['Trent XWB-84','Rolls-Royce','TF',374,9.3,50,22,3.0,'8/6/1/6',2700,12600,1000,'3S'],
  TXWB97:['Trent XWB-97','Rolls-Royce','TF',431,9.3,50,22,3.0,'8/6/1/6',2800,12800,1050,'3S'],
  T900:['Trent 970','Rolls-Royce','TF',334,8.7,39,24,2.95,'8/6/1/5',2900,12200,950,'3S'],
  T1000:['Trent 1000 TEN','Rolls-Royce','TF',340,10,50,20,2.85,'8/6/1/6',2700,13400,1000,'3S'],
  JT3D:['JT3D-3B','Pratt & Whitney','TF',80,1.4,13,35,1.35,'6/7/1/3',6800,10000,600,''],
  BR715:['BR715-C1-30','Rolls-Royce Deutschland','TF',95,4.6,32,24,1.47,'2/10/2/3',5600,15800,850,''],
  JT8D:['JT8D-17','Pratt & Whitney','TF',71,1.0,17,27,1.0,'6/7/1/3',8600,12250,620,''],
  PW4056:['PW4056','Pratt & Whitney','TF',252,4.85,30,38,2.38,'4/11/2/4',3800,10450,930,''],
  GENX2B:['GEnx-2B67','GE Aerospace','TF',296,8,44,18,2.67,'3/10/2/6',2600,11800,1000,''],
  RB211_535:['RB211-535E4','Rolls-Royce','TF',192,4.3,28.5,22,1.88,'6/6/1/3',4500,10611,880,'3S'],
  GE90_110:['GE90-110B1','GE Aerospace','TF',489,9,42,22,3.25,'4/9/2/6',2550,10850,1050,''],
  GE90_115:['GE90-115B','GE Aerospace','TF',513,9,42,22,3.25,'4/9/2/6',2550,10850,1060,''],
  GE9X:['GE9X-105B1A','GE Aerospace','TF',467,10,60,16,3.4,'3/11/2/6',2400,12000,1100,''],
  GENX1B:['GEnx-1B74/75','GE Aerospace','TF',330,9.3,43,18,2.82,'4/10/2/7',2560,12200,1000,''],
  AE3007:['AE 3007A1','Rolls-Royce','TF',33,5,18,24,0.98,'0/14/2/3',7800,16000,900,''],
  CF34_8E:['CF34-8E5','GE Aerospace','TF',64,5,28,24,1.32,'0/10/2/4',7400,17820,900,''],
  CF34_8C:['CF34-8C5','GE Aerospace','TF',64.5,5,28,24,1.32,'0/10/2/4',7400,17820,900,''],
  CF34_10A:['CF34-10A','GE Aerospace','TF',75,5.4,29,24,1.35,'3/9/1/4',5400,17800,920,''],
  PW1900G:['PW1900G GTF','Pratt & Whitney','TF',100,12,40,18,1.85,'3/8/2/3',3300,22300,1054,'G'],
  CJ2000:['CJ-2000AX (projected)','AECC Commercial Aircraft Engine','TF',350,10,50,20,2.9,'3/10/2/7',2600,12000,1000,''],
  D18T:['D-18T Series 3','Ivchenko-Progress / Motor Sich','TF',229.5,5.7,27.5,33,2.33,'7/7/1/4',3450,8000,900,'3S'],
  PS90A1:['PS-90A1','UEC Aviadvigatel','TF',171.6,4.6,35.5,33,1.9,'2/13/2/4',4600,12500,920,''],
  D30KU154:['D-30KU-154','Soloviev (Aviadvigatel)','TF',104,2.4,20,29,1.46,'3/11/2/4',5000,11600,800,''],
  SAM146:['SaM146-1S18','PowerJet (Safran / UEC Saturn)','TF',77,4.4,28,24,1.22,'3/6/1/3',6100,16300,900,''],
  PD14:['PD-14','UEC Aviadvigatel','TF',137,8.5,41,18,1.9,'3/8/2/6',4500,17000,1000,''],
  RB211_22:['RB211-22B','Rolls-Royce','TF',187,5,25,33,2.15,'7/6/1/3',3900,10000,880,'3S'],
  BR725:['BR725 A1-12','Rolls-Royce Deutschland','TF',75.2,4.2,35,24,1.27,'0/10/2/3',6200,15500,900,''],
  PEARL700:['Pearl 700','Rolls-Royce Deutschland','TF',82,5.5,40,24,1.32,'0/10/2/4',6000,16000,900,''],
  PASSPORT:['Passport 20-19BB1A','GE Aerospace','TF',82.3,5.6,45,18,1.32,'3/10/2/4',5800,18000,950,''],
  PW307D:['PW307D','Pratt & Whitney Canada','TF',30,4.5,20,22,0.9,'1/5/2/3',9200,30000,850,''],
  FJ44_4A:['FJ44-4A-QPM','Williams International','TF',15.2,3.3,24,22,0.6,'1/1/1/2',15000,40000,850,''],
  HTF7700L:['HTF7700L','Honeywell Aerospace','TF',34,4.4,25,22,0.87,'0/5/2/3',9000,24000,900,''],
  F117:['F117-PW-100','Pratt & Whitney','TF',180,5.9,30,36,2.15,'4/12/2/5',4100,12300,900,''],
  F118:['F118-GE-100','GE Aerospace','TFI',77,0.76,35,0,1.18,'3/9/1/2',7900,14000,1000,''],
  PW127M:['PW127M','Pratt & Whitney Canada','TP',2750,0,15.6,6,3.93,'1/1/1/2',1200,30000,800,''],
  PW150A:['PW150A','Pratt & Whitney Canada','TP',5071,0,18,6,4.11,'3/1/1/2',1020,30000,850,''],
  AE2100:['AE 2100D3','Rolls-Royce','TP',4637,0,16.6,6,4.11,'0/14/2/2',1020,14200,850,''],
  PT6E:['PT6E-67XP','Pratt & Whitney Canada','TP',1200,0,10,5,2.67,'4/1/1/1',1700,37500,820,''],
  PT6A60:['PT6A-60A','Pratt & Whitney Canada','TP',1050,0,9,4,2.67,'3/1/1/1',1700,37500,820,''],
  R1830:['R-1830-92 Twin Wasp','Pratt & Whitney','PS',1200,0,6.7,3,3.53,'14',2700,0,0,'radial'],
  IO360:['IO-360-L2A','Lycoming','PS',180,0,8.5,2,1.93,'4',2700,0,0,'flat'],
  OLY593:['Olympus 593 Mk 610','Rolls-Royce / Snecma','TJAB',169,0,15.5,0,1.21,'7/7/1/1',6500,8800,1170,''],
  NK144:['NK-144A','Kuznetsov','TFAB',196,0.6,15,0,1.5,'5/12/1/2',5800,8800,1100,''],
  F119:['F119-PW-100','Pratt & Whitney','TFAB',156,0.3,35,0,1.15,'3/6/1/1',13000,17000,1300,''],
  F135:['F135-PW-100','Pratt & Whitney','TFAB',191,0.57,28,0,1.17,'3/6/1/2',11000,16000,1300,''],
  M88:['M88-2','Safran Aircraft Engines','TFAB',75,0.3,24.5,0,0.7,'3/6/1/1',14000,17500,1250,''],
  EJ200:['EJ200','Eurojet Turbo GmbH','TFAB',90,0.4,26,0,0.74,'3/5/1/1',13000,17500,1250,''],
  AL41F1:['AL-41F1 (izdeliye 117)','UEC Saturn','TFAB',147,0.6,23,0,0.93,'4/9/1/1',10500,15000,1250,''],
  PW1100G:['PW1100G-JM GTF','Pratt & Whitney','TF',147,12.5,46,20,2.06,'3/8/2/3',3280,22000,1083,'G'],
  V2500:['V2527-A5','International Aero Engines','TF',118,4.6,32.8,22,1.6,'4/10/2/5',5650,14950,950,''],
  CF6_80E1:['CF6-80E1A4','GE Aerospace','TF',300,5.3,32.4,34,2.44,'4/14/2/5',3835,10400,975,''],
  PW4168:['PW4168A','Pratt & Whitney','TF',302,5.1,32,38,2.54,'5/11/2/5',3600,10450,980,''],
  GP7270:['GP7270','Engine Alliance (GE / P&W)','TF',332,8.7,43.9,24,2.95,'5/9/2/6',2850,11000,1000,''],
  RB211_524:['RB211-524G/H','Rolls-Royce','TF',264,4.3,33,24,2.19,'7/6/1/3',3900,10611,900,'3S'],
  PW2040:['PW2040','Pratt & Whitney','TF',185,6,31.2,36,1.99,'4/12/2/5',4300,11500,950,''],
  PW4462:['PW4462','Pratt & Whitney','TF',276,4.8,32,38,2.38,'4/11/2/4',3800,10450,950,''],
  J58:['J58 (JT11D-20)','Pratt & Whitney','TRJ',151,0,8.8,0,1.37,'0/9/2/0',7400,7400,1100,''],
  PW4090:['PW4090','Pratt & Whitney','TF',400,6.4,38.6,38,2.84,'6/11/2/7',2850,10600,1000,''],
  T800:['Trent 895','Rolls-Royce','TF',415,6.2,40,26,2.8,'8/6/1/5',3300,10611,990,'3S'],
  CF6_80C2B:['CF6-80C2B6F','GE Aerospace','TF',267,5.1,31.5,38,2.36,'4/14/2/5',3854,10400,960,''],
  PW4060:['PW4060','Pratt & Whitney','TF',267,4.85,31,38,2.38,'4/11/2/4',3800,10450,930,'']
};
function engObj(k){const e=ENGINE_DB[k],st=e[8].split('/').map(Number);return {key:k,name:e[0],oem:e[1],type:e[2],thrust:e[3],bpr:e[4],opr:e[5],blades:e[6],dia:e[7],
  st:st.length===4?{lpc:st[0],hpc:st[1],hpt:st[2],lpt:st[3]}:{cyl:st[0]},n1:e[9],n2:e[10],egt:e[11],flags:e[12]};}

/* GLOBAL_FLEET_DB columns:
   id | name | manufacturer | category | length m | span m | height m | fuselage width m | wing (low/high/fighter/cdelta/ogee/dd/chine/fwing) |
   LE sweep ° | engine key | engine count | layout (wing/rear/rear3/wing3t/wing3s/prop/nose/int/concorde/box/buried/nacelle) |
   tail (conv/T/cruc/endplate/twin/canted/fin/sr/none) | wingtip | gear 'nose|main per side|center' | controls (side/yoke/stick) |
   deck | MTOW t | range km | Mmo | seats/payload | first flight | flags | status */
const GLOBAL_FLEET_DB=[
 ['a220','Airbus A220-300','Airbus','AB',38.7,35.1,11.5,3.51,'low',27,'PW1500G',2,'wing','conv','winglet','2|2|','side','single',70.9,6300,0.82,'130–160',2015,'composite',''],
 ['a306','Airbus A300-600R','Airbus','AB',54.1,44.84,16.5,5.64,'low',28,'CF6_80C2',2,'wing','conv','fence','2|4|','yoke','single',171.7,7500,0.82,'266',1987,'analog',''],
 ['a310','Airbus A310-300','Airbus','AB',46.66,43.9,15.8,5.64,'low',28,'CF6_80C2',2,'wing','conv','fence','2|4|','yoke','single',164,9600,0.84,'220–240',1985,'',''],
 ['a318','Airbus A318 Elite','Airbus','AB',31.44,34.1,12.56,3.95,'low',27,'CFM56_5B',2,'wing','conv','fence','2|2|','side','bizjet',68,7800,0.82,'14–18 (VIP)',2002,'',''],
 ['a319','Airbus A319','Airbus','AB',33.84,34.1,11.76,3.95,'low',27,'CFM56_5B',2,'wing','conv','fence','2|2|','side','single',75.5,6900,0.82,'124–156',1995,'',''],
 ['a320','Airbus A320-200 (ceo)','Airbus','AB',37.57,34.1,11.76,3.95,'low',27,'CFM56_5B',2,'wing','conv','fence','2|2|','side','single',78,6150,0.82,'150–180',1987,'',''],
 ['a20n','Airbus A320neo','Airbus','AB',37.57,35.8,11.76,3.95,'low',27,'LEAP1A',2,'wing','conv','sharklet','2|2|','side','single',79,6300,0.82,'150–194',2014,'',''],
 ['a21n','Airbus A321neo','Airbus','AB',44.51,35.8,11.76,3.95,'low',27,'LEAP1A',2,'wing','conv','sharklet','2|2|','side','single',97,7400,0.82,'180–244',2016,'',''],
 ['a21x','Airbus A321XLR','Airbus','AB',44.51,35.8,11.76,3.95,'low',27,'LEAP1A',2,'wing','conv','sharklet','2|2|','side','single',101,8700,0.82,'180–220',2022,'',''],
 ['a333','Airbus A330-300','Airbus','AB',63.66,60.3,16.79,5.64,'low',31,'T700',2,'wing','conv','winglet','2|4|','side','single',242,11750,0.86,'277–440',1992,'',''],
 ['a339','Airbus A330-900neo','Airbus','AB',63.66,64,16.79,5.64,'low',31,'T7000',2,'wing','conv','sharklet','2|4|','side','single',251,13300,0.86,'260–440',2017,'',''],
 ['a346','Airbus A340-600','Airbus','AB',75.36,63.45,17.22,5.64,'low',31,'T500',4,'wing','conv','winglet','2|4|4','side','single',380,14450,0.86,'326–440',2001,'',''],
 ['a359','Airbus A350-900','Airbus','AB',66.8,64.75,17.05,5.96,'low',32,'TXWB84',2,'wing','conv','blended','2|4|','side','single',283,15000,0.89,'300–350',2013,'5k composite',''],
 ['a35k','Airbus A350-1000','Airbus','AB',73.79,64.75,17.08,5.96,'low',32,'TXWB97',2,'wing','conv','blended','2|6|','side','single',319,16100,0.89,'350–410',2016,'5k composite',''],
 ['a388','Airbus A380-800','Airbus','AB',72.72,79.75,24.09,7.14,'low',33.5,'T900',4,'wing','conv','fence','2|4,6|','side','double',575,15000,0.89,'575–853',2005,'5k','Production ended 2021'],
 ['blxl','Airbus BelugaXL (A330-743L)','Airbus','AB',63.1,60.3,18.9,5.64,'low',31,'T700',2,'wing','endplate','winglet','2|4|','side','beluga',227,4000,0.69,'51 t payload',2018,'',''],

 ['b703','Boeing 707-320B','Boeing','BO',46.61,44.42,12.93,3.76,'low',35,'JT3D',4,'wing','conv','none','2|4|','yoke','single',151.3,9300,0.88,'141–189',1962,'analog','Retired'],
 ['b712','Boeing 717-200','Boeing','BO',37.8,28.45,8.92,3.34,'low',24.5,'BR715',2,'rear','T','none','2|2|','yoke','single',54.9,3820,0.77,'106–134',1998,'',''],
 ['b722','Boeing 727-200','Boeing','BO',46.69,32.92,10.36,3.76,'low',32,'JT8D',3,'rear3','T','none','2|2|','yoke','single',95,4400,0.9,'134–189',1967,'analog','Retired (passenger)'],
 ['b738','Boeing 737-800 (NG)','Boeing','BO',39.47,35.79,12.55,3.76,'low',25,'CFM56_7B',2,'wing','conv','winglet','2|2|','yoke','single',79,5765,0.82,'162–189',1997,'',''],
 ['b38m','Boeing 737 MAX 8','Boeing','BO',39.52,35.92,12.29,3.76,'low',25,'LEAP1B',2,'wing','conv','split','2|2|','yoke','single',82.2,6570,0.82,'162–210',2016,'',''],
 ['b3xm','Boeing 737 MAX 10','Boeing','BO',43.8,35.92,12.29,3.76,'low',25,'LEAP1B',2,'wing','conv','split','2|2|','yoke','single',89.8,5740,0.82,'188–230',2021,'','Certification'],
 ['b744','Boeing 747-400','Boeing','BO',70.66,64.44,19.41,6.5,'low',37.5,'PW4056',4,'wing','conv','winglet','2|4,4|','yoke','hump',396.9,13450,0.855,'416–660',1988,'',''],
 ['b748','Boeing 747-8 Intercontinental','Boeing','BO',76.25,68.4,19.35,6.5,'low',37.5,'GENX2B',4,'wing','conv','raked','2|4,4|','yoke','hump8',447.7,14320,0.855,'410–467',2011,'chev','Production ended 2023'],
 ['b752','Boeing 757-200','Boeing','BO',47.32,38.05,13.56,3.76,'low',25,'RB211_535',2,'wing','conv','none','2|4|','yoke','single',115.7,7250,0.8,'200–239',1982,'',''],
 ['b763','Boeing 767-300ER','Boeing','BO',54.94,47.57,15.85,5.03,'low',31.5,'CF6_80C2',2,'wing','conv','none','2|4|','yoke','single',186.9,11070,0.8,'218–269',1986,'',''],
 ['b77l','Boeing 777-200LR','Boeing','BO',63.73,64.8,18.6,6.2,'low',31.6,'GE90_110',2,'wing','conv','raked','2|6|','yoke','single',347.8,15843,0.89,'301–317',2005,'',''],
 ['b77w','Boeing 777-300ER','Boeing','BO',73.86,64.8,18.5,6.2,'low',31.6,'GE90_115',2,'wing','conv','raked','2|6|','yoke','single',351.5,13650,0.89,'365–396',2003,'',''],
 ['b779','Boeing 777-9 (777X)','Boeing','BO',76.72,71.75,19.68,6.2,'low',32,'GE9X',2,'wing','conv','folding','2|6|','yoke','single',351.5,13500,0.89,'426',2020,'composite','Flight test'],
 ['b788','Boeing 787-8 Dreamliner','Boeing','BO',56.72,60.12,16.92,5.77,'low',32.2,'GENX1B',2,'wing','conv','raked','2|4|','yoke','single',227.9,13530,0.85,'248',2009,'5k composite chev bleedless',''],
 ['b789','Boeing 787-9 Dreamliner','Boeing','BO',62.81,60.12,17.02,5.77,'low',32.2,'T1000',2,'wing','conv','raked','2|4|','yoke','single',254,14010,0.85,'296',2013,'5k composite chev bleedless',''],
 ['b78x','Boeing 787-10 Dreamliner','Boeing','BO',68.28,60.12,17.02,5.77,'low',32.2,'GENX1B',2,'wing','conv','raked','2|4|','yoke','single',254,11730,0.85,'336',2017,'5k composite chev bleedless',''],

 ['e145','Embraer ERJ-145','Embraer','RG',29.87,20.04,6.76,2.28,'low',22.7,'AE3007',2,'rear','T','winglet','2|2|','yoke','single',22,2870,0.78,'50',1995,'',''],
 ['e175','Embraer E175','Embraer','RG',31.68,26,9.86,3.01,'low',23.5,'CF34_8E',2,'wing','conv','winglet','2|2|','yoke','single',38.8,4070,0.82,'76–88',2003,'',''],
 ['e290','Embraer E190-E2','Embraer','RG',36.25,33.72,10.95,3.01,'low',25,'PW1900G',2,'wing','conv','raked','2|2|','yoke','single',56.4,5300,0.82,'97–114',2016,'',''],
 ['e295','Embraer E195-E2','Embraer','RG',41.5,35.12,10.9,3.01,'low',25,'PW1900G',2,'wing','conv','raked','2|2|','yoke','single',62.5,4800,0.82,'120–146',2017,'',''],
 ['crj9','Bombardier CRJ-900','Bombardier','RG',36.2,24.85,7.51,2.69,'low',26.9,'CF34_8C',2,'rear','T','winglet','2|2|','yoke','single',38.3,2870,0.82,'76–90',2001,'','Production ended 2020'],
 ['dh8d','De Havilland Dash 8 Q400','De Havilland Canada','RG',32.83,28.42,8.34,2.69,'high',3,'PW150A',2,'prop','T','none','2|2|','yoke','single',30.5,2040,0.6,'68–90',1998,'nacgear',''],
 ['at46','ATR 42-600','ATR','RG',22.67,24.57,7.59,2.57,'high',3,'PW127M',2,'prop','T','none','2|2|','yoke','single',18.6,1300,0.5,'48',2010,'',''],
 ['at76','ATR 72-600','ATR','RG',27.17,27.05,7.65,2.57,'high',3,'PW127M',2,'prop','T','none','2|2|','yoke','single',23,1400,0.5,'70–78',2009,'',''],

 ['c909','COMAC C909 (ARJ21-700)','COMAC','EA',33.46,27.29,8.44,3.14,'low',25,'CF34_10A',2,'rear','T','winglet','2|2|','yoke','single',43.5,3700,0.78,'78–90',2008,'',''],
 ['c919','COMAC C919','COMAC','EA',38.9,35.8,11.95,3.96,'low',26,'LEAP1C',2,'wing','conv','winglet','2|2|','side','single',72.5,5555,0.785,'158–192',2017,'',''],
 ['c929','COMAC C929 (projected)','COMAC','EA',63.8,63.8,17.9,5.9,'low',32,'CJ2000',2,'wing','conv','raked','2|4|','side','single',245,12000,0.85,'~280',0,'composite','In development'],
 ['a124','Antonov An-124 Ruslan','Antonov','EA',68.96,73.3,21.08,7.3,'high',32,'D18T',4,'wing','conv','none','4|2,2,2,2,2|','yoke','visor',405,5400,0.75,'150 t payload',1982,'analog',''],
 ['a225','Antonov An-225 Mriya','Antonov','EA',84,88.4,18.1,7.3,'high',32,'D18T',6,'wing','twin','none','4|2,2,2,2,2,2,2|','yoke','visor',640,15400,0.75,'250 t payload',1988,'analog','Destroyed 2022'],
 ['il96','Ilyushin Il-96-400','Ilyushin','EA',63.94,60.11,15.72,6.08,'low',30,'PS90A1',4,'wing','conv','winglet','2|4|4','yoke','single',270,10000,0.84,'315–436',2007,'',''],
 ['t154','Tupolev Tu-154M','Tupolev','EA',47.9,37.55,11.4,3.8,'low',35,'D30KU154',3,'rear3','T','none','2|6|','yoke','single',104,5200,0.86,'164–180',1982,'analog','Retired (passenger)'],
 ['ssj1','Sukhoi Superjet 100','Sukhoi','EA',29.94,27.8,10.28,3.24,'low',25,'SAM146',2,'wing','conv','winglet','2|2|','side','single',49.45,3048,0.81,'87–108',2008,'',''],
 ['mc21','Yakovlev MC-21-310','Yakovlev (Irkut)','EA',42.25,35.9,11.5,4.06,'low',27,'PD14',2,'wing','conv','none','2|2|','side','single',79.25,6000,0.8,'163–211',2017,'composite','Certification'],

 ['conc','BAC / Aérospatiale Concorde','BAC / Aérospatiale','SH',61.66,25.6,12.2,2.88,'ogee',0,'OLY593',4,'concorde','fin','none','2|4|','yoke','ss',185,7222,2.04,'92–128',1969,'droop analog','Retired 2003'],
 ['t144','Tupolev Tu-144','Tupolev','SH',65.7,28.8,12.5,3.4,'dd',0,'NK144',4,'box','fin','none','2|8|','yoke','ss',207,6500,2.15,'140',1968,'droop moustache analog','Retired'],
 ['dc10','McDonnell Douglas DC-10-30','McDonnell Douglas','SH',55.5,50.4,17.7,6.02,'low',35,'CF6_50',3,'wing3t','conv','none','2|4|2','yoke','single',263,10010,0.88,'250–380',1972,'analog','Retired (passenger)'],
 ['md11','McDonnell Douglas MD-11','McDonnell Douglas','SH',61.6,51.97,17.6,6.02,'low',35,'CF6_80D',3,'wing3t','conv','winglet','2|4|2','yoke','single',286,12670,0.88,'298–410',1990,'','Freighter fleet'],
 ['l101','Lockheed L-1011 TriStar','Lockheed','SH',54.17,47.35,16.87,5.97,'low',35,'RB211_22',3,'wing3s','conv','none','2|4|','yoke','single',195,4600,0.86,'256–400',1970,'analog','Retired'],
 ['dc3','Douglas DC-3','Douglas','SH',19.7,28.96,5.16,2.35,'low',15,'R1830',2,'prop','conv','none','0|1|','yoke','single',11.43,2400,0.25,'21–32',1935,'td nacgear analog','Historic'],

 ['g650','Gulfstream G650ER','Gulfstream','BG',30.41,30.36,7.82,2.6,'low',36,'BR725',2,'rear','T','winglet','2|2|','yoke','bizjet',47.6,13890,0.925,'up to 19',2009,'',''],
 ['g700','Gulfstream G700','Gulfstream','BG',33.48,31.39,7.82,2.6,'low',36,'PEARL700',2,'rear','T','winglet','2|2|','side','bizjet',48.2,13890,0.935,'up to 19',2020,'',''],
 ['gl75','Bombardier Global 7500','Bombardier','BG',33.8,31.7,8.2,2.69,'low',35,'PASSPORT',2,'rear','T','winglet','2|2|','side','bizjet',52.2,14260,0.925,'up to 19',2016,'',''],
 ['fa8x','Dassault Falcon 8X','Dassault','BG',24.46,26.29,7.94,2.5,'low',34,'PW307D',3,'rear3','cruc','winglet','2|2|','side','bizjet',33.1,11945,0.9,'up to 16',2015,'',''],
 ['pc12','Pilatus PC-12 NGX','Pilatus','BG',14.4,16.28,4.26,1.6,'low',5,'PT6E',1,'nose','T','winglet','1|1|','yoke','ga',4.74,3417,0.45,'up to 9',2019,'',''],
 ['pc24','Pilatus PC-24','Pilatus','BG',16.85,17,5.4,1.82,'low',14,'FJ44_4A',2,'rear','T','none','1|1|','yoke','bizjet',8.3,3700,0.74,'6–10',2015,'',''],
 ['b350','Beechcraft King Air 350i','Beechcraft (Textron)','BG',14.22,17.65,4.37,1.6,'low',4,'PT6A60',2,'prop','T','winglet','1|2|','yoke','ga',6.8,3345,0.5,'up to 11',1988,'nacgear',''],
 ['c700','Cessna Citation Longitude','Cessna (Textron)','BG',22.3,20.65,5.92,2.0,'low',28,'HTF7700L',2,'rear','T','winglet','2|2|','yoke','bizjet',17.97,6482,0.84,'up to 12',2016,'',''],
 ['c172','Cessna 172 Skyhawk','Cessna (Textron)','BG',8.28,11,2.72,1.1,'high',0,'IO360',1,'nose','conv','none','1|1|','yoke','ga',1.16,1185,0.17,'4',1955,'strut analog',''],

 ['c130','Lockheed C-130J Super Hercules','Lockheed Martin','MI',29.79,40.41,11.84,4.3,'high',3,'AE2100',4,'prop','conv','none','2|1,1|','yoke','cargo',74.4,3300,0.59,'19 t payload',1996,'ramp',''],
 ['c17','Boeing C-17 Globemaster III','Boeing','MI',53.04,51.75,16.79,6.85,'high',25,'F117',4,'wing','T','winglet','2|3,3|','stick','cargo',265.4,4480,0.77,'77.5 t payload',1991,'ramp',''],
 ['c5m','Lockheed C-5M Super Galaxy','Lockheed Martin','MI',75.31,67.89,19.84,7.0,'high',25,'F138',4,'wing','T','none','4|6,6|','yoke','visor',381,4440,0.77,'129 t payload',1968,'ramp',''],
 ['f22','Lockheed Martin F-22 Raptor','Lockheed Martin','MI',18.92,13.56,5.08,3.0,'fighter',42,'F119',2,'int','canted','none','1|1|','side','fighter',38,2960,2.25,'1 crew',1997,'wbay tvc side',''],
 ['f35','Lockheed Martin F-35A Lightning II','Lockheed Martin','MI',15.7,10.7,4.38,2.6,'fighter',34,'F135',1,'int','canted','none','1|1|','side','fighter',31.75,2200,1.6,'1 crew',2006,'wbay side',''],
 ['rafl','Dassault Rafale C','Dassault','MI',15.27,10.9,5.34,2.2,'cdelta',48,'M88',2,'int','fin','none','2|1|','side','fighter',24.5,3700,1.8,'1 crew',1986,'canard side',''],
 ['ef2k','Eurofighter Typhoon','Eurofighter','MI',15.96,10.95,5.28,2.4,'cdelta',53,'EJ200',2,'int','fin','none','1|1|','stick','fighter',23.5,2900,2.0,'1 crew',1994,'canard chin',''],
 ['su57','Sukhoi Su-57','Sukhoi','MI',20.1,14.1,4.6,3.2,'fighter',48,'AL41F1',2,'int','canted','none','2|1|','stick','fighter',35,3500,2.0,'1 crew',2010,'wbay levcon tvc under',''],
 ['b2','Northrop Grumman B-2 Spirit','Northrop Grumman','MI',21,52.4,5.18,3.0,'fwing',33,'F118',4,'buried','none','none','2|4|','stick','fwing',170.6,11100,0.95,'2 crew',1989,'wbay',''],
 ['sr71','Lockheed SR-71 Blackbird','Lockheed','MI',32.74,16.94,5.64,1.7,'chine',52,'J58',2,'nacelle','sr','none','2|3|','stick','ss',78,5400,3.3,'2 crew',1964,'spike analog','Retired 1999']
];

const RADARS={f22:'AN/APG-77 AESA',f35:'AN/APG-81 AESA',rafl:'RBE2-AA AESA',ef2k:'CAPTOR-E AESA',su57:'N036 Byelka AESA',b2:'AN/APQ-181 LPI',sr71:'Nose sensor bay (ASARS-1)',c17:'AN/APS-133',c5m:'Honeywell RDR-4000',c130:'AN/APN-241'};

function parseAircraft(r){
  const o={};FLEET_COLS.forEach((k,i)=>o[k]=r[i]);
  const g=o.gear.split('|');
  o.gear={nose:+g[0],main:g[1]?g[1].split(',').filter(Boolean).map(Number):[],center:g[2]?g[2].split(',').filter(Boolean).map(Number):[]};
  o.flags=new Set(o.flags.split(' ').filter(Boolean));
  const e=ENGINE_DB[o.eng];
  const st=e[8].split('/').map(Number);
  o.e={key:o.eng,name:e[0],oem:e[1],type:e[2],thrust:e[3],bpr:e[4],opr:e[5],blades:e[6],dia:e[7],
       st:st.length===4?{lpc:st[0],hpc:st[1],hpt:st[2],lpt:st[3]}:{cyl:st[0]},n1:e[9],n2:e[10],egt:e[11],flags:e[12]};
  o.mtowKg=o.mtow*1000;
  return o;
}
const FLEET_COLS=['id','name','mfr','cat','L','S','H','D','wing','sweep','eng','nEng','layout','tail','tip','gear','ctl','deck','mtow','range','mach','pax','first','flags','status'];
const FLEET=GLOBAL_FLEET_DB.map(parseAircraft);
const FLEET_BY_ID=Object.fromEntries(FLEET.map(a=>[a.id,a]));
/* =====================================================================
   AIRFRAME CONFIGURATION — powerplant option, wingtip device, cabin,
   finish and takeoff weight. Variants are re-parsed from the fleet row,
   so every downstream synthesizer sees a coherent aircraft.
   ===================================================================== */
const ENGINE_ALT={a319:['CFM56_5B','V2500'],a320:['CFM56_5B','V2500'],a318:['CFM56_5B','PW1500G'],a20n:['LEAP1A','PW1100G'],a21n:['LEAP1A','PW1100G'],a21x:['LEAP1A','PW1100G'],
  a306:['CF6_80C2','PW4056'],a310:['CF6_80C2','PW4056'],a333:['T700','CF6_80E1','PW4168'],a388:['T900','GP7270'],b744:['PW4056','CF6_80C2','RB211_524'],b752:['RB211_535','PW2040'],
  b763:['CF6_80C2','PW4056','RB211_524'],b788:['GENX1B','T1000'],b789:['T1000','GENX1B'],b78x:['GENX1B','T1000'],md11:['CF6_80D','PW4462']};
const TIP_LABEL={none:'Plain tip',fence:'Wingtip fence',winglet:'Winglet',sharklet:'Sharklet',blended:'Curved composite tip',raked:'Raked tip',split:'Split scimitar',folding:'Folding tip'};
const CABIN_OPTS=[['factory','Factory',null,0],['premium','Premium 3-class',1.06,-2],['two','Two-class',0.86,-1],['dense','High-density',0.74,0]];
const PAINTS=[['factory','Factory finish',null],['white','Gloss white',0xf3f4f5,.3,.22],['alu','Polished aluminium',0xc4cad0,.95,.2],['primer','Zinc-chromate primer',0x99a86a,.1,.72],['lowvis','Low-visibility grey',0x7c8690,.25,.62],['ram','RAM black',0x25292e,.2,.82],['sand','Desert tan',0xb7a27c,.2,.66]];
const CFG={};
function cfgFor(id){return CFG[id]||(CFG[id]={eng:null,tip:null,cabin:'factory',paint:'factory',tow:0.88});}
let CFG_CUR=cfgFor('b77w');
function baseRow(id){return GLOBAL_FLEET_DB.find(r=>r[0]===id);}
function variantOf(id){const base=FLEET_BY_ID[id]||FLEET_BY_ID.b77w,c=cfgFor(base.id);CFG_CUR=c;
  if((!c.eng||c.eng===base.eng)&&(!c.tip||c.tip===base.tip))return base;
  const row=baseRow(base.id).slice();if(c.eng)row[FLEET_COLS.indexOf('eng')]=c.eng;if(c.tip)row[FLEET_COLS.indexOf('tip')]=c.tip;
  const v=parseAircraft(row);v.variant=true;return v;}
function engineOptions(ac){return ENGINE_ALT[ac.id]||[FLEET_BY_ID[ac.id].eng];}
function tipOptions(ac){const b=FLEET_BY_ID[ac.id];if(!(b.wing==='low'||b.wing==='high')||b.sweep<12||b.deck==='ga')return [b.tip];
  const o=['none','fence','winglet','sharklet','blended','raked','split'];if(b.tip==='folding')o.push('folding');return o;}
function cabinFor(ac){const c=cfgFor(ac.id);return CABIN_OPTS.find(o=>o[0]===c.cabin)||CABIN_OPTS[0];}
function seatEstimate(ac){const d=ac.deck;if(['cargo','visor','beluga','fighter','fwing'].includes(d)||ac.wing==='chine')return null;
  const D=ac.D,ab0=D<2?2:D<2.4?3:D<2.8?4:D<3.3?5:D<4.2?6:D<5.2?7:D<5.8?8:D<6.3?9:10,o=cabinFor(ac);
  const ab=Math.max(2,ab0+(o[3]||0)),pitch=o[2]||(d==='bizjet'?1.6:0.81),len=ac.L*(d==='ga'?0.32:0.7);
  let seats=Math.round(len*0.88/pitch)*ab;if(d==='double')seats=Math.round(seats*1.72);if(d==='hump'||d==='hump8')seats=Math.round(seats*1.12);if(d==='bizjet')seats=Math.min(seats,19);if(d==='ga')seats=Math.min(seats,ac.id==='c172'?4:9);
  return {seats,ab,pitch};}
function paintFor(ac){const p=cfgFor(ac.id).paint;return PAINTS.find(x=>x[0]===p)||PAINTS[0];}
/* =====================================================================
   PARAMETRIC GEOMETRY KERNEL
   ===================================================================== */
const TAU=Math.PI*2,D2R=Math.PI/180;
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const AX=V(1,0,0),AY=V(0,1,0),AZ=V(0,0,1);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
const range=n=>Array.from({length:n},(_,i)=>i);
const yt=x=>{x=clamp(x,0,1);return 5*(0.2969*Math.sqrt(x)-0.126*x-0.3516*x*x+0.2843*x*x*x-0.1036*x*x*x*x);};
function afProfile(n=12,x0=0,x1=1){const u=[],l=[];for(let i=0;i<=n;i++){const x=x0+(x1-x0)*(1-Math.cos(Math.PI*i/n))/2;u.push([x,yt(x)]);l.push([x,-yt(x)]);}return u.concat(l.reverse());}
const AF=afProfile(12),AFC=afProfile(4);

function ringsGeo(rings,closed=true,caps=true){
  const m=rings[0].length,pos=[],idx=[];
  rings.forEach(r=>r.forEach(p=>pos.push(p[0],p[1],p[2])));
  const jm=closed?m:m-1;
  for(let i=0;i<rings.length-1;i++)for(let j=0;j<jm;j++){const a=i*m+j,b=i*m+(j+1)%m,c=a+m,d=b+m;idx.push(a,c,b,b,c,d);}
  if(caps)[0,rings.length-1].forEach(k=>{let cx=0,cy=0,cz=0;rings[k].forEach(p=>{cx+=p[0];cy+=p[1];cz+=p[2];});const ci=pos.length/3;pos.push(cx/m,cy/m,cz/m);for(let j=0;j<m;j++)idx.push(ci,k*m+j,k*m+(j+1)%m);});
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;
}
// sections {x,y,z,c,t}: x,y,z = leading edge; vertical → thickness along z
function loft(secs,prof=AF,vertical=false,tS=1){
  return ringsGeo(secs.map(s=>prof.map(([px,py])=>{const X=s.x-px*s.c,o=py*s.t*s.c*tS;return vertical?[X,s.y,s.z+o]:[X,s.y+o,s.z];})));
}
function segLoft(secs,cf0,cf1,vertical=false,tS=1.05){return loft(secs,afProfile(5,cf0,cf1),vertical,tS);}
function tubeGeo(secs,seg=28,a0=0,a1=TAU,caps=true){
  const full=a1-a0>=TAU-1e-6,m=full?seg:seg+1;
  return ringsGeo(secs.map(s=>{const r=[];for(let j=0;j<m;j++){const a=a0+(a1-a0)*j/seg;r.push([s.x,(s.cy||0)+s.ry*Math.cos(a),(s.cz||0)+s.rz*Math.sin(a)]);}return r;}),full,full&&caps);
}
function beamGeo(p0,p1,h0,h1=h0,w0=h0,w1=w0){
  const d=p1.clone().sub(p0).normalize();let up=V(0,1,0);if(Math.abs(d.dot(up))>0.95)up=V(1,0,0);
  const s=d.clone().cross(up).normalize(),u=s.clone().cross(d).normalize();
  const c=(p,h,w,i,j)=>p.clone().addScaledVector(s,i*w/2).addScaledVector(u,j*h/2);
  const A=[c(p0,h0,w0,-1,-1),c(p0,h0,w0,1,-1),c(p0,h0,w0,1,1),c(p0,h0,w0,-1,1)],B=[c(p1,h1,w1,-1,-1),c(p1,h1,w1,1,-1),c(p1,h1,w1,1,1),c(p1,h1,w1,-1,1)];
  const q=[[A[0],A[1],A[2],A[3]],[B[1],B[0],B[3],B[2]],[A[0],B[0],B[1],A[1]],[A[1],B[1],B[2],A[2]],[A[2],B[2],B[3],A[3]],[A[3],B[3],B[0],A[0]]];
  const pos=[];q.forEach(([a,b,cc,dd])=>[a,b,cc,a,cc,dd].forEach(v=>pos.push(v.x,v.y,v.z)));
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();return g;
}
const latheX=(pts,seg=32,p0=0,pl=TAU)=>new THREE.LatheGeometry(pts.map(p=>new THREE.Vector2(Math.max(p[0],0.0005),p[1])),seg,p0,pl).rotateZ(-Math.PI/2);
const cylX=(rf,rb,len,seg=24,open=false)=>new THREE.CylinderGeometry(rf,rb,len,seg,1,open).rotateZ(-Math.PI/2);
const cylZ=(r,len,seg=24)=>new THREE.CylinderGeometry(r,r,len,seg).rotateX(Math.PI/2);
const coneX=(r,len,seg=24,dir=1)=>new THREE.ConeGeometry(r,len,seg).rotateZ(dir>0?-Math.PI/2:Math.PI/2);
const torusX=(R,r,seg=40)=>new THREE.TorusGeometry(R,r,8,seg).rotateY(Math.PI/2);
const boxG=(x,y,z)=>new THREE.BoxGeometry(x,y,z);
function bladeGeo(r0,r1,c0,c1,tw0,tw1,t=.07,n=4,sweep=0){
  const rings=[];for(let i=0;i<=n;i++){const f=i/n,r=lerp(r0,r1,f),c=lerp(c0,c1,f),tw=lerp(tw0,tw1,f),sx=sweep*f*f;
    rings.push(AFC.map(([px,py])=>{const u=(0.45-px)*c+sx,v=py*t*c;return [u*Math.cos(tw)-v*Math.sin(tw),r,u*Math.sin(tw)+v*Math.cos(tw)];}));}
  return ringsGeo(rings,true,true);
}
function gearGeo(rp,n,th,hole=.3){
  const s=new THREE.Shape(),ro=rp*1.07,ri=rp*.91;
  for(let i=0;i<n;i++){const a=i/n*TAU,da=TAU/n;[[ri,a],[ro,a+da*.18],[ro,a+da*.42],[ri,a+da*.6]].forEach(([r,aa],k)=>{const x=r*Math.cos(aa),y=r*Math.sin(aa);(i===0&&k===0)?s.moveTo(x,y):s.lineTo(x,y);});}
  s.closePath();if(hole>0){const h=new THREE.Path();h.absarc(0,0,rp*hole,0,TAU,true);s.holes.push(h);}
  const g=new THREE.ExtrudeGeometry(s,{depth:th,bevelEnabled:false,curveSegments:6});g.translate(0,0,-th/2);return g;
}

/* ---------- materials ---------- */
const std=(c,o={})=>new THREE.MeshStandardMaterial(Object.assign({color:c,metalness:.55,roughness:.4,side:THREE.DoubleSide},o));
const MAT={
  skin:std(0xd4dbe2,{metalness:.5,roughness:.3}),
  steel:std(0x8f9aa6,{metalness:.9,roughness:.3}),chrome:std(0xe6ecf1,{metalness:1,roughness:.12}),
  ti:std(0xb2ada3,{metalness:.85,roughness:.32}),alum:std(0xb8c2cc,{metalness:.75,roughness:.3}),
  dark:std(0x2b333d,{metalness:.5,roughness:.55}),black:std(0x101317,{metalness:.3,roughness:.6}),
  cfrp:std(0x2a3138,{metalness:.3,roughness:.4}),rubber:std(0x15181c,{metalness:0,roughness:.9}),
  hot:std(0xa04c26,{emissive:0x4a1606,metalness:.7,roughness:.35}),glow:std(0xffc27a,{emissive:0xff6a1a,emissiveIntensity:1.6}),
  white:std(0xf3f6f8,{emissive:0xffffff,emissiveIntensity:.8}),ctrl:std(0xd9a441,{metalness:.5,roughness:.35}),
  struct:std(0x7f8d9b,{metalness:.7,roughness:.4}),cyan:std(0x0b2a33,{emissive:0xf5c04a,emissiveIntensity:.9}),
  fuel:new THREE.MeshStandardMaterial({color:0x2fd39a,transparent:true,opacity:.42,depthWrite:false,side:THREE.DoubleSide,roughness:.2,metalness:.1}),
  glass:std(0x0d1c26,{metalness:.9,roughness:.06,transparent:true,opacity:.92}),
  brake:std(0x45403c,{metalness:.6,roughness:.5}),red:std(0xb3362c,{metalness:.3,roughness:.5}),
  gold:std(0xff8a3d,{metalness:.8,roughness:.28}),copper:std(0xb87333,{metalness:.9,roughness:.3}),
  seat:std(0x2d3a4a,{metalness:.1,roughness:.8}),green:std(0x2e6d4f,{metalness:.3,roughness:.5}),uld:std(0x9aa3ab,{metalness:.7,roughness:.45}),
  liner:new THREE.MeshStandardMaterial({color:0x6c7a88,wireframe:true,transparent:true,opacity:.55,side:THREE.DoubleSide})
};
function mk(g,m,ud){const o=new THREE.Mesh(g,m);o.userData=Object.assign({mat0:m},ud||{});return o;}
function inst(g,m,mats,ud){const o=new THREE.InstancedMesh(g,m,mats.length);mats.forEach((x,i)=>o.setMatrixAt(i,x));o.instanceMatrix.needsUpdate=true;o.userData=Object.assign({mat0:m},ud||{});return o;}
const qAx=(ax,a)=>new THREE.Quaternion().setFromAxisAngle(ax,a);
const M4=(p,q,s)=>new THREE.Matrix4().compose(p||V(),q||new THREE.Quaternion(),s||V(1,1,1));
function ringInst(n,g,m,x=0,ud,phase=0){return inst(g,m,range(n).map(k=>M4(V(x,0,0),qAx(AX,phase+k*TAU/n))),ud);}
function grp(ud){const g=new THREE.Group();Object.assign(g.userData,ud||{});return g;}
function rotorStage(rHub,rTip,n,chord,o={}){
  const g=grp();const mat=o.mat||MAT.ti;
  if(o.disk!==false)g.add(mk(cylX(rHub,rHub,o.hubW||chord*1.2,28),o.diskMat||MAT.steel,{temp:o.temp}));
  g.add(ringInst(n,bladeGeo(rHub*0.98,rTip,chord,chord*(o.tipC||0.8),o.tw0??0.45,o.tw1??1.05,o.t||0.08,4,o.sweep||0),mat,0,{temp:o.temp}));
  return g;
}
function statorRing(rIn,rOut,n,chord,mat=MAT.steel,temp){return ringInst(n,bladeGeo(rIn,rOut,chord,chord,-0.35,-0.5,0.07,2),mat,0,{temp},Math.PI/n);}
function spinAnim(o,rate,axis='x'){o.userData.anim={type:'spin',axis,rate};return o;}
function fnAnim(o,f){o.userData.anim={type:'fn',f};return o;}

/* ---------- canvas textures ---------- */
const TEX={};
/* pfdTexture is provided by panels.js (live avionics) */
function dotTexture(){if(TEX.dot)return TEX.dot;const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.35,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return TEX.dot=new THREE.CanvasTexture(c);}
function shadowTexture(){if(TEX.sh)return TEX.sh;const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');const g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(0,0,0,.75)');g.addColorStop(.6,'rgba(0,0,0,.3)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return TEX.sh=new THREE.CanvasTexture(c);}

/* =====================================================================
   AIRFRAME DEFINITIONS (derived from GLOBAL_FLEET_DB)
   ===================================================================== */
function fuseDef(ac){
  const L=ac.L,D=ac.D,R=D/2,k=ac.wing,dk=ac.deck;
  const fighter=dk==='fighter',ss=dk==='ss',ga=dk==='ga',fw=dk==='fwing',cargo=dk==='cargo'||dk==='visor';
  const oy=dk==='double'?1.17:fighter?0.6:k==='chine'?0.9:1;
  const nose=fighter?0.34*L:ss?(k==='chine'?0.3*L:0.2*L):ga?1.5*D:dk==='bizjet'?1.9*D:cargo?1.25*D:1.55*D;
  const tail=fighter?0.12*L:ss?0.1*L:ga?0.5*L:dk==='bizjet'?3.2*D:cargo?2.4*D:2.7*D;
  const up=fighter||ss?0.1:cargo?1.0:ga?0.75:0.72;
  const blunt=!(fighter||ss),tmin=ga?0.22:fighter||ss?0.55:0.13;
  function at(x){
    let f=1,cy=0;const un=(L/2-x)/nose,ut=(x+L/2)/tail;
    if(un<1){const s=Math.max(un,0);f=blunt?Math.sqrt(Math.max(0,1-(1-s)*(1-s))):Math.pow(s,0.75);if(blunt)cy-=R*oy*(dk==='visor'?0.05:0.2)*Math.pow(1-s,1.6);f=Math.max(f,0.012);}
    if(ut<1){const s=Math.max(ut,0);const g=tmin+(1-tmin)*Math.pow(s,0.8);f=Math.min(f,g);cy+=(1-g)*R*oy*up;}
    return {cy,ry:R*oy*f,rz:R*f};
  }
  const cockpitLen=fighter?0.36*L:ss?0.24*L:nose*1.2;
  return {L,D,R,oy,ry:R*oy,rz:R,nose,tail,at,fighter,ss,ga,fw,cargo,cockpitLen,top:x=>{const a=at(x);return a.cy+a.ry;}};
}
function wingDef(ac,F){
  const L=ac.L,S=ac.S,semi=S/2,k=ac.wing,e=ac.e,sw=Math.tan(ac.sweep*D2R);let secs,rootLE,y0,dih,t0=.13,t1=.095;
  if(k==='low'||k==='high'){
    const jet=ac.sweep>12,piston=e.type==='PS';
    const cr=jet?0.185*S:(piston?0.15*S:0.1*S),ct=jet?0.043*S:(piston&&k==='high'?cr:0.5*cr);
    if(jet){const zk=0.3*semi,dxk=zk*sw;secs=[{z:0,dx:0,c:cr},{z:zk,dx:dxk,c:Math.max(cr-dxk,ct*1.7)},{z:semi,dx:semi*sw,c:ct}];}
    else secs=[{z:0,dx:0,c:cr},{z:0.35*semi,dx:0.35*semi*sw,c:cr},{z:semi,dx:semi*sw+(cr-ct)*0.3,c:ct}];
    const frac=(ac.layout==='rear'||ac.layout==='rear3')?0.47:(k==='high'?(F.ga?0.3:0.42):(piston?0.36:jet?0.37:0.4));
    rootLE=L/2-frac*L;y0=k==='high'?F.ry*0.84:-F.ry*0.58;
    dih=(k==='high'?(jet?-3:(F.ga?1.7:0)):(jet?5.5:(piston?6:4)))*D2R;
    if(!jet){t0=.17;t1=.13;}
  } else if(k==='fighter'||k==='cdelta'){
    const cr=(k==='cdelta'?0.56:0.46)*L,ct=0.1*cr;secs=[{z:0,dx:0,c:cr},{z:semi,dx:semi*sw,c:ct}];
    rootLE=L/2-(k==='cdelta'?0.4:0.42)*L;y0=-F.ry*0.1;dih=(k==='cdelta'?-1:-2)*D2R;t0=.055;t1=.04;
  } else if(k==='ogee'||k==='dd'){
    const cr=(k==='ogee'?0.55:0.58)*L;rootLE=L/2-(k==='ogee'?0.3:0.31)*L;
    const pts=k==='ogee'?[[0,0],[.12,.3],[.3,.52],[.5,.66],[.7,.75],[.88,.82],[1,.87]]:[[0,0],[.28,.5],[.33,.54],[1,.88]];
    secs=pts.map(([zf,d])=>({z:zf*semi,dx:d*cr,c:Math.max(cr-d*cr-zf*0.05*cr,0.04*cr)}));
    y0=-F.ry*0.55;dih=0;t0=.03;t1=.025;
  } else if(k==='chine'){
    const cr=0.55*L;secs=[{z:0,dx:0,c:cr},{z:semi,dx:semi*sw,c:0.05*cr}];rootLE=L/2-0.4*L;y0=-F.ry*0.1;dih=0;t0=.035;t1=.03;
  } else {
    rootLE=L/2;y0=0;dih=0;const c0=L;
    secs=[[0,c0],[0.21,12.2/21*c0],[0.46,14.2/21*c0],[1,2.6/21*c0]].map(([zf,c])=>({z:zf*semi,dx:zf*semi*sw,c}));t0=.15;t1=.06;
  }
  if(ac.tip==='raked'){secs=secs.map(s=>({z:s.z*0.93,dx:s.dx*0.93,c:s.c}));const l=secs[secs.length-1];secs.push({z:semi,dx:l.dx+0.07*semi*Math.tan(60*D2R),c:l.c*0.32});}
  const zMax=secs[secs.length-1].z;secs.forEach(s=>s.t=lerp(t0,t1,s.z/zMax));
  const at=z=>{z=clamp(z,0,zMax);for(let i=0;i<secs.length-1;i++){const a=secs[i],b=secs[i+1];if(z<=b.z+1e-6){const f=(z-a.z)/Math.max(b.z-a.z,1e-6);return{z,dx:lerp(a.dx,b.dx,f),c:lerp(a.c,b.c,f),t:lerp(a.t,b.t,f)};}}return Object.assign({},secs[secs.length-1],{z});};
  const tanD=Math.tan(dih);
  const W={secs,rootLE,y0,dih,semi,zMax,at,leX:z=>rootLE-at(z).dx,chord:z=>at(z).c,wy:z=>y0+z*tanD};
  W.area=2*secs.slice(1).reduce((a,s,i)=>a+(s.z-secs[i].z)*(s.c+secs[i].c)/2,0);
  return W;
}
function wingSecs(W,z0,z1){const zs=[z0,...W.secs.map(s=>s.z).filter(z=>z>z0+1e-3&&z<z1-1e-3),z1];return zs.map(z=>{const s=W.at(z);return{x:W.leX(z),y:W.wy(z),z,c:s.c,t:s.t};});}
function wingSeg(W,z0,z1,cf0,cf1,o={}){
  const prof=afProfile(5,cf0,cf1),n=o.n||4,rings=[];
  for(let i=0;i<=n;i++){const z=lerp(z0,z1,i/n),s=W.at(z),le=W.leX(z)+(o.dx||0);rings.push(prof.map(([px,py])=>[le-px*s.c,W.wy(z)+(o.dy||0)+py*s.t*s.c*(o.tS||1.05),z]));}
  return ringsGeo(rings,true,true);
}
const nacDia=e=>e.type==='TF'?e.dia*1.18:e.type==='TP'?0.45+0.00016*e.thrust:e.type==='PS'?(e.flags==='radial'?1.45:0.9):e.dia*1.25;
const nacLen=e=>e.type==='TF'?e.dia*(e.bpr>3?1.75:2.6):e.type==='TP'?3.4*nacDia(e)+1.5:e.type==='PS'?2.4:e.dia*7;
const wheelR=ac=>clamp(0.2*Math.pow(ac.mtow,0.22),0.17,0.85);

/* ---------- engine placement ---------- */
function engPlan(ac,F,W){
  const e=ac.e,n=ac.nEng,L=ac.L,nd=nacDia(e),nl=nacLen(e),out=[];
  const pair=(fr,kind)=>fr.forEach(f=>[1,-1].forEach(sd=>{const z=f*W.semi,x=W.leX(z)+nl*(kind==='tp'?0.32:0.42),wy=W.wy(z);
    const y=kind==='tp'||kind==='radial'?wy+(ac.wing==='high'?-nd*0.25:nd*0.05):wy-nd*(ac.wing==='high'?0.62:0.66);out.push({x,y,z:sd*z,kind,side:sd});}));
  switch(ac.layout){
    case 'wing':pair(n===2?[0.34]:n===4?[0.36,0.64]:[0.27,0.5,0.73],'pod');break;
    case 'wing3t':pair([0.34],'pod');out.push({x:-L/2+0.1*L,y:0,z:0,kind:'tailpod',side:0});break;
    case 'wing3s':pair([0.34],'pod');out.push({x:-L/2+0.02*L,y:0,z:0,kind:'sduct',side:0});break;
    case 'rear':case 'rear3':{const x=-L/2+L*(F.ga||ac.deck==='bizjet'?0.25:0.2);[1,-1].forEach(sd=>out.push({x,y:F.ry*0.32,z:sd*(F.at(x).rz+nd*0.72),kind:'rpod',side:sd}));
      if(ac.layout==='rear3')out.push({x:-L/2+0.02*L,y:0,z:0,kind:'sduct',side:0});break;}
    case 'prop':pair(n===2?[e.type==='PS'?0.2:(ac.wing==='high'?0.29:0.27)]:[0.29,0.56],e.type==='PS'?'radial':'tp');break;
    case 'nose':out.push({x:L/2,y:F.at(L/2-0.2).cy,z:0,kind:'noseprop',side:0});break;
    case 'concorde':case 'box':{const z0=(ac.layout==='box'?0.13:0.36)*W.semi;[1,-1].forEach(sd=>{const z=z0,x=W.leX(z)-W.chord(z)+11*0.5-0.6;out.push({x,y:W.wy(z)-nd*0.62,z:sd*z,kind:'ssbox',side:sd,len:11});});break;}
    case 'int':{const zs=n===1?[0]:[1,-1].map(s=>s*F.rz*(ac.id==='su57'?0.55:0.36));zs.forEach(z=>out.push({x:-L/2+0.05*L,y:0,z,kind:'fnoz',side:Math.sign(z)}));break;}
    case 'buried':[2.2,4.1].forEach(z=>[1,-1].forEach(sd=>out.push({x:0.5,y:0.35,z:sd*z,kind:'buried',side:sd})));break;
    case 'nacelle':[1,-1].forEach(sd=>{const z=0.52*W.semi;out.push({x:W.leX(z)-W.chord(z)*0.35,y:W.wy(z),z:sd*z,kind:'srnac',side:sd});});break;
  }
  return {list:out,nd,nl};
}

/* ---------- engine pod meshes (airframe level) ---------- */
function podTF(e,nd,nl,chev){
  const g=grp(),Rn=nd/2,Ri=Rn*0.86,h=nl/2;
  const xs=h-nl*0.55;
  g.add(mk(latheX([[Ri,h-nl*0.33],[Ri*0.985,h-nl*0.03],[(Ri+Rn)/2,h],[Rn*0.99,h-nl*0.04],[Rn*1.02,h-nl*0.3],[Rn*1.012,xs],[Ri*0.98,xs],[Ri,h-nl*0.33]],40),MAT.skin,{skin:1}));
  const sleeve=mk(latheX([[Rn*1.012,xs],[Rn*0.96,h-nl*0.72],[Rn*0.82,-h],[Rn*0.78,-h],[Ri*0.96,h-nl*0.62],[Ri*0.98,xs],[Rn*1.012,xs]],40),MAT.skin,{skin:1});g.add(sleeve);
  g.add(inst(boxG(nl*0.15,Rn*0.05,Rn*0.15),MAT.dark,range(28).map(k=>M4(V(),qAx(AX,k*TAU/28)).multiply(M4(V(xs-nl*0.09,Rn*0.93,0))))));
  g.userData.sleeve=sleeve;g.userData.nl=nl;
  const fx=h-nl*0.33+0.04*nl,fan=grp();fan.position.x=fx;
  fan.add(mk(new THREE.CircleGeometry(Ri*0.98,32).rotateY(Math.PI/2).translate(-Ri*0.12,0,0),MAT.black));
  fan.add(mk(coneX(Ri*0.3,Ri*0.55,24).translate(Ri*0.27,0,0),MAT.dark));
  fan.add(ringInst(clamp(e.blades||22,8,40),bladeGeo(Ri*0.28,Ri*0.97,Ri*0.3,Ri*0.4,0.35,1.15,0.06,3),MAT.ti));
  spinAnim(fan,7);g.add(fan);
  g.add(mk(latheX([[Rn*0.52,-h+nl*0.25],[Rn*0.5,-h],[Rn*0.36,-h-nl*0.15]],28,0,TAU),MAT.dark,{temp:.45}));
  g.add(mk(coneX(Rn*0.26,nl*0.22,24,-1).translate(-h-nl*0.15-nl*0.1,0,0),MAT.hot,{temp:.75}));
  if(chev)g.add(ringInst(14,new THREE.ConeGeometry(Rn*0.09,nl*0.07,3).rotateZ(Math.PI/2).translate(-h-nl*0.03,Rn*0.79,0),MAT.skin,0,{skin:1}));
  return g;
}
function podProp(e,nd,nl,R,radial){
  const g=grp();const pr=e.dia/2;
  const secs=[];const n=12;for(let i=0;i<=n;i++){const f=i/n,x=nl*0.5-f*nl;const r=nd/2*(f<0.25?0.62+1.52*f:f>0.7?Math.max(0.15,1-(f-0.7)*2.6):1);secs.push({x,ry:r*(radial?1:1.12),rz:r});}
  g.add(mk(tubeGeo(secs,24),MAT.skin,{skin:1}));
  if(radial){g.add(mk(latheX([[nd*0.52,nl*0.5+0.35],[nd*0.55,nl*0.5],[nd*0.5,nl*0.5-0.3]],28),MAT.skin,{skin:1}));
    g.add(ringInst(9,boxG(0.25,nd*0.36,0.22).translate(0,nd*0.3,0),MAT.dark,nl*0.5+0.18));}
  const prop=grp();prop.position.x=nl*0.5+(radial?0.45:0.1);
  prop.add(mk(coneX(nd*0.3,nd*0.55,20).translate(nd*0.27,0,0),MAT.dark));
  prop.add(ringInst(e.blades,bladeGeo(nd*0.15,pr,pr*0.16,pr*0.09,0.2,1.35,0.09,4,radial?0:-pr*0.12),radial?MAT.black:MAT.cfrp));
  spinAnim(prop,radial?9:11);g.add(prop);
  if(!radial)g.add(mk(cylX(nd*0.12,nd*0.14,nl*0.18,12).translate(-nl*0.05,-nd*0.35,nd*0.42),MAT.hot,{temp:.6}));
  return g;
}

/* ---------- landing gear leg ---------- */
function gearLeg(r,n,h,o={}){
  const g=grp(),P={strut:grp(),torque:grp(),brace:grp(),act:grp(),bogie:grp(),brakes:grp()};Object.values(P).forEach(p=>g.add(p));
  const sr=r*0.17,wW=r*0.6,sd=o.side||1,beam=n>2;
  P.strut.add(mk(new THREE.CylinderGeometry(sr,sr,h*0.58,18).translate(0,-h*0.29,0),MAT.steel));
  const inner=mk(new THREE.CylinderGeometry(sr*0.72,sr*0.72,h*0.5,18).translate(0,-h*0.75,0),MAT.chrome,{oleo:1});P.strut.add(inner);
  P.strut.add(mk(cylX(sr*0.55,sr*0.55,sr*5,12),MAT.steel));
  const tl=[V(sr*1.1,-h*0.52,0),V(sr*3.1,-h*0.64,0),V(sr*1.1,-h*0.86,0)];
  P.torque.add(mk(beamGeo(tl[0],tl[1],sr*0.6,sr*0.5,sr*0.35),MAT.alum));P.torque.add(mk(beamGeo(tl[1],tl[2],sr*0.5,sr*0.6,sr*0.35),MAT.alum));
  P.brace.add(mk(beamGeo(V(0,-h*0.36,0),V(-h*0.42,h*0.12,0),sr*0.55,sr*0.55,sr*0.55),MAT.steel));
  P.brace.add(mk(beamGeo(V(0,-h*0.32,0),V(0,h*0.08,-sd*h*0.4),sr*0.5,sr*0.5,sr*0.5),MAT.steel));
  P.brace.add(mk(boxG(sr*1.4,sr*1.2,sr*1.2).translate(-h*0.42,h*0.12,0),MAT.gold));
  P.act.add(mk(beamGeo(V(-h*0.18,h*0.06,sd*sr*1.5),V(-h*0.07,-h*0.12,sd*sr*1.5),sr*0.7,sr*0.7,sr*0.7),MAT.steel));
  const rod=mk(beamGeo(V(-h*0.07,-h*0.12,sd*sr*1.5),V(-sr*0.9,-h*0.27,sd*sr*1.5),sr*0.32,sr*0.32,sr*0.32),MAT.chrome);P.act.add(rod);
  const rows=n<=2?1:n===3?3:Math.ceil(n/2),cols=n===1||n===3?1:2,sp=r*2.15,y=-h;
  if(beam){P.bogie.add(mk(beamGeo(V(sp*(rows-1)/2+r*0.4,y,0),V(-sp*(rows-1)/2-r*0.4,y,0),sr*1.1,sr*1.1,sr*1.0),MAT.steel));}
  for(let i=0;i<rows;i++){const x=(i-(rows-1)/2)*sp;
    P.bogie.add(mk(cylZ(sr*0.42,cols===2?wW*2.1:wW*1.5,12).translate(x,y,0),MAT.steel));
    for(let j=0;j<cols;j++){const z=cols===2?(j?1:-1)*wW*0.68:(n===1?sd*wW*0.6:0);
      const wh=grp();wh.position.set(x,y,z);
      wh.add(mk(new THREE.TorusGeometry(r*0.7,r*0.3,12,28),MAT.rubber));
      wh.add(mk(cylZ(r*0.46,wW*0.92,20),MAT.alum));
      const br=mk(cylZ(r*0.36,wW*0.75,16),MAT.brake,{temp:.62,brake:1});wh.add(br);
      wh.userData.wheel=1;P.brakes.add(wh);}
  }
  return {g,P};
}

/* =====================================================================
   AIRFRAME SYNTHESIZER  (Level 0 / Level 1)
   ===================================================================== */
function buildAirframe(ac){
  const root=grp(),F=fuseDef(ac),W=wingDef(ac,F),e=ac.e,L=ac.L,S=ac.S,motion={flaps:[],slats:[],spl:[],ail:[],gear:[],sleeves:[],fold:[]};
  const sys={},inner={};
  ['prop','wing','gear','cockpit','fus','emp'].forEach(k=>{sys[k]=grp({node:k,sys:k});root.add(sys[k]);inner[k]=grp({internal:1,node:k});inner[k].visible=false;sys[k].add(inner[k]);});
  const ex=(o,v)=>{o.userData.ex=v;return o;};
  const EP=engPlan(ac,F,W),nd=EP.nd,nl=EP.nl,R=F.R;
  // ----- fuselage + cockpit
  if(!F.fw){
    const N=60,split=L/2-F.cockpitLen;let xs=range(N+1).map(i=>-L/2+L*(0.5-0.5*Math.cos(Math.PI*i/N)));xs=xs.filter(x=>Math.abs(x-split)>L*0.004);xs.push(split);xs.sort((a,b)=>a-b);
    const sec=x=>{const a=F.at(x);return{x,cy:a.cy,ry:a.ry,rz:a.rz};};
    sys.fus.add(mk(tubeGeo(xs.filter(x=>x<=split).map(sec),40),MAT.skin,{skin:1}));
    const nose=ex(grp(),V(1,0,0));sys.cockpit.add(nose);
    nose.add(mk(tubeGeo(xs.filter(x=>x>=split).map(sec),40),MAT.skin,{skin:1}));
    if(F.fighter||ac.wing==='chine'){const cx=L/2-(F.fighter?0.25:0.2)*L,a=F.at(cx);const cg=new THREE.SphereGeometry(1,28,14,0,TAU,0,Math.PI/2);cg.scale(F.fighter?0.12*L:0.09*L,a.ry*(F.fighter?0.85:0.55),a.rz*(F.fighter?0.36:0.4));
      nose.add(mk(cg.translate(cx,a.cy+a.ry*0.82,0),MAT.glass));}
    else{const xw=range(6).map(i=>L/2-F.nose*lerp(0.64,0.4,i/5));nose.add(mk(tubeGeo(xw.sort((a,b)=>a-b).map(x=>{const a=F.at(x);return{x,cy:a.cy,ry:a.ry*1.012,rz:a.rz*1.012};}),16,-0.95,0.95),MAT.glass));}
    // hump / beluga lobe / chines
    const hump=(x0,len,cyF,ryF,rzF,mat)=>{const s=[];for(let i=0;i<=24;i++){const f=i/24,x=x0-f*len;let h=f<0.14?Math.sqrt(f/0.14):f>0.68?Math.pow(Math.max(0,1-(f-0.68)/0.32),1.1):1;h=Math.max(h,0.02);const a=F.at(x);s.push({x,cy:a.cy+R*cyF-(1-h)*R*0.25,ry:R*ryF*h,rz:R*rzF*Math.min(1,h*1.2)});}return mk(tubeGeo(s,32),mat,{skin:1});};
    if(ac.deck==='hump'||ac.deck==='hump8')sys.fus.add(hump(L/2-F.nose*0.3,(ac.deck==='hump8'?0.42:0.34)*L,0.62,0.66,0.66,MAT.skin));
    if(ac.deck==='beluga'){const s=[];const x0=L/2-0.12*L,len=0.8*L;for(let i=0;i<=28;i++){const f=i/28,x=x0-f*len;const h=f<0.16?Math.sqrt(f/0.16):f>0.7?Math.max(0.05,1-(f-0.7)/0.3*0.92):1;s.push({x,cy:R*0.92+(f>0.7?(f-0.7)*R*3:0),ry:R*1.58*Math.max(h,.02),rz:R*1.55*Math.max(h,.02)});}sys.fus.add(mk(tubeGeo(s,36),MAT.skin,{skin:1}));}
    if(ac.wing==='chine'){[1,-1].forEach(sd=>{const g=loft([{x:L/2-0.08*L,y:0,z:0,c:L*0.5,t:.015},{x:W.rootLE+L*0.02,y:0,z:R*2.3,c:L*0.06,t:.015}]);const m=mk(g,MAT.skin,{skin:1});if(sd<0)m.scale.z=-1;sys.fus.add(m);});}
    cabinDetail(ac,F,W,sys.fus);
  } else {
    const nose=ex(grp(),V(1,0,0));sys.cockpit.add(nose);
    const cg=new THREE.SphereGeometry(1,28,14,0,TAU,0,Math.PI/2);cg.scale(4.2,1.1,1.9);nose.add(mk(cg.translate(L/2-4.4,0.9,0),MAT.skin,{skin:1}));
    const wg=new THREE.SphereGeometry(1,20,8,-0.9,1.8,0.25,0.55);wg.scale(4.2,1.1,1.9);nose.add(mk(wg.translate(L/2-4.4,0.9,0),MAT.glass));
  }
  // ----- wing
  const fold=ac.tip==='folding'?3.6:0;
  const wingSide=sd=>{const g=ex(grp(),V(0,0,sd));
    const z0=F.fw?4.4:0,m=mk(loft(wingSecs(W,z0,W.zMax-fold)),MAT.skin,{skin:1});g.add(m);
    tipDevice(ac,W,MAT.skin).forEach(t=>g.add(t));
    movingSurfaces(ac,F,W,g,motion);
    if(fold){const pv=grp({fold:1});motion.fold.push(pv);const zf=W.zMax-fold;pv.position.set(W.leX(zf)-W.chord(zf)*0.5,W.wy(zf),zf);
      const fm=mk(loft(wingSecs(W,zf,W.zMax)),MAT.skin,{skin:1});fm.position.set(-pv.position.x,-pv.position.y,-pv.position.z);pv.add(fm);g.add(pv);g.userData.foldPivot=pv;}
    if(sd<0)g.scale.z=-1;return g;};
  sys.wing.add(wingSide(1),wingSide(-1));
  if(F.fw){const c=mk(loft(wingSecs(W,0,4.4).map((s,i)=>Object.assign(s,{t:i===0?0.17:s.t}))),MAT.skin,{skin:1});const c2=c.clone();c2.scale.z=-1;sys.fus.add(c,c2);}
  // ----- engines
  const engs=[];
  EP.list.forEach((p,i)=>{
    const g=ex(grp({engine:i}),V(0,-0.6,p.side*0.5));g.position.set(p.x,p.y,p.z);g.userData.base=g.position.clone();
    if(p.kind==='pod'||p.kind==='rpod'||p.kind==='tailpod'){const pod=podTF(e,nd,nl,ac.flags.has('chev'));g.add(pod);motion.sleeves.push(pod);
      if(p.kind==='pod'){const z=Math.abs(p.z);const py=mk(beamGeo(V(nl*0.15,nd*0.36,0),V(W.leX(z)-W.chord(z)*0.25-p.x,W.wy(z)-p.y,0),nd*0.22,nd*0.22,nd*0.11,nd*0.09),MAT.skin,{skin:1});g.add(py);}
      if(p.kind==='rpod'){const fz=F.at(p.x).rz;g.add(mk(beamGeo(V(0,0,0),V(0,0,-p.side*(Math.abs(p.z)-fz*0.7)),nd*0.16,nd*0.16,nl*0.5,nl*0.45),MAT.skin,{skin:1}));}
      if(p.kind==='tailpod'){const a=F.at(p.x);g.position.y=a.cy+a.ry+nd*0.45;g.userData.base=g.position.clone();p.y=g.position.y;}
      const core=mk(cylX(nd*0.2,nd*0.17,nl*0.75,20),MAT.hot,{temp:.8});core.position.x=-nl*0.12;inner.prop.add(Object.assign(core,{}));core.position.add(g.position);
    } else if(p.kind==='sduct'){
      const xi=-L/2+0.2*L+nd*0.5,a=F.at(xi),yi=a.cy+a.ry+nd*0.42;
      g.position.set(0,0,0);g.userData.base=V();
      g.add(mk(latheX([[nd*0.38,nd*0.2],[nd*0.5,0],[nd*0.52,-nd*0.9],[nd*0.42,-nd*1.6]],28).translate(xi,yi,0),MAT.skin,{skin:1}));
      g.add(mk(new THREE.CircleGeometry(nd*0.36,24).rotateY(Math.PI/2).translate(xi-nd*0.2,yi,0),MAT.black));
      const xt=-L/2,at=F.at(xt+0.3);g.add(mk(latheX([[nd*0.42,0.6],[nd*0.4,0],[nd*0.36,-0.4]],24).translate(xt,at.cy,0),MAT.hot,{temp:.7}));
      p.x=xt-0.2;p.y=at.cy;
    } else if(p.kind==='tp'||p.kind==='radial'){g.add(podProp(e,nd,nl,R,p.kind==='radial'));
      const core=mk(cylX(nd*0.22,nd*0.2,nl*0.5,16),MAT.hot,{temp:.75});core.position.copy(g.position);inner.prop.add(core);
    } else if(p.kind==='noseprop'){
      const prop=grp();prop.add(mk(coneX(R*0.32,R*0.6,20).translate(R*0.28,0,0),MAT.dark));
      prop.add(ringInst(e.blades,bladeGeo(R*0.14,e.dia/2,e.dia*0.08,e.dia*0.045,0.25,1.3,0.09,4,e.blades>2?-e.dia*0.05:0),e.blades>2?MAT.cfrp:MAT.alum));spinAnim(prop,11);g.add(prop);
      const core=mk(cylX(R*0.45,R*0.42,F.nose*0.9,16),MAT.hot,{temp:.7});core.position.set(p.x-F.nose*0.5,p.y,0);inner.prop.add(core);
    } else if(p.kind==='ssbox'){
      const len=p.len,w=nd*2.15,hh=nd*1.15;g.add(mk(beamGeo(V(len/2,0,0),V(-len/2,0,0),hh,hh*0.9,w,w*0.95),MAT.skin,{skin:1}));
      g.add(mk(new THREE.PlaneGeometry(w*0.92,hh*0.8).rotateY(Math.PI/2).translate(len/2+0.01,0,0),MAT.black));
      [-1,1].forEach(s=>{g.add(mk(latheX([[nd*0.46,0.2],[nd*0.42,-0.9]],20).translate(-len/2-0.2,-hh*0.05,s*nd*0.52),MAT.hot,{temp:.85}));
        const c=mk(cylX(nd*0.4,nd*0.4,len*0.8,16),MAT.hot,{temp:.8});c.position.set(p.x-len*0.05,p.y,p.z+s*nd*0.52);inner.prop.add(c);});
    } else if(p.kind==='fnoz'){
      const r=e.dia*0.55,a=F.at(p.x);g.position.y=a.cy;g.userData.base=g.position.clone();p.y=a.cy;
      if(ac.id==='f22')g.add(mk(beamGeo(V(0.4,0,0),V(-1.3,0,0),r*1.5,r*1.0,r*1.9,r*1.7),MAT.dark,{temp:.6}));
      else g.add(mk(latheX([[r*1.05,0.6],[r,0],[r*0.86,-1.2]],24),MAT.dark,{temp:.6}));
      g.add(mk(new THREE.CircleGeometry(r*0.8,20).rotateY(-Math.PI/2).translate(-0.6,0,0),MAT.glow,{temp:1}));
      const c=mk(cylX(r*0.9,r*0.9,L*0.42,16),MAT.hot,{temp:.8});c.position.set(-L/2+L*0.3,a.cy,p.z);inner.prop.add(c);
      // intakes
      const flag=ac.flags,xi0=L/2-0.36*L,xi1=W.rootLE-W.chord(0)*0.3;
      if(p.side>=0||ac.nEng===1){const ints=flag.has('chin')?[[0,-1]]:flag.has('under')?[[1,-0.75],[-1,-0.75]]:[[1,-0.05],[-1,-0.05]];
        if(p.side>0||ac.nEng===1)ints.forEach(([zs,ys])=>{const ai=F.at(xi0);const zz=zs*(flag.has('chin')?0:(flag.has('under')?F.rz*0.62:ai.rz+0.32));const yy=ai.cy+ys*ai.ry*(flag.has('chin')||flag.has('under')?1:0.4);
          const im=mk(beamGeo(V(xi0,yy,zz),V(xi1,yy*0.6,zz*0.9),R*0.62,R*0.5,flag.has('chin')?R*1.1:R*0.48,R*0.42),MAT.skin,{skin:1});sys.prop.add(im);
          sys.prop.add(mk(new THREE.PlaneGeometry(flag.has('chin')?R*1.0:R*0.4,R*0.55).rotateY(Math.PI/2).translate(xi0+0.02,yy,zz),MAT.black));});}
    } else if(p.kind==='buried'){
      const hg=new THREE.SphereGeometry(1,20,10,0,TAU,0,Math.PI/2);hg.scale(5,0.75,1.05);g.add(mk(hg,MAT.skin,{skin:1}));
      g.add(mk(new THREE.PlaneGeometry(1.4,0.5).rotateY(Math.PI/2).translate(4.6,0.3,0),MAT.black));
      g.add(mk(beamGeo(V(-4.5,0.2,0),V(-8.5,0.05,0),0.3,0.15,1.3,1.6),MAT.dark,{temp:.55}));
      const c=mk(cylX(0.5,0.45,4,14),MAT.hot,{temp:.8});c.position.set(p.x-1,p.y-0.2,p.z);inner.prop.add(c);
    } else if(p.kind==='srnac'){
      const len=L*0.62,r=nd*0.62,s=[];for(let i=0;i<=16;i++){const f=i/16,x=len*0.5-f*len;const rr=r*(f<0.12?0.55+3.75*f:f>0.85?1-(f-0.85)*1.2:1);s.push({x,ry:rr,rz:rr});}
      g.add(mk(tubeGeo(s,28),MAT.skin,{skin:1}));
      g.add(mk(coneX(r*0.55,len*0.16,24).translate(len*0.5+len*0.06,0,0),MAT.skin,{skin:1,spike:1}));
      g.add(mk(new THREE.CircleGeometry(r*0.75,20).rotateY(-Math.PI/2).translate(-len*0.5-0.02,0,0),MAT.glow,{temp:1}));
      const c=mk(cylX(r*0.7,r*0.7,len*0.6,16),MAT.hot,{temp:.8});c.position.set(p.x,p.y,p.z);inner.prop.add(c);
    }
    g.userData.exit=V(p.x-(p.kind==='pod'||p.kind==='rpod'||p.kind==='tailpod'?nl*0.7:p.kind==='ssbox'?6:p.kind==='srnac'?L*0.33:p.kind==='buried'?8.5:p.kind==='fnoz'?1.2:p.kind==='tp'||p.kind==='radial'?nl*0.4:0),p.kind==='sduct'||p.kind==='buried'?p.y:g.position.y,p.z);
    sys.prop.add(g);engs.push(g);
  });
  // ----- ground plane
  const groundY=groundOf(ac,F,W,EP);
  // ----- empennage
  const T=tailDef(ac,F,W,groundY,EP);
  const empG=ex(grp(),V(-1,0.25,0));sys.emp.add(empG);
  T.surfaces.forEach(s=>{const holder=grp();const m=mk(loft(s.secs,AF,s.vertical),MAT.skin,{skin:1});holder.add(m);if(s.pivot){holder.position.copy(s.pivot);m.position.copy(s.pivot).negate();holder.rotation.x=s.cant||0;}if(s.mirror)holder.scale.z=-1;empG.add(holder);
    if(s.ctrl){const cm=mk(segLoft(s.secs,s.ctrl,1,s.vertical,1.12),MAT.ctrl);const ch=grp();ch.add(cm);if(s.pivot){ch.position.copy(s.pivot);cm.position.copy(s.pivot).negate();ch.rotation.x=s.cant||0;}if(s.mirror)ch.scale.z=-1;inner.emp.add(ch);}});
  if(T.apu)inner.emp.add(mk(cylX(T.apu.r,T.apu.r*0.8,T.apu.len,14).translate(T.apu.x,T.apu.y,0),MAT.hot,{temp:.6}));
  if(T.jack)inner.emp.add(mk(new THREE.CylinderGeometry(T.jack.r,T.jack.r,T.jack.h,10).translate(T.jack.x,T.jack.y,0),MAT.gold));
  // ----- landing gear
  const GP=gearPlan(ac,F,W,groundY,EP),gearG=ex(grp(),V(0,-1,0));sys.gear.add(gearG);
  GP.legs.forEach(l=>{const r=l.r,h=Math.max(l.top-(groundY+r)-(l.n>2?r*0.2:0),r*0.7);const {g}=gearLeg(r,l.n,h,{side:l.side||1});g.position.set(l.x,l.top,l.z);gearG.add(g);if(!l.tail&&!F.ga)motion.gear.push({g,axis:l.nose||l.z===0?'z':'x',ang:l.nose||l.z===0?Math.PI/2:(l.z>0?1:-1)*Math.PI/2});});
  // ----- internals: wing structure, fuselage, cockpit
  const WP=wingParts(ac,F,W);
  Object.values(WP).forEach(arr=>arr.forEach(m=>{inner.wing.add(m);const c=m.clone();c.scale.z=-1;inner.wing.add(c);}));
  fusInternals(ac,F,W,inner.fus);
  cockpitInternals(ac,F,inner.cockpit);
  // centers for labels
  root.updateMatrixWorld(true);
  const centers={};Object.keys(sys).forEach(k=>{const b=new THREE.Box3();sys[k].traverse(o=>{if(o.isMesh&&!o.userData.internal){let p=o,ok=true;while(p&&p!==sys[k]){if(p.userData.internal){ok=false;break;}p=p.parent;}if(ok)b.expandByObject(o);}});centers[k]=b.isEmpty()?V():b.getCenter(V());});
  root.traverse(o=>{if(o.userData.ex&&!o.userData.base)o.userData.base=o.position.clone();});
  return {root,sys,inner,F,W,T,EP,GP,engs,groundY,centers,motion};
}

function tipDevice(ac,W,mat){
  const out=[],z=W.zMax,s=W.at(z),x=W.leX(z),y=W.wy(z),c=s.c,S=ac.S;
  const up=(h,cs,lean,curve=0,down=false)=>{const sg=down?-1:1;const secs=[{x,y,z:z-0.02,c:c*0.95,t:.09}];if(curve)secs.push({x:x-c*0.2,y:y+sg*h*0.25,z:z+h*0.17,c:c*0.72,t:.09});secs.push({x:x-c*lean,y:y+sg*h,z:z+h*(curve?0.26:0.08),c:c*cs,t:.09});return mk(loft(secs,AF,true),mat,{skin:1});};
  switch(ac.tip){case 'winglet':out.push(up(0.05*S,.42,.75));break;case 'sharklet':out.push(up(0.068*S,.35,.85,1));break;case 'blended':out.push(up(0.06*S,.3,.95,1));break;
    case 'split':out.push(up(0.055*S,.35,.9,1));out.push(up(0.022*S,.4,.55,0,true));break;case 'fence':out.push(up(0.022*S,.85,.15));out.push(up(0.016*S,.85,.1,0,true));break;}
  return out;
}

function tailDef(ac,F,W,groundY,EP){
  const L=ac.L,S=ac.S,tl=ac.tail,dk=ac.deck,jet=ac.sweep>12||F.fighter||F.ss,topY=groundY+ac.H;
  const T={surfaces:[],dims:{}};if(tl==='none'){T.apu={x:-2,y:0.3,r:0.4,len:1.6};return T;}
  const cf=(F.fighter?0.22:F.ss?0.26:dk==='bizjet'?0.16:F.ga?0.17:0.165)*L*(tl==='T'?0.95:1);
  const xr=-L/2+(F.ss?0.01:0.03)*L+cf;const a=F.at(xr-cf*0.4);let yr=a.cy+a.ry*0.8;
  if(ac.layout==='wing3t'){yr=a.cy+a.ry+EP.nd*1.0;}
  const fsw=Math.min((jet?40:F.ga?32:30)*(F.ss?1.35:1),62)*D2R;
  const hsSpan=(F.ga?0.31:dk==='bizjet'?0.34:0.36)*S*(F.cargo?1.05:1),hsSemi=hsSpan/2;
  const ch=(F.ga?0.13:0.105)*L*(tl==='T'?0.85:1),hsw=(jet?ac.sweep+5:F.ga?0:8)*D2R;
  const fin=(x0,y0,z0,c,h,ctr,cant=0,taper=0.42)=>{const pivot=V(0,y0,z0);T.surfaces.push({vertical:true,secs:[{x:x0,y:y0-0.25*a.ry,z:z0,c:c*1.05,t:.1},{x:x0-h*Math.tan(fsw),y:y0+h,z:z0,c:c*taper,t:.09}],ctrl:ctr,cant,pivot:cant?pivot:null,kind:'fin'});};
  const hs=(x0,y0,z0,c,semi,ctr,dih=0,mirror=true,kind='hs')=>{const secs=[{x:x0,y:y0,z:z0,c,t:.1},{x:x0-semi*Math.tan(hsw),y:y0+semi*Math.tan(dih),z:z0+semi,c:c*0.42,t:.09}];T.surfaces.push({vertical:false,secs,ctrl:ctr,kind});if(mirror)T.surfaces.push({vertical:false,secs,ctrl:ctr,mirror:true,kind});};
  if(tl==='canted'){const cant=(ac.id==='f35'?22:27)*D2R,zf=F.rz*0.62,fc=0.24*L,ap=F.at(xr);const y0=ap.cy+ap.ry*0.4;const h=(topY-y0)/Math.cos(cant);
    [1,-1].forEach(sd=>{const pv=V(0,y0,sd*zf);T.surfaces.push({vertical:true,secs:[{x:xr+fc*0.15,y:y0-0.15,z:sd*zf,c:fc,t:.08},{x:xr+fc*0.15-h*Math.tan(45*D2R),y:y0+h,z:sd*zf,c:fc*0.35,t:.07}],ctrl:0.72,cant:sd*cant,pivot:pv,kind:'fin'});});
    const hc=0.2*L;const x0=-L/2+0.02*L+hc;const hsec=[{x:x0,y:0,z:F.rz*0.5,c:hc,t:.05},{x:x0-0.31*S*Math.tan(42*D2R),y:0,z:F.rz*0.5+0.31*S,c:hc*0.35,t:.04}];
    T.surfaces.push({vertical:false,secs:hsec,ctrl:0,kind:'hs'},{vertical:false,secs:hsec,ctrl:0,mirror:true,kind:'hs'});
    T.apu={x:-L/2+0.3*L,y:-F.ry*0.3,r:0.3,len:0.9};T.jack={x:x0-hc*0.3,y:0,r:0.08,h:0.6};
  } else if(tl==='sr'){const n=EP.list.filter(p=>p.side>0)[0];const cant=-15*D2R,fc=0.17*L;[1,-1].forEach(sd=>{const y0=n.y+EP.nd*0.55,z=sd*Math.abs(n.z),x0=-L/2+0.12*L+fc;const h=(topY-y0)/Math.cos(cant);T.surfaces.push({vertical:true,secs:[{x:x0,y:y0,z,c:fc,t:.06},{x:x0-h*Math.tan(40*D2R),y:y0+h,z,c:fc*0.5,t:.05}],ctrl:0,cant:sd*cant,pivot:V(0,y0,z),kind:'fin'});});
  } else if(tl==='twin'){const x0=-L/2+0.02*L+ch*1.2,ap=F.at(x0-ch*0.6),y0=ap.cy+ap.ry*0.6;hs(x0,y0,0,ch*1.2,hsSemi*1.05,0.7,6*D2R);
    const ty=y0+hsSemi*1.05*Math.tan(6*D2R),tx=x0-hsSemi*1.05*Math.tan(hsw);[1,-1].forEach(sd=>{const h=topY-ty;T.surfaces.push({vertical:true,secs:[{x:tx+ch*0.1,y:ty-h*0.35,z:sd*hsSemi*1.05,c:ch*0.75,t:.1},{x:tx+ch*0.1-h*0.4,y:ty+h*0.65,z:sd*hsSemi*1.05,c:ch*0.5,t:.09}],ctrl:0.7,kind:'fin'});});
    T.apu={x:-L/2+0.04*L,y:ap.cy,r:0.5,len:2};T.jack={x:x0,y:y0,r:0.12,h:1.4};
  } else {
    let fh=Math.max(topY-yr,0.07*L);fin(xr,yr,0,cf,fh,0.68,0,tl==='T'?0.72:0.42);
    if(tl==='T'){const tx=xr-fh*Math.tan(fsw),ty=yr+fh;hs(tx+ch*0.05,ty,0,ch,hsSemi*0.92,0.7,-2*D2R);T.jack={x:tx-ch*0.2,y:ty-fh*0.15,r:ch*0.03,h:fh*0.25};}
    else if(tl==='cruc'){const tx=xr-fh*0.42*Math.tan(fsw),ty=yr+fh*0.42;hs(tx,ty,0,ch*0.9,hsSemi*0.9,0.7,0);T.jack={x:tx-ch*0.2,y:ty,r:ch*0.03,h:fh*0.2};}
    else if(tl==='conv'||tl==='endplate'){const x0=-L/2+0.025*L+ch,ap=F.at(x0-ch*0.5),y0=ap.cy+ap.ry*0.1;hs(x0,y0,ap.rz*0.2,ch,hsSemi,0.7,(F.ga?1:jet?6:3)*D2R);T.jack={x:x0,y:y0+ap.ry*0.45,r:ch*0.035,h:ap.ry*0.8};
      if(tl==='endplate'){const tx=x0-hsSemi*Math.tan(hsw),ty=y0+hsSemi*Math.tan(6*D2R);[1,-1].forEach(sd=>T.surfaces.push({vertical:true,secs:[{x:tx+ch*0.1,y:ty-1.2,z:sd*(hsSemi+ap.rz*0.2),c:ch*0.5,t:.1},{x:tx-1.3,y:ty+3.4,z:sd*(hsSemi+ap.rz*0.2),c:ch*0.32,t:.09}],ctrl:0,kind:'fin'}));}}
    T.dims={cf,fh,fsw};
    if(!F.ga&&ac.id!=='dc3'&&ac.id!=='conc'&&ac.id!=='t144'){const ax=-L/2+0.035*L,aa=F.at(ax);T.apu={x:ax,y:aa.cy,r:aa.ry*0.45,len:0.05*L};}
  }
  if(ac.flags.has('canard')){const cx=L/2-0.28*L,ap=F.at(cx);const secs=[{x:cx,y:ap.cy+ap.ry*0.3,z:ap.rz*0.7,c:0.13*L,t:.05},{x:cx-0.17*S*Math.tan(50*D2R),y:ap.cy+ap.ry*0.3,z:ap.rz*0.7+0.17*S,c:0.03*L,t:.04}];T.surfaces.push({vertical:false,secs,ctrl:0,kind:'canard'},{vertical:false,secs,ctrl:0,mirror:true,kind:'canard'});}
  if(ac.flags.has('moustache')){const cx=L/2-0.2*L,ap=F.at(cx);const secs=[{x:cx,y:ap.cy+ap.ry*0.55,z:ap.rz*0.85,c:0.05*L,t:.05},{x:cx-1.6,y:ap.cy+ap.ry*0.55,z:ap.rz*0.85+0.12*S,c:0.025*L,t:.04}];T.surfaces.push({vertical:false,secs,ctrl:0,kind:'canard'},{vertical:false,secs,ctrl:0,mirror:true,kind:'canard'});}
  T.dims=Object.assign({cf,fsw,ch,hsSemi,hsw},T.dims);
  return T;
}

function gearPlan(ac,F,W,gy,EP){
  const L=ac.L,G=ac.gear,r=wheelR(ac),legs=[];
  const mx=F.fw?W.rootLE-W.chord(0)*0.5:F.fighter?W.rootLE-W.at(0).c*0.42:F.ss?W.rootLE-W.at(0).c*(ac.wing==='chine'?0.42:0.6):W.rootLE-W.chord(F.rz)*0.62;
  const nx=L/2-(F.fw?0.25:F.fighter?0.27:F.ss?0.2:F.ga?0.1:ac.deck==='bizjet'?0.13:0.11)*L;
  const per=G.main,np=per.length,high=ac.wing==='high';
  if(np>=3||(high&&!ac.flags.has('nacgear'))){const rows=n=>n<=2?1:n===3?3:Math.ceil(n/2);const sp=r*2.3*Math.max(...per.map(rows))+r*0.5;const z=F.rz*(np>=5?0.66:0.84);
    per.forEach((n,i)=>{const x=mx+((np-1)/2-i)*sp;[1,-1].forEach(sd=>legs.push({x,z:sd*z,n,top:-F.ry*0.55,side:sd,r}));});}
  else if(np===2){const zw=F.rz*1.75,zb=F.rz*0.55;[1,-1].forEach(sd=>{legs.push({x:mx+r*1.4,z:sd*zw,n:per[0],top:W.wy(zw)-0.25,side:sd,r});legs.push({x:mx-r*3.4,z:sd*zb,n:per[1],top:-F.ry*0.6,side:sd,r});});}
  else if(np===1){const n=per[0];let z,top;
    if(ac.flags.has('nacgear')){const ep=EP.list.find(p=>p.side>0);z=Math.abs(ep.z);top=high?ep.y-EP.nd*0.3:W.wy(z);}
    else{z=F.fighter?F.rz*0.78:F.ga?F.rz*(high?1.15:2.3):F.fw?0.115*ac.S:F.ss?F.rz*(ac.wing==='chine'?2.2:2.5):F.rz*1.9;top=high&&!F.ga?-F.ry*0.6:(high&&F.ga?-F.ry*0.55:W.wy(z)-W.at(z).t*W.at(z).c*0.3);}
    [1,-1].forEach(sd=>legs.push({x:mx,z:sd*z,n,top,side:sd,r}));}
  G.center.forEach((n,i)=>legs.push({x:mx-r*2.6*(i+1),z:0,n,top:-F.ry*0.6,side:1,r}));
  const nr=r*0.75;
  if(G.nose>0){const a=F.at(nx),top=F.fw?-0.1:a.cy-a.ry*0.72;if(G.nose>=4)[1,-1].forEach(sd=>legs.push({x:nx,z:sd*F.rz*0.3,n:2,top,side:sd,r:nr,nose:1}));else legs.push({x:nx,z:0,n:G.nose,top,side:1,r:nr,nose:1});}
  if(ac.flags.has('td')){const tx=-L/2+0.07*L,a=F.at(tx);legs.push({x:tx,z:0,n:1,top:a.cy-a.ry*0.7,side:1,r:r*0.4,nose:1,tail:1});}
  return {legs,r,mx,nx};
}

function wingParts(ac,F,W){
  const out={spars:[],ribs:[],tanks:[],slats:[],flaps:[],ail:[],spl:[],tip:[]};
  const delta=['ogee','dd','chine','cdelta','fighter','fwing'].includes(ac.wing),prop=ac.e.type==='TP'||ac.e.type==='PS';
  const z0=F.fw?4.4:Math.min(F.rz*0.9,W.zMax*0.2),z1=W.zMax*0.97,comp=ac.flags.has('composite');
  const sparMat=comp?MAT.cfrp:MAT.struct;
  const zs=[z0,...W.secs.map(s=>s.z).filter(z=>z>z0&&z<z1),z1];
  [delta?0.12:0.15,delta?0.7:0.64].forEach(cf=>{for(let i=0;i<zs.length-1;i++){const a=W.at(zs[i]),b=W.at(zs[i+1]);
    out.spars.push(mk(beamGeo(V(W.leX(zs[i])-cf*a.c,W.wy(zs[i]),zs[i]),V(W.leX(zs[i+1])-cf*b.c,W.wy(zs[i+1]),zs[i+1]),a.t*a.c*0.62,b.t*b.c*0.62,Math.max(a.c*0.012,0.04),Math.max(b.c*0.012,0.03)),sparMat,{wp:'spars'}));}});
  const nR=clamp(Math.round(W.zMax/1.6),6,26);
  for(let i=0;i<=nR;i++){const z=lerp(z0,z1,i/nR),s=W.at(z),le=W.leX(z),y=W.wy(z);out.ribs.push(mk(beamGeo(V(le-0.15*s.c,y,z),V(le-0.64*s.c,y,z),s.t*s.c*0.6,s.t*s.c*0.45,Math.max(s.c*0.01,0.03)),MAT.alum,{wp:'ribs'}));}
  [0.25,0.4,0.55].forEach(cf=>[1,-1].forEach(sg=>{const a=W.at(z0),b=W.at(z1);out.ribs.push(mk(beamGeo(V(W.leX(z0)-cf*a.c,W.wy(z0)+sg*a.t*a.c*0.33,z0),V(W.leX(z1)-cf*b.c,W.wy(z1)+sg*b.t*b.c*0.33,z1),0.04,0.025,0.06,0.04),MAT.alum,{wp:'ribs'}));}));
  [[z0,W.zMax*0.42],[W.zMax*0.44,W.zMax*0.8]].forEach(([a,b])=>out.tanks.push(mk(wingSeg(W,a,b,0.17,0.62,{tS:0.8}),MAT.fuel,{wp:'tanks'})));
  if(!F.fw)out.tanks.push(mk(wingSeg(W,0,z0,0.17,0.62,{tS:0.8,n:1}),MAT.fuel,{wp:'tanks'}));
  if(!(ac.wing==='ogee'||ac.wing==='dd'||ac.wing==='chine'||F.fw))out.slats.push(mk(wingSeg(W,W.zMax*(prop?0.12:0.3),W.zMax*0.96,-0.015,0.11,{tS:1.12}),prop?MAT.black:MAT.ctrl,{wp:'slats'}));
  if(delta){out.flaps.push(mk(wingSeg(W,z0,W.zMax*0.5,0.8,1,{tS:1.15}),MAT.ctrl,{wp:'flaps'}));out.ail.push(mk(wingSeg(W,W.zMax*0.52,W.zMax*0.92,0.78,1,{tS:1.15}),MAT.ctrl,{wp:'ail'}));}
  else{out.flaps.push(mk(wingSeg(W,z0,W.zMax*0.34,0.72,1,{tS:1.15}),MAT.ctrl,{wp:'flaps'}));out.flaps.push(mk(wingSeg(W,W.zMax*0.36,W.zMax*0.72,0.74,1,{tS:1.15}),MAT.ctrl,{wp:'flaps'}));
    out.ail.push(mk(wingSeg(W,W.zMax*0.74,W.zMax*0.93,0.76,1,{tS:1.15}),MAT.ctrl,{wp:'ail'}));
    if(!F.ga&&!prop)for(let i=0;i<5;i++){const a=lerp(W.zMax*0.3,W.zMax*0.7,i/5),b=a+W.zMax*0.075;out.spl.push(mk(wingSeg(W,a,b,0.6,0.73,{tS:1.14,n:1}),MAT.ctrl,{wp:'spl'}));}}
  tipDevice(ac,W,MAT.ctrl).forEach(m=>{m.userData.wp='tip';out.tip.push(m);});
  if(ac.tip==='folding'){const zf=W.zMax-3.6;out.tip.push(mk(loft(wingSecs(W,zf,W.zMax),AF,false,1.06),MAT.ctrl,{wp:'tip'}));}
  if(ac.tip==='raked'){const zr=W.secs[W.secs.length-2].z;out.tip.push(mk(loft(wingSecs(W,zr,W.zMax),AF,false,1.06),MAT.ctrl,{wp:'tip'}));}
  return out;
}

function fusInternals(ac,F,W,g){
  const L=ac.L,x0=-L/2+F.tail*0.55,x1=L/2-F.nose*0.85;if(F.fw){g.add(mk(boxG(6,1,5).translate(-1,0,0),MAT.uld));return;}
  const n=clamp(Math.round((x1-x0)/(F.fighter?0.45:0.9)),12,90),tor=new THREE.TorusGeometry(1,0.012,5,40).rotateY(Math.PI/2);
  g.add(inst(tor,MAT.struct,range(n).map(i=>{const x=lerp(x0,x1,i/(n-1)),a=F.at(x);return M4(V(x,a.cy,0),null,V(1,a.ry*0.985,a.rz*0.985));})));
  const yf=F.cargo?-F.ry*0.55:-F.ry*0.32,w=F.rz*1.8;
  if(!F.fighter){g.add(mk(beamGeo(V(x1,yf,0),V(x0+F.tail*0.2,yf,0),0.06,0.06,w,w),MAT.alum));
    if(ac.deck==='double')g.add(mk(beamGeo(V(x1-F.nose*0.1,F.ry*0.3,0),V(x0+F.tail*0.3,F.ry*0.3,0),0.06,0.06,w*0.94,w*0.9),MAT.alum));
    if(ac.deck==='hump'||ac.deck==='hump8')g.add(mk(beamGeo(V(L/2-F.nose*0.5,F.ry*0.55,0),V(L/2-F.nose*0.4-(ac.deck==='hump8'?0.38:0.3)*L,F.ry*0.55,0),0.05,0.05,F.rz*1.1),MAT.alum));
    if(ac.D>4.5&&!F.cargo){const m=[];for(let x=x0+F.tail*0.3;x<x1-F.nose*0.4;x+=1.7){if(Math.abs(x-(W.rootLE-W.chord(0)*0.4))<W.chord(0)*0.55)continue;[-1,1].forEach(s=>m.push(M4(V(x,yf-F.ry*0.3,s*F.rz*0.4))));}g.add(inst(boxG(1.53,1.6,1.5),MAT.uld,m));}
    if(F.cargo){const m=[];for(let x=x0+F.tail*0.5;x<x1-F.nose*0.3;x+=2.8)m.push(M4(V(x,yf+0.9,0)));g.add(inst(boxG(2.6,1.8,F.rz*1.2),MAT.uld,m));}
    else if(!F.ss||ac.id==='conc'){const co=cabinFor(ac),m=[],seatW=0.5,cols=Math.max(2,Math.floor(F.rz*2/seatW)-2+(co[3]||0)),pt=co[2]||0.82;for(let x=x0+F.tail*0.4;x<x1-F.nose*0.35;x+=pt)for(let c=0;c<cols;c++){const z=-F.rz*0.82+c*(F.rz*1.64/(cols-1));if(Math.abs(z)<0.35&&cols>4)continue;m.push(M4(V(x,yf+0.5,z)));}g.add(inst(boxG(0.5,1.0,0.44),MAT.seat,m.slice(0,1400)));}
  } else g.add(mk(beamGeo(V(0.1*L,-F.ry*0.3,0),V(-0.25*L,-F.ry*0.3,0),F.ry*0.9,F.ry*0.8,F.rz*0.9),MAT.fuel));
  const ex=W.rootLE-W.chord(0)*0.3;if(!F.fighter)[1,-1].forEach(s=>g.add(mk(boxG(2.2,0.9,1.0).translate(ex,-F.ry*0.72,s*F.rz*0.45),MAT.copper,{temp:.35})));
  const dx=-L/2+F.tail*0.9,da=F.at(dx);const dome=new THREE.SphereGeometry(1,24,12,0,TAU,0,Math.PI/2).rotateZ(Math.PI/2);dome.scale(da.ry*0.4,da.ry*0.98,da.rz*0.98);g.add(mk(dome.translate(dx,da.cy,0),MAT.struct));
}
function cockpitInternals(ac,F,g){
  const L=ac.L,xn=L/2,fx=xn-F.nose*(F.fighter?0.35:0.75),a=F.at(fx),yf=a.cy-a.ry*0.35;
  const seats=F.fighter?[0]:ac.id==='sr71'?[0]:[1,-1];
  if(F.fw){g.add(mk(boxG(0.8,0.9,0.6).translate(L/2-3.5,0.6,0.5),MAT.seat),mk(boxG(0.8,0.9,0.6).translate(L/2-3.5,0.6,-0.5),MAT.seat));return;}
  seats.forEach(s=>g.add(mk(boxG(0.6,1.1,0.55).translate(fx,yf+0.5,s*a.rz*0.42),MAT.seat)));
  if(ac.id==='sr71')g.add(mk(boxG(0.6,1.1,0.55).translate(fx-2.2,yf+0.5,0),MAT.seat));
  const px=fx+0.9,pa=F.at(px);g.add(mk(boxG(0.12,pa.ry*0.45,pa.rz*1.5).translate(px,pa.cy+pa.ry*0.05,0),MAT.dark));
  [-1,-0.33,0.33,1].forEach((s,i)=>g.add(mk(new THREE.PlaneGeometry(pa.rz*0.3,pa.rz*0.3).rotateY(-Math.PI/2).translate(px-0.07,pa.cy+pa.ry*0.08,s*pa.rz*0.48),new THREE.MeshBasicMaterial({map:pfdTexture(['pfd','nd','eng','pfd'][i]),toneMapped:false}))));
  const rx=xn-F.nose*0.1,ra=F.at(rx);if(!F.ga||ac.id==='pc12'){g.add(mk(new THREE.CircleGeometry(Math.max(ra.ry*0.75,0.2),24).rotateY(Math.PI/2).translate(rx,ra.cy,0),MAT.cyan));}
  g.add(mk(boxG(F.nose*0.4,a.ry*0.3,a.rz*0.8).translate(fx+0.3,a.cy-a.ry*0.7,0),MAT.green));
}

function groundOf(ac,F,W,EP){const e=ac.e,nd=EP.nd;
  const nacBottom=Math.min(0,...EP.list.filter(p=>p.kind==='pod'||p.kind==='tp'||p.kind==='radial').map(p=>p.y-(p.kind==='pod'?nd*0.5:Math.max(nd*0.5,e.dia/2))));
  const clr=F.fw?1.8:F.fighter?0.42*F.D+0.55:F.ss?(ac.wing==='chine'?1.4:0.4*F.D+1.7):F.ga?(ac.wing==='high'?0.55:0.5*F.D):ac.wing==='high'?0.18*F.D+0.25:ac.flags.has('td')?1.1:0.3*F.D+0.35;
  return F.fw?-clr-0.6:Math.min(-F.ry-clr,nacBottom-0.45);}

/* ---------- real cabin detail: windows on a 533 mm frame pitch, doors, belly fairing ---------- */
MAT.window=std(0x0a121a,{metalness:.9,roughness:.12});MAT.door=std(0x9ea7b0,{metalness:.5,roughness:.35});
function cabinDetail(ac,F,W,g){
  const L=ac.L,dk=ac.deck;if(['cargo','visor','beluga','fighter','fwing'].includes(dk)||ac.wing==='chine')return;
  const biz=dk==='bizjet',ga=dk==='ga',ss=dk==='ss';
  const pitch=biz?1.05:ga?0.95:ss?0.62:0.533,ww=biz?0.38:ga?0.55:ss?0.17:0.24,wh=biz?0.5:ga?0.42:ss?0.24:0.34;
  const geoW=cylZ(1,0.05,14);const mats=[];
  const row=(x0,x1,yr,pitchX,skipFn,lobe)=>{for(let x=x0;x>x1;x-=pitchX){if(skipFn&&skipFn(x))continue;const a=F.at(x);const cy=lobe?lobe.cy(x):a.cy,ry=lobe?lobe.ry:a.ry,rz=lobe?lobe.rz:a.rz;if(ry<F.ry*0.55)continue;
    const y=cy+ry*yr,z=rz*Math.sqrt(Math.max(0,1-yr*yr))+0.01;[1,-1].forEach(sd=>mats.push(M4(V(x,y,sd*z),qAx(AX,-sd*Math.asin(yr)*0.6),V(ww/2,wh/2,1))));}};
  const xa=L/2-F.nose*(ga?0.75:1.38),xb=-L/2+F.tail*(ga?0.8:1.0);
  const doors=[xa+0.6,-L/2+F.tail*0.98+0.4];if(L>45)doors.push(lerp(xa,xb,0.5));if(L>62)doors.push(lerp(xa,xb,0.25),lerp(xa,xb,0.75));
  const skip=x=>doors.some(d=>Math.abs(x-d)<0.9);
  row(xa,xb,ga?0.15:0.2,pitch,skip);
  if(dk==='double')row(L/2-F.nose*1.75,-L/2+F.tail*1.25,0.68,pitch,skip);
  if(dk==='hump'||dk==='hump8'){const len=(dk==='hump8'?0.42:0.34)*L;row(L/2-F.nose*0.55,L/2-F.nose*0.3-len*0.72,0.22,pitch,null,{cy:x=>F.at(x).cy+F.R*0.62,ry:F.R*0.66,rz:F.R*0.66});}
  g.add(inst(geoW,MAT.window,mats,{temp:.1}));
  if(!ga){const dm=[];const dw=biz?0.8:1.05,dh=biz?1.55:1.9;doors.forEach(x=>{const a=F.at(x);if(a.ry<F.ry*0.6)return;const z=a.rz+0.012;[1,-1].forEach(sd=>dm.push(M4(V(x,a.cy+a.ry*0.02,sd*z))));});
    g.add(inst(boxG(dw,dh,0.03),MAT.door,dm));}
  if(ac.wing==='low'&&ac.sweep>12&&!biz&&ac.layout!=='rear'&&ac.layout!=='rear3'){const c0=W.chord(0);const bf=new THREE.SphereGeometry(1,32,16);bf.scale(c0*0.78,F.ry*0.4,F.rz*0.93);g.add(mk(bf.translate(W.rootLE-c0*0.5,-F.ry*0.62,0),MAT.skin,{skin:1}));}
}
/* ---------- hinged control surfaces & flap-track fairings (L0 motion) ---------- */
function movingSurfaces(ac,F,W,g,motion){
  const delta=['ogee','dd','chine','cdelta','fighter','fwing'].includes(ac.wing),jet=ac.sweep>12,z0=F.fw?4.4:Math.min(F.rz*0.95,W.zMax*0.2);
  const hinge=(geo,za,zb,cf,surf,type,dv)=>{const pt=z=>{const s=W.at(z);return V(W.leX(z)-cf*s.c,W.wy(z)+surf*s.t*s.c*0.3,z);};const p0=pt(za),p1=pt(zb);
    const pv=grp();pv.position.copy(p0);const m=mk(geo,MAT.skin,{skin:1});m.position.copy(p0).negate();pv.add(m);g.add(pv);
    const c=W.chord((za+zb)/2);motion[type].push({pv,base:p0.clone(),axis:p1.sub(p0).normalize(),dv:dv?dv.multiplyScalar(c):V()});};
  if(delta){hinge(wingSeg(W,z0,W.zMax*0.5,0.8,1,{tS:1.04}),z0,W.zMax*0.5,0.8,0,'ail');hinge(wingSeg(W,W.zMax*0.52,W.zMax*0.92,0.78,1,{tS:1.04}),W.zMax*0.52,W.zMax*0.92,0.78,0,'ail');return;}
  [[z0,W.zMax*0.34,0.72],[W.zMax*0.36,W.zMax*0.72,0.74]].forEach(([a,b,cf])=>hinge(wingSeg(W,a,b,cf,1,{tS:1.04}),a,b,cf,-0.4,'flaps',V(-0.16,-0.04,0)));
  hinge(wingSeg(W,W.zMax*0.74,W.zMax*0.93,0.76,1,{tS:1.04}),W.zMax*0.74,W.zMax*0.93,0.76,0,'ail');
  if(jet){hinge(wingSeg(W,W.zMax*0.3,W.zMax*0.96,-0.012,0.11,{tS:1.06}),W.zMax*0.3,W.zMax*0.96,0.11,-0.6,'slats',V(0.07,-0.025,0));
    if(ac.deck!=='ga')for(let i=0;i<4;i++){const a=lerp(W.zMax*0.3,W.zMax*0.7,i/4),b=a+W.zMax*0.095;hinge(wingSeg(W,a,b,0.6,0.73,{tS:1.05,n:1}),a,b,0.6,0.85,'spl');}
    const n=ac.S>45?4:3;range(n).forEach(i=>{const z=W.zMax*[0.24,0.42,0.58,0.71][i],s=W.at(z),c=s.c;const f=new THREE.SphereGeometry(1,18,8);f.scale(c*0.34,c*0.055,c*0.05);g.add(mk(f.translate(W.leX(z)-c*0.92,W.wy(z)-s.t*c*0.32,z),MAT.skin,{skin:1}));});}
}
const PHASES={parked:{gear:1,flaps:0,slats:0,spl:0,rev:0,ail:0,fold:1},takeoff:{gear:1,flaps:0.45,slats:1,spl:0,rev:0,ail:0,fold:0},cruise:{gear:0,flaps:0,slats:0,spl:0,rev:0,ail:0,fold:0},approach:{gear:1,flaps:1,slats:1,spl:0,rev:0,ail:0.25,fold:0},rollout:{gear:1,flaps:1,slats:1,spl:1,rev:1,ail:0,fold:0}};
function applyMotion(AF,st){const M=AF.motion;if(!M)return;
  M.gear.forEach(({g,axis,ang})=>{g.rotation[axis]=ang*(1-st.gear);g.visible=st.gear>0.03;});
  M.flaps.forEach(f=>{f.pv.setRotationFromAxisAngle(f.axis,32*D2R*st.flaps);f.pv.position.copy(f.base).addScaledVector(f.dv,st.flaps);});
  M.slats.forEach(f=>{f.pv.setRotationFromAxisAngle(f.axis,-20*D2R*st.slats);f.pv.position.copy(f.base).addScaledVector(f.dv,st.slats);});
  M.spl.forEach(f=>f.pv.setRotationFromAxisAngle(f.axis,-48*D2R*st.spl));
  M.ail.forEach(f=>f.pv.setRotationFromAxisAngle(f.axis,12*D2R*st.ail));
  M.sleeves.forEach(p=>{p.userData.sleeve.position.x=-p.userData.nl*0.2*st.rev;});
  M.fold.forEach(pv=>pv.rotation.x=-1.4*st.fold);}

/* =====================================================================
   BLUEPRINT SYNTHESIZER — dimensioned top & side views (SVG) from the same data
   ===================================================================== */
function blueprintSVG(ac,view,o={}){
  const F=fuseDef(ac),W=wingDef(ac,F),EP=engPlan(ac,F,W),gy=groundOf(ac,F,W,EP),T=tailDef(ac,F,W,gy,EP),L=ac.L,S=ac.S;
  const f=n=>n.toFixed(2),P=pts=>'M'+pts.map(p=>f(p[0])+' '+f(p[1])).join('L')+'Z';const xs=range(41).map(i=>-L/2+L*(0.5-0.5*Math.cos(Math.PI*i/40)));
  const cls=o.cls||'bp';let body='',vb,dims='';const FS=(view==='top'?Math.max(L,S):L)*0.032;const lbl=(x,y,t,a='middle')=>`<text x="${f(x)}" y="${f(y)}" text-anchor="${a}" class="${cls}-t" font-size="${f(FS)}">${t}</text>`;
  if(view==='top'){const m=Math.max(L,S)*0.08,minX=-L/2-m,maxX=L/2+m,minY=-S/2-m*1.6,maxY=S/2+m*1.1;vb=[minX,minY,maxX-minX,maxY-minY];
    const fus=F.fw?'':P([...xs.map(x=>[-x,-F.at(x).rz]),...xs.slice().reverse().map(x=>[-x,F.at(x).rz])]);
    const wingPoly=sg=>{const sec=W.secs.filter(s=>!F.fw||true);const le=sec.map(s=>[-(W.rootLE-s.dx),sg*s.z]),te=sec.slice().reverse().map(s=>[-(W.rootLE-s.dx-s.c),sg*s.z]);return P([...le,...te]);};
    const surf=T.surfaces.filter(s=>!s.vertical).map(s=>{const sg=s.mirror?-1:1;const le=s.secs.map(q=>[-q.x,sg*q.z]),te=s.secs.slice().reverse().map(q=>[-(q.x-q.c),sg*q.z]);return P([...le,...te]);}).join('');
    const fins=T.surfaces.filter(s=>s.vertical).map(s=>{const a=s.secs[0];return P([[-a.x,a.z-0.08],[-(a.x-a.c),a.z-0.08],[-(a.x-a.c),a.z+0.08],[-a.x,a.z+0.08]]);}).join('');
    const engs=EP.list.map(p=>{if(p.kind==='pod'||p.kind==='rpod'||p.kind==='tailpod')return `<rect x="${f(-p.x-EP.nl/2)}" y="${f(p.z-EP.nd/2)}" width="${f(EP.nl)}" height="${f(EP.nd)}" rx="${f(EP.nd*0.3)}"/>`;
      if(p.kind==='tp'||p.kind==='radial')return `<rect x="${f(-p.x-EP.nl*0.5)}" y="${f(p.z-EP.nd/2)}" width="${f(EP.nl)}" height="${f(EP.nd)}" rx="${f(EP.nd*0.4)}"/><path d="M${f(-p.x-EP.nl*0.5-0.3)} ${f(p.z-ac.e.dia/2)}V${f(p.z+ac.e.dia/2)}" class="${cls}-g"/>`;
      if(p.kind==='noseprop')return `<path d="M${f(-L/2-0.25)} ${f(-ac.e.dia/2)}V${f(ac.e.dia/2)}" class="${cls}-g"/>`;
      if(p.kind==='ssbox')return `<rect x="${f(-p.x-5.5)}" y="${f(p.z-EP.nd*1.07)}" width="11" height="${f(EP.nd*2.15)}"/>`;
      if(p.kind==='srnac')return `<rect x="${f(-p.x-L*0.31)}" y="${f(p.z-EP.nd*0.62)}" width="${f(L*0.62)}" height="${f(EP.nd*1.24)}" rx="${f(EP.nd*0.6)}"/>`;return '';}).join('');
    body=`<path d="${wingPoly(1)}${wingPoly(-1)}" class="${cls}-w"/><path d="${surf}" class="${cls}-w"/>${fus?`<path d="${fus}" class="${cls}-f"/>`:''}<path d="${fins}" class="${cls}-f"/><g class="${cls}-e">${engs}</g>`;
    const yL=maxY-m*0.45,xS=minX+m*0.45;dims=`<path d="M${f(-L/2)} ${f(yL)}H${f(L/2)}M${f(-L/2)} ${f(yL-m*0.25)}v${f(m*0.5)}M${f(L/2)} ${f(yL-m*0.25)}v${f(m*0.5)}" class="${cls}-d"/>${lbl(0,yL-m*0.15,'LENGTH '+ac.L+' m')}<path d="M${f(xS)} ${f(-S/2)}V${f(S/2)}" class="${cls}-d"/>${lbl(minX+m*0.15,minY+m*0.75,'SPAN '+ac.S+' m','start')}`;
  } else {const H=ac.H,m=L*0.06,minX=-L/2-m,maxX=L/2+m,top=-(gy+H)-m*1.2,bot=-gy+m*0.9;vb=[minX,top,maxX-minX,bot-top];
    const fus=F.fw?P([[-L/2,-0.2],[-L/2+4,-1.9],[L/2-6,-1.1],[L/2,0.3],[L/2-8,1.2]]):P([...xs.map(x=>[-x,-(F.at(x).cy+F.at(x).ry)]),...xs.slice().reverse().map(x=>[-x,-(F.at(x).cy-F.at(x).ry)])]);
    let extra='';if(ac.deck==='hump'||ac.deck==='hump8'){const len=(ac.deck==='hump8'?0.42:0.34)*L,x0=L/2-F.nose*0.3;extra=`<path d="M${f(-x0)} ${f(-F.at(x0).cy-F.R*0.6)}C${f(-x0+len*0.12)} ${f(-F.R*1.3)} ${f(-x0+len*0.6)} ${f(-F.R*1.3)} ${f(-x0+len)} ${f(-F.R*0.95)}" class="${cls}-f"/>`;}
    if(ac.deck==='beluga')extra=`<ellipse cx="${f(-(L/2-0.52*L))}" cy="${f(-F.R*0.95)}" rx="${f(0.4*L)}" ry="${f(F.R*1.55)}" class="${cls}-f"/>`;
    const fins=T.surfaces.filter(s=>s.vertical&&(!s.secs[0].z||s.secs[0].z>0)).map(s=>{const a=s.secs[0],b=s.secs[s.secs.length-1];return P([[-a.x,-a.y],[-b.x,-b.y],[-(b.x-b.c),-b.y],[-(a.x-a.c),-a.y]]);}).join('');
    const hs=T.surfaces.filter(s=>!s.vertical&&!s.mirror).map(s=>{const a=s.secs[0];return `<path d="M${f(-a.x)} ${f(-a.y)}H${f(-(a.x-a.c))}" class="${cls}-g"/>`;}).join('');
    const wr=W.secs[0],wt=W.secs[W.secs.length-1];const wing=P([[-(W.rootLE),-W.y0],[-(W.rootLE-wt.dx),-W.wy(wt.z)],[-(W.rootLE-wt.dx-wt.c),-W.wy(wt.z)],[-(W.rootLE-wr.c),-W.y0-wr.c*wr.t*0.4]]);
    const engs=EP.list.filter(p=>p.side>=0).map(p=>{if(p.kind==='pod'||p.kind==='rpod'||p.kind==='tailpod'){const y=p.kind==='tailpod'?F.at(p.x).cy+F.at(p.x).ry+EP.nd*0.45:p.y;return `<rect x="${f(-p.x-EP.nl/2)}" y="${f(-y-EP.nd/2)}" width="${f(EP.nl)}" height="${f(EP.nd)}" rx="${f(EP.nd*0.4)}"/>`;}
      if(p.kind==='tp'||p.kind==='radial')return `<circle cx="${f(-p.x-EP.nl*0.5)}" cy="${f(-p.y)}" r="${f(ac.e.dia/2)}" class="${cls}-g"/>`;return '';}).join('');
    const GP=gearPlan(ac,F,W,gy,EP);const gear=GP.legs.filter(l=>l.z>=0).map(l=>`<path d="M${f(-l.x)} ${f(-l.top)}V${f(-gy-l.r)}" class="${cls}-g"/><circle cx="${f(-l.x)}" cy="${f(-gy-l.r)}" r="${f(l.r)}"/>`).join('');
    body=`<path d="M${f(minX)} ${f(-gy)}H${f(maxX)}" class="${cls}-d"/><path d="${fins}" class="${cls}-w"/>${extra}<path d="${fus}" class="${cls}-f"/><path d="${wing}" class="${cls}-w"/>${hs}<g class="${cls}-e">${engs}${gear}</g>`;
    const xh=maxX-m*0.4;dims=`<path d="M${f(xh)} ${f(-gy)}V${f(-(gy+H))}" class="${cls}-d"/>${lbl(xh-m*0.15,-(gy+H)-m*0.35,'HEIGHT '+H+' m','end')}`;}
  return `<svg viewBox="${vb.map(f).join(' ')}" class="${cls}" role="img" aria-label="${view} view blueprint of ${ac.name}" preserveAspectRatio="xMidYMid meet">${body}${dims}</svg>`;
}
/* =====================================================================
   4-LEVEL DISSECTION HIERARCHY  (L0 aircraft → L1 system → L2 sub-assembly → L3 part)
   ===================================================================== */
const SYS_ORDER=['prop','wing','gear','cockpit','fus','emp'];
const isDelta=ac=>['ogee','dd','chine','cdelta','fighter','fwing'].includes(ac.wing);
const isMilFighter=ac=>ac.deck==='fighter';
function sysName(ac,k){
  const e=ac.e;
  return {prop:`Propulsion (${e.name})`,
    wing:ac.wing==='fwing'?'Blended Wing Structure & Controls':isDelta(ac)?'Delta Wing, Spars, Fuel & Elevons':'Wing Box, Spars, Fuel & Flight Controls',
    gear:'Landing Gear & Braking',cockpit:isMilFighter(ac)?'Cockpit, Canopy & AESA Radar':ac.deck==='fwing'?'Crew Station & Avionics':'Cockpit, Avionics & Radome',
    fus:isMilFighter(ac)?'Fuselage, Bulkheads & Weapons Bay':(ac.deck==='cargo'||ac.deck==='visor'||ac.deck==='beluga')?'Fuselage, Bulkheads & Cargo Bay':ac.deck==='fwing'?'Centerbody & Weapons Bay':'Fuselage, Bulkheads & Cabin',
    emp:ac.tail==='none'?'Trailing-Edge Controls & APU':ac.tail==='fin'?'Vertical Tail, Rudder & Foreplanes':'Empennage, Trim & APU'}[k];
}
const M=(name,kind,p={})=>({name,kind,p});
function l2Defs(ac,sys){
  const e=ac.e,t=e.type,st=e.st,F=ac.flags,L=[];const add=(key,name,kind,micro,p)=>L.push({key,name,kind,micro,p});
  if(sys==='prop'){
    if(t==='TF'||t==='TFI'){const three=e.flags.includes('3S');
      add('nac',t==='TFI'?'Serpentine Inlet Duct & RAM Liner':'Intake Nacelle & Acoustic Liner','nac',[M('Inlet Lip & Anti-Ice Ring','ring'),M('Acoustic Liner (Honeycomb Panels)','liner'),M(t==='TFI'?'Serpentine Duct Section':'Fan Cowl Doors & Hinges','cowl')]);
      add('fan',t==='TFI'?`Fan (${st.lpc}-stage, low bypass)`:`Fan Stage & Spinner (${e.blades} blades)`,'fan',[M(t==='TFI'?'Fan Stage 1 Rotor':`Wide-Chord Fan Blades ×${e.blades}`,'rotor',{stage:'fan'}),M('Spinner & Fan Disk','spinner'),M('Fan Case Containment Ring','ring')]);
      if(e.flags.includes('G'))add('fdgs','Fan Drive Gear System (3.06 : 1)','fdgs',[M('Star Gear Train (5 star gears)','planetary',{n:5}),M('Journal Bearings & Oil Jets','bearing')]);
      if(st.lpc>0&&t==='TF')add('lpc',three?`Intermediate-Pressure Compressor (${st.lpc}-stage)`:`Low-Pressure Compressor / Booster (${st.lpc}-stage)`,'lpc',range(st.lpc).map(i=>M(`${three?'IPC':'Booster'} Stage ${i+1} Rotor`,'rotor',{stage:'lpc',i,n:st.lpc})));
      add('hpc',`High-Pressure Compressor (${st.hpc}-stage)`,'hpc',[...range(st.hpc).map(i=>M(`Stage ${i+1} Blisk`,'rotor',{stage:'hpc',i,n:st.hpc})),M('Variable Stator Vane Actuation','vsv')]);
      add('comb','Annular Combustor Chamber','comb',[M('Annular Liner & Thermal Barrier Coat','combustor'),M(`Fuel Nozzle Injectors ×${Math.round(16+e.thrust/25)}`,'nozzles'),M('Igniter Plugs','igniter')]);
      add('hpt',`High-Pressure Turbine (${st.hpt}-stage)`,'hpt',[M('Stage 1 Nozzle Guide Vanes','ngv'),...range(st.hpt).map(i=>M(`HPT Stage ${i+1} Rotor`,'rotor',{stage:'hpt',i,n:st.hpt}))]);
      add('lpt',`Low-Pressure Turbine (${st.lpt}-stage)`,'lpt',[...range(st.lpt).map(i=>M(`LPT Stage ${i+1} Rotor`,'rotor',{stage:'lpt',i,n:st.lpt})),M('Coaxial LP / HP Shafts','shaft')]);
      add('exh',t==='TFI'?'Exhaust Mixer & Trough Nozzle':'Core/Bypass Nozzle & Thrust Reverser Cascades','exh',[M('Core Nozzle & Exhaust Plug','plug'),...(t==='TFI'?[]:[M('Reverser Cascades & Translating Sleeve','cascade')]),...(F.has('chev')?[M('Noise-Reducing Chevrons','chevron')]:[])]);
    } else if(t==='TP'){
      add('prop',`Composite ${e.blades}-Blade Propeller & Pitch Hub`,'tprop',[M('Scimitar Composite Blade','propblade'),M('Pitch-Change Hub & Actuator','pitchhub'),M('Spinner & Bulkhead','spinner')]);
      add('rgb','Planetary Reduction Gearbox','rgb',[M('Planetary Gear Train','planetary',{n:4}),M('Propeller Shaft & Torque Sensor','shaft')]);
      add('comp',st.lpc?`Axial-Centrifugal Compressor (${st.lpc} axial + centrifugal)`:`Axial Compressor (${st.hpc}-stage)`,'tpcomp',st.lpc?[...range(st.lpc).map(i=>M(`Axial Stage ${i+1}`,'rotor',{stage:'hpc',i,n:st.lpc+1})),M('Centrifugal Impeller','impeller')]:range(Math.min(st.hpc,6)).map(i=>M(`Axial Stage ${i+1}`,'rotor',{stage:'hpc',i,n:st.hpc})));
      add('comb',st.lpc?'Reverse-Flow Annular Combustor':'Annular Combustor','comb',[M('Combustor Liner','combustor'),M('Fuel Nozzles','nozzles')]);
      add('turb','Compressor & Power Turbines','tpturb',[M('Compressor Turbine Disk','rotor',{stage:'hpt'}),M('Power Turbine Stage 1','rotor',{stage:'lpt',i:0,n:2}),M('Power Turbine Stage 2','rotor',{stage:'lpt',i:1,n:2})]);
      add('stub','Exhaust Stubs & Duct','stub',[M('Twin Exhaust Stubs','stubs')]);
    } else if(t==='PS'){const radial=e.flags==='radial';
      add('prop','Propeller & Spinner','pprop',[M(`${e.blades}-Blade ${radial?'Hamilton Standard Hydromatic':'Fixed-Pitch Aluminium'} Propeller`,'pprop'),M('Spinner','spinner')]);
      add('crank','Crankshaft & Connecting Rods','crank',[M('Crankshaft','crank'),M(radial?'Master & Articulated Rods':'Connecting Rod & Piston','piston')]);
      add('cyl',`${st.cyl} Cylinders & Pistons (${radial?'Twin-Row Radial':'Horizontally Opposed'})`,'cyl',[M('Cylinder, Piston & Rings','piston'),M('Valve Train (Rockers & Valves)','valves')]);
      add('cam',`${radial?'Cam Ring':'Camshaft'} & Dual Magnetos`,'cam',[M(radial?'Cam Ring':'Camshaft','camshaft'),M('Dual Magnetos','magneto')]);
      add('exh','Exhaust Manifold','pexh',[M('Exhaust Collector','manifold')]);
    } else {
      const trj=t==='TRJ';
      add('intake',F.has('spike')?'Translating Inlet Spike & Shock Cone':ac.deck==='ss'?'Variable Intake Ramps & Spill Door':F.has('chin')?'Chin Intake & S-Duct':ac.id==='f35'?'Diverterless Supersonic Inlet (DSI)':'Caret Intake & Serpentine Duct','intake',[M(F.has('spike')?'Inlet Spike (translating)':ac.deck==='ss'?'Variable Ramp Panels':'Intake Ramp & Duct','intake')]);
      if(trj)add('comp',`Multi-Stage Axial Compressor (${st.hpc}-stage)`,'abcomp',range(st.hpc).map(i=>M(`Compressor Stage ${i+1}`,'rotor',{stage:'hpc',i,n:st.hpc})));
      else{add('lpc',t==='TFAB'?`Fan / LP Compressor (${st.lpc}-stage)`:`LP Compressor (${st.lpc}-stage)`,'ablpc',range(st.lpc).map(i=>M(`LP Stage ${i+1} Rotor`,'rotor',{stage:'lpc',i,n:st.lpc})));
        add('hpc',`HP Compressor (${st.hpc}-stage)`,'abhpc',range(st.hpc).map(i=>M(`HP Stage ${i+1} Blisk`,'rotor',{stage:'hpc',i,n:st.hpc})));}
      add('comb','Annular Combustor','comb',[M('Combustor Liner','combustor'),M('Fuel Injectors','nozzles')]);
      add('turb',`Turbine (HP ${st.hpt}${st.lpt?` + LP ${st.lpt}`:''})`,'abturb',[...range(st.hpt).map(i=>M(`HP Turbine Stage ${i+1}`,'rotor',{stage:'hpt',i,n:st.hpt})),...range(st.lpt).map(i=>M(`LP Turbine Stage ${i+1}`,'rotor',{stage:'lpt',i,n:st.lpt}))]);
      if(trj)add('bypass','Compressor-Bleed Bypass Tubes (6)','bypass',[M('Bypass Tube & Bleed Valve','bypass')]);
      add('ab','Afterburner Spray Rings & Flameholders','ab',[M('Fuel Spray Rings','sprayring'),M('V-Gutter Flameholders','flameholder'),M('Afterburner Screech Liner','abliner')]);
      add('noz',ac.id==='f22'?'2D Thrust-Vectoring Nozzle':F.has('tvc')?'Axisymmetric Thrust-Vectoring Nozzle':ac.deck==='ss'&&!trj?'Variable Primary Nozzle & Reverser Buckets':'Convergent-Divergent Variable Nozzle','noz',[M(ac.id==='f22'?'Pitch-Vectoring Flaps':'Nozzle Petals & Actuation Ring','cdnozzle')]);
    }
  }
  if(sys==='wing'){const d=isDelta(ac),comp=F.has('composite'),prop=t==='TP'||t==='PS';
    add('spars',`Front & Rear Spars (${comp?'CFRP':d&&ac.deck!=='fighter'?'Titanium':ac.deck==='fighter'?'Ti-6Al-4V':'Al 7085 / 7150'})`,'spars',[M('Front Spar Web & Caps','spar'),M('Rear Spar','spar'),M('Wing-to-Body Joint','joint')]);
    add('ribs','Wing Ribs & Stringers','ribs',[M('Machined Rib','rib'),M('Upper Skin Stringers','stringer')]);
    add('tanks','Integral Fuel Tanks (Center / Inner / Outer)','tanks',[M('Inner Tank & Boost Pumps','tank'),M('Fuel Quantity Probes','probes')]);
    if(!(ac.wing==='ogee'||ac.wing==='dd'||ac.wing==='chine'||ac.wing==='fwing'))add('slats',d?'Leading-Edge Flaps':prop?'Leading-Edge De-Icing Boots':'Leading-Edge Slats & Krueger Flaps','slats',[M(d?'LE Flap Segment':prop?'Pneumatic De-Icing Boot':'Slat on Curved Track',prop?'boot':'slat')]);
    add('flaps',d?'Inboard Elevons':(prop||ac.sweep<12)?'Trailing-Edge Slotted Flaps':'Inboard & Outboard Fowler Flaps','flaps',d?[M('Inboard Elevon','surface'),M('Elevon Power Control Unit','actuator')]:[M('Flap Panel on Track Carriage','flap'),M('Flap Track Fairing & Ball-Screw','flaptrack')]);
    add('ail',d?'Outboard Elevons':'Ailerons & Flaperons','ail',[M(d?'Outboard Elevon':'Aileron Panel','surface'),M('Servo-Actuator (Hydraulic)','actuator')]);
    if(!d&&!prop&&ac.deck!=='ga')add('spl','Spoilers / Speedbrakes','spl',[M('Spoiler Panel','spoiler'),M('Spoiler Actuator','actuator')]);
    const tipN={winglet:'Winglet',sharklet:'Sharklet',blended:'Curved Composite Wingtip',split:'Split-Tip Scimitar Winglet',fence:'Wingtip Fence',raked:'Raked Wingtip',folding:'Folding Wingtip & Actuator'}[ac.tip];
    if(tipN)add('tip',tipN,'tip',[M(tipN,ac.tip==='folding'?'fold':'tipdev')]);
  }
  if(sys==='gear'){const G=ac.gear,mw=Math.max(...G.main,...G.center,1);
    add('strut','Main Oleo-Pneumatic Shock Strut','strut',[M('Oleo Strut (Compression Stroke)','oleo'),M('Trunnion & Pivot Pin','trunnion')]);
    add('torque','Torque Links (Scissors)','torque',[M('Upper & Lower Torque Links','torque')]);
    add('brace','Side/Drag Braces & Uplock','brace',[M('Folding Side Brace & Lock Link','brace'),M('Uplock Hook Mechanism','uplock')]);
    add('act','Hydraulic Retraction Actuator','act',[M('Retraction Actuator Stroke','actuator')]);
    add('bogie',mw>2?`Bogie Beam (${mw}-wheel truck)`:mw===2?'Twin-Wheel Axle':'Axle & Wheel Fork','bogie',[M(mw>2?`${mw}-Wheel Bogie (pitch trimmer)`:'Axle & Hub',mw>2?'bogie':'axle',{n:mw})]);
    add('brakes',ac.deck==='ga'?'Disc Brake & Tire':'Carbon Multi-Disc Brake Pack & Tires','brakes',[M(ac.deck==='ga'?'Single-Disc Caliper Brake':'Carbon Heat-Sink Brake Stack','brake'),M('Radial Tire & Wheel Hub','tire')]);
    add('nose',F.has('td')?'Tailwheel Assembly':'Nose Gear & Steering','nose',[M(F.has('td')?'Castering Tailwheel':'Nose-Wheel Steering Actuator','steer'),M(F.has('td')?'Tailwheel Tire':'Nose Wheels','tire')]);
  }
  if(sys==='cockpit'){const fighter=isMilFighter(ac),analog=F.has('analog');const radar=RADARS[ac.id]||(ac.deck==='ga'?'Weather radar pod':'Weather Radar (WXR / RDR-4000 class)');
    add('radome',ac.deck==='fwing'?`Radar Arrays (${radar})`:fighter?`Radome & ${radar}`:'Radome & Weather Radar','radome',[M(radar,'radar')]);
    add('panel',analog?'Analog Instrument Panel':fighter||ac.deck==='fwing'?'Multifunction Displays':'Glass Instrument Panel','panel',analog?[M('Six-Pack Flight Instruments','display',{k:'pfd'}),M('Horizontal Situation Indicator','display',{k:'nd'}),M('Engine Gauge Cluster','display',{k:'eng'}),M('Autopilot Panel','display',{k:'mcp'})]
      :fighter||ac.deck==='fwing'?[M('Head-Up Display Symbology','display',{k:'pfd'}),M('Tactical Situation Display','display',{k:'nd'}),M('Engine MFD Page','display',{k:'eng'}),M('Systems MFD Page','display',{k:'sys'}),M('Up-Front Controller','display',{k:'mcp'})]
      :[M('Primary Flight Display','display',{k:'pfd'}),M('Navigation Display','display',{k:'nd'}),M(ac.ctl==='side'?'Engine / Warning Display (E/WD)':'EICAS Engine Display','display',{k:'eng'}),M(ac.ctl==='side'?'System Display (SD)':'Multifunction System Display','display',{k:'sys'}),M(ac.ctl==='side'?'Flight Control Unit (FCU)':'Mode Control Panel (MCP)','display',{k:'mcp'})]);
    add('ctl',ac.ctl==='side'?'Sidesticks & Throttle Quadrant':ac.ctl==='stick'?'Center Stick & Throttles':'Control Yokes & Columns','ctl',[M(ac.ctl==='side'?'Sidestick (Fly-by-Wire)':ac.ctl==='stick'?'Center Control Stick':'Yoke & Column','stick',{k:ac.ctl}),M('Rudder Pedals','pedals')]);
    add('seats',fighter||ac.deck==='fwing'||ac.id==='sr71'?'Ejection Seat':'Pilot Seats','seats',[M(fighter||ac.deck==='fwing'||ac.id==='sr71'?({f22:'ACES II',f35:'Martin-Baker US16E',rafl:'Martin-Baker Mk16F',ef2k:'Martin-Baker Mk16A',su57:'Zvezda K-36D-5',b2:'ACES II',sr71:'Lockheed SR-1'}[ac.id]+' Ejection Seat'):'Crew Seat (6-way)','seat',{eject:fighter||ac.deck==='fwing'||ac.id==='sr71'})]);
    add('ovh',fighter?'Head-Up Display & Canopy':'Overhead Systems Panel','ovh',[M(fighter?'Wide-Angle HUD Combiner':'Overhead Panel','overhead',{hud:fighter})]);
    add('eebay','Avionics (E&E) Bay','eebay',[M('Line-Replaceable Unit Racks','racks')]);
    if(F.has('droop'))add('droop','Droop Nose & Retractable Visor','droop',[M('Droop Nose (0° / 5° / 12.5°)','droop')]);
    if(ac.deck==='visor')add('visor','Upward-Hinged Nose Cargo Visor','visor',[M('Nose Visor Actuation','visorup')]);
  }
  if(sys==='fus'){const fighter=isMilFighter(ac),cargo=ac.deck==='cargo'||ac.deck==='visor';
    add('frames','Circumferential Frames & Longerons','frames',[M('Frame Section (Z-Frame)','frame'),M('Longerons & Stringers','stringer')]);
    add('bulk',fighter?'Cockpit Pressure Bulkhead':'Forward & Aft Pressure Bulkheads','bulk',[M('Aft Pressure Dome','dome')]);
    add('floor',ac.deck==='double'?'Floor Beams — Main & Upper Deck':(ac.deck==='hump'||ac.deck==='hump8')?'Floor Beams — Main & Upper Deck (Hump)':cargo||ac.deck==='beluga'?'Cargo Floor & Roller Rails':fighter||ac.deck==='fwing'?'Keel & Internal Fuel Cells':'Floor Beams & Seat Tracks','floor',[M(fighter?'Fuel Cell':'Floor Beam Grid',fighter?'tank':'floor')]);
    add('ecs',F.has('bleedless')?'Electric ECS Packs (Bleedless)':fighter?'ECS & Liquid Cooling Loop':'Environmental Control System (ECS) Packs','ecs',[M('Air Cycle Machine','acm'),M('Ram-Air Heat Exchanger','hx')]);
    add('cargo',fighter||ac.deck==='fwing'?(ac.deck==='fwing'?'Rotary Launcher Weapons Bay':F.has('wbay')?'Internal Weapons Bay':'Weapons Pylons & Hardpoints'):cargo?'Cargo Ramp & Pallets':ac.deck==='beluga'?'Main Deck Cargo Hold':ac.D>5?'Cargo Hold ULD Containers (LD3)':ac.deck==='ga'?'Baggage Compartment':'Cargo Hold (Bulk Bins)','cargo',[M(fighter||ac.deck==='fwing'?'Bay Doors & Launcher':cargo?'Aft Cargo Ramp':'LD3 Container',fighter||ac.deck==='fwing'?'bay':cargo?'ramp':'uld')]);
    if(!fighter&&!cargo&&ac.deck!=='fwing'&&ac.deck!=='beluga')add('cabin',ac.deck==='bizjet'?'Executive Cabin Suites':ac.deck==='ga'?'Cabin Seating':'Passenger Cabin Seat Rows','cabin',[M('Seat Row','seatrow')]);
  }
  if(sys==='emp'){const tl=ac.tail;
    if(tl==='none'){add('beaver','Beavertail (Gust Load Alleviation)','beaver',[M('Beavertail Panel','surface')]);add('drag','Split Drag Rudders','drag',[M('Split Drag Rudder','split')]);add('elevon','Outboard Elevons','elevon',[M('Elevon Panel','surface')]);add('apu','Auxiliary Power Unit','apu',[M('APU Turbine','apu')]);}
    else if(tl==='canted'){add('fin',ac.id==='su57'?'All-Moving Canted Fins':'Twin Canted Vertical Tails','fin',[M('Fin Torsion Box','finbox')]);if(ac.id!=='su57')add('rudder','Rudders','rudder',[M('Rudder Panel','surface')]);add('hs','All-Moving Stabilators','hs',[M('Stabilator','stab')]);add('jack','Stabilator Actuator','jack',[M('Stabilator Actuator','actuator')]);add('apu',ac.id==='f35'?'Integrated Power Package':'Auxiliary Power Unit','apu',[M('IPP / APU Turbine','apu')]);}
    else if(tl==='sr'){add('fin','All-Moving Canted Fins','fin',[M('Fin Torsion Box','finbox')]);add('jack','Fin Actuator','jack',[M('Fin Actuator','actuator')]);}
    else{add('fin',tl==='twin'?'Twin Endplate Fins':'Vertical Stabilizer','fin',[M('Fin Torsion Box','finbox')]);add('rudder','Rudder','rudder',[M('Rudder Panel','surface')]);
      if(tl!=='fin'){add('hs','Horizontal Stabilizer','hs',[M('Stabilizer Box','stab')]);add('elev','Elevators','elev',[M('Elevator Panel','surface')]);add('jack',ac.deck==='ga'?'Elevator Trim Tab':'Trim Jackscrew (THSA)','jack',[M(ac.deck==='ga'?'Trim Tab & Cable Drum':'Ball-Screw Jackscrew','jackscrew')]);}
      if(ac.id==='conc')add('trim','Aft Trim Fuel Tank','trim',[M('Trim Tank Transfer','tank')]);
      if(ac.flags.has('canard')||ac.flags.has('moustache'))add('canard',ac.flags.has('moustache')?'Retractable Canards':'Foreplanes (Canards)','canard',[M('Canard Surface','surface')]);
      if(!(ac.deck==='ga'||ac.id==='dc3'||ac.id==='conc'||ac.id==='t144'))add('apu','Auxiliary Power Unit (APU)','apu',[M('APU Gas Turbine','apu')]);}
  }
  return L.map(d=>Object.assign(d,{micro:d.micro||[]}));
}
function buildTree(ac){
  const nodes={};const root={id:'ac',name:ac.name,level:0,kind:'ac',children:[]};nodes.ac=root;
  SYS_ORDER.forEach(sk=>{const n={id:sk,sys:sk,name:sysName(ac,sk),level:1,kind:'sys',parent:root,children:[]};nodes[sk]=n;root.children.push(n);
    l2Defs(ac,sk).forEach(d=>{const id=sk+'/'+d.key,c={id,sys:sk,key:d.key,name:d.name,level:2,kind:d.kind,parent:n,children:[],p:d.p||{}};nodes[id]=c;n.children.push(c);
      d.micro.forEach((m,i)=>{const mid=id+'/'+i;nodes[mid]={id:mid,sys:sk,key:d.key,idx:i,name:m.name,level:3,kind:m.kind,p:m.p,parent:c,children:[]};c.children.push(nodes[mid]);});});});
  return {root,nodes};
}

/* =====================================================================
   LEVEL 2 — SUB-ASSEMBLY SYNTHESIZERS (with explode vectors)
   ===================================================================== */
function asmPart(A,key,ex,ud){const g=grp(Object.assign({node:A.sys+'/'+key,ex:ex||V()},ud));A.group.add(g);A.parts[key]=g;return g;}
function buildAssembly(ac,sys,AFR){
  const A={sys,group:grp(),parts:{},flows:[]};
  ({prop:asmProp,wing:asmWing,gear:asmGear,cockpit:asmCockpit,fus:asmFus,emp:asmEmp})[sys](A,ac,AFR);
  // stamp node ids on meshes, compute base centres
  A.group.updateMatrixWorld(true);
  Object.values(A.parts).forEach(p=>{p.userData.base=p.position.clone();const b=new THREE.Box3().setFromObject(p);p.userData.c0=b.isEmpty()?p.position.clone():b.getCenter(V());p.userData.cLocal=p.worldToLocal(p.userData.c0.clone());
    p.traverse(o=>{if(o!==p&&o.userData.ex&&!o.userData.base)o.userData.base=o.position.clone();});});
  return A;
}
const stageTemp=(stage,i=0,n=1)=>({fan:.06,lpc:.12+.06*i/n,hpc:.22+.3*i/Math.max(n-1,1),hpt:.96-.08*i,lpt:.68-.3*i/Math.max(n-1,1)}[stage]??.3);
function coreZones(D){return [[0.7*D,[0.2,0.6,1]],[0.4*D,[0.35,0.75,1]],[0.0,[1,0.6,0.15]],[-0.2*D,[1,0.97,0.9]],[-0.45*D,[1,0.45,0.1]],[-0.9*D,[0.9,0.12,0.05]],[-1.4*D,[0.35,0.05,0.02]]];}

function asmProp(A,ac){
  const e=ac.e,t=e.type,st=e.st;
  if(t==='TF'||t==='TFI'){
    const D=e.dia,R=D/2,cl=e.bpr>3?1:1.3,tfi=t==='TFI';
    // nacelle halves
    const nac=asmPart(A,'nac',V());const Ri=R*1.03,Rn=R*1.22,x0=1.05*D,x1=-0.62*D*cl;
    const prof=[[Ri,0.62*D],[Ri*0.99,x0-0.04*D],[(Ri+Rn)/2,x0],[Rn,x0-0.06*D],[Rn*1.03,0.4*D],[Rn*0.95,-0.1*D],[Rn*0.84,x1],[Rn*0.8,x1],[Ri*0.97,0.1*D],[Ri,0.62*D]];
    if(tfi){const s=[];for(let i=0;i<=16;i++){const f=i/16;s.push({x:lerp(x0+0.8*D,0.6*D,f),cy:Math.sin(f*Math.PI)*R*0.5,ry:Ri,rz:Ri*1.3});}
      [[0.4,Math.PI-0.4],[Math.PI+0.4,TAU-0.4]].forEach(([a0,a1],k)=>{const m=mk(tubeGeo(s,24,a0,a1),MAT.skin,{skin:1,ex:V(0,k?-0.8*D:0.8*D,0)});nac.add(m);});}
    else[[Math.PI,Math.PI],[0,Math.PI]].forEach(([p0,pl],k)=>nac.add(mk(latheX(prof,24,p0,pl),MAT.skin,{skin:1,ex:V(0,k?-0.9*D:0.9*D,0)})));
    const lin=mk(cylX(Ri*0.985,Ri*0.985,x0-0.62*D,40,true).translate((x0+0.62*D)/2,0,0),MAT.liner);nac.add(lin);
    // fan
    const fan=asmPart(A,'fan',V(0.85*D,0,0));fan.position.x=0.62*D;
    if(tfi){for(let i=0;i<st.lpc;i++){const s=rotorStage(R*0.32,R*0.9,28,R*0.25,{temp:.1});s.position.x=-i*0.12*D;spinAnim(s,9);fan.add(s);}}
    else{const r=rotorStage(R*0.3,R*0.985,e.blades,R*0.36,{mat:/GE|CFM/.test(e.oem)&&e.bpr>8?MAT.cfrp:MAT.ti,tw0:0.3,tw1:1.2,t:.05,sweep:R*0.08,tipC:1.1});spinAnim(r,4);fan.add(r);
      fan.add(mk(coneX(R*0.3,R*0.55,28).translate(R*0.33,0,0),MAT.dark));}
    if(e.flags.includes('G')){const fd=asmPart(A,'fdgs',V(0.55*D,0.45*D,0));fd.position.x=0.47*D;planetary(fd,R*0.2,5,R*0.06);}
    const core=(x,rh,rt,n,blades,key,temp,rate,mat)=>{};
    if(A.parts.lpc===undefined&&st.lpc>0&&!tfi){const g=asmPart(A,'lpc',V(0.35*D,0,0));for(let i=0;i<st.lpc;i++){const x=0.5*D-i*0.055*D;const s=rotorStage(R*0.42,R*0.58,64-i*4,R*0.07,{temp:stageTemp('lpc',i,st.lpc),hubW:R*0.09});s.position.x=x;spinAnim(s,4);g.add(s);const sv=statorRing(R*0.42,R*0.58,72,R*0.05);sv.position.x=x-0.028*D;g.add(sv);}}
    {const g=asmPart(A,'hpc',V(0.12*D,0,0));const n=st.hpc,xa=0.36*D,xb=-0.04*D*cl;g.add(mk(cylX(R*0.26,R*0.29,xa-xb,24).translate((xa+xb)/2,0,0),MAT.steel));
      for(let i=0;i<n;i++){const f=i/Math.max(n-1,1),x=lerp(xa,xb,f);const s=rotorStage(lerp(R*0.27,R*0.3,f),lerp(R*0.44,R*0.34,f),30+Math.round(f*40),R*lerp(0.06,0.035,f),{temp:stageTemp('hpc',i,n),disk:false});s.position.x=x;spinAnim(s,9);g.add(s);}
      g.add(mk(cylX(R*0.46,R*0.36,xa-xb+0.04*D,32,true).translate((xa+xb)/2,0,0),MAT.skin,{skin:1}));}
    {const g=asmPart(A,'comb',V(-0.02*D,0.42*D,0));const xa=-0.07*D*cl,xb=-0.27*D*cl;
      g.add(mk(latheX([[R*0.25,xa],[R*0.37,xa],[R*0.39,(xa+xb)/2],[R*0.34,xb],[R*0.27,xb],[R*0.24,(xa+xb)/2],[R*0.25,xa]],40),MAT.hot,{temp:.97}));
      g.add(ringInst(Math.round(16+e.thrust/25),cylX(R*0.025,R*0.025,R*0.12,8).translate(xa+0.01*D,R*0.31,0),MAT.steel,0,{temp:.6}));}
    {const g=asmPart(A,'hpt',V(-0.22*D,0,0));for(let i=0;i<st.hpt;i++){const x=-0.31*D*cl-i*0.055*D;const nv=statorRing(R*0.24,R*0.34,40,R*0.05,MAT.hot,.95);nv.position.x=x+0.025*D;g.add(nv);const s=rotorStage(R*0.24,R*0.34,72,R*0.045,{temp:stageTemp('hpt',i),mat:MAT.gold,diskMat:MAT.ti});s.position.x=x;spinAnim(s,9);g.add(s);}}
    {const g=asmPart(A,'lpt',V(-0.5*D,0,0));const n=st.lpt,xa=-(0.31+0.06*st.hpt+0.04)*D*cl,xb=xa-0.42*D*cl;
      for(let i=0;i<n;i++){const f=i/Math.max(n-1,1),x=lerp(xa,xb,f);const s=rotorStage(lerp(R*0.3,R*0.38,f),lerp(R*0.42,R*0.6,f),90+i*8,R*0.05,{temp:stageTemp('lpt',i,n)});s.position.x=x;spinAnim(s,4);g.add(s);}
      g.add(mk(cylX(R*0.04,R*0.04,1.9*D*cl,10).translate(-0.1*D,0,0),MAT.chrome));
      g.add(mk(cylX(R*0.44,R*0.62,xa-xb+0.06*D,32,true).translate((xa+xb)/2,0,0),MAT.skin,{skin:1}));}
    {const g=asmPart(A,'exh',V(-0.75*D,0,0));const xn=-(0.85)*D*cl;
      g.add(mk(latheX([[R*0.62,xn+0.05*D],[R*0.6,xn-0.2*D],[R*0.46,xn-0.42*D]],32),MAT.dark,{temp:.65}));
      g.add(mk(coneX(R*0.36,0.5*D,28,-1).translate(xn-0.45*D,0,0),MAT.hot,{temp:.8}));
      if(!tfi){const casc=inst(boxG(0.12*D,R*0.05,R*0.16),MAT.steel,range(28).map(k=>M4(V(-0.1*D,0,0),qAx(AX,k*TAU/28)).multiply(M4(V(0,R*0.98,0)))),{});casc.userData.ex=V(0,0,0);g.add(casc);}
      if(ac.flags.has('chev'))g.add(ringInst(16,new THREE.ConeGeometry(R*0.08,0.08*D,3).rotateZ(Math.PI/2).translate(xn-0.43*D,R*0.44,0),MAT.dark));}
    A.flows.push({type:'axial',n:520,x0:1.15*D,x1:-0.55*D,r0:R*0.55,r1:R*0.95,speed:D*1.4,zones:[[2*D,[0.15,0.55,1]],[-2*D,[0.1,0.4,0.9]]],swirl:0.4});
    A.flows.push({type:'axial',n:560,x0:1.05*D,x1:-1.5*D*cl,r0:R*0.22,r1:R*0.38,speed:D*1.1,zones:coreZones(D*cl),swirl:1.2});
  } else if(t==='TP'){
    const Rp=e.dia/2,dc=0.16*e.dia,r=dc/2;
    const p=asmPart(A,'prop',V(Rp*0.5,0,0));p.position.x=1.6*dc*4;
    const pr=grp();pr.add(ringInst(e.blades,bladeGeo(Rp*0.1,Rp,Rp*0.13,Rp*0.07,0.2,1.35,0.09,5,-Rp*0.14),MAT.cfrp));pr.add(mk(coneX(r*1.3,r*2.4,24).translate(r*1.2,0,0),MAT.dark));pr.add(mk(cylX(r*1.25,r*1.25,r*0.8,24),MAT.steel));spinAnim(pr,3);p.add(pr);
    const g=asmPart(A,'rgb',V(Rp*0.3,Rp*0.35,0));g.position.x=4.6*dc;planetary(g,r*1.4,4,r*0.45);g.add(mk(cylX(r*0.25,r*0.25,dc*2,12).translate(dc,0,0),MAT.chrome));
    const c=asmPart(A,'comp',V(Rp*0.12,0,0));const na=st.lpc||Math.min(st.hpc,8);for(let i=0;i<na;i++){const s=rotorStage(r*0.55,r*0.95,26+i*2,r*0.18,{temp:stageTemp('hpc',i,na+1)});s.position.x=3.5*dc-i*0.3*dc;spinAnim(s,9);c.add(s);}
    if(st.lpc){const imp=grp();imp.position.x=3.5*dc-na*0.3*dc-0.2*dc;imp.add(mk(latheX([[r*0.35,0.25*dc],[r*0.6,0.1*dc],[r*1.15,-0.15*dc],[r*1.15,-0.2*dc],[r*0.3,-0.2*dc]],32),MAT.ti));
      imp.add(ringInst(18,beamGeo(V(0.2*dc,r*0.45,0),V(-0.18*dc,r*1.12,0),r*0.05,r*0.02,0.25*dc,0.05*dc),MAT.ti));spinAnim(imp,9);c.add(imp);}
    const cb=asmPart(A,'comb',V(0,Rp*0.35,0));cb.add(mk(torusX(r*1.15,r*0.35,40).translate(1.4*dc,0,0),MAT.hot,{temp:.97}));
    const tb=asmPart(A,'turb',V(-Rp*0.15,0,0));[0,1,2].forEach(i=>{const s=rotorStage(r*0.6,r*(1+i*0.15),48,r*0.14,{temp:i?0.62-i*0.1:0.92,mat:i?MAT.ti:MAT.gold});s.position.x=0.8*dc-i*0.35*dc;spinAnim(s,i?5:9);tb.add(s);});
    const sb=asmPart(A,'stub',V(-Rp*0.3,0,0));[1,-1].forEach(s=>sb.add(mk(beamGeo(V(-0.2*dc,0,s*r*0.6),V(-1.2*dc,-r*0.4,s*r*2.6),r*0.8,r*0.95,r*0.9,r*1.1),MAT.hot,{temp:.75})));
    A.parts.comp.add(mk(cylX(r*1.2,r*1.4,4.4*dc,28,true).translate(1.6*dc,0,0),MAT.skin,{skin:1}));
    A.flows.push({type:'axial',n:600,x0:p.position.x+0.8,x1:-3*dc,r0:Rp*0.2,r1:Rp*0.95,speed:Rp*2.4,zones:[[9e3,[0.15,0.55,1]],[-9e3,[0.12,0.45,0.95]]],swirl:2.2});
    A.flows.push({type:'axial',n:320,x0:3.8*dc,x1:-1.5*dc,r0:r*0.4,r1:r*0.9,speed:dc*2,zones:[[3.5*dc,[0.3,0.6,1]],[2*dc,[1,0.6,0.15]],[1.4*dc,[1,0.97,0.9]],[0.6*dc,[1,0.4,0.1]],[-1.5*dc,[0.5,0.08,0.02]]],swirl:1});
  } else if(t==='PS'){
    const radial=e.flags==='radial',Rp=e.dia/2;
    const p=asmPart(A,'prop',V(Rp*0.4,0,0));p.position.x=radial?0.9:0.55;const pr=grp();pr.add(ringInst(e.blades,bladeGeo(0.08,Rp,Rp*0.11,Rp*0.08,0.25,1.25,0.1,4),radial?MAT.black:MAT.alum));pr.add(mk(coneX(0.16,0.32,20).translate(0.14,0,0),radial?MAT.dark:MAT.red));spinAnim(pr,8);p.add(pr);
    pistonEngine(A,e,radial);
    A.flows.push({type:'axial',n:420,x0:p.position.x+0.5,x1:-1.6,r0:Rp*0.2,r1:Rp*0.95,speed:Rp*2.4,zones:[[9,[0.15,0.55,1]],[-9,[0.1,0.4,0.9]]],swirl:2.5});
  } else {
    const D=e.dia,R=D/2,trj=t==='TRJ',F=ac.flags;
    const it=asmPart(A,'intake',V(1.1*D,0,0));
    if(F.has('spike')){it.add(mk(latheX([[R*1.2,3.6*D],[R*1.1,2.2*D],[R*1.05,1.6*D]],32),MAT.skin,{skin:1}));const sp=mk(coneX(R*0.75,1.5*D,32).translate(3.7*D,0,0),MAT.dark);fnAnim(sp,(o,tt)=>o.position.x=Math.sin(tt*0.6)*0.25*D);it.add(sp);}
    else if(ac.deck==='ss'){it.add(mk(beamGeo(V(3.6*D,0,0),V(1.6*D,0,0),D*1.3,D*1.1,D*1.15,D*1.05),MAT.skin,{skin:1}));[1,-1].forEach(s=>{const rp=mk(boxG(0.9*D,0.04*D,D*1.05).translate(-0.45*D,0,0),MAT.gold);const h=grp();h.position.set(3.2*D,s*0.45*D,0);h.add(rp);fnAnim(h,(o,tt)=>o.rotation.z=s*(0.08+0.06*Math.sin(tt*0.8)));it.add(h);});}
    else{it.add(mk(beamGeo(V(3.4*D,R*0.2,0),V(1.6*D,0,0),D*1.0,D*0.95,D*1.25,D*1.0),MAT.skin,{skin:1}));it.add(mk(new THREE.PlaneGeometry(D*1.2,D*0.95).rotateY(Math.PI/2).translate(3.41*D,R*0.2,0),MAT.liner));}
    const mkStages=(g,n,xa,xb,rh0,rh1,rt0,rt1,stage)=>{for(let i=0;i<n;i++){const f=i/Math.max(n-1,1);const s=rotorStage(lerp(rh0,rh1,f),lerp(rt0,rt1,f),24+Math.round(f*30),R*0.1,{temp:stageTemp(stage,i,n)});s.position.x=lerp(xa,xb,f);spinAnim(s,9);g.add(s);}};
    if(trj){const g=asmPart(A,'comp',V(0.5*D,0,0));mkStages(g,st.hpc,1.4*D,0.5*D,R*0.35,R*0.48,R*0.95,R*0.7,'hpc');g.add(mk(cylX(R,R*0.76,1.0*D,32,true).translate(0.95*D,0,0),MAT.skin,{skin:1}));}
    else{const g1=asmPart(A,'lpc',V(0.7*D,0,0));mkStages(g1,st.lpc,1.45*D,1.1*D,R*0.3,R*0.38,R*0.97,R*0.82,'lpc');
      const g2=asmPart(A,'hpc',V(0.35*D,0,0));mkStages(g2,st.hpc,0.95*D,0.45*D,R*0.42,R*0.48,R*0.7,R*0.58,'hpc');g2.add(mk(cylX(R*0.74,R*0.62,0.6*D,32,true).translate(0.7*D,0,0),MAT.skin,{skin:1}));}
    const cb=asmPart(A,'comb',V(0.05*D,0.6*D,0));cb.add(mk(latheX([[R*0.42,0.38*D],[R*0.68,0.38*D],[R*0.7,0.25*D],[R*0.64,0.1*D],[R*0.44,0.1*D],[R*0.42,0.38*D]],36),MAT.hot,{temp:.97}));
    const tb=asmPart(A,'turb',V(-0.25*D,0,0));range(st.hpt+st.lpt).forEach(i=>{const s=rotorStage(R*0.45,R*(0.66+i*0.05),70,R*0.08,{temp:.95-i*0.12,mat:i<st.hpt?MAT.gold:MAT.ti});s.position.x=0.02*D-i*0.1*D;spinAnim(s,9);tb.add(s);});
    if(trj){const bp=asmPart(A,'bypass',V(0,0.8*D,0));bp.add(ringInst(6,beamGeo(V(1.1*D,R*1.08,0),V(-0.4*D,R*1.08,0),R*0.14,R*0.14,R*0.14),MAT.ti));}
    const ab=asmPart(A,'ab',V(-0.9*D,0,0));ab.add(mk(cylX(R*0.95,R*0.92,1.5*D,36,true).translate(-0.9*D,0,0),MAT.liner,{temp:.9}));
    [0.42,0.62,0.8].forEach((rr,i)=>ab.add(mk(torusX(R*rr,R*0.025,40).translate(-0.3*D-i*0.05*D,0,0),MAT.copper,{temp:.7})));
    [0.5,0.75].forEach(rr=>ab.add(mk(latheX([[R*rr+R*0.05,-0.5*D],[R*rr,-0.42*D],[R*rr-R*0.05,-0.5*D]],40),MAT.steel,{temp:.95})));
    ab.add(ringInst(8,beamGeo(V(-0.46*D,R*0.2,0),V(-0.46*D,R*0.8,0),R*0.05,R*0.05,R*0.08),MAT.steel));
    const nz=asmPart(A,'noz',V(-1.4*D,0,0));
    if(ac.id==='f22'){nz.add(mk(beamGeo(V(-1.6*D,0,0),V(-2.3*D,0,0),D*0.95,D*0.7,D*1.1,D*1.05),MAT.dark,{temp:.75}));[1,-1].forEach(s=>{const h=grp();h.position.set(-2.3*D,s*0.36*D,0);h.add(mk(boxG(0.5*D,0.05*D,D*1.05).translate(-0.25*D,0,0),MAT.gold,{temp:.8}));fnAnim(h,(o,tt)=>o.rotation.z=0.25*Math.sin(tt*0.9));nz.add(h);});}
    else{nz.add(mk(latheX([[R*0.98,-1.6*D],[R*0.86,-1.8*D]],36),MAT.dark,{temp:.75}));const pet=new THREE.InstancedMesh(boxG(0.5*D,R*0.02,R*0.24).translate(-0.25*D,0,0),MAT.gold,16);pet.userData={mat0:MAT.gold,temp:.85};
      fnAnim(pet,(o,tt)=>{const a=0.08+0.1*(0.5+0.5*Math.sin(tt*0.8));for(let k=0;k<16;k++){const q=qAx(AX,k*TAU/16);const m=M4(V(-1.8*D,0,0),q).multiply(M4(V(0,R*0.86,0),qAx(AZ,-a)));o.setMatrixAt(k,m);}o.instanceMatrix.needsUpdate=true;});nz.add(pet);}
    A.flows.push({type:'axial',n:800,x0:3.6*D,x1:-3.2*D,r0:R*0.15,r1:R*0.7,speed:D*2.4,zones:[[3*D,[0.25,0.6,1]],[1*D,[0.6,0.6,0.9]],[0.38*D,[1,0.6,0.15]],[0.1*D,[1,0.97,0.9]],[-0.3*D,[1,0.5,0.15]],[-0.5*D,[1,0.85,0.6]],[-1.6*D,[1,0.45,0.1]],[-3.2*D,[0.5,0.05,0.02]]],swirl:0.8});
  }
}
function planetary(g,rs,n,th){
  const sun=mk(gearGeo(rs,14,th).rotateY(Math.PI/2),MAT.gold);spinAnim(sun,3.5);g.add(sun);
  const rp=rs*0.85,carrier=grp();
  for(let k=0;k<n;k++){const a=k*TAU/n;const pl=mk(gearGeo(rp,12,th*0.95).rotateY(Math.PI/2),MAT.steel);pl.position.set(0,Math.cos(a)*(rs+rp)*1.02,Math.sin(a)*(rs+rp)*1.02);spinAnim(pl,-4.1);carrier.add(pl);}
  g.add(carrier);if(n!==5)spinAnim(carrier,0.9);
  const ring=mk(latheX([[rs+2*rp+rp*0.12,th/2],[rs+2*rp+rp*0.45,th/2],[rs+2*rp+rp*0.45,-th/2],[rs+2*rp+rp*0.12,-th/2],[rs+2*rp+rp*0.12,th/2]],48),MAT.ti);g.add(ring);if(n===5)spinAnim(ring,-1.1);
  return g;
}
function pistonEngine(A,e,radial){
  const cr=asmPart(A,'crank',V(0,-0.55,0)),cy=asmPart(A,'cyl',V(0,0.55,0)),cm=asmPart(A,'cam',V(-0.6,0,0)),ex=asmPart(A,'exh',V(-0.4,-0.6,0));
  const crank=grp();crank.add(mk(cylX(0.04,0.04,0.9,12).translate(-0.05,0,0),MAT.chrome));[0.2,0.05,-0.1,-0.25].forEach((x,i)=>crank.add(mk(boxG(0.03,0.16,0.07).translate(x,0.05*(i%2?1:-1),0),MAT.steel)));spinAnim(crank,6);cr.add(crank);
  if(radial){cr.add(mk(cylX(0.38,0.38,0.42,28),MAT.dark));
    [0,1].forEach(row=>range(7).forEach(k=>{const a=k*TAU/7+row*TAU/14,x=0.08-row*0.2;const c=grp();c.position.x=x;c.rotation.x=a;
      c.add(mk(new THREE.CylinderGeometry(0.11,0.12,0.36,16).translate(0,0.55,0),MAT.dark));range(6).forEach(f=>c.add(mk(new THREE.CylinderGeometry(0.15,0.15,0.012,16).translate(0,0.43+f*0.045,0),MAT.alum)));
      const pi=mk(new THREE.CylinderGeometry(0.095,0.095,0.1,14).translate(0,0.45,0),MAT.chrome);fnAnim(pi,(o,tt)=>o.position.y=0.04*Math.cos(tt*6+a+row));c.add(pi);cy.add(c);}));
    cm.add(mk(torusX(0.26,0.025,40).translate(0.22,0,0),MAT.gold));[1,-1].forEach(s=>cm.add(mk(cylX(0.06,0.06,0.2,14).translate(-0.3,0.2,s*0.18),MAT.red)));
    ex.add(mk(torusX(0.62,0.05,48).translate(-0.3,0,0),MAT.hot,{temp:.75}));
  } else {
    cr.add(mk(boxG(0.55,0.28,0.32),MAT.alum));
    [[0.12,1],[-0.06,-1],[0.04,1],[-0.14,-1]].forEach(([x,s],i)=>{const c=grp();c.position.set(x,0,s*0.3);
      c.add(mk(cylZ(0.065,0.24,16),MAT.dark));range(7).forEach(f=>c.add(mk(cylZ(0.09,0.008,16).translate(0,0,-0.08+f*0.025),MAT.alum)));
      const pi=mk(cylZ(0.06,0.07,14),MAT.chrome);fnAnim(pi,(o,tt)=>o.position.z=-s*0.04*Math.cos(tt*6+i*Math.PI));c.add(pi);cy.add(c);});
    cm.add(mk(cylX(0.02,0.02,0.5,10).translate(0,-0.12,0),MAT.steel));[1,-1].forEach(s=>cm.add(mk(cylX(0.045,0.045,0.12,12).translate(-0.36,0.08,s*0.08),MAT.red)));
    [1,-1].forEach(s=>ex.add(mk(beamGeo(V(0.1,-0.06,s*0.42),V(-0.3,-0.28,s*0.12),0.05,0.05,0.05),MAT.hot,{temp:.75})));
  }
}

function asmWing(A,ac,AFR){
  const {F,W}=AFR,s=W.zMax,WP=wingParts(ac,F,W),wrap=grp();A.group.add(wrap);wrap.position.set(-W.rootLE+W.chord(0)*0.3,-W.y0,-s*0.45);
  const skin=mk(loft(wingSecs(W,F.fw?4.4:0,W.zMax)),MAT.skin,{skin:1});wrap.add(skin);
  const exs={spars:V(),ribs:V(0,0.07*s,0),tanks:V(0,-0.09*s,0),slats:V(0.09*s,0.01*s,0),flaps:V(-0.1*s,-0.02*s,0),ail:V(-0.08*s,0,0.05*s),spl:V(0,0.13*s,0),tip:V(0,0.03*s,0.1*s)};
  Object.keys(WP).forEach(k=>{if(!WP[k].length)return;const g=grp({node:'wing/'+k,ex:exs[k]});WP[k].forEach(m=>g.add(m));wrap.add(g);A.parts[k]=g;});
  if(ac.tip==='folding'&&A.parts.tip){const act=mk(cylX(0.12,0.12,1.2,12).translate(W.leX(W.zMax-3.6)-W.chord(W.zMax-3.6)*0.4,W.wy(W.zMax-3.6),W.zMax-3.7),MAT.gold);A.parts.tip.add(act);}
  A.flows.push({type:'free',n:700,box:[W.rootLE+s*0.3,W.rootLE-W.chord(0)-s*0.4,W.y0-s*0.15,W.y0+s*0.2,0,s],speed:s*0.8,color:[0.1,0.7,1],off:wrap.position.clone(),down:0.08});
}
function asmGear(A,ac,AFR){
  const r=wheelR(ac),G=ac.gear,mw=Math.max(...G.main,...G.center,1),h=r*3.4;
  const {g,P}=gearLeg(r,mw,h,{side:1});
  const ex={strut:V(),torque:V(r*1.8,0,0),brace:V(-r*1.5,r*0.9,-r*1.0),act:V(-r*1.4,r*0.3,r*1.6),bogie:V(0,-r*1.2,0),brakes:V()};
  Object.keys(P).forEach(k=>{const pg=grp({node:'gear/'+k,ex:ex[k]});[...P[k].children].forEach(c=>pg.add(c));A.group.add(pg);A.parts[k]=pg;});
  A.parts.brakes.children.forEach(w=>{w.userData.ex=V(0,-r*0.8,(Math.sign(w.position.z)||1)*r*1.7);spinAnim(w,2.2,'z');});
  const nr=r*0.75,nl=gearLeg(nr,ac.flags.has('td')?1:Math.min(G.nose||1,2),nr*3.2,{side:1});const ng=grp({node:'gear/nose',ex:V(r*3,0,0)});ng.position.set(r*5.5,-(h-nr*3.2)*0.3,0);ng.add(nl.g);
  const steer=mk(cylX(nr*0.12,nr*0.12,nr*1.2,10).translate(-nr*0.6,-nr*0.6,nr*0.35),MAT.gold);ng.add(steer);A.group.add(ng);A.parts.nose=ng;
  A.group.add(mk(beamGeo(V(-r*3,0.02,0),V(r*7,0.02,0),r*0.25,r*0.25,r*2.4,r*2.4),MAT.skin,{skin:1}));
}
function asmCockpit(A,ac,AFR){
  const {F}=AFR,L=ac.L,s=F.cockpitLen,x0=L/2-s,wrap=grp();wrap.position.x=-(L/2-s/2);A.group.add(wrap);
  if(!F.fw){const xs=range(25).map(i=>lerp(x0,L/2-F.nose*0.28,i/24));wrap.add(mk(tubeGeo(xs.map(x=>{const a=F.at(x);return{x,cy:a.cy,ry:a.ry,rz:a.rz};}),36,0.5,TAU-0.25),MAT.skin,{skin:1}));}
  const at=x=>F.fw?{cy:0.6,ry:1.0,rz:1.8}:F.at(x);
  const rd=grp({node:'cockpit/radome',ex:V(s*0.5,0,0)});wrap.add(rd);A.parts.radome=rd;
  const rx=L/2-F.nose*0.28;
  if(!F.fw){const xr=range(10).map(i=>lerp(rx,L/2,i/9));rd.add(mk(tubeGeo(xr.map(x=>{const a=F.at(x);return{x,cy:a.cy,ry:a.ry,rz:a.rz};}),32),MAT.skin,{skin:1}));}
  const ra=at(L/2-F.nose*0.15),dish=grp();dish.position.set(L/2-F.nose*(F.fw?2:0.17),ra.cy,0);
  dish.add(mk(new THREE.CircleGeometry(Math.max(ra.ry*0.62,0.18),32).rotateY(Math.PI/2),MAT.cyan));dish.add(mk(cylX(0.04,0.04,F.nose*0.12,8).translate(-F.nose*0.06,0,0),MAT.steel));
  fnAnim(dish,(o,tt)=>o.rotation.y=0.9*Math.sin(tt*0.9));rd.add(dish);
  const fx=L/2-F.nose*(F.fighter?0.36:0.75)-(F.fw?3:0),a=at(fx),yf=a.cy-a.ry*0.35;
  const pn=grp({node:'cockpit/panel',ex:V(s*0.12,s*0.1,0)});wrap.add(pn);A.parts.panel=pn;const px=fx+Math.min(0.95,s*0.18),pa=at(px);
  pn.add(mk(boxG(0.14,pa.ry*0.42,pa.rz*1.5).translate(px,pa.cy+pa.ry*0.02,0),MAT.dark));
  const nS=ac.flags.has('analog')?3:F.fighter?3:ac.deck==='double'||ac.id.startsWith('b78')?5:4;range(nS).forEach(i=>{const z=lerp(-pa.rz*0.6,pa.rz*0.6,nS>1?i/(nS-1):0.5);const kinds=nS===5?['pfd','nd','eng','nd','pfd']:nS===4?['pfd','nd','eng','pfd']:['pfd','eng','nd'];pn.add(mk(new THREE.PlaneGeometry(pa.rz*1.2/nS*0.92,pa.ry*0.28).rotateY(-Math.PI/2).translate(px-0.075,pa.cy+pa.ry*0.05,z),new THREE.MeshBasicMaterial({map:pfdTexture(kinds[i]),toneMapped:false})));});
  {const gw=pa.rz*1.3,gh=gw*0.2;const gs=mk(new THREE.PlaneGeometry(gw,gh).rotateY(-Math.PI/2).rotateZ(0.5).translate(px-0.02,pa.cy+pa.ry*0.3,0),new THREE.MeshBasicMaterial({map:pfdTexture('mcp'),toneMapped:false}));pn.add(gs);
   if(!F.fighter){const ped=mk(new THREE.PlaneGeometry(pa.rz*0.3,pa.rz*0.3).rotateX(-Math.PI/2.6).translate(px-0.45,pa.cy-pa.ry*0.25,0),new THREE.MeshBasicMaterial({map:pfdTexture('sys'),toneMapped:false}));pn.add(ped);}}
  const ct=grp({node:'cockpit/ctl',ex:V(-s*0.05,-s*0.12,0)});wrap.add(ct);A.parts.ctl=ct;
  const seats=F.fighter||ac.id==='sr71'?[0]:[1,-1];
  seats.forEach(sd=>{const z=sd*a.rz*0.42;if(ac.ctl==='side'){const cz=z+sd*0.38;ct.add(mk(boxG(0.4,0.12,0.12).translate(fx+0.1,yf+0.45,cz),MAT.dark));const st=mk(cylX(0.02,0.02,0.16,8).rotateZ(Math.PI/2).translate(fx+0.15,yf+0.58,cz),MAT.black);fnAnim(st,(o,tt)=>o.rotation.z=0.15*Math.sin(tt*1.4));ct.add(st);}
    else if(ac.ctl==='stick'){ct.add(mk(new THREE.CylinderGeometry(0.02,0.025,0.5,8).translate(fx+0.35,yf+0.3,z),MAT.black));}
    else{ct.add(mk(new THREE.CylinderGeometry(0.035,0.035,0.7,8).translate(fx+0.55,yf+0.15,z),MAT.dark));const yk=mk(new THREE.TorusGeometry(0.14,0.018,6,20,Math.PI).rotateY(Math.PI/2).rotateX(Math.PI).translate(fx+0.5,yf+0.55,z),MAT.black);fnAnim(yk,(o,tt)=>o.rotation.x=0.18*Math.sin(tt*1.1));ct.add(yk);}});
  ct.add(mk(boxG(0.5,0.16,0.28).translate(fx+0.2,yf+0.35,0),MAT.dark));
  const se=grp({node:'cockpit/seats',ex:V(-s*0.18,0,0)});wrap.add(se);A.parts.seats=se;
  seats.forEach(sd=>{const z=sd*a.rz*0.42;se.add(mk(boxG(0.55,0.12,0.5).translate(fx,yf+0.35,z),MAT.seat));se.add(mk(boxG(0.12,0.85,0.5).translate(fx-0.28,yf+0.8,z),MAT.seat));if(F.fighter||F.fw||ac.id==='sr71'){se.add(mk(boxG(0.05,1.3,0.06).translate(fx-0.38,yf+0.7,z+0.2),MAT.gold),mk(boxG(0.05,1.3,0.06).translate(fx-0.38,yf+0.7,z-0.2),MAT.gold));se.add(mk(boxG(0.08,0.12,0.12).translate(fx-0.3,yf+1.28,z),MAT.red));}});
  const ov=grp({node:'cockpit/ovh',ex:V(0,s*0.18,0)});wrap.add(ov);A.parts.ovh=ov;
  if(F.fighter){const cx=L/2-0.25*L,ca=F.at(cx);const cg=new THREE.SphereGeometry(1,28,14,0,TAU,0,Math.PI/2);cg.scale(0.12*L,ca.ry*0.85,ca.rz*0.36);ov.add(mk(cg.translate(cx,ca.cy+ca.ry*0.82,0),MAT.glass));ov.add(mk(new THREE.PlaneGeometry(0.22,0.2).rotateY(-Math.PI/2).rotateZ(-0.3).translate(px-0.05,pa.cy+pa.ry*0.45,0),new THREE.MeshBasicMaterial({color:0x00ff9c,transparent:true,opacity:.35,side:THREE.DoubleSide})));}
  else{const oa=at(fx+0.2);ov.add(mk(boxG(0.7,0.08,oa.rz*0.8).translate(fx+0.15,oa.cy+oa.ry*0.82,0),MAT.dark));ov.add(mk(new THREE.PlaneGeometry(0.68,oa.rz*0.78).rotateX(Math.PI/2).rotateY(Math.PI/2).translate(fx+0.15,oa.cy+oa.ry*0.82-0.045,0),new THREE.MeshBasicMaterial({map:pfdTexture('ovh'),toneMapped:false,side:THREE.DoubleSide})));const dots=inst(boxG(0.03,0.012,0.03),MAT.cyan,range(48).map(i=>M4(V(fx+0.15-0.3+(i%8)*0.085,oa.cy+oa.ry*0.82-0.045,-oa.rz*0.35+Math.floor(i/8)*oa.rz*0.14))));ov.add(dots);}
  const eb=grp({node:'cockpit/eebay',ex:V(0,-s*0.2,0)});wrap.add(eb);A.parts.eebay=eb;
  const ea=at(fx+0.3);range(F.fighter?2:4).forEach(i=>{const z=lerp(-ea.rz*0.5,ea.rz*0.5,i/3||0);eb.add(mk(boxG(0.8,ea.ry*0.35,0.32).translate(fx+0.3,ea.cy-ea.ry*0.62,F.fighter?(i?0.2:-0.2):z),MAT.green));});
  const leds=inst(boxG(0.02,0.02,0.02),MAT.cyan,range(24).map(i=>M4(V(fx+0.71,ea.cy-ea.ry*0.62+((i%4)-1.5)*0.06,-ea.rz*0.5+Math.floor(i/4)*ea.rz*0.2))));eb.add(leds);
  if(ac.flags.has('droop')){const dg=grp({node:'cockpit/droop',ex:V(s*0.25,-s*0.08,0)});wrap.add(dg);A.parts.droop=dg;const hx=L/2-F.nose*0.95,ha=F.at(hx);dg.add(mk(cylZ(0.06,ha.rz*1.6,12).translate(hx,ha.cy-ha.ry*0.6,0),MAT.gold));[1,-1].forEach(sd=>dg.add(mk(beamGeo(V(hx-0.8,ha.cy-ha.ry*0.3,sd*ha.rz*0.5),V(hx+0.2,ha.cy-ha.ry*0.65,sd*ha.rz*0.5),0.09,0.07,0.09),MAT.steel)));
    const vx=L/2-F.nose*0.6,va=F.at(vx);dg.add(mk(tubeGeo(range(5).map(i=>{const x=vx+i*0.25;const b=F.at(x);return{x,cy:b.cy,ry:b.ry*1.04,rz:b.rz*1.04};}),16,-0.8,0.8),MAT.glass));}
  if(ac.deck==='visor'){const vg=grp({node:'cockpit/visor',ex:V(s*0.15,s*0.35,0)});wrap.add(vg);A.parts.visor=vg;[1,-1].forEach(sd=>vg.add(mk(beamGeo(V(L/2-F.nose*0.9,F.ry*0.6,sd*F.rz*0.6),V(L/2-F.nose*0.4,F.ry*0.2,sd*F.rz*0.6),0.15,0.12,0.15),MAT.gold)));}
}
function asmFus(A,ac,AFR){
  const {F}=AFR,fighter=F.fighter||F.fw,D=ac.D,Ls=fighter?Math.max(4,ac.L*0.35):clamp(D*4,5,ac.L*0.42),ry=F.fw?1.2:F.ry,rz=F.fw?3:F.rz;
  A.group.add(mk(tubeGeo(range(9).map(i=>({x:lerp(Ls/2,-Ls/2,i/8),ry,rz})),48,0.75,TAU-0.12,false),MAT.skin,{skin:1}));
  const fr=asmPart(A,'frames',V());const nf=Math.max(8,Math.round(Ls/0.53)),tor=new THREE.TorusGeometry(1,0.018,6,48).rotateY(Math.PI/2);
  fr.add(inst(tor,MAT.struct,range(nf).map(i=>M4(V(lerp(Ls/2,-Ls/2,i/(nf-1)),0,0),null,V(1,ry*0.985,rz*0.985)))));
  fr.add(inst(boxG(Ls,0.03,0.05),MAT.alum,range(30).map(k=>{const a=k*TAU/30;return M4(V(0,Math.cos(a)*ry*0.97,Math.sin(a)*rz*0.97));})));
  const bk=asmPart(A,'bulk',V());const dome=new THREE.SphereGeometry(1,28,14,0,TAU,0,Math.PI/2).rotateZ(Math.PI/2);dome.scale(ry*0.45,ry*0.98,rz*0.98);
  const dm=mk(dome.translate(-Ls/2,0,0),MAT.struct,{ex:V(-Ls*0.35,0,0)});bk.add(dm);bk.add(inst(boxG(0.04,ry*1.9,0.06),MAT.steel,range(12).map(k=>M4(V(-Ls/2-ry*0.02,0,0),qAx(AX,k*Math.PI/12)))));
  bk.children[1].userData.ex=V(-Ls*0.35,0,0);
  const fw=mk(new THREE.CircleGeometry(1,40).rotateY(Math.PI/2).scale(1,ry*0.98,rz*0.98).translate(Ls/2,0,0),MAT.struct,{ex:V(Ls*0.35,0,0)});bk.add(fw);
  const yf=F.cargo?-ry*0.55:-ry*0.32,w=rz*1.8;
  const fl=asmPart(A,'floor',V(0,D*0.9,0));
  if(fighter){fl.add(mk(beamGeo(V(Ls*0.45,-ry*0.25,0),V(-Ls*0.45,-ry*0.25,0),ry*0.9,ry*0.8,rz*1.0),MAT.fuel,{temp:.15}));}
  else{fl.add(inst(boxG(0.08,0.18,w),MAT.alum,range(Math.round(Ls/0.53)).map(i=>M4(V(Ls/2-0.26-i*0.53,yf-0.1,0)))));fl.add(mk(boxG(Ls,0.025,w).translate(0,yf,0),MAT.alum));
    fl.add(inst(boxG(Ls,0.03,0.04),MAT.chrome,range(6).map(i=>M4(V(0,yf+0.03,lerp(-w*0.42,w*0.42,i/5))))));
    if(ac.deck==='double'||ac.deck==='hump'||ac.deck==='hump8'){fl.add(inst(boxG(0.07,0.15,w*0.9),MAT.alum,range(Math.round(Ls/0.53)).map(i=>M4(V(Ls/2-0.26-i*0.53,ry*0.3,0)))));fl.add(mk(boxG(Ls,0.025,w*0.88).translate(0,ry*0.36,0),MAT.alum));}}
  const ec=asmPart(A,'ecs',V(0,-D*0.35,rz*1.6));[1,-1].forEach(s=>{const z=fighter?0:s*rz*0.42;ec.add(mk(boxG(Ls*0.22,ry*0.28,rz*0.32).translate(-Ls*0.05,yf-ry*0.38,z),MAT.copper,{temp:.4}));
    const fan=rotorStage(ry*0.04,ry*0.12,14,ry*0.04,{temp:.2});fan.position.set(Ls*0.08,yf-ry*0.38,z);spinAnim(fan,10);ec.add(fan);});
  const cg=asmPart(A,'cargo',V(0,-D*0.9,0));
  if(fighter){[1,-1].forEach(s=>{const d=grp({ex:V(0,-ry*0.3,s*rz*0.4)});d.add(mk(boxG(Ls*0.7,0.03,rz*0.45).translate(0,-ry*0.98,s*rz*0.25),MAT.skin,{skin:1}));cg.add(d);});
    range(F.fw?8:4).forEach(i=>{const m=grp();const z=(i%2?1:-1)*rz*0.15*(1+Math.floor(i/2));m.add(mk(cylX(0.09,0.09,3.6,12).translate(0,-ry*0.55,z),MAT.alum));m.add(mk(coneX(0.09,0.4,12).translate(2,-ry*0.55,z),MAT.dark));m.add(mk(boxG(0.4,0.3,0.02).translate(-1.6,-ry*0.55,z),MAT.dark));cg.add(m);});}
  else if(F.cargo){const rp=grp({ex:V(-Ls*0.2,-ry*0.2,0)});rp.add(mk(boxG(Ls*0.3,0.08,w*0.9).translate(-Ls*0.5,yf-ry*0.15,0).rotateZ(0),MAT.alum));cg.add(rp);cg.add(inst(boxG(2.2,1.6,w*0.7),MAT.uld,range(Math.max(1,Math.floor(Ls/2.6))).map(i=>M4(V(Ls/2-1.4-i*2.6,yf+0.85,0)))));}
  else if(D>4.5){cg.add(inst(boxG(1.53,1.63,1.56),MAT.uld,range(Math.floor(Ls/1.6)).flatMap(i=>[1,-1].map(s=>M4(V(Ls/2-0.9-i*1.6,yf-ry*0.33,s*rz*0.4))))));}
  else cg.add(inst(boxG(0.6,0.5,0.5),MAT.uld,range(Math.floor(Ls/0.9)).map(i=>M4(V(Ls/2-0.5-i*0.9,yf-ry*0.4,(i%2-0.5)*0.4)))));
  if(A.sys&&!fighter&&!F.cargo&&ac.deck!=='beluga'){const cb=asmPart(A,'cabin',V(0,D*1.7,0));const co=cabinFor(ac),pitch=co[2]||(ac.deck==='bizjet'?1.6:0.81),sw=0.5,cols=ac.deck==='bizjet'?2:Math.max(2,Math.floor(rz*2/sw)-2+(co[3]||0)),ms=[];
    for(let x=Ls/2-0.6;x>-Ls/2+0.4;x-=pitch)for(let c=0;c<cols;c++){const z=-rz*0.8+c*(rz*1.6/(cols-1));if(cols>4&&Math.abs(z)<0.4)continue;ms.push(M4(V(x,yf+0.22,z)));}
    cb.add(inst(boxG(0.5,0.1,0.46),MAT.seat,ms));cb.add(inst(boxG(0.1,0.7,0.46),MAT.seat,ms.map(m=>m.clone().multiply(M4(V(-0.22,0.35,0))))));}
  A.flows.push({type:'free',n:500,box:[Ls/2,-Ls/2,-ry*0.6,ry*0.6,-rz*0.6,rz*0.6],speed:Ls*0.25,color:[0.2,0.75,1]});
}
function asmEmp(A,ac,AFR){
  const {F,W,T}=AFR,wrap=grp();A.group.add(wrap);
  if(ac.tail==='none'){const z0=4.4,s=W.zMax;
    const bv=grp({node:'emp/beaver',ex:V(-2,-0.5,0)});bv.add(mk(boxG(2.2,0.1,3.6).translate(-ac.L/2+0.6,0,0),MAT.ctrl));wrap.add(bv);A.parts.beaver=bv;
    const dr=grp({node:'emp/drag',ex:V(-1.5,0,3)});[1,-1].forEach(sd=>{const g=wingSeg(W,s*0.82,s*0.97,0.75,1,{tS:1.2});const up=mk(g,MAT.ctrl);const dn=mk(g.clone(),MAT.gold);if(sd<0){up.scale.z=-1;dn.scale.z=-1;}fnAnim(up,(o,tt)=>o.position.y=0.15+0.15*Math.sin(tt));fnAnim(dn,(o,tt)=>o.position.y=-0.15-0.15*Math.sin(tt));dr.add(up,dn);});wrap.add(dr);A.parts.drag=dr;
    const el=grp({node:'emp/elevon',ex:V(-2,0,0)});[1,-1].forEach(sd=>{[[0.3,0.5],[0.5,0.8]].forEach(([a,b])=>{const m=mk(wingSeg(W,s*a,s*b,0.78,1,{tS:1.15}),MAT.ctrl);if(sd<0)m.scale.z=-1;el.add(m);});});wrap.add(el);A.parts.elevon=el;
    const ap=grp({node:'emp/apu',ex:V(0,1.5,0)});ap.add(mk(cylX(0.4,0.32,1.6,16).translate(-2,0.3,0),MAT.hot,{temp:.6}));wrap.add(ap);A.parts.apu=ap;
    wrap.add(mk(loft(wingSecs(W,0,W.zMax)),MAT.skin,{skin:1}));const l2=mk(loft(wingSecs(W,0,W.zMax)),MAT.skin,{skin:1});l2.scale.z=-1;wrap.add(l2);
  } else {
    const get=k=>A.parts[k]||(A.parts[k]=(()=>{const g=grp({node:'emp/'+k,ex:V()});wrap.add(g);return g;})());
    T.surfaces.forEach(s=>{const hold=(m,key,exv)=>{const h=grp({ex:exv});h.add(m);if(s.pivot){h.position.copy(s.pivot);m.position.copy(s.pivot).negate();h.rotation.x=s.cant||0;}if(s.mirror)h.scale.z=-1;get(key).add(h);};
      const sz=s.secs[0].c;const sg=s.mirror?-1:1;
      if(s.kind==='fin'){hold(mk(segLoft(s.secs,0,s.ctrl||1,true,1),MAT.alum),'fin',V(0,0,(s.secs[0].z?Math.sign(s.secs[0].z):0)*sz*0.3));if(s.ctrl)hold(mk(segLoft(s.secs,s.ctrl,1,true,1.1),MAT.ctrl),'rudder',V(-sz*0.45,0,(s.secs[0].z?Math.sign(s.secs[0].z):0)*sz*0.3));}
      else if(s.kind==='canard')hold(mk(loft(s.secs),MAT.ctrl),'canard',V(sz*0.5,sz*0.2,0));
      else{hold(mk(segLoft(s.secs,0,s.ctrl||1,false,1),MAT.alum),'hs',V(0,-sz*0.25,sz*0.35));if(s.ctrl)hold(mk(segLoft(s.secs,s.ctrl,1,false,1.1),MAT.ctrl),'elev',V(-sz*0.5,-sz*0.25,sz*0.35));}});
    // rudder/elevator hinge oscillation
    ['rudder','elev'].forEach(k=>{if(A.parts[k])A.parts[k].userData.wobble=1;});
    if(T.jack&&(A.parts.hs||ac.tail==='sr')){const j=get('jack');j.userData.ex=V(0,T.dims.ch*0.3,T.dims.ch*0.5);j.add(mk(new THREE.CylinderGeometry(T.jack.r,T.jack.r,T.jack.h,12).translate(T.jack.x,T.jack.y,0),MAT.gold));const nut=mk(boxG(T.jack.r*4,T.jack.r*3,T.jack.r*4).translate(T.jack.x,T.jack.y,0),MAT.steel);fnAnim(nut,(o,tt)=>o.position.y=T.jack.h*0.3*Math.sin(tt*0.7));j.add(nut);}
    if(ac.tail==='sr'&&!A.parts.jack){const j=get('jack');j.userData.ex=V(0,1,0);j.add(mk(cylX(0.08,0.08,1.2,10).translate(-ac.L/2+0.1*ac.L,1,0),MAT.gold));}
    if(T.apu&&l2Defs(ac,'emp').some(d=>d.key==='apu')){const ap=get('apu');ap.userData.ex=V(-T.dims.cf*0.5,-T.dims.cf*0.2,0);const r=T.apu.r;const g=grp();g.position.set(T.apu.x,T.apu.y,0);
      g.add(mk(cylX(r,r*0.85,T.apu.len,20),MAT.dark));const rt=rotorStage(r*0.25,r*0.75,24,r*0.25,{temp:.5});rt.position.x=T.apu.len*0.3;spinAnim(rt,10);g.add(rt);g.add(mk(latheX([[r*0.5,-T.apu.len*0.5],[r*0.45,-T.apu.len*0.7]],20),MAT.hot,{temp:.7}));ap.add(g);}
    if(ac.id==='conc'){const tr=get('trim');tr.userData.ex=V(-3,-1,0);tr.add(mk(boxG(5,1.4,2.2).translate(-ac.L/2+8,-0.3,0),MAT.fuel));}
    // ghost fuselage tail cone for context
    if(!F.fw){const xs=range(14).map(i=>lerp(-ac.L/2,-ac.L/2+F.tail*1.15,i/13));wrap.add(mk(tubeGeo(xs.map(x=>{const a=F.at(x);return{x,cy:a.cy,ry:a.ry,rz:a.rz};}),32),MAT.skin,{skin:1}));}
  }
  // recentre
  wrap.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(wrap),c=b.getCenter(V());wrap.position.sub(c);
  const sz=b.getSize(V()).length();Object.values(A.parts).forEach(p=>{if(p.userData.ex.lengthSq()<1e-6&&p!==A.parts.fin){const pb=new THREE.Box3().setFromObject(p);if(!pb.isEmpty())p.userData.ex=pb.getCenter(V()).sub(c).normalize().multiplyScalar(sz*0.12);}});
  A.flows.push({type:'free',n:500,box:[b.max.x-c.x+sz*0.1,b.min.x-c.x-sz*0.1,b.min.y-c.y,b.max.y-c.y,b.min.z-c.z,b.max.z-c.z],speed:sz*0.4,color:[0.15,0.7,1]});
}

/* =====================================================================
   LEVEL 3 — MICRO-COMPONENT ISOLATION & LIVE MECHANICAL ANIMATION
   Every builder returns a group (≈2 m scale), callout parts and airflow.
   ===================================================================== */
function micro(node,ac){
  const k=node.kind,p=node.p||{},e=ac.e,g=grp(),parts=[],flows=[];const P=(o,name)=>{parts.push([o,name]);return o;};
  const fanMat=/GE|CFM/.test(e.oem)&&e.bpr>8?MAT.cfrp:MAT.ti;
  const ctx={g,P,flows,ac,e,p,node};
  (MICRO[k]||MICRO.generic)(ctx);
  return {g,parts,flows};
}
const hingeOsc=(o,amp,rate=1,axis='z',ph=0)=>fnAnim(o,(ob,tt)=>ob.rotation[axis]=amp*Math.sin(tt*rate+ph));
const MICRO={
  rotor({g,P,flows,p,e}){
    const st=p.stage||'hpc',i=p.i||0,n=p.n||1,temp=stageTemp(st,i,n),fan=st==='fan';
    const nb=fan?(e.blades||24):st==='lpc'?60-i*2:st==='hpc'?28+Math.round(i/Math.max(n-1,1)*48):st==='hpt'?72-i*6:96+i*10;
    const rh=fan?0.32:st==='hpc'?0.62+0.12*i/Math.max(n-1,1):st==='lpt'?0.55:0.6,rt=fan?1.0:st==='hpc'?0.95-0.08*i/Math.max(n-1,1):0.9;
    const mat=fan?(/GE|CFM/.test(e.oem)&&e.bpr>8?MAT.cfrp:MAT.ti):st==='hpt'?MAT.gold:MAT.ti;
    const r=rotorStage(rh,rt,nb,fan?0.42:0.14,{temp,mat,tw0:fan?0.3:0.5,tw1:fan?1.2:1.0,t:fan?0.05:0.08,sweep:fan?0.1:0,tipC:fan?1.1:0.85,hubW:fan?0.3:0.16});spinAnim(r,fan?3:6);g.add(r);
    P(r.children[1],`Rotor airfoils ×${nb}`);P(r.children[0],st==='hpc'?'Integral blisk disk':'Rotor disk & dovetail slots');
    if(!fan){const sv=statorRing(rh*0.98,rt,Math.round(nb*1.15),0.12,st==='hpt'?MAT.hot:MAT.steel,temp);sv.position.x=-0.22;g.add(sv);P(sv,st==='hpt'||st==='lpt'?'Nozzle guide vanes':'Stator vanes');}
    else{g.add(mk(coneX(0.33,0.6,32).translate(0.35,0,0),MAT.dark));}
    const cas=mk(cylX(rt*1.04,rt*1.04,0.6,48,true).translate(-0.08,0,0),MAT.skin,{skin:1});g.add(cas);P(cas,'Casing & abradable shroud');
    if(st==='hpt'){const cool=inst(new THREE.SphereGeometry(0.008,4,3),MAT.cyan,range(160).map(k=>M4(V(0.02,0,0),qAx(AX,k*TAU/160)).multiply(M4(V(0,lerp(rh,rt,(k%5)/5),0.03)))));g.add(cool);P(cool,'Film-cooling holes');}
    const zc=temp<0.15?[0.15,0.55,1]:temp<0.4?[1,0.65,0.2]:temp<0.8?[1,0.4,0.1]:[1,0.95,0.85];
    flows.push({type:'axial',n:700,x0:0.9,x1:-0.9,r0:rh*1.02,r1:rt*0.98,speed:1.2,zones:[[1,zc],[-1,zc]],swirl:fan?0.6:1.4});
  },
  spinner({g,P}){const c=mk(coneX(0.5,0.9,40).translate(0.45,0,0),MAT.dark);g.add(c);P(c,'Spinner cone');const d=mk(cylX(0.52,0.52,0.12,40),MAT.steel);g.add(d);P(d,'Fan disk front face');const b=ringInst(24,cylX(0.025,0.025,0.06,8).translate(0.07,0.42,0),MAT.chrome);g.add(b);P(b,'Retention bolts');spinAnim(g,1.2);},
  ring({g,P}){const t=mk(torusX(1,0.08,64),MAT.ti);g.add(t);P(t,'Kevlar-wrapped containment ring');const l=mk(cylX(0.93,0.93,0.5,64,true),MAT.liner);g.add(l);P(l,'Abradable rub strip');const h=mk(torusX(1.02,0.03,64).translate(0.25,0,0),MAT.copper,{temp:.3});g.add(h);P(h,'Anti-ice hot-air piccolo tube');},
  liner({g,P}){const hex=new THREE.CylinderGeometry(0.06,0.06,0.18,6).rotateZ(Math.PI/2);const ms=[];for(let i=0;i<14;i++)for(let j=0;j<10;j++)ms.push(M4(V(0,(j-4.5)*0.105+(i%2)*0.05,(i-6.5)*0.091),qAx(AZ,Math.PI/2)));const h=inst(hex,MAT.alum,ms);g.add(h);P(h,'Honeycomb core cells');
    const fs=mk(boxG(0.01,1.15,1.35).translate(0.1,0,0),MAT.liner);g.add(fs);P(fs,'Perforated face sheet');const bs=mk(boxG(0.02,1.15,1.35).translate(-0.1,0,0),MAT.cfrp);g.add(bs);P(bs,'Solid back skin');},
  cowl({g,P}){[1,-1].forEach(s=>{const h=grp();h.position.y=1;const m=mk(latheX([[1,0.8],[1.05,0],[1,-0.8]],24,s>0?0:Math.PI,Math.PI).translate(0,-1,0),MAT.skin,{skin:1});h.add(m);hingeOsc(h,0.35*s,0.8,'x');fnAnim(h,(o,tt)=>o.rotation.x=s*0.35*(0.5+0.5*Math.sin(tt*0.7)));g.add(h);P(m,s>0?'Left fan cowl door':'Right fan cowl door');});const c=mk(cylX(0.6,0.55,1.6,32),MAT.dark);g.add(c);P(c,'Fan case & accessories');},
  planetary({g,P,p}){const pl=planetary(g,0.35,p.n||4,0.2);P(pl.children[0],'Sun gear (input)');P(pl.children[1],`${p.n===5?'Star':'Planet'} gears ×${p.n||4}`);P(pl.children[2],'Ring gear (output)');},
  bearing({g,P}){g.add(mk(torusX(0.8,0.06,48),MAT.steel));g.add(mk(torusX(0.5,0.06,48),MAT.steel));const r=ringInst(18,cylX(0.12,0.12,0.28,14).translate(0,0.65,0),MAT.chrome);spinAnim(r,1.5);g.add(r);P(r,'Journal rollers');const j=ringInst(6,new THREE.ConeGeometry(0.03,0.2,8).rotateZ(Math.PI/2).translate(0.25,0.4,0),MAT.copper);g.add(j);P(j,'Oil jets');P(g.children[0],'Outer race');},
  vsv({g,P}){const vanes=new THREE.InstancedMesh(boxG(0.18,0.32,0.02),MAT.steel,36);vanes.userData={mat0:MAT.steel};fnAnim(vanes,(o,tt)=>{for(let k=0;k<36;k++)o.setMatrixAt(k,M4(V(),qAx(AX,k*TAU/36)).multiply(M4(V(0,0.8,0),qAx(AY,0.5+0.35*Math.sin(tt)))));o.instanceMatrix.needsUpdate=true;});g.add(vanes);P(vanes,'Variable stator vanes');
    const ur=mk(torusX(1.05,0.03,64),MAT.gold);fnAnim(ur,(o,tt)=>o.rotation.x=0.08*Math.sin(tt));g.add(ur);P(ur,'Unison ring');const ac=mk(cylX(0.06,0.06,0.6,12).translate(0,1.25,0.3),MAT.steel);g.add(ac);P(ac,'Fuel-draulic actuator');g.add(mk(cylX(0.62,0.62,0.4,32),MAT.dark));},
  combustor({g,P,flows}){const l=mk(latheX([[0.55,0.5],[0.9,0.5],[0.95,0],[0.85,-0.6],[0.6,-0.6],[0.52,0],[0.55,0.5]],64),MAT.hot,{temp:.97,skin:1});g.add(l);P(l,'Annular liner (CMC / Ni + TBC)');const n=ringInst(20,cylX(0.04,0.06,0.25,10).translate(0.55,0.72,0),MAT.steel,0,{temp:.5});g.add(n);P(n,'Swirler fuel nozzles');
    flows.push({type:'axial',n:900,x0:0.5,x1:-0.65,r0:0.6,r1:0.85,speed:0.9,zones:[[0.5,[1,0.75,0.3]],[0.1,[1,1,0.95]],[-0.3,[1,0.55,0.15]],[-0.65,[0.8,0.15,0.05]]],swirl:3});},
  nozzles({g,P,flows}){const b=ringInst(12,cylX(0.05,0.07,0.5,12).translate(0.2,0.75,0),MAT.steel);g.add(b);P(b,'Injector stems');const t=ringInst(12,new THREE.SphereGeometry(0.08,12,8).translate(-0.08,0.75,0),MAT.gold,0,{temp:.6});g.add(t);P(t,'Air-blast swirler tips');g.add(mk(torusX(0.75,0.03,48).translate(0.45,0,0),MAT.copper));P(g.children[2],'Fuel manifold');
    flows.push({type:'axial',n:600,x0:-0.1,x1:-1,r0:0.62,r1:0.88,speed:0.7,zones:[[-0.1,[1,0.85,0.4]],[-0.5,[1,1,0.9]],[-1,[1,0.4,0.1]]],swirl:2.5});},
  igniter({g,P}){const b=mk(cylX(0.12,0.12,1.2,20),MAT.steel);g.add(b);P(b,'Igniter plug body');const t=mk(new THREE.SphereGeometry(0.1,14,10).translate(-0.65,0,0),MAT.glow,{temp:1});fnAnim(t,(o,tt)=>o.visible=Math.sin(tt*14)>0.3);g.add(t);P(t,'Electrode spark gap');const c=mk(cylX(0.05,0.05,0.8,10).translate(0.9,0.2,0),MAT.copper);g.add(c);P(c,'Exciter lead');},
  ngv({g,P}){const v=statorRing(0.6,0.95,40,0.3,MAT.hot,.97);g.add(v);P(v,'Single-crystal NGV airfoils');g.add(mk(cylX(0.6,0.6,0.32,48,true),MAT.gold));g.add(mk(cylX(0.96,0.96,0.32,48,true),MAT.gold));P(g.children[1],'Inner platform');P(g.children[2],'Outer platform');},
  shaft({g,P}){const a=mk(cylX(0.08,0.08,3,16),MAT.chrome);spinAnim(a,4);g.add(a);P(a,'LP shaft (inner)');const b=mk(cylX(0.16,0.16,1.6,20,true),MAT.ti);spinAnim(b,-7);g.add(b);P(b,'HP spool shaft (outer)');[1.2,-1.2].forEach(x=>g.add(mk(torusX(0.2,0.04,24).translate(x,0,0),MAT.gold)));P(g.children[2],'Ball / roller bearings');},
  plug({g,P,flows}){const n=mk(latheX([[0.8,0.4],[0.78,-0.2],[0.6,-0.8]],40),MAT.dark,{temp:.65});g.add(n);P(n,'Core nozzle');const pl=mk(coneX(0.45,1.4,32,-1).translate(-0.6,0,0),MAT.hot,{temp:.8});g.add(pl);P(pl,'Exhaust plug (Inconel 625)');
    flows.push({type:'axial',n:600,x0:0.4,x1:-2.2,r0:0.4,r1:0.75,speed:1.4,zones:[[0.4,[1,0.5,0.15]],[-2.2,[0.5,0.05,0.02]]],swirl:0.2});},
  cascade({g,P}){const c=inst(boxG(0.18,0.06,0.3),MAT.steel,range(48).map(k=>M4(V((k%3)*0.2-0.2,0,0),qAx(AX,Math.floor(k/3)*TAU/16)).multiply(M4(V(0,1,0)))));g.add(c);P(c,'Cascade vanes');
    const s=mk(cylX(1.12,1.08,1.2,48,true),MAT.skin,{skin:1});fnAnim(s,(o,tt)=>o.position.x=-0.6*(0.5+0.5*Math.sin(tt*0.7)));g.add(s);P(s,'Translating sleeve');const b=ringInst(8,boxG(0.02,0.4,0.5).translate(-0.4,0.8,0),MAT.gold);g.add(b);P(b,'Blocker doors');},
  chevron({g,P,flows}){g.add(mk(latheX([[1,0.6],[0.95,-0.2]],48),MAT.skin,{skin:1}));const c=ringInst(16,new THREE.ConeGeometry(0.16,0.4,3).rotateZ(Math.PI/2).translate(-0.4,0.92,0),MAT.dark);g.add(c);P(c,'Serrated chevrons ×16');P(g.children[0],'Fan nozzle');flows.push({type:'axial',n:600,x0:0.2,x1:-2,r0:0.6,r1:1,speed:1.2,zones:[[0,[0.15,0.55,1]],[-2,[0.6,0.3,0.6]]],swirl:2});},
  propblade({g,P}){const b=mk(bladeGeo(0.1,2,0.32,0.16,0.2,1.3,0.09,8,-0.35),MAT.cfrp);const h=grp();h.add(b);fnAnim(h,(o,tt)=>o.rotation.y=0.6*Math.sin(tt*0.6));g.add(h);P(b,'Composite blade (carbon spar, glass shell)');const ro=mk(cylX(0.12,0.12,0.3,16).rotateZ(Math.PI/2).translate(0,0.05,0),MAT.steel);g.add(ro);P(ro,'Blade root & retention');const le=mk(beamGeo(V(0.12,0.5,0),V(0.15,1.9,0),0.02,0.015,0.02),MAT.chrome);h.add(le);P(le,'Nickel leading-edge sheath');},
  pitchhub({g,P}){const hub=mk(cylX(0.5,0.5,0.6,32),MAT.steel);g.add(hub);P(hub,'Hub body');const pis=mk(cylX(0.3,0.3,0.4,24),MAT.gold);fnAnim(pis,(o,tt)=>o.position.x=0.4+0.15*Math.sin(tt));g.add(pis);P(pis,'Pitch-change piston');
    const roots=new THREE.InstancedMesh(cylX(0.1,0.1,0.18,12).rotateZ(Math.PI/2),MAT.cfrp,6);roots.userData={mat0:MAT.cfrp};fnAnim(roots,(o,tt)=>{for(let k=0;k<6;k++)o.setMatrixAt(k,M4(V(),qAx(AX,k*TAU/6)).multiply(M4(V(0,0.6,0),qAx(AY,0.5*Math.sin(tt)))));o.instanceMatrix.needsUpdate=true;});g.add(roots);P(roots,'Blade roots (pitch rotation)');},
  impeller({g,P}){const i=grp();i.add(mk(latheX([[0.2,0.5],[0.45,0.2],[1,-0.2],[1,-0.3],[0.2,-0.3]],40),MAT.ti));i.add(ringInst(19,beamGeo(V(0.45,0.25,0),V(-0.25,0.98,0),0.08,0.03,0.4,0.08),MAT.ti));spinAnim(i,7);g.add(i);P(i.children[1],'Impeller vanes');P(i.children[0],'Impeller hub (Ti-6Al-4V)');const d=statorRing(1.02,1.25,24,0.2);g.add(d);P(d,'Pipe diffuser');},
  stubs({g,P}){[1,-1].forEach(s=>{const m=mk(beamGeo(V(0.3,0,s*0.2),V(-0.9,-0.3,s*1),0.35,0.42,0.38,0.5),MAT.hot,{temp:.8});g.add(m);P(m,s>0?'Left exhaust stub':'Right exhaust stub');});g.add(mk(torusX(0.32,0.12,32).translate(0.45,0,0),MAT.hot,{temp:.75}));},
  intake({g,P,ac}){if(ac.flags.has('spike')){const n=mk(latheX([[1.2,2],[1.1,0],[1,-1]],40),MAT.skin,{skin:1});g.add(n);P(n,'Inlet cowl');const s=mk(coneX(0.8,2,40).translate(1.8,0,0),MAT.dark);fnAnim(s,(o,tt)=>o.position.x=0.6*Math.sin(tt*0.5));g.add(s);P(s,'Translating spike (26 in travel)');const b=ringInst(24,boxG(0.3,0.04,0.06).translate(0.3,0.95,0),MAT.gold);g.add(b);P(b,'Shock-trap bleed slots');}
    else{const d=mk(beamGeo(V(1.5,0,0),V(-1.5,0,0),1.2,1.0,1.4,1.1),MAT.skin,{skin:1});g.add(d);P(d,'Intake duct');[1,-1].forEach(s=>{const h=grp();h.position.set(1.2,s*0.5,0);h.add(mk(boxG(1.2,0.04,1.3).translate(-0.6,0,0),MAT.gold));fnAnim(h,(o,tt)=>o.rotation.z=s*(0.1+0.08*Math.sin(tt*0.8)));g.add(h);if(s>0)P(h.children[0],'Variable ramp panel');});}},
  sprayring({g,P,flows}){[0.4,0.6,0.8].forEach((r,i)=>{const t=mk(torusX(r,0.03,48).translate(-i*0.08,0,0),MAT.copper,{temp:.7});g.add(t);P(t,`Spray ring ${i+1}`);});flows.push({type:'axial',n:900,x0:0,x1:-2.5,r0:0.2,r1:0.9,speed:1.6,zones:[[0,[1,0.9,0.6]],[-0.8,[1,0.6,0.2]],[-2.5,[0.7,0.1,0.05]]],swirl:0.5});g.add(mk(cylX(1,1,3,48,true).translate(-1.2,0,0),MAT.liner,{temp:.9}));},
  flameholder({g,P,flows}){[0.5,0.8].forEach(r=>{const v=mk(latheX([[r+0.08,-0.15],[r,0],[r-0.08,-0.15]],48),MAT.steel,{temp:.95});g.add(v);P(v,'V-gutter ring');});const sp=ringInst(8,beamGeo(V(-0.05,0.2,0),V(-0.05,0.85,0),0.06,0.06,0.12),MAT.steel);g.add(sp);P(sp,'Radial gutters');flows.push({type:'axial',n:900,x0:-0.1,x1:-2.5,r0:0.2,r1:0.9,speed:1.5,zones:[[-0.1,[1,1,0.9]],[-1,[1,0.55,0.15]],[-2.5,[0.6,0.08,0.03]]],swirl:0.6});},
  abliner({g,P}){const l=mk(cylX(1,1,2.4,48,true),MAT.liner,{temp:.9});g.add(l);P(l,'Perforated screech liner');const o=mk(cylX(1.08,1.08,2.4,48,true),MAT.skin,{skin:1});g.add(o);P(o,'AB duct casing (Ti)');},
  cdnozzle({g,P,ac}){if(ac.id==='f22'){g.add(mk(beamGeo(V(1,0,0),V(-0.4,0,0),1.2,0.9,1.4,1.3),MAT.dark));[1,-1].forEach(s=>{const h=grp();h.position.set(-0.4,s*0.45,0);const f=mk(boxG(1,0.06,1.3).translate(-0.5,0,0),MAT.gold,{temp:.8});h.add(f);fnAnim(h,(o,tt)=>o.rotation.z=0.35*Math.sin(tt*0.8));g.add(h);if(s>0)P(f,'Pitch-vectoring flap (±20°)');});P(g.children[0],'Nozzle sidewalls');return;}
    const pet=new THREE.InstancedMesh(boxG(1,0.03,0.42).translate(-0.5,0,0),MAT.gold,18);pet.userData={mat0:MAT.gold,temp:.85};fnAnim(pet,(o,tt)=>{const a=0.05+0.18*(0.5+0.5*Math.sin(tt*0.7));for(let k=0;k<18;k++)o.setMatrixAt(k,M4(V(),qAx(AX,k*TAU/18)).multiply(M4(V(0,1,0),qAx(AZ,-a))));o.instanceMatrix.needsUpdate=true;});g.add(pet);P(pet,'Divergent petals ×18');
    const ar=mk(torusX(1.08,0.05,48).translate(0.1,0,0),MAT.steel);g.add(ar);P(ar,'Actuation sync ring');g.add(mk(cylX(1.02,1.05,0.8,48,true).translate(0.5,0,0),MAT.dark));},
  bypass({g,P}){const t=mk(beamGeo(V(1.5,0,0),V(-1.5,0,0),0.3,0.3,0.3),MAT.ti);g.add(t);P(t,'Bypass tube');const v=mk(new THREE.CylinderGeometry(0.14,0.14,0.02,20).translate(1,0,0),MAT.gold);fnAnim(v,(o,tt)=>o.rotation.z=0.8*Math.sin(tt*0.5));g.add(v);P(v,'Bleed valve');},
  pprop({g,P,e}){const pr=grp();const b=ringInst(e.blades,bladeGeo(0.12,1.6,0.25,0.15,0.25,1.25,0.1,5),e.flags==='radial'?MAT.black:MAT.alum);pr.add(b);const s=mk(coneX(0.22,0.45,24).translate(0.2,0,0),e.flags==='radial'?MAT.dark:MAT.red);pr.add(s);spinAnim(pr,6);g.add(pr);P(b,`Blades ×${e.blades}`);P(s,'Spinner');},
  crank({g,P}){const c=grp();c.add(mk(cylX(0.08,0.08,2,16),MAT.chrome));[0.6,0.2,-0.2,-0.6].forEach((x,i)=>{c.add(mk(boxG(0.08,0.45,0.2).translate(x,0.12*(i%2?1:-1),0),MAT.steel));c.add(mk(cylX(0.07,0.07,0.15,12).translate(x+0.1,0.25*(i%2?1:-1),0),MAT.chrome));});spinAnim(c,5);g.add(c);P(c.children[0],'Main journals');P(c.children[1],'Crank webs & counterweights');P(c.children[2],'Crankpins');},
  piston({g,P}){g.add(mk(new THREE.CylinderGeometry(0.32,0.32,1.2,24,1,true).translate(0,0.9,0),MAT.liner));P(g.children[0],'Cylinder barrel');const pi=mk(new THREE.CylinderGeometry(0.3,0.3,0.32,24),MAT.chrome);g.add(pi);P(pi,'Piston & rings');const rod=mk(boxG(0.08,0.7,0.06),MAT.steel);g.add(rod);P(rod,'Connecting rod');const cr=grp();cr.add(mk(cylZ(0.25,0.08,24),MAT.steel));cr.add(mk(cylZ(0.06,0.3,12).translate(0,0.2,0),MAT.chrome));g.add(cr);P(cr.children[0],'Crank throw');
    fnAnim(g,(o,tt)=>{const a=tt*4,r=0.2,l=0.7;cr.rotation.z=a;const py=r*Math.cos(a)+Math.sqrt(l*l-(r*Math.sin(a))**2);pi.position.y=py+0.2;rod.position.set(-r*Math.sin(a)/2,(r*Math.cos(a)+py)/2,0);rod.rotation.z=Math.asin(r*Math.sin(a)/l);});},
  valves({g,P}){[1,-1].forEach((s,i)=>{const v=mk(new THREE.CylinderGeometry(0.03,0.03,0.8,10),MAT.steel);v.position.x=s*0.25;v.add(mk(new THREE.CylinderGeometry(0.14,0.06,0.06,16).translate(0,-0.42,0),MAT.steel));fnAnim(v,(o,tt)=>o.position.y=-0.08*Math.max(0,Math.sin(tt*3+i*Math.PI)));g.add(v);P(v,i?'Exhaust valve':'Intake valve');const r=mk(boxG(0.5,0.06,0.08).translate(0,0,0),MAT.gold);r.position.set(s*0.25,0.5,0);hingeOsc(r,0.12,3,'z',i*Math.PI);g.add(r);if(!i)P(r,'Rocker arms');});},
  camshaft({g,P}){const c=grp();c.add(mk(cylX(0.06,0.06,2,12),MAT.chrome));range(6).forEach(i=>c.add(mk(new THREE.CylinderGeometry(0.15,0.15,0.08,16).scale(1,1,1.4).rotateZ(Math.PI/2).translate(0.8-i*0.32,0,0.04),MAT.steel)));spinAnim(c,3);g.add(c);P(c.children[1],'Cam lobes');P(c.children[0],'Camshaft');},
  magneto({g,P}){[1,-1].forEach((s,i)=>{const m=mk(boxG(0.5,0.5,0.4).translate(0,0,s*0.4),MAT.red);g.add(m);P(m,i?'Right magneto':'Left magneto');const r=mk(cylX(0.1,0.1,0.3,12).translate(0.35,0,s*0.4),MAT.steel);spinAnim(r,6);g.add(r);});P(g.children[1],'Rotating magnet');},
  manifold({g,P}){const r=mk(torusX(0.9,0.12,48),MAT.hot,{temp:.8});g.add(r);P(r,'Collector ring');const st=ringInst(14,beamGeo(V(0.4,0.5,0),V(0,0.85,0),0.1,0.1,0.1),MAT.hot,0,{temp:.75});g.add(st);P(st,'Cylinder exhaust stacks');},
  spar({g,P,ac}){const c=ac.flags.has('composite');const w=mk(boxG(3,0.9,0.03),c?MAT.cfrp:MAT.struct,{temp:.3});g.add(w);P(w,'Spar web');[0.46,-0.46].forEach((y,i)=>{const f=mk(boxG(3,0.05,0.35).translate(0,y,0),c?MAT.cfrp:MAT.alum,{temp:i?0.55:0.15});g.add(f);P(f,i?'Lower cap (tension)':'Upper cap (compression)');});g.add(inst(boxG(0.03,0.85,0.12),MAT.alum,range(9).map(i=>M4(V(-1.4+i*0.35,0,0.06)))));P(g.children[3],'Web stiffeners');},
  joint({g,P}){const r=mk(boxG(0.1,1.2,1.6),MAT.ti);g.add(r);P(r,'Side-of-body rib (Ti)');const f=mk(boxG(0.8,1.2,0.04).translate(-0.4,0,0.82),MAT.alum);g.add(f);P(f,'Center wing box splice');const b=inst(cylX(0.03,0.03,0.35,8),MAT.chrome,range(30).map(i=>M4(V(0,-0.5+(i%6)*0.2,-0.6+Math.floor(i/6)*0.3))));g.add(b);P(b,'Hi-Lok fasteners');},
  rib({g,P}){const s=new THREE.Shape();afProfile(16).forEach(([x,y],i)=>{const X=(x-0.5)*3,Y=y*0.13*3;i?s.lineTo(X,Y):s.moveTo(X,Y);});[[-0.6,0.06],[0,0.07],[0.6,0.06]].forEach(([x,r])=>{const h=new THREE.Path();h.absellipse(x,0.0,0.18,r*1.4,0,TAU,true);s.holes.push(h);});
    const m=mk(new THREE.ExtrudeGeometry(s,{depth:0.04,bevelEnabled:false}),MAT.alum);g.add(m);P(m,'Machined rib with lightening holes');g.add(mk(boxG(0.04,0.35,0.3).translate(-0.9,0,0.15),MAT.struct));g.add(mk(boxG(0.04,0.3,0.3).translate(0.6,0,0.15),MAT.struct));P(g.children[1],'Front spar attachment');},
  stringer({g,P}){const sk=mk(boxG(3,0.02,1.5),MAT.skin,{skin:1});g.add(sk);P(sk,'Skin panel');const st=inst(boxG(3,0.12,0.03),MAT.alum,range(7).map(i=>M4(V(0,-0.07,-0.6+i*0.2))));g.add(st);P(st,'Hat / Z-section stringers');const cl=inst(boxG(0.03,0.2,1.4),MAT.struct,range(5).map(i=>M4(V(-1.2+i*0.6,-0.12,0))));g.add(cl);P(cl,'Frame shear clips');},
  tank({g,P}){const b=mk(boxG(2,0.8,1.2),MAT.liner);g.add(b);P(b,'Integral tank boundary (sealed)');const f=mk(boxG(1.98,0.5,1.18),MAT.fuel);fnAnim(f,(o,tt)=>{o.rotation.x=0.06*Math.sin(tt*1.2);o.position.y=-0.15+0.02*Math.sin(tt*0.7);});g.add(f);P(f,'Jet A-1 fuel volume');const pm=grp();pm.position.set(-0.7,-0.25,0);pm.add(mk(cylX(0.12,0.12,0.3,16),MAT.steel));const im=rotorStage(0.03,0.1,6,0.05,{});spinAnim(im,12);pm.add(im);g.add(pm);P(pm.children[0],'Boost pump & impeller');},
  probes({g,P}){g.add(mk(boxG(2,0.8,1.2),MAT.liner));const pr=inst(new THREE.CylinderGeometry(0.03,0.03,0.78,10),MAT.chrome,range(6).map(i=>M4(V(-0.8+i*0.32,0,(i%2-0.5)*0.4))));g.add(pr);P(pr,'Capacitance probes');const f=mk(boxG(1.98,0.4,1.18).translate(0,-0.19,0),MAT.fuel);g.add(f);P(f,'Fuel level');},
  boot({g,P}){const le=mk(loft([{x:0.2,y:0,z:-1,c:1.5,t:.17},{x:0.2,y:0,z:1,c:1.5,t:.17}]),MAT.skin,{skin:1});g.add(le);P(le,'Leading edge');const bt=mk(loft([{x:0.22,y:0,z:-1,c:0.25,t:.9},{x:0.22,y:0,z:1,c:0.25,t:.9}]),MAT.black);fnAnim(bt,(o,tt)=>{const s=1+0.12*Math.max(0,Math.sin(tt*1.5));o.scale.set(s,s,1);});g.add(bt);P(bt,'Pneumatic de-icing boot');},
  slat({g,P}){g.add(mk(loft([{x:0,y:0,z:-1,c:2,t:.12},{x:0,y:0,z:1,c:2,t:.12}],afProfile(10,0.12,1)),MAT.skin,{skin:1}));P(g.children[0],'Fixed leading edge');const sl=mk(loft([{x:0.02,y:0,z:-0.95,c:2,t:.125},{x:0.02,y:0,z:0.95,c:2,t:.125}],afProfile(8,-0.02,0.13)),MAT.ctrl);
    fnAnim(sl,(o,tt)=>{const f=0.5+0.5*Math.sin(tt*0.7);o.position.set(0.35*f,-0.08*f,0);o.rotation.z=-0.35*f;});g.add(sl);P(sl,'Slat panel');const tr=mk(new THREE.TorusGeometry(0.6,0.025,6,20,1).translate(-0.3,-0.3,0.5),MAT.steel);g.add(tr);P(tr,'Curved slat track');},
  flap({g,P}){g.add(mk(loft([{x:1.5,y:0,z:-1,c:3,t:.12},{x:1.5,y:0,z:1,c:3,t:.12}],afProfile(10,0,0.72)),MAT.skin,{skin:1}));P(g.children[0],'Fixed wing box');const fl=mk(loft([{x:-0.66,y:0,z:-0.95,c:1.1,t:.1},{x:-0.66,y:0,z:0.95,c:1.1,t:.1}]),MAT.ctrl);
    fnAnim(fl,(o,tt)=>{const f=0.5+0.5*Math.sin(tt*0.6);o.position.set(-0.7*f,-0.25*f,0);o.rotation.z=-0.55*f;});g.add(fl);P(fl,'Fowler flap panel');const tk=mk(beamGeo(V(-0.4,-0.25,0),V(-2,-0.6,0),0.12,0.08,0.06),MAT.steel);g.add(tk);P(tk,'Flap track & carriage');},
  flaptrack({g,P}){const tk=mk(beamGeo(V(1,0,0),V(-1.5,-0.4,0),0.2,0.12,0.08),MAT.steel);g.add(tk);P(tk,'Flap track (15-5PH steel)');const ca=mk(boxG(0.3,0.25,0.25),MAT.gold);fnAnim(ca,(o,tt)=>{const f=0.5+0.5*Math.sin(tt*0.6);o.position.set(lerp(0.8,-1.3,f),lerp(0.05,-0.33,f),0);});g.add(ca);P(ca,'Carriage & rollers');const bs=mk(cylX(0.05,0.05,2.2,12).translate(-0.2,0.25,0),MAT.chrome);spinAnim(bs,6);g.add(bs);P(bs,'Ball-screw actuator');const fa=mk(new THREE.SphereGeometry(1,20,10).scale(1.6,0.3,0.3).translate(-0.4,-0.25,0),MAT.skin,{skin:1});g.add(fa);P(fa,'Track fairing (canoe)');},
  surface({g,P}){g.add(mk(loft([{x:1.4,y:0,z:-1,c:2.4,t:.11},{x:1.4,y:0,z:1,c:2.4,t:.11}],afProfile(10,0,0.72)),MAT.skin,{skin:1}));const h=grp();h.position.x=-0.33;const s=mk(loft([{x:0,y:0,z:-0.95,c:0.9,t:.1},{x:0,y:0,z:0.95,c:0.9,t:.1}],afProfile(6,0.05,1)),MAT.ctrl);h.add(s);hingeOsc(h,0.35,1.1);g.add(h);P(s,'Control surface (CFRP)');P(g.children[0],'Fixed structure');
    const a=mk(cylX(0.06,0.06,0.5,12).translate(0,-0.12,0.6),MAT.gold);g.add(a);P(a,'Hinge-line servo-actuator');},
  actuator({g,P,ac}){const b=mk(cylX(0.22,0.22,1.6,24).translate(0.5,0,0),MAT.steel);g.add(b);P(b,`Actuator barrel (${ac.flags.has('5k')?'5,000':'3,000'} psi)`);const r=mk(cylX(0.08,0.08,1.6,16),MAT.chrome);fnAnim(r,(o,tt)=>o.position.x=-0.6-0.5*(0.5+0.5*Math.sin(tt*0.9)));g.add(r);P(r,'Piston rod (chrome-plated)');
    const e1=mk(new THREE.TorusGeometry(0.12,0.04,8,16).rotateX(Math.PI/2).translate(1.4,0,0),MAT.gold);g.add(e1);P(e1,'Rod-end bearings');[0.3,0.9].forEach(x=>g.add(mk(beamGeo(V(x,0.22,0),V(x,0.7,0.4),0.04,0.04,0.04),MAT.copper)));P(g.children[3],'Pressure / return lines');},
  spoiler({g,P}){g.add(mk(boxG(2.6,0.12,1.8).translate(0,-0.08,0),MAT.skin,{skin:1}));const h=grp();h.position.x=0.6;const s=mk(boxG(1.2,0.04,1.6).translate(-0.6,0,0),MAT.ctrl);h.add(s);fnAnim(h,(o,tt)=>o.rotation.z=0.75*(0.5+0.5*Math.sin(tt*0.8)));g.add(h);P(s,'Spoiler panel (up to 50°)');const a=mk(beamGeo(V(0.2,-0.1,0),V(-0.2,0.2,0),0.08,0.06,0.08),MAT.gold);g.add(a);P(a,'Spoiler actuator');},
  tipdev({g,P,ac}){const W={leX:z=>-z*0.4,wy:()=>0,at:()=>({c:1.4,t:.1}),zMax:2};const sec=[{x:0,y:0,z:-1,c:1.4,t:.1},{x:-0.4,y:0,z:0,c:1.2,t:.1}];g.add(mk(loft(sec),MAT.skin,{skin:1}));
    const fake={tip:ac.tip,S:20};const t=tipDevice(fake,{zMax:0,at:()=>({c:1.2,t:.1}),leX:()=>-0.4,wy:()=>0},MAT.ctrl);t.forEach(m=>{g.add(m);P(m,'Wingtip device');});if(!t.length){const r=mk(loft([{x:-0.4,y:0,z:0,c:1.2,t:.1},{x:-1.6,y:0,z:1.4,c:0.3,t:.08}]),MAT.ctrl);g.add(r);P(r,'Raked tip extension');}spinAnim(g,0.3,'y');},
  fold({g,P}){g.add(mk(loft([{x:0,y:0,z:-2,c:1.8,t:.1},{x:-0.6,y:0,z:0,c:1.5,t:.1}]),MAT.skin,{skin:1}));P(g.children[0],'Fixed outer wing');const pv=grp();pv.position.set(-1.1,0,0);const tp=mk(loft([{x:0.6,y:0,z:0,c:1.5,t:.1},{x:0.1,y:0,z:3.4,c:0.6,t:.08}]),MAT.ctrl);pv.add(tp);fnAnim(pv,(o,tt)=>o.rotation.x=-1.45*(0.5+0.5*Math.sin(tt*0.5)));g.add(pv);P(tp,'Folding tip (3.5 m, 64.8 m gate span)');
    const hg=mk(cylX(0.08,0.08,1.4,12).translate(-0.5,0,0),MAT.gold);g.add(hg);P(hg,'Hinge line & fold actuator');const lk=mk(boxG(0.18,0.18,0.18).translate(-0.2,-0.12,-0.05),MAT.red);g.add(lk);P(lk,'Lock pins');},
  oleo({g,P}){const o=mk(new THREE.CylinderGeometry(0.22,0.22,1.6,24).translate(0,0.8,0),MAT.steel);g.add(o);P(o,'Outer cylinder (300M steel)');const pi=mk(new THREE.CylinderGeometry(0.16,0.16,1.5,24),MAT.chrome);fnAnim(pi,(ob,tt)=>ob.position.y=-0.2+0.25*Math.sin(tt*1.4));g.add(pi);P(pi,'Sliding piston (chrome)');const gas=mk(new THREE.CylinderGeometry(0.2,0.2,0.6,20).translate(0,1.25,0),MAT.fuel);g.add(gas);P(gas,'Nitrogen / oil chamber');},
  trunnion({g,P}){const p=mk(cylX(0.15,0.15,2,20),MAT.chrome);g.add(p);P(p,'Trunnion pin');[0.9,-0.9].forEach(x=>g.add(mk(torusX(0.2,0.06,20).translate(x,0,0),MAT.gold)));P(g.children[1],'Spherical bearings');const s=mk(new THREE.CylinderGeometry(0.22,0.22,1.2,20).translate(0,-0.6,0),MAT.steel);g.add(s);hingeOsc(g,0.15,0.6,'x');},
  torque({g,P}){const up=grp(),dn=grp();up.position.y=0.8;dn.position.y=-0.8;const u=mk(boxG(0.1,0.9,0.12).translate(0,-0.45,0),MAT.alum),d=mk(boxG(0.1,0.9,0.12).translate(0,0.45,0),MAT.alum);up.add(u);dn.add(d);g.add(up,dn);P(u,'Upper torque link');P(d,'Lower torque link');
    g.add(mk(new THREE.CylinderGeometry(0.15,0.15,1.6,16).translate(-0.5,0.8,0),MAT.steel));fnAnim(g,(o,tt)=>{const s=0.25*Math.sin(tt*1.4);const a=0.6+s;up.rotation.z=a;dn.rotation.z=-a;dn.position.y=-0.8+s*0.5;});},
  brace({g,P}){const a=grp(),b=grp();a.position.set(0,1,0);b.position.set(0,-1,0);const ua=mk(boxG(0.12,1.1,0.12).translate(0,-0.55,0),MAT.steel),lb=mk(boxG(0.12,1.1,0.12).translate(0,0.55,0),MAT.steel);a.add(ua);b.add(lb);g.add(a,b);P(ua,'Upper brace');P(lb,'Lower brace');
    const lk=mk(boxG(0.4,0.08,0.08),MAT.gold);g.add(lk);P(lk,'Lock link (over-centre)');fnAnim(g,(o,tt)=>{const f=0.5+0.5*Math.sin(tt*0.6);a.rotation.z=0.9*f;b.rotation.z=-0.9*f;lk.position.x=0.35*f;});},
  uplock({g,P}){const b=mk(boxG(0.6,0.4,0.3),MAT.steel);g.add(b);P(b,'Uplock box');const h=mk(new THREE.TorusGeometry(0.25,0.06,8,16,Math.PI*1.3).translate(0,-0.3,0),MAT.gold);hingeOsc(h,0.5,0.8);g.add(h);P(h,'Hook');const r=mk(cylZ(0.06,0.5,10).translate(0,-0.6,0),MAT.chrome);g.add(r);P(r,'Gear uplock roller');},
  bogie({g,P,p}){const n=p.n||4,r=0.38,rows=n<=2?1:n===3?3:Math.ceil(n/2),cols=n===3?1:2,bm=grp();bm.add(mk(boxG(rows*0.85,0.16,0.18),MAT.steel));P(bm.children[0],'Bogie beam (Ti / 300M)');
    for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const w=grp();w.position.set((i-(rows-1)/2)*0.85,0,cols===2?(j?1:-1)*0.32:0);w.add(mk(new THREE.TorusGeometry(r*0.7,r*0.3,10,24),MAT.rubber));w.add(mk(cylZ(r*0.45,0.24,16),MAT.alum));spinAnim(w,3,'z');bm.add(w);if(!i&&!j)P(w.children[0],'Tires');}
    hingeOsc(bm,0.12,0.8);g.add(bm);const st=mk(new THREE.CylinderGeometry(0.1,0.1,1.4,16).translate(0,0.7,0),MAT.chrome);g.add(st);P(st,'Pivot & pitch trimmer');},
  axle({g,P}){const a=mk(cylZ(0.08,1.2,14),MAT.chrome);g.add(a);P(a,'Axle');[0.4,-0.4].forEach(z=>{const w=grp();w.position.z=z;w.add(mk(new THREE.TorusGeometry(0.42,0.18,10,24),MAT.rubber));w.add(mk(cylZ(0.27,0.3,16),MAT.alum));spinAnim(w,3,'z');g.add(w);});P(g.children[1].children[0],'Tire');},
  brake({g,P,ac}){const ga=ac.deck==='ga',n=ga?2:9;const disks=[];for(let i=0;i<n;i++){const rot=i%2===0;const d=mk(new THREE.CylinderGeometry(0.6,0.6,0.05,32,1).rotateX(Math.PI/2).translate(0,0,-0.25+i*0.06),rot?MAT.brake:MAT.dark,{temp:.75,brake:1});if(rot)spinAnim(d,4,'z');g.add(d);disks.push(d);}
    P(disks[0],ga?'Brake disc':'Rotor discs (C/C composite)');if(!ga)P(disks[1],'Stator discs');const pi=ringInst(ga?2:7,cylZ(0.06,0.15,10).translate(0.48,0,0.38),MAT.steel);pi.rotation.x=0;g.add(pi);P(pi,'Hydraulic pistons');const tq=mk(cylZ(0.22,0.8,20),MAT.chrome);g.add(tq);P(tq,'Torque tube');
    fnAnim(g,(o,tt)=>{const h=0.5+0.5*Math.sin(tt*0.4);disks.forEach((d,i)=>{if(d.material===d.userData.mat0&&d.material.emissive){}});MAT.brake.emissive.setRGB(h*0.9,h*0.25,0.02);});},
  tire({g,P}){const w=grp();w.add(mk(new THREE.TorusGeometry(0.75,0.32,16,40),MAT.rubber));w.add(mk(cylZ(0.48,0.5,24),MAT.alum));w.add(ringInst(12,cylX(0.03,0.03,0.08,8).translate(0,0.3,0),MAT.chrome).rotateY(Math.PI/2));spinAnim(w,2,'z');g.add(w);P(w.children[0],'Radial tire (≈ 200 psi N₂)');P(w.children[1],'Split wheel hub (forged Al)');},
  steer({g,P}){const s=mk(new THREE.CylinderGeometry(0.15,0.15,1.8,20),MAT.steel);g.add(s);P(s,'Nose strut');const c=grp();c.add(mk(torusX(0.25,0.08,20).rotateZ(Math.PI/2),MAT.gold));hingeOsc(c,0.6,0.6,'y');g.add(c);P(c.children[0],'Steering collar');[1,-1].forEach(z=>{const w=grp();w.position.set(0,-1,z*0.3);w.add(mk(new THREE.TorusGeometry(0.3,0.13,10,20),MAT.rubber));c.add(w);});const a=mk(cylX(0.08,0.08,0.8,12).translate(0.5,0.3,0.25),MAT.chrome);g.add(a);P(a,'Steering actuator');},
  radar({g,P,ac}){const d=grp();const aesa=isMilFighter(ac);d.add(mk(new THREE.CircleGeometry(1,48).rotateY(Math.PI/2),aesa?MAT.dark:MAT.alum));if(aesa)d.add(inst(boxG(0.02,0.07,0.07),MAT.gold,range(300).map(i=>{const a=i*2.4,r=Math.sqrt(i/300)*0.92;return M4(V(0.02,Math.cos(a)*r,Math.sin(a)*r));})));
    else d.add(inst(boxG(0.02,0.05,1.8),MAT.steel,range(12).map(i=>M4(V(0.01,-0.85+i*0.155,0)))));fnAnim(d,(o,tt)=>{o.rotation.y=0.9*Math.sin(tt*0.9);o.rotation.z=aesa?0:0.2*Math.sin(tt*0.3);});g.add(d);P(d.children[0],aesa?'AESA array face':'Flat-plate slotted antenna');P(d.children[1],aesa?'T/R modules':'Waveguide slots');
    const gm=mk(cylX(0.2,0.25,0.8,16).translate(-0.4,0,0),MAT.steel);g.add(gm);P(gm,'Gimbal / back-end processor');const rd=mk(new THREE.SphereGeometry(1.3,32,16,0,TAU,0,Math.PI/2).rotateZ(-Math.PI/2).scale(1.4,1,1),MAT.skin,{skin:1});g.add(rd);P(rd,'Radome (quartz composite)');},
  display({g,P,p,ac}){const k=p.k||'pfd',wide=k==='mcp',W=wide?3.2:2.2,H=wide?0.62:2.2;
    const bez=mk(boxG(W+0.22,H+0.22,0.1).translate(0,0,-0.07),MAT.dark);g.add(bez);
    const scr=mk(new THREE.PlaneGeometry(W,H),new THREE.MeshBasicMaterial({map:pfdTexture(k),toneMapped:false}));g.add(scr);
    const nm={pfd:'Display surface (LCD, 1024 × 1024 px)',nd:'Moving-map display surface',eng:'Engine indication display',sys:'System synoptic display',mcp:'Window readouts & mode keys'}[k];P(scr,nm);P(bez,wide?'Glareshield housing & knobs':'Display bezel (ARINC 661)');
    if(!wide){const keys=inst(boxG(0.16,0.07,0.05),MAT.alum,range(12).map(i=>M4(V(-W/2+0.18+(i%6)*(W-0.36)/5,i<6?H/2+0.07:-H/2-0.07,-0.01))));g.add(keys);P(keys,'Bezel line-select keys');
      const kn=inst(cylZ(0.06,0.06,16),MAT.steel,[M4(V(W/2+0.06,H/2-0.15,0)),M4(V(W/2+0.06,-H/2+0.15,0))]);g.add(kn);P(kn,'Brightness & range knobs');}
    g.rotation.y=0.55;},
  stick({g,P,p}){if(p.k==='side'){g.add(mk(boxG(1.2,0.3,0.4),MAT.dark));const s=grp();s.position.set(0.1,0.15,0);s.add(mk(new THREE.CylinderGeometry(0.06,0.08,0.5,12).translate(0,0.25,0),MAT.black));s.add(mk(boxG(0.14,0.06,0.12).translate(0.02,0.5,0),MAT.red));fnAnim(s,(o,tt)=>{o.rotation.z=0.25*Math.sin(tt*1.3);o.rotation.x=0.2*Math.sin(tt*0.9);});g.add(s);P(s.children[0],'Sidestick grip');P(g.children[0],'Side console');P(s.children[1],'Takeover push-button');}
    else if(p.k==='stick'){const s=grp();s.add(mk(new THREE.CylinderGeometry(0.04,0.05,1.1,12).translate(0,0.55,0),MAT.black));s.add(mk(boxG(0.14,0.25,0.12).translate(0,1.15,0),MAT.dark));fnAnim(s,(o,tt)=>{o.rotation.z=0.2*Math.sin(tt*1.1);o.rotation.x=0.15*Math.sin(tt*0.8);});g.add(s);P(s.children[1],'Center stick grip');P(s.children[0],'Stick column');g.add(mk(boxG(0.5,0.1,0.5),MAT.dark));P(g.children[1],'Gimbal boot');}
    else{const c=mk(new THREE.CylinderGeometry(0.06,0.06,1.4,12).translate(0,0.2,0),MAT.dark);hingeOsc(c,0.12,0.7);g.add(c);P(c,'Control column');const y=mk(new THREE.TorusGeometry(0.4,0.04,8,30,Math.PI).rotateY(Math.PI/2).rotateX(Math.PI).translate(0.05,1,0),MAT.black);hingeOsc(y,0.4,1.1,'x');g.add(y);P(y,'Yoke (aileron wheel)');}},
  pedals({g,P}){[1,-1].forEach((s,i)=>{const h=grp();h.position.set(0,0.6,s*0.35);const pd=mk(boxG(0.08,0.5,0.3).translate(0,-0.6,0),MAT.dark);h.add(pd);hingeOsc(h,0.25,1,'z',i*Math.PI);g.add(h);P(pd,i?'Right pedal':'Left pedal');});g.add(mk(boxG(0.5,0.1,1.2).translate(-0.3,-0.4,0),MAT.steel));P(g.children[2],'Rudder bar & feel unit');},
  seat({g,P,p}){g.add(mk(boxG(0.7,0.15,0.6),MAT.seat));g.add(mk(boxG(0.15,1.1,0.6).translate(-0.33,0.6,0),MAT.seat));g.add(mk(boxG(0.18,0.25,0.4).translate(-0.3,1.3,0),MAT.seat));P(g.children[0],'Seat pan & cushion');P(g.children[1],'Seat back / harness');
    if(p.eject){const r=inst(boxG(0.06,2,0.06),MAT.gold,[M4(V(-0.5,0.6,0.28)),M4(V(-0.5,0.6,-0.28))]);g.add(r);P(r,'Catapult guide rails');const rk=mk(cylX(0.08,0.08,0.4,12).translate(-0.5,-0.2,0),MAT.red);g.add(rk);P(rk,'Rocket motor');fnAnim(g,(o,tt)=>o.position.y=0.15*Math.max(0,Math.sin(tt*0.6))**4);} else {const r=mk(boxG(1.2,0.05,0.7).translate(0,-0.2,0),MAT.chrome);g.add(r);P(r,'Seat tracks (fore/aft)');fnAnim(g.children[0],(o,tt)=>o.position.x=0.08*Math.sin(tt*0.5));}},
  overhead({g,P,p}){if(p.hud){const gl=mk(new THREE.PlaneGeometry(1,0.8).rotateY(-Math.PI/2).rotateZ(-0.3),new THREE.MeshBasicMaterial({color:0x00ff9c,transparent:true,opacity:.35,side:THREE.DoubleSide}));g.add(gl);P(gl,'Holographic combiner');g.add(mk(boxG(0.6,0.3,0.6).translate(0.2,-0.6,0),MAT.dark));P(g.children[1],'HUD projector');return;}
    const pl=mk(new THREE.PlaneGeometry(3.2,1.875),new THREE.MeshBasicMaterial({map:pfdTexture('ovh'),toneMapped:false}));g.add(pl);P(pl,'Integrated push-button annunciators');
    const fr=mk(boxG(3.36,2.03,0.12).translate(0,0,-0.08),MAT.dark);g.add(fr);P(fr,'Overhead console frame');
    const gd=inst(boxG(0.22,0.06,0.18),MAT.red,[M4(V(-0.6,-0.55,0.08)),M4(V(0.9,-0.55,0.08))]);g.add(gd);P(gd,'Guarded fire / start switches');g.rotation.y=0.55;},
  racks({g,P}){range(3).forEach(i=>{g.add(mk(boxG(1,1.4,0.3).translate(0,0,-0.4+i*0.4),MAT.green));});P(g.children[0],'LRU chassis (ARINC 600)');const l=inst(boxG(0.03,0.03,0.03),MAT.cyan,range(36).map(i=>M4(V(0.51,-0.6+(i%12)*0.11,-0.4+Math.floor(i/12)*0.4))));fnAnim(l,(o,tt)=>o.material===MAT.cyan&&(MAT.cyan.emissiveIntensity=0.6+0.4*Math.sin(tt*6)));g.add(l);P(l,'Status LEDs');g.add(mk(boxG(1.1,0.06,1.4).translate(0,-0.73,0),MAT.steel));P(g.children[4],'Cooled rack shelf');},
  droop({g,P,ac}){const F=fuseDef(ac),L=ac.L;const nose=grp();const hx=L/2-F.nose*0.95;nose.position.set(hx,F.at(hx).cy-F.at(hx).ry*0.6,0);const xs=range(14).map(i=>lerp(hx,L/2,i/13));const m=mk(tubeGeo(xs.map(x=>{const a=F.at(x);return{x:x-hx,cy:a.cy-nose.position.y,ry:a.ry,rz:a.rz};}),28),MAT.skin,{skin:1});nose.add(m);
    fnAnim(nose,(o,tt)=>o.rotation.z=-12.5*D2R*(0.5+0.5*Math.sin(tt*0.5)));g.add(nose);P(m,'Droop nose (12.5° for landing)');const back=range(8).map(i=>lerp(hx-6,hx,i/7));g.add(mk(tubeGeo(back.map(x=>{const a=F.at(x);return{x,cy:a.cy,ry:a.ry,rz:a.rz};}),28),MAT.skin,{skin:1}));P(g.children[1],'Forward fuselage');
    const hg=mk(cylZ(0.08,F.rz*1.6,12).translate(hx,nose.position.y,0),MAT.gold);g.add(hg);P(hg,'Hinge & screw jacks');g.position.x=-(hx);},
  visorup({g,P,ac}){const F=fuseDef(ac),L=ac.L;const hx=L/2-F.nose*1.0;const pv=grp();pv.position.set(hx,F.ry*0.9,0);const xs=range(12).map(i=>lerp(hx,L/2,i/11));const m=mk(tubeGeo(xs.map(x=>{const a=F.at(x);return{x:x-hx,cy:a.cy-F.ry*0.9,ry:a.ry,rz:a.rz};}),28),MAT.skin,{skin:1});pv.add(m);
    fnAnim(pv,(o,tt)=>o.rotation.z=1.2*(0.5+0.5*Math.sin(tt*0.4)));g.add(pv);P(m,'Nose visor (raises for drive-on loading)');const r=mk(boxG(F.nose*0.8,0.1,F.rz*1.4).translate(hx+F.nose*0.4,-F.ry*0.55,0),MAT.alum);g.add(r);P(r,'Forward loading ramp');g.position.x=-hx;},
  frame({g,P}){const f=mk(new THREE.TorusGeometry(1.5,0.05,8,72).rotateY(Math.PI/2),MAT.struct,{temp:.35});g.add(f);P(f,'Z-section frame');const cl=ringInst(36,boxG(0.15,0.04,0.12).translate(0,1.46,0),MAT.alum);g.add(cl);P(cl,'Shear clips');const sk=mk(cylX(1.56,1.56,0.6,72,true),MAT.skin,{skin:1});g.add(sk);P(sk,'Fuselage skin (Al 2524-T3 / CFRP)');},
  dome({g,P}){const d=new THREE.SphereGeometry(1.5,40,20,0,TAU,0,Math.PI/2).rotateZ(Math.PI/2).scale(0.45,1,1);const m=mk(d,MAT.struct,{temp:.3});fnAnim(m,(o,tt)=>o.scale.x=1+0.06*Math.sin(tt*1.2));g.add(m);P(m,'Pressure dome (8.6 psi ΔP)');const s=inst(boxG(0.05,3,0.06),MAT.steel,range(12).map(k=>M4(V(-0.02,0,0),qAx(AX,k*Math.PI/12))));g.add(s);P(s,'Radial stiffeners');},
  floor({g,P}){const b=inst(boxG(0.1,0.22,3),MAT.alum,range(6).map(i=>M4(V(-1.25+i*0.5,0,0))));g.add(b);P(b,'Floor cross-beams');const t=inst(boxG(3,0.05,0.06),MAT.chrome,range(6).map(i=>M4(V(0,0.13,-1.2+i*0.48))));g.add(t);P(t,'Seat tracks');const pn=mk(boxG(3,0.02,3).translate(0,0.18,0),MAT.liner);g.add(pn);P(pn,'Honeycomb floor panels');const s=inst(new THREE.CylinderGeometry(0.03,0.03,1,8),MAT.steel,[M4(V(0,-0.6,1.2),qAx(AX,0.4)),M4(V(0,-0.6,-1.2),qAx(AX,-0.4))]);g.add(s);P(s,'Stanchions');},
  acm({g,P,flows}){const sh=grp();sh.add(mk(cylX(0.06,0.06,2.4,12),MAT.chrome));[[0.8,'Fan'],[0,'Compressor'],[-0.8,'Turbine']].forEach(([x,n],i)=>{const r=rotorStage(0.12,0.45-i*0.05,14+i*4,0.15,{temp:i===1?0.45:0.08});r.position.x=x;sh.add(r);P(r.children[1],n+' wheel');});spinAnim(sh,10);g.add(sh);
    const h=mk(cylX(0.55,0.55,2.4,32,true),MAT.skin,{skin:1});g.add(h);P(h,'ACM housing (air bearings)');flows.push({type:'axial',n:400,x0:1.2,x1:-1.2,r0:0.15,r1:0.45,speed:1.2,zones:[[1.2,[1,0.7,0.3]],[0,[1,0.5,0.2]],[-0.8,[0.2,0.7,1]],[-1.2,[0.1,0.5,1]]],swirl:3});},
  hx({g,P,flows}){const f=inst(boxG(1.6,1,0.015),MAT.copper,range(40).map(i=>M4(V(0,0,-0.6+i*0.03))));g.add(f);P(f,'Plate-fin core');g.add(mk(boxG(1.7,1.1,1.3),MAT.liner));P(g.children[1],'Header tanks');flows.push({type:'free',n:500,box:[1.2,-1.2,-0.5,0.5,-0.6,0.6],speed:1,color:[0.2,0.8,1]});},
  bay({g,P,ac}){if(ac.deck==='fwing'){const rl=grp();rl.add(mk(cylX(0.15,0.15,4.5,12),MAT.steel));range(8).forEach(k=>{const b=grp();b.rotation.x=k*TAU/8;b.add(mk(cylX(0.18,0.18,3.4,12).translate(0,0.5,0),MAT.dark));b.add(mk(coneX(0.18,0.4,12).translate(1.9,0.5,0),MAT.dark));rl.add(b);});spinAnim(rl,0.6);g.add(rl);P(rl.children[0],'Rotary launcher assembly');P(rl.children[1].children[0],'Stores ×8 (2,000 lb class)');return;}
    [1,-1].forEach(s=>{const h=grp();h.position.set(0,0,s*0.9);const d=mk(boxG(3,0.04,0.85).translate(0,0,-s*0.43),MAT.skin,{skin:1});h.add(d);fnAnim(h,(o,tt)=>o.rotation.x=s*1.35*(0.5+0.5*Math.sin(tt*0.5)));g.add(h);if(s>0)P(d,'Bay door (sawtooth edges)');});
    const ms=grp();ms.add(mk(cylX(0.09,0.09,3,14),MAT.alum));ms.add(mk(coneX(0.09,0.35,14).translate(1.65,0,0),MAT.dark));ms.add(inst(boxG(0.3,0.02,0.4),MAT.dark,range(4).map(k=>M4(V(-1.3,0,0),qAx(AX,k*Math.PI/2+Math.PI/4)))));fnAnim(ms,(o,tt)=>o.position.y=0.35-0.45*Math.max(0,Math.sin(tt*0.5))**3);ms.position.y=0.35;g.add(ms);P(ms.children[0],'Missile on trapeze launcher');g.add(mk(boxG(3.2,0.05,1.9).translate(0,0.6,0),MAT.dark));P(g.children[3],'Bay roof & ejector rack');},
  ramp({g,P}){g.add(mk(boxG(4,2.6,0.05).translate(0,0,1.3),MAT.skin,{skin:1}),mk(boxG(4,2.6,0.05).translate(0,0,-1.3),MAT.skin,{skin:1}));const h=grp();h.position.set(-2,-1.25,0);const r=mk(boxG(3,0.1,2.4).translate(-1.5,0,0),MAT.alum);h.add(r);fnAnim(h,(o,tt)=>o.rotation.z=-0.9*(0.5+0.5*Math.sin(tt*0.45)));g.add(h);P(r,'Aft loading ramp');const pl=mk(boxG(2.2,1.2,2).translate(0.5,-0.6,0),MAT.uld);g.add(pl);P(pl,'463L pallet');P(g.children[0],'Fuselage sidewall');},
  uld({g,P}){const s=new THREE.Shape();s.moveTo(-0.78,-0.82);s.lineTo(0.78,-0.82);s.lineTo(0.78,0.82);s.lineTo(-1.0,0.82);s.lineTo(-1.0,-0.2);s.lineTo(-0.78,-0.82);const c=mk(new THREE.ExtrudeGeometry(s,{depth:1.53,bevelEnabled:false}).translate(0,0,-0.76).rotateY(Math.PI/2),MAT.uld);g.add(c);P(c,'LD3 container (Al / Lexan)');const n=mk(boxG(1.4,1.4,0.02).translate(0,0,0.79),MAT.liner);g.add(n);P(n,'Door net');g.add(mk(boxG(1.7,0.04,1.8).translate(0,-0.85,0),MAT.chrome));P(g.children[2],'Roller deck');},
  seatrow({g,P}){const ms=range(6).map(i=>M4(V(0,0,-1.5+i*0.52+(i>2?0.4:0))));g.add(inst(boxG(0.5,0.12,0.46),MAT.seat,ms));g.add(inst(boxG(0.1,0.75,0.46),MAT.seat,ms.map(m=>m.clone().multiply(M4(V(-0.22,0.38,0))))));P(g.children[0],'Seat cushions ×6');P(g.children[1],'Seat backs & IFE screens');g.add(inst(boxG(0.05,0.4,0.04),MAT.chrome,ms.map(m=>m.clone().multiply(M4(V(0,-0.25,0))))));P(g.children[2],'Seat legs (16g)');},
  finbox({g,P}){g.add(mk(loft([{x:1,y:-1.5,z:0,c:3,t:.1},{x:-0.4,y:1.5,z:0,c:1.6,t:.1}],AF,true),MAT.liner));P(g.children[0],'Fin skin (CFRP)');[0.15,0.65].forEach(cf=>{const s=mk(beamGeo(V(1-cf*3,-1.5,0),V(-0.4-cf*1.6,1.5,0),0.06,0.04,0.3,0.15),MAT.struct);g.add(s);});P(g.children[1],'Front spar');P(g.children[2],'Rear spar');const rb=inst(boxG(1.2,0.03,0.2),MAT.alum,range(7).map(i=>M4(V(0.3-i*0.24,-1.3+i*0.4,0))));g.add(rb);P(rb,'Ribs');},
  stab({g,P}){const h=grp();h.add(mk(loft([{x:1,y:0,z:-2,c:2,t:.1},{x:1,y:0,z:2,c:2,t:.1}]),MAT.skin,{skin:1}));const e=mk(loft([{x:-1,y:0,z:-1.9,c:0.8,t:.08},{x:-1,y:0,z:1.9,c:0.8,t:.08}]),MAT.ctrl);h.add(e);hingeOsc(h,0.12,0.6);g.add(h);P(h.children[0],'Stabilizer / stabilator');P(e,'Trailing-edge surface');const pv=mk(cylZ(0.08,1,12),MAT.gold);g.add(pv);P(pv,'Pivot fittings');},
  jackscrew({g,P}){const s=mk(new THREE.CylinderGeometry(0.08,0.08,2.4,16),MAT.chrome);spinAnim(s,4,'y');g.add(s);P(s,'Acme / ball screw');const n=mk(boxG(0.35,0.25,0.35),MAT.gold);fnAnim(n,(o,tt)=>o.position.y=0.8*Math.sin(tt*0.5));g.add(n);P(n,'Gimbal nut');const m=mk(boxG(0.5,0.4,0.5).translate(0,-1.4,0),MAT.dark);g.add(m);P(m,'Dual hydraulic motors & no-back brake');const st=mk(boxG(1.6,0.05,0.8).translate(-0.8,1.2,0),MAT.skin,{skin:1});g.add(st);P(st,'Stabilizer front spar fitting');},
  apu({g,P,flows}){const c=mk(cylX(0.6,0.5,2.4,32,true),MAT.skin,{skin:1});g.add(c);P(c,'APU casing (Honeywell 131-9 / 331 class)');const r1=rotorStage(0.12,0.45,20,0.15,{temp:.3});r1.position.x=0.6;spinAnim(r1,12);g.add(r1);P(r1.children[1],'Load compressor');const r2=rotorStage(0.15,0.45,40,0.1,{temp:.85,mat:MAT.gold});r2.position.x=-0.5;spinAnim(r2,12);g.add(r2);P(r2.children[1],'Turbine wheel');
    const cb=mk(torusX(0.38,0.1,32),MAT.hot,{temp:.95});g.add(cb);P(cb,'Combustor');flows.push({type:'axial',n:500,x0:1.2,x1:-2,r0:0.1,r1:0.4,speed:1.3,zones:[[1.2,[0.2,0.6,1]],[0.2,[1,0.7,0.3]],[0,[1,1,0.9]],[-0.6,[1,0.4,0.1]],[-2,[0.4,0.05,0.02]]],swirl:2});},
  split({g,P}){const u=mk(boxG(2,0.04,1.2),MAT.ctrl),d=mk(boxG(2,0.04,1.2),MAT.gold);const hu=grp(),hd=grp();hu.position.x=1;hd.position.x=1;u.position.x=-1;d.position.x=-1;hu.add(u);hd.add(d);fnAnim(hu,(o,tt)=>o.rotation.z=0.5*(0.5+0.5*Math.sin(tt*0.7)));fnAnim(hd,(o,tt)=>o.rotation.z=-0.5*(0.5+0.5*Math.sin(tt*0.7)));g.add(hu,hd);P(u,'Upper rudder panel');P(d,'Lower rudder panel');},
  generic({g,P}){const b=mk(boxG(1,1,1),MAT.steel);spinAnim(b,0.5,'y');g.add(b);P(b,'Component');}
};
/* =====================================================================
   ENGINEERING TELEMETRY & METALLURGY SPECS
   ===================================================================== */
const fmt=(v,d=0)=>Number(v).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
function thrustUnit(e){return e.type==='TP'?'shp':e.type==='PS'?'hp':'kN';}
function fuelFlow(e){return e.type==='TP'?e.thrust*0.27:e.type==='PS'?e.thrust*0.23:(e.type==='TFAB'||e.type==='TJAB'||e.type==='TRJ')?e.thrust*120:e.thrust*28;}
function fanMaterial(e){const n=e.name;if(/GE90|GEnx|GE9X/.test(n))return 'CFRP (IM7 / 8551-7 epoxy) with titanium leading edge';if(/LEAP/.test(n))return '3D-woven carbon RTM composite (Safran / Albany)';if(/Trent|BR7|Pearl|RB211-535|RB211/.test(n))return 'Hollow wide-chord Ti-6Al-4V (superplastic formed, diffusion bonded)';if(/GTF/.test(n))return 'Hybrid-metallic Al-Li blade with Ti leading-edge sheath';if(/Passport/.test(n))return 'Ti-6Al-4V blisk fan (one-piece)';return 'Solid Ti-6Al-4V with mid-span snubbers';}
function nacelleOEM(ac){return ac.mfr==='Airbus'?'Safran Nacelles':ac.mfr==='Boeing'?'Spirit AeroSystems / Collins Aerospace':ac.cat==='EA'?'Aviadvigatel / Nexcelle':'Collins Aerospace';}
function gearOEM(ac){if(ac.mfr==='Airbus'||/b78|b77|b779|c919|c929/.test(ac.id))return 'Safran Landing Systems (Messier-Bugatti-Dowty)';if(ac.mfr==='Boeing')return 'Collins Aerospace (Goodrich)';if(['Antonov','Ilyushin','Tupolev','Sukhoi','Yakovlev (Irkut)'].includes(ac.mfr))return 'Hydromash (Nizhny Novgorod)';if(ac.cat==='MI')return 'Héroux-Devtek / Collins Aerospace';if(ac.mfr==='Embraer')return 'Liebherr-Aerospace / Safran';return 'Safran Landing Systems';}
function brakeOEM(ac){return ac.deck==='ga'?'Cleveland (Parker Hannifin)':ac.mfr==='Airbus'||/b78/.test(ac.id)?'Safran Landing Systems carbon':'Honeywell / Collins Aerospace carbon';}
function avionicsOEM(ac){const m={Airbus:'Thales / Honeywell',Gulfstream:'Honeywell Symmetry Flight Deck',Bombardier:'Collins Aerospace Pro Line Fusion',Embraer:'Honeywell Primus Epic',Dassault:'Dassault EASy (Honeywell Primus Epic)',Pilatus:'Honeywell Primus Apex','Cessna (Textron)':'Garmin G5000 / G1000 NXi','Beechcraft (Textron)':'Collins Pro Line Fusion',COMAC:'Collins / Honeywell (AVIAGE Systems)','Lockheed Martin':'Lockheed Martin / Northrop Grumman',Sukhoi:'Tikhomirov NIIP / Ramenskoye',Eurofighter:'Euroradar / Leonardo'};
  if(/b78/.test(ac.id))return 'Collins Aerospace (Common Core System by GE)';if(ac.id==='rafl')return 'Thales';return m[ac.mfr]||(ac.flags.has('analog')?'Sperry / Collins (analog era)':'Honeywell / Collins Aerospace');}
function fusMat(ac){if(/b78/.test(ac.id))return 'One-piece CFRP barrel sections (T800S / 3900-2)';if(ac.flags.has('composite'))return 'CFRP skin panels on Al-Li frames';if(ac.id==='a388')return 'GLARE upper panels, Al 2524-T3 / 7xxx frames';if(ac.deck==='fighter')return 'Ti-6Al-4V bulkheads, BMI / CFRP skins, RAM coating';if(ac.id==='sr71')return 'Titanium Beta-120 (B120VCA) skin';if(ac.deck==='fwing')return 'Graphite-epoxy composite with RAM';return 'Al 2524-T3 skin, Al 7075 stringers & frames';}
function specFor(node,ctx=S){
  const ac=ctx.ac,e=ac.e,hyd=ac.flags.has('5k')?5000:3000,comp=ac.flags.has('composite'),tu=thrustUnit(e);
  const R=(l,v,u,d=0,j=0.004,max=null,heat=false)=>({l,v,u,d,j,max:max??(v*1.25||1),heat});
  const T4=clamp(1150+9*e.opr,1100,1750),T3=Math.round(288*Math.pow(Math.max(e.opr,2),0.2857)/0.88-273);
  const fanTip=e.n1*Math.PI*e.dia/60;let oem=ac.mfr,mat='',rows=[],note='';
  const k=node.level===3?node.parent.kind:node.kind,mk3=node.level===3?node.kind:null,p=node.p||{};
  const wheels=ac.gear.main.reduce((a,b)=>a+b,0)*2+ac.gear.center.reduce((a,b)=>a+b,0),wl=ac.mtow*0.93/Math.max(wheels,1);
  const W=ctx.AF.W,area=W.area;
  if(node.level===0){mat=fusMat(ac);rows=[R('Takeoff rating per engine',e.thrust,tu,0,0.006),R('Cruise Mach',ac.mach,'M',2,0.003,ac.mach*1.1),R('Max takeoff weight',ac.mtow,'t',1,0),R('Range',ac.range,'km',0,0),R('Hydraulic system',ac.deck==='ga'?0:hyd,'psi',0,0.01,5500),R('Wing loading',ac.mtowKg/area,'kg/m²',0,0)];
    note=`${ac.nEng}× ${e.name} · ${ac.L} m long · ${ac.S} m span · ${ac.H} m tall. First flight ${ac.first||'—'}${ac.status?' · '+ac.status:''}.`;}
  else if(node.sys==='prop'){oem=e.oem;
    const ab=e.type==='TFAB'||e.type==='TJAB'||e.type==='TRJ';
    if(e.type==='TP'){rows=[R('Shaft power',e.thrust,'shp',0,0.01),R('Propeller speed',e.n1,'rpm',0,0.006,e.n1*1.1),R('Gas generator (Ng)',e.n2,'rpm',0,0.004),R('ITT',e.egt*0.92,'°C',0,0.008,e.egt,true),R('Torque',86,'%',0,0.02,100),R('Fuel flow',fuelFlow(e),'kg/h',0,0.01)];mat='Composite blades, Ti / Ni gas generator';}
    else if(e.type==='PS'){rows=[R('Power',e.thrust,'hp',0,0.01),R('Crankshaft speed',e.n1,'rpm',0,0.006,2900),R('Manifold pressure',28.5,'inHg',1,0.01,32),R('Cylinder head temp',205,'°C',0,0.01,260,true),R('Compression ratio',e.opr,':1',1,0),R('Fuel flow',fuelFlow(e),'kg/h',0,0.02)];mat='Aluminium crankcase & heads, forged steel crankshaft';}
    else{rows=[R(ab?'Thrust (wet / reheat)':'Takeoff thrust',e.thrust,'kN',1,0.006),R(ab?'Low-pressure spool':'N1 fan speed',e.n1,'rpm',0,0.005),R('N2 core speed',e.n2,'rpm',0,0.004),R('EGT',e.egt*0.9,'°C',0,0.008,e.egt,true),R('Overall pressure ratio',e.opr,':1',1,0.002),R(ab?'Fuel flow (reheat)':'Fuel flow (takeoff)',fuelFlow(e),'kg/h',0,0.012)];if(!ab&&e.bpr)rows.push(R('Bypass ratio',e.bpr,':1',1,0));mat='Ti fan & compressor, Ni single-crystal hot section';}
    note=`${ac.nEng} engines · ${e.name} by ${e.oem}.`;
    switch(k){
      case 'nac':oem=nacelleOEM(ac);mat='CFRP / Al honeycomb sandwich, perforated acoustic face sheet, Ti inlet lip';rows=[R('Inlet Mach (takeoff)',0.62,'M',2,0.01,0.8),R('Anti-ice air temperature',205,'°C',0,0.02,260,true),R('Liner attenuation',9,'dB',1,0.03,15),R('Fan face diameter',e.dia,'m',2,0)];break;
      case 'fan':mat=fanMaterial(e);rows=[R('Fan speed (N1)',e.n1,'rpm',0,0.005),R('Blade tip speed',fanTip,'m/s',0,0.005,fanTip*1.2),R('Fan pressure ratio',clamp(1.9-0.045*e.bpr,1.3,1.9),':1',2,0.004,2),R('Air mass flow',e.thrust*(1.4+0.22*e.bpr),'kg/s',0,0.01),R('Blade count',e.blades||e.st.lpc,'',0,0),R('Bypass ratio',e.bpr,':1',1,0)];break;
      case 'fdgs':mat='Carburized steel gears, journal bearings';rows=[R('Reduction ratio',3.06,':1',2,0),R('Power transmitted',22,'MW',1,0.01,30),R('LPT speed',e.n1*3.06,'rpm',0,0.005),R('Oil temperature',118,'°C',0,0.01,160,true)];break;
      case 'lpc':case 'ablpc':mat='Ti-6Al-4V blisks & drum';rows=[R('Spool speed',e.n1,'rpm',0,0.005),R('Stage pressure ratio',Math.pow(Math.max(e.opr,4),1/(e.st.lpc+e.st.hpc+1)),':1',3,0.003,2),R('Exit temperature',Math.round(T3*0.35),'°C',0,0.01,T3,true),R('Stages',e.st.lpc,'',0,0)];break;
      case 'hpc':case 'abhpc':case 'abcomp':case 'tpcomp':mat=e.type==='TP'?'Ti-6Al-4V axial blisks, Ti centrifugal impeller':'Ti-6242 front blisks / Inconel 718 rear blisks';rows=[R('Core speed (N2)',e.n2,'rpm',0,0.004),R('Compressor exit temp (T3)',T3,'°C',0,0.008,T3*1.2,true),R('Exit pressure',e.opr*1.013,'bar',1,0.006),R('Stages',e.st.hpc||e.st.lpc,'',0,0)];break;
      case 'comb':mat=/GE9X/.test(e.name)?'SiC/SiC ceramic-matrix composite liner':'Hastelloy X / Haynes 188 liner + YSZ thermal barrier coat';rows=[R('Combustor exit (T4)',T4,'°C',0,0.008,1800,true),R('Liner metal temperature',940,'°C',0,0.01,1150,true),R('Fuel flow',fuelFlow(e),'kg/h',0,0.012),R('Pressure loss',3.2,'%',1,0.02,6)];break;
      case 'hpt':case 'abturb':case 'tpturb':mat='Single-crystal Ni superalloy (CMSX-4 / René N5) with TBC & film cooling'+(/GE9X/.test(e.name)?', CMC shrouds':'');rows=[R('Turbine inlet temp',T4-30,'°C',0,0.008,1800,true),R('Blade metal temp',1050,'°C',0,0.01,1150,true),R('Rotor speed',e.n2,'rpm',0,0.004),R('Cooling air',19,'% core',1,0.02,30)];break;
      case 'lpt':mat=/GEnx|LEAP|GE9X/.test(e.name)?'Titanium aluminide (Ti-48Al-2Cr-2Nb) blades':'Ni superalloy (IN-738 / Udimet 720)';rows=[R('Inlet temperature',e.egt*1.12,'°C',0,0.008,e.egt*1.4,true),R('EGT',e.egt*0.9,'°C',0,0.008,e.egt,true),R('Spool speed (N1)',e.n1,'rpm',0,0.005),R('Stages',e.st.lpt,'',0,0)];break;
      case 'exh':mat='Inconel 625 core nozzle, Ti-6242 plug, Al cascades';rows=[R('Core jet velocity',e.bpr>3?420:560,'m/s',0,0.01,700),R('Bypass jet velocity',e.bpr>3?290:380,'m/s',0,0.01,500),R('EGT',e.egt*0.88,'°C',0,0.008,e.egt,true),R('Reverser deploy time',2.0,'s',1,0)];break;
      case 'ab':mat='Hastelloy spray rings, Ti / Ni screech liner';rows=[R('Reheat gas temperature',1950,'°C',0,0.01,2200,true),R('Thrust augmentation',55,'%',0,0.01,80),R('Reheat fuel flow',fuelFlow(e)*0.65,'kg/h',0,0.015)];break;
      case 'noz':mat='Ti / ceramic-matrix composite flaps & seals';rows=[R('Nozzle area ratio',1.6,'Ae/At',2,0.02,2.2),R('Exit temperature',e.egt*1.4,'°C',0,0.01,2000,true),R('Vector range',ac.flags.has('tvc')?20:0,'°',0,0.02,25)];break;
      case 'intake':mat='Ti / CFRP ramps with RAM liner';rows=[R('Capture Mach',ac.mach,'M',2,0.004,ac.mach*1.1),R('Pressure recovery',0.92,'',3,0.003,1),R('Ramp / spike travel',ac.flags.has('spike')?66:28,ac.flags.has('spike')?'cm':'°',0,0.02,80)];break;
      case 'bypass':mat='Ti tubes, Inconel valves';rows=[R('Bleed fraction at M3.2',20,'%',0,0.02,30),R('Valve position',100,'% open',0,0.05,100)];break;
      case 'tprop':oem=/AE 2100|PW150/.test(e.name)?'Dowty Propellers (GE Aerospace)':/PW127/.test(e.name)?'Collins Aerospace (Hamilton Standard 568F)':'Hartzell Propeller';mat='Carbon-fibre spar, glass/epoxy shell, nickel LE sheath';rows=[R('Propeller speed',e.n1,'rpm',0,0.006,e.n1*1.1),R('Blade angle',32,'°',1,0.03,60),R('Tip speed',e.n1*Math.PI*e.dia/60,'m/s',0,0.006,300),R('Diameter',e.dia,'m',2,0)];break;
      case 'rgb':mat='Carburized AMS 6265 steel gears';rows=[R('Reduction ratio',+(e.n2/e.n1/1.2).toFixed(1),':1',1,0),R('Torque',86,'%',0,0.02,100),R('Oil temperature',95,'°C',0,0.01,130,true)];break;
      case 'stub':mat='Inconel 625 stubs';rows=[R('Exhaust temperature',e.egt*0.75,'°C',0,0.01,e.egt,true),R('Residual thrust',8,'% of total',0,0.03,15)];break;
      case 'pprop':oem=e.flags==='radial'?'Hamilton Standard':'McCauley Propeller Systems';mat='Forged 2025 aluminium blades';rows=[R('Propeller speed',e.n1,'rpm',0,0.006,2900),R('Diameter',e.dia,'m',2,0),R('Tip speed',e.n1*Math.PI*e.dia/60,'m/s',0,0.006,300)];break;
      case 'crank':case 'cyl':case 'cam':case 'pexh':break;
    }
    if(mk3==='rotor'){const st=p.stage||'hpc',t=stageTemp(st,p.i||0,p.n||1);const rpm=st==='fan'||st==='lpc'||st==='lpt'?e.n1:e.n2;const T=Math.round(15+t*(T4-15));rows=[R('Rotor speed',rpm,'rpm',0,0.004),R('Gas temperature',T,'°C',0,0.008,1800,true),R('Tip speed',rpm*Math.PI*e.dia*(st==='fan'?1:st==='lpt'?0.55:0.35)/60,'m/s',0,0.005,600),R('Stage pressure ratio',st==='hpt'||st==='lpt'?1/Math.pow(e.opr,1/((e.st.hpt||1)+(e.st.lpt||1))):Math.pow(Math.max(e.opr,4),1/((e.st.lpc||0)+(e.st.hpc||1)+1)),':1',3,0.003,2)];
      mat=st==='fan'?fanMaterial(e):st==='hpt'?'Single-crystal CMSX-4 / René N5 airfoils, PM disk (René 104)':st==='lpt'?(/GEnx|LEAP|GE9X/.test(e.name)?'TiAl blades on IN-718 disk':'IN-738 blades on IN-718 disk'):st==='hpc'&&(p.i||0)>(p.n||1)/2?'Inconel 718 blisk':'Ti-6Al-4V blisk';}
  }
  else if(node.sys==='wing'){oem=ac.mfr==='Airbus'&&ac.id!=='a220'?'Airbus UK (Broughton / Filton)':/b78/.test(ac.id)?'Mitsubishi Heavy Industries':ac.id==='b779'?'Boeing Composite Wing Center':ac.id==='a220'?'Spirit AeroSystems (Belfast)':ac.mfr;
    mat=comp?'CFRP (T800S / M21E toughened epoxy)':ac.deck==='fighter'?'Ti-6Al-4V spars, CFRP skins':ac.id==='sr71'?'Titanium B120 alloy':'Al 7085 / 7150 upper, Al 2324 lower skins';
    rows=[R('Wingspan',ac.S,'m',2,0),R('Wing area (est.)',area,'m²',0,0),R('Wing loading',ac.mtowKg/area,'kg/m²',0,0),R('LE sweep',ac.sweep||W.secs.length,'°',1,0),R('Fuel capacity (est.)',ac.mtow*0.36*1250,'L',0,0),R('Root bending moment',ac.mtow*9.81*ac.S*0.21/1000,'MN·m',1,0.02)];
    if(k==='flaps'||k==='slats'||k==='ail'||k==='spl'){rows.push(R('Surface deflection',k==='flaps'?30:k==='slats'?23:k==='spl'?45:20,'°',1,0.15,50),R('Hydraulic pressure',hyd,'psi',0,0.01,5500));}
    if(k==='tanks')mat='Integral sealed wet bay (polysulfide sealant)';if(k==='tip'&&ac.tip==='folding'){rows.push(R('Fold angle',75,'°',0,0.1,90),R('Folded span',64.85,'m',2,0));}
  }
  else if(node.sys==='gear'){oem=gearOEM(ac);mat='300M ultra-high-strength steel strut, Ti-10V-2Fe-3Al braces & beam';
    rows=[R('Main-gear wheels',wheels,'',0,0),R('Load per main wheel',wl,'t',1,0.01),R('Tire pressure',clamp(40+6.5*wl,30,230),'psi',0,0.005,240),R('Brake temperature',380,'°C',0,0.25,950,true),R('Hydraulic pressure',ac.deck==='ga'?0:hyd,'psi',0,0.01,5500),R('Shock-strut stroke',ac.deck==='ga'?180:Math.round(380+ac.mtow*0.4),'mm',0,0.03)];
    if(k==='brakes'){oem=brakeOEM(ac);mat=ac.deck==='ga'?'Steel disc, organic linings':'Carbon-carbon composite heat sink';}if(k==='act'||mk3==='actuator')mat='Steel barrel, chrome-plated rod';
  }
  else if(node.sys==='cockpit'){oem=avionicsOEM(ac);mat=k==='radome'?'Quartz / cyanate-ester radome':'Aluminium structure, polycarbonate / glass laminates';
    const radar=RADARS[ac.id];rows=[R('Display units',ac.flags.has('analog')?0:(ac.deck==='double'||/b78/.test(ac.id)?8:ac.deck==='fighter'?1:5),'',0,0),R('Radar range',radar&&ac.deck==='fighter'?200:320,'NM',0,0),R('Cabin altitude',ac.flags.has('5k')?6000:ac.deck==='fighter'?8000:8000,'ft',0,0.01,10000),R('Flight-deck crew',ac.deck==='fighter'||ac.deck==='ga'?1:2,'',0,0)];
    note=`${ac.ctl==='side'?'Fly-by-wire sidestick':ac.ctl==='stick'?'Center stick':'Conventional yoke'} · ${radar||'Weather radar'}.`;
    if(k==='droop'){rows.push(R('Droop angle (landing)',12.5,'°',1,0.05,15));mat='Al alloy nose, hydraulic screw-jacks';}
  }
  else if(node.sys==='fus'){oem=ac.mfr;mat=fusMat(ac);rows=[R('Fuselage length',ac.L,'m',2,0),R('Fuselage width',ac.D,'m',2,0),R('Pressure differential',/b78/.test(ac.id)?9.4:ac.deck==='fighter'?5:8.6,'psi',1,0.005,10),R('Frames (est.)',Math.round(ac.L/0.53),'',0,0),R('Seats / payload',ac.pax,'',0,0)];
    if(k==='ecs'){oem=/b78/.test(ac.id)?'Hamilton Sundstrand (Collins)':'Liebherr-Aerospace / Honeywell';mat='Al plate-fin heat exchangers, Ti air-cycle machine';rows.push(R('Pack outlet temp',4,'°C',0,0.3,30),R('ACM speed',42000,'rpm',0,0.01));}
    if(k==='cargo'&&ac.deck==='fighter')mat='Ti bay structure, RAM-treated doors';}
  else if(node.sys==='emp'){oem=ac.mfr;mat=(ac.mfr==='Airbus'||ac.flags.has('composite')||/b77|b78/.test(ac.id))?'CFRP torsion boxes, Al leading edges':'Aluminium alloy boxes';
    rows=[R('Aircraft height',ac.H,'m',2,0),R('Rudder deflection',ac.tail==='none'?0:30,'±°',0,0.2,35),R('Stabilizer trim',ac.tail==='fin'||ac.tail==='none'?0:4,'° nose-up',1,0.1,15),R('Hydraulic pressure',ac.deck==='ga'?0:hyd,'psi',0,0.01,5500)];
    if(k==='apu'){oem='Honeywell / Pratt & Whitney Canada';mat='Ti compressor, Ni turbine';rows=[R('APU speed',41000,'rpm',0,0.004),R('APU EGT',620,'°C',0,0.01,800,true),R('Bleed / shaft power',ac.mtow>200?1100:350,'kW',0,0.01)];}
    if(k==='jack'&&ac.deck!=='ga'){oem='Collins Aerospace / Moog';mat='Ball-screw: 4340 steel, bronze nut';}}
  if(mk3==='actuator'||mk3==='spoiler'||mk3==='flap'||mk3==='slat'||mk3==='surface'){if(!rows.some(r=>r.u==='psi'))rows.push(R('Hydraulic pressure',hyd,'psi',0,0.01,5500));}
  if(mk3==='brake')rows=rows.filter(r=>!/Tire/.test(r.l)).concat([R('Heat-sink energy',ac.mtow*0.12,'MJ',1,0.2)]);
  return {oem,mat,rows,note};
}
function compareRows(sys,a,b){
  const wa=wingDef(a,fuseDef(a)).area,wb=wingDef(b,fuseDef(b)).area,wh=x=>x.gear.main.reduce((s,v)=>s+v,0)*2+x.gear.center.reduce((s,v)=>s+v,0);
  const sameU=thrustUnit(a.e)===thrustUnit(b.e);
  const r={
    ac:[['Length','m',a.L,b.L],['Wingspan','m',a.S,b.S],['Height','m',a.H,b.H],['MTOW','t',a.mtow,b.mtow],['Range','km',a.range,b.range],['Mmo','M',a.mach,b.mach]],
    prop:[['Engines','',a.nEng,b.nEng],sameU?['Rating per engine',thrustUnit(a.e),a.e.thrust,b.e.thrust]:['Rating per engine','',a.e.thrust+' '+thrustUnit(a.e),b.e.thrust+' '+thrustUnit(b.e)],['Overall pressure ratio',':1',a.e.opr,b.e.opr],['Bypass ratio',':1',a.e.bpr,b.e.bpr],['Fan / prop diameter','m',a.e.dia,b.e.dia],['Engine','',a.e.name,b.e.name]],
    wing:[['Wingspan','m',a.S,b.S],['Wing area (est.)','m²',Math.round(wa),Math.round(wb)],['Wing loading','kg/m²',Math.round(a.mtowKg/wa),Math.round(b.mtowKg/wb)],['LE sweep','°',a.sweep,b.sweep],['Wingtip','',a.tip,b.tip]],
    gear:[['Main wheels','',wh(a),wh(b)],['Nose wheels','',a.gear.nose,b.gear.nose],['Load per wheel','t',+(a.mtow*0.93/Math.max(wh(a),1)).toFixed(1),+(b.mtow*0.93/Math.max(wh(b),1)).toFixed(1)],['MTOW','t',a.mtow,b.mtow]],
    cockpit:[['Primary controls','',a.ctl,b.ctl],['Instrumentation','',a.flags.has('analog')?'Analog':'Glass',b.flags.has('analog')?'Analog':'Glass'],['Hydraulics','psi',a.flags.has('5k')?5000:3000,b.flags.has('5k')?5000:3000]],
    fus:[['Length','m',a.L,b.L],['Width','m',a.D,b.D],['Deck','',a.deck,b.deck],['Seats / payload','',a.pax,b.pax]],
    emp:[['Height','m',a.H,b.H],['Tail layout','',a.tail,b.tail],['Length','m',a.L,b.L]]
  };
  return r[sys]||r.ac;
}
/* =====================================================================
   FLIGHT SIMULATION — gate-to-gate profile, tuned per aircraft class.
   One timeline (SIM.u ∈ [0,1)) drives surfaces, engines, panels and telemetry.
   ===================================================================== */
const simEase=t=>t*t*(3-2*t);
const SIM={u:0.36,playing:true,speed:1,dur:180,st:null,subs:new Set(),tlaOn:false,tla:55,n1Live:84};
/* thrust-lever schedule: IDLE 0 · CLB 55 · MCT 80 · TOGA 100 (% lever travel) */
const tlaN1=t=>21+Math.pow(clamp(t,0,100)/100,0.92)*(97-21);
const tlaDetent=t=>t<8?'IDLE':t<46?'PART':t<64?'CLB':t<86?'MCT':'TOGA';
const SIM_KF=[
 [0.000,'GATE',      {ias:0,  alt:0,    n1:0,  pitch:0,  gear:1,flaps:0,   slats:0,spl:0,rev:0,fold:1,brk:45, apu:1,door:1,lt:0}],
 [0.030,'ENGINE START',{n1:0,door:0}],
 [0.055,'TAXI OUT',  {ias:14, n1:24, flaps:0.45,slats:1,lt:1}],
 [0.095,'LINE UP',   {ias:0,  n1:24, fold:0, brk:70}],
 [0.110,'TAKEOFF',   {ias:0,  n1:95, lt:2}],
 [0.150,'ROTATE',    {ias:1,  n1:95, pitch:12}],
 [0.180,'CLIMB',     {ias:1.12,alt:0.06,gear:0,pitch:14,lt:2}],
 [0.250,'CLIMB',     {ias:250,alt:0.42,n1:90,flaps:0,slats:0,pitch:9,lt:1}],
 [0.370,'CRUISE',    {ias:-1, alt:1,   n1:83, pitch:2.5,lt:0}],
 [0.610,'CRUISE',    {ias:-1, alt:1,   n1:83, pitch:2.5}],
 [0.745,'DESCENT',   {ias:250,alt:0.13,n1:31, pitch:-2.2,lt:1}],
 [0.800,'APPROACH',  {ias:190,alt:0.055,n1:48,flaps:0.5,slats:1,pitch:1,lt:2}],
 [0.830,'APPROACH',  {gear:1}],
 [0.865,'FINAL',     {ias:2,  alt:0.006,n1:56,flaps:1,pitch:3}],
 [0.895,'TOUCHDOWN', {ias:2.0,alt:0,   n1:22, pitch:4,spl:1}],
 [0.905,'REVERSE',   {ias:1.6,n1:78, rev:1, pitch:0,brk:160}],
 [0.940,'ROLLOUT',   {ias:40, n1:24, rev:0, brk:420}],
 [0.965,'TAXI IN',   {ias:14, n1:22, spl:0, flaps:0,slats:0,fold:1,brk:330,lt:1}],
 [0.990,'GATE',      {ias:0,  n1:0,  apu:1,door:1,brk:210,lt:0}]
];
(()=>{let prev=null;SIM_KF.forEach(k=>{k[2]=Object.assign({},prev||{},k[2]);prev=k[2];});})();
const SIM_PHASE_U={parked:0.012,takeoff:0.13,cruise:0.48,approach:0.85,rollout:0.925};
function simProfile(ac){
  const d=ac.deck,e=ac.e,ss=d==='ss',mil=d==='fighter',ga=d==='ga',biz=d==='bizjet',tp=e.type==='TP',ps=e.type==='PS';
  const cruiseAlt=ac.id==='sr71'?80000:ss?55000:mil?40000:ac.id==='b2'?41000:biz?(ac.id==='g650'||ac.id==='g700'||ac.id==='gl75'?51000:45000):ps?(ac.id==='c172'?8500:10000):tp?(d==='cargo'?24000:24000):ac.mach>0.84?39000:37000;
  const vr=ps?(ac.id==='c172'?55:84):tp?(d==='cargo'?115:110):ss?215:mil?165:biz?120:ac.mtow>300?168:ac.mtow>150?158:ac.mtow>60?148:135;
  const ciasC=ps?(ac.id==='c172'?110:150):tp?235:ss?410:mil?330:ac.id==='sr71'?420:ac.mtow>300?295:285;
  const mach=Math.min(ac.mach*0.94,ac.mach-0.02);
  const tow=(typeof CFG!=='undefined'&&CFG[ac.id])?CFG[ac.id].tow:0.88,hasFold=ac.tip==='folding',fuelCap=Math.max(ac.mtow*0.36,0.12)*clamp((tow-0.5)/0.38,0.25,1.15);
  const vrW=Math.round(vr*Math.sqrt(tow/0.88));
  return {cruiseAlt,vr:vrW,vref:Math.round(vrW*0.88),ciasC,mach,hasFold,fuelCap,tow,minutes:ps?90:tp?100:ss?190:mil?75:140};
}
function simState(ac,u){
  u=((u%1)+1)%1;const P=ac._prof||(ac._prof=simProfile(ac)),e=ac.e,K=SIM_KF;
  let i=K.length-1;for(let j=0;j<K.length-1;j++){if(u<K[j+1][0]){i=j;break;}}
  const a=K[i],b=K[Math.min(i+1,K.length-1)],span=Math.max(b[0]-a[0],1e-6),f=i===K.length-1?1:simEase(clamp((u-a[0])/span,0,1));
  const res=v=>v===-1?P.ciasC:v===1?P.vr:v===1.12?P.vr+18:v===2?P.vref:v===2.0?P.vref:v===1.6?P.vref-20:v;
  const I=k=>{const va=k==='ias'?res(a[2][k]):a[2][k],vb=k==='ias'?res(b[2][k]):b[2][k];return lerp(va,vb,f);};
  const st={u,phase:a[1],next:b[1],ac};
  ['ias','alt','n1','pitch','gear','flaps','slats','spl','rev','fold','brk','apu','door','lt'].forEach(k=>st[k]=I(k));
  if(!P.hasFold)st.fold=0;
  st.altFt=st.alt*P.cruiseAlt;
  const du=0.002,altAt=uu=>{const s2=simStateLite(ac,uu);return s2;};
  st.vs=(altAt(u+du)-altAt(u-du))/(2*du)/P.minutes;
  st.hdg=((274+38*Math.sin(u*TAU*2.2)*clamp(st.altFt/3000,0,1))%360+360)%360;
  const dh=38*TAU*2.2*Math.cos(u*TAU*2.2)*clamp(st.altFt/3000,0,1);st.bank=clamp(dh*0.0016,-22,22);
  st.pitch+=Math.sin(u*190)*0.25*(st.altFt>50?1:0);
  st.ra=st.altFt;st.onGround=st.altFt<5;
  st.tas=st.ias*(1+st.altFt/1000*0.02);st.gs=Math.max(0,st.tas-12*Math.sin(u*7));
  st.mach=st.altFt>20000&&st.phase==='CRUISE'?P.mach:st.tas/661.5;
  st.sat=Math.max(15-1.98*st.altFt/1000,-56.5);st.tat=st.sat+st.tas*st.tas/87000;
  // engines (thrust-lever override: the lever drives N1 through the spool lag kept by simLoop)
  if(SIM.tlaOn)st.n1=SIM.n1Live;
  const on=st.n1>1,egtTO=e.egt*0.92||800,egtIdle=e.egt*0.43||380,ffTO=fuelFlow(e)||1000;
  st.eng=range(ac.nEng).map(k=>{const n1=Math.max(0,st.n1+(on?Math.sin(u*55+k*1.7)*0.35+(k%2?-0.3:0.25):0));
    const r=clamp((n1-21)/74,0,1.1);
    const egt=on?egtIdle+(egtTO-egtIdle)*Math.pow(r,1.25)+Math.sin(u*43+k)*4:clamp(18+st.sat*0.1,-20,30);
    const n2=on?58+0.42*n1:0,ff=on?ffTO*Math.pow(Math.max(n1,21)/95,2.3):0;
    return {n1,egt,n2,ff,oilP:on?55+0.3*n1:0,oilT:on?65+0.5*n1:st.sat,vib:on?0.4+n1*0.006:0,np:on?e.n1*(st.n1>30?1:0.82):0,trq:on?n1:0,rpm:on?e.n1*n1/100:0,mp:on?14+15*n1/100:29.9};});
  st.spool=on?clamp(st.n1/85,0.25,1.2):0.02;
  const dens=Math.pow(Math.max(0.25,1-st.altFt/145000),4.2);st.thrust=on?e.thrust*Math.pow(clamp((st.n1-19)/76,0,1.12),1.9)*(e.type==='TP'||e.type==='PS'?1:dens):0;
  st.mode=SIM.tlaOn?tlaDetent(SIM.tla):(u<0.11||u>0.94?'IDLE':u<0.19?'TOGA':u<0.37?'CLB':u<0.62?'CRZ':u<0.8?'IDLE':u<0.895?'SPEED':'REV');
  // fuel
  const burn=simEase(clamp((u-0.05)/0.92,0,1));st.fob=P.fuelCap*(1-0.82*burn);st.fu=P.fuelCap*0.82*burn;st.fuelCap=P.fuelCap;
  // systems
  st.hydNom=ac.flags.has('5k')?5000:ac.deck==='ga'?0:3000;st.engRun=on;
  st.cabAlt=st.altFt>0?Math.min(st.altFt*0.2,ac.flags.has('composite')?6000:8000):0;st.dp=st.cabAlt>0?clamp((st.altFt-st.cabAlt)/3700,0,ac.flags.has('5k')?9.4:8.6):0;
  st.cabVs=st.vs*0.18;
  st.ap=u>0.19&&u<0.875;st.at=u>0.11&&u<0.9;
  st.vapp=P.vref+5;st.v1=P.vr-6;st.selAlt=u<0.6?P.cruiseAlt:u<0.8?3000:2000;st.selSpd=u<0.37?250:u<0.75?P.ciasC:P.vref+5;
  st.loc=u>0.8&&u<0.9?0.35*Math.sin(u*120):0;st.gsd=u>0.82&&u<0.895?0.3*Math.sin(u*90+1):0;
  st.fma=fmaFor(ac,st);st.prof=P;
  return st;
}
function simStateLite(ac,u){u=((u%1)+1)%1;const P=ac._prof||(ac._prof=simProfile(ac)),K=SIM_KF;let i=K.length-1;for(let j=0;j<K.length-1;j++){if(u<K[j+1][0]){i=j;break;}}
  const a=K[i],b=K[Math.min(i+1,K.length-1)],f=i===K.length-1?1:simEase(clamp((u-a[0])/Math.max(b[0]-a[0],1e-6),0,1));return lerp(a[2].alt,b[2].alt,f)*P.cruiseAlt;}
function fmaFor(ac,s){
  const ab=ac.ctl==='side',u=s.u,G='#35e07a',W='#ffffff',C='#3fd4ff',M='#ff52d9';
  if(ab){if(u<0.11)return [['',W],['',W],['',W],['1FD2',W],['',W]];
    if(u<0.18)return [['MAN',W,'FLX 54'],['SRS',G],['RWY',G],['1FD2',W,'A/THR'],['',W]];
    if(u<0.37)return [['THR CLB',G],['CLB',G,'ALT'],['NAV',G],['AP1',W,'1FD2'],['A/THR',W]];
    if(u<0.62)return [['SPEED',G],['ALT CRZ',G],['NAV',G],['AP1',W,'1FD2'],['A/THR',W]];
    if(u<0.8)return [['THR IDLE',G],['DES',G],['NAV',G],['AP1',W,'1FD2'],['A/THR',W]];
    if(u<0.895)return [['SPEED',G],['G/S',G],['LOC',G],['CAT3',W,'DUAL'],['A/THR',W]];
    return [['',W],['ROLL OUT',G],['',W],['',W],['',W]];}
  if(u<0.11)return [['',W],['',W],['',W],['FD',G],['',W]];
  if(u<0.18)return [['THR REF',G],['TO/GA',G],['TO/GA',G],['FD',G],['',W]];
  if(u<0.37)return [['THR REF',G],['LNAV',G],['VNAV SPD',G],['A/P',G],['',W]];
  if(u<0.62)return [['SPD',G],['LNAV',G],['VNAV PTH',G],['A/P',G],['',W]];
  if(u<0.8)return [['IDLE',G],['LNAV',G],['VNAV PTH',G],['A/P',G],['',W]];
  if(u<0.895)return [['SPD',G],['LOC',G],['G/S',G],['LAND 3',G],['',W]];
  return [['',W],['ROLLOUT',G],['FLARE',G],['',W],['',W]];
}
function simTick(dt){if(SIM.playing)SIM.u=(SIM.u+dt*SIM.speed/SIM.dur)%1;if(SIM.tlaOn){const tg=tlaN1(SIM.tla),up=tg>SIM.n1Live;SIM.n1Live+=(tg-SIM.n1Live)*Math.min(1,dt*(up?0.55:0.8));}SIM.subs.forEach(f=>f(SIM.u));
  if (window.audio && window.S && window.S.ac) {
    const st = window.S.simSt || (window.S.ac ? simStateLite(window.S.ac, SIM.u) : null);
    const n1 = SIM.tlaOn ? SIM.n1Live : (st && st.n1 ? st.n1[0] : 0);
    const run = st ? st.engRun : true;
    const isProp = window.S.ac ? (window.S.ac.e.type === 'TP' || window.S.ac.e.type === 'PS') : false;
    window.audio.updateEngine(n1, run, isProp);
  }}
let _simLast=performance.now();(function simLoop(now){requestAnimationFrame(simLoop);const dt=Math.min(0.05,(now-_simLast)/1000);_simLast=now;simTick(dt);})(_simLast);
function simSeek(u){SIM.u=((u%1)+1)%1;SIM.subs.forEach(f=>f(SIM.u));}
const simPhaseKey=u=>u<0.1?'parked':u<0.25?'takeoff':u<0.75?'cruise':u<0.895?'approach':u<0.97?'rollout':'parked';
/* shared sim control widget: play, scrub, phase chips, speed */
function bindSimControls(root){
  const play=root.querySelector('[data-sim=play]'),rng=root.querySelector('[data-sim=u]'),ph=root.querySelector('[data-sim=phase]'),clock=root.querySelector('[data-sim=clock]');
  const set=()=>{play.setAttribute('aria-pressed',String(SIM.playing));play.setAttribute('aria-label',SIM.playing?'Pause simulation':'Play simulation');play.innerHTML=SIM.playing?'<svg viewBox="0 0 16 16"><rect x="3.5" y="3" width="3" height="10" rx="1"/><rect x="9.5" y="3" width="3" height="10" rx="1"/></svg>':'<svg viewBox="0 0 16 16"><path d="M4.5 3l9 5-9 5z"/></svg>';};
  play.onclick=()=>{SIM.playing=!SIM.playing;document.querySelectorAll('[data-sim=play]').forEach(b=>b.dispatchEvent(new Event('simsync')));};
  play.addEventListener('simsync',set);set();
  let drag=false;rng.addEventListener('input',()=>{drag=true;simSeek(+rng.value/1000);});rng.addEventListener('change',()=>drag=false);
  root.querySelectorAll('[data-ph]').forEach(b=>b.onclick=()=>simSeek(SIM_PHASE_U[b.dataset.ph]));
  root.querySelectorAll('[data-spd]').forEach(b=>b.onclick=()=>{SIM.speed=+b.dataset.spd;document.querySelectorAll('[data-spd]').forEach(x=>x.setAttribute('aria-pressed',String(+x.dataset.spd===SIM.speed)));});
  let lastTxt='';SIM.subs.add(u=>{if(!drag){rng.value=Math.round(u*1000);rng.style.setProperty('--p',(u*100).toFixed(1)+'%');}
    const k=SIM_KF.findIndex((x,i)=>u<(SIM_KF[i+1]?SIM_KF[i+1][0]:2));const t=SIM_KF[Math.max(k,0)][1];if(t!==lastTxt){lastTxt=t;ph.textContent=t;}
    const key=simPhaseKey(u);root.querySelectorAll('[data-ph]').forEach(b=>{const on=b.dataset.ph===key;if(b.getAttribute('aria-pressed')!==String(on))b.setAttribute('aria-pressed',String(on));});
    if(clock){const m=Math.floor(u*140),hh=Math.floor(m/60),mm=m%60;clock.textContent=`T+${hh}:${String(mm).padStart(2,'0')}`;}});
}
const SIM_CTL_HTML=`<button type="button" class="simplay" data-sim="play"></button>
 <div class="simtrack"><div class="simmarks">${SIM_KF.filter((k,i)=>i===0||k[1]!==SIM_KF[i-1][1]).map(k=>`<i style="left:${(k[0]*100).toFixed(1)}%" title="${k[1]}"></i>`).join('')}</div><input type="range" min="0" max="999" value="360" data-sim="u" aria-label="Flight timeline"></div>
 <div class="simread"><b data-sim="phase">CRUISE</b><span data-sim="clock">T+0:50</span></div>
 <div class="simph" role="group" aria-label="Jump to phase">${[['parked','Gate'],['takeoff','Takeoff'],['cruise','Cruise'],['approach','Approach'],['rollout','Rollout']].map(([k,l])=>`<button type="button" data-ph="${k}" aria-pressed="false">${l}</button>`).join('')}</div>
 <div class="simspd" role="group" aria-label="Simulation speed">${[1,3,8].map(v=>`<button type="button" data-spd="${v}" aria-pressed="${v===1}">${v}×</button>`).join('')}</div>`;
/* =====================================================================
   FLIGHT DECK PANELS — live canvas avionics driven by the simulation.
   Families: ECAM (Airbus-style sidestick decks), EICAS (Boeing-style),
   ANALOG (round-dial steam gauges) and MIL (HUD / tactical MFDs).
   All drawers work in a 512-unit square (or 1024-wide strip) space.
   ===================================================================== */
const AV={sky:'#2f7fd6',gnd:'#8a5628',w:'#ffffff',g:'#35e07a',c:'#3fd4ff',m:'#ff52d9',a:'#ffb000',r:'#ff3b30',y:'#ffe14d',gr:'#8b929b',dk:'#07090b',tape:'#3b4047',hud:'#7dff9a'};
const MONO='"IBM Plex Mono",ui-monospace,Menlo,monospace',SANS='"Geist",system-ui,sans-serif';
function avFam(ac){return ac.deck==='fighter'||ac.id==='b2'?'mil':ac.flags.has('analog')?'analog':ac.ctl==='side'?'ecam':'eicas';}
function T(c,s,x,y,col,sz=16,al='left',wt=500,font=MONO){c.fillStyle=col;c.font=`${wt} ${sz}px ${font}`;c.textAlign=al;c.textBaseline='middle';c.fillText(s,x,y);}
function Ln(c,pts,col,lw=2,dash){c.strokeStyle=col;c.lineWidth=lw;if(dash)c.setLineDash(dash);c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke();if(dash)c.setLineDash([]);}
function Bx(c,x,y,w,h,col,lw=2,fill){if(fill){c.fillStyle=fill;c.fillRect(x,y,w,h);}if(col){c.strokeStyle=col;c.lineWidth=lw;c.strokeRect(x,y,w,h);}}
function RR(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
const n0=v=>Math.round(v).toString(),n1f=v=>v.toFixed(1);
function bg(c,w=512,h=512,col=AV.dk){c.fillStyle=col;c.fillRect(0,0,w,h);}

/* ---------------- PFD ---------------- */
function drawPFD(c,s,ac){const f=avFam(ac);if(f==='analog')return drawADI(c,s,ac);if(f==='mil')return drawHUD(c,s,ac);
  bg(c);const ecam=f==='ecam',cx=256,cy=250,ppd=4.4;
  // FMA
  Bx(c,0,0,512,52,null,0,'#05070a');s.fma.forEach((m,i)=>{const x=8+i*99;if(i)Ln(c,[[x,6],[x,46]],'#59606a',1);T(c,m[0],x+50,17,m[1],13,'center',600);if(m[2])T(c,m[2],x+50,36,i===3?AV.w:AV.c,12,'center',500);});
  // attitude
  c.save();c.beginPath();if(ecam){c.rect(152,96,208,292);}else{RR(c,150,96,212,292,22);}c.clip();
  c.translate(cx,cy);c.rotate(-s.bank*D2R);c.translate(0,s.pitch*ppd);
  const gsky=c.createLinearGradient(0,-500,0,0);gsky.addColorStop(0,'#1d5cad');gsky.addColorStop(1,AV.sky);c.fillStyle=gsky;c.fillRect(-500,-900,1000,900);
  const ggnd=c.createLinearGradient(0,0,0,500);ggnd.addColorStop(0,AV.gnd);ggnd.addColorStop(1,'#5b3613');c.fillStyle=ggnd;c.fillRect(-500,0,1000,900);
  Ln(c,[[-500,0],[500,0]],AV.w,2.5);
  for(let p=-40;p<=40;p+=2.5){if(!p)continue;const y=-p*ppd,maj=p%10===0,mid=p%5===0,w=maj?46:mid?24:11;if(Math.abs(p-s.pitch)>26)continue;Ln(c,[[-w,y],[w,y]],AV.w,maj?2.2:1.6);if(maj){T(c,String(Math.abs(p)),-w-7,y,AV.w,13,'right');T(c,String(Math.abs(p)),w+7,y,AV.w,13,'left');}}
  c.restore();
  // bank scale
  c.save();c.translate(cx,cy);c.strokeStyle=AV.w;c.lineWidth=2;c.beginPath();c.arc(0,0,128,(-90-60)*D2R,(-90+60)*D2R);c.stroke();
  [-60,-45,-30,-20,-10,0,10,20,30,45,60].forEach(a=>{c.save();c.rotate(a*D2R);Ln(c,[[0,-128],[0,a%30===0?-142:-136]],AV.w,2);c.restore();});
  c.fillStyle=ecam?AV.y:AV.w;c.beginPath();c.moveTo(0,-127);c.lineTo(-8,-114);c.lineTo(8,-114);c.closePath();c.fill();
  c.rotate(-s.bank*D2R);c.fillStyle=AV.w;c.beginPath();c.moveTo(0,-124);c.lineTo(-9,-108);c.lineTo(9,-108);c.closePath();c.fill();c.restore();
  // aircraft symbol
  c.lineWidth=3;if(ecam){c.fillStyle='#000';c.strokeStyle=AV.y;[[-86,-30],[30,86]].forEach(([a,b])=>{c.beginPath();c.moveTo(cx+a,cy);c.lineTo(cx+b,cy);c.lineTo(cx+b,cy+8);c.stroke();});Bx(c,cx-5,cy-5,10,10,AV.y,3,'#000');}
  else{[[-90,-34],[34,90]].forEach(([a,b])=>{Bx(c,cx+Math.min(a,b),cy-4,Math.abs(b-a),9,AV.w,2,'#000');});Bx(c,cx-5,cy-5,10,10,AV.w,2,'#000');}
  // flight director
  if(s.ap||s.u>0.11&&s.u<0.9){const fx=Math.sin(s.u*60)*6,fy=Math.cos(s.u*44)*5;Ln(c,[[cx-60,cy+fy],[cx+60,cy+fy]],AV.g,3);Ln(c,[[cx+fx,cy-60],[cx+fx,cy+60]],AV.g,3);}
  // speed tape
  tape(c,{x:36,y:96,w:80,h:292,v:s.ias,ppu:3.6,step:10,lab:20,left:true,fmt:v=>v>=30?n0(v):'',floor:30});
  if(s.u<0.2){[[s.v1,'1',AV.c],[s.prof.vr,'R',AV.c]].forEach(([v,l,col])=>{const y=cy-(v-s.ias)*3.6;if(y>100&&y<384)T(c,l,120,y,col,13,'left',700);});}
  if(s.u>0.78&&s.u<0.97){const y=cy-(s.vapp-s.ias)*3.6;if(y>100&&y<384){T(c,'REF',120,y,AV.m,11,'left',600);}}
  const sy=cy-(s.selSpd-s.ias)*3.6;c.fillStyle=ecam?AV.m:AV.m;if(sy>96&&sy<388){c.beginPath();c.moveTo(116,sy);c.lineTo(126,sy-7);c.lineTo(126,sy+7);c.closePath();c.fill();}else T(c,n0(s.selSpd),76,sy<96?84:400,AV.m,13,'center',600);
  readout(c,40,cy,74,30,n0(s.ias),ecam?AV.y:AV.w,true);
  T(c,s.mach>0.4?'.'+String(Math.round(s.mach*1000)).padStart(3,'0').slice(0,3):'',76,406,AV.g,15,'center',600);
  // altitude tape
  tape(c,{x:396,y:96,w:76,h:292,v:s.altFt,ppu:0.36,step:100,lab:500,left:false,fmt:v=>v>=0?(v%1000===0?n0(v/100):n0(v/100).slice(-2)):'',floor:-1000});
  const ay=cy-(s.selAlt-s.altFt)*0.36;T(c,n0(s.selAlt),434,ay<100?84:ay>384?404:ay,AV.c,13,'center',600);
  readout(c,398,cy,72,30,n0(Math.round(s.altFt/20)*20),AV.g,false);
  // VSI
  Bx(c,476,116,30,252,null,0,'#1a1d21');const vsy=cy-clamp(Math.sign(s.vs)*Math.sqrt(Math.abs(s.vs)/6000),-1,1)*118;Ln(c,[[506,cy],[478,vsy]],AV.g,3);
  [-1,-0.58,0,0.58,1].forEach(k=>Ln(c,[[476,cy-k*118],[484,cy-k*118]],AV.w,1.5));if(Math.abs(s.vs)>300)T(c,n0(Math.abs(s.vs)/100),491,s.vs>0?108:376,AV.g,12,'center',600);
  // heading tape
  c.save();c.beginPath();c.rect(150,422,212,48);c.clip();Bx(c,150,422,212,48,null,0,AV.tape);
  for(let d=-30;d<=30;d+=5){const h=Math.round(s.hdg/5)*5+d,x=cx+(h-s.hdg)*5.6;Ln(c,[[x,422],[x,h%10===0?436:430]],AV.w,1.6);if(h%10===0){const hh=((h%360)+360)%360/10;T(c,String(Math.round(hh)).padStart(2,'0'),x,452,AV.w,14,'center',600);}}
  c.restore();Ln(c,[[cx,416],[cx,442]],ecam?AV.y:AV.w,3);
  // ILS / RA
  if(s.u>0.8&&s.u<0.9){c.strokeStyle=AV.w;c.lineWidth=1.5;[-2,-1,1,2].forEach(k=>{c.beginPath();c.arc(cx+k*30,404,3.5,0,TAU);c.stroke();c.beginPath();c.arc(372,cy+k*30,3.5,0,TAU);c.stroke();});
    c.fillStyle=AV.m;dia(c,cx+s.loc*60,404,8);dia(c,372,cy+s.gsd*60,8);T(c,'ILS 27R  109.90',160,486,AV.m,12,'left',600);}
  if(s.ra<2500&&s.ra>0.5)T(c,n0(s.ra),cx,366,s.ra<400?AV.a:AV.g,18,'center',700);
  if(s.onGround&&s.u>0.11&&s.u<0.18)T(c,'V1 '+n0(s.v1)+'  VR '+n0(s.prof.vr),360,486,AV.c,12,'right',600);
  T(c,'QNH 1013',474,412,AV.c,11,'center',500);
}
function dia(c,x,y,r){c.beginPath();c.moveTo(x,y-r);c.lineTo(x+r*0.7,y);c.lineTo(x,y+r);c.lineTo(x-r*0.7,y);c.closePath();c.fill();}
function tape(c,o){const {x,y,w,h,v,ppu,step,lab,left}=o,cy=y+h/2;c.save();c.beginPath();c.rect(x,y,w,h);c.clip();Bx(c,x,y,w,h,null,0,AV.tape);
  const span=h/2/ppu,lo=Math.floor((v-span)/step)*step;for(let t=lo;t<=v+span+step;t+=step){if(t<o.floor)continue;const yy=cy-(t-v)*ppu;const ex=left?x+w:x;Ln(c,[[ex,yy],[left?ex-(t%lab===0?14:8):ex+(t%lab===0?14:8),yy]],AV.w,1.6);
    if(t%lab===0){const s=o.fmt(t);if(s)T(c,s,left?x+w-20:x+20,yy,AV.w,14,left?'right':'left',600);}}
  c.restore();Bx(c,x,y,w,h,'#5c626b',1);}
function readout(c,x,cy,w,h,txt,col,left){c.fillStyle='#000';c.strokeStyle=col;c.lineWidth=2;c.beginPath();if(left){c.moveTo(x,cy-h/2);c.lineTo(x+w,cy-h/2);c.lineTo(x+w+10,cy);c.lineTo(x+w,cy+h/2);c.lineTo(x,cy+h/2);}else{c.moveTo(x+w,cy-h/2);c.lineTo(x,cy-h/2);c.lineTo(x-10,cy);c.lineTo(x,cy+h/2);c.lineTo(x+w,cy+h/2);}c.closePath();c.fill();c.stroke();T(c,txt,x+w/2,cy+1,col,20,'center',600);}

/* ---------------- ND ---------------- */
function drawND(c,s,ac){const f=avFam(ac);if(f==='analog')return drawHSI(c,s,ac);if(f==='mil')return drawSA(c,s,ac);
  bg(c);const cx=256,cy=432,R=330,range=s.altFt>18000?80:s.altFt>3000?40:10,ppn=R/range;
  // weather
  if(s.altFt>800){[[0.35,0.38,40,'#1f9e3a'],[0.42,0.35,22,'#d8c21a'],[-0.28,0.55,46,'#1f9e3a'],[-0.31,0.58,18,'#c42020']].forEach(([b,d,r,col])=>{const a=(b*60-((s.hdg-274)))*D2R,x=cx+Math.sin(a)*d*R,y=cy-Math.cos(a)*d*R;const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,col);g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.globalAlpha=0.7;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();c.globalAlpha=1;});}
  // compass arc
  c.save();c.beginPath();c.rect(0,56,512,456);c.clip();c.strokeStyle=AV.w;c.lineWidth=2;c.beginPath();c.arc(cx,cy,R,(-90-52)*D2R,(-90+52)*D2R);c.stroke();
  for(let d=0;d<360;d+=5){let rel=((d-s.hdg+540)%360)-180;if(Math.abs(rel)>52)continue;const a=(rel-90)*D2R,l=d%10===0?16:9;Ln(c,[[cx+Math.cos(a)*R,cy+Math.sin(a)*R],[cx+Math.cos(a)*(R-l),cy+Math.sin(a)*(R-l)]],AV.w,1.8);
    if(d%30===0){c.save();c.translate(cx+Math.cos(a)*(R-30),cy+Math.sin(a)*(R-30));c.rotate(rel*D2R);T(c,String(d/10),0,0,AV.w,16,'center',600);c.restore();}}
  c.strokeStyle='#8b929b';c.setLineDash([4,6]);c.beginPath();c.arc(cx,cy,R/2,(-90-52)*D2R,(-90+52)*D2R);c.stroke();c.setLineDash([]);
  T(c,String(range/2),cx-R/2*Math.sin(48*D2R)-12,cy-R/2*Math.cos(48*D2R),AV.c,12,'right',500);
  // route
  const prog=(s.u*900)%38,wp=[['KEMPS',38-prog,282],['RIVET',38-prog+34,298],['LOGAN',38-prog+66,286],['BOS',38-prog+102,270]];
  const pts=[[cx,cy]];wp.forEach(([n,d,b])=>{const a=((b-s.hdg+540)%360-180)*D2R;pts.push([cx+Math.sin(a)*d*ppn,cy-Math.cos(a)*d*ppn,n]);});
  Ln(c,pts,AV.m,2.5);pts.slice(1).forEach(([x,y,n],i)=>{c.strokeStyle=i?AV.w:AV.m;c.lineWidth=2;c.beginPath();c.moveTo(x,y-7);c.lineTo(x+6,y);c.lineTo(x,y+7);c.lineTo(x-6,y);c.closePath();c.stroke();T(c,n,x+10,y,i?AV.w:AV.m,13,'left',600);});
  // traffic
  if(s.altFt>2000){const tx=cx+90+Math.sin(s.u*40)*20,ty=cy-210;c.strokeStyle=AV.w;c.lineWidth=1.8;c.beginPath();c.moveTo(tx,ty-7);c.lineTo(tx+7,ty);c.lineTo(tx,ty+7);c.lineTo(tx-7,ty);c.closePath();c.stroke();T(c,'+12',tx,ty-16,AV.w,11,'center');T(c,'↓',tx+12,ty,AV.w,13);}
  c.restore();
  // own ship & lubber
  c.fillStyle=AV.y;c.strokeStyle=AV.y;c.lineWidth=3;Ln(c,[[cx,cy-24],[cx,cy+18]],AV.y,3);Ln(c,[[cx-16,cy-6],[cx+16,cy-6]],AV.y,3);Ln(c,[[cx-7,cy+14],[cx+7,cy+14]],AV.y,3);
  Bx(c,cx-30,cy-R-38,60,28,AV.w,2,'#000');T(c,String(Math.round(s.hdg)).padStart(3,'0'),cx,cy-R-24,AV.w,18,'center',600);Ln(c,[[cx,cy-R-10],[cx,cy-R+6]],AV.y,3);
  // data blocks
  T(c,'GS',12,20,AV.w,12);T(c,n0(s.gs),40,20,AV.g,15,'left',600);T(c,'TAS',88,20,AV.w,12);T(c,n0(s.tas),122,20,AV.g,15,'left',600);
  if(s.altFt>500){T(c,'268°/34',12,42,AV.g,13,'left',600);Ln(c,[[90,48],[102,36]],AV.g,2);}
  T(c,wp[0][0],500,18,AV.m,14,'right',600);T(c,n0(wp[0][1])+' NM',500,38,AV.w,13,'right');T(c,'1'+String(4+Math.floor(s.u*6)).padStart(1,'0')+':'+String(Math.floor(s.u*600)%60).padStart(2,'0')+'z',500,58,AV.g,13,'right');
  T(c,s.altFt>800?'WXR  +2.0°':'TERR',12,494,AV.c,12,'left');T(c,'VOR 1  BOS',500,494,AV.g,12,'right');
}

/* ---------------- Engine display (ECAM E/WD or EICAS upper) ---------------- */
function drawEng(c,s,ac){const f=avFam(ac);if(f==='analog')return drawRoundEng(c,s,ac);if(f==='mil')return drawMilEng(c,s,ac);
  bg(c);const e=ac.e,n=ac.nEng,ecam=f==='ecam',tp=e.type==='TP';
  const cols=n,w=n<=2?200:n<=4?118:80,gap=n<=2?24:6,tot=cols*w+(cols-1)*gap,x0=(n<=2?20:12)+w/2,r1=Math.min(70,w*0.42),r2=r1*0.78;
  const main=tp?'TRQ':'N1',unit=tp?'%':'%';
  s.eng.forEach((g,i)=>{const x=x0+i*(w+gap);
    dial(c,x,94,r1,tp?g.trq:g.n1,0,110,104,tp?n1f(g.trq):n1f(g.n1),ecam?AV.g:AV.w,ecam);
    dial(c,x,214,r2,g.egt,0,e.egt*1.1||1000,e.egt||900,n0(g.egt),ecam?AV.g:AV.w,ecam);
    T(c,tp?n0(g.np):n1f(g.n2),x,296,AV.g,n<=2?20:15,'center',600);T(c,n0(g.ff*(ecam?1:2.2046)/10)*10+'',x,326,AV.g,n<=2?18:13,'center',600);});
  const lx=n<=2?x0+(w+gap)/2:12;const labs=[[94,main+' '+unit],[214,tp?'ITT °C':'EGT °C'],[296,tp?'NP RPM':'N2 %'],[326,ecam?'FF KG/H':'FF PPH']];
  if(n<=2)labs.forEach(([y,t])=>T(c,t,lx,y,AV.c,13,'center',500));else{labs.forEach(([y,t])=>T(c,t,500,y-(y<250?r1+8:12),AV.c,11,'right',500));}
  // lower area: memo / flaps / gear / fuel
  Ln(c,[[10,350],[502,350]],'#59606a',1.5);
  const fl=ecam?['0','1','1+F','2','3','FULL'][Math.round(s.flaps*5)]:['UP','1','5','15','20','25','30'][Math.round(s.flaps*6)];
  T(c,ecam?'FLAP':'FLAPS',20,376,AV.c,13);T(c,fl,ecam?74:84,376,s.flaps>0.01?AV.g:AV.w,16,'left',700);
  if(ecam){c.save();c.translate(160,374);Ln(c,[[0,0],[-28,-4]],AV.w,4);Ln(c,[[24,-4],[24+50*Math.max(0.15,s.flaps),8*s.flaps]],AV.g,4);T(c,'S',-36,12,AV.w,12);T(c,'F',80,12,AV.w,12);c.restore();}
  else{Bx(c,170,362,24,44,AV.w,1.5);c.fillStyle=AV.g;c.fillRect(172,364,20,40*s.flaps);}
  const gearT=s.gear>0.98?'DOWN':s.gear<0.02?'UP':'TRANSIT';T(c,'GEAR',20,410,AV.c,13);T(c,gearT,74,410,gearT==='DOWN'?AV.g:gearT==='UP'?AV.w:AV.a,15,'left',700);
  T(c,ecam?'FOB':'FUEL',20,444,AV.c,13);T(c,fmt(Math.round(s.fob*1000/10)*10)+(ecam?' KG':''),74,444,AV.g,16,'left',700);
  T(c,'TAT',20,476,AV.c,12);T(c,(s.tat>0?'+':'')+n0(s.tat)+'°C',62,476,AV.g,13,'left',600);T(c,'SAT',130,476,AV.c,12);T(c,(s.sat>0?'+':'')+n0(s.sat)+'°C',172,476,AV.g,13,'left',600);
  memo(s,ac,ecam).forEach(([t,col],i)=>T(c,t,270,376+i*26,col,14,'left',600));
}
function memo(s,ac,ecam){const u=s.u,M=[];
  if(u<0.03){M.push(['APU AVAIL',AV.g],[s.door>0.5?'DOORS OPEN':'DOORS CLSD',s.door>0.5?AV.a:AV.g],['PARK BRK',AV.g]);}
  else if(u<0.11){M.push([ecam?'T.O MEMO':'TAKEOFF CONFIG',AV.c],['AUTO BRK MAX',AV.g],['SIGNS ON',AV.g],['SPLRS ARM',AV.g]);}
  else if(u<0.19){M.push([ecam?'T.O INHIBIT':'TAKEOFF',AV.m],[s.ias>80?'80 KT':'THR SET',AV.g]);}
  else if(u<0.75){M.push([s.altFt>10000?'SEAT BELTS':'LDG LT',AV.g]);if(u>0.4&&u<0.55)M.push(['ENG ANTI ICE',AV.g]);}
  else if(u<0.9){M.push([ecam?'LDG MEMO':'LANDING',AV.c],['GEAR '+(s.gear>0.98?'DN':'↓'),AV.g],['FLAPS '+(s.flaps>0.95?'FULL':'↓'),AV.g],['SPLRS ARM',AV.g]);if(s.ra<2000&&s.ra>1)M.push([ecam?'LDG INHIBIT':'LAND 3',AV.m]);}
  else M.push(['REV GREEN',s.rev>0.2?AV.g:AV.w],['AUTO BRK',AV.g],['BRAKES '+n0(s.brk)+'°',s.brk>300?AV.a:AV.g]);
  return M.slice(0,4);}
function dial(c,x,y,r,v,mn,mx,red,txt,col,ecam){const a0=(ecam?200:210)*D2R,a1=(ecam?-20:-30)*D2R,ang=t=>a0+(a1-a0)*clamp((t-mn)/(mx-mn),0,1);
  c.lineWidth=3;c.strokeStyle=AV.w;c.beginPath();c.arc(x,y,r,-a0,-ang(red),false);c.stroke();c.strokeStyle=AV.r;c.beginPath();c.arc(x,y,r,-ang(red),-a1,false);c.stroke();
  if(!ecam){c.fillStyle='rgba(255,255,255,.12)';c.beginPath();c.moveTo(x,y);c.arc(x,y,r-2,-a0,-ang(v),false);c.closePath();c.fill();}
  for(let k=0;k<=10;k++){const a=a0+(a1-a0)*k/10;Ln(c,[[x+Math.cos(a)*r,y-Math.sin(a)*r],[x+Math.cos(a)*(r-(k%2?5:9)),y-Math.sin(a)*(r-(k%2?5:9))]],AV.w,1.5);}
  const a=ang(v);Ln(c,[[x+Math.cos(a)*r*0.15,y-Math.sin(a)*r*0.15],[x+Math.cos(a)*(r+4),y-Math.sin(a)*(r+4)]],v>red?AV.r:col===AV.g?AV.g:AV.w,3.5);
  Bx(c,x+4,y-8,r*0.95,26,AV.w,1.5,'#000');T(c,txt,x+4+r*0.48,y+5,v>red?AV.r:col,Math.min(20,r*0.32),'center',600);}

/* ---------------- System synoptics (SD / MFD) ---------------- */
const SYS_PAGES=['HYD','FUEL','ELEC','AIR','WHEEL','DOOR'];
function drawSys(c,s,ac,page){bg(c);const f=avFam(ac),ecam=f==='ecam';
  T(c,{HYD:'HYD',FUEL:'FUEL',ELEC:'ELEC',AIR:ac.flags.has('bleedless')?'ECS · ELECTRIC':'BLEED / AIR',WHEEL:'WHEEL / BRAKES',DOOR:'DOOR / OXY'}[page],16,22,AV.w,18,'left',700);Ln(c,[[16,36],[16+c.measureText({HYD:'HYD',FUEL:'FUEL',ELEC:'ELEC',AIR:ac.flags.has('bleedless')?'ECS · ELECTRIC':'BLEED / AIR',WHEEL:'WHEEL / BRAKES',DOOR:'DOOR / OXY'}[page]).width,36]],AV.w,2);
  ({HYD:sysHyd,FUEL:sysFuel,ELEC:sysElec,AIR:sysAir,WHEEL:sysWheel,DOOR:sysDoor})[page](c,s,ac,ecam);
  // footer strip
  Ln(c,[[0,470],[512,470]],'#59606a',1.5);T(c,'TAT',14,490,AV.c,12);T(c,(s.tat>0?'+':'')+n0(s.tat),46,490,AV.g,13,'left',600);T(c,'SAT',100,490,AV.c,12);T(c,(s.sat>0?'+':'')+n0(s.sat),132,490,AV.g,13,'left',600);
  T(c,`${String(14+Math.floor(s.u*3)).padStart(2,'0')} H ${String(Math.floor(s.u*600)%60).padStart(2,'0')}`,256,490,AV.g,13,'center',600);T(c,'GW',380,490,AV.c,12);T(c,fmt(Math.round((ac.mtow*0.92-s.fu)*10)/10,1)+' T',412,490,AV.g,13,'left',600);}
function sysHyd(c,s,ac,ecam){const nm=ac.deck==='fighter'?['FLT A','FLT B','UTIL']:ecam?['GREEN','BLUE','YELLOW']:ac.nEng>=4&&ac.mfr==='Boeing'?['SYS 1','SYS 2','SYS 3','SYS 4']:['L','C','R'];
  const n=nm.length,nom=s.hydNom||3000,run=s.engRun;nm.forEach((name,i)=>{const x=80+i*(352/(n-1||1));const pres=run?nom-(i*15)+Math.sin(s.u*80+i)*12:(i===n-1&&!run?nom*0.94:0);const ok=pres>1450,col=ok?AV.g:AV.a;
    T(c,name,x,64,col,15,'center',700);T(c,n0(Math.round(pres/50)*50),x,90,col,18,'center',700);
    Ln(c,[[x,104],[x,340]],col,3);c.fillStyle=col;c.beginPath();c.moveTo(x,100);c.lineTo(x-7,112);c.lineTo(x+7,112);c.closePath();c.fill();
    const pumps=ecam?[[i===1?'ELEC':'ENG '+(i===2?2:1),i===1?s.engRun:run],[i===1?'RAT':i===2?'ELEC':'',i===2]]:[['EDP',run],['ACMP',run||i===n-1]];
    pumps.forEach(([pn,on],k)=>{if(!pn)return;const yy=160+k*80;Bx(c,x-30,yy,60,36,on?AV.g:AV.a,2,'#000');T(c,pn,x,yy+18,on?AV.g:AV.a,12,'center',600);if(on)Ln(c,[[x-18,yy+30],[x+18,yy+6]],AV.g,2);});
    Bx(c,x-24,360,48,90,AV.w,2);const lv=0.55+0.3*Math.sin(i*1.3);c.fillStyle=col;c.fillRect(x-20,446-82*lv,40,82*lv);T(c,'RSVR',x,458,AV.w,10,'center');});
  if(ecam){const y=318;Ln(c,[[110,y],[402,y]],s.engRun?AV.g:AV.w,2,[6,5]);Bx(c,232,y-16,48,32,s.engRun?AV.g:AV.w,2,'#000');T(c,'PTU',256,y,s.engRun?AV.g:AV.w,12,'center',600);}
  T(c,'PSI',486,90,AV.c,12,'right');}
function sysFuel(c,s,ac){const F=fuseDef(ac),W=wingDef(ac,F),EP=engPlan(ac,F,W),L=ac.L,S2=ac.S;const sc=Math.min(470/S2,330/L)*0.92,ox=256,oy=96-(-W.rootLE+L/2)*0;
  const P=(x,z)=>[ox+z*sc,72+(L/2-x)*sc];
  const pts=sg=>{const le=W.secs.map(q=>P(W.rootLE-q.dx,sg*q.z)),te=W.secs.slice().reverse().map(q=>P(W.rootLE-q.dx-q.c,sg*q.z));return le.concat(te);};
  const poly=(arr,col,fill)=>{c.beginPath();arr.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();if(fill){c.fillStyle=fill;c.fill();}c.strokeStyle=col;c.lineWidth=2;c.stroke();};
  // fuselage
  if(!F.fw){const xs=range(25).map(i=>-L/2+L*i/24);poly([...xs.map(x=>P(x,-F.at(x).rz)),...xs.slice().reverse().map(x=>P(x,F.at(x).rz))],'#59606a');}
  [1,-1].forEach(sg=>poly(pts(sg),AV.w));
  const frac=s.fob/s.fuelCap,tanks=[['CTR',0,0.35,0.22],['INR',0.08,0.55,0.32],['OUTR',0.58,0.85,0.09]];const trim=['a333','a339','a346','a359','a35k','a388','conc','md11','b744','b748'].includes(ac.id);
  const z0=F.fw?4.4:F.rz;
  tanks.forEach(([nm,a,b,cap])=>{if(nm==='CTR'){const q=s.fob*cap*clamp(frac*1.3-0.25,0,1)/Math.max(frac,0.01);const x0=W.rootLE-W.chord(0)*0.2,x1=W.rootLE-W.chord(0)*0.75;poly([P(x0,-z0),P(x0,z0),P(x1,z0),P(x1,-z0)],AV.w,'rgba(53,224,122,'+(0.12+0.3*clamp(frac*1.3-0.25,0,1))+')');T(c,fmt(Math.round(Math.max(q,0)*1000/10)*10),...P((x0+x1)/2,0),AV.g,14,'center',700);return;}
    [1,-1].forEach(sg=>{const za=Math.max(z0,a*W.zMax),zb=b*W.zMax;const q=(s.fob*cap/2)*(nm==='OUTR'?clamp(frac*2,0,1):1)/1;const ar=[P(W.leX(za)-W.chord(za)*0.15,sg*za),P(W.leX(zb)-W.chord(zb)*0.15,sg*zb),P(W.leX(zb)-W.chord(zb)*0.65,sg*zb),P(W.leX(za)-W.chord(za)*0.65,sg*za)];poly(ar,AV.w,'rgba(53,224,122,'+(0.12+0.3*frac)+')');
      const m=P(W.leX((za+zb)/2)-W.chord((za+zb)/2)*0.4,sg*(za+zb)/2);T(c,fmt(Math.round(q*1000/10)*10),m[0],m[1],AV.g,13,'center',700);});});
  if(trim){const x=-L/2+L*0.06;const [tx,ty]=P(x,0);Bx(c,tx-30,ty-12,60,24,AV.w,2,'rgba(53,224,122,.2)');T(c,fmt(Math.round(s.fob*60)),tx,ty,AV.g,12,'center',600);T(c,'TRIM',tx,ty+22,AV.c,10,'center');}
  EP.list.forEach((p,i)=>{const [x,y]=P(p.x,p.z);c.fillStyle=s.engRun?AV.g:AV.w;c.beginPath();c.arc(x,y,6,0,TAU);c.fill();});
  T(c,'FOB',360,440,AV.c,13);T(c,fmt(Math.round(s.fob*1000/10)*10)+' KG',400,440,AV.g,16,'left',700);T(c,'F.USED',16,440,AV.c,13);T(c,fmt(Math.round(s.fu*1000/10)*10),84,440,AV.g,15,'left',700);}
function sysElec(c,s,ac,ecam){const n=Math.min(ac.nEng,4),bl=ac.flags.has('bleedless'),run=s.engRun,apuOn=s.apu>0.5&&!run;
  const gens=bl?range(n*2).map(i=>['VFSG '+(i<2?'L':'R')+(i%2+1),run]):range(n).map(i=>[(ecam?'GEN ':'IDG ')+(i+1),run]);
  const gw=Math.min(84,440/gens.length-8);gens.forEach(([nm,on],i)=>{const x=36+i*(gw+8);Bx(c,x,330,gw,88,on?AV.g:AV.w,2,'#000');T(c,nm,x+gw/2,346,on?AV.g:AV.w,11,'center',700);
    if(on){T(c,n0(28+Math.sin(s.u*40+i)*3)+' %',x+gw/2,368,AV.g,12,'center',600);T(c,bl?'235 V':'115 V',x+gw/2,386,AV.g,12,'center',600);T(c,bl?'VF':'400 HZ',x+gw/2,404,AV.g,11,'center',600);}else T(c,'OFF',x+gw/2,378,AV.w,12,'center',600);
    Ln(c,[[x+gw/2,330],[x+gw/2,(i<gens.length/2)?210:210]],on?AV.g:AV.w,2);});
  const buses=bl?['235 VAC L','235 VAC R']:['AC 1','AC 2'];[0,1].forEach(i=>{const x=60+i*260;const on=run||apuOn;Bx(c,x,190,132,32,on?AV.g:AV.a,2,'#000');T(c,buses[i],x+66,206,on?AV.g:AV.a,13,'center',700);
    Bx(c,x+10,110,112,30,on?AV.g:AV.a,2,'#000');T(c,i?'DC 2':'DC 1',x+66,125,on?AV.g:AV.a,13,'center',700);Ln(c,[[x+66,140],[x+66,190]],on?AV.g:AV.w,2);});
  Bx(c,222,60,68,30,AV.g,2,'#000');T(c,ecam?'DC BAT':'HOT BAT',256,75,AV.g,12,'center',700);
  [[60,'BAT 1'],[392,'BAT 2']].forEach(([x,nm])=>{Bx(c,x,56,64,40,AV.g,2,'#000');T(c,nm,x+32,68,AV.w,11,'center',600);T(c,(run?'28.':'26.')+(5+Math.round(Math.sin(s.u*20)*2))+' V',x+32,86,AV.g,11,'center',600);});
  const ax=220,ay=258;Bx(c,ax,ay,72,54,apuOn?AV.g:AV.w,2,'#000');T(c,bl?'ASG L/R':'APU GEN',ax+36,ay+16,apuOn?AV.g:AV.w,11,'center',700);T(c,apuOn?'115 V':'---',ax+36,ay+36,apuOn?AV.g:AV.w,12,'center',600);if(apuOn)Ln(c,[[ax+36,ay],[ax+36,222]],AV.g,2);
  T(c,'EXT PWR',256,446,s.u<0.03?AV.g:'#6b7280',12,'center',600);}
function sysAir(c,s,ac){const n=Math.min(ac.nEng,4),bl=ac.flags.has('bleedless'),run=s.engRun,packs=ac.id==='b744'||ac.id==='b748'||ac.deck==='double'?3:2;
  // cabin zones
  Bx(c,70,58,372,64,AV.w,2);['CKPT','FWD','MID','AFT'].forEach((z,i)=>{const x=70+46+i*93;T(c,z,x,74,AV.w,11,'center',600);T(c,n0(22+Math.sin(s.u*30+i)*1.3)+'°',x,100,AV.g,15,'center',700);});
  range(packs).forEach(i=>{const x=90+i*(332/(packs-1));const on=run||s.apu>0.5;Bx(c,x-40,150,80,64,on?AV.g:AV.w,2,'#000');T(c,'PACK '+(i+1),x,166,on?AV.g:AV.w,12,'center',700);T(c,on?n0(4+Math.sin(s.u*40+i)*3)+'°':'XX',x,188,on?AV.g:AV.a,13,'center',600);T(c,on?'FLOW '+n0(on?92+i:0):'',x,204,AV.g,10,'center');Ln(c,[[x,150],[x,122]],on?AV.g:AV.w,2);
    c.fillStyle=on?AV.g:AV.w;c.beginPath();c.moveTo(x,124);c.lineTo(x-6,134);c.lineTo(x+6,134);c.closePath();c.fill();});
  Ln(c,[[60,262],[452,262]],run||s.apu>0.5?AV.g:AV.w,2.5);T(c,bl?'ELECTRIC CABIN AIR COMPRESSORS':'X BLEED',256,248,AV.c,11,'center',600);
  range(n).forEach(i=>{const x=80+i*(352/Math.max(n-1,1));if(n===1)return;const on=run;if(bl){Bx(c,x-32,288,64,48,on?AV.g:AV.w,2,'#000');T(c,'CAC '+(i+1),x,304,on?AV.g:AV.w,11,'center',700);T(c,on?n0(48+i)+' PSI':'--',x,324,on?AV.g:AV.w,11,'center',600);}
    else{T(c,on?n0(44+Math.sin(s.u*50+i)*4)+' PSI':'XX',x,300,on?AV.g:AV.a,13,'center',700);T(c,on?n0(190+i*3)+'°':'XX',x,320,on?AV.g:AV.a,13,'center',600);c.strokeStyle=on?AV.g:AV.w;c.lineWidth=2;c.beginPath();c.arc(x,350,12,0,TAU);c.stroke();Ln(c,on?[[x,338],[x,362]]:[[x-12,350],[x+12,350]],on?AV.g:AV.w,2);}
    Ln(c,[[x,262],[x,288]],on?AV.g:AV.w,2);T(c,'ENG '+(i+1),x,392,AV.w,12,'center',600);});
  T(c,'CAB ALT',30,428,AV.c,12);T(c,fmt(Math.round(s.cabAlt/50)*50)+' FT',96,428,AV.g,14,'left',700);T(c,'ΔP',230,428,AV.c,12);T(c,n1f(s.dp)+' PSI',256,428,AV.g,14,'left',700);T(c,'V/S',360,428,AV.c,12);T(c,(s.cabVs>=0?'+':'')+n0(Math.round(s.cabVs/50)*50),396,428,AV.g,14,'left',700);
  T(c,'APU',30,452,AV.c,12);T(c,s.apu>0.5?'AVAIL':'OFF',70,452,s.apu>0.5?AV.g:AV.w,13,'left',700);}
function sysWheel(c,s,ac){const G=ac.gear,mains=G.main,ctr=G.center,cx=256;const dn=s.gear>0.98,up=s.gear<0.02;
  const tri=(x,y)=>{c.fillStyle=dn?AV.g:up?'#333':AV.r;c.beginPath();c.moveTo(x-12,y);c.lineTo(x+12,y);c.lineTo(x,y+16);c.closePath();c.fill();if(!dn&&!up){c.strokeStyle=AV.r;c.lineWidth=2;c.stroke();}};
  const wheelBox=(x,y,i)=>{const t=Math.max(20,s.brk+Math.sin(i*2.1)*s.brk*0.12);const hot=t>300;Bx(c,x-20,y,40,54,hot?AV.a:AV.w,2,'#000');T(c,n0(t),x,y+18,hot?AV.a:AV.g,13,'center',700);T(c,n0(clamp(40+6.5*ac.mtow*0.93/Math.max(1,mains.reduce((a,b)=>a+b,0)*2),30,230)),x,y+38,AV.g,10,'center',600);if(hot)T(c,'HOT',x,y-10,AV.a,10,'center',700);};
  const nose=G.nose||1;T(c,'NOSE',cx,70,AV.w,11,'center',600);tri(cx,80);range(Math.min(nose,4)).forEach(k=>{const x=cx+(k-(Math.min(nose,4)-1)/2)*44;Bx(c,x-16,104,32,30,AV.w,1.5,'#000');T(c,'—',x,119,AV.g,11,'center');});
  let i=0;const legs=mains.length;mains.forEach((nw,li)=>{const rows=nw<=2?1:nw===3?3:Math.ceil(nw/2),colsW=nw===3||nw===1?1:2;[1,-1].forEach(sg=>{const gx=cx+sg*(legs>2?70+li*58:110),gy=170;T(c,(sg>0?'R':'L')+(legs>1?' '+(li+1):''),gx,gy-12,AV.w,11,'center',600);tri(gx,gy-2);
    range(rows).forEach(r=>range(colsW).forEach(k=>{const x=gx+(colsW===2?(k?1:-1)*(legs>2?14:24):0),y=gy+24+r*62;if(legs>2){Bx(c,x-12,y,24,52,s.brk>300?AV.a:AV.w,1.5,'#000');T(c,n0(Math.max(20,s.brk+Math.sin(i*2.1)*30)),x,y+26,s.brk>300?AV.a:AV.g,9,'center',600);}else wheelBox(x,y,i);i++;}));});});
  ctr.forEach((nw,k)=>{const y=190;T(c,'CTR',cx,y-12,AV.w,11,'center');range(Math.ceil(nw/2)).forEach(r=>[1,-1].forEach(sg=>{Bx(c,cx+sg*18-12,y+12+r*60,24,48,AV.w,1.5,'#000');T(c,n0(Math.max(20,s.brk*0.9)),cx+sg*18,y+36+r*60,AV.g,9,'center',600);}));});
  T(c,'AUTO BRK',20,440,AV.c,12);T(c,s.u<0.2?'RTO':s.u>0.8?'MED':'OFF',100,440,AV.g,13,'left',700);T(c,'°C / PSI',492,440,AV.c,11,'right');T(c,'PARK BRK',20,458,AV.c,11);T(c,s.u<0.03||s.u>0.99?'SET':'OFF',100,458,s.u<0.03?AV.a:AV.w,12,'left',700);}
function sysDoor(c,s,ac){const F=fuseDef(ac),L=ac.L;if(F.fw||ac.deck==='fighter'){T(c,'CANOPY',256,200,s.door>0.5?AV.a:AV.g,22,'center',700);T(c,s.door>0.5?'UNLOCKED':'CLOSED · LOCKED',256,236,s.door>0.5?AV.a:AV.g,14,'center',600);T(c,'OXY  '+n0(1800)+' PSI',256,300,AV.g,14,'center',600);return;}
  const sc=360/L,ox=256,top=70,P=(x,z)=>[ox+z*sc*1.9,top+(L/2-x)*sc];const xs=range(30).map(i=>-L/2+L*i/29);
  c.beginPath();xs.forEach((x,i)=>{const p=P(x,-F.at(x).rz);i?c.lineTo(...p):c.moveTo(...p);});xs.slice().reverse().forEach(x=>c.lineTo(...P(x,F.at(x).rz)));c.closePath();c.strokeStyle=AV.w;c.lineWidth=2;c.stroke();
  const xa=L/2-F.nose*1.38,xb=-L/2+F.tail*1.0,doors=[xa+0.6,-L/2+F.tail*0.98+0.4];if(L>45)doors.push(lerp(xa,xb,0.5));if(L>62)doors.push(lerp(xa,xb,0.25),lerp(xa,xb,0.75));doors.sort((a,b)=>b-a);
  doors.forEach((x,i)=>[1,-1].forEach(sg=>{const open=s.door>0.5&&i===0&&sg<0;const [px,py]=P(x,sg*F.at(x).rz);Bx(c,px-(sg>0?0:12),py-10,12,20,open?AV.a:AV.g,2,open?'rgba(255,176,0,.3)':'#000');if(sg<0)T(c,(sg<0?'L':'R')+(i+1),px-20,py,open?AV.a:AV.g,11,'right',600);}));
  [['FWD CARGO',L/2-F.nose*2.1],['AFT CARGO',-L/2+F.tail*1.5]].forEach(([nm,x])=>{const open=s.door>0.5;const [px,py]=P(x,F.at(x).rz);Bx(c,px-2,py-14,14,28,open?AV.a:AV.g,2,'#000');T(c,nm,px+20,py,open?AV.a:AV.g,11,'left',600);});
  T(c,'CAB ALT',30,440,AV.c,12);T(c,fmt(Math.round(s.cabAlt/50)*50)+' FT',96,440,AV.g,14,'left',700);T(c,'OXY',360,440,AV.c,12);T(c,'1850 PSI',396,440,AV.g,14,'left',700);}

/* ---------------- Overhead panel (1024 × 600) ---------------- */
function drawOVH(c,s,ac){const f=avFam(ac),ecam=f==='ecam',analog=f==='analog',mil=f==='mil';
  c.fillStyle=mil?'#2c3238':analog?'#2b3035':ecam?'#4a5662':'#5b6470';c.fillRect(0,0,1024,600);
  // brushed noise
  c.globalAlpha=0.06;for(let y=0;y<600;y+=3){c.fillStyle=y%6?'#fff':'#000';c.fillRect(0,y,1024,1);}c.globalAlpha=1;
  const run=s.engRun,apu=s.apu>0.5;
  const blocks=mil?[['UFC',[['AP',s.ap],['ALT HLD',s.ap],['IFF',1],['TCN',1],['ILS',s.u>0.8],['D/L',1],['BCN',0],['ON/OFF',1]]],['MASTER ARM',[['ARM',0],['SAFE',1]]],['LIGHTS',[['FORM',s.lt>0],['POS',1],['ANTI COL',run]]],['FUEL',[['BOOST',run],['TANK INERT',1],['DUMP',0]]]]
   :[['ADIRS',[['IR 1',1],['IR 3',1],['IR 2',1]]],['ELEC',[['BAT 1',1],['BAT 2',1],['GEN 1',run],['APU GEN',apu],['EXT PWR',s.u<0.03],['GEN 2',run]]],['FUEL',[['L TK 1',run],['L TK 2',run],['CTR TK',run&&s.u<0.6],['R TK 1',run],['R TK 2',run],['X FEED',0]]],['HYD',[['ENG 1',run],['ELEC',1],['ENG 2',run],['PTU',run]]],
     ['AIR COND',[['PACK 1',run||apu],['PACK 2',run||apu],['APU BLEED',apu&&!run],['HOT AIR',1]]],['ANTI ICE',[['WING',s.u>0.4&&s.u<0.55],['ENG 1',s.u>0.4&&s.u<0.55],['ENG 2',s.u>0.4&&s.u<0.55],['PROBE',run]]],['EXT LT',[['STROBE',s.lt>1.5],['BEACON',run||s.u>0.02],['WING',0],['NAV',1],['LAND',s.lt>1.5],['TAXI',s.lt>0.5&&s.lt<1.6]]],['CABIN PRESS',[['MODE SEL',0],['DITCH',0]]],
     ['APU',[['MASTER',apu||s.u<0.04],['START',apu],['FIRE',0]]],['ENG START',[['MODE',s.u>0.025&&s.u<0.06],['ENG 1',run],['ENG 2',run]]],['SIGNS',[['BELTS',s.u>0.03&&(s.altFt<10000||s.u>0.74)],['NO SMOKE',1],['EMER EXIT',0]]],['WIPERS',[['L',0],['R',0]]]];
  const cols=4,bw=236,bh=mil?250:178,gx=16,gy=14;blocks.forEach(([nm,btns],i)=>{const col=i%cols,row=Math.floor(i/cols),x=gx+col*(bw+16),y=gy+row*(bh+14);
    c.strokeStyle='rgba(255,255,255,.75)';c.lineWidth=2;RR(c,x,y,bw,bh,10);c.stroke();c.fillStyle='rgba(0,0,0,.16)';c.fill();
    c.fillStyle=ecam?'#4a5662':'#5b6470';T(c,nm,x+bw/2,y+16,'#f2f2f2',15,'center',700,SANS);
    const per=btns.length>4?3:btns.length,bs=btns.length>4?(mil?50:40):Math.min(52,(bw-24)/per-12);btns.forEach(([bn,on],k)=>{const cx=x+16+(k%per)*((bw-32)/per)+((bw-32)/per-bs)/2,cy=y+36+Math.floor(k/per)*(bs+27);
      if(analog||(!ecam&&!mil&&k%2)){// toggle switch
        c.fillStyle='#1b1e22';c.beginPath();c.arc(cx+bs/2,cy+bs/2,bs*0.34,0,TAU);c.fill();c.strokeStyle='#cfd5db';c.lineWidth=2;c.stroke();
        c.save();c.translate(cx+bs/2,cy+bs/2);c.rotate(on?-0.5:0.5);const gr=c.createLinearGradient(-5,0,5,0);gr.addColorStop(0,'#f4f6f8');gr.addColorStop(1,'#9aa3ab');c.fillStyle=gr;RR(c,-5,-bs*0.5,10,bs*0.5,4);c.fill();c.restore();}
      else{c.fillStyle='#101317';RR(c,cx,cy,bs,bs,5);c.fill();c.strokeStyle='#9aa3ab';c.lineWidth=1.5;c.stroke();
        const lit=on,top=bn==='FIRE'?'FIRE':lit&&(bn.includes('APU')||bn==='START')?'AVAIL':'',bot=ecam?(lit?(bn.match(/LT|STROBE|BEACON|LAND|TAXI|NAV|WING|BELTS|SMOKE/)?'ON':''):'OFF'):lit?'ON':'OFF';
        if(top)T(c,top,cx+bs/2,cy+bs*0.3,top==='FIRE'?'#ff5a4a':AV.g,11,'center',700);
        if(bot)T(c,bot,cx+bs/2,cy+bs*0.72,bot==='ON'?AV.c:bot==='OFF'?(ecam?'#f2f2f2':AV.a):AV.w,11,'center',700);
        if(ecam&&!lit&&bot!=='OFF'){}
        if(!ecam&&!lit&&bn.match(/TK|ENG|ELEC/)){T(c,'LOW',cx+bs/2,cy+bs*0.3,AV.a,10,'center',700);}}
      T(c,bn,cx+bs/2,cy+bs+12,'#f2f2f2',11,'center',600,SANS);});});
}
/* ---------------- Glareshield FCU / MCP (1024 × 200) ---------------- */
function drawMCP(c,s,ac){const f=avFam(ac),ecam=f==='ecam',mil=f==='mil',analog=f==='analog';
  const gr=c.createLinearGradient(0,0,0,200);gr.addColorStop(0,'#2d3338');gr.addColorStop(1,'#1c2024');c.fillStyle=gr;c.fillRect(0,0,1024,200);
  if(mil){T(c,'UP-FRONT CONTROL',512,24,'#cfd5db',14,'center',700,SANS);Bx(c,312,46,400,70,'#56606a',2,'#0a1a10');T(c,'ALT '+fmt(Math.round(s.altFt/10)*10)+'  HDG '+String(Math.round(s.hdg)).padStart(3,'0')+'  '+(s.ap?'A/P':'MAN'),512,81,AV.hud,22,'center',600);
    range(10).forEach(k=>{const x=180+k*68;c.fillStyle='#111';RR(c,x,136,54,40,6);c.fill();T(c,['1','2','3','4','5','6','7','8','9','0'][k],x+27,156,'#e5e5e5',16,'center',700);});return;}
  if(analog){T(c,'AUTOPILOT',512,24,'#cfd5db',14,'center',700,SANS);['OFF','HDG','NAV','ALT'].forEach((m,k)=>{const x=290+k*150,on=s.ap&&(k===1||k===3)||!s.ap&&k===0;c.fillStyle='#111';c.beginPath();c.arc(x,110,34,0,TAU);c.fill();c.strokeStyle='#cfd5db';c.lineWidth=2;c.stroke();T(c,m,x,164,'#e5e5e5',14,'center',700,SANS);if(on){c.fillStyle=AV.a;c.beginPath();c.arc(x,78,6,0,TAU);c.fill();}
      c.save();c.translate(x,110);c.rotate(k*0.6);Ln(c,[[0,0],[0,-26]],'#e5e5e5',4);c.restore();});return;}
  const win=[[ecam?'SPD':'IAS/MACH',s.selSpd>1?n0(s.selSpd):'---',112],[ecam?'HDG':'HDG',String(Math.round(s.u<0.12?274:s.hdg)).padStart(3,'0'),318],[ecam?'ALT':'ALTITUDE',fmt(s.selAlt).replace(',',''),540],[ecam?'V/S':'V/S',(s.vs>=0?'+':'')+String(Math.round(s.vs/100)).padStart(2,'0')+'00',758]];
  win.forEach(([lab,val,x])=>{T(c,lab,x,22,'#e8e8e8',13,'center',700,SANS);Bx(c,x-78,38,156,52,'#5d666f',2,'#050505');T(c,val,x,65,ecam?'#f2f2f2':'#ffb547',30,'center',500,'"IBM Plex Mono",monospace');
    c.fillStyle='#16191c';c.beginPath();c.arc(x,144,32,0,TAU);c.fill();const kg=c.createRadialGradient(x-8,136,4,x,144,32);kg.addColorStop(0,'#59636c');kg.addColorStop(1,'#15181b');c.fillStyle=kg;c.beginPath();c.arc(x,144,28,0,TAU);c.fill();
    for(let k=0;k<24;k++){const a=k/24*TAU;Ln(c,[[x+Math.cos(a)*24,144+Math.sin(a)*24],[x+Math.cos(a)*28,144+Math.sin(a)*28]],'#2a2f34',2);}});
  Ln(c,[[870,24],[870,176]],'#3b4248',1.5);
  const btns=ecam?[['AP1',s.ap],['AP2',s.ap&&s.u>0.8],['A/THR',s.at],['LOC',s.u>0.8&&s.u<0.9],['APPR',s.u>0.8&&s.u<0.9],['EXPED',0]]:[['A/T ARM',s.at],['LNAV',s.u>0.15&&s.u<0.8],['VNAV',s.u>0.15&&s.u<0.8],['HDG SEL',0],['APP',s.u>0.8&&s.u<0.9],['CMD A',s.ap]];
  btns.forEach(([nm,on],k)=>{const bx=908+(k%3)*46,y=36+Math.floor(k/3)*70;c.fillStyle='#121417';RR(c,bx-21,y,42,48,5);c.fill();c.strokeStyle='#808a94';c.lineWidth=1.2;c.stroke();c.fillStyle=on?AV.g:'#26302a';c.fillRect(bx-12,y+7,24,4);T(c,nm,bx,y+32,'#e8e8e8',nm.length>5?8.5:10,'center',700,SANS);});}

/* ---------------- Analog family ---------------- */
function bezel(c,x,y,r){const g=c.createRadialGradient(x-r*0.3,y-r*0.3,r*0.2,x,y,r*1.12);g.addColorStop(0,'#5d646b');g.addColorStop(1,'#15181b');c.fillStyle=g;c.beginPath();c.arc(x,y,r*1.12,0,TAU);c.fill();c.fillStyle='#0b0c0d';c.beginPath();c.arc(x,y,r,0,TAU);c.fill();
  [[-0.78,-0.78],[0.78,-0.78],[-0.78,0.78],[0.78,0.78]].forEach(([a,b])=>{c.fillStyle='#2a2e32';c.beginPath();c.arc(x+a*r*1.18,y+b*r*1.18,r*0.07,0,TAU);c.fill();});}
function needle(c,x,y,a,len,col='#f4f4f4',w=4){c.save();c.translate(x,y);c.rotate(a);c.fillStyle=col;c.beginPath();c.moveTo(-w/2,len*0.15);c.lineTo(0,-len);c.lineTo(w/2,len*0.15);c.closePath();c.fill();c.restore();c.fillStyle='#222';c.beginPath();c.arc(x,y,w*1.4,0,TAU);c.fill();}
function roundGauge(c,x,y,r,v,mn,mx,lab,unit,ticks=10,red){bezel(c,x,y,r);const a0=-225*D2R,a1=45*D2R,ang=t=>a0+(a1-a0)*clamp((t-mn)/(mx-mn),0,1)+Math.PI/2;
  if(red!=null){c.strokeStyle=AV.r;c.lineWidth=r*0.08;c.beginPath();c.arc(x,y,r*0.86,ang(red)-Math.PI/2,a1,false);c.stroke();c.strokeStyle=AV.g;c.beginPath();c.arc(x,y,r*0.86,ang(mn+(red-mn)*0.25)-Math.PI/2,ang(red*0.92)-Math.PI/2,false);c.stroke();}
  for(let k=0;k<=ticks*2;k++){const a=a0+(a1-a0)*k/(ticks*2);Ln(c,[[x+Math.cos(a)*r*0.92,y+Math.sin(a)*r*0.92],[x+Math.cos(a)*r*(k%2?0.84:0.76),y+Math.sin(a)*r*(k%2?0.84:0.76)]],'#eee',k%2?1.2:2);
    if(k%2===0&&r>40)T(c,String(Math.round((mn+(mx-mn)*k/(ticks*2))/(mx>=1000?100:1))),x+Math.cos(a)*r*0.6,y+Math.sin(a)*r*0.6,'#eee',Math.max(9,r*0.15),'center',600);}
  T(c,lab,x,y+r*0.32,'#eee',Math.max(9,r*0.16),'center',700,SANS);if(unit)T(c,unit,x,y+r*0.5,'#aaa',Math.max(8,r*0.12),'center',500);needle(c,x,y,ang(v),r*0.82,'#f4f4f4',Math.max(3,r*0.07));}
function drawADI(c,s,ac){bg(c,512,512,'#181b1e');const ga=ac.deck==='ga';
  // six-pack: ASI, AI (big), ALT / TC, HI, VSI
  roundGauge(c,96,140,78,s.ias,0,ga?200:400,'AIRSPEED','KNOTS',ga?10:8,ga?163:ac.mach>1?400:360);
  bezel(c,256,140,80);c.save();c.beginPath();c.arc(256,140,72,0,TAU);c.clip();c.translate(256,140);c.rotate(-s.bank*D2R);c.translate(0,s.pitch*3);c.fillStyle='#3a8ee6';c.fillRect(-120,-200,240,200);c.fillStyle='#8a5628';c.fillRect(-120,0,240,200);Ln(c,[[-120,0],[120,0]],'#fff',2.5);[-10,-5,5,10].forEach(p=>Ln(c,[[-(p%10?12:22),-p*3],[(p%10?12:22),-p*3]],'#fff',2));c.restore();
  Ln(c,[[206,140],[236,140],[246,150],[256,140],[266,150],[276,140],[306,140]],AV.a,4);c.fillStyle=AV.a;c.beginPath();c.arc(256,140,4,0,TAU);c.fill();
  roundGauge(c,416,140,78,(s.altFt%1000),0,1000,'ALT',fmt(Math.round(s.altFt/100)*100)+' FT',10);needle(c,416,140,(-225+270*((s.altFt%10000)/10000))*D2R+Math.PI/2,46,'#f4f4f4',7);
  bezel(c,96,360,78);T(c,'TURN COORDINATOR',96,412,'#eee',10,'center',700,SANS);c.save();c.translate(96,354);c.rotate(s.bank*D2R*0.8);Ln(c,[[-48,0],[48,0]],'#f4f4f4',5);c.fillStyle='#f4f4f4';c.beginPath();c.arc(0,0,9,0,TAU);c.fill();c.restore();Bx(c,58,384,76,14,'#888',1.5,'#e8e2c0');c.fillStyle='#111';c.beginPath();c.arc(96+s.bank*0.3,391,6,0,TAU);c.fill();
  bezel(c,256,360,80);c.save();c.translate(256,360);c.rotate(-s.hdg*D2R);for(let d=0;d<360;d+=5){c.save();c.rotate(d*D2R);Ln(c,[[0,-72],[0,d%10?-66:-60]],'#eee',d%30?1.5:2.5);if(d%30===0)T(c,['N','3','6','E','12','15','S','21','24','W','30','33'][d/30],0,-48,'#eee',13,'center',700);c.restore();}c.restore();
  c.fillStyle=AV.a;c.beginPath();c.moveTo(256,302);c.lineTo(250,314);c.lineTo(262,314);c.closePath();c.fill();Ln(c,[[256,340],[256,384]],AV.a,3);Ln(c,[[236,356],[276,356]],AV.a,3);
  roundGauge(c,416,360,78,clamp(s.vs/1000,-6,6),-6,6,'VERT SPEED','×1000 FPM',6);
  T(c,ac.name.replace(ac.mfr+' ',''),256,470,'#9aa3ab',14,'center',600,SANS);}
function drawHSI(c,s,ac){bg(c,512,512,'#181b1e');bezel(c,256,250,190);c.save();c.translate(256,250);c.rotate(-s.hdg*D2R);for(let d=0;d<360;d+=5){c.save();c.rotate(d*D2R);Ln(c,[[0,-180],[0,d%10?-170:-160]],'#eee',d%30?2:3);if(d%30===0)T(c,['N','3','6','E','12','15','S','21','24','W','30','33'][d/30],0,-138,'#eee',22,'center',700);c.restore();}
  c.rotate(282*D2R);Ln(c,[[0,-120],[0,-60]],AV.m,6);Ln(c,[[0,60],[0,120]],AV.m,6);Ln(c,[[s.loc*80,-55],[s.loc*80,55]],AV.m,6);c.fillStyle=AV.m;c.beginPath();c.moveTo(0,-132);c.lineTo(-12,-110);c.lineTo(12,-110);c.closePath();c.fill();c.restore();
  c.fillStyle=AV.a;c.beginPath();c.moveTo(256,52);c.lineTo(246,70);c.lineTo(266,70);c.closePath();c.fill();Ln(c,[[256,220],[256,290]],AV.a,4);Ln(c,[[216,246],[296,246]],AV.a,4);Ln(c,[[240,282],[272,282]],AV.a,4);
  T(c,'HSI · VOR 1',30,486,'#9aa3ab',13,'left',600,SANS);T(c,'DME '+n1f(Math.max(0,38-(s.u*900)%38)),482,486,AV.a,15,'right',700);}
function drawRoundEng(c,s,ac){bg(c,512,512,'#181b1e');const n=ac.nEng,e=ac.e,ps=e.type==='PS';const rows=ps?[['RPM','×100',g=>g.rpm,0,e.n1*1.15,e.n1],['MAN PRESS','IN HG',g=>g.mp,10,35,30],['EGT','°C',g=>g.egt,0,900,null],['FUEL FLOW','GPH',g=>g.ff/2.7,0,ps&&ac.id==='c172'?20:120,null]]:[['N1','%',g=>g.n1,0,110,104],['EGT','°C',g=>g.egt,0,(e.egt||700)*1.1,e.egt],['N2','%',g=>g.n2,0,110,105],['FUEL FLOW','×1000 PPH',g=>g.ff*2.2/1000,0,Math.max(4,fuelFlow(e)*2.4/1000),null]];
  const cols=Math.max(n,2),r=Math.min(52,230/cols/1.2),dx=(512-24)/cols;rows.forEach(([lab,unit,fn,mn,mx,red],ri)=>{range(n).forEach(i=>{const x=12+dx*(i+0.5)+(n===1?dx/2:0),y=62+ri*118;roundGauge(c,x,y,r,fn(s.eng[i]),mn,mx,lab,unit,8,red);});});}
/* ---------------- Military family ---------------- */
function drawHUD(c,s,ac){const g=c.createLinearGradient(0,0,0,512);g.addColorStop(0,'#3d6ea3');g.addColorStop(0.55,'#9bb8cf');g.addColorStop(0.56,'#5c6b4a');g.addColorStop(1,'#2e3524');c.fillStyle=g;c.fillRect(0,0,512,512);c.fillStyle='rgba(5,12,8,.55)';c.fillRect(0,0,512,512);
  const H=AV.hud;c.shadowColor=H;c.shadowBlur=6;const cx=256,cy=240;c.save();c.translate(cx,cy);c.rotate(-s.bank*D2R);c.translate(0,s.pitch*6);
  for(let p=-30;p<=30;p+=5){const y=-p*6;if(Math.abs(p-s.pitch)>18)continue;if(!p){Ln(c,[[-200,0],[-40,0]],H,2);Ln(c,[[40,0],[200,0]],H,2);continue;}Ln(c,[[-100,y],[-40,y],[-40,y+(p>0?10:-10)]],H,2,p<0?[8,6]:null);Ln(c,[[40,y+(p>0?10:-10)],[40,y],[100,y]],H,2,p<0?[8,6]:null);T(c,String(Math.abs(p)),-112,y,H,14,'right',600);T(c,String(Math.abs(p)),112,y,H,14,'left',600);}c.restore();
  c.strokeStyle=H;c.lineWidth=2;c.beginPath();c.arc(cx,cy+s.vs*-0.004,9,0,TAU);c.stroke();Ln(c,[[cx-26,cy+s.vs*-0.004],[cx-9,cy+s.vs*-0.004]],H,2);Ln(c,[[cx+9,cy+s.vs*-0.004],[cx+26,cy+s.vs*-0.004]],H,2);Ln(c,[[cx,cy-9+s.vs*-0.004],[cx,cy-20+s.vs*-0.004]],H,2);
  Bx(c,40,226,76,30,H,2);T(c,n0(s.ias),78,241,H,18,'center',600);Bx(c,396,226,84,30,H,2);T(c,fmt(Math.round(s.altFt/10)*10).replace(',',''),438,241,H,17,'center',600);
  T(c,'M '+s.mach.toFixed(2),40,280,H,14);T(c,'G 1.'+String(Math.round(Math.abs(s.bank)/3)),40,302,H,14);T(c,'AOA '+n1f(Math.max(0,s.pitch*0.6+2)),40,324,H,14);T(c,s.ap?'A/P':'',440,280,H,14);T(c,'R '+fmt(Math.round(s.altFt*1.02)),400,302,H,13);
  for(let d=-20;d<=20;d+=5){const h=Math.round(s.hdg/5)*5+d,x=cx+(h-s.hdg)*7;Ln(c,[[x,40],[x,h%10?48:54]],H,2);if(h%10===0)T(c,String(((h%360)+360)%360/10|0).padStart(2,'0'),x,66,H,13,'center',600);}Ln(c,[[cx,30],[cx,40]],H,2);
  T(c,ac.name.replace(ac.mfr+' ','').replace('Lockheed Martin ','')+' · HUD',256,494,H,12,'center',600);c.shadowBlur=0;}
function drawSA(c,s,ac){bg(c,512,512,'#020604');const H=AV.hud,cx=256,cy=440;c.strokeStyle='rgba(125,255,154,.45)';c.lineWidth=1.5;[100,200,300,400].forEach(r=>{c.beginPath();c.arc(cx,cy,r,-Math.PI*0.86,-Math.PI*0.14);c.stroke();});
  [-60,-30,0,30,60].forEach(a=>{const A=(a-90)*D2R;Ln(c,[[cx,cy],[cx+Math.cos(A)*400,cy+Math.sin(A)*400]],'rgba(125,255,154,.25)',1);});
  const sw=((s.u*500)%120-60);const A=(sw-90)*D2R;const gr=c.createRadialGradient(cx,cy,0,cx,cy,400);gr.addColorStop(0,'rgba(125,255,154,.25)');gr.addColorStop(1,'rgba(125,255,154,0)');c.fillStyle=gr;c.beginPath();c.moveTo(cx,cy);c.arc(cx,cy,400,A-0.15,A);c.closePath();c.fill();
  [[-20,300,'#ff4d4d','BANDIT'],[25,220,'#4dc3ff','WING'],[40,340,'#ffd24d','UNK']].forEach(([b,d,col,l])=>{const a=(b-90)*D2R,x=cx+Math.cos(a)*d,y=cy+Math.sin(a)*d;c.strokeStyle=col;c.lineWidth=2.5;if(col==='#ff4d4d'){c.beginPath();c.moveTo(x,y-10);c.lineTo(x+10,y+8);c.lineTo(x-10,y+8);c.closePath();c.stroke();}else{c.beginPath();c.arc(x,y,9,Math.PI,0);c.stroke();}T(c,l,x+14,y,col,11,'left',600);});
  c.fillStyle=H;c.beginPath();c.moveTo(cx,cy-16);c.lineTo(cx-10,cy+8);c.lineTo(cx+10,cy+8);c.closePath();c.fill();T(c,'TSD · '+String(Math.round(s.hdg)).padStart(3,'0')+'°',16,22,H,14,'left',700);T(c,'40 NM',496,22,H,12,'right');}
function drawMilEng(c,s,ac){bg(c,512,512,'#030705');const H=AV.hud;T(c,'ENGINE',16,22,H,16,'left',700);const n=ac.nEng;range(n).forEach(i=>{const g=s.eng[i],x=70+i*(380/Math.max(n-1,1))*(n>1?1:0)+(n===1?186:0);
  [['RPM',g.n1,110],['FTIT',g.egt,ac.e.egt*1.1||1300],['NOZ',clamp(g.n1-40,0,100),100],['FF',g.ff/1000,Math.max(1,fuelFlow(ac.e)/1000)]].forEach(([l,v,mx],k)=>{const y=70+k*92;Bx(c,x-36,y,72,70,'rgba(125,255,154,.5)',1.5);c.fillStyle=k===1&&v>mx*0.9?AV.a:H;c.fillRect(x-30,y+64-58*clamp(v/mx,0,1),18,58*clamp(v/mx,0,1));T(c,l,x+12,y+14,H,11,'left',600);T(c,k===3?n1f(v):n0(v),x+12,y+40,H,15,'left',700);});
  T(c,(n>1?(i?'R':'L'):'ENG'),x,452,H,14,'center',700);});T(c,'FUEL '+fmt(Math.round(s.fob*1000))+' KG',496,22,H,13,'right',600);}

/* ---------------- texture registry for the 3D flight deck ---------------- */
const PANEL_KINDS={pfd:[512,512,(c,s,ac)=>drawPFD(c,s,ac)],nd:[512,512,(c,s,ac)=>drawND(c,s,ac)],eng:[512,512,(c,s,ac)=>drawEng(c,s,ac)],sys:[512,512,(c,s,ac)=>drawSys(c,s,ac,SYS_PAGES[Math.floor(s.u*36)%SYS_PAGES.length])],ovh:[1024,600,(c,s,ac)=>drawOVH(c,s,ac)],mcp:[1024,200,(c,s,ac)=>drawMCP(c,s,ac)]};
const PANEL_TEX={};
function panelTex(kind){if(PANEL_TEX[kind])return PANEL_TEX[kind].tex;const [w,h,draw]=PANEL_KINDS[kind];const cv=document.createElement('canvas');cv.width=w;cv.height=h;const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;PANEL_TEX[kind]={cv,ctx:cv.getContext('2d'),tex,draw,used:0};return tex;}
function pfdTexture(kind=0){return panelTex(typeof kind==='number'?['pfd','nd','eng','sys','ovh','mcp'][kind]||'pfd':kind);}
function updatePanelTextures(ac,st){Object.values(PANEL_TEX).forEach(p=>{try{p.draw(p.ctx,st,ac);}catch(e){}p.tex.needsUpdate=true;});}
/* draw any kind into a DOM canvas, scaled to its CSS size */
function drawPanelInto(cv,kind,ac,st,page){const r=cv.getBoundingClientRect();if(!r.width)return;const dpr=Math.min(window.devicePixelRatio||1,2),W=Math.round(r.width*dpr),H=Math.round(r.height*dpr);if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H;}
  const [bw,bh]=PANEL_KINDS[kind];const c=cv.getContext('2d');c.setTransform(1,0,0,1,0,0);c.fillStyle='#000';c.fillRect(0,0,W,H);if(kind==='ovh'){const f=avFam(ac);c.fillStyle=f==='mil'?'#2c3238':f==='analog'?'#2b3035':f==='ecam'?'#4a5662':'#5b6470';c.fillRect(0,0,W,H);}else if(kind==='mcp'){c.fillStyle='#1c2024';c.fillRect(0,0,W,H);}const sc=Math.min(W/bw,H/bh);c.setTransform(sc,0,0,sc,(W-bw*sc)/2,(H-bh*sc)/2);
  if(kind==='sys')drawSys(c,st,ac,page||'HYD');else PANEL_KINDS[kind][2](c,st,ac);c.setTransform(1,0,0,1,0,0);}
/* =====================================================================
   APPLICATION — scene, navigation, camera choreography, HUD
   ===================================================================== */
window.S = S = {ac:null,AF:null,tree:null,level:0,sys:null,l2:null,l3:null,explode:0,exCur:0,xray:0,flow:false,thermal:false,anim:true,
  hidden:new Set(),phase:'parked',mo:Object.assign({},PHASES.parked),folds:{},dtab:'data',ftab:'sim',tour:null,spool:1,simSt:null,labVis:true,bpCache:{},open:new Set(['ac']),cmp:'',cmpOn:true,asm:null,asmSys:null,mic:null,flowObj:null,t:0,anims:[],labels:[],tw:null,hover:null,cmpAF:null};
const $=id=>document.getElementById(id);
const host=$('view');
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;host.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0xeeede9);scene.fog=new THREE.Fog(0xeeede9,200,800);
const camera=new THREE.PerspectiveCamera(38,1,0.05,4000);camera.position.set(60,30,70);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=0.08;controls.screenSpacePanning=true;
scene.add(new THREE.HemisphereLight(0xeef3ff,0x8a857a,0.55));
const key=new THREE.DirectionalLight(0xffffff,0.95);key.position.set(40,80,50);scene.add(key);
const rim=new THREE.DirectionalLight(0xa9c6ff,0.55);rim.position.set(-60,20,-50);scene.add(rim);
const fill=new THREE.DirectionalLight(0xffdcae,0.3);fill.position.set(-30,-10,60);scene.add(fill);
function makeEnv(renderer){const pm=new THREE.PMREMGenerator(renderer);const es=new THREE.Scene();
  const g=new THREE.BoxGeometry(20,20,20,1,8,1);const col=[];const pos=g.attributes.position;for(let i=0;i<pos.count;i++){const h=(pos.getY(i)+10)/20;const c=new THREE.Color().setRGB(lerp(0.03,0.3,Math.pow(h,0.8)),lerp(0.035,0.34,Math.pow(h,0.8)),lerp(0.05,0.4,Math.pow(h,0.8)));col.push(c.r,c.g,c.b);}
  g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));es.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide})));
  const lm=new THREE.MeshBasicMaterial({color:0x7a7a7a});[[-6,9,0,8,0.2,2],[6,9,0,8,0.2,2],[0,9,-5,2,0.2,6],[9.8,4,0,0.2,3,10]].forEach(([x,y,z,a,b2,c])=>{const m=new THREE.Mesh(new THREE.BoxGeometry(a,b2,c),lm);m.position.set(x,y,z);es.add(m);});
  return pm.fromScene(es,0.02).texture;}
scene.environment=makeEnv(renderer);
const rootAir=grp(),rootCmp=grp(),rootAsm=grp(),rootMic=grp();scene.add(rootAir,rootCmp,rootAsm,rootMic);
const grid=new THREE.GridHelper(1,48,0xc9c6bd,0xdcdad3);grid.material.transparent=true;grid.material.opacity=0.9;scene.add(grid);
const shadow=new THREE.Mesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:shadowTexture(),transparent:true,depthWrite:false}));scene.add(shadow);
const GHOST=new THREE.MeshBasicMaterial({color:0x1f5fe0,wireframe:true,transparent:true,opacity:0.09,depthWrite:false});
const SKIN_CUT=new THREE.MeshStandardMaterial({color:0xc9d2dc,metalness:.3,roughness:.35,transparent:true,opacity:0.2,depthWrite:false,side:THREE.DoubleSide});
const CMP_MAT=new THREE.MeshBasicMaterial({color:0xe8730c,wireframe:true,transparent:true,opacity:0.28,depthWrite:false});
const leaders=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({color:0x1f5fe0,dashSize:0.15,gapSize:0.1,transparent:true,opacity:0.75}));leaders.frustumCulled=false;scene.add(leaders);
const HEAT_TIME={value:0},heatCache={};
function heatMat(t){const k=Math.round(clamp(t,0,1)*20);if(heatCache[k])return heatCache[k];
  return heatCache[k]=new THREE.ShaderMaterial({side:THREE.DoubleSide,clipping:true,uniforms:{uT:{value:k/20},uTime:HEAT_TIME},
    vertexShader:'#include <clipping_planes_pars_vertex>\nvarying vec3 vP;varying vec3 vN;void main(){vec4 lp=vec4(position,1.);vec3 n=normal;\n#ifdef USE_INSTANCING\nlp=instanceMatrix*lp;n=mat3(instanceMatrix)*n;\n#endif\nvec4 wp=modelMatrix*lp;vP=wp.xyz;vN=normalize(mat3(modelMatrix)*n);vec4 mvPosition=viewMatrix*wp;gl_Position=projectionMatrix*mvPosition;\n#include <clipping_planes_vertex>\n}',
    fragmentShader:'#include <clipping_planes_pars_fragment>\nuniform float uT;uniform float uTime;varying vec3 vP;varying vec3 vN;vec3 ramp(float t){t=clamp(t,0.,1.);vec3 c=mix(vec3(.02,.06,.25),vec3(0.,.55,1.),smoothstep(0.,.22,t));c=mix(c,vec3(.1,.9,.6),smoothstep(.2,.4,t));c=mix(c,vec3(1.,.85,.1),smoothstep(.4,.62,t));c=mix(c,vec3(1.,.3,.05),smoothstep(.6,.82,t));c=mix(c,vec3(1.,.97,.9),smoothstep(.86,1.,t));return c;}void main(){\n#include <clipping_planes_fragment>\nfloat n=sin(vP.x*2.1+uTime*2.)*sin(vP.y*1.9-uTime*1.3)*sin(vP.z*1.7+uTime);float l=.55+.45*abs(vN.y*.6+vN.z*.4+vN.x*.3);gl_FragColor=vec4(ramp(uT+n*.07)*l,1.);}'});}

/* ---------- particle airflow ---------- */
function zoneColor(z,x){if(x>=z[0][0])return z[0][1];for(let i=0;i<z.length-1;i++){const a=z[i],b=z[i+1];if(x<=a[0]&&x>=b[0]){const f=(a[0]-x)/Math.max(a[0]-b[0],1e-6);return [lerp(a[1][0],b[1][0],f),lerp(a[1][1],b[1][1],f),lerp(a[1][2],b[1][2],f)];}}return z[z.length-1][1];}
function makeEmitter(d){
  if(d.type==='axial')return{n:d.n,spawn(p,init){p.a=Math.random()*TAU;p.r=lerp(d.r0,d.r1,Math.sqrt(Math.random()));p.max=(d.x0-d.x1)/d.speed;p.life=init?Math.random()*p.max:0;p.x=d.x0-d.speed*p.life;p.vx=-d.speed*(0.85+Math.random()*0.3);p.vy=p.vz=0;this.pos(p);},step(p,dt){p.a+=(d.swirl||0)*dt;this.pos(p);},pos(p){p.y=p.r*Math.cos(p.a);p.z=p.r*Math.sin(p.a);},color(p){return zoneColor(d.zones,p.x);}};
  if(d.type==='free'){const [x1,x0,y0,y1,z0,z1]=d.box,o=d.off||V();return{n:d.n,spawn(p,init){p.max=(x1-x0)/d.speed;p.life=init?Math.random()*p.max:0;p.x=x1-d.speed*p.life+o.x;p.y=lerp(y0,y1,Math.random())+o.y;p.z=lerp(z0,z1,Math.random())+o.z;p.vx=-d.speed;p.vy=0;p.vz=0;},step(p,dt){if(d.down&&p.x<(x1+x0)/2+o.x)p.vy=-d.speed*d.down;else p.vy=0;},color(p){const f=1-p.life/p.max;const c=d.color;return [c[0]*(0.4+0.6*f),c[1]*(0.4+0.6*f),c[2]*(0.4+0.6*f)];}};}
  if(d.type==='plume'){return{n:d.n,spawn(p,init){p.max=d.len/d.speed;p.life=init?Math.random()*p.max:0;const a=Math.random()*TAU,r=Math.random()*d.r;p.x=d.p.x-d.speed*p.life;p.y=d.p.y+Math.cos(a)*r;p.z=d.p.z+Math.sin(a)*r;p.vx=-d.speed;p.vy=Math.cos(a)*d.r*0.3;p.vz=Math.sin(a)*d.r*0.3;},color(p){const f=p.life/p.max;return d.cold?[0.6-0.4*f,0.75-0.4*f,1-0.5*f]:zoneColor([[0,[1,0.95,0.85]],[-0.25,[1,0.55,0.15]],[-0.6,[0.9,0.15,0.05]],[-1,[0.2,0.03,0.02]]],-f);}};}
}
class Flow{constructor(ems,size){this.st=[];ems.forEach(e=>{for(let i=0;i<e.n;i++){const p={e};e.spawn(p,true);this.st.push(p);}});const N=this.st.length;this.P=new Float32Array(N*3);this.C=new Float32Array(N*3);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(this.P,3));g.setAttribute('color',new THREE.BufferAttribute(this.C,3));
  this.pts=new THREE.Points(g,new THREE.PointsMaterial({size,map:dotTexture(),vertexColors:true,transparent:true,depthWrite:false,blending:THREE.NormalBlending,opacity:0.85,sizeAttenuation:true}));this.pts.frustumCulled=false;this.pts.userData.flow=1;this.update(0);}
  update(dt){const P=this.P,C=this.C;this.st.forEach((p,i)=>{p.life+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;if(p.e.step)p.e.step(p,dt);if(p.life>p.max)p.e.spawn(p,false);P[i*3]=p.x;P[i*3+1]=p.y;P[i*3+2]=p.z;const c=p.e.color(p);C[i*3]=c[0];C[i*3+1]=c[1];C[i*3+2]=c[2];});
    this.pts.geometry.attributes.position.needsUpdate=true;this.pts.geometry.attributes.color.needsUpdate=true;}
  dispose(){this.pts.parent&&this.pts.parent.remove(this.pts);this.pts.geometry.dispose();this.pts.material.dispose();}}

/* ---------- helpers ---------- */
function disposeGroup(g){[...g.children].forEach(c=>{g.remove(c);c.traverse(o=>{if(o.geometry)o.geometry.dispose();});});}
function curRoot(){return S.level<=1?rootAir:S.level===2?rootAsm:rootMic;}
function isUnder(o,anc){while(o){if(o===anc)return true;o=o.parent;}return false;}
function visibleChain(o){while(o){if(!o.visible)return false;o=o.parent;}return true;}
function curNodeId(){return S.l3||S.l2||S.sys||'ac';}
function boxOf(obj){obj.updateMatrixWorld(true);const b=new THREE.Box3();obj.traverse(o=>{if((o.isMesh||o.isInstancedMesh)&&visibleChain(o)&&!o.userData.flow){if(o.isInstancedMesh){o.computeBoundingBox&&o.computeBoundingBox();const bb=o.geometry.boundingBox||(o.geometry.computeBoundingBox(),o.geometry.boundingBox);const tmp=new THREE.Box3();const m=new THREE.Matrix4();for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);tmp.copy(bb).applyMatrix4(m).applyMatrix4(o.matrixWorld);b.union(tmp);}}else b.expandByObject(o);}});return b;}

/* ---------- skin / ghost / thermal look ---------- */
function updateSkinMat(){const x=S.xray/100,m=MAT.skin;m.transparent=x>0.01;m.opacity=1-0.88*x;m.depthWrite=x<0.35;m.wireframe=x>0.82;m.needsUpdate=true;SKIN_CUT.color.copy(m.color);}
function applyLook(){
  updateSkinMat();const sel=S.level===1?S.AF.sys[S.sys]:null;
  curRoot().traverse(o=>{if(!(o.isMesh||o.isInstancedMesh))return;const u=o.userData;if(!u.mat0)return;let m=u.mat0;
    if(S.level===1&&!isUnder(o,sel))m=GHOST;
    else if(S.thermal&&!(u.skin&&S.xray>30))m=heatMat(u.temp??0.06);
    else if(u.skin)m=S.level===1?SKIN_CUT:MAT.skin;
    o.material=m;});
  if(SB.on&&SB.AF)applyLookB();
  $('legend').hidden=!S.thermal;applyClip();
}
function syncHidden(){if(!S.AF)return;Object.entries(S.AF.sys).forEach(([k,g])=>g.visible=!S.hidden.has(k));if(S.asm)Object.entries(S.asm.parts).forEach(([k,g])=>g.visible=!S.hidden.has(S.asm.sys+'/'+k));if(SB.on&&SB.AF){Object.entries(SB.AF.sys).forEach(([k,g])=>g.visible=!S.hidden.has(k));if(SB.asm)Object.entries(SB.asm.parts).forEach(([k,g])=>g.visible=!S.hidden.has(SB.asm.sys+'/'+k));}}

/* ---------- aircraft loading ---------- */
function setAircraft(id){
  const ac=variantOf(id);S.ac=ac;$('loading').classList.remove('done');
  disposeGroup(rootAir);disposeGroup(rootAsm);disposeGroup(rootMic);S.asm=null;S.asmSys=null;S.mic=null;
  applySkin(MAT.skin,ac);
  S.AF=buildAirframe(ac);rootAir.add(S.AF.root);S.simSt=simState(ac,SIM.u);S.mo=simMotion(S.simSt);applyMotion(S.AF,S.mo);S.AF.explodables=[];S.AF.root.traverse(o=>{if(o.userData.ex)S.AF.explodables.push(o);});
  S.tree=buildTree(ac);S.hidden.clear();S.open=new Set(['ac']);
  $('fleetName').textContent=ac.name;document.title='Global Aircraft Dissection Encyclopedia';
  renderTree();buildCompareOverlay();renderFleetList();
  go(0);requestAnimationFrame(()=>$('loading').classList.add('done'));
  try{localStorage.setItem('aerodissect.ac',ac.id);}catch(e){}
}
function applySkin(m,ac){const dark=ac.deck==='fwing'||ac.id==='sr71',mil=ac.cat==='MI';m.color.set(ac.deck==='fighter'?0x7a8590:dark?0x2a2e33:mil?0x8a949c:0xe4e7ea);m.metalness=mil?0.25:0.45;m.roughness=mil?(dark?0.7:0.55):0.32;}
const _applySkin0=applySkin;applySkin=function(m,ac){_applySkin0(m,ac);const pt=paintFor(ac);if(pt[2]!=null){m.color.setHex(pt[2]);m.metalness=pt[3];m.roughness=pt[4];}};
function buildCompareOverlay(){disposeGroup(rootCmp);S.cmpAF=null;const b=FLEET_BY_ID[S.cmp];if(!b||!S.ac||b.id===S.ac.id)return;
  const AF2=buildAirframe(b);AF2.root.traverse(o=>{if(o.isMesh||o.isInstancedMesh){o.material=CMP_MAT;o.userData={};}if(o.userData&&o.userData.internal)o.visible=false;});
  AF2.root.position.y=S.AF.groundY-AF2.groundY;rootCmp.add(AF2.root);S.cmpAF=AF2;}

/* ---------- navigation ---------- */
function go(level,sys=null,l2=null,l3=null,o={}){
  const prevLevel=S.level;S.level=level;S.sys=sys;S.l2=l2;S.l3=l3;
  MAT.brake.emissive.setRGB(0,0,0);MAT.cyan.emissiveIntensity=.9;
  if(level===2&&(!S.asm||S.asmSys!==sys)){disposeGroup(rootAsm);S.asm=buildAssembly(S.ac,sys,S.AF);S.asmSys=sys;rootAsm.add(S.asm.group);}
  if(level===3){disposeGroup(rootMic);S.mic=micro(S.tree.nodes[l3],S.ac);rootMic.add(S.mic.g);S.mic.g.scale.setScalar(microScale(S.tree.nodes[l3],S.ac));S.mic.map=new Map();S.mic.parts.forEach(([ob,n])=>S.mic.map.set(ob,n));}
  if(level>=2&&prevLevel<2&&S.xray===0)setXray(70);
  if(level===2&&prevLevel!==2&&S.explode===0)setExplode(55);
  if(level<=1&&prevLevel>=2&&S.explode===0.55)setExplode(0);
  if(level<=1&&prevLevel>=2&&S.xray===70)setXray(0);
  rootAir.visible=level<=1;rootCmp.visible=level===0&&!!S.cmpAF;rootAsm.visible=level===2;rootMic.visible=level===3;
  Object.entries(S.AF.inner).forEach(([k,g])=>g.visible=level===1&&k===sys);
  if(SB.on)syncB();else groupB.visible=false;
  syncHidden();applyLook();collectAnims();buildFlow();buildLabels();setHover(null);
  renderCrumbs();syncTree();renderTele();updateBadge();
  $('rngExplode').disabled=level===3;
  frame(o.noCam);applyClip();CLIP.dirty=true;updateSplitUI();renderSplitTele();
}
function ascend(){if(S.level===3)go(2,S.sys,S.l2);else if(S.level===2)go(1,S.sys);else if(S.level===1)go(0);}
function navNode(id){const n=S.tree.nodes[id];if(!n)return;
  if(n.level===0)go(0);else if(n.level===1)go(1,n.id);else if(n.level===2)go(2,n.sys,n.id);else go(3,n.sys,n.parent.id,n.id);}
function dissect(id){const n=S.tree.nodes[id];if(!n)return;if(n.level===2&&n.children.length)go(3,n.sys,n.id,n.children[0].id);else navNode(id);}
function collectAnims(){S.anims=[];const pr=S.level<=1?(S.AF&&S.AF.sys.prop):null;const f=o=>{if(o.userData.anim){o.userData.anim.prop=S.level<=1?!!(pr&&isUnder(o,pr)):S.sys==='prop';S.anims.push(o);}};curRoot().traverse(f);if(SB.on&&SB.AF)curRootB().traverse(f);}
function updateBadge(){const names=['Complete Aircraft','Major System · ghost cutaway','Sub-Assembly · explode view','Micro-Component · live mechanism'];$('lvl').textContent='L'+S.level;$('lvlName').textContent=names[S.level];
  $('hint').textContent=['Click a section to dissect · Drag to orbit · Scroll or pinch to zoom','Click the highlighted system to open its sub-assemblies · click a ghosted section to switch','Click a sub-assembly to isolate its parts · Explode slider separates the assembly','Live mechanism · Ascend with the button or Esc'][S.level];
  $('btnBack').disabled=S.level===0;}

/* ---------- camera choreography (cubic ease-in-out) ---------- */
const ease=t=>t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
function frame(noCam){
  let obj,dir;const L=S.ac.L;
  if(S.level===0){obj=S.AF.root;dir=V(1.0,0.42,1.15);}
  else if(S.level===1){obj=S.AF.sys[S.sys];dir={prop:V(0.7,0.2,1),wing:V(0.25,1,0.55),gear:V(0.8,0.05,1),cockpit:V(1,0.35,0.7),fus:V(0.3,0.5,1),emp:V(-1,0.45,0.9)}[S.sys];}
  else if(S.level===2){obj=S.asm.group;dir=S.sys==='wing'?V(0.3,0.9,0.7):S.sys==='cockpit'?V(-1,0.42,0.55):V(0.55,0.35,1);}
  else{obj=S.mic.g;dir=V(0.75,0.45,1);}
  if(S.viewDir)dir=S.viewDir.clone();
  if(!obj) obj = (S.AF && S.AF.root) || curRoot();
  const b=boxOf(obj);if(SB.on&&SB.AF){const ob=S.level===0?SB.AF.root:S.level===1?SB.AF.sys[S.sys]:S.level===2?SB.asm.group:SB.mic.g;const bb=boxOf(ob);if(!bb.isEmpty())b.union(bb);}if(b.isEmpty())b.setFromCenterAndSize(V(),V(L,L*0.3,L));
  const sph=b.getBoundingSphere(new THREE.Sphere()),r=Math.max(sph.radius,0.3);
  const fov=camera.fov*D2R/2,asp=Math.max(camera.aspect,0.5),dist=r/Math.tan(fov)*(asp<1?0.92/asp+0.12:1.0)*(S.level===0?0.78:S.level===3?0.95:0.9);
  const target=sph.center.clone(),pos=target.clone().add(dir.clone().normalize().multiplyScalar(dist));
  camera.near=Math.max(r*0.01,0.01);camera.far=r*80+200;camera.updateProjectionMatrix();
  controls.minDistance=r*0.2;controls.maxDistance=r*12;
  // ground
  const sp=SB.on&&SB.AF,gy=S.level<=1?S.AF.groundY:b.min.y-r*0.06,gs=S.level<=1?Math.max(S.ac.L,S.ac.S,sp?SB.ac.L:0,sp?SB.ac.S:0)*2.6:r*5;S.gridCell=gs/48;
  grid.position.set(target.x,gy,target.z);grid.scale.setScalar(gs);shadow.visible=S.level<=1&&!SB.on;shadow.position.set(0,S.AF.groundY+0.01,0);shadow.scale.set(S.ac.L*1.2,1,S.ac.S*1.1);
  S.frameR=r;
  if(noCam)return;
  S.tw={p0:camera.position.clone(),p1:pos,t0:controls.target.clone(),t1:target,start:performance.now(),dur:1100};
}

/* ---------- labels & leader lines ---------- */
function buildLabels(){
  const box=$('labels');box.innerHTML='';S.labels=[];
  let side='A';const add=(text,getPos,id,gold)=>{const sd=side,el=document.createElement('button');el.className='cl'+(gold?' gold':'');el.type='button';el.innerHTML='<i></i>';el.appendChild(document.createTextNode(text));if(id)el.onclick=()=>labelClick(id,sd);else el.tabIndex=-1;box.appendChild(el);S.labels.push({el,getPos,id,side:sd});};
  if(S.level<=1)SYS_ORDER.forEach(k=>{const c=S.AF.centers[k];if(S.level===1||true){const n=S.tree.nodes[k];add(ataOf(n,S.ac)+' · '+n.name.replace(/ \(.+\)$/,''),()=>{const g=S.AF.sys[k];return c.clone();},k,S.level===1&&k===S.sys);}});
  if(S.level===2)Object.entries(S.asm.parts).forEach(([k,p])=>{const id=S.asm.sys+'/'+k,n=S.tree.nodes[id];if(!n)return;add(ataOf(n,S.ac)+' '+n.name,()=>p.localToWorld(p.userData.cLocal.clone()),id,S.l2===id);});
  if(S.level===3){const dirs=[V(0,1,0),V(0,-1,0),V(0,0,1),V(0,0,-1),V(0.6,0.8,0),V(-0.6,-0.8,0),V(0.5,0,0.85),V(-0.5,0,-0.85)];
    S.mic.parts.forEach(([o,name],i)=>{const b=boxOf(o);const c=b.isEmpty()?o.getWorldPosition(V()):b.getCenter(V());if(!b.isEmpty()){const hs=b.getSize(V()).multiplyScalar(0.5);const d=dirs[i%dirs.length];c.add(V(d.x*hs.x,d.y*hs.y,d.z*hs.z).multiplyScalar(0.85));}const loc=o.worldToLocal(c.clone());add(name,()=>o.localToWorld(loc.clone()),null);});}
  if(SB.on&&SB.AF){side='B';labelsB(add);}
}
function labelClick(id,side){if(side==='B')id=mapBtoA(id);const n=S.tree.nodes[id];if(!n)return;if(n.level===1){if(S.level===1&&S.sys===id)go(2,id);else go(1,id);}else if(n.level===2)dissect(id);}
const _v=V();
function updateLabels(){
  const R=paneRects(),show=!(S.level===0&&S.exCur<0.08),pl=[];
  S.labels.forEach(l=>{const rc=R[l.side]||R.A;if(!show||!rc){l.el.style.display='none';return;}const p=l.getPos();_v.copy(p).project(camera);const vis=_v.z<1&&_v.z>-1&&Math.abs(_v.x)<1.05&&Math.abs(_v.y)<1.05&&!(CLIP.on&&clipPlane.distanceToPoint(p)<0);
    if(!vis){l.el.style.display='none';return;}l.el.style.display='';if(!l.w){l.w=l.el.offsetWidth||120;}pl.push({l,rc,x:rc.x+(_v.x+1)/2*rc.w,y:rc.y+(1-_v.y)/2*rc.h-10});});
  layoutCallouts(pl);
  const lead=(ln,asm,root)=>{if(S.level===2&&asm&&S.exCur>0.02){const pts=[];Object.values(asm.parts).forEach(p=>{if(!p.visible)return;pts.push(p.userData.c0.clone().applyMatrix4(root.matrixWorld),p.localToWorld(p.userData.cLocal.clone()));});
    ln.geometry.setFromPoints(pts);ln.computeLineDistances();ln.material.dashSize=S.frameR*0.04;ln.material.gapSize=S.frameR*0.025;ln.visible=true;}else ln.visible=false;};
  lead(leaders,S.asm,rootAsm);lead(leadersB,SB.on?SB.asm:null,rootAsmB);
}

/* ---------- airflow mode ---------- */
function buildFlow(){
  if(S.flowObj){S.flowObj.dispose();S.flowObj=null;}if(!S.flow){buildFlowB();return;}
  let descs=[],parent,size;
  if(S.level<=1){const b=boxOf(S.AF.root),sz=b.getSize(V()),L=S.ac.L;
    descs.push({type:'free',n:1700,box:[b.max.x+L*0.25,b.min.x-L*0.6,b.min.y,b.max.y+sz.y*0.2,b.min.z,b.max.z],speed:L*0.8,color:[0.1,0.65,1]});
    const hot=S.ac.e.type!=='PS';S.AF.engs.forEach(g=>{const ex=g.userData.exit;if(!ex)return;descs.push({type:'plume',n:220,p:ex,r:Math.max(nacDia(S.ac.e)*0.3,0.3),len:L*0.6,speed:L*1.2,cold:!hot});});
    parent=rootAir;size=L*0.02;}
  else if(S.level===2){descs=S.asm.flows;parent=S.asm.group;size=S.frameR*0.022;}
  else{descs=S.mic.flows.length?S.mic.flows:[(()=>{const b=boxOf(S.mic.g),s=b.getSize(V());return{type:'free',n:500,box:[b.max.x+s.x*0.3,b.min.x-s.x*0.3,b.min.y,b.max.y,b.min.z,b.max.z],speed:s.x,color:[0.1,0.7,1]};})()];parent=S.mic.g;size=Math.max(S.frameR,0.5)*0.03;}
  if(descs.length){S.flowObj=new Flow(descs.map(makeEmitter),size||0.1);parent.add(S.flowObj.pts);}
  buildFlowB();applyClip();
}

/* ---------- picking ---------- */
const ray=new THREE.Raycaster(),ptr=new THREE.Vector2();
function pick(cx,cy){const r=renderer.domElement.getBoundingClientRect(),R=paneRects(),lx=cx-r.left,ly=cy-r.top;let side='A';if(R.B&&lx>=R.B.x&&ly>=R.B.y)side='B';const rc=R[side];
  ptr.set((lx-rc.x)/rc.w*2-1,-(ly-rc.y)/rc.h*2+1);ray.setFromCamera(ptr,camera);
  const root=side==='B'?curRootB():curRoot();const hits=ray.intersectObject(root,true);for(const h of hits){const o=h.object;if(o.isPoints||o.isLine||o.userData.flow)continue;if(!visibleChain(o))continue;if(CLIP.on&&clipPlane.distanceToPoint(h.point)<0)continue;if(S.level===1&&o.material===GHOST&&S.xray>90)continue;return {o,side};}return null;}
function resolve(pk){
  if(!pk)return null;const o=pk.o,B=pk.side==='B',C=B?SB:S;let r=null;
  if(S.level<=1){let p=o;while(p&&!p.userData.sys)p=p.parent;r=p?{id:p.userData.sys,obj:p}:null;}
  else if(S.level===2){let p=o;while(p&&!(typeof p.userData.node==='string'&&p.userData.node.includes('/')))p=p.parent;r=p?{id:p.userData.node,obj:p}:null;}
  else{let p=o;while(p&&!C.mic.map.has(p))p=p.parent;r=p?{id:null,obj:p,name:C.mic.map.get(p)}:{id:null,obj:o,name:C.tree.nodes[C.l3].name};}
  if(r)r.side=pk.side;return r;
}
let boxHelper=null;
function setHover(r){
  if(boxHelper){boxHelper.parent&&boxHelper.parent.remove(boxHelper);boxHelper.geometry.dispose();boxHelper=null;}
  S.hover=r;const tip=$('tip');
  if(!r){tip.hidden=true;renderer.domElement.style.cursor='';return;}
  const n=r.id?(r.side==='B'?SB.tree:S.tree).nodes[r.id]:null;const name=(r.side==='B'&&SB.on?'B · ':SB.on?'A · ':'')+(n?n.name:r.name);
  const act=S.level===0?'Click to isolate system':S.level===1?(r.id===S.sys?'Click to open sub-assemblies':'Click to switch system'):S.level===2?'Click to dissect parts':'Part callout';
  tip.innerHTML=`<small>${act}</small>`;tip.appendChild(document.createTextNode(name||''));tip.hidden=false;
  renderer.domElement.style.cursor=S.level<3?'pointer':'default';
  if(S.level<3&&r.obj){boxHelper=new THREE.BoxHelper(r.obj,S.level===1&&r.id!==S.sys?0xff8a3d:0xf5c04a);boxHelper.material.transparent=true;boxHelper.material.opacity=0.55;(r.side==='B'?groupB:groupA).add(boxHelper);}
}
let down=null,hoverQ=null;
renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
renderer.domElement.addEventListener('pointermove',e=>{hoverQ=e;});
renderer.domElement.addEventListener('pointerleave',()=>{hoverQ=null;setHover(null);});
renderer.domElement.addEventListener('pointerup',e=>{if(!down)return;const d=Math.hypot(e.clientX-down.x,e.clientY-down.y);down=null;if(d>6)return;
  const r=resolve(pick(e.clientX,e.clientY));if(!r)return;if(r.side==='B'&&r.id)r.id=mapBtoA(r.id);
  if(S.level===0)go(1,r.id);else if(S.level===1){if(r.id===S.sys)go(2,r.id);else go(1,r.id);}else if(S.level===2&&r.id)dissect(r.id);});

/* ---------- UI: fleet selector ---------- */
const catSel=$('fleetCat');Object.entries(CATS).forEach(([k,v])=>{const o=document.createElement('option');o.value=k;o.textContent=v;catSel.appendChild(o);});
$('fleetCount').textContent=FLEET.length;
function renderFleetList(){
  const q=$('fleetSearch').value.trim().toLowerCase(),cat=catSel.value,list=$('fleetList');list.innerHTML='';let shown=0;
  Object.entries(CATS).forEach(([ck,cn])=>{if(cat&&cat!==ck)return;const acs=FLEET.filter(a=>a.cat===ck&&(!q||(a.name+' '+a.mfr+' '+a.e.name+' '+a.e.oem).toLowerCase().includes(q)));if(!acs.length)return;
    const h=document.createElement('div');h.className='fl-cat';h.innerHTML=`${cn}<span>${acs.length}</span>`;list.appendChild(h);
    const mfrs=[...new Set(acs.map(a=>a.mfr))];mfrs.forEach(m=>{const mh=document.createElement('div');mh.className='fl-mfr';mh.textContent=m;list.appendChild(mh);const box=document.createElement('div');box.className='fl-items';
      acs.filter(a=>a.mfr===m).forEach(a=>{const b=document.createElement('button');b.type='button';b.className='fl-it'+(S.ac&&a.id===S.ac.id?' on':'');const sp=document.createElement('span');sp.textContent=a.name.replace(a.mfr+' ','');const sm=document.createElement('small');sm.textContent=`${a.nEng}× ${({TF:'TF',TFI:'TF',TP:'TP',PS:'PST',TJAB:'TJ',TFAB:'TF-AB',TRJ:'TRJ'})[a.e.type]}`;b.append(sp,sm);
        b.onclick=()=>{toggleFleet(false);setAircraft(a.id);};box.appendChild(b);shown++;});list.appendChild(box);});});
  if(!shown){const d=document.createElement('div');d.className='fl-empty';d.textContent='No aircraft match that search. Try a manufacturer or engine name.';list.appendChild(d);}
}
function toggleFleet(open){const p=$('fleetPanel');p.hidden=open===undefined?!p.hidden:!open;$('fleetBtn').setAttribute('aria-expanded',String(!p.hidden));if(!p.hidden){renderFleetList();$('fleetSearch').focus({preventScroll:true});}}
$('fleetBtn').onclick=e=>{e.stopPropagation();toggleFleet();};
$('fleetSearch').oninput=renderFleetList;catSel.onchange=renderFleetList;
document.addEventListener('click',e=>{if(!$('fleetPanel').hidden&&!e.target.closest('.fleet-wrap'))toggleFleet(false);});
const cmpSel=$('cmpSel');Object.entries(CATS).forEach(([ck,cn])=>{const og=document.createElement('optgroup');og.label=cn;FLEET.filter(a=>a.cat===ck).forEach(a=>{const o=document.createElement('option');o.value=a.id;o.textContent=a.name;og.appendChild(o);});cmpSel.appendChild(og);});
function setCompare(id){S.cmp=id;cmpSel.value=id;buildCompareOverlay();rootCmp.visible=S.level===0&&!!S.cmpAF;renderTele();}
cmpSel.onchange=()=>setCompare(cmpSel.value);

/* ---------- UI: system tree ---------- */
const EYE='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M1 8s2.6-5 7-5 7 5 7 5-2.6 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2"/></svg>';
const EYE_OFF='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M1 8s2.6-5 7-5 7 5 7 5-2.6 5-7 5-7-5-7-5z"/><path d="M2 2l12 12"/></svg>';
function renderTree(){
  const box=$('tree');box.innerHTML='';let count=0;
  const build=(n,parent)=>{count++;const row=document.createElement('div');row.className='tn';row.dataset.id=n.id;row.style.setProperty('--d',n.level);row.setAttribute('role','treeitem');row.tabIndex=-1;
    const tw=document.createElement('button');tw.type='button';tw.className='tw'+(n.children.length?'':' leaf');tw.textContent=S.open.has(n.id)?'▼':'▶';tw.setAttribute('aria-label','Expand');
    tw.onclick=ev=>{ev.stopPropagation();if(S.open.has(n.id))S.open.delete(n.id);else S.open.add(n.id);kids.hidden=!S.open.has(n.id);tw.textContent=S.open.has(n.id)?'▼':'▶';};
    const nm=document.createElement('span');nm.className='nm';nm.textContent=n.name;nm.title=n.name;
    const lv=document.createElement('span');lv.className='lv';lv.textContent=n.level?ataOf(n,S.ac).replace('ATA ',''):'L0';lv.title='ATA '+lv.textContent+' · Level '+n.level;
    row.append(tw,nm,lv);
    if(n.level===1||n.level===2){const eye=document.createElement('button');eye.type='button';eye.className='eye'+(S.hidden.has(n.id)?' off':'');eye.innerHTML=S.hidden.has(n.id)?EYE_OFF:EYE;eye.setAttribute('aria-label','Toggle visibility of '+n.name);
      eye.onclick=ev=>{ev.stopPropagation();if(S.hidden.has(n.id))S.hidden.delete(n.id);else S.hidden.add(n.id);eye.className='eye'+(S.hidden.has(n.id)?' off':'');eye.innerHTML=S.hidden.has(n.id)?EYE_OFF:EYE;syncHidden();};row.append(eye);}
    row.onclick=()=>navNode(n.id);row.ondblclick=()=>dissect(n.id);
    parent.appendChild(row);const kids=document.createElement('div');kids.className='tn-kids';kids.hidden=!S.open.has(n.id);parent.appendChild(kids);
    n.children.forEach(c=>build(c,kids));};
  build(S.tree.root,box);$('treeCount').textContent=count+' nodes';filterTree();
  $('stat').textContent=`${FLEET.length} aircraft · ${count} nodes in this airframe`;
}
function filterTree(){const q=$('treeSearch').value.trim().toLowerCase();const rows=[...document.querySelectorAll('#tree .tn')];
  if(!q){rows.forEach(r=>{r.style.display='';});document.querySelectorAll('#tree .tn-kids').forEach(k=>{const id=k.previousElementSibling.dataset.id;k.hidden=!S.open.has(id);});return;}
  const match=new Set();Object.values(S.tree.nodes).forEach(n=>{if(n.name.toLowerCase().includes(q)){let p=n;while(p){match.add(p.id);p=p.parent;}}});
  rows.forEach(r=>{r.style.display=match.has(r.dataset.id)?'':'none';});document.querySelectorAll('#tree .tn-kids').forEach(k=>{k.hidden=false;});}
$('treeSearch').oninput=filterTree;
function syncTree(){const id=curNodeId();let p=S.tree.nodes[id];const path=new Set();while(p){path.add(p.id);if(p.parent)S.open.add(p.parent.id);p=p.parent;}
  document.querySelectorAll('#tree .tn').forEach(r=>{r.classList.toggle('sel',r.dataset.id===id);r.classList.toggle('path',path.has(r.dataset.id));r.setAttribute('aria-selected',String(r.dataset.id===id));});
  document.querySelectorAll('#tree .tn-kids').forEach(k=>{const kid=k.previousElementSibling.dataset.id;if(S.open.has(kid)){k.hidden=false;const tw=k.previousElementSibling.querySelector('.tw');if(tw&&!tw.classList.contains('leaf'))tw.textContent='▼';}});
  const sel=document.querySelector('#tree .tn.sel');if(sel){const tr=$('tree'),o=sel.getBoundingClientRect().top-tr.getBoundingClientRect().top+tr.scrollTop;if(o<tr.scrollTop||o>tr.scrollTop+tr.clientHeight-24)tr.scrollTop=o-tr.clientHeight/3;}}

/* ---------- UI: breadcrumbs ---------- */
function renderCrumbs(){const c=$('crumbs');c.innerHTML='';const ids=['ac',S.sys,S.l2,S.l3].filter(Boolean),cur=curNodeId();
  ids.forEach((id,i)=>{if(i){const s=document.createElement('span');s.className='sep';s.textContent='›';c.appendChild(s);}const n=S.tree.nodes[id];const b=document.createElement('button');b.type='button';b.className='cr'+(id===cur?' cur':'');b.textContent=n.name;b.title=n.name;b.onclick=()=>navNode(id);c.appendChild(b);});}

/* ---------- UI: telemetry dock ---------- */
let teleRows=[];
function renderTele(){
  const n=S.tree.nodes[curNodeId()],sp=specFor(n),ac=S.ac,t=$('tele');teleRows=[];
  const lvlName=['Aircraft','System','Sub-assembly','Part'][n.level];
  let h=`<div class="t-head"><div class="t-eyebrow">L${n.level} · ${lvlName}${S.level===2&&n.level===2?' · focused':''}</div><h1 class="t-name"></h1><div class="t-sub"></div></div>`;
  h+=`<section class="sect"><h3>Identity</h3><dl class="kv"><dt>Part</dt><dd id="tvPart"></dd><dt>OEM</dt><dd id="tvOem"></dd><dt>Material</dt><dd id="tvMat"></dd></dl></section>`;
  h+=`<section class="sect"><h3>Operating telemetry <span>simulated · live</span></h3><div class="tel" id="tvRows"></div></section><div id="tvSplit"></div>`;
  const kids=n.children;if(kids.length){h+=`<section class="sect"><h3>${n.level===0?'Systems':n.level===1?'Sub-assemblies':'Parts'} <span>${kids.length}</span></h3><div class="dissect" id="tvKids"></div></section>`;}
  h+=`<section class="sect"><h3>Compare with another aircraft</h3><div class="cmp-tg"><button class="tg" id="cmpTgl" aria-pressed="${S.cmpOn}">Comparator</button><select id="cmpSel2" aria-label="Aircraft to compare"></select></div><div id="tvCmp"></div></section>`;
  if(sp.note)h+=`<p class="note" id="tvNote"></p>`;
  t.innerHTML=h;t.querySelector('.t-name').textContent=n.name;t.querySelector('.t-sub').textContent=n.level?ac.name:`${ac.mfr} · ${CATS[ac.cat]}`;
  $('tvPart').textContent=n.name;$('tvOem').textContent=sp.oem;$('tvMat').textContent=sp.mat||'—';if(sp.note)$('tvNote').textContent=sp.note;
  const rowsEl=$('tvRows');sp.rows.forEach(r=>{const d=document.createElement('div');d.className='trow';const l=document.createElement('span');l.className='l';l.textContent=r.l;const v=document.createElement('span');v.className='v';d.append(l,v);
    let bar=null;if(typeof r.v==='number'&&r.max&&r.j>0){const m=document.createElement('div');m.className='meter'+(r.heat?' hot':'');bar=document.createElement('b');m.appendChild(bar);d.appendChild(m);}
    rowsEl.appendChild(d);teleRows.push({r,v,bar});});
  if(kids.length){const kb=$('tvKids');kids.forEach(c=>{const b=document.createElement('button');b.type='button';b.className='btn';const s1=document.createElement('span');s1.textContent=c.name;const s2=document.createElement('small');s2.textContent=c.level===3?'part':c.children.length+' items';b.append(s1,s2);b.onclick=()=>c.level===2?dissect(c.id):navNode(c.id);kb.appendChild(b);});}
  renderDockBp();
  const s2=$('cmpSel2');s2.innerHTML=cmpSel.innerHTML;s2.value=S.cmp;s2.onchange=()=>setCompare(s2.value);
  $('cmpTgl').onclick=()=>{S.cmpOn=!S.cmpOn;renderTele();};
  renderCompare();renderSplitTele();foldify(t);tickTele();tickLive(true);
}
function renderCompare(){const box=$('tvCmp');if(!box)return;box.innerHTML='';if(!S.cmpOn)return;const b=FLEET_BY_ID[S.cmp];
  if(!b||b.id===S.ac.id){box.innerHTML='<p class="note">Pick an aircraft above to compare the active system side by side. At Level 0 its outline is overlaid in gold for scale.</p>';return;}
  const rows=compareRows(S.level===0?'ac':S.sys,S.ac,b);const tb=document.createElement('table');tb.className='ctable';tb.innerHTML=`<thead><tr><th>Metric</th><th>${esc(S.ac.name.replace(S.ac.mfr+' ',''))}</th><th>${esc(b.name.replace(b.mfr+' ',''))}</th></tr></thead>`;
  const body=document.createElement('tbody');rows.forEach(([l,u,va,vb])=>{const tr=document.createElement('tr');const num=typeof va==='number'&&typeof vb==='number';const f=v=>typeof v==='number'?fmt(v,v%1?(Math.abs(v)<10?2:1):0)+(u?' '+u:''):String(v);
    tr.innerHTML=`<td>${esc(l)}${num?`<div class="cb"><i style="width:${(va/Math.max(va,vb)*50).toFixed(1)}%;background:var(--cyan)"></i><i style="width:${(vb/Math.max(va,vb)*50).toFixed(1)}%;background:var(--gold)"></i></div>`:''}</td><td class="a">${esc(f(va))}</td><td class="b">${esc(f(vb))}</td>`;body.appendChild(tr);});
  tb.appendChild(body);box.appendChild(tb);}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function tickTele(){const tt=performance.now()/1000;teleRows.forEach(({r,v,bar},i)=>{let val=r.v;if(typeof val==='number'&&r.j>0&&S.anim){val=r.v*(1+r.j*(Math.sin(tt*1.7+i*1.3)*0.7+Math.sin(tt*4.1+i)*0.3));}
  v.innerHTML='';v.appendChild(document.createTextNode(typeof val==='number'?fmt(val,r.d):String(val)));if(r.u){const s=document.createElement('small');s.textContent=r.u;v.appendChild(s);}
  if(bar)bar.style.width=clamp(val/r.max*100,2,100).toFixed(1)+'%';});}
setInterval(tickTele,300);

/* ---------- UI: control deck ---------- */
function setRangeFill(el){el.style.setProperty('--p',el.value+'%');}
function setXray(v){S.xray=v;$('rngXray').value=v;$('outXray').textContent=v+'%';setRangeFill($('rngXray'));applyLook();}
function setExplode(v){S.explode=v/100;$('rngExplode').value=v;$('outExplode').textContent=v+'%';setRangeFill($('rngExplode'));}
$('rngExplode').oninput=e=>setExplode(+e.target.value);
$('rngXray').oninput=e=>setXray(+e.target.value);
$('btnBack').onclick=ascend;$('btnReset').onclick=()=>frame();
const tg=(id,key,fn)=>{$(id).onclick=()=>{S[key]=!S[key];$(id).setAttribute('aria-pressed',String(S[key]));fn&&fn();};};
tg('tglFlow','flow',buildFlow);tg('tglHeat','thermal',applyLook);tg('tglSpin','anim');
$('treeTgl').onclick=()=>{$('left').classList.toggle('open');$('right').classList.remove('open');};
$('telTgl').onclick=()=>{$('right').classList.toggle('open');$('left').classList.remove('open');};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!S.labVis)return;if(!$('fleetPanel').hidden){toggleFleet(false);return;}if(document.activeElement&&/INPUT|SELECT/.test(document.activeElement.tagName))return;ascend();}});

/* ---------- render loop ---------- */
function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);const A=paneRects().A;camera.aspect=A.w/A.h;camera.updateProjectionMatrix();updateSplitUI();}
let last=performance.now();
function loop(now){
  requestAnimationFrame(loop);const dt=Math.min(0.05,(now-last)/1000);last=now;if(!S.labVis)return;if(S.anim)S.t+=dt;HEAT_TIME.value=S.t;
  if(S.tw){const k=clamp((now-S.tw.start)/S.tw.dur,0,1),e=ease(k);camera.position.lerpVectors(S.tw.p0,S.tw.p1,e);controls.target.lerpVectors(S.tw.t0,S.tw.t1,e);if(k>=1)S.tw=null;}
  controls.update();
  S.exCur+=(S.explode-S.exCur)*Math.min(1,dt*6);const ex=S.exCur;
  if(S.level<=1&&S.AF){const sc=Math.max(S.ac.L,S.ac.S)*0.12;S.AF.explodables.forEach(o=>o.position.copy(o.userData.base).addScaledVector(o.userData.ex,ex*sc));}
  else if(S.level===2&&S.asm){S.asm.group.traverse(o=>{if(o.userData.ex&&o.userData.base)o.position.copy(o.userData.base).addScaledVector(o.userData.ex,ex);});}
  S.simSt=simState(S.ac,SIM.u);S.spool+=(S.simSt.spool-S.spool)*Math.min(1,dt*2.5);
  if(S.level<=1&&S.AF){S.mo=simMotion(S.simSt);applyMotion(S.AF,S.mo);if(SB.on&&SB.AF)applyMotion(SB.AF,S.mo);}
  if(S.level>=1&&S.sys==='cockpit'){S._pt=(S._pt||0)+dt;if(S._pt>0.08){S._pt=0;updatePanelTextures(S.ac,S.simSt);}}
  tourTick(dt);
  if(S.anim)S.anims.forEach(o=>{const a=o.userData.anim;if(a.type==='spin')o.rotation[a.axis]+=a.rate*dt*(a.prop?S.spool:1);else a.f(o,S.t,dt);});
  if(SB.on&&SB.AF){if(S.level<=1){const sc=Math.max(SB.ac.L,SB.ac.S)*0.12;SB.AF.explodables.forEach(o=>o.position.copy(o.userData.base).addScaledVector(o.userData.ex,ex*sc));}else if(S.level===2&&SB.asm)SB.asm.group.traverse(o=>{if(o.userData.ex&&o.userData.base)o.position.copy(o.userData.base).addScaledVector(o.userData.ex,ex);});}
  if(S.flowObj&&S.anim)S.flowObj.update(dt);if(SB.flowObj&&S.anim)SB.flowObj.update(dt);
  clipTick(now,dt);
  if(hoverQ){const r=resolve(pick(hoverQ.clientX,hoverQ.clientY));const tip=$('tip');const rect=host.getBoundingClientRect();
    if((r&&r.obj)!==(S.hover&&S.hover.obj))setHover(r);if(r){tip.style.left=Math.min(hoverQ.clientX-rect.left+14,rect.width-200)+'px';tip.style.top=(hoverQ.clientY-rect.top+14)+'px';}hoverQ=null;}
  if(boxHelper)boxHelper.update();
  const cd=camera.position.distanceTo(controls.target);scene.fog.near=cd*1.6;scene.fog.far=cd*6;
  updateLabels();renderPanes();
}


/* ---------- flight phase & page integration ---------- */

new IntersectionObserver(es=>es.forEach(en=>{S.labVis=en.isIntersecting;if(!S.labVis){$('left').classList.remove('open');$('right').classList.remove('open');}else resize();}),{rootMargin:'100px'}).observe($('app'));
function openInLab(id){setAircraft(id);if(window.setView)setView('dissect');}

/* ---------- simulation → surfaces ---------- */
function simMotion(st){return {gear:st.gear,flaps:st.flaps,slats:st.slats,spl:st.spl,rev:st.rev,ail:clamp(Math.sin(st.u*60)*0.25*(st.altFt>50?1:0),-0.3,0.3),fold:st.fold};}
/* ---------- folders (collapsible sections that remember their state) ---------- */
function foldify(root){root.querySelectorAll('section.sect').forEach(sec=>{const h=sec.querySelector('h3');if(!h)return;const d=document.createElement('details');d.className='fold';const k=h.firstChild?h.firstChild.textContent.trim():'x';d.dataset.k=k;
    const sm=document.createElement('summary');sm.innerHTML=h.innerHTML;d.appendChild(sm);h.remove();while(sec.firstChild)d.appendChild(sec.firstChild);sec.replaceWith(d);});
  root.querySelectorAll('details.fold').forEach(d=>{const k=d.dataset.k;d.open=S.folds[k]!==undefined?S.folds[k]:!/Compare|Split/.test(k);d.addEventListener('toggle',()=>{S.folds[k]=d.open;});});}
/* ---------- live flight data folder ---------- */
let _liveT=0;
function tickLive(force){const box=$('tvLive');if(!box||!S.simSt)return;const now=performance.now();if(!force&&now-_liveT<180)return;_liveT=now;const s=S.simSt,e=S.ac.e,g=s.eng[0]||{n1:0,egt:0,ff:0},tp=e.type==='TP',ps=e.type==='PS';
  $('tvPh').textContent=s.phase;
  const rows=[['IAS',fmt(s.ias),'kt'],['Altitude',fmt(Math.round(s.altFt/10)*10),'ft'],['V/S',(s.vs>=0?'+':'')+fmt(Math.round(s.vs/50)*50),'fpm'],['Mach',s.mach.toFixed(2),''],
    [tp?'Torque':ps?'RPM':'N1',ps?fmt(g.rpm):g.n1.toFixed(1),ps?'rpm':'%'],[tp?'ITT':'EGT',fmt(g.egt),'°C'],['Fuel flow',(g.ff*ac_n()/1000).toFixed(1),'t/h'],['FOB',(s.fob).toFixed(1),'t'],
    ['Gear',s.gear>0.98?'Down':s.gear<0.02?'Up':'Transit',''],['Flaps',Math.round(s.flaps*100)+'%',''],['Brakes',fmt(s.brk),'°C'],['Cabin alt',fmt(Math.round(s.cabAlt/50)*50),'ft']];
  if(box.children.length!==rows.length){box.innerHTML=rows.map(()=>`<div><small></small><b></b></div>`).join('');}
  rows.forEach(([l,v,u],i)=>{const d=box.children[i];d.firstChild.textContent=l;d.lastChild.textContent=v+(u?' '+u:'');});}
function ac_n(){return S.ac?S.ac.nEng:1;}
setInterval(()=>{if(S.labVis)tickLive();},200);
/* ---------- right dock tabs: Data · Flight deck · Blueprint ---------- */
function renderDockBp(){const box=$('dockBp');if(!box||!S.ac)return;const ac=S.ac;const bc=S.bpCache[ac.id]||(S.bpCache[ac.id]={t:blueprintSVG(ac,'top'),s:blueprintSVG(ac,'side')});
  box.innerHTML=`<div class="t-head"><div class="t-eyebrow">Generated · to scale</div><h1 class="t-name"></h1></div><details class="fold" open><summary>Top view <span>${ac.S} m span</span></summary><div class="bpv">${bc.t}</div></details><details class="fold" open><summary>Side view <span>${ac.H} m tall</span></summary><div class="bpv">${bc.s}</div></details>
   <details class="fold" open><summary>Key dimensions</summary><dl class="kv"><dt>Length</dt><dd>${ac.L} m</dd><dt>Wingspan</dt><dd>${ac.S} m</dd><dt>Height</dt><dd>${ac.H} m</dd><dt>Fuselage width</dt><dd>${ac.D} m</dd><dt>LE sweep</dt><dd>${ac.sweep}°</dd><dt>Wingtip</dt><dd>${ac.tip}</dd></dl></details>`;box.querySelector('.t-name').textContent=ac.name;}
const DECK_KINDS=[['pfd','PFD'],['nd','ND'],['eng','Engines'],['sys','Systems']];let deckPage='HYD';
function buildDockDeck(){const box=$('dockDeck');if(!box)return;box.innerHTML=`<div class="t-head"><div class="t-eyebrow">Flight deck · live</div><h1 class="t-name" id="ddName"></h1><div class="t-sub" id="ddFam"></div></div>
  <div class="ddgrid">${DECK_KINDS.map(([k,l])=>`<figure class="dd"><canvas data-k="${k}"></canvas><figcaption>${l}</figcaption></figure>`).join('')}</div>
  <div class="pgtabs" role="tablist" aria-label="System page">${SYS_PAGES.map(p=>`<button type="button" role="tab" data-pg="${p}" aria-selected="${p===deckPage}">${p}</button>`).join('')}</div>
  <figure class="dd wide"><canvas data-k="mcp"></canvas><figcaption>Glareshield</figcaption></figure><figure class="dd ovh"><canvas data-k="ovh"></canvas><figcaption>Overhead panel</figcaption></figure>`;
  box.querySelectorAll('[data-pg]').forEach(b=>b.onclick=()=>{deckPage=b.dataset.pg;box.querySelectorAll('[data-pg]').forEach(x=>x.setAttribute('aria-selected',String(x===b)));});}
function tickDockDeck(){if(S.dtab!=='deck'||!S.labVis||!S.ac||!S.simSt)return;const box=$('dockDeck');if(!box.firstChild)buildDockDeck();$('ddName').textContent=S.ac.name;$('ddFam').textContent={ecam:'ECAM glass cockpit · sidestick',eicas:'EICAS glass cockpit · yoke',analog:'Analog round-dial instruments',mil:'HUD & tactical multifunction displays'}[avFam(S.ac)];
  box.querySelectorAll('canvas[data-k]').forEach(cv=>drawPanelInto(cv,cv.dataset.k,S.ac,S.simSt,deckPage));}
setInterval(tickDockDeck,90);
function setDockTab(t){S.dtab=t;document.querySelectorAll('#dtabs [data-dt]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.dt===t)));$('tele').hidden=t!=='data';$('dockDeck').hidden=t!=='deck';$('dockBp').hidden=t!=='bp';if(t==='bp')renderDockBp();if(t==='deck')tickDockDeck();}
document.querySelectorAll('#dtabs [data-dt]').forEach(b=>b.onclick=()=>setDockTab(b.dataset.dt));
/* ---------- bottom deck folder tabs ---------- */
function setDeckTab(t){S.ftab=t;document.querySelectorAll('#ftabs [data-ft]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.ft===t)));document.querySelectorAll('#deck [data-fp]').forEach(p=>p.hidden=p.dataset.fp!==t);try{localStorage.setItem('aerodissect.ftab',t);}catch(e){}}
document.querySelectorAll('#ftabs [data-ft]').forEach(b=>b.onclick=()=>setDeckTab(b.dataset.ft));
try{const t=localStorage.getItem('aerodissect.ftab');if(t&&document.querySelector(`#ftabs [data-ft="${t}"]`))S.ftab=t;}catch(e){}
setDeckTab(S.ftab);
$('labSim').innerHTML=SIM_CTL_HTML;bindSimControls($('labSim'));
/* ---------- compare folder (overlay + split) ---------- */
$('cmpBtn').onclick=e=>{e.stopPropagation();const p=$('cmpPop');p.hidden=!p.hidden;$('cmpBtn').setAttribute('aria-expanded',String(!p.hidden));};
document.addEventListener('click',e=>{const p=$('cmpPop');if(!p.hidden&&!e.target.closest('.cmpfold'))p.hidden=true,$('cmpBtn').setAttribute('aria-expanded','false');});
/* ---------- tree: expand / collapse all ---------- */
$('treeAll').onclick=()=>{const open=$('treeAll').getAttribute('aria-pressed')!=='true';$('treeAll').setAttribute('aria-pressed',String(open));$('treeAll').textContent=open?'Collapse all':'Expand all';
  if(open)Object.values(S.tree.nodes).forEach(n=>{if(n.children.length&&n.level<2)S.open.add(n.id);});else{S.open=new Set(['ac']);}renderTree();syncTree();};
/* ---------- guided teardown: walks L0 → L1 → L2 → L3 through every system ---------- */
const TOUR_PICK={prop:['hpc','fan','comp','prop','cyl','turb'],wing:['flaps','slats','spars'],gear:['brakes','bogie','strut'],cockpit:['panel','ovh'],fus:['frames','floor'],emp:['jack','apu','fin','hs']};
function buildTour(){const st=[[0,null,null,null,3.2]];SYS_ORDER.forEach(sk=>{const n=S.tree.nodes[sk];if(!n||!n.children.length)return;st.push([1,sk,null,null,2.6],[2,sk,null,null,3.6]);
  const pick=(TOUR_PICK[sk]||[]).map(k=>S.tree.nodes[sk+'/'+k]).find(x=>x&&x.children.length)||n.children.find(c=>c.children.length);if(pick)st.push([3,sk,pick.id,(pick.children[Math.min(pick.children.length-1,sk==='prop'?Math.floor(pick.children.length/2):0)]).id,3.6]);});st.push([0,null,null,null,2.5]);return st;}
function setTour(on){if(on){S.tour={steps:buildTour(),i:-1,t:0};SIM.playing=true;document.querySelectorAll('[data-sim=play]').forEach(b=>b.dispatchEvent(new Event('simsync')));}else S.tour=null;
  $('tglTour').setAttribute('aria-pressed',String(!!S.tour));$('tglTour').textContent=S.tour?'Stop teardown':'Run guided teardown';$('tourRead').textContent=S.tour?'':'Walks every system from airframe to live part.';}
function tourTick(dt){const T=S.tour;if(!T)return;T.t-=dt;if(T.t>0)return;T.i++;if(T.i>=T.steps.length){setTour(false);return;}const [lv,sys,l2,l3,dur]=T.steps[T.i];T.t=dur;
  if(lv===2){go(2,sys);setExplode(0);setTimeout(()=>{if(S.tour)setExplode(70);},500);}else if(lv===3)go(3,sys,l2,l3);else if(lv===1)go(1,sys);else{go(0);setExplode(0);}
  $('tourRead').textContent=`Step ${T.i+1} of ${T.steps.length} · ${lv?S.tree.nodes[l3||sys].name:S.ac.name}`;}
$('tglTour').onclick=()=>setTour(!S.tour);
renderer.domElement.addEventListener('pointerdown',()=>{if(S.tour)setTour(false);});
/* ---------- layer switches mirror the legacy toggles ---------- */
[['swFlow','tglFlow','flow'],['swHeat','tglHeat','thermal'],['swSpin','tglSpin','anim']].forEach(([sw,tg,k])=>{$(sw).onchange=()=>{if($(sw).checked!==!!S[k])$(tg).click();};});
new MutationObserver(()=>{$('tglSplit').textContent=$('tglSplit').getAttribute('aria-pressed')==='true'?'On':'Off';}).observe($('tglSplit'),{attributes:true,attributeFilter:['aria-pressed']});

/* ---------- callout columns with elbow leaders (technical-illustration layout) ---------- */
const callSvg=document.createElementNS('http://www.w3.org/2000/svg','svg');callSvg.setAttribute('class','callsvg');$('labels').prepend(callSvg);
function layoutCallouts(pl){if(!callSvg.isConnected)$('labels').prepend(callSvg);const groups=new Map();pl.forEach(q=>{if(!groups.has(q.rc))groups.set(q.rc,[]);groups.get(q.rc).push(q);});let d='',dots='';
  groups.forEach((list,rc)=>{const wide=rc.w>=620&&list.length>1;
    if(!wide){list.sort((a,b)=>a.y-b.y);for(let i=0;i<list.length;i++)for(let j=0;j<i;j++){const a=list[j],b=list[i];if(Math.abs(b.y-a.y)<22&&b.x<a.x+a.l.w+4&&a.x<b.x+b.l.w+4)b.y=a.y+22;}
      list.forEach(q=>{q.l.el.style.transform=`translate(${clamp(Math.min(q.x,rc.x+rc.w-q.l.w-4),rc.x,1e5).toFixed(1)}px,${clamp(q.y,rc.y,rc.y+rc.h-20).toFixed(1)}px)`;});return;}
    const cx=list.reduce((s,q)=>s+q.x,0)/list.length,sides={L:list.filter(q=>q.x<cx),R:list.filter(q=>q.x>=cx)};
    if(!sides.L.length||!sides.R.length){list.sort((a,b)=>a.x-b.x);const h=Math.ceil(list.length/2);sides.L=list.slice(0,h);sides.R=list.slice(h);}
    ['L','R'].forEach(sd=>{const arr=sides[sd].sort((a,b)=>a.y-b.y);if(!arr.length)return;const top=rc.y+(sd==='R'?132:56),bot=rc.y+rc.h-58,H=Math.max(40,bot-top);
      const gap=Math.min(26,H/arr.length);let y=-1e9;arr.forEach(q=>{q.ty=Math.max(q.y,y+gap,top);y=q.ty;});const over=y-bot;if(over>0){const span=Math.max(0,arr[arr.length-1].ty-arr[0].ty);arr.forEach((q,i)=>{q.ty=top+i*Math.min(gap,(bot-top)/Math.max(arr.length-1,1));});}
      arr.forEach(q=>{const w=Math.min(q.l.w,232);q.tx=sd==='L'?rc.x+62:rc.x+rc.w-14-w;q.l.el.style.maxWidth='232px';q.l.el.style.transform=`translate(${q.tx.toFixed(1)}px,${q.ty.toFixed(1)}px)`;
        const ex=sd==='L'?q.tx+w:q.tx,ey=q.ty+11,ax=q.x,ay=q.y+10,mx=sd==='L'?ex+14:ex-14;d+=`M${ex.toFixed(1)} ${ey.toFixed(1)}H${mx.toFixed(1)}L${ax.toFixed(1)} ${ay.toFixed(1)}`;dots+=`<circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="2.6"/>`;});});});
  callSvg.innerHTML=d?`<path d="${d}"/>${dots}`:'';}
/* =====================================================================
   SPLIT-SCREEN DISSECTION  +  CROSS-SECTION SLICING PLANE
   Both panes share one camera and world units (metres), so every pair of
   aircraft, engines, wings or gear legs is shown at identical scale.
   ===================================================================== */
const groupA=grp(),groupB=grp();scene.add(groupA,groupB);
[rootAir,rootCmp,rootAsm,rootMic,leaders].forEach(o=>groupA.add(o));
const rootAirB=grp(),rootAsmB=grp(),rootMicB=grp();groupB.add(rootAirB,rootAsmB,rootMicB);groupB.visible=false;
const leadersB=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({color:0xe8730c,dashSize:0.15,gapSize:0.1,transparent:true,opacity:0.7}));leadersB.frustumCulled=false;groupB.add(leadersB);
const SKIN_B=MAT.skin.clone(),SKIN_CUT_B=SKIN_CUT.clone();
const SB={on:false,ac:null,AF:null,tree:null,asm:null,asmSys:null,mic:null,sys:null,l2:null,l3:null,flowObj:null,note:''};
function curRootB(){return S.level<=1?rootAirB:S.level===2?rootAsmB:rootMicB;}

/* ---------- pane geometry: side-by-side (landscape) or stacked (portrait) ---------- */
function paneRects(){const w=host.clientWidth||1,h=host.clientHeight||1;
  if(!SB.on)return {A:{x:0,y:0,w,h},dir:null};
  if(w>=h*0.9){const hw=Math.floor(w/2);return {A:{x:0,y:0,w:hw,h},B:{x:hw,y:0,w:w-hw,h},dir:'h'};}
  const hh=Math.floor(h/2);return {A:{x:0,y:0,w,h:hh},B:{x:0,y:hh,w,h:h-hh},dir:'v'};}

/* ---------- scale per micro part, so Level 3 also compares 1:1 ---------- */
function microScale(n,ac){const e=ac.e,R=(e.dia||1)/2,st=(n.p||{}).stage;
  if(n.sys==='prop'){if(e.type==='TP'||e.type==='PS')return n.kind==='pprop'||n.kind==='propblade'?R/1.7:Math.max(R*0.22,0.12);
    return R*({fan:1,lpc:0.55,hpc:0.4,hpt:0.34,lpt:0.5}[st]||0.5);}
  if(n.sys==='gear')return wheelR(ac)/0.8;
  if(n.sys==='wing')return ac.S/34;
  return ac.D/4;}

/* ---------- node equivalence between the two airframes ---------- */
function eqL2(sys,idA){const pB=SB.tree.nodes[sys];if(!idA||!pB)return null;if(SB.tree.nodes[idA])return {id:idA,exact:true};
  const a=S.tree.nodes[idA];const c=pB.children.find(x=>x.kind===a.kind)||pB.children.find(x=>x.key===a.key)||pB.children[Math.min(pB.children.indexOf(a),pB.children.length-1)]||pB.children[0];return c?{id:c.id,exact:false}:null;}
function eqL3(l2B,idA){const a=S.tree.nodes[idA],pB=SB.tree.nodes[l2B];if(!a||!pB||!pB.children.length)return null;
  const same=SB.tree.nodes[idA];if(same&&same.parent.id===l2B)return {id:idA,exact:true};
  const st=(a.p||{}).stage;const c=pB.children.find(x=>x.kind===a.kind&&(x.p||{}).stage===st&&x.idx===a.idx)||pB.children.find(x=>x.kind===a.kind&&(x.p||{}).stage===st&&x.idx===Math.min(a.idx,pB.children.length-1))||pB.children.find(x=>x.kind===a.kind)||pB.children[Math.min(a.idx,pB.children.length-1)];
  return {id:c.id,exact:false};}
function mapBtoA(idB){if(!idB||S.tree.nodes[idB])return idB;const b=SB.tree.nodes[idB];if(!b)return null;const p=S.tree.nodes[b.sys];if(!p)return b.sys;
  const c=p.children.find(x=>x.kind===b.kind)||p.children.find(x=>x.key===b.key);if(b.level===2)return c?c.id:b.sys;
  const p2=S.tree.nodes[mapBtoA(b.parent.id)];if(p2&&p2.children.length){const m=p2.children.find(x=>x.kind===b.kind)||p2.children[0];return m.id;}return b.sys;}
function syncB(){
  if(!SB.on||!SB.AF){groupB.visible=false;return;}
  const L=S.level;SB.sys=S.sys;SB.l2=null;SB.l3=null;SB.note='';
  if(L>=2&&S.l2){const m=eqL2(S.sys,S.l2);SB.l2=m&&m.id;if(m&&!m.exact)SB.note='nearest equivalent';}
  if(L===2&&(!SB.asm||SB.asmSys!==S.sys)){disposeGroup(rootAsmB);SB.asm=buildAssembly(SB.ac,S.sys,SB.AF);SB.asmSys=S.sys;rootAsmB.add(SB.asm.group);}
  if(L===3){disposeGroup(rootMicB);SB.mic=null;const m=SB.l2&&eqL3(SB.l2,S.l3);
    if(m){SB.l3=m.id;if(!m.exact)SB.note='nearest equivalent';const n=SB.tree.nodes[m.id];SB.mic=micro(n,SB.ac);SB.mic.g.scale.setScalar(microScale(n,SB.ac));rootMicB.add(SB.mic.g);SB.mic.map=new Map();SB.mic.parts.forEach(([o,nm])=>SB.mic.map.set(o,nm));}
    else SB.note='no equivalent part';}
  rootAirB.visible=L<=1;rootAsmB.visible=L===2;rootMicB.visible=L===3&&!!SB.mic;
  Object.entries(SB.AF.inner).forEach(([k,g])=>g.visible=L===1&&k===S.sys);
  rootAirB.position.y=S.AF.groundY-SB.AF.groundY;
}
function applyLookB(){
  const m0=MAT.skin;SKIN_B.transparent=m0.transparent;SKIN_B.opacity=m0.opacity;SKIN_B.depthWrite=m0.depthWrite;SKIN_B.wireframe=m0.wireframe;SKIN_B.needsUpdate=true;SKIN_CUT_B.color.copy(SKIN_B.color);
  const sel=S.level===1?SB.AF.sys[S.sys]:null;
  curRootB().traverse(o=>{if(!(o.isMesh||o.isInstancedMesh))return;const u=o.userData;if(!u.mat0)return;let m=u.mat0;
    if(S.level===1&&!isUnder(o,sel))m=GHOST;
    else if(S.thermal&&!(u.skin&&S.xray>30))m=heatMat(u.temp??0.06);
    else if(u.skin)m=S.level===1?SKIN_CUT_B:SKIN_B;
    o.material=m;});
}
function buildFlowB(){
  if(SB.flowObj){SB.flowObj.dispose();SB.flowObj=null;}if(!S.flow||!SB.on||!SB.AF)return;
  let descs=[],parent,size;
  if(S.level<=1){const b=boxOf(SB.AF.root),sz=b.getSize(V()),L=SB.ac.L,oy=rootAirB.position.y;b.translate(V(0,-oy,0));
    descs.push({type:'free',n:1400,box:[b.max.x+L*0.25,b.min.x-L*0.6,b.min.y,b.max.y+sz.y*0.2,b.min.z,b.max.z],speed:L*0.8,color:[1,0.72,0.1]});
    SB.AF.engs.forEach(g=>{const ex=g.userData.exit;if(ex)descs.push({type:'plume',n:200,p:ex,r:Math.max(nacDia(SB.ac.e)*0.3,0.3),len:L*0.6,speed:L*1.2,cold:SB.ac.e.type==='PS'});});
    parent=SB.AF.root;size=Math.max(S.ac.L,SB.ac.L)*0.02;}
  else if(S.level===2&&SB.asm){descs=SB.asm.flows;parent=SB.asm.group;size=(S.frameR||5)*0.022;}
  else if(SB.mic){descs=SB.mic.flows;parent=SB.mic.g;size=Math.max(S.frameR||1,0.5)*0.03/Math.max(SB.mic.g.scale.x,0.01);}
  if(descs&&descs.length&&parent){SB.flowObj=new Flow(descs.map(makeEmitter),size||0.1);parent.add(SB.flowObj.pts);}
}
function labelsB(add){
  if(S.level<=1)SYS_ORDER.forEach(k=>{const c=SB.AF.centers[k].clone();const n=SB.tree.nodes[k];add(n.name.replace(/ \(.+\)$/,''),()=>c.clone().add(rootAirB.position),k,S.level===1&&k===S.sys);});
  if(S.level===2&&SB.asm)Object.entries(SB.asm.parts).forEach(([k,p])=>{const id=SB.asm.sys+'/'+k,n=SB.tree.nodes[id];if(!n)return;add(n.name,()=>p.localToWorld(p.userData.cLocal.clone()),id,SB.l2===id);});
  if(S.level===3&&SB.mic){const dirs=[V(0,1,0),V(0,-1,0),V(0,0,1),V(0,0,-1),V(0.6,0.8,0),V(-0.6,-0.8,0),V(0.5,0,0.85),V(-0.5,0,-0.85)];
    SB.mic.parts.forEach(([o,name],i)=>{const b=boxOf(o);const c=b.isEmpty()?o.getWorldPosition(V()):b.getCenter(V());if(!b.isEmpty()){const hs=b.getSize(V()).multiplyScalar(0.5);const d=dirs[i%dirs.length];c.add(V(d.x*hs.x,d.y*hs.y,d.z*hs.z).multiplyScalar(0.85));}const loc=o.worldToLocal(c.clone());add(name,()=>o.localToWorld(loc.clone()),null);});}
}
function bNodeId(){return SB.l3||SB.l2||SB.sys||'ac';}
function updateSplitUI(){
  const ui=$('splitUI');if(!ui)return;ui.hidden=!SB.on;$('hint').style.visibility=SB.on?'hidden':'';$('labels').classList.toggle('compact',SB.on);if(!SB.on||!SB.ac||!S.ac)return;const R=paneRects();ui.dataset.dir=R.dir||'h';
  const nA=S.tree.nodes[curNodeId()],nB=SB.tree.nodes[bNodeId()];
  $('capAac').textContent=S.ac.name;$('capApart').textContent=nA.level?nA.name:'Complete aircraft';
  $('capBac').textContent=SB.ac.name;$('capBpart').textContent=S.level===3&&!SB.mic?'—':(nB.level?nB.name:'Complete aircraft');$('capBnote').textContent=SB.note;$('capBnote').hidden=!SB.note;
  const cell=S.gridCell;$('scaleNote').textContent=cell?`Same camera · same scale · grid cell ${cell>=1?cell.toFixed(1)+' m':(cell*100).toFixed(0)+' cm'}${S.level===3?' (parts scaled to real size)':''}`:'';
}
function renderSplitTele(){
  const box=$('tvSplit');if(!box)return;box.innerHTML='';if(!SB.on||!SB.tree)return;
  const nA=S.tree.nodes[curNodeId()],nB=SB.tree.nodes[bNodeId()];if(!nA||!nB)return;
  const a=specFor(nA,S),b=specFor(nB,SB);
  const sec=document.createElement('section');sec.className='sect';
  sec.innerHTML=`<h3>Split view · A vs B <span>1 : 1 scale</span></h3><p class="note"></p>`;
  sec.querySelector('p').textContent=`B shows ${nB.level?nB.name:SB.ac.name}${nB.level?' on the '+SB.ac.name:''}${SB.note?' ('+SB.note+')':''}.`;
  const tb=document.createElement('table');tb.className='ctable';tb.innerHTML=`<thead><tr><th>Metric</th><th>A</th><th>B</th></tr></thead>`;const body=document.createElement('tbody');
  const f=r=>r?(typeof r.v==='number'?fmt(r.v,r.d)+(r.u?' '+r.u:''):String(r.v)):'—';
  const rows=[['OEM',{v:a.oem},{v:b.oem}],...a.rows.map(r=>[r.l,r,b.rows.find(x=>x.l===r.l)])];
  b.rows.forEach(r=>{if(!a.rows.some(x=>x.l===r.l))rows.push([r.l,null,r]);});
  rows.forEach(([l,ra,rb])=>{const tr=document.createElement('tr');const num=ra&&rb&&typeof ra.v==='number'&&typeof rb.v==='number'&&ra.u===rb.u&&Math.max(ra.v,rb.v)>0;
    tr.innerHTML=`<td>${esc(l)}${num?`<div class="cb"><i style="width:${(ra.v/Math.max(ra.v,rb.v)*50).toFixed(1)}%;background:var(--cyan)"></i><i style="width:${(rb.v/Math.max(ra.v,rb.v)*50).toFixed(1)}%;background:var(--gold)"></i></div>`:''}</td><td class="a">${esc(f(ra))}</td><td class="b">${esc(f(rb))}</td>`;body.appendChild(tr);});
  tb.appendChild(body);sec.appendChild(tb);box.appendChild(sec);
}
function setSplitAircraft(id,silent){
  const ac=FLEET_BY_ID[id];if(!ac)return;SB.ac=ac;$('splitSel').value=id;
  if(SB.flowObj){SB.flowObj.dispose();SB.flowObj=null;}
  disposeGroup(rootAirB);disposeGroup(rootAsmB);disposeGroup(rootMicB);SB.asm=null;SB.asmSys=null;SB.mic=null;
  applySkin(SKIN_B,ac);SB.AF=buildAirframe(ac);rootAirB.add(SB.AF.root);SB.AF.explodables=[];SB.AF.root.traverse(o=>{if(o.userData.ex)SB.AF.explodables.push(o);});
  SB.tree=buildTree(ac);try{localStorage.setItem('aerodissect.split',id);}catch(e){}
  if(!silent&&SB.on)go(S.level,S.sys,S.l2,S.l3);
}
function setSplit(on){
  SB.on=on;$('tglSplit').setAttribute('aria-pressed',String(on));$('splitSel').disabled=!on;
  if(on&&!SB.ac){let id='';try{id=localStorage.getItem('aerodissect.split')||'';}catch(e){}if(!FLEET_BY_ID[id]||id===S.ac.id)id=S.ac.id==='a20n'?'b77w':'a20n';setSplitAircraft(id,true);}
  if(!on&&SB.flowObj){SB.flowObj.dispose();SB.flowObj=null;}
  groupB.visible=on;resize();go(S.level,S.sys,S.l2,S.l3);
}

/* ---------- cross-section slicing plane ---------- */
renderer.localClippingEnabled=true;
const CLIP={on:false,axis:'x',pos:50,flip:false,scan:false,box:new THREE.Box3(),dirty:true,frame:0};
const clipPlane=new THREE.Plane(V(-1,0,0),0),slabPlane=new THREE.Plane(V(1,0,0),0),clipArr=[clipPlane];
const CONTOUR=new THREE.MeshBasicMaterial({color:0x1f5fe0,side:THREE.DoubleSide,clippingPlanes:[clipPlane,slabPlane],polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4,depthWrite:false,fog:false});
const scanPlane=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:0x1f5fe0,transparent:true,opacity:0.05,side:THREE.DoubleSide,depthWrite:false,fog:false}));
const scanEdge=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(1,1)),new THREE.LineBasicMaterial({color:0x1f5fe0,transparent:true,opacity:0.75,fog:false}));
scanPlane.add(scanEdge);const scanGrid=new THREE.GridHelper(1,16,0x1f5fe0,0x1f5fe0);scanGrid.rotation.x=Math.PI/2;scanGrid.material.transparent=true;scanGrid.material.opacity=0.12;scanGrid.material.fog=false;scanPlane.add(scanGrid);
scanPlane.visible=false;scene.add(scanPlane);
function applyClip(){
  const seen=new Set();
  [groupA,groupB].forEach(g=>g.traverse(o=>{const m=o.material;if(!m||o.isLine||seen.has(m))return;seen.add(m);const has=!!(m.clippingPlanes&&m.clippingPlanes.length);if(CLIP.on!==has){m.clippingPlanes=CLIP.on?clipArr:[];m.needsUpdate=true;}}));
}
function refreshClipBox(){const b=boxOf(curRoot());if(SB.on&&SB.AF){const r=curRootB();if(r.visible){const bb=boxOf(r);if(!bb.isEmpty())b.union(bb);}}if(!b.isEmpty())CLIP.box.copy(b);CLIP.dirty=false;}
function updateClipPlane(){
  const b=CLIP.box;if(b.isEmpty())return;const ax=CLIP.axis,f=CLIP.pos/100,v=lerp(b.min[ax],b.max[ax],f);
  const n=V(ax==='x'?-1:0,ax==='y'?-1:0,ax==='z'?-1:0);if(CLIP.flip)n.negate();const c=CLIP.flip?-v:v;clipPlane.set(n,c);
  const sz=b.getSize(V()),w=Math.max(sz.length(),0.05)*0.0045+0.003;slabPlane.set(n.clone().negate(),w-c);
  const ctr=b.getCenter(V());ctr[ax]=v;scanPlane.position.copy(ctr);scanPlane.rotation.set(0,0,0);
  if(ax==='x'){scanPlane.rotation.y=Math.PI/2;scanPlane.scale.set(sz.z*1.08,sz.y*1.08,1);}else if(ax==='y'){scanPlane.rotation.x=-Math.PI/2;scanPlane.scale.set(sz.x*1.08,sz.z*1.08,1);}else scanPlane.scale.set(sz.x*1.08,sz.y*1.08,1);
  const label={x:'Longitudinal (X)',y:'Vertical (Y)',z:'Lateral (Z)'}[ax];$('outClip').textContent=`${(v>=0?'+':'')+v.toFixed(Math.abs(v)<10?2:1)} m`;$('outClip').title=label+' slice position';
}
function clipTick(now,dt){
  if(!CLIP.on){scanPlane.visible=false;return;}scanPlane.visible=true;
  if(CLIP.dirty||(++CLIP.frame%40===0&&Math.abs(S.explode-S.exCur)>0.002)||(S.tw&&CLIP.frame%10===0))refreshClipBox();
  if(CLIP.scan&&S.anim){CLIP.pos=50+48*Math.sin(now/1000*0.55);const r=$('rngClip');r.value=Math.round(CLIP.pos);setRangeFill(r);}
  updateClipPlane();
}
function renderPanes(){
  const R=paneRects(),w=host.clientWidth,h=host.clientHeight;
  const pass=()=>{renderer.render(scene,camera);
    if(CLIP.on){const hid=[grid,shadow,scanPlane,leaders,leadersB,boxHelper,S.flowObj&&S.flowObj.pts,SB.flowObj&&SB.flowObj.pts].filter(Boolean),vis=hid.map(o=>o.visible);
      hid.forEach(o=>o.visible=false);scene.overrideMaterial=CONTOUR;const bg=scene.background,ac=renderer.autoClear;scene.background=null;renderer.autoClear=false;
      renderer.render(scene,camera);renderer.autoClear=ac;scene.background=bg;scene.overrideMaterial=null;hid.forEach((o,i)=>o.visible=vis[i]);}};
  if(!R.B){renderer.setScissorTest(false);renderer.setViewport(0,0,w,h);groupA.visible=true;groupB.visible=false;pass();return;}
  renderer.setScissorTest(true);
  [['A',groupA,groupB],['B',groupB,groupA]].forEach(([k,show,hide])=>{const r=R[k];show.visible=true;hide.visible=false;const gy=h-(r.y+r.h);renderer.setViewport(r.x,gy,r.w,r.h);renderer.setScissor(r.x,gy,r.w,r.h);pass();});
  groupA.visible=true;groupB.visible=true;renderer.setScissorTest(false);
}

/* ---------- UI wiring ---------- */
const splitSel=$('splitSel');splitSel.innerHTML=cmpSel.innerHTML;splitSel.querySelector('option[value=""]')?.remove();
$('tglSplit').onclick=()=>setSplit(!SB.on);
splitSel.onchange=()=>setSplitAircraft(splitSel.value);
$('btnSwap').onclick=()=>{if(!SB.on||!SB.ac)return;const a=S.ac.id,b=SB.ac.id,lv=[S.level,S.sys,S.l2,S.l3];setSplitAircraft(a,true);setAircraft(b);
  const n=S.tree.nodes[lv[3]||lv[2]||lv[1]||'ac'];if(n&&lv[0])navNode(n.id);else if(lv[1]&&lv[0])go(lv[0]>=1?1:0,lv[1]);};
$('tglClip').onclick=()=>{CLIP.on=!CLIP.on;$('tglClip').setAttribute('aria-pressed',String(CLIP.on));$('clipCtl').classList.toggle('off',!CLIP.on);CLIP.dirty=true;applyClip();if(CLIP.on){refreshClipBox();updateClipPlane();}};
document.querySelectorAll('#clipCtl [data-ax]').forEach(b=>b.onclick=()=>{CLIP.axis=b.dataset.ax;document.querySelectorAll('#clipCtl [data-ax]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));if(!CLIP.on)$('tglClip').click();});
$('rngClip').oninput=e=>{CLIP.pos=+e.target.value;CLIP.scan=false;$('tglScan').setAttribute('aria-pressed','false');setRangeFill(e.target);if(!CLIP.on)$('tglClip').click();};
$('btnFlip').onclick=()=>{CLIP.flip=!CLIP.flip;$('btnFlip').setAttribute('aria-pressed',String(CLIP.flip));if(!CLIP.on)$('tglClip').click();};
$('tglScan').onclick=()=>{CLIP.scan=!CLIP.scan;$('tglScan').setAttribute('aria-pressed',String(CLIP.scan));if(CLIP.scan&&!CLIP.on)$('tglClip').click();};
$('rngExplode').addEventListener('change',()=>{CLIP.dirty=true;});
new ResizeObserver(resize).observe(host);resize();setRangeFill($('rngClip'));
/* =====================================================================
   INTEGRATED WORKBENCH — ATA iSpec 2200 chapters, chip navigation,
   stage overlays, coupled-equation readout, KPI strip, thrust lever.
   ===================================================================== */
const ATA_SYS={prop:ac=>ac.e.type==='PS'?'85':ac.e.type==='TP'?'72 / 61':'72',wing:()=>'57 / 27',gear:()=>'32',cockpit:()=>'31 / 34',fus:()=>'53',emp:()=>'55'};
const ATA_L2={prop:{nac:'71-10',fan:'72-21',fdgs:'72-22',lpc:'72-32',hpc:'72-30',comb:'72-40',hpt:'72-50',lpt:'72-52',exh:'78-30',tprop:'61-10',rgb:'72-10',comp:'72-30',turb:'72-50',stub:'78-10',prop:'61-10',crank:'85-10',cyl:'85-20',cam:'85-30',intake:'71-30',ab:'72-70',noz:'78-30',bypass:'72-35'},
  wing:{spars:'57-10',ribs:'57-20',tanks:'28-10',slats:'27-80',flaps:'27-50',ail:'27-10',spl:'27-60',tip:'57-30'},
  gear:{strut:'32-10',torque:'32-11',brace:'32-12',act:'32-30',bogie:'32-15',brakes:'32-40',nose:'32-50'},
  cockpit:{radome:'34-41',panel:'31-60',ctl:'27-90',seats:'25-10',ovh:'31-10',eebay:'31-30',droop:'52-80',visor:'52-30'},
  fus:{frames:'53-10',bulk:'53-60',floor:'53-30',ecs:'21-50',cargo:'25-50',cabin:'25-20'},
  emp:{fin:'55-30',rudder:'55-40',hs:'55-10',elev:'55-20',jack:'27-40',apu:'49-10',trim:'28-20',canard:'55-50',beaver:'55-60',drag:'27-20',elevon:'27-30'}};
function ataOf(node,ac){if(!node||node.level===0)return 'ATA 00-00';const sys=node.sys;if(node.level===1)return 'ATA '+ATA_SYS[sys](ac);
  const c=(ATA_L2[sys]||{})[node.key]||(ATA_SYS[sys](ac).split(' ')[0]+'-00');if(node.level===2)return 'ATA '+c;return 'ATA '+c+'-'+String((node.idx||0)+1).padStart(2,'0');}
const ataShort=(node,ac)=>ataOf(node,ac).replace(/-\d\d$/,m=>node&&node.level===3?m:m);
function ataMode(node){if(!node||node.level===0)return 'FULL AIRFRAME · AXIAL + RADIAL + KINEMATIC';if(node.level===1)return 'SYSTEM GHOST CUTAWAY · CONTEXT LOCKED';if(node.level===2)return 'SUB-ASSEMBLY · CONSTRAINT EXPLODE';return 'PART ISOLATION · LIVE MECHANISM';}
/* ---------- unit-aware formatting ---------- */
const IMP=()=>S.units==='imperial';
function uLen(m){return IMP()?fmt(m*3.28084,m*3.28084<100?1:0)+' ft':(m<10?m.toFixed(2):m<100?m.toFixed(1):fmt(m))+' m';}
function uMass(t){return IMP()?fmt(t*2204.62)+' lb':fmt(t,t<10?2:1)+' t';}
function uThr(kN,e){if(e.type==='TP'||e.type==='PS')return fmt(kN)+' '+thrustUnit(e);return IMP()?fmt(kN*224.809)+' lbf':kN.toFixed(1)+' kN';}
/* ---------- header, chip rows ---------- */
const WB_PICKS=['a20n','b77w','a359','b789','a388','at76','conc','f35'];
const WB_CHAP=[['ac','Level 0 · Full airframe'],['prop',null],['wing','ATA 57/27 · Wing box & high-lift'],['gear','ATA 32 · Landing gear'],['cockpit','ATA 31/34 · Flight deck'],['fus','ATA 53 · Fuselage'],['emp','ATA 55 · Empennage']];
function wbChapLabel(k,ac){if(k!=='prop')return WB_CHAP.find(c=>c[0]===k)[1];const t=ac.e.type;return t==='TF'||t==='TFI'?'ATA 72 · Turbofan internals':t==='TP'?'ATA 72/61 · Turboprop & propeller':t==='PS'?'ATA 85 · Piston engine':'ATA 72 · Afterburning engine';}
function engShort(e){return e.oem.replace(' International','').replace(' Aerospace','').replace('Pratt & Whitney Canada','P&WC').replace('Pratt & Whitney','P&W').replace('Rolls-Royce Deutschland','Rolls-Royce').split(' (')[0].split(' / ')[0];}
function renderWbHead(){const ac=S.ac,e=ac.e;if(!ac)return;
  $('wbTitle').innerHTML=`${esc(ac.name)} <span>— ${esc(engShort(e))} ${esc(e.name)}</span>`;
  const bits=[];if(e.type==='TF'||e.type==='TFI'){bits.push(`${e.bpr}:1 bypass ratio`);if(e.blades)bits.push(`${e.blades} ${/GE|CFM/.test(e.oem)&&e.bpr>8?'3D-CFRP':'titanium'} fan blades`);}else if(e.type==='TP')bits.push(`${fmt(e.thrust)} shp`,`${e.blades}-blade propeller`);else if(e.type==='PS')bits.push(`${e.st.cyl} cylinders`,`${e.thrust} hp`);else bits.push(`${fmt(e.thrust)} kN with reheat`,`OPR ${e.opr}:1`);
  bits.push(`${ac.nEng} engine${ac.nEng>1?'s':''}`);
  $('wbSub').textContent=bits.join(' · ');
  const picks=[ac.id,...WB_PICKS.filter(id=>id!==ac.id)].slice(0,7);
  $('wbAc').innerHTML=picks.map(id=>{const a=FLEET_BY_ID[id];const nm=a.name.replace(a.mfr+' ','').replace('Lockheed Martin ','');return `<button type="button" class="chip${id===ac.id?' on':''}" data-ac="${id}" aria-pressed="${id===ac.id}">${esc(/^\d/.test(nm)?a.name:nm)} <small>[${esc(a.e.name.split(' ')[0])}]</small></button>`;}).join('')
    +`<button type="button" class="chip ghost" id="wbAll">All 74 aircraft ▾</button><button type="button" class="chip${S.cmp?' on':''}" id="wbGhost" aria-pressed="${!!S.cmp}">1:1 scale ghost${S.cmp?' · '+esc(FLEET_BY_ID[S.cmp].name.replace(FLEET_BY_ID[S.cmp].mfr+' ','')):''}</button><button type="button" class="chip${SB.on?' on':''}" id="wbSplit" aria-pressed="${SB.on}">Split view</button>`;
  $('wbAc').querySelectorAll('[data-ac]').forEach(b=>b.onclick=()=>setAircraft(b.dataset.ac));
  $('wbAll').onclick=e=>{e.stopPropagation();toggleFleet(true);};
  $('wbGhost').onclick=()=>{setCompare(S.cmp?'':(S.ac.id==='b77w'?'a388':'b77w'));if(S.level!==0)go(0);renderWbHead();};
  $('wbSplit').onclick=()=>{$('tglSplit').click();setTimeout(renderWbHead,50);};
  renderWbChips();}
function renderWbChips(){const ac=S.ac,cur=S.level===0?'ac':S.sys;
  $('wbChap').innerHTML=WB_CHAP.map(([k])=>`<button type="button" class="chip${k===cur?' on':''}" data-ch="${k}" aria-pressed="${k===cur}">${esc(wbChapLabel(k,ac))}</button>`).join('');
  $('wbChap').querySelectorAll('[data-ch]').forEach(b=>b.onclick=()=>{const k=b.dataset.ch;if(k==='ac'){go(0);}else go(2,k);});}
/* ---------- stage overlays ---------- */
function renderOverlays(){const n=S.tree.nodes[curNodeId()],ac=S.ac;if(!n)return;
  $('ovSelK').textContent=S.level===0?'Selected ATA assembly':S.level===3?'Isolated ATA part':'Selected ATA sub-assembly';
  $('ovSelV').textContent=ataOf(n,ac);
  const e=ac.e,F=fuseDef(ac);$('ovFoot').textContent=`L ${uLen(ac.L)} · b ${uLen(ac.S)} · h ${uLen(ac.H)} · Ø fus ${uLen(ac.D)} · Ø ${e.type==='TP'||e.type==='PS'?'prop':'fan'} ${uLen(e.dia)}`;}
/* ---------- coupled equation + KPI strip (live) ---------- */
let _wbT=0;
function tickWb(force){const now=performance.now();if(!force&&now-_wbT<140)return;_wbT=now;if(!S.ac||!S.simSt||!S.labVis)return;
  const s=S.simSt,ac=S.ac,e=ac.e,g=s.eng[0]||{n1:0,n2:0,egt:0,ff:0},tp=e.type==='TP',ps=e.type==='PS';
  const sub=k=>`<i>N</i><sub>${k}</sub>`;
  $('ovEq').innerHTML=ps?`RPM = ${fmt(g.rpm)} · MAP = ${g.mp.toFixed(1)} inHg · EGT = ${fmt(g.egt)}°C`:tp?`TRQ = ${g.trq.toFixed(1)}% · ${sub('P')} = ${fmt(g.np)} rpm · ITT = ${fmt(g.egt)}°C`:`${sub(1)} = ${g.n1.toFixed(1)}% · ${sub(2)} = ${g.n2.toFixed(1)}% · EGT = ${fmt(g.egt)}°C`;
  $('ovMode').textContent=`${s.phase} · ${s.mode}${SIM.tlaOn?' · TLA MAN':''}`;
  const hydNames=ac.deck==='fighter'?'FLT A / FLT B / UTIL':ac.ctl==='side'?'GRN / BLU / YLW + PTU':ac.nEng>=4&&ac.mfr==='Boeing'?'SYS 1 / 2 / 3 / 4':'L / C / R';
  const hyd=s.engRun?s.hydNom-Math.round(Math.abs(Math.sin(s.u*70))*20):Math.round(s.hydNom*0.94);
  const set=(id,v,sm)=>{const el=$(id);if(el.firstChild&&el.firstChild.nodeValue===v)return;el.innerHTML='';el.append(document.createTextNode(v));if(sm){const x=document.createElement('small');x.textContent=sm;el.append(x);}};
  set('kN1',ps?fmt(g.rpm):(tp?g.trq:g.n1).toFixed(1),ps?' rpm':'%');$('kN1s').textContent=`${uThr(s.thrust,e)} per engine · ${s.mode}`;
  $('kN1k').innerHTML=ps?'Crankshaft RPM / power':tp?'Torque / shaft power':`LP spool ${sub(1)} / thrust`;
  set('kN2',ps?g.mp.toFixed(1):tp?fmt(g.np):g.n2.toFixed(1),ps?' inHg':tp?' rpm':'%');$('kN2k').innerHTML=ps?'Manifold pressure':tp?`Propeller ${sub('P')}`:`HP core ${sub(2)} speed`;$('kN2s').textContent=ps?`${e.st.cyl}-cylinder ${e.flags==='radial'?'radial':'flat'}`:tp?`${e.blades}-blade · ${e.st.lpc?e.st.lpc+' axial + centrifugal':e.st.hpc+'-stage axial'}`:`${e.st.hpc}-stage HPC · OPR ${e.opr}:1`;
  set('kEgt',fmt(g.egt),' °C');$('kEgtk').textContent=tp?'Inter-turbine temp (ITT)':'Exhaust gas temp (EGT)';$('kEgts').textContent=e.egt?`Max limit ${fmt(e.egt)} °C · ${Math.round(clamp(g.egt/e.egt,0,1.2)*100)}%`:'Piston engine';
  const eb=$('kEgtBar');eb.style.width=clamp(e.egt?g.egt/e.egt*100:0,0,100).toFixed(1)+'%';eb.dataset.hot=String(e.egt&&g.egt/e.egt>0.92);
  set('kHyd',s.hydNom?fmt(hyd):'—',s.hydNom?' psi':'');$('kHyds').textContent=s.hydNom?hydNames:'Cable & pushrod controls';
  const n=S.tree.nodes[curNodeId()],sp=specFor(n);
  $('kAta').textContent=`${ataOf(n,ac)} · ${ataMode({level:S.level})}`;$('kOem').textContent=sp.oem;$('kMat').textContent=sp.mat||'—';
  // thrust lever readout
  const tl=SIM.tlaOn?SIM.tla:clamp((s.n1-21)/(97-21)*100,0,100);if(!SIM.tlaOn){const r=$('rngTla');r.value=Math.round(tl);setRangeFill(r);}
  $('outTla').textContent=`${Math.round(tl)}% · ${SIM.tlaOn?tlaDetent(SIM.tla):s.mode}`;}
setInterval(()=>tickWb(),140);
/* ---------- thrust lever ---------- */
$('rngTla').addEventListener('input',e=>{if(!SIM.tlaOn){SIM.n1Live=S.simSt?S.simSt.n1:60;}SIM.tlaOn=true;SIM.tla=+e.target.value;setRangeFill(e.target);$('tlaAuto').setAttribute('aria-pressed','false');tickWb(true);});
$('tlaAuto').onclick=()=>{SIM.tlaOn=false;$('tlaAuto').setAttribute('aria-pressed','true');tickWb(true);};
document.querySelectorAll('[data-tla]').forEach(b=>b.onclick=()=>{const v=+b.dataset.tla;$('rngTla').value=v;$('rngTla').dispatchEvent(new Event('input'));});
/* ---------- hook navigation ---------- */
const _go=go;go=function(...a){_go.apply(this,a);try{renderWbChips();renderOverlays();tickWb(true);}catch(e){}};
const _setAc=setAircraft;setAircraft=function(id){_setAc(id);try{renderWbHead();renderOverlays();tickWb(true);}catch(e){}};
/* ---------- boot ---------- */
let start='b77w';try{const h=(location.hash||'').slice(1);if(FLEET_BY_ID[h])start=h;else{const s=localStorage.getItem('aerodissect.ac');if(FLEET_BY_ID[s])start=s;}}catch(e){}
setRangeFill($('rngExplode'));setRangeFill($('rngXray'));
setAircraft(start);requestAnimationFrame(loop);
/* =====================================================================
   WORKBENCH SHELL — modes, fleet navigator, configuration, display styles,
   view cube & presets, orthographic, measure, units, panel wall, data grid.
   ===================================================================== */
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
Object.assign(S,{mode:'model',display:'edges',ortho:false,units:'metric',livery:'factory',ovr:{},env:'studio',measuring:false});
try{const u=localStorage.getItem('aerodissect.units');if(u)S.units=u;}catch(e){}
const TYPE_TAG={TF:'TF',TFI:'TF',TP:'TP',PS:'PST',TJAB:'TJ',TFAB:'AB',TRJ:'TRJ'};
const nameOf=a=>{const n=a.name.replace(a.mfr+' ','').replace('Lockheed Martin ','');return /^\d/.test(n)?a.name:n;};

/* ---------- popovers (one open at a time) ---------- */
const POPS=[['tDisp','pDisp'],['tExp','pExp'],['tSec','pSec'],['tLay','pLay'],['helpBtn','helpPop']];
function closePops(except){POPS.forEach(([b,p])=>{if(b===except)return;$(p).hidden=true;$(b).setAttribute('aria-expanded','false');});}
POPS.forEach(([b,p])=>{$(b).addEventListener('click',e=>{e.stopPropagation();const open=$(p).hidden;closePops(b);$(p).hidden=!open;$(b).setAttribute('aria-expanded',String(open));if(open)$('cmpPop').hidden=true;});$(p).addEventListener('click',e=>e.stopPropagation());});
document.addEventListener('click',()=>closePops());

/* ---------- modes ---------- */
function setMode(m){S.mode=m;$('app').dataset.mode=m;document.querySelectorAll('.modes [data-mode]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.mode===m)));
  $('deckWall').hidden=m!=='deck';$('dataView').hidden=m!=='data';S.labVis=m==='model';closePops();
  if(m==='model')requestAnimationFrame(()=>{resize();});if(m==='data')renderGrid();if(m==='deck')renderWallHead();try{localStorage.setItem('aerodissect.mode',m);}catch(e){}}
document.querySelectorAll('.modes [data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));

/* ---------- dock toggles ---------- */
function setDock(side,on){const a=$('app');a.classList.toggle(side==='l'?'nol':'nor',!on);$(side==='l'?'sbTgl':'inTgl').setAttribute('aria-pressed',String(on));requestAnimationFrame(resize);}
$('sbTgl').onclick=()=>setDock('l',$('app').classList.contains('nol'));$('inTgl').onclick=()=>setDock('r',$('app').classList.contains('nor'));

/* ---------- inspector tabs (adds Live) ---------- */
setDockTab=function(t){S.dtab=t;document.querySelectorAll('#dtabs [data-dt]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.dt===t)));
  $('tele').hidden=t!=='data';$('livePane').hidden=t!=='live';$('dockDeck').hidden=t!=='deck';$('dockBp').hidden=t!=='bp';if(t==='bp')renderDockBp();if(t==='deck')tickDockDeck();if(t==='live'){tickWb(true);tickLive(true);}};

/* ---------- fleet navigator ---------- */
function renderFleetNav(){const q=$('fnq').value.trim().toLowerCase(),box=$('fleetNav'),cur=S.ac&&S.ac.id;let shown=0;
  const hl=s=>{if(!q)return esc(s);const i=s.toLowerCase().indexOf(q);return i<0?esc(s):esc(s.slice(0,i))+'<mark>'+esc(s.slice(i,i+q.length))+'</mark>'+esc(s.slice(i+q.length));};
  const open=new Set([...box.querySelectorAll('details.fg[open]')].map(d=>d.dataset.c));
  box.innerHTML=Object.entries(CATS).map(([ck,cn])=>{const list=FLEET.filter(a=>a.cat===ck&&(!q||(a.name+' '+a.mfr+' '+a.e.name+' '+a.e.oem).toLowerCase().includes(q)));if(!list.length)return '';shown+=list.length;
    const mfrs=[...new Set(list.map(a=>a.mfr))],has=list.some(a=>a.id===cur),isOpen=q||open.has(ck)||has;
    return `<details class="fg${has?' has':''}" data-c="${ck}"${isOpen?' open':''}><summary><svg class="chev"><use href="#i-chev"/></svg>${esc(cn)}<i class="dot"></i><span class="n">${list.length}</span></summary>`+
      mfrs.map(m=>(mfrs.length>1||!cn.includes(m)?`<div class="fm">${esc(m)}</div>`:'')+list.filter(a=>a.mfr===m).map(a=>`<button type="button" class="fi" role="treeitem" data-id="${a.id}" aria-current="${a.id===cur}"><span>${hl(a.name.replace(a.mfr+' ','').replace('Lockheed Martin ',''))}</span><small>${a.nEng}×${TYPE_TAG[a.e.type]}</small></button>`).join('')).join('')+'</details>';}).join('')||'<p class="fnone">No airframes match that filter.</p>';
  box.dataset.init='1';$('fleetN').textContent=q?`${shown} / ${FLEET.length}`:FLEET.length;
  box.querySelectorAll('.fi').forEach(b=>b.onclick=()=>{setAircraft(b.dataset.id);if(innerWidth<=1040)$('left').classList.remove('open');});}
$('fnq').addEventListener('input',renderFleetNav);

/* ---------- configuration ---------- */
const ENV={studio:[0xe9ebee,'Studio'],neutral:[0xd7dadf,'Neutral'],hangar:[0x1d2026,'Hangar']};
function flapLabels(ac){return ac.ctl==='side'?['0','1','2','3','FULL']:['UP','5','15','25','30'];}
const FLAP_POS=[0,0.25,0.45,0.72,1];
function opts(key,items){const cur=S.ovr[key];return `<div class="opts" data-o="${key}">${items.map(([v,l])=>`<button type="button" class="${v===null?'auto':''}" data-v="${v===null?'':v}" aria-pressed="${(cur===undefined?null:cur)===v}">${l}</button>`).join('')}</div>`;}
function renderConfig(){const ac=S.ac,box=$('cfg');if(!ac)return;const base=FLEET_BY_ID[ac.id],c=cfgFor(ac.id),eo=engineOptions(base),to=tipOptions(base),fl=flapLabels(ac),fold=ac.tip==='folding',seat=seatEstimate(ac),pt=paintFor(ac);
  const changed=(c.eng&&c.eng!==base.eng?1:0)+(c.tip&&c.tip!==base.tip?1:0)+(c.cabin!=='factory'?1:0)+(c.paint!=='factory'?1:0)+(Math.abs(c.tow-0.88)>0.005?1:0),ovrN=Object.values(S.ovr).filter(v=>v!==undefined).length;
  $('cfgN').textContent=changed||ovrN?[changed?changed+' changed':'',ovrN?ovrN+' manual':''].filter(Boolean).join(' · '):'';
  const tw=ac.mtow*c.tow;
  box.innerHTML=`<div class="cfg-g"><div class="cfg-h">Airframe<b>${c.eng||c.tip?'Variant':'As delivered'}</b></div>
    <div class="cfg-r"><label for="cfgEng">Powerplant</label><select id="cfgEng" ${eo.length<2?'disabled':''}>${eo.map(k=>`<option value="${k}"${k===ac.eng?' selected':''}>${esc(ENGINE_DB[k][0])}</option>`).join('')}</select></div>
    <div class="cfg-r"><label for="cfgTip">Wingtip</label><select id="cfgTip" ${to.length<2?'disabled':''}>${to.map(k=>`<option value="${k}"${k===ac.tip?' selected':''}>${esc(TIP_LABEL[k]||k)}${k===base.tip?' (factory)':''}</option>`).join('')}</select></div>
    ${seat?`<div class="cfg-r"><label for="cfgCab">Cabin</label><select id="cfgCab">${CABIN_OPTS.map(o=>`<option value="${o[0]}"${o[0]===c.cabin?' selected':''}>${esc(o[1])}</option>`).join('')}</select></div><p class="cfg-note">${fmt(seat.seats)} seats est. · ${seat.ab} abreast · ${Math.round(seat.pitch/0.0254)} in pitch</p>`:''}
    <div class="cfg-r"><label for="cfgTow">Takeoff wt</label><div class="prow" style="padding:0;grid-template-columns:minmax(0,1fr) 64px"><input id="cfgTow" type="range" min="50" max="100" value="${Math.round(c.tow*100)}"><output for="cfgTow">${uMass(tw)}</output></div></div>
    <p class="cfg-note">${Math.round(c.tow*100)}% of ${uMass(ac.mtow)} MTOW · drives fuel load and the simulated flight</p></div>
   <div class="cfg-g"><div class="cfg-h">Finish<b>${esc(pt[1])}</b></div><div class="swatches">${PAINTS.map(p=>`<button type="button" data-p="${p[0]}" aria-pressed="${p[0]===c.paint}" title="${esc(p[1])}" aria-label="${esc(p[1])}" style="background:${p[2]==null?'linear-gradient(135deg,#eceef0 50%,#9aa3ab 50%)':'#'+p[2].toString(16).padStart(6,'0')}"></button>`).join('')}</div></div>
   <div class="cfg-g"><div class="cfg-h">Controls &amp; gear<b>${ovrN?'Manual':'Follow flight'}</b></div>
    <div class="cfg-r"><span>Gear lever</span>${opts('gear',[[null,'AUTO'],[1,'DOWN'],[0,'UP']])}</div>
    <div class="cfg-r"><span>Flap lever</span>${opts('flaps',[[null,'AUTO'],...fl.map((l,i)=>[FLAP_POS[i],l])])}</div>
    <div class="cfg-r"><span>Speedbrake</span>${opts('spl',[[null,'AUTO'],[0,'RET'],[1,'EXT']])}</div>
    <div class="cfg-r"><span>Reversers</span>${opts('rev',[[null,'AUTO'],[0,'STOW'],[1,'DEPLOY']])}</div>
    ${fold?`<div class="cfg-r"><span>Wingtips</span>${opts('fold',[[null,'AUTO'],[0,'EXTEND'],[1,'FOLD']])}</div>`:''}</div>
   <div class="cfg-g"><div class="cfg-h">Viewport background</div><div class="cfg-r full"><div class="opts">${Object.entries(ENV).map(([k,[,l]])=>`<button type="button" data-e="${k}" aria-pressed="${k===S.env}">${l}</button>`).join('')}</div></div>
    ${changed?'<button type="button" class="lnk" id="cfgReset">Restore factory configuration</button>':''}</div>`;
  const rebuild=(msg)=>{delete S.bpCache[ac.id];setAircraft(ac.id);if(msg)toast(msg);};
  $('cfgEng').onchange=e=>{c.eng=e.target.value===base.eng?null:e.target.value;rebuild(`Powerplant: ${ENGINE_DB[e.target.value][0]}`);};
  $('cfgTip').onchange=e=>{c.tip=e.target.value===base.tip?null:e.target.value;rebuild(`Wingtip: ${TIP_LABEL[e.target.value]}`);};
  if($('cfgCab'))$('cfgCab').onchange=e=>{c.cabin=e.target.value;rebuild();};
  const tow=$('cfgTow');setRangeFill(tow);tow.oninput=()=>{c.tow=+tow.value/100;S.ac._prof=undefined;setRangeFill(tow);tow.nextElementSibling.textContent=uMass(ac.mtow*c.tow);};tow.onchange=()=>renderConfig();
  box.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{c.paint=b.dataset.p;applySkin(MAT.skin,S.ac);applyLook();renderConfig();});
  box.querySelectorAll('[data-o]').forEach(g=>g.querySelectorAll('button').forEach(b=>b.onclick=()=>{const k=g.dataset.o,v=b.dataset.v;S.ovr[k]=v===''?undefined:+v;if(S.level>1&&v!=='')go(0);renderConfig();}));
  box.querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>{S.env=b.dataset.e;applyEnv();renderConfig();});
  if($('cfgReset'))$('cfgReset').onclick=()=>{Object.assign(c,{eng:null,tip:null,cabin:'factory',paint:'factory',tow:0.88});rebuild('Factory configuration restored');};}
function applyEnv(){const c=ENV[S.env][0];scene.background.setHex(c);scene.fog.color.setHex(c);grid.material.opacity=S.env==='hangar'?0.35:0.9;$('stage').style.background=S.env==='hangar'?'#1d2026':'';}
/* override-aware, smoothed surface motion */
const _simMotion=simMotion;let _moT=performance.now(),_mo=null;
simMotion=function(st){const tg=_simMotion(st);Object.keys(S.ovr).forEach(k=>{if(S.ovr[k]!==undefined)tg[k]=S.ovr[k];});const now=performance.now(),dt=Math.min(0.1,(now-_moT)/1000);_moT=now;
  if(!_mo)_mo=Object.assign({},tg);Object.keys(tg).forEach(k=>{_mo[k]+=(tg[k]-_mo[k])*Math.min(1,dt*(k==='gear'?2.2:3.2));});return Object.assign({},_mo);};

/* ---------- display styles ---------- */
const DISP=[['shaded','Shaded','1'],['edges','Shaded with edges','E'],['clay','Clay with edges',''],['wire','Wireframe',''],['xray','X-ray skin',''],['thermal','Thermal stress','']];
const CLAY=new THREE.MeshStandardMaterial({color:0xdedcd7,roughness:0.82,metalness:0,side:THREE.DoubleSide});
const EDGE_MAT=new THREE.LineBasicMaterial({color:0x1e2229,transparent:true,opacity:0.62});
const edgeCache=new Map(),edgeLines=[],wired=new Set();
function renderDispList(){$('dispList').innerHTML=DISP.map(([k,l,kb])=>`<button type="button" data-d="${k}" aria-pressed="${S.display===k}"><i></i><span>${l}</span>${kb?`<kbd>${kb}</kbd>`:'<span></span>'}</button>`).join('');
  $('dispList').querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>setDisplay(b.dataset.d));$('tDispL').textContent=DISP.find(d=>d[0]===S.display)[1].replace(' with edges',' + edges');}
function setDisplay(k){const prev=S.display;S.display=k;
  if(k==='thermal'&&!S.thermal)$('tglHeat').click();if(k!=='thermal'&&prev==='thermal'&&S.thermal)$('tglHeat').click();
  if(k==='xray')setXray(72);else if(prev==='xray')setXray(0);
  $('swHeat').checked=!!S.thermal;applyLook();renderDispList();}
function clearEdges(){edgeLines.forEach(l=>l.parent&&l.parent.remove(l));edgeLines.length=0;}
function syncEdges(){clearEdges();if(!(S.display==='edges'||S.display==='clay'))return;const roots=[curRoot()];if(SB.on&&SB.AF)roots.push(curRootB());
  roots.forEach(r=>r.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||o.userData.edge||!o.geometry)return;if(o.material===GHOST||o.userData.flow)return;const pos=o.geometry.attributes.position;if(!pos||pos.count>60000)return;
    let g=edgeCache.get(o.geometry.uuid);if(!g){g=new THREE.EdgesGeometry(o.geometry,28);edgeCache.set(o.geometry.uuid,g);}const l=new THREE.LineSegments(g,EDGE_MAT);l.userData.edge=1;l.raycast=()=>{};o.add(l);edgeLines.push(l);}));}
function syncWire(){wired.forEach(m=>{m.wireframe=false;m.needsUpdate=true;});wired.clear();if(S.display!=='wire')return;curRoot().traverse(o=>{if((o.isMesh||o.isInstancedMesh)&&o.material&&o.material!==GHOST&&!o.material.wireframe){o.material.wireframe=true;o.material.needsUpdate=true;wired.add(o.material);}});}
const _applyLook=applyLook;applyLook=function(){_applyLook();if(S.display==='clay')curRoot().traverse(o=>{if((o.isMesh||o.isInstancedMesh)&&o.userData.mat0&&o.material!==GHOST&&!o.userData.edge)o.material=CLAY;});syncWire();syncEdges();
  EDGE_MAT.color.setHex(S.env==='hangar'?0xc8ccd4:0x2a2e36);};


/* ---------- orthographic + view presets + view cube ---------- */
const VIEWS={iso:V(1,0.62,1.05),front:V(1,0.0001,0),rear:V(-1,0.0001,0),top:V(0.0001,1,0),bottom:V(0.0001,-1,0),port:V(0,0.0001,-1),stbd:V(0,0.0001,1)};
function viewPreset(k){const d=VIEWS[k].clone().normalize(),t=controls.target.clone(),dist=camera.position.distanceTo(t);S.tw={p0:camera.position.clone(),p1:t.clone().addScaledVector(d,dist),t0:t.clone(),t1:t.clone(),start:performance.now(),dur:RM?1:650};}
function setOrtho(on){if(on===S.ortho)return;const t=controls.target,d0=camera.position.distanceTo(t),f0=camera.fov;S.ortho=on;camera.fov=on?3.2:38;
  const d1=d0*Math.tan(f0*D2R/2)/Math.tan(camera.fov*D2R/2),dir=camera.position.clone().sub(t).normalize();
  if(on){controls.maxDistance=Math.max(controls.maxDistance,d1*4);controls.minDistance=d1*0.05;}camera.position.copy(t).addScaledVector(dir,d1);camera.far=Math.max(camera.far,d1*4);camera.updateProjectionMatrix();if(!on)frame(true);
  $('tOrtho').setAttribute('aria-pressed',String(on));$('tOrtho').dataset.tip=on?'Perspective · O':'Orthographic · O';}
const _frame=frame;frame=function(noCam){_frame(noCam);if(!noCam&&S.tw&&S.level>=1&&host.clientWidth>=620){const dir=S.tw.p1.clone().sub(S.tw.t1);S.tw.p1=S.tw.t1.clone().addScaledVector(dir,S.level===1?1.08:1.22);}if(S.ortho){const r=S.frameR||10;controls.maxDistance=r*700;controls.minDistance=r*3;camera.far=r*1500;camera.updateProjectionMatrix();
}};
$('tOrtho').onclick=()=>setOrtho(!S.ortho);
document.querySelectorAll('#cube [data-v]').forEach(b=>b.onclick=()=>viewPreset(b.dataset.v));
const _mC=new THREE.Matrix4(),_mF=new THREE.Matrix4().makeScale(1,-1,1);
function tickCube(){_mC.extractRotation(camera.matrixWorldInverse);const m=_mF.clone().multiply(_mC).multiply(_mF);$('cubeBox').style.transform=`matrix3d(${m.elements.map(v=>v.toFixed(5)).join(',')})`;}

/* ---------- explode, x-ray labels ---------- */
$('expPre').innerHTML=[0,35,70,100].map(v=>`<button type="button" data-x="${v}">${v}%</button>`).join('');
$('expPre').querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>setExplode(+b.dataset.x));
const _setExplode=setExplode;setExplode=function(v){_setExplode(v);$('tExpL').textContent=v+'%';};
$('rngExplode').addEventListener('input',e=>$('tExpL').textContent=e.target.value+'%');

/* ---------- layers ---------- */
$('swLabels').onchange=e=>$('app').classList.toggle('nolabels',!e.target.checked);
$('swGrid').onchange=e=>{grid.visible=e.target.checked;};
$('swHeat').addEventListener('change',()=>{setTimeout(()=>{S.display=S.thermal?'thermal':(S.display==='thermal'?'shaded':S.display);renderDispList();},0);});

/* ---------- measure ---------- */
const MS={pts:[],objs:[],lbls:[]};const MS_MAT=new THREE.MeshBasicMaterial({color:0x0366b2,depthTest:false}),MS_LINE=new THREE.LineBasicMaterial({color:0x0366b2,depthTest:false});
function clearMeasure(){MS.objs.forEach(o=>o.parent&&o.parent.remove(o));MS.objs=[];MS.pts=[];$('measure').innerHTML='';MS.lbls=[];}
function setMeasure(on){S.measuring=on;$('tMeas').setAttribute('aria-pressed',String(on));$('stage').classList.toggle('measuring',on);if(!on)clearMeasure();else toast('Measure: click two points on the model');}
$('tMeas').onclick=()=>setMeasure(!S.measuring);
function msPoint(cx,cy){const r=renderer.domElement.getBoundingClientRect();ptr.set((cx-r.left)/r.width*2-1,-(cy-r.top)/r.height*2+1);ray.setFromCamera(ptr,camera);
  const h=ray.intersectObject(curRoot(),true).find(h=>h.object.isMesh&&!h.object.userData.flow&&visibleChain(h.object)&&h.object.material!==GHOST);return h?h.point.clone():null;}
function addMs(p){if(MS.pts.length>=2)clearMeasure();MS.pts.push(p);const rr=(S.frameR||10)*0.008;const s=new THREE.Mesh(new THREE.SphereGeometry(rr,12,8),MS_MAT);s.position.copy(p);s.renderOrder=999;scene.add(s);MS.objs.push(s);
  if(MS.pts.length===2){const [a,b]=MS.pts;const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints([a,b]),MS_LINE);l.renderOrder=999;scene.add(l);MS.objs.push(l);
    const d=a.distanceTo(b),dx=Math.abs(a.x-b.x),dy=Math.abs(a.y-b.y),dz=Math.abs(a.z-b.z);const el=document.createElement('div');el.className='m';el.textContent=S.level===3?`${d.toFixed(3)} u`:`${uLen(d)}  ·  Δx ${uLen(dx)}  Δy ${uLen(dy)}  Δz ${uLen(dz)}`;$('measure').appendChild(el);MS.lbls.push([el,a.clone().lerp(b,0.5)]);}
  else{const el=document.createElement('div');el.className='m p';el.textContent='Point 1';$('measure').appendChild(el);MS.lbls.push([el,p.clone()]);}}
let _mdown=null;$('view').addEventListener('pointerdown',e=>{if(S.measuring)_mdown={x:e.clientX,y:e.clientY};},true);
$('view').addEventListener('pointerup',e=>{if(!S.measuring)return;e.stopPropagation();if(!_mdown||Math.hypot(e.clientX-_mdown.x,e.clientY-_mdown.y)>5)return;const p=msPoint(e.clientX,e.clientY);if(p)addMs(p);},true);
function tickMeasure(){if(!MS.lbls.length)return;const w=host.clientWidth,h=host.clientHeight;MS.lbls.forEach(([el,p])=>{const v=p.clone().project(camera);el.style.transform=`translate(${((v.x+1)/2*w+8).toFixed(1)}px,${((1-v.y)/2*h-24).toFixed(1)}px)`;el.style.display=v.z<1?'':'none';});}

/* ---------- units ---------- */
function setUnits(u){S.units=u;document.querySelectorAll('#units [data-u]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.u===u)));$('stUnits').textContent=u==='imperial'?'US · ft · lbf · lb':'SI · m · kN · t';
  try{localStorage.setItem('aerodissect.units',u);}catch(e){}renderOverlays();tickWb(true);renderDockBp();if(S.mode==='data')renderGrid();}
document.querySelectorAll('#units [data-u]').forEach(b=>b.onclick=()=>setUnits(b.dataset.u));

/* ---------- status line ---------- */
function renderStatus(){const n=S.tree&&S.tree.nodes[curNodeId()];if(!n)return;$('stSel').textContent=`${S.ac.name} › ${n.level?ataOf(n,S.ac)+' '+n.name:'Complete airframe'} · L${S.level}`;}
let _fc=0,_ft=performance.now();
/* ---------- render-side ticker ---------- */
(function tick(now){requestAnimationFrame(tick);if(S.mode==='model'){tickCube();tickMeasure();_fc++;if(now-_ft>1000){$('stFps').textContent=_fc+' fps';_fc=0;_ft=now;}}})(performance.now());

/* ---------- toast ---------- */
let _toastT;function toast(msg){let t=$('toast');if(!t){t=document.createElement('div');t.id='toast';t.setAttribute('role','status');document.body.appendChild(t);}t.textContent=msg;t.classList.add('on');clearTimeout(_toastT);_toastT=setTimeout(()=>t.classList.remove('on'),2200);}

/* ---------- flight deck wall ---------- */
let wallPage='HYD';
$('wallPages').innerHTML=SYS_PAGES.map(p=>`<button type="button" role="tab" data-pg="${p}" aria-selected="${p===wallPage}">${p}</button>`).join('');
$('wallPages').querySelectorAll('[data-pg]').forEach(b=>b.onclick=()=>{wallPage=b.dataset.pg;$('wallPages').querySelectorAll('[data-pg]').forEach(x=>x.setAttribute('aria-selected',String(x===b)));});
function renderWallHead(){const ac=S.ac,f=avFam(ac);$('wallTitle').textContent=`${ac.name} · flight deck`;$('wallSub').textContent={ecam:'ECAM glass cockpit · sidestick fly-by-wire',eicas:'EICAS glass cockpit · control yokes',analog:'Analog round-dial instruments',mil:'HUD and tactical multifunction displays'}[f]+' · '+avionicsOEM(ac);
  $('capMcp').textContent={ecam:'Flight control unit',eicas:'Mode control panel',analog:'Autopilot',mil:'Up-front controller'}[f];$('capEng').textContent={ecam:'Engine / warning display',eicas:'EICAS',analog:'Engine gauges',mil:'Engine MFD'}[f];$('capSys').textContent=(f==='ecam'?'System display · ':'System page · ')+wallPage;}
setInterval(()=>{if(S.mode!=='deck'||document.hidden||!S.ac)return;const st=simState(S.ac,SIM.u);$('capSys').textContent=(avFam(S.ac)==='ecam'?'System display · ':'System page · ')+wallPage;
  $('deckWall').querySelectorAll('canvas[data-k]').forEach(cv=>drawPanelInto(cv,cv.dataset.k,S.ac,st,wallPage));},55);

/* ---------- fleet data grid ---------- */
const GS={tab:'ac',sort:'name',dir:1};
$('dvCat').innerHTML+=Object.entries(CATS).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join('');
const ENG_ROWS=()=>Object.entries(ENGINE_DB).map(([k,r])=>{const e=engObj(k);return {k,name:e.name,oem:e.oem,type:e.type,th:e.thrust,opr:e.opr,bpr:e.bpr,st:r[8],dia:e.dia,egt:e.egt,uses:FLEET.filter(a=>a.eng===k||(ENGINE_ALT[a.id]||[]).includes(k)).map(nameOf)};});
const TN={TF:'High-bypass turbofan',TFI:'Buried turbofan',TP:'Turboprop',PS:'Piston',TJAB:'Turbojet + reheat',TFAB:'Turbofan + reheat',TRJ:'Turbo-ramjet'};
function colsAc(){const im=S.units==='imperial';return [
  ['name','Airframe',a=>`<span class="nm2">${esc(a.name)}</span>`,a=>a.name,0],['mfr','Manufacturer',a=>esc(a.mfr),a=>a.mfr,0,'dimc'],['eng','Powerplant',a=>`${a.nEng} × ${esc(a.e.name)}`,a=>a.e.name,0,'dimc'],
  ['L','Length',a=>im?fmt(a.L*3.28084,1)+' ft':a.L.toFixed(2)+' m',a=>a.L,1],['S','Span',a=>im?fmt(a.S*3.28084,1)+' ft':a.S.toFixed(2)+' m',a=>a.S,1],['H','Height',a=>im?fmt(a.H*3.28084,1)+' ft':a.H.toFixed(2)+' m',a=>a.H,1],
  ['mtow','MTOW',a=>im?fmt(a.mtow*2.20462,1)+' klb':fmt(a.mtow,a.mtow<10?2:1)+' t',a=>a.mtow,1],['range','Range',a=>im?fmt(a.range*0.539957)+' nm':fmt(a.range)+' km',a=>a.range,1],['mach','Mmo',a=>'M '+a.mach.toFixed(2),a=>a.mach,1],
  ['thr','Rated / eng',a=>a.e.type==='TP'||a.e.type==='PS'?fmt(a.e.thrust)+' '+thrustUnit(a.e):im?fmt(a.e.thrust*224.809)+' lbf':fmt(a.e.thrust,a.e.thrust<100?1:0)+' kN',a=>a.e.type==='TP'||a.e.type==='PS'?a.e.thrust*0.003:a.e.thrust,1],
  ['pax','Seats / payload',a=>esc(a.pax),a=>parseFloat(a.pax)||0,0,'dimc'],['first','First flight',a=>a.first||'—',a=>a.first||9999,1],['status','Status',a=>a.status?`<span class="st ${/Retired|ended/.test(a.status)?'r':/Destroyed/.test(a.status)?'r':'d'}">${esc(a.status)}</span>`:'<span class="st">In service</span>',a=>a.status||'',0]];}
function colsEng(){const im=S.units==='imperial';return [['name','Engine',e=>`<span class="nm2">${esc(e.name)}</span>`,e=>e.name,0],['oem','OEM',e=>esc(e.oem),e=>e.oem,0,'dimc'],['type','Architecture',e=>TN[e.type],e=>e.type,0,'dimc'],
  ['th','Rating',e=>e.type==='TP'?fmt(e.th)+' shp':e.type==='PS'?fmt(e.th)+' hp':im?fmt(e.th*224.809)+' lbf':fmt(e.th,e.th<100?1:0)+' kN',e=>e.type==='TP'||e.type==='PS'?e.th*0.003:e.th,1],['opr','OPR',e=>e.opr+' : 1',e=>e.opr,1],['bpr','Bypass',e=>e.bpr?e.bpr+' : 1':'—',e=>e.bpr,1],
  ['st','Stages',e=>e.type==='PS'?e.st+' cyl':esc(e.st),e=>e.st,1],['dia','Fan / prop Ø',e=>im?fmt(e.dia*3.28084,2)+' ft':e.dia.toFixed(2)+' m',e=>e.dia,1],['egt','EGT limit',e=>e.egt?fmt(e.egt)+' °C':'—',e=>e.egt,1],['uses','Installed on',e=>esc(e.uses.join(', ')||'—'),e=>e.uses.length,0,'dimc']];}
function renderGrid(){const isAc=GS.tab==='ac',cols=isAc?colsAc():colsEng(),q=$('dvQ').value.trim().toLowerCase(),cat=$('dvCat').value;$('dvCat').hidden=!isAc;
  let rows=isAc?FLEET.filter(a=>(!cat||a.cat===cat)&&(!q||(a.name+' '+a.mfr+' '+a.e.name).toLowerCase().includes(q))):ENG_ROWS().filter(e=>!q||(e.name+' '+e.oem+' '+e.uses.join(' ')).toLowerCase().includes(q));
  const sc=cols.find(c=>c[0]===GS.sort)||cols[0];rows.sort((a,b)=>{const va=sc[3](a),vb=sc[3](b);return (va>vb?1:va<vb?-1:0)*GS.dir;});
  const mx=sc[4]?Math.max(...rows.map(r=>+sc[3](r)||0),1):0;
  $('dvTable').querySelector('thead').innerHTML='<tr>'+cols.map(c=>`<th class="${c[4]?'num':''}"${c[0]===sc[0]?` aria-sort="${GS.dir>0?'ascending':'descending'}"`:''}><button type="button" data-s="${c[0]}">${c[1]}</button></th>`).join('')+'</tr>';
  $('dvTable').querySelector('tbody').innerHTML=rows.map(r=>`<tr data-id="${isAc?r.id:r.k}"${isAc&&S.ac&&r.id===S.ac.id?' aria-current="true"':''}>`+cols.map(c=>{const v=c[2](r);if(c[4]&&c[0]===sc[0])return `<td class="num sorted"><span class="bar"><i style="width:${(Math.max(0,+c[3](r)||0)/mx*56).toFixed(0)}px"></i>${v}</span></td>`;return `<td class="${c[4]?'num':''} ${c[5]||''}">${v}</td>`;}).join('')+'</tr>').join('');
  $('dvN').textContent=`${rows.length} ${isAc?'airframes':'engines'}`;
  $('dvTable').querySelectorAll('th [data-s]').forEach(b=>b.onclick=()=>{if(GS.sort===b.dataset.s)GS.dir*=-1;else{GS.sort=b.dataset.s;GS.dir=1;}renderGrid();});
  $('dvTable').querySelectorAll('tbody tr').forEach(tr=>tr.onclick=()=>{if(isAc){setAircraft(tr.dataset.id);setMode('model');}else{const a=FLEET.find(x=>x.eng===tr.dataset.id);if(a){setAircraft(a.id);setMode('model');go(2,'prop');}}});}
document.querySelectorAll('#dvTabs [data-dv]').forEach(b=>b.onclick=()=>{GS.tab=b.dataset.dv;GS.sort='name';GS.dir=1;document.querySelectorAll('#dvTabs [data-dv]').forEach(x=>x.setAttribute('aria-selected',String(x===b)));renderGrid();});
$('dvQ').addEventListener('input',renderGrid);$('dvCat').addEventListener('change',renderGrid);

/* ---------- navigation hooks ---------- */
const _go2=go;go=function(...a){_go2.apply(this,a);clearMeasure();syncEdges();renderStatus();};
const _setAc2=setAircraft;setAircraft=function(id){_mo=null;_setAc2(id);renderFleetNav();renderConfig();renderStatus();if(S.mode==='deck')renderWallHead();if(S.mode==='data')renderGrid();applyEnv();};

/* ---------- keyboard ---------- */
window.addEventListener('keydown',e=>{if(document.documentElement.classList.contains('site'))return;const tag=(document.activeElement&&document.activeElement.tagName)||'';if(/INPUT|SELECT|TEXTAREA/.test(tag))return;
  if(e.key==='Escape'){const open=POPS.some(([,p])=>!$(p).hidden)||!$('cmpPop').hidden;if(open){closePops();$('cmpPop').hidden=true;e.stopImmediatePropagation();return;}if(S.measuring){setMeasure(false);e.stopImmediatePropagation();return;}}
  if(e.metaKey||e.ctrlKey||e.altKey)return;const k=e.key.toLowerCase();
  if(S.mode==='model'){const vk={'1':'iso','2':'front','3':'rear','4':'top','5':'port','6':'stbd'}[k];if(vk){viewPreset(vk);return;}if(k==='f'){frame();return;}if(k==='o'){setOrtho(!S.ortho);return;}if(k==='m'){setMeasure(!S.measuring);return;}if(k==='e'){setDisplay(S.display==='edges'?'shaded':'edges');return;}}
  if(k===' '){e.preventDefault();document.querySelector('#labSim [data-sim=play]').click();}if(k==='['){setDock('l',$('app').classList.contains('nol'));}if(k===']'){setDock('r',$('app').classList.contains('nor'));}},true);

/* ---------- boot ---------- */
shadow.material.opacity=0.45;
renderDispList();setUnits(S.units);renderFleetNav();renderConfig();renderStatus();applyEnv();applyLook();
try{const m=localStorage.getItem('aerodissect.mode');if(m&&m!=='model')setMode(m);}catch(e){}
if ($('spMsg')) $('spMsg').textContent=`${FLEET.length} airframes · ${Object.keys(ENGINE_DB).length} engines · ${fmt(FLEET.reduce((a,ac)=>a+Object.keys(buildTree(ac).nodes).length,0))} mapped parts`;
if ($('splash')) setTimeout(()=>$('splash').classList.add('out'),RM?50:900);
/* =====================================================================
   LANDING — marketing site, scroll story, system plates, live deck
   ===================================================================== */
(function landing(){
const LD=$('landing');if(!LD)return;
const B=document.documentElement,HOVER=matchMedia('(hover: hover) and (pointer: fine)').matches;
const ez=t=>t*t*t*(t*(t*6-15)+10);
const isSite=()=>B.classList.contains('site');
function cloneInto(root,map){root.traverse(o=>{if((o.isMesh||o.isInstancedMesh)&&o.material&&!Array.isArray(o.material)){const m=o.material;if(!map.has(m))map.set(m,m.clone());o.material=map.get(m);}});}
const short=n=>n.replace(/\s*\(.*?\)\s*/g,' ').replace(/\s*[&·].*$/,'').trim();
const AC=FLEET_BY_ID.b78x,TREE=buildTree(AC);
const nParts=FLEET.reduce((a,ac)=>a+Object.keys(buildTree(ac).nodes).length,0),nEng=Object.keys(ENGINE_DB).length;

/* ---------- routing: site <-> workbench ---------- */
const cur=$('curtain');let busy=false;
function swap(fn,label){if(RM||!cur){fn();return;}if(busy)return;busy=true;cur.querySelector('b').textContent=label;cur.classList.add('on');
  setTimeout(()=>{fn();setTimeout(()=>{cur.classList.remove('on');busy=false;},120);},640);}
window.openLab=function(id,sys){swap(()=>{B.classList.remove('site');B.classList.add('lab');window.scrollTo(0,0);try{history.replaceState(null,'','#lab');}catch(e){}
  if(S.mode!=='model')setMode('model');if(id&&FLEET_BY_ID[id]&&(!S.ac||S.ac.id!==id))setAircraft(id);
  requestAnimationFrame(()=>{resize();if(sys)go(1,sys);else frame();});},id&&FLEET_BY_ID[id]?'OPENING '+FLEET_BY_ID[id].name.toUpperCase():'OPENING WORKBENCH');};
window.openSite=function(){swap(()=>{closePops&&closePops();B.classList.remove('lab');B.classList.add('site');try{history.replaceState(null,'',location.pathname+location.search);}catch(e){}window.scrollTo(0,0);window.dispatchEvent(new Event('scroll'));},'AERODISSECT');};
LD.addEventListener('click',e=>{const o=e.target.closest('[data-open]');if(o){e.preventDefault();openLab(o.dataset.open||null,o.dataset.sys||null);}});
const brand=document.querySelector('#top .brand');if(brand){brand.setAttribute('role','button');brand.tabIndex=0;brand.title='Back to overview';brand.onclick=openSite;brand.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openSite();}};}

/* ---------- shared airframe for the story ---------- */
const prevSkin=MAT.skin.color.getHex();MAT.skin.color.set(0xe6e5e0);
const AF=buildAirframe(AC);MAT.skin.color.setHex(prevSkin);

/* ---------- scroll story ---------- */
(function story(){
  const host=$('showView'),sec=LD.querySelector('.l-story'),frameEl=LD.querySelector('.l-frame');
  const R2=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  R2.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));R2.outputColorSpace=THREE.SRGBColorSpace;R2.toneMapping=THREE.ACESFilmicToneMapping;R2.toneMappingExposure=1.05;R2.setClearColor(0x000000,0);host.appendChild(R2.domElement);
  const sc=new THREE.Scene();sc.environment=makeEnv(R2);
  sc.add(new THREE.HemisphereLight(0xfff8e8,0x14110a,0.42));
  const key=new THREE.DirectionalLight(0xfff3df,1.15);key.position.set(40,70,55);sc.add(key);
  const rim=new THREE.DirectionalLight(0xffb81c,2.1);rim.position.set(-70,22,-45);sc.add(rim);
  const rim2=new THREE.DirectionalLight(0xff8f00,0.8);rim2.position.set(-40,-8,70);sc.add(rim2);
  const cool=new THREE.DirectionalLight(0x8fb8ff,0.22);cool.position.set(60,-20,-60);sc.add(cool);
  const cam=new THREE.PerspectiveCamera(30,1,0.1,4000);
  const map=new Map();cloneInto(AF.root,map);const skinS=map.get(MAT.skin);if(skinS){skinS.transparent=false;skinS.opacity=1;skinS.wireframe=false;skinS.depthWrite=true;skinS.metalness=0.55;skinS.roughness=0.28;}
  const air=grp();air.add(AF.root);sc.add(air);
  const exList=[];AF.root.traverse(o=>{if(o.userData.ex){if(!o.userData.base)o.userData.base=o.position.clone();exList.push(o);}});
  const A=buildAssembly(AC,'prop',AF);cloneInto(A.group,map);
  const eng=grp();const pod=AF.engs.find(g=>g.position.z>0)||AF.engs[0];eng.position.copy(pod.userData.base||pod.position);eng.add(A.group);eng.visible=false;sc.add(eng);
  const ghost=(skinS||new THREE.MeshStandardMaterial()).clone();ghost.transparent=true;ghost.opacity=0.16;ghost.depthWrite=false;A.group.traverse(o=>{if(o.userData.skin&&o.material)o.material=ghost;});
  const anims=[];[AF.root,A.group].forEach(r=>r.traverse(o=>{if(o.userData.anim)anims.push(o);}));
  const L=AC.L,S0=AC.S,gy=AF.groundY;
  const grid=new THREE.GridHelper(1,60,0x5a4a1c,0x22201a);grid.material.transparent=true;grid.material.opacity=0.55;grid.scale.setScalar(Math.max(L,S0)*4);sc.add(grid);
  const sh=new THREE.Mesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:shadowTexture(),transparent:true,depthWrite:false}));sh.scale.set(L*1.2,1,S0*1.1);sc.add(sh);
  const flowAir=new Flow([makeEmitter({type:'free',n:1400,box:[L*0.9,-L*1.1,-L*0.18,L*0.3,-S0*0.62,S0*0.62],speed:L*1.15,color:[1,0.78,0.18]}),
    ...AF.engs.map(g=>makeEmitter({type:'plume',n:240,p:g.userData.exit,r:nacDia(AC.e)*0.32,len:L*0.7,speed:L*1.4}))],L*0.014);air.add(flowAir.pts);
  const flowEng=new Flow(A.flows.map(makeEmitter),AC.e.dia*0.035);A.group.add(flowEng.pts);
  const inner=['wing','fus','cockpit','prop'].map(k=>AF.inner[k]).filter(Boolean);
  const bAir=boxOf(AF.root),rAir=bAir.getBoundingSphere(new THREE.Sphere()).radius,cAir=bAir.getCenter(V());
  eng.visible=true;A.group.traverse(o=>{if(o.userData.ex&&o.userData.base)o.position.copy(o.userData.base).add(o.userData.ex);});const bEng=boxOf(eng);eng.visible=false;const rEng=bEng.getBoundingSphere(new THREE.Sphere()).radius,cEng=bEng.getCenter(V());
  const K={gear:[0,1,1,1,1],flaps:[0,1,0.3,0,0],slats:[0,1,0,0,0],spl:[0,0,0,0,0],rev:[0,0.85,0,0,0],ail:[0,0.25,0,0,0],fold:[0,0,0,0,0],xray:[0,0,0.9,0,0],ex:[0,0,0,1,1],alt:[0.42,0.16,0,0,0],flow:[1,0.6,0,0,0]};
  const CAM=[{d:V(0.9,0.16,1.0),f:0.95},{d:V(0.22,-0.2,1.0),f:0.74},{d:V(0.32,1.0,0.5),f:0.9},{d:V(1,0.55,1.15),f:1.25},{d:V(0.5,0.32,1),f:1}];
  const val=(arr,p)=>{const i=Math.min(Math.floor(p),arr.length-2),f=ez(clamp(p-i,0,1));return lerp(arr[i],arr[i+1],f);};
  /* callout tags, tied to real structure */
  const tagBox=document.createElement('div');tagBox.setAttribute('aria-hidden','true');tagBox.style.cssText='position:absolute;inset:0;z-index:1;pointer-events:none';frameEl.appendChild(tagBox);
  const sysEx={};Object.keys(AF.sys).forEach(k=>{const v=V();let n=0;AF.sys[k].traverse(o=>{if(o.userData.ex){v.add(o.userData.ex);n++;}});sysEx[k]=n?v.multiplyScalar(1/n):V();});
  const T=[];const tag=(step,ata,txt,pos)=>{const el=document.createElement('div');el.className='l-tag';el.innerHTML=`<i></i><span><small>${esc(ata)}</small>${esc(txt)}</span>`;tagBox.appendChild(el);T.push({step,el,pos});};
  const ctr=k=>(AF.centers[k]||V()).clone();
  const mw=Math.max(...AC.gear.main);
  tag(1,'ATA 32','Main gear · '+mw+'-wheel bogie',()=>ctr('gear'));
  tag(1,'ATA 27','Fowler flaps · 30°',()=>{const c=ctr('wing');c.x-=AF.W.chord(0)*0.35;c.z+=S0*0.18;return c;});
  tag(1,'ATA 78','Reverser sleeve',()=>(pod.userData.exit||ctr('prop')).clone());
  tag(2,'ATA 57','Wing box · spars & ribs',()=>{const c=ctr('wing');c.z+=S0*0.16;return c;});
  tag(2,'ATA 53','Frames · 533 mm pitch',()=>{const c=ctr('fus');c.x-=L*0.12;return c;});
  tag(2,'ATA 31','Flight deck',()=>ctr('cockpit'));
  const sysW={};SYS_ORDER.forEach(k=>{tag(3,'ATA '+ATA_SYS[k](AC),short(sysName(AC,k)),()=>(sysW[k]||V()).clone());T[T.length-1].world=true;});
  ['fan','hpc','comb','hpt','lpt'].filter(k=>A.parts[k]).forEach(k=>{const n=TREE.nodes['prop/'+k];tag(4,ATA_L2.prop[k]||'72',short(n?n.name:k),()=>A.parts[k].localToWorld(A.parts[k].userData.cLocal.clone()));T[T.length-1].world=true;});
  let exNow=0;
  let pT=0,pC=0,vis=true,mx=0,my=0,t=0,last=performance.now(),w=1,h=1,fr=0;
  const cards=[...LD.querySelectorAll('.l-sc')],dots=[...LD.querySelectorAll('.l-rail button')],bento=$('lBento'),pill=$('lPill'),thumb=$('lThumb').getContext('2d');
  const span=()=>sec.offsetHeight-window.innerHeight;
  function onScroll(){if(!isSite())return;const top=sec.getBoundingClientRect().top;pT=clamp(-top/Math.max(span(),1),0,1)*4;}
  window.addEventListener('scroll',onScroll,{passive:true});onScroll();pC=pT;
  LD.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>{const y=sec.offsetTop+(+b.dataset.go/4)*span()+2;window.scrollTo({top:y,behavior:RM?'auto':'smooth'});}));
  window.addEventListener('pointermove',e=>{mx=e.clientX/window.innerWidth*2-1;my=e.clientY/window.innerHeight*2-1;},{passive:true});
  new IntersectionObserver(es=>es.forEach(en=>vis=en.isIntersecting)).observe(sec);
  function size(){w=host.clientWidth;h=host.clientHeight;if(!w||!h)return;R2.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();}
  new ResizeObserver(size).observe(host);size();
  const e=AC.e,st=e.st,T4=Math.round(clamp(1150+9*e.opr,1100,1750)/10)*10;
  $('lfact4').innerHTML=`<span>Fan <b>${e.blades} blades</b></span><span>HPC <b>${st.hpc} stages</b></span><span>OPR <b>${e.opr} : 1</b></span><span>TIT <b>≈${fmt(T4)} °C</b></span>`;
  $('lstep4').textContent=`The ${e.name} opens stage by stage: ${e.blades}-blade composite fan, ${st.lpc}-stage booster, ${st.hpc}-stage HP compressor, annular combustor, ${st.hpt}-stage HP turbine and ${st.lpt}-stage LP turbine, with gas temperature colouring the flow from cold bypass to white-hot core.`;
  $('lfact1').innerHTML=`<span>Main gear <b>${mw}-wheel bogie</b></span><span>Flaps <b>30°</b></span><span>Slats <b>20°</b></span>`;
  $('lPill').querySelector('span').innerHTML=`Explore the ${esc(e.name)}<br>from fan to nozzle`;
  $('lHudAc').textContent=AC.name.replace('Boeing ','');
  const phName=p=>p<0.5?'CRUISE':p<1.5?'APPROACH':p<3.5?'HANGAR':'TEARDOWN';
  const PV=V(),hAlt=$('lHudAlt'),hIas=$('lHudIas'),hN1=$('lHudN1');
  function frameFn(now){
    requestAnimationFrame(frameFn);const dt=Math.min(0.05,(now-last)/1000);last=now;if(!vis||!isSite()||document.hidden)return;t+=dt;
    pC+=(pT-pC)*Math.min(1,dt*(RM?30:5));const p=pC,wide=window.innerWidth>720;
    cards.forEach((c,i)=>{const o=clamp(1-Math.abs(p-i)*1.7,0,1);c.style.opacity=o.toFixed(3);c.style.visibility=o<0.02?'hidden':'visible';c.style.pointerEvents=o>0.5?'auto':'none';const dy=(i-p)*46;c.style.transform=wide?`translateY(calc(-50% + ${dy.toFixed(1)}px))`:`translateY(${dy.toFixed(1)}px)`;});
    const cur=Math.round(p);dots.forEach((b,i)=>{b.classList.toggle('on',i===cur);b.style.setProperty('--p',clamp(p-i+1,0,1).toFixed(3));});
    const bo=clamp(1-p*2.2,0,1);bento.style.opacity=bo.toFixed(3);bento.style.transform=`translateY(${((1-bo)*60).toFixed(1)}px)`;bento.style.visibility=bo<0.02?'hidden':'visible';pill.style.opacity=bo.toFixed(3);pill.style.visibility=bo<0.02?'hidden':'visible';
    $('lHudPh').textContent=phName(p);$('lHudLv').textContent='L'+(p<1.5?0:p<2.5?1:p<3.5?2:3);if(fr%8===0){const ss=simState(AC,SIM.u);hAlt.textContent=fmt(Math.round(ss.altFt/10)*10)+' FT';hIas.textContent=Math.round(ss.ias)+' KT';hN1.textContent=(ss.eng[0]?ss.eng[0].n1:0).toFixed(1)+'%';}
    const stM={};['gear','flaps','slats','spl','rev','ail','fold'].forEach(k=>stM[k]=val(K[k],p));applyMotion(AF,stM);
    const xr=val(K.xray,p),ex=val(K.ex,p),alt=val(K.alt,p)*L,fl=val(K.flow,p);exNow=ex;
    if(skinS){skinS.transparent=xr>0.02;skinS.opacity=1-0.86*xr;skinS.depthWrite=xr<0.3;}inner.forEach(g=>g.visible=xr>0.05);
    const sc2=Math.max(L,S0)*0.12;exList.forEach(o=>o.position.copy(o.userData.base).addScaledVector(o.userData.ex,ex*sc2));
    air.position.y=alt;air.rotation.x=Math.sin(t*0.55)*0.035*(alt/L);air.rotation.z=(0.05+Math.sin(t*0.4)*0.015)*(alt/(L*0.42));
    const cell=grid.scale.x/60;grid.position.set(alt>0.5?-((t*L*0.5)%cell):0,gy,0);sh.position.set(0,gy+0.02,0);sh.material.opacity=clamp(1-alt/(L*0.3),0.15,1);
    flowAir.pts.material.opacity=fl;flowAir.pts.visible=fl>0.02;if(fl>0.02&&!RM)flowAir.update(dt);
    const ePh=clamp((p-3.35)/0.4,0,1);air.visible=ePh<0.98;eng.visible=ePh>0.02;eng.scale.setScalar(0.92+0.08*ez(ePh));
    const ee=ez(clamp((p-3.5)/0.5,0,1));A.group.traverse(o=>{if(o.userData.ex&&o.userData.base)o.position.copy(o.userData.base).addScaledVector(o.userData.ex,ee);});
    if(eng.visible&&!RM)flowEng.update(dt);
    if(!RM)anims.forEach(o=>{const a=o.userData.anim;if(a.type==='spin')o.rotation[a.axis]+=a.rate*dt;else a.f(o,t,dt);});
    const i=Math.min(Math.floor(p),3),f=ez(clamp(p-i,0,1));const A0=CAM[i],B0=CAM[i+1];
    const dir=A0.d.clone().normalize().lerp(B0.d.clone().normalize(),f).normalize();
    const fov=cam.fov*D2R/2,asp=Math.max(cam.aspect,0.45);const dAir=rAir/Math.tan(fov)*(asp<1?1.05/asp:0.92),dEng=rEng/Math.tan(fov)*(asp<1?1.05/asp:0.95);
    const eW=i===3?f:i>3?1:0;const target=cAir.clone().add(V(0,alt,0)).lerp(cEng,eW);const dist=lerp(dAir*lerp(A0.f,B0.f,f),dEng,eW);
    if(i===0)dir.applyAxisAngle(AY,Math.sin(t*0.12)*0.25*(1-f));
    const pos=target.clone().addScaledVector(dir,dist).add(V(mx*dist*0.04,-my*dist*0.03,0));cam.position.copy(pos);cam.lookAt(target);
    cam.near=Math.max(dist*0.01,0.05);cam.far=dist*20;
    const hb=clamp(1-p,0,1);if(wide&&window.innerWidth>1040)cam.setViewOffset(w,h,-w*(0.16-0.02*hb),h*0.1*hb,w,h);else if(wide)cam.setViewOffset(w,h,-w*0.1,0,w,h);else cam.setViewOffset(w,h,0,h*0.2,w,h);cam.updateProjectionMatrix();
    HEAT_TIME.value=t;sc.updateMatrixWorld();R2.render(sc,cam);
    // tags
    if(Math.abs(p-3)<0.45&&(fr%3===0||!sysW.k))SYS_ORDER.forEach(k=>{sysW[k]=new THREE.Box3().setFromObject(AF.sys[k]).getCenter(V());sysW.k=1;});
    const vis2=[];T.forEach(g=>{let o=clamp(1-Math.abs(p-g.step)*2.6,0,1);if(g.step===4)o*=clamp((p-3.7)/0.3,0,1);if(!wide&&g.step<3)o=0;if(o<0.02){g.el.style.opacity='0';return;}
      const q=g.pos();if(!g.world)air.localToWorld(q);PV.copy(q).project(cam);if(PV.z>1){g.el.style.opacity='0';return;}
      if(!g.wd)g.wd=g.el.querySelector('span').offsetWidth+20;vis2.push({g,o,x:(PV.x+1)/2*w,y:(1-PV.y)/2*h,dy:0});});
    vis2.sort((a,b)=>a.y-b.y);const placed=[];vis2.forEach(v=>{let yy=v.y;for(let n=0;n<8;n++){const hit=placed.find(q=>Math.abs(q.y-yy)<26&&v.x<q.x+q.g.wd&&q.x<v.x+v.g.wd);if(!hit)break;yy=hit.y+26;}v.dy=yy-v.y;placed.push({x:v.x,y:yy,g:v.g});
      v.g.el.style.opacity=v.o.toFixed(3);v.g.el.style.transform=`translate(${v.x.toFixed(1)}px,${v.y.toFixed(1)}px)`;v.g.el.querySelector('span').style.transform=v.dy?`translateY(${v.dy.toFixed(0)}px)`:'';v.g.el.classList.toggle('sh',v.dy>0);});
    if(bo>0.02&&(fr++%3===0)){const ep=pod.getWorldPosition(V());ep.project(cam);const cv=R2.domElement,sx=(ep.x+1)/2*cv.width,sy=(1-ep.y)/2*cv.height,cs=cv.height*0.2;try{thumb.drawImage(cv,sx-cs/2,sy-cs/2,cs,cs,0,0,152,152);}catch(err){}}
  }
  requestAnimationFrame(frameFn);
})();

/* ---------- bento, counters, marquee ---------- */
(function bentoBits(){
  const el=$('lParts');el.textContent=fmt(nParts);
  if(!RM){const t0=performance.now()+700,d=1700;const step=n=>{const k=clamp((n-t0)/d,0,1);el.textContent=fmt(Math.round(nParts*(1-Math.pow(1-k,3))));if(k<1)requestAnimationFrame(step);};requestAnimationFrame(step);}
  $('lMq').innerHTML=[...FLEET,...FLEET].map(a=>`<span>${esc(a.name.replace(a.mfr+' ',''))}</span>`).join('');
  $('lAvs').innerHTML=['a388','b748','conc','f22'].filter(id=>FLEET_BY_ID[id]).map(id=>`<span title="${esc(FLEET_BY_ID[id].name)}">${blueprintSVG(FLEET_BY_ID[id],'top')}</span>`).join('')+`<span class="more">+${FLEET.length-4}</span>`;
  LD.querySelector('.l-peek span').textContent=FLEET.length;
  const cv=$('lRadar'),c=cv.getContext('2d');let a=0,last=performance.now(),vis=true;new IntersectionObserver(es=>es.forEach(e=>vis=e.isIntersecting)).observe(cv);
  const blips=[[0.62,0.55],[0.35,1.6],[0.8,2.6],[0.5,4.1]];
  (function f(now){requestAnimationFrame(f);const dt=(now-last)/1000;last=now;if(!vis||!isSite())return;if(!RM)a+=dt*1.1;c.clearRect(0,0,600,600);const cx=300,cy=300;
    c.strokeStyle='rgba(10,10,10,.3)';c.lineWidth=2;[80,150,220,290].forEach(r=>{c.beginPath();c.arc(cx,cy,r,0,TAU);c.stroke();});
    c.beginPath();c.moveTo(cx-290,cy);c.lineTo(cx+290,cy);c.moveTo(cx,cy-290);c.lineTo(cx,cy+290);c.strokeStyle='rgba(10,10,10,.2)';c.stroke();
    if(c.createConicGradient){const g=c.createConicGradient(a-0.9,cx,cy);g.addColorStop(0,'rgba(10,10,10,0)');g.addColorStop(0.14,'rgba(10,10,10,.34)');g.addColorStop(0.145,'rgba(10,10,10,0)');c.fillStyle=g;c.beginPath();c.arc(cx,cy,290,0,TAU);c.fill();}
    blips.forEach(([r,ang])=>{const d=((a-ang)%TAU+TAU)%TAU,al=clamp(1-d/3,0.15,1),x=cx+Math.cos(ang)*r*290,y=cy+Math.sin(ang)*r*290;c.fillStyle=`rgba(255,252,240,${al})`;c.beginPath();c.arc(x,y,11,0,TAU);c.fill();c.strokeStyle=`rgba(10,10,10,${al*0.5})`;c.lineWidth=3;c.beginPath();c.arc(x,y,20,0,TAU);c.stroke();});})(performance.now());
  const pfd=$('lPfd');let pv=true;new IntersectionObserver(es=>es.forEach(e=>pv=e.isIntersecting)).observe(pfd);
  setInterval(()=>{if(!pv||!isSite()||document.hidden)return;const st=simState(AC,SIM.u);drawPanelInto(pfd,'pfd',AC,st);$('lPfdPh').textContent=st.phase;},90);
  $('lStats').innerHTML=[[FLEET.length,'Airframes'],[nEng,'Engines'],[fmt(nParts),'Mapped parts'],['4','Dissection levels']].map(([n,l])=>`<div><b>${n}</b><small>${l}</small></div>`).join('');
})();

/* ---------- system plates: live studio renders ---------- */
(function plates(){
  const box=$('lPlates');
  const PL=[
    {sys:'prop',cls:'big',d:V(0.85,0.32,1),
      h:'Powerplant',p:`${AC.nEng}× ${AC.e.name}. Nacelle, fan, booster, HP compressor, combustor and both turbines, separated along the engine axis.`,
      kv:[['Thrust',fmt(AC.e.thrust)+' '+thrustUnit(AC.e)],['BPR',AC.e.bpr+' : 1'],['OPR',AC.e.opr+' : 1'],['Fan',AC.e.blades+' blades']]},
    {sys:'wing',cls:'wide',d:V(0.25,1,0.75),h:'Wing & high-lift',p:'Front and rear spars, ribs, integral fuel tanks, slats on curved tracks and Fowler flaps.',kv:[['Span',AC.S+' m'],['Spars','15% · 64% c']]},
    {sys:'gear',cls:'',d:V(0.9,0.3,1),h:'Landing gear',p:'Oleo struts, side braces, trunnions and carbon brakes.',kv:[['Main',Math.max(...AC.gear.main)+'-wheel']]},
    {sys:'cockpit',cls:'',d:V(-0.9,0.75,0.8),h:'Flight deck',p:'Displays, glareshield, overhead and pedestal, drawn live.',kv:[['Cockpit',{ecam:'ECAM',eicas:'EICAS',analog:'Analog',mil:'HUD'}[avFam(AC)]+' · '+{side:'sidestick',stick:'stick',yoke:'yoke'}[AC.ctl]]]},
    {sys:'fus',cls:'wide',d:V(0.65,0.42,1),h:'Fuselage barrel',p:'Skin, frames on a 533 mm pitch, stringers, floor beams and the cargo hold, exploded ring by ring.',kv:[['Length',AC.L+' m'],['Pitch','533 mm']]},
    {sys:'emp',cls:'wide',d:V(0.95,0.45,1),h:'Empennage',p:'Vertical fin and rudder, trimmable horizontal stabiliser and elevators, with the tail cone.',kv:[['Surfaces','Rudder · elevators · THS']]}];
  const count=k=>Object.values(TREE.nodes).filter(n=>n.sys===k).length;
  box.innerHTML=PL.map((P,i)=>`<article class="l-pl ${P.cls}" data-i="${i}" tabindex="0" role="button" aria-label="Open ${esc(P.h)} in the workbench"><canvas aria-hidden="true"></canvas><div class="lbs" aria-hidden="true"></div>
    <div class="ph"><span class="ata">ATA ${esc(ATA_SYS[P.sys](AC))}</span><span class="cnt">${count(P.sys)} parts</span></div>
    <div class="pb"><h3>${esc(P.h)}</h3><p>${esc(P.p)}</p><div class="kv">${P.kv.map(([k,v])=>`<span>${esc(k)} <b>${esc(v)}</b></span>`).join('')}</div></div>
    ${P.cls==='big'?`<span class="hint">${HOVER?'HOVER TO EXPLODE':'LIVE IN VIEW'}</span>`:''}<span class="open" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 17L17 7M9 7h8v8"/></svg></span></article>`).join('');
  let R=null,sc,cam,ok=true;
  try{R=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:false});}catch(e){ok=false;}
  if(!ok)return;
  R.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));R.outputColorSpace=THREE.SRGBColorSpace;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.08;R.setClearColor(0,0);
  sc=new THREE.Scene();sc.environment=makeEnv(R);
  sc.add(new THREE.HemisphereLight(0xfff8e8,0x100d07,0.45));const k1=new THREE.DirectionalLight(0xfff3df,1.2);k1.position.set(30,50,40);sc.add(k1);
  const k2=new THREE.DirectionalLight(0xffb81c,1.9);k2.position.set(-50,18,-35);sc.add(k2);const k3=new THREE.DirectionalLight(0xff8f00,0.6);k3.position.set(-20,-15,50);sc.add(k3);
  cam=new THREE.PerspectiveCamera(28,1,0.05,2000);
  const map=new Map();
  const els=[...box.querySelectorAll('.l-pl')];
  const items=PL.map((P,i)=>{const A=buildAssembly(AC,P.sys,AF);cloneInto(A.group,map);A.group.visible=false;sc.add(A.group);
    if(P.sys==='prop'||P.sys==='cockpit'){const g=(map.get(MAT.skin)||new THREE.MeshStandardMaterial()).clone();g.transparent=true;g.opacity=P.sys==='cockpit'?0.1:0.16;g.depthWrite=false;A.group.traverse(o=>{if(o.userData.skin&&o.material)o.material=g;});}
    const parts=[];A.group.traverse(o=>{if(o.userData.ex&&o.userData.base)parts.push(o);});
    const anims=[];A.group.traverse(o=>{if(o.userData.anim)anims.push(o);});
    let flow=null;if(P.sys==='prop'&&A.flows.length){flow=new Flow(A.flows.map(makeEmitter),AC.e.dia*0.03);A.group.add(flow.pts);flow.pts.visible=false;}
    const setEx=v=>parts.forEach(o=>o.position.copy(o.userData.base).addScaledVector(o.userData.ex,v));
    A.group.visible=true;setEx(1);const bb=boxOf(A.group);A.group.visible=false;const c=bb.getCenter(V()),r=bb.getBoundingSphere(new THREE.Sphere()).radius;
    const keys=Object.keys(A.parts),nL=P.cls==='big'?4:3,pick=keys.length<=nL?keys:range(nL).map(j=>keys[Math.round(j*(keys.length-1)/(nL-1))]);
    const el=els[i],lbs=el.querySelector('.lbs');
    const labs=pick.map(kk=>{const n=TREE.nodes[P.sys+'/'+kk],d=document.createElement('div');d.className='lb';d.innerHTML=`<span>${esc(short(n?n.name:kk))}</span>`;lbs.appendChild(d);return {d,part:A.parts[kk]};});
    return {P,A,setEx,c,r,el,cv:el.querySelector('canvas'),labs,anims,flow,h:0,tgt:0,rot:0,t:0,dirty:true,inView:false};});
  let lastW=0,lastH=0;const PV=V();
  function render(it,dt){const cw=it.cv.clientWidth,ch=it.cv.clientHeight;if(!cw||!ch)return;
    if(cw!==lastW||ch!==lastH){R.setSize(cw,ch,false);lastW=cw;lastH=ch;}
    const dpr=R.getPixelRatio(),W=Math.round(cw*dpr),H=Math.round(ch*dpr);if(it.cv.width!==W||it.cv.height!==H){it.cv.width=W;it.cv.height=H;}
    items.forEach(o=>o.A.group.visible=o===it);
    const hh=ez(it.h);it.setEx(lerp(0.38,1,hh));
    if(dt&&!RM){it.anims.forEach(o=>{const a=o.userData.anim;if(a.type==='spin')o.rotation[a.axis]+=a.rate*dt*hh;else a.f(o,it.t,dt*hh);});if(it.flow){it.flow.pts.visible=hh>0.05;if(hh>0.05)it.flow.update(dt);it.flow.pts.material.opacity=hh;}}
    if(it.P.sys==='cockpit'&&hh>0.05){it._pt=(it._pt||0)+(dt||0);if(it._pt>0.12){it._pt=0;updatePanelTextures(AC,simState(AC,SIM.u));}}
    cam.aspect=cw/ch;const dir=it.P.d.clone().normalize().applyAxisAngle(AY,it.rot);const fov=cam.fov*D2R/2;const fit=it.r/Math.sin(fov)*(cam.aspect<1?1/cam.aspect*0.92:0.92)*({big:1,wide:1.14,'':1.12}[it.P.cls]);
    cam.position.copy(it.c).addScaledVector(dir,fit*(1.04-0.08*hh));cam.lookAt(it.c);cam.near=fit*0.02;cam.far=fit*10;cam.setViewOffset(cw,ch,0,ch*0.16,cw,ch);cam.updateProjectionMatrix();
    sc.updateMatrixWorld();R.render(sc,cam);const x=it.cv.getContext('2d');x.clearRect(0,0,W,H);x.drawImage(R.domElement,0,0,W,H);
    it.labs.forEach(l=>{const q=l.part.localToWorld(l.part.userData.cLocal.clone());PV.copy(q).project(cam);l.d.style.left=((PV.x+1)/2*100).toFixed(2)+'%';l.d.style.top=((1-PV.y)/2*100).toFixed(2)+'%';});}
  els.forEach((el,i)=>{const it=items[i];
    if(HOVER){el.addEventListener('pointerenter',()=>{it.tgt=1;el.classList.add('act');});el.addEventListener('pointerleave',()=>{it.tgt=0;el.classList.remove('act');});}
    el.addEventListener('focus',()=>{it.tgt=1;el.classList.add('act');});el.addEventListener('blur',()=>{if(!HOVER)return;it.tgt=0;el.classList.remove('act');});
    el.addEventListener('click',()=>openLab(AC.id,it.P.sys));el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openLab(AC.id,it.P.sys);}});});
  const io=new IntersectionObserver(es=>es.forEach(en=>{const it=items[els.indexOf(en.target)];it.inView=en.isIntersecting;if(en.isIntersecting)it.dirty=true;
    if(!HOVER){const on=en.intersectionRatio>0.6;it.tgt=on?1:0;en.target.classList.toggle('act',on);}}),{threshold:[0,0.6]});els.forEach(el=>io.observe(el));
  new ResizeObserver(()=>items.forEach(it=>it.dirty=true)).observe(box);
  let last=performance.now();
  (function loop(now){requestAnimationFrame(loop);const dt=Math.min(0.05,(now-last)/1000);last=now;if(!isSite()||document.hidden)return;
    items.forEach(it=>{if(!it.inView)return;const moving=Math.abs(it.tgt-it.h)>0.002||it.tgt>0;if(!moving&&!it.dirty)return;
      it.h+=(it.tgt-it.h)*Math.min(1,dt*(RM?30:4));it.t+=dt;if(!RM)it.rot+=dt*0.32*ez(it.h);render(it,dt);it.dirty=false;});})(performance.now());
})();

/* ---------- live flight deck ---------- */
(function deck(){
  const FAM=[['a359','Airbus A350','ECAM'],['b789','Boeing 787-9','EICAS'],['b748','Boeing 747-8','4 engines'],['at76','ATR 72-600','Turboprop'],['f22','F-22 Raptor','HUD'],['dc3','Douglas DC-3','Analog']].filter(f=>FLEET_BY_ID[f[0]]);
  let ac=FLEET_BY_ID[FAM[0][0]],page='HYD',vis=false;const fam=$('lFam'),pages=$('lPages'),wall=LD.querySelector('.l-wall');
  fam.innerHTML=FAM.map(([id,n,t])=>`<button type="button" role="tab" data-ac="${id}" aria-selected="${id===ac.id}">${esc(n)}<small>${esc(t)}</small></button>`).join('');
  pages.innerHTML=SYS_PAGES.map(p=>`<button type="button" role="tab" data-pg="${p}" aria-selected="${p===page}">${p}</button>`).join('');
  const caps=()=>{const f=avFam(ac);$('lCapMcp').textContent={ecam:'FCU · glareshield',eicas:'MCP · glareshield',analog:'Autopilot panel',mil:'Up-front control'}[f];$('lCapEng').textContent={ecam:'E/WD · engine & warning',eicas:'EICAS · engines',analog:'Engine gauges',mil:'MFD · engines'}[f];$('lCapSys').textContent=({ecam:'SD · ',eicas:'MFD · ',analog:'Systems · ',mil:'MFD · '}[f])+page;};
  fam.querySelectorAll('[data-ac]').forEach(b=>b.onclick=()=>{ac=FLEET_BY_ID[b.dataset.ac];fam.querySelectorAll('[data-ac]').forEach(x=>x.setAttribute('aria-selected',String(x===b)));caps();draw();});
  pages.querySelectorAll('[data-pg]').forEach(b=>b.onclick=()=>{page=b.dataset.pg;pages.querySelectorAll('[data-pg]').forEach(x=>x.setAttribute('aria-selected',String(x===b)));caps();draw();});
  $('lSim').innerHTML=SIM_CTL_HTML;bindSimControls($('lSim'));caps();
  function draw(){const st=simState(ac,SIM.u);wall.querySelectorAll('canvas[data-k]').forEach(cv=>drawPanelInto(cv,cv.dataset.k,ac,st,page));}
  new IntersectionObserver(es=>es.forEach(e=>{vis=e.isIntersecting;if(vis)draw();}),{rootMargin:'120px'}).observe(wall);
  const rng=$('lSim').querySelector('[data-sim=u]');setInterval(()=>{if(!vis||!isSite()||document.hidden)return;draw();rng.style.setProperty('--p',(rng.value/9.99).toFixed(1)+'%');},70);
})();

/* ---------- fleet rail ---------- */
(function fleet(){
  let cat='';const tabs=$('lFleetTabs'),rail=$('lFleet');
  const sh=v=>v.replace(/ &.*| Commercial/,'').replace('Next-Gen Global','Global & Eastern').replace('Military Transports, Fighters','Military').replace('Supersonic, Tri-Jets','Supersonic & Icons');
  tabs.innerHTML=[['','All',FLEET.length],...Object.entries(CATS).map(([k,v])=>[k,sh(v),FLEET.filter(a=>a.cat===k).length])].map(([k,l,n])=>`<button type="button" role="tab" data-cat="${k}" aria-selected="${k===cat}">${esc(l)}<small>${n}</small></button>`).join('');
  tabs.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{cat=b.dataset.cat;tabs.querySelectorAll('[data-cat]').forEach(x=>x.setAttribute('aria-selected',String(x===b)));render();rail.scrollTo({left:0});});
  const cache={};const bp=a=>cache[a.id]||(cache[a.id]=blueprintSVG(a,'top').replace(/<(path|rect|polygon|polyline|line|circle|ellipse) /g,'<$1 pathLength="1" '));
  let io=null;
  function render(){const list=FLEET.filter(a=>!cat||a.cat===cat);
    rail.innerHTML=list.map(a=>`<article class="l-fc"><div class="bp"><span class="tag">${esc(a.id.toUpperCase())} · PLAN</span>${a.status?`<span class="st">${esc(a.status)}</span>`:''}${bp(a)}</div>
      <div class="meta"><div class="mf">${esc(a.mfr)}</div><h3>${esc(a.name.replace(a.mfr+' ',''))}</h3><div class="en">${a.nEng}× ${esc(a.e.name)}</div>
      <div class="k3"><div><small>Span</small>${a.S} m</div><div><small>Length</small>${a.L} m</div><div><small>MTOW</small>${fmt(a.mtow,a.mtow<10?2:0)} t</div></div>
      <button class="go" type="button" data-open="${a.id}">Dissect →</button></div></article>`).join('');
    if(io)io.disconnect();if(RM||!('IntersectionObserver' in window)){rail.querySelectorAll('.l-fc').forEach(c=>c.classList.add('in'));return;}
    io=new IntersectionObserver(es=>es.forEach(en=>{if(en.isIntersecting){en.target.classList.add('in');io.unobserve(en.target);}}),{root:null,threshold:0.25});rail.querySelectorAll('.l-fc').forEach(c=>io.observe(c));}
  render();
})();

/* ---------- capabilities ---------- */
(function caps(){
  const I=d=>`<svg viewBox="0 0 34 34" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const C=[['Four-level dissection','Aircraft, system, sub-assembly and part, each a click deeper, with ghost cutaways and constraint explode.',I('<rect x="4" y="4" width="10" height="10" rx="2"/><rect x="20" y="4" width="10" height="10" rx="2"/><rect x="12" y="20" width="10" height="10" rx="2"/><path d="M9 14v3h16v-3M17 17v3"/>'),''],
    ['View cube & presets','Iso, front, rear, top and both sides, with eased camera moves and frame-to-fit.',I('<path d="M17 4l11 6v14l-11 6-11-6V10z"/><path d="M6 10l11 6 11-6M17 16v14"/>'),'1–6'],
    ['True orthographic','Switch to a parallel projection for drawing-accurate silhouettes.',I('<rect x="5" y="8" width="24" height="18"/><path d="M5 17h24M17 8v18"/>'),'O'],
    ['Point-to-point measure','Click two points on the model for distance, with ΔX ΔY ΔZ components.',I('<path d="M5 25L25 5M8 28l-3-3M28 8l-3-3M12 18l2 2M16 14l2 2M20 10l2 2"/>'),'M'],
    ['Section planes','Cut the airframe along any axis to read the structure inside.',I('<path d="M4 22l13-8 13 8-13 8z"/><path d="M17 4v26" stroke-dasharray="2 3"/>'),''],
    ['Edges, clay, X-ray, thermal','Display styles for engineering review, from clean edges to gas-temperature maps.',I('<circle cx="17" cy="17" r="12"/><path d="M17 5a12 12 0 000 24z" fill="currentColor" fill-opacity=".25"/>'),'E'],
    ['Split-view compare','Two airframes side by side, with the same camera and a spec comparator.',I('<rect x="4" y="7" width="26" height="20" rx="2"/><path d="M17 7v20"/>'),''],
    ['Gate-to-gate simulation','Start, taxi, takeoff, climb, cruise, approach and rollout, driving every surface.',I('<path d="M4 24c6 0 8-14 13-14s7 14 13 14"/><circle cx="17" cy="10" r="2"/>'),'Space'],
    ['Engine & cabin options','Every certified powerplant, wingtip and cabin layout, with weight and paint.',I('<circle cx="17" cy="17" r="11"/><circle cx="17" cy="17" r="3"/><path d="M17 6v8M17 20v8M6 17h8M20 17h8"/>'),''],
    ['ATA iSpec 2200 tree','Every node coded by chapter, searchable, with per-part visibility toggles.',I('<path d="M6 6h8v6H6zM6 22h8v6H6zM20 14h8v6h-8z"/><path d="M14 9h3v16h-3M17 17h3"/>'),''],
    ['SI and imperial','Lengths, masses and thrust switch together, everywhere.',I('<path d="M4 12h26v10H4z"/><path d="M9 12v4M14 12v6M19 12v4M24 12v6"/>'),''],
    ['Fleet data grid','Sortable tables of every airframe and engine, one click from the model.',I('<rect x="4" y="6" width="26" height="22" rx="2"/><path d="M4 13h26M4 20h26M13 6v22"/>'),'']];
  $('lCaps').innerHTML=C.map(([h,p,ic,k],i)=>`<div class="l-cap">${ic}${k?`<kbd>${k}</kbd>`:''}<span class="n">${String(i+1).padStart(2,'0')}</span><h3>${esc(h)}</h3><p>${esc(p)}</p></div>`).join('');
})();

/* ---------- pipeline (real data, live) ---------- */
(function how(){
  const row=GLOBAL_FLEET_DB.find(r=>r[0]===AC.id)||[];const pick=['id','L','S','H','D','sweep','eng','nEng'];
  const code=pick.map(k=>{const v=row[FLEET_COLS.indexOf(k)];return `<i>${k}</i> <b>${esc(typeof v==='string'?"'"+v+"'":v)}</b>`;}).join('<br>');
  let meshes=0;AF.root.traverse(o=>{if(o.isMesh||o.isInstancedMesh)meshes++;});
  const nodes=Object.keys(TREE.nodes).length;
  $('lHow').innerHTML=`
  <li class="l-st"><span class="no">01</span><h3>Published data</h3><p>One row per aircraft: dimensions, wing, engine, gear, cockpit and weights.</p><div class="l-code">${code}</div></li>
  <li class="l-st"><span class="no">02</span><h3>Parametric synthesis</h3><p>Lofted fuselage, kinked swept wing, tail, nacelles and gear trucks are built from that row.</p><div class="l-kv2"><span>Length<b>${AC.L} m</b></span><span>Span<b>${AC.S} m</b></span><span>Sweep<b>${AC.sweep}°</b></span><span>Engines<b>${AC.nEng}× ${esc(AC.e.name.split('/')[0])}</b></span></div><div class="big">${fmt(meshes)}<small>meshes</small></div></li>
  <li class="l-st"><span class="no">03</span><h3>ATA parts tree</h3><p>Every node coded to its iSpec 2200 chapter, from the aircraft down to a single blade.</p><div class="l-kv2"><span>Systems<b>6</b></span><span>Levels<b>4</b></span><span>Fan<b>${AC.e.blades} blades</b></span><span>HPC<b>${AC.e.st.hpc} stages</b></span></div><div class="big">${fmt(nodes)}<small>nodes</small></div></li>
  <li class="l-st"><span class="no">04</span><h3>Live simulation</h3><p>A gate-to-gate profile drives the surfaces, the engines and every cockpit display.</p><div class="l-kv2"><span>Phase<b id="lHowPh">—</b></span><span>Altitude<b id="lHowAlt">—</b></span><span>IAS<b id="lHowIas">—</b></span><span>N1<b id="lHowN1">—</b></span></div><div class="big">${SIM_KF.length}<small>profile points</small></div></li>`;
  const el=$('lHow');let vis=false;new IntersectionObserver(es=>es.forEach(e=>vis=e.isIntersecting)).observe(el);
  setInterval(()=>{if(!vis||!isSite()||document.hidden)return;const s=simState(AC,SIM.u);$('lHowPh').textContent=s.phase;$('lHowAlt').textContent=fmt(Math.round(s.altFt/10)*10)+' ft';$('lHowIas').textContent=Math.round(s.ias)+' kt';$('lHowN1').textContent=(s.eng[0]?s.eng[0].n1:0).toFixed(1)+'%';},250);
})();
(function prog(){const bar=$('lProg');const f=()=>{if(!isSite())return;const h=document.documentElement.scrollHeight-innerHeight;bar.style.transform=`scaleX(${clamp(scrollY/Math.max(h,1),0,1).toFixed(4)})`;};addEventListener('scroll',f,{passive:true});addEventListener('resize',f);f();})();

/* ---------- reveals & nav ---------- */
(function reveal(){
  const els=[...LD.querySelectorAll('.l-rv')];
  if(!RM&&'IntersectionObserver' in window){els.forEach(el=>{if(el.getBoundingClientRect().top>window.innerHeight*0.95)el.classList.add('pre');});
    const io=new IntersectionObserver(es=>es.forEach(en=>{if(en.isIntersecting){en.target.classList.remove('pre');io.unobserve(en.target);}}),{rootMargin:'0px 0px -8% 0px'});els.forEach(el=>io.observe(el));}
  const links=[...LD.querySelectorAll('.l-bar nav a')];const secs=links.map(a=>document.querySelector(a.getAttribute('href')));
  const nio=new IntersectionObserver(es=>es.forEach(en=>{if(en.isIntersecting){const i=secs.indexOf(en.target);links.forEach((l,j)=>l.classList.toggle('on',j===i));}}),{rootMargin:'-45% 0px -50% 0px'});secs.forEach(s=>s&&nio.observe(s));
})();
})();
/* ---------- hero fit: keep story cards clear of the step rail ---------- */
(function heroFit(){
  const frameEl=document.querySelector('#landing .l-frame'),box=document.querySelector('#landing .l-cards'),rail=document.querySelector('#landing .l-rail');if(!frameEl||!box||!rail)return;
  const cards=[...box.querySelectorAll('.l-sc')];
  function fit(){if(window.innerWidth<=720){box.style.removeProperty('--fit');return;}
    const fr=frameEl.getBoundingClientRect(),H=fr.height;if(!H)return;
    const railTop=H-(parseFloat(getComputedStyle(rail).bottom)||28)-rail.offsetHeight-18;
    const centre=box.offsetTop,hud=64,below=railTop-centre,above=centre-hud;
    const ch=Math.max(...cards.map(c=>c.offsetHeight));
    const f=Math.min(1,(2*Math.min(below,above))/Math.max(ch,1));box.style.setProperty('--fit',Math.max(0.5,f).toFixed(3));}
  new ResizeObserver(fit).observe(frameEl);window.addEventListener('resize',fit);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);fit();
})();

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
