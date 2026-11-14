import {
  BOARD,
  GAME_LEVELS,
  NETS,
  componentByRef,
  padPosition,
  splitEndpoint,
} from "./data.js";

const STORAGE_KEY = "pcb-studio-route-scores-v1";
const BOARD_W = BOARD.widthMm;
const BOARD_H = BOARD.heightMm;

const COLORS = {
  board: "#0b2a24",
  boardEdge: "#2dd4bf",
  grid: "rgba(94, 234, 212, 0.09)",
  copper: "#c9a24d",
  copperBright: "#fbbf24",
  text: "#e6eef7",
  muted: "#94a3b8",
  dim: "#64748b",
  keepout: "#fb7185",
  line: "rgba(148, 163, 184, 0.22)",
};

const KIND_FILL = {
  ic: "#18313f",
  module: "#172a36",
  regulator: "#352a1c",
  passive: "#222d38",
};

const MONO = '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

function endpointPad(endpoint) {
  const { ref, pad } = splitEndpoint(endpoint);
  const component = componentByRef(ref);
  const position = padPosition(ref, pad);
  if (!component || !position) return null;
  return { ...position, ref, pad, endpoint };
}

function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function pathLength(points) {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += distance(points[index - 1], points[index]);
  }
  return total;
}

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return distance(point, start);
  let t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

function clampPoint(point) {
  return {
    x: Math.max(2, Math.min(BOARD_W - 2, point.x)),
    y: Math.max(2, Math.min(BOARD_H - 2, point.y)),
  };
}

function readScores() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(raw) || raw.length !== GAME_LEVELS.length) {
      return GAME_LEVELS.map(() => 0);
    }
    return raw.map((value) => {
      const score = Number(value);
      return Number.isFinite(score) ? Math.max(0, Math.min(1000, score)) : 0;
    });
  } catch {
    return GAME_LEVELS.map(() => 0);
  }
}

function writeScores(scores) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  } catch {
    /* storage can be unavailable */
  }
}

