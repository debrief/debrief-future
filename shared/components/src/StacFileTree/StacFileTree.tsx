/**
 * StacFileTree component - renders STAC catalog filesystem structure as a tree
 */

import { useEffect, useMemo } from 'react';
import { Icon } from 'vscrui';
import type { IIconProps } from 'vscrui';
import { useTreeState } from './useTreeState';
import { computeHighlightSets } from './highlightUtils';
import type { StacFileTreeProps, TreeNodeData, NodeType } from './types';
import './StacFileTree.css';

/**
 * Get icon name for node type
 */
function getNodeIcon(nodeType: NodeType): IIconProps['name'] {
  switch (nodeType) {
    case 'catalog':
      return 'library';
    case 'collection':
      return 'folder-library';
    case 'item':
      return 'file-code';
    case 'asset':
      return 'file';
    case 'folder':
      return 'folder';
    default:
      return 'file';
  }
}

/**
 * TreeNode component - renders a single tree node recursively
 */
interface TreeNodeProps {
  node: TreeNodeData;
  depth: number;
  onToggle: (path: string) => void;
  onDoubleClick: (node: TreeNodeData) => void;
  isHighlighted: boolean;
  containsHighlight: boolean;
  isCurrent: boolean;
}

function TreeNode({
  node,
  depth,
  onToggle,
  onDoubleClick,
  isHighlighted,
  containsHighlight,
  isCurrent,
}: TreeNodeProps) {
  const isExpanded = node.children !== null;
  const hasChildren = node.isExpandable;

  const nodeClasses = [
    'debrief-file-tree__node',
    isHighlighted && 'debrief-file-tree__node--highlighted',
    containsHighlight && 'debrief-file-tree__node--contains-highlight',
    isCurrent && 'debrief-file-tree__node--current',
  ]
    .filter(Boolean)
    .join(' ');

  const handleClick = () => {
    if (hasChildren) {
      onToggle(node.path);
    }
  };

  const handleDoubleClick = () => {
    if (node.nodeType === 'item') {
      onDoubleClick(node);
    }
  };

  return (
    <>
      <div
        className={nodeClasses}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        data-testid={`tree-node-${node.nodeType}`}
        data-path={node.path}
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
      >
        {hasChildren && (
          <Icon
            name={isExpanded ? 'chevron-down' : 'chevron-right'}
            className="debrief-file-tree__chevron"
          />
        )}
        {!hasChildren && <span className="debrief-file-tree__spacer" />}
        <Icon name={getNodeIcon(node.nodeType)} className="debrief-file-tree__icon" />
        <span className="debrief-file-tree__label">{node.name}</span>
        {node.isLoading && (
          <span className="debrief-file-tree__loading" data-testid="loading-spinner">
            <Icon name="loading" className="debrief-file-tree__loading-icon" />
          </span>
        )}
      </div>

      {node.error && (
        <div
          className="debrief-file-tree__error"
          style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
        >
          <Icon name="error" />
          <span>{node.error}</span>
        </div>
      )}

      {isExpanded && node.children && node.children.length > 0 && (
        <div className="debrief-file-tree__children">
          {node.children.map((child) => (
            <TreeNodeWithHighlights
              key={child.path}
              node={child}
              depth={depth + 1}
              onToggle={onToggle}
              onDoubleClick={onDoubleClick}
            />
          ))}
        </div>
      )}

      {isExpanded && node.children && node.children.length === 0 && (
        <div
          className="debrief-file-tree__empty"
          style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
        >
          <span className="debrief-file-tree__empty-text">Empty directory</span>
        </div>
      )}
    </>
  );
}

/**
 * Wrapper component that injects highlight context from parent
 */
interface TreeNodeWithHighlightsProps {
  node: TreeNodeData;
  depth: number;
  onToggle: (path: string) => void;
  onDoubleClick: (node: TreeNodeData) => void;
}

