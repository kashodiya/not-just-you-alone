/**
 * Find Who Am I — Personal Heatmap
 *
 * User taps symptoms that resonate → connected causes glow proportionally.
 * Insights show in plain or sophisticated language based on user preference.
 * Actions and patterns surface based on relevance scoring.
 */

// ─── State ───────────────────────────────────────────────────────────────────

const state = {
  symptoms: [],
  causes: [],
  insights: [],
  actions: [],
  patterns: [],
  byId: {},
  selected: new Set(),
  tone: 'plain' // 'plain' or 'sophisticated'
};

// ─── Data Loading ────────────────────────────────────────────────────────────

async function loadData() {
  const base = '../../data/';
  const files = ['symptoms', 'causes', 'insights', 'actions', 'patterns'];

  try {
    const [symptoms, causes, insights, actions, patterns] = await Promise.all(
      files.map(f => fetch(`${base}${f}.json`).then(r => {
        if (!r.ok) throw new Error(`Failed to load ${f}.json`);
        return r.json();
      }))
    );

    state.symptoms = symptoms;
    state.causes = causes;
    state.insights = insights;
    state.actions = actions;
    state.patterns = patterns;

    // Build lookup index
    [symptoms, causes, insights, actions, patterns].flat().forEach(entity => {
      state.byId[entity.id] = entity;
    });

    renderSymptomGrid();
  } catch (err) {
    console.error('Data load failed:', err);
    document.getElementById('symptom-grid').innerHTML =
      '<p style="color:#e94560;text-align:center">Failed to load data. Make sure you\'re serving from a web server.</p>';
  }
}

// ─── Tone Toggle ─────────────────────────────────────────────────────────────

function initToneToggle() {
  const plainBtn = document.getElementById('tone-plain');
  const sophBtn = document.getElementById('tone-sophisticated');

  plainBtn.addEventListener('click', () => setTone('plain'));
  sophBtn.addEventListener('click', () => setTone('sophisticated'));
}

function setTone(tone) {
  state.tone = tone;
  document.getElementById('tone-plain').classList.toggle('active', tone === 'plain');
  document.getElementById('tone-sophisticated').classList.toggle('active', tone === 'sophisticated');

  // Re-render insight section if results visible
  if (state.selected.size > 0) {
    updateResults();
  }
}

// ─── Symptom Grid ────────────────────────────────────────────────────────────

function renderSymptomGrid() {
  const grid = document.getElementById('symptom-grid');
  grid.innerHTML = '';

  state.symptoms.forEach(symptom => {
    const tile = document.createElement('div');
    tile.className = 'symptom-tile';
    tile.dataset.id = symptom.id;
    tile.innerHTML = `
      <h3>${symptom.label}</h3>
      <p>${truncate(symptom.description, 75)}</p>
    `;
    tile.addEventListener('click', () => toggleSymptom(symptom.id, tile));
    grid.appendChild(tile);
  });
}

function toggleSymptom(id, tile) {
  if (state.selected.has(id)) {
    state.selected.delete(id);
    tile.classList.remove('selected');
  } else {
    state.selected.add(id);
    tile.classList.add('selected');
  }
  updateResults();
  updateSelectionBar();
}

// ─── Scoring Engine ──────────────────────────────────────────────────────────

function scoreCauses() {
  const scores = new Map();

  state.causes.forEach(cause => {
    let hits = 0;
    state.selected.forEach(symptomId => {
      const symptom = state.byId[symptomId];
      const causeListsSymptom = (cause.symptoms || []).includes(symptomId);
      const symptomListsCause = symptom && (symptom.relatedCauses || []).includes(cause.id);
      if (causeListsSymptom || symptomListsCause) hits++;
    });
    if (hits > 0) scores.set(cause.id, hits);
  });

  return scores;
}

function scoreInsights(causeScores) {
  const scores = new Map();

  state.insights.forEach(insight => {
    let score = 0;

    // Direct symptom matches (strong signal)
    (insight.relatedSymptoms || []).forEach(sId => {
      if (state.selected.has(sId)) score += 2;
    });

    // Cause relevance (weaker signal)
    (insight.relatedCauses || []).forEach(cId => {
      const causeHeat = causeScores.get(cId) || 0;
      score += causeHeat * 0.5;
    });

    if (score > 0) scores.set(insight.id, score);
  });

  return scores;
}

