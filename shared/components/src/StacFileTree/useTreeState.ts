/**
 * Custom hook for managing tree state with lazy loading
 */

import { useState, useEffect, useCallback } from 'react';
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
 * Hook for managing tree state with lazy loading.
 * Loads children on first expand and caches them.
 *
 * @param fs - Filesystem adapter
 * @param rootPath - Root directory path
 * @param refreshKey - Change this to clear cache and reload
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

  // Initial load: create root node
  useEffect(() => {
    let cancelled = false;

    async function loadRoot() {
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

        const nodeType = await detectNodeType(fs, rootPath, true);
        if (cancelled) return;

        // Load immediate children of root
        const children = await loadChildren(fs, rootPath);
        if (cancelled) return;

        const rootNode: TreeNodeData = {
          path: rootPath,
          name: rootPath.split('/').filter(Boolean).pop() || rootPath,
          nodeType,
          isExpandable: true,
          children, // Root starts expanded with children loaded
          isLoading: false,
        };

        setNodes([rootNode]);
        setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setIsLoading(false);
        }
      }
    }

    loadRoot();

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
      setNodes((prevNodes) => {
        // Helper to recursively find and update node
        function updateNode(nodes: TreeNodeData[]): TreeNodeData[] {
          return nodes.map((node) => {
            if (node.path === path) {
              // Found the node to toggle
              if (node.children === null) {
                // Not loaded yet - start loading
                return { ...node, isLoading: true };
              } else {
                // Already loaded - just toggle by setting children to null (collapsed)
                // We'll keep the cache and restore on next expand
                return {
                  ...node,
                  children: node.children.length > 0 ? null : node.children,
                };
              }
            } else if (node.children && node.children.length > 0) {
              // Recurse into children
              return { ...node, children: updateNode(node.children) };
            }
            return node;
          });
        }

        return updateNode(prevNodes);
      });

      // Find the node to check if we need to load children
      function findNode(nodes: TreeNodeData[], targetPath: string): TreeNodeData | null {
        for (const node of nodes) {
          if (node.path === targetPath) return node;
          if (node.children) {
            const found = findNode(node.children, targetPath);
            if (found) return found;
          }
        }
        return null;
      }

      const targetNode = findNode(nodes, path);
      if (!targetNode || targetNode.children !== null) {
        // Either not found or already loaded/collapsed
        return;
      }

      // Load children
      try {
        const children = await loadChildren(fs, path);

        setNodes((prevNodes) => {
          function updateNode(nodes: TreeNodeData[]): TreeNodeData[] {
            return nodes.map((node) => {
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
        // Update node with error
        setNodes((prevNodes) => {
          function updateNode(nodes: TreeNodeData[]): TreeNodeData[] {
            return nodes.map((node) => {
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
    },
    [fs, nodes]
  );

  return { nodes, toggleNode, isLoading, error };
}
