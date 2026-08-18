#!/usr/bin/env bash
# Stop quality gate — typecheck / lint / format, blocking.
#
# - Runs only when code-relevant files changed; a docs-only turn skips it.
# - Respects `stop_hook_active`: if this Stop was already blocked once, a
#   still-failing gate downgrades to a warning instead of blocking again, so a
#   pre-existing failure the agent cannot fix does not loop forever.
# - A missing dependency downgrades a step and is reported; it never silently
#   passes (AGENTS.md, "Degraded Environments").

set -uo pipefail

ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$ROOT" || exit 0

INPUT=$(cat)

# `stop_hook_active` is Claude Code's "this Stop was already blocked once" flag.
# Cursor's stop payload carries `loop_count` (auto-followups already triggered)
# instead, and runs Claude-registered stop hooks with no loop limit — without
# this mapping a pre-existing failure would re-block forever there.
if command -v jq >/dev/null 2>&1; then
  STOP_ACTIVE=$(printf '%s' "$INPUT" | jq -r \
    'if (.stop_hook_active == true) or ((.loop_count // 0) > 0) then "true" else "false" end' \
    2>/dev/null || echo false)
else
  # No jq: emit plain text and never block, rather than guessing at the payload.
  STOP_ACTIVE="true"
fi

emit() { # $1 = summary, $2 = reason body
  if ! command -v jq >/dev/null 2>&1; then
    printf '%s\n%s\n' "$1" "$2" >&2
    exit 0
  fi
  if [ "$STOP_ACTIVE" = "true" ]; then
    jq -n --arg sum "$1" --arg body "$2" '{
      systemMessage: ("⚠️ Stop gate STILL failing (not re-blocking — stop_hook_active): " + $sum + " — if this failure is pre-existing or unfixable, report it to the user explicitly; do not treat it as passed.\n" + $body)
    }'
  else
    jq -n --arg sum "$1" --arg body "$2" '{
      systemMessage: ("⛔ Stop block: " + $sum),
      decision: "block",
      reason: ($sum + "\n\n" + $body)
    }'
  fi
  exit 0
}

note() { # $1 = message — informational only, never blocks
  if command -v jq >/dev/null 2>&1; then
    jq -n --arg msg "$1" '{systemMessage: $msg}'
  else
    printf '%s\n' "$1"
  fi
  exit 0
}

# Nothing changed — nothing to check.
if [ -z "$(git status --porcelain 2>/dev/null)" ]; then
  exit 0
fi

# Full-path, newline-delimited (porcelain + awk truncates filenames containing
# spaces and would silently skip the gate for them). --no-renames lists both
# sides of a rename so neither path escapes the checks.
CHANGED=$(git diff --name-only --no-renames HEAD 2>/dev/null || true)
UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null || true)
ALL_FILES=$(printf '%s\n%s' "$CHANGED" "$UNTRACKED" | sort -u)

CODE_CHANGED=$(printf '%s\n' "$ALL_FILES" | grep -cE '\.(ts|tsx|js|jsx|mjs|cjs|mts|json|css)$' || true)

if [ "$CODE_CHANGED" -eq 0 ]; then
  note "✅ Stop gate: no code-relevant changes (quality gate skipped)"
fi

if ! command -v bun >/dev/null 2>&1; then
  note "⚠️ Stop gate: SKIPPED — bun is not on PATH. Treat typecheck / lint / format as NOT RUN, and say so when reporting completion."
fi

if [ ! -d node_modules ]; then
  note "⚠️ Stop gate: SKIPPED — node_modules is missing (run \`bun install\`). Treat typecheck / lint / format as NOT RUN, and say so when reporting completion."
fi

OUT=$(bun run typecheck 2>&1 && bun run lint 2>&1 && bun run format 2>&1)
RC=$?
if [ "$RC" -ne 0 ]; then
  emit "typecheck / lint / format failed. Fix before ending the turn." "$OUT"
fi

note "✅ Stop gate: typecheck / lint / format pass"
