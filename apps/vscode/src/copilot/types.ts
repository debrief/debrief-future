/**
 * LM-tool boundary types for the Copilot spike (#284).
 *
 * Every value that enters from the Language Model Tools boundary is validated
 * to one of these shapes before use (Article XV.5 — validate at the boundary).
 *
 * Per Constitution Article IV.5 (derive, don't re-list) the one type that
 * mirrors a *subset* of an existing typed source — `ToolRegistryView` over the
 * VS Code `Tool` — is derived with `Pick`. The remaining types are genuinely
 * new shapes (LM tool input schemas with no source type, or projections that
 * rename/transform fields rather than subset them), so they are authored here.
 */

import type { Tool } from '../types/tool';

// ─────────────────────────────────────────────────────────────────────────────
// LM tool inputs (validated at the boundary — data-model.md)
// ─────────────────────────────────────────────────────────────────────────────

/** Input for `debrief_searchPlots`. All properties optional, AND-combined. */
export interface SearchPlotsInput {
  /** Free-text over title + description (case-insensitive substring). */
  text?: string;
  /** ISO-8601 start of the interval to overlap. */
  startTime?: string;
  /** ISO-8601 end of the interval to overlap. */
  endTime?: string;
  /** Platform name/type membership. */
  platforms?: string[];
  /** `[west, south, east, north]` — intersection. */
  bbox?: [number, number, number, number];
  /** If a single match, open it directly in the editor. */
  open?: boolean;
}

/** Input for `debrief_summarizeCurrentPlot`. */
export interface SummarizeCurrentPlotInput {
  /** Explicit override; else the active plot. */
  plotId?: string;
  /** Summarise only the currently selected features (FR-010 / US4). */
  selectionOnly?: boolean;
}

/** Input for `debrief_listTools`. */
export interface ListToolsInput {
  /** Explicit override; else the active plot. */
  plotId?: string;
}

/** Input for `debrief_runTool`. */
export interface RunToolInput {
  /** Must match a live registry tool id (FR-017). */
  toolId: string;
  /** Validated against the tool's parameter schema. */
  params?: Record<string, unknown>;
  /** Target plot override; else the active plot. */
  plotId?: string;
  /** `'selection'` (default when a selection exists) or `'all'`. */
  scope?: 'all' | 'selection';
  /** The analyst's originating request → provenance (FR-023). */
  utterance?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Result entities (→ chat)
// ─────────────────────────────────────────────────────────────────────────────

/** A single time interval. */
export interface TimeSpan {
  start: string;
  end: string;
}

/** One search hit surfaced to chat (FR-005). */
export interface PlotMatch {
  /** `stac://<storeId>/<itemPath>` — the value `debrief.openPlot` accepts. */
  plotId: string;
  title: string;
  timeSpan: TimeSpan | null;
  platforms: string[];
  bbox: [number, number, number, number] | null;
}

/** A thinned per-feature entry for the summary (no geometry). */
export interface FeatureInventoryEntry {
  id: string;
  name: string;
  type: string;
  platform: string | null;
  timeSpan: TimeSpan | null;
  pointCount: number | null;
}

/** Identity of an open plot, for override discovery (FR-009). */
export interface OpenPlotView {
  plotId: string;
  title: string;
  active: boolean;
}

/** Token-bounded plot summary (→ chat). Named to avoid the schema's `PlotSummary`. */
export interface PlotSummaryView {
  plotId: string;
  title: string;
  timeSpan: TimeSpan | null;
  features: FeatureInventoryEntry[];
  /** True if the inventory was capped to the size budget. */
  truncated: boolean;
  /** FR-025 token-budget probe. */
  approxTokens: number;
  /** All open plots so the model can pass an explicit override. */
  openPlots: OpenPlotView[];
  /** True when this summary was scoped to the current selection (US4). */
  selectionOnly?: boolean;
}

/** No-plot-open sentinel result for the summary tool. */
export interface NoPlotOpenResult {
  noPlotOpen: true;
  hint: string;
  openPlots: OpenPlotView[];
}

/**
 * A registry tool projected for chat (subset of the cached `Tool`, plus the
 * derived `mutating` flag). Derived with `Pick` per Article IV.5.
 */
export type ToolRegistryView = Pick<
  Tool,
  'id' | 'name' | 'description' | 'parameters' | 'category' | 'requirements'
> & {
  /** Derived from the tool's `resultType` `mutation/` prefix. */
  mutating: boolean;
};

/** Degraded-registry sentinel for the list-tools tool. */
export interface ToolsUnavailableResult {
  toolsUnavailable: true;
  reason: string;
}

/** Internal outcome of applying a chat-driven edit (data-model.md). */
export interface ChatEditOutcome {
  applied: boolean;
  resultType: string;
  modifiedFeatureIds: string[];
  /** Chat edits mark the session dirty; they are never disk-written here. */
  dirty: true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Telemetry (evidence JSONL — matches contracts/telemetry-record.schema.json)
// ─────────────────────────────────────────────────────────────────────────────

/** Which LM tool the record is for. */
export type TelemetryTool =
  | 'searchPlots'
  | 'summarizeCurrentPlot'
  | 'listTools'
  | 'runTool';

/** Validation outcome for a tool invocation. */
export type TelemetryValidation = 'accepted' | { rejected: string };

/** Confirmation outcome for a tool invocation. */
export type TelemetryConfirmation = 'approved' | 'declined' | 'not_required';

/** Terminal outcome for a tool invocation. */
export type TelemetryOutcome = 'ok' | { error: string };

/** Per-stage latency breakdown (ms). */
export interface TelemetryLatency {
  registry?: number;
  python?: number;
  apply?: number;
  total: number;
}

/** One JSONL line per LM tool invocation (FR-024). */
export interface TelemetryRecord {
  /** Host-stamped invocation time (ISO-8601). */
  ts: string;
  tool: TelemetryTool;
  /** The validated tool input. */
  input: object;
  validation: TelemetryValidation;
  retries: number;
  confirmation: TelemetryConfirmation;
  latencyMs: TelemetryLatency;
  /** Operator-annotated — the API does not expose model identity (research R2). */
  activeModel: string;
  /** Whether `.github/copilot-instructions.md` was present for this run (FR-027). */
  primingEnabled: boolean;
  outcome: TelemetryOutcome;
}

/** The record minus the host-stamped `ts` (the writer stamps the time). */
export type TelemetryRecordDraft = Omit<TelemetryRecord, 'ts'>;
