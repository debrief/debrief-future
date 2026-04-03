# code-server + Debrief extension + Python services
# Used for reproducible E2E testing in CI
#
# Build: docker build -t debrief-e2e .
# Run:   docker run -p 8080:8080 debrief-e2e
FROM codercom/code-server:latest

USER root

# Install Python and system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-venv \
    python3-pip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv for Python package management
# Use UV_INSTALL_DIR so uv lands in a fixed location regardless of $HOME
RUN curl -LsSf https://astral.sh/uv/install.sh | UV_INSTALL_DIR=/usr/local/bin sh

# Copy Python service sources
COPY services/io /workspace/services/io
COPY services/stac /workspace/services/stac
COPY services/calc /workspace/services/calc
COPY shared/schemas /workspace/shared/schemas

# Install Python services in a virtual environment
# Debian-managed Python blocks --system installs
WORKDIR /workspace
RUN uv venv /opt/debrief-venv && \
    VIRTUAL_ENV=/opt/debrief-venv uv pip install \
    ./shared/schemas \
    ./services/io \
    ./services/stac \
    ./services/calc
ENV PATH="/opt/debrief-venv/bin:$PATH"

# Copy test workspace
COPY tests/e2e/test-workspace /workspace/test-workspace

# Configure code-server
ENV PASSWORD=""
EXPOSE 8080

# Install the Debrief VS Code extension as the coder user.
# code-server stores extensions under ~/.local/share/code-server/extensions.
# Installing as root would place them in /root/... which coder can't see.
# (See Dockerfile.preview and coder/code-server#7326 for background.)
USER coder
COPY --chown=coder:coder apps/vscode/*.vsix /tmp/debrief.vsix
RUN code-server --install-extension /tmp/debrief.vsix && rm /tmp/debrief.vsix

# Pre-seed VS Code settings so extensions activate without user interaction.
# - Workspace trust disabled → extensions activate immediately (no trust dialog)
# - Welcome tab disabled → no iframe stealing keyboard focus
# These mirror what global-setup.ts writes for locally-started code-server.
RUN mkdir -p /home/coder/.local/share/code-server/User && \
    echo '{"security.workspace.trust.enabled":false,"workbench.startupEditor":"none","workbench.welcomePage.walkthroughs.openOnInstall":false,"workbench.tips.enabled":false}' \
    > /home/coder/.local/share/code-server/User/settings.json

# Pre-seed Debrief config with the test STAC store so the tree view
# is populated when the extension activates (XDG_CONFIG_HOME defaults
# to ~/.config inside the container).
RUN mkdir -p /home/coder/.config/debrief && \
    echo '{"stores":[{"id":"local-store","path":"/workspace/test-workspace/local-store","displayName":"Test Maritime Data","status":"available"}],"preferences":{}}' \
    > /home/coder/.config/debrief/config.json

ENTRYPOINT ["code-server", \
    "--auth", "none", \
    "--bind-addr", "0.0.0.0:8080", \
    "--disable-telemetry", \
    "/workspace/test-workspace"]
