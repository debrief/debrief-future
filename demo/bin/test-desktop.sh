#!/bin/bash
# test-desktop.sh - Layer 5: Desktop Integration Test
#
# Verifies that desktop integration is configured correctly:
# - .desktop file exists and is valid
# - MIME types are registered
# - File associations are configured
# - Sample files are present
#
# This script runs INSIDE the container.
# For remote testing: fly ssh console --command "/opt/debrief/bin/test-desktop.sh"
#
# Exit codes:
#   0 - Desktop integration configured correctly
#   1 - Configuration errors detected

set -e

echo "=== Layer 5: Desktop Integration Test ==="
echo "Host: $(hostname)"
echo "Date: $(date -Iseconds)"
echo ""

ERRORS=0
WARNINGS=0

# Configuration - linuxserver/webtop uses /config as home
CONFIG_DIR="${CONFIG_DIR:-/config}"
APPLICATIONS_DIR="$CONFIG_DIR/.local/share/applications"
MIME_DIR="$CONFIG_DIR/.local/share/mime"
DOCUMENTS_DIR="$CONFIG_DIR/Documents"

# Test 1: Desktop Entry File
echo "Checking .desktop file..."
DESKTOP_FILE="$APPLICATIONS_DIR/debrief-open.desktop"
if [ -f "$DESKTOP_FILE" ]; then
    echo "  OK: Desktop entry file exists"

    # Validate desktop file if validator is available
    if command -v desktop-file-validate > /dev/null 2>&1; then
        if desktop-file-validate "$DESKTOP_FILE" 2>&1; then
            echo "  OK: Desktop file is valid"
        else
            echo "  WARN: Desktop file has validation warnings"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        echo "  NOTE: desktop-file-validate not available, skipping validation"
    fi

    # Check key fields
    if grep -q "Exec=" "$DESKTOP_FILE"; then
        EXEC_LINE=$(grep "Exec=" "$DESKTOP_FILE" | head -1)
        echo "  OK: Exec field found - ${EXEC_LINE:0:50}..."
    else
        echo "  FAIL: Exec field missing"
        ERRORS=$((ERRORS + 1))
    fi

    if grep -q "MimeType=" "$DESKTOP_FILE"; then
        echo "  OK: MimeType field found"
    else
        echo "  WARN: MimeType field missing"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo "  FAIL: Desktop entry file not found at $DESKTOP_FILE"
    ERRORS=$((ERRORS + 1))
fi

# Test 2: MIME Type Definition
echo ""
echo "Checking MIME type definition..."
MIME_FILE="$MIME_DIR/packages/debrief.xml"
if [ -f "$MIME_FILE" ]; then
    echo "  OK: MIME type definition file exists"

    # Check for REP mime type
    if grep -q "application/x-debrief-rep" "$MIME_FILE"; then
        echo "  OK: REP MIME type defined"
    else
        echo "  WARN: REP MIME type not found in definition"
        WARNINGS=$((WARNINGS + 1))
    fi

    # Check for glob pattern
    if grep -q '\.rep' "$MIME_FILE"; then
        echo "  OK: .rep file extension mapping found"
    else
        echo "  WARN: .rep extension mapping not found"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo "  FAIL: MIME type definition not found at $MIME_FILE"
    ERRORS=$((ERRORS + 1))
fi

# Test 3: MIME Database
echo ""
echo "Checking MIME database..."
MIME_DB="$MIME_DIR/mime.cache"
if [ -f "$MIME_DB" ]; then
    echo "  OK: MIME database cache exists"
else
    echo "  WARN: MIME database cache not found (may need update-mime-database)"
    WARNINGS=$((WARNINGS + 1))
fi

# Test 4: File Association (xdg-mime)
echo ""
echo "Checking file association..."
if command -v xdg-mime > /dev/null 2>&1; then
    DEFAULT_APP=$(xdg-mime query default application/x-debrief-rep 2>/dev/null || echo "")
    if [ -n "$DEFAULT_APP" ]; then
        echo "  OK: Default app for .rep files: $DEFAULT_APP"
        if echo "$DEFAULT_APP" | grep -qi "debrief"; then
            echo "  OK: Debrief is the default handler"
        else
            echo "  WARN: Debrief is not the default handler"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        echo "  WARN: No default app configured for .rep files"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo "  NOTE: xdg-mime not available, skipping association check"
fi

# Test 5: Sample Files
echo ""
echo "Checking sample files..."
SAMPLES_DIR="$DOCUMENTS_DIR/Debrief Samples"
if [ -d "$SAMPLES_DIR" ]; then
    echo "  OK: Samples directory exists"

    REP_COUNT=$(find "$SAMPLES_DIR" -name "*.rep" -o -name "*.REP" 2>/dev/null | wc -l)
    if [ "$REP_COUNT" -gt 0 ]; then
        echo "  OK: Found $REP_COUNT .rep sample file(s)"
        find "$SAMPLES_DIR" -name "*.rep" -o -name "*.REP" 2>/dev/null | while read -r f; do
            echo "      - $(basename "$f")"
        done
    else
        echo "  WARN: No .rep sample files found"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo "  WARN: Samples directory not found at $SAMPLES_DIR"
    WARNINGS=$((WARNINGS + 1))
fi

# Test 6: Thunar Integration (if available)
echo ""
echo "Checking file manager..."
if command -v thunar > /dev/null 2>&1; then
    echo "  OK: Thunar file manager available"
else
    echo "  NOTE: Thunar not in PATH (may still be available in XFCE)"
fi

# Summary
echo ""
echo "=== Summary ==="
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"

if [ $ERRORS -gt 0 ]; then
    echo ""
    echo "FAIL: $ERRORS desktop integration error(s)"
    exit 1
else
    echo ""
    echo "PASS: Desktop integration configured"
    if [ $WARNINGS -gt 0 ]; then
        echo "Note: $WARNINGS warning(s) - some features may need manual setup"
    fi
    exit 0
fi
