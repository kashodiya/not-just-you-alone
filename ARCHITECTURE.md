# Find Who Am I — Project Architecture

## Project Vision

An interactive, public-awareness tool (not therapy) that helps people:
1. Recognize patterns they may be living inside without realizing
2. Understand that their struggles are structural, not personal failure
3. Explore themselves and their situation with warmth and clarity
4. Find actionable pointers toward connection, meaning, and grounding

## Decisions Made

| Decision | Choice |
|----------|--------|
| Hosting (v1) | GitHub Pages (static site) |
| Tone | Warm, conversational — accessible to all ages |
| Primary audience | Young people (18-30), but designed for all ages |
| Interactivity | Moderate — reflective prompts, visualizations, simple illustrations |
| Gamification | Minimal — not gamified, but lightly interactive |
| Entry point | Symptom-first (people arrive feeling something, not knowing terminology) |
| Input balance | Mix of structured (scales, choices) and freetext (reflections) |
| Social web mapping | Optional module (powerful but potentially vulnerable) |
| Storage (v1) | localStorage (private, client-side) + JSON knowledge files |
| Storage (future) | Backend with anonymous/personal data, encryption, aggregate insights |
| Illustrations | Simple illustrations and pictures — "a picture can say so much" |

## Content Domains

The tool draws from two source documents:

### Primary: Hyper-Individualism Report
- 5 cause categories (Technological, Economic, Cultural, Social, Psychological)
- 10 key insights
- 3 underlying patterns (feedback loops)
- Predictions (immediate, medium, long-term)
- Solutions (individual, relational, institutional, cultural)

### Extended: Adjacent Crises (other-crisis.md)
- The Meaning Crisis
- The Attention Crisis
- The Crisis of Masculinity/Femininity
- The Collapse of Trust
- The Demographic Winter
- Philosophy of Technology
- Death and Rebirth of Religion/Spirituality
- The Metacrisis / Polycrisis
- Neuroscience of Social Connection
- Philosophy of Commitment and Freedom
- Architecture and the Built Environment
- The Role of Ritual and Ceremony
- Wisdom Traditions vs. Information Age
- Play, Leisure, and Loss of Unproductive Time

---

## Data Architecture

### Layer 1: Knowledge Graph (Static JSON — shipped with app)

The structured content that powers the tool.

#### Domain

```json
{
  "id": "domain-hyper-individualism",
  "title": "Hyper-Individualism",
  "description": "The crisis of disconnection in modern life"
}
```

#### Category

```json
{
  "id": "cat-technological",
  "domainId": "domain-hyper-individualism",
  "title": "Technological Causes",
  "icon": "smartphone",
  "summary": "How technology reshaped social life and attention"
}
```

#### Cause

```json
{
  "id": "cause-smartphone-revolution",
  "categoryId": "cat-technological",
  "title": "The Smartphone Revolution",
  "summary": "After 2012, the internet became the primary environment for young people — not a place you visit, but a place you live.",
  "explanation": "Full accessible explanation text...",
  "metaphor": {
    "text": "The difference between visiting a swimming pool and living underwater",
    "illustrationHint": "person submerged in glowing water made of app icons"
  },
  "symptoms": ["symptom-always-online", "symptom-cant-be-bored", "symptom-half-present"],
  "relatedCauses": ["cause-social-media-architecture", "cause-algorithmic-manipulation"],
  "relatedInsights": ["insight-attention-foundation"],
  "actionPointers": ["action-digital-discipline", "action-phone-free-meals"],
  "adjacentCrises": ["crisis-attention"]
}
```

#### Symptom (FIRST-CLASS — the entry point)

```json
{
  "id": "symptom-purposeless",
  "label": "Feeling purposeless or directionless",
  "description": "A sense that life has no clear direction or meaning — not depression exactly, but emptiness.",
  "commonMisinterpretation": "I'm lazy. I lack ambition. Something is wrong with me.",
  "structuralExplanation": "When shared narratives collapse and you must generate all meaning from scratch, purposelessness is a natural response — not a character flaw.",
  "relatedCauses": ["cause-collapse-shared-narratives", "cause-expressive-individualism", "cause-death-of-duty"],
  "relatedInsights": ["insight-freedom-compulsory", "insight-anomic-gap"],
  "relatedCrises": ["crisis-meaning"],
  "visualHint": "compass spinning with no north"
}
```

#### Insight