function scoreActions(causeScores) {
  const scores = new Map();

  state.actions.forEach(action => {
    let score = 0;

    (action.addressesSymptoms || []).forEach(sId => {
      if (state.selected.has(sId)) score += 2;
    });

    (action.addressesCauses || []).forEach(cId => {
      const causeHeat = causeScores.get(cId) || 0;
      score += causeHeat;
    });

    if (score > 0) scores.set(action.id, score);
  });

  return scores;
}

function scorePatterns(causeScores) {
  const scores = new Map();

  state.patterns.forEach(pattern => {
    let score = 0;
    (pattern.involvedCauses || []).forEach(cId => {
      score += causeScores.get(cId) || 0;
    });
    if (score > 0) scores.set(pattern.id, score);
  });

  return scores;
}

// ─── Results Update ──────────────────────────────────────────────────────────

function updateResults() {
  const results = document.getElementById('results');

  if (state.selected.size === 0) {
    results.classList.remove('visible');
    return;
  }

  results.classList.add('visible');

  const causeScores = scoreCauses();
  const insightScores = scoreInsights(causeScores);
  const actionScores = scoreActions(causeScores);
  const patternScores = scorePatterns(causeScores);

  renderCauseHeatmap(causeScores);
  renderPatterns(patternScores);
  renderInsights(insightScores);
  renderActions(actionScores);
}

// ─── Render: Cause Heatmap ───────────────────────────────────────────────────

