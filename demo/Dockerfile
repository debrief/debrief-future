# Dockerfile for Debrief Browser-Accessible Demo Environment
# Based on linuxserver/webtop with XFCE desktop, VNC, and noVNC

FROM lscr.io/linuxserver/webtop:ubuntu-xfce

# Install additional dependencies needed for Debrief
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3.11-venv \
    python3-pip \
    curl \
    jq \
    scrot \
    desktop-file-utils \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

# Create directory for Debrief installation
RUN mkdir -p /opt/debrief

# Copy startup script
COPY 99-debrief-setup /etc/cont-init.d/99-debrief-setup
RUN chmod +x /etc/cont-init.d/99-debrief-setup

# Copy healthcheck script
COPY bin/healthcheck.sh /opt/debrief/bin/healthcheck.sh
RUN chmod +x /opt/debrief/bin/healthcheck.sh

# Copy test scripts (for Layer 4-7 tests)
COPY bin/test-*.sh /opt/debrief/bin/
RUN chmod +x /opt/debrief/bin/test-*.sh

# Set environment variables
ENV DEBRIEF_VERSION=latest
ENV PUID=1000
ENV PGID=1000
ENV TZ=Europe/London

# Expose noVNC port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD /opt/debrief/bin/healthcheck.sh || exit 1
