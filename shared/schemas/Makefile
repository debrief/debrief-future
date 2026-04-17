.PHONY: all generate generate-pydantic generate-jsonschema generate-typescript docs docs-md docs-html docs-serve test test-python test-typescript clean help

# Default target
all: generate test

# === Generation Targets ===

generate: generate-pydantic generate-jsonschema generate-typescript
	@echo "[OK] All schemas generated"

generate-pydantic:
	@echo "Generating Pydantic models..."
	python scripts/generate.py --target pydantic
	@echo "[OK] Pydantic models generated"

generate-jsonschema:
	@echo "Generating JSON Schema..."
	python scripts/generate.py --target jsonschema
	@echo "[OK] JSON Schema generated"

generate-typescript:
	@echo "Generating TypeScript interfaces..."
	python scripts/generate.py --target typescript
	@echo "[OK] TypeScript interfaces generated"

# === Documentation Targets ===
# Produces build/md/ (via linkml gen-doc) and build/html/ (via mkdocs build).
# Neither output is committed — gh-pages is the canonical hosted surface.

docs: docs-md docs-html
	@echo "[OK] Documentation built: build/html/index.html"

docs-md:
	@echo "Generating Markdown docs (linkml gen-doc)..."
	python scripts/generate.py --target docs
	@echo "[OK] Markdown docs generated in build/md/"

docs-html: docs-md
	@echo "Building HTML site (mkdocs)..."
	mkdocs build
	@echo "[OK] HTML site built in build/html/"

docs-serve: docs-md
	@echo "Serving docs at http://localhost:8000 (Ctrl+C to stop)..."
	mkdocs serve

# === Test Targets ===

test: test-python test-typescript
	@echo "[OK] All tests passed"

test-python:
	@echo "Running Python tests..."
	uv run pytest tests/ -v
	@echo "[OK] Python tests passed"

test-typescript:
	@echo "Running TypeScript tests..."
	pnpm exec node tests/validate-jsonschema.js
	pnpm exec tsc --noEmit --project src/generated/typescript/tsconfig.json
	@echo "[OK] TypeScript tests passed"

# === Validation Targets ===

validate-linkml:
	@echo "Validating LinkML schemas..."
	linkml-validate -s src/linkml/debrief.yaml
	@echo "[OK] LinkML schemas valid"

validate-fixtures:
	@echo "Validating fixtures against schemas..."
	python scripts/generate.py --validate-fixtures
	@echo "[OK] All fixtures validated"

# === Clean Target ===

clean:
	@echo "Cleaning generated files..."
	rm -rf src/generated/python/debrief_schemas/*.py
	rm -rf src/generated/json-schema/*.json
	rm -rf src/generated/typescript/*.ts
	rm -rf build/
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	@echo "[OK] Clean complete"

# === Help ===

help:
	@echo "Debrief Schemas Makefile"
	@echo ""
	@echo "Usage: make <target>"
	@echo ""
	@echo "Targets:"
	@echo "  all              Generate schemas and run tests (default)"
	@echo "  generate         Generate all derived schemas"
	@echo "  generate-pydantic   Generate Pydantic models only"
	@echo "  generate-jsonschema Generate JSON Schema only"
	@echo "  generate-typescript Generate TypeScript interfaces only"
	@echo "  docs             Build Markdown + HTML documentation"
	@echo "  docs-md          Run linkml gen-doc only (build/md/)"
	@echo "  docs-html        Run mkdocs build only (build/html/)"
	@echo "  docs-serve       Run mkdocs serve on localhost:8000"
	@echo "  test             Run all tests"
	@echo "  test-python      Run Python tests only"
	@echo "  test-typescript  Run TypeScript tests only"
	@echo "  validate-linkml  Validate LinkML schema syntax"
	@echo "  validate-fixtures Validate fixtures against schemas"
	@echo "  clean            Remove generated files"
	@echo "  help             Show this help message"
