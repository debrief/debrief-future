Browser-based VS Code extension previews are ready.

Phase 1 is complete: a dedicated preview container runs code-server with the Debrief extension pre-installed and sample maritime data loaded. Build it locally with `task preview:build`, run it with `task preview:run`, open `http://localhost:8080` in your browser. The full extension environment — map view, STAC explorer, layers panel — appears in the browser tab.

The container lives in `preview/`, separate from the Fly.io demo environment. It's smaller, faster, and designed specifically for code review rather than general demonstration. CI validates the build on every push. Heroku deployment descriptors (`app.json`, `heroku.yml`) are in place at the repo root.

Phase 2 starts after manual Heroku configuration. Once Review Apps are enabled, every PR gets its own preview URL. Reviewers click, land in the extension environment, test the changes, and close the tab. No local setup, no dependency installs, no twenty-minute build process.

Read the full post: [link to blog post]

#FutureDebrief #MaritimeAnalysis #OpenSource
