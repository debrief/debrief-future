# LinkedIn Summary: Planning File Actions

The Activity Panel in Future Debrief shows associated files for each plot with a dropdown menu offering Open, Reveal, and Delete actions. The UI has been there for weeks. This week we're finally wiring it up to do something.

The work is straightforward plumbing: threading callbacks from React through the webview message layer to VS Code extension handlers. Webviews are sandboxed, so every click has to serialize, cross a boundary, and reach code that can actually touch the filesystem.

One interesting decision: when running in VS Code for Web (no local filesystem), we show an honest "this needs desktop VS Code" message rather than failing silently or disabling features. Small thing, but it matters for trust.

Full planning post: [link]

#FutureDebrief #VSCode #OpenSource