```json
{
  "id": "insight-freedom-compulsory",
  "title": "Freedom Has Become Compulsory",
  "concept": "Compulsory Freedom",
  "conceptOrigin": "Zygmunt Bauman / Ulrich Beck",
  "plain": "You didn't ask for this much freedom. You were just thrown into a world where you HAVE to choose everything — your career, your beliefs, your identity, your people — all from scratch. That's not exciting. That's exhausting.",
  "sophisticated": "Freedom is no longer something you fight for — it's something forced upon you. You MUST choose your identity, meaning, career, and community from scratch. This isn't liberation — it's the weight of infinite self-authorship.",
  "coreIdea": "You MUST choose your identity, meaning, career, worldview, and community — freedom is not optional, it's forced upon you.",
  "explanation": "Full text...",
  "reframe": "You're not failing at life — you're carrying an impossible weight that no previous generation had to bear alone.",
  "relatedCauses": ["cause-collapse-shared-narratives", "cause-expressive-individualism"],
  "relatedSymptoms": ["symptom-purposeless", "symptom-paralyzed-by-choice", "symptom-exhausted"],
  "quotable": "It's the difference between choosing to go hiking and being thrown into wilderness with no map."
}
```

**Field descriptions:**
- `plain` — Default display text. Written for someone tired, scrolling at midnight, with zero academic background. The "explain it like I'm 19 and exhausted" version.
- `sophisticated` — The richer, more conceptual version for curious readers. Uses terminology and frames ideas in broader intellectual context.
- `concept` — The formal name for this phenomenon (shown as a "learn more" label in the UI).
- `conceptOrigin` — Who named it / where it comes from (for attribution and curiosity). Can be `null` if no single source.

#### Pattern (Feedback Loops)

```json
{
  "id": "pattern-friction-removal",
  "title": "The Removal of Necessary Friction",
  "description": "Modern life removes ALL friction — both oppressive and developmental — producing fragile, impatient, isolated individuals.",
  "loop": [
    "Technology removes friction from interactions",
    "Discomfort tolerance decreases",
    "Real relationships feel 'too hard'",
    "Retreat to frictionless digital spaces",
    "Further loss of tolerance",
    "Deeper isolation"
  ],
  "involvedCauses": ["cause-smartphone-revolution", "cause-overprotection", "cause-dopamine"],
  "visualHint": "circular arrows showing the cycle, getting tighter"
}
```

#### Action (Pointers, not prescriptions)

```json
{
  "id": "action-voluntary-commitment",
  "level": "individual",
  "title": "Practice voluntary commitment",
  "description": "Choose something and stay with it even when uncomfortable — a community, a practice, a relationship, a place.",
  "difficulty": "medium",
  "timeframe": "ongoing",
  "addressesCauses": ["cause-paradox-of-choice", "cause-liquid-self"],
  "addressesSymptoms": ["symptom-cant-commit", "symptom-purposeless"],
  "experiment": "This week, identify one thing you've been keeping 'optional' and decide: I'm in this for 3 months, no exit."
}
```

#### AdjacentCrisis (from other-crisis.md)

```json
{
  "id": "crisis-meaning",
  "title": "The Meaning Crisis",
  "tier": 1,
  "summary": "The collapse of wisdom traditions, spiritual practices, and philosophical frameworks that made life feel significant.",
  "connectionToCore": "Even if you solve loneliness, people may still feel life is meaningless. Belonging answers 'who am I with?' — meaning answers 'what is all this FOR?'",
  "keyThinkers": ["John Vervaeke", "Viktor Frankl", "Charles Taylor", "Paul Tillich"],
  "relatedCauses": ["cause-collapse-shared-narratives", "cause-death-of-duty"],
  "relatedSymptoms": ["symptom-purposeless", "symptom-nothing-matters"]
}
```

---

### Layer 2: Exploration Schema (localStorage in v1)

#### Module

```json
{
  "id": "module-the-map",
  "title": "The Map",
  "subtitle": "Where am I?",
  "description": "Explore which forces are most active in your life",
  "icon": "map",
  "order": 1,
  "isOptional": false
}
```

Modules planned:
- `module-the-map` — "Where Am I?" (which patterns shape your life)
- `module-the-mirror` — "What's Happening To Me?" (connect feelings to causes)
- `module-the-web` — "How Am I Connected?" (social mapping) **[OPTIONAL]**
- `module-the-path` — "What Can I Try?" (action experiments)
- `module-the-bigger-picture` — "It's Not Just Me" (systemic view)

#### Prompt

```json
{
  "id": "prompt-screen-social-life",
  "moduleId": "module-the-map",
  "order": 3,
  "text": "How much of your social life happens through a screen?",
  "subtext": "Think about the last week — conversations, hangouts, checking in on people.",
  "responseType": "scale_1_5",
  "scaleLabels": {
    "1": "Almost none — mostly face to face",
    "5": "Almost all — rarely see people in person"
  },
  "mapsTo": {
    "causes": ["cause-smartphone-revolution", "cause-destruction-third-places"],
    "symptoms": ["symptom-lonely-but-connected"]
  },
  "followUp": {
    "condition": "value >= 4",
    "nextPromptId": "prompt-screen-social-why"
  }
}
```

#### Response Types Supported

