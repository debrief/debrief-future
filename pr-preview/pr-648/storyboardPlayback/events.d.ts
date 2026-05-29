/**
 * Host-agnostic event types used by the hoisted `StoryboardPlaybackService`.
 *
 * The shapes here are structurally compatible with `vscode.Event` and
 * `vscode.Disposable` so the VS Code extension can pass `vscode.EventEmitter`
 * instances through unchanged. Browser hosts (e.g. the air-gapped briefing
 * renderer SPA — spec #264) use the `HostEventEmitter` implementation below.
 *
 * Lifted out of `apps/vscode/src/services/storyboardPlayback.ts` during the
 * T-HOIST step of spec #264 so both consumers (the authoring environment
 * and the briefing renderer) share one engine.
 */
export interface HostDisposable {
    dispose(): void;
}
export type HostEvent<T> = (listener: (e: T) => void, thisArgs?: unknown, disposables?: HostDisposable[]) => HostDisposable;
/**
 * Minimal event emitter — matches the public API of `vscode.EventEmitter`
 * exactly so existing VS Code-side code that wires `vscode.EventEmitter`
 * sources into the service ports keeps working unchanged.
 */
export declare class HostEventEmitter<T> {
    private listeners;
    private disposed;
    readonly event: HostEvent<T>;
    fire(data: T): void;
    dispose(): void;
}
//# sourceMappingURL=events.d.ts.map