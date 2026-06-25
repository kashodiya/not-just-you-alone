/**
 * Find Who Am I — Sankey / River Diagram
 * 
 * Shows flow: Causes → Symptoms → Actions
 * Band thickness = number of shared connections
 */

// ─── Config ──────────────────────────────────────────────────────────────────

const COLORS = {
  cause: '#feca57',
  symptom: '#ff6b6b',
  action: '#55efc4'
};

const COLUMN_X = [0.15, 0.5, 0.85]; // relative x positions for 3 columns
const NODE_PAD = 6;
const NODE_WIDTH = 18;
const MIN_BAND_WIDTH = 1.5;
const BAND_SCALE = 3;

// ─── State ───────────────────────────────────────────────────────────────────

let causes = [], symptoms = [], actions = [];
let causeNodes = [], symptomNodes = [], actionNodes = [];
let flowsCauseSymptom = []; // { source, target, weight }
let flowsSymptomAction = [];
let allNodes = [];

let hoveredNode = null;
let hoveredFlow = null;
let selectedNode = null;
let canvasWidth = 0, canvasHeight = 0;

const canvas = document.getElementById('sankey');
const ctx = canvas.getContext('2d');

// ─── Data Loading ────────────────────────────────────────────────────────────

async function loadData() {
  const base = '../../data/';
  const [s, c, a] = await Promise.all([
    fetch(base + 'symptoms.json').then(r => r.json()),
    fetch(base + 'causes.json').then(r => r.json()),
    fetch(base + 'actions.json').then(r => r.json())
  ]);
  symptoms = s;
  causes = c;
  actions = a;
  buildSankey();
}

// ─── Build Layout ────────────────────────────────────────────────────────────

function buildSankey() {
  // Build flows: cause → symptom
  causes.forEach(c => {
    (c.symptoms || []).forEach(sId => {
      flowsCauseSymptom.push({ source: c.id, target: sId });
    });
  });

  // Also use symptom.relatedCauses for completeness
  symptoms.forEach(s => {
    (s.relatedCauses || []).forEach(cId => {
      const exists = flowsCauseSymptom.some(f => f.source === cId && f.target === s.id);
      if (!exists) flowsCauseSymptom.push({ source: cId, target: s.id });
    });
  });

  // Build flows: symptom → action
  actions.forEach(a => {
    (a.addressesSymptoms || []).forEach(sId => {
      flowsSymptomAction.push({ source: sId, target: a.id });
    });
  });

  // Count connections per node to determine size
  const causeConnCount = {};
  const symptomConnCount = {};
  const actionConnCount = {};

  flowsCauseSymptom.forEach(f => {
    causeConnCount[f.source] = (causeConnCount[f.source] || 0) + 1;
    symptomConnCount[f.target] = (symptomConnCount[f.target] || 0) + 1;
  });

  flowsSymptomAction.forEach(f => {
    symptomConnCount[f.source] = (symptomConnCount[f.source] || 0) + 1;
    actionConnCount[f.target] = (actionConnCount[f.target] || 0) + 1;
  });

  // Sort by connection count (most connected at top)
  const sortedCauses = [...causes].sort((a, b) => (causeConnCount[b.id] || 0) - (causeConnCount[a.id] || 0));
  const sortedSymptoms = [...symptoms].sort((a, b) => (symptomConnCount[b.id] || 0) - (symptomConnCount[a.id] || 0));
  const sortedActions = [...actions].sort((a, b) => (actionConnCount[b.id] || 0) - (actionConnCount[a.id] || 0));

  // Create positioned nodes
  causeNodes = layoutColumn(sortedCauses, 0, 'cause', causeConnCount);
  symptomNodes = layoutColumn(sortedSymptoms, 1, 'symptom', symptomConnCount);
  actionNodes = layoutColumn(sortedActions, 2, 'action', actionConnCount);

  allNodes = [...causeNodes, ...symptomNodes, ...actionNodes];
}

