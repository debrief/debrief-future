/**
 * Component prop interfaces for the flip-card interaction.
 *
 * These define the contracts between parent and child components
 * in the LogPanel component tree.
 */

import type { TimelineEntry, ParameterValue } from './types-extended';
import type { ParameterSchemaEntry } from './webview-messages';

// ---------------------------------------------------------------------------
// CardFlip — container managing 3D flip animation
// ---------------------------------------------------------------------------

export interface CardFlipProps {
  /** The timeline entry this card represents. */
  readonly entry: TimelineEntry;

  /** Whether this card is currently showing its edit face. */
  readonly isEditing: boolean;

  /** Callback when the pencil icon is clicked to flip to edit mode. */
  readonly onFlipToEdit: (activityId: string) => void;

  /** Callback when Done is clicked or edit is auto-closed. */
  readonly onFlipToRead: (activityId: string) => void;

  /** Whether this card is currently selected in the timeline. */
  readonly isSelected: boolean;

  /** Current presentation mode for the front face. */
  readonly presentationMode: 'compact' | 'normal' | 'detailed';

  /** Feature name lookup for display. */
  readonly featureNames: Readonly<Record<string, string>>;

  /** Children rendered inside the card faces. */
  readonly frontFace: React.ReactNode;
  readonly backFace: React.ReactNode;
}

// ---------------------------------------------------------------------------
// EditFace — the editable back face of the card
// ---------------------------------------------------------------------------

export interface EditFaceProps {
  /** The entry being edited. */
  readonly entry: TimelineEntry;

  /** Tool parameter schema (null while loading). */
  readonly schema: ReadonlyArray<ParameterSchemaEntry> | null;

  /** Whether the schema is currently loading. */
  readonly schemaLoading: boolean;

  /** Whether the schema failed to load. */
  readonly schemaError: string | null;

  /** Current working parameter values. */
  readonly editValues: Readonly<Record<string, unknown>>;

  /** Current replay status for this card. */
  readonly replayStatus: 'idle' | 'pending' | 'in-progress' | 'error';

  /** Replay error message, if any. */
  readonly replayError: string | null;

  /** Feature name lookup for display. */
  readonly featureNames: Readonly<Record<string, string>>;

  /** Callback when a parameter value changes. */
  readonly onParameterChange: (parameterName: string, newValue: unknown) => void;

  /** Callback when the disable toggle is changed. */
  readonly onDisableToggle: (disabled: boolean) => void;

  /** Callback when the Delete button is clicked. */
  readonly onDeleteClick: () => void;

  /** Callback when rationale text changes. */
  readonly onRationaleChange: (text: string) => void;

  /** Callback when Done button is clicked. */
  readonly onDone: () => void;

  /** Callback to retry schema loading. */
  readonly onRetrySchema: () => void;

  /** Ref for the rationale field (for auto-focus from action bar). */
  readonly rationaleRef?: React.RefObject<HTMLTextAreaElement>;
}

// ---------------------------------------------------------------------------
// SliderControl — bounded numeric parameter
// ---------------------------------------------------------------------------

export interface SliderControlProps {
  /** Parameter name. */
  readonly name: string;

  /** Current value. */
  readonly value: number;

  /** Lower bound from schema. */
  readonly minimum: number;

  /** Upper bound from schema. */
  readonly maximum: number;

  /** Step increment from schema (null = continuous). */
  readonly step: number | null;

  /** Whether the parameter is tunable (false = read-only). */
  readonly tunable: boolean;

  /** Callback on value change. */
  readonly onChange: (value: number) => void;
}

// ---------------------------------------------------------------------------
// ColorPickerControl — NamedColor parameter
// ---------------------------------------------------------------------------

export interface ColorPickerControlProps {
  /** Parameter name. */
  readonly name: string;

  /** Current colour name. */
  readonly value: string;

  /** Available colour names. */
  readonly choices: ReadonlyArray<string>;

  /** Whether the parameter is tunable. */
  readonly tunable: boolean;

  /** Callback on colour selection. */
  readonly onChange: (colorName: string) => void;
}

// ---------------------------------------------------------------------------
// JsonEditorControl — fallback for complex parameters
// ---------------------------------------------------------------------------

export interface JsonEditorControlProps {
  /** Parameter name. */
  readonly name: string;

  /** Current value (serialised to JSON for display). */
  readonly value: unknown;

  /** Whether the parameter is tunable. */
  readonly tunable: boolean;

  /** Callback on value change (parsed from JSON). */
  readonly onChange: (value: unknown) => void;
}

// ---------------------------------------------------------------------------
// DisableToggle — entry disable switch
// ---------------------------------------------------------------------------

export interface DisableToggleProps {
  /** Whether the entry is currently disabled. */
  readonly disabled: boolean;

  /** Whether this entry was auto-disabled due to a dependency. */
  readonly autoDependency: boolean;

  /** ActivityId of the cause entry (if auto-disabled). */
  readonly causeActivityId: string | null;

  /** Callback on toggle change. */
  readonly onChange: (disabled: boolean) => void;
}

// ---------------------------------------------------------------------------
// DeleteConfirmation — confirmation prompt
// ---------------------------------------------------------------------------

export interface DeleteConfirmationProps {
  /** Whether the confirmation prompt is visible. */
  readonly visible: boolean;

  /** Tool name for the entry being deleted. */
  readonly toolName: string;

  /** Callback on confirm. */
  readonly onConfirm: () => void;

  /** Callback on cancel. */
  readonly onCancel: () => void;
}

// ---------------------------------------------------------------------------
// RationaleField — text area for analyst notes
// ---------------------------------------------------------------------------

export interface RationaleFieldProps {
  /** Current rationale text. */
  readonly value: string;

  /** Callback on text change. */
  readonly onChange: (text: string) => void;

  /** Ref for auto-focus from action bar Rationale button. */
  readonly inputRef?: React.RefObject<HTMLTextAreaElement>;
}
