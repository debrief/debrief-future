---
layout: future-post
title: "Planning: debrief-config"
date: 2026-01-11
track: "Planning · This Week"
author: Ian
reading_time: 2
tags: [tracer-bullet, config, python, typescript]
excerpt: "Shared configuration service managing STAC registrations and preferences across Python and TypeScript"
---

## What We're Building

The debrief-config service provides unified configuration management for Debrief v4.x, handling STAC store registrations and user preferences across both Python and TypeScript consumers. Rather than each application maintaining its own settings, this service ensures that when you register a STAC catalog in the VS Code extension, the Electron loader sees it immediately—and vice versa.

This is foundational infrastructure. Maritime analysts working with sensitive data need predictable, reliable configuration that works offline and respects platform conventions. Whether you're on a Linux workstation, a macOS laptop, or a Windows machine in a disconnected environment, your registered catalogs and preferences follow platform-appropriate paths automatically.

## How It Fits

Config sits at the heart of our tracer bullet sequence. After schemas (done) and IO parsing (underway), applications need somewhere to store references to STAC catalogs containing plot data. The Electron loader and VS Code extension will both consume this service, making it the first piece that truly bridges our Python backend and TypeScript frontends. It validates our "thick services, thin frontends" principle while proving cross-language interoperability works in practice.

## Key Decisions

- **platformdirs for Python, env-paths for TypeScript** — Both are well-maintained libraries that handle XDG Base Directory on Linux, Library/Application Support on macOS, and AppData on Windows
- **Single JSON config file** — Both languages read and write the same `config.json`, enabling true cross-application state sharing
- **Atomic writes with lockfile** — Protects against corruption when multiple processes access config simultaneously
- **Structural validation for STAC catalogs** — We check that registered paths contain valid `catalog.json` with required fields, keeping validation offline-compatible
- **No network calls** — Per Constitution Article I, the service works entirely offline

## What We'd Love Feedback On

- **Validation depth**: Should we validate STAC catalog structure on every read, or only on registration? Eager validation catches problems early but adds overhead.
- **Migration strategy**: When config schema evolves, should we auto-migrate old configs or require explicit upgrade commands?
- **Watch notifications**: Would consumers benefit from file-watch events when another process modifies config, or is polling on-demand sufficient?

→ [Join the discussion](https://github.com/debrief/debrief-future/discussions)
