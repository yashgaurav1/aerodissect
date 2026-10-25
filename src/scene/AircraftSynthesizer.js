import * as THREE from 'three';
import { LIVERY_PRESETS, AIRFRAME_HOTSPOTS } from '../data/fleetDatabase.js';

/**
 * AircraftSynthesizer
 * Procedural 3D Parametric Airframe & Subsystem Synthesizer
 * Builds high-fidelity 4-level ATA Spec 100 dissected aircraft digital twins.
 */
export class AircraftSynthesizer {
  constructor() {
    this.materials = this.createMaterialLibrary();
  }

  createMaterialLibrary() {
    return {
      // Primary fuselage & wing skin (PBR Aerospace Titanium / White Enamel / Carbon)
      skinOpaque: new THREE.MeshStandardMaterial({
        color: 0x1e2738,
        metalness: 0.65,
        roughness: 0.28,
        envMapIntensity: 1.0,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1
      }),
      skinWireframe: new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        wireframe: true,
        transparent: true,
        opacity: 0.12
      }),
      // Leading edges, intake cowlings, polished titanium/aluminum lip
      polishedTitanium: new THREE.MeshStandardMaterial({
        color: 0xccd6e0,
        metalness: 0.92,
        roughness: 0.18,
        envMapIntensity: 1.5
      }),
      // Carbon fiber composite structure (spars, wing boxes, fan blades)
      carbonFiber: new THREE.MeshStandardMaterial({
        color: 0x121720,
        metalness: 0.4,
        roughness: 0.5
      }),
      // Internal structural spars, bulkheads & stringers (Zinc Chromate / Al-Li)
      structuralAlloy: new THREE.MeshStandardMaterial({
        color: 0x228b7a,
        metalness: 0.7,
        roughness: 0.35
      }),
      // Flight control surfaces (flaps, slats, spoilers, ailerons)
      flightControl: new THREE.MeshStandardMaterial({
        color: 0x2a3d58,
        metalness: 0.75,
        roughness: 0.25
      }),
      // Active hydraulic lines & actuation jacks
      hydraulicAmber: new THREE.MeshStandardMaterial({
        color: 0xffb800,
        metalness: 0.6,
        roughness: 0.3,
        emissive: 0xffb800,
        emissiveIntensity: 0.2
      }),
      // Electric cyan highlight material for selected components
      electricCyan: new THREE.MeshStandardMaterial({
        color: 0x00e5ff,
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0x00e5ff,
        emissiveIntensity: 0.35
      }),
      // Landing gear 300M ultra-high strength steel & oleo piston
      landingGearSteel: new THREE.MeshStandardMaterial({
        color: 0xdde4ec,
        metalness: 0.95,
        roughness: 0.12
      }),
      tireRubber: new THREE.MeshStandardMaterial({
        color: 0x0a0c10,
        roughness: 0.9,
        metalness: 0.05
      }),
      brakeCarbon: new THREE.MeshStandardMaterial({
        color: 0x1f1f24,
        metalness: 0.8,
        roughness: 0.4
      }),
      // Engine rotating fan blades & compressor disks
      fanBladeTitanium: new THREE.MeshStandardMaterial({
        color: 0x6e7b8c,
        metalness: 0.85,
        roughness: 0.22
      }),
      // Combustor & turbine thermal core (emissive glowing shader target)
      thermalCore: new THREE.MeshStandardMaterial({
        color: 0x441505,
        emissive: 0xff4400,
        emissiveIntensity: 0.6,
        metalness: 0.5,
        roughness: 0.4
      }),
      // Flight deck cockpit windows (solar-reflective gold/cyan glass)
      cockpitGlass: new THREE.MeshPhysicalMaterial({
        color: 0x00e5ff,
        metalness: 0.9,
        roughness: 0.1,
        transmission: 0.75,
        transparent: true,
        opacity: 0.65,
        reflectivity: 0.9
      }),
      // Exploded view CAD dashed leader line
      leaderLine: new THREE.LineDashedMaterial({
        color: 0xffb800,
        dashSize: 0.4,
        gapSize: 0.2,
        linewidth: 1
      })
    };
  }

  /**
   * Synthesize complete 3D aircraft model from DB record
   */
  synthesizeAircraft(aircraftData) {
    const root = new THREE.Group();
    root.name = `aircraft_${aircraftData.id}`;
    root.userData = {
      aircraftData,
      rotators: [],
      thermalMeshes: [],
      controlSurfaces: {
        slats: [],
        flaps: [],
        spoilers: [],
        reversers: [],
        gearAssemblies: []
      },
      leaderLines: []
    };

    // Scale conversion: 1 meter = 0.5 units in 3D scene (so a 60m wingspan fits 30 units)
    const scale = 0.5;
    const p = {
      length: (aircraftData.length || 40) * scale,
      span: (aircraftData.wingspan || 35) * scale,
      height: (aircraftData.height || 12) * scale,
      fuseDiam: (aircraftData.fuselageDiameter || 4.0) * scale,
      sweepRad: ((aircraftData.wingSweep || 28) * Math.PI) / 180,
      dihedralRad: ((aircraftData.dihedral || 5) * Math.PI) / 180,
      aspectRatio: aircraftData.aspectRatio || 9.5,
      engines: aircraftData.engines,
      gear: aircraftData.gear,
      fuselageType: aircraftData.fuselageType,
      wingletType: aircraftData.wingletType,
      hasDroopNose: aircraftData.hasDroopNose,
      canards: aircraftData.canards
    };

    // Build ATA Level 1 Major Assemblies
    const fuselageGroup = this.buildFuselage(p, root.userData);
    const wingGroup = this.buildWingAssembly(p, root.userData);
    const empennageGroup = this.buildEmpennage(p, root.userData);
    const propulsionGroup = this.buildPropulsion(p, root.userData);
    const landingGearGroup = this.buildLandingGear(p, root.userData);
    const cockpitAvionicsGroup = this.buildCockpitAndAvionics(p, root.userData);

    root.add(fuselageGroup);
    root.add(wingGroup);
    root.add(empennageGroup);
    root.add(propulsionGroup);
    root.add(landingGearGroup);
    root.add(cockpitAvionicsGroup);

    // Build CAD Dimension Calipers & Hotspots
    const calipersGroup = this.buildDimensionCalipers(aircraftData, p);
    root.add(calipersGroup);
    root.userData.calipers = calipersGroup;

    const hotspotsGroup = this.buildHotspots(aircraftData, p);
    root.add(hotspotsGroup);
    root.userData.hotspots = hotspotsGroup;

    // Build exploded view leader lines
    this.createLeaderLines(root);

    return root;
  }

  // =========================================================================
  // 1. FUSELAGE & CABIN (ATA 53 & 21)
  // =========================================================================
  buildFuselage(p, registry) {
    const group = new THREE.Group();
    group.name = 'ATA_53_Fuselage';
    group.userData = { level1: 'fuselage', explodeVector: new THREE.Vector3(0, 3, 0) };

    const halfL = p.length / 2;
    const r = p.fuseDiam / 2;

    // --- External Skin Mesh ---
    let skinGeo;
    if (p.fuselageType === 'hump_upper_deck') {
      // Boeing 747 Upper-Deck Hump profile
      const points = [];
      const steps = 30;
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const z = halfL * (1 - 2 * u);
        let rx = r;
        let ry = r;
        // Nose taper
        if (u < 0.2) {
          const t = u / 0.2;
          rx = r * Math.sin((t * Math.PI) / 2);
          ry = r * Math.sin((t * Math.PI) / 2);
        }
        // Upper deck hump on 747 between u = 0.15 and 0.45
        if (u >= 0.15 && u <= 0.45) {
          const humpFactor = Math.sin(((u - 0.15) / 0.3) * Math.PI);
          ry = r + r * 0.42 * humpFactor;
        }
        // Tail taper
        if (u > 0.7) {
          const t = (u - 0.7) / 0.3;
          rx = r * (1 - t * 0.85);
          ry = r * (1 - t * 0.85);
        }
        points.push(new THREE.Vector2(Math.max(rx, 0.1), z));
      }
      skinGeo = new THREE.LatheGeometry(points, 32);
    } else if (p.fuselageType === 'double_deck_full') {
      // Airbus A380 Full Double-Deck Oval Cross-Section
      const shape = new THREE.Shape();
      const w = r;
      const h = r * 1.35;
      shape.ellipse(0, 0, w, h, 0, Math.PI * 2);
      skinGeo = new THREE.CylinderGeometry(r * 0.95, r, p.length * 0.75, 32, 1, false);
      skinGeo.scale(1, 1, 1.3);
      skinGeo.rotateX(Math.PI / 2);
    } else if (p.fuselageType === 'outsize_cargo_bubble') {
      // Airbus BelugaXL Giant Bubble
      const points = [];
      const steps = 24;
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const z = halfL * (1 - 2 * u);
        let radius = r;
        if (u < 0.15) radius = r * Math.sin((u / 0.15) * Math.PI * 0.5);
        else if (u >= 0.15 && u <= 0.7) radius = r * 1.5; // Big bubble
        else if (u > 0.7) radius = r * 1.5 * (1 - ((u - 0.7) / 0.3) * 0.8);
        points.push(new THREE.Vector2(radius, z));
      }
      skinGeo = new THREE.LatheGeometry(points, 32);
    } else if (p.fuselageType === 'supersonic_slender') {
      // Concorde / Tu-144 Needle Ogive
      const points = [];
      const steps = 30;
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const z = halfL * (1 - 2 * u);
        let radius = r;
        if (u < 0.35) {
          // Sharp slender supersonic nose
          radius = r * Math.pow(u / 0.35, 1.4);
        } else if (u > 0.8) {
          radius = r * (1 - ((u - 0.8) / 0.2) * 0.9);
        }
        points.push(new THREE.Vector2(Math.max(radius, 0.05), z));
      }
      skinGeo = new THREE.LatheGeometry(points, 32);
    } else {
      // Standard High-Efficiency Transport Jet Fuselage
      const points = [];
      const steps = 26;
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const z = halfL * (1 - 2 * u);
        let radius = r;
        if (u < 0.22) {
          // Parabolic nose curve
          radius = r * Math.sin((u / 0.22) * Math.PI * 0.5);
        } else if (u > 0.75) {
          // Aerodynamic tail taper
          const t = (u - 0.75) / 0.25;
          radius = r * (1 - t * 0.88);
        }
        points.push(new THREE.Vector2(Math.max(radius, 0.08), z));
      }
      skinGeo = new THREE.LatheGeometry(points, 32);
    }

    const skinMesh = new THREE.Mesh(skinGeo, this.materials.skinOpaque.clone());
    skinMesh.name = 'Fuselage_Skin';
    skinMesh.userData = {
      level1: 'fuselage',
      level2: 'fuselage_skin',
      isSkin: true
    };
    group.add(skinMesh);

    // --- Fuselage Internal Structural Frames & Stringers (Level 2 ATA 53) ---
    const frameGroup = new THREE.Group();
    frameGroup.name = 'ATA_53_Frames';
    frameGroup.userData = { level1: 'fuselage', level2: 'frames', explodeVector: new THREE.Vector3(0, 1.5, 0) };

    const frameCount = 14;
    for (let i = 0; i < frameCount; i++) {
      const zPos = halfL * 0.7 - (i / (frameCount - 1)) * (p.length * 0.7);
      const ringGeo = new THREE.TorusGeometry(r * 0.92, 0.04, 8, 28);
      const ringMesh = new THREE.Mesh(ringGeo, this.materials.structuralAlloy);
      ringMesh.position.z = zPos;
      ringMesh.userData = { level1: 'fuselage', level2: 'frames' };
      frameGroup.add(ringMesh);
    }
    group.add(frameGroup);

    // --- Cabin Floor Beams & Decks ---
    const floorGeo = new THREE.BoxGeometry(r * 1.8, 0.05, p.length * 0.65);
    const floorMesh = new THREE.Mesh(floorGeo, this.materials.structuralAlloy);
    floorMesh.position.set(0, -r * 0.15, -halfL * 0.05);
    floorMesh.userData = { level1: 'fuselage', level2: 'cabin_deck' };
    group.add(floorMesh);

    if (p.fuselageType === 'double_deck_full') {
      const upperFloorGeo = new THREE.BoxGeometry(r * 1.6, 0.05, p.length * 0.6);
      const upperFloorMesh = new THREE.Mesh(upperFloorGeo, this.materials.structuralAlloy);
      upperFloorMesh.position.set(0, r * 0.45, -halfL * 0.05);
      upperFloorMesh.userData = { level1: 'fuselage', level2: 'cabin_deck_upper' };
      group.add(upperFloorMesh);
    }

    // --- Cargo Hold Lower-Lobe Containers (LD3 ULDs) ---
    const cargoGroup = new THREE.Group();
    cargoGroup.name = 'Cargo_Hold_LD3';
    cargoGroup.userData = { level1: 'fuselage', level2: 'cargo_bay', explodeVector: new THREE.Vector3(0, -1.8, 0) };
    const uldGeo = new THREE.BoxGeometry(r * 0.7, r * 0.45, r * 0.6);
    const uldMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
    for (let i = -2; i <= 2; i++) {
      const uld = new THREE.Mesh(uldGeo, uldMat);
      uld.position.set(0, -r * 0.55, i * (r * 0.8) - halfL * 0.1);
      uld.userData = { level1: 'fuselage', level2: 'cargo_bay' };
      cargoGroup.add(uld);
    }
    group.add(cargoGroup);

    // --- Aft Dome Carbon Pressure Bulkhead (Level 3 component) ---
    const domeGeo = new THREE.SphereGeometry(r * 0.9, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
    domeGeo.rotateX(Math.PI / 2);
    const domeMesh = new THREE.Mesh(domeGeo, this.materials.carbonFiber);
    domeMesh.position.set(0, 0, -halfL * 0.72);
    domeMesh.name = 'Aft_Pressure_Bulkhead';
    domeMesh.userData = {
      level1: 'fuselage',
      level2: 'pressure_bulkhead',
      level3: 'aft_dome',
      explodeVector: new THREE.Vector3(0, 0, -2.5)
    };
    group.add(domeMesh);

    // --- Environmental Control System (ECS) Packs (Level 2/3 ATA 21) ---
    const ecsGroup = new THREE.Group();
    ecsGroup.name = 'ECS_Air_Cycle_Packs';
    ecsGroup.position.set(0, -r * 0.8, halfL * 0.05);
    ecsGroup.userData = {
      level1: 'fuselage',
      level2: 'ecs_packs',
      level3: 'air_cycle_machine',
      explodeVector: new THREE.Vector3(0, -2.2, 0)
    };

    const acmGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.6, 16);
    acmGeo.rotateZ(Math.PI / 2);
    const acmLeft = new THREE.Mesh(acmGeo, this.materials.polishedTitanium);
    acmLeft.position.x = -r * 0.45;
    const acmRight = acmLeft.clone();
    acmRight.position.x = r * 0.45;

    const heatExGeo = new THREE.BoxGeometry(r * 0.4, 0.25, 0.45);
    const heatExLeft = new THREE.Mesh(heatExGeo, this.materials.structuralAlloy);
    heatExLeft.position.set(-r * 0.45, -0.15, 0.1);
    const heatExRight = heatExLeft.clone();
    heatExRight.position.x = r * 0.45;

    ecsGroup.add(acmLeft);
    ecsGroup.add(acmRight);
    ecsGroup.add(heatExLeft);
    ecsGroup.add(heatExRight);
    group.add(ecsGroup);

    return group;
  }

  // =========================================================================
  // 2. WING ASSEMBLY & FLIGHT CONTROLS (ATA 57 & 27)
  // =========================================================================
  buildWingAssembly(p, registry) {
    const group = new THREE.Group();
    group.name = 'ATA_57_WingBox';
    group.userData = { level1: 'wing', explodeVector: new THREE.Vector3(0, 2.5, 0) };

    const halfSpan = p.span / 2;
    const rootChord = p.length * 0.22;
    const tipChord = rootChord * 0.28;
    const sweep = p.sweepRad;
    const dihedral = p.dihedralRad;

    // Both Left & Right wings
    ['left', 'right'].forEach((side) => {
      const sign = side === 'left' ? -1 : 1;
      const wingSideGroup = new THREE.Group();
      wingSideGroup.name = `Wing_${side}`;

      // --- Wing Skin (Extruded Airfoil Shape) ---
      const wingShape = new THREE.Shape();
      // NACA-like high efficiency airfoil profile in X-Z coordinates
      wingShape.moveTo(0, 0);
      wingShape.bezierCurveTo(rootChord * 0.1, rootChord * 0.08, rootChord * 0.35, rootChord * 0.09, rootChord, 0);
      wingShape.bezierCurveTo(rootChord * 0.5, -rootChord * 0.03, rootChord * 0.1, -rootChord * 0.02, 0, 0);

      const wingExtrudeSettings = {
        steps: 16,
        bevelEnabled: false,
        extrudePath: new THREE.CatmullRomCurve3([
          new THREE.Vector3(sign * p.fuseDiam * 0.45, 0, 0),
          new THREE.Vector3(sign * halfSpan * 0.5, Math.sin(dihedral) * halfSpan * 0.5, -Math.sin(sweep) * halfSpan * 0.5),
          new THREE.Vector3(sign * halfSpan, Math.sin(dihedral) * halfSpan, -Math.sin(sweep) * halfSpan)
        ])
      };

      const wingSkinGeo = new THREE.ExtrudeGeometry(wingShape, wingExtrudeSettings);
      const wingSkinMesh = new THREE.Mesh(wingSkinGeo, this.materials.skinOpaque.clone());
      wingSkinMesh.name = `Wing_Skin_${side}`;
      wingSkinMesh.userData = {
        level1: 'wing',
        level2: 'wing_skin',
        isSkin: true
      };
      wingSideGroup.add(wingSkinMesh);

      // --- Internal Front & Rear Titanium Spars (Level 2 ATA 57-10) ---
      const sparGroup = new THREE.Group();
      sparGroup.name = `Wing_Spars_${side}`;
      sparGroup.userData = {
        level1: 'wing',
        level2: 'spars_ribs',
        level3: 'front_spar',
        explodeVector: new THREE.Vector3(sign * 1.0, 1.2, 0)
      };

      const sparLength = halfSpan * 0.95;
      const frontSparGeo = new THREE.BoxGeometry(0.12, 0.35, sparLength);
      const frontSpar = new THREE.Mesh(frontSparGeo, this.materials.polishedTitanium);
      frontSpar.position.set(sign * (halfSpan * 0.45), Math.sin(dihedral) * halfSpan * 0.45, -Math.sin(sweep) * halfSpan * 0.45 + rootChord * 0.3);
      frontSpar.rotation.y = sign * (-sweep * 0.95);
      frontSpar.rotation.z = sign * dihedral;
      sparGroup.add(frontSpar);

      const rearSparGeo = new THREE.BoxGeometry(0.1, 0.25, sparLength);
      const rearSpar = new THREE.Mesh(rearSparGeo, this.materials.structuralAlloy);
      rearSpar.position.set(sign * (halfSpan * 0.45), Math.sin(dihedral) * halfSpan * 0.45, -Math.sin(sweep) * halfSpan * 0.45 + rootChord * 0.7);
      rearSpar.rotation.y = sign * (-sweep * 0.95);
      rearSpar.rotation.z = sign * dihedral;
      sparGroup.add(rearSpar);

      // Machined Ribs along span
      const ribCount = 8;
      for (let r = 1; r < ribCount; r++) {
        const spanFraction = r / ribCount;
        const ribChord = THREE.MathUtils.lerp(rootChord, tipChord, spanFraction);
        const ribGeo = new THREE.BoxGeometry(0.04, ribChord * 0.12, ribChord * 0.6);
        const ribMesh = new THREE.Mesh(ribGeo, this.materials.structuralAlloy);
        ribMesh.position.set(
          sign * (halfSpan * spanFraction),
          Math.sin(dihedral) * halfSpan * spanFraction,
          -Math.sin(sweep) * halfSpan * spanFraction + rootChord * 0.5
        );
        ribMesh.rotation.y = sign * (-sweep * 0.3);
        sparGroup.add(ribMesh);
      }
      wingSideGroup.add(sparGroup);

      // --- Leading Edge Slats (Actuatable, Level 2/3 ATA 27-80) ---
      const slatGroup = new THREE.Group();
      slatGroup.name = `Slat_${side}`;
      slatGroup.userData = {
        level1: 'wing',
        level2: 'slats_actuation',
        level3: 'slat_track',
        isControlSurface: 'slat',
        side,
        basePos: new THREE.Vector3(sign * (halfSpan * 0.5), Math.sin(dihedral) * halfSpan * 0.5, -Math.sin(sweep) * halfSpan * 0.5 + 0.1),
        explodeVector: new THREE.Vector3(0, 0, 1.8)
      };

      const slatGeo = new THREE.CylinderGeometry(0.08, 0.05, halfSpan * 0.65, 8, 1, false, 0, Math.PI);
      slatGeo.rotateZ(Math.PI / 2);
      const slatMesh = new THREE.Mesh(slatGeo, this.materials.flightControl);
      slatMesh.rotation.y = sign * (-sweep);
      slatGroup.position.copy(slatGroup.userData.basePos);
      slatGroup.add(slatMesh);
      wingSideGroup.add(slatGroup);
      registry.controlSurfaces.slats.push(slatGroup);

      // --- Trailing Edge Fowler Flaps & Canoes (Level 2/3 ATA 27-50) ---
      const flapGroup = new THREE.Group();
      flapGroup.name = `Flap_${side}`;
      flapGroup.userData = {
        level1: 'wing',
        level2: 'fowler_flaps',
        level3: 'flap_vane',
        isControlSurface: 'flap',
        side,
        basePos: new THREE.Vector3(sign * (halfSpan * 0.35), Math.sin(dihedral) * halfSpan * 0.35, -Math.sin(sweep) * halfSpan * 0.35 + rootChord * 0.85),
        explodeVector: new THREE.Vector3(0, -1.0, -1.5)
      };

      const flapGeo = new THREE.BoxGeometry(halfSpan * 0.45, 0.08, rootChord * 0.25);
      const flapMesh = new THREE.Mesh(flapGeo, this.materials.flightControl);
      flapMesh.rotation.y = sign * (-sweep * 0.8);
      flapGroup.position.copy(flapGroup.userData.basePos);
      flapGroup.add(flapMesh);
      wingSideGroup.add(flapGroup);
      registry.controlSurfaces.flaps.push(flapGroup);

      // Flap Track Fairings ("Canoes")
      for (let c = 0; c < 2; c++) {
        const canoeGeo = new THREE.ConeGeometry(0.12, 1.2, 12);
        canoeGeo.rotateX(Math.PI / 2);
        const canoe = new THREE.Mesh(canoeGeo, this.materials.carbonFiber);
        canoe.position.set(
          sign * (halfSpan * (0.22 + c * 0.18)),
          Math.sin(dihedral) * halfSpan * (0.22 + c * 0.18) - 0.18,
          -Math.sin(sweep) * halfSpan * (0.22 + c * 0.18) + rootChord * 0.8
        );
        wingSideGroup.add(canoe);
      }

      // --- Spoilers / Speedbrakes ---
      const spoilerGroup = new THREE.Group();
      spoilerGroup.name = `Spoiler_${side}`;
      spoilerGroup.userData = {
        level1: 'wing',
        level2: 'fowler_flaps',
        isControlSurface: 'spoiler',
        side,
        basePos: new THREE.Vector3(sign * (halfSpan * 0.38), Math.sin(dihedral) * halfSpan * 0.38 + 0.06, -Math.sin(sweep) * halfSpan * 0.38 + rootChord * 0.65)
      };
      const spoilerGeo = new THREE.BoxGeometry(halfSpan * 0.35, 0.03, rootChord * 0.15);
      const spoilerMesh = new THREE.Mesh(spoilerGeo, this.materials.electricCyan);
      spoilerGroup.position.copy(spoilerGroup.userData.basePos);
      spoilerGroup.add(spoilerMesh);
      wingSideGroup.add(spoilerGroup);
      registry.controlSurfaces.spoilers.push(spoilerGroup);

      // --- Wingtip Devices (Sharklet / Raked / Scimitar / 777X Folding Wingtip) ---
      const wingtipPos = new THREE.Vector3(sign * halfSpan, Math.sin(dihedral) * halfSpan, -Math.sin(sweep) * halfSpan + tipChord * 0.5);
      if (p.wingletType === 'sharklet' || p.wingletType === 'curved_sharklet') {
        const sharkletGeo = new THREE.ConeGeometry(0.15, 1.8, 16);
        const sharklet = new THREE.Mesh(sharkletGeo, this.materials.carbonFiber);
        sharklet.position.copy(wingtipPos).add(new THREE.Vector3(sign * 0.1, 0.8, 0));
        sharklet.rotation.z = sign * -0.2;
        wingSideGroup.add(sharklet);
      } else if (p.wingletType === 'split_scimitar') {
        const upTip = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.4, 12), this.materials.carbonFiber);
        upTip.position.copy(wingtipPos).add(new THREE.Vector3(sign * 0.08, 0.65, 0));
        const downTip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.7, 12), this.materials.carbonFiber);
        downTip.position.copy(wingtipPos).add(new THREE.Vector3(sign * 0.05, -0.3, 0));
        downTip.rotation.z = Math.PI;
        wingSideGroup.add(upTip);
        wingSideGroup.add(downTip);
      } else if (p.wingletType === 'folding_777x') {
        // Boeing 777X Folding Wingtip (Level 2/3 ATA 57-90)
        const foldTipGroup = new THREE.Group();
        foldTipGroup.name = `Folding_Wingtip_${side}`;
        foldTipGroup.position.copy(wingtipPos);
        foldTipGroup.userData = {
          level1: 'wing',
          level2: 'folding_wingtip',
          level3: 'latch_pins',
          side,
          isFoldingTip: true,
          folded: false,
          explodeVector: new THREE.Vector3(sign * 1.5, 0.8, 0)
        };
        const foldTipGeo = new THREE.BoxGeometry(0.2, 0.1, tipChord * 1.2);
        const foldTipMesh = new THREE.Mesh(foldTipGeo, this.materials.carbonFiber);
        foldTipMesh.position.set(sign * 0.8, 0, 0);

        // Hinge & Latch Pin Assembly
        const hingeGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.3, 16);
        hingeGeo.rotateX(Math.PI / 2);
        const hinge = new THREE.Mesh(hingeGeo, this.materials.hydraulicAmber);
        foldTipGroup.add(hinge);
        foldTipGroup.add(foldTipMesh);
        wingSideGroup.add(foldTipGroup);
      } else if (p.wingletType === 'raked' || p.wingletType === 'raked_scimitar') {
        const rakedGeo = new THREE.ConeGeometry(0.12, 1.5, 12);
        rakeGeoRot(rakedGeo, sign, sweep);
        const raked = new THREE.Mesh(rakedGeo, this.materials.carbonFiber);
        raked.position.copy(wingtipPos);
        wingSideGroup.add(raked);
      }

      group.add(wingSideGroup);
    });

    return group;
  }

  // =========================================================================
  // 3. PROPULSION & TURBOMACHINERY (ATA 71-80)
  // =========================================================================
  buildPropulsion(p, registry) {
    const group = new THREE.Group();
    group.name = 'ATA_71_Powerplant';
    group.userData = { level1: 'propulsion', explodeVector: new THREE.Vector3(0, 0, 3.5) };

    const engCount = p.engines.count || 2;
    const fanR = ((p.engines.fanDiameter || 2.0) / 2) * 0.5;
    const engL = fanR * 3.2;
    const engType = p.engines.type; // 'turbofan_high', 'turbofan_geared', 'turboprop', 'afterburning_turbojet', 'piston'

    // Determine engine positions based on airframe geometry
    const positions = [];
    if (p.fuselageType.includes('rear_engine') || p.fuselageType === 'trijet_s_duct_biz') {
      // Rear fuselage-mounted (CRJ, ERJ, MD-95, Bizjets)
      positions.push(new THREE.Vector3(-p.fuseDiam * 0.7, p.fuseDiam * 0.15, -p.length * 0.28));
      positions.push(new THREE.Vector3(p.fuseDiam * 0.7, p.fuseDiam * 0.15, -p.length * 0.28));
    } else if (p.fuselageType === 'trijet_s_duct' || p.fuselageType === 'trijet_center_straight') {
      // 3 Engines: 2 under wing or rear + 1 in tail
      positions.push(new THREE.Vector3(-p.span * 0.26, -p.fuseDiam * 0.2, -p.length * 0.05));
      positions.push(new THREE.Vector3(p.span * 0.26, -p.fuseDiam * 0.2, -p.length * 0.05));
      positions.push(new THREE.Vector3(0, p.fuseDiam * 0.9, -p.length * 0.38));
    } else if (engCount === 4) {
      // 4 Engines under wing (A340, A380, 747, C-17, Concorde)
      positions.push(new THREE.Vector3(-p.span * 0.22, -p.fuseDiam * 0.3, -p.length * 0.04));
      positions.push(new THREE.Vector3(-p.span * 0.36, -p.fuseDiam * 0.2, -p.length * 0.1));
      positions.push(new THREE.Vector3(p.span * 0.22, -p.fuseDiam * 0.3, -p.length * 0.04));
      positions.push(new THREE.Vector3(p.span * 0.36, -p.fuseDiam * 0.2, -p.length * 0.1));
    } else if (engCount === 6) {
      // 6 Engines (Antonov An-225 Mriya)
      positions.push(new THREE.Vector3(-p.span * 0.18, -p.fuseDiam * 0.3, -p.length * 0.02));
      positions.push(new THREE.Vector3(-p.span * 0.28, -p.fuseDiam * 0.25, -p.length * 0.07));
      positions.push(new THREE.Vector3(-p.span * 0.38, -p.fuseDiam * 0.2, -p.length * 0.12));
      positions.push(new THREE.Vector3(p.span * 0.18, -p.fuseDiam * 0.3, -p.length * 0.02));
      positions.push(new THREE.Vector3(p.span * 0.28, -p.fuseDiam * 0.25, -p.length * 0.07));
      positions.push(new THREE.Vector3(p.span * 0.38, -p.fuseDiam * 0.2, -p.length * 0.12));
    } else if (engCount === 1) {
      // Single engine nose or center (Cessna, PC-12, F-35)
      positions.push(new THREE.Vector3(0, 0, p.length * 0.45));
    } else {
      // Standard twin underwing turbofans (A320, 737, 777, 787, A350)
      positions.push(new THREE.Vector3(-p.span * 0.27, -p.fuseDiam * 0.28, -p.length * 0.02));
      positions.push(new THREE.Vector3(p.span * 0.27, -p.fuseDiam * 0.28, -p.length * 0.02));
    }

    positions.forEach((pos, idx) => {
      const eng = this.buildSingleEngine(idx, pos, fanR, engL, engType, p, registry);
      group.add(eng);
    });

    return group;
  }

  buildSingleEngine(index, position, fanR, engL, engType, p, registry) {
    const engRoot = new THREE.Group();
    engRoot.name = `Engine_${index + 1}`;
    engRoot.position.copy(position);

    // --- Pylon Mount to Wing/Fuselage ---
    const pylonGeo = new THREE.BoxGeometry(0.14, fanR * 1.1, engL * 0.7);
    const pylon = new THREE.Mesh(pylonGeo, this.materials.structuralAlloy);
    pylon.position.set(0, fanR * 0.8, -engL * 0.15);
    engRoot.add(pylon);

    if (engType === 'turboprop' || engType === 'piston') {
      // --- Turboprop Engine (ATR, Q400, C-130J, King Air, PC-12) ---
      const nacelleGeo = new THREE.CylinderGeometry(fanR * 0.6, fanR * 0.7, engL, 20);
      nacelleGeo.rotateX(Math.PI / 2);
      const nacelle = new THREE.Mesh(nacelleGeo, this.materials.skinOpaque);
      nacelle.userData = { level1: 'propulsion', level2: 'fan_module', isSkin: true };
      engRoot.add(nacelle);

      // Propeller Hub & Scimitar Blades (Rotating assembly)
      const propGroup = new THREE.Group();
      propGroup.position.set(0, 0, engL * 0.55);
      propGroup.userData = { isRotator: true, spool: 'N1', speed: 1.0 };
      registry.rotators.push(propGroup);

      const spinnerGeo = new THREE.ConeGeometry(fanR * 0.35, fanR * 0.8, 16);
      spinnerGeo.rotateX(Math.PI / 2);
      const spinner = new THREE.Mesh(spinnerGeo, this.materials.polishedTitanium);
      propGroup.add(spinner);

      const bladeCount = engType === 'piston' ? 2 : 6;
      for (let b = 0; b < bladeCount; b++) {
        const bladeGeo = new THREE.BoxGeometry(0.08, fanR * 2.2, 0.02);
        const blade = new THREE.Mesh(bladeGeo, this.materials.carbonFiber);
        blade.position.y = fanR * 0.9;
        const bladeArm = new THREE.Group();
        bladeArm.rotation.z = (b / bladeCount) * Math.PI * 2;
        bladeArm.add(blade);
        propGroup.add(bladeArm);
      }
      engRoot.add(propGroup);

      // Internal Gearbox & Power Turbine
      const gearbox = new THREE.Mesh(new THREE.CylinderGeometry(fanR * 0.4, fanR * 0.4, 0.4, 16), this.materials.hydraulicAmber);
      gearbox.rotation.x = Math.PI / 2;
      gearbox.position.z = engL * 0.25;
      gearbox.userData = { level1: 'propulsion', level2: 'compressor_module' };
      engRoot.add(gearbox);

      return engRoot;
    }

    if (engType === 'afterburning_turbojet') {
      // --- Supersonic Afterburning Engine (Concorde Olympus, F-22 F119, SR-71 J58) ---
      const caseGeo = new THREE.CylinderGeometry(fanR * 0.9, fanR * 0.95, engL * 1.3, 24);
      caseGeo.rotateX(Math.PI / 2);
      const caseMesh = new THREE.Mesh(caseGeo, this.materials.polishedTitanium);
      caseMesh.userData = { level1: 'propulsion', level2: 'fan_module', isSkin: true };
      engRoot.add(caseMesh);

      // Intake Shock Cone (SR-71 / Concorde)
      if (p.id === 'sr-71' || p.id === 'concorde') {
        const spikeGeo = new THREE.ConeGeometry(fanR * 0.4, fanR * 1.8, 16);
        spikeGeo.rotateX(Math.PI / 2);
        const spike = new THREE.Mesh(spikeGeo, this.materials.landingGearSteel);
        spike.position.z = engL * 0.75;
        engRoot.add(spike);
      }

      // Afterburner Spray Rings & Convergent-Divergent Petal Nozzle
      const abCore = new THREE.Mesh(new THREE.TorusGeometry(fanR * 0.65, 0.04, 12, 24), this.materials.hydraulicAmber);
      abCore.position.z = -engL * 0.35;
      engRoot.add(abCore);

      const nozzleGeo = new THREE.CylinderGeometry(fanR * 0.85, fanR * 0.7, 0.5, 20, 1, true);
      nozzleGeo.rotateX(Math.PI / 2);
      const nozzle = new THREE.Mesh(nozzleGeo, this.materials.landingGearSteel);
      nozzle.position.z = -engL * 0.65;
      engRoot.add(nozzle);

      return engRoot;
    }

    // --- High-Bypass Turbofan (CFM56, LEAP, GE90, GE9X, Trent, GEnx, PW1000G) ---
    // 1. External Cowling & Intake Lip (Level 2 ATA 72-10)
    const cowlGroup = new THREE.Group();
    cowlGroup.name = 'Nacelle_Cowling';
    cowlGroup.userData = { level1: 'propulsion', level2: 'fan_module', isSkin: true, explodeVector: new THREE.Vector3(1.2, 0, 0) };

    const cowlGeo = new THREE.CylinderGeometry(fanR * 1.02, fanR * 0.98, engL, 28, 1, true);
    cowlGeo.rotateX(Math.PI / 2);
    const cowlMesh = new THREE.Mesh(cowlGeo, this.materials.skinOpaque);
    cowlMesh.userData = { isSkin: true };
    cowlGroup.add(cowlMesh);

    // Polished Titanium Intake Lip
    const lipGeo = new THREE.TorusGeometry(fanR * 1.02, 0.08, 12, 28);
    const lip = new THREE.Mesh(lipGeo, this.materials.polishedTitanium);
    lip.position.z = engL * 0.5;
    cowlGroup.add(lip);

    // Translating Sleeves / Thrust Reverser (Level 2/3 ATA 78-30)
    const revGeo = new THREE.CylinderGeometry(fanR * 1.01, fanR * 1.0, engL * 0.35, 24, 1, true);
    revGeo.rotateX(Math.PI / 2);
    const revSleeve = new THREE.Mesh(revGeo, this.materials.flightControl);
    revSleeve.position.z = -engL * 0.15;
    revSleeve.userData = {
      level1: 'propulsion',
      level2: 'reverser_module',
      level3: 'cascade_vanes',
      isReverser: true,
      baseZ: -engL * 0.15
    };
    cowlGroup.add(revSleeve);
    registry.controlSurfaces.reversers.push(revSleeve);
    engRoot.add(cowlGroup);

    // 2. Rotating Fan Rotor & Spinner (Level 2/3 ATA 72-10)
    const fanRotor = new THREE.Group();
    fanRotor.name = 'Fan_Rotor_N1';
    fanRotor.position.z = engL * 0.38;
    fanRotor.userData = { isRotator: true, spool: 'N1', speed: 1.0, level1: 'propulsion', level2: 'fan_module', level3: 'fan_blades' };
    registry.rotators.push(fanRotor);

    const spinnerGeo = new THREE.ConeGeometry(fanR * 0.32, fanR * 0.7, 20);
    spinnerGeo.rotateX(Math.PI / 2);
    const spinner = new THREE.Mesh(spinnerGeo, this.materials.landingGearSteel);
    spinner.userData = { level3: 'spinner_cone' };
    fanRotor.add(spinner);

    const bladeCount = 18;
    for (let b = 0; b < bladeCount; b++) {
      const bladeGeo = new THREE.BoxGeometry(0.08, fanR * 0.9, 0.03);
      bladeGeo.rotateZ(0.25); // aerodynamic twist
      const blade = new THREE.Mesh(bladeGeo, this.materials.fanBladeTitanium);
      blade.position.y = fanR * 0.5;
      const bladeArm = new THREE.Group();
      bladeArm.rotation.z = (b / bladeCount) * Math.PI * 2;
      bladeArm.add(blade);
      fanRotor.add(bladeArm);
    }
    engRoot.add(fanRotor);

    // 3. High-Pressure Compressor (HPC) Blisk Rotor (Level 2/3 ATA 72-30)
    const hpcGroup = new THREE.Group();
    hpcGroup.name = 'HPC_Core_N2';
    hpcGroup.position.z = engL * 0.12;
    hpcGroup.userData = { isRotator: true, spool: 'N2', speed: 2.2, level1: 'propulsion', level2: 'compressor_module', level3: 'hpc_blisk' };
    registry.rotators.push(hpcGroup);

    for (let s = 0; s < 4; s++) {
      const bliskGeo = new THREE.CylinderGeometry(fanR * (0.45 - s * 0.04), fanR * (0.45 - s * 0.04), 0.06, 16);
      bliskGeo.rotateX(Math.PI / 2);
      const blisk = new THREE.Mesh(bliskGeo, this.materials.polishedTitanium);
      blisk.position.z = -s * 0.1;
      hpcGroup.add(blisk);
    }
    engRoot.add(hpcGroup);

    // 4. Annular Combustor with Thermal Glowing Shader (Level 2/3 ATA 72-40)
    const combustorGeo = new THREE.TorusGeometry(fanR * 0.38, 0.08, 16, 24);
    const combustorMesh = new THREE.Mesh(combustorGeo, this.materials.thermalCore.clone());
    combustorMesh.position.z = -engL * 0.18;
    combustorMesh.userData = {
      level1: 'propulsion',
      level2: 'combustor_module',
      level3: 'combustion_chamber',
      isHotCore: true
    };
    registry.thermalMeshes.push(combustorMesh);
    engRoot.add(combustorMesh);

    // 5. High-Pressure & Low-Pressure Turbines (HPT/LPT) (Level 2/3 ATA 72-50)
    const turbineRotor = new THREE.Group();
    turbineRotor.name = 'Turbine_Rotor';
    turbineRotor.position.z = -engL * 0.35;
    turbineRotor.userData = { isRotator: true, spool: 'N2', speed: 2.2, level1: 'propulsion', level2: 'turbine_module', level3: 'hpt_blade' };
    registry.rotators.push(turbineRotor);

    for (let t = 0; t < 3; t++) {
      const turbGeo = new THREE.CylinderGeometry(fanR * (0.36 + t * 0.05), fanR * (0.36 + t * 0.05), 0.05, 16);
      turbGeo.rotateX(Math.PI / 2);
      const turbDisk = new THREE.Mesh(turbGeo, this.materials.fanBladeTitanium);
      turbDisk.position.z = -t * 0.12;
      turbineRotor.add(turbDisk);
    }
    engRoot.add(turbineRotor);

    // 6. Primary Core Exhaust Cone & Chevron Nozzle
    const coneGeo = new THREE.ConeGeometry(fanR * 0.3, fanR * 1.2, 16);
    coneGeo.rotateX(-Math.PI / 2);
    const cone = new THREE.Mesh(coneGeo, this.materials.polishedTitanium);
    cone.position.z = -engL * 0.65;
    engRoot.add(cone);

    return engRoot;
  }

  // =========================================================================
  // 4. LANDING GEAR & BRAKES (ATA 32)
  // =========================================================================
  buildLandingGear(p, registry) {
    const group = new THREE.Group();
    group.name = 'ATA_32_LandingGear';
    group.userData = { level1: 'gear', explodeVector: new THREE.Vector3(0, -3.0, 0) };

    const gearH = p.fuseDiam * 0.9;
    const r = p.fuseDiam / 2;

    // --- Nose Gear (Dual Wheels, Oleo Strut, Drag Brace) ---
    const noseGear = new THREE.Group();
    noseGear.name = 'Nose_Landing_Gear';
    noseGear.position.set(0, -r * 0.65, p.length * 0.36);
    noseGear.userData = {
      level1: 'gear',
      level2: 'oleo_strut',
      level3: 'oleo_piston',
      type: 'nose',
      baseY: -r * 0.65
    };

    const noseStrutGeo = new THREE.CylinderGeometry(0.08, 0.07, gearH * 0.85, 16);
    const noseStrut = new THREE.Mesh(noseStrutGeo, this.materials.landingGearSteel);
    noseStrut.position.y = -gearH * 0.42;
    noseGear.add(noseStrut);

    // Nose Wheels (2 wheels)
    const noseWheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.14, 16);
    noseWheelGeo.rotateZ(Math.PI / 2);
    const nwL = new THREE.Mesh(noseWheelGeo, this.materials.tireRubber);
    nwL.position.set(-0.16, -gearH * 0.85, 0);
    const nwR = new THREE.Mesh(noseWheelGeo, this.materials.tireRubber);
    nwR.position.set(0.16, -gearH * 0.85, 0);
    noseGear.add(nwL);
    noseGear.add(nwR);

    group.add(noseGear);
    registry.controlSurfaces.gearAssemblies.push(noseGear);

    // --- Main Landing Gear Bogies (2-wheel, 4-wheel, 6-wheel triple bogie, 20-wheel A380) ---
    const mainTruckCount = p.gear.mainTruckCount || 2;
    const wheelsPerTruck = p.gear.wheelsPerTruck || 4;
    const truckSpan = p.fuseDiam * 0.85;

    for (let t = 0; t < mainTruckCount; t++) {
      const side = t % 2 === 0 ? -1 : 1;
      const isCenterline = mainTruckCount > 2 && t >= 2;
      const xPos = isCenterline ? 0 : side * truckSpan;
      const zPos = isCenterline ? -p.length * 0.08 : -p.length * 0.02;

      const mainGear = new THREE.Group();
      mainGear.name = `Main_Gear_${t + 1}`;
      mainGear.position.set(xPos, -r * 0.7, zPos);
      mainGear.userData = {
        level1: 'gear',
        level2: 'bogie_truck',
        level3: 'bogie_beam',
        type: 'main',
        side: side < 0 ? 'left' : 'right',
        baseY: -r * 0.7
      };

      // Main Oleo Strut
      const mainStrutGeo = new THREE.CylinderGeometry(0.14, 0.12, gearH, 16);
      const mainStrut = new THREE.Mesh(mainStrutGeo, this.materials.landingGearSteel);
      mainStrut.position.y = -gearH * 0.5;
      mainGear.add(mainStrut);

      // Upper & Lower Torque Links (Scissors, Level 3 component)
      const scissorGeo = new THREE.BoxGeometry(0.06, 0.25, 0.08);
      const scissorUpper = new THREE.Mesh(scissorGeo, this.materials.landingGearSteel);
      scissorUpper.position.set(0, -gearH * 0.45, 0.15);
      scissorUpper.rotation.x = 0.4;
      mainGear.add(scissorUpper);

      // Bogie Beam
      const bogieGroup = new THREE.Group();
      bogieGroup.position.set(0, -gearH * 0.95, 0);
      bogieGroup.name = `Bogie_Beam_${t + 1}`;
      bogieGroup.userData = { level3: 'bogie_beam' };

      const wheelDiam = 0.38;
      const wheelW = 0.18;
      const tireGeo = new THREE.CylinderGeometry(wheelDiam, wheelDiam, wheelW, 18);
      tireGeo.rotateZ(Math.PI / 2);

      const brakeGeo = new THREE.CylinderGeometry(wheelDiam * 0.65, wheelDiam * 0.65, wheelW * 0.8, 16);
      brakeGeo.rotateZ(Math.PI / 2);

      // Distribute wheels based on wheelsPerTruck (2, 4, 6, 8)
      if (wheelsPerTruck === 2) {
        // Single axle (A320, 737, Regional)
        [-0.22, 0.22].forEach((wx) => {
          const w = new THREE.Mesh(tireGeo, this.materials.tireRubber);
          w.position.x = wx;
          const brk = new THREE.Mesh(brakeGeo, this.materials.brakeCarbon);
          brk.position.x = wx * 0.8;
          bogieGroup.add(w);
          bogieGroup.add(brk);
        });
      } else if (wheelsPerTruck === 6) {
        // 6-Wheel Triple-Bogie with Rear-Axle Steering (777-300ER, A350-1000)
        const beamGeo = new THREE.BoxGeometry(0.12, 0.12, 1.4);
        const beam = new THREE.Mesh(beamGeo, this.materials.landingGearSteel);
        bogieGroup.add(beam);

        [-0.5, 0, 0.5].forEach((wz) => {
          [-0.26, 0.26].forEach((wx) => {
            const w = new THREE.Mesh(tireGeo, this.materials.tireRubber);
            w.position.set(wx, 0, wz);
            const brk = new THREE.Mesh(brakeGeo, this.materials.brakeCarbon);
            brk.position.set(wx * 0.8, 0, wz);
            brk.userData = { level3: 'stator_rotor_pack' };
            bogieGroup.add(w);
            bogieGroup.add(brk);
          });
        });
      } else {
        // Standard 4-Wheel Double-Axle Bogie (A330, 787, 767, A380 wing)
        const beamGeo = new THREE.BoxGeometry(0.12, 0.12, 0.85);
        const beam = new THREE.Mesh(beamGeo, this.materials.landingGearSteel);
        bogieGroup.add(beam);

        [-0.32, 0.32].forEach((wz) => {
          [-0.24, 0.24].forEach((wx) => {
            const w = new THREE.Mesh(tireGeo, this.materials.tireRubber);
            w.position.set(wx, 0, wz);
            const brk = new THREE.Mesh(brakeGeo, this.materials.brakeCarbon);
            brk.position.set(wx * 0.8, 0, wz);
            brk.userData = { level3: 'stator_rotor_pack' };
            bogieGroup.add(w);
            bogieGroup.add(brk);
          });
        });
      }

      mainGear.add(bogieGroup);
      group.add(mainGear);
      registry.controlSurfaces.gearAssemblies.push(mainGear);
    }

    return group;
  }

  // =========================================================================
  // 5. FLIGHT DECK & AVIONICS (ATA 31 & 34)
  // =========================================================================
  buildCockpitAndAvionics(p, registry) {
    const group = new THREE.Group();
    group.name = 'ATA_31_FlightDeck';
    group.userData = { level1: 'cockpit', explodeVector: new THREE.Vector3(0, 0, 2.8) };

    const halfL = p.length / 2;
    const r = p.fuseDiam / 2;

    // --- Weather Radar Phased Array (Inside Radome, Level 2/3 ATA 34-41) ---
    const radarGroup = new THREE.Group();
    radarGroup.name = 'Radar_Bay';
    radarGroup.position.set(0, 0, halfL * 0.96);
    radarGroup.userData = {
      level1: 'cockpit',
      level2: 'radome_module',
      level3: 'radar_antenna',
      explodeVector: new THREE.Vector3(0, 0, 2.0)
    };

    const radarDishGeo = new THREE.CylinderGeometry(r * 0.6, r * 0.6, 0.05, 20);
    radarDishGeo.rotateX(Math.PI / 2);
    const radarDish = new THREE.Mesh(radarDishGeo, this.materials.electricCyan);
    radarGroup.add(radarDish);

    const hornGeo = new THREE.ConeGeometry(0.08, 0.3, 12);
    hornGeo.rotateX(Math.PI / 2);
    const horn = new THREE.Mesh(hornGeo, this.materials.hydraulicAmber);
    horn.position.z = 0.2;
    radarGroup.add(horn);
    group.add(radarGroup);

    // --- Flight Deck Glass Cockpit Displays & Crew Seats ---
    const cockpitPos = new THREE.Vector3(0, r * 0.25, halfL * 0.78);
    const flightDeckGroup = new THREE.Group();
    flightDeckGroup.name = 'Flight_Deck_LFDs';
    flightDeckGroup.position.copy(cockpitPos);
    flightDeckGroup.userData = {
      level1: 'cockpit',
      level2: 'flight_deck_displays',
      level3: 'lfd_display',
      explodeVector: new THREE.Vector3(0, 1.8, 0)
    };

    // Instrument Panel with 5 Large Format Displays (LFDs)
    for (let d = -2; d <= 2; d++) {
      const screenGeo = new THREE.BoxGeometry(r * 0.22, r * 0.18, 0.02);
      const screenMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
      const screen = new THREE.Mesh(screenGeo, screenMat);
      screen.position.set(d * (r * 0.25), 0, 0.15);
      screen.rotation.x = -0.15;
      flightDeckGroup.add(screen);
    }

    // Pilot & Copilot Captain Seats
    [-r * 0.35, r * 0.35].forEach((seatX) => {
      const seatGeo = new THREE.BoxGeometry(r * 0.28, r * 0.45, r * 0.28);
      const seat = new THREE.Mesh(seatGeo, this.materials.flightControl);
      seat.position.set(seatX, -r * 0.1, -r * 0.3);
      flightDeckGroup.add(seat);
    });

    group.add(flightDeckGroup);

    // --- External Cockpit Windshield Glass Windows ---
    const windowGeo = new THREE.CylinderGeometry(r * 0.88, r * 0.95, r * 0.4, 16, 1, false, Math.PI * 0.7, Math.PI * 0.6);
    windowGeo.rotateX(Math.PI / 2);
    const windows = new THREE.Mesh(windowGeo, this.materials.cockpitGlass);
    windows.position.set(0, r * 0.35, halfL * 0.82);
    windows.userData = { level1: 'cockpit', isSkin: true };
    group.add(windows);

    // Concorde / Tu-144 Droop Nose Visor Mechanism
    if (p.hasDroopNose) {
      const visorGeo = new THREE.ConeGeometry(r * 0.7, halfL * 0.35, 16);
      visorGeo.rotateX(Math.PI / 2);
      const visor = new THREE.Mesh(visorGeo, this.materials.polishedTitanium);
      visor.position.set(0, -r * 0.1, halfL * 0.95);
      visor.name = 'Droop_Nose_Visor';
      visor.userData = { level1: 'cockpit', level2: 'radome_module', isDroopNose: true };
      group.add(visor);
    }

    return group;
  }

  // =========================================================================
  // 6. EMPENNAGE & APU (ATA 55 & 49)
  // =========================================================================
  buildEmpennage(p, registry) {
    const group = new THREE.Group();
    group.name = 'ATA_55_Empennage';
    group.userData = { level1: 'tail', explodeVector: new THREE.Vector3(0, 1.8, -2.5) };

    const halfL = p.length / 2;
    const r = p.fuseDiam / 2;
    const vertHeight = p.height * 0.55;
    const horizSpan = p.span * 0.35;

    // --- Vertical Stabilizer (Fin & Rudder) ---
    const vertShape = new THREE.Shape();
    vertShape.moveTo(0, 0);
    vertShape.lineTo(r * 0.8, vertHeight);
    vertShape.lineTo(r * 1.6, vertHeight);
    vertShape.lineTo(r * 2.8, 0);
    vertShape.closePath();

    const vertExtrude = new THREE.ExtrudeGeometry(vertShape, { depth: 0.15, bevelEnabled: false });
    vertExtrude.rotateY(-Math.PI / 2);

    const vertFin = new THREE.Mesh(vertExtrude, this.materials.skinOpaque.clone());
    vertFin.position.set(0, r * 0.6, -halfL * 0.88);
    vertFin.name = 'Vertical_Stabilizer';
    vertFin.userData = { level1: 'tail', level2: 'stabilizers', isSkin: true };
    group.add(vertFin);

    // Twin Tail for An-225, F-22, Su-57
    if (p.id === 'an-225' || p.id === 'f-22' || p.id === 'su-57') {
      const finL = vertFin.clone();
      finL.position.x = -horizSpan * 0.45;
      const finR = vertFin.clone();
      finR.position.x = horizSpan * 0.45;
      group.add(finL);
      group.add(finR);
    }

    // --- Horizontal Stabilizers (Elevators & THSA Trim Jackscrew) ---
    const horizGeo = new THREE.BoxGeometry(horizSpan, 0.1, p.length * 0.12);
    const horizStab = new THREE.Mesh(horizGeo, this.materials.skinOpaque.clone());
    horizStab.position.set(0, r * 0.35, -halfL * 0.85);
    horizStab.name = 'Horizontal_Stabilizer';
    horizStab.userData = { level1: 'tail', level2: 'horizontal_trim', isSkin: true };
    group.add(horizStab);

    // THSA Jackscrew Actuator (Level 3 component)
    const jackGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.6, 12);
    const jackscrew = new THREE.Mesh(jackGeo, this.materials.hydraulicAmber);
    jackscrew.position.set(0, r * 0.2, -halfL * 0.82);
    jackscrew.userData = { level1: 'tail', level2: 'horizontal_trim', level3: 'thsa_jackscrew' };
    group.add(jackscrew);

    // --- Auxiliary Power Unit (APU) Turbine in Tail Cone (ATA 49) ---
    const apuGroup = new THREE.Group();
    apuGroup.name = 'APU_Turbine_Bay';
    apuGroup.position.set(0, 0, -halfL * 0.94);
    apuGroup.userData = {
      level1: 'tail',
      level2: 'apu_module',
      level3: 'apu_turbine',
      explodeVector: new THREE.Vector3(0, 0, -2.0)
    };

    const apuCaseGeo = new THREE.CylinderGeometry(r * 0.3, r * 0.25, 0.7, 16);
    apuCaseGeo.rotateX(Math.PI / 2);
    const apuCase = new THREE.Mesh(apuCaseGeo, this.materials.polishedTitanium);
    apuGroup.add(apuCase);

    const apuExhaustGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.25, 12);
    apuExhaustGeo.rotateX(Math.PI / 2);
    const apuExhaust = new THREE.Mesh(apuExhaustGeo, this.materials.landingGearSteel);
    apuExhaust.position.z = -0.42;
    apuGroup.add(apuExhaust);

    group.add(apuGroup);

    return group;
  }

  // =========================================================================
  // LEADER LINES FOR EXPLODED VIEW
  // =========================================================================
  createLeaderLines(root) {
    root.traverse((node) => {
      if (node.userData && node.userData.explodeVector) {
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          node.userData.explodeVector.clone()
        ]);
        const line = new THREE.Line(lineGeo, this.materials.leaderLine);
        line.computeLineDistances();
        line.visible = false;
        node.userData.leaderLine = line;
        root.userData.leaderLines.push(line);
      }
    });
  }

  // =========================================================================
  // 3D CAD DIMENSION CALIPERS & BOUNDING BOX
  // =========================================================================
  buildDimensionCalipers(aircraftData, p) {
    const calipers = new THREE.Group();
    calipers.name = 'CAD_Dimension_Calipers';
    calipers.visible = false;

    const spanM = aircraftData.wingspan || 35;
    const lenM = aircraftData.length || 40;
    const heightM = aircraftData.height || 12;

    const halfSpan = p.span / 2;
    const halfL = p.length / 2;
    const halfH = p.height / 2;

    const lineMat = new THREE.LineDashedMaterial({
      color: 0x00e5ff,
      dashSize: 0.5,
      gapSize: 0.25,
      linewidth: 1
    });

    // 1. Wingspan Caliper Line (Lateral X)
    const spanY = -p.fuseDiam * 0.8;
    const spanZ = -p.length * 0.1;
    const spanGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-halfSpan, spanY, spanZ),
      new THREE.Vector3(halfSpan, spanY, spanZ)
    ]);
    const spanLine = new THREE.Line(spanGeo, lineMat);
    spanLine.computeLineDistances();
    calipers.add(spanLine);

    // End ticks
    const tickGeoL = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-halfSpan, spanY - 0.8, spanZ),
      new THREE.Vector3(-halfSpan, spanY + 0.8, spanZ)
    ]);
    const tickL = new THREE.Line(tickGeoL, lineMat);
    tickL.computeLineDistances();
    calipers.add(tickL);

    const tickGeoR = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(halfSpan, spanY - 0.8, spanZ),
      new THREE.Vector3(halfSpan, spanY + 0.8, spanZ)
    ]);
    const tickR = new THREE.Line(tickGeoR, lineMat);
    tickR.computeLineDistances();
    calipers.add(tickR);

    // Text Label Sprite for Wingspan
    const spanLabel = createTextSprite(`WINGSPAN: ${spanM}m / ${(spanM * 3.28084).toFixed(0)}ft`);
    spanLabel.position.set(0, spanY - 0.6, spanZ);
    calipers.add(spanLabel);

    // 2. Fuselage Length Caliper (Longitudinal Z)
    const lenX = halfSpan + 1.8;
    const lenY = 0;
    const lenGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(lenX, lenY, -halfL),
      new THREE.Vector3(lenX, lenY, halfL)
    ]);
    const lenLine = new THREE.Line(lenGeo, lineMat);
    lenLine.computeLineDistances();
    calipers.add(lenLine);

    const lenTickF = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(lenX - 0.8, lenY, halfL),
      new THREE.Vector3(lenX + 0.8, lenY, halfL)
    ]), lineMat);
    lenTickF.computeLineDistances();
    calipers.add(lenTickF);

    const lenTickA = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(lenX - 0.8, lenY, -halfL),
      new THREE.Vector3(lenX + 0.8, lenY, -halfL)
    ]), lineMat);
    lenTickA.computeLineDistances();
    calipers.add(lenTickA);

    const lenLabel = createTextSprite(`LENGTH: ${lenM}m / ${(lenM * 3.28084).toFixed(0)}ft`);
    lenLabel.position.set(lenX + 0.8, lenY, 0);
    calipers.add(lenLabel);

    // 3. Tail Height Caliper (Vertical Y)
    const hX = -halfSpan - 1.8;
    const hZ = -halfL * 0.85;
    const hGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(hX, -p.fuseDiam * 0.9, hZ),
      new THREE.Vector3(hX, p.height * 0.6, hZ)
    ]);
    const hLine = new THREE.Line(hGeo, lineMat);
    hLine.computeLineDistances();
    calipers.add(hLine);

    const hLabel = createTextSprite(`HEIGHT: ${heightM}m / ${(heightM * 3.28084).toFixed(0)}ft`);
    hLabel.position.set(hX - 0.8, p.height * 0.2, hZ);
    calipers.add(hLabel);

    // 4. Subtle Wireframe Bounding Box
    const bboxGeo = new THREE.BoxGeometry(p.span * 1.05, p.height * 1.1, p.length * 1.05);
    const bboxEdges = new THREE.EdgesGeometry(bboxGeo);
    const bboxMesh = new THREE.LineSegments(bboxEdges, new THREE.LineBasicMaterial({
      color: 0x1e3a5f,
      transparent: true,
      opacity: 0.35
    }));
    bboxMesh.position.set(0, 0, 0);
    calipers.add(bboxMesh);

    return calipers;
  }

  // =========================================================================
  // 3D INTERACTIVE HOTSPOT INSPECTION BEACONS
  // =========================================================================
  buildHotspots(aircraftData, p) {
    const hotspots = new THREE.Group();
    hotspots.name = 'Airframe_Hotspots';
    hotspots.visible = false;

    const beaconGeo = new THREE.SphereGeometry(0.22, 16, 16);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const ringGeo = new THREE.RingGeometry(0.3, 0.42, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });

    AIRFRAME_HOTSPOTS.forEach((spot) => {
      const spotGroup = new THREE.Group();
      spotGroup.name = `Hotspot_${spot.id}`;
      spotGroup.userData = {
        isHotspot: true,
        spotData: spot
      };

      const x = spot.posFactor[0] * p.span;
      const y = spot.posFactor[1] * p.height;
      const z = spot.posFactor[2] * p.length;
      spotGroup.position.set(x, y, z);

      const sphere = new THREE.Mesh(beaconGeo, beaconMat);
      spotGroup.add(sphere);

      const ring = new THREE.Mesh(ringGeo, ringMat);
      spotGroup.add(ring);

      // Label sprite
      const sprite = createTextSprite(`[${spot.ata}] ${spot.name}`);
      sprite.position.set(0, 0.6, 0);
      spotGroup.add(sprite);

      hotspots.add(spotGroup);
    });

    return hotspots;
  }

  // =========================================================================
  // LIVERY PRESET MODULATION
  // =========================================================================
  applyLivery(root, liveryId) {
    const preset = LIVERY_PRESETS.find((l) => l.id === liveryId) || LIVERY_PRESETS[0];
    root.traverse((child) => {
      if (child.isMesh && child.userData && child.userData.isSkin && child.material) {
        if (child.material.color) {
          child.material.color.setHex(preset.skinColor);
          child.material.metalness = preset.metalness;
          child.material.roughness = preset.roughness;
          child.material.needsUpdate = true;
        }
      }
    });
  }

  // =========================================================================
  // RENDER MODE MODULATION (PBR, WIREFRAME, X-RAY, FLIR)
  // =========================================================================
  applyRenderMode(root, mode) {
    root.traverse((child) => {
      if (child.isMesh && child.material) {
        if (mode === 'wireframe') {
          child.material.wireframe = true;
          child.material.color.setHex(0x00e5ff);
          child.material.transparent = true;
          child.material.opacity = 0.35;
        } else if (mode === 'xray') {
          if (child.userData.isSkin) {
            child.material.wireframe = true;
            child.material.transparent = true;
            child.material.opacity = 0.1;
          } else {
            child.material.wireframe = false;
            child.material.transparent = false;
            child.material.opacity = 1.0;
          }
        } else if (mode === 'flir') {
          // FLIR Infrared Thermal signature simulation
          if (child.userData.isHotCore) {
            child.material.color.setHex(0xffffff);
            child.material.emissive.setHex(0xff1100);
            child.material.emissiveIntensity = 2.5;
          } else if (child.userData.level1 === 'propulsion') {
            child.material.color.setHex(0xff7700);
          } else if (child.userData.level1 === 'cockpit') {
            child.material.color.setHex(0xaa33aa);
          } else {
            child.material.color.setHex(0x112266);
          }
          child.material.wireframe = false;
        } else {
          // Standard PBR Studio mode
          child.material.wireframe = false;
          if (child.userData.isSkin) {
            child.material.transparent = false;
            child.material.opacity = 1.0;
            child.material.color.setHex(0x1e2738);
          }
        }
        child.material.needsUpdate = true;
      }
    });
  }
}

// Canvas Text Sprite Utility
function createTextSprite(message) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(5, 8, 14, 0.85)';
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 496, 112);
  ctx.fillRect(10, 10, 492, 108);

  ctx.font = 'bold 36px monospace';
  ctx.fillStyle = '#00e5ff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(message, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(4, 1, 1);
  return sprite;
}

function rakeGeoRot(geo, sign, sweep) {
  geo.rotateZ(sign * -0.5);
  geo.rotateY(sign * (-sweep * 0.5));
}
