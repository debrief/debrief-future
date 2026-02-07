How do you test a VS Code extension's complete user workflow -- not just the services behind it, but the actual UI a person interacts with?

Future Debrief has three Python services and a TypeScript extension that wires them together. Unit tests cover each piece in isolation. But the workflow that matters to an analyst -- open a track file, see it on the map, run an analysis tool, check the results -- crosses every service boundary through the extension's orchestration layer. No existing test exercises that path.

We are planning end-to-end tests that host VS Code in a browser via code-server and drive it with Playwright. Real extension, real services, real DOM interactions. The same Playwright infrastructure the project already uses, pointed at a higher-fidelity target.

Planning post with the technical decisions: [link]

#FutureDebrief #MaritimeAnalysis #OpenSource
