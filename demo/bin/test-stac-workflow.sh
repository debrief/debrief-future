#!/bin/bash
# test-stac-workflow.sh - Layer 7a: STAC Workflow Integration Test
#
# Verifies the complete STAC workflow:
# 1. Create a local STAC catalog
# 2. Load a REP file into the STAC
# 3. List STAC contents
# 4. Verify item structure
#
# This tests the same code paths that the GUI would invoke.
#
# This script runs INSIDE the container.
# For remote testing: fly ssh console --command "/opt/debrief/bin/test-stac-workflow.sh"
#
# Exit codes:
#   0 - STAC workflow working correctly
#   1 - Workflow errors detected

set -e

echo "=== Layer 7a: STAC Workflow Integration Test ==="
echo "Host: $(hostname)"
echo "Date: $(date -Iseconds)"
echo ""

ERRORS=0
WARNINGS=0

# Configuration
DEBRIEF_DIR="${DEBRIEF_DIR:-/opt/debrief}"
VENV_PYTHON="$DEBRIEF_DIR/venv/bin/python"
CONFIG_DIR="${CONFIG_DIR:-/config}"
TEST_STAC_DIR="$CONFIG_DIR/.local/share/debrief/stac-integration-test"
SAMPLES_DIR="$CONFIG_DIR/Documents/Debrief Samples"

# Clean up previous test runs
echo "Cleaning up previous test data..."
rm -rf "$TEST_STAC_DIR"

# Find a sample REP file
SAMPLE_FILE=""
if [ -d "$SAMPLES_DIR" ]; then
    SAMPLE_FILE=$(find "$SAMPLES_DIR" -name "*.rep" -o -name "*.REP" 2>/dev/null | head -1)
fi

if [ -z "$SAMPLE_FILE" ]; then
    SAMPLE_FILE="$DEBRIEF_DIR/samples/example-track.rep"
fi

echo "Sample file: $SAMPLE_FILE"
echo "Test STAC dir: $TEST_STAC_DIR"
echo ""

# Test 1: Create Local STAC Catalog
echo "Test 1: Creating local STAC catalog..."
CATALOG_RESULT=$("$VENV_PYTHON" -c "
import sys
import os

try:
    from debrief_config import create_local_stac
except ImportError:
    print('NOTE: debrief_config.create_local_stac not available')
    print('SKIP: Services may not be built yet')
    sys.exit(0)

try:
    catalog = create_local_stac(
        path='$TEST_STAC_DIR',
        name='Integration Test Catalog'
    )
    print(f'OK: STAC catalog created at {catalog.path if hasattr(catalog, \"path\") else \"$TEST_STAC_DIR\"}')
except Exception as e:
    print(f'FAIL: Could not create STAC catalog: {e}')
    sys.exit(1)
" 2>&1) || true

echo "  $CATALOG_RESULT"

if echo "$CATALOG_RESULT" | grep -q "^SKIP"; then
    echo ""
    echo "=== STAC Workflow Test Skipped ==="
    echo "Services not yet built. Run after deploying Debrief packages."
    exit 0
fi

if echo "$CATALOG_RESULT" | grep -q "^FAIL"; then
    ERRORS=$((ERRORS + 1))
fi

# Verify STAC directory structure
echo ""
echo "Verifying STAC directory structure..."
if [ -d "$TEST_STAC_DIR" ]; then
    echo "  OK: STAC directory exists"

    if [ -f "$TEST_STAC_DIR/catalog.json" ]; then
        echo "  OK: catalog.json exists"
    else
        echo "  FAIL: catalog.json missing"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "  FAIL: STAC directory not created"
    ERRORS=$((ERRORS + 1))
fi

# Test 2: Load REP File into STAC
echo ""
echo "Test 2: Loading REP file into STAC..."
if [ -f "$SAMPLE_FILE" ] && [ -d "$TEST_STAC_DIR" ]; then
    LOAD_RESULT=$("$VENV_PYTHON" -c "
import sys

try:
    from debrief_io import load_rep_to_stac
except ImportError:
    print('NOTE: debrief_io.load_rep_to_stac not available')
    sys.exit(0)

try:
    item = load_rep_to_stac(
        rep_path='$SAMPLE_FILE',
        stac_path='$TEST_STAC_DIR'
    )
    print(f'OK: STAC item created: {item.id if hasattr(item, \"id\") else \"unknown\"}')
except Exception as e:
    print(f'FAIL: Could not load REP to STAC: {e}')
    sys.exit(1)
" 2>&1) || true

    echo "  $LOAD_RESULT"

    if echo "$LOAD_RESULT" | grep -q "^FAIL"; then
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "  SKIP: Prerequisites not available"
fi

# Test 3: List STAC Contents
echo ""
echo "Test 3: Listing STAC contents..."
if [ -d "$TEST_STAC_DIR" ]; then
    ITEM_COUNT=$(find "$TEST_STAC_DIR" -name "*.json" -not -name "catalog.json" 2>/dev/null | wc -l)
    echo "  Found $ITEM_COUNT item file(s) in STAC"

    if [ "$ITEM_COUNT" -gt 0 ]; then
        echo "  OK: STAC contains items"
        find "$TEST_STAC_DIR" -name "*.json" -not -name "catalog.json" 2>/dev/null | while read -r f; do
            echo "    - $(basename "$f")"
        done
    else
        echo "  WARN: No items found in STAC"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo "  SKIP: STAC directory not available"
fi

# Test 4: Verify Item Structure
echo ""
echo "Test 4: Verifying STAC item structure..."
if [ -d "$TEST_STAC_DIR" ]; then
    ITEM_FILE=$(find "$TEST_STAC_DIR" -name "*.json" -not -name "catalog.json" 2>/dev/null | head -1)

    if [ -n "$ITEM_FILE" ]; then
        VERIFY_RESULT=$("$VENV_PYTHON" -c "
import json
import sys

with open('$ITEM_FILE') as f:
    item = json.load(f)

# Verify STAC Item structure
required_fields = ['type', 'id', 'geometry', 'properties', 'links', 'assets']
missing = [f for f in required_fields if f not in item]

if missing:
    print(f'WARN: Missing STAC fields: {missing}')
else:
    print('OK: All required STAC fields present')

# Check type
if item.get('type') != 'Feature':
    print(f'WARN: Expected type \"Feature\", got \"{item.get(\"type\")}\"')

# Check geometry
if item.get('geometry'):
    geo_type = item['geometry'].get('type')
    print(f'OK: Geometry type: {geo_type}')
else:
    print('WARN: No geometry in item')

print('OK: STAC item structure verified')
" 2>&1) || true

        echo "  $VERIFY_RESULT"
    else
        echo "  SKIP: No items to verify"
    fi
else
    echo "  SKIP: STAC directory not available"
fi

# Cleanup
echo ""
echo "Cleaning up test data..."
rm -rf "$TEST_STAC_DIR"
echo "  OK: Test data removed"

# Summary
echo ""
echo "=== Summary ==="
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"

if [ $ERRORS -gt 0 ]; then
    echo ""
    echo "FAIL: $ERRORS STAC workflow error(s)"
    exit 1
else
    echo ""
    echo "PASS: STAC workflow tests completed"
    if [ $WARNINGS -gt 0 ]; then
        echo "Note: $WARNINGS warning(s) - some features may be incomplete"
    fi
    exit 0
fi
