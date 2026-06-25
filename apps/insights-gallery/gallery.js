/**
 * Insights Gallery — Scrollable cards with illustrations
 */

async function loadInsights() {
  const res = await fetch('../../data/insights.json');
  const insights = await res.json();
  const gallery = document.getElementById('gallery');

  insights.forEach(insight => {
    const card = document.createElement('div');
    card.className = 'card';

    const origin = insight.conceptOrigin
      ? `<div class="card-origin">Concept: ${insight.concept} — ${insight.conceptOrigin}</div>`
      : '';

    card.innerHTML = `
      <img
        src="../../assets/illustrations/${insight.id}.png"
        alt="${insight.title}"
        onerror="this.style.display='none'"
      />
      <div class="card-body">
        <h2 class="card-title">${insight.title}</h2>
        <p class="card-text">${insight.plain}</p>
        <div class="card-quote">${insight.quotable}</div>
        ${origin}
      </div>
    `;

    gallery.appendChild(card);
  });
}

loadInsights();
