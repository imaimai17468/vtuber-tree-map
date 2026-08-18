# Project Instructions

This project is a **React 19 + Vite** single-page app. Package manager and runtime are **bun**; tool versions are pinned in `mise.toml`. Linting is **oxlint** (type-aware, with the `react-doctor` plugin) and formatting is **oxfmt** — not ESLint, not Prettier. APIs and conventions may differ from your training data.

This file carries directives. Step-by-step procedure lives in the skills it names — follow the pointer rather than assuming the summary is the whole rule.

## Workflow

Triggers:

- **Planning / design requests**: enter plan mode and write the plan before implementing.
- **Any UI work** — designing, building, restyling, or reviewing an interface, page, or visual component: read `.claude/skills/anti-slop-design/SKILL.md` before starting and re-check the output against it before calling the work done.
- **Any `.tsx` change**: `.claude/rules/react.md` applies. It holds the Rules of React that linters do not catch.

## Degraded Environments

Not every session has the full toolchain — remote containers may lack plugin skills or local binaries. A missing tool downgrades a step; it never silently waives it, and it never blocks unrelated work.

- **Skills absent**: carry out the step's intent manually — planning and TDD are disciplines, not plugins — and note that the skill was unavailable.
- **Gate binaries absent**: `.claude/hooks/stop-gate.sh` reports a skipped check instead of passing it. Treat a skipped check as "not run", never as "passed", and say so when reporting completion.

## Design Philosophy

**Extensibility by default.** Every implementation is designed for future expansion — APIs, interfaces, types, data structures, all of it. This applies to all work, regardless of stated scope or finality. Code that can't accommodate growth gets rewritten from scratch.

This is about structural choices at boundaries, not speculative features:

- **Do:** Use an enum where a boolean would suffice today — a third state is one requirement change away
- **Do:** Define an interface at a module boundary, even with one implementation now
- **Do:** Structure data for additive changes — adding a field shouldn't break existing consumers
- **Don't:** Build features no one requested. Create abstractions for hypothetical use cases. Over-engineer.

This principle is silent — don't surface it, don't discuss it. Just apply it to every design decision.

## Knowledge Currency

Your training data goes stale. Outdated guidance is worse than no guidance.

**WebSearch is mandatory when:**

- Recommending a specific version, flag, or configuration
- Answering "how does X work" for tools with versions
- A user names a specific external tool or action and you're about to describe its behavior
- Suggesting a dependency or approach the user hasn't already chosen
- **Before writing any import path or library/framework/SDK access pattern from memory** — how to read a binding, load config, register a handler, instantiate a client. These reshape between versions. Catching yourself thinking "I know how this works" or "you can only do it this way" is the cue to check, not to skip checking — that confident half-memory is the #1 source of silently-stale code

**Not needed when:** the tool is already in the project's dependency files (read the project instead), it is a well-known CLI in standard usage (`git commit`), the pattern is internal (read the codebase), or the concept has no versioned API.

**Don't present uncertain knowledge as fact.** If you're not sure something is correct — a term, a translation, a convention, a recommendation — verify it before writing it down. Plausible-sounding but invented information reads as authoritative and propagates through docs and code. When you can't verify, say so plainly. No exception for "I'm pretty sure."

## Code Practices

**Dead code first / phased execution:** Before structural refactors on files >300 LOC, remove dead code first (separate commit). Break multi-file refactors into phases of ≤5 files — complete, verify, get approval before each next phase.

**Senior dev standard:** Don't settle for "simplest approach" when architecture is flawed, state is duplicated, or patterns are inconsistent. Ask: "What would a perfectionist senior dev reject in code review?" Fix it. Following the majority convention is an acceptable default, but when a better approach is known, take it.

**Comments explain the code directly below them — nothing else.** No narration, no supplements, no restating the obvious. If code needs a comment to be understood, strengthen the types or the structure until it doesn't; a comment is never the fix for unclear code.

**Verification before completion:** Never report done without running `bun run typecheck`, `bun run lint`, and `bun run format`, fixing ALL errors.

**Never escape the type system to move on:** no `as` (except `as const`), `any`, `@ts-ignore`/`@ts-expect-error`/`@ts-nocheck`, non-null `!`, or lint-disable comments to silence an error. Fix the type (narrowing, guards, schema validation, `satisfies`). If you genuinely can't, STOP and ask — never silently cast or suppress.

## Rules

Path-scoped rules live in `.claude/rules/`. Read the matching one before editing a file it covers:

