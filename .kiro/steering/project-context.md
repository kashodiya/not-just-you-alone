# Find Who Am I — Project Context

## What This Project Is

"Find Who Am I" is an interactive public-awareness tool (NOT therapy) that helps people:
- Recognize patterns shaping their life that they may not see
- Understand their struggles as structural, not personal failure
- Explore themselves with warmth and honesty
- Find actionable pointers toward connection, meaning, and grounding

## Core Design Principles

1. **Symptom-first entry** — People arrive feeling something, not knowing terminology. Start with what they feel.
2. **Catchy surface, deep interior** — Use relatable, shareable hooks to get people in the door. What they find inside should be deeper than expected.
3. **Not therapy, not diagnosis** — This is a mirror with context. It doesn't label or prescribe. It illuminates and offers experiments.
4. **Structural AND personal** — Connect personal feelings to systemic causes, but don't stop there. Understanding the system is the first step, not the last. Agency lives in the individual. "The system shaped this. Understanding it is the first step. It's not the last."
5. **Warm and conversational tone** — Like a thoughtful friend explaining something important. Not academic, not clinical, not preachy. Energy of a physiotherapist after an injury — not drill sergeant, not "just rest."
6. **Simple illustrations say more than text** — Use visuals and metaphors. A picture of a compass spinning with no north says "purposelessness" better than a paragraph.
7. **All ages** — Primary audience is young (18-30), but adults and elderly face similar patterns. Don't exclude.
8. **Minimal gamification** — Lightly interactive with visualizations. Not a quiz show.

## Tonal Framework (Three-Part Structure)

Every piece of content follows this arc:

1. **Acknowledge** — Yes, the system failed you. Here's how. (Compassion, no shame)
2. **Name the limit** — Understanding alone won't change your inner experience. Knowledge is the map, not the muscle. (Honest, not shaming)
3. **Offer the path** — Here's what you can do, starting small. (Warm, practical, experimental)

This is BOTH/AND — not a reversal of the systemic lens but a second layer (agency/strength) on top of it. Correct diagnosis is not cure. A heart specialist who smokes proves it: knowing everything doesn't mean you can act on it.

**Key stance:** Mental strength — the capacity to endure, resist, commit, and act with inner discipline — has no institutional home in modern life. No institution is coming to build it. The individual must become their own builder. Not because it's fair, but because it's true.

## Tech Decisions

- **Hosting (v1):** GitHub Pages (static site)
- **Storage (v1):** localStorage (client-side, private to user) + static JSON knowledge files
- **Storage (future):** Backend with anonymous/personal data, encryption, aggregate insights
- **Visualizations:** SVG + CSS animations, simple illustrative style
- **Framework:** TBD (leaning lightweight — Svelte or vanilla JS)

## Data Architecture

The app has three data layers:

1. **Knowledge Layer** (`/data/*.json`) — Structured content: symptoms, causes, insights, patterns, actions, adjacent crises. Shipped as static JSON.
2. **Exploration Layer** (localStorage) — User's journey through prompts and modules. Sessions, responses, reflections.
3. **Personal Layer** (localStorage → future backend) — What emerges over time: their personal map, social web, actions tried, shifts observed.

Key entities: Symptom, Cause, Insight, Pattern, Action, AdjacentCrisis, Module, Prompt

See `ARCHITECTURE.md` for full schema with JSON examples.

## Research Workflow

- All research lives in `research/notes/` — flat folder, no hierarchy
- New files get dropped there; Kiro reads them and updates `data/` JSON
- `research/README.md` tracks processing status
- The taxonomy lives in `data/`, not in the research folder

## Content Tone Guide

When writing content for the app (symptoms, explanations, reframes):

- **DO:** "You're not lazy — you're carrying a weight no previous generation had to carry alone. And you can still build the strength to carry it."
- **DO:** "This feeling has a name and a cause. It's not just you. But seeing it is the beginning, not the end."
- **DO:** "Nobody taught you this. That's real. But you can teach yourself."
- **DO:** "A muscle never exercised isn't weak from laziness — it was never used. It can still grow."
- **DON'T:** "Studies show that 67% of participants in longitudinal research..."
- **DON'T:** "You should try mindfulness because it's been proven to..."
- **DON'T:** Stop at "it's not your fault" without offering a path forward.
- **DON'T:** Remove all agency in the name of compassion.
- **DO:** Short sentences. Direct. Honest. Compassionate.
- **DO:** Metaphors and images over jargon.
- **DON'T:** Preach, moralize, or talk down. Never "toughen up." Never "just push through."

## Modules (Planned)

1. **The Mirror** — "What's happening to me?" (symptom → cause → reframe)
2. **The Map** — "Where am I?" (which forces are active in your life)
3. **The Web** — "How am I connected?" (social mapping) — OPTIONAL module
4. **The Path** — "What can I try?" (action experiments)
5. **The Bigger Picture** — "It's not just me" (systemic view, data, shared patterns)
