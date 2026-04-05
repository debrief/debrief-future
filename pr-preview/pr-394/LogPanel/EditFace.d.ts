import { default as React } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { TimelineEntry, ParameterSchemaEntry, CardReplayStatus } from './types';

export interface EditFaceProps {
    readonly entry: TimelineEntry;
    readonly schema: ReadonlyArray<ParameterSchemaEntry> | null;
    readonly schemaLoading: boolean;
    readonly schemaError: string | null;
    readonly replayStatus: CardReplayStatus;
    readonly onParameterChange: (parameterName: string, newValue: unknown) => void;
    readonly onDisableToggle: (disabled: boolean) => void;
    readonly onDeleteClick: () => void;
    readonly onRationaleChange: (text: string) => void;
    readonly onDone: () => void;
    readonly onRetrySchema: () => void;
    readonly rationaleRef?: React.Ref<HTMLTextAreaElement>;
}
export declare function EditFace({ entry, schema, schemaLoading, schemaError, replayStatus, onParameterChange, onDisableToggle, onDeleteClick, onRationaleChange, onDone, onRetrySchema, rationaleRef, }: EditFaceProps): React.ReactElement;
//# sourceMappingURL=EditFace.d.ts.map