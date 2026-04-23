## What We're Building

Reviewing a VS Code extension today means cloning the repo, installing dependencies, building the extension, and launching a development host. That's a twenty-minute setup before you can look at a single feature. For contributors outside the core team -- particularly DSTL scientists who want to see what changed before an exercise -- that's a non-starter.

We're setting up browser-based preview environments that deploy automatically for every pull request. Open a PR with extension changes, click a link in the PR description, and you're in a browser tab running VS Code with the Debrief extension loaded and sample data ready to explore. STAC catalogs, REP files, map view, layers panel -- all there without installing anything. Close the PR and the environment tears itself down.

## How It Fits

We already have a demo environment on Fly.io, but that's a full XFCE desktop with noVNC -- over a gigabyte, designed for demonstrating the complete Debrief workflow including desktop integration. The preview environment is a different thing: a lightweight container (~300-400MB) running code-server with just the extension and sample data. It's purpose-built for code review, not demonstration. The two environments serve different audiences and stay completely independent -- changes to one don't affect the other.

## Key Decisions

- **code-server as the browser host**: MIT-licensed, widely deployed, and the extension installs directly via `.vsix` sideloading. We evaluated Eclipse Theia (heavier, more complex), VS Code for the Web (no self-hosting), and Gitpod/Codespaces (overkill for a read-only review environment). code-server does one thing well.

- **Dedicated `preview/` directory, separate from `demo/`**: The demo environment targets Fly.io with a full desktop stack. The preview targets Heroku with just code-server. Coupling them would mean changes to one break the other. Separate directories, separate containers, separate deployment pipelines.

- **Heroku container stack with `heroku.yml`**: Heroku builds the Docker image directly from the repo on each PR -- no CI changes needed for the container build. The existing CI pipeline already packages the `.vsix`. Heroku Review Apps handle the lifecycle: deploy on PR open, tear down on PR close.

- **No authentication for ephemeral environments**: Review apps get random Heroku subdomains and live only as long as the PR is open. Adding password authentication would mean reviewers copy-pasting credentials from the PR description -- friction that doesn't match the threat model for short-lived, non-sensitive preview data.

- **Two-phase delivery**: Phase 1 prepares everything -- Dockerfile, entrypoint, workspace config, Heroku descriptors -- and validates it all locally with `docker build && docker run`. Then I manually configure Heroku Review Apps via the dashboard. Phase 2 validates the end-to-end flow and adds reviewer onboarding (a WELCOME.md that opens by default, PR template updates with preview links).

- **Existing test data, no new sample generation**: The `apps/vscode/test-data/` directory already has STAC catalogs and REP files that exercise the full extension. We copy those into the container at build time rather than creating synthetic data or downloading anything at startup.
