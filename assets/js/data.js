export const BOARD = {
  name: "MPU6050 + ESP32 sensor node",
  widthMm: 80,
  heightMm: 50,
  thicknessMm: 1.6,
  layers: 2,
  components: [
    {
      ref: "U1",
      value: "MPU6050",
      footprint: "QFN-24 (simplified)",
      x: 32,
      y: 12,
      w: 9,
      d: 9,
      h: 0.9,
      kind: "ic",
      role: "6-axis motion sensor on I2C",
      pads: ["VCC", "GND", "SDA", "SCL"],
      cost: 1.4,
    },
    {
      ref: "U2",
      value: "HC-05",
      footprint: "Module header 1x06 (simplified)",
      x: 32,
      y: 38,
      w: 10,
      d: 12,
      h: 1.3,
      kind: "module",
      role: "Bluetooth serial module on UART",
      pads: ["VCC", "GND", "RX", "TX"],
      cost: 4.2,
    },
    {
      ref: "U3",
      value: "ESP32-WROOM-32",
      footprint: "Module (simplified)",
      x: 58,
      y: 25,
      w: 18,
      d: 14,
      h: 1.4,
      kind: "module",
      role: "Wi-Fi and Bluetooth microcontroller",
      pads: ["3V3", "GND", "GPIO21", "GPIO22", "GPIO16", "GPIO17"],
      cost: 3.8,
    },
    {
      ref: "U4",
      value: "AMS1117-3.3",
      footprint: "SOT-223 (simplified)",
      x: 12,
      y: 12,
      w: 6,
      d: 5,
      h: 1.5,
      kind: "regulator",
      role: "3.3 V linear regulator",
      pads: ["VIN", "GND", "VOUT"],
      cost: 0.28,
    },
    {
      ref: "C1",
      value: "10uF",
      footprint: "0805 (simplified)",
      x: 6,
      y: 20,
      w: 4,
      d: 2.2,
      h: 0.55,
      kind: "passive",
      role: "Regulator input bulk capacitor",
      pads: ["1", "2"],
      cost: 0.08,
    },
    {
      ref: "C2",
      value: "22uF",
      footprint: "0805 (simplified)",
      x: 18,
      y: 20,
      w: 4,
      d: 2.2,
      h: 0.55,
      kind: "passive",
      role: "Regulator output bulk capacitor",
      pads: ["1", "2"],
      cost: 0.12,
    },
    {
      ref: "R1",
      value: "4.7k",
      footprint: "0402 (simplified)",
      x: 26,
      y: 20,
      w: 3.2,
      d: 1.6,
      h: 0.35,
      kind: "passive",
      role: "I2C SDA pull-up",
      pads: ["1", "2"],
      cost: 0.01,
    },
    {
      ref: "R2",
      value: "4.7k",
      footprint: "0402 (simplified)",
      x: 26,
      y: 26,
      w: 3.2,
      d: 1.6,
      h: 0.35,
      kind: "passive",
      role: "I2C SCL pull-up",
      pads: ["1", "2"],
      cost: 0.01,
    },
    {
      ref: "C3",
      value: "0.1uF",
      footprint: "0402 (simplified)",
      x: 38,
      y: 18,
      w: 3.2,
      d: 1.6,
      h: 0.35,
      kind: "passive",
      role: "MPU6050 local decoupling",
      pads: ["1", "2"],
      cost: 0.02,
    },
    {
      ref: "C4",
      value: "0.1uF",
      footprint: "0402 (simplified)",
      x: 38,
      y: 34,
      w: 3.2,
      d: 1.6,
      h: 0.35,
      kind: "passive",
      role: "HC-05 local decoupling",
      pads: ["1", "2"],
      cost: 0.02,
    },
    {
      ref: "C5",
      value: "0.1uF",
      footprint: "0402 (simplified)",
      x: 50,
      y: 32,
      w: 3.2,
      d: 1.6,
      h: 0.35,
      kind: "passive",
      role: "ESP32 local decoupling",
      pads: ["1", "2"],
      cost: 0.02,
    },
  ],
  connections: [
    { from: "U4.VOUT", to: "U3.3V3", net: "3V3", width: 0.5 },
    { from: "U4.VOUT", to: "U1.VCC", net: "3V3", width: 0.5 },
    { from: "U4.VOUT", to: "U2.VCC", net: "3V3", width: 0.5 },
    { from: "U4.GND", to: "U3.GND", net: "GND", width: 0.5 },
    { from: "U4.GND", to: "U1.GND", net: "GND", width: 0.5 },
    { from: "U4.GND", to: "U2.GND", net: "GND", width: 0.5 },
    { from: "U1.SDA", to: "U3.GPIO21", net: "I2C_SDA", width: 0.25 },
    { from: "U1.SCL", to: "U3.GPIO22", net: "I2C_SCL", width: 0.25 },
    { from: "U1.SDA", to: "R1.1", net: "I2C_SDA", width: 0.25 },
    { from: "U1.SCL", to: "R2.1", net: "I2C_SCL", width: 0.25 },
    { from: "R1.2", to: "U4.VOUT", net: "3V3", width: 0.25 },
    { from: "R2.2", to: "U4.VOUT", net: "3V3", width: 0.25 },
    { from: "U2.RX", to: "U3.GPIO16", net: "UART2_RX", width: 0.25 },
    { from: "U2.TX", to: "U3.GPIO17", net: "UART2_TX", width: 0.25 },
    { from: "C3.1", to: "U1.VCC", net: "3V3", width: 0.25 },
    { from: "C3.2", to: "U1.GND", net: "GND", width: 0.25 },
    { from: "C4.1", to: "U2.VCC", net: "3V3", width: 0.25 },
    { from: "C4.2", to: "U2.GND", net: "GND", width: 0.25 },
    { from: "C5.1", to: "U3.3V3", net: "3V3", width: 0.25 },
    { from: "C5.2", to: "U3.GND", net: "GND", width: 0.25 },
    { from: "C1.1", to: "U4.VIN", net: "VIN", width: 0.5 },
    { from: "C1.2", to: "U4.GND", net: "GND", width: 0.25 },
    { from: "C2.1", to: "U4.VOUT", net: "3V3", width: 0.5 },
    { from: "C2.2", to: "U4.GND", net: "GND", width: 0.25 },
  ],
};

