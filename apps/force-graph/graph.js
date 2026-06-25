/**
 * Find Who Am I — Interactive Knowledge Graph Visualization
 * 
 * A force-directed graph showing relationships between:
 * Symptoms, Causes, Insights, Patterns, Actions, and Adjacent Crises
 */

// ─── Configuration ───────────────────────────────────────────────────────────

const CONFIG = {
  colors: {
    symptom: '#ff6b6b',
    cause: '#feca57',
    insight: '#48dbfb',
    pattern: '#ff9ff3',
    action: '#55efc4',
    crisis: '#a29bfe'
  },
  sizes: {
    symptom: 18,
    cause: 16,
    insight: 14,
    pattern: 20,
    action: 12,
    crisis: 15
  },
  physics: {
    repulsion: 800,
    attraction: 0.005,
    damping: 0.92,
    centerGravity: 0.01,
    maxVelocity: 8
  },
  rendering: {
    linkOpacity: 0.15,
    linkHighlightOpacity: 0.6,
    nodeHighlightScale: 1.3,
    dimOpacity: 0.15,
    labelFontSize: 9,
    linkWidth: 1
  }
};

// ─── State ───────────────────────────────────────────────────────────────────

let nodes = [];
let links = [];
let nodeMap = {};

let visibleTypes = new Set(['symptom', 'cause', 'insight', 'pattern', 'action', 'crisis']);
let selectedNode = null;
let hoveredNode = null;
let highlightedNodes = new Set();

// Camera
let camera = { x: 0, y: 0, zoom: 1 };
let targetCamera = { x: 0, y: 0, zoom: 1 };

// Interaction
let isDragging = false;
let isPanning = false;
let dragNode = null;
let panStart = { x: 0, y: 0 };
let mousePos = { x: 0, y: 0 };

// Canvas
const canvas = document.getElementById('graph');
const ctx = canvas.getContext('2d');

// ─── Data Loading ────────────────────────────────────────────────────────────

async function loadData() {
  const basePath = '../../data/';
  const [symptoms, causes, insights, patterns, actions, crises] = await Promise.all([
    fetch(basePath + 'symptoms.json').then(r => r.json()),
    fetch(basePath + 'causes.json').then(r => r.json()),
    fetch(basePath + 'insights.json').then(r => r.json()),
    fetch(basePath + 'patterns.json').then(r => r.json()),
    fetch(basePath + 'actions.json').then(r => r.json()),
    fetch(basePath + 'adjacent-crises.json').then(r => r.json())
  ]);

  buildGraph(symptoms, causes, insights, patterns, actions, crises);
}

function buildGraph(symptoms, causes, insights, patterns, actions, crises) {
  // Create nodes
  symptoms.forEach(s => addNode(s.id, 'symptom', s.label, s));
  causes.forEach(c => addNode(c.id, 'cause', c.title, c));
  insights.forEach(i => addNode(i.id, 'insight', i.title, i));
  patterns.forEach(p => addNode(p.id, 'pattern', p.title, p));
  actions.forEach(a => addNode(a.id, 'action', a.title, a));
  crises.forEach(c => addNode(c.id, 'crisis', c.title, c));

  // Create links from symptoms
  symptoms.forEach(s => {
    (s.relatedCauses || []).forEach(id => addLink(s.id, id));
    (s.relatedInsights || []).forEach(id => addLink(s.id, id));
    (s.relatedCrises || []).forEach(id => addLink(s.id, id));
  });

  // Create links from causes
  causes.forEach(c => {
    (c.symptoms || []).forEach(id => addLink(c.id, id));
    (c.relatedCauses || []).forEach(id => addLink(c.id, id));
    (c.relatedInsights || []).forEach(id => addLink(c.id, id));
    (c.actionPointers || []).forEach(id => addLink(c.id, id));
    (c.adjacentCrises || []).forEach(id => addLink(c.id, id));
  });

  // Create links from insights
  insights.forEach(i => {
    (i.relatedCauses || []).forEach(id => addLink(i.id, id));
    (i.relatedSymptoms || []).forEach(id => addLink(i.id, id));
    (i.relatedCrises || []).forEach(id => addLink(i.id, id));
  });

  // Create links from patterns
  patterns.forEach(p => {
    (p.involvedCauses || []).forEach(id => addLink(p.id, id));
    (p.relatedInsights || []).forEach(id => addLink(p.id, id));
  });

  // Create links from actions
  actions.forEach(a => {
    (a.addressesCauses || []).forEach(id => addLink(a.id, id));
    (a.addressesSymptoms || []).forEach(id => addLink(a.id, id));
  });

  // Create links from crises
  crises.forEach(c => {
    (c.relatedCauses || []).forEach(id => addLink(c.id, id));
    (c.relatedSymptoms || []).forEach(id => addLink(c.id, id));
  });

  // Deduplicate links
  const linkSet = new Set();
  links = links.filter(l => {
    const key = [l.source, l.target].sort().join('|');
    if (linkSet.has(key)) return false;
    linkSet.add(key);
    return true;
  });

  // Filter links to only those where both nodes exist
  links = links.filter(l => nodeMap[l.source] && nodeMap[l.target]);

  // Compute connection counts
  links.forEach(l => {
    if (nodeMap[l.source]) nodeMap[l.source].connections++;
    if (nodeMap[l.target]) nodeMap[l.target].connections++;
  });

  updateStats();
}

