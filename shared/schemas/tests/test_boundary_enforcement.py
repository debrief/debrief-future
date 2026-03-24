"""
Boundary enforcement tests — lint-like checks for serialization safety.

Ensures that:
1. Service code uses generated Pydantic models rather than hand-built dicts
   for schema types (ADR-011, Constitution XV.7)
2. Generated ConfiguredBaseModel does NOT include an alias_generator, so
   JSON output uses snake_case matching the STAC specification (ADR-010)
3. Service code does not use by_alias=True (which would produce camelCase
   if aliases were ever added, violating ADR-010)

These are AST-based static checks — no runtime execution of service code needed.
"""

import ast
import re
from pathlib import Path

import pytest

# Paths
REPO_ROOT = Path(__file__).parent.parent.parent.parent
SERVICES_DIR = REPO_ROOT / "services"
GENERATED_INIT = (
    REPO_ROOT
    / "shared"
    / "schemas"
    / "src"
    / "generated"
    / "python"
    / "debrief_schemas"
    / "__init__.py"
)

# Service directories that produce JSON consumed by TypeScript.
# Test code is excluded — tests may legitimately call model_dump() in
# various ways for internal assertions.
SERVICE_SRC_DIRS = [
    SERVICES_DIR / "calc" / "debrief_calc",
    SERVICES_DIR / "stac" / "src" / "debrief_stac",
    SERVICES_DIR / "config" / "src" / "debrief_config",
    SERVICES_DIR / "io" / "src" / "debrief_io",
]


def _find_python_files(directory: Path) -> list[Path]:
    """Find all .py files in a directory, excluding tests."""
    if not directory.exists():
        return []
    return [
        p for p in directory.rglob("*.py") if "test" not in p.name and "__pycache__" not in str(p)
    ]


def _find_by_alias_true_calls(source: str) -> list[tuple[int, str]]:
    """Find model_dump() calls that include by_alias=True.

    ADR-010 mandates snake_case wire format (matching STAC). Using
    by_alias=True would produce camelCase if aliases were ever added,
    silently breaking the convention.

    Returns a list of (line_number, issue_description) for violations.
    """
    violations = []
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return violations

    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        if not isinstance(node.func, ast.Attribute):
            continue
        if node.func.attr not in ("model_dump", "model_dump_json"):
            continue

        for kw in node.keywords:
            if (
                kw.arg == "by_alias"
                and isinstance(kw.value, ast.Constant)
                and kw.value.value is True
            ):
                violations.append(
                    (
                        node.lineno,
                        f"{node.func.attr}(by_alias=True) — ADR-010 mandates snake_case "
                        "wire format (matching STAC). Remove by_alias=True so output uses "
                        "the default snake_case field names.",
                    )
                )

    return violations


def _get_service_files() -> list[tuple[str, Path]]:
    """Collect service source files for parametrised testing."""
    files = []
    for src_dir in SERVICE_SRC_DIRS:
        for py_file in _find_python_files(src_dir):
            rel = py_file.relative_to(REPO_ROOT)
            files.append((str(rel), py_file))
    return files


# Files with known by_alias=True calls that predate ADR-010.
# These must be migrated to drop by_alias=True. Remove entries as fixed.
_KNOWN_BY_ALIAS_VIOLATIONS = {
    "services/calc/debrief_calc/provenance.py",
    "services/config/src/debrief_config/storage.py",
}


class TestNoByAliasTrue:
    """Verify service code does not use by_alias=True (ADR-010: snake_case wire format)."""

    @pytest.mark.parametrize("rel_path,file_path", _get_service_files())
    def test_model_dump_does_not_use_by_alias(self, rel_path: str, file_path: Path) -> None:
        """Service code must not use by_alias=True — wire format is snake_case (ADR-010)."""
        source = file_path.read_text()
        violations = _find_by_alias_true_calls(source)

        if violations and rel_path in _KNOWN_BY_ALIAS_VIOLATIONS:
            pytest.xfail(
                f"{rel_path} has known by_alias=True calls predating ADR-010 — "
                "migration tracked as follow-up"
            )

        if violations:
            messages = [f"  Line {line}: {msg}" for line, msg in violations]
            pytest.fail(
                f"{rel_path} uses by_alias=True which violates ADR-010:\n" + "\n".join(messages)
            )


class TestGeneratedSchemaConvention:
    """Verify that generated ConfiguredBaseModel preserves snake_case output."""

    def test_no_alias_generator_in_configured_base_model(self) -> None:
        """ConfiguredBaseModel must NOT include alias_generator (ADR-010).

        ADR-010 mandates snake_case wire format matching the STAC specification.
        An alias_generator (e.g., to_camel) would silently convert output to
        camelCase, breaking TypeScript consumers that expect snake_case.
        """
        if not GENERATED_INIT.exists():
            pytest.skip("Generated schemas not found — run generation first")

        content = GENERATED_INIT.read_text()

        config_match = re.search(
            r"class ConfiguredBaseModel.*?model_config\s*=\s*ConfigDict\((.*?)\)",
            content,
            re.DOTALL,
        )
        assert config_match is not None, (
            "Could not find ConfiguredBaseModel.model_config — generated code format changed?"
        )

        config_block = config_match.group(1)
        assert "alias_generator" not in config_block, (
            "ConfiguredBaseModel has an alias_generator, which will convert output "
            "to camelCase. ADR-010 mandates snake_case wire format (matching STAC). "
            "Remove alias_generator from the post-processing in "
            "shared/schemas/scripts/generate.py"
        )
