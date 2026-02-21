# code-server + Debrief extension + Python services
# Used for reproducible E2E testing in CI
#
# Build: docker build -t debrief-e2e .
# Run:   docker run -p 8080:8080 debrief-e2e
FROM codercom/code-server:latest

USER root

# Install Python 3.11 and system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 \
    python3.11-venv \
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

# Install the Debrief VS Code extension
# The .vsix must be built before Docker build: pnpm run package --filter @debrief/vscode
COPY apps/vscode/*.vsix /tmp/debrief.vsix
RUN code-server --install-extension /tmp/debrief.vsix && rm /tmp/debrief.vsix

# Copy test workspace
COPY tests/e2e/test-workspace /workspace/test-workspace

# Configure code-server
ENV PASSWORD=""
EXPOSE 8080

USER coder

ENTRYPOINT ["code-server", \
    "--auth", "none", \
    "--bind-addr", "0.0.0.0:8080", \
    "--disable-telemetry", \
    "/workspace/test-workspace"]
