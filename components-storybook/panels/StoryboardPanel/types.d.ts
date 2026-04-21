/**
 * Types for the presentational Storyboard panel (Feature 216).
 *
 * These types cross the extension → webview boundary. The panel itself is
 * headless of VS Code — consumers marshal `SceneRowViewModel` from their
 * own sources (e.g. #215's CRUD module in the VS Code extension, fixture
 * data in Storybook).
 */
export interface SceneRowViewModel {
    /** ULID of the Scene. */
    readonly sceneId: string;
    /** Scene title — defaults to the DTG of `timestampIso` (set upstream by #215). */
    readonly title: string;
    /** ISO-8601 instant the Scene was captured. */
    readonly timestampIso: string;
    /** Pre-formatted DTG label — `DDHHmmZ MMM YY` by #215's `formatDtg`. */
    readonly dtgLabel: string;
    /** Webview-safe URI resolved via `Webview.asWebviewUri`. */
    readonly thumbnailHref: string;
    /**
     * Row state. `pending` is used briefly between a CRUD return and the
     * panel refresh; #216 emits mostly `ok` rows.
     */
    readonly state: {
        readonly kind: 'ok';
    } | {
        readonly kind: 'pending';
    };
}
export interface StoryboardPanelProps {
    /** Ordered by `timestampIso` ascending. Empty when no active Storyboard. */
    readonly scenes: readonly SceneRowViewModel[];
    /** Header label — null signals the "no Storyboards yet" empty state. */
    readonly activeStoryboardName: string | null;
    /** When true, renders a pending row above the existing Scene list. */
    readonly captureInFlight: boolean;
    /** Fires on the Storyboard panel's toolbar "Capture" button. */
    onCaptureClick(): void;
    /** Fires on row click; #216 hosts log it; #217 will replace with flyTo. */
    onSceneRowClick(sceneId: string): void;
}
//# sourceMappingURL=types.d.ts.map