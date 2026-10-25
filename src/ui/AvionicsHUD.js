import { GLOBAL_FLEET_DB, CATEGORIES, ATA_CHAPTERS, ATA_DETAILS, LIVERY_PRESETS, FLIGHT_PHASES, AIRFRAME_HOTSPOTS } from '../data/fleetDatabase.js';
import { avionicsAudio } from '../audio/AvionicsAudio.js';

/**
 * AvionicsHUD
 * Enterprise Aerospace Digital Twin & CAD Inspection Interface
 * Proprietary solution for aerospace engineers and hardcore AvGeeks.
 */
export class AvionicsHUD {
  constructor(hudContainer, sceneEngine, onSelectAircraft, pedestalInstance = null) {
    this.container = hudContainer;
    this.scene = sceneEngine;
    this.onSelectAircraft = onSelectAircraft;
    this.pedestal = pedestalInstance;

    this.currentAircraft = GLOBAL_FLEET_DB.find((a) => a.id === 'b777-300er') || GLOBAL_FLEET_DB[0];
    this.compareAircraft = GLOBAL_FLEET_DB.find((a) => a.id === 'a320neo') || GLOBAL_FLEET_DB[1];

    // Navigation state
    this.currentLevel = 0; // 0: L0, 1: L1, 2: L2, 3: L3
    this.activeATA = 'propulsion';
    this.activeSubAssembly = 'fan_module';
    this.activeComponent = 'fan_blades';

    // Sidebar UI state
    this.activeSidebarTab = 'fleet'; // 'fleet', 'ata', 'operations', 'cad'
    this.isSidebarCollapsed = false;
    this.isTelemetryCollapsed = false;
    this.isZenMode = false;
    this.isComparatorOpen = false;
    this.isHeroBentoVisible = true;

    // Filter & search
    this.searchQuery = '';
    this.openCategories = { airbus: true, boeing: true }; // Accordion state

    // Configurations & Tools
    this.activeLivery = 'commercial_white';
    this.activeFlightPhase = 'transonic_cruise';
    this.activeRenderMode = 'pbr'; // 'pbr', 'wireframe', 'xray', 'flir'
    this.activeViewPreset = 'iso'; // 'iso', 'top', 'front', 'side', 'cockpit', 'engine'
    this.activeFBWLaw = 'normal';
    this.activeEngineRating = 'std';
    this.activeWingtipVariant = 'sharklet';
    this.activeCabinAtmosphere = 'golden_hour';

    this.explodeValue = 0;
    this.skinOpacityValue = 100;
    this.streamlinesActive = false;
    this.calipersActive = false;
    this.hotspotsActive = false;

    // Slicer
    this.slicerEnabled = false;
    this.sliceAxis = 'Y';
    this.sliceOffset = 0.0;
    this.sliceInverted = false;

    // Live telemetry
    this.telemetry = {
      n1: 84.8,
      n2: 92.4,
      n3: 95.1,
      egt: 675,
      epr: 1.48,
      fuelFlow: 2650,
      hydPressure: 3000
    };

    this.render();
    this.bindEvents();
    this.setupKeyboardShortcuts();
  }

  setPedestal(pedestal) {
    this.pedestal = pedestal;
  }

  setAircraft(aircraftData) {
    this.currentAircraft = aircraftData;
    this.currentLevel = 0;
    this.activeATA = 'propulsion';
    this.activeSubAssembly = 'fan_module';
    this.activeComponent = 'fan_blades';
    this.explodeValue = 0;
    this.skinOpacityValue = 100;
    this.render();
    this.bindEvents();
  }

  updateTelemetry(telemetryData) {
    this.telemetry = { ...this.telemetry, ...telemetryData };
    this.updateGaugesInDOM();
  }