const TreeNodeWithHighlights = (props: TreeNodeWithHighlightsProps) => {
  // This will be wrapped by StacFileTree which provides highlight context via props
  return <TreeNode {...props} isHighlighted={false} containsHighlight={false} isCurrent={false} />;
};

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
export function StacFileTree({
  fs,
  rootPath,
  highlightedPaths = [],
  currentItemPath,
  onItemSelect,
  onFileSelect,
  refreshKey,
  className,
}: StacFileTreeProps) {
  const { nodes, toggleNode, expandPath, isLoading, error } = useTreeState(fs, rootPath, refreshKey);

  // Compute highlight sets
  const { directPaths, ancestorPaths } = useMemo(
    () => computeHighlightSets(highlightedPaths),
    [highlightedPaths]
  );

  // Auto-expand ancestors of highlighted paths so the target nodes are visible
  useEffect(() => {
    if (highlightedPaths.length === 0) return;
    void Promise.all(highlightedPaths.map(p => expandPath(p)));
  }, [highlightedPaths, expandPath]);

  const handleDoubleClick = (node: TreeNodeData) => {
    if (node.nodeType === 'item' && onItemSelect) {
      onItemSelect(node.path);
    }
  };

  // Recursive render with highlight context
  const renderNode = (node: TreeNodeData, depth: number) => {
    const isHighlighted = directPaths.has(node.path);
    const containsHighlight = ancestorPaths.has(node.path);
    const isCurrent = node.path === currentItemPath;
    const isExpanded = node.children !== null;
    const hasChildren = node.isExpandable;

    const nodeClasses = [
      'debrief-file-tree__node',
      isHighlighted && 'debrief-file-tree__node--highlighted',
      containsHighlight && 'debrief-file-tree__node--contains-highlight',
      isCurrent && 'debrief-file-tree__node--current',
    ]
      .filter(Boolean)
      .join(' ');

    const handleClick = () => {
      if (hasChildren) {
        toggleNode(node.path);
      } else if (onFileSelect) {
        onFileSelect(node.path);
      }
    };

    const handleNodeDoubleClick = () => {
      if (node.nodeType === 'item') {
        handleDoubleClick(node);
      }
    };

    return (
      <div key={node.path}>
        <div
          className={nodeClasses}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={handleClick}
          onDoubleClick={handleNodeDoubleClick}
          data-testid={`tree-node-${node.nodeType}`}
          data-path={node.path}
          role="treeitem"
          aria-expanded={hasChildren ? isExpanded : undefined}
        >
          {hasChildren && (
            <Icon
              name={isExpanded ? 'chevron-down' : 'chevron-right'}
              className="debrief-file-tree__chevron"
            />
          )}
          {!hasChildren && <span className="debrief-file-tree__spacer" />}
          <Icon name={getNodeIcon(node.nodeType)} className="debrief-file-tree__icon" />
          <span className="debrief-file-tree__label">{node.name}</span>
          {node.isLoading && (
            <span className="debrief-file-tree__loading" data-testid="loading-spinner">
              <Icon name="loading" className="debrief-file-tree__loading-icon" />
            </span>
          )}
        </div>

        {node.error && (
          <div
            className="debrief-file-tree__error"
            style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
          >
            <Icon name="error" />
            <span>{node.error}</span>
          </div>
        )}

        {isExpanded && node.children && node.children.length > 0 && (
          <div className="debrief-file-tree__children">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}

        {isExpanded && node.children && node.children.length === 0 && (
          <div
            className="debrief-file-tree__empty"
            style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
          >
            <span className="debrief-file-tree__empty-text">Empty directory</span>
          </div>
        )}
      </div>
    );
  };

  const containerClasses = [
    'debrief-file-tree',
    className,
    nodes.length === 0 && !isLoading && 'debrief-file-tree--empty',
  ]
    .filter(Boolean)
    .join(' ');

  if (isLoading) {
    return (
      <div className={containerClasses} data-testid="file-tree-loading">
        <div className="debrief-file-tree__loading-state">
          <Icon name="loading" className="debrief-file-tree__loading-icon" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={containerClasses} data-testid="file-tree-error">
        <div className="debrief-file-tree__error-state">
          <Icon name="error" />
          <span>{error}</span>
          <button
            type="button"
            className="debrief-file-tree__retry-button"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className={containerClasses} data-testid="file-tree-empty">
        <div className="debrief-file-tree__empty-state">
          <span>No files found</span>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClasses} data-testid="file-tree" role="tree">
      {nodes.map((node) => renderNode(node, 0))}
    </div>
  );
}
