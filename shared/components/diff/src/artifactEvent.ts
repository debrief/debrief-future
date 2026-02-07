/**
 * Artifact notification event contract.
 *
 * Defines the event shape emitted when a tool produces an artifact.
 * Extension integration (VS Code notification, panel display) is deferred
 * to a follow-on feature.
 */

export interface ArtifactNotificationEvent {
  /** Artifact label from annotations */
  label: string;
  /** MIME type of the artifact */
  mimeType: string;
  /** Relative file path (from debrief:href) */
  href: string;
  /** Result type path */
  resultType: string;
  /** Plot ID containing the artifact */
  plotId: string;
  /** Asset key in the STAC Item */
  assetKey: string;
}

export interface ArtifactNotificationHandler {
  onArtifactCreated(event: ArtifactNotificationEvent): void;
}