export function initGame() {
  const stage = document.getElementById("game-stage");
  const canvas = document.getElementById("game-canvas");
  if (!stage || !canvas) return;

  const ctx = canvas.getContext("2d");
  const fallback = document.getElementById("game-fallback");
  if (!ctx) {
    stage.classList.add("no-webgl");
    if (fallback) fallback.hidden = false;
    return;
  }

  const levelLabel = document.getElementById("game-level-label");
  const scoreLabel = document.getElementById("game-score-label");
  const missionTitle = document.getElementById("game-mission-title");
  const missionBrief = document.getElementById("game-mission-brief");
  const missionLesson = document.getElementById("game-mission-lesson");
  const taskList = document.getElementById("game-task-list");
  const routedLabel = document.getElementById("game-routed");
  const budgetLabel = document.getElementById("game-budget");
  const attemptsLabel = document.getElementById("game-attempts");
  const feedback = document.getElementById("game-feedback");
  const hint = document.getElementById("game-hint");
  const overlay = document.getElementById("game-overlay");
  const resultStars = document.getElementById("game-result-stars");
  const resultTitle = document.getElementById("game-result-title");
  const resultCopy = document.getElementById("game-result-copy");
  const nextButton = document.getElementById("game-next");
  const replayButton = document.getElementById("game-replay");
  const undoButton = document.getElementById("game-undo");
  const clearButton = document.getElementById("game-clear");
  const hintButton = document.getElementById("game-hint-btn");
  const voiceButton = document.getElementById("game-voice");
  const levelChips = [...document.querySelectorAll("[data-level]")];

  const states = GAME_LEVELS.map(() => ({
    routes: [],
    done: new Set(),
    bad: 0,
  }));
  const bestScores = readScores();
  const state = {
    level: 0,
    selected: 0,
    start: null,
    required: null,
    waypoints: [],
    hoverPad: null,
    pointer: null,
    keyCursor: null,
    keyboard: false,
    voice: false,
    hintTimer: 0,
  };
  const view = { width: 0, height: 0, scale: 1, ox: 0, oy: 0 };
  let drawQueued = false;

  if (feedback) feedback.setAttribute("aria-live", "polite");
  if (voiceButton && !("speechSynthesis" in window)) {
    voiceButton.disabled = true;
    voiceButton.title = "Speech is not available in this browser";
  }

  function currentLevel() {
    return GAME_LEVELS[state.level];
  }

  function currentProgress() {
    return states[state.level];
  }

  function currentTask() {
    return currentLevel().tasks[state.selected];
  }

  function totalScore() {
    return bestScores.reduce((sum, value) => sum + value, 0);
  }

  function routedLength() {
    return currentProgress().routes.reduce((sum, route) => sum + route.length, 0);
  }

  function updateScoreLabel() {
    if (scoreLabel) scoreLabel.textContent = String(totalScore()).padStart(4, "0");
  }

  function speak(text) {
    if (!state.voice || !("speechSynthesis" in window) || !text) return;
    const utterance = new SpeechSynthesisUtterance(String(text).replace(/→/g, " to "));
    utterance.rate = 1.02;
    utterance.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function setFeedback(message, tone = "info") {
    if (!feedback) return;
    feedback.className = `game-feedback is-${tone}`;
    feedback.textContent = message;
    speak(message);
  }

  function defaultHint() {
    window.clearTimeout(state.hintTimer);
    if (hint) hint.textContent = currentLevel().hint;
  }

  function updateTaskList() {
    if (!taskList) return;
    const progress = currentProgress();
    taskList.innerHTML = "";
    currentLevel().tasks.forEach((task, index) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      const done = progress.done.has(index);
      const active = index === state.selected;
      button.type = "button";
      button.className = `task${done ? " is-done" : ""}${active ? " is-active" : ""}`;
      button.dataset.task = String(index);
      button.style.setProperty("--chip", NETS[task.net]?.color || COLORS.copperBright);
      button.setAttribute("aria-pressed", String(active));
      button.innerHTML = `
        <span class="task-dot" aria-hidden="true"></span>
        <span class="task-copy">
          <strong>${task.label}</strong>
          <small>${task.from} → ${task.to} · ${task.net}</small>
        </span>
        <span class="task-hint">${done ? "Done" : active ? "Active" : "Open"}</span>`;
      button.addEventListener("click", () => selectTask(index));
      item.append(button);
      taskList.append(item);
    });
  }

  function updateUI() {
    const level = currentLevel();
    const progress = currentProgress();
    if (levelLabel) {
      levelLabel.textContent = `${String(state.level + 1).padStart(2, "0")} / ${String(GAME_LEVELS.length).padStart(2, "0")}`;
    }
    if (missionTitle) missionTitle.textContent = level.title;
    if (missionBrief) missionBrief.textContent = level.brief;
    if (missionLesson) missionLesson.innerHTML = `<strong>Why it matters.</strong> ${level.lesson}`;
    if (routedLabel) routedLabel.textContent = `${progress.done.size} / ${level.tasks.length}`;
    if (budgetLabel) budgetLabel.textContent = `${Math.round(routedLength())} / ${level.budgetMm} mm`;
    if (attemptsLabel) attemptsLabel.textContent = `${progress.bad} bad`;
    levelChips.forEach((chip) => {
      const index = Number(chip.dataset.level);
      chip.classList.toggle("is-current", index === state.level);
      chip.classList.toggle(
        "is-done",
        states[index].done.size === GAME_LEVELS[index].tasks.length,
      );
      chip.setAttribute("aria-pressed", String(index === state.level));
    });
    updateScoreLabel();
    updateTaskList();
    scheduleDraw();
  }

  function selectTask(index) {
    if (index < 0 || index >= currentLevel().tasks.length) return;
    state.selected = index;
    cancelActive();
    setFeedback(
      `${currentLevel().tasks[index].label}. ${currentLevel().hint}`,
      "info",
    );
    updateUI();
  }

  function selectLevel(index) {
    if (index < 0 || index >= GAME_LEVELS.length) return;
    state.level = index;
    state.selected = 0;
    state.keyCursor = null;
    cancelActive();
    if (overlay) overlay.hidden = true;
    defaultHint();
    setFeedback(`${currentLevel().title}. ${currentLevel().hint}`, "info");
    updateUI();
  }

  function replayAll() {
    states.forEach((progress) => {
      progress.routes = [];
      progress.done = new Set();
      progress.bad = 0;
    });
    state.level = 0;
    state.selected = 0;
    state.keyCursor = null;
    cancelActive();
    if (overlay) overlay.hidden = true;
    defaultHint();
    setFeedback("All missions reset. Start with a gold pad.", "info");
    updateUI();
  }

  function resetLevel() {
    const progress = currentProgress();
    progress.routes = [];
    progress.done = new Set();
    progress.bad = 0;
    state.selected = 0;
    state.keyCursor = null;
    cancelActive();
    if (overlay) overlay.hidden = true;
    defaultHint();
    setFeedback("Level reset. Start with a gold pad.", "info");
    updateUI();
  }

  function cancelActive(message) {
    state.start = null;
    state.required = null;
    state.waypoints = [];
    if (message) setFeedback(message, "info");
    scheduleDraw();
  }

  function taskForEndpoint(endpoint) {
    const tasks = currentLevel().tasks;
    for (let index = 0; index < tasks.length; index += 1) {
      if (currentProgress().done.has(index)) continue;
      if (tasks[index].from === endpoint || tasks[index].to === endpoint) return index;
    }
    return -1;
  }

  function beginRoute(pad) {
    const taskIndex = taskForEndpoint(pad.endpoint);
    if (taskIndex < 0) {
      setFeedback("That pad is not part of this mission. Follow the task list.", "error");
      return;
    }
    state.selected = taskIndex;
    const task = currentLevel().tasks[taskIndex];
    const startsAtFrom = pad.endpoint === task.from;
    const required = endpointPad(startsAtFrom ? task.to : task.from);
    if (!required) {
      setFeedback("The mission data for that pad is incomplete.", "error");
      return;
    }
    state.start = pad;
    state.required = required;
    state.waypoints = [];
    setFeedback(
      `Started ${task.label}. Click empty board to bend the trace, then land on ${required.endpoint}.`,
      "info",
    );
    updateUI();
  }

  function completeRoute(endPad) {
    const task = currentTask();
    if (endPad.endpoint !== state.required?.endpoint) {
      currentProgress().bad += 1;
      setFeedback(
        `Wrong pad. This trace must end at ${state.required?.endpoint || task.to}.`,
        "error",
      );
      updateUI();
      return;
    }
    const points = [state.start, ...state.waypoints, endPad];
    if (points.length < 2) return;
    const blocked = points.slice(1).map((point, index) => {
      const start = points[index];
      const keepout = currentLevel().keepouts.find(
        (item) => distanceToSegment(item, start, point) <= item.r,
      );
      return keepout;
    }).find(Boolean);
    if (blocked) {
      currentProgress().bad += 1;
      cancelActive(`Blocked by ${blocked.label}. Route around the keep-out and try again.`);
      updateUI();
      return;
    }
    const length = pathLength(points);
    const total = routedLength();
    if (total + length > currentLevel().budgetMm + 0.05) {
      currentProgress().bad += 1;
      cancelActive(
        `Over budget by ${Math.ceil(total + length - currentLevel().budgetMm)} mm. Shorten the route and try again.`,
      );
      updateUI();
      return;
    }
    currentProgress().routes.push({
      task: state.selected,
      points,
      length,
      net: task.net,
    });
    currentProgress().done.add(state.selected);
    const wasComplete = currentProgress().done.size === currentLevel().tasks.length;
    state.start = null;
    state.required = null;
    state.waypoints = [];
    if (wasComplete) {
      finishLevel();
    } else {
      const nextIndex = currentLevel().tasks.findIndex(
        (_, index) => !currentProgress().done.has(index),
      );
      state.selected = nextIndex >= 0 ? nextIndex : 0;
      setFeedback(
        `${task.label} routed in ${length.toFixed(1)} mm. Next: ${currentTask().label}.`,
        "success",
      );
    }
    updateUI();
  }

  function addWaypoint(point) {
    const inside = currentLevel().keepouts.find(
      (item) => distance(item, point) <= item.r,
    );
    if (inside) {
      currentProgress().bad += 1;
      setFeedback(`That point is inside ${inside.label}. Choose open board.`, "error");
      updateUI();
      return;
    }
    state.waypoints.push(point);
    const length = pathLength([state.start, ...state.waypoints]);
    setFeedback(
      `${length.toFixed(1)} mm so far. Keep going or land on ${state.required.endpoint}.`,
      "info",
    );
    scheduleDraw();
  }

  function handleBoardPoint(point) {
    if (!state.start) {
      setFeedback("Pick a gold pad to start a trace.", "info");
      return;
    }
    addWaypoint(clampPoint(point));
  }

  function handlePad(pad) {
    if (!state.start) {
      beginRoute(pad);
      return;
    }
    if (pad.endpoint === state.start.endpoint) {
      setFeedback("That is the starting pad. Choose the matching endpoint.", "info");
      return;
    }
    if (pad.endpoint === state.required.endpoint) {
      completeRoute(pad);
    } else {
      currentProgress().bad += 1;
      setFeedback(`This trace must end at ${state.required.endpoint}.`, "error");
      updateUI();
    }
  }

  function finishLevel() {
    const progress = currentProgress();
    const level = currentLevel();
    const length = routedLength();
    const efficiency = Math.min(1.2, length / level.budgetMm);
    const rawScore = 1000 - Math.round(efficiency * 400) - progress.bad * 60;
    const score = Math.max(100, Math.min(1000, rawScore));
    bestScores[state.level] = Math.max(bestScores[state.level], score);
    writeScores(bestScores);
    const stars = score >= 850 ? 3 : score >= 650 ? 2 : 1;
    if (resultStars) resultStars.textContent = `${"★".repeat(stars)}${"☆".repeat(3 - stars)}`;
    if (resultTitle) {
      const allDone = states.every(
        (item, index) => item.done.size === GAME_LEVELS[index].tasks.length,
      );
      resultTitle.textContent = allDone ? "All four missions clear" : "Mission complete";
    }
    if (resultCopy) {
      resultCopy.textContent = `${level.tasks.length} trace${level.tasks.length === 1 ? "" : "s"} in ${length.toFixed(1)} mm with ${progress.bad} routing violation${progress.bad === 1 ? "" : "s"}. ${level.lesson}`;
    }
    if (nextButton) {
      nextButton.textContent =
        state.level === GAME_LEVELS.length - 1 ? "Replay all" : "Next mission";
    }
    if (overlay) overlay.hidden = false;
    setFeedback("Mission complete. Review the result and continue.", "success");
    nextButton?.focus();
  }

  function choosePadAt(point) {
    if (!point) return null;
    const threshold = Math.max(1.9, 10 / view.scale);
    let best = null;
    let bestDistance = Infinity;
    for (const component of BOARD.components) {
      for (const pad of component.pads) {
        const position = padPosition(component.ref, pad);
        if (!position) continue;
        const d = distance(point, position);
        if (d <= threshold && d < bestDistance) {
          best = { ...position, ref: component.ref, pad, endpoint: `${component.ref}.${pad}` };
          bestDistance = d;
        }
      }
    }
    return best;
  }

  function eventPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left - view.ox) / view.scale,
      y: (event.clientY - rect.top - view.oy) / view.scale,
    };
  }

  function insideBoard(point) {
    return point.x >= 0 && point.y >= 0 && point.x <= BOARD_W && point.y <= BOARD_H;
  }

  function scheduleDraw() {
    if (drawQueued) return;
    drawQueued = true;
    requestAnimationFrame(() => {
      drawQueued = false;
      draw();
    });
  }

  function resize() {
    const rect = stage.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    view.width = width;
    view.height = height;
    view.scale = Math.max(
      0.1,
      Math.min((width - 48) / BOARD_W, (height - 48) / BOARD_H),
    );
    view.ox = (width - BOARD_W * view.scale) / 2;
    view.oy = (height - BOARD_H * view.scale) / 2;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function px(point) {
    return {
      x: view.ox + point.x * view.scale,
      y: view.oy + point.y * view.scale,
    };
  }

  function roundedRect(x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, width, height, r);
      return;
    }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function drawGrid() {
    ctx.save();
    roundedRect(
      view.ox,
      view.oy,
      BOARD_W * view.scale,
      BOARD_H * view.scale,
      3 * view.scale,
    );
    ctx.clip();
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    for (let x = 5; x < BOARD_W; x += 5) {
      const a = px({ x, y: 0 });
      const b = px({ x, y: BOARD_H });
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    for (let y = 5; y < BOARD_H; y += 5) {
      const a = px({ x: 0, y });
      const b = px({ x: BOARD_W, y });
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBoard() {
    const x = view.ox;
    const y = view.oy;
    const width = BOARD_W * view.scale;
    const height = BOARD_H * view.scale;
    const radius = 3 * view.scale;
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
    ctx.shadowBlur = 34;
    ctx.shadowOffsetY = 18;
    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, "#0d3a2f");
    gradient.addColorStop(0.55, COLORS.board);
    gradient.addColorStop(1, "#071b18");
    roundedRect(x, y, width, height, radius);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();

    drawGrid();

    ctx.save();
    roundedRect(x, y, width, height, radius);
    ctx.strokeStyle = "rgba(45, 212, 191, 0.42)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.strokeStyle = "rgba(251, 191, 36, 0.18)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    ctx.font = `500 ${Math.max(9, view.scale * 1.1)}px ${MONO}`;
    ctx.fillStyle = "rgba(148, 163, 184, 0.7)";
    ctx.textAlign = "right";
    ctx.fillText(
      `${BOARD.widthMm} × ${BOARD.heightMm} mm · ${BOARD.layers} layers`,
      view.ox + width - 10,
      view.oy + height - 10,
    );
    ctx.textAlign = "left";
  }

  function drawKeepouts() {
    const level = currentLevel();
    for (const keepout of level.keepouts) {
      const center = px(keepout);
      const radius = keepout.r * view.scale;
      ctx.save();
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(251, 113, 133, 0.09)";
      ctx.fill();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = "rgba(251, 113, 133, 0.7)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = `500 ${Math.max(8, view.scale * 0.92)}px ${MONO}`;
      ctx.fillStyle = "rgba(253, 164, 175, 0.9)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(keepout.label.toUpperCase(), center.x, center.y);
      ctx.restore();
    }
  }

  function drawComponents() {
    for (const component of BOARD.components) {
      const topLeft = px({ x: component.x - component.w / 2, y: component.y - component.d / 2 });
      const width = component.w * view.scale;
      const height = component.d * view.scale;
      const radius = Math.min(4 * view.scale, 8);
      ctx.save();
      roundedRect(topLeft.x, topLeft.y, width, height, radius);
      ctx.fillStyle = KIND_FILL[component.kind] || KIND_FILL.ic;
      ctx.fill();
      ctx.strokeStyle = "rgba(125, 156, 174, 0.55)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "rgba(251, 191, 36, 0.7)";
      ctx.beginPath();
      ctx.arc(
        topLeft.x + Math.max(4, view.scale * 0.6),
        topLeft.y + Math.max(4, view.scale * 0.6),
        Math.max(1.5, view.scale * 0.18),
        0,
        Math.PI * 2,
      );
      ctx.fill();

      const centerX = topLeft.x + width / 2;
      const centerY = topLeft.y + height / 2;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = COLORS.text;
      ctx.font = `600 ${Math.max(9, Math.min(13, view.scale * 1.2))}px ${MONO}`;
      ctx.fillText(component.ref, centerX, centerY - Math.max(4, view.scale * 0.5));
      if (width > 38 && height > 22) {
        ctx.fillStyle = "rgba(203, 213, 225, 0.72)";
        ctx.font = `500 ${Math.max(7, Math.min(9, view.scale * 0.8))}px ${MONO}`;
        ctx.fillText(component.value, centerX, centerY + Math.max(4, view.scale * 0.55));
      }
      ctx.restore();
    }
  }

  function drawRoutes() {
    const progress = currentProgress();
    for (const route of progress.routes) {
      const color = NETS[route.net]?.color || COLORS.copperBright;
      drawPath(route.points, color, route.net === "3V3" || route.net === "GND" ? 4.6 : 3.4);
      const start = px(route.points[0]);
      const end = px(route.points[route.points.length - 1]);
      ctx.save();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(start.x, start.y, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(end.x, end.y, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawPath(points, color, width) {
    if (!points || points.length < 2) return;
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    const first = px(points[0]);
    ctx.moveTo(first.x, first.y);
    for (let index = 1; index < points.length; index += 1) {
      const point = px(points[index]);
      ctx.lineTo(point.x, point.y);
    }
    ctx.strokeStyle = "rgba(5, 15, 20, 0.75)";
    ctx.lineWidth = width + 2.4;
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.restore();
  }

  function drawActiveRoute() {
    if (!state.start) return;
    const points = [state.start, ...state.waypoints];
    const preview = state.hoverPad || (state.pointer && insideBoard(state.pointer) ? state.pointer : null);
    if (preview) {
      drawPath([...points, preview], "rgba(251, 191, 36, 0.38)", 2.2);
    }
    drawPath(points, COLORS.copperBright, 3.8);
    for (const point of points) {
      const screen = px(point);
      ctx.save();
      ctx.fillStyle = "#0b1b22";
      ctx.strokeStyle = COLORS.copperBright;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawPads() {
    const selectedTask = currentTask();
    const targets = selectedTask
      ? new Set([selectedTask.from, selectedTask.to])
      : new Set();
    const radius = Math.max(4.2, view.scale * 1.05);
    for (const component of BOARD.components) {
      for (const pad of component.pads) {
        const position = padPosition(component.ref, pad);
        if (!position) continue;
        const screen = px(position);
        const endpoint = `${component.ref}.${pad}`;
        const target = targets.has(endpoint);
        const hovered = state.hoverPad?.endpoint === endpoint;
        ctx.save();
        if (target || hovered) {
          ctx.shadowColor = hovered ? "#fef3c7" : COLORS.copperBright;
          ctx.shadowBlur = hovered ? 18 : 11;
        }
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, radius + (hovered ? 1.4 : 0), 0, Math.PI * 2);
        ctx.fillStyle = target || hovered ? COLORS.copperBright : COLORS.copper;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = target ? "#fff7d6" : "rgba(8, 18, 24, 0.9)";
        ctx.lineWidth = target ? 1.6 : 1.2;
        ctx.stroke();
        ctx.fillStyle = "rgba(8, 20, 24, 0.5)";
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, Math.max(1.2, radius * 0.3), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    if (state.start) {
      drawPadLabel(state.start, "Start");
    }
    if (state.required) {
      drawPadLabel(state.required, "End here");
    }
    if (state.hoverPad) {
      drawPadLabel(state.hoverPad, state.hoverPad.endpoint);
    }
  }

  function drawPadLabel(pad, text) {
    const screen = px(pad);
    const above = screen.y > 32;
    ctx.save();
    ctx.font = `600 ${Math.max(8, Math.min(11, view.scale))}px ${MONO}`;
    const width = ctx.measureText(text).width + 10;
    const height = 17;
    const x = screen.x - width / 2;
    const y = above ? screen.y - 24 : screen.y + 12;
    roundedRect(x, y, width, height, 5);
    ctx.fillStyle = "rgba(6, 14, 20, 0.92)";
    ctx.fill();
    ctx.strokeStyle = "rgba(251, 191, 36, 0.42)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#fde68a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, screen.x, y + height / 2 + 0.5);
    ctx.restore();
  }

  function drawKeyboardCursor() {
    if (!state.keyboard || !state.keyCursor) return;
    const screen = px(state.keyCursor);
    ctx.save();
    ctx.strokeStyle = "rgba(94, 234, 212, 0.9)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(screen.x - 10, screen.y);
    ctx.lineTo(screen.x + 10, screen.y);
    ctx.moveTo(screen.x, screen.y - 10);
    ctx.lineTo(screen.x, screen.y + 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawHoverTooltip() {
    if (!state.hoverPad) return;
    const screen = px(state.hoverPad);
    const text = state.hoverPad.endpoint;
    ctx.save();
    ctx.font = `500 ${Math.max(9, view.scale)}px ${MONO}`;
    const width = ctx.measureText(text).width + 14;
    const height = 21;
    let x = screen.x + 13;
    let y = screen.y - 30;
    if (x + width > view.width - 8) x = screen.x - width - 13;
    if (y < 8) y = screen.y + 15;
    roundedRect(x, y, width, height, 6);
    ctx.fillStyle = "rgba(5, 12, 18, 0.94)";
    ctx.fill();
    ctx.strokeStyle = "rgba(148, 163, 184, 0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + width / 2, y + height / 2 + 0.5);
    ctx.restore();
  }

  function draw() {
    const { width, height } = view;
    ctx.clearRect(0, 0, width, height);
    drawBoard();
    drawKeepouts();
    drawComponents();
    drawRoutes();
    drawActiveRoute();
    drawPads();
    drawKeyboardCursor();
    drawHoverTooltip();
  }

  canvas.addEventListener("pointermove", (event) => {
    const point = eventPoint(event);
    state.pointer = point;
    state.hoverPad = insideBoard(point) ? choosePadAt(point) : null;
    canvas.style.cursor = state.hoverPad ? "pointer" : "crosshair";
    scheduleDraw();
  });

  canvas.addEventListener("pointerleave", () => {
    state.pointer = null;
    state.hoverPad = null;
    scheduleDraw();
  });

  canvas.addEventListener("click", (event) => {
    if (overlay && !overlay.hidden) return;
    const point = eventPoint(event);
    if (!insideBoard(point)) {
      setFeedback("Keep the route on the board.", "info");
      return;
    }
    const pad = choosePadAt(point);
    if (pad) {
      handlePad(pad);
    } else {
      handleBoardPoint(point);
    }
    scheduleDraw();
  });

  canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    if (state.start) cancelActive("Route cancelled.");
  });

  canvas.addEventListener("focus", () => {
    state.keyboard = true;
    if (!state.keyCursor) {
      const start = endpointPad(currentTask()?.from) || { x: BOARD_W / 2, y: BOARD_H / 2 };
      state.keyCursor = { x: start.x, y: start.y };
    }
    scheduleDraw();
  });

  canvas.addEventListener("blur", () => {
    state.keyboard = false;
    scheduleDraw();
  });

  canvas.addEventListener("keydown", (event) => {
    if (overlay && !overlay.hidden) {
      if (event.key === "Escape") {
        overlay.hidden = true;
        setFeedback("Mission complete. Choose a level or clear the route to replay.", "info");
      }
      return;
    }
    const step = event.shiftKey ? 5 : 2;
    if (!state.keyCursor) state.keyCursor = { x: BOARD_W / 2, y: BOARD_H / 2 };
    if (event.key.startsWith("Arrow")) {
      event.preventDefault();
      const next = { ...state.keyCursor };
      if (event.key === "ArrowLeft") next.x -= step;
      if (event.key === "ArrowRight") next.x += step;
      if (event.key === "ArrowUp") next.y -= step;
      if (event.key === "ArrowDown") next.y += step;
      state.keyCursor = clampPoint(next);
      scheduleDraw();
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const pad = choosePadAt(state.keyCursor);
      if (pad) {
        handlePad(pad);
      } else {
        handleBoardPoint(state.keyCursor);
      }
      scheduleDraw();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancelActive("Route cancelled.");
    }
  });

  levelChips.forEach((chip) => {
    chip.addEventListener("click", () => selectLevel(Number(chip.dataset.level)));
  });

  undoButton?.addEventListener("click", () => {
    if (state.start) {
      if (state.waypoints.length) {
        state.waypoints.pop();
        setFeedback("Last bend removed.", "info");
      } else {
        cancelActive("Route cancelled.");
      }
      scheduleDraw();
      return;
    }
    const progress = currentProgress();
    const route = progress.routes.pop();
    if (route) {
      progress.done.delete(route.task);
      const index = currentLevel().tasks.findIndex(
        (_, taskIndex) => !progress.done.has(taskIndex),
      );
      state.selected = index >= 0 ? index : 0;
      setFeedback("Last routed trace removed.", "info");
      updateUI();
    } else {
      setFeedback("Nothing to undo.", "info");
    }
  });

  clearButton?.addEventListener("click", () => {
    if (state.start) {
      cancelActive("Route cleared.");
      return;
    }
    resetLevel();
  });

  hintButton?.addEventListener("click", () => {
    if (!hint) return;
    window.clearTimeout(state.hintTimer);
    hint.textContent = `Hint: ${currentLevel().hint} Why: ${currentLevel().lesson}`;
    state.hintTimer = window.setTimeout(defaultHint, 9000);
  });

  voiceButton?.addEventListener("click", () => {
    if (!("speechSynthesis" in window)) return;
    state.voice = !state.voice;
    voiceButton.setAttribute("aria-pressed", String(state.voice));
    voiceButton.classList.toggle("is-active", state.voice);
    if (state.voice) speak("Voice guidance on.");
    else window.speechSynthesis.cancel();
  });

  nextButton?.addEventListener("click", () => {
    if (state.level === GAME_LEVELS.length - 1) replayAll();
    else selectLevel(state.level + 1);
  });

  replayButton?.addEventListener("click", resetLevel);

  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  window.addEventListener("resize", resize);
  if (document.fonts?.ready) document.fonts.ready.then(scheduleDraw);

  defaultHint();
  updateUI();
  resize();
}
