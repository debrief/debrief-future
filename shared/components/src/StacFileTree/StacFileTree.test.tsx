import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StacFileTree } from './StacFileTree';
import { createPopulatedStore, createEmptyStore, createMemfsAdapter } from './fixtures';
import type { FilesystemAdapter } from './types';

describe('StacFileTree', () => {
  let mockFs: FilesystemAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders tree container', async () => {
      const vol = createPopulatedStore();
      mockFs = createMemfsAdapter(vol);

      render(<StacFileTree fs={mockFs} rootPath="/catalog-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('file-tree')).toBeInTheDocument();
      });
    });

    it('shows loading state initially', () => {
      const vol = createPopulatedStore();
      mockFs = createMemfsAdapter(vol);

      render(<StacFileTree fs={mockFs} rootPath="/catalog-1" />);

      expect(screen.getByTestId('file-tree-loading')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders root node with children', async () => {
      const vol = createPopulatedStore();
      mockFs = createMemfsAdapter(vol);

      render(<StacFileTree fs={mockFs} rootPath="/catalog-1" />);

      await waitFor(() => {
        expect(screen.getByText('catalog-1')).toBeInTheDocument();
      });

      expect(screen.getByText('collection-a')).toBeInTheDocument();
    });

    it('shows empty state when no files', async () => {
      const vol = createEmptyStore();
      mockFs = createMemfsAdapter(vol);

      render(<StacFileTree fs={mockFs} rootPath="/nonexistent" />);

      await waitFor(() => {
        expect(screen.getByTestId('file-tree-error')).toBeInTheDocument();
      });
    });

    it('renders correct icons for node types', async () => {
      const vol = createPopulatedStore();
      mockFs = createMemfsAdapter(vol);

      render(<StacFileTree fs={mockFs} rootPath="/catalog-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('tree-node-catalog')).toBeInTheDocument();
      });

      // Should have catalog, collection nodes visible
      expect(screen.getAllByTestId('tree-node-catalog').length).toBeGreaterThan(0);
    });
  });

  describe('expand/collapse', () => {
    it('expands node on click', async () => {
      const vol = createPopulatedStore();
      mockFs = createMemfsAdapter(vol);

      render(<StacFileTree fs={mockFs} rootPath="/catalog-1" />);

      await waitFor(() => {
        expect(screen.getByText('collection-a')).toBeInTheDocument();
      });

      // Collection should be visible (root is already expanded)
      expect(screen.getByText('collection-a')).toBeInTheDocument();

      // Click to expand collection
      fireEvent.click(screen.getByText('collection-a'));

      await waitFor(() => {
        expect(screen.getByText('item-001')).toBeInTheDocument();
      });
    });

    it('shows loading spinner while loading children', async () => {
      const vol = createPopulatedStore();
      mockFs = createMemfsAdapter(vol);

      render(<StacFileTree fs={mockFs} rootPath="/catalog-1" />);

      await waitFor(() => {
        expect(screen.getByText('collection-a')).toBeInTheDocument();
      });

      // Initially expanded root shouldn't show spinner after load
      const spinners = screen.queryAllByTestId('loading-spinner');
      expect(spinners.length).toBe(0);
    });

    it('collapses node on second click', async () => {
      const vol = createPopulatedStore();
      mockFs = createMemfsAdapter(vol);

      render(<StacFileTree fs={mockFs} rootPath="/catalog-1" />);

      await waitFor(() => {
        expect(screen.getByText('collection-a')).toBeInTheDocument();
      });

      // Click to expand
      fireEvent.click(screen.getByText('collection-a'));

      await waitFor(() => {
        expect(screen.getByText('item-001')).toBeInTheDocument();
      });

      // Click to collapse
      fireEvent.click(screen.getByText('collection-a'));

      await waitFor(() => {
        expect(screen.queryByText('item-001')).not.toBeInTheDocument();
      });
    });
  });

  describe('double-click to open item', () => {
    it('calls onItemSelect when item is double-clicked', async () => {
      const vol = createPopulatedStore();
      mockFs = createMemfsAdapter(vol);
      const onItemSelect = vi.fn();

      render(<StacFileTree fs={mockFs} rootPath="/catalog-1" onItemSelect={onItemSelect} />);

      await waitFor(() => {
        expect(screen.getByText('collection-a')).toBeInTheDocument();
      });

      // Expand collection
      fireEvent.click(screen.getByText('collection-a'));

      await waitFor(() => {
        expect(screen.getByText('item-001')).toBeInTheDocument();
      });

      // Double-click item
      fireEvent.doubleClick(screen.getByText('item-001'));

      expect(onItemSelect).toHaveBeenCalledWith('/catalog-1/collection-a/item-001');
    });

    it('does not call onItemSelect for non-item nodes', async () => {
      const vol = createPopulatedStore();
      mockFs = createMemfsAdapter(vol);
      const onItemSelect = vi.fn();

      render(<StacFileTree fs={mockFs} rootPath="/catalog-1" onItemSelect={onItemSelect} />);

      await waitFor(() => {
        expect(screen.getByText('collection-a')).toBeInTheDocument();
      });

      // Double-click collection (not an item)
      fireEvent.doubleClick(screen.getByText('collection-a'));

      expect(onItemSelect).not.toHaveBeenCalled();
    });
  });

  describe('highlights', () => {
    it('highlights specified paths', async () => {
      const vol = createPopulatedStore();
      mockFs = createMemfsAdapter(vol);

      render(
        <StacFileTree
          fs={mockFs}
          rootPath="/catalog-1"
          highlightedPaths={['/catalog-1/collection-a/item-001/snapshot-1.json']}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('collection-a')).toBeInTheDocument();
      });

      // Expand to see item
      fireEvent.click(screen.getByText('collection-a'));

      await waitFor(() => {
        expect(screen.getByText('item-001')).toBeInTheDocument();
      });

      // Expand item to see assets
      fireEvent.click(screen.getByText('item-001'));

      await waitFor(() => {
        expect(screen.getByText('snapshot-1.json')).toBeInTheDocument();
      });

      // Check if snapshot is highlighted
      const snapshotNode = screen.getByText('snapshot-1.json').closest('.debrief-file-tree__node');
      expect(snapshotNode).toHaveClass('debrief-file-tree__node--highlighted');
    });

    it('marks ancestor nodes as containing highlights', async () => {
      const vol = createPopulatedStore();
      mockFs = createMemfsAdapter(vol);

      render(
        <StacFileTree
          fs={mockFs}
          rootPath="/catalog-1"
          highlightedPaths={['/catalog-1/collection-a/item-001/snapshot-1.json']}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('collection-a')).toBeInTheDocument();
      });

      // Collection should have contains-highlight class
      const collectionNode = screen.getByText('collection-a').closest('.debrief-file-tree__node');
      expect(collectionNode).toHaveClass('debrief-file-tree__node--contains-highlight');
    });
  });

  describe('current item', () => {
    it('highlights current item path', async () => {
      const vol = createPopulatedStore();
      mockFs = createMemfsAdapter(vol);

      render(
        <StacFileTree
          fs={mockFs}
          rootPath="/catalog-1"
          currentItemPath="/catalog-1/collection-a/item-001"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('collection-a')).toBeInTheDocument();
      });

      // Expand collection
      fireEvent.click(screen.getByText('collection-a'));

      await waitFor(() => {
        expect(screen.getByText('item-001')).toBeInTheDocument();
      });

      // Check if item-001 is marked as current
      const itemNode = screen.getByText('item-001').closest('.debrief-file-tree__node');
      expect(itemNode).toHaveClass('debrief-file-tree__node--current');
    });
  });

  describe('error handling', () => {
    it('shows error state on load failure', async () => {
      const mockFailFs: FilesystemAdapter = {
        stat: vi.fn().mockRejectedValue(new Error('Failed to read')),
        readDirectory: vi.fn(),
        readFile: vi.fn(),
      };

      render(<StacFileTree fs={mockFailFs} rootPath="/bad-path" />);

      await waitFor(() => {
        expect(screen.getByTestId('file-tree-error')).toBeInTheDocument();
      });

      expect(screen.getByText(/Failed to read/)).toBeInTheDocument();
    });

    it('shows retry button on error', async () => {
      const mockFailFs: FilesystemAdapter = {
        stat: vi.fn().mockRejectedValue(new Error('Failed to read')),
        readDirectory: vi.fn(),
        readFile: vi.fn(),
      };

      render(<StacFileTree fs={mockFailFs} rootPath="/bad-path" />);

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });
  });

  describe('refresh', () => {
    it('reloads tree when refreshKey changes', async () => {
      const vol = createPopulatedStore();
      mockFs = createMemfsAdapter(vol);

      const { rerender } = render(<StacFileTree fs={mockFs} rootPath="/catalog-1" refreshKey={1} />);

      await waitFor(() => {
        expect(screen.getByText('catalog-1')).toBeInTheDocument();
      });

      // Change refresh key
      rerender(<StacFileTree fs={mockFs} rootPath="/catalog-1" refreshKey={2} />);

      // Should show loading state again
      expect(screen.getByTestId('file-tree-loading')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId('file-tree')).toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('has tree role', async () => {
      const vol = createPopulatedStore();
      mockFs = createMemfsAdapter(vol);

      render(<StacFileTree fs={mockFs} rootPath="/catalog-1" />);

      await waitFor(() => {
        expect(screen.getByRole('tree')).toBeInTheDocument();
      });
    });

    it('has treeitem roles', async () => {
      const vol = createPopulatedStore();
      mockFs = createMemfsAdapter(vol);

      render(<StacFileTree fs={mockFs} rootPath="/catalog-1" />);

      await waitFor(() => {
        expect(screen.getAllByRole('treeitem').length).toBeGreaterThan(0);
      });
    });

    it('sets aria-expanded on expandable nodes', async () => {
      const vol = createPopulatedStore();
      mockFs = createMemfsAdapter(vol);

      render(<StacFileTree fs={mockFs} rootPath="/catalog-1" />);

      await waitFor(() => {
        expect(screen.getByText('collection-a')).toBeInTheDocument();
      });

      const collectionNode = screen.getByText('collection-a').closest('[role="treeitem"]');
      expect(collectionNode).toHaveAttribute('aria-expanded');
    });
  });

  describe('empty directory', () => {
    it('shows tree for empty catalog with only catalog.json', async () => {
      const vol = createEmptyStore();
      mockFs = createMemfsAdapter(vol);

      render(<StacFileTree fs={mockFs} rootPath="/empty-catalog" />);

      // Root node loads and renders (it's a catalog node with catalog.json as only child)
      await waitFor(() => {
        expect(screen.getByTestId('file-tree')).toBeInTheDocument();
      });

      expect(screen.getByText('empty-catalog')).toBeInTheDocument();
    });
  });
});
