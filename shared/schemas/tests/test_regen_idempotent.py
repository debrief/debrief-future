"""
Regeneration idempotency adherence test (Feature 205 / FR-030 / SC-014).

Running `generate.py all` twice in succession MUST produce byte-identical
output. Locks in the Phase 0 deterministic-regeneration assumption so a
future LinkML toolchain update cannot silently introduce ordering drift.

The test operates on pytest's tmp_path fixture — the working-tree
generated artefacts at `shared/schemas/src/generated/` are NEVER mutated
by this test (R2-4A).
"""

import hashlib
import shutil
import subprocess
import sys
from pathlib import Path

SCHEMAS_ROOT = Path(__file__).parent.parent


def _hash_tree(root: Path) -> dict[str, str]:
    hashes: dict[str, str] = {}
    for f in sorted(root.rglob("*")):
        if f.is_file() and not f.name.endswith(".pyc"):
            hashes[str(f.relative_to(root))] = hashlib.sha256(f.read_bytes()).hexdigest()
    return hashes


def test_generate_is_idempotent(tmp_path: Path) -> None:
    """Two consecutive `generate.py --target all` runs produce byte-identical output.

    Uses tmp_path for both the LinkML source and generator script, so the
    committed artefacts under `shared/schemas/src/generated/` are never
    touched by this test.
    """
    # Stage a minimal working copy of `shared/schemas/` under tmp_path.
    sandbox = tmp_path / "schemas"
    shutil.copytree(SCHEMAS_ROOT / "src" / "linkml", sandbox / "src" / "linkml")
    shutil.copytree(SCHEMAS_ROOT / "scripts", sandbox / "scripts")
    fixtures_src = SCHEMAS_ROOT / "fixtures"
    if fixtures_src.exists():
        shutil.copytree(fixtures_src, sandbox / "fixtures", dirs_exist_ok=True)
    src_fixtures = SCHEMAS_ROOT / "src" / "fixtures"
    if src_fixtures.exists():
        shutil.copytree(src_fixtures, sandbox / "src" / "fixtures", dirs_exist_ok=True)
    (sandbox / "src" / "generated").mkdir(parents=True, exist_ok=True)

    gen_script = sandbox / "scripts" / "generate.py"
    generated_dir = sandbox / "src" / "generated"

    # First run — populates generated/.
    subprocess.run(
        [sys.executable, str(gen_script), "--target", "all"],
        check=True,
        cwd=sandbox,
    )
    first = _hash_tree(generated_dir)

    # Second run — into the same sandbox; expected to be byte-identical.
    subprocess.run(
        [sys.executable, str(gen_script), "--target", "all"],
        check=True,
        cwd=sandbox,
    )
    second = _hash_tree(generated_dir)

    assert first == second, (
        "generate.py is not idempotent — second run produced different output:\n"
        + "\n".join(
            f"  {path}: {first.get(path, '<missing>')} -> {second.get(path, '<missing>')}"
            for path in sorted(set(first) | set(second))
            if first.get(path) != second.get(path)
        )
    )
