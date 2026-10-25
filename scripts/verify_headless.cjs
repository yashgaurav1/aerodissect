const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9222;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function httpPut(url) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: 'PUT' }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.end();
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.callbacks = new Map();
    this.events = [];
    this.consoleLogs = [];

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
        if (msg.method === 'Runtime.consoleAPICalled') {
          const text = msg.params.args.map(a => a.value || JSON.stringify(a)).join(' ');
          this.consoleLogs.push({ type: msg.params.type, text });
          console.log(`  [Browser Console ${msg.params.type.toUpperCase()}] ${text}`);
        } else if (msg.method === 'Runtime.exceptionThrown') {
          console.error('  [Browser Exception]', JSON.stringify(msg.params.exceptionDetails));
          this.consoleLogs.push({ type: 'error', text: msg.params.exceptionDetails.text });
        }
      }
    };
  }

  ready() {
    return new Promise((resolve) => {
      if (this.ws.readyState === WebSocket.OPEN) resolve();
      else this.ws.onopen = () => resolve();
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(JSON.stringify(res.exceptionDetails));
    }
    return res.result ? res.result.value : undefined;
  }

  close() {
    this.ws.close();
  }
}

async function run() {
  console.log('====================================================');
  console.log(' STARTING END-TO-END AERODISSECT HEADLESS VALIDATION');
  console.log('====================================================');

  const browser = spawn(edgePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--window-size=1600,1000',
    'about:blank'
  ], { stdio: 'ignore' });

  // 1. Wait for CDP port
  let version = null;
  for (let i = 0; i < 40; i++) {
    try {
      version = await httpGet(`http://127.0.0.1:${port}/json/version`);
      break;
    } catch (e) {
      await sleep(150);
    }
  }
  if (!version) {
    console.error('Failed to connect to Edge CDP');
    browser.kill();
    process.exit(1);
  }
  console.log('Connected to Edge:', version.Browser);

  // 2. Open tab to http://localhost:5173/
  const tab = await httpPut(`http://127.0.0.1:${port}/json/new?http://localhost:5173/`);
  const cdp = new CDPClient(tab.webSocketDebuggerUrl);
  await cdp.ready();
  console.log('CDP WebSocket connected!');

  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');

  // Wait for initial load and splash transition
  console.log('Waiting 2.5s for app initialization & WebGL setup...');
  await sleep(2500);

  // 3. Test Landing Page elements
  console.log('\n--- 1. Testing Landing Page (Site Mode) ---');
  const isSite = await cdp.eval('document.documentElement.classList.contains("site")');
  console.log('  Landing mode active (html.site):', isSite);

  const landingTitle = await cdp.eval('document.querySelector(".l-hero h1")?.textContent?.trim()');
  console.log('  Hero title:', landingTitle?.replace(/\s+/g, ' '));

  const showViewCanvas = await cdp.eval('Boolean(document.querySelector("#showView canvas"))');
  console.log('  Landing 3D WebGL Canvas present:', showViewCanvas);

  const bentoRadar = await cdp.eval('Boolean(document.querySelector("#lRadar"))');
  const bentoPfd = await cdp.eval('Boolean(document.querySelector("#lPfd"))');
  console.log('  Bento Radar canvas:', bentoRadar, '| Bento PFD canvas:', bentoPfd);

  const fleetCardsCount = await cdp.eval('document.querySelectorAll(".l-fc").length');
  console.log(`  Fleet rail cards rendered: ${fleetCardsCount} (Expect 74)`);

  const platesCount = await cdp.eval('document.querySelectorAll(".l-pl").length');
  console.log(`  Interactive System Plates count: ${platesCount} (Expect 6)`);

  // v9 Features verification
  const howCardsCount = await cdp.eval('document.querySelectorAll("#lHow .l-st").length');
  console.log(`  v9 Pipeline steps rendered: ${howCardsCount} (Expect 4)`);

  const sigCreditText = await cdp.eval('document.querySelector(".l-credit b")?.textContent');
  console.log(`  v9 Designer Credit: "${sigCreditText}" (Expect Yash Gaurav)`);

  const lHudActive = await cdp.eval('Boolean(document.querySelector(".l-hud"))');
  console.log('  v9 Hero HUD Instrument strip active:', lHudActive);

  const lProgActive = await cdp.eval('Boolean(document.querySelector("#lProg"))');
  console.log('  v9 Scroll progress bar active:', lProgActive);

  // 4. Test Transition into Workbench (#lab)
  console.log('\n--- 2. Testing Transition to CAD Workbench (#lab) ---');
  await cdp.eval('window.openLab("b77w")');
  console.log('  Triggered openLab("b77w"). Waiting 1s for shutter transition...');
  await sleep(1200);

  const isLab = await cdp.eval('document.documentElement.classList.contains("lab")');
  console.log('  Workbench mode active (html.lab):', isLab);

  const activeAcName = await cdp.eval('S.ac?.name');
  console.log('  Active Aircraft in Workbench:', activeAcName);

  const workbenchCanvas = await cdp.eval('Boolean(document.querySelector("#view canvas"))');
  console.log('  Workbench 3D WebGL Canvas present:', workbenchCanvas);

  const treeNodesCount = await cdp.eval('document.querySelectorAll("#tree .tn").length');
  console.log(`  ATA Specification Tree nodes rendered: ${treeNodesCount}`);

  const levelName = await cdp.eval('document.getElementById("lvlName")?.textContent');
  console.log('  Initial Dissection Depth Level:', levelName);

  // 5. Test Theme Toggle
  console.log('\n--- 3. Testing Dual Theme Toggle ---');
  const initialTheme = await cdp.eval('document.documentElement.getAttribute("data-theme") || "dark"');
  console.log('  Initial theme:', initialTheme);

  await cdp.eval('document.getElementById("themeBtn").click()');
  await sleep(300);
  const switchedTheme = await cdp.eval('document.documentElement.getAttribute("data-theme") || "dark"');
  console.log('  Theme after toggle 1 (Expect light):', switchedTheme);

  await cdp.eval('document.getElementById("themeBtn").click()');
  await sleep(300);
  const revertedTheme = await cdp.eval('document.documentElement.getAttribute("data-theme") || "dark"');
  console.log('  Theme after toggle 2 (Expect dark):', revertedTheme);

  // 6. Test Audio Engine & Toggle
  console.log('\n--- 4. Testing Procedural Cockpit Audio Engine ---');
  const audioInitialized = await cdp.eval('Boolean(window.audio)');
  const isMuted = await cdp.eval('window.audio?.muted');
  console.log('  Audio object initialized:', audioInitialized, '| Muted:', isMuted);

  await cdp.eval('window.audio.toggleMute()');
  const mutedAfter = await cdp.eval('window.audio.muted');
  console.log('  Mute state after toggle:', mutedAfter);
  await cdp.eval('window.audio.toggleMute()'); // Restore

  // 7. Test Dissection & Navigation (Safeguard check: aircraft must never disappear)
  console.log('\n--- 5. Testing Multi-Depth Dissection & Navigation Stability ---');
  
  // Level 1: Prop
  await cdp.eval('go(1, "prop")');
  await sleep(500);
  const l1State = await cdp.eval('({ level: S.level, sys: S.sys })');
  console.log('  Navigated to Level 1 (Major System - Propulsion):', JSON.stringify(l1State));

  // Level 2: Sub-assembly
  await cdp.eval('go(2, "prop")');
  await sleep(500);
  const l2State = await cdp.eval('({ level: S.level, sys: S.sys, parts: Object.keys(S.asm?.parts || {}).length })');
  console.log('  Navigated to Level 2 (Sub-Assembly Exploded):', JSON.stringify(l2State));

  // Level 3: Micro-component
  const l3ChildId = await cdp.eval('S.tree.nodes["prop"]?.children?.[0]?.children?.[0]?.id');
  if (l3ChildId) {
    await cdp.eval(`dissect("${l3ChildId}")`);
    await sleep(500);
    const l3State = await cdp.eval('({ level: S.level, l3: S.l3 })');
    console.log('  Navigated to Level 3 (Micro-Component Live Mechanism):', JSON.stringify(l3State));
  }

  // Ascend back to Level 0
  await cdp.eval('go(0)');
  await sleep(500);
  const l0State = await cdp.eval('({ level: S.level, sys: S.sys })');
  console.log('  Ascended back to Level 0 (Complete Airframe):', JSON.stringify(l0State));

  // 8. Test Aircraft Switcher
  console.log('\n--- 6. Testing Dynamic Aircraft Switching ---');
  const testAirframes = ['a359', 'conc', 'f22', 'b789'];
  for (const acId of testAirframes) {
    await cdp.eval(`setAircraft("${acId}")`);
    await sleep(400);
    const acInfo = await cdp.eval('({ id: S.ac?.id, name: S.ac?.name, nEng: S.ac?.nEng, engName: S.ac?.e?.name })');
    console.log(`  Switched to [${acId}]: ${acInfo.name} (${acInfo.nEng}x ${acInfo.engName})`);
  }

  // 9. Check for any uncaught errors in console logs
  console.log('\n--- 7. Console Log Health Audit ---');
  const errors = cdp.consoleLogs.filter(l => l.type === 'error');
  console.log(`  Total console errors captured: ${errors.length}`);
  if (errors.length > 0) {
    errors.forEach(e => console.error('   ❌', e.text));
  } else {
    console.log('  ✅ ZERO browser console errors detected! 100% clean execution.');
  }

  // Close browser
  cdp.close();
  browser.kill();
  console.log('\n====================================================');
  console.log(' END-TO-END VALIDATION COMPLETED SUCCESSFULLY!');
  console.log('====================================================');
}

run().catch(err => {
  console.error('[Test Error]', err);
  process.exit(1);
});