export const NETS = {
  "3V3": { color: "#5eead4", label: "3.3 V rail" },
  GND: { color: "#94a3b8", label: "Ground return" },
  VIN: { color: "#fb923c", label: "Regulator input" },
  I2C_SDA: { color: "#fbbf24", label: "I2C data" },
  I2C_SCL: { color: "#f472b6", label: "I2C clock" },
  UART2_RX: { color: "#a3e635", label: "UART receive" },
  UART2_TX: { color: "#c084fc", label: "UART transmit" },
};

export function componentByRef(ref) {
  return BOARD.components.find((component) => component.ref === ref);
}

export function splitEndpoint(endpoint) {
  const index = endpoint.indexOf(".");
  return { ref: endpoint.slice(0, index), pad: endpoint.slice(index + 1) };
}

export function padPosition(ref, padName) {
  const component = componentByRef(ref);
  if (!component) return null;
  const index = component.pads.indexOf(padName);
  if (index < 0) return null;
  const spacing = 2.54;
  const offset = ((component.pads.length - 1) * spacing) / 2;
  return {
    x: component.x + index * spacing - offset,
    y: component.y + component.d / 2 + 2.2,
    index,
  };
}

export function padNets(ref, padName) {
  return [
    ...new Set(
      BOARD.connections
        .filter(
          (connection) =>
            connection.from === `${ref}.${padName}` ||
            connection.to === `${ref}.${padName}`,
        )
        .map((connection) => connection.net),
    ),
  ];
}

