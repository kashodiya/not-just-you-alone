/**
 * Find Who Am I — Symptom Explorer (Radial Reveal)
 * 
 * User picks a feeling → reveals layers outward:
 *   Center: Symptom
 *   Ring 1: Causes (why you feel this)
 *   Ring 2: Insights (what this means)
 *   Ring 3: Actions (what you can try)
 * 
 * Each ring animates in with a gentle expand.
 */

// ─── Config ──────────────────────────────────────────────────────────────────

const COLORS = {
  symptom: '#ff6b6b',
  cause: '#feca57',
  insight: '#a29bfe',
  action: '#55efc4'
};

const RING_RADII = [0, 0.18, 0.34, 0.50]; // relative to min(w,h)/2
const NODE_RADIUS = { symptom: 28, cause: 16, insight: 14, action: 13 };
const REVEAL_DELAY = [0, 300, 700, 1100]; // ms delay for each ring

// ─── State ───────────────────────────────────────────────────────────────────

let symptoms = [], causes = [], insights = [], actions = [];
let dataById = {};

let selectedSymptom = null;
let ringNodes = []; // [{id, type, label, data, ring, angle, targetX, targetY, currentX, currentY, scale, opacity}]
let hoveredNode = null;
let selectedDetailNode = null;

let centerX = 0, centerY = 0, baseRadius = 0;
let canvasWidth = 0, canvasHeight = 0;
let animationStart = 0;

const canvas = document.getElementById('radial');
const ctx = canvas.getContext('2d');

// ─── Data Loading ────────────────────────────────────────────────────────────

async function loadData() {
  const base = '../../data/';
  const [s, c, i, a] = await Promise.all([
    fetch(base + 'symptoms.json').then(r => r.json()),
    fetch(base + 'causes.json').then(r => r.json()),
    fetch(base + 'insights.json').then(r => r.json()),
    fetch(base + 'actions.json').then(r => r.json())
  ]);
  symptoms = s;
  causes = c;
  insights = i;
  actions = a;

  // Build lookup
  s.forEach(x => dataById[x.id] = { ...x, _type: 'symptom' });
  c.forEach(x => dataById[x.id] = { ...x, _type: 'cause' });
  i.forEach(x => dataById[x.id] = { ...x, _type: 'insight' });
  a.forEach(x => dataById[x.id] = { ...x, _type: 'action' });

  buildSymptomList();
}

// ─── Symptom List ────────────────────────────────────────────────────────────

function buildSymptomList() {
  const list = document.getElementById('symptom-list');
  symptoms.forEach(s => {
    const card = document.createElement('div');
    card.className = 'symptom-card';
    card.dataset.id = s.id;
    card.innerHTML = `<h3>${s.label}</h3><p>${truncate(s.description, 80)}</p>`;
    card.addEventListener('click', () => selectSymptom(s));
    list.appendChild(card);
  });
}

function selectSymptom(symptom) {
  // Update UI
  document.querySelectorAll('.symptom-card').forEach(c => c.classList.remove('active'));
  document.querySelector(`.symptom-card[data-id="${symptom.id}"]`).classList.add('active');
  document.getElementById('prompt-overlay').style.display = 'none';
  hideDetail();

  selectedSymptom = symptom;
  buildRadial(symptom);
}

// ─── Build Radial Layout ─────────────────────────────────────────────────────

function buildRadial(symptom) {
  ringNodes = [];

  // Center node (the symptom)
  ringNodes.push({
    id: symptom.id,
    type: 'symptom',
    label: symptom.label,
    data: symptom,
    ring: 0,
    angle: 0,
    targetX: centerX,
    targetY: centerY,
    currentX: centerX,
    currentY: centerY,
    scale: 0,
    targetScale: 1,
    opacity: 0,
    targetOpacity: 1,
    revealTime: 0
  });

  // Ring 1: Causes
  const causeIds = (symptom.relatedCauses || []).filter(id => dataById[id]);
  distributeRing(causeIds, 'cause', 1);

  // Ring 2: Insights
  const insightIds = (symptom.relatedInsights || []).filter(id => dataById[id]);
  distributeRing(insightIds, 'insight', 2);

  // Ring 3: Actions — gather from causes
  const actionIds = new Set();
  causeIds.forEach(cId => {
    const c = dataById[cId];
    if (c && c.actionPointers) {
      c.actionPointers.forEach(aId => {
        if (dataById[aId]) actionIds.add(aId);
      });
    }
  });
  // Also actions that address this symptom directly
  actions.forEach(a => {
    if ((a.addressesSymptoms || []).includes(symptom.id)) {
      actionIds.add(a.id);
    }
  });
  distributeRing([...actionIds], 'action', 3);

  animationStart = performance.now();
}

