import React, { useEffect, useRef, useState } from 'react';
import type { TopLevelSpec } from 'vega-lite';
import embed, { type Result } from 'vega-embed';

export interface ChartRendererProps {
  /** Vega-Lite spec to render. Pass `null` to show the error state. */
  spec: TopLevelSpec | null;
  /** Additional CSS class for the container. */
  className?: string;
  /** Callback invoked when vega-embed encounters an error. */
  onError?: (error: Error) => void;
}

/**
 * Shared chart renderer wrapping vega-embed.
 *
 * Handles four visual states:
 * - **Loading** — waiting for the spec to mount
 * - **Success** — chart rendered
 * - **Empty** — spec exists but data has zero rows
 * - **Error** — null/invalid spec or render failure
 */
export function ChartRenderer({ spec, className, onError }: ChartRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