export function buildBom() {
  const groups = new Map();
  for (const component of BOARD.components) {
    const key = `${component.value}|${component.footprint}`;
    const row = groups.get(key) || {
      value: component.value,
      footprint: component.footprint,
      quantity: 0,
      unit: component.cost,
      total: 0,
      refs: [],
    };
    row.quantity += 1;
    row.refs.push(component.ref);
    row.total = Number((row.quantity * row.unit).toFixed(2));
    groups.set(key, row);
  }
  return [...groups.values()].sort((a, b) => b.total - a.total);
}

export const BOM = buildBom();
export const BOM_TOTAL = Number(
  BOM.reduce((sum, row) => sum + row.total, 0).toFixed(2),
);

export const CONCEPTS = [
  {
    id: "anatomy",
    title: "Board anatomy",
    category: "Foundations",
    level: "Start here",
    summary:
      "A PCB is a mechanical platform and a wiring system. The substrate insulates, copper conducts, solder mask protects, and silkscreen explains.",
    rule:
      "Every copper feature is either a wire, a pad, a plane, or a gap. Read a board by tracing those four things.",
    pro:
      "Check the fabrication drawing before layout: board outline, stackup, hole table, surface finish, and impedance notes are requirements, not suggestions.",
    tags: ["substrate", "copper", "mask", "silkscreen", "outline"],
  },
  {
    id: "stackup",
    title: "Copper layers and stackup",
    category: "Foundations",
    level: "Start here",
    summary:
      "A two-layer board is cheap and useful. Four layers add power and ground planes, which shorten return paths and improve signal integrity.",
    rule:
      "Put a ground plane next to every high-speed routing layer. A plane is not just copper; it is the return path for every signal above it.",
    pro:
      "Treat stackup as an electrical decision. Dielectric thickness and copper weight set impedance, loss, and current capacity together.",
    tags: ["2-layer", "4-layer", "plane", "dielectric", "stackup"],
  },
  {
    id: "traces",
    title: "Traces, current, and width",
    category: "Layout",
    level: "Go deeper",
    summary:
      "Trace width is chosen from current, allowed temperature rise, copper thickness, and ambient conditions. Voltage drop and manufacturing limits also matter.",
    rule:
      "Use a width calculator, then add margin. Do not size a power trace from a signal-trace default.",
    pro:
      "Check the return path as carefully as the forward trace. A narrow return path can erase the benefit of a wide power trace.",
    tags: ["current", "width", "copper weight", "voltage drop", "IPC-2221"],
  },
  {
    id: "vias",
    title: "Vias and annular rings",
    category: "Layout",
    level: "Go deeper",
    summary:
      "A via connects layers. Its barrel carries current and its annular ring must survive drill tolerance and fabrication.",
    rule:
      "Keep via count low on high-current paths and check the annular ring against the fab's minimum.",
    pro:
      "Use ground stitching vias around high-speed transitions and near plane edges. A via changes impedance; model it when the edge rate is fast.",
    tags: ["drill", "annular ring", "stitching", "barrel", "layer change"],
  },
  {
    id: "decoupling",
    title: "Decoupling and the PDN",
    category: "Power",
    level: "Go deeper",
    summary:
      "The power delivery network supplies transient current. Decoupling capacitors reduce the loop area between the IC, its power pin, and ground.",
    rule:
      "Place the smallest capacitor closest to the pin, with a short, wide connection to the ground plane.",
    pro:
      "Think in loops, not in capacitor counts. Measure impedance across frequency and watch for anti-resonance between capacitor values.",
    tags: ["capacitor", "PDN", "loop inductance", "transient", "power"],
  },
  {
    id: "grounding",
    title: "Grounding and return paths",
    category: "Power",
    level: "Pro",
    summary:
      "Current returns through the path of least impedance. At high frequency that path sits directly under the signal trace, in the reference plane.",
    rule:
      "Never split the reference plane under a signal. Route over a continuous plane or provide a stitching capacitor across the gap.",
    pro:
      "A ground pour is not automatically a ground plane. Check continuity, slotting, and via stitching before trusting it.",
    tags: ["return path", "plane", "split", "stitching", "loop"],
  },
  {
    id: "differential",
    title: "Differential pairs",
    category: "High-speed",
    level: "Pro",
    summary:
      "A differential pair carries one signal as two complementary voltages. The receiver reads the difference, which rejects common-mode noise.",
    rule:
      "Route the pair together, keep the spacing constant, and match length. Avoid layer changes that break the reference.",
    pro:
      "Coupling is not the whole story. The pair still needs a return path, and asymmetry creates mode conversion and radiated emissions.",
    tags: ["USB", "Ethernet", "common mode", "coupling", "skew"],
  },
  {
    id: "impedance",
    title: "Controlled impedance",
    category: "High-speed",
    level: "Pro",
    summary:
      "Impedance is set by trace geometry, dielectric constant, and the distance to the reference plane. The fab builds it; the designer specifies it.",
    rule:
      "For fast edges, specify a target impedance and a tolerance, then let the fab adjust line width and stackup.",
    pro:
      "Ask for a stackup with measured dielectric data. A nominal Dk is not enough when the product must work across temperature and process variation.",
    tags: ["50 ohm", "Dk", "reference plane", "stackup", "tolerance"],
  },
  {
    id: "length",
    title: "Length matching",
    category: "High-speed",
    level: "Pro",
    summary:
      "Length matching keeps related signals arriving inside the timing budget. It matters most for parallel buses, clocks, and differential pairs.",
    rule:
      "Match the group, not every trace. Use the timing budget to decide the allowed skew.",
    pro:
      "Meander in the same routing layer when possible. Every via and layer change adds delay and impedance discontinuity.",
    tags: ["skew", "timing", "meander", "bus", "clock"],
  },
  {
    id: "emc",
    title: "EMC and crosstalk",
    category: "High-speed",
    level: "Pro",
    summary:
      "Fast edges create electric and magnetic fields. Tight spacing couples energy into neighbours; large loops radiate.",
    rule:
      "Increase spacing, shorten parallel runs, and keep return paths continuous. Route aggressors away from sensitive inputs.",
    pro:
      "Fix the source before adding shielding. A ferrite or shield can hide a layout problem in the lab and fail in production.",
    tags: ["crosstalk", "radiation", "spacing", "edge rate", "shielding"],
  },
  {
    id: "thermal",
    title: "Thermal design",
    category: "Manufacturing",
    level: "Go deeper",
    summary:
      "Components heat because power becomes heat. Copper area, airflow, thermal vias, and ambient temperature set the operating margin.",
    rule:
      "Estimate power, then check junction temperature. Copper is a heatsink; use it deliberately.",
    pro:
      "Thermal vias need a copper destination on the other side. A via into a void is a dead end.",
    tags: ["junction", "thermal via", "copper area", "ambient", "derating"],
  },
  {
    id: "dfm",
    title: "DFM and fabrication",
    category: "Manufacturing",
    level: "Start here",
    summary:
      "Design for manufacturing means respecting the fab's drill, clearance, solder mask, and panel limits before the files are sent.",
    rule:
      "Run DRC with the real fab rules, generate a fabrication drawing, and inspect every layer in a Gerber viewer.",
    pro:
      "Talk to the fab early. A one-line stackup or surface-finish change can prevent a costly respin.",
    tags: ["DRC", "Gerber", "clearance", "solder mask", "surface finish"],
  },
];

