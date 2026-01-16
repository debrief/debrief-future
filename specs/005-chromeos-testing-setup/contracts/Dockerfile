# Debrief Demo Environment
# Browser-accessible Linux desktop with VS Code and Debrief extension
#
# Build: docker build -t debrief-demo .
# Run locally: docker run -p 3000:3000 -e PASSWORD=secret debrief-demo

FROM linuxserver/webtop:ubuntu-xfce

# Container metadata
LABEL maintainer="Debrief Team"
LABEL description="Browser-accessible Debrief demo environment"

# Install Python 3.11+ (if not present in base)
# Note: webtop is Ubuntu-based, so apt is available
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 \
    python3.11-venv \
    python3-pip \
    curl \
    scrot \
    desktop-file-utils \
    && rm -rf /var/lib/apt/lists/*

# Copy startup script
COPY 99-debrief-setup /etc/cont-init.d/99-debrief-setup
RUN chmod +x /etc/cont-init.d/99-debrief-setup

# Environment variables with defaults
ENV DEBRIEF_VERSION=latest
# DEBRIEF_ARTIFACT_URL can override for custom/PR builds

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD pgrep -x Xvnc > /dev/null && pgrep -f xfce4-session > /dev/null || exit 1

# Expose noVNC port
EXPOSE 3000
