208 type violations across 6 Python packages and 8 TypeScript packages — and we've been carrying them since the project started.

Most are `dict[str, Any]` aliases in the Python services that handle GeoJSON. Because three core type aliases are typed as `Any`, every function that consumes them loses static analysis coverage entirely. The TypeScript side has a similar pattern: generic `Record<string, unknown>` dictionaries used to pass tool parameters, which are effectively `any` under a different name.

We're closing this out: pyright for Python (chosen for its native Pydantic v2 support and consistency with the VS Code editor engine), stricter ESLint across all TypeScript packages, and both wired into CI as merge gates. The constitution has a new Article XV prohibiting `Any`/`any` in production code.

One decision worth flagging: we're treating `Record<string, unknown>` for tool parameters as equivalent to `any` and replacing them with discriminated unions on `toolId`. The question we're sitting with is whether that union should be hand-maintained or generated from the tool registry.

Full planning post: [LINK]

#FutureDebrief #TypeSafety #MaritimeAnalysis