export const QUIZ = [
  {
    question: "What is the primary job of a PCB?",
    options: [
      "To make a product look finished",
      "To support components and connect them electrically",
      "To replace every wire in a system",
      "To cool components without airflow",
    ],
    answer: 1,
    explain:
      "The board provides mechanical support and a controlled electrical interconnection system. Copper, pads, planes, and vias do the wiring.",
    level: "Foundations",
  },
  {
    question: "Which copper layer is normally the top routing layer in KiCad?",
    options: ["B.Cu", "F.Cu", "Edge.Cuts", "F.Silkscreen"],
    answer: 1,
    explain:
      "F.Cu is the front copper layer. B.Cu is the back copper. Edge.Cuts defines the outline, and silkscreen is non-conductive legend.",
    level: "Foundations",
  },
  {
    question: "What mainly sets the minimum width of a power trace?",
    options: [
      "The colour of the solder mask",
      "Current, allowed temperature rise, and copper thickness",
      "The number of silkscreen labels",
      "The board's mounting hole count",
    ],
    answer: 1,
    explain:
      "Conductor width, copper weight, current, ambient temperature, and allowed temperature rise determine the cross-section. Use a calculator and add margin.",
    level: "Layout",
  },
  {
    question: "Where should a decoupling capacitor go?",
    options: [
      "Anywhere on the board",
      "Close to the IC power pin with a short loop to ground",
      "Only near the connector",
      "On the bottom layer, far from the IC",
    ],
    answer: 1,
    explain:
      "The capacitor supplies transient current. A short, low-inductance loop between the pin, capacitor, and ground plane is what makes it effective.",
    level: "Power",
  },
  {
    question: "What does a via do?",
    options: [
      "It connects copper layers",
      "It isolates two nets",
      "It replaces a decoupling capacitor",
      "It defines the board outline",
    ],
    answer: 0,
    explain:
      "A via is a plated hole that connects pads on different layers. Its barrel, annular ring, and drill size all matter to current and manufacturability.",
    level: "Layout",
  },
  {
    question: "Which stackup choice most improves high-speed return paths?",
    options: [
      "A thicker silkscreen",
      "A continuous reference plane adjacent to the routing layer",
      "More mounting holes",
      "A larger board outline",
    ],
    answer: 1,
    explain:
      "High-frequency return current flows in the nearest reference plane. Keeping that plane continuous and close controls loop inductance and impedance.",
    level: "High-speed",
  },
  {
    question: "What is the key routing rule for a differential pair?",
    options: [
      "Route the two traces far apart",
      "Keep spacing and length consistent, with a continuous reference",
      "Use the widest traces on the board",
      "Always change layers together",
    ],
    answer: 1,
    explain:
      "Constant spacing preserves coupling and impedance; matched length controls skew. A continuous reference prevents mode conversion and reflections.",
    level: "High-speed",
  },
  {
    question: "What is silkscreen used for?",
    options: [
      "Carrying high current",
      "Non-conductive reference marks and labels",
      "Connecting layers",
      "Setting the board thickness",
    ],
    answer: 1,
    explain:
      "Silkscreen is printed legend. It helps assembly and service, but it is not copper and must not be relied on for electrical function.",
    level: "Manufacturing",
  },
  {
    question: "Why run DRC with the fabricator's rules?",
    options: [
      "To make the board look better",
      "To catch violations the fab cannot manufacture",
      "To increase the copper thickness",
      "To remove the need for a schematic",
    ],
    answer: 1,
    explain:
      "Every fab has minimum clearance, drill, annular ring, and mask limits. DRC against those rules catches failures before an expensive panel is built.",
    level: "Manufacturing",
  },
  {
    question: "A ground plane helps most because it...",
    options: [
      "adds decorative copper",
      "provides a low-impedance return path and shielding",
      "removes the need for decoupling",
      "makes every trace 50 ohms",
    ],
    answer: 1,
    explain:
      "A plane gives return current a short, low-inductance path and shields sensitive routing. It does not replace decoupling or automatically set impedance.",
    level: "Power",
  },
];

