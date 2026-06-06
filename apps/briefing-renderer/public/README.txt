Debrief Briefing — air-gapped Storyboard
=========================================

WHAT THIS IS
------------
This zip is a self-contained briefing renderer. It plays back one
Debrief Storyboard end-to-end in a desktop browser — no install, no
server, and no internet connection required.


HOW TO OPEN
-----------
1. Unzip into any folder you have read access to. Paths with spaces
   or non-ASCII characters are fine.
2. Double-click `index.html` (or right-click → Open With → Chrome /
   Microsoft Edge).
3. The briefing opens in a new browser tab. Wait for the map to load.


SUPPORTED BROWSERS
------------------
- Current Google Chrome (desktop)
- Current Microsoft Edge (desktop)

Other browsers (Firefox, Safari, mobile browsers) are not supported
for this release. If you open the briefing in an unsupported browser
you will see a banner across the top of the screen directing you to a
supported browser. The map may still render, but interactive playback
is not guaranteed.


CONTROLS
--------
Minimal mode (default):
  - Play / Pause           — the centre button on the transport bar.
  - Next / Previous Scene  — the arrow buttons.
  - Replay                 — appears in place of Next at the final Scene.
  - Time slider            — for time-range Scenes only.

Present mode (chrome hidden):
  - Press "P" or move the mouse to the top-right corner to switch back
    to Minimal mode.

Press "P" at any time to toggle modes. Playback state is preserved
across the toggle.


WHAT'S INSIDE THIS ZIP
----------------------
- index.html                 — the renderer entry point.
- assets/                    — the renderer's JS / CSS / fonts.
- features.geojson           — the Storyboard's Scene data (inspectable).
- item.json                  — the source plot's STAC metadata (subset).
- scene-thumbnails/          — per-Scene thumbnails.
- tiles/                     — pre-fetched basemap tiles.


READ-ONLY
---------
The briefing is read-only. You cannot edit Scenes, change the order,
or add new content from this surface. To revise the briefing, re-run
the export command in Debrief's authoring environment.


PROBLEMS?
---------
- "Briefing data is unreadable" — one of the inlined JSON blocks
  inside index.html is malformed. Re-export from Debrief.
- A grey or chequered tile appears in the map — the Scene's viewport
  extends beyond the basemap tiles bundled at export time. This is
  expected; no network fallback is attempted.
- "Playback halted" — a runtime error occurred in the renderer.
  Reload the page; if it persists, re-export from Debrief.
