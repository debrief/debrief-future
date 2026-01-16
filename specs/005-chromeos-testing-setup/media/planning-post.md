---
layout: future-post
title: "Planning: Browser-Accessible Demo Environment"
date: 2026-01-16
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, demo, infrastructure, chromeos]
excerpt: "Testing Debrief from a Chromebook? We're building a browser-accessible demo environment."
---

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

## What We'd Love Feedback On

1. **Region selection**: We're defaulting to London (lhr). If you're accessing from elsewhere and latency matters, where should we add additional regions?

2. **Authentication approach**: Currently using a shared VNC password. Should we implement individual user accounts, or is password-protected demo access sufficient for stakeholder previews?

3. **Sample data**: What .rep files would be most useful for demonstrations? We're starting with basic track examples, but real-world scenarios would help.

4. **Session persistence**: The demo uses ephemeral storage — files created during a session disappear when the container restarts. Is this acceptable for demos, or do stakeholders need persistent workspaces?

→ [Join the discussion](https://github.com/debrief/debrief-future/discussions)