| Type | Description | Use when |
|------|-------------|----------|
| `scale_1_5` | Slider or radio 1-5 | Degree/frequency questions |
| `multiple_choice` | Select one from options | Categorical questions |
| `multi_select` | Select many from options | "Which of these resonate?" |
| `open_reflection` | Freetext (short) | Personal meaning-making |
| `journal` | Freetext (long) | Deep reflection, optional |
| `visual_select` | Click on illustrations | Intuitive, low-barrier entry |
| `yes_no` | Binary | Simple gating questions |

#### ExplorationSession

```json
{
  "id": "session-uuid",
  "startedAt": "2026-06-24T10:00:00Z",
  "moduleId": "module-the-map",
  "entries": [
    {
      "promptId": "prompt-screen-social-life",
      "responseType": "scale_1_5",
      "value": 4,
      "timestamp": "2026-06-24T10:01:30Z"
    },
    {
      "promptId": "prompt-screen-social-why",
      "responseType": "open_reflection",
      "value": "I guess I don't know where to go to meet people in person anymore.",
      "timestamp": "2026-06-24T10:02:45Z"
    }
  ],
  "completedAt": "2026-06-24T10:15:00Z"
}
```

---

### Layer 3: Personal Profile (localStorage v1, backend future)

```json
{
  "id": "user-anon-hash",
  "createdAt": "2026-06-24",
  "sessions": ["session-uuid-1", "session-uuid-2"],

  "personalMap": {
    "dominantCauses": [
      { "causeId": "cause-smartphone-revolution", "resonance": 0.85 },
      { "causeId": "cause-collapse-shared-narratives", "resonance": 0.72 }
    ],
    "dominantSymptoms": ["symptom-purposeless", "symptom-lonely-but-connected"],
    "connectionScore": 2.3,
    "frictionTolerance": 2.8,
    "commitmentPattern": "exploring"
  },

  "socialWeb": {
    "enabled": false,
    "physicalConnections": null,
    "digitalConnections": null,
    "thirdPlaces": [],
    "obligations": [],
    "depthRatio": null
  },

  "journey": {
    "actionsAttempted": [
      {
        "actionId": "action-phone-free-meals",
        "startedAt": "2026-06-25",
        "status": "trying",
        "reflection": "Harder than I thought. Kept reaching for it."
      }
    ],
    "reflections": [],
    "shifts": []
  },

  "sharing": {
    "anonymousContribute": false,
    "publicProfile": false
  }
}
```

---

### Future: Aggregate Data Layer

```json
{
  "totalExplorers": 12847,
  "symptomDistribution": {
    "symptom-purposeless": 0.68,
    "symptom-lonely-but-connected": 0.61,
    "symptom-cant-commit": 0.54
  },
  "causeResonance": {
    "cause-smartphone-revolution": 0.79,
    "cause-collapse-shared-narratives": 0.65
  },
  "actionUptake": {
    "action-phone-free-meals": { "attempted": 3421, "sustained": 1205 }
  },
  "trends": []
}
```

---

## Relationship Map

```
USER ARRIVES → feels something (Symptom)
                    ↓
            "Why do I feel this?" → discovers Causes
                    ↓
            "Is this just me?" → encounters Insights + Patterns
                    ↓
            "What's the bigger picture?" → sees Adjacent Crises + Feedback Loops
                    ↓
            "What can I do?" → finds Actions (experiments, not prescriptions)
                    ↓
            (optional) tracks journey over time → Personal Profile
```

---

## Tech Stack (v1 — GitHub Pages)

| Layer | Technology |
|-------|-----------|
| Static hosting | GitHub Pages |
| Framework | TBD (lightweight — vanilla JS, or Svelte/Vue for reactivity) |
| Knowledge data | JSON files in `/data/` |
| User data | localStorage |
| Visualizations | SVG + CSS animations (simple, illustrative) |
| Illustrations | Custom SVG or simple line art |
| Build | Minimal — static or simple bundler |

## Open Questions

- [ ] Framework choice (vanilla JS vs. lightweight framework?)
- [ ] Illustration style (line art? watercolor? geometric?)
- [ ] How many prompts per module for v1?
- [ ] Should v1 include all 5 modules or start with 2-3?
- [ ] Content: populate all causes from report, or curate a subset for v1?
- [ ] Domain name (future hosting)?

---

## File Structure (Planned)

```
find-whoami/
├── index.html
├── css/
├── js/
├── assets/
│   └── illustrations/
├── data/
│   ├── symptoms.json
│   ├── causes.json
│   ├── insights.json
│   ├── patterns.json
│   ├── actions.json
│   ├── modules.json
│   ├── prompts.json
│   └── adjacent-crises.json
├── ARCHITECTURE.md          ← this file
├── hyper-individualism-report.md
└── other-crisis.md
```
