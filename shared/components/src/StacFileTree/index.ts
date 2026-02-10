/**
 * StacFileTree component exports.
 */

export { StacFileTree } from './StacFileTree';
export type {
  StacFileTreeProps,
  FilesystemAdapter,
  DirectoryEntry,
  FileStat,
  TreeNodeData,
  NodeType,
} from './types';
export { computeHighlightSets } from './highlightUtils';
export {
  createPopulatedStore,
  createEmptyStore,
  createSingleItemStore,
  createStoreWithSnapshots,
  createMemfsAdapter,
} from './fixtures';
