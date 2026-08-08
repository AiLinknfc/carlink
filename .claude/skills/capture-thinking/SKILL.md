---
name: capture-thinking
description: Use whenever the user reveals a reusable piece of *how they think*, not just what they want done right now — a heuristic for weighing tradeoffs (e.g. "does this remove complexity or just move it somewhere else?"), a correction to an assumption you made, a stated preference about process/communication/scope, or a product/architecture principle they're applying. Trigger this at the end of a turn where that kind of reasoning showed up, so the next session inherits the pattern instead of the assistant re-deriving or re-asking for it. Do not trigger for routine task requests that carry no generalizable reasoning.
---

# Capture the user's thinking patterns, not just their instructions

CarLink's owner (andresypm@gmail.com) works hands-on across product, backend, frontend, and infra
in the same conversation, and often explains *why* he wants something, not just *what* — e.g.
questioning whether removing a feature actually simplifies the system, or catching when a
convenient-looking fix would just relocate complexity instead of removing it. That reasoning is
worth more long-term than the specific decision it produced, because it predicts how he'll evaluate
the *next* proposal too. The existing memory system (see the "Memory" section of the system prompt)
already persists facts across sessions — this skill is about actually using it for this specific
category, consistently, instead of only when it happens to come up.

## When to fire

Fire this at a natural point in the conversation (end of turn, after a decision lands) when the
user did one of these — not for every message:

- **Evaluated a tradeoff out loud**, especially "does X reduce complexity or just move it
  elsewhere" style reasoning (the seed example: questioning whether dropping the free NFC-keychain
  trial for taller/empresa would simplify things — concluded no, because the validation logic
  doesn't shrink, it just loses its only pre-purchase conversion path).
- **Corrected an assumption** you made about the product, the users, or how something should work.
- **Stated a process/communication preference** ("don't push without asking again," "no emojis in
  the UI," "unify scattered docs into one," "read context automatically each session").
- **Applied a product/architecture principle** that would generalize to future decisions (e.g. a
  bar for when automation is allowed to write into another account's data without per-instance
  confirmation).

Do **not** fire for: routine feature requests, one-off bug reports, or anything that's just an
instruction with no reusable reasoning behind it — that's what the task itself is for, not memory.

## How to capture it

1. **Check for an existing memory file to update first** — read `MEMORY.md` in the memory
   directory named in the system prompt. If a `feedback` or `project` memory already covers this
   theme, update it (and its `modified` context) rather than creating a near-duplicate.
2. **Write the pattern, not the transcript.** Compress "user said X about Y" into the general
   heuristic X implies, so it transfers to situations that look nothing like the one that surfaced
   it. Bad: "user didn't want to remove the free keychain trial." Good: "user's default lens on
   architecture changes is whether they remove complexity system-wide or just relocate it to
   another part of the flow — flag proposals that look simpler locally but push
   validation/edge-cases elsewhere."
3. **Use the standard memory file format** (frontmatter `name`/`description`/`metadata.type`, body
   with `**Why:**` and `**How to apply:**` for `feedback`/`project` types). Type is almost always
   `feedback` (how to work with him) or `project` (something true about this codebase/effort) for
   what this skill captures — rarely `user` (that's for stable identity facts) or `reference`.
4. **Link related memories** with `[[name]]` — this project already has
   `[[project_tallerpro_migration_plan]]`, `[[feedback_verify_against_live_systems]]`,
   `[[user_carlink_role_and_style]]` and others; connect new captures to them where relevant instead
   of writing isolated fragments.
5. **Add the one-line pointer to `MEMORY.md`** — that index is what actually loads into context
   each session, so a memory file without a pointer there is invisible next time.
6. Keep it short. This is a heuristic for future-you to recognize a pattern, not a case study.