export const GAME_LEVELS = [
  {
    id: 1,
    title: "Power first",
    brief:
      "Bring the 3.3 V rail from the regulator to the ESP32 and the motion sensor. Route around the switching loop and the antenna keep-out.",
    lesson:
      "Power traces carry more current than signals. Give them width, a short path, and a clean return.",
    hint:
      "Click a gold pad, click empty board space to bend the trace, then click the matching pad.",
    budgetMm: 125,
    keepouts: [
      { x: 20, y: 25, r: 6, label: "Switching loop" },
      { x: 72, y: 40, r: 6, label: "Antenna keep-out" },
    ],
    tasks: [
      { from: "U4.VOUT", to: "U3.3V3", net: "3V3", label: "3.3 V to ESP32" },
      { from: "U4.VOUT", to: "U1.VCC", net: "3V3", label: "3.3 V to sensor" },
    ],
  },
  {
    id: 2,
    title: "The I2C pair",
    brief:
      "Connect SDA and SCL to the ESP32. The clock keep-out sits in the middle, so use waypoints and keep the pair tidy.",
    lesson:
      "I2C is a shared bus. Pull-ups set the idle level, and capacitance limits speed and distance.",
    hint:
      "Two clicks on empty board space make a clean detour. Watch the length budget.",
    budgetMm: 170,
    keepouts: [
      { x: 12, y: 12, r: 3.5, label: "Power hot loop" },
      { x: 45, y: 30, r: 4.5, label: "Clock keep-out" },
      { x: 72, y: 40, r: 6, label: "Antenna keep-out" },
    ],
    tasks: [
      { from: "U1.SDA", to: "U3.GPIO21", net: "I2C_SDA", label: "SDA to GPIO21" },
      { from: "U1.SCL", to: "U3.GPIO22", net: "I2C_SCL", label: "SCL to GPIO22" },
    ],
  },
  {
    id: 3,
    title: "UART crossover",
    brief:
      "Wire the Bluetooth module to the ESP32. TX talks to RX and RX talks to TX. A high-current trace blocks the direct route.",
    lesson:
      "A UART link crosses transmit and receive. Keep the pair short and keep the return path continuous underneath.",
    hint:
      "The crossover is intentional. Route around the high-current keep-out instead of through it.",
    budgetMm: 190,
    keepouts: [
      { x: 47, y: 42, r: 4.5, label: "High-current trace" },
      { x: 72, y: 40, r: 6, label: "Antenna keep-out" },
      { x: 45, y: 30, r: 4, label: "Clock keep-out" },
    ],
    tasks: [
      { from: "U2.RX", to: "U3.GPIO16", net: "UART2_RX", label: "HC-05 RX to GPIO16" },
      { from: "U2.TX", to: "U3.GPIO17", net: "UART2_TX", label: "HC-05 TX to GPIO17" },
      { from: "U2.GND", to: "U3.GND", net: "GND", label: "Shared ground" },
    ],
  },
  {
    id: 4,
    title: "Mixed-signal final",
    brief:
      "Power, I2C, and UART on one board. Three keep-outs, a tight budget, and no room for lazy routing.",
    lesson:
      "Real boards are a negotiation between power, signal integrity, and mechanical constraints. Order the routing by risk.",
    hint:
      "Route the power net first, then the clock-sensitive I2C pair, then UART. Use the task focus buttons.",
    budgetMm: 230,
    keepouts: [
      { x: 12, y: 12, r: 3.5, label: "Power hot loop" },
      { x: 45, y: 30, r: 4.5, label: "Clock keep-out" },
      { x: 47, y: 42, r: 4, label: "High-current trace" },
      { x: 72, y: 40, r: 6, label: "Antenna keep-out" },
    ],
    tasks: [
      { from: "U4.VOUT", to: "U3.3V3", net: "3V3", label: "3.3 V rail" },
      { from: "U1.SDA", to: "U3.GPIO21", net: "I2C_SDA", label: "I2C data" },
      { from: "U2.TX", to: "U3.GPIO17", net: "UART2_TX", label: "UART transmit" },
    ],
  },
];