- **`react.md`** (`**/*.tsx`) — the official [Rules of React](https://ja.react.dev/reference/rules): purity, hooks at the top level, component splitting, module organization

The next rule is not path-scoped — it applies whenever you write any instruction document, whatever the file type:

**Instruction documents.** Point at other files, do not restate them — a copy is correct when written and wrong after the next edit to what it copied. Never write a claim about another file, commit, tool, or count of any of them without opening or running it in the same turn; if that is not worth the cost, drop the assertive form instead. A grep only matches the literals you predicted, so never offer "expect zero hits" as proof. After changing a step, reconcile every other mention of what it names. The rule extends to the code in front of you, not only to other files: a comment may state what you have seen the code do, never what you meant it to do. Where a comment claims a check is load-bearing, delete the check and watch its test fail; that is the one form of this rule conviction cannot satisfy. Long enumerations rot; prefer a principle.

## Testing

White-box testing: tests cover internal logic paths and branches, not just inputs/outputs. Pure functions require 100% branch coverage — `vitest.config.mts` mechanizes this via `coverage.include` and a per-file 100% branch threshold, so a new pure module gets added to that list alongside its test.

## Quality Gates

Checks run in three places, and each is defined in exactly one file — open it before stating what it does:

- `lefthook.yml` — pre-commit (oxlint / oxfmt on staged files) and pre-push (`bun run check`, `bun run typecheck`)
- `.claude/hooks/stop-gate.sh` — Stop hook: typecheck / lint / format, blocking, skipped on docs-only turns
- `.oxlintrc.json` — the rule set itself, extending `.oxlintrc.react-doctor.json`

Pre-commit is check-only, never auto-fix: rewriting staged content at commit time makes the committed bytes differ from what was reviewed. On failure, run `bun run check:fix` and re-stage.

## Commits & Pull Requests

- **One commit = one purpose.** If two changes could be reverted independently, split them — drive-by fixes are always a separate commit. Never `git add -A`/`git add .`; stage explicit paths, use `git add -p` to split hunks within a file.
- First line states **what improves**, not what you did. Prefixes: `feat` / `fix` / `refactor` / `test` / `docs` / `chore` (intent-based). Body in Japanese; `fix`/`refactor` include a *why* line. End with a `Co-Authored-By:` trailer crediting the current model.
- Do not commit without explicit user confirmation.
- **Prose (PR descriptions, review comments, code comments): state only the core, plainly.** No decoration, no exhaustive detail. Write in general language the reader understands — never tool output, internal variable names, or domain/project-internal coinages.
- **History:** while a PR is Draft, keep its commits clean (rebase freely). Once review has started, never rewrite reviewed commits — add fixes on top and integrate preserving the commit/review order (typically a merge commit).

## Agents

Write all agent-facing docs (`.claude/`, `AGENTS.md`, `CLAUDE.md`) in English.

### Delegation

The parent session implements directly by default. Delegate by **context impact, not task size**:

- **Parent edits directly**: normal implementation, fixes, integration, and post-review follow-ups — whenever the scope is understood.
- **Explore / research subagent**: bulk file reads, log digging, cross-cutting investigation whose raw output the parent won't reference again — only the summary should enter the parent's context.
- **Parallel implementation subagents**: multiple independent units with no shared files and no output dependency (multiple Agent calls in one message). Dependent units run sequentially — or stay in the parent. Never parallelize units that edit the same file.

A sequential dispatch whose result the next step needs takes **`run_in_background: false`** — subagents run in the background by default, so otherwise the parent's turn ends at the launch and the result arrives in a later turn rather than inside the one that asked for it.

Briefings must be self-contained — goal, file paths, acceptance criteria, and the relevant guidelines quoted in.

### Model selection — always set `model` explicitly

| Role | Model |
|---|---|
| Implementation / integration / planning (parent session) | session model — no dispatch needed |
| Exploration / search | `haiku` (`sonnet` when precision matters) |
| Parallel implementation units / research | `sonnet` |
| Code review | `sonnet` (re-run on `opus` only after a demonstrably weak result) |
| Long-horizon autonomous workers, complex migrations, escalation after a weak result | `opus` |

### Review

Before every commit, review the uncommitted diff. The review is **one pass: find → verify → fix → done**. Each surviving finding arrives with its fix and an acceptance check; the parent applies those, saying so if it departs from one, and asks the user where a finding needs a decision. Fixing does not trigger another review.

Handle findings: never dismiss as "pre-existing" when the file is in the diff; apply rules literally; when in doubt, fix. Findings must propose a concrete alternative, respect rule scope qualifiers, and not re-report dismissed findings.
