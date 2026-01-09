.PHONY: all generate generate-pydantic generate-jsonschema generate-typescript test test-python test-typescript clean help

# Default target
all: generate test

# === Generation Targets ===

generate: generate-pydantic generate-jsonschema generate-typescript
	@echo "✓ All schemas generated"

generate-pydantic:
	@echo "Generating Pydantic models..."
	python scripts/generate.py --target pydantic
	@echo "✓ Pydantic models generated"

generate-jsonschema:
	@echo "Generating JSON Schema..."
	python scripts/generate.py --target jsonschema
	@echo "✓ JSON Schema generated"

generate-typescript:
	@echo "Generating TypeScript interfaces..."
	python scripts/generate.py --target typescript
	@echo "✓ TypeScript interfaces generated"

# === Test Targets ===

test: test-python test-typescript
	@echo "✓ All tests passed"

test-python:
	@echo "Running Python tests..."
	pytest tests/ -v
	@echo "✓ Python tests passed"

test-typescript:
	@echo "Running TypeScript tests..."
	pnpm test
	@echo "✓ TypeScript tests passed"

# === Validation Targets ===

validate-linkml:
	@echo "Validating LinkML schemas..."
	linkml-validate -s src/linkml/debrief.yaml
	@echo "✓ LinkML schemas valid"

validate-fixtures:
	@echo "Validating fixtures against schemas..."
	python scripts/generate.py --validate-fixtures
	@echo "✓ All fixtures validated"

# === Clean Target ===

clean:
	@echo "Cleaning generated files..."
	rm -rf src/generated/python/debrief_schemas/*.py
	rm -rf src/generated/json-schema/*.json
	rm -rf src/generated/typescript/*.ts
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	@echo "✓ Clean complete"

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
	@echo "  test             Run all tests"
	@echo "  test-python      Run Python tests only"
	@echo "  test-typescript  Run TypeScript tests only"
	@echo "  validate-linkml  Validate LinkML schema syntax"
	@echo "  validate-fixtures Validate fixtures against schemas"
	@echo "  clean            Remove generated files"
	@echo "  help             Show this help message"
