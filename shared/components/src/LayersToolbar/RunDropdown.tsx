import { useMemo } from 'react';
import type { RunDropdownProps } from './types';
import { DEFAULT_LABELS } from './types';
import './RunDropdown.css';

interface MenuCategory {
  id: string;
  label: string;
  items: MenuItem[];
}

interface MenuItem {
  id: string;
  label: string;
  disabled?: boolean;
}

/**
 * RunDropdown shows a nested context menu with static categories
 * (File, Edit, View) and a dynamic Analysis submenu from ToolMatch results.
 */
export function RunDropdown({
  toolMatches,
  selectedFeatureIds,
  onRunTool,
  onRunAction,
  labels: labelOverrides,
}: RunDropdownProps) {
  const labels = { ...DEFAULT_LABELS, ...labelOverrides };

  const categories = useMemo<MenuCategory[]>(() => {
    const fileCategory: MenuCategory = {
      id: 'file',
      label: labels.fileCategory,
      items: [
        { id: 'export-selection', label: labels.exportSelection },
        { id: 'export-geojson', label: labels.exportGeoJSON },
        { id: 'export-csv', label: labels.exportCSV },
      ],
    };

    const editCategory: MenuCategory = {
      id: 'edit',
      label: labels.editCategory,
      items: [
        { id: 'duplicate', label: labels.duplicate },
        { id: 'rename', label: labels.rename },
        { id: 'lock-unlock', label: labels.lockUnlock },
      ],
    };

    const viewCategory: MenuCategory = {
      id: 'view',
      label: labels.viewCategory,
      items: [
        { id: 'zoom-to-selection', label: labels.zoomToSelection },
        { id: 'pan-to-feature', label: labels.panToFeature },
        { id: 'center-map', label: labels.centerMap },
      ],
    };

    // Build Analysis submenu from active tool matches, grouped by category
    const activeTools = toolMatches.filter((m) => m.isActive);
    const analysisItems: MenuItem[] = [];

    if (activeTools.length === 0) {
      analysisItems.push({
        id: 'no-tools',
        label: labels.noToolsAvailable,
        disabled: true,
      });
    } else {
      // Group by tool category
      const grouped = new Map<string, typeof activeTools>();
      for (const match of activeTools) {
        const cat = (match.tool as Record<string, unknown>)['category'] as string ?? 'Other';
        const existing = grouped.get(cat) ?? [];
        grouped.set(cat, [...existing, match]);
      }

      for (const [groupName, matches] of grouped) {
        // Add group header as disabled separator-like item
        if (analysisItems.length > 0) {
          analysisItems.push({ id: `sep-${groupName}`, label: '', disabled: true });
        }
        analysisItems.push({ id: `header-${groupName}`, label: groupName, disabled: true });
        for (const m of matches.sort((a, b) => a.tool.name.localeCompare(b.tool.name))) {
          analysisItems.push({ id: m.tool.id, label: m.tool.name });
        }
      }
    }

    const analysisCategory: MenuCategory = {
      id: 'analysis',
      label: labels.analysisCategory,
      items: analysisItems,
    };

    return [fileCategory, editCategory, viewCategory, analysisCategory];
  }, [toolMatches, labels]);

  const handleClick = (categoryId: string, itemId: string) => {
    if (categoryId === 'analysis' && !itemId.startsWith('header-') && !itemId.startsWith('sep-') && itemId !== 'no-tools') {
      onRunTool(itemId, selectedFeatureIds);
    } else if (categoryId !== 'analysis') {
      onRunAction?.(itemId, selectedFeatureIds);
    }
  };

  return (
    <div className="debrief-run-dropdown">
      {categories.map((category) => (
        <div key={category.id} className="debrief-run-dropdown__category">
          <div className="debrief-run-dropdown__category-trigger">
            {category.label}
            <span className="debrief-run-dropdown__arrow">›</span>
          </div>
          <div className="debrief-run-dropdown__submenu">
            {category.items.map((item) => {
              if (item.label === '') return (
                <div key={item.id} className="debrief-run-dropdown__separator" />
              );
              if (item.disabled && item.id.startsWith('header-')) return (
                <div key={item.id} className="debrief-run-dropdown__group-header">
                  {item.label}
                </div>
              );
              return (
                <button
                  key={item.id}
                  className={`debrief-run-dropdown__item${item.disabled ? ' debrief-run-dropdown__item--disabled' : ''}`}
                  disabled={item.disabled}
                  onClick={() => handleClick(category.id, item.id)}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
