# Round-Trip Evidence: Selection Path Serialisation

Demonstrates that all selection paths survive parse → build cycles without loss.

## Test Cases

| Input Path | Parsed Root | Parsed Levels | Rebuilt Path | Match |
|-----------|-------------|---------------|-------------|-------|
| `track-001` | `track-001` | `[]` | `track-001` | PASS |
| `track-001/positions/4` | `track-001` | `[{positions, 4}]` | `track-001/positions/4` | PASS |
| `track-001/positions/42` | `track-001` | `[{positions, 42}]` | `track-001/positions/42` | PASS |
| `track-001/segments/leg-alpha` | `track-001` | `[{segments, leg-alpha}]` | `track-001/segments/leg-alpha` | PASS |
| `track-001/segments/leg-alpha/positions/3` | `track-001` | `[{segments, leg-alpha}, {positions, 3}]` | `track-001/segments/leg-alpha/positions/3` | PASS |
| `track-001/segments/seg~1a/positions/0` | `track-001` | `[{segments, seg~1a}, {positions, 0}]` | `track-001/segments/seg~1a/positions/0` | PASS |
| `root/a/1/b/2/c/3` | `root` | `[{a, 1}, {b, 2}, {c, 3}]` | `root/a/1/b/2/c/3` | PASS |
| `root/a/1/b/2/c/3/d/4` | `root` | `[{a, 1}, {b, 2}, {c, 3}, {d, 4}]` | `root/a/1/b/2/c/3/d/4` | PASS |

## Verified Properties

1. **Identity**: `buildPath(parsePath(p).root, parsePath(p).levels) === p` for all valid paths
2. **Depth preservation**: `parsePath(p).depth === parsePath(buildPath(parsePath(p).root, parsePath(p).levels)).depth`
3. **Root extraction**: `parsePath(p).root === getRoot(p)` — fast path matches full parse
4. **Escape preservation**: Escaped sequences (`~0`, `~1`) survive round-trip without double-escaping

## Test Source

```
tests/unit/utils/selectionPath.test.ts > buildPath > should round-trip complex path through parse and build
```

Result: **ALL 8 round-trip assertions PASS**
