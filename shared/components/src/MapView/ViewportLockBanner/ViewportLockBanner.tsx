/**
 * ViewportLockBanner — on-map indicator that the viewport is locked
 * (spec 260 / FR-005). Renders nothing when `locked === false`.
 *
 * Click the banner to unlock — this is FR-005's "the indicator MUST itself
 * be a control the user can activate to turn the lock off". Structural
 * pattern mirrors `DrawingGuidanceOverlay` so a future reader recognises
 * both as "absolute overlay sibling of the Leaflet map div".
 */
import './ViewportLockBanner.css';

export interface ViewportLockBannerProps {
  /** When `false` the component returns null — no DOM. */
  readonly locked: boolean;
  /** Click handler for the banner's unlock affordance. */
  readonly onUnlock: () => void;
}

const BANNER_LABEL = '🔒 Viewport locked — click to unlock';

export function ViewportLockBanner({ locked, onUnlock }: ViewportLockBannerProps) {
  if (!locked) return null;

  return (
    <div
      className="debrief-viewport-lock-banner"
      data-testid="viewport-lock-banner"
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        className="debrief-viewport-lock-banner__button"
        data-testid="viewport-lock-banner-unlock"
        aria-label="Unlock viewport"
        onClick={onUnlock}
      >
        {BANNER_LABEL}
      </button>
    </div>
  );
}
