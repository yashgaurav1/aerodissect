import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AircraftSynthesizer } from './AircraftSynthesizer.js';

/**
 * AeroScene
 * Production-grade WebGL/Three.js Scene Engine for 3D Aircraft Dissection & Digital Twin.
 * Supports ATA 4-level navigation, particle airflow, thermal shaders, MRI slicing, and synoptics.
 */
export class AeroScene {
  constructor(canvasContainer) {
    this.container = canvasContainer;
    this.width = canvasContainer.clientWidth;
    this.height = canvasContainer.clientHeight;

    this.synthesizer = new AircraftSynthesizer();
    this.currentAircraft = null;
    this.activeAircraftData = null;

    // Dissection & inspection state
    this.currentLevel = 0; // 0: L0 Overview, 1: L1 ATA, 2: L2 Sub-assembly, 3: L3 Micro-component
    this.selectedATA = null; // 'propulsion', 'wing', 'gear', 'cockpit', 'fuselage', 'tail'
    this.selectedSubAssembly = null;
    this.selectedComponent = null;

    this.explodeFactor = 0.0; // 0.0 (assembled) to 1.0 (fully exploded)
    this.skinOpacity = 1.0; // 1.0 (opaque) to 0.0 (wireframe ghost)
    this.activeSynoptic = 'NORM'; // 'NORM', 'HYD', 'FUEL', 'BLEED', 'FLT_CTL'

    // MRI Cross-Section Slicing Plane
    this.slicerActive = false;
    this.sliceAxis = 'Y'; // 'X', 'Y', 'Z'
    this.sliceOffset = 0.0;
    this.sliceInverted = false;
    this.clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1000); // starts outside

    // Camera waypoint interpolation (cubic-bezier lerp)
    this.cameraLerping = false;
    this.camStartPos = new THREE.Vector3();
    this.camTargetPos = new THREE.Vector3(30, 18, 38);
    this.camStartLook = new THREE.Vector3();
    this.camTargetLook = new THREE.Vector3(0, 0, 0);
    this.camLerpAlpha = 1.0;

    // Wind tunnel particles & streamlines
    this.showStreamlines = false;

