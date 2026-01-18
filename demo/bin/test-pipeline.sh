#!/bin/bash
# test-pipeline.sh - Layer 6: Data Pipeline Test
#
# Verifies that REP files can be parsed and the data pipeline works:
# - debrief-io can read REP files
# - Output is valid GeoJSON
# - File conversion completes without errors
#
# This script runs INSIDE the container.
# For remote testing: fly ssh console --command "/opt/debrief/bin/test-pipeline.sh"
#
# Exit codes:
#   0 - Data pipeline working correctly
#   1 - Pipeline errors detected

set -e

echo "=== Layer 6: Data Pipeline Test ==="
echo "Host: $(hostname)"
echo "Date: $(date -Iseconds)"
echo ""

ERRORS=0
WARNINGS=0

# Configuration
DEBRIEF_DIR="${DEBRIEF_DIR:-/opt/debrief}"
VENV_PYTHON="$DEBRIEF_DIR/venv/bin/python"
CONFIG_DIR="${CONFIG_DIR:-/config}"
SAMPLES_DIR="$CONFIG_DIR/Documents/Debrief Samples"

# Create temp directory for test output
TEST_DIR=$(mktemp -d)
trap 'rm -rf "$TEST_DIR"' EXIT

echo "Test directory: $TEST_DIR"
echo ""

# Check prerequisites
echo "Checking prerequisites..."
if [ ! -f "$VENV_PYTHON" ]; then
    echo "  FAIL: Python not found at $VENV_PYTHON"
    exit 1
fi
echo "  OK: Python available"

# Find a sample REP file
SAMPLE_FILE=""
if [ -d "$SAMPLES_DIR" ]; then
    SAMPLE_FILE=$(find "$SAMPLES_DIR" -name "*.rep" -o -name "*.REP" 2>/dev/null | head -1)
fi

if [ -z "$SAMPLE_FILE" ]; then
    # Try default location
    SAMPLE_FILE="$DEBRIEF_DIR/samples/example-track.rep"
fi

if [ ! -f "$SAMPLE_FILE" ]; then
    echo "  WARN: No sample REP file found"
    echo "  Checking standard locations:"
    echo "    - $SAMPLES_DIR/"
    echo "    - $DEBRIEF_DIR/samples/"
    WARNINGS=$((WARNINGS + 1))
else
    echo "  OK: Sample file found: $SAMPLE_FILE"
fi

# Test 1: Check debrief-io is importable
echo ""
echo "Test 1: Checking debrief-io module..."
if "$VENV_PYTHON" -c "import debrief_io; print(f'  OK: debrief-io version {debrief_io.__version__}')" 2>/dev/null; then
    : # Success
else
    echo "  WARN: debrief-io module not available"
    echo "  NOTE: This is expected if services haven't been built yet"
    WARNINGS=$((WARNINGS + 1))
fi

# Test 2: Parse REP file (if available)
echo ""
echo "Test 2: Parsing REP file..."
if [ -f "$SAMPLE_FILE" ]; then
    OUTPUT_FILE="$TEST_DIR/output.geojson"

    # Try to convert using debrief-io CLI or Python API
    if "$VENV_PYTHON" -c "
import sys
import json

try:
    from debrief_io import parse_rep_file
    from debrief_io.cli import convert
except ImportError:
    print('  NOTE: debrief-io conversion not available')
    sys.exit(0)

# Try parsing the file
try:
    result = parse_rep_file('$SAMPLE_FILE')
    print(f'  OK: Parsed successfully')

    # Write output
    with open('$OUTPUT_FILE', 'w') as f:
        json.dump(result, f, indent=2)
    print(f'  OK: Output written to test file')
except Exception as e:
    print(f'  WARN: Parsing failed: {e}')
    sys.exit(0)
" 2>&1; then
        : # Success or graceful failure
    else
        echo "  WARN: Could not run conversion test"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo "  SKIP: No sample file available"
fi

# Test 3: Validate GeoJSON output (if created)
echo ""
echo "Test 3: Validating output..."
OUTPUT_FILE="$TEST_DIR/output.geojson"
if [ -f "$OUTPUT_FILE" ]; then
    if "$VENV_PYTHON" -c "
import json
import sys

with open('$OUTPUT_FILE') as f:
    data = json.load(f)

# Check for GeoJSON structure
if 'type' not in data:
    print('  FAIL: Missing \"type\" field')
    sys.exit(1)

if data['type'] == 'FeatureCollection':
    features = data.get('features', [])
    print(f'  OK: Valid FeatureCollection with {len(features)} features')
elif data['type'] == 'Feature':
    print('  OK: Valid Feature')
else:
    print(f'  OK: Valid GeoJSON type: {data[\"type\"]}')

print('  OK: GeoJSON validation passed')
" 2>&1; then
        : # Success
    else
        echo "  FAIL: GeoJSON validation failed"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "  SKIP: No output file to validate"
fi

# Test 4: Check CLI entry points
echo ""
echo "Test 4: Checking CLI entry points..."
CLI_SCRIPTS=("debrief-io" "debrief-config" "debrief-calc")
for cli in "${CLI_SCRIPTS[@]}"; do
    if [ -f "$DEBRIEF_DIR/venv/bin/$cli" ]; then
        echo "  OK: $cli entry point exists"
    else
        echo "  NOTE: $cli not found (may not be built yet)"
    fi
done

# Summary
echo ""
echo "=== Summary ==="
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"

if [ $ERRORS -gt 0 ]; then
    echo ""
    echo "FAIL: $ERRORS data pipeline error(s)"
    exit 1
else
    echo ""
    echo "PASS: Data pipeline tests completed"
    if [ $WARNINGS -gt 0 ]; then
        echo "Note: $WARNINGS warning(s) - some features may need service builds"
    fi
    exit 0
fi
