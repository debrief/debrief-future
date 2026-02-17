import { ComponentType } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';

export interface PanelProps {
    readonly container: unknown;
    readonly isPopout: boolean;
    readonly panelId: string;
}
export interface PanelDefinition {
    readonly type: string;
    readonly title: string;
    readonly component: ComponentType<PanelProps>;
    readonly icon?: string;
    readonly minWidth?: number;
    readonly minHeight?: number;
    readonly closable?: boolean;
    readonly singleton?: boolean;
}
export interface PanelRegistry {
    register(definition: PanelDefinition): void;
    unregister(type: string): void;
    get(type: string): PanelDefinition | undefined;
    has(type: string): boolean;
    getAll(): ReadonlyArray<PanelDefinition>;
    getTypes(): ReadonlyArray<string>;
}
/**
 * Creates a new panel registry instance.
 *
 * @returns A PanelRegistry implementation
 */
export declare function createPanelRegistry(): PanelRegistry;
//# sourceMappingURL=panelRegistry.d.ts.map