# Not Just You Alone

A tool for understanding what's happening to us.

Not therapy. Not a quiz. A mirror — with context.

🌐 **Live:** [kashodiya.github.io/not-just-you-alone](https://kashodiya.github.io/not-just-you-alone/)

---

## What Is This?

Modern life produces patterns that most people live inside without recognizing: loneliness disguised as independence, exhaustion mistaken for laziness, disconnection that feels like personal failure.

**Not Just You Alone** helps people:
- Recognize what they're feeling and why
- Understand that their struggles are structural, not character flaws
- See the bigger picture — they're not alone in this
- Find small, concrete things they can try

## Who Is This For?

Anyone who has ever thought:
- "Why can't I commit to anything?"
- "Why do I feel lonely even though I have friends online?"
- "Why does everything feel meaningless?"
- "Why am I so exhausted when I'm technically free?"
- "What's wrong with me?"

The answer, often, is: nothing is wrong with you. Something is wrong with the environment. This tool helps you see that.

## How It Works

You start with what you **feel** — not with theory or labels.

The tool connects your experience to causes (technological, economic, cultural, social, psychological), shows you the patterns at work, and offers experiments you can try. Not prescriptions. Experiments.

## Modules

| Module | Question It Answers |
|--------|-------------------|
| The Mirror | "What's happening to me?" |
| The Map | "Which forces are shaping my life?" |
| The Web | "How connected am I, really?" (optional) |
| The Path | "What can I try?" |
| The Bigger Picture | "Is it just me?" (it's not) |

## Explore the Data

Interactive visualizations of how symptoms, causes, patterns, and actions connect:

- [Heatmap](apps/heatmap/) — spot density and clusters
- [Radial Explorer](apps/radial-explorer/) — explore from any node outward
- [Insights Gallery](apps/insights-gallery/) — browse insights with illustrations

## Status

🚧 Early development — data architecture defined, content being populated.

## Project Structure

```
not-just-you-alone/
├── index.html              ← landing page (GitHub Pages entry)
├── README.md               ← you are here
├── ARCHITECTURE.md         ← data architecture & technical decisions
├── apps/                   ← interactive visualizations
│   ├── heatmap/
│   ├── insights-gallery/
│   └── radial-explorer/
├── research/
│   ├── README.md           ← research index & processing status
│   ├── sources.md          ← references, books, key thinkers
│   └── notes/              ← all research material (flat, no hierarchy)
├── data/                   ← structured JSON (the app's brain)
│   ├── symptoms.json
│   ├── causes.json
│   ├── insights.json
│   ├── patterns.json
│   ├── actions.json
│   └── adjacent-crises.json
└── tools/                  ← CLI utilities for data management
```

## Philosophy

This tool is built on a few beliefs:

1. **Understanding what shaped you isn't an excuse — it's where agency begins.** Loneliness, purposelessness, and anxiety have structural causes. Seeing them clearly is the first step to doing something about it.
2. **Understanding is the first step.** You can't change what you can't see.
3. **Labels are doors, not rooms.** Recognition is a starting point, not a destination.
4. **Small experiments beat grand plans.** One phone-free meal this week matters more than a life overhaul you'll never start.
5. **It's not just you.** Whatever you're feeling, millions of others are feeling it too — for the same structural reasons.

## Contributing

This is a public awareness project. If you'd like to contribute research, content, illustrations, or code — reach out.

## License

TBD

---

*"The task is not to return to the past, but to build something new: a way of living that says you are free AND you are needed, you are unique AND you belong to something larger."*