export const MARKET = {
  stats: [
    {
      value: "$85.2B",
      label: "Global PCB output, 2025",
      note: "Prismark estimate; other trackers are close but not identical.",
    },
    {
      value: "~$102B",
      label: "2026 estimate",
      note: "Prismark Q4 2025 outlook. Forecasts move with the cycle.",
    },
    {
      value: "$123B+",
      label: "2030 estimate",
      note: "Long-range forecast; a later Q1 2026 update was higher still.",
    },
    {
      value: "2-4 wk",
      label: "Typical prototype turn",
      note: "Depends on fab, stackup, finish, and queue.",
    },
  ],
  segments: [
    {
      title: "Students and educators",
      pain: "Theory is abstract and EDA tools are intimidating.",
      offer: "A guided 3D lab, a routing game, and plain-language checks.",
    },
    {
      title: "Hardware startups",
      pain: "A first spin is expensive and documentation is rushed.",
      offer: "A reproducible spec, BOM, report bundle, and review checklist.",
    },
    {
      title: "Power and reliability teams",
      pain: "Waveform data is hard to explain across disciplines.",
      offer: "Transparent three-phase scenarios and exportable summaries.",
    },
    {
      title: "Training and maker spaces",
      pain: "Good curriculum is expensive to build and maintain.",
      offer: "Open courseware with a real board and a real analytics pipeline.",
    },
  ],
  model: [
    {
      name: "Open core",
      price: "Free",
      detail: "MIT-licensed Python package and browser studio. Use it, fork it, teach with it.",
    },
    {
      name: "Workshop",
      price: "Per cohort",
      detail: "Guided PCB and power-quality sessions built around the studio and the real board.",
    },
    {
      name: "Custom board pack",
      price: "Project",
      detail: "A validated spec, simplified footprints, report templates, and a design review.",
    },
    {
      name: "Integration support",
      price: "Retainer",
      detail: "Bring the analytics and reporting into an existing engineering workflow.",
    },
  ],
  risks: [
    "KiCad's Python API varies by release; the export path is optional and tested separately.",
    "The fault model is a teaching approximation, not a protection-coordination study.",
    "The PCB market is crowded; the differentiation is the learning-to-report workflow, not raw EDA features.",
    "Forecast figures are third-party estimates and should be quoted with their date and scope.",
  ],
};

