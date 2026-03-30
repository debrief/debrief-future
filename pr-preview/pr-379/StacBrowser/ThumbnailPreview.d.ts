import { default as React } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { CatalogOverviewItem } from '../filter-engine/types';

export interface ThumbnailPreviewProps {
    /** Currently selected item to preview. */
    readonly item: CatalogOverviewItem | null;
    /** All items in the current filtered set (for prev/next navigation). */
    readonly items: readonly CatalogOverviewItem[];
    /** Called when navigating to a different item. */
    readonly onNavigate?: (itemId: string) => void;
    /** Called when the user double-clicks to open the item. */
    readonly onOpen?: (itemPath: string) => void;
}
export declare const ThumbnailPreview: React.FC<ThumbnailPreviewProps>;
//# sourceMappingURL=ThumbnailPreview.d.ts.map