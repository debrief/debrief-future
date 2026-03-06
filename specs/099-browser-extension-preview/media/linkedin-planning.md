Reviewing a VS Code extension currently means twenty minutes of local setup before you can look at a single feature. That's fine for core developers, but it effectively locks out the scientists and analysts who'll actually use the tool.

We're building automatic browser-based preview environments for the Debrief maritime analysis extension. Open a pull request, click a link, and you're in a browser tab running VS Code with the extension loaded and sample naval track data ready to explore. No installs, no configuration. Close the PR and it tears itself down.

The interesting part is keeping it lightweight -- a ~350MB container running code-server, separate from our existing 1GB+ demo environment. Different tools for different audiences.

[Read more on the blog](https://debrief.github.io/debrief-future/blog)

#FutureDebrief #MaritimeAnalysis #OpenSource
