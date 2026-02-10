/**
 * Custom hook for managing tree state with lazy loading.
 * Preserves expanded node state across refreshKey changes.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { FilesystemAdapter, TreeNodeData, NodeType } from './types';

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
 * Detect node type by checking for STAC JSON files in directory
 */
async function detectNodeType(
  fs: FilesystemAdapter,
  path: string,
  isDirectory: boolean
): Promise<NodeType> {
  if (!isDirectory) {
    // Files are classified as assets
    return 'asset';
  }

  try {
    const entries = await fs.readDirectory(path);
    const fileNames = entries.filter((e) => !e.isDirectory).map((e) => e.name);

    if (fileNames.includes('catalog.json')) {
      return 'catalog';
    }
    if (fileNames.includes('collection.json')) {
      return 'collection';
    }
    if (fileNames.includes('item.json')) {
      return 'item';
    }

    // No STAC metadata files, treat as folder
    return 'folder';
  } catch {
    // If we can't read directory, treat as folder
    return 'folder';
  }
}

/**
 * Load children for a directory node
 */
async function loadChildren(
  fs: FilesystemAdapter,
  parentPath: string
): Promise<TreeNodeData[]> {
  const entries = await fs.readDirectory(parentPath);
  const children: TreeNodeData[] = [];

  for (const entry of entries) {
    const childPath = `${parentPath}/${entry.name}`;
    const nodeType = await detectNodeType(fs, childPath, entry.isDirectory);

    children.push({
      path: childPath,
      name: entry.name,
      nodeType,
      isExpandable: entry.isDirectory,
      children: null, // Not loaded yet
      isLoading: false,
      error: undefined,
    });
  }

  return children;
}

/**
 * Recursively build a tree node, expanding any paths in the expandedPaths set.
 */
async function buildExpandedNode(
  fs: FilesystemAdapter,
  path: string,
  expandedPaths: Set<string>
): Promise<TreeNodeData> {
  const nodeType = await detectNodeType(fs, path, true);
  const children = await loadChildren(fs, path);

  // Recursively expand children that are in the expanded set
  const resolvedChildren = await Promise.all(
    children.map(async (child) => {
      if (child.isExpandable && expandedPaths.has(child.path)) {
        try {
          return await buildExpandedNode(fs, child.path, expandedPaths);
        } catch {
          // If loading a previously-expanded child fails, return it collapsed
          return child;
        }
      }
      return child;
    })
  );

  return {
    path,
    name: path.split('/').filter(Boolean).pop() || path,
    nodeType,
    isExpandable: true,
    children: resolvedChildren,
    isLoading: false,
  };
}

/**
 * Hook for managing tree state with lazy loading.
 * Loads children on first expand and caches them.
 * Preserves expanded state across refreshKey changes.
 *
 * @param fs - Filesystem adapter
 * @param rootPath - Root directory path
 * @param refreshKey - Change this to reload data while preserving expanded state
 * @returns Tree state and toggle function
 */
export function useTreeState(
  fs: FilesystemAdapter,
  rootPath: string,
  refreshKey?: string | number
): UseTreeStateReturn {
  const [nodes, setNodes] = useState<TreeNodeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track which paths are expanded — persists across refreshKey changes
  const expandedPathsRef = useRef<Set<string>>(new Set([rootPath]));

  // Ensure root is always tracked as expanded
  expandedPathsRef.current.add(rootPath);

  // Load (or reload) tree, preserving expanded state
  useEffect(() => {
    let cancelled = false;

    async function loadTree() {
      setIsLoading(true);
      setError(null);

      try {
        const stat = await fs.stat(rootPath);
        if (cancelled) return;

        if (!stat.isDirectory) {
          setError('Root path is not a directory');
          setIsLoading(false);
          return;
        }

        const rootNode = await buildExpandedNode(
          fs,
          rootPath,
          expandedPathsRef.current
        );
        if (cancelled) return;

        setNodes([rootNode]);
        setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setIsLoading(false);
        }
      }
    }

    loadTree();

    return () => {
      cancelled = true;
    };
  }, [fs, rootPath, refreshKey]);

  /**
   * Toggle expand/collapse state of a node.
   * Loads children on first expand.
   */
  const toggleNode = useCallback(
    async (path: string) => {
      // Check current state to decide expand vs collapse
      function findNode(items: TreeNodeData[], targetPath: string): TreeNodeData | null {
        for (const node of items) {
          if (node.path === targetPath) return node;
          if (node.children) {
            const found = findNode(node.children, targetPath);
            if (found) return found;
          }
        }
        return null;
      }

      const targetNode = findNode(nodes, path);
      if (!targetNode) return;

      if (targetNode.children !== null) {
        // Currently expanded → collapse
        expandedPathsRef.current.delete(path);

        setNodes((prevNodes) => {
          function updateNode(items: TreeNodeData[]): TreeNodeData[] {
            return items.map((node) => {
              if (node.path === path) {
                return { ...node, children: node.children && node.children.length > 0 ? null : node.children };
              } else if (node.children && node.children.length > 0) {
                return { ...node, children: updateNode(node.children) };
              }
              return node;
            });
          }
          return updateNode(prevNodes);
        });
      } else {
        // Currently collapsed → expand
        expandedPathsRef.current.add(path);

        // Set loading state
        setNodes((prevNodes) => {
          function updateNode(items: TreeNodeData[]): TreeNodeData[] {
            return items.map((node) => {
              if (node.path === path) {
                return { ...node, isLoading: true };
              } else if (node.children && node.children.length > 0) {
                return { ...node, children: updateNode(node.children) };
              }
              return node;
            });
          }
          return updateNode(prevNodes);
        });

        // Load children
        try {
          const children = await loadChildren(fs, path);

          setNodes((prevNodes) => {
            function updateNode(items: TreeNodeData[]): TreeNodeData[] {
              return items.map((node) => {
                if (node.path === path) {
                  return { ...node, children, isLoading: false };
                } else if (node.children && node.children.length > 0) {
                  return { ...node, children: updateNode(node.children) };
                }
                return node;
              });
            }
            return updateNode(prevNodes);
          });
        } catch (err) {
          expandedPathsRef.current.delete(path);

          setNodes((prevNodes) => {
            function updateNode(items: TreeNodeData[]): TreeNodeData[] {
              return items.map((node) => {
                if (node.path === path) {
                  return {
                    ...node,
                    isLoading: false,
                    error: err instanceof Error ? err.message : String(err),
                  };
                } else if (node.children && node.children.length > 0) {
                  return { ...node, children: updateNode(node.children) };
                }
                return node;
              });
            }
            return updateNode(prevNodes);
          });
        }
      }
    },
    [fs, nodes]
  );

  return { nodes, toggleNode, isLoading, error };
}
