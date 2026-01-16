#!/bin/bash
# healthcheck.sh - Container health check script
#
# Verifies that essential services are running in the demo container.
# Used by Docker HEALTHCHECK and can be called manually.
# Exit 0 = healthy, Exit 1 = unhealthy

set -e

ERRORS=0

# Check VNC server is running
if ! pgrep -x "Xvnc" > /dev/null 2>&1; then
    echo "FAIL: Xvnc process not running"
    ERRORS=$((ERRORS + 1))
else
    echo "OK: Xvnc running"
fi

# Check XFCE session manager or panel
if ! pgrep -f "xfce4" > /dev/null 2>&1; then
    echo "WARN: XFCE4 process not detected (may still be starting)"
    # Don't fail for this - XFCE may start after VNC
else
    echo "OK: XFCE4 running"
fi

# Check noVNC/websockify is listening
if ! ss -tlnp 2>/dev/null | grep -q ":3000" && \
   ! netstat -tlnp 2>/dev/null | grep -q ":3000"; then
    echo "FAIL: Port 3000 (noVNC) not listening"
    ERRORS=$((ERRORS + 1))
else
    echo "OK: Port 3000 listening"
fi

# Check Debrief installation
if [ ! -f /opt/debrief/VERSION ]; then
    echo "WARN: Debrief VERSION file not found (artifact may not be installed)"
else
    echo "OK: Debrief installed (version: $(cat /opt/debrief/VERSION))"
fi

# Report overall status
if [ $ERRORS -gt 0 ]; then
    echo "HEALTH: UNHEALTHY ($ERRORS critical failures)"
    exit 1
else
    echo "HEALTH: HEALTHY"
    exit 0
fi