    this.initThree();
    this.setupLighting();
    this.setupEnvironment();
    this.setupParticles();
    this.setupSlicingGizmo();
    this.setupSynopticLines();

    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);

    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000); // True Black OLED Studio Background (Anduril Standard)

    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 1000);
    this.camera.position.set(28, 16, 36);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.localClippingEnabled = true; // Crucial for MRI cross-section slicing!
    this.renderer.clippingPlanes = [];

    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 180;
    this.controls.minDistance = 2;
    this.controls.target.set(0, 0, 0);

    // Setup 3D Canvas Raycasting for direct part selection & navigation
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.onSelectPartCallback = null;

    let downPos = { x: 0, y: 0 };
    this.renderer.domElement.addEventListener('pointerdown', (e) => {
      downPos.x = e.clientX;
      downPos.y = e.clientY;
    });

    this.renderer.domElement.addEventListener('pointerup', (e) => {
      const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
      if (dist < 6) {
        this.handlePointerClick(e);
      }
    });
  }

  handlePointerClick(e) {
    if (!this.currentAircraft) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.currentAircraft.children, true);

    if (intersects.length > 0) {
      let target = intersects[0].object;
      while (target && target !== this.currentAircraft) {
        if (target.userData && (target.userData.level1 || target.userData.level2 || target.userData.level3)) {
          if (this.onSelectPartCallback) {
            this.onSelectPartCallback(target.userData);
          }
          break;
        }
        target = target.parent;
      }
    }
  }

  setupLighting() {
    // Technical hangar key lighting + ambient cockpit rim
    const ambientLight = new THREE.AmbientLight(0x0e1726, 1.5);
    this.scene.add(ambientLight);

    // Warm Golden Sun Key Light (cinematic golden hour rim, matching the reference image)
    const sunLight = new THREE.DirectionalLight(0xffb020, 2.8);
    sunLight.position.set(45, 35, -40);
    this.scene.add(sunLight);

    // Crisp Studio Key Light from front-top
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(25, 45, 35);
    this.scene.add(keyLight);

    // Electric Cyan fill / rim light from side
    const fillLight = new THREE.DirectionalLight(0x00e5ff, 1.4);
    fillLight.position.set(-45, 20, 15);
    this.scene.add(fillLight);

    // Subtle warm amber bounce from hangar floor
    const bottomReflect = new THREE.DirectionalLight(0xf59e0b, 0.6);
    bottomReflect.position.set(0, -30, 0);
    this.scene.add(bottomReflect);
  }

  setupEnvironment() {
    // 1. Precision CAD Hangar Grid Floor (Dual Layer: Amber Major & Cyan Minor)
    const gridHelper = new THREE.GridHelper(100, 100, 0xf59e0b, 0x111e30);
    gridHelper.position.y = -8;
    this.scene.add(gridHelper);

    // 2. Coordinate axis reference rings in background
    const circleGeo = new THREE.RingGeometry(38, 38.3, 64);
    circleGeo.rotateX(Math.PI / 2);
    const circleMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.18, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(circleGeo, circleMat);
    ring.position.y = -7.95;
    this.scene.add(ring);

    // Outer golden navigation ring
    const goldRingGeo = new THREE.RingGeometry(55, 55.3, 64);
    goldRingGeo.rotateX(Math.PI / 2);
    const goldRingMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.12, side: THREE.DoubleSide });
    const goldRing = new THREE.Mesh(goldRingGeo, goldRingMat);
    goldRing.position.y = -7.96;
    this.scene.add(goldRing);

    // 3. Cinematic Golden Hour Horizon Atmospheric Glow (Spherical Mesh in distant background)
    const sunGlowGeo = new THREE.SphereGeometry(22, 32, 32);
    const sunGlowMat = new THREE.MeshBasicMaterial({
      color: 0xffa000,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    const sunGlow = new THREE.Mesh(sunGlowGeo, sunGlowMat);
    sunGlow.position.set(60, 40, -85);
    this.scene.add(sunGlow);

    const sunCoreGeo = new THREE.SphereGeometry(9, 32, 32);
    const sunCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffd54f,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending
    });
    const sunCore = new THREE.Mesh(sunCoreGeo, sunCoreMat);
    sunCore.position.set(60, 40, -85);
    this.scene.add(sunCore);
  }

  /**
   * 3D Particle Systems:
   * 1. Bypass airflow particles (Electric Cyan #00E5FF)
   * 2. Core combustion airflow particles (glowing incandescent amber/red #FF4400)
   * 3. Flight test wind tunnel aerodynamic streamlines
   */
  setupParticles() {
    // 1. Bypass Airflow Particles
    const bypassCount = 700;
    const bypassGeo = new THREE.BufferGeometry();
    const bypassPos = new Float32Array(bypassCount * 3);
    const bypassSpeeds = new Float32Array(bypassCount);

    for (let i = 0; i < bypassCount; i++) {
      bypassPos[i * 3 + 0] = (Math.random() - 0.5) * 24;
      bypassPos[i * 3 + 1] = (Math.random() - 0.5) * 4;
      bypassPos[i * 3 + 2] = (Math.random() - 0.5) * 35;
      bypassSpeeds[i] = 0.4 + Math.random() * 0.6;
    }
    bypassGeo.setAttribute('position', new THREE.BufferAttribute(bypassPos, 3));
    this.bypassSpeeds = bypassSpeeds;

    const bypassMat = new THREE.PointsMaterial({
      color: 0x00e5ff,
      size: 0.22,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });
    this.bypassParticles = new THREE.Points(bypassGeo, bypassMat);
    this.scene.add(this.bypassParticles);

    // 2. Core Combustion Particles
    const coreCount = 400;
    const coreGeo = new THREE.BufferGeometry();
    const corePos = new Float32Array(coreCount * 3);
    const coreSpeeds = new Float32Array(coreCount);

    for (let i = 0; i < coreCount; i++) {
      corePos[i * 3 + 0] = (Math.random() - 0.5) * 16;
      corePos[i * 3 + 1] = -1.5 + (Math.random() - 0.5) * 2;
      corePos[i * 3 + 2] = -2 - Math.random() * 15;
      coreSpeeds[i] = 0.8 + Math.random() * 1.2;
    }
    coreGeo.setAttribute('position', new THREE.BufferAttribute(corePos, 3));
    this.coreSpeeds = coreSpeeds;

    const coreMat = new THREE.PointsMaterial({
      color: 0xff3a00,
      size: 0.35,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    this.coreParticles = new THREE.Points(coreGeo, coreMat);
    this.scene.add(this.coreParticles);

    // 3. Wind Tunnel Aerodynamic Streamlines
    this.streamlinesGroup = new THREE.Group();
    const ribbonCount = 12;
    for (let i = 0; i < ribbonCount; i++) {
      const curvePoints = [];
      const zStart = 25;
      const xOffset = ((i - ribbonCount / 2) / (ribbonCount / 2)) * 18;
      for (let s = 0; s < 10; s++) {
        const z = zStart - s * 5;
        const y = Math.sin((s / 10) * Math.PI) * 2.5 + (i % 2 === 0 ? 1 : -0.5);
        curvePoints.push(new THREE.Vector3(xOffset, y, z));
      }
      const curve = new THREE.CatmullRomCurve3(curvePoints);
      const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.04, 6, false);
      const tubeMat = new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.4,
        wireframe: false
      });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      this.streamlinesGroup.add(tube);
    }
    this.streamlinesGroup.visible = false;
    this.scene.add(this.streamlinesGroup);
  }

  /**
   * Slicing Plane Visualizer Gizmo (Command Magenta #FF00E5)
   */
  setupSlicingGizmo() {
    const gizmoGeo = new THREE.PlaneGeometry(35, 35);
    const gizmoMat = new THREE.MeshBasicMaterial({
      color: 0xff00e5,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.sliceGizmo = new THREE.Mesh(gizmoGeo, gizmoMat);

    // Glowing border edges
    const edges = new THREE.EdgesGeometry(gizmoGeo);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xff00e5, linewidth: 2 });
    const edgeLines = new THREE.LineSegments(edges, lineMat);
    this.sliceGizmo.add(edgeLines);

    this.sliceGizmo.visible = false;
    this.scene.add(this.sliceGizmo);
  }

  /**
   * Synoptic Schematic Overlays inside the 3D model:
   * - Hydraulics: Green / Blue / Yellow or Left / Right / Center
   * - Fuel: Crossfeed lines & tank cells
   * - Bleed / ECS: Bleed pneumatic ducts (or Electric 235V AC lines for B787)
   * - Flight Controls: Actuator routing
   */
  setupSynopticLines() {
    this.synopticGroup = new THREE.Group();
    this.synopticGroup.name = 'Synoptic_Overlays';
    this.scene.add(this.synopticGroup);
  }

  buildSynopticPaths(aircraftData) {
    // Clear previous synoptics
    while (this.synopticGroup.children.length > 0) {
      const child = this.synopticGroup.children[0];
      this.synopticGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
    }

    if (this.activeSynoptic === 'NORM') {
      this.synopticGroup.visible = false;
      return;
    }

    this.synopticGroup.visible = true;
    const isBoeing = aircraftData.category === 'boeing';
    const is787 = aircraftData.id.includes('787') || aircraftData.bleedType === 'electric_bleedless';
    const p = {
      span: (aircraftData.wingspan || 35) * 0.5,
      length: (aircraftData.length || 40) * 0.5,
      r: (aircraftData.fuselageDiameter || 4.0) * 0.25
    };

    if (this.activeSynoptic === 'HYD') {
      // --- HYDRAULIC LINES ---
      // Airbus: Green (0x00E676), Blue (0x00E5FF), Yellow (0xFFB800)
      // Boeing: Left (0x00E676), Right (0xFFB800), Center (0x00E5FF)
      const colors = isBoeing
        ? [0x00e676, 0x00e5ff, 0xffb800] // Left, Center, Right
        : [0x00e676, 0x00e5ff, 0xffb800]; // Green, Blue, Yellow

      // Route lines from nose to wing and tail
      [-1, 1].forEach((sign, i) => {
        const hydCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(sign * p.r * 0.4, -p.r * 0.3, p.length * 0.35),
          new THREE.Vector3(sign * p.r * 0.6, -p.r * 0.3, 0),
          new THREE.Vector3(sign * p.span * 0.35, -p.r * 0.3, -p.length * 0.08),
          new THREE.Vector3(sign * p.span * 0.45, 0, -p.length * 0.15)
        ]);
        const tube = new THREE.Mesh(
          new THREE.TubeGeometry(hydCurve, 24, 0.08, 8, false),
          new THREE.MeshBasicMaterial({ color: colors[i % colors.length] })
        );
        this.synopticGroup.add(tube);
      });

      // PTU (Power Transfer Unit) between Left & Right / Green & Yellow
      const ptuCurve = new THREE.LineCurve3(
        new THREE.Vector3(-p.r * 0.6, -p.r * 0.3, 0),
        new THREE.Vector3(p.r * 0.6, -p.r * 0.3, 0)
      );
      const ptuTube = new THREE.Mesh(
        new THREE.TubeGeometry(ptuCurve, 8, 0.12, 8, false),
        new THREE.MeshBasicMaterial({ color: 0xffb800 })
      );
      this.synopticGroup.add(ptuTube);

    } else if (this.activeSynoptic === 'FUEL') {
      // --- FUEL TANKS & CROSSFEED VALVES ---
      // Center Wing Tank
      const cwt = new THREE.Mesh(
        new THREE.BoxGeometry(p.r * 1.8, p.r * 0.5, p.length * 0.18),
        new THREE.MeshBasicMaterial({ color: 0xffb800, transparent: true, opacity: 0.55 })
      );
      cwt.position.set(0, -p.r * 0.2, 0);
      this.synopticGroup.add(cwt);

      // Left & Right Main Wing Cell Tanks
      [-1, 1].forEach((sign) => {
        const wingTank = new THREE.Mesh(
          new THREE.BoxGeometry(p.span * 0.35, p.r * 0.25, p.length * 0.12),
          new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.5 })
        );
        wingTank.position.set(sign * p.span * 0.25, 0, -p.length * 0.06);
        this.synopticGroup.add(wingTank);
      });

      // Horizontal Stabilizer Trim Tank (if equipped)
      if (aircraftData.hasTrimTank) {
        const trimTank = new THREE.Mesh(
          new THREE.BoxGeometry(p.span * 0.18, 0.2, p.length * 0.08),
          new THREE.MeshBasicMaterial({ color: 0xff00e5, transparent: true, opacity: 0.65 })
        );
        trimTank.position.set(0, p.r * 0.4, -p.length * 0.42);
        this.synopticGroup.add(trimTank);
      }

    } else if (this.activeSynoptic === 'BLEED') {
      if (is787) {
        // --- BOEING 787 BLEEDLESS ARCHITECTURE ---
        // 235 VAC Electric Power Cables from Starter/Generators to 4x CACs (Electric Cabin Compressors)
        [-1, 1].forEach((sign) => {
          const cableCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(sign * p.span * 0.28, -p.r * 0.4, -p.length * 0.02),
            new THREE.Vector3(sign * p.r * 0.7, -p.r * 0.5, 0),
            new THREE.Vector3(sign * p.r * 0.3, -p.r * 0.7, p.length * 0.05)
          ]);
          const cable = new THREE.Mesh(
            new THREE.TubeGeometry(cableCurve, 16, 0.06, 6, false),
            new THREE.MeshBasicMaterial({ color: 0xff00e5 }) // Command Magenta for High-Voltage AC
          );
          this.synopticGroup.add(cable);
        });
      } else {
        // Standard 400°C Pre-Cooled Pneumatic Engine Bleed Ducts to ECS Packs
        [-1, 1].forEach((sign) => {
          const ductCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(sign * p.span * 0.28, -p.r * 0.3, -p.length * 0.02),
            new THREE.Vector3(sign * p.r * 0.6, -p.r * 0.4, 0),
            new THREE.Vector3(0, -p.r * 0.7, p.length * 0.04)
          ]);
          const duct = new THREE.Mesh(
            new THREE.TubeGeometry(ductCurve, 18, 0.1, 8, false),
            new THREE.MeshBasicMaterial({ color: 0xff3a00 }) // Glowing thermal red/orange
          );
          this.synopticGroup.add(duct);
        });
      }

    } else if (this.activeSynoptic === 'FLT_CTL') {
      // --- FLIGHT CONTROLS ---
      // Highlights all control surfaces in active Command Magenta / Electric Cyan
      [-1, 1].forEach((sign) => {
        // Aileron lines
        const ailCurve = new THREE.LineCurve3(
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(sign * p.span * 0.45, 0, -p.length * 0.16)
        );
        const ailLine = new THREE.Mesh(
          new THREE.TubeGeometry(ailCurve, 12, 0.05, 6, false),
          new THREE.MeshBasicMaterial({ color: 0xff00e5 })
        );
        this.synopticGroup.add(ailLine);
      });
    }
  }

  /**
   * Load an aircraft from database and generate its 3D procedural airframe
   */
  loadAircraft(aircraftData) {
    if (this.currentAircraft) {
      this.scene.remove(this.currentAircraft);
      this.disposeObject(this.currentAircraft);
      this.currentAircraft = null;
    }

    this.activeAircraftData = aircraftData;
    this.currentAircraft = this.synthesizer.synthesizeAircraft(aircraftData);
    this.scene.add(this.currentAircraft);

    // Apply active clipping plane to materials
    this.updateClippingPlanes();

    // Rebuild synoptics
    this.buildSynopticPaths(aircraftData);

    // Reset inspection state
    this.setLevel(0);
  }

  /**
   * Set Dissection Hierarchy Level:
   * 0: L0 Overview (Full airframe in wind tunnel)
   * 1: L1 ATA Major System (Powerplant, Wing, Gear, Cockpit, Fuselage, Tail)
   * 2: L2 Sub-Assembly Exploded View (Radially/axially separated internal modules)
   * 3: L3 Micro-Component Isolation (HPC blisk, single-crystal blade, brake stator, PTU valve)
   */
  setLevel(level, ataCode = null, subAssemblyId = null, componentId = null) {
    this.currentLevel = level;
    this.selectedATA = ataCode;
    this.selectedSubAssembly = subAssemblyId;
    this.selectedComponent = componentId;

    if (!this.currentAircraft) return;

    if (level === 0) {
      // Level 0: Full aircraft visible, skin opaque
      this.setExplodeFactor(0.0);
      this.setSkinOpacity(1.0);
      this.setGhostMode(null);
      this.smoothFlyCamera(new THREE.Vector3(28, 16, 36), new THREE.Vector3(0, 0, 0));
    } else if (level === 1) {
      // Level 1: Major ATA System isolated, rest fades to translucent wireframe ghost
      this.setExplodeFactor(0.0);
      this.setSkinOpacity(0.3);
      this.setGhostMode(ataCode);
      this.zoomToATA(ataCode);
    } else if (level === 2) {
      // Level 2: Sub-Assembly exploded view
      this.setGhostMode(ataCode);
      this.setExplodeFactor(0.65);
      this.zoomToATA(ataCode, 0.8);
    } else if (level === 3) {
      // Level 3: Micro-component isolation & live MRI slicing
      this.setGhostMode(ataCode);
      this.setExplodeFactor(0.9);
      this.isolateMicroComponent(componentId || subAssemblyId);
    }
  }

  /**
   * Ghosting / Highlight effect for ATA Dissection:
   * Keeps the entire aircraft context visible in the center at all times,
   * while highlighting the selected subsystem in Electric Cyan.
   */
  setGhostMode(selectedATA) {
    if (!this.currentAircraft) return;

    this.currentAircraft.traverse((child) => {
      if (child.isMesh && child.userData) {
        child.visible = true; // NEVER hide parts completely! Keep full airframe visible!
        if (!selectedATA) {
          // Level 0: Standard Full Aircraft view
          if (child.material) {
            child.material.wireframe = false;
            child.material.transparent = child.userData.isSkin ? this.skinOpacity < 0.98 : false;
            child.material.opacity = child.userData.isSkin ? Math.max(0.2, this.skinOpacity) : 1.0;
            if (child.material.emissive && !child.userData.isHotCore) {
              child.material.emissive.setHex(0x000000);
              child.material.emissiveIntensity = 0;
            }
          }
        } else {
          const match = child.userData.level1 === selectedATA;
          if (match) {
            // Selected ATA system is highlighted and solid
            if (child.material) {
              child.material.wireframe = false;
              child.material.transparent = false;
              child.material.opacity = 1.0;
              if (child.material.emissive && !child.userData.isHotCore) {
                child.material.emissive.setHex(0x00e5ff);
                child.material.emissiveIntensity = 0.3;
              }
            }
          } else {
            // Surrounding airframe remains visible as an elegant, semi-translucent context (NOT invisible!)
            if (child.material) {
              child.material.transparent = true;
              child.material.opacity = child.userData.isSkin ? 0.35 : 0.6;
              child.material.wireframe = false;
              if (child.material.emissive && !child.userData.isHotCore) {
                child.material.emissive.setHex(0x000000);
                child.material.emissiveIntensity = 0;
              }
            }
          }
        }
      }
    });
  }

  /**
   * Set Exploded View Slider (0.0 to 1.0)
   * Separates internal modules along local explode vectors with CAD leader lines.
   */
  setExplodeFactor(factor) {
    this.explodeFactor = Math.max(0, Math.min(1, factor));
    if (!this.currentAircraft) return;

    this.currentAircraft.traverse((node) => {
      if (node.userData && node.userData.explodeVector) {
        const v = node.userData.explodeVector;
        node.position.set(v.x * this.explodeFactor, v.y * this.explodeFactor, v.z * this.explodeFactor);

        // Update leader line
        if (node.userData.leaderLine) {
          node.userData.leaderLine.visible = this.explodeFactor > 0.05;
          node.userData.leaderLine.scale.set(this.explodeFactor, this.explodeFactor, this.explodeFactor);
        }
      }
    });
  }

  /**
   * Set Skin Opacity Slider (1.0 = Opaque Metallic PBR, 0.0 = Wireframe CAD)
   */
  setSkinOpacity(opacity) {
    this.skinOpacity = Math.max(0, Math.min(1, opacity));
    if (!this.currentAircraft) return;

    this.currentAircraft.traverse((child) => {
      if (child.isMesh && child.userData && child.userData.isSkin) {
        if (child.material) {
          child.material.transparent = this.skinOpacity < 0.98;
          child.material.opacity = Math.max(0.06, this.skinOpacity);
          child.material.wireframe = this.skinOpacity < 0.15;
        }
      }
    });
  }

  /**
   * Update MRI Cross-Section Slicer (Clipping Plane)
   */
  setSlicer(active, axis = 'Y', offset = 0.0, inverted = false) {
    this.slicerActive = active;
    this.sliceAxis = axis;
    this.sliceOffset = offset;
    this.sliceInverted = inverted;

    const normal = new THREE.Vector3();
    if (axis === 'X') normal.set(1, 0, 0);
    else if (axis === 'Y') normal.set(0, 1, 0);
    else if (axis === 'Z') normal.set(0, 0, 1);

    if (inverted) normal.negate();

    if (active) {
      this.clipPlane.set(normal, offset);
      this.renderer.clippingPlanes = [this.clipPlane];
      this.sliceGizmo.visible = true;

      // Position gizmo at plane location
      this.sliceGizmo.position.set(0, 0, 0);
      if (axis === 'X') {
        this.sliceGizmo.rotation.set(0, Math.PI / 2, 0);
        this.sliceGizmo.position.x = -offset * (inverted ? -1 : 1);
      } else if (axis === 'Y') {
        this.sliceGizmo.rotation.set(Math.PI / 2, 0, 0);
        this.sliceGizmo.position.y = -offset * (inverted ? -1 : 1);
      } else if (axis === 'Z') {
        this.sliceGizmo.rotation.set(0, 0, 0);
        this.sliceGizmo.position.z = -offset * (inverted ? -1 : 1);
      }
    } else {
      this.clipPlane.set(new THREE.Vector3(0, -1, 0), 1000);
      this.renderer.clippingPlanes = [];
      this.sliceGizmo.visible = false;
    }
  }

  updateClippingPlanes() {
    if (!this.currentAircraft) return;
    this.currentAircraft.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.clippingPlanes = this.slicerActive ? [this.clipPlane] : [];
        child.material.clipShadows = true;
      }
    });
  }

  /**
   * Set Active Synoptic Page: 'NORM', 'HYD', 'FUEL', 'BLEED', 'FLT_CTL'
   */
  setSynoptic(synoptic) {
    this.activeSynoptic = synoptic;
    if (this.activeAircraftData) {
      this.buildSynopticPaths(this.activeAircraftData);
    }
  }

  /**
   * Toggle Aerodynamic Streamline Ribbons
   */
  toggleStreamlines(visible) {
    this.showStreamlines = visible;
    this.streamlinesGroup.visible = visible;
  }

  /**
   * Smooth Camera Flying Transition (Cubic-Bezier Lerp)
   */
  smoothFlyCamera(targetPos, targetLook, duration = 1.0) {
    this.camStartPos.copy(this.camera.position);
    this.camTargetPos.copy(targetPos);
    this.camStartLook.copy(this.controls.target);
    this.camTargetLook.copy(targetLook);
    this.camLerpAlpha = 0.0;
    this.cameraLerping = true;
  }

  zoomToATA(ataCode, distanceScale = 1.0) {
    if (!this.currentAircraft) return;

    const box = new THREE.Box3();
    let hasMatches = false;

    this.currentAircraft.traverse((child) => {
      if (child.isMesh && child.userData && child.userData.level1 === ataCode) {
        box.expandByObject(child);
        hasMatches = true;
      }
    });

    if (hasMatches && !box.isEmpty()) {
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const safeDistance = Math.max(maxDim * 1.4, 16.0) * distanceScale;

      const offset = new THREE.Vector3(safeDistance * 0.85, safeDistance * 0.45, safeDistance * 0.95);
      this.smoothFlyCamera(center.clone().add(offset), center);
    } else {
      // Default fallback view
      this.smoothFlyCamera(new THREE.Vector3(28, 16, 36), new THREE.Vector3(0, 0, 0));
    }
  }

  isolateMicroComponent(componentId) {
    if (!this.currentAircraft) return;

    const box = new THREE.Box3();
    let hasMatches = false;

    this.currentAircraft.traverse((child) => {
      if (child.isMesh && child.userData && (child.userData.level3 === componentId || child.userData.level2 === componentId)) {
        box.expandByObject(child);
        hasMatches = true;
      }
    });

    if (hasMatches && !box.isEmpty()) {
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const safeDistance = Math.max(maxDim * 2.2, 6.0);

      const offset = new THREE.Vector3(safeDistance * 0.8, safeDistance * 0.45, safeDistance * 0.9);
      this.smoothFlyCamera(center.clone().add(offset), center);
    }
  }

  /**
   * Update Mechanical Animations (Rotators, Particle Velocity, Control Surfaces)
   */
  updatePedestalTelemetry(thrustSetting, flapDetentIndex, gearState) {
    if (!this.currentAircraft) return;
    const reg = this.currentAircraft.userData;

    // 1. Thrust Reverser Translating Sleeve Deployment
    const isReversing = thrustSetting === 'REV';
    reg.controlSurfaces.reversers.forEach((rev) => {
      const targetZ = isReversing ? rev.userData.baseZ - 0.45 : rev.userData.baseZ;
      rev.position.z = THREE.MathUtils.lerp(rev.position.z, targetZ, 0.1);
    });

    // 2. Slats & Flaps Deflection Angle
    const flapFraction = Math.min(1.0, flapDetentIndex / 5.0);
    reg.controlSurfaces.slats.forEach((slat) => {
      const base = slat.userData.basePos;
      // Slats translate forward and drop
      slat.position.z = base.z + flapFraction * 0.4;
      slat.position.y = base.y - flapFraction * 0.15;
    });

    reg.controlSurfaces.flaps.forEach((flap) => {
      const base = flap.userData.basePos;
      // Flaps translate backwards and pitch downwards
      flap.position.z = base.z - flapFraction * 0.6;
      flap.position.y = base.y - flapFraction * 0.3;
      flap.rotation.x = flapFraction * 0.45;
    });

    // 3. Landing Gear Sequence (Handle UP / OFF / DN)
    reg.controlSurfaces.gearAssemblies.forEach((gear) => {
      const isDown = gearState === 'DN';
      const targetY = isDown ? gear.userData.baseY : gear.userData.baseY + 3.0;
      gear.position.y = THREE.MathUtils.lerp(gear.position.y, targetY, 0.08);
      gear.visible = gear.position.y < gear.userData.baseY + 2.8;
    });
  }

  /**
   * Modulate Combustor / Turbine Thermal Shader Emissive Glow
   */
  updateThermalShader(egtCelsius) {
    if (!this.currentAircraft) return;
    const meshes = this.currentAircraft.userData.thermalMeshes || [];
    // EGT scale: 400°C (idle) to 950°C (redline)
    const norm = Math.max(0, Math.min(1, (egtCelsius - 400) / 550));

    // Shift color from deep burnt copper to glowing incandescent cherry red
    const r = THREE.MathUtils.lerp(0.3, 1.0, norm);
    const g = THREE.MathUtils.lerp(0.1, 0.25, norm);
    const b = 0.02;

    meshes.forEach((m) => {
      if (m.material) {
        m.material.emissive.setRGB(r, g, b);
        m.material.emissiveIntensity = 0.3 + norm * 1.8;
      }
    });
  }

  // Animation Loop
  animate() {
    requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();

    // 1. Smooth Camera Fly-To Interpolation
    if (this.cameraLerping) {
      this.camLerpAlpha += delta * 1.5;
      const t = Math.min(1.0, this.camLerpAlpha);
      // Cubic-bezier smoothstep
      const ease = t * t * (3 - 2 * t);

      this.camera.position.lerpVectors(this.camStartPos, this.camTargetPos, ease);
      this.controls.target.lerpVectors(this.camStartLook, this.camTargetLook, ease);

      if (t >= 1.0) {
        this.cameraLerping = false;
      }
    }

    this.controls.update();

    // 2. Engine Rotating Spools (N1 Fan, N2 HPC, Propellers)
    if (this.currentAircraft) {
      const rotators = this.currentAircraft.userData.rotators || [];
      rotators.forEach((rot) => {
        const speed = rot.userData.speed || 1.0;
        rot.rotation.z += delta * 18.0 * speed;
      });
    }

    // 3. Bypass & Core Airflow Particles
    if (this.bypassParticles) {
      const pos = this.bypassParticles.geometry.attributes.position.array;
      for (let i = 0; i < this.bypassSpeeds.length; i++) {
        pos[i * 3 + 2] -= this.bypassSpeeds[i] * 1.2;
        if (pos[i * 3 + 2] < -25) pos[i * 3 + 2] = 25;
      }
      this.bypassParticles.geometry.attributes.position.needsUpdate = true;
    }

    if (this.coreParticles) {
      const pos = this.coreParticles.geometry.attributes.position.array;
      for (let i = 0; i < this.coreSpeeds.length; i++) {
        pos[i * 3 + 2] -= this.coreSpeeds[i] * 1.8;
        if (pos[i * 3 + 2] < -25) pos[i * 3 + 2] = 2;
      }
      this.coreParticles.geometry.attributes.position.needsUpdate = true;
    }

    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  disposeObject(obj) {
    obj.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }

  // =========================================================================
  // VIEW PRESETS (ISO, TOP, FRONT, SIDE, COCKPIT, ENGINE)
  // =========================================================================
  setViewPreset(preset) {
    switch (preset) {
      case 'top':
        this.smoothFlyCamera(new THREE.Vector3(0, 58, 0.01), new THREE.Vector3(0, 0, 0));
        break;
      case 'front':
        this.smoothFlyCamera(new THREE.Vector3(0, 1.5, 48), new THREE.Vector3(0, 0, 0));
        break;
      case 'side':
        this.smoothFlyCamera(new THREE.Vector3(52, 1.5, 0), new THREE.Vector3(0, 0, 0));
        break;
      case 'cockpit':
        this.smoothFlyCamera(new THREE.Vector3(0, 3.5, 20), new THREE.Vector3(0, 1.5, 0));
        break;
      case 'engine':
        this.smoothFlyCamera(new THREE.Vector3(-18, -2, 8), new THREE.Vector3(-12, -2, -2));
        break;
      case 'iso':
      default:
        this.smoothFlyCamera(new THREE.Vector3(28, 16, 36), new THREE.Vector3(0, 0, 0));
        break;
    }
  }

  resetCamera() {
    this.setViewPreset('iso');
  }

  // =========================================================================
  // RENDER MODES & LIVERIES
  // =========================================================================
  setRenderMode(mode) {
    if (this.currentAircraft) {
      this.synthesizer.applyRenderMode(this.currentAircraft, mode);
    }
  }

  setLivery(liveryId) {
    if (this.currentAircraft) {
      this.synthesizer.applyLivery(this.currentAircraft, liveryId);
    }
  }

  toggleCalipers(visible) {
    if (this.currentAircraft && this.currentAircraft.userData.calipers) {
      this.currentAircraft.userData.calipers.visible = visible;
    }
  }

  toggleHotspots(visible) {
    if (this.currentAircraft && this.currentAircraft.userData.hotspots) {
      this.currentAircraft.userData.hotspots.visible = visible;
    }
  }
}
