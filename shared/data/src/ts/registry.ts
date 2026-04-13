/**
 * Platform registry loader — reads the vessel class tree and resolves platforms.
 */

import { readFileSync } from 'node:fs';
import { resolve as resolvePath, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_REGISTRY_PATH = resolvePath(__dirname, '..', '..', 'platform-registry.json');

/** Complete metadata for a platform, combining leaf attributes with position-derived fields. */
export interface ResolvedPlatform {
  readonly id: string;
  readonly name: string;
  readonly short_name: string | undefined;
  readonly nationality: string;
  readonly vessel_class: string;
  readonly vessel_type: string;
  readonly vessel_role: string;
  readonly domain: string;
}

type TreeNode = Record<string, unknown>;

function isPlatformEntry(value: unknown): value is { name: string; nationality: string; short_name?: string } {
  return typeof value === 'object' && value !== null && 'name' in value;
}

function isLeafEntry(value: Record<string, unknown>): boolean {
  for (const [k, v] of Object.entries(value)) {
    if (k.startsWith('_')) continue;
    if (typeof v !== 'object' || v === null) return true;
  }
  return false;
}

function walkTree(
  node: TreeNode,
  pathSegments: readonly string[],
  platforms: Map<string, ResolvedPlatform>,
  seenIds: Map<string, string>,
): void {
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('_')) continue;

    if (typeof value !== 'object' || value === null) {
      throw new Error(
        `Invalid registry format: expected object for key '${key}' at path '${pathSegments.join('/')}'`,
      );
    }

    const record = value as Record<string, unknown>;

    if (isPlatformEntry(record) || isLeafEntry(record)) {
      // Validate required fields
      if (!record.name || typeof record.name !== 'string') {
        throw new Error(`Platform '${key}' missing required field 'name'`);
      }
      if (!record.nationality || typeof record.nationality !== 'string') {
        throw new Error(`Platform '${key}' missing required field 'nationality'`);
      }

      // Check for duplicate IDs
      const currentPath = pathSegments.join('/');
      const existingPath = seenIds.get(key);
      if (existingPath !== undefined) {
        throw new Error(
          `Duplicate platform ID '${key}' found at paths '${existingPath}' and '${currentPath}'`,
        );
      }
      seenIds.set(key, currentPath);

      // Derive positional fields
      const classPath = pathSegments.join('/');
      const domain = pathSegments[0] ?? '';
      const vesselType = pathSegments[pathSegments.length - 1] ?? '';
      const vesselRole = pathSegments.length >= 2 ? (pathSegments[pathSegments.length - 2] ?? '') : '';

      platforms.set(key, {
        id: key,
        name: record.name as string,
        short_name: typeof record.short_name === 'string' ? record.short_name : undefined,
        nationality: record.nationality as string,
        vessel_class: classPath,
        vessel_type: vesselType,
        vessel_role: vesselRole,
        domain,
      });
    } else {
      walkTree(record, [...pathSegments, key], platforms, seenIds);
    }
  }
}

function collectPlatforms(
  node: TreeNode,
  results: ResolvedPlatform[],
  index: Map<string, ResolvedPlatform>,
): void {
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('_')) continue;
    if (typeof value !== 'object' || value === null) continue;

    const record = value as Record<string, unknown>;
    if (isPlatformEntry(record)) {
      const platform = index.get(key);
      if (platform !== undefined) {
        results.push(platform);
      }
    } else {
      collectPlatforms(record, results, index);
    }
  }
}

/** Parsed platform registry with lookup, enumeration, and tree traversal. */
export class PlatformRegistry {
  private readonly _platforms: Map<string, ResolvedPlatform>;
  private readonly _tree: TreeNode;

  constructor(platforms: Map<string, ResolvedPlatform>, tree: TreeNode) {
    this._platforms = platforms;
    this._tree = tree;
  }

  /** Look up a single platform by ID. Returns undefined for unknown/empty IDs. */
  resolve(platformId: string): ResolvedPlatform | undefined {
    if (!platformId || !platformId.trim()) return undefined;
    return this._platforms.get(platformId);
  }

  /** Return all registered platforms sorted by ID. */
  listPlatforms(): readonly ResolvedPlatform[] {
    return [...this._platforms.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  /** Find all platforms under a given vessel class path (including descendants). */
  findByClass(classPath: string): readonly ResolvedPlatform[] {
    if (!classPath || !classPath.trim()) return [];
    const segments = classPath.trim().split('/');
    let node: TreeNode = this._tree;
    for (const seg of segments) {
      const child = node[seg];
      if (child === undefined || typeof child !== 'object' || child === null) return [];
      node = child as TreeNode;
    }
    const results: ResolvedPlatform[] = [];
    collectPlatforms(node, results, this._platforms);
    return results.sort((a, b) => a.id.localeCompare(b.id));
  }

  /** Check whether a class path corresponds to a real node in the taxonomy tree. */
  isValidClass(classPath: string): boolean {
    if (!classPath || !classPath.trim()) return false;
    const segments = classPath.trim().split('/');
    let node: TreeNode = this._tree;
    for (const seg of segments) {
      const child = node[seg];
      if (child === undefined || typeof child !== 'object' || child === null) return false;
      node = child as TreeNode;
    }
    return true;
  }
}

/**
 * Load and validate the platform registry from a JSON file.
 *
 * @param path - Path to the registry JSON file. Defaults to the bundled registry.
 * @returns A PlatformRegistry instance with all platforms indexed.
 * @throws Error if the file does not exist, contains invalid JSON, or has structural issues.
 */
export function loadRegistry(path?: string): PlatformRegistry {
  const registryPath = path ?? DEFAULT_REGISTRY_PATH;

  let text: string;
  try {
    text = readFileSync(registryPath, 'utf-8');
  } catch (err) {
    if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Registry file not found: ${registryPath}`);
    }
    throw err;
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Invalid registry format: invalid JSON');
  }

  if (typeof data !== 'object' || data === null || !('vessel_classes' in data)) {
    throw new Error("Registry must have 'vessel_classes' root key");
  }

  const vesselClasses = (data as Record<string, unknown>).vessel_classes;
  if (typeof vesselClasses !== 'object' || vesselClasses === null) {
    throw new Error("Invalid registry format: 'vessel_classes' must be an object");
  }

  const platforms = new Map<string, ResolvedPlatform>();
  const seenIds = new Map<string, string>();
  walkTree(vesselClasses as TreeNode, [], platforms, seenIds);

  return new PlatformRegistry(platforms, vesselClasses as TreeNode);
}
