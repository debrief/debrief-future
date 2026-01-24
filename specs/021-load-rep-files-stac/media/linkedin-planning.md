# LinkedIn Planning Post: REP File Import

---

Drag a REP file onto the map, see it appear. That's the interaction we're building next.

This completes our "tracer bullet" — the minimum path from REP file to displayed track that proves the architecture works. The Python services for parsing and storage are already done. Now it's about wiring them into VS Code with drag-drop handling and JSON-RPC communication.

One design choice we're debating: how should duplicate imports be handled? Current plan is to check by filename — drop the same file twice, get a warning the second time. Simple, but maybe too simple?

Full spec and implementation plan: [link]

#FutureDebrief #MaritimeAnalysis #VSCode
