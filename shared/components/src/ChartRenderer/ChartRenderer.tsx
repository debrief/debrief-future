import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import type { TopLevelSpec } from 'vega-lite';
import embed, { type Result } from 'vega-embed';
import type { View } from 'vega';
import { VIEWPORT_SIGNAL_PREFIXES } from './viewportConstants';

export interface ChartRendererProps {
  /** Vega-Lite spec to render. Pass `null` to show the error state. */
  spec: TopLevelSpec | null;
  /** Additional CSS class for the container. */
  className?: string;
  /** Callback invoked when vega-embed encounters an error. */
  onError?: (error: Error) => void;
}

/** Imperative handle for viewport capture/restore (Feature: 089). */
export interface ChartRendererHandle {
  /** Capture the current viewport signals. Returns null if none active. */
  captureViewport(): { signals: Record<string, unknown>; capturedAt: number } | null;
  /** Restore previously captured viewport signals. */
  restoreViewport(viewportState: { signals: Record<string, unknown> } | null): Promise<void>;
}

/**
 * Shared chart renderer wrapping vega-embed.
 *
 * Handles four visual states:
 * - **Loading** — waiting for the spec to mount
 * - **Success** — chart rendered
 * - **Empty** — spec exists but data has zero rows
 * - **Error** — null/invalid spec or render failure
 *
 * Exposes viewport capture/restore via ref handle (Feature: 089).
 */
export const ChartRenderer = forwardRef<ChartRendererHandle, ChartRendererProps>(
  function ChartRenderer({ spec, className, onError }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewResultRef = useRef<Result | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Expose viewport capture/restore API via ref
    useImperativeHandle(ref, () => ({
      captureViewport() {
        const view = viewResultRef.current?.view;
        if (!view) return null;

        const signals: Record<string, unknown> = {};
        let count = 0;

        try {
          // Get all signal names from the Vega view's internal state
          const state = (view as any)._runtime?.signals;
          if (!state) return null;

          const signalNames = Object.keys(state);
          for (const name of signalNames) {
            const isViewport = VIEWPORT_SIGNAL_PREFIXES.some(
              prefix => name.startsWith(prefix)
            );
            if (isViewport) {
              signals[name] = view.signal(name);
              count++;
            }
          }
        } catch {
          return null;
        }

        return count > 0
          ? { signals, capturedAt: Date.now() }
          : null;
      },

      async restoreViewport(viewportState) {
        if (!viewportState) return;

        const view = viewResultRef.current?.view;
        if (!view) return;

        try {
          for (const [name, value] of Object.entries(viewportState.signals)) {
            view.signal(name, value);
          }
          await (view as View).runAsync();
        } catch {
          // Silently fail — viewport restore is best-effort
        }
      },
    }), []);

    useEffect(() => {
      let disposed = false;
      let viewResult: Result | undefined;

      async function renderChart() {
        if (!containerRef.current) return;

        // Null spec → error state
        if (!spec) {
          setError('No render spec provided');
          setLoading(false);
          return;
        }

        setLoading(true);
        setError(null);

        try {
          viewResult = await embed(containerRef.current, spec, {
            actions: false,
            renderer: 'canvas',
          });
          viewResultRef.current = viewResult;
          if (!disposed) setLoading(false);
        } catch (err) {
          if (!disposed) {
            const message = err instanceof Error ? err.message : String(err);
            setError(`Chart rendering failed: ${message}`);
            setLoading(false);
            if (err instanceof Error) onError?.(err);
          }
        }
      }

      void renderChart();

      return () => {
        disposed = true;
        viewResult?.finalize();
        viewResultRef.current = undefined;
      };
    }, [spec, onError]);

    return (
      <div
        className={className}
        data-testid="chart-renderer"
        style={{ position: 'relative', minHeight: 100 }}
      >
        {loading && (
          <div data-testid="chart-loading" style={overlayStyle}>
            Loading chart…
          </div>
        )}
        {error && (
          <div data-testid="chart-error" style={errorStyle}>
            {error}
          </div>
        )}
        <div ref={containerRef} style={{ width: '100%' }} />
      </div>
    );
  }
);

const overlayStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 200,
  color: 'var(--vscode-descriptionForeground, #888)',
};

const errorStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 200,
  padding: 16,
  color: 'var(--vscode-errorForeground, #d32f2f)',
  textAlign: 'center',
};
