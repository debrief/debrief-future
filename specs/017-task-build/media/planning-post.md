---
layout: future-post
title: "Planning: Task Build System"
date: 2026-01-23
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, developer-experience, build-system]
excerpt: "Replacing our Makefile with Task for unified, cached, cross-platform builds"
---

## What We're Building

We're adopting [Task](https://taskfile.dev) as the unified build orchestration tool for the debrief-future monorepo. Right now, we have a mix of Makefile targets, pnpm scripts, and uv commands—developers need to remember which tool handles what. Task gives us a single command interface: `task test`, `task build`, `task dev`.

The key feature: **intelligent caching**. When you run `task build` twice in a row without changing any source files, the second run completes in under 5 seconds. When dependencies haven't changed, `task install` is effectively instant. This matters because most build commands need to ensure dependencies are installed first—with caching, that check adds zero overhead.

## How It Fits

This is infrastructure work that improves every other feature we build. The tracer bullet approach means we're constantly running tests and builds across Python services and TypeScript frontends. Shaving seconds off each iteration compounds into hours saved.

Task also gives us CI/local parity. The exact same `task test` command runs in GitHub Actions and on developer machines. No more "but it worked in CI" mysteries.

## Key Decisions

- **Replace Makefile entirely** — single source of truth, not two systems coexisting
- **All major commands depend on install** — `task test`, `task build`, `task dev`, and `task lint` all auto-install if needed, but caching makes this instant when deps are current
- **Cross-platform from day one** — Task is a single Go binary, works on macOS, Linux, and Windows
- **Source-based caching** — lockfile checksums determine when to reinstall; source file checksums determine when to rebuild

## What We'd Love Feedback On

- Are there build workflows we're missing? What commands do you find yourself running repeatedly?
- Any experience with Task in production monorepos? Gotchas we should know about?
- Should we include a `task check` command that validates the environment (correct Python/Node versions, required tools installed)?

→ [See the specification](https://github.com/debrief/debrief-future/blob/017-task-build/specs/017-task-build/spec.md)
