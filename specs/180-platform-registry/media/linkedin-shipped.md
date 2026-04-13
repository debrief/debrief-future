Platform registry is shipped — the foundation piece for NL-assisted catalog discovery in Future Debrief.

The registry is a single JSON file that defines a vessel classification tree: vessel classes as interior nodes, individual platforms as leaves. Metadata like nationality, domain, and role is derived from a platform's position in the hierarchy, not stored as separate fields that can drift. Python and TypeScript loaders both read the same file and produce identical results — verified field-by-field against a golden fixture. Zero new dependencies in either language.

66 tests passing across both loaders, covering resolution, tree traversal, load-time validation, and edge cases. This one took deliberate restraint to keep simple. Downstream features — schema enrichment, import warnings, NL-based catalog search — now have a stable platform identity layer to build on.

Full details: [link to blog post]

#FutureDebrief #MaritimeAnalysis #OpenSource
