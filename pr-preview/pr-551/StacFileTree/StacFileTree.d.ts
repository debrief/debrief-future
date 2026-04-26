import { StacFileTreeProps } from './types';

/**
 * StacFileTree component.
 * Renders a tree view of STAC catalog filesystem structure with lazy loading.
 *
 * @example
 * ```tsx
 * <StacFileTree
 *   fs={filesystemAdapter}
 *   rootPath="/data/stac-catalog"
 *   highlightedPaths={['/data/stac-catalog/item-001/snapshot-1.json']}
 *   currentItemPath="/data/stac-catalog/item-001"
 *   onItemSelect={(path) => console.log('Selected:', path)}
 * />
 * ```
 */
export declare function StacFileTree({ fs, rootPath, highlightedPaths, currentItemPath, onItemSelect, onFileSelect, refreshKey, className, }: StacFileTreeProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=StacFileTree.d.ts.map