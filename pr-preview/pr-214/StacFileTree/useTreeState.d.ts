import { FilesystemAdapter, TreeNodeData } from './types';

interface UseTreeStateReturn {
    /** Root nodes of the tree */
    nodes: TreeNodeData[];
    /** Toggle expand/collapse state of a node */
    toggleNode: (path: string) => Promise<void>;
    /** Whether initial load is in progress */
    isLoading: boolean;
    /** Error message if initial load failed */
    error: string | null;
}
/**
 * Hook for managing tree state with lazy loading.
 * Loads children on first expand and caches them.
 *
 * @param fs - Filesystem adapter
 * @param rootPath - Root directory path
 * @param refreshKey - Change this to clear cache and reload
 * @returns Tree state and toggle function
 */
export declare function useTreeState(fs: FilesystemAdapter, rootPath: string, refreshKey?: string | number): UseTreeStateReturn;
export {};
//# sourceMappingURL=useTreeState.d.ts.map