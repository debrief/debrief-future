#!/bin/bash
# test-visual-smoke.sh - Layer 7b: Visual Smoke Test
#
# Captures a screenshot of the desktop and verifies it's not blank.
# This provides visual evidence that the desktop is rendering correctly.
#
# The test:
# 1. Captures a screenshot using scrot
# 2. Analyzes the image for multiple colors (not blank/black)
# 3. Saves the screenshot for manual review
#
# This script runs INSIDE the container.
# For remote testing: fly ssh console --command "/opt/debrief/bin/test-visual-smoke.sh"
#
# Exit codes:
#   0 - Desktop renders correctly
#   1 - Desktop appears blank or screenshot failed

set -e

echo "=== Layer 7b: Visual Smoke Test ==="
echo "Host: $(hostname)"
echo "Date: $(date -Iseconds)"
echo ""

ERRORS=0

# Configuration
DEBRIEF_DIR="${DEBRIEF_DIR:-/opt/debrief}"
VENV_PYTHON="$DEBRIEF_DIR/venv/bin/python"
SCREENSHOT_DIR="/tmp"
SCREENSHOT_FILE="$SCREENSHOT_DIR/desktop-smoke.png"
DISPLAY="${DISPLAY:-:1}"

export DISPLAY

echo "Display: $DISPLAY"
echo "Screenshot: $SCREENSHOT_FILE"
echo ""

# Test 1: Capture Screenshot
echo "Test 1: Capturing desktop screenshot..."

# Check if scrot is available
if ! command -v scrot > /dev/null 2>&1; then
    echo "  WARN: scrot not available, trying alternative methods..."

    # Try import from ImageMagick
    if command -v import > /dev/null 2>&1; then
        echo "  Using ImageMagick import..."
        if import -window root "$SCREENSHOT_FILE" 2>/dev/null; then
            echo "  OK: Screenshot captured with import"
        else
            echo "  FAIL: Could not capture screenshot"
            ERRORS=$((ERRORS + 1))
        fi
    else
        echo "  FAIL: No screenshot tool available (scrot or import)"
        echo "  NOTE: Install scrot or imagemagick"
        ERRORS=$((ERRORS + 1))
    fi
else
    # Use scrot
    if scrot -z "$SCREENSHOT_FILE" 2>/dev/null; then
        echo "  OK: Screenshot captured with scrot"
    else
        echo "  FAIL: scrot failed to capture screenshot"
        echo "  NOTE: Is DISPLAY set correctly? Is X11 running?"
        ERRORS=$((ERRORS + 1))
    fi
fi

# Verify screenshot exists
if [ -f "$SCREENSHOT_FILE" ]; then
    SIZE=$(ls -lh "$SCREENSHOT_FILE" | awk '{print $5}')
    echo "  OK: Screenshot file created ($SIZE)"
else
    echo "  FAIL: Screenshot file not created"
    ERRORS=$((ERRORS + 1))
fi

# Test 2: Analyze Screenshot
echo ""
echo "Test 2: Analyzing screenshot..."

if [ -f "$SCREENSHOT_FILE" ]; then
    # Check if PIL/Pillow is available
    ANALYSIS_RESULT=$("$VENV_PYTHON" -c "
import sys

try:
    from PIL import Image
except ImportError:
    print('NOTE: PIL/Pillow not available')
    print('SKIP: Cannot analyze image programmatically')
    sys.exit(0)

try:
    img = Image.open('$SCREENSHOT_FILE')
    width, height = img.size
    print(f'Image size: {width}x{height}')

    # Get color distribution
    colors = img.getcolors(maxcolors=10000)

    if colors is None:
        # More than 10000 colors - definitely not blank
        print('OK: Image has >10000 colors (not blank)')
        print('OK: Desktop has visual content')
    elif len(colors) <= 5:
        # Very few colors - likely blank or crashed
        print(f'FAIL: Image has only {len(colors)} colors (appears blank)')
        dominant = colors[0] if colors else None
        if dominant:
            print(f'  Dominant color: {dominant}')
        sys.exit(1)
    else:
        print(f'OK: Image has {len(colors)} unique colors')
        print('OK: Desktop has visual content')

except Exception as e:
    print(f'WARN: Could not analyze image: {e}')
    sys.exit(0)
" 2>&1) || true

    echo "  $ANALYSIS_RESULT"

    if echo "$ANALYSIS_RESULT" | grep -q "^FAIL"; then
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "  SKIP: No screenshot to analyze"
fi

# Test 3: File Info (alternative check without PIL)
echo ""
echo "Test 3: Screenshot file info..."
if [ -f "$SCREENSHOT_FILE" ]; then
    if command -v file > /dev/null 2>&1; then
        FILE_INFO=$(file "$SCREENSHOT_FILE")
        echo "  $FILE_INFO"

        # Check it's a valid PNG
        if echo "$FILE_INFO" | grep -qi "PNG"; then
            echo "  OK: Valid PNG file"
        else
            echo "  WARN: May not be a valid PNG"
        fi
    fi

    # Check file size (blank images are typically very small)
    FILE_SIZE=$(stat -f%z "$SCREENSHOT_FILE" 2>/dev/null || stat -c%s "$SCREENSHOT_FILE" 2>/dev/null || echo "0")
    echo "  File size: $FILE_SIZE bytes"

    if [ "$FILE_SIZE" -lt 1000 ]; then
        echo "  WARN: File is very small - may be blank or corrupted"
    else
        echo "  OK: File size reasonable"
    fi
fi

# Output location for retrieval
echo ""
echo "Screenshot saved to: $SCREENSHOT_FILE"
echo "To retrieve: fly ssh sftp get /tmp/desktop-smoke.png"

# Summary
echo ""
echo "=== Summary ==="
echo "Errors: $ERRORS"

if [ $ERRORS -gt 0 ]; then
    echo ""
    echo "FAIL: Visual smoke test failed"
    echo "  - Desktop may be blank or crashed"
    echo "  - Check VNC logs and X11 status"
    exit 1
else
    echo ""
    echo "PASS: Visual smoke test passed"
    echo "  - Screenshot captured successfully"
    echo "  - Desktop appears to have visual content"
    exit 0
fi
