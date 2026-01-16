#!/usr/bin/env python3
"""
test_vnc_connect.py - Layer 3: VNC Connectivity Test

Verifies that a client can establish a WebSocket connection to noVNC
and receive the RFB (Remote Framebuffer) protocol handshake.

This test validates:
1. WebSocket connection can be established
2. SSL/TLS certificate is valid
3. VNC server responds with RFB protocol version

Usage:
    python test_vnc_connect.py [URL]

Environment:
    DEMO_URL - Override the default demo URL

Exit codes:
    0 - Connection successful, RFB handshake received
    1 - Connection failed or invalid response
"""

import os
import ssl
import sys
from urllib.parse import urlparse

# Try to import websocket-client
try:
    import websocket
except ImportError:
    print("ERROR: websocket-client not installed")
    print("Install with: pip install websocket-client")
    sys.exit(1)


def get_websocket_url(base_url: str) -> str:
    """Convert HTTP(S) URL to WebSocket URL for noVNC."""
    parsed = urlparse(base_url)

    # Determine WebSocket scheme
    if parsed.scheme == "https":
        ws_scheme = "wss"
    else:
        ws_scheme = "ws"

    # noVNC websockify endpoint
    ws_path = "/websockify"

    return f"{ws_scheme}://{parsed.netloc}{ws_path}"


def test_vnc_connection(url: str, timeout: int = 30) -> bool:
    """
    Test VNC connectivity via noVNC WebSocket.

    Args:
        url: Base URL of the demo (e.g., https://debrief-demo.fly.dev)
        timeout: Connection timeout in seconds

    Returns:
        True if connection successful and RFB handshake received
    """
    ws_url = get_websocket_url(url)
    print(f"WebSocket URL: {ws_url}")

    try:
        # Create SSL context for secure connections
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = True
        ssl_context.verify_mode = ssl.CERT_REQUIRED

        print("Connecting to WebSocket...")
        ws = websocket.create_connection(
            ws_url,
            timeout=timeout,
            sslopt={
                "context": ssl_context,
            },
        )

        print("Connection established, waiting for RFB handshake...")

        # VNC server should send RFB protocol version string
        # Format: "RFB XXX.YYY\n" (12 bytes)
        data = ws.recv()

        # Convert bytes to string if needed
        if isinstance(data, bytes):
            data_str = data.decode("utf-8", errors="replace")
        else:
            data_str = data

        print(f"Received: {repr(data_str[:50])}")

        # Check for RFB protocol handshake
        if data_str.startswith("RFB "):
            version = data_str.strip()
            print(f"RFB Version: {version}")
            ws.close()
            return True
        else:
            print(f"ERROR: Unexpected response (not RFB protocol)")
            ws.close()
            return False

    except websocket.WebSocketTimeoutException:
        print("ERROR: Connection timeout")
        return False
    except websocket.WebSocketBadStatusException as e:
        print(f"ERROR: WebSocket connection rejected: {e}")
        return False
    except ssl.SSLCertVerificationError as e:
        print(f"ERROR: SSL certificate verification failed: {e}")
        return False
    except ConnectionRefusedError:
        print("ERROR: Connection refused")
        return False
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}")
        return False


def main():
    """Main entry point."""
    print("=== Layer 3: VNC Connectivity Test ===")
    print()

    # Get URL from args or environment
    default_url = "https://debrief-demo.fly.dev"
    url = os.environ.get("DEMO_URL") or (sys.argv[1] if len(sys.argv) > 1 else default_url)

    print(f"Demo URL: {url}")
    print()

    # Run test
    success = test_vnc_connection(url)

    print()
    if success:
        print("PASS: VNC connectivity verified")
        print("  - WebSocket connection established")
        print("  - SSL/TLS certificate valid")
        print("  - RFB protocol handshake received")
        sys.exit(0)
    else:
        print("FAIL: VNC connectivity test failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