export const RESEARCH = {
  equations: [
    {
      label: "Balanced phase voltage",
      formula: "v_a(t) = V_p sin(2πft),  v_b(t) = V_p sin(2πft - 120°),  v_c(t) = V_p sin(2πft + 120°)",
    },
    {
      label: "RMS",
      formula: "V_rms = sqrt((1/N) Σ v[n]²)",
    },
    {
      label: "Total harmonic distortion",
      formula: "THD = sqrt(Σ H₂..H₁₀²) / H₁",
    },
    {
      label: "Windowed severity",
      formula: "severity = 1 - min_w(V_rms,w / V_rms,nominal)",
    },
  ],
  validation: [
    "Synthetic tests cover nominal, open-phase, short-circuit, late-fault, and invalid-input cases.",
    "Round-trip tests preserve board specifications through JSON and regenerate the BOM.",
    "The demo bundle is built in CI without KiCad, so the core path stays reproducible.",
    "Next: hardware-in-the-loop validation with a relay test set and a calibrated power-quality recorder.",
    "Next: expert review against IEC 61000-4-30 measurement classes and application-specific protection settings.",
  ],
  limitations: [
    "No electromagnetic, thermal, or mechanical solver is included.",
    "Footprints and traces are simplified reference geometry, not fabrication-ready artwork.",
    "Fault detection is a transparent RMS heuristic, not a trained classifier or a certified relay.",
    "The game teaches routing intuition; it is not a substitute for DRC, DFM, or an expert review.",
    "Market figures are third-party estimates, quoted with dates and caveats.",
  ],
  citations: [
    {
      label: "KiCad documentation",
      href: "https://docs.kicad.org/",
      note: "Board editor, Python API, and fabrication outputs.",
    },
    {
      label: "IPC-2221 and IPC-2152",
      href: "https://www.ipc.org/",
      note: "Generic PCB design and current-carrying capacity references.",
    },
    {
      label: "IEC 61000-4-30",
      href: "https://webstore.iec.ch/",
      note: "Power-quality measurement methods and classes.",
    },
    {
      label: "Prismark PCB market outlook",
      href: "https://www.prismark.com/",
      note: "Industry output estimates; figures vary by report date.",
    },
    {
      label: "Three.js documentation",
      href: "https://threejs.org/docs/",
      note: "WebGL rendering and controls used by the studio.",
    },
  ],
};
