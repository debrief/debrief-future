/**
 * Types for StacFileTree component
 */
/**
 * Node type classification based on STAC entity type or filesystem structure
 */
export type NodeType = 'catalog' | 'collection' | 'item' | 'asset' | 'folder';
/**
 * Directory entry returned by filesystem adapter
 */
export interface DirectoryEntry {
    /** Entry name (file or directory name) */
    name: string;
    /** Whether this entry is a directory */
    isDirectory: boolean;
}
/**
 * File statistics returned by filesystem adapter
 */
export interface FileStat {
    /** Whether this is a directory */
    isDirectory: boolean;
    /** File size in bytes */
    size: number;
    /** Last modified timestamp */
    modifiedTime: number;
}
/**
 * Filesystem adapter interface for reading directory structures.
 * Allows injection of different filesystem implementations (memfs, Node fs, VS Code workspace.fs)
 */
export interface FilesystemAdapter {
    /**
     * Read directory contents
     * @param path - Directory path
     * @returns Array of directory entries
     */
    readDirectory(path: string): Promise<DirectoryEntry[]>;
    /**
     * Get file/directory stats
     * @param path - File or directory path
     * @returns File statistics
     */
    stat(path: string): Promise<FileStat>;
    /**
     * Read file contents as text
     * @param path - File path
     * @returns File contents
     */
    readFile(path: string): Promise<string>;
}
/**
 * Tree node data structure used internally by the component
 */
export interface TreeNodeData {
    /** Absolute path to this node */
    path: string;
    /** Display name */
    name: string;
    /** Node type classification */
    nodeType: NodeType;
    /** Whether this node can be expanded (has children) */
    isExpandable: boolean;
    /** Child nodes (null if not yet loaded, empty array if no children) */
    children: TreeNodeData[] | null;
    /** Whether children are currently being loaded */
    isLoading: boolean;
    /** Error message if loading failed */
    error?: string;
}
/**
 * Props for StacFileTree component
 */
export interface StacFileTreeProps {
    /** Filesystem adapter for reading directory structure */
    fs: FilesystemAdapter;
    /** Root directory path to start browsing from */
    rootPath: string;
    /** Paths to highlight in the tree (e.g., snapshot files) */
    highlightedPaths?: string[];
    /** Current selected item path (highlighted differently) */
    currentItemPath?: string;
    /** Callback when an item node is double-clicked to open */
    onItemSelect?: (itemPath: string) => void;
    /** Callback when a leaf (non-expandable) file node is clicked */
    onFileSelect?: (filePath: string) => void;
    /** Key to trigger refresh/cache clear (change this value to refresh) */
    refreshKey?: string | number;
    /** Additional CSS class name */
    className?: string;
}
//# sourceMappingURL=types.d.ts.map