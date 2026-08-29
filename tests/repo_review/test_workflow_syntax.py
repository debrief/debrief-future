"""Structural check: workflow.js parses in the Workflow runtime's execution model.

The Workflow runtime executes the script body inside an async function scope
(top-level ``await`` and ``return`` are valid there), so a bare ``node --check``
false-positives on the final return. This test replicates the wrapping: strip
the ``export const meta`` prefix, wrap the body in an async arrow via the
Function constructor, and assert it parses. Catches syntax rot in a file no
other tooling validates.

Skipped when node is unavailable (it is present in CI, which runs the TS
toolchain in the same job).
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = REPO_ROOT / ".claude/review/workflow.js"

_WRAP_AND_PARSE = """
const fs = require('fs');
const src = fs.readFileSync(process.argv[1], 'utf8').replace(/^export /m, '');
new Function(
  'agent', 'parallel', 'pipeline', 'phase', 'log', 'args', 'budget', 'workflow',
  '"use strict"; return (async () => {' + src + '})()'
);
console.log('OK');
"""


@pytest.mark.skipif(shutil.which("node") is None, reason="node not available")
def test_workflow_script_parses_in_async_wrapper() -> None:
    result = subprocess.run(
        ["node", "-e", _WRAP_AND_PARSE, str(WORKFLOW)],
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    assert result.returncode == 0, f"workflow.js failed to parse:\n{result.stderr}"
    assert result.stdout.strip() == "OK"


@pytest.mark.skipif(shutil.which("node") is None, reason="node not available")
def test_workflow_meta_is_pure_literal() -> None:
    """The Workflow runtime requires `meta` to be a pure object literal."""
    text = WORKFLOW.read_text(encoding="utf-8")
    assert text.lstrip().startswith("//") or text.lstrip().startswith("export const meta"), (
        "workflow.js must start with comments or the meta export"
    )
    assert "export const meta" in text
    # Crude but effective: the meta block must not interpolate or spread.
    meta_block = text.split("export const meta", 1)[1].split("\n}", 1)[0]
    for forbidden in ("${", "...", "Date.now", "Math.random"):
        assert forbidden not in meta_block, f"meta block contains computed value: {forbidden}"
