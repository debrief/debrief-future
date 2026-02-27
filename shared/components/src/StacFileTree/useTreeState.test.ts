import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTreeState } from './useTreeState';
import type { DirectoryEntry, FilesystemAdapter } from './types';

describe('useTreeState', () => {
  let mockFs: FilesystemAdapter;

  beforeEach(() => {
    // Mock filesystem adapter
    mockFs = {
      stat: vi.fn(),
      readDirectory: vi.fn(),
      readFile: vi.fn(),
    };
  });

  it('initializes with loading state', () => {
    vi.mocked(mockFs.stat).mockResolvedValue({
      isDirectory: true,
      size: 0,
      modifiedTime: Date.now(),
    });
    vi.mocked(mockFs.readDirectory).mockResolvedValue([]);

    const { result } = renderHook(() => useTreeState(mockFs, '/root'));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.nodes).toEqual([]);
  });

  it('loads root node with children', async () => {
    vi.mocked(mockFs.stat).mockResolvedValue({
      isDirectory: true,
      size: 0,
      modifiedTime: Date.now(),
    });

    const rootEntries = [
      { name: 'catalog.json', isDirectory: false },
      { name: 'item-001', isDirectory: true },
    ];

    // readDirectory is called twice for root (detectNodeType + loadChildren)
    // then once for item-001 (detectNodeType of child)
    vi.mocked(mockFs.readDirectory)
      .mockResolvedValueOnce(rootEntries) // detectNodeType for root
      .mockResolvedValueOnce(rootEntries) // loadChildren for root
      .mockResolvedValueOnce([{ name: 'item.json', isDirectory: false }]); // detectNodeType for item-001

    const { result } = renderHook(() => useTreeState(mockFs, '/root'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.nodes).toHaveLength(1);
    expect(result.current.nodes[0]?.path).toBe('/root');
    expect(result.current.nodes[0]?.nodeType).toBe('catalog');
    expect(result.current.nodes[0]?.children).toHaveLength(2);
  });

  it('detects catalog node type', async () => {
    vi.mocked(mockFs.stat).mockResolvedValue({
      isDirectory: true,
      size: 0,
      modifiedTime: Date.now(),
    });

    vi.mocked(mockFs.readDirectory).mockResolvedValue([
      { name: 'catalog.json', isDirectory: false },
    ]);

    const { result } = renderHook(() => useTreeState(mockFs, '/catalog'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.nodes[0]?.nodeType).toBe('catalog');
  });

  it('detects collection node type', async () => {
    vi.mocked(mockFs.stat).mockResolvedValue({
      isDirectory: true,
      size: 0,
      modifiedTime: Date.now(),
    });

    vi.mocked(mockFs.readDirectory).mockResolvedValue([
      { name: 'collection.json', isDirectory: false },
    ]);

    const { result } = renderHook(() => useTreeState(mockFs, '/collection'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.nodes[0]?.nodeType).toBe('collection');
  });

  it('detects item node type', async () => {
    vi.mocked(mockFs.stat).mockResolvedValue({
      isDirectory: true,
      size: 0,
      modifiedTime: Date.now(),
    });

    vi.mocked(mockFs.readDirectory).mockResolvedValue([
      { name: 'item.json', isDirectory: false },
    ]);

    const { result } = renderHook(() => useTreeState(mockFs, '/item'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.nodes[0]?.nodeType).toBe('item');
  });

  it('treats directory without STAC files as folder', async () => {
    vi.mocked(mockFs.stat).mockResolvedValue({
      isDirectory: true,
      size: 0,
      modifiedTime: Date.now(),
    });

    vi.mocked(mockFs.readDirectory).mockResolvedValue([
      { name: 'data.txt', isDirectory: false },
    ]);

    const { result } = renderHook(() => useTreeState(mockFs, '/folder'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.nodes[0]?.nodeType).toBe('folder');
  });

  it('treats files as assets', async () => {
    vi.mocked(mockFs.stat).mockResolvedValue({
      isDirectory: true,
      size: 0,
      modifiedTime: Date.now(),
    });

    const rootEntries = [{ name: 'file.json', isDirectory: false }];

    // readDirectory called twice for root (detectNodeType + loadChildren)
    vi.mocked(mockFs.readDirectory)
      .mockResolvedValueOnce(rootEntries) // detectNodeType for root
      .mockResolvedValueOnce(rootEntries); // loadChildren for root

    const { result } = renderHook(() => useTreeState(mockFs, '/root'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const fileNode = result.current.nodes[0]?.children?.[0];
    expect(fileNode?.nodeType).toBe('asset');
  });

  it('handles stat error', async () => {
    vi.mocked(mockFs.stat).mockRejectedValue(new Error('Path not found'));

    const { result } = renderHook(() => useTreeState(mockFs, '/nonexistent'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.nodes).toEqual([]);
  });

  it('handles non-directory root', async () => {
    vi.mocked(mockFs.stat).mockResolvedValue({
      isDirectory: false,
      size: 100,
      modifiedTime: Date.now(),
    });

    const { result } = renderHook(() => useTreeState(mockFs, '/file.txt'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Root path is not a directory');
  });

  it('reloads when refreshKey changes', async () => {
    vi.mocked(mockFs.stat).mockResolvedValue({
      isDirectory: true,
      size: 0,
      modifiedTime: Date.now(),
    });

    vi.mocked(mockFs.readDirectory).mockResolvedValue([]);

    const { result, rerender } = renderHook(
      ({ key }) => useTreeState(mockFs, '/root', key),
      { initialProps: { key: 1 } }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFs.stat).toHaveBeenCalledTimes(1);

    // Change refresh key
    rerender({ key: 2 });

    await waitFor(() => {
      expect(mockFs.stat).toHaveBeenCalledTimes(2);
    });
  });

  it('cancels load when unmounted', async () => {
    let resolveReadDir: (value: unknown) => void;
    const readDirPromise = new Promise((resolve) => {
      resolveReadDir = resolve;
    });

    vi.mocked(mockFs.stat).mockResolvedValue({
      isDirectory: true,
      size: 0,
      modifiedTime: Date.now(),
    });

    vi.mocked(mockFs.readDirectory).mockReturnValue(readDirPromise as Promise<DirectoryEntry[]>);

    const { unmount } = renderHook(() => useTreeState(mockFs, '/root'));

    // Unmount before promise resolves
    unmount();

    // Resolve promise after unmount
    resolveReadDir!([]);

    // Should not throw or update state
  });
});
