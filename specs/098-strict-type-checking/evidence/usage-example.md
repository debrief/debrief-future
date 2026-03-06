# Usage Example — Strict Type Checking

## Before: Loose typing with `any`

### TypeScript (test file)

```typescript
// Before — any used freely, no type safety
const feature = makeTrackFeature();
const result = execute([feature], { color: '#FF0000' });
expect(result[0].properties.style.line.color).toBe('#FF0000');  // no type safety on .style.line

// Mocks used any for everything
export class TreeItem {
  iconPath?: any;           // could be string, Uri, ThemeIcon
  command?: any;            // unknown structure
}
```

### Python (production code)

```python
# Before — Any passed through without validation
def json_output(self, data: Any) -> None:
    json.dumps(data)

def set(self, key: str, value: Any) -> None:
    self._data.setdefault("info", []).append({"key": key, "value": value})
```

## After: Concrete types enforced

### TypeScript (test file)

```typescript
// After — concrete interfaces define the shape
interface TestTrackFeature {
  type: 'Feature';
  id: string;
  geometry: { type: string; coordinates: number[][] };
  properties: Record<string, unknown>;
}

interface TestTrackStyle {
  line: { stroke: boolean; color: string; weight: number; opacity: number };
  point: { shape: string; radius: number; fill: boolean; fill_color: string; fill_opacity: number; stroke: boolean; color: string; weight: number; opacity: number };
}

const feature = makeTrackFeature();
const result = execute([feature], { color: '#FF0000' });
const style = result[0].properties.style as TestTrackStyle;
expect(style.line.color).toBe('#FF0000');

// Mocks use proper VS Code API types
interface MockUri { fsPath: string; scheme: string; path: string; }
interface MockCommand { command: string; title: string; arguments?: unknown[]; }
interface MockThemeIcon { id: string; color?: unknown; }

export class TreeItem {
  iconPath?: MockThemeIcon | MockUri | string;
  command?: MockCommand;
}
```

### Python (production code)

```python
# After — object replaces Any where values aren't subscripted
def json_output(self, data: object) -> None:
    json.dumps(data)

def set(self, key: str, value: object) -> None:
    self._data.setdefault("info", []).append({"key": key, "value": value})

# Where Any is still needed, it's documented
value: Any = Field(..., description="The parameter value")  # JSON-serializable value
```

## New Configuration

### pyrightconfig.json (new)

```json
{
  "include": ["services", "shared/schemas/src", "shared/schemas/tests"],
  "exclude": ["shared/schemas/src/generated/"],
  "pythonVersion": "3.11",
  "typeCheckingMode": "standard"
}
```

### ruff.toml (updated)

```toml
select = ["E", "F", "I", "W", "UP", "B", "SIM", "ANN", "TC"]
```

### ESLint (updated in all packages)

```json
"@typescript-eslint/no-explicit-any": "error"
```

### CI pipeline (new step)

```yaml
- name: Run type checking
  run: task typecheck
```

## Developer Workflow

```bash
# Check types before committing
task typecheck          # runs pyright + pnpm -r typecheck

# Fix annotation gaps
uv run ruff check --select ANN .  # find missing annotations
uv run ruff check --fix .          # auto-fix where possible
```
