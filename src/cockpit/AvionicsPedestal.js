import { avionicsAudio } from '../audio/AvionicsAudio.js';

/**
 * AvionicsPedestal
 * Authentic Glass Cockpit Control Dock & Pedestal
 * Physically drives the 3D dissected model in real-time.
 */
export class AvionicsPedestal {
  constructor(containerElement, sceneEngine, onTelemetryUpdate) {
    this.container = containerElement;
    this.scene = sceneEngine;
    this.onTelemetryUpdate = onTelemetryUpdate;

    this.activeManufacturer = 'airbus'; // 'airbus', 'boeing', 'other'
    this.activeAircraftData = null;

    // Pedestal state
    this.thrustDetents = ['REV', 'IDLE', 'CLB', 'FLX/MCT', 'TOGA'];
    this.currentThrust = 'CLB'; // Default cruise/climb detent

    this.airbusFlapDetents = ['0', '1', '1+F', '2', '3', 'FULL'];
    this.boeingFlapDetents = ['UP', '1', '5', '15', '20', '25', '30'];
    this.currentFlapIndex = 0;

    this.gearState = 'DN'; // 'UP', 'OFF', 'DN'
    this.gearInTransit = false;
    this.activeSynoptic = 'NORM';
    this.isMinimized = false;

    // Live calculated telemetry values
    this.telemetry = {
      n1: 82.4,
      n2: 91.2,
      n3: 94.6, // for Rolls-Royce 3-spool
      egt: 645, // Celsius
      epr: 1.42,
      fuelFlow: 2450, // kg/hr
      hydPressure: 3000, // PSI
      fbwLaw: 'NORMAL LAW: PROT ACTIVE'
    };

    this.render();
    this.bindEvents();
    this.updateTelemetryCalculations();
  }

  setAircraft(aircraftData) {
    this.activeAircraftData = aircraftData;
    this.activeManufacturer = aircraftData.category === 'boeing' ? 'boeing' : (aircraftData.category === 'airbus' ? 'airbus' : 'other');

    // Reset flaps to detent 0
    this.currentFlapIndex = 0;
    this.gearState = 'DN';
    this.gearInTransit = false;

    // Check hydraulic pressure spec
    this.telemetry.hydPressure = aircraftData.hydraulics ? aircraftData.hydraulics.pressurePSI : 3000;

    this.render();
    this.bindEvents();
    this.updateTelemetryCalculations();
  }

  render() {
    const isAirbus = this.activeManufacturer === 'airbus';
    const isBoeing = this.activeManufacturer === 'boeing';
    const flapDetents = isBoeing ? this.boeingFlapDetents : this.airbusFlapDetents;
    const currentFlapLabel = flapDetents[this.currentFlapIndex] || flapDetents[0];

    if (this.isMinimized) {
      this.container.innerHTML = `
        <div class="pedestal-dock pedestal-dock-minimized">
          <div class="minimized-pill-wrap">
            <span class="pill-label">PEDESTAL:</span>
            <span class="pill-stat text-cyan">THRUST <strong>${this.currentThrust}</strong></span>
            <span class="pill-sep">/</span>
            <span class="pill-stat text-gold">FLAPS <strong>CONF ${currentFlapLabel}</strong></span>
            <span class="pill-sep">/</span>
            <span class="pill-stat ${this.gearState === 'DN' ? 'text-nominal' : 'text-muted'}">GEAR <strong>${this.gearState}</strong></span>
            <span class="pill-sep">/</span>
            <span class="pill-stat text-cyan">SYNOPTIC <strong>${this.activeSynoptic}</strong></span>
            <button class="pedestal-toggle-btn" id="btn-toggle-pedestal" title="Expand Full Pedestal Controls">
              EXPAND CONTROLS ▲
            </button>
          </div>
        </div>
      `;
      return;
    }

    this.container.innerHTML = `
      <div class="pedestal-dock">
        <!-- Cockpit Border Decal -->
        <div class="pedestal-micro-copy">
          <span>PEDESTAL UNIT // P/N 350-ECAM-787-EICAS</span>
          <span>FLT CTL LAW: <strong class="text-nominal">${isAirbus ? 'AIRBUS FBW NORMAL LAW' : 'BOEING PFC PRIMARY FLY-BY-WIRE'}</strong></span>
          <button class="pedestal-toggle-btn" id="btn-toggle-pedestal" title="Minimize Pedestal into Floating Pill">
            COLLAPSE DOCK ▼
          </button>
        </div>

        <div class="pedestal-grid">
          <!-- 1. THRUST QUADRANT -->
          <div class="pedestal-module thrust-module">
            <div class="module-header">
              <span class="module-title">THRUST QUADRANT</span>
              <span class="thrust-status badge-cyan">${this.currentThrust}</span>
            </div>
            <div class="thrust-track">
              ${this.thrustDetents.map((det) => `
                <button class="detent-btn ${this.currentThrust === det ? 'active-detent' : ''}" data-detent="${det}">
                  <span class="detent-notch"></span>
                  <span class="detent-label">${det}</span>
                </button>
              `).join('')}
            </div>
            <div class="thrust-lever-visual">
              <div class="lever-handle ${this.currentThrust === 'REV' ? 'handle-rev' : ''}">
                <span class="handle-grip"></span>
              </div>
            </div>
          </div>

          <!-- 2. FLAP & SLAT LEVER -->
          <div class="pedestal-module flap-module">
            <div class="module-header">
              <span class="module-title">${isBoeing ? 'BOEING FLAP DETENTS' : 'AIRBUS FLAP LEVER'}</span>
              <span class="flap-status badge-gold">CONF ${currentFlapLabel}</span>
            </div>
            <div class="flap-track">
              ${flapDetents.map((f, idx) => `
                <button class="flap-detent-btn ${this.currentFlapIndex === idx ? 'active-detent' : ''}" data-flap-idx="${idx}">
                  <span class="detent-notch"></span>
                  <span class="detent-label">${f}</span>
                </button>
              `).join('')}
            </div>
            <div class="flt-ctl-indicator">
              <span class="yoke-stick-badge">${isAirbus ? '🕹️ SIDE-STICK ACTIVE' : '🎮 CONTROL COLUMN YOKE'}</span>
            </div>
          </div>

          <!-- 3. LANDING GEAR & 3-GREEN ANNUNCIATOR -->
          <div class="pedestal-module gear-module">
            <div class="module-header">
              <span class="module-title">LANDING GEAR</span>
              <span class="gear-status badge-cyan">${this.gearState}</span>
            </div>
            
            <!-- Authentic 3-Green Downlock Triangles -->
            <div class="gear-annunciator-panel">
              <div class="annunciator-light ${this.gearInTransit ? 'unlk-red' : (this.gearState === 'DN' ? 'down-green' : 'gear-off')}">
                <span class="triangle">▲</span>
                <span class="ann-label">NOSE</span>
              </div>
              <div class="annunciator-light ${this.gearInTransit ? 'unlk-red' : (this.gearState === 'DN' ? 'down-green' : 'gear-off')}">
                <span class="triangle">▲</span>
                <span class="ann-label">L MAIN</span>
              </div>
              <div class="annunciator-light ${this.gearInTransit ? 'unlk-red' : (this.gearState === 'DN' ? 'down-green' : 'gear-off')}">
                <span class="triangle">▲</span>
                <span class="ann-label">R MAIN</span>
              </div>
            </div>

            <!-- Gear Lever UP / OFF / DN -->
            <div class="gear-lever-switch">
              <button class="gear-btn ${this.gearState === 'UP' ? 'active-gear' : ''}" data-gear="UP">UP</button>
              <button class="gear-btn ${this.gearState === 'OFF' ? 'active-gear' : ''}" data-gear="OFF">OFF</button>
              <button class="gear-btn ${this.gearState === 'DN' ? 'active-gear' : ''}" data-gear="DN">DN</button>
            </div>
          </div>

          <!-- 4. ECAM / EICAS SYNOPTIC SWITCHER -->
          <div class="pedestal-module synoptic-module">
            <div class="module-header">
              <span class="module-title">ECAM / EICAS SYNOPTIC</span>
              <span class="synoptic-status badge-cyan">${this.activeSynoptic}</span>
            </div>
            <div class="synoptic-btn-grid">
              <button class="syn-btn ${this.activeSynoptic === 'NORM' ? 'active-syn' : ''}" data-syn="NORM">ALL (NORM)</button>
              <button class="syn-btn ${this.activeSynoptic === 'HYD' ? 'active-syn' : ''}" data-syn="HYD">HYD</button>
              <button class="syn-btn ${this.activeSynoptic === 'FUEL' ? 'active-syn' : ''}" data-syn="FUEL">FUEL</button>
              <button class="syn-btn ${this.activeSynoptic === 'BLEED' ? 'active-syn' : ''}" data-syn="BLEED">BLEED/ECS</button>
              <button class="syn-btn ${this.activeSynoptic === 'FLT_CTL' ? 'active-syn' : ''}" data-syn="FLT_CTL">FLT CTL</button>
              <button class="syn-btn ptu-bark-btn" id="btn-ptu-bark" title="Test Airbus PTU Barking Dog hydraulic transfer sound">
                🔊 PTU BARK
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // 1. Thrust Detents
    this.container.querySelectorAll('.detent-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const detent = btn.getAttribute('data-detent');
        this.setThrust(detent);
      });
    });

    // 2. Flap Detents
    this.container.querySelectorAll('.flap-detent-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.getAttribute('data-flap-idx'), 10);
        this.setFlapIndex(idx);
      });
    });

    // 3. Gear Lever
    this.container.querySelectorAll('.gear-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const state = btn.getAttribute('data-gear');
        this.setGearState(state);
      });
    });

    // 4. Synoptics
    this.container.querySelectorAll('.syn-btn[data-syn]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const syn = btn.getAttribute('data-syn');
        this.setSynoptic(syn);
      });
    });

    // 5. PTU Bark Test Button
    const ptuBtn = this.container.querySelector('#btn-ptu-bark');
    if (ptuBtn) {
      ptuBtn.addEventListener('click', () => {
        avionicsAudio.playPTUBark(5);
      });
    }

    // 6. Minimize / Expand Toggle
    const toggleBtn = this.container.querySelector('#btn-toggle-pedestal');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.isMinimized = !this.isMinimized;
        avionicsAudio.playPedestalClick();
        this.render();
        this.bindEvents();
      });
    }
  }

  setFlightPhase(phase) {
    if (!phase) return;
    this.currentThrust = phase.thrust;
    const isBoeing = this.activeManufacturer === 'boeing';
    this.currentFlapIndex = isBoeing ? phase.flapsBoeing : phase.flapsAirbus;
    this.gearState = phase.gear;
    this.scene.toggleStreamlines(phase.streamlines);
    avionicsAudio.playPedestalClick();
    this.render();
    this.bindEvents();
    this.updateTelemetryCalculations();
  }

  setThrust(detent) {
    if (this.currentThrust === detent) return;
    this.currentThrust = detent;
    avionicsAudio.playPedestalClick();

    if (detent === 'TOGA') {
      avionicsAudio.playMasterCaution();
    }

    this.render();
    this.bindEvents();
    this.updateTelemetryCalculations();
  }

  setFlapIndex(index) {
    if (this.currentFlapIndex === index) return;
    this.currentFlapIndex = index;
    avionicsAudio.playPedestalClick();

    this.render();
    this.bindEvents();
    this.updateTelemetryCalculations();
  }

  setGearState(state) {
    if (this.gearState === state) return;
    this.gearState = state;
    avionicsAudio.playPedestalClick();

    // Trigger gear hydraulic sequence
    this.gearInTransit = true;
    this.render();
    this.bindEvents();

    // Update 3D scene immediately
    this.scene.updatePedestalTelemetry(this.currentThrust, this.currentFlapIndex, this.gearState);

    // Simulate 2.5s hydraulic transit lock
    setTimeout(() => {
      this.gearInTransit = false;
      avionicsAudio.playPedestalClick();
      this.render();
      this.bindEvents();
    }, 2500);
  }

  setSynoptic(syn) {
    this.activeSynoptic = syn;
    avionicsAudio.playPedestalClick();

    // If switching to HYD on Airbus, play simulated PTU bark!
    if (syn === 'HYD' && this.activeManufacturer === 'airbus') {
      avionicsAudio.playPTUBark(3);
    }

    this.scene.setSynoptic(syn);
    this.render();
    this.bindEvents();
  }

  /**
   * Recalculate dynamic engine telemetry values based on thrust detent
   */
  updateTelemetryCalculations() {
    let n1 = 82.4;
    let n2 = 91.2;
    let n3 = 94.6;
    let egt = 650;
    let epr = 1.42;
    let ff = 2450;

    switch (this.currentThrust) {
      case 'REV':
        n1 = 68.0;
        n2 = 78.5;
        n3 = 82.0;
        egt = 580;
        epr = 1.15;
        ff = 1800;
        break;
      case 'IDLE':
        n1 = 21.5;
        n2 = 58.2;
        n3 = 62.0;
        egt = 430;
        epr = 1.01;
        ff = 620;
        break;
      case 'CLB':
        n1 = 84.8;
        n2 = 92.4;
        n3 = 95.1;
        egt = 675;
        epr = 1.48;
        ff = 2650;
        break;
      case 'FLX/MCT':
        n1 = 91.2;
        n2 = 96.0;
        n3 = 97.8;
        egt = 790;
        epr = 1.62;
        ff = 3400;
        break;
      case 'TOGA':
        n1 = 98.6;
        n2 = 99.4;
        n3 = 99.8;
        egt = 920; // Near redline limit
        epr = 1.76;
        ff = 4600;
        break;
    }

    this.telemetry.n1 = n1;
    this.telemetry.n2 = n2;
    this.telemetry.n3 = n3;
    this.telemetry.egt = egt;
    this.telemetry.epr = epr;
    this.telemetry.fuelFlow = ff;

    // Update 3D scene animations
    this.scene.updatePedestalTelemetry(this.currentThrust, this.currentFlapIndex, this.gearState);
    this.scene.updateThermalShader(egt);

    // Modulate audio spool acoustic frequency
    avionicsAudio.updateEngineSpool(n1);

    // Push telemetry updates to HUD
    if (this.onTelemetryUpdate) {
      this.onTelemetryUpdate(this.telemetry);
    }
  }
}
