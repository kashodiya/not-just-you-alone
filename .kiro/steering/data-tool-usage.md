---
inclusion: fileMatch
fileMatchPattern: "data/**"
---

# Data CLI Tool — Usage Guide

Located at `tools/data-cli.js`. Use this tool for ALL data modifications to maintain referential integrity.

## When To Use

**ALWAYS use the tool when:**
- Adding a new entity (symptom, cause, insight, pattern, action, crisis)
- Creating links between entities
- Deleting an entity (ensures cascade cleanup)
- After any manual edit to JSON files (run validate + check-refs)

**OK to edit manually:**
- Updating text fields (summary, explanation, metaphor) that don't involve IDs
- But still run `validate` after

## Commands

```bash
# Check everything is valid
node tools/data-cli.js validate

# Find broken references and missing back-links
node tools/data-cli.js check-refs

# See what exists
node tools/data-cli.js list symptom
node tools/data-cli.js list cause
node tools/data-cli.js stats

# View a specific entity
node tools/data-cli.js get cause-smartphone-revolution

# Add a new entity (handles back-references automatically)
node tools/data-cli.js add insight '{"id":"insight-example","title":"Example",...}'

# Update a single field
node tools/data-cli.js update symptom-purposeless label "New label text"

# Add a link between two entities (bidirectional)
node tools/data-cli.js link symptom-purposeless cause-new-cause relatedCauses symptoms

# Remove a link
node tools/data-cli.js unlink symptom-purposeless cause-old-cause relatedCauses symptoms

# Delete (cleans up ALL references to this entity everywhere)
node tools/data-cli.js delete cause-old-one
```

## Workflow For Adding New Research

1. Read the new research file
2. Identify new entities to create
3. Use `add` command for each new entity (back-refs handled automatically)
4. Use `link` command for any additional connections
5. Run `validate` and `check-refs` to confirm integrity
6. Update `research/README.md` to mark file as processed

## Entity ID Conventions

- Symptoms: `symptom-short-descriptor` (e.g., `symptom-purposeless`)
- Causes: `cause-short-descriptor` (e.g., `cause-smartphone-revolution`)
- Insights: `insight-short-descriptor` (e.g., `insight-freedom-compulsory`)
- Patterns: `pattern-short-descriptor` (e.g., `pattern-friction-removal`)
- Actions: `action-short-descriptor` (e.g., `action-digital-discipline`)
- Crises: `crisis-short-descriptor` (e.g., `crisis-meaning`)

## Important Notes

- The `add` command takes a JSON string. On Windows CMD, use single quotes or escape double quotes.
- The `link` command takes: id1, id2, field-on-id1, field-on-id2 (for bidirectional)
- Dangling refs to files not yet created (insights, actions, etc.) are expected warnings, not errors
- Back-ref warnings mean a bidirectional link is incomplete — use `link` to fix
