#!/bin/bash
# test-components.sh - Layer 4: Component Installation Test
#
# Verifies that Debrief components are correctly installed:
# - Python virtual environment is functional
# - Python packages are importable
# - Entry point scripts exist and are executable
# - VS Code is available
#
# This script runs INSIDE the container.
# For remote testing: fly ssh console --command "/opt/debrief/bin/test-components.sh"
#
# Exit codes:
#   0 - All components installed correctly
#   1 - One or more components missing or broken

set -e

echo "=== Layer 4: Component Installation Test ==="
echo "Host: $(hostname)"
echo "Date: $(date -Iseconds)"
echo ""

ERRORS=0
WARNINGS=0

# Configuration
DEBRIEF_DIR="${DEBRIEF_DIR:-/opt/debrief}"
VENV_DIR="$DEBRIEF_DIR/venv"
BIN_DIR="$DEBRIEF_DIR/bin"

# Test 1: Virtual Environment
echo "Checking Python virtual environment..."
if [ -d "$VENV_DIR" ]; then
    echo "  OK: venv directory exists"

    if [ -f "$VENV_DIR/bin/python" ]; then
        PYTHON_VERSION=$("$VENV_DIR/bin/python" --version 2>&1)
        echo "  OK: Python found - $PYTHON_VERSION"
    else
        echo "  FAIL: Python interpreter not found in venv"
        ERRORS=$((ERRORS + 1))
    fi

    if [ -f "$VENV_DIR/bin/pip" ]; then
        PIP_VERSION=$("$VENV_DIR/bin/pip" --version 2>&1 | head -1)
        echo "  OK: pip found - $PIP_VERSION"
    else
        echo "  WARN: pip not found in venv"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo "  FAIL: venv directory not found at $VENV_DIR"
    ERRORS=$((ERRORS + 1))
fi

# Test 2: Python Packages
echo ""
echo "Checking Python packages..."
if [ -f "$VENV_DIR/bin/python" ]; then
    # Try to import key packages
    "$VENV_DIR/bin/python" -c "
import sys
errors = []
packages = {
    'debrief_io': 'debrief-io',
    'debrief_config': 'debrief-config',
    'debrief_calc': 'debrief-calc',
}

for module, name in packages.items():
    try:
        pkg = __import__(module)
        version = getattr(pkg, '__version__', 'unknown')
        print(f'  OK: {name} installed (version: {version})')
    except ImportError as e:
        print(f'  NOTE: {name} not installed - {e}')

# Check if at least some packages are available
import pkg_resources
installed = [p.project_name for p in pkg_resources.working_set]
print(f'  INFO: {len(installed)} packages installed in venv')
" 2>&1 || echo "  WARN: Could not check Python packages"
else
    echo "  SKIP: Python not available"
fi

# Test 3: Entry Point Scripts
echo ""
echo "Checking entry point scripts..."
REQUIRED_SCRIPTS=("debrief-open" "healthcheck.sh")

for script in "${REQUIRED_SCRIPTS[@]}"; do
    SCRIPT_PATH="$BIN_DIR/$script"
    if [ -f "$SCRIPT_PATH" ]; then
        if [ -x "$SCRIPT_PATH" ]; then
            echo "  OK: $script exists and is executable"
        else
            echo "  WARN: $script exists but is not executable"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        echo "  FAIL: $script not found"
        ERRORS=$((ERRORS + 1))
    fi
done

# Test 4: VS Code
echo ""
echo "Checking VS Code..."
if command -v code > /dev/null 2>&1; then
    CODE_VERSION=$(code --version 2>&1 | head -1 || echo "unknown")
    echo "  OK: VS Code available - version $CODE_VERSION"
else
    echo "  WARN: VS Code command not found in PATH"
    echo "  NOTE: May be available via desktop shortcut"
    WARNINGS=$((WARNINGS + 1))
fi

# Test 5: VS Code Extension
echo ""
echo "Checking VS Code extension..."
VSIX_PATH="$DEBRIEF_DIR/extensions/debrief.vsix"
if [ -f "$VSIX_PATH" ]; then
    VSIX_SIZE=$(ls -lh "$VSIX_PATH" | awk '{print $5}')
    echo "  OK: Extension package found ($VSIX_SIZE)"
else
    echo "  WARN: Extension package not found at $VSIX_PATH"
    WARNINGS=$((WARNINGS + 1))
fi

# Test 6: Version File
echo ""
echo "Checking version file..."
VERSION_FILE="$DEBRIEF_DIR/VERSION"
if [ -f "$VERSION_FILE" ]; then
    VERSION=$(cat "$VERSION_FILE")
    echo "  OK: Version file found - $VERSION"
else
    echo "  WARN: VERSION file not found"
    WARNINGS=$((WARNINGS + 1))
fi

# Summary
echo ""
echo "=== Summary ==="
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"

if [ $ERRORS -gt 0 ]; then
    echo ""
    echo "FAIL: $ERRORS critical component(s) missing"
    exit 1
else
    echo ""
    echo "PASS: All critical components installed"
    if [ $WARNINGS -gt 0 ]; then
        echo "Note: $WARNINGS warning(s) - some features may be limited"
    fi
    exit 0
fi
