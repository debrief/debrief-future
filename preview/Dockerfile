# Browser-based VS Code Extension Preview
# Runs code-server with the Debrief extension and sample data pre-installed.
#
# Build: docker build -t debrief-preview -f preview/Dockerfile .
# Run:   docker run -p 8080:8080 -e PORT=8080 debrief-preview
#
# Heroku Review Apps: heroku.yml points here. Heroku sets $PORT automatically.

FROM codercom/code-server:latest

USER root

# Install Python 3.11 and system dependencies for Debrief services
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 \
    python3.11-venv \
    python3-pip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv for Python package management
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:$PATH"

# Copy Python service sources
COPY services/io /workspace/services/io
COPY services/stac /workspace/services/stac
COPY services/calc /workspace/services/calc
COPY shared/schemas /workspace/shared/schemas

# Install Python services in a virtual environment
WORKDIR /workspace
RUN uv venv /opt/debrief-venv && \
    VIRTUAL_ENV=/opt/debrief-venv uv pip install \
    ./shared/schemas \
    ./services/io \
    ./services/stac \
    ./services/calc
ENV PATH="/opt/debrief-venv/bin:$PATH"

# Install the Debrief VS Code extension
# The .vsix must be built before Docker build: pnpm --filter debrief-vscode run package
COPY apps/vscode/*.vsix /tmp/debrief.vsix
RUN code-server --install-extension /tmp/debrief.vsix && rm /tmp/debrief.vsix

# Copy preview workspace with sample data
COPY preview/workspace /workspace/preview
COPY preview/entrypoint.sh /opt/entrypoint.sh
RUN chmod +x /opt/entrypoint.sh

# Default port — Heroku overrides via $PORT env var
ENV PORT=8080
EXPOSE 8080

USER coder

ENTRYPOINT ["/opt/entrypoint.sh"]
