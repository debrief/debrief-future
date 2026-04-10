import { CSSProperties } from '../../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { Tool } from '../../../../schemas/src/generated/typescript/index.ts';
import { SimpleFeature } from './fixtures/features';

export interface ToolMatchHarnessProps {
    /** Features to display in the selection panel */
    features: SimpleFeature[];
    /** Tools to match against the selection */
    tools: Tool[];
    /** Initial selected feature IDs */
    initialSelection?: string[];
    /** Whether to show inactive tools initially */
    initialShowInactive?: boolean;
    /** Additional CSS class */
    className?: string;
    /** Additional inline styles */
    style?: CSSProperties;
}
/**
 * ToolMatchHarness displays a feature selection panel and tool matching results.
 *
 * @example
 * ```tsx
 * <ToolMatchHarness
 *   features={sampleFeatures}
 *   tools={sampleTools}
 * />
 * ```
 */
export declare function ToolMatchHarness({ features, tools, initialSelection, initialShowInactive, className, style, }: ToolMatchHarnessProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ToolMatchHarness.d.ts.map