const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9223;
const outDir = path.resolve('C:/Users/Yash Gaurav/.gemini/antigravity/brain/543423fd-f502-4f26-80e6-b8aaddce013f');

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

async function run() {
  const browser = spawn(edgePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--window-size=1600,1000',
    'about:blank'
  ], { stdio: 'ignore' });

  let version = null;
  for (let i = 0; i < 40; i++) {
    try {
      version = await httpGet(`http://127.0.0.1:${port}/json/version`);
      break;
    } catch (e) {
      await sleep(150);
    }
  }

  const tab = await httpPut(`http://127.0.0.1:${port}/json/new?http://localhost:5173/`);
  const ws = new WebSocket(tab.webSocketDebuggerUrl);

  let msgId = 0;
  const callbacks = new Map();
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && callbacks.has(msg.id)) {
      callbacks.get(msg.id)(msg.result);
      callbacks.delete(msg.id);
    }
  };

  await new Promise(r => ws.onopen = r);

  function send(method, params = {}) {
    return new Promise(resolve => {
      const id = ++msgId;
      callbacks.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');

  console.log('[Capture] Waiting for 3D scene render...');
  await sleep(3000);

  // 1. Capture Landing Page
  const landingShot = await send('Page.captureScreenshot', { format: 'png' });
  const landingPath = path.join(outDir, 'aerodissect_landing.png');
  fs.writeFileSync(landingPath, Buffer.from(landingShot.data, 'base64'));
  console.log('[Capture] Saved Landing screenshot:', landingPath);

  // 2. Open Workbench and wait for render
  await send('Runtime.evaluate', { expression: 'window.openLab("b77w")' });
  await sleep(2000);

  const workbenchShot = await send('Page.captureScreenshot', { format: 'png' });
  const workbenchPath = path.join(outDir, 'aerodissect_workbench.png');
  fs.writeFileSync(workbenchPath, Buffer.from(workbenchShot.data, 'base64'));
  console.log('[Capture] Saved Workbench screenshot:', workbenchPath);

  // 3. Switch to Light Mode and capture
  await send('Runtime.evaluate', { expression: 'document.getElementById("themeBtn").click()' });
  await sleep(1000);

  const lightShot = await send('Page.captureScreenshot', { format: 'png' });
  const lightPath = path.join(outDir, 'aerodissect_light_mode.png');
  fs.writeFileSync(lightPath, Buffer.from(lightShot.data, 'base64'));
  console.log('[Capture] Saved Light Mode screenshot:', lightPath);

  ws.close();
  browser.kill();
  console.log('[Capture] All screenshots captured successfully.');
}

run().catch(console.error);