  render() {
    const a = this.currentAircraft;
    const ataDetail = ATA_DETAILS[this.activeATA] || ATA_DETAILS['propulsion'];
    const subAssy = ataDetail.subAssemblies ? (ataDetail.subAssemblies.find((s) => s.id === this.activeSubAssembly) || ataDetail.subAssemblies[0]) : null;
    const comp = subAssy && subAssy.components ? (subAssy.components.find((c) => c.id === this.activeComponent) || subAssy.components[0]) : null;

    this.container.innerHTML = `
      <div class="hud-root ${this.isZenMode ? 'zen-mode-active' : ''}">
        <!-- ZEN MODE FLOATING RESTORE PILL -->
        ${this.isZenMode ? `
          <div class="zen-restore-dock">
            <span class="zen-aircraft-tag">[${a.icao}] ${a.name}</span>
            <button class="zen-exit-btn" id="btn-exit-zen">
              ✕ EXIT ZEN MODE (F)
            </button>
          </div>
        ` : ''}

        <!-- 1. TOP ANDURIL DEFENSE LATTICE HEADER -->
        <header class="top-cad-header anduril-header ${this.isZenMode ? 'hidden-in-zen' : ''}">
          <div class="header-left">
            <div class="anduril-brand-lockup">
              <svg viewBox="0 0 24 24" class="anduril-monogram-svg">
                <path d="M12 2 L21 20 L16 20 L12 11 L8 20 L3 20 Z" fill="#ffffff"></path>
                <line x1="12" y1="2" x2="12" y2="22" stroke="#00e5ff" stroke-width="1.5"></line>
              </svg>
              <div class="monogram-meta">
                <span class="system-brand">ANDURIL // AERO-TWIN</span>
                <span class="system-sub">LATTICE AEROSPACE DEFENSE C2</span>
              </div>
            </div>

            <!-- Active Aircraft Badge & Breadcrumbs -->
            <div class="header-breadcrumb-bar">
              <button class="crumb-btn active-aircraft-crumb" data-nav-level="0" title="Click to view full airframe">
                <span class="badge-domain">// DOMAIN: AIR</span>
                <span class="badge-icao">${a.icao}</span>
                <span class="aircraft-model-name">${a.name}</span>
              </button>
              <span class="crumb-arrow">/</span>
              <button class="crumb-btn ${this.currentLevel === 1 ? 'crumb-highlight' : ''}" data-nav-level="1" data-nav-ata="${this.activeATA}">
                <span class="badge-ata">[${ataDetail.chapter ? ataDetail.chapter.split(' ')[0] + ' ' + ataDetail.chapter.split(' ')[1] : 'ATA'}]</span>
                <span>${ataDetail.title.split(' ')[2] || ataDetail.title}</span>
              </button>
              ${subAssy ? `
                <span class="crumb-arrow">/</span>
                <button class="crumb-btn ${this.currentLevel === 2 ? 'crumb-highlight' : ''}" data-nav-level="2" data-nav-sub="${subAssy.id}">
                  <span class="badge-sub">[${subAssy.ata}]</span>
                  <span>${subAssy.name}</span>
                </button>
              ` : ''}
              ${comp ? `
                <span class="crumb-arrow">/</span>
                <button class="crumb-btn ${this.currentLevel === 3 ? 'crumb-highlight-magenta' : ''}" data-nav-level="3" data-nav-comp="${comp.id}">
                  <span class="badge-pn">P/N</span>
                  <span>${comp.name}</span>
                </button>
              ` : ''}
            </div>
          </div>

          <!-- Center: Render Mode Switcher -->
          <div class="header-center">
            <div class="render-mode-group anduril-mode-group">
              <button class="mode-pill ${this.activeRenderMode === 'pbr' ? 'active' : ''}" data-render-mode="pbr" title="Photorealistic PBR Studio Lighting">
                PBR HARDWARE
              </button>
              <button class="mode-pill ${this.activeRenderMode === 'wireframe' ? 'active' : ''}" data-render-mode="wireframe" title="CAD Technical Shaded Wireframe">
                CAD WIRE
              </button>
              <button class="mode-pill ${this.activeRenderMode === 'xray' ? 'active' : ''}" data-render-mode="xray" title="Translucent Structural X-Ray">
                X-RAY GHOST
              </button>
              <button class="mode-pill ${this.activeRenderMode === 'flir' ? 'active' : ''}" data-render-mode="flir" title="FLIR Infrared Thermal Simulation">
                FLIR THERMAL
              </button>
            </div>
          </div>

          <!-- Right: Status, View Presets, Zen Mode & Tools -->
          <div class="header-right">
            <div class="anduril-mesh-status">
              <span class="mesh-ping-dot"></span>
              <span class="mesh-status-text">LATTICE C2 ONLINE</span>
            </div>

            <div class="view-presets-group">
              <button class="view-preset-btn ${this.activeViewPreset === 'iso' ? 'active' : ''}" data-view="iso">ISO</button>
              <button class="view-preset-btn ${this.activeViewPreset === 'top' ? 'active' : ''}" data-view="top">TOP</button>
              <button class="view-preset-btn ${this.activeViewPreset === 'front' ? 'active' : ''}" data-view="front">FRONT</button>
              <button class="view-preset-btn ${this.activeViewPreset === 'side' ? 'active' : ''}" data-view="side">SIDE</button>
              <button class="view-preset-btn ${this.activeViewPreset === 'cockpit' ? 'active' : ''}" data-view="cockpit">COCKPIT</button>
            </div>

            <button class="cad-action-btn" id="btn-toggle-zen" title="Toggle Fullscreen CAD View (F)">
              ⛶ FULLSCREEN
            </button>
            <button class="cad-action-btn" id="btn-sound-toggle" title="Toggle Cockpit & Turbine Audio">
              🔊 AUDIO
            </button>
            <button class="cad-action-btn btn-comparator-open" id="btn-toggle-comparator" title="Open Dual Airframe Hardware Comparator">
              ⚖️ COMPARATOR
            </button>
          </div>
        </header>

        <!-- 2. MAIN CAD WORKSPACE -->
        <main class="cad-workspace-container">
          <!-- LEFT ENTERPRISE SIDEBAR (COLLAPSIBLE TABS) -->
          <aside class="enterprise-sidebar ${this.isSidebarCollapsed ? 'sidebar-collapsed' : ''} ${this.isZenMode ? 'hidden-in-zen' : ''}">
            <!-- Sidebar Tab Rail -->
            <div class="sidebar-tab-rail">
              <button class="rail-tab ${this.activeSidebarTab === 'fleet' ? 'active' : ''}" data-sidebar-tab="fleet" title="Global Fleet Catalog (74 Airframes)">
                <span class="tab-icon">✈</span>
                <span class="tab-text">FLEET (74)</span>
              </button>
              <button class="rail-tab ${this.activeSidebarTab === 'ata' ? 'active' : ''}" data-sidebar-tab="ata" title="ATA Spec 100 System Dissection">
                <span class="tab-icon">⚙</span>
                <span class="tab-text">ATA SPEC</span>
              </button>
              <button class="rail-tab ${this.activeSidebarTab === 'operations' ? 'active' : ''}" data-sidebar-tab="operations" title="Liveries & Flight Phase Operations">
                <span class="tab-icon">🎛</span>
                <span class="tab-text">OPERATIONS</span>
              </button>
              <button class="rail-tab ${this.activeSidebarTab === 'cad' ? 'active' : ''}" data-sidebar-tab="cad" title="3D CAD Slicing & Engineering Inspection">
                <span class="tab-icon">📐</span>
                <span class="tab-text">CAD TOOLS</span>
              </button>

              <button class="rail-collapse-toggle" id="btn-toggle-sidebar" title="Collapse / Expand Sidebar">
                ${this.isSidebarCollapsed ? '▶' : '◀'}
              </button>
            </div>

            <!-- Sidebar Content Drawer (Rendered based on active tab) -->
            <div class="sidebar-content-drawer">
              ${this.renderSidebarDrawerContent()}
            </div>
          </aside>

          <!-- CENTER 3D VIEWPORT CONTAINER -->
          <div class="cad-viewport-center">
            <!-- 1. Floating Hero Bento Deck (Anduril Defense Hardware & Lattice C2 Architecture) -->
            ${!this.isZenMode ? (this.isHeroBentoVisible ? `
              <div class="hero-bento-deck anduril-deck">
                <!-- Card A: Anduril Mission Headline & Airframe Dissection -->
                <div class="bento-card bento-hero-banner anduril-hero-card">
                  <div class="bento-badge-row">
                    <span class="anduril-flag-badge">ANDURIL // AERO-TWIN</span>
                    <span class="anduril-domain-pill">// DOMAIN: AIR</span>
                    <span class="pill-icao-badge">${a.icao}</span>
                  </div>
                  <h1 class="anduril-main-title">TRANSFORMING AEROSPACE DEFENSE WITH ADVANCED DIGITAL TWIN TECHNOLOGY</h1>
                  <p class="anduril-sub-copy">Hardware-Grade Parametric Dissection • ATA Spec 100 Architecture • Multi-Domain Autonomy</p>
                  
                  <div class="anduril-specs-row">
                    <div class="spec-cell">
                      <span class="spec-label">AIRFRAME</span>
                      <span class="spec-val">${a.name}</span>
                    </div>
                    <div class="spec-cell">
                      <span class="spec-label">WINGSPAN</span>
                      <span class="spec-val text-cyan">${a.wingspan}M</span>
                    </div>
                    <div class="spec-cell">
                      <span class="spec-label">PROPULSION</span>
                      <span class="spec-val">${a.engines.count}X ${a.engines.type.split('_')[0].toUpperCase()}</span>
                    </div>
                    <div class="spec-cell">
                      <span class="spec-label">COMPOSITE</span>
                      <span class="spec-val text-gold">${a.compositeWeightFraction || '46%'}</span>
                    </div>
                  </div>

                  <div class="anduril-actions-row">
                    <button class="btn-anduril-primary" id="btn-hero-dissect" title="Explore Internal ATA 100 Systems">
                      EXPLORE DISSECTION (ATA 100)
                    </button>
                    <button class="btn-anduril-secondary" id="btn-hero-compare" title="Launch Dual Airframe Hardware Comparator">
                      ↗ LATTICE COMPARATOR
                    </button>
                    <button class="btn-anduril-ghost" id="btn-toggle-bento" title="Minimize Bento Overlay (H)">
                      [ 👁 MINIMIZE ]
                    </button>
                  </div>
                </div>

                <!-- Card B: Lattice C2 360° Tactical Airspace Radar -->
                <div class="bento-card bento-radar-card anduril-radar-card">
                  <div class="radar-card-header">
                    <span class="radar-card-title">LATTICE C2 // AIRSPACE RADAR</span>
                    <span class="radar-live-badge"><span class="radar-pulse-dot"></span>ACTIVE 360°</span>
                  </div>
                  <div class="radar-scope-container">
                    <div class="radar-scope-rings">
                      <div class="radar-ring ring-1"></div>
                      <div class="radar-ring ring-2"></div>
                      <div class="radar-ring ring-3"></div>
                      <div class="radar-crosshair crosshair-x"></div>
                      <div class="radar-crosshair crosshair-y"></div>
                    </div>
                    <div class="radar-sweep-beam"></div>
                    <!-- Blip contacts -->
                    <div class="radar-blip blip-1" title="TRK-01 • AFR012 • FL360 • 490 KTS">
                      <span class="blip-dot"></span>
                      <span class="blip-label">TRK-01</span>
                    </div>
                    <div class="radar-blip blip-2" title="TRK-02 • BAW442 • FL380 • 510 KTS">
                      <span class="blip-dot"></span>
                      <span class="blip-label">TRK-02</span>
                    </div>
                    <div class="radar-blip blip-3 active-target" title="TARGET LOCK: [${a.icao}] ${a.name}">
                      <span class="blip-dot blip-current"></span>
                      <span class="blip-label text-gold">${a.icao}</span>
                    </div>
                  </div>
                  <div class="radar-meta-row">
                    <span class="radar-status-text">74 ASSETS TRACKED</span>
                    <span class="radar-range-text">RANGE 80 NM</span>
                  </div>
                </div>

                <!-- Card C: Flight Deck Autonomy & Crew Telemetry -->
                <div class="bento-card bento-pilot-card anduril-pilot-card">
                  <div class="pilot-card-header">
                    <span class="pilot-card-title">CREW & AUTONOMY MATRIX</span>
                    <span class="pilot-ready-badge">DEFCON 5 // READY</span>
                  </div>
                  <div class="pilot-body-row">
                    <div class="pilot-avatar-hud">
                      <svg viewBox="0 0 48 48" class="pilot-helmet-svg">
                        <circle cx="24" cy="24" r="22" stroke="rgba(255, 255, 255, 0.2)" stroke-width="1.5" fill="none"></circle>
                        <path d="M14 26 C14 16, 34 16, 34 26 C34 32, 28 36, 24 36 C20 36, 14 32, 14 26 Z" fill="rgba(255, 255, 255, 0.06)" stroke="#ffffff" stroke-width="2"></path>
                        <path d="M18 22 Q24 20 30 22 Q24 25 18 22 Z" fill="#00e5ff" opacity="0.9"></path>
                        <line x1="24" y1="12" x2="24" y2="18" stroke="#00e5ff" stroke-width="1.5"></line>
                        <circle cx="24" cy="23" r="2" fill="#00e5ff"></circle>
                      </svg>
                    </div>
                    <div class="pilot-stats-column">
                      <div class="pilot-main-number">14.4k+</div>
                      <div class="pilot-number-sub">Defense Aviators & Operators</div>
                    </div>
                  </div>
                  <div class="pilot-telemetry-chips">
                    <div class="pilot-chip">
                      <span class="chip-key">G-TOLERANCE</span>
                      <span class="chip-val text-gold">+${(1.0 + (this.telemetry.n1 > 80 ? (this.telemetry.n1 - 80) * 0.05 : 0)).toFixed(1)}G</span>
                    </div>
                    <div class="pilot-chip">
                      <span class="chip-key">HUD LOCK</span>
                      <span class="chip-val text-cyan">ON-AXIS</span>
                    </div>
                    <div class="pilot-chip">
                      <span class="chip-key">MACH LIMIT</span>
                      <span class="chip-val text-nominal">${(this.telemetry.n1 > 90 ? 0.88 : (this.telemetry.n1 > 50 ? 0.84 : 0.22)).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ` : `
              <div class="hero-bento-collapsed">
                <button class="btn-restore-bento" id="btn-toggle-bento" title="Expand Flight Deck HUD (H)">
                  <span class="restore-icon">✦</span>
                  <span>EXPAND FLIGHT DECK BENTO HUD (H)</span>
                  <span class="restore-arrow">▼</span>
                </button>
              </div>
            `) : ''}

            <!-- Floating Navigation Orientation Cube (Top Right) -->
            <div class="nav-orientation-widget">
              <div class="orientation-cube" id="nav-cube">
                <div class="cube-face face-top" data-view="top">TOP</div>
                <div class="cube-face face-front" data-view="front">FRONT</div>
                <div class="cube-face face-right" data-view="side">RIGHT</div>
                <div class="cube-face face-back" data-view="cockpit">AFT</div>
                <div class="cube-face face-left" data-view="side">LEFT</div>
                <div class="cube-face face-iso" data-view="iso">ISO</div>
              </div>
            </div>

            <!-- Viewport Overlay Stencils -->
            <div class="viewport-cad-hud">
              <div class="cad-hud-topleft">
                <span class="hud-meta-badge">AIRFRAME // P/N ${a.id.toUpperCase()}-001</span>
                <span class="hud-meta-badge text-cyan">CATEGORY: ${a.category.toUpperCase()}</span>
              </div>
              <div class="cad-hud-bottomright">
                <span class="hud-meta-badge">ENGINEERING CLEARANCE: CERTIFIED</span>
                <span class="hud-meta-badge text-nominal">60 FPS WEBGL PBR ENGINE</span>
              </div>
            </div>
          </div>

          <!-- RIGHT FLOATING TELEMETRY & METALLURGY DOCK (COLLAPSIBLE) -->
          <aside class="floating-telemetry-dock ${this.isTelemetryCollapsed ? 'telemetry-collapsed' : ''} ${this.isZenMode ? 'hidden-in-zen' : ''}">
            <div class="telemetry-card-header">
              <div class="telemetry-header-title">
                <span class="title-bold">ECAM / EICAS TELEMETRY</span>
                <span class="title-sub">[${a.icao}] ${a.engines.model.split('/')[0]}</span>
              </div>
              <button class="btn-minimize-telemetry" id="btn-toggle-telemetry" title="Collapse / Expand Telemetry HUD">
                ${this.isTelemetryCollapsed ? '◀' : '✕'}
              </button>
            </div>

            ${!this.isTelemetryCollapsed ? `
              <!-- Circular Gauges Grid -->
              <div class="telemetry-gauges-grid">
                <!-- N1 Spool Gauge -->
                <div class="gauge-cell">
                  <div class="gauge-ring-wrap">
                    <svg viewBox="0 0 100 100" class="gauge-svg">
                      <circle cx="50" cy="50" r="42" class="gauge-track"></circle>
                      <circle cx="50" cy="50" r="42" class="gauge-fill gauge-cyan" id="dial-n1" style="stroke-dashoffset: ${264 - (this.telemetry.n1 / 100) * 200};"></circle>
                    </svg>
                    <div class="gauge-text-center">
                      <span class="gauge-numeric text-cyan" id="val-n1">${this.telemetry.n1.toFixed(1)}</span>
                      <span class="gauge-unit-small">%</span>
                    </div>
                  </div>
                  <span class="gauge-caption">N1 FAN SPEED</span>
                </div>

                <!-- N2 Core Gauge -->
                <div class="gauge-cell">
                  <div class="gauge-ring-wrap">
                    <svg viewBox="0 0 100 100" class="gauge-svg">
                      <circle cx="50" cy="50" r="42" class="gauge-track"></circle>
                      <circle cx="50" cy="50" r="42" class="gauge-fill gauge-cyan" id="dial-n2" style="stroke-dashoffset: ${264 - (this.telemetry.n2 / 100) * 200};"></circle>
                    </svg>
                    <div class="gauge-text-center">
                      <span class="gauge-numeric text-cyan" id="val-n2">${this.telemetry.n2.toFixed(1)}</span>
                      <span class="gauge-unit-small">%</span>
                    </div>
                  </div>
                  <span class="gauge-caption">N2 CORE (HPC)</span>
                </div>

                <!-- EGT Thermal Gauge -->
                <div class="gauge-cell">
                  <div class="gauge-ring-wrap">
                    <svg viewBox="0 0 100 100" class="gauge-svg">
                      <circle cx="50" cy="50" r="42" class="gauge-track"></circle>
                      <circle cx="50" cy="50" r="42" class="gauge-fill ${this.telemetry.egt > 850 ? 'gauge-red' : 'gauge-gold'}" id="dial-egt" style="stroke-dashoffset: ${264 - (this.telemetry.egt / 1000) * 200};"></circle>
                    </svg>
                    <div class="gauge-text-center">
                      <span class="gauge-numeric ${this.telemetry.egt > 850 ? 'text-warning' : 'text-caution'}" id="val-egt">${this.telemetry.egt}</span>
                      <span class="gauge-unit-small">°C</span>
                    </div>
                  </div>
                  <span class="gauge-caption">EGT THERMAL</span>
                </div>

                <!-- Fuel Flow Gauge -->
                <div class="gauge-cell">
                  <div class="gauge-ring-wrap">
                    <svg viewBox="0 0 100 100" class="gauge-svg">
                      <circle cx="50" cy="50" r="42" class="gauge-track"></circle>
                      <circle cx="50" cy="50" r="42" class="gauge-fill gauge-green" id="dial-ff" style="stroke-dashoffset: ${264 - (this.telemetry.fuelFlow / 5000) * 200};"></circle>
                    </svg>
                    <div class="gauge-text-center">
                      <span class="gauge-numeric text-nominal" id="val-ff">${this.telemetry.fuelFlow}</span>
                      <span class="gauge-unit-small">kg/h</span>
                    </div>
                  </div>
                  <span class="gauge-caption">FUEL FLOW</span>
                </div>
              </div>

              <!-- Secondary Telemetry Linear Strips -->
              <div class="telemetry-strip-rows">
                <div class="strip-row">
                  <span class="strip-key">ENGINE PRESSURE RATIO (EPR)</span>
                  <span class="strip-val text-cyan" id="val-epr">${this.telemetry.epr.toFixed(2)}</span>
                </div>
                <div class="strip-row">
                  <span class="strip-key">BYPASS RATIO (BPR)</span>
                  <span class="strip-val text-cyan">${a.engines.bypassRatio}:1</span>
                </div>
                <div class="strip-row">
                  <span class="strip-key">HYDRAULIC PRESSURE</span>
                  <span class="strip-val text-nominal">${a.hydraulics ? a.hydraulics.pressurePSI : 3000} PSI (${a.hydraulics ? a.hydraulics.system : 'dual'})</span>
                </div>
                <div class="strip-row">
                  <span class="strip-key">AIRFRAME COMPOSITE WT</span>
                  <span class="strip-val text-gold">${a.compositeWeightFraction || '15%'}</span>
                </div>
              </div>

              <!-- Material & OEM Metallurgy Spec Card -->
              <div class="metallurgy-spec-card">
                <div class="spec-head">
                  <span class="spec-head-title">MATERIAL & OEM METALLURGY</span>
                  <span class="spec-head-pn">${comp ? comp.pn : 'P/N BAC-77W-57-084-K'}</span>
                </div>
                <div class="spec-body-details">
                  <div class="spec-detail-line">
                    <span class="detail-label">OEM SUPPLIER:</span>
                    <span class="detail-value text-cyan">${comp ? comp.oem : a.engines.oem}</span>
                  </div>
                  <div class="spec-detail-line">
                    <span class="detail-label">ALLOY / COMPOSITE:</span>
                    <span class="detail-value text-gold">${comp ? comp.material : a.primaryAlloy}</span>
                  </div>
                  <div class="spec-detail-line">
                    <span class="detail-label">OPERATING CLEARANCE:</span>
                    <span class="detail-value text-nominal">${comp ? comp.clearance : 'Nominal aerospace tolerance'}</span>
                  </div>
                </div>
              </div>

              <!-- AvGeek Engineering Note Card -->
              <div class="avgeek-lore-box">
                <div class="lore-header">
                  <span class="lore-tag">AVGEEK ENGINEERING NOTE</span>
                  <span class="lore-aircraft-id">${a.name}</span>
                </div>
                <p class="lore-text">
                  ${comp && comp.notes ? comp.notes : a.notes}
                </p>
              </div>
            ` : ''}
          </aside>
        </main>

        <!-- 3. SIDE-BY-SIDE SPLIT COMPARATOR MODAL -->
        ${this.isComparatorOpen ? this.renderComparatorModal() : ''}
      </div>
    `;
  }

  /**
   * Render Sidebar Drawer Content based on active tab
   */
  renderSidebarDrawerContent() {
    switch (this.activeSidebarTab) {
      case 'fleet':
        return this.renderFleetCatalogDrawer();
      case 'ata':
        return this.renderATADissectionDrawer();
      case 'operations':
        return this.renderOperationsDrawer();
      case 'cad':
        return this.renderCADToolsDrawer();
      default:
        return this.renderFleetCatalogDrawer();
    }
  }

  /**
   * Tab 1: Global Fleet Catalog (74 Airframes grouped into Expandable Accordions)
   */
  renderFleetCatalogDrawer() {
    const q = this.searchQuery.toLowerCase();

    return `
      <div class="drawer-panel drawer-fleet anduril-drawer">
        <div class="drawer-header">
          <span class="drawer-title">AIR DOMAIN INVENTORY</span>
          <span class="drawer-counter anduril-badge">[ 74 AIRFRAMES ]</span>
        </div>

        <!-- Search Input with Clear Button -->
        <div class="drawer-search-wrap">
          <input type="text" id="fleet-search-input" placeholder="Search Air Domain Hardware (e.g. B77W, F-22, Concorde)..." value="${this.searchQuery}" />
          ${this.searchQuery ? '<button class="btn-clear-search" id="btn-clear-fleet-search">✕</button>' : ''}
        </div>

        <!-- Category Accordions List -->
        <div class="fleet-accordions-list">
          ${CATEGORIES.map((cat) => {
            const airframesInCat = GLOBAL_FLEET_DB.filter((x) => x.category === cat.id);
            const filteredInCat = airframesInCat.filter((ac) => {
              if (!q) return true;
              return ac.name.toLowerCase().includes(q) ||
                     ac.icao.toLowerCase().includes(q) ||
                     ac.manufacturer.toLowerCase().includes(q) ||
                     ac.engines.model.toLowerCase().includes(q);
            });

            if (filteredInCat.length === 0) return '';

            const isOpen = q ? true : !!this.openCategories[cat.id];

            return `
              <div class="category-accordion ${isOpen ? 'accordion-open' : ''}">
                <div class="category-accordion-header" data-cat-toggle="${cat.id}">
                  <span class="accordion-arrow">${isOpen ? '▼' : '▶'}</span>
                  <span class="category-label">// DOMAIN: ${cat.label.toUpperCase()}</span>
                  <span class="category-count">[${filteredInCat.length}]</span>
                </div>

                ${isOpen ? `
                  <div class="category-airframe-items">
                    ${filteredInCat.map((ac) => {
                      const isCurrent = ac.id === this.currentAircraft.id;
                      return `
                        <div class="airframe-card-item ${isCurrent ? 'active-airframe' : ''}" data-select-airframe="${ac.id}">
                          <div class="item-top-row">
                            <span class="item-icao-tag">${ac.icao}</span>
                            <span class="item-name">${ac.name}</span>
                          </div>
                          <div class="item-bottom-row">
                            <span class="item-mfg">${ac.manufacturer}</span>
                            <span class="item-specs">${ac.wingspan}M • ${ac.engines.count}X ${ac.engines.type.split('_')[0].toUpperCase()}</span>
                          </div>
                        </div>
                      `;
                    }).join('')}
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Tab 2: ATA Spec 100 System Dissection (4-Level Inspector)
   */
  renderATADissectionDrawer() {
    const detail = ATA_DETAILS[this.activeATA] || ATA_DETAILS['propulsion'];

    return `
      <div class="drawer-panel drawer-ata">
        <div class="drawer-header">
          <span class="drawer-title">ATA SPEC 100 DISSECTION</span>
          <span class="level-indicator badge-cyan">LEVEL ${this.currentLevel}</span>
        </div>

        <!-- Level Navigation Pills -->
        <div class="level-pills-row">
          <button class="lvl-btn ${this.currentLevel === 0 ? 'active' : ''}" data-set-level="0">L0 AIRFRAME</button>
          <button class="lvl-btn ${this.currentLevel === 1 ? 'active' : ''}" data-set-level="1">L1 SYSTEM</button>
          <button class="lvl-btn ${this.currentLevel === 2 ? 'active' : ''}" data-set-level="2">L2 SUB-ASSY</button>
          <button class="lvl-btn ${this.currentLevel === 3 ? 'active' : ''}" data-set-level="3">L3 PART</button>
        </div>

        <!-- ATA Chapters Collapsible Tree -->
        <div class="ata-chapters-tree">
          ${ATA_CHAPTERS.map((ch) => {
            const isActive = this.activeATA === ch.level1;
            const chDetail = ATA_DETAILS[ch.level1];
            return `
              <div class="tree-chapter-node ${isActive ? 'chapter-active' : ''}">
                <div class="chapter-row" data-ata-select="${ch.level1}">
                  <span class="ch-badge">${ch.code}</span>
                  <span class="ch-title">${ch.title}</span>
                  <span class="ch-chevron">${isActive ? '▼' : '▶'}</span>
                </div>

                ${isActive && chDetail && chDetail.subAssemblies ? `
                  <div class="sub-tree-list">
                    ${chDetail.subAssemblies.map((sub) => {
                      const isSubActive = this.activeSubAssembly === sub.id;
                      return `
                        <div class="sub-node ${isSubActive ? 'sub-active' : ''}">
                          <div class="sub-row" data-sub-select="${sub.id}">
                            <span class="sub-ata">[${sub.ata}]</span>
                            <span class="sub-name">${sub.name}</span>
                          </div>

                          ${isSubActive && sub.components ? `
                            <div class="part-micro-list">
                              ${sub.components.map((c) => `
                                <div class="part-row ${this.activeComponent === c.id ? 'part-active' : ''}" data-comp-select="${c.id}">
                                  <span class="part-dot">▪</span>
                                  <span class="part-name">${c.name}</span>
                                </div>
                              `).join('')}
                            </div>
                          ` : ''}
                        </div>
                      `;
                    }).join('')}
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Tab 3: Operations, Liveries & Flight Phases
   */
  renderOperationsDrawer() {
    return `
      <div class="drawer-panel drawer-operations">
        <div class="drawer-header">
          <span class="drawer-title">AIRCRAFT CONFIGURATIONS</span>
          <span class="drawer-counter badge-gold">OEM PRESETS</span>
        </div>

        <!-- 1. Livery & Material Finishes -->
        <div class="op-section">
          <span class="op-section-title">LIVERY & SURFACE MATERIAL</span>
          <div class="livery-buttons-grid">
            ${LIVERY_PRESETS.map((liv) => `
              <button class="livery-btn ${this.activeLivery === liv.id ? 'active' : ''}" data-set-livery="${liv.id}">
                <span class="livery-color-dot" style="background-color: #${liv.skinColor.toString(16).padStart(6, '0')};"></span>
                <div class="livery-info">
                  <span class="livery-name">${liv.name}</span>
                  <span class="livery-desc">${liv.desc}</span>
                </div>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- 2. Flight Phase Operational Presets -->
        <div class="op-section">
          <span class="op-section-title">FLIGHT PHASE PRESETS</span>
          <div class="phase-buttons-list">
            ${FLIGHT_PHASES.map((ph) => `
              <button class="phase-btn ${this.activeFlightPhase === ph.id ? 'active' : ''}" data-set-phase="${ph.id}">
                <div class="phase-top">
                  <span class="phase-name">${ph.name}</span>
                  <span class="phase-speed badge-cyan">${ph.speed} KTS</span>
                </div>
                <span class="phase-desc">${ph.desc}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- 3. Fly-By-Wire Flight Control Laws -->
        <div class="op-section">
          <span class="op-section-title">FLY-BY-WIRE FLIGHT CONTROL LAWS</span>
          <div class="fbw-laws-grid">
            <button class="law-pill ${this.activeFBWLaw === 'normal' ? 'active' : ''}" data-set-fbw="normal" title="Full flight envelope aerodynamic protections active">
              NORMAL LAW (PROT)
            </button>
            <button class="law-pill ${this.activeFBWLaw === 'alternate' ? 'active' : ''}" data-set-fbw="alternate" title="Degraded flight law without high AoA protection">
              ALTERNATE LAW
            </button>
            <button class="law-pill ${this.activeFBWLaw === 'direct' ? 'active' : ''}" data-set-fbw="direct" title="Direct stick-to-surface mechanical backup">
              DIRECT LAW
            </button>
          </div>
        </div>

        <!-- 4. Engine Thrust Rating Options -->
        <div class="op-section">
          <span class="op-section-title">ENGINE THRUST RATING & DERATE</span>
          <div class="opt-chips-grid">
            <button class="opt-chip ${this.activeEngineRating === 'std' ? 'active' : ''}" data-set-engine-rating="std">
              <span class="opt-chip-title">STANDARD OEM</span>
              <span class="opt-chip-sub">100% Rated Thrust</span>
            </button>
            <button class="opt-chip ${this.activeEngineRating === 'boost' ? 'active' : ''}" data-set-engine-rating="boost">
              <span class="opt-chip-title">HOT & HIGH BOOST</span>
              <span class="opt-chip-sub">+15% TOGA Thrust</span>
            </button>
            <button class="opt-chip ${this.activeEngineRating === 'eco' ? 'active' : ''}" data-set-engine-rating="eco">
              <span class="opt-chip-title">ECO ACOUSTIC</span>
              <span class="opt-chip-sub">-8 dB Noise Footprint</span>
            </button>
          </div>
        </div>

        <!-- 5. Wingtip Aerodynamic Configuration -->
        <div class="op-section">
          <span class="op-section-title">WINGTIP AERODYNAMIC CONFIGURATION</span>
          <div class="opt-chips-grid">
            <button class="opt-chip ${this.activeWingtipVariant === 'sharklet' ? 'active' : ''}" data-set-wingtip="sharklet">
              <span class="opt-chip-title">SHARKLET / BLENDED</span>
              <span class="opt-chip-sub">Reduced Induced Drag</span>
            </button>
            <button class="opt-chip ${this.activeWingtipVariant === 'raked' ? 'active' : ''}" data-set-wingtip="raked">
              <span class="opt-chip-title">RAKED WINGTIP</span>
              <span class="opt-chip-sub">Transonic Span Efficiency</span>
            </button>
            <button class="opt-chip ${this.activeWingtipVariant === 'folding' ? 'active' : ''}" data-set-wingtip="folding">
              <span class="opt-chip-title">FOLDING TIP (777X)</span>
              <span class="opt-chip-sub">Code E Gate Compatibility</span>
            </button>
          </div>
        </div>

        <!-- 6. Cockpit & Cabin Lighting Atmosphere -->
        <div class="op-section">
          <span class="op-section-title">CABIN & COCKPIT LIGHTING ATMOSPHERE</span>
          <div class="opt-chips-grid">
            <button class="opt-chip ${this.activeCabinAtmosphere === 'golden_hour' ? 'active' : ''}" data-set-atmosphere="golden_hour">
              <span class="opt-chip-title text-gold">GOLDEN HOUR</span>
              <span class="opt-chip-sub">Warm Amber Horizon Glow</span>
            </button>
            <button class="opt-chip ${this.activeCabinAtmosphere === 'twilight' ? 'active' : ''}" data-set-atmosphere="twilight">
              <span class="opt-chip-title text-cyan">TRANSONIC NIGHT</span>
              <span class="opt-chip-sub">Electric Cyan Twilight</span>
            </button>
            <button class="opt-chip ${this.activeCabinAtmosphere === 'daylight' ? 'active' : ''}" data-set-atmosphere="daylight">
              <span class="opt-chip-title">HIGH DAYLIGHT</span>
              <span class="opt-chip-sub">Crisp Neutral White</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Tab 4: CAD Tools, 3D MRI Slicing, Calipers & Hotspots
   */
  renderCADToolsDrawer() {
    return `
      <div class="drawer-panel drawer-cad">
        <div class="drawer-header">
          <span class="drawer-title">CAD ENGINEERING TOOLS</span>
          <span class="drawer-counter badge-cyan">SECTIONING & CALIPERS</span>
        </div>

        <!-- Exploded View Slider -->
        <div class="cad-tool-group">
          <div class="tool-label-row">
            <span class="tool-label">RADIAL / AXIAL EXPLODE VIEW</span>
            <span class="tool-value text-cyan" id="val-explode">${this.explodeValue}%</span>
          </div>
          <input type="range" min="0" max="100" value="${this.explodeValue}" class="mfd-slider" id="slider-explode" />
        </div>

        <!-- Skin X-Ray / Opacity Slider -->
        <div class="cad-tool-group">
          <div class="tool-label-row">
            <span class="tool-label">SKIN TRANSPARENCY (X-RAY)</span>
            <span class="tool-value text-cyan" id="val-skin">${this.skinOpacityValue}%</span>
          </div>
          <input type="range" min="0" max="100" value="${this.skinOpacityValue}" class="mfd-slider" id="slider-skin" />
        </div>

        <!-- 3D Dimension Calipers & Bounding Box Toggle -->
        <div class="cad-toggle-item">
          <label class="toggle-switch">
            <input type="checkbox" id="check-calipers" ${this.calipersActive ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
          <div class="toggle-info">
            <span class="toggle-title">DIMENSION CALIPERS (CAD BBOX)</span>
            <span class="toggle-sub">Shows real-time wingspan, length & height annotations</span>
          </div>
        </div>

        <!-- 3D Hotspot Inspection Markers -->
        <div class="cad-toggle-item">
          <label class="toggle-switch">
            <input type="checkbox" id="check-hotspots" ${this.hotspotsActive ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
          <div class="toggle-info">
            <span class="toggle-title">AIRFRAME INSPECTION HOTSPOTS</span>
            <span class="toggle-sub">Pitot sensors, RAT bay, borescope & reverser tags</span>
          </div>
        </div>

        <!-- Aerodynamic Streamlines Toggle -->
        <div class="cad-toggle-item">
          <label class="toggle-switch">
            <input type="checkbox" id="check-streamlines" ${this.streamlinesActive ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
          <div class="toggle-info">
            <span class="toggle-title">WIND TUNNEL CFD STREAMLINES</span>
            <span class="toggle-sub">Dynamic aerodynamic ribbons with wingtip vortex swirls</span>
          </div>
        </div>

        <!-- 3D MRI Cross-Section Slicing Plane -->
        <div class="slicer-box-cad">
          <div class="slicer-head">
            <div class="cad-toggle-item" style="padding: 0;">
              <label class="toggle-switch">
                <input type="checkbox" id="check-slicer" ${this.slicerEnabled ? 'checked' : ''} />
                <span class="toggle-slider"></span>
              </label>
              <span class="toggle-title text-magenta"><strong>3D MRI SECTION SLICER</strong></span>
            </div>
            <button class="btn-invert-slice ${this.sliceInverted ? 'active' : ''}" id="btn-slice-invert">
              INVERT
            </button>
          </div>

          ${this.slicerEnabled ? `
            <div class="slicer-body">
              <div class="axes-selector">
                <button class="axis-pill ${this.sliceAxis === 'X' ? 'active' : ''}" data-axis="X">X (LATERAL)</button>
                <button class="axis-pill ${this.sliceAxis === 'Y' ? 'active' : ''}" data-axis="Y">Y (VERTICAL)</button>
                <button class="axis-pill ${this.sliceAxis === 'Z' ? 'active' : ''}" data-axis="Z">Z (AXIAL)</button>
              </div>
              <div class="cad-tool-group">
                <div class="tool-label-row">
                  <span class="tool-label">PLANE POSITION</span>
                  <span class="tool-value text-magenta" id="val-slice-offset">${this.sliceOffset.toFixed(1)}m</span>
                </div>
                <input type="range" min="-15" max="15" step="0.2" value="${this.sliceOffset}" class="mfd-slider slider-magenta" id="slider-slice-offset" />
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Dual Aircraft Side-by-Side Comparator Modal
   */
  renderComparatorModal() {
    const a1 = this.currentAircraft;
    const a2 = this.compareAircraft;

    return `
      <div class="comparator-backdrop">
        <div class="comparator-window">
          <div class="comp-win-header">
            <div>
              <span class="comp-win-title">AERO ARCHITECTURE COMPARATOR</span>
              <span class="comp-win-sub">SIDE-BY-SIDE ENGINEERING SPECIFICATIONS & PROPULSION DELTAS</span>
            </div>
            <button class="btn-close-comp" id="btn-close-comparator">✕ CLOSE</button>
          </div>

          <div class="comp-selectors-bar">
            <div class="comp-select-wrap">
              <span class="select-label">AIRCRAFT 1 (PRIMARY):</span>
              <select class="comp-dropdown" id="comp-sel-1" disabled>
                <option selected>[${a1.icao}] ${a1.name}</option>
              </select>
            </div>
            <div class="comp-vs-pill">VS</div>
            <div class="comp-select-wrap">
              <span class="select-label">AIRCRAFT 2 (TARGET):</span>
              <select class="comp-dropdown" id="comp-sel-2">
                ${GLOBAL_FLEET_DB.map((ac) => `
                  <option value="${ac.id}" ${ac.id === a2.id ? 'selected' : ''}>
                    [${ac.icao}] ${ac.name} (${ac.manufacturer})
                  </option>
                `).join('')}
              </select>
            </div>
          </div>

          <div class="comp-table-container">
            <table class="comp-matrix-table">
              <thead>
                <tr>
                  <th>ENGINEERING PARAMETER</th>
                  <th class="text-cyan">${a1.name} [${a1.icao}]</th>
                  <th class="text-gold">${a2.name} [${a2.icao}]</th>
                  <th>SPEC DELTA (A1 vs A2)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Wingspan (m)</td>
                  <td class="text-cyan">${a1.wingspan} m</td>
                  <td class="text-gold">${a2.wingspan} m</td>
                  <td class="delta-col">${(a1.wingspan - a2.wingspan).toFixed(1)} m</td>
                </tr>
                <tr>
                  <td>Overall Length (m)</td>
                  <td class="text-cyan">${a1.length} m</td>
                  <td class="text-gold">${a2.length} m</td>
                  <td class="delta-col">${(a1.length - a2.length).toFixed(1)} m</td>
                </tr>
                <tr>
                  <td>Fuselage Outer Diameter</td>
                  <td class="text-cyan">${a1.fuselageDiameter} m</td>
                  <td class="text-gold">${a2.fuselageDiameter} m</td>
                  <td class="delta-col">${(a1.fuselageDiameter - a2.fuselageDiameter).toFixed(2)} m</td>
                </tr>
                <tr>
                  <td>Propulsion Architecture</td>
                  <td class="text-cyan">${a1.engines.count}x ${a1.engines.model}</td>
                  <td class="text-gold">${a2.engines.count}x ${a2.engines.model}</td>
                  <td class="delta-col">${a1.engines.count === a2.engines.count ? 'SAME COUNT' : `${a1.engines.count - a2.engines.count} ENGINES`}</td>
                </tr>
                <tr>
                  <td>Engine Fan Diameter</td>
                  <td class="text-cyan">${a1.engines.fanDiameter} m</td>
                  <td class="text-gold">${a2.engines.fanDiameter} m</td>
                  <td class="delta-col">${(a1.engines.fanDiameter - a2.engines.fanDiameter).toFixed(2)} m</td>
                </tr>
                <tr>
                  <td>Bypass Ratio (BPR)</td>
                  <td class="text-cyan">${a1.engines.bypassRatio}:1</td>
                  <td class="text-gold">${a2.engines.bypassRatio}:1</td>
                  <td class="delta-col">${(a1.engines.bypassRatio - a2.engines.bypassRatio).toFixed(1)}</td>
                </tr>
                <tr>
                  <td>Maximum Thrust per Engine</td>
                  <td class="text-cyan">${a1.engines.maxThrustKN} kN</td>
                  <td class="text-gold">${a2.engines.maxThrustKN} kN</td>
                  <td class="delta-col">${(a1.engines.maxThrustKN - a2.engines.maxThrustKN).toFixed(1)} kN</td>
                </tr>
                <tr>
                  <td>Hydraulic System Architecture</td>
                  <td class="text-cyan">${a1.hydraulics ? a1.hydraulics.pressurePSI : 3000} PSI</td>
                  <td class="text-gold">${a2.hydraulics ? a2.hydraulics.pressurePSI : 3000} PSI</td>
                  <td class="delta-col">${(a1.hydraulics ? a1.hydraulics.pressurePSI : 3000) === (a2.hydraulics ? a2.hydraulics.pressurePSI : 3000) ? 'EQUAL' : 'PRESSURE DELTA'}</td>
                </tr>
                <tr>
                  <td>Bleed Architecture</td>
                  <td class="text-cyan">${a1.bleedType === 'electric_bleedless' ? 'BLEEDLESS (ELECTRIC)' : 'PNEUMATIC BLEED'}</td>
                  <td class="text-gold">${a2.bleedType === 'electric_bleedless' ? 'BLEEDLESS (ELECTRIC)' : 'PNEUMATIC BLEED'}</td>
                  <td class="delta-col">${a1.bleedType === a2.bleedType ? 'IDENTICAL' : 'ARCHITECTURE DIFFERENCE'}</td>
                </tr>
                <tr>
                  <td>Composite Weight Fraction</td>
                  <td class="text-cyan">${a1.compositeWeightFraction || '15%'}</td>
                  <td class="text-gold">${a2.compositeWeightFraction || '15%'}</td>
                  <td class="delta-col">${a1.compositeWeightFraction} vs ${a2.compositeWeightFraction}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  updateGaugesInDOM() {
    const valN1 = this.container.querySelector('#val-n1');
    const dialN1 = this.container.querySelector('#dial-n1');
    if (valN1) valN1.textContent = this.telemetry.n1.toFixed(1);
    if (dialN1) dialN1.style.strokeDashoffset = 264 - (this.telemetry.n1 / 100) * 200;

    const valN2 = this.container.querySelector('#val-n2');
    const dialN2 = this.container.querySelector('#dial-n2');
    if (valN2) valN2.textContent = this.telemetry.n2.toFixed(1);
    if (dialN2) dialN2.style.strokeDashoffset = 264 - (this.telemetry.n2 / 100) * 200;

    const valEgt = this.container.querySelector('#val-egt');
    const dialEgt = this.container.querySelector('#dial-egt');
    if (valEgt) {
      valEgt.textContent = Math.round(this.telemetry.egt);
      valEgt.className = `gauge-numeric ${this.telemetry.egt > 850 ? 'text-warning' : 'text-caution'}`;
    }
    if (dialEgt) {
      dialEgt.style.strokeDashoffset = 264 - (this.telemetry.egt / 1000) * 200;
      dialEgt.className = `gauge-fill ${this.telemetry.egt > 850 ? 'gauge-red' : 'gauge-gold'}`;
    }

    const valFf = this.container.querySelector('#val-ff');
    const dialFf = this.container.querySelector('#dial-ff');
    if (valFf) valFf.textContent = Math.round(this.telemetry.fuelFlow);
    if (dialFf) dialFf.style.strokeDashoffset = 264 - (this.telemetry.fuelFlow / 5000) * 200;

    const valEpr = this.container.querySelector('#val-epr');
    if (valEpr) valEpr.textContent = this.telemetry.epr.toFixed(2);
  }

  bindEvents() {
    // 1. Sidebar Tab Switching
    this.container.querySelectorAll('.rail-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        this.activeSidebarTab = tab.getAttribute('data-sidebar-tab');
        if (this.isSidebarCollapsed) this.isSidebarCollapsed = false;
        avionicsAudio.playPedestalClick();
        this.render();
        this.bindEvents();
      });
    });

    // Sidebar Collapse/Expand Toggle
    const toggleSidebarBtn = this.container.querySelector('#btn-toggle-sidebar');
    if (toggleSidebarBtn) {
      toggleSidebarBtn.addEventListener('click', () => {
        this.isSidebarCollapsed = !this.isSidebarCollapsed;
        avionicsAudio.playPedestalClick();
        this.render();
        this.bindEvents();
      });
    }

    // Telemetry Collapse/Expand Toggle
    const toggleTelemetryBtn = this.container.querySelector('#btn-toggle-telemetry');
    if (toggleTelemetryBtn) {
      toggleTelemetryBtn.addEventListener('click', () => {
        this.isTelemetryCollapsed = !this.isTelemetryCollapsed;
        avionicsAudio.playPedestalClick();
        this.render();
        this.bindEvents();
      });
    }

    // 2. Zen Mode Toggles
    const zenBtn = this.container.querySelector('#btn-toggle-zen');
    if (zenBtn) {
      zenBtn.addEventListener('click', () => {
        this.toggleZenMode();
      });
    }

    const exitZenBtn = this.container.querySelector('#btn-exit-zen');
    if (exitZenBtn) {
      exitZenBtn.addEventListener('click', () => {
        this.toggleZenMode();
      });
    }

    // 3. Audio Toggle
    const soundBtn = this.container.querySelector('#btn-sound-toggle');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        const isMuted = avionicsAudio.toggleMute();
        soundBtn.textContent = isMuted ? '🔇 AUDIO OFF' : '🔊 AUDIO';
        soundBtn.classList.toggle('text-muted', isMuted);
      });
    }

    // 4. Comparator Toggle
    const compBtn = this.container.querySelector('#btn-toggle-comparator');
    if (compBtn) {
      compBtn.addEventListener('click', () => {
        this.isComparatorOpen = !this.isComparatorOpen;
        avionicsAudio.playPedestalClick();
        this.render();
        this.bindEvents();
      });
    }

    const closeCompBtn = this.container.querySelector('#btn-close-comparator');
    if (closeCompBtn) {
      closeCompBtn.addEventListener('click', () => {
        this.isComparatorOpen = false;
        avionicsAudio.playPedestalClick();
        this.render();
        this.bindEvents();
      });
    }

    const compSel2 = this.container.querySelector('#comp-sel-2');
    if (compSel2) {
      compSel2.addEventListener('change', (e) => {
        const found = GLOBAL_FLEET_DB.find((x) => x.id === e.target.value);
        if (found) {
          this.compareAircraft = found;
          avionicsAudio.playPedestalClick();
          this.render();
          this.bindEvents();
        }
      });
    }

    // 5. Render Modes
    this.container.querySelectorAll('.mode-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        const mode = pill.getAttribute('data-render-mode');
        this.activeRenderMode = mode;
        this.scene.setRenderMode(mode);
        avionicsAudio.playPedestalClick();
        this.render();
        this.bindEvents();
      });
    });

    // 6. View Presets (Header & 3D Nav Cube)
    this.container.querySelectorAll('[data-view]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const view = btn.getAttribute('data-view');
        this.activeViewPreset = view;
        this.scene.setViewPreset(view);
        avionicsAudio.playPedestalClick();
        this.render();
        this.bindEvents();
      });
    });

    // 7. Fleet Search & Category Accordions
    const searchInput = this.container.querySelector('#fleet-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        const drawer = this.container.querySelector('.sidebar-content-drawer');
        if (drawer) {
          drawer.innerHTML = this.renderSidebarDrawerContent();
          this.bindDrawerFleetEvents();
        }
      });
    }

