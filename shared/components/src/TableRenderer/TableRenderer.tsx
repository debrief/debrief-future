/**
 * TableRenderer — renders flat tabular data as an HTML table.
 * Feature: 177-tabular-results-panel
 *
 * Designed for tool results that produce flat key-value statistics
 * (e.g., track-stats). Column names are derived from the data keys.
 */

export interface TableRendererProps {
  /** Array of row records. Column names are derived from the keys of the first row. */
  data: Record<string, unknown>[];
  /** Optional CSS class name */
  className?: string;
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return String(value);
    return Number(value.toPrecision(4)).toString();
  }
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function TableRenderer({ data, className }: TableRendererProps) {
  if (data.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--vscode-descriptionForeground, #969696)',
        }}
        role="status"
        data-testid="table-renderer-empty"
      >
        No data to display
      </div>
    );
  }

  const firstRow = data[0];
  if (!firstRow) return null;
  const columns = Object.keys(firstRow);

  return (
    <div
      className={className}
      style={{ overflow: 'auto', height: '100%' }}
      data-testid="table-renderer"
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 12,
          fontFamily: 'var(--vscode-editor-font-family, monospace)',
          color: 'var(--vscode-foreground, #cccccc)',
        }}
        role="table"
        aria-label="Tool results"
      >
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col}
                style={{
                  textAlign: 'left',
                  padding: '4px 8px',
                  borderBottom: '1px solid var(--vscode-panel-border, #454545)',
                  fontWeight: 600,
                  position: 'sticky',
                  top: 0,
                  background: 'var(--vscode-editorGroupHeader-tabsBackground, #252526)',
                  whiteSpace: 'nowrap',
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              style={{
                background: rowIdx % 2 === 0
                  ? 'transparent'
                  : 'var(--vscode-list-hoverBackground, rgba(255,255,255,0.04))',
              }}
            >
              {columns.map(col => (
                <td
                  key={col}
                  style={{
                    padding: '3px 8px',
                    borderBottom: '1px solid var(--vscode-panel-border, rgba(69,69,69,0.4))',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatCell(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
