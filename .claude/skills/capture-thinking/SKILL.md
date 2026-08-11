# capture-thinking

## When to trigger

Use this skill when the user reveals a **reusable pattern of reasoning** — not just a one-off instruction. Examples:

- A heuristic for weighing tradeoffs (e.g. "does this remove complexity or just move it somewhere else?")
- A correction to an assumption you made (e.g. "no, that's not how we do it here")
- A stated preference about process, communication, or scope
- A product/architecture principle they're applying consistently

**Do NOT trigger** for routine task requests, even if they carry some implicit reasoning. The bar is: "would this pattern be useful to inherit in a future session?"

## What to capture

1. **The pattern itself** — state it as a general principle, not tied to the specific code/task
2. **The context that triggered it** — what situation made the user reveal this pattern
3. **Anti-pattern it counters** — what common mistake this prevents

## Where to store

Append to the relevant file:

- **Architecture/product patterns** → `docs/CONTEXTO.md` (new section: "Patrones de decisión")
- **Code/implementation patterns** → `CLAUDE.md` (under "Reglas duras" or a new "Patrones" section)
- **UX/design patterns** → `docs/DESIGN_GUIDELINES.md` (new section: "Patrones responsive / UX")
- **Process/communication patterns** → `CLAUDE.md` (under "Convenciones")

Always add a date stamp `(YYYY-MM-DD)` to new entries.

## Format

```markdown
### [Pattern Name] (YYYY-MM-DD)
**Contexto**: [what situation triggered this]
**Patrón**: [the reusable principle]
**Anti-patrón**: [what common mistake this prevents]
```
