#!/usr/bin/env bash
# Regression guard: every `ADR-NNN` citation anywhere in the repository MUST
# resolve to a matching `### ADR-NNN: ...` heading in decisions.md. Catches
# dangling ADR links before they reach review.
#
# Wired into task lint by spec 205-displaymode-playbackstate-linkml, originally
# scanning only LinkML YAML under shared/schemas/src/linkml/. Widened to the
# whole repository because ADR IDs are cited ~610 times across markdown,
# TypeScript, Python and LinkML — the schema subset was roughly a tenth of them,
# so the other nine tenths were never checked.
#
# Usage: bash scripts/check-adr-refs.sh
# Exit code 0 = clean, 1 = dangling or malformed references found

set -euo pipefail

DECISIONS_FILE="docs/project_notes/decisions.md"

# ADR IDs deliberately reserved but not yet written up. Both are cited from the
# #248 / #249 extraction-kit runbooks; the numbering note in decisions.md
# (search "Numbering note (merge-resolution") records the reservation. Remove an
# entry here once its `### ADR-NNN:` heading exists.
RESERVED=("ADR-031" "ADR-032")

# File types that can legitimately carry an ADR citation.
FILE_GLOBS=('*.md' '*.ts' '*.tsx' '*.js' '*.cjs' '*.mjs' '*.py' '*.yaml' '*.yml' '*.sh' '*.json')

# Scan git-tracked files only, rather than walking the working tree. This keeps
# node_modules, .venv and build output out of scope for free, and — more
# importantly — means a developer's uncommitted scratch files can never fail
# lint for everyone. Only what is actually in the repository is policed.
#
# Collect `ADR-<digits>` with file:line so failures are actionable. The literal
# `ADR-NN` placeholder does not match — it is a template token replaced at
# feature-implementation time (see Feature 205 T067).
#
# Headings inside decisions.md are definitions, not citations, so they are
# filtered out below; cross-references *between* ADRs in that file are still
# checked.
ALL_HITS=$(git ls-files -z -- "${FILE_GLOBS[@]}" \
  | xargs -0 grep -noE 'ADR-[0-9]+' 2>/dev/null \
  | grep -vE "^${DECISIONS_FILE}:[0-9]+:###[[:space:]]" \
  || true)

# decisions.md headings define the valid set.
DEFINED=$(grep -oE '^###[[:space:]]+ADR-[0-9]{3}:' "$DECISIONS_FILE" \
  | grep -oE 'ADR-[0-9]{3}' \
  | sort -u)

is_defined() { printf '%s\n' "$DEFINED" | grep -qx "$1"; }
is_reserved() {
  local ref="$1"
  for r in "${RESERVED[@]}"; do [ "$r" = "$ref" ] && return 0; done
  return 1
}

DANGLING_REPORT=""
MALFORMED_REPORT=""
seen_dangling=""
seen_malformed=""

while IFS= read -r hit; do
  [ -z "$hit" ] && continue
  ref="${hit##*:}"                       # the matched ADR token
  loc="${hit%:*}"                        # ./path/file.ts:42
  digits="${ref#ADR-}"

  # Our convention is exactly three digits. Anything else never resolves —
  # zero-padded four-digit forms are the common slip and match nothing in
  # decisions.md while looking plausible in review.
  if [ "${#digits}" -ne 3 ]; then
    case "$seen_malformed" in
      *"|$ref|"*) ;;
      *) MALFORMED_REPORT="${MALFORMED_REPORT}  - ${ref} (${loc})"$'\n'
         seen_malformed="${seen_malformed}|$ref|" ;;
    esac
    continue
  fi

  if ! is_defined "$ref" && ! is_reserved "$ref"; then
    case "$seen_dangling" in
      *"|$ref|"*) ;;
      *) DANGLING_REPORT="${DANGLING_REPORT}  - ${ref} (first seen: ${loc})"$'\n'
         seen_dangling="${seen_dangling}|$ref|" ;;
    esac
  fi
done <<< "$ALL_HITS"

FAILED=0

if [ -n "$MALFORMED_REPORT" ]; then
  echo "❌ Malformed ADR references (must be exactly three digits, e.g. ADR-030):"
  echo ""
  printf '%s' "$MALFORMED_REPORT"
  echo ""
  FAILED=1
fi

if [ -n "$DANGLING_REPORT" ]; then
  echo "❌ ADR-reference regression guard failed!"
  echo ""
  echo "The following ADR IDs are cited in the repository but do not resolve to"
  echo "a \`### ADR-NNN: ...\` heading in \`${DECISIONS_FILE}\`. Either add the"
  echo "missing ADR entry, fix the reference, or remove the citation."
  echo ""
  printf '%s' "$DANGLING_REPORT"
  echo ""
  FAILED=1
fi

[ "$FAILED" -eq 1 ] && exit 1

TOTAL=$(printf '%s\n' "$ALL_HITS" | grep -c . || true)
DEFINED_COUNT=$(printf '%s\n' "$DEFINED" | grep -c . || true)
echo "✅ All ADR references resolve — ${TOTAL} citation(s) across the repo against ${DEFINED_COUNT} defined ADR(s) (regression guard passed)"
if [ "${#RESERVED[@]}" -gt 0 ]; then
  echo "   note: ${RESERVED[*]} allowlisted as reserved-but-unwritten (see the numbering note in ${DECISIONS_FILE})"
fi
