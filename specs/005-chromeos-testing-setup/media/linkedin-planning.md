# LinkedIn Summary: Browser-Accessible Demo Environment

---

Testing desktop software from a Chromebook shouldn't require explaining "why you can't just install it."

We're building a browser-accessible demo for Debrief v4. Open a URL, get a full Linux desktop with VS Code and our maritime analysis extension — no installation, no IT tickets, no waiting.

The trick: separate the container (changes monthly) from the application (updates in seconds). CI builds artifacts automatically. Fly.io suspends idle containers and wakes them in milliseconds when someone connects. Monthly hosting cost: under £10.

We're designing a seven-layer test suite to catch everything from "is the URL responding?" to "can you actually load a REP file and see tracks on a map?"

If you work with locked-down laptops, intermittent connectivity, or stakeholders who need to see software before signing off — we'd love your input on what makes a demo environment actually useful.

Full planning post: [link]

#FutureDebrief #MaritimeAnalysis #OpenSource