function distributeRing(ids, type, ringIdx) {
  const count = ids.length;
  if (count === 0) return;

  const radius = RING_RADII[ringIdx] * baseRadius;
  const angleStep = (Math.PI * 2) / count;
  // Offset so nodes don't all start at 12 o'clock
  const angleOffset = -Math.PI / 2 + (ringIdx * 0.3);

  ids.forEach((id, i) => {
    const angle = angleOffset + i * angleStep;
    const tx = centerX + Math.cos(angle) * radius;
    const ty = centerY + Math.sin(angle) * radius;
    const entity = dataById[id];

    ringNodes.push({
      id,
      type,
      label: entity.title || entity.label || id,
      data: entity,
      ring: ringIdx,
      angle,
      targetX: tx,
      targetY: ty,
      currentX: centerX,
      currentY: centerY,
      scale: 0,
      targetScale: 1,
      opacity: 0,
      targetOpacity: 1,
      revealTime: REVEAL_DELAY[ringIdx]
    });
  });
}

// ─── Animation & Rendering ───────────────────────────────────────────────────

function loop(timestamp) {
  const elapsed = timestamp - animationStart;
  update(elapsed);
  render(elapsed);
  requestAnimationFrame(loop);
}

function update(elapsed) {
  ringNodes.forEach(node => {
    // Check if this ring has been revealed yet
    const revealed = elapsed >= node.revealTime;

    if (revealed) {
      // Ease toward target
      const ease = 0.08;
      node.currentX += (node.targetX - node.currentX) * ease;
      node.currentY += (node.targetY - node.currentY) * ease;
      node.scale += (node.targetScale - node.scale) * ease;
      node.opacity += (node.targetOpacity - node.opacity) * ease;
    }
  });
}

