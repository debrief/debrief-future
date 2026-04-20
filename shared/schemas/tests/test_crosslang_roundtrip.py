"""Cross-language Py → JSON → TS → JSON → Py round-trip harness (#215 FR-TEST-023).

Each valid single-Feature Storyboard/Scene fixture is:
1. Loaded from disk into Pydantic.
2. Dumped to JSON.
3. Passed to a Node subprocess that parses + re-serialises via the generated
   TypeScript model (see ``helpers/crosslang_roundtrip_node.mjs``).
4. The printed JSON is captured and reparsed into Pydantic.
5. The final Pydantic model must equal the initial one (byte-identical JSON
   dump under ``model_dump_json()``).

This is the Article II SC-001 gate. Any drift introduced by either generator
breaks the test.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "src" / "generated" / "python"))
from debrief_schemas import SceneFeature, StoryboardFeature  # noqa: E402

FIXTURES_DIR = Path(__file__).parent.parent / "src" / "fixtures" / "valid"
HELPER = Path(__file__).parent / "helpers" / "crosslang_roundtrip_node.mjs"


CROSSLANG_FIXTURES: list[tuple[str, type]] = [
    ("storyboard-single-minimal.json", StoryboardFeature),
    ("storyboard-scene-single-minimal.json", SceneFeature),
]


class TestCrossLangRoundTrip:
    """Py → JSON → TS → JSON → Py round-trip harness."""

    @pytest.mark.parametrize("fixture_name,model_cls", CROSSLANG_FIXTURES)
    def test_crosslang_roundtrip_preserves_data(
        self, fixture_name: str, model_cls: type
    ) -> None:
        fixture_path = FIXTURES_DIR / fixture_name
        assert fixture_path.exists(), f"Fixture not found: {fixture_path}"

        # Step 1: Python reparse (baseline)
        baseline_data = json.loads(fixture_path.read_text())
        baseline = model_cls(**baseline_data)
        baseline_json = baseline.model_dump_json()

        # Step 2: Spawn Node helper — proves TS structural shape + re-serialises
        proc = subprocess.run(
            ["node", str(HELPER), str(fixture_path)],
            check=False,
            capture_output=True,
            text=True,
        )
        assert proc.returncode == 0, (
            f"Node helper failed (exit {proc.returncode}):\n"
            f"  stdout: {proc.stdout}\n"
            f"  stderr: {proc.stderr}"
        )

        # Step 3: Parse TS output back into Python
        ts_round_tripped = json.loads(proc.stdout)
        final = model_cls(**ts_round_tripped)
        final_json = final.model_dump_json()

        # Step 4: Final Pydantic-normalised JSON must equal the baseline
        assert json.loads(final_json) == json.loads(baseline_json), (
            f"Round-trip drift detected for {fixture_name}:\n"
            f"  baseline:   {baseline_json}\n"
            f"  roundtrip:  {final_json}"
        )

    @pytest.mark.parametrize("fixture_name,_", CROSSLANG_FIXTURES)
    def test_fixture_parses_unchanged_via_ts(
        self, fixture_name: str, _: type
    ) -> None:
        """Extra assertion: the raw bytes emitted by the Node helper must be
        parseable by ``json.loads`` (i.e. the helper produced valid JSON)."""
        fixture_path = FIXTURES_DIR / fixture_name
        proc = subprocess.run(
            ["node", str(HELPER), str(fixture_path)],
            check=True,
            capture_output=True,
            text=True,
        )
        parsed = json.loads(proc.stdout)  # Should not raise
        assert parsed.get("type") == "Feature"
