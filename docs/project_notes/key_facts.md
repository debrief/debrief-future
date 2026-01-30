# Key Facts

Project configuration, constants, and frequently-needed **non-sensitive** information.

## ⚠️ Security Warning

**NEVER store passwords, API keys, or credentials in this file.** This file is committed to version control.

---

### Project Information

**Repository:**
- Name: debrief-future
- Purpose: Ground-up rebuild of Debrief maritime tactical analysis platform (v4.x)
- Status: Pre-implementation planning phase

**Demo Environment:**
- URL: https://debrief-demo.fly.dev
- Platform: Fly.io
- Access: Browser-based VNC (noVNC)

### Technology Stack

**Languages:**
- Python 3.11+ (services, domain logic)
- TypeScript 5.x (frontends, generated types)

**Key Libraries:**
- LinkML (master schemas)
- Pydantic v2 (Python validation)
- AJV (JSON Schema validation in JS)
- React 18+ (UI components)
- Electron 28+ (desktop app)

**Packaging:**
- Python: uv workspaces
- TypeScript: pnpm workspaces

### Build Sequence (Tracer Bullet)

0. Schemas (LinkML models, generators)
1. debrief-stac (local STAC catalog)
2. debrief-io (REP file parsing)
3. debrief-config (user state)
4. Loader (Electron mini-app)
5. debrief-calc (analysis tools)
6. VS Code Extension

### Local Development

**Demo Container:**
```bash
cd demo && docker build -t debrief-demo .
docker run -p 3000:3000 -e DEBRIEF_VERSION=latest debrief-demo
# Access at http://localhost:3000
```

### Important URLs

**Documentation:**
- Constitution: `CONSTITUTION.md`
- Architecture: `ARCHITECTURE.md`
- Vision: `VISION.md`
- Roadmap: `docs/tracer-delivery-plan.md`

**External:**
- Demo: https://debrief-demo.fly.dev

### Dynamic Tool Selection (Calc Service)

**How tool matching works:**
- Python calc tools declare `context_type` (SINGLE/MULTI/REGION/NONE) and `input_kinds`
- `fetchToolsFromMcp()` in `calcService.ts` converts these to `SelectionRequirement[]` (kind + min/max)
- `ToolMatchAdapter` converts session selection (feature IDs) → kind counts via `mapPanel.getFeatureKind()`
- `checkRequirements()` in `tool.ts` uses **closed-world matching** (ADR-005): tool active only if all selected kinds are in its requirements, and counts are within bounds

**Feature kinds recognized:** `TRACK`, `POINT`, `RESULT`, `REGION`

**Key files:**
- Tool requirements generation: `calcService.ts` → `fetchToolsFromMcp()`
- Feature kind resolution: `mapPanel.ts` → `getFeatureKind()`
- Match logic: `tool.ts` → `checkRequirements()`
- Adapter bridging session↔matching: `toolMatchAdapter.ts`
- Feature resolution for execution: `calcService.ts` → `resolveFeatures()`
