#!/bin/bash
# test-service.sh - Layer 2: Service Running Test
#
# Verifies that the container services are running:
# - VNC server (Xvnc process)
# - XFCE desktop (xfce4 processes)
# - noVNC port listening (3000)
#
# This script is designed to run INSIDE the container.
# For remote testing, use: fly ssh console --command "/opt/debrief/bin/test-service.sh"
#
# Exit codes:
#   0 - All services running
#   1 - One or more services failed

set -e

echo "=== Layer 2: Service Running Test ==="
echo "Host: $(hostname)"
echo "Date: $(date -Iseconds)"
echo ""

ERRORS=0
WARNINGS=0

# Test 1: VNC Server (Xvnc)
echo "Checking VNC server (Xvnc)..."
if pgrep -x "Xvnc" > /dev/null 2>&1; then
    PID=$(pgrep -x "Xvnc")
    echo "  PASS: Xvnc running (PID: $PID)"
else
    echo "  FAIL: Xvnc process not found"
    ERRORS=$((ERRORS + 1))
fi

# Test 2: XFCE Desktop
echo "Checking XFCE desktop..."
if pgrep -f "xfce4" > /dev/null 2>&1; then
    COUNT=$(pgrep -f "xfce4" | wc -l)
    echo "  PASS: XFCE4 running ($COUNT processes)"
else
    echo "  WARN: XFCE4 process not detected (may still be starting)"
    WARNINGS=$((WARNINGS + 1))
fi

# Test 3: noVNC Port
echo "Checking noVNC port (3000)..."
if command -v ss > /dev/null 2>&1; then
    if ss -tlnp 2>/dev/null | grep -q ":3000"; then
        echo "  PASS: Port 3000 listening"
    else
        echo "  FAIL: Port 3000 not listening"
        ERRORS=$((ERRORS + 1))
    fi
elif command -v netstat > /dev/null 2>&1; then
    if netstat -tlnp 2>/dev/null | grep -q ":3000"; then
        echo "  PASS: Port 3000 listening"
    else
        echo "  FAIL: Port 3000 not listening"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "  WARN: Cannot check port (ss/netstat not available)"
    WARNINGS=$((WARNINGS + 1))
fi

# Test 4: Debrief Installation
echo "Checking Debrief installation..."
if [ -f /opt/debrief/VERSION ]; then
    VERSION=$(cat /opt/debrief/VERSION)
    echo "  PASS: Debrief installed (version: $VERSION)"
else
    echo "  WARN: VERSION file not found - artifact may not be installed"
    WARNINGS=$((WARNINGS + 1))
fi

# Test 5: Display environment
echo "Checking DISPLAY environment..."
if [ -n "$DISPLAY" ]; then
    echo "  PASS: DISPLAY=$DISPLAY"
else
    echo "  WARN: DISPLAY not set"
    WARNINGS=$((WARNINGS + 1))
fi

# Summary
echo ""
echo "=== Summary ==="
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"

if [ $ERRORS -gt 0 ]; then
    echo ""
    echo "FAIL: $ERRORS critical service(s) not running"
    exit 1
else
    echo ""
    echo "PASS: All critical services running"
    if [ $WARNINGS -gt 0 ]; then
        echo "Note: $WARNINGS warning(s) - some features may be limited"
    fi
    exit 0
fi
