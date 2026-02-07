Testing component integration in Future Debrief currently means launching VS Code, loading data, and clicking around. Slow for development, impossible for automated testing.

This week I'm building a browser-based shell that composes our existing React components (MapView, ActivityPanel, CatalogOverview) with mock services. Hot reload for fast iteration, Playwright for E2E tests, no VS Code required.

The interesting constraint: no new components. Everything already exists in `@debrief/components` and works in Storybook stories. What we're proving is that they work together — selection syncs between map and panel, time slider updates rendering, tools activate when their requirements are met.

Mock services implement real API contracts with bundled test data. In-process JavaScript, no network, deterministic tests.

Full planning post with architecture decisions: [link]

#FutureDebrief #IntegrationTesting #OpenSource
