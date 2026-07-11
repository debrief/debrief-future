/**
 * Per-invocation telemetry writer for the Copilot spike (#284, FR-024).
 *
 * Appends one JSONL record per LM tool invocation, host-stamping the time
 * (the draft carries everything except `ts`). Mirrors the structured-logging
 * posture of #191's `llmProxy` (`console.info` a tagged record) and adds a
 * file sink so the log can be copied into `evidence/` for the findings report.
 *
 * This is throwaway experiment instrumentation, not a shipped audit trail
 * (spec Out of Scope). The sink and clock are injectable so the writer is
 * unit-testable without touching the filesystem or a real clock.
 */

import type {
  TelemetryRecord,
  TelemetryRecordDraft,
} from './types';

/** A destination for one serialised telemetry line (no trailing newline). */
export type TelemetrySink = (line: string) => void;

/** Options for {@link createTelemetryWriter}. */
export interface TelemetryWriterOptions {
  /** Where each JSONL line goes. Defaults to `console.info`-tagged output. */
  sink?: TelemetrySink;
  /** Clock — returns the ISO-8601 host timestamp. Injectable for tests. */
  now?: () => string;
}

/** Appends telemetry records; the only public surface the tools depend on. */
export interface TelemetryWriter {
  /** Stamp the host time onto a draft and append it. */
  record(draft: TelemetryRecordDraft): TelemetryRecord;
}

const LOG_TAG = '[copilot/telemetry]';

/** Default sink: emit a tagged structured line to the console (#191 pattern). */
function defaultSink(line: string): void {
  // eslint-disable-next-line no-console -- structured spike telemetry, mirrors #191 llmProxy emitRecord
  if (typeof console !== 'undefined' && typeof console.info === 'function') {
    // eslint-disable-next-line no-console -- structured spike telemetry, mirrors #191 llmProxy emitRecord
    console.info(LOG_TAG, line);
  }
}

/**
 * Build a telemetry writer.
 *
 * @param options - injectable sink + clock (see {@link TelemetryWriterOptions}).
 */
export function createTelemetryWriter(
  options: TelemetryWriterOptions = {},
): TelemetryWriter {
  const sink = options.sink ?? defaultSink;
  const now = options.now ?? ((): string => new Date().toISOString());

  return {
    record(draft: TelemetryRecordDraft): TelemetryRecord {
      const full: TelemetryRecord = { ts: now(), ...draft };
      try {
        sink(JSON.stringify(full));
      } catch {
        // Telemetry must never break a tool call.
      }
      return full;
    },
  };
}

/**
 * A file-appending sink built on an injected append primitive.
 *
 * The extension wires this to `fs.appendFileSync` at a path under the
 * extension's log directory; the unit tests wire an in-memory array. Kept
 * separate from {@link createTelemetryWriter} so the writer core stays free of
 * any I/O dependency.
 *
 * @param append - appends a line (with newline) to the backing store.
 */
export function createFileSink(append: (line: string) => void): TelemetrySink {
  return (line: string): void => {
    append(`${line}\n`);
    defaultSink(line);
  };
}