function addNode(id, type, label, data) {
  if (nodeMap[id]) return;
  const angle = Math.random() * Math.PI * 2;
  const radius = 200 + Math.random() * 300;
  const node = {
    id,
    type,
    label,
    data,
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
    vx: 0,
    vy: 0,
    connections: 0
  };
  nodes.push(node);
  nodeMap[id] = node;
}

function addLink(source, target) {
  links.push({ source, target });
}

// ─── Physics Simulation ──────────────────────────────────────────────────────

function simulate() {
  const visibleNodes = nodes.filter(n => visibleTypes.has(n.type));
  const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
  const visibleLinks = links.filter(l => visibleNodeIds.has(l.source) && visibleNodeIds.has(l.target));

  // Repulsion (Barnes-Hut would be better for perf, but this is fine for ~70 nodes)
  for (let i = 0; i < visibleNodes.length; i++) {
    for (let j = i + 1; j < visibleNodes.length; j++) {
      const a = visibleNodes[i];
      const b = visibleNodes[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = CONFIG.physics.repulsion / (dist * dist);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      if (a !== dragNode) { a.vx -= fx; a.vy -= fy; }
      if (b !== dragNode) { b.vx += fx; b.vy += fy; }
    }
  }

  // Attraction along links
  visibleLinks.forEach(l => {
    const a = nodeMap[l.source];
    const b = nodeMap[l.target];
    if (!a || !b) return;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const force = dist * CONFIG.physics.attraction;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;

    if (a !== dragNode) { a.vx += fx; a.vy += fy; }
    if (b !== dragNode) { b.vx -= fx; b.vy -= fy; }
  });

  // Center gravity
  visibleNodes.forEach(n => {
    if (n === dragNode) return;
    n.vx -= n.x * CONFIG.physics.centerGravity;
    n.vy -= n.y * CONFIG.physics.centerGravity;
  });

  // Apply velocity with damping
  visibleNodes.forEach(n => {
    if (n === dragNode) return;
    n.vx *= CONFIG.physics.damping;
    n.vy *= CONFIG.physics.damping;

    // Clamp velocity
    const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
    if (speed > CONFIG.physics.maxVelocity) {
      n.vx = (n.vx / speed) * CONFIG.physics.maxVelocity;
      n.vy = (n.vy / speed) * CONFIG.physics.maxVelocity;
    }

    n.x += n.vx;
    n.y += n.vy;
  });
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function render() {
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;

  // Smooth camera
  camera.x += (targetCamera.x - camera.x) * 0.1;
  camera.y += (targetCamera.y - camera.y) * 0.1;
  camera.zoom += (targetCamera.zoom - camera.zoom) * 0.1;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.save();

  // Apply camera transform
  ctx.translate(width / 2, height / 2);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);

  const visibleNodeIds = new Set(nodes.filter(n => visibleTypes.has(n.type)).map(n => n.id));
  const visibleLinks = links.filter(l => visibleNodeIds.has(l.source) && visibleNodeIds.has(l.target));

  const hasHighlight = highlightedNodes.size > 0;

  // Draw links
  visibleLinks.forEach(l => {
    const a = nodeMap[l.source];
    const b = nodeMap[l.target];
    if (!a || !b) return;

    let opacity = CONFIG.rendering.linkOpacity;
    if (hasHighlight) {
      if (highlightedNodes.has(l.source) && highlightedNodes.has(l.target)) {
        opacity = CONFIG.rendering.linkHighlightOpacity;
      } else {
        opacity = 0.03;
      }
    }

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.lineWidth = CONFIG.rendering.linkWidth / camera.zoom;
    ctx.stroke();
  });

  // Draw nodes
  nodes.forEach(n => {
    if (!visibleTypes.has(n.type)) return;

    let radius = CONFIG.sizes[n.type];
    let alpha = 1;

    if (hasHighlight) {
      if (highlightedNodes.has(n.id)) {
        radius *= CONFIG.rendering.nodeHighlightScale;
      } else {
        alpha = CONFIG.rendering.dimOpacity;
      }
    }

    if (n === hoveredNode || n === selectedNode) {
      radius *= 1.2;
    }

    const color = CONFIG.colors[n.type];

    // Glow for selected/hovered
    if (n === selectedNode || n === hoveredNode) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, radius + 4, 0, Math.PI * 2);
      ctx.fillStyle = color + '40';
      ctx.fill();
    }

    // Node circle
    ctx.beginPath();
    ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Label (only when zoomed in enough or for highlighted nodes)
    if (camera.zoom > 0.6 || highlightedNodes.has(n.id)) {
      const fontSize = CONFIG.rendering.labelFontSize / camera.zoom;
      ctx.font = `${Math.min(fontSize, 12)}px 'Segoe UI', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.globalAlpha = hasHighlight && !highlightedNodes.has(n.id) ? 0.1 : 0.85;
      ctx.fillStyle = '#fff';

      // Truncate label
      const maxChars = 25;
      const text = n.label.length > maxChars ? n.label.slice(0, maxChars) + '…' : n.label;
      ctx.fillText(text, n.x, n.y + radius + 4);
      ctx.globalAlpha = 1;
    }
  });

  ctx.restore();
}

// ─── Animation Loop ──────────────────────────────────────────────────────────

function loop() {
  simulate();
  render();
  requestAnimationFrame(loop);
}

// ─── Interaction ─────────────────────────────────────────────────────────────

function screenToWorld(sx, sy) {
  const rect = canvas.getBoundingClientRect();
  const cx = sx - rect.left;
  const cy = sy - rect.top;
  const width = rect.width;
  const height = rect.height;
  return {
    x: (cx - width / 2) / camera.zoom + camera.x,
    y: (cy - height / 2) / camera.zoom + camera.y
  };
}

function getNodeAtPosition(wx, wy) {
  // Reverse order so top-rendered nodes are picked first
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    if (!visibleTypes.has(n.type)) continue;
    const dx = wx - n.x;
    const dy = wy - n.y;
    const r = CONFIG.sizes[n.type] * 1.3;
    if (dx * dx + dy * dy < r * r) return n;
  }
  return null;
}

function getConnectedNodes(nodeId) {
  const connected = new Set([nodeId]);
  links.forEach(l => {
    if (l.source === nodeId && visibleTypes.has(nodeMap[l.target]?.type)) connected.add(l.target);
    if (l.target === nodeId && visibleTypes.has(nodeMap[l.source]?.type)) connected.add(l.source);
  });
  return connected;
}

canvas.addEventListener('mousedown', e => {
  const world = screenToWorld(e.clientX, e.clientY);

  if (e.button === 2 || e.button === 1) {
    isPanning = true;
    panStart = { x: e.clientX, y: e.clientY };
    e.preventDefault();
    return;
  }

  const node = getNodeAtPosition(world.x, world.y);
  if (node) {
    isDragging = true;
    dragNode = node;
    selectNode(node);
  } else {
    deselectNode();
  }
});

canvas.addEventListener('mousemove', e => {
  mousePos = { x: e.clientX, y: e.clientY };

  if (isPanning) {
    const dx = (e.clientX - panStart.x) / camera.zoom;
    const dy = (e.clientY - panStart.y) / camera.zoom;
    targetCamera.x -= dx;
    targetCamera.y -= dy;
    panStart = { x: e.clientX, y: e.clientY };
    return;
  }

  if (isDragging && dragNode) {
    const world = screenToWorld(e.clientX, e.clientY);
    dragNode.x = world.x;
    dragNode.y = world.y;
    dragNode.vx = 0;
    dragNode.vy = 0;
    return;
  }

  // Hover detection
  const world = screenToWorld(e.clientX, e.clientY);
  const node = getNodeAtPosition(world.x, world.y);

  if (node !== hoveredNode) {
    hoveredNode = node;
    canvas.style.cursor = node ? 'pointer' : 'default';

    if (node && !selectedNode) {
      highlightedNodes = getConnectedNodes(node.id);
      showTooltip(node, e.clientX, e.clientY);
    } else if (!node && !selectedNode) {
      highlightedNodes = new Set();
      hideTooltip();
    }
  }

  if (hoveredNode) {
    showTooltip(hoveredNode, e.clientX, e.clientY);
  }
});

canvas.addEventListener('mouseup', () => {
  isDragging = false;
  isPanning = false;
  dragNode = null;
});

canvas.addEventListener('mouseleave', () => {
  hoveredNode = null;
  if (!selectedNode) highlightedNodes = new Set();
  hideTooltip();
});

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const factor = e.deltaY > 0 ? 0.9 : 1.1;
  targetCamera.zoom = Math.max(0.2, Math.min(4, targetCamera.zoom * factor));
});

canvas.addEventListener('contextmenu', e => e.preventDefault());

// ─── Node Selection & Detail Panel ──────────────────────────────────────────

function selectNode(node) {
  selectedNode = node;
  highlightedNodes = getConnectedNodes(node.id);
  showDetail(node);
  hideTooltip();
}

function deselectNode() {
  selectedNode = null;
  highlightedNodes = new Set();
  hideDetail();
}

function showDetail(node) {
  const content = document.getElementById('detail-content');
  const placeholder = document.getElementById('detail-placeholder');
  placeholder.style.display = 'none';
  content.style.display = 'block';

  const color = CONFIG.colors[node.type];
  let html = `
    <div class="detail-header">
      <span class="detail-badge" style="background:${color}; color:#1a1a2e">${node.type}</span>
    </div>
    <h3 class="detail-title" style="color:${color}">${node.label}</h3>
  `;

  const d = node.data;

  // Type-specific content
  switch (node.type) {
    case 'symptom':
      html += section('How it feels', d.description);
      html += section('What you tell yourself', `<em>"${d.commonMisinterpretation}"</em>`);
      html += section('What\'s actually happening', d.structuralExplanation);
      html += linkSection('Related Causes', d.relatedCauses);
      html += linkSection('Related Insights', d.relatedInsights);
      html += linkSection('Related Crises', d.relatedCrises);
      break;

    case 'cause':
      html += section('Summary', d.summary);
      html += section('Explanation', d.explanation);
      if (d.metaphor) html += section('Metaphor', `<blockquote>${d.metaphor.text}</blockquote>`);
      html += linkSection('Symptoms Produced', d.symptoms);
      html += linkSection('Related Causes', d.relatedCauses);
      html += linkSection('Related Insights', d.relatedInsights);
      html += linkSection('Action Pointers', d.actionPointers);
      html += linkSection('Adjacent Crises', d.adjacentCrises);
      break;

    case 'insight':
      html += section('Core Idea', d.coreIdea);
      html += section('Explanation', d.explanation);
      html += section('Reframe', `<blockquote>${d.reframe}</blockquote>`);
      if (d.quotable) html += section('Quotable', `<em>"${d.quotable}"</em>`);
      html += linkSection('Related Causes', d.relatedCauses);
      html += linkSection('Related Symptoms', d.relatedSymptoms);
      html += linkSection('Related Crises', d.relatedCrises);
      break;

    case 'pattern':
      html += section('Description', d.description);
      html += section('Feedback Loop', `<ol style="padding-left:16px;font-size:0.8rem;color:#ccc">${d.loop.map(s => `<li style="margin-bottom:4px">${s}</li>`).join('')}</ol>`);
      html += linkSection('Involved Causes', d.involvedCauses);
      html += linkSection('Related Insights', d.relatedInsights);
      break;

    case 'action':
      html += section('Description', d.description);
      html += section('Experiment', `<blockquote>${d.experiment}</blockquote>`);
      html += section('Details', `Difficulty: ${d.difficulty} · Timeframe: ${d.timeframe} · Level: ${d.level}`);
      html += linkSection('Addresses Causes', d.addressesCauses);
      html += linkSection('Addresses Symptoms', d.addressesSymptoms);
      break;

    case 'crisis':
      html += section('Summary', d.summary);
      html += section('Connection to Core', d.connectionToCore);
      if (d.keyThinkers) html += section('Key Thinkers', d.keyThinkers.join(', '));
      html += linkSection('Related Causes', d.relatedCauses);
      html += linkSection('Related Symptoms', d.relatedSymptoms);
      break;
  }

  content.innerHTML = html;

  // Bind link clicks
  content.querySelectorAll('.detail-link').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.id;
      const target = nodeMap[id];
      if (target) {
        selectNode(target);
        // Pan to node
        targetCamera.x = target.x;
        targetCamera.y = target.y;
      }
    });
  });
}

function section(title, body) {
  if (!body) return '';
  return `<div class="detail-section"><h4>${title}</h4><p>${body}</p></div>`;
}

function linkSection(title, ids) {
  if (!ids || ids.length === 0) return '';
  const linksHtml = ids
    .filter(id => nodeMap[id])
    .map(id => {
      const n = nodeMap[id];
      const color = CONFIG.colors[n.type];
      return `<span class="detail-link" data-id="${id}" style="background:${color}30; color:${color}">${n.label}</span>`;
    })
    .join('');
  if (!linksHtml) return '';
  return `<div class="detail-section"><h4>${title}</h4><div class="detail-links">${linksHtml}</div></div>`;
}

function hideDetail() {
  document.getElementById('detail-content').style.display = 'none';
  document.getElementById('detail-placeholder').style.display = 'flex';
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function showTooltip(node, x, y) {
  const tooltip = document.getElementById('tooltip');
  const color = CONFIG.colors[node.type];
  tooltip.innerHTML = `
    <div class="tooltip-type" style="color:${color}">${node.type}</div>
    <div>${node.label}</div>
    <div style="margin-top:4px;color:#666">${node.connections} connections</div>
  `;
  tooltip.style.display = 'block';

  // Position
  const rect = canvas.getBoundingClientRect();
  tooltip.style.left = (x - rect.left + 12) + 'px';
  tooltip.style.top = (y - rect.top - 10) + 'px';
}

function hideTooltip() {
  document.getElementById('tooltip').style.display = 'none';
}

// ─── Filters ─────────────────────────────────────────────────────────────────

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const type = btn.dataset.type;
    btn.classList.toggle('active');
    if (visibleTypes.has(type)) {
      visibleTypes.delete(type);
    } else {
      visibleTypes.add(type);
    }
    updateStats();
  });
});

// ─── Search ──────────────────────────────────────────────────────────────────

document.getElementById('search').addEventListener('input', e => {
  const query = e.target.value.toLowerCase().trim();
  if (!query) {
    highlightedNodes = selectedNode ? getConnectedNodes(selectedNode.id) : new Set();
    return;
  }

  const matches = nodes.filter(n =>
    visibleTypes.has(n.type) && n.label.toLowerCase().includes(query)
  );

  if (matches.length > 0) {
    highlightedNodes = new Set(matches.map(n => n.id));
    // If single match, focus on it
    if (matches.length === 1) {
      targetCamera.x = matches[0].x;
      targetCamera.y = matches[0].y;
    }
  } else {
    highlightedNodes = new Set();
  }
});

// ─── Controls ────────────────────────────────────────────────────────────────

document.getElementById('btn-reset').addEventListener('click', () => {
  targetCamera = { x: 0, y: 0, zoom: 1 };
  deselectNode();
  document.getElementById('search').value = '';
});

document.getElementById('btn-zoom-in').addEventListener('click', () => {
  targetCamera.zoom = Math.min(4, targetCamera.zoom * 1.3);
});

document.getElementById('btn-zoom-out').addEventListener('click', () => {
  targetCamera.zoom = Math.max(0.2, targetCamera.zoom * 0.7);
});

// ─── Stats ───────────────────────────────────────────────────────────────────

function updateStats() {
  const visibleNodes = nodes.filter(n => visibleTypes.has(n.type));
  const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
  const visibleLinkCount = links.filter(l => visibleNodeIds.has(l.source) && visibleNodeIds.has(l.target)).length;

  document.getElementById('stats').textContent =
    `${visibleNodes.length} nodes · ${visibleLinkCount} connections`;
}

// ─── Resize ──────────────────────────────────────────────────────────────────

function resize() {
  const container = document.getElementById('canvas-container');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = container.clientWidth * dpr;
  canvas.height = container.clientHeight * dpr;
  canvas.style.width = container.clientWidth + 'px';
  canvas.style.height = container.clientHeight + 'px';
  // Note: ctx.scale is applied per-frame in render() isn't needed here
  // because we use canvas.width/height directly in render
}

window.addEventListener('resize', resize);

// ─── Init ────────────────────────────────────────────────────────────────────

resize();
loadData().then(() => {
  updateStats();
  loop();
});
