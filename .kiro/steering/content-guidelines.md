---
inclusion: fileMatch
fileMatchPattern: "data/**"
---

# Content Guidelines — Data Files

When creating or updating JSON files in `/data/`:

## Symptoms
- Write labels as feelings, not diagnoses: "Feeling purposeless" not "Lack of motivation disorder"
- `commonMisinterpretation` should be what the person tells themselves: "I'm lazy", "I'm broken"
- `structuralExplanation` should be the compassionate reframe — short, warm, clear
- Always link to at least one Cause and one Insight

## Causes
- `summary` is 1-2 sentences max — conversational, not academic
- `explanation` can be longer but stay accessible — assume no prior knowledge
- `metaphor` should be a vivid image that captures the essence
- Every cause should link to symptoms it produces

## Insights
- `coreIdea` is one sentence that could stand alone on a poster
- `reframe` is what changes how someone sees themselves — the "aha" moment
- `quotable` is a shareable one-liner

## Actions
- Frame as experiments, not prescriptions: "Try this for a week" not "You should do this"
- Include a concrete, specific `experiment` field — something doable THIS week
- Never moralize. Never shame. The person is already doing their best.

## General Rules
- IDs use kebab-case: `symptom-purposeless`, `cause-smartphone-revolution`
- All cross-references use IDs (not titles)
- Keep JSON valid — arrays for multi-references, objects for structured data
- When in doubt about tone: would a compassionate, slightly older friend say it this way?