function layoutColumn(items, colIdx, type, connCounts) {
  const nodes = [];
  const margin = 80;
  const availHeight = canvasHeight - margin * 2;

  // Height proportional to connections
  const totalConns = items.reduce((sum, item) => sum + Math.max(1, connCounts[item.id] || 1), 0);
  const totalPad = (items.length - 1) * NODE_PAD;
  const usableHeight = availHeight - totalPad;

  let y = margin;

  items.forEach(item => {
    const conns = Math.max(1, connCounts[item.id] || 1);
    const h = Math.max(16, (conns / totalConns) * usableHeight);

    nodes.push({
      id: item.id,
      type,
      label: item.label || item.title,
      data: item,
      x: COLUMN_X[colIdx] * canvasWidth,
      y: y,
      w: NODE_WIDTH,
      h: h,
      connections: conns,
      color: COLORS[type]
    });

    y += h + NODE_PAD;
  });

  return nodes;
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function render() {
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  const nodeById = {};
  allNodes.forEach(n => nodeById[n.id] = n);

  // Track source/target offsets for band positioning
  const sourceOffsets = {};
  const targetOffsets = {};
  allNodes.forEach(n => { sourceOffsets[n.id] = 0; targetOffsets[n.id] = 0; });

  const hasHighlight = selectedNode || hoveredNode;

  // Draw flows: cause → symptom
  drawFlows(flowsCauseSymptom, nodeById, sourceOffsets, targetOffsets, hasHighlight);

  // Draw flows: symptom → action
  drawFlows(flowsSymptomAction, nodeById, sourceOffsets, targetOffsets, hasHighlight);

  // Draw nodes
  allNodes.forEach(n => {
    let alpha = 1;
    if (hasHighlight) {
      const hl = selectedNode || hoveredNode;
      if (n.id === hl.id || isConnectedTo(n.id, hl.id)) {
        alpha = 1;
      } else {
        alpha = 0.15;
      }
    }

    ctx.globalAlpha = alpha;
    ctx.fillStyle = n.color;

    // Rounded rect
    roundRect(ctx, n.x - n.w / 2, n.y, n.w, n.h, 4);
    ctx.fill();

    // Label
    ctx.fillStyle = '#e0e0e0';
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.textBaseline = 'middle';

    const labelY = n.y + n.h / 2;
    const maxLabelWidth = (COLUMN_X[1] - COLUMN_X[0]) * canvasWidth * 0.5;

    if (n.type === 'cause') {
      ctx.textAlign = 'right';
      ctx.fillText(truncate(n.label, 30), n.x - n.w / 2 - 8, labelY);
    } else if (n.type === 'action') {
      ctx.textAlign = 'left';
      ctx.fillText(truncate(n.label, 30), n.x + n.w / 2 + 8, labelY);
    } else {
      // symptoms - alternate sides to avoid overlap
      ctx.textAlign = 'center';
      ctx.fillText(truncate(n.label, 22), n.x, n.y - 8);
    }

    ctx.globalAlpha = 1;
  });

  // Column headers
  ctx.globalAlpha = 0.4;
  ctx.font = '11px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#888';
  ctx.fillText('CAUSES', COLUMN_X[0] * canvasWidth, 20);
  ctx.fillText('SYMPTOMS', COLUMN_X[1] * canvasWidth, 20);
  ctx.fillText('ACTIONS', COLUMN_X[2] * canvasWidth, 20);
  ctx.globalAlpha = 1;
}

function drawFlows(flows, nodeById, sourceOffsets, targetOffsets, hasHighlight) {
  flows.forEach(f => {
    const src = nodeById[f.source];
    const tgt = nodeById[f.target];
    if (!src || !tgt) return;

    const bandWidth = MIN_BAND_WIDTH + BAND_SCALE;

    const sy = src.y + sourceOffsets[src.id] + bandWidth / 2;
    const ty = tgt.y + targetOffsets[tgt.id] + bandWidth / 2;

    sourceOffsets[src.id] += bandWidth + 0.5;
    targetOffsets[tgt.id] += bandWidth + 0.5;

    let alpha = 0.2;
    if (hasHighlight) {
      const hl = selectedNode || hoveredNode;
      if (f.source === hl.id || f.target === hl.id) {
        alpha = 0.6;
      } else {
        alpha = 0.03;
      }
    }

    // Gradient from source color to target color
    const sx = src.x + src.w / 2;
    const tx = tgt.x - tgt.w / 2;
    const grad = ctx.createLinearGradient(sx, 0, tx, 0);
    grad.addColorStop(0, src.color);
    grad.addColorStop(1, tgt.color);

    ctx.globalAlpha = alpha;
    ctx.strokeStyle = grad;
    ctx.lineWidth = bandWidth;
    ctx.beginPath();

    // Bezier curve
    const cpx = (sx + tx) / 2;
    ctx.moveTo(sx, sy);
    ctx.bezierCurveTo(cpx, sy, cpx, ty, tx, ty);
    ctx.stroke();

    ctx.globalAlpha = 1;
  });
}

function isConnectedTo(nodeId, highlightId) {
  return flowsCauseSymptom.some(f =>
    (f.source === highlightId && f.target === nodeId) ||
    (f.target === highlightId && f.source === nodeId)
  ) || flowsSymptomAction.some(f =>
    (f.source === highlightId && f.target === nodeId) ||
    (f.target === highlightId && f.source === nodeId)
  );
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

// ─── Interaction ─────────────────────────────────────────────────────────────

function getNodeAt(mx, my) {
  for (const n of allNodes) {
    if (mx >= n.x - n.w / 2 - 5 && mx <= n.x + n.w / 2 + 5 &&
        my >= n.y && my <= n.y + n.h) {
      return n;
    }
  }
  // Also check label areas for causes/actions
  for (const n of allNodes) {
    const labelY = n.y + n.h / 2;
    if (my >= labelY - 10 && my <= labelY + 10) {
      if (n.type === 'cause' && mx >= n.x - 200 && mx <= n.x - n.w / 2) return n;
      if (n.type === 'action' && mx >= n.x + n.w / 2 && mx <= n.x + 200) return n;
    }
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

    if (node && !selectedNode) {
      showTooltip(node, e.clientX, e.clientY);
    } else if (!node && !selectedNode) {
      hideTooltip();
    }
    render();
  }

  if (hoveredNode) {
    updateTooltipPos(e.clientX, e.clientY);
  }
});

canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  const node = getNodeAt(mx, my);
  if (node) {
    selectedNode = node;
    showDetail(node);
    hideTooltip();
  } else {
    selectedNode = null;
    hideDetail();
  }
  render();
});

