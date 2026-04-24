#!/usr/bin/env bash
# Regression guard: every `See ADR-NN in docs/project_notes/decisions.md`
# reference in a LinkML description MUST resolve to a matching
# `## ADR-NN: ...` heading in decisions.md. Catches dangling ADR links
# before they reach review.
#
# Wired into task lint by spec 205-displaymode-playbackstate-linkml.
#
# Usage: bash scripts/check-adr-refs.sh
# Exit code 0 = clean, 1 = dangling references found

set -euo pipefail

DECISIONS_FILE="docs/project_notes/decisions.md"

# Extract unique ADR-NNN references (three-digit convention, e.g. ADR-021)
# from LinkML YAMLs. The literal `ADR-NN` placeholder does NOT match this
# regex — it is a template token replaced at feature-implementation time
# (see Feature 205 T067) and MUST be resolved before this guard runs clean.
REFS=$(grep -rhoE 'ADR-[0-9]{3}' shared/schemas/src/linkml/ --include='*.yaml' \
  | sort -u \
  || true)

DANGLING=""
for ref in $REFS; do
  if ! grep -qE "^###[[:space:]]+${ref}:" "$DECISIONS_FILE"; then
    DANGLING="${DANGLING}${ref} "
  fi
done

if [ -n "$DANGLING" ]; then
  echo "❌ LinkML ADR-reference regression guard failed!"
  echo ""
  echo "The following ADR IDs are cited in LinkML descriptions under"
  echo "\`shared/schemas/src/linkml/\` but do not resolve to a \`## ADR-NN: ...\`"
  echo "heading in \`${DECISIONS_FILE}\`. Either add the missing ADR entry,"
  echo "fix the reference, or remove the citation from the schema."
  echo ""
  echo "Dangling references:"
  for ref in $DANGLING; do
    echo "  - ${ref}"
  done
  exit 1
fi

echo "✅ All LinkML ADR references resolve (regression guard passed)"
