// GLOBAL_FLEET_DB: Complete 70+ Parametric Aircraft Database
// Fully mapped with ATA Spec 100 chapters, metallurgy, OEM suppliers, and real-world engineering telemetry.

export const CATEGORIES = [
  { id: 'airbus', label: 'Airbus Commercial' },
  { id: 'boeing', label: 'Boeing Commercial' },
  { id: 'regional', label: 'Regional & Turboprop' },
  { id: 'eastern', label: 'Global & Eastern' },
  { id: 'supersonic_classic', label: 'Supersonic & Classic' },
  { id: 'bizjet_ga', label: 'Business & General Av' },
  { id: 'military_stealth', label: 'Military & Stealth' }
];

export const GLOBAL_FLEET_DB = [
  // -------------------------------------------------------------
  // 1. AIRBUS COMMERCIAL
  // -------------------------------------------------------------
  {
    id: 'a220-300',
    name: 'Airbus A220-300',
    category: 'airbus',
    icao: 'A223',
    manufacturer: 'Airbus Canada / Bombardier',
    eis: 2016,
    wingspan: 35.1,
    length: 38.7,
    height: 11.5,
    fuselageDiameter: 3.5,
    fuselageType: 'single_aisle',
    wingSweep: 25.0,
    aspectRatio: 11.0,
    wingletType: 'sharklet',
    flapType: 'fowler_double',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'Pratt & Whitney PW1524G-JM Geared Turbofan',
      count: 2,
      type: 'turbofan_geared',
      spools: 2,
      fanDiameter: 1.85,
      bypassRatio: 12.0,
      maxThrustKN: 108.5,
      hasChevrons: false,
      oem: 'Pratt & Whitney'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 2,
      bogieSteering: false,
      tirePSI: 180
    },
    hydraulics: {
      system: 'airbus_gby',
      pressurePSI: 3000,
      circuits: ['Green', 'Blue', 'Yellow']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '46%',
    primaryAlloy: 'Al-Li 2099 / Toray Carbon Fiber',
    notes: 'Originally Bombardier CSeries CS300. Features Pratt & Whitney Geared Turbofan (FDGS) with 3:1 planetary reduction gear decoupling the fan from the LPC, reducing tip speeds and noise signature by 75%.'
  },
  {
    id: 'a300-600r',
    name: 'Airbus A300-600R',
    category: 'airbus',
    icao: 'A306',
    manufacturer: 'Airbus',
    eis: 1988,
    wingspan: 44.8,
    length: 54.1,
    height: 16.5,
    fuselageDiameter: 5.64,
    fuselageType: 'twin_aisle',
    wingSweep: 28.0,
    aspectRatio: 7.7,
    wingletType: 'wingtip_fence',
    flapType: 'fowler_double',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'GE CF6-80C2A1 / Pratt & Whitney PW4158',
      count: 2,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 2.36,
      bypassRatio: 5.3,
      maxThrustKN: 273.6,
      hasChevrons: false,
      oem: 'GE Aerospace'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 4,
      bogieSteering: false,
      tirePSI: 200
    },
    hydraulics: {
      system: 'airbus_gby',
      pressurePSI: 3000,
      circuits: ['Green', 'Blue', 'Yellow']
    },
    bleedType: 'pneumatic',
    hasTrimTank: true,
    compositeWeightFraction: '10%',
    primaryAlloy: 'Al-Zn 7075-T6 / Al-Cu 2024-T3',
    notes: 'The pioneering twin-aisle widebody that established Airbus. The -600R introduced the horizontal stabilizer trim tank for aerodynamic center-of-gravity management during cruise, saving 1.5% fuel burn.'
  },
  {
    id: 'a310-300',
    name: 'Airbus A310-300',
    category: 'airbus',
    icao: 'A310',
    manufacturer: 'Airbus',
    eis: 1985,
    wingspan: 43.9,
    length: 46.7,
    height: 15.8,
    fuselageDiameter: 5.64,
    fuselageType: 'twin_aisle',
    wingSweep: 28.0,
    aspectRatio: 8.8,
    wingletType: 'wingtip_fence',
    flapType: 'fowler_double',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'Pratt & Whitney PW4156A / GE CF6-80C2',
      count: 2,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 2.36,
      bypassRatio: 5.1,
      maxThrustKN: 249.0,
      hasChevrons: false,
      oem: 'Pratt & Whitney'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 4,
      bogieSteering: false,
      tirePSI: 200
    },
    hydraulics: {
      system: 'airbus_gby',
      pressurePSI: 3000,
      circuits: ['Green', 'Blue', 'Yellow']
    },
    bleedType: 'pneumatic',
    hasTrimTank: true,
    compositeWeightFraction: '8%',
    primaryAlloy: 'Al-Cu 2024 / CFRP Fin Box',
    notes: 'First commercial aircraft to feature an all-composite carbon-fiber vertical fin box structure, pioneering composite airframe applications in commercial aviation.'
  },
  {
    id: 'a318',
    name: 'Airbus A318-100 ("Baby Bus")',
    category: 'airbus',
    icao: 'A318',
    manufacturer: 'Airbus',
    eis: 2003,
    wingspan: 34.1,
    length: 31.4,
    height: 12.5,
    fuselageDiameter: 3.95,
    fuselageType: 'single_aisle',
    wingSweep: 25.0,
    aspectRatio: 9.4,
    wingletType: 'wingtip_fence',
    flapType: 'fowler_single',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'Pratt & Whitney PW6000A / CFM56-5B8',
      count: 2,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 1.44,
      bypassRatio: 5.0,
      maxThrustKN: 105.9,
      hasChevrons: false,
      oem: 'CFM International'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 2,
      bogieSteering: false,
      tirePSI: 180
    },
    hydraulics: {
      system: 'airbus_gby',
      pressurePSI: 3000,
      circuits: ['Green', 'Blue', 'Yellow']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '15%',
    primaryAlloy: 'Al-Zn 7050 / GLARE laminates',
    notes: 'The shortest A320 family variant. Certified for steep 5.5-degree approach angles into London City Airport (LCY) with modified Fly-By-Wire spoiler laws acting as airbrakes.'
  },
  {
    id: 'a319',
    name: 'Airbus A319-100',
    category: 'airbus',
    icao: 'A319',
    manufacturer: 'Airbus',
    eis: 1996,
    wingspan: 34.1,
    length: 33.8,
    height: 11.8,
    fuselageDiameter: 3.95,
    fuselageType: 'single_aisle',
    wingSweep: 25.0,
    aspectRatio: 9.4,
    wingletType: 'wingtip_fence',
    flapType: 'fowler_single',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'CFM International CFM56-5B6 / IAE V2524-A5',
      count: 2,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 1.73,
      bypassRatio: 5.9,
      maxThrustKN: 104.5,
      hasChevrons: false,
      oem: 'CFM International'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 2,
      bogieSteering: false,
      tirePSI: 185
    },
    hydraulics: {
      system: 'airbus_gby',
      pressurePSI: 3000,
      circuits: ['Green', 'Blue', 'Yellow']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '15%',
    primaryAlloy: 'Al-Zn 7050 / CFRP Control Surfaces',
    notes: 'Key high-altitude "hot-and-high" workhorse (frequently operated at Lhasa Gonggar, altitude 11,710 ft) with an exceptional thrust-to-weight ratio.'
  },
  {
    id: 'a320-200',
    name: 'Airbus A320-200 (ceo)',
    category: 'airbus',
    icao: 'A320',
    manufacturer: 'Airbus',
    eis: 1988,
    wingspan: 34.1,
    length: 37.6,
    height: 11.8,
    fuselageDiameter: 3.95,
    fuselageType: 'single_aisle',
    wingSweep: 25.0,
    aspectRatio: 9.4,
    wingletType: 'wingtip_fence',
    flapType: 'fowler_single',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'CFM International CFM56-5B4',
      count: 2,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 1.73,
      bypassRatio: 5.7,
      maxThrustKN: 120.1,
      hasChevrons: false,
      oem: 'CFM International'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 2,
      bogieSteering: false,
      tirePSI: 190
    },
    hydraulics: {
      system: 'airbus_gby',
      pressurePSI: 3000,
      circuits: ['Green', 'Blue', 'Yellow']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '15%',
    primaryAlloy: 'Al-Cu 2024-T3 skin / CFRP Tailcone & Fin',
    notes: 'The revolution of commercial Fly-By-Wire: replaced control column yokes with side-sticks and flight envelope protection laws. Features the iconic PTU ("Power Transfer Unit") hydraulic bark between Green and Yellow circuits during single-engine taxi.'
  },
  {
    id: 'a320neo',
    name: 'Airbus A320neo',
    category: 'airbus',
    icao: 'A20N',
    manufacturer: 'Airbus',
    eis: 2016,
    wingspan: 35.8,
    length: 37.6,
    height: 11.8,
    fuselageDiameter: 3.95,
    fuselageType: 'single_aisle',
    wingSweep: 25.0,
    aspectRatio: 10.3,
    wingletType: 'sharklet',
    flapType: 'fowler_single',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'CFM International LEAP-1A26',
      count: 2,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 1.98,
      bypassRatio: 11.0,
      maxThrustKN: 120.6,
      hasChevrons: false,
      oem: 'CFM International (GE / Safran)'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 2,
      bogieSteering: false,
      tirePSI: 195
    },
    hydraulics: {
      system: 'airbus_gby',
      pressurePSI: 3000,
      circuits: ['Green', 'Blue', 'Yellow']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '18%',
    primaryAlloy: '3D-Woven CFRP Fan / Ti-6Al-4V leading edge',
    notes: 'LEAP-1A features 18 3D-woven carbon fiber RTM fan blades and Ceramic Matrix Composite (CMC) shroud tiles operating at 1,300°C without film cooling.'
  },
  {
    id: 'a321neo',
    name: 'Airbus A321neo',
    category: 'airbus',
    icao: 'A21N',
    manufacturer: 'Airbus',
    eis: 2017,
    wingspan: 35.8,
    length: 44.5,
    height: 11.8,
    fuselageDiameter: 3.95,
    fuselageType: 'single_aisle',
    wingSweep: 25.0,
    aspectRatio: 10.3,
    wingletType: 'sharklet',
    flapType: 'fowler_double_slotted',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'CFM LEAP-1A32 / Pratt & Whitney PW1133G-JM',
      count: 2,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 1.98,
      bypassRatio: 11.0,
      maxThrustKN: 143.1,
      hasChevrons: false,
      oem: 'CFM International'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 2,
      bogieSteering: false,
      tirePSI: 205
    },
    hydraulics: {
      system: 'airbus_gby',
      pressurePSI: 3000,
      circuits: ['Green', 'Blue', 'Yellow']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '20%',
    primaryAlloy: 'Al-Li fuselage skin / CFRP Flap track fairings',
    notes: 'Features Airbus Cabin Flex (ACF) door configuration and high-lift double-slotted trailing-edge flaps providing low takeoff/landing stall speeds at maximum takeoff weight (97 tonnes).'
  },
  {
    id: 'a321xlr',
    name: 'Airbus A321XLR',
    category: 'airbus',
    icao: 'A21X',
    manufacturer: 'Airbus',
    eis: 2024,
    wingspan: 35.8,
    length: 44.5,
    height: 11.8,
    fuselageDiameter: 3.95,
    fuselageType: 'single_aisle',
    wingSweep: 25.0,
    aspectRatio: 10.3,
    wingletType: 'sharklet',
    flapType: 'fowler_double_slotted',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'CFM LEAP-1A33 / PW1133G-JM',
      count: 2,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 1.98,
      bypassRatio: 11.0,
      maxThrustKN: 147.2,
      hasChevrons: false,
      oem: 'CFM International'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 2,
      bogieSteering: false,
      tirePSI: 215
    },
    hydraulics: {
      system: 'airbus_gby',
      pressurePSI: 3000,
      circuits: ['Green', 'Blue', 'Yellow']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '22%',
    primaryAlloy: 'Integral RCT structural tank / Reinforced landing gear steel 300M',
    notes: 'Houses a structural Rear Center Tank (RCT) with 12,900 L fuel integrated directly into the fuselage frames below the passenger cabin, enabling an unprecedented 4,700 nmi single-aisle transatlantic range.'
  },
  {
    id: 'a330-300',
    name: 'Airbus A330-300',
    category: 'airbus',
    icao: 'A333',
    manufacturer: 'Airbus',
    eis: 1994,
    wingspan: 60.3,
    length: 63.7,
    height: 16.8,
    fuselageDiameter: 5.64,
    fuselageType: 'twin_aisle',
    wingSweep: 30.0,
    aspectRatio: 10.1,
    wingletType: 'blended',
    flapType: 'fowler_double',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'Rolls-Royce Trent 772B / GE CF6-80E1 / PW4168',
      count: 2,
      type: 'turbofan_high',
      spools: 3,
      fanDiameter: 2.47,
      bypassRatio: 5.0,
      maxThrustKN: 316.0,
      hasChevrons: false,
      oem: 'Rolls-Royce'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 4,
      bogieSteering: false,
      tirePSI: 205
    },
    hydraulics: {
      system: 'airbus_gby',
      pressurePSI: 3000,
      circuits: ['Green', 'Blue', 'Yellow']
    },
    bleedType: 'pneumatic',
    hasTrimTank: true,
    compositeWeightFraction: '12%',
    primaryAlloy: 'Al-Zn 7075-T76 / Al-Cu 2024',
    notes: 'Features Rolls-Royce 3-spool architecture (N1 fan, N2 IP compressor, N3 HP compressor) providing short rigid rotating shafts that minimize shaft-whirl vibrations and improve thermodynamic efficiency.'
  },
  {
    id: 'a330-900neo',
    name: 'Airbus A330-900neo',
    category: 'airbus',
    icao: 'A339',
    manufacturer: 'Airbus',
    eis: 2018,
    wingspan: 64.0,
    length: 63.7,
    height: 16.8,
    fuselageDiameter: 5.64,
    fuselageType: 'twin_aisle',
    wingSweep: 30.0,
    aspectRatio: 11.2,
    wingletType: 'curved_sharklet',
    flapType: 'fowler_double',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'Rolls-Royce Trent 7000-72',
      count: 2,
      type: 'turbofan_high',
      spools: 3,
      fanDiameter: 2.84,
      bypassRatio: 10.0,
      maxThrustKN: 324.0,
      hasChevrons: false,
      oem: 'Rolls-Royce'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 4,
      bogieSteering: false,
      tirePSI: 210
    },
    hydraulics: {
      system: 'airbus_gby',
      pressurePSI: 3000,
      circuits: ['Green', 'Blue', 'Yellow']
    },
    bleedType: 'pneumatic',
    hasTrimTank: true,
    compositeWeightFraction: '14%',
    primaryAlloy: 'Titanium pylon / CFRP curved Sharklets',
    notes: 'Shares the Trent 7000 core with the A350 Trent XWB. Features full composite curved winglet extensions inspired by shark fins, extending total span to 64.0 meters.'
  },
  {
    id: 'a340-600',
    name: 'Airbus A340-600',
    category: 'airbus',
    icao: 'A346',
    manufacturer: 'Airbus',
    eis: 2002,
    wingspan: 63.5,
    length: 75.4,
    height: 17.3,
    fuselageDiameter: 5.64,
    fuselageType: 'twin_aisle',
    wingSweep: 31.1,
    aspectRatio: 9.3,
    wingletType: 'blended',
    flapType: 'fowler_double',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'Rolls-Royce Trent 556-54',
      count: 4,
      type: 'turbofan_high',
      spools: 3,
      fanDiameter: 2.47,
      bypassRatio: 7.6,
      maxThrustKN: 249.0,
      hasChevrons: false,
      oem: 'Rolls-Royce'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 3,
      wheelsPerTruck: 4,
      bogieSteering: false,
      tirePSI: 210
    },
    hydraulics: {
      system: 'airbus_gby',
      pressurePSI: 3000,
      circuits: ['Green', 'Blue', 'Yellow']
    },
    bleedType: 'pneumatic',
    hasTrimTank: true,
    compositeWeightFraction: '15%',
    primaryAlloy: 'Titanium fuselage keel / Aluminum-Lithium',
    notes: 'Once the longest airliner in the world (75.4 m). Incorporates a center centerline 4-wheel main landing gear between the two wing bogies to distribute its massive 380-tonne MTOW.'
  },
  {
    id: 'a350-900',
    name: 'Airbus A350-900',
    category: 'airbus',
    icao: 'A359',
    manufacturer: 'Airbus',
    eis: 2015,
    wingspan: 64.75,
    length: 66.8,
    height: 17.1,
    fuselageDiameter: 5.96,
    fuselageType: 'widebody_carbon',
    wingSweep: 31.9,
    aspectRatio: 9.5,
    wingletType: 'raked_scimitar',
    flapType: 'fowler_drop_hinge',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'Rolls-Royce Trent XWB-84',
      count: 2,
      type: 'turbofan_high',
      spools: 3,
      fanDiameter: 3.0,
      bypassRatio: 9.6,
      maxThrustKN: 374.5,
      hasChevrons: false,
      oem: 'Rolls-Royce'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 4,
      bogieSteering: false,
      tirePSI: 220
    },
    hydraulics: {
      system: 'airbus_gby',
      pressurePSI: 5000,
      circuits: ['Green', 'Yellow', '2x Electro-Hydro EHA']
    },
    bleedType: 'pneumatic',
    hasTrimTank: true,
    compositeWeightFraction: '53%',
    primaryAlloy: 'Toray T700/T800 CFRP / Titanium Ti-5553',
    notes: '53% carbon-fiber reinforced plastic airframe with 5,000 PSI dual hydraulic architecture backed by Electro-Hydrostatic Actuators (EHA). Features adaptive drop-hinge flaps that optimize camber in flight.'
  },
  {
    id: 'a350-1000',
    name: 'Airbus A350-1000',
    category: 'airbus',
    icao: 'A35K',
    manufacturer: 'Airbus',
    eis: 2018,
    wingspan: 64.75,
    length: 73.8,
    height: 17.1,
    fuselageDiameter: 5.96,
    fuselageType: 'widebody_carbon',
    wingSweep: 31.9,
    aspectRatio: 9.5,
    wingletType: 'raked_scimitar',
    flapType: 'fowler_drop_hinge',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'Rolls-Royce Trent XWB-97',
      count: 2,
      type: 'turbofan_high',
      spools: 3,
      fanDiameter: 3.0,
      bypassRatio: 9.3,
      maxThrustKN: 431.5,
      hasChevrons: false,
      oem: 'Rolls-Royce'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 6,
      bogieSteering: true,
      tirePSI: 225
    },
    hydraulics: {
      system: 'airbus_gby',
      pressurePSI: 5000,
      circuits: ['Green', 'Yellow', '2x Electro-Hydro EHA']
    },
    bleedType: 'pneumatic',
    hasTrimTank: true,
    compositeWeightFraction: '53%',
    primaryAlloy: 'Toray CFRP / High-strength 300M steel gear',
    notes: 'Strengthened with massive 6-wheel main landing gear bogies built by Safran, featuring steerable rear axles to prevent tire scrubbing during tight ramp turns.'
  },
  {
    id: 'a380-800',
    name: 'Airbus A380-800',
    category: 'airbus',
    icao: 'A388',
    manufacturer: 'Airbus',
    eis: 2007,
    wingspan: 79.75,
    length: 72.7,
    height: 24.1,
    fuselageDiameter: 7.14,
    fuselageType: 'double_deck_full',
    wingSweep: 33.5,
    aspectRatio: 7.5,
    wingletType: 'wingtip_fence_giant',
    flapType: 'fowler_double',
    slatType: 'slats_droop_nose',
    engines: {
      model: 'Engine Alliance GP7270 / Rolls-Royce Trent 970',
      count: 4,
      type: 'turbofan_high',
      spools: 3,
      fanDiameter: 2.95,
      bypassRatio: 8.7,
      maxThrustKN: 332.4,
      hasChevrons: false,
      oem: 'Engine Alliance / Rolls-Royce'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 4,
      wheelsPerTruck: 5,
      bogieSteering: true,
      tirePSI: 218
    },
    hydraulics: {
      system: 'airbus_gby',
      pressurePSI: 5000,
      circuits: ['Green', 'Yellow', '2x 2H/2E Electrical Backups']
    },
    bleedType: 'pneumatic',
    hasTrimTank: true,
    compositeWeightFraction: '25%',
    primaryAlloy: 'GLARE (Glass Laminate Aluminum Reinforced Epoxy) / CFRP Center Box',
    notes: 'The world’s only full-length double-deck passenger airliner. Features 20 main landing gear wheels (two 4-wheel wing bogies and two 6-wheel body bogies), 5,000 PSI hydraulics, and GLARE impact-resistant fuselage upper panels.'
  },
  {
    id: 'belugaxl',
    name: 'Airbus BelugaXL (A330-700L)',
    category: 'airbus',
    icao: 'A337',
    manufacturer: 'Airbus',
    eis: 2020,
    wingspan: 60.3,
    length: 63.1,
    height: 18.9,
    fuselageDiameter: 8.8,
    fuselageType: 'outsize_cargo_bubble',
    wingSweep: 30.0,
    aspectRatio: 10.1,
    wingletType: 'blended',
    flapType: 'fowler_double',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'Rolls-Royce Trent 700',
      count: 2,
      type: 'turbofan_high',
      spools: 3,
      fanDiameter: 2.47,
      bypassRatio: 5.0,
      maxThrustKN: 316.0,
      hasChevrons: false,
      oem: 'Rolls-Royce'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 4,
      bogieSteering: false,
      tirePSI: 205
    },
    hydraulics: {
      system: 'airbus_gby',
      pressurePSI: 3000,
      circuits: ['Green', 'Blue', 'Yellow']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '15%',
    primaryAlloy: 'Enlarged upper bubble fuselage / Dropped cockpit',
    notes: 'Giant transport aircraft built to ferry A350 wings and fuselage barrels between OEM factories. The flight deck was lowered by 70 cm below the cargo floor so freight can be loaded straight through the clamshell nose door.'
  },

  // -------------------------------------------------------------
  // 2. BOEING COMMERCIAL
  // -------------------------------------------------------------
  {
    id: 'b707-320b',
    name: 'Boeing 707-320B Intercontinental',
    category: 'boeing',
    icao: 'B703',
    manufacturer: 'Boeing',
    eis: 1962,
    wingspan: 44.42,
    length: 46.61,
    height: 12.85,
    fuselageDiameter: 3.76,
    fuselageType: 'single_aisle',
    wingSweep: 35.0,
    aspectRatio: 7.0,
    wingletType: 'straight',
    flapType: 'fowler_triple',
    slatType: 'krueger_flaps',
    engines: {
      model: 'Pratt & Whitney JT3D-3B Turbofan',
      count: 4,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 1.35,
      bypassRatio: 1.4,
      maxThrustKN: 80.0,
      hasChevrons: false,
      oem: 'Pratt & Whitney'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 4,
      bogieSteering: false,
      tirePSI: 180
    },
    hydraulics: {
      system: 'boeing_lrc',
      pressurePSI: 3000,
      circuits: ['Left', 'Right', 'Standby']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '1%',
    primaryAlloy: 'Al-Cu 2024-T3 / Al-Zn 7075-T6',
    notes: 'The pioneer of jet-age passenger flight. High 35-degree swept wing with pods for 4 JT3D turbofans; used leading-edge Krueger flaps to restore low-speed pitch stability.'
  },
  {
    id: 'b717-200',
    name: 'Boeing 717-200 (MD-95)',
    category: 'boeing',
    icao: 'B712',
    manufacturer: 'Boeing / McDonnell Douglas',
    eis: 1999,
    wingspan: 28.45,
    length: 37.8,
    height: 8.9,
    fuselageDiameter: 3.35,
    fuselageType: 'single_aisle_rear_engine',
    wingSweep: 24.5,
    aspectRatio: 8.7,
    wingletType: 'straight',
    flapType: 'fowler_double',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'Rolls-Royce BR715-A1-30',
      count: 2,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 1.47,
      bypassRatio: 4.5,
      maxThrustKN: 84.5,
      hasChevrons: false,
      oem: 'Rolls-Royce Deutschland'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 2,
      bogieSteering: false,
      tirePSI: 165
    },
    hydraulics: {
      system: 'boeing_lrc',
      pressurePSI: 3000,
      circuits: ['Left', 'Right']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '6%',
    primaryAlloy: 'Al-Zn 7075 fuselage frames',
    notes: 'The final evolution of the Douglas DC-9 line. Tail-mounted Rolls-Royce BR715 engines with Honeywell Pegasus Flight Management System and glass cockpit.'
  },
  {
    id: 'b727-200',
    name: 'Boeing 727-200 Advanced',
    category: 'boeing',
    icao: 'B722',
    manufacturer: 'Boeing',
    eis: 1972,
    wingspan: 32.92,
    length: 46.69,
    height: 10.36,
    fuselageDiameter: 3.76,
    fuselageType: 'trijet_s_duct',
    wingSweep: 32.0,
    aspectRatio: 7.0,
    wingletType: 'straight',
    flapType: 'fowler_triple_slotted',
    slatType: 'krueger_slats',
    engines: {
      model: 'Pratt & Whitney JT8D-17R',
      count: 3,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 1.02,
      bypassRatio: 1.0,
      maxThrustKN: 77.4,
      hasChevrons: false,
      oem: 'Pratt & Whitney'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 2,
      bogieSteering: false,
      tirePSI: 180
    },
    hydraulics: {
      system: 'boeing_lrc',
      pressurePSI: 3000,
      circuits: ['System A', 'System B', 'Standby']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '2%',
    primaryAlloy: 'Al-Cu 2024 / Titanium engine mount keel',
    notes: 'Iconic trijet featuring a central S-duct air scoop feeding engine #2. Equipped with legendary triple-slotted Fowler flaps that enabled heavy operations from short runways like NYC LaGuardia.'
  },
  {
    id: 'b737-800',
    name: 'Boeing 737-800 NG',
    category: 'boeing',
    icao: 'B738',
    manufacturer: 'Boeing',
    eis: 1998,
    wingspan: 35.8,
    length: 39.5,
    height: 12.5,
    fuselageDiameter: 3.76,
    fuselageType: 'single_aisle',
    wingSweep: 25.0,
    aspectRatio: 9.4,
    wingletType: 'blended',
    flapType: 'fowler_double_slotted',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'CFM International CFM56-7B26',
      count: 2,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 1.55,
      bypassRatio: 5.3,
      maxThrustKN: 117.0,
      hasChevrons: false,
      oem: 'CFM International'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 2,
      bogieSteering: false,
      tirePSI: 200
    },
    hydraulics: {
      system: 'boeing_lrc',
      pressurePSI: 3000,
      circuits: ['System A', 'System B', 'Standby']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '7%',
    primaryAlloy: 'Al-Zn 7150 / Al-Cu 2024 skin',
    notes: 'Features the distinctive flattened engine nacelle bottom ("hamster pouch") necessary to maintain 46 cm ground clearance on the low-slung 737 landing gear struts.'
  },
  {
    id: 'b737-max8',
    name: 'Boeing 737 MAX 8',
    category: 'boeing',
    icao: 'B38M',
    manufacturer: 'Boeing',
    eis: 2017,
    wingspan: 35.9,
    length: 39.52,
    height: 12.3,
    fuselageDiameter: 3.76,
    fuselageType: 'single_aisle',
    wingSweep: 25.0,
    aspectRatio: 9.5,
    wingletType: 'split_scimitar',
    flapType: 'fowler_double_slotted',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'CFM International LEAP-1B28',
      count: 2,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 1.76,
      bypassRatio: 9.0,
      maxThrustKN: 124.6,
      hasChevrons: true,
      oem: 'CFM International'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 2,
      bogieSteering: false,
      tirePSI: 205
    },
    hydraulics: {
      system: 'boeing_lrc',
      pressurePSI: 3000,
      circuits: ['System A', 'System B', 'Standby']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '11%',
    primaryAlloy: 'Carbon split-tip scimitars / Inconel 718 combustor',
    notes: 'Fitted with LEAP-1B engines equipped with trailing nacelle chevrons for acoustic mixing, dual Advanced Technology split-tip scimitar winglets, and fly-by-wire spoiler actuators.'
  },
  {
    id: 'b737-max10',
    name: 'Boeing 737 MAX 10',
    category: 'boeing',
    icao: 'B3XM',
    manufacturer: 'Boeing',
    eis: 2024,
    wingspan: 35.9,
    length: 43.8,
    height: 12.3,
    fuselageDiameter: 3.76,
    fuselageType: 'single_aisle',
    wingSweep: 25.0,
    aspectRatio: 9.5,
    wingletType: 'split_scimitar',
    flapType: 'fowler_double_slotted',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'CFM LEAP-1B28',
      count: 2,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 1.76,
      bypassRatio: 9.0,
      maxThrustKN: 130.4,
      hasChevrons: true,
      oem: 'CFM International'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 2,
      bogieSteering: false,
      tirePSI: 215
    },
    hydraulics: {
      system: 'boeing_lrc',
      pressurePSI: 3000,
      circuits: ['System A', 'System B', 'Standby']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '12%',
    primaryAlloy: 'Levered suspension landing gear steel 300M',
    notes: 'Equipped with an ingenious levered telescoping main landing gear: extending the gear by 24 cm during takeoff rotation to prevent tail strikes on the 43.8 m lengthened fuselage.'
  },
  {
    id: 'b747-400',
    name: 'Boeing 747-400 ("Queen of the Skies")',
    category: 'boeing',
    icao: 'B744',
    manufacturer: 'Boeing',
    eis: 1989,
    wingspan: 64.44,
    length: 70.66,
    height: 19.41,
    fuselageDiameter: 6.5,
    fuselageType: 'hump_upper_deck',
    wingSweep: 37.5,
    aspectRatio: 7.7,
    wingletType: 'blended',
    flapType: 'fowler_triple_slotted',
    slatType: 'krueger_slats',
    engines: {
      model: 'General Electric CF6-80C2B1F / PW4056 / RB211-524G',
      count: 4,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 2.36,
      bypassRatio: 5.2,
      maxThrustKN: 276.0,
      hasChevrons: false,
      oem: 'GE Aerospace / Pratt & Whitney'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 4,
      wheelsPerTruck: 4,
      bogieSteering: true,
      tirePSI: 205
    },
    hydraulics: {
      system: 'boeing_lrc',
      pressurePSI: 3000,
      circuits: ['System 1', 'System 2', 'System 3', 'System 4']
    },
    bleedType: 'pneumatic',
    hasTrimTank: true,
    compositeWeightFraction: '8%',
    primaryAlloy: 'Al-Zn 7075-T6 / Al-Li 2090 wing skins',
    notes: 'The legendary "Queen of the Skies" with a forward upper-deck hump. Features a 16-wheel main landing gear configuration (two 4-wheel wing gear and two 4-wheel body gear with body-gear steering).'
  },
  {
    id: 'b747-8i',
    name: 'Boeing 747-8 Intercontinental',
    category: 'boeing',
    icao: 'B748',
    manufacturer: 'Boeing',
    eis: 2012,
    wingspan: 68.4,
    length: 76.3,
    height: 19.4,
    fuselageDiameter: 6.5,
    fuselageType: 'hump_upper_deck',
    wingSweep: 37.5,
    aspectRatio: 8.5,
    wingletType: 'raked',
    flapType: 'fowler_double_slotted',
    slatType: 'slats_variable_camber',
    engines: {
      model: 'General Electric GEnx-2B67',
      count: 4,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 2.67,
      bypassRatio: 8.0,
      maxThrustKN: 296.0,
      hasChevrons: true,
      oem: 'GE Aerospace'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 4,
      wheelsPerTruck: 4,
      bogieSteering: true,
      tirePSI: 218
    },
    hydraulics: {
      system: 'boeing_lrc',
      pressurePSI: 3000,
      circuits: ['System 1', 'System 2', 'System 3', 'System 4']
    },
    bleedType: 'pneumatic',
    hasTrimTank: true,
    compositeWeightFraction: '16%',
    primaryAlloy: 'Toray CFRP nacelle chevrons / Al-Li 2060 wing skins',
    notes: 'The longest 747 ever built. Features GEnx engines with serrated sawtooth acoustic chevrons, raked wingtips instead of winglets, and fly-by-wire outboard aileron control.'
  },
  {
    id: 'b757-200',
    name: 'Boeing 757-200',
    category: 'boeing',
    icao: 'B752',
    manufacturer: 'Boeing',
    eis: 1983,
    wingspan: 38.05,
    length: 47.32,
    height: 13.56,
    fuselageDiameter: 3.76,
    fuselageType: 'single_aisle_tall',
    wingSweep: 25.0,
    aspectRatio: 7.9,
    wingletType: 'blended',
    flapType: 'fowler_double_slotted',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'Rolls-Royce RB211-535E4B / PW2037',
      count: 2,
      type: 'turbofan_high',
      spools: 3,
      fanDiameter: 1.88,
      bypassRatio: 4.3,
      maxThrustKN: 193.5,
      hasChevrons: false,
      oem: 'Rolls-Royce'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 4,
      bogieSteering: false,
      tirePSI: 185
    },
    hydraulics: {
      system: 'boeing_lrc',
      pressurePSI: 3000,
      circuits: ['Left', 'Right', 'Center']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '5%',
    primaryAlloy: 'Titanium engine mounts / Al-Zn 7075-T76',
    notes: 'Known as the "flying hot rod" due to its immense excess power with Rolls-Royce RB211 engines. Its 4-wheel main gear trucks give it distinctive high-altitude alpine airport capabilities (e.g. Vail/Eagle, Bogota).'
  },
  {
    id: 'b767-300er',
    name: 'Boeing 767-300ER',
    category: 'boeing',
    icao: 'B763',
    manufacturer: 'Boeing',
    eis: 1988,
    wingspan: 47.57,
    length: 54.94,
    height: 15.85,
    fuselageDiameter: 5.03,
    fuselageType: 'twin_aisle_semi_wide',
    wingSweep: 31.5,
    aspectRatio: 7.9,
    wingletType: 'blended',
    flapType: 'fowler_double_slotted',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'General Electric CF6-80C2B6F / PW4060',
      count: 2,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 2.36,
      bypassRatio: 5.1,
      maxThrustKN: 267.0,
      hasChevrons: false,
      oem: 'GE Aerospace'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 4,
      bogieSteering: false,
      tirePSI: 195
    },
    hydraulics: {
      system: 'boeing_lrc',
      pressurePSI: 3000,
      circuits: ['Left', 'Right', 'Center']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '6%',
    primaryAlloy: 'Al-Zn 7150-T651 upper wing skins',
    notes: 'Pioneered ETOPS 180 (Extended Twin-Engine Operations) trans-oceanic flights across the North Atlantic, fundamentally replacing four-engine airliners on transatlantic routes.'
  },
  {
    id: 'b777-200lr',
    name: 'Boeing 777-200LR Worldliner',
    category: 'boeing',
    icao: 'B77L',
    manufacturer: 'Boeing',
    eis: 2006,
    wingspan: 64.8,
    length: 63.73,
    height: 18.6,
    fuselageDiameter: 6.2,
    fuselageType: 'widebody_heavy',
    wingSweep: 31.6,
    aspectRatio: 9.0,
    wingletType: 'raked',
    flapType: 'fowler_double_slotted',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'General Electric GE90-110B1L',
      count: 2,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 3.25,
      bypassRatio: 8.7,
      maxThrustKN: 492.0,
      hasChevrons: false,
      oem: 'GE Aerospace'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 6,
      bogieSteering: true,
      tirePSI: 220
    },
    hydraulics: {
      system: 'boeing_lrc',
      pressurePSI: 3000,
      circuits: ['Left', 'Right', 'Center']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '10%',
    primaryAlloy: 'Titanium Ti-10V-2Fe-3Al landing gear beam',
    notes: 'Set the world record for longest non-stop commercial airliner flight: 21,602 km (11,664 nmi) from Hong Kong eastward to London Heathrow in 22 hours 42 minutes.'
  },
  {
    id: 'b777-300er',
    name: 'Boeing 777-300ER',
    category: 'boeing',
    icao: 'B77W',
    manufacturer: 'Boeing',
    eis: 2004,
    wingspan: 64.8,
    length: 73.86,
    height: 18.5,
    fuselageDiameter: 6.2,
    fuselageType: 'widebody_heavy',
    wingSweep: 31.6,
    aspectRatio: 9.0,
    wingletType: 'raked',
    flapType: 'fowler_double_slotted',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'General Electric GE90-115B',
      count: 2,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 3.25,
      bypassRatio: 9.0,
      maxThrustKN: 513.0,
      hasChevrons: false,
      oem: 'GE Aerospace'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 6,
      bogieSteering: true,
      tirePSI: 225
    },
    hydraulics: {
      system: 'boeing_lrc',
      pressurePSI: 3000,
      circuits: ['Left', 'Right', 'Center']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '11%',
    primaryAlloy: 'Forged 300M steel gear / Composite GE90 curved blades',
    notes: 'Powered by the mighty GE90-115B, certified at a Guinness World Record 127,900 lbf (569 kN) test thrust. Features massive 6-wheel main bogies with hydraulically steered aft axles and the iconic aerodynamic blade-shaped tail cone.'
  },
  {
    id: 'b777-9',
    name: 'Boeing 777-9 / 777X',
    category: 'boeing',
    icao: 'B779',
    manufacturer: 'Boeing',
    eis: 2025,
    wingspan: 71.75, // folded: 64.85
    length: 76.7,
    height: 19.7,
    fuselageDiameter: 6.2,
    fuselageType: 'widebody_heavy',
    wingSweep: 32.5,
    aspectRatio: 10.0,
    wingletType: 'folding_777x',
    flapType: 'fowler_double_slotted',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'General Electric GE9X-105B1A',
      count: 2,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 3.40,
      bypassRatio: 10.0,
      maxThrustKN: 470.0,
      hasChevrons: false,
      oem: 'GE Aerospace'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 6,
      bogieSteering: true,
      tirePSI: 230
    },
    hydraulics: {
      system: 'boeing_lrc',
      pressurePSI: 3000,
      circuits: ['Left', 'Right', 'Center']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '30%',
    primaryAlloy: 'Carbon-Fiber Reinforced Polymer (CFRP) 4th gen wing',
    notes: 'Features 3.5-meter folding wingtips engineered by Liebherr: hydraulically latched in flight, folding vertically upon runway exit to fit standard ICAO Code E gates (65 m).'
  },
  {
    id: 'b787-8',
    name: 'Boeing 787-8 Dreamliner',
    category: 'boeing',
    icao: 'B788',
    manufacturer: 'Boeing',
    eis: 2011,
    wingspan: 60.12,
    length: 56.72,
    height: 16.92,
    fuselageDiameter: 5.77,
    fuselageType: 'barrel_composite',
    wingSweep: 32.2,
    aspectRatio: 9.6,
    wingletType: 'raked',
    flapType: 'fowler_single_slotted_camber',
    slatType: 'slats_electric',
    engines: {
      model: 'General Electric GEnx-1B64 / Rolls-Royce Trent 1000',
      count: 2,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 2.82,
      bypassRatio: 9.6,
      maxThrustKN: 298.0,
      hasChevrons: true,
      oem: 'GE Aerospace / Rolls-Royce'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 4,
      bogieSteering: false,
      tirePSI: 220
    },
    hydraulics: {
      system: 'boeing_lrc',
      pressurePSI: 5000,
      circuits: ['Left', 'Right', 'Center (5000 PSI)']
    },
    bleedType: 'electric_bleedless',
    hasTrimTank: false,
    compositeWeightFraction: '50%',
    primaryAlloy: 'Toray T800S Carbon fiber one-piece barrels',
    notes: 'Revolutionary "more-electric aircraft" architecture: completely eliminates engine pneumatic bleed air pre-coolers. Uses 4x 235 VAC electric motor-driven compressors for cabin air, saving 3% engine SFC.'
  },
  {
    id: 'b787-9',
    name: 'Boeing 787-9 Dreamliner',
    category: 'boeing',
    icao: 'B789',
    manufacturer: 'Boeing',
    eis: 2014,
    wingspan: 60.12,
    length: 62.81,
    height: 17.02,
    fuselageDiameter: 5.77,
    fuselageType: 'barrel_composite',
    wingSweep: 32.2,
    aspectRatio: 9.6,
    wingletType: 'raked',
    flapType: 'fowler_single_slotted_camber',
    slatType: 'slats_electric',
    engines: {
      model: 'General Electric GEnx-1B70 / Rolls-Royce Trent 1000',
      count: 2,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 2.82,
      bypassRatio: 9.0,
      maxThrustKN: 320.0,
      hasChevrons: true,
      oem: 'GE Aerospace'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 4,
      bogieSteering: false,
      tirePSI: 220
    },
    hydraulics: {
      system: 'boeing_lrc',
      pressurePSI: 5000,
      circuits: ['Left', 'Right', 'Center (5000 PSI)']
    },
    bleedType: 'electric_bleedless',
    hasTrimTank: false,
    compositeWeightFraction: '50%',
    primaryAlloy: 'CFRP wing box with 7.9m high aero flex',
    notes: 'Its hyper-flexible carbon fiber wings flex vertically up to 7.9 meters during flight without permanent structural deformation, smoothing out turbulence.'
  },
  {
    id: 'b787-10',
    name: 'Boeing 787-10 Dreamliner',
    category: 'boeing',
    icao: 'B78X',
    manufacturer: 'Boeing',
    eis: 2018,
    wingspan: 60.12,
    length: 68.28,
    height: 17.02,
    fuselageDiameter: 5.77,
    fuselageType: 'barrel_composite',
    wingSweep: 32.2,
    aspectRatio: 9.6,
    wingletType: 'raked',
    flapType: 'fowler_single_slotted_camber',
    slatType: 'slats_electric',
    engines: {
      model: 'General Electric GEnx-1B76',
      count: 2,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 2.82,
      bypassRatio: 8.8,
      maxThrustKN: 340.0,
      hasChevrons: true,
      oem: 'GE Aerospace'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 4,
      bogieSteering: false,
      tirePSI: 225
    },
    hydraulics: {
      system: 'boeing_lrc',
      pressurePSI: 5000,
      circuits: ['Left', 'Right', 'Center (5000 PSI)']
    },
    bleedType: 'electric_bleedless',
    hasTrimTank: false,
    compositeWeightFraction: '50%',
    primaryAlloy: 'Carbon-fiber fuselage barrel extension plugs',
    notes: 'The longest Dreamliner variant. Employs 5,000 PSI hydraulics and an electro-hydraulic landing gear steering system with carbon brake heat monitoring.'
  },

  // -------------------------------------------------------------
  // 3. REGIONAL JETS & TURBOPROPS
  // -------------------------------------------------------------
  {
    id: 'erj-145',
    name: 'Embraer ERJ-145',
    category: 'regional',
    icao: 'E145',
    manufacturer: 'Embraer',
    eis: 1996,
    wingspan: 20.04,
    length: 29.87,
    height: 6.76,
    fuselageDiameter: 2.28,
    fuselageType: 'single_aisle_rear_engine',
    wingSweep: 22.0,
    aspectRatio: 7.9,
    wingletType: 'straight',
    flapType: 'fowler_double',
    slatType: 'none',
    engines: {
      model: 'Rolls-Royce AE 3007A1/3',
      count: 2,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 0.98,
      bypassRatio: 5.0,
      maxThrustKN: 33.7,
      hasChevrons: false,
      oem: 'Rolls-Royce North America'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 2,
      bogieSteering: false,
      tirePSI: 150
    },
    hydraulics: {
      system: 'military_dual',
      pressurePSI: 3000,
      circuits: ['System 1', 'System 2']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '4%',
    primaryAlloy: 'Al-Cu 2024 / Al-Zn 7075',
    notes: 'Pioneered 50-seat regional jet economics. Rear fuselage engine mounts keep wings clean and drag minimal, with Honeywell Primus 1000 avionics.'
  },
  {
    id: 'e175',
    name: 'Embraer E175',
    category: 'regional',
    icao: 'E175',
    manufacturer: 'Embraer',
    eis: 2005,
    wingspan: 28.72,
    length: 31.68,
    height: 9.73,
    fuselageDiameter: 3.01,
    fuselageType: 'double_bubble',
    wingSweep: 23.0,
    aspectRatio: 8.4,
    wingletType: 'blended',
    flapType: 'fowler_double',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'GE CF34-8E5',
      count: 2,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 1.35,
      bypassRatio: 5.0,
      maxThrustKN: 62.3,
      hasChevrons: false,
      oem: 'GE Aerospace'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 2,
      bogieSteering: false,
      tirePSI: 170
    },
    hydraulics: {
      system: 'boeing_lrc',
      pressurePSI: 3000,
      circuits: ['System 1', 'System 2', 'System 3']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '8%',
    primaryAlloy: 'Double-bubble aluminum cross section',
    notes: 'The backbone of US regional airline operations under scope clauses. Features a unique "double-bubble" fuselage cross section giving 2+2 seating with stand-up aisle height.'
  },
  {
    id: 'e190-e2',
    name: 'Embraer E190-E2',
    category: 'regional',
    icao: 'E290',
    manufacturer: 'Embraer',
    eis: 2018,
    wingspan: 33.72,
    length: 36.25,
    height: 10.95,
    fuselageDiameter: 3.01,
    fuselageType: 'double_bubble',
    wingSweep: 23.0,
    aspectRatio: 12.0,
    wingletType: 'raked',
    flapType: 'fowler_double',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'Pratt & Whitney PW1900G Geared Turbofan',
      count: 2,
      type: 'turbofan_geared',
      spools: 2,
      fanDiameter: 1.85,
      bypassRatio: 12.0,
      maxThrustKN: 102.3,
      hasChevrons: false,
      oem: 'Pratt & Whitney'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 2,
      bogieSteering: false,
      tirePSI: 185
    },
    hydraulics: {
      system: 'boeing_lrc',
      pressurePSI: 3000,
      circuits: ['System 1', 'System 2', 'System 3']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '15%',
    primaryAlloy: 'High-aspect ratio Al-Li wing / Closed-loop FBW',
    notes: 'Features a high-aspect-ratio (12.0) swept wing with raked wingtips without vertical winglets, tuned specifically for low parasitic drag at Mach 0.78.'
  },
  {
    id: 'e195-e2',
    name: 'Embraer E195-E2 ("Profit Hunter")',
    category: 'regional',
    icao: 'E295',
    manufacturer: 'Embraer',
    eis: 2019,
    wingspan: 35.12,
    length: 41.5,
    height: 10.9,
    fuselageDiameter: 3.01,
    fuselageType: 'double_bubble',
    wingSweep: 23.0,
    aspectRatio: 12.1,
    wingletType: 'raked',
    flapType: 'fowler_double',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'Pratt & Whitney PW1900G Geared Turbofan',
      count: 2,
      type: 'turbofan_geared',
      spools: 2,
      fanDiameter: 1.85,
      bypassRatio: 12.0,
      maxThrustKN: 102.3,
      hasChevrons: false,
      oem: 'Pratt & Whitney'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 2,
      bogieSteering: false,
      tirePSI: 190
    },
    hydraulics: {
      system: 'boeing_lrc',
      pressurePSI: 3000,
      circuits: ['System 1', 'System 2', 'System 3']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '16%',
    primaryAlloy: 'Smart trailing-edge flaps / 4th-gen Fly-By-Wire',
    notes: 'Nicknamed the "Profit Hunter" for its 25% lower fuel burn per seat than previous generations, powered by ultra-high bypass GTF engines.'
  },
  {
    id: 'crj-900',
    name: 'Bombardier CRJ-900',
    category: 'regional',
    icao: 'CRJ9',
    manufacturer: 'Bombardier / MHI RJ',
    eis: 2003,
    wingspan: 24.85,
    length: 36.2,
    height: 7.51,
    fuselageDiameter: 2.69,
    fuselageType: 'single_aisle_rear_engine',
    wingSweep: 24.0,
    aspectRatio: 8.6,
    wingletType: 'blended',
    flapType: 'fowler_double',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'GE CF34-8C5',
      count: 2,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 1.35,
      bypassRatio: 5.0,
      maxThrustKN: 64.5,
      hasChevrons: false,
      oem: 'GE Aerospace'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 2,
      bogieSteering: false,
      tirePSI: 175
    },
    hydraulics: {
      system: 'boeing_lrc',
      pressurePSI: 3000,
      circuits: ['System 1', 'System 2', 'System 3']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '6%',
    primaryAlloy: 'Al-Zn 7075 wing spars / T-tail',
    notes: 'Derived from the Canadair Challenger executive jet. Features rear-mounted GE CF34 engines, low-slung cabin, and high-mounted T-tail empennage.'
  },
  {
    id: 'dash8-q400',
    name: 'De Havilland Dash 8 Q400',
    category: 'regional',
    icao: 'DH8D',
    manufacturer: 'De Havilland Canada / Bombardier',
    eis: 2000,
    wingspan: 28.4,
    length: 32.8,
    height: 8.3,
    fuselageDiameter: 2.69,
    fuselageType: 'turboprop_high_wing',
    wingSweep: 0.0,
    aspectRatio: 12.0,
    wingletType: 'straight',
    flapType: 'fowler_double',
    slatType: 'none',
    engines: {
      model: 'Pratt & Whitney Canada PW150A Turboprop',
      count: 2,
      type: 'turboprop',
      spools: 2,
      fanDiameter: 4.11, // prop diameter
      bypassRatio: 0.0,
      maxThrustKN: 3782, // SHP
      hasChevrons: false,
      oem: 'Pratt & Whitney Canada / Dowty'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 2,
      bogieSteering: false,
      tirePSI: 120
    },
    hydraulics: {
      system: 'military_dual',
      pressurePSI: 3000,
      circuits: ['System 1', 'System 2']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '10%',
    primaryAlloy: 'Dowty 6-blade composite scimitar propellers',
    notes: 'Equipped with Active Noise and Vibration Suppression (ANVS) system using tuned computer-driven acoustic absorbers throughout the cabin, making it the "Quiet" (Q) turboprop cruising at 360 knots.'
  },
  {
    id: 'atr42-600',
    name: 'ATR 42-600',
    category: 'regional',
    icao: 'AT46',
    manufacturer: 'Avions de Transport Régional (ATR)',
    eis: 2012,
    wingspan: 24.57,
    length: 22.67,
    height: 7.59,
    fuselageDiameter: 2.77,
    fuselageType: 'turboprop_high_wing',
    wingSweep: 0.0,
    aspectRatio: 11.1,
    wingletType: 'straight',
    flapType: 'fowler_double',
    slatType: 'none',
    engines: {
      model: 'Pratt & Whitney Canada PW127M',
      count: 2,
      type: 'turboprop',
      spools: 2,
      fanDiameter: 3.93,
      bypassRatio: 0.0,
      maxThrustKN: 2160, // SHP
      hasChevrons: false,
      oem: 'P&WC / Ratier-Figeac'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 2,
      bogieSteering: false,
      tirePSI: 110
    },
    hydraulics: {
      system: 'military_dual',
      pressurePSI: 3000,
      circuits: ['Blue', 'Green']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '12%',
    primaryAlloy: 'Composite wing center section / PW127M engine',
    notes: 'Features a unique "Hotel Mode" on engine #2: a propeller brake locks the right propeller while the turbine core continues running on the ground, serving as an Auxiliary Power Unit (APU) for electrical and air-conditioning power.'
  },
  {
    id: 'atr72-600',
    name: 'ATR 72-600',
    category: 'regional',
    icao: 'AT76',
    manufacturer: 'Avions de Transport Régional (ATR)',
    eis: 2011,
    wingspan: 27.05,
    length: 27.17,
    height: 7.65,
    fuselageDiameter: 2.77,
    fuselageType: 'turboprop_high_wing',
    wingSweep: 0.0,
    aspectRatio: 12.0,
    wingletType: 'straight',
    flapType: 'fowler_double',
    slatType: 'none',
    engines: {
      model: 'Pratt & Whitney Canada PW127XT-M',
      count: 2,
      type: 'turboprop',
      spools: 2,
      fanDiameter: 3.93,
      bypassRatio: 0.0,
      maxThrustKN: 2750, // SHP
      hasChevrons: false,
      oem: 'P&WC / Hamilton Sundstrand'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 2,
      bogieSteering: false,
      tirePSI: 115
    },
    hydraulics: {
      system: 'military_dual',
      pressurePSI: 3000,
      circuits: ['Blue', 'Green']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '14%',
    primaryAlloy: 'Carbon-fiber wing panels and fairings',
    notes: 'The world’s best-selling regional turboprop. High-wing design with fuselage sponson-mounted landing gear enables safe short unpaved runway landings.'
  },

  // -------------------------------------------------------------
  // 4. GLOBAL & EASTERN MANUFACTURERS
  // -------------------------------------------------------------
  {
    id: 'c909',
    name: 'COMAC C909 (ARJ21-700)',
    category: 'eastern',
    icao: 'AJ27',
    manufacturer: 'COMAC',
    eis: 2016,
    wingspan: 27.28,
    length: 33.46,
    height: 8.44,
    fuselageDiameter: 3.14,
    fuselageType: 'single_aisle_rear_engine',
    wingSweep: 25.0,
    aspectRatio: 9.0,
    wingletType: 'blended',
    flapType: 'fowler_double',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'General Electric CF34-10A',
      count: 2,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 1.35,
      bypassRatio: 5.0,
      maxThrustKN: 78.5,
      hasChevrons: false,
      oem: 'GE Aerospace'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 2,
      bogieSteering: false,
      tirePSI: 170
    },
    hydraulics: {
      system: 'boeing_lrc',
      pressurePSI: 3000,
      circuits: ['System 1', 'System 2', 'System 3']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '5%',
    primaryAlloy: 'Al-Li 2195 / Antonov-designed supercritical wing',
    notes: 'Commercial aircraft designed for high-altitude Chinese interior routes with an Antonov-designed 25-degree supercritical wing and Rockwell Collins Pro Line 21 avionics.'
  },
  {
    id: 'c919',
    name: 'COMAC C919',
    category: 'eastern',
    icao: 'C919',
    manufacturer: 'COMAC',
    eis: 2023,
    wingspan: 35.8,
    length: 38.9,
    height: 11.95,
    fuselageDiameter: 3.96,
    fuselageType: 'single_aisle',
    wingSweep: 25.0,
    aspectRatio: 9.8,
    wingletType: 'blended',
    flapType: 'fowler_double',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'CFM International LEAP-1C',
      count: 2,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 1.98,
      bypassRatio: 11.0,
      maxThrustKN: 129.98,
      hasChevrons: false,
      oem: 'CFM International'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 2,
      bogieSteering: false,
      tirePSI: 195
    },
    hydraulics: {
      system: 'boeing_lrc',
      pressurePSI: 3000,
      circuits: ['Green', 'Blue', 'Yellow']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '12%',
    primaryAlloy: 'Third-gen Al-Li alloy fuselage / Toray T800 CFRP empennage',
    notes: 'China’s trunk mainline single-aisle jet. Features LEAP-1C with unique integrated O-Duct thrust reverser nacelle engineered by Nexcelle (Safran/GE).'
  },
  {
    id: 'c929',
    name: 'COMAC C929 Widebody',
    category: 'eastern',
    icao: 'C929',
    manufacturer: 'COMAC',
    eis: 2029,
    wingspan: 63.9,
    length: 63.8,
    height: 17.4,
    fuselageDiameter: 5.92,
    fuselageType: 'widebody_carbon',
    wingSweep: 31.0,
    aspectRatio: 9.5,
    wingletType: 'raked_scimitar',
    flapType: 'fowler_drop_hinge',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'CJ-2000 / Rolls-Royce Trent variant',
      count: 2,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 3.0,
      bypassRatio: 10.0,
      maxThrustKN: 350.0,
      hasChevrons: false,
      oem: 'AECC Commercial Aircraft Engine'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 4,
      bogieSteering: false,
      tirePSI: 220
    },
    hydraulics: {
      system: 'boeing_lrc',
      pressurePSI: 5000,
      circuits: ['System 1', 'System 2', 'System 3']
    },
    bleedType: 'pneumatic',
    hasTrimTank: true,
    compositeWeightFraction: '51%',
    primaryAlloy: 'Carbon-fiber composite fuselage barrels and wing box',
    notes: 'China’s upcoming 280-seat long-range widebody digital twin targeting 51% composite structure and 5,000 PSI high-pressure hydraulics.'
  },
  {
    id: 'an-124',
    name: 'Antonov An-124 Ruslan',
    category: 'eastern',
    icao: 'A124',
    manufacturer: 'Antonov',
    eis: 1986,
    wingspan: 73.3,
    length: 69.1,
    height: 20.8,
    fuselageDiameter: 6.8,
    fuselageType: 'outsize_military_highwing',
    wingSweep: 28.0,
    aspectRatio: 8.6,
    wingletType: 'straight',
    flapType: 'fowler_double',
    slatType: 'slats_full_span',
    engines: {
      model: 'Ivchenko-Progress D-18T Series 3',
      count: 4,
      type: 'turbofan_high',
      spools: 3,
      fanDiameter: 2.33,
      bypassRatio: 5.7,
      maxThrustKN: 229.0,
      hasChevrons: false,
      oem: 'Motor Sich / Ivchenko-Progress'
    },
    gear: {
      noseWheels: 4,
      mainTruckCount: 5, // 5 pairs per side = 20 main wheels! + 4 nose = 24 wheels
      wheelsPerTruck: 4,
      bogieSteering: true,
      tirePSI: 140
    },
    hydraulics: {
      system: 'military_dual',
      pressurePSI: 3000,
      circuits: ['System 1', 'System 2', 'System 3', 'System 4']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '5%',
    primaryAlloy: 'Titanium cargo ramp sill / 150-tonne payload steel trusses',
    notes: 'Heavy strategic airlifter with a 24-wheel landing gear system capable of "kneeling" forward to lower its upward-hinged nose visor ramp for roll-on/roll-off cargo.'
  },
  {
    id: 'an-225',
    name: 'Antonov An-225 Mriya ("The Dream")',
    category: 'eastern',
    icao: 'A225',
    manufacturer: 'Antonov',
    eis: 1988,
    wingspan: 88.4,
    length: 84.0,
    height: 18.1,
    fuselageDiameter: 6.8,
    fuselageType: 'outsize_super_heavy',
    wingSweep: 28.0,
    aspectRatio: 8.6,
    wingletType: 'straight',
    flapType: 'fowler_double',
    slatType: 'slats_full_span',
    engines: {
      model: 'Ivchenko-Progress D-18T',
      count: 6,
      type: 'turbofan_high',
      spools: 3,
      fanDiameter: 2.33,
      bypassRatio: 5.7,
      maxThrustKN: 229.0,
      hasChevrons: false,
      oem: 'Motor Sich / Ivchenko-Progress'
    },
    gear: {
      noseWheels: 4,
      mainTruckCount: 7, // 7 pairs per side = 28 main wheels + 4 nose = 32 wheels total!
      wheelsPerTruck: 4,
      bogieSteering: true,
      tirePSI: 145
    },
    hydraulics: {
      system: 'military_dual',
      pressurePSI: 3000,
      circuits: ['System 1', 'System 2', 'System 3', 'System 4']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '6%',
    primaryAlloy: 'Titanium wing center section / Twin H-tail vertical fins',
    notes: 'The heaviest aircraft ever built (640-tonne MTOW). Featured 6 D-18T turbofans, an 88.4-meter wingspan, a 32-wheel landing gear system with 16 steerable axles, and a twin H-tail to clear the aerodynamic wake of the Buran space shuttle.'
  },
  {
    id: 'il-96-400',
    name: 'Ilyushin Il-96-400M',
    category: 'eastern',
    icao: 'IL96',
    manufacturer: 'Ilyushin / UAC',
    eis: 1993,
    wingspan: 60.11,
    length: 63.94,
    height: 15.72,
    fuselageDiameter: 6.08,
    fuselageType: 'twin_aisle',
    wingSweep: 30.0,
    aspectRatio: 9.3,
    wingletType: 'wingtip_fence',
    flapType: 'fowler_double',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'Aviadvigatel PS-90A1',
      count: 4,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 1.90,
      bypassRatio: 4.5,
      maxThrustKN: 171.0,
      hasChevrons: false,
      oem: 'Perm Engine Company'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 3,
      wheelsPerTruck: 4,
      bogieSteering: false,
      tirePSI: 200
    },
    hydraulics: {
      system: 'military_dual',
      pressurePSI: 3000,
      circuits: ['System 1', 'System 2', 'System 3', 'System 4']
    },
    bleedType: 'pneumatic',
    hasTrimTank: true,
    compositeWeightFraction: '10%',
    primaryAlloy: 'Al-Li fuselage skin / Centerline 4-wheel gear',
    notes: 'Russia’s flagship four-engine long-haul widebody (presidential aircraft). Features 4 separate independent hydraulic circuits and a third centerline 4-wheel main landing gear.'
  },
  {
    id: 'tu-154m',
    name: 'Tupolev Tu-154M ("Careless")',
    category: 'eastern',
    icao: 'T154',
    manufacturer: 'Tupolev',
    eis: 1984,
    wingspan: 37.55,
    length: 47.9,
    height: 11.4,
    fuselageDiameter: 3.8,
    fuselageType: 'trijet_s_duct',
    wingSweep: 35.0,
    aspectRatio: 7.0,
    wingletType: 'straight',
    flapType: 'fowler_triple_slotted',
    slatType: 'slats_full_span',
    engines: {
      model: 'Soloviev D-30KU-154-II',
      count: 3,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 1.46,
      bypassRatio: 2.4,
      maxThrustKN: 104.0,
      hasChevrons: false,
      oem: 'NPO Saturn'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 6,
      bogieSteering: false,
      tirePSI: 140
    },
    hydraulics: {
      system: 'military_dual',
      pressurePSI: 3000,
      circuits: ['System 1', 'System 2', 'System 3']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '2%',
    primaryAlloy: 'High-toughness Soviet steel and aluminum / T-tail',
    notes: 'A high-speed trijet cruising at Mach 0.86 with an aggressive 35° swept wing. Famous for its 6-wheel main gear trucks that retract backward into massive wing aerodynamic pods.'
  },
  {
    id: 'ssj-100',
    name: 'Sukhoi Superjet 100',
    category: 'eastern',
    icao: 'SU95',
    manufacturer: 'Sukhoi / UAC',
    eis: 2011,
    wingspan: 27.8,
    length: 29.94,
    height: 10.28,
    fuselageDiameter: 3.24,
    fuselageType: 'single_aisle',
    wingSweep: 25.0,
    aspectRatio: 9.0,
    wingletType: 'saberlets',
    flapType: 'fowler_double',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'PowerJet SaM146 (Safran/Saturn) / Aviadvigatel PD-8',
      count: 2,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 1.22,
      bypassRatio: 4.4,
      maxThrustKN: 76.8,
      hasChevrons: false,
      oem: 'PowerJet / NPO Saturn'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 2,
      bogieSteering: false,
      tirePSI: 165
    },
    hydraulics: {
      system: 'military_dual',
      pressurePSI: 3000,
      circuits: ['System 1', 'System 2']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '12%',
    primaryAlloy: 'Al-Li fuselage skin / Saberlet carbon wingtips',
    notes: 'Developed in partnership with Alenia and Boeing. Features full Fly-By-Wire control with side-stick controls and Thales glass cockpit avionics.'
  },
  {
    id: 'mc-21',
    name: 'Yakovlev MC-21-300',
    category: 'eastern',
    icao: 'MC23',
    manufacturer: 'Yakovlev / Irkut / UAC',
    eis: 2024,
    wingspan: 35.9,
    length: 42.2,
    height: 11.5,
    fuselageDiameter: 4.06,
    fuselageType: 'single_aisle',
    wingSweep: 26.5,
    aspectRatio: 11.5,
    wingletType: 'raked',
    flapType: 'fowler_double',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'Aviadvigatel PD-14',
      count: 2,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 1.90,
      bypassRatio: 8.5,
      maxThrustKN: 137.3,
      hasChevrons: false,
      oem: 'United Engine Corporation'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 2,
      bogieSteering: false,
      tirePSI: 190
    },
    hydraulics: {
      system: 'boeing_lrc',
      pressurePSI: 3000,
      circuits: ['System 1', 'System 2', 'System 3']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '35%',
    primaryAlloy: 'Vacuum-infused carbon fiber "black wing"',
    notes: 'Pioneered non-autoclave vacuum infusion resin transfer molding for its carbon-fiber "black wing", boasting the widest single-aisle fuselage cross section (4.06 m).'
  },

  // -------------------------------------------------------------
  // 5. SUPERSONIC & HISTORIC CLASSICS
  // -------------------------------------------------------------
  {
    id: 'concorde',
    name: 'Aérospatiale/BAC Concorde',
    category: 'supersonic_classic',
    icao: 'CONC',
    manufacturer: 'Aérospatiale / BAC',
    eis: 1976,
    wingspan: 25.6,
    length: 61.66,
    height: 12.2,
    fuselageDiameter: 2.88,
    fuselageType: 'supersonic_slender',
    wingSweep: 55.0,
    aspectRatio: 1.7,
    wingletType: 'ogival_delta',
    flapType: 'elevons',
    slatType: 'none',
    hasDroopNose: true,
    engines: {
      model: 'Rolls-Royce/Snecma Olympus 593 Mk 610 with Afterburner',
      count: 4,
      type: 'afterburning_turbojet',
      spools: 2,
      fanDiameter: 1.21,
      bypassRatio: 0.0,
      maxThrustKN: 169.2, // reheat
      hasChevrons: false,
      oem: 'Rolls-Royce / Snecma'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 4,
      bogieSteering: false,
      tirePSI: 232
    },
    hydraulics: {
      system: 'airbus_gby',
      pressurePSI: 4000,
      circuits: ['Green', 'Blue', 'Yellow']
    },
    bleedType: 'pneumatic',
    hasTrimTank: true,
    compositeWeightFraction: '1%',
    primaryAlloy: 'Hiduminium RR58 (AU2GN) high-temp aluminum alloy',
    notes: 'Cruised at Mach 2.04 at 60,000 ft. Featured a hydraulically actuated 0°/5°/12.5° droop nose visor for runway visibility, variable-geometry intake ramps, and an aft fuel trim tank pumping metric tons of fuel rearward during transonic acceleration to balance aerodynamic center-of-lift shifts.'
  },
  {
    id: 'tu-144',
    name: 'Tupolev Tu-144D ("Charger")',
    category: 'supersonic_classic',
    icao: 'T144',
    manufacturer: 'Tupolev',
    eis: 1977,
    wingspan: 28.8,
    length: 65.7,
    height: 12.5,
    fuselageDiameter: 3.0,
    fuselageType: 'supersonic_slender',
    wingSweep: 58.0,
    aspectRatio: 1.8,
    wingletType: 'ogival_delta',
    flapType: 'elevons',
    slatType: 'none',
    hasDroopNose: true,
    canards: true,
    engines: {
      model: 'Kolesov RD-36-51A Turbojet',
      count: 4,
      type: 'afterburning_turbojet',
      spools: 2,
      fanDiameter: 1.30,
      bypassRatio: 0.0,
      maxThrustKN: 196.0,
      hasChevrons: false,
      oem: 'Rybinsk Motors'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 8,
      bogieSteering: false,
      tirePSI: 220
    },
    hydraulics: {
      system: 'military_dual',
      pressurePSI: 4000,
      circuits: ['System 1', 'System 2', 'System 3', 'System 4']
    },
    bleedType: 'pneumatic',
    hasTrimTank: true,
    compositeWeightFraction: '1%',
    primaryAlloy: 'Titanium alloys OT4 and VT20 / Stainless steel',
    notes: 'The Soviet supersonic transport. Featured retractable "mustache" canards above the flight deck deployed at low speeds to increase pitch authority and lift during approach, plus 8-wheel main gear trucks.'
  },
  {
    id: 'dc-10',
    name: 'McDonnell Douglas DC-10-30',
    category: 'supersonic_classic',
    icao: 'DC10',
    manufacturer: 'McDonnell Douglas',
    eis: 1972,
    wingspan: 50.4,
    length: 55.5,
    height: 17.7,
    fuselageDiameter: 6.02,
    fuselageType: 'trijet_center_straight',
    wingSweep: 35.0,
    aspectRatio: 7.5,
    wingletType: 'straight',
    flapType: 'fowler_double',
    slatType: 'slats_full_span',
    engines: {
      model: 'General Electric CF6-50C2',
      count: 3,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 2.19,
      bypassRatio: 4.4,
      maxThrustKN: 233.5,
      hasChevrons: false,
      oem: 'GE Aerospace'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 3,
      wheelsPerTruck: 4,
      bogieSteering: false,
      tirePSI: 195
    },
    hydraulics: {
      system: 'boeing_lrc',
      pressurePSI: 3000,
      circuits: ['System 1', 'System 2', 'System 3']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '3%',
    primaryAlloy: 'Al-Zn 7075-T6 / Centerline 2-wheel gear',
    notes: 'Widebody trijet featuring a straight-through duct for engine #2 mounted directly inside the vertical stabilizer fin, eliminating the S-duct turn losses.'
  },
  {
    id: 'md-11',
    name: 'McDonnell Douglas MD-11',
    category: 'supersonic_classic',
    icao: 'MD11',
    manufacturer: 'McDonnell Douglas / Boeing',
    eis: 1990,
    wingspan: 51.7,
    length: 61.2,
    height: 17.6,
    fuselageDiameter: 6.02,
    fuselageType: 'trijet_center_straight',
    wingSweep: 35.0,
    aspectRatio: 7.5,
    wingletType: 'winglet_up_down',
    flapType: 'fowler_double',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'General Electric CF6-80C2D1F / PW4462',
      count: 3,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 2.36,
      bypassRatio: 5.3,
      maxThrustKN: 273.6,
      hasChevrons: false,
      oem: 'GE Aerospace'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 3,
      wheelsPerTruck: 4,
      bogieSteering: false,
      tirePSI: 205
    },
    hydraulics: {
      system: 'boeing_lrc',
      pressurePSI: 3000,
      circuits: ['System 1', 'System 2', 'System 3']
    },
    bleedType: 'pneumatic',
    hasTrimTank: true,
    compositeWeightFraction: '8%',
    primaryAlloy: 'Al-Li tail trim tank / Composite winglets',
    notes: 'Features distinctive split up-and-down winglets designed with NASA, an automated Longitudinal Stability Augmentation System (LSAS), and a fuel trim tank in the horizontal tail.'
  },
  {
    id: 'l-1011',
    name: 'Lockheed L-1011-500 TriStar',
    category: 'supersonic_classic',
    icao: 'L101',
    manufacturer: 'Lockheed',
    eis: 1979,
    wingspan: 50.09,
    length: 50.05,
    height: 16.87,
    fuselageDiameter: 6.02,
    fuselageType: 'trijet_s_duct',
    wingSweep: 35.0,
    aspectRatio: 7.6,
    wingletType: 'straight',
    flapType: 'fowler_double',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'Rolls-Royce RB211-524B4',
      count: 3,
      type: 'turbofan_high',
      spools: 3,
      fanDiameter: 2.19,
      bypassRatio: 4.4,
      maxThrustKN: 222.4,
      hasChevrons: false,
      oem: 'Rolls-Royce'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 4,
      bogieSteering: false,
      tirePSI: 190
    },
    hydraulics: {
      system: 'military_dual',
      pressurePSI: 3000,
      circuits: ['System A', 'System B', 'System C', 'System D (4x Quad)']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '3%',
    primaryAlloy: 'Titanium S-duct structure / Quadruple hydraulic lines',
    notes: 'Widely considered the most technologically advanced widebody of its era: 4 independent hydraulic circuits, S-duct center engine, flying tailplane (all-moving stabilizer), and certified for zero-visibility CAT IIIB autoland in 1972.'
  },
  {
    id: 'dc-3',
    name: 'Douglas DC-3',
    category: 'supersonic_classic',
    icao: 'DC3',
    manufacturer: 'Douglas Aircraft Company',
    eis: 1936,
    wingspan: 29.0,
    length: 19.7,
    height: 5.16,
    fuselageDiameter: 2.5,
    fuselageType: 'taildragger_prop',
    wingSweep: 15.0,
    aspectRatio: 7.7,
    wingletType: 'straight',
    flapType: 'split_flaps',
    slatType: 'none',
    engines: {
      model: 'Pratt & Whitney R-1830-92 Twin Wasp 14-Cylinder Radial',
      count: 2,
      type: 'piston',
      spools: 1,
      fanDiameter: 3.5, // Hamilton Standard 3-blade prop
      bypassRatio: 0.0,
      maxThrustKN: 1200, // BHP
      hasChevrons: false,
      oem: 'Pratt & Whitney / Hamilton Standard'
    },
    gear: {
      noseWheels: 0, // Taildragger
      mainTruckCount: 2,
      wheelsPerTruck: 1,
      bogieSteering: false,
      tirePSI: 45
    },
    hydraulics: {
      system: 'military_dual',
      pressurePSI: 1000,
      circuits: ['Engine Pump Circuit', 'Hand Pump Circuit']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '0%',
    primaryAlloy: 'Alclad 24S-T sheet aluminum riveted monocoque',
    notes: 'The aircraft that transformed commercial air travel. Features all-metal multi-cellular wing construction, twin 14-cylinder radial engines, and pneumatic boot de-icers.'
  },

  // -------------------------------------------------------------
  // 6. BUSINESS & GENERAL AVIATION
  // -------------------------------------------------------------
  {
    id: 'g650er',
    name: 'Gulfstream G650ER',
    category: 'bizjet_ga',
    icao: 'GLF6',
    manufacturer: 'Gulfstream Aerospace',
    eis: 2014,
    wingspan: 30.35,
    length: 30.4,
    height: 7.82,
    fuselageDiameter: 2.59,
    fuselageType: 'bizjet_oval_windows',
    wingSweep: 36.0,
    aspectRatio: 8.8,
    wingletType: 'blended',
    flapType: 'fowler_double',
    slatType: 'none',
    engines: {
      model: 'Rolls-Royce BR725 A1-12',
      count: 2,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 1.27,
      bypassRatio: 4.2,
      maxThrustKN: 75.2,
      hasChevrons: false,
      oem: 'Rolls-Royce Deutschland'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 2,
      bogieSteering: false,
      tirePSI: 190
    },
    hydraulics: {
      system: 'boeing_lrc',
      pressurePSI: 3000,
      circuits: ['Left', 'Right', 'Auxiliary']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '14%',
    primaryAlloy: '36-degree swept wing / Bonded aluminum fuselage',
    notes: 'Cruises at Mach 0.90 with a range of 7,500 nmi. Features Gulfstream’s signature 16 large panoramic oval windows and Fly-By-Wire flight control system.'
  },
  {
    id: 'g700',
    name: 'Gulfstream G700',
    category: 'bizjet_ga',
    icao: 'GA7C',
    manufacturer: 'Gulfstream Aerospace',
    eis: 2024,
    wingspan: 31.39,
    length: 33.48,
    height: 7.75,
    fuselageDiameter: 2.65,
    fuselageType: 'bizjet_oval_windows',
    wingSweep: 36.0,
    aspectRatio: 9.0,
    wingletType: 'scimitar_winglet',
    flapType: 'fowler_double',
    slatType: 'none',
    engines: {
      model: 'Rolls-Royce Pearl 700',
      count: 2,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 1.32,
      bypassRatio: 6.5,
      maxThrustKN: 81.2,
      hasChevrons: false,
      oem: 'Rolls-Royce'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 2,
      bogieSteering: false,
      tirePSI: 195
    },
    hydraulics: {
      system: 'boeing_lrc',
      pressurePSI: 3000,
      circuits: ['Left', 'Right', 'Auxiliary']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '18%',
    primaryAlloy: 'Blisk-equipped Pearl 700 / Symmetry Flight Deck',
    notes: 'Gulfstream’s flagship: powered by Rolls-Royce Pearl 700 with a 10-stage HPC blisk, active-control side-sticks, and a maximum operating speed of Mach 0.935.'
  },
  {
    id: 'global-7500',
    name: 'Bombardier Global 7500',
    category: 'bizjet_ga',
    icao: 'GL7T',
    manufacturer: 'Bombardier',
    eis: 2018,
    wingspan: 31.7,
    length: 33.8,
    height: 8.2,
    fuselageDiameter: 2.69,
    fuselageType: 'bizjet_transcontinental',
    wingSweep: 35.0,
    aspectRatio: 9.2,
    wingletType: 'canted_winglet',
    flapType: 'fowler_double',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'GE Passport 20-19BB1A',
      count: 2,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 1.32,
      bypassRatio: 5.6,
      maxThrustKN: 84.2,
      hasChevrons: false,
      oem: 'GE Aerospace'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 2,
      bogieSteering: false,
      tirePSI: 190
    },
    hydraulics: {
      system: 'boeing_lrc',
      pressurePSI: 3000,
      circuits: ['System 1', 'System 2', 'System 3']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '20%',
    primaryAlloy: 'Smooth Flēx Wing with leading edge slats',
    notes: 'Equipped with the "Smooth Flēx Wing", featuring full leading-edge slats and high flexibility to dampen turbulence bumps. Mach 0.925 maximum speed and 7,700 nmi range.'
  },
  {
    id: 'falcon-8x',
    name: 'Dassault Falcon 8X',
    category: 'bizjet_ga',
    icao: 'FA8X',
    manufacturer: 'Dassault Aviation',
    eis: 2016,
    wingspan: 26.29,
    length: 24.46,
    height: 7.94,
    fuselageDiameter: 2.50,
    fuselageType: 'trijet_s_duct_biz',
    wingSweep: 33.0,
    aspectRatio: 9.7,
    wingletType: 'blended',
    flapType: 'fowler_double',
    slatType: 'slats_full_span',
    engines: {
      model: 'Pratt & Whitney Canada PW307D',
      count: 3,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 1.10,
      bypassRatio: 4.8,
      maxThrustKN: 29.9,
      hasChevrons: false,
      oem: 'Pratt & Whitney Canada'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 2,
      bogieSteering: false,
      tirePSI: 180
    },
    hydraulics: {
      system: 'military_dual',
      pressurePSI: 3000,
      circuits: ['System 1', 'System 2']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '15%',
    primaryAlloy: 'Fighter-derived digital Fly-By-Wire / Internal S-duct',
    notes: 'A three-engine business jet with an integrated S-duct center engine. Benefits from Dassault Rafale fighter flight-control laws and steep London City 6° approaches.'
  },
  {
    id: 'pc-12-ngx',
    name: 'Pilatus PC-12 NGX',
    category: 'bizjet_ga',
    icao: 'PC12',
    manufacturer: 'Pilatus Aircraft',
    eis: 2020,
    wingspan: 16.28,
    length: 14.4,
    height: 4.26,
    fuselageDiameter: 1.68,
    fuselageType: 'single_turboprop',
    wingSweep: 0.0,
    aspectRatio: 10.3,
    wingletType: 'straight',
    flapType: 'fowler_single',
    slatType: 'none',
    engines: {
      model: 'Pratt & Whitney Canada PT6E-67XP with FADEC',
      count: 1,
      type: 'turboprop',
      spools: 2,
      fanDiameter: 2.67,
      bypassRatio: 0.0,
      maxThrustKN: 1200, // SHP
      hasChevrons: false,
      oem: 'P&WC / Hartzell 5-blade composite'
    },
    gear: {
      noseWheels: 1,
      mainTruckCount: 2,
      wheelsPerTruck: 1,
      bogieSteering: false,
      tirePSI: 65
    },
    hydraulics: {
      system: 'military_dual',
      pressurePSI: 3000,
      circuits: ['Electro-Hydraulic Powerpack']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '8%',
    primaryAlloy: 'Hartzell 5-blade composite prop / Trailing link gear',
    notes: 'The Swiss Army knife of aviation. Features a trailing-link main landing gear for rough unpaved strips, rear cargo door taking full European pallets, and single-lever FADEC turboprop control.'
  },
  {
    id: 'pc-24',
    name: 'Pilatus PC-24 ("Super Versatile Jet")',
    category: 'bizjet_ga',
    icao: 'PC24',
    manufacturer: 'Pilatus Aircraft',
    eis: 2018,
    wingspan: 17.0,
    length: 16.85,
    height: 5.4,
    fuselageDiameter: 1.70,
    fuselageType: 'bizjet_rough_field',
    wingSweep: 14.0,
    aspectRatio: 9.4,
    wingletType: 'straight',
    flapType: 'fowler_double',
    slatType: 'none',
    engines: {
      model: 'Williams International FJ44-4A-QPM',
      count: 2,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 0.85,
      bypassRatio: 3.3,
      maxThrustKN: 15.1,
      hasChevrons: false,
      oem: 'Williams International'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 2,
      bogieSteering: false,
      tirePSI: 70
    },
    hydraulics: {
      system: 'military_dual',
      pressurePSI: 3000,
      circuits: ['System 1', 'System 2']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '10%',
    primaryAlloy: 'Twin-wheel trailing link gear for unpaved dirt runways',
    notes: 'The only business twinjet certified to operate from unpaved dirt, grass, and gravel runways: features high engine mounts to avoid debris ingestion, dual main wheels with low tire pressure, and standard cargo door.'
  },
  {
    id: 'king-air-350i',
    name: 'Beechcraft King Air 350i',
    category: 'bizjet_ga',
    icao: 'B350',
    manufacturer: 'Beechcraft / Textron Aviation',
    eis: 2010,
    wingspan: 17.65,
    length: 14.22,
    height: 4.37,
    fuselageDiameter: 1.65,
    fuselageType: 'twin_turboprop',
    wingSweep: 0.0,
    aspectRatio: 9.8,
    wingletType: 'blended',
    flapType: 'fowler_single',
    slatType: 'none',
    engines: {
      model: 'Pratt & Whitney Canada PT6A-60A',
      count: 2,
      type: 'turboprop',
      spools: 2,
      fanDiameter: 2.67,
      bypassRatio: 0.0,
      maxThrustKN: 1050, // SHP
      hasChevrons: false,
      oem: 'P&WC / Hartzell 4-blade'
    },
    gear: {
      noseWheels: 1,
      mainTruckCount: 2,
      wheelsPerTruck: 2,
      bogieSteering: false,
      tirePSI: 95
    },
    hydraulics: {
      system: 'military_dual',
      pressurePSI: 2000,
      circuits: ['Electro-Hydraulic Pack']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '5%',
    primaryAlloy: 'Al-Cu 2024 / T-tail empennage',
    notes: 'The gold standard utility twin turboprop. Features reverse-flow PT6A engines, composite blended winglets, and Collins Pro Line Fusion touchscreen avionics.'
  },
  {
    id: 'citation-longitude',
    name: 'Cessna Citation Longitude',
    category: 'bizjet_ga',
    icao: 'C700',
    manufacturer: 'Cessna / Textron Aviation',
    eis: 2019,
    wingspan: 21.01,
    length: 22.3,
    height: 5.92,
    fuselageDiameter: 2.15,
    fuselageType: 'bizjet_transcontinental',
    wingSweep: 28.6,
    aspectRatio: 8.8,
    wingletType: 'blended',
    flapType: 'fowler_double',
    slatType: 'none',
    engines: {
      model: 'Honeywell HTF7700L',
      count: 2,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 1.05,
      bypassRatio: 4.4,
      maxThrustKN: 34.1,
      hasChevrons: false,
      oem: 'Honeywell Aerospace'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 2,
      bogieSteering: false,
      tirePSI: 180
    },
    hydraulics: {
      system: 'military_dual',
      pressurePSI: 3000,
      circuits: ['System 1', 'System 2']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '12%',
    primaryAlloy: 'Machined monolithic aluminum wing panels',
    notes: 'Flagship of the Citation line. Equipped with Honeywell HTF7700L engines and Garmin G5000 flight deck with fly-by-wire rudder and auto-throttles.'
  },
  {
    id: 'c172-skyhawk',
    name: 'Cessna 172S Skyhawk',
    category: 'bizjet_ga',
    icao: 'C172',
    manufacturer: 'Cessna / Textron Aviation',
    eis: 1956,
    wingspan: 11.0,
    length: 8.28,
    height: 2.72,
    fuselageDiameter: 1.2,
    fuselageType: 'single_piston_highwing',
    wingSweep: 0.0,
    aspectRatio: 7.3,
    wingletType: 'straight',
    flapType: 'fowler_single',
    slatType: 'none',
    engines: {
      model: 'Lycoming IO-360-L2A 4-Cylinder Horizontally Opposed',
      count: 1,
      type: 'piston',
      spools: 1,
      fanDiameter: 1.93,
      bypassRatio: 0.0,
      maxThrustKN: 180, // HP
      hasChevrons: false,
      oem: 'Lycoming Engines / McCauley Prop'
    },
    gear: {
      noseWheels: 1,
      mainTruckCount: 2,
      wheelsPerTruck: 1,
      bogieSteering: true,
      tirePSI: 38
    },
    hydraulics: {
      system: 'military_dual',
      pressurePSI: 0,
      circuits: ['Manual Cable Flight Controls / Hydraulic Brakes']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '2%',
    primaryAlloy: 'Al-Cu 2024 riveted skin / High-wing strut brace',
    notes: 'The most produced aircraft in aviation history (over 44,000 built). High-wing design with gravity-fed fuel tanks, spring steel main gear struts, and modern Garmin G1000 NXi glass cockpit.'
  },

  // -------------------------------------------------------------
  // 7. MILITARY TRANSPORTS, FIGHTERS & STEALTH
  // -------------------------------------------------------------
  {
    id: 'c-130j',
    name: 'Lockheed Martin C-130J Super Hercules',
    category: 'military_stealth',
    icao: 'C30J',
    manufacturer: 'Lockheed Martin',
    eis: 1999,
    wingspan: 40.41,
    length: 29.79,
    height: 11.84,
    fuselageDiameter: 4.3,
    fuselageType: 'military_transport_highwing',
    wingSweep: 0.0,
    aspectRatio: 10.1,
    wingletType: 'straight',
    flapType: 'fowler_double',
    slatType: 'none',
    engines: {
      model: 'Rolls-Royce AE 2100D3 Turboprop',
      count: 4,
      type: 'turboprop',
      spools: 2,
      fanDiameter: 4.11, // Dowty 6-blade composite
      bypassRatio: 0.0,
      maxThrustKN: 4691, // SHP
      hasChevrons: false,
      oem: 'Rolls-Royce / GE Dowty'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 2, // tandem wheels in sponson
      bogieSteering: false,
      tirePSI: 100
    },
    hydraulics: {
      system: 'military_dual',
      pressurePSI: 3000,
      circuits: ['Booster', 'Utility', 'Auxiliary']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '8%',
    primaryAlloy: 'Dowty R391 composite scimitar blades / Aft cargo ramp',
    notes: 'The legendary tactical airlifter updated with FADEC-controlled Rolls-Royce AE 2100 turboprops, 6-bladed Dowty composite scimitar propellers, dual Head-Up Displays (HUD), and tactical airdrop radar.'
  },
  {
    id: 'c-17',
    name: 'Boeing C-17 Globemaster III',
    category: 'military_stealth',
    icao: 'C17',
    manufacturer: 'Boeing / McDonnell Douglas',
    eis: 1995,
    wingspan: 51.74,
    length: 53.04,
    height: 16.79,
    fuselageDiameter: 6.86,
    fuselageType: 'military_transport_highwing',
    wingSweep: 25.0,
    aspectRatio: 7.2,
    wingletType: 'winglet_giant',
    flapType: 'externally_blown_flaps',
    slatType: 'slats_hydraulic',
    engines: {
      model: 'Pratt & Whitney F117-PW-100 (PW2040)',
      count: 4,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 2.14,
      bypassRatio: 5.9,
      maxThrustKN: 180.0,
      hasChevrons: false,
      oem: 'Pratt & Whitney'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 6, // 6 wheels per side sponson = 12 main wheels
      bogieSteering: false,
      tirePSI: 140
    },
    hydraulics: {
      system: 'military_dual',
      pressurePSI: 4000,
      circuits: ['System 1', 'System 2', 'System 3', 'System 4']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '10%',
    primaryAlloy: 'Titanium cargo sill / 4,000 PSI quad hydraulics',
    notes: 'Features Externally Blown Flaps (EBF): the engine exhaust blasts directly onto titanium double-slotted flaps to generate super-circulation lift, enabling short tactical landings (900 m) with an M1A2 Abrams battle tank on board.'
  },
  {
    id: 'c-5m',
    name: 'Lockheed C-5M Super Galaxy',
    category: 'military_stealth',
    icao: 'C5M',
    manufacturer: 'Lockheed Martin',
    eis: 2014,
    wingspan: 67.89,
    length: 75.31,
    height: 19.84,
    fuselageDiameter: 8.5,
    fuselageType: 'military_transport_superheavy',
    wingSweep: 25.0,
    aspectRatio: 7.7,
    wingletType: 'straight',
    flapType: 'fowler_double',
    slatType: 'slats_full_span',
    engines: {
      model: 'General Electric F138-GE-100 (CF6-80C2L1F)',
      count: 4,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 2.36,
      bypassRatio: 5.0,
      maxThrustKN: 225.0,
      hasChevrons: false,
      oem: 'GE Aerospace'
    },
    gear: {
      noseWheels: 4,
      mainTruckCount: 4,
      wheelsPerTruck: 6, // 4 six-wheel main bogies = 24 main wheels + 4 nose = 28 wheels!
      bogieSteering: true,
      tirePSI: 150
    },
    hydraulics: {
      system: 'military_dual',
      pressurePSI: 3000,
      circuits: ['System 1', 'System 2', 'System 3', 'System 4']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '6%',
    primaryAlloy: 'Titanium cargo deck / 28-wheel cross-wind steering gear',
    notes: 'The US military’s largest transport. Features a 28-wheel high-flotation landing gear where main bogies can pivot up to 20° for cross-wind crabbed landings and kneel down to truck-bed height.'
  },
  {
    id: 'f-22',
    name: 'Lockheed Martin F-22A Raptor',
    category: 'military_stealth',
    icao: 'F22',
    manufacturer: 'Lockheed Martin / Boeing',
    eis: 2005,
    wingspan: 13.56,
    length: 18.92,
    height: 5.08,
    fuselageDiameter: 2.2,
    fuselageType: 'stealth_chined',
    wingSweep: 42.0,
    aspectRatio: 2.3,
    wingletType: 'straight',
    flapType: 'flaperons',
    slatType: 'leading_edge_flaps',
    engines: {
      model: 'Pratt & Whitney F119-PW-100 with 2D Thrust Vectoring',
      count: 2,
      type: 'afterburning_turbojet',
      spools: 2,
      fanDiameter: 1.05,
      bypassRatio: 0.3,
      maxThrustKN: 156.0, // with reheat
      hasChevrons: false,
      oem: 'Pratt & Whitney'
    },
    gear: {
      noseWheels: 1,
      mainTruckCount: 2,
      wheelsPerTruck: 1,
      bogieSteering: false,
      tirePSI: 240
    },
    hydraulics: {
      system: 'military_dual',
      pressurePSI: 4000,
      circuits: ['System A', 'System B (4,000 PSI)']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '40%',
    primaryAlloy: 'Titanium 6-4 / Bimatrix carbon composites / Radar absorbent skin',
    notes: '5th-generation stealth air superiority fighter capable of Mach 1.82 supercruise without afterburners. Features 2D pitch-axis thrust-vectoring nozzles (+/- 20 degrees) and internal weapons bays.'
  },
  {
    id: 'f-35a',
    name: 'Lockheed Martin F-35A Lightning II',
    category: 'military_stealth',
    icao: 'F35',
    manufacturer: 'Lockheed Martin',
    eis: 2015,
    wingspan: 10.7,
    length: 15.7,
    height: 4.38,
    fuselageDiameter: 2.1,
    fuselageType: 'stealth_dsi_inlet',
    wingSweep: 35.0,
    aspectRatio: 2.5,
    wingletType: 'straight',
    flapType: 'flaperons',
    slatType: 'leading_edge_flaps',
    engines: {
      model: 'Pratt & Whitney F135-PW-100',
      count: 1,
      type: 'afterburning_turbojet',
      spools: 2,
      fanDiameter: 1.17,
      bypassRatio: 0.57,
      maxThrustKN: 191.0, // with reheat
      hasChevrons: false,
      oem: 'Pratt & Whitney'
    },
    gear: {
      noseWheels: 1,
      mainTruckCount: 2,
      wheelsPerTruck: 1,
      bogieSteering: false,
      tirePSI: 260
    },
    hydraulics: {
      system: 'military_dual',
      pressurePSI: 4000,
      circuits: ['Electro-Hydrostatic Actuation System (EHAS)']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '35%',
    primaryAlloy: 'Bismaleimide (BMI) carbon composite / Diverterless Supersonic Inlets (DSI)',
    notes: 'Powered by the most powerful fighter engine ever built (43,000 lbf thrust). Uses Diverterless Supersonic Inlets (DSI bumps) with zero boundary layer bleed diverters to minimize radar cross section.'
  },
  {
    id: 'rafale',
    name: 'Dassault Rafale C',
    category: 'military_stealth',
    icao: 'RFAL',
    manufacturer: 'Dassault Aviation',
    eis: 2001,
    wingspan: 10.9,
    length: 15.27,
    height: 5.34,
    fuselageDiameter: 1.9,
    fuselageType: 'canard_delta',
    wingSweep: 48.0,
    aspectRatio: 2.7,
    wingletType: 'missile_rails',
    flapType: 'elevons',
    slatType: 'leading_edge_slats',
    canards: true,
    engines: {
      model: 'Snecma M88-2 Afterburning Turbofan',
      count: 2,
      type: 'afterburning_turbojet',
      spools: 2,
      fanDiameter: 0.70,
      bypassRatio: 0.3,
      maxThrustKN: 75.0,
      hasChevrons: false,
      oem: 'Safran Aircraft Engines'
    },
    gear: {
      noseWheels: 1,
      mainTruckCount: 2,
      wheelsPerTruck: 1,
      bogieSteering: false,
      tirePSI: 230
    },
    hydraulics: {
      system: 'military_dual',
      pressurePSI: 5000,
      circuits: ['System 1', 'System 2 (5,000 PSI)']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '30%',
    primaryAlloy: 'Carbon-fiber wings / Titanium / Close-coupled canards',
    notes: 'Omnirole fighter featuring close-coupled active foreplane canards providing high instantaneous turn rate (+9g/-3.2g) and exceptional low-speed carrier approach handling.'
  },
  {
    id: 'typhoon',
    name: 'Eurofighter Typhoon',
    category: 'military_stealth',
    icao: 'EGTF',
    manufacturer: 'Eurofighter Jagdflugzeug',
    eis: 2003,
    wingspan: 10.95,
    length: 15.96,
    height: 5.28,
    fuselageDiameter: 1.95,
    fuselageType: 'canard_delta',
    wingSweep: 53.0,
    aspectRatio: 2.4,
    wingletType: 'defensive_pods',
    flapType: 'elevons',
    slatType: 'leading_edge_droop',
    canards: true,
    engines: {
      model: 'Eurojet EJ200 Afterburning Turbofan',
      count: 2,
      type: 'afterburning_turbojet',
      spools: 2,
      fanDiameter: 0.74,
      bypassRatio: 0.4,
      maxThrustKN: 90.0,
      hasChevrons: false,
      oem: 'Eurojet Turbo GmbH (Rolls-Royce/MTU)'
    },
    gear: {
      noseWheels: 1,
      mainTruckCount: 2,
      wheelsPerTruck: 1,
      bogieSteering: false,
      tirePSI: 240
    },
    hydraulics: {
      system: 'military_dual',
      pressurePSI: 4000,
      circuits: ['System 1', 'System 2']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '40%',
    primaryAlloy: '70% carbon fiber composite surface / Forward nose canards',
    notes: 'Intentionally aerodynamically unstable design (relaxed static stability) stabilized by quadruple-redundant digital fly-by-wire. Capable of supercruise at Mach 1.5.'
  },
  {
    id: 'su-57',
    name: 'Sukhoi Su-57 Felon',
    category: 'military_stealth',
    icao: 'SU57',
    manufacturer: 'Sukhoi / UAC',
    eis: 2020,
    wingspan: 14.1,
    length: 20.1,
    height: 4.6,
    fuselageDiameter: 2.3,
    fuselageType: 'stealth_blended_levcon',
    wingSweep: 48.0,
    aspectRatio: 2.6,
    wingletType: 'straight',
    flapType: 'flaperons',
    slatType: 'levcon_leading_edge',
    engines: {
      model: 'NPO Saturn AL-41F1 / Izdeliye 30 with 3D TVC',
      count: 2,
      type: 'afterburning_turbojet',
      spools: 2,
      fanDiameter: 0.93,
      bypassRatio: 0.3,
      maxThrustKN: 147.0, // with reheat
      hasChevrons: false,
      oem: 'NPO Saturn / UEC'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 1,
      bogieSteering: false,
      tirePSI: 220
    },
    hydraulics: {
      system: 'military_dual',
      pressurePSI: 4000,
      circuits: ['System 1', 'System 2']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '25%',
    primaryAlloy: 'Titanium central carry-through box / 3D thrust vectoring nozzles',
    notes: 'Features Leading Edge Vortex Controllers (LEVCONs) ahead of the wing roots and all-moving vertical stabilizers. Equipped with 3D all-axis thrust vectoring nozzles for post-stall supermaneuverability.'
  },
  {
    id: 'b-2-spirit',
    name: 'Northrop Grumman B-2 Spirit Stealth Bomber',
    category: 'military_stealth',
    icao: 'B2',
    manufacturer: 'Northrop Grumman',
    eis: 1997,
    wingspan: 52.4,
    length: 21.0,
    height: 5.18,
    fuselageDiameter: 3.2,
    fuselageType: 'flying_wing_stealth',
    wingSweep: 33.0,
    aspectRatio: 5.8,
    wingletType: 'straight',
    flapType: 'elevons_drag_rudders',
    slatType: 'none',
    engines: {
      model: 'General Electric F118-GE-100 Non-Afterburning Turbofan',
      count: 4,
      type: 'turbofan_high',
      spools: 2,
      fanDiameter: 1.02,
      bypassRatio: 0.8,
      maxThrustKN: 77.0,
      hasChevrons: false,
      oem: 'GE Aerospace'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 4,
      bogieSteering: false,
      tirePSI: 220
    },
    hydraulics: {
      system: 'military_dual',
      pressurePSI: 4000,
      circuits: ['System 1', 'System 2', 'System 3', 'System 4']
    },
    bleedType: 'pneumatic',
    hasTrimTank: false,
    compositeWeightFraction: '80%',
    primaryAlloy: 'Carbon-graphite composite continuous flying wing / RAM coating',
    notes: 'A tailless pure flying wing with a W-shaped trailing edge. Has zero vertical fins: yaw control is performed by differential opening of split drag rudders at the wingtips. Exhaust is cooled over ceramic tiles to suppress infrared signatures.'
  },
  {
    id: 'sr-71',
    name: 'Lockheed SR-71 Blackbird',
    category: 'military_stealth',
    icao: 'SR71',
    manufacturer: 'Lockheed Skunk Works',
    eis: 1966,
    wingspan: 16.94,
    length: 32.74,
    height: 5.64,
    fuselageDiameter: 2.2,
    fuselageType: 'stealth_chined',
    wingSweep: 53.0,
    aspectRatio: 1.9,
    wingletType: 'straight',
    flapType: 'elevons',
    slatType: 'none',
    engines: {
      model: 'Pratt & Whitney J58 (JT11D-20) Continuous-Bleed Turbo-Ramjet',
      count: 2,
      type: 'afterburning_turbojet',
      spools: 1,
      fanDiameter: 1.27,
      bypassRatio: 0.0,
      maxThrustKN: 151.0, // with reheat
      hasChevrons: false,
      oem: 'Pratt & Whitney'
    },
    gear: {
      noseWheels: 2,
      mainTruckCount: 2,
      wheelsPerTruck: 3, // 3-wheel main trucks with silver-infused tires
      bogieSteering: false,
      tirePSI: 415
    },
    hydraulics: {
      system: 'military_dual',
      pressurePSI: 3000,
      circuits: ['System A', 'System B (Pennzane synthetic hydraulic oil)']
    },
    bleedType: 'pneumatic',
    hasTrimTank: true,
    compositeWeightFraction: '2%',
    primaryAlloy: 'Beta-120 / Ti-13V-11Cr-3Al structural Titanium alloy (93%)',
    notes: 'The fastest air-breathing manned aircraft in history (Mach 3.32 at 85,069 ft). Constructed of 93% titanium alloy. At Mach 3.2, its J58 engines bypass compressor air directly into the afterburner via 6 external bleed tubes, operating essentially as ramjets while translating intake shock spikes move 66 cm rearward.'
  }
];

// ATA Spec 100 Chapter Definitions
export const ATA_CHAPTERS = [
  { code: 'ATA 71-80', title: 'Powerplant & Propulsion', level1: 'propulsion' },
  { code: 'ATA 57 & 27', title: 'Wing Box & Flight Controls', level1: 'wing' },
  { code: 'ATA 32', title: 'Landing Gear & Brakes', level1: 'gear' },
  { code: 'ATA 31 & 34', title: 'Flight Deck & Avionics', level1: 'cockpit' },
  { code: 'ATA 53 & 21', title: 'Fuselage & Air Conditioning', level1: 'fuselage' },
  { code: 'ATA 55 & 49', title: 'Empennage & APU', level1: 'tail' }
];

// Detailed Level 2 Sub-Assemblies and Level 3 Micro-Components Catalog
export const ATA_DETAILS = {
  propulsion: {
    title: 'ATA 71-80 Powerplant & Propulsion',
    chapter: 'ATA 72 Engine Internals',
    subAssemblies: [
      {
        id: 'fan_module',
        name: 'Acoustic Cowling & Fan Rotor Module',
        ata: '72-10',
        vector: [0, 0, 1.8],
        components: [
          {
            id: 'fan_blades',
            name: 'Swept Carbon/Titanium Fan Blades',
            pn: 'CFM-1A-72-1102-K',
            oem: 'Safran Aircraft Engines / GE',
            material: '3D-Woven CFRP with Titanium Ti-6Al-4V Leading Edge Sheath',
            clearance: 'Blade Tip-to-Shroud Clearance: 0.85 mm nominal (abradable casing)',
            notes: 'Aerodynamically twisted curved fan blade design developed through supercomputing CFD, resisting bird strike impacts up to 3.65 kg (8 lb) per FAR 33.'
          },
          {
            id: 'spinner_cone',
            name: 'Aerodynamic Spinner Cone & Anti-Ice Spiral',
            pn: 'GE-90-72-1044-A',
            oem: 'GE Aerospace',
            material: 'Forged Titanium Ti-6Al-4V with Polyurethane Anti-Erosion Coating',
            clearance: 'Concentricity Runout: < 0.05 mm TIR',
            notes: 'Painted with an iconic optical spiral swirl that provides visual ground-crew rotation indication and acts as a raptor bird deterrent.'
          }
        ]
      },
      {
        id: 'compressor_module',
        name: 'High-Pressure Axial Compressor (HPC)',
        ata: '72-30',
        vector: [0, 0, 0.6],
        components: [
          {
            id: 'hpc_blisk',
            name: 'Stage 4 Integrated Blisk (Bladed Disk)',
            pn: 'RR-XWB-72-3015-D',
            oem: 'Rolls-Royce plc',
            material: 'Single-Piece Friction-Welded Titanium Ti-6242 Alloy',
            clearance: 'Inter-Stage Seal Clearance: 0.38 mm',
            notes: 'Eliminates traditional mechanical blade dovetail slots, reducing rotating mass by 30% and eliminating fretting fatigue at 12,500 RPM.'
          },
          {
            id: 'vsv_actuator',
            name: 'Variable Stator Vane (VSV) Ring & Bellcranks',
            pn: 'PW-1100-72-3210-C',
            oem: 'Collins Aerospace',
            material: 'Inconel 718 High-Temperature Nickel Superalloy',
            clearance: 'Angular Precision: +/- 0.25 degrees across full stroke',
            notes: 'Actuated by high-pressure fuel servos to modulate vane angle of attack during engine acceleration, preventing aerodynamic compressor stall and surge.'
          }
        ]
      },
      {
        id: 'combustor_module',
        name: 'Annular Combustor & Fuel Injector Nozzles',
        ata: '72-40',
        vector: [0, 0, -0.2],
        components: [
          {
            id: 'combustion_chamber',
            name: 'Low-NOx TAPS II Combustor Liner',
            pn: 'CFM-1A-72-4008-F',
            oem: 'CFM International (GE/Safran)',
            material: 'Oxide-Oxide Ceramic Matrix Composite (CMC) & Hastelloy-X',
            clearance: 'Effusion Cooling Holes: 40,000 laser-drilled angled micro-orifices',
            notes: 'Twin Annular Premixing Swirler (TAPS) mixes fuel and air prior to combustion to burn lean at 1,750°C, drastically slashing nitrogen oxide (NOx) emissions.'
          },
          {
            id: 'igniter_plug',
            name: 'Dual High-Energy Spark Igniter Plugs',
            pn: 'CHAMP-CH31899-1',
            oem: 'Champion Aerospace',
            material: 'Iridium-Center Electrode with Ceramic Alumina Insulator',
            clearance: 'Spark Gap: 1.25 mm nominal @ 20 kV discharge',
            notes: 'Fires at 4 to 8 sparks per second during takeoff, turbulent weather, or icing conditions to guarantee flameout auto-relight protection.'
          }
        ]
      },
      {
        id: 'turbine_module',
        name: 'High-Pressure Turbine (HPT) & Low-Pressure Turbine (LPT)',
        ata: '72-50',
        vector: [0, 0, -1.0],
        components: [
          {
            id: 'hpt_blade',
            name: 'Single-Crystal HPT Rotor Blade with Film-Cooling',
            pn: 'GE-9X-72-5022-N',
            oem: 'GE Aerospace',
            material: 'Single-Crystal Nickel Superalloy René N5 + Yttria-Stabilized Zirconia (YSZ) TBC',
            clearance: 'Tip Clearance Active Control: 0.50 mm via modulated cooling air',
            notes: 'Grown as a solitary continuous crystal lattice with zero grain boundaries to survive gas temperatures of 1,650°C (higher than the melting point of the metal itself) via internal serpentine cooling air passages.'
          },
          {
            id: 'lpt_case',
            name: 'Titanium Aluminide (TiAl) Low-Pressure Turbine Discs',
            pn: 'GE-90-72-5180-T',
            oem: 'Avio Aero (GE Aerospace)',
            material: 'Intermetallic Gamma-Titanium Aluminide (Ti-48Al-2Cr-2Nb)',
            clearance: 'Axial Stage Spacing: 12.5 mm',
            notes: 'Weighs 50% less than nickel alloys while resisting oxidation at 750°C, driving the ultra-high bypass ratio fan shaft at optimal thermodynamic RPM.'
          }
        ]
      },
      {
        id: 'reverser_module',
        name: 'Thrust Reverser Cascade & Translating Sleeves',
        ata: '78-30',
        vector: [0.8, 0, -0.6],
        components: [
          {
            id: 'cascade_vanes',
            name: 'Composite Aerodynamic Cascade Vane Boxes',
            pn: 'SAF-A320-78-3012-V',
            oem: 'Safran Nacelles',
            material: 'Autoclave-Cured Carbon Fiber Epoxy Honeycomb',
            clearance: 'Vane Airflow Turning Angle: 135 degrees forward',
            notes: 'Translates rearward by hydraulic actuators when reverse thrust is selected, blocking fan bypass flow with blocker doors and discharging air forward to brake the aircraft.'
          }
        ]
      }
    ]
  },
  wing: {
    title: 'ATA 57 & 27 Wing Box & Flight Controls',
    chapter: 'ATA 57 Structural Spars & Control Surfaces',
    subAssemblies: [
      {
        id: 'spars_ribs',
        name: 'Front/Rear Spars & Machined Wing Ribs',
        ata: '57-10',
        vector: [0, 0.4, 0],
        components: [
          {
            id: 'front_spar',
            name: 'Monolithic Titanium/CFRP Front Wing Spar',
            pn: 'AIRB-A350-57-1002-S',
            oem: 'Airbus Broughton / GKN Aerospace',
            material: 'Intermediate Modulus Toray T800 Carbon Fiber / Ti-6Al-4V Fittings',
            clearance: 'Structural Deflection Margin: +/- 5.2 m at ultimate aero load',
            notes: 'Carries primary bending moment and torsion loads from aerodynamic lift. Serves as the forward fluid boundary wall for integral fuel tank cells.'
          },
          {
            id: 'machined_ribs',
            name: 'High-Speed CNC Machined Aluminum-Lithium Ribs',
            pn: 'BOE-777-57-1045-R',
            oem: 'Boeing Frederickson',
            material: 'Al-Li 2050-T84 Plate',
            clearance: 'Fastener Hole Tolerance: +0.012 / -0.000 mm',
            notes: 'Maintains aerodynamic airfoil contour under varying dynamic pressure and contains fuel baffle flapper valves preventing uncoordinated fuel slosh.'
          }
        ]
      },
      {
        id: 'slats_actuation',
        name: 'Leading Edge Slats & Rotary Actuators',
        ata: '27-80',
        vector: [0, 0, 1.2],
        components: [
          {
            id: 'slat_track',
            name: 'Titanium Slat Track & Pinion Drive Mechanism',
            pn: 'LIEB-A320-27-8104-T',
            oem: 'Liebherr-Aerospace',
            material: 'Forged Titanium Ti-10V-2Fe-3Al / High-Chromium Stainless Steel',
            clearance: 'Gear Backlash: < 0.04 mm',
            notes: 'Driven by torque tubes from a Central Power Control Unit (PCU) to extend the leading edge downward and forward, delaying boundary-layer separation.'
          }
        ]
      },
      {
        id: 'fowler_flaps',
        name: 'Double-Slotted Fowler Flaps & Canoe Fairings',
        ata: '27-50',
        vector: [0, -0.4, -1.2],
        components: [
          {
            id: 'flap_vane',
            name: 'Trailing-Edge Double-Slotted Aerodynamic Vane',
            pn: 'BOE-737-27-5201-F',
            oem: 'Boeing Australia / Spirit AeroSystems',
            material: 'Carbon-Bismaleimide Composite Skin over Nomex Honeycomb Core',
            clearance: 'Slot Gap Accuracy: 22.5 mm +/- 1.0 mm at Full Flap detent',
            notes: 'Translates aft on curved track fairings (canoes) while pitching downward, simultaneously expanding wing planform area and injecting high-energy air over the upper surface.'
          }
        ]
      },
      {
        id: 'folding_wingtip',
        name: 'Boeing 777X Folding Wingtip Actuation Latch',
        ata: '57-90',
        vector: [1.5, 0.8, 0],
        components: [
          {
            id: 'latch_pins',
            name: 'Dual Electro-Hydraulic Primary Locking Latch Pins',
            pn: 'LIEB-777X-57-9020-P',
            oem: 'Liebherr-Aerospace Lindenberg',
            material: 'Custom 465 High-Strength Martensitic Stainless Steel',
            clearance: 'Lock Engagement Stroke: 45 mm with triple optical position sensors',
            notes: 'Folds the 3.5 m raked wingtip vertically upward within 20 seconds of landing roll-out. Mechanically locked in flight with quadruple hardware interlocks preventing uncommanded in-flight release.'
          }
        ]
      }
    ]
  },
  gear: {
    title: 'ATA 32 Landing Gear, Oleo Struts & Brakes',
    chapter: 'ATA 32 Retraction Jacks, Bogies & Carbon Discs',
    subAssemblies: [
      {
        id: 'oleo_strut',
        name: 'Oleo-Pneumatic Nitrogen/Oil Shock Strut',
        ata: '32-11',
        vector: [0, 0.6, 0],
        components: [
          {
            id: 'oleo_piston',
            name: 'High-Velocity Metering Pin & Oleo Piston',
            pn: 'SAFR-A350-32-1105-O',
            oem: 'Safran Landing Systems (Messier-Bugatti-Dowty)',
            material: 'Vacuum Arc Remelted (VAR) 300M Ultra-High-Strength Steel',
            clearance: 'Piston Stroke: 480 mm; Nitrogen Pre-Charge: 1,450 PSI @ 20°C',
            notes: 'Combines dry nitrogen gas (acting as a variable-rate spring) and hydraulic fluid forced through a tapered metering orifice (acting as a dynamic viscous damper) to absorb up to 10 ft/s sink rates.'
          },
          {
            id: 'torque_links',
            name: 'Upper & Lower Torque Scissors Links',
            pn: 'BOE-777-32-1140-T',
            oem: 'Collins Aerospace Landing Systems',
            material: 'Forged Titanium Ti-10-2-3 Alloy',
            clearance: 'Torsional Backlash: < 0.08 degrees',
            notes: 'Maintains wheel alignment with the aircraft longitudinal axis while permitting vertical telescoping motion of the oleo shock strut.'
          }
        ]
      },
      {
        id: 'bogie_truck',
        name: 'Multi-Wheel Bogie Beam & Rear-Axle Steering',
        ata: '32-12',
        vector: [0, -0.4, 0.4],
        components: [
          {
            id: 'bogie_beam',
            name: '6-Wheel Triple-Bogie Beam with Steerable Aft Axle',
            pn: 'SAFR-777-32-1220-B',
            oem: 'Safran Landing Systems',
            material: 'Monolithic Forged Die 300M Steel Heat Treated to 280 ksi UTS',
            clearance: 'Steering Angle: +/- 8.0 degrees commanded via rudder pedals on ground',
            notes: 'Featured on the Boeing 777-300ER and Airbus A350-1000. Actively steers the rear wheels in opposition to the nose gear below 20 knots, drastically cutting tire scrubbing stress.'
          }
        ]
      },
      {
        id: 'carbon_brakes',
        name: 'Multi-Disc Carbon-Carbon Brake Heat Packs',
        ata: '32-41',
        vector: [0.6, 0, 0],
        components: [
          {
            id: 'stator_rotor_pack',
            name: 'Interleaved Carbon-Carbon Stator & Rotor Matrix',
            pn: 'SAFR-A320-32-4100-C',
            oem: 'Safran Landing Systems / Collins Aerospace',
            material: 'Polyacrylonitrile (PAN) Precursor Carbon-Carbon Matrix',
            clearance: 'Wear Pin Limit: 2.5 mm remaining clearance; Max Temp: 1,200°C',
            notes: 'Absorbs the kinetic energy of a rejected takeoff (RTO) at MTOW, glowing incandescent cherry red at 1,200°C while maintaining friction coefficient without thermal fade.'
          }
        ]
      }
    ]
  },
  cockpit: {
    title: 'ATA 31 & 34 Flight Deck, Avionics & Radar',
    chapter: 'ATA 34 Navigation & Weather Radar Bay',
    subAssemblies: [
      {
        id: 'radome_module',
        name: 'Weather Radar & Pitot-Static Sensor Array',
        ata: '34-41',
        vector: [0, 0, 1.4],
        components: [
          {
            id: 'radar_antenna',
            name: 'MultiScan Solid-State Phased Array Weather Radar',
            pn: 'COLL-WXR-2100-R',
            oem: 'Collins Aerospace',
            material: 'Dielectric Quartz Composite Radome over Flat Plate Slot Array',
            clearance: 'Beam Width: 3.5 degrees; Azimuth Sweep: +/- 90 degrees',
            notes: 'Performs volumetric multiscan sweeps from 0 to 60,000 ft, running predictive algorithms to detect windshear, microbursts, and clear-air turbulence up to 320 nmi ahead.'
          },
          {
            id: 'smart_probes',
            name: 'Multi-Function Smart Pitot-Static Air Data Probes',
            pn: 'THAL-MFP-34-1100',
            oem: 'Thales Avionics',
            material: 'Electrically Heated Nickel-Plated Inconel Alloy',
            clearance: 'Heater Current: 28 VDC, 1,200 W anti-ice de-icing cycle',
            notes: 'Integrates pitot pressure, static pressure, angle of attack (AOA), and total air temperature (TAT) into a single aerodynamic probe feeding Air Data Inertial Reference Units (ADIRU).'
          }
        ]
      },
      {
        id: 'flight_deck_displays',
        name: 'Electronic Centralized Cockpit LFD & Side-Sticks',
        ata: '31-60',
        vector: [0, 0.4, 0],
        components: [
          {
            id: 'lfd_display',
            name: '15.4-inch High-Brightness AMLCD Glass Cockpit LFDs',
            pn: 'THAL-A350-31-6015-D',
            oem: 'Thales Avionics / Collins',
            material: 'Anti-Reflective Polarized High-Resolution Liquid Crystal Panel',
            clearance: 'Luminance: 0.1 to 800 cd/m2 dimming range for night operations',
            notes: 'Displays primary flight display (PFD), navigation display (ND), and Electronic Centralized Aircraft Monitor (ECAM/EICAS) synoptic pages with optical trackball keyboard cursor control.'
          }
        ]
      }
    ]
  },
  fuselage: {
    title: 'ATA 53 & 21 Fuselage Structure & Air Conditioning',
    chapter: 'ATA 53 Fuselage Frames & Pressure Bulkheads',
    subAssemblies: [
      {
        id: 'pressure_bulkhead',
        name: 'Aft Dome Carbon Composite Pressure Bulkhead',
        ata: '53-80',
        vector: [0, 0, -1.5],
        components: [
          {
            id: 'aft_dome',
            name: 'Torispherical Toray Carbon Fiber Pressure Dome',
            pn: 'AIRB-A350-53-8010-B',
            oem: 'Premium AEROTEC',
            material: 'Resin-Transferred Continuous Carbon Fiber Composite',
            clearance: 'Delta P Burst Strength: > 18.2 PSI (2x max cabin differential)',
            notes: 'Hermetically seals the pressurized passenger cabin (typically 8.6 PSI differential) against the non-pressurized empennage tail cone, saving weight while eliminating metal fatigue.'
          }
        ]
      },
      {
        id: 'ecs_packs',
        name: 'Environmental Control System (ECS) Air Cycle Machines',
        ata: '21-50',
        vector: [0, -0.8, 0],
        components: [
          {
            id: 'air_cycle_machine',
            name: 'Air Cycle Machine (ACM) Bootstrap Expansion Turbine',
            pn: 'LIEB-A320-21-5012-P',
            oem: 'Liebherr-Aerospace Toulouse',
            material: 'Inconel 718 Turbine / Aluminum Heat Exchangers',
            clearance: 'Air Bearing Clearance: 0.015 mm (air-lubricated foil bearings)',
            notes: 'Takes 200°C engine bleed air, compresses it, passes it through ram-air heat exchangers, and expands it across a cooling turbine down to 2°C in fractions of a second without chemical refrigerants.'
          }
        ]
      }
    ]
  },
  tail: {
    title: 'ATA 55 & 49 Empennage & Auxiliary Power Unit',
    chapter: 'ATA 55 Stabilizers & ATA 49 APU Turbine',
    subAssemblies: [
      {
        id: 'apu_module',
        name: 'Auxiliary Power Unit (APU) Gas Turbine Core',
        ata: '49-10',
        vector: [0, 0.2, -1.8],
        components: [
          {
            id: 'apu_turbine',
            name: 'Gas Turbine Powerhead & 90 kVA Starter-Generator',
            pn: 'HONY-131-9A-49-1000',
            oem: 'Honeywell Aerospace',
            material: 'Cast Nickel Superalloy Turbine Wheel / Stainless Enclosure',
            clearance: 'Governed Speed: Constant 48,800 RPM (100% N1)',
            notes: 'Housed in a titanium fireproof containment bay inside the tail cone. Supplies electrical power and pneumatic compressed bleed air to start main engines on the ramp without ground service equipment.'
          }
        ]
      },
      {
        id: 'horizontal_trim',
        name: 'Trimmable Horizontal Stabilizer Actuator (THSA)',
        ata: '27-40',
        vector: [0, 0.6, -0.8],
        components: [
          {
            id: 'thsa_jackscrew',
            name: 'Dual-Load Path Fail-Safe Ball Screw THSA',
            pn: 'UTAS-A320-27-4015-J',
            oem: 'Collins Aerospace (UTC)',
            material: 'Case-Hardened High-Tensile Steel with Secondary Tie-Rod Core',
            clearance: 'Backlash: < 0.05 mm across 18 degrees pitch travel',
            notes: 'Pivots the entire horizontal stabilizer fin up or down in response to Fly-By-Wire pitch auto-trim commands, providing massive aerodynamic pitch trim authority.'
          }
        ]
      }
    ]
  }
};

// Livery and Finish Presets
export const LIVERY_PRESETS = [
  {
    id: 'commercial_white',
    name: 'Airline Commercial Gloss',
    desc: 'High-gloss polyurethane white enamel with Electric Cyan airline livery cheatline',
    skinColor: 0xe8ecf2,
    metalness: 0.5,
    roughness: 0.18,
    accentColor: 0x00e5ff
  },
  {
    id: 'bare_carbon_metal',
    name: 'Prototype Skunk Works (Bare Carbon & Titanium)',
    desc: 'Flight test prototype showing raw weave Toray carbon-fiber panels and polished titanium fasteners',
    skinColor: 0x181c24,
    metalness: 0.75,
    roughness: 0.42,
    accentColor: 0xffb800
  },
  {
    id: 'primer_green',
    name: 'Factory Assembly Primer (Zinc-Chromate)',
    desc: 'OEM pre-delivery protective zinc-chromate and anodized Al-Li green primer coating',
    skinColor: 0x486b4f,
    metalness: 0.4,
    roughness: 0.55,
    accentColor: 0x88cc88
  },
  {
    id: 'military_stealth',
    name: 'Low-Observable Radar Absorbent (RAM Matte)',
    desc: 'Classified multi-spectral carbonyl iron radar-absorbent matte charcoal coating',
    skinColor: 0x12141a,
    metalness: 0.2,
    roughness: 0.85,
    accentColor: 0x556070
  },
  {
    id: 'chrome_titanium',
    name: 'Polished Mirror Aluminum (Classic Retro Spec)',
    desc: 'High-spec mirror-polished aerodynamic skin with ultra-low drag reflection and raw titanium cowls',
    skinColor: 0xccd6e0,
    metalness: 0.94,
    roughness: 0.08,
    accentColor: 0x00e5ff
  },
  {
    id: 'golden_hour_vip',
    name: 'Golden Horizon Executive Livery (VIP Aerospace)',
    desc: 'Bespoke champagne-gold metallic pearl finish with warm amber reflectivity and obsidian winglets',
    skinColor: 0xc9a456,
    metalness: 0.88,
    roughness: 0.16,
    accentColor: 0xffb800
  }
];

// Operational Flight Phase Presets
export const FLIGHT_PHASES = [
  {
    id: 'cold_dark',
    name: 'Cold & Dark (Gate Turnaround)',
    desc: 'Aircraft parked at gate with ground power connected, engines OFF, gear pinned downlocks',
    thrust: 'IDLE',
    flapsAirbus: 0,
    flapsBoeing: 0,
    gear: 'DN',
    streamlines: false,
    speed: 0
  },
  {
    id: 'taxi_startup',
    name: 'Ramp Taxi & Engine Spoolup',
    desc: 'Single-engine taxi with PTU hydraulic cycling, N1 21%, slats extended to takeoff position',
    thrust: 'IDLE',
    flapsAirbus: 1, // CONF 1
    flapsBoeing: 1, // Flaps 1
    gear: 'DN',
    streamlines: false,
    speed: 15
  },
  {
    id: 'takeoff_rotation',
    name: 'Takeoff Rotation & Initial Climb',
    desc: 'Maximum rated takeoff thrust (TOGA), N1 98.6%, high angle-of-attack lift circulation',
    thrust: 'TOGA',
    flapsAirbus: 3, // CONF 2
    flapsBoeing: 3, // Flaps 15
    gear: 'UP',
    streamlines: true,
    speed: 175
  },
  {
    id: 'transonic_cruise',
    name: 'Transonic High-Altitude Cruise',
    desc: 'Clean configuration (flaps/gear stowed), Mach 0.85 at FL380, continuous climb thrust',
    thrust: 'CLB',
    flapsAirbus: 0, // Clean
    flapsBoeing: 0, // UP
    gear: 'UP',
    streamlines: true,
    speed: 485
  },
  {
    id: 'approach_landing',
    name: 'ILS Stabilized Final Approach',
    desc: 'Full flap drag configuration, gear down with 3-Green locked, autothrottle approach speed',
    thrust: 'CLB',
    flapsAirbus: 5, // FULL
    flapsBoeing: 6, // Flaps 30
    gear: 'DN',
    streamlines: false,
    speed: 140
  },
  {
    id: 'rollout_reverse',
    name: 'Touchdown Rollout & Full Reverse',
    desc: 'Translating sleeves open, cascade vanes exposed, carbon brakes glowing, roll spoilers extended',
    thrust: 'REV',
    flapsAirbus: 5, // FULL
    flapsBoeing: 6, // Flaps 30
    gear: 'DN',
    streamlines: false,
    speed: 95
  }
];

// Typical 3D Inspection Hotspots
export const AIRFRAME_HOTSPOTS = [
  {
    id: 'pitot_array',
    name: 'Pitot-Static Smart Probes',
    ata: 'ATA 34-11',
    posFactor: [0.25, 0.1, 0.45],
    desc: 'Electrically heated RVSM-certified smart probes feeding triple ADIRU air data computers'
  },
  {
    id: 'engine_core',
    name: 'Turbine Combustor & Borescope Ports',
    ata: 'ATA 72-40',
    posFactor: [-0.3, -0.15, 0.0],
    desc: '24 laser-inspected optical borescope ports for internal turbine single-crystal blade wear inspection'
  },
  {
    id: 'reverser_sleeve',
    name: 'Thrust Reverser Translating Cowl',
    ata: 'ATA 78-30',
    posFactor: [-0.35, -0.12, -0.08],
    desc: 'Translates 45 cm rearward on tracks to expose carbon-composite cascade vanes for reverse thrust'
  },
  {
    id: 'flap_canoes',
    name: 'Flap Track Mechanism Fairings (Canoes)',
    ata: 'ATA 27-50',
    posFactor: [-0.28, -0.05, -0.22],
    desc: 'Houses titanium ball-screw jacks and rotary actuators that pitch and translate trailing-edge Fowler flaps'
  },
  {
    id: 'wingtip_device',
    name: 'Wingtip Aerodynamic Device / Latch',
    ata: 'ATA 57-90',
    posFactor: [-0.48, 0.08, -0.25],
    desc: 'Raked tips / Sharklets reducing induced drag, or 777X folding wingtip hydraulic latch pins'
  },
  {
    id: 'rat_bay',
    name: 'Ram Air Turbine (RAT) Deployment Bay',
    ata: 'ATA 29-22',
    posFactor: [0.12, -0.18, 0.05],
    desc: 'Emergency backup turbine automatically deploying into the airstream to supply emergency 3,000 PSI hydraulic power'
  },
  {
    id: 'cargo_door',
    name: 'Forward Cargo Lower-Lobe Door',
    ata: 'ATA 52-30',
    posFactor: [0.18, -0.12, 0.22],
    desc: 'Outward-opening plug cargo door with visual mechanical pin witness lock indicators'
  },
  {
    id: 'apu_compartment',
    name: 'APU Fire Containment Shroud',
    ata: 'ATA 49-10',
    posFactor: [0.0, 0.12, -0.46],
    desc: 'Titanium-walled fireproof enclosure housing Honeywell/Pratt auxiliary gas turbine generator'
  }
];
