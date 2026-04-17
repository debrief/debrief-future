/**
 * PropertiesForm component-side contracts: FieldSpec, FieldDerivationState,
 * PropertiesFormField, PropertiesFormProps.
 *
 * See specs/193-properties-panel/contracts/properties-form-component.ts for
 * the canonical shape.
 */
export type FieldKey = string;
export type FieldValue = unknown;
export type FieldDerivationState = 'auto-derived' | 'override' | 'user';
export type FieldSpec = {
    kind: 'string';
    maxLength?: number;
    pattern?: string;
} | {
    kind: 'number';
    min?: number;
    max?: number;
    integer?: boolean;
} | {
    kind: 'boolean';
} | {
    kind: 'enum';
    allowedValues: string[];
} | {
    kind: 'duration';
} | {
    kind: 'datetime';
} | {
    kind: 'bbox';
} | {
    kind: 'string-array';
    itemEnum?: string[];
    maxItems?: number;
} | {
    kind: 'platform-array';
} | {
    kind: 'unsupported';
    reason: string;
};
export interface PropertiesFormField {
    key: FieldKey;
    label: string;
    value: FieldValue;
    spec: FieldSpec;
    derivation: FieldDerivationState;
    required: boolean;
    error: string | null;
}
export interface PropertiesFormProps {
    fields: PropertiesFormField[];
    onCommitField: (key: FieldKey, value: FieldValue) => void;
    loading: boolean;
    readOnly: boolean;
    writeError: string | null;
}
//# sourceMappingURL=types.d.ts.map