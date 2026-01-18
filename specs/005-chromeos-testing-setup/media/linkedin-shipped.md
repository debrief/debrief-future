# LinkedIn Summary: Browser-Accessible Demo Environment Shipped

---

We shipped a browser-accessible demo for Debrief v4. Open a URL, get a full Linux desktop with VS Code and our maritime analysis extension — no installation, no configuration.

What's inside:
- XFCE desktop via noVNC (works on any device with a browser)
- VS Code with Debrief extension pre-installed
- Sample data files ready to explore
- Right-click file associations for .rep files

The clever bit: the container image is static (changes monthly), but the application downloads fresh from GitHub Releases at startup. Push to main, demo updates in seconds. Fly.io suspends idle containers and wakes them in milliseconds.

We built a 7-layer test suite that runs on every deploy:
1. URL availability
2. Service processes
3. VNC connectivity
4. Component installation
5. Desktop integration
6. Data pipeline
7. End-to-end workflow

Monthly hosting cost: under £10. Time from code push to live demo: under 5 minutes.

If you need to demonstrate software to stakeholders who can't install anything — this approach might help. We're happy to share what we learned.

Try it: https://debrief-demo.fly.dev (ask us for the password)

Full post: [link]

#FutureDebrief #MaritimeAnalysis #OpenSource #DevOps
