import { Component, ReactNode, ErrorInfo } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';

interface Props {
    panelType: string;
    children: ReactNode;
}
interface State {
    hasError: boolean;
    error: Error | null;
}
export declare class PanelErrorBoundary extends Component<Props, State> {
    state: State;
    static getDerivedStateFromError(error: Error): State;
    componentDidCatch(error: Error, info: ErrorInfo): void;
    render(): string | number | boolean | Iterable<ReactNode> | import("react/jsx-runtime").JSX.Element | null | undefined;
}
export {};
//# sourceMappingURL=PanelErrorBoundary.d.ts.map