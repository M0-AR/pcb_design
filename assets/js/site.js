import { CONCEPTS } from "./data.js";

const LEARNED_KEY = "pcb-studio-learned-v1";
const SVG_NS = "http://www.w3.org/2000/svg";

const SHORT_LABELS = {
  anatomy: "Anatomy",
  stackup: "Stackup",
  traces: "Traces",
  vias: "Vias",
  decoupling: "Decoupling",
  grounding: "Ground",
  differential: "Diff pair",
  impedance: "Impedance",
  length: "Length",
  emc: "EMC",
  thermal: "Thermal",
  dfm: "DFM",
};

const CATEGORY_COLORS = {
  Foundations: "#5eead4",
  Layout: "#fbbf24",
  Power: "#a3e635",
  "High-speed": "#c084fc",
  Manufacturing: "#f472b6",
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function readLearned() {
  try {
    const raw = JSON.parse(localStorage.getItem(LEARNED_KEY) || "[]");
    return new Set(Array.isArray(raw) ? raw.filter((id) => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

function writeLearned(learned) {
  try {
    localStorage.setItem(LEARNED_KEY, JSON.stringify([...learned]));
  } catch {
    /* Storage can be unavailable in private or embedded contexts. */
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function initSite() {
  document.body.classList.add("js-ready");
  initNavigation();
  initScrollUI();
  initReveal();
  initYear();
  initCopy();
  initRoi();
  initConceptStudio();
}

function initNavigation() {
  const header = document.querySelector(".site-header");
  const toggle = document.getElementById("nav-toggle");
  const links = document.getElementById("nav-links");
  if (!toggle || !links) return;

  const setOpen = (open) => {
    links.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  };

  toggle.addEventListener("click", () => {
    setOpen(!links.classList.contains("is-open"));
  });

  links.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setOpen(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });

  document.addEventListener("click", (event) => {
    if (!links.classList.contains("is-open")) return;
    if (header && !header.contains(event.target)) setOpen(false);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 860) setOpen(false);
  });
}

function initScrollUI() {
  const header = document.querySelector(".site-header");
  const progress = document.getElementById("scroll-progress");
  const links = [...document.querySelectorAll("#nav-links a")];
  const targets = links
    .map((link) => {
      const href = link.getAttribute("href") || "";
      return href.startsWith("#") ? document.querySelector(href) : null;
    })
    .filter(Boolean);

  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? window.scrollY / max : 0;
    if (progress) progress.style.transform = `scaleX(${clamp(ratio, 0, 1)})`;
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 24);

    let current = null;
    const threshold = window.innerHeight * 0.36;
    for (const target of targets) {
      if (target.getBoundingClientRect().top <= threshold) current = target;
    }
    links.forEach((link) => {
      const active = current && link.getAttribute("href") === `#${current.id}`;
      link.classList.toggle("is-active", Boolean(active));
    });
  };

  let queued = false;
  window.addEventListener(
    "scroll",
    () => {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(() => {
        queued = false;
        update();
      });
    },
    { passive: true },
  );
  window.addEventListener("resize", update);
  update();
}

function initReveal() {
  const items = [...document.querySelectorAll(".reveal")];
  if (!items.length) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || !("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.08, rootMargin: "0px 0px -6% 0px" },
  );
  items.forEach((item) => observer.observe(item));
}

function initYear() {
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
}

function initCopy() {
  const button = document.getElementById("copy-button");
  if (!button) return;
  const source =
    button.dataset.copy || document.getElementById("copy-install")?.textContent || "";

  button.addEventListener("click", async () => {
    let copied = false;
    try {
      await navigator.clipboard.writeText(source);
      copied = true;
    } catch {
      copied = fallbackCopy(source);
    }
    if (!copied) return;
    const label = button.textContent;
    button.textContent = "Copied";
    button.classList.add("is-copied");
    window.setTimeout(() => {
      button.textContent = label;
      button.classList.remove("is-copied");
    }, 1600);
  });
}

function fallbackCopy(text) {
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.append(field);
  field.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  field.remove();
  return copied;
}

function initRoi() {
  const ids = ["roi-team", "roi-hours", "roi-rate", "roi-reduction", "roi-cost"];
  const inputs = ids.map((id) => document.getElementById(id)).filter(Boolean);
  const hoursOut = document.getElementById("roi-hours-out");
  const savingsOut = document.getElementById("roi-savings-out");
  const paybackOut = document.getElementById("roi-payback-out");
  if (!inputs.length || !hoursOut || !savingsOut || !paybackOut) return;

  const number = (id, fallback) => {
    const value = Number.parseFloat(document.getElementById(id)?.value ?? "");
    return Number.isFinite(value) ? value : fallback;
  };
  const format = new Intl.NumberFormat("en-US");

  const update = () => {
    const team = clamp(number("roi-team", 6), 1, 500);
    const hours = clamp(number("roi-hours", 5), 0, 40);
    const rate = clamp(number("roi-rate", 55), 1, 500);
    const reduction = clamp(number("roi-reduction", 25), 0, 80);
    const cost = clamp(number("roi-cost", 6000), 0, 100000);

    const hoursSaved = Math.round(team * hours * 46 * (reduction / 100));
    const savings = Math.round(hoursSaved * rate);
    const months = savings > 0 ? (cost / savings) * 12 : 0;

    hoursOut.textContent = format.format(hoursSaved);
    savingsOut.textContent = `$${format.format(savings)}`;
    if (savings <= 0) {
      paybackOut.textContent = "n/a";
    } else if (cost <= 0) {
      paybackOut.textContent = "Immediate";
    } else if (months < 24) {
      paybackOut.textContent = `${months.toFixed(1)} mo`;
    } else {
      paybackOut.textContent = `${(months / 12).toFixed(1)} yr`;
    }
  };

  inputs.forEach((input) => {
    input.addEventListener("input", update);
    input.addEventListener("change", update);
  });
  update();
}

function initConceptStudio() {
  const grid = document.getElementById("concept-grid");
  const search = document.getElementById("concept-search");
  const filters = document.getElementById("concept-filters");
  const progressText = document.getElementById("learn-progress-text");
  const progressFill = document.getElementById("learn-progress-fill");
  const conceptCount = document.getElementById("concept-count");
  if (!grid) return;

  const state = { query: "", category: "All", learned: readLearned() };

  const cardById = new Map();
  for (const concept of CONCEPTS) {
    const card = document.createElement("article");
    card.className = "concept-card";
    card.id = `concept-${concept.id}`;
    card.dataset.category = concept.category;
    card.innerHTML = `
      <div class="concept-top">
        <span class="concept-category">${escapeHtml(concept.category)}</span>
        <span class="concept-level">${escapeHtml(concept.level)}</span>
      </div>
      <h3>${escapeHtml(concept.title)}</h3>
      <p class="concept-summary">${escapeHtml(concept.summary)}</p>
      <div class="concept-tags">${concept.tags
        .map((tag) => `<span>${escapeHtml(tag)}</span>`)
        .join("")}</div>
      <details class="concept-details">
        <summary>Rule and pro note</summary>
        <div class="concept-detail"><b>Rule.</b> ${escapeHtml(concept.rule)}</div>
        <div class="concept-detail"><b>Pro note.</b> ${escapeHtml(concept.pro)}</div>
      </details>
      <div class="concept-actions">
        <label class="learned-toggle">
          <input type="checkbox" data-learned="${escapeHtml(concept.id)}" />
          I can explain this
        </label>
        <span class="concept-level">${String(CONCEPTS.indexOf(concept) + 1).padStart(2, "0")}</span>
      </div>
    `;
    const checkbox = card.querySelector("input[data-learned]");
    checkbox.checked = state.learned.has(concept.id);
    checkbox.addEventListener("change", () => {
      setLearned(concept.id, checkbox.checked);
    });
    card.classList.toggle("is-learned", checkbox.checked);
    grid.append(card);
    cardById.set(concept.id, card);
  }

  const matches = (concept) => {
    const inCategory = state.category === "All" || concept.category === state.category;
    if (!inCategory) return false;
    if (!state.query) return true;
    const haystack = [
      concept.title,
      concept.category,
      concept.level,
      concept.summary,
      concept.rule,
      concept.pro,
      ...concept.tags,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(state.query);
  };

  const applyFilters = () => {
    let visible = 0;
    for (const concept of CONCEPTS) {
      const show = matches(concept);
      const card = cardById.get(concept.id);
      if (!card) continue;
      card.hidden = !show;
      if (show) visible += 1;
    }
    if (conceptCount) {
      conceptCount.textContent = `${visible} card${visible === 1 ? "" : "s"}`;
    }
  };

  const updateProgress = () => {
    const total = CONCEPTS.length;
    const learned = CONCEPTS.filter((concept) => state.learned.has(concept.id)).length;
    if (progressText) {
      progressText.textContent = `${learned} of ${total} learned`;
    }
    if (progressFill) {
      progressFill.style.width = `${total > 0 ? (learned / total) * 100 : 0}%`;
    }
    const mapProgress = document.getElementById("map-progress");
    if (mapProgress) mapProgress.textContent = `${learned} / ${total}`;
    if (search) {
      search.setAttribute(
        "placeholder",
        learned === total
          ? "All twelve learned. Search to revisit a topic."
          : "Search: return path, impedance, DFM, decoupling...",
      );
    }
  };

  const renderMap = () => {
    const svg = document.getElementById("concept-svg");
    if (!svg) return;
    svg.replaceChildren();
    const center = { x: 360, y: 170 };
    const rx = 276;
    const ry = 118;

    const orbit = document.createElementNS(SVG_NS, "ellipse");
    orbit.setAttribute("cx", center.x);
    orbit.setAttribute("cy", center.y);
    orbit.setAttribute("rx", rx);
    orbit.setAttribute("ry", ry);
    orbit.setAttribute("fill", "none");
    orbit.setAttribute("stroke", "#94a3b8");
    orbit.setAttribute("stroke-opacity", "0.12");
    orbit.setAttribute("stroke-dasharray", "2 7");
    svg.append(orbit);

    CONCEPTS.forEach((concept, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / CONCEPTS.length;
      const x = center.x + Math.cos(angle) * rx;
      const y = center.y + Math.sin(angle) * ry;
      const color = CATEGORY_COLORS[concept.category] || "#5eead4";
      const learned = state.learned.has(concept.id);

      const link = document.createElementNS(SVG_NS, "line");
      link.setAttribute("x1", center.x);
      link.setAttribute("y1", center.y);
      link.setAttribute("x2", x);
      link.setAttribute("y2", y);
      link.setAttribute("stroke", color);
      link.setAttribute("class", `map-link${learned ? " is-learned" : ""}`);
      svg.append(link);

      const group = document.createElementNS(SVG_NS, "g");
      group.setAttribute("class", `map-node${learned ? " is-learned" : ""}`);
      group.setAttribute("tabindex", "0");
      group.setAttribute("role", "button");
      group.setAttribute("aria-label", `${concept.title}. ${learned ? "Learned." : "Not yet learned."} Open card.`);

      const title = document.createElementNS(SVG_NS, "title");
      title.textContent = `${concept.title} — ${concept.category}`;
      group.append(title);

      const circle = document.createElementNS(SVG_NS, "circle");
      circle.setAttribute("cx", x);
      circle.setAttribute("cy", y);
      circle.setAttribute("r", learned ? "8" : "6.5");
      circle.setAttribute("fill", learned ? color : "#0b1520");
      circle.setAttribute("stroke", color);
      circle.setAttribute("stroke-width", learned ? "2" : "1.2");
      circle.setAttribute("stroke-opacity", learned ? "1" : "0.7");
      group.append(circle);

      const label = document.createElementNS(SVG_NS, "text");
      const anchor = x < center.x - 30 ? "end" : x > center.x + 30 ? "start" : "middle";
      const dx = anchor === "end" ? -13 : anchor === "start" ? 13 : 0;
      const dy = anchor === "middle" ? (y < center.y ? -14 : 20) : 4;
      label.setAttribute("x", x + dx);
      label.setAttribute("y", y + dy);
      label.setAttribute("text-anchor", anchor);
      label.textContent = SHORT_LABELS[concept.id] || concept.title;
      group.append(label);

      const open = () => scrollToConcept(concept.id);
      group.addEventListener("click", open);
      group.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        open();
      });
      svg.append(group);
    });

    const centerGroup = document.createElementNS(SVG_NS, "g");
    centerGroup.setAttribute("class", "map-center");
    const centerCircle = document.createElementNS(SVG_NS, "circle");
    centerCircle.setAttribute("cx", center.x);
    centerCircle.setAttribute("cy", center.y);
    centerCircle.setAttribute("r", "26");
    const centerText = document.createElementNS(SVG_NS, "text");
    centerText.setAttribute("x", center.x);
    centerText.setAttribute("y", center.y + 3);
    centerText.setAttribute("text-anchor", "middle");
    centerText.textContent = "BOARD";
    centerGroup.append(centerCircle, centerText);
    svg.append(centerGroup);
  };

  const scrollToConcept = (id) => {
    const card = cardById.get(id);
    if (!card) return;
    if (card.hidden) {
      state.query = "";
      state.category = "All";
      if (search) search.value = "";
      document.querySelectorAll("#concept-filters .chip").forEach((chip) => {
        const active = chip.dataset.category === "All";
        chip.classList.toggle("is-active", active);
        chip.setAttribute("aria-pressed", String(active));
      });
      applyFilters();
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    card.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    card.classList.remove("is-flash");
    void card.offsetWidth;
    card.classList.add("is-flash");
    window.setTimeout(() => card.classList.remove("is-flash"), 1300);
  };

  const setLearned = (id, learned) => {
    if (learned) state.learned.add(id);
    else state.learned.delete(id);
    writeLearned(state.learned);
    const card = cardById.get(id);
    if (card) {
      card.classList.toggle("is-learned", learned);
      const checkbox = card.querySelector("input[data-learned]");
      if (checkbox) checkbox.checked = learned;
    }
    updateProgress();
    renderMap();
  };

  if (search) {
    search.addEventListener("input", () => {
      state.query = search.value.trim().toLowerCase();
      applyFilters();
    });
  }

  if (filters) {
    filters.querySelectorAll(".chip").forEach((chip) => {
      chip.setAttribute("aria-pressed", String(chip.classList.contains("is-active")));
      chip.addEventListener("click", () => {
        state.category = chip.dataset.category || "All";
        filters.querySelectorAll(".chip").forEach((item) => {
          const active = item === chip;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-pressed", String(active));
        });
        applyFilters();
      });
    });
  }

  applyFilters();
  updateProgress();
  renderMap();
}
