---
inclusion: fileMatch
fileMatchPattern: "research/**"
---

# Research Workflow

When working with files in `research/`:

## Reading New Research

1. Read the full file carefully
2. Identify what's NEW vs. what overlaps with existing knowledge
3. For new content, determine which entities it creates or enriches:
   - New symptoms? New causes? New insights? New patterns? New actions?
   - New connections between existing entities?
   - New adjacent crises?
4. Update the relevant `data/*.json` files
5. Update `research/README.md` — mark the file as processed, note what was extracted

## Overlapping Content

Research files WILL overlap. That's fine. When content overlaps:
- Don't duplicate entities in `data/` — enrich existing ones
- Add new connections, better metaphors, richer explanations
- Note the source if it adds a useful perspective

## Processing Status

In `research/README.md`, each file gets a status:
- ✅ Processed — content has been synthesized into `data/`
- 🔄 Partially processed — some content extracted, more to do
- ⬜ Unprocessed — dropped in, not yet read/synthesized

## Important

- The research folder has NO hierarchy or taxonomy. It's flat.
- ALL structure and categorization lives in `data/`
- Research files are source material. Data files are the synthesized product.