canvas.addEventListener('mouseleave', () => {
  hoveredNode = null;
  hideTooltip();
  render();
});

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function showTooltip(node, x, y) {
  const tt = document.getElementById('tooltip');
  const typeLabel = node.type.charAt(0).toUpperCase() + node.type.slice(1);
  tt.innerHTML = `
    <div class="tt-type" style="color:${node.color}">${typeLabel}</div>
    <div class="tt-title">${node.label}</div>
    <div class="tt-desc">${node.connections} connections</div>
  `;
  tt.style.display = 'block';
  updateTooltipPos(x, y);
}

function updateTooltipPos(x, y) {
  const tt = document.getElementById('tooltip');
  tt.style.left = (x + 14) + 'px';
  tt.style.top = (y - 10) + 'px';
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
  let html = `
    <div class="detail-badge" style="background:${node.color}30; color:${node.color}">${node.type}</div>
    <h3 style="color:${node.color}">${node.label}</h3>
  `;

  if (node.type === 'cause') {
    html += `<p>${d.summary || ''}</p>`;
    if (d.metaphor) html += `<p style="font-style:italic;color:#888">"${d.metaphor.text}"</p>`;
    html += flowSection('Produces symptoms', d.symptoms, 'symptom');
    html += flowSection('Action pointers', d.actionPointers, 'action');
  } else if (node.type === 'symptom') {
    html += `<p>${d.description || ''}</p>`;
    html += `<p style="color:#ff6b6b80;font-style:italic">"${d.commonMisinterpretation}"</p>`;
    html += flowSection('Caused by', d.relatedCauses, 'cause');
    const relActions = actions.filter(a => (a.addressesSymptoms || []).includes(node.id));
    if (relActions.length) {
      html += flowSection('Actions', relActions.map(a => a.id), 'action');
    }
  } else if (node.type === 'action') {
    html += `<p>${d.description || ''}</p>`;
    if (d.experiment) html += `<p style="border-left:2px solid #55efc4; padding-left:10px;color:#aaa">${d.experiment}</p>`;
    html += flowSection('Addresses symptoms', d.addressesSymptoms, 'symptom');
    html += flowSection('Addresses causes', d.addressesCauses, 'cause');
  }

  body.innerHTML = html;
}

function flowSection(title, ids, type) {
  if (!ids || ids.length === 0) return '';
  const nodeById = {};
  allNodes.forEach(n => nodeById[n.id] = n);

  const items = ids
    .filter(id => nodeById[id])
    .map(id => {
      const n = nodeById[id];
      return `<span class="flow-item" style="background:${COLORS[type]}20; color:${COLORS[type]}">${n.label}</span>`;
    })
    .join('');

  if (!items) return '';
  return `<div class="flow-section"><h4>${title}</h4>${items}</div>`;
}

function hideDetail() {
  document.getElementById('detail').style.display = 'none';
}

document.getElementById('detail-close').addEventListener('click', () => {
  selectedNode = null;
  hideDetail();
  render();
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

  // Rebuild layout with new dimensions
  if (causes.length) {
    causeNodes = []; symptomNodes = []; actionNodes = []; allNodes = [];
    flowsCauseSymptom = []; flowsSymptomAction = [];
    buildSankey();
    render();
  }
}

window.addEventListener('resize', resize);

// ─── Init ────────────────────────────────────────────────────────────────────

resize();
loadData().then(() => {
  render();
});