function render(elapsed) {
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  if (!selectedSymptom) return;

  // Draw ring guides (subtle circles)
  for (let r = 1; r <= 3; r++) {
    const radius = RING_RADII[r] * baseRadius;
    const ringRevealed = elapsed >= REVEAL_DELAY[r];
    if (!ringRevealed) continue;

    const progress = Math.min(1, (elapsed - REVEAL_DELAY[r]) / 500);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * progress, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.04 * progress})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Draw connection lines from center to ring 1, ring 1 to ring 2 etc.
  drawConnections(elapsed);

  // Draw nodes
  ringNodes.forEach(node => {
    if (node.opacity < 0.01) return;

    const r = NODE_RADIUS[node.type] * node.scale;
    const isHovered = node === hoveredNode;
    const isSelected = node === selectedDetailNode;
    const drawR = isHovered || isSelected ? r * 1.2 : r;

    ctx.globalAlpha = node.opacity;

    // Glow
    if (isHovered || isSelected) {
      ctx.beginPath();
      ctx.arc(node.currentX, node.currentY, drawR + 5, 0, Math.PI * 2);
      ctx.fillStyle = COLORS[node.type] + '30';
      ctx.fill();
    }

    // Circle
    ctx.beginPath();
    ctx.arc(node.currentX, node.currentY, drawR, 0, Math.PI * 2);
    ctx.fillStyle = COLORS[node.type];
    ctx.fill();

    // Letter inside circle
    const letters = { symptom: 'S', cause: 'C', insight: 'I', action: 'A' };
    ctx.font = `bold ${Math.round(drawR * 1.1)}px "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1a1a2e';
    ctx.fillText(letters[node.type], node.currentX, node.currentY);

    // Label
    ctx.font = '16px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#e0e0e0';

    const label = node.label;

    // For center node, put label below
    if (node.ring === 0) {
      ctx.fillText(label, node.currentX, node.currentY + drawR + 8);
    } else {
      const ly = node.currentY + drawR + 6;
      ctx.fillText(label, node.currentX, ly);
    }

    ctx.globalAlpha = 1;
  });
}

function drawConnections(elapsed) {
  // Center → Ring 1 (causes)
  const center = ringNodes[0];
  if (!center || center.opacity < 0.01) return;

  ringNodes.forEach(node => {
    if (node.ring === 0 || node.opacity < 0.05) return;

    // Find what it connects to
    let sourceNode = null;

    if (node.ring === 1) {
      sourceNode = center;
    } else if (node.ring === 2) {
      // Insights connect to center
      sourceNode = center;
    } else if (node.ring === 3) {
      // Actions connect to center
      sourceNode = center;
    }

    if (!sourceNode) return;

    ctx.globalAlpha = node.opacity * 0.2;
    ctx.beginPath();
    ctx.moveTo(sourceNode.currentX, sourceNode.currentY);
    ctx.lineTo(node.currentX, node.currentY);
    ctx.strokeStyle = COLORS[node.type];
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
  });
}

// ─── Interaction ─────────────────────────────────────────────────────────────

function getNodeAt(mx, my) {
  // Reverse so top-rendered items checked first
  for (let i = ringNodes.length - 1; i >= 0; i--) {
    const n = ringNodes[i];
    if (n.opacity < 0.3) continue;
    const dx = mx - n.currentX;
    const dy = my - n.currentY;
    const r = NODE_RADIUS[n.type] * n.scale * 1.5;
    if (dx * dx + dy * dy < r * r) return n;
  }
  return null;
}

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  const node = getNodeAt(mx, my);

  if (node !== hoveredNode) {
    hoveredNode = node;
    canvas.style.cursor = node ? 'pointer' : 'default';
  }
});

canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  const node = getNodeAt(mx, my);
  if (node) {
    selectedDetailNode = node;
    showDetail(node);
  } else {
    selectedDetailNode = null;
    hideDetail();
  }
});

canvas.addEventListener('mouseleave', () => {
  hoveredNode = null;
});

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function showTooltip(node, x, y) {
  const tt = document.getElementById('tooltip');
  const typeLabel = node.type.charAt(0).toUpperCase() + node.type.slice(1);
  tt.innerHTML = `
    <div class="tt-type" style="color:${COLORS[node.type]}">${typeLabel}</div>
    <div>${node.label}</div>
  `;
  tt.style.display = 'block';
  tt.style.left = (x + 12) + 'px';
  tt.style.top = (y - 8) + 'px';
}

function hideTooltip() {
  document.getElementById('tooltip').style.display = 'none';
}

// ─── Detail Panel ────────────────────────────────────────────────────────────

function showDetail(node) {
  const panel = document.getElementById('detail');
  const body = document.getElementById('detail-body');
  panel.style.display = 'block';

  const d = node.data;
  const color = COLORS[node.type];
  let html = `<div class="d-badge" style="background:${color}25; color:${color}">${node.type}</div>`;
  html += `<h3 style="color:${color}">${node.label}</h3>`;

  switch (node.type) {
    case 'symptom':
      html += sec('How it feels', d.description);
      html += sec('What you tell yourself', `<em>"${d.commonMisinterpretation}"</em>`);
      html += sec('What\'s actually happening', d.structuralExplanation);
      break;

    case 'cause':
      html += sec('Summary', d.summary);
      if (d.metaphor) html += sec('Metaphor', `<blockquote>${d.metaphor.text}</blockquote>`);
      html += sec('Explanation', d.explanation);
      break;

    case 'insight':
      html += sec('Core Idea', d.coreIdea);
      html += sec('Reframe', `<blockquote>${d.reframe}</blockquote>`);
      if (d.quotable) html += sec('', `<em>"${d.quotable}"</em>`);
      break;

    case 'action':
      html += sec('Description', d.description);
      html += sec('Try this', `<blockquote>${d.experiment}</blockquote>`);
      html += sec('', `Difficulty: ${d.difficulty} · ${d.timeframe}`);
      break;
  }

  body.innerHTML = html;
}

function sec(title, content) {
  if (!content) return '';
  return `<div class="d-section">${title ? `<h4>${title}</h4>` : ''}<p>${content}</p></div>`;
}

function hideDetail() {
  document.getElementById('detail').style.display = 'none';
}

document.getElementById('detail-close').addEventListener('click', () => {
  selectedDetailNode = null;
  hideDetail();
});

// ─── Resize ──────────────────────────────────────────────────────────────────

function resize() {
  const container = document.getElementById('canvas-container');
  const dpr = window.devicePixelRatio || 1;
  canvasWidth = container.clientWidth;
  canvasHeight = container.clientHeight;
  canvas.width = canvasWidth * dpr;
  canvas.height = canvasHeight * dpr;
  canvas.style.width = canvasWidth + 'px';
  canvas.style.height = canvasHeight + 'px';

  centerX = canvasWidth / 2;
  centerY = canvasHeight / 2;
  baseRadius = Math.min(canvasWidth, canvasHeight) * 0.9;

  // Rebuild layout if we have a selection
  if (selectedSymptom) {
    buildRadial(selectedSymptom);
  }
}

window.addEventListener('resize', resize);

// ─── Utilities ───────────────────────────────────────────────────────────────

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

// ─── Init ────────────────────────────────────────────────────────────────────

resize();
loadData().then(() => {
  animationStart = performance.now();
  requestAnimationFrame(loop);
});
