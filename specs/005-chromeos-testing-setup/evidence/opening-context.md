## What We're Building

How do you test a desktop application when you only have a Chromebook? Or demonstrate maritime analysis software to a stakeholder who can't install anything on their locked-down laptop?

We're building a browser-accessible demo environment for Debrief. Navigate to a URL, and you get a full Linux desktop with VS Code and the Debrief extension ready to go. No installation. No configuration. Just open your browser and start analysing.

The environment runs on Fly.io, using a containerised XFCE desktop served through noVNC. It suspends when idle (to keep costs under £10/month) and wakes in under a second when someone connects. CI builds and publishes new versions automatically — push to main, and the demo updates.

## How It Fits

This is infrastructure for our community engagement principle: *build in the open, invite feedback early and often*. Before we ship features, we want stakeholders to try them. Before we finalise designs, we want feedback from real users on real data.

The demo environment makes that possible without asking anyone to install Python, Node.js, or VS Code. It's the shortest path from "I want to see Debrief" to actually seeing it.

## Key Decisions

- **VS Code as primary interface**: The demo runs VS Code with our extension, matching the production deployment model. What you see in the demo is what you'll use day-to-day.

- **Artifact separation from container**: The container image changes rarely; the Debrief application downloads at startup. This lets us iterate quickly — code changes deploy in seconds, not the 20+ minutes a Docker build takes.

- **Fly.io with suspend mode**: Using Firecracker snapshots means sub-second cold starts. A stopped container would take 30-60 seconds to restart; a suspended one takes milliseconds.

- **Seven-layer testing strategy**: From basic URL availability through VNC connectivity to full end-to-end workflow tests. Each layer catches different failure modes, and they all run automatically on every deploy.