function renderCauseHeatmap(causeScores) {
  const container = document.getElementById('cause-heatmap');
  const badge = document.getElementById('cause-count');

  const sorted = [...causeScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, score]) => ({ cause: state.byId[id], score }));

  badge.textContent = `${sorted.length} active`;

  const maxScore = sorted.length > 0 ? sorted[0].score : 1;

  container.innerHTML = sorted.map(({ cause, score }) => {
    const intensity = score / maxScore;
    const bgAlpha = (0.04 + intensity * 0.18).toFixed(2);
    const borderAlpha = (0.2 + intensity * 0.7).toFixed(2);
    const barWidth = Math.round(intensity * 100);

    return `
      <div class="cause-tile" data-id="${cause.id}"
           style="background:rgba(254,202,87,${bgAlpha}); border-color:rgba(254,202,87,${borderAlpha})">
        <div class="cause-title" style="color:rgba(254,202,87,${0.6 + intensity * 0.4})">${cause.title}</div>
        <div class="cause-heat">${score} of ${state.selected.size} symptoms connected</div>
        <div class="heat-bar" style="width:${barWidth}%; opacity:${0.4 + intensity * 0.6}"></div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.cause-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      const cause = state.byId[tile.dataset.id];
      if (cause) showCauseDetail(cause);
    });
  });
}

// ─── Render: Patterns ────────────────────────────────────────────────────────

function renderPatterns(patternScores) {
  const container = document.getElementById('pattern-list');
  const badge = document.getElementById('pattern-count');

  const sorted = [...patternScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => state.byId[id]);

  badge.textContent = `${sorted.length} active`;

  container.innerHTML = sorted.map(pattern => {
    const steps = (pattern.loop || []).map((step, i) =>
      `<span class="loop-step" data-num="${i + 1}">${step}</span>`
    ).join('');

    return `
      <div class="pattern-tile">
        <h4>${pattern.title}</h4>
        <p>${pattern.description}</p>
        <div class="loop-steps">${steps}</div>
      </div>
    `;
  }).join('');
}

// ─── Render: Insights (dual-language) ────────────────────────────────────────

function renderInsights(insightScores) {
  const container = document.getElementById('insight-list');
  const badge = document.getElementById('insight-count');

  const sorted = [...insightScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => state.byId[id]);

  badge.textContent = `${sorted.length} relevant`;

  container.innerHTML = sorted.map(insight => {
    // Primary text based on current tone
    const primaryText = state.tone === 'plain'
      ? (insight.plain || insight.coreIdea)
      : (insight.sophisticated || insight.coreIdea);

    // Alternate text for the "dig deeper" toggle
    const altText = state.tone === 'plain'
      ? (insight.sophisticated || '')
      : (insight.plain || '');

    const altLabel = state.tone === 'plain' ? 'Dig deeper →' : 'Say it simply →';

    const conceptHtml = insight.concept
      ? `<span class="concept-label">${insight.concept}${insight.conceptOrigin ? ' — ' + insight.conceptOrigin : ''}</span>`
      : '';

    const altHtml = altText
      ? `<div class="toggle-depth" onclick="this.nextElementSibling.classList.toggle('visible');this.textContent=this.textContent.includes('→')?'← Less':'${altLabel}'">${altLabel}</div>
         <div class="sophisticated-text">${altText}</div>`
      : '';

    return `
      <div class="insight-tile" data-insight-id="${insight.id}">
        <h4>${insight.title}<button class="speak-btn" aria-label="Listen to this" data-speak-id="${insight.id}">🔊</button></h4>
        <div class="insight-body">${primaryText}</div>
        ${conceptHtml}
        ${altHtml}
      </div>
    `;
  }).join('');

  // Bind speak buttons
  container.querySelectorAll('.speak-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const insight = state.byId[btn.dataset.speakId];
      if (!insight) return;

      // Read the currently visible primary text + reframe
      const textToSpeak = state.tone === 'plain'
        ? (insight.plain || insight.coreIdea)
        : (insight.sophisticated || insight.coreIdea);

      const fullText = `${insight.title}. ${textToSpeak}. ${insight.reframe || ''}`;
      tts.speak(fullText, btn);
    });
  });
}

// ─── Render: Actions ─────────────────────────────────────────────────────────

function renderActions(actionScores) {
  const container = document.getElementById('action-list');
  const badge = document.getElementById('action-count');

  const sorted = [...actionScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => state.byId[id]);

  badge.textContent = `${sorted.length} suggested`;

  container.innerHTML = sorted.map(action => `
    <div class="action-tile">
      <h4>${action.title}</h4>
      <div class="experiment">${action.experiment || action.description}</div>
      <div class="meta">
        <span>${action.difficulty || 'any'}</span>
        <span>${action.timeframe || ''}</span>
        <span>${action.level || ''}</span>
      </div>
    </div>
  `).join('');
}

// ─── Cause Detail Overlay ────────────────────────────────────────────────────

function showCauseDetail(cause) {
  const overlay = document.getElementById('cause-detail');
  const body = document.getElementById('cause-detail-body');

  let html = `<h3>${cause.title}</h3>`;
  html += `<p class="detail-summary">${cause.summary}</p>`;

  if (cause.metaphor && cause.metaphor.text) {
    html += `<blockquote>"${cause.metaphor.text}"</blockquote>`;
  }

  html += `<p class="detail-explanation">${cause.explanation}</p>`;

  body.innerHTML = html;
  overlay.classList.add('visible');
}

function hideCauseDetail() {
  document.getElementById('cause-detail').classList.remove('visible');
}

document.getElementById('cause-detail-close').addEventListener('click', hideCauseDetail);
document.getElementById('cause-detail').addEventListener('click', e => {
  if (e.target.id === 'cause-detail') hideCauseDetail();
});

// Close overlay on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    hideCauseDetail();
    tts.stop();
  }
});

// ─── Selection Bar ───────────────────────────────────────────────────────────

function updateSelectionBar() {
  const bar = document.getElementById('selection-bar');
  const text = document.getElementById('sel-count-text');

  if (state.selected.size > 0) {
    bar.classList.add('visible');
    text.textContent = `${state.selected.size} selected`;
  } else {
    bar.classList.remove('visible');
  }
}

document.getElementById('clear-btn').addEventListener('click', () => {
  state.selected.clear();
  tts.stop();
  document.querySelectorAll('.symptom-tile.selected').forEach(t => t.classList.remove('selected'));
  updateResults();
  updateSelectionBar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ─── Text-to-Speech ──────────────────────────────────────────────────────────

const tts = {
  utterance: null,
  activeBtn: null,

  speak(text, btn) {
    // If already speaking this one, stop
    if (tts.activeBtn === btn && speechSynthesis.speaking) {
      tts.stop();
      return;
    }

    // Stop any previous speech
    tts.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;
    utterance.pitch = 1.0;

    // Try to pick a natural-sounding voice
    const voices = speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha'))
    ) || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => tts.cleanup();
    utterance.onerror = () => tts.cleanup();

    btn.classList.add('speaking');
    btn.setAttribute('aria-label', 'Stop speaking');
    tts.activeBtn = btn;
    tts.utterance = utterance;

    speechSynthesis.speak(utterance);
  },

  stop() {
    speechSynthesis.cancel();
    tts.cleanup();
  },

  cleanup() {
    if (tts.activeBtn) {
      tts.activeBtn.classList.remove('speaking');
      tts.activeBtn.setAttribute('aria-label', 'Listen to this');
    }
    tts.activeBtn = null;
    tts.utterance = null;
  }
};

// Pre-load voices (some browsers need this)
speechSynthesis.getVoices();
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

// ─── Init ────────────────────────────────────────────────────────────────────

initToneToggle();
loadData();
