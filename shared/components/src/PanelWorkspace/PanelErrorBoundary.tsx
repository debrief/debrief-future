/**
 * Error boundary for panel content components.
 *
 * Catches React errors within a panel and displays a friendly error message
 * instead of breaking the entire layout.
 */

import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  panelType: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class PanelErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`Panel "${this.props.panelType}" error:`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: 16,
            color: 'var(--vscode-errorForeground, #d32f2f)',
            fontSize: 13,
            fontFamily: 'var(--vscode-editor-font-family, monospace)',
          }}
          data-testid={`panel-error-${this.props.panelType}`}
        >
          <strong>Panel Error: {this.props.panelType}</strong>
          <p style={{ marginTop: 8, opacity: 0.8 }}>
            {this.state.error?.message ?? 'An unexpected error occurred'}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
