# Schema diff — regenerated artefacts (feature 203)

**Captured**: Phase 1 (after `pnpm --filter @debrief/schemas build` / `uv run python scripts/generate.py --target all`).

## TypeScript `shared/schemas/src/generated/typescript/types.ts`

Only the intended interfaces changed. `Coordinate` is unchanged. `ViewportPolygon`
gains an optional `zoom`. `TimeFilter` moves from `TimeInstant` to nullable epoch
integers.

```diff
 /**
- * Constraints on the visible time window
+ * Constraints on the visible time window (epoch milliseconds; null = unbounded)
  */
 export interface TimeFilter {
-    /** Filter start (null = unbounded) */
-    start?: TimeInstant,
-    /** Filter end (null = unbounded) */
-    end?: TimeInstant,
+    /** Filter start as epoch milliseconds (null/missing = unbounded on the start) */
+    start?: number,
+    /** Filter end as epoch milliseconds (null/missing = unbounded on the end) */
+    end?: number,
 }

 export interface ViewportPolygon {
     /** Four corners in clockwise order [NW, NE, SE, SW] */
     coordinates: Coordinate[],
+    /** Map zoom level for restoring the view (optional) */
+    zoom?: number,
 }
```

## Pydantic `shared/schemas/src/generated/python/debrief_schemas/__init__.py`

```diff
 class TimeFilter(ConfiguredBaseModel):
     """
-    Constraints on the visible time window
+    Constraints on the visible time window (epoch milliseconds; null = unbounded)
     """
-    start: Optional[TimeInstant] = Field(default=None, description="""Filter start (null = unbounded)""", ...)
-    end: Optional[TimeInstant] = Field(default=None, description="""Filter end (null = unbounded)""", ...)
+    start: Optional[int] = Field(default=None, description="""Filter start as epoch milliseconds (null/missing = unbounded on the start)""", ...)
+    end: Optional[int] = Field(default=None, description="""Filter end as epoch milliseconds (null/missing = unbounded on the end)""", ...)

 class ViewportPolygon(ConfiguredBaseModel):
     ...
+    zoom: Optional[float] = Field(default=None, description="""Map zoom level for restoring the view (optional)""", ...)
```

## Expected shapes (T007 verification)

| Type | Shape | Status |
|------|-------|--------|
| `Coordinate` | `{ longitude: number, latitude: number }` | ✅ Unchanged |
| `ViewportPolygon.coordinates` | `Coordinate[]` (4 corners enforced at validator) | ✅ Unchanged |
| `ViewportPolygon.zoom` | `number` (optional) | ✅ Added |
| `TimeFilter.start` | `number` (optional epoch ms) | ✅ Changed |
| `TimeFilter.end` | `number` (optional epoch ms) | ✅ Changed |

No unintended changes in `TimeInstant` or `TimeRange` (TimeInstant still used by TimeRange).
