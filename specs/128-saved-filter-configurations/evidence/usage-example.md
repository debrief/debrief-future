# Usage Example: Saved Filter Configurations

## Basic Integration

Add saved filters to an existing FilterBar by providing a `savedFiltersStorage` prop:

```tsx
import { FilterBar, LocalStorageSavedFilters } from '@debrief/components';

// Create a storage instance (once, outside component)
const storage = new LocalStorageSavedFilters('debrief-saved-filters');

function MyApp() {
  return (
    <FilterBar
      items={stacItems}
      taxonomy={taxonomy}
      onFilteredItems={handleFiltered}
      savedFiltersStorage={storage}
    />
  );
}
```

This adds two controls to the filter bar:
- **Save** button — opens a name prompt popover to save the current filter state
- **Historic Filters** dropdown — lists saved configurations for restore/delete

## VS Code Extension Integration

For VS Code extensions, implement the `SavedFiltersStorage` interface using `workspaceState`:

```typescript
import type { SavedFiltersStorage, SavedFiltersCollection } from '@debrief/components';
import * as vscode from 'vscode';

class VsCodeSavedFilters implements SavedFiltersStorage {
  constructor(private context: vscode.ExtensionContext) {}

  load(): SavedFiltersCollection {
    return this.context.workspaceState.get('debrief.savedFilters', {
      version: 1,
      configurations: [],
    });
  }

  save(collection: SavedFiltersCollection): void {
    this.context.workspaceState.update('debrief.savedFilters', collection);
  }
}
```

## Using the Hook Directly

For custom UI, use the `useSavedFilters` hook:

```tsx
import { useSavedFilters, InMemoryStorage } from '@debrief/components';

const storage = new InMemoryStorage();

function CustomSavedFilters() {
  const {
    configurations,
    saveConfiguration,
    deleteConfiguration,
    nameExists,
    overwriteConfiguration,
  } = useSavedFilters(storage);

  return (
    <ul>
      {configurations.map((config) => (
        <li key={config.id}>
          {config.name}
          <button onClick={() => onRestore(config)}>Restore</button>
          <button onClick={() => deleteConfiguration(config.id)}>Delete</button>
        </li>
      ))}
    </ul>
  );
}
```

## Storybook

View interactive stories at:
- Empty state: `FilterBar/Saved Filters/Empty`
- With saved configurations: `FilterBar/Saved Filters/With Saved`
- Save flow demo: `FilterBar/Saved Filters/Save Flow`