    const clearSearchBtn = this.container.querySelector('#btn-clear-fleet-search');
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        this.searchQuery = '';
        this.render();
        this.bindEvents();
      });
    }

    this.bindDrawerFleetEvents();

    // 8. Breadcrumbs & Levels
    this.container.querySelectorAll('.crumb-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const lvl = parseInt(btn.getAttribute('data-nav-level'), 10);
        const ata = btn.getAttribute('data-nav-ata');
        const sub = btn.getAttribute('data-nav-sub');
        const comp = btn.getAttribute('data-nav-comp');
        if (ata) this.activeATA = ata;
        if (sub) this.activeSubAssembly = sub;
        if (comp) this.activeComponent = comp;
        this.setLevel(lvl);
      });
    });

    this.container.querySelectorAll('.lvl-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const lvl = parseInt(btn.getAttribute('data-set-level'), 10);
        this.setLevel(lvl);
      });
    });

    // 9. ATA Chapter Tree clicks
    this.container.querySelectorAll('.chapter-row').forEach((row) => {
      row.addEventListener('click', () => {
        const ata = row.getAttribute('data-ata-select');
        this.activeATA = ata;
        const detail = ATA_DETAILS[ata];
        if (detail && detail.subAssemblies && detail.subAssemblies.length > 0) {
          this.activeSubAssembly = detail.subAssemblies[0].id;
          if (detail.subAssemblies[0].components) {
            this.activeComponent = detail.subAssemblies[0].components[0].id;
          }
        }
        this.setLevel(1);
      });
    });

    this.container.querySelectorAll('.sub-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        e.stopPropagation();
        const sub = row.getAttribute('data-sub-select');
        this.activeSubAssembly = sub;
        const detail = ATA_DETAILS[this.activeATA];
        const sObj = detail && detail.subAssemblies ? detail.subAssemblies.find((x) => x.id === sub) : null;
        if (sObj && sObj.components && sObj.components.length > 0) {
          this.activeComponent = sObj.components[0].id;
        }
        this.setLevel(2);
      });
    });

    this.container.querySelectorAll('.part-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        e.stopPropagation();
        const comp = row.getAttribute('data-comp-select');
        this.activeComponent = comp;
        this.setLevel(3);
      });
    });

    // 10. Operations: Liveries & Flight Phases
    this.container.querySelectorAll('[data-set-livery]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const liv = btn.getAttribute('data-set-livery');
        this.activeLivery = liv;
        this.scene.setLivery(liv);
        avionicsAudio.playPedestalClick();
        this.render();
        this.bindEvents();
      });
    });

    this.container.querySelectorAll('[data-set-phase]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const phId = btn.getAttribute('data-set-phase');
        this.activeFlightPhase = phId;
        const ph = FLIGHT_PHASES.find((x) => x.id === phId);
        if (ph && this.pedestal) {
          this.pedestal.setFlightPhase(ph);
        }
        avionicsAudio.playPedestalClick();
        this.render();
        this.bindEvents();
      });
    });

    // Fly-By-Wire Law Toggles
    this.container.querySelectorAll('[data-set-fbw]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeFBWLaw = btn.getAttribute('data-set-fbw');
        avionicsAudio.playPedestalClick();
        this.render();
        this.bindEvents();
      });
    });

    // Engine Rating Toggles
    this.container.querySelectorAll('[data-set-engine-rating]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeEngineRating = btn.getAttribute('data-set-engine-rating');
        avionicsAudio.playPedestalClick();
        this.render();
        this.bindEvents();
      });
    });

    // Wingtip Variant Toggles
    this.container.querySelectorAll('[data-set-wingtip]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeWingtipVariant = btn.getAttribute('data-set-wingtip');
        avionicsAudio.playPedestalClick();
        this.render();
        this.bindEvents();
      });
    });

    // Cabin Atmosphere Toggles
    this.container.querySelectorAll('[data-set-atmosphere]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeCabinAtmosphere = btn.getAttribute('data-set-atmosphere');
        avionicsAudio.playPedestalClick();
        this.render();
        this.bindEvents();
      });
    });

    // Hero Bento Actions
    const btnHeroDissect = this.container.querySelector('#btn-hero-dissect');
    if (btnHeroDissect) {
      btnHeroDissect.addEventListener('click', () => {
        this.setLevel(1);
        avionicsAudio.playPedestalClick();
      });
    }

    const btnHeroCompare = this.container.querySelector('#btn-hero-compare');
    if (btnHeroCompare) {
      btnHeroCompare.addEventListener('click', () => {
        this.isComparatorOpen = true;
        avionicsAudio.playPedestalClick();
        this.render();
        this.bindEvents();
      });
    }

    const toggleBentoBtns = this.container.querySelectorAll('#btn-toggle-bento');
    toggleBentoBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.isHeroBentoVisible = !this.isHeroBentoVisible;
        avionicsAudio.playPedestalClick();
        this.render();
        this.bindEvents();
      });
    });

    // 11. CAD Tools: Sliders & Toggles
    const sliderExp = this.container.querySelector('#slider-explode');
    if (sliderExp) {
      sliderExp.addEventListener('input', (e) => {
        this.explodeValue = parseInt(e.target.value, 10);
        const valSpan = this.container.querySelector('#val-explode');
        if (valSpan) valSpan.textContent = `${this.explodeValue}%`;
        this.scene.setExplodeFactor(this.explodeValue / 100);
      });
    }

    const sliderSkin = this.container.querySelector('#slider-skin');
    if (sliderSkin) {
      sliderSkin.addEventListener('input', (e) => {
        this.skinOpacityValue = parseInt(e.target.value, 10);
        const valSpan = this.container.querySelector('#val-skin');
        if (valSpan) valSpan.textContent = `${this.skinOpacityValue}%`;
        this.scene.setSkinOpacity(this.skinOpacityValue / 100);
      });
    }

    const checkCalipers = this.container.querySelector('#check-calipers');
    if (checkCalipers) {
      checkCalipers.addEventListener('change', (e) => {
        this.calipersActive = e.target.checked;
        this.scene.toggleCalipers(this.calipersActive);
      });
    }

    const checkHotspots = this.container.querySelector('#check-hotspots');
    if (checkHotspots) {
      checkHotspots.addEventListener('change', (e) => {
        this.hotspotsActive = e.target.checked;
        this.scene.toggleHotspots(this.hotspotsActive);
      });
    }

    const checkStream = this.container.querySelector('#check-streamlines');
    if (checkStream) {
      checkStream.addEventListener('change', (e) => {
        this.streamlinesActive = e.target.checked;
        this.scene.toggleStreamlines(this.streamlinesActive);
      });
    }

    // Slicer
    const checkSlicer = this.container.querySelector('#check-slicer');
    if (checkSlicer) {
      checkSlicer.addEventListener('change', (e) => {
        this.slicerEnabled = e.target.checked;
        this.scene.setSlicer(this.slicerEnabled, this.sliceAxis, this.sliceOffset, this.sliceInverted);
        this.render();
        this.bindEvents();
      });
    }

    const btnSliceInvert = this.container.querySelector('#btn-slice-invert');
    if (btnSliceInvert) {
      btnSliceInvert.addEventListener('click', () => {
        this.sliceInverted = !this.sliceInverted;
        this.scene.setSlicer(this.slicerEnabled, this.sliceAxis, this.sliceOffset, this.sliceInverted);
        this.render();
        this.bindEvents();
      });
    }

    this.container.querySelectorAll('.axis-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.sliceAxis = btn.getAttribute('data-axis');
        this.scene.setSlicer(this.slicerEnabled, this.sliceAxis, this.sliceOffset, this.sliceInverted);
        this.render();
        this.bindEvents();
      });
    });

    const sliderOffset = this.container.querySelector('#slider-slice-offset');
    if (sliderOffset) {
      sliderOffset.addEventListener('input', (e) => {
        this.sliceOffset = parseFloat(e.target.value);
        const valSpan = this.container.querySelector('#val-slice-offset');
        if (valSpan) valSpan.textContent = `${this.sliceOffset.toFixed(1)}m`;
        this.scene.setSlicer(this.slicerEnabled, this.sliceAxis, this.sliceOffset, this.sliceInverted);
      });
    }
  }

  bindDrawerFleetEvents() {
    // Accordion expand/collapse
    this.container.querySelectorAll('[data-cat-toggle]').forEach((header) => {
      header.addEventListener('click', () => {
        const cat = header.getAttribute('data-cat-toggle');
        this.openCategories[cat] = !this.openCategories[cat];
        const drawer = this.container.querySelector('.sidebar-content-drawer');
        if (drawer) {
          drawer.innerHTML = this.renderSidebarDrawerContent();
          this.bindDrawerFleetEvents();
        }
      });
    });

    // Airframe selection
    this.container.querySelectorAll('[data-select-airframe]').forEach((item) => {
      item.addEventListener('click', () => {
        const acId = item.getAttribute('data-select-airframe');
        const found = GLOBAL_FLEET_DB.find((x) => x.id === acId);
        if (found) {
          avionicsAudio.playPedestalClick();
          this.setAircraft(found);
          if (this.onSelectAircraft) this.onSelectAircraft(found);
        }
      });
    });
  }

  setLevel(level) {
    this.currentLevel = level;
    avionicsAudio.playPedestalClick();

    if (level === 2 && this.explodeValue < 40) {
      this.explodeValue = 65;
    } else if (level === 0) {
      this.explodeValue = 0;
      this.skinOpacityValue = 100;
    }

    this.scene.setLevel(this.currentLevel, this.activeATA, this.activeSubAssembly, this.activeComponent);
    this.render();
    this.bindEvents();
  }

  toggleZenMode() {
    this.isZenMode = !this.isZenMode;
    avionicsAudio.playPedestalClick();
    this.render();
    this.bindEvents();
  }

  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      if (e.key === 'f' || e.key === 'F') {
        this.toggleZenMode();
      } else if (e.key === 'h' || e.key === 'H') {
        this.isHeroBentoVisible = !this.isHeroBentoVisible;
        avionicsAudio.playPedestalClick();
        this.render();
        this.bindEvents();
      } else if (e.key === 'r' || e.key === 'R') {
        this.scene.resetCamera();
      } else if (e.key === 'm' || e.key === 'M') {
        avionicsAudio.toggleMute();
      }
    });
  }
}
