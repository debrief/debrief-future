#!/bin/bash
# test-url.sh - Layer 1: URL Availability Test
#
# Verifies that the demo URL is reachable and responding with HTTP 200.
# This is the most basic health check for the demo environment.
#
# Usage:
#   ./test-url.sh [URL]
#
# Environment:
#   DEMO_URL - Override the default demo URL
#
# Exit codes:
#   0 - Success (HTTP 200)
#   1 - Failure (HTTP error or connection failed)

set -e

# Configuration
DEFAULT_URL="https://debrief-demo.fly.dev"
URL="${DEMO_URL:-${1:-$DEFAULT_URL}}"
TIMEOUT=30
MAX_RETRIES=3

echo "=== Layer 1: URL Availability Test ==="
echo "URL: $URL"
echo "Timeout: ${TIMEOUT}s"
echo ""

# Function to test URL
test_url() {
    local response
    local http_code

    response=$(curl -sSf -o /dev/null -w '%{http_code}' \
        --connect-timeout $TIMEOUT \
        --max-time $TIMEOUT \
        "$URL" 2>&1) || response="000"

    echo "$response"
}

# Retry loop
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
    echo "Attempt $((RETRY + 1)) of $MAX_RETRIES..."

    HTTP_CODE=$(test_url)

    if [ "$HTTP_CODE" = "200" ]; then
        echo ""
        echo "PASS: Demo URL is available (HTTP $HTTP_CODE)"
        echo ""

        # Additional checks
        echo "Additional information:"
        curl -sSI --connect-timeout $TIMEOUT "$URL" 2>/dev/null | head -10 || true

        exit 0
    elif [ "$HTTP_CODE" = "000" ]; then
        echo "Connection failed - URL unreachable or timeout"
    else
        echo "Received HTTP $HTTP_CODE"
    fi

    RETRY=$((RETRY + 1))
    if [ $RETRY -lt $MAX_RETRIES ]; then
        DELAY=$((RETRY * 2))
        echo "Retrying in ${DELAY}s..."
        sleep $DELAY
    fi
done

echo ""
echo "FAIL: Demo URL unavailable after $MAX_RETRIES attempts"
echo "Last HTTP code: $HTTP_CODE"
exit 1
