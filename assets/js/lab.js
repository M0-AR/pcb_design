import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  BOARD,
  NETS,
  componentByRef,
  padPosition,
  padNets,
  splitEndpoint,
  BOM,
  BOM_TOTAL,
} from "./data.js";

const SCALE = 0.1;
const BOARD_W = BOARD.widthMm * SCALE;
const BOARD_H = BOARD.heightMm * SCALE;
const BOARD_T = BOARD.thicknessMm * SCALE;
const TOP_Y = BOARD_T / 2;

const NET_PRESETS = {
  overview: { nets: [], camera: [7.4, 6.8, 8.2] },
  "3V3": { nets: ["3V3", "VIN"], camera: [5.2, 6.5, 6.4] },
  I2C: { nets: ["I2C_SDA", "I2C_SCL"], camera: [3.8, 7.6, 5.4] },
  UART: { nets: ["UART2_RX", "UART2_TX"], camera: [6.3, 6.2, 6.6] },
};

function worldX(mm) {
  return (mm / BOARD.widthMm - 0.5) * BOARD_W;
}

function worldZ(mm) {
  return (mm / BOARD.heightMm - 0.5) * BOARD_H;
}

function padWorld(ref, pad) {
  const position = padPosition(ref, pad);
  if (!position) return null;
  return new THREE.Vector3(
    worldX(position.x),
    TOP_Y + 0.02,
    worldZ(position.y),
  );
}

function seededRandom(seed = 7) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function makeBoardTexture(renderer) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 640;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const rand = seededRandom(19);

  ctx.fillStyle = "#0a3a2c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(94, 234, 212, 0.055)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= canvas.width; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  for (let i = 0; i < 54; i += 1) {
    const x = rand() * canvas.width;
    const y = rand() * canvas.height;
    ctx.strokeStyle = `rgba(212, 175, 55, ${0.03 + rand() * 0.05})`;
    ctx.lineWidth = 1 + rand() * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rand() - 0.5) * 220, y + (rand() - 0.5) * 160);
    ctx.stroke();
  }

  for (let i = 0; i < 10; i += 1) {
    ctx.fillStyle = "rgba(94, 234, 212, 0.024)";
    ctx.fillRect(rand() * 900, rand() * 540, 60 + rand() * 160, 30 + rand() * 80);
  }

  ctx.strokeStyle = "rgba(226, 244, 236, 0.35)";
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);

  ctx.fillStyle = "rgba(226, 244, 236, 0.72)";
  ctx.font = "600 22px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText("PCB DESIGN STUDIO", 48, 72);
  ctx.fillStyle = "rgba(226, 244, 236, 0.42)";
  ctx.font = "500 16px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText("MPU6050 + ESP32 SENSOR NODE", 48, 98);
  ctx.fillText("80 x 50 mm / 2 LAYER / REV 1.0", 48, canvas.height - 48);
  ctx.textAlign = "right";
  ctx.fillText("REFERENCE GEOMETRY", canvas.width - 48, canvas.height - 48);
  ctx.textAlign = "left";

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function makeLabel(text, color = "#d9f7ea") {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const font = "600 30px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.font = font;
  const width = Math.ceil(ctx.measureText(text).width) + 34;
  canvas.width = width;
  canvas.height = 64;
  ctx.font = font;
  ctx.fillStyle = "rgba(4, 10, 16, 0.78)";
  ctx.beginPath();
  ctx.roundRect(1, 1, width - 2, 62, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(text, 17, 33);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  const unit = 0.0032;
  sprite.scale.set(canvas.width * unit, canvas.height * unit, 1);
  return sprite;
}

function componentColor(component) {
  if (component.ref === "U2") return 0x1e40af;
  if (component.ref === "U3") return 0xb8c4d2;
  if (component.kind === "ic") return 0x111827;
  if (component.kind === "regulator") return 0x0f172a;
  if (component.kind === "module") return 0x9aa8b8;
  return 0xd5c6a5;
}

function makeSegment(start, end, radius, material) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  if (length < 0.001) return null;
  const geometry = new THREE.CylinderGeometry(radius, radius, length, 8);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.clone().normalize(),
  );
  return mesh;
}

function makeShadowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const gradient = ctx.createRadialGradient(128, 128, 20, 128, 128, 126);
  gradient.addColorStop(0, "rgba(0, 0, 0, 0.5)");
  gradient.addColorStop(0.55, "rgba(0, 0, 0, 0.2)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

export function initLab() {
  const canvas = document.getElementById("lab-canvas");
  const stage = document.getElementById("lab-stage");
  if (!canvas || !stage) return;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);
  camera.position.set(7.4, 6.8, 8.2);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.2, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.enablePan = false;
  controls.minDistance = 5;
  controls.maxDistance = 15;
  controls.minPolarAngle = 0.22;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.55;
  controls.addEventListener("start", () => {
    controls.autoRotate = false;
  });

  scene.add(new THREE.HemisphereLight(0xbdf7ff, 0x0a0f18, 1.45));
  const key = new THREE.DirectionalLight(0xffffff, 3.1);
  key.position.set(5, 9, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x5eead4, 1.1);
  rim.position.set(-6, 4, -5);
  scene.add(rim);
  const warm = new THREE.PointLight(0xfbbf24, 18, 14, 2);
  warm.position.set(0, 3.5, 1.5);
  scene.add(warm);

  const shadowTexture = makeShadowTexture();
  if (shadowTexture) {
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 9),
      new THREE.MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        depthWrite: false,
        opacity: 0.9,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.36;
    scene.add(shadow);
  }

  const boardGroup = new THREE.Group();
  scene.add(boardGroup);

  const boardMaterial = new THREE.MeshStandardMaterial({
    color: 0x0b3b2e,
    roughness: 0.72,
    metalness: 0.18,
  });
  const boardMesh = new THREE.Mesh(
    new THREE.BoxGeometry(BOARD_W, BOARD_T, BOARD_H),
    boardMaterial,
  );
  boardMesh.position.y = 0;
  boardGroup.add(boardMesh);

  const boardTexture = makeBoardTexture(renderer);
  const topMaterial = new THREE.MeshStandardMaterial({
    map: boardTexture,
    color: boardTexture ? 0xffffff : 0x0b3b2e,
    roughness: 0.66,
    metalness: 0.16,
    transparent: true,
    opacity: 1,
  });
  const top = new THREE.Mesh(new THREE.PlaneGeometry(BOARD_W, BOARD_H), topMaterial);
  top.rotation.x = -Math.PI / 2;
  top.position.y = TOP_Y + 0.001;
  boardGroup.add(top);

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(BOARD_W, BOARD_T, BOARD_H)),
    new THREE.LineBasicMaterial({
      color: 0x5eead4,
      transparent: true,
      opacity: 0.32,
    }),
  );
  boardGroup.add(edges);

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const hole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, BOARD_T + 0.03, 20),
        new THREE.MeshStandardMaterial({
          color: 0x030609,
          roughness: 0.5,
          metalness: 0.4,
        }),
      );
      hole.position.set(
        sx * (BOARD_W / 2 - 0.38),
        0,
        sz * (BOARD_H / 2 - 0.38),
      );
      boardGroup.add(hole);
    }
  }

  const componentsGroup = new THREE.Group();
  const padsGroup = new THREE.Group();
  const tracesGroup = new THREE.Group();
  const backTracesGroup = new THREE.Group();
  const signalGroup = new THREE.Group();
  boardGroup.add(tracesGroup, backTracesGroup, componentsGroup, padsGroup);
  scene.add(signalGroup);

  const componentGroups = [];
  const componentMeshes = [];
  const padMeshes = [];
  const traceMeshes = [];
  const backTraces = [];
  const labels = [];
  const boardMaterials = [boardMaterial, topMaterial];

  for (const component of BOARD.components) {
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({
      color: componentColor(component),
      roughness: component.kind === "module" ? 0.42 : 0.64,
      metalness: component.kind === "module" ? 0.55 : 0.22,
      emissive: 0x000000,
      transparent: true,
      opacity: 1,
    });
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(
        component.w * SCALE,
        component.h * SCALE,
        component.d * SCALE,
      ),
      material,
    );
    mesh.position.y = TOP_Y + (component.h * SCALE) / 2 + 0.012;
    group.add(mesh);

    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry),
      new THREE.LineBasicMaterial({
        color: 0x0b1220,
        transparent: true,
        opacity: 0.55,
      }),
    );
    outline.position.copy(mesh.position);
    group.add(outline);

    const pin1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.014, 12),
      new THREE.MeshStandardMaterial({
        color: 0xe5e7eb,
        roughness: 0.4,
        metalness: 0.2,
      }),
    );
    pin1.position.set(
      -component.w * SCALE / 2 + 0.12,
      TOP_Y + component.h * SCALE + 0.022,
      -component.d * SCALE / 2 + 0.12,
    );
    group.add(pin1);

    group.position.set(worldX(component.x), 0, worldZ(component.y));
    group.userData.component = component;
    group.userData.baseY = 0;
    group.userData.mesh = mesh;
    group.userData.outline = outline;
    componentsGroup.add(group);
    componentGroups.push(group);
    componentMeshes.push(mesh);
    mesh.userData.componentRef = component.ref;

    const labelText =
      component.kind === "passive"
        ? component.ref
        : `${component.ref} ${component.value}`;
    const label = makeLabel(
      labelText,
      component.kind === "module" ? "#d9f7ea" : "#bff7ec",
    );
    if (label) {
      label.position.set(
        0,
        TOP_Y + component.h * SCALE + 0.34,
        0,
      );
      group.add(label);
      labels.push(label);
    }

    for (const pad of component.pads) {
      const position = padWorld(component.ref, pad);
      if (!position) continue;
      const padMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.018, 18),
        new THREE.MeshStandardMaterial({
          color: 0xe7c76a,
          roughness: 0.28,
          metalness: 0.85,
          emissive: 0x3b2a05,
          emissiveIntensity: 0.25,
        }),
      );
      padMesh.position.copy(position);
      padMesh.userData.componentRef = component.ref;
      padMesh.userData.pad = pad;
      padsGroup.add(padMesh);
      padMeshes.push(padMesh);
    }
  }

  let routeIndex = 0;
  for (const connection of BOARD.connections) {
    const from = splitEndpoint(connection.from);
    const to = splitEndpoint(connection.to);
    const start = padWorld(from.ref, from.pad);
    const end = padWorld(to.ref, to.pad);
    if (!start || !end) continue;
    const net = NETS[connection.net] || { color: "#5eead4" };
    const color = new THREE.Color(net.color);
    const y = TOP_Y + 0.038 + routeIndex * 0.0012;
    start.y = y;
    end.y = y;
    const radius = 0.014 + connection.width * 0.032;
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.45,
      roughness: 0.36,
      metalness: 0.25,
      transparent: true,
      opacity: 0.95,
    });
    const segment = makeSegment(start, end, radius, material);
    if (segment) {
      segment.userData.net = connection.net;
      segment.userData.connection = connection;
      tracesGroup.add(segment);
      traceMeshes.push(segment);
    }

    const backStart = start.clone();
    const backEnd = end.clone();
    backStart.y = -TOP_Y - 0.035 - routeIndex * 0.0008;
    backEnd.y = backStart.y;
    const backMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const backSegment = makeSegment(backStart, backEnd, radius * 0.85, backMaterial);
    if (backSegment) {
      backTracesGroup.add(backSegment);
      backTraces.push(backSegment);
    }
    routeIndex += 1;
  }
  backTracesGroup.visible = false;

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const state = {
    preset: "overview",
    activeNets: [],
    xray: false,
    signals: false,
    labels: true,
    explode: 0,
    selectedRef: null,
    cameraGoal: null,
  };
  let signalDots = [];
  let visible = true;

  function setCameraGoal(position, target = new THREE.Vector3(0, 0.2, 0)) {
    state.cameraGoal = {
      position: new THREE.Vector3(...position),
      target: target.clone(),
    };
  }

  function componentNets(component) {
    const nets = new Set();
    for (const connection of BOARD.connections) {
      const from = splitEndpoint(connection.from);
      const to = splitEndpoint(connection.to);
      if (from.ref === component.ref || to.ref === component.ref) {
        nets.add(connection.net);
      }
    }
    return nets;
  }

  function applyView() {
    const active = state.activeNets;
    for (const segment of traceMeshes) {
      const isActive = active.length === 0 || active.includes(segment.userData.net);
      const material = segment.material;
      material.opacity = state.xray ? 0.55 : isActive ? 0.95 : 0.07;
      material.emissiveIntensity = isActive ? 0.5 : 0.02;
      material.depthWrite = !state.xray;
    }
    for (const group of componentGroups) {
      const component = group.userData.component;
      const nets = componentNets(component);
      const isActive =
        active.length === 0 || [...nets].some((net) => active.includes(net));
      const material = group.userData.mesh.material;
      const isSelected = state.selectedRef === component.ref;
      material.opacity = state.xray ? 0.42 : isActive ? 1 : 0.3;
      material.emissive.setHex(isSelected ? 0x0f766e : 0x000000);
      material.emissiveIntensity = isSelected ? 0.55 : 0;
      group.userData.outline.material.opacity = state.xray ? 0.25 : isActive ? 0.55 : 0.12;
    }
    for (const material of boardMaterials) {
      material.transparent = state.xray;
      material.opacity = state.xray ? 0.2 : 1;
      material.depthWrite = !state.xray;
    }
    backTracesGroup.visible = state.xray;
    for (const label of labels) label.visible = state.labels;
    rebuildSignals();
  }

  function clearSignals() {
    for (const dot of signalDots) {
      signalGroup.remove(dot.mesh);
      dot.mesh.geometry.dispose();
      dot.mesh.material.dispose();
    }
    signalDots = [];
  }

  function rebuildSignals() {
    clearSignals();
    if (!state.signals) return;
    const active = state.activeNets;
    const candidates = traceMeshes.filter((segment) => {
      return active.length === 0 || active.includes(segment.userData.net);
    });
    for (const segment of candidates.slice(0, 16)) {
      const color = new THREE.Color(
        (NETS[segment.userData.net] || { color: "#5eead4" }).color,
      );
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 10, 10),
        new THREE.MeshBasicMaterial({ color }),
      );
      signalGroup.add(dot);
      signalDots.push({
        mesh: dot,
        connection: segment.userData.connection,
        t: Math.random(),
        speed: 0.24 + Math.random() * 0.2,
      });
    }
    for (const dot of signalDots) {
      const connection = dot.connection;
      const from = splitEndpoint(connection.from);
      const to = splitEndpoint(connection.to);
      dot.a = padWorld(from.ref, from.pad);
      dot.b = padWorld(to.ref, to.pad);
      if (dot.a) dot.a.y += 0.09;
      if (dot.b) dot.b.y += 0.09;
    }
  }

  function updateSignals(dt) {
    for (const dot of signalDots) {
      if (!dot.a || !dot.b) continue;
      dot.t += dt * dot.speed;
      if (dot.t > 1) dot.t -= 1;
      dot.mesh.position.lerpVectors(dot.a, dot.b, dot.t);
    }
  }

  function renderDetails(component) {
    const detail = document.getElementById("part-detail");
    if (!detail) return;
    if (!component) {
      detail.innerHTML = `
        <p class="detail-empty">
          Click a component in the 3D view or a row in the bill of materials. Every
          part carries a reference, a role, a footprint, pads, nets, and an illustrative
          unit cost.
        </p>
        <ul class="detail-list">
          <li><span>Board size</span><b>80 x 50 mm</b></li>
          <li><span>Thickness</span><b>1.6 mm</b></li>
          <li><span>Copper layers</span><b>2</b></li>
          <li><span>Connections</span><b>24</b></li>
          <li><span>Named nets</span><b>7</b></li>
          <li><span>BOM total</span><b>$${BOM_TOTAL.toFixed(2)}</b></li>
        </ul>`;
      return;
    }
    const nets = [...componentNets(component)];
    const pads = component.pads
      .map((pad) => {
        const padNetList = padNets(component.ref, pad);
        return `<li><span>${pad}</span><b>${padNetList.join(", ") || "unassigned"}</b></li>`;
      })
      .join("");
    const chips = nets
      .map((net) => {
        const info = NETS[net] || { color: "#5eead4" };
        return `<span class="net-chip"><i style="--chip:${info.color}"></i>${net}</span>`;
      })
      .join("");
    detail.innerHTML = `
      <div class="detail-ref"><strong>${component.ref}</strong><span>${component.value}</span></div>
      <p class="detail-role">${component.role}</p>
      <ul class="detail-list">
        <li><span>Footprint</span><b>${component.footprint}</b></li>
        <li><span>Position</span><b>${component.x.toFixed(1)}, ${component.y.toFixed(1)} mm</b></li>
        <li><span>Pads</span><b>${component.pads.length}</b></li>
        <li><span>Illustrative cost</span><b>$${component.cost.toFixed(2)}</b></li>
      </ul>
      <div class="net-chips">${chips}</div>
      <ul class="detail-list" style="margin-top:12px">${pads}</ul>`;
    detail.setAttribute("aria-live", "polite");
  }

  function selectComponent(ref) {
    state.selectedRef = ref;
    applyView();
    renderDetails(ref ? componentByRef(ref) : null);
  }

  function pick(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const padHits = raycaster.intersectObjects(padMeshes, false);
    if (padHits.length) {
      selectComponent(padHits[0].object.userData.componentRef);
      return;
    }
    const componentHits = raycaster.intersectObjects(componentMeshes, false);
    if (componentHits.length) {
      selectComponent(componentHits[0].object.userData.componentRef);
      return;
    }
    selectComponent(null);
  }

  let downX = 0;
  let downY = 0;
  canvas.addEventListener("pointerdown", (event) => {
    downX = event.clientX;
    downY = event.clientY;
  });
  canvas.addEventListener("pointerup", (event) => {
    if (Math.hypot(event.clientX - downX, event.clientY - downY) < 6) {
      pick(event);
    }
  });
  canvas.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      selectComponent(null);
    }
  });

  const bomBody = document.getElementById("bom-body");
  if (bomBody) {
    for (const row of BOM) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${row.value}</td><td>${row.footprint}</td><td>${row.quantity}</td><td>$${row.unit.toFixed(2)}</td><td>$${row.total.toFixed(2)}</td>`;
      tr.tabIndex = 0;
      tr.setAttribute(
        "aria-label",
        `${row.value}, quantity ${row.quantity}, ${row.footprint}`,
      );
      const choose = () => {
        if (row.refs.length) selectComponent(row.refs[0]);
      };
      tr.addEventListener("click", choose);
      tr.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          choose();
        }
      });
      bomBody.append(tr);
    }
    const total = document.getElementById("bom-total");
    if (total) total.textContent = `$${BOM_TOTAL.toFixed(2)}`;
  }

  const presetButtons = [...document.querySelectorAll("[data-preset]")];
  for (const button of presetButtons) {
    button.addEventListener("click", () => {
      const preset = button.dataset.preset;
      const config = NET_PRESETS[preset];
      if (!config) return;
      state.preset = preset;
      state.activeNets = config.nets;
      controls.autoRotate = false;
      setCameraGoal(config.camera);
      for (const other of presetButtons) {
        const active = other === button;
        other.classList.toggle("is-active", active);
        other.setAttribute("aria-pressed", String(active));
      }
      applyView();
    });
  }

  const xrayButton = document.getElementById("toggle-xray");
  xrayButton?.addEventListener("click", () => {
    state.xray = !state.xray;
    xrayButton.setAttribute("aria-pressed", String(state.xray));
    xrayButton.classList.toggle("is-active", state.xray);
    applyView();
  });

  const signalsButton = document.getElementById("toggle-signals");
  signalsButton?.addEventListener("click", () => {
    state.signals = !state.signals;
    signalsButton.setAttribute("aria-pressed", String(state.signals));
    signalsButton.classList.toggle("is-active", state.signals);
    rebuildSignals();
  });

  const labelsButton = document.getElementById("toggle-labels");
  labelsButton?.addEventListener("click", () => {
    state.labels = !state.labels;
    labelsButton.setAttribute("aria-pressed", String(state.labels));
    labelsButton.classList.toggle("is-active", state.labels);
    for (const label of labels) label.visible = state.labels;
  });

  const explodeInput = document.getElementById("explode");
  explodeInput?.addEventListener("input", () => {
    state.explode = Number(explodeInput.value) / 100;
    for (let index = 0; index < componentGroups.length; index += 1) {
      const group = componentGroups[index];
      group.position.y =
        group.userData.baseY + state.explode * (0.5 + (index % 4) * 0.16);
    }
  });

  function resize() {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  resize();

  const intersection = new IntersectionObserver(
    (entries) => {
      visible = entries[0]?.isIntersecting ?? true;
    },
    { threshold: 0.05 },
  );
  intersection.observe(stage);

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!visible || document.hidden) return;
    if (state.cameraGoal) {
      camera.position.lerp(state.cameraGoal.position, 0.08);
      controls.target.lerp(state.cameraGoal.target, 0.08);
      if (camera.position.distanceTo(state.cameraGoal.position) < 0.02) {
        state.cameraGoal = null;
      }
    }
    controls.update();
    if (state.signals) updateSignals(dt);
    renderer.render(scene, camera);
  }

  applyView();
  renderDetails(null);
  animate();
}
