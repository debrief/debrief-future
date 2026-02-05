---
layout: future-post
title: "Planning: Wiring File Actions in VS Code"
date: 2026-02-05
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, vscode-extension, file-operations]
excerpt: "Connecting the dropdown menu to actual file operations in VS Code"
---

## What We're Building

The Activity Panel has a nice dropdown menu next to each associated file showing four actions: Open, Open With, Reveal in Explorer, and Delete. The UI exists. The components render correctly. Click any action and... nothing happens.

This week we're closing that gap. The work is pure plumbing: threading a callback from the React component through the webview message layer to the VS Code extension host, where actual file operations can happen.

The interesting constraint is that webviews are sandboxed. They can't touch the filesystem directly. Every action has to serialize into a message, cross the boundary, and get handled by extension code that has access to VS Code's APIs.

## How It Fits

This is one of those features that's invisible when it works. Nobody celebrates clicking "Open" and having a file open. But it's essential for the platform to feel real rather than decorative.

The file actions complete a vertical slice through the entire Activity Panel architecture: user interaction in React, message passing through the webview bridge, and extension host handlers that do actual work. Once this path is established, adding new actions becomes straightforward.

## Key Decisions

- **Extend, don't replace**: The component chain already exists (AssociatedFilesDropdown -> LayersToolbar -> ActivityPanel). We're adding one prop and one message type, not rebuilding anything.

- **Single message type for all actions**: Rather than separate `file:open`, `file:delete`, etc., we're using one `file:action` message with the action as payload data. Simpler to maintain.

- **VS Code native confirmation**: Delete shows VS Code's built-in `showWarningMessage` modal rather than a custom React dialog. It looks right on every platform and doesn't require round-trip messaging.

- **Web client gets honest messaging**: In VS Code for Web, reveal and delete can't work (no filesystem access). Rather than disabling buttons or failing silently, we show an informational modal explaining the limitation.

## What We'd Love Feedback On

We're not removing STAC asset references when files are deleted. The physical file goes away, but the metadata entry remains (until the next catalog refresh or explicit cleanup). Should we couple these operations, or is it safer to keep them separate?

The "Open With" action relies on VS Code's application picker, which varies by platform. Has anyone run into edge cases where this doesn't behave as expected?

-> [Join the discussion](https://github.com/debrief/debrief-future/issues/171)
