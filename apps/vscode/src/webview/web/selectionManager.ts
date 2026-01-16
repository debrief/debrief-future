/**
 * Selection Manager - Handles track and location selection in the map webview
 */

import type { TrackRenderer } from './trackRenderer';
import type { LocationRenderer } from './locationRenderer';
import type { SelectionContextType } from '../messages';

export class SelectionManager {
  private trackRenderer: TrackRenderer;
  private locationRenderer: LocationRenderer;
  private onSelectionChangedCallback: (
    trackIds: string[],
    locationIds: string[],
    contextType: SelectionContextType
  ) => void;

  private selectedTrackIds: Set<string> = new Set();
  private selectedLocationIds: Set<string> = new Set();

  constructor(
    trackRenderer: TrackRenderer,
    locationRenderer: LocationRenderer,
    onSelectionChanged: (
      trackIds: string[],
      locationIds: string[],
      contextType: SelectionContextType
    ) => void
  ) {
    this.trackRenderer = trackRenderer;
    this.locationRenderer = locationRenderer;
    this.onSelectionChangedCallback = onSelectionChanged;
  }

  /**
   * Handle click on a track
   */
  selectTrack(trackId: string, event: MouseEvent): void {
    if (event.shiftKey) {
      // Add to selection
      this.selectedTrackIds.add(trackId);
    } else if (event.ctrlKey || event.metaKey) {
      // Toggle selection
      if (this.selectedTrackIds.has(trackId)) {
        this.selectedTrackIds.delete(trackId);
      } else {
        this.selectedTrackIds.add(trackId);
      }
    } else {
      // Single select
      this.selectedTrackIds.clear();
      this.selectedLocationIds.clear();
      this.selectedTrackIds.add(trackId);
    }

    this.updateVisualSelection();
    this.notifySelectionChanged();
  }

  /**
   * Handle click on a location
   */
  selectLocation(locationId: string, event: MouseEvent): void {
    if (event.shiftKey) {
      // Add to selection
      this.selectedLocationIds.add(locationId);
    } else if (event.ctrlKey || event.metaKey) {
      // Toggle selection
      if (this.selectedLocationIds.has(locationId)) {
        this.selectedLocationIds.delete(locationId);
      } else {
        this.selectedLocationIds.add(locationId);
      }
    } else {
      // Single select
      this.selectedTrackIds.clear();
      this.selectedLocationIds.clear();
      this.selectedLocationIds.add(locationId);
    }

    this.updateVisualSelection();
    this.notifySelectionChanged();
  }

  /**
   * Set selection programmatically
   */
  setSelection(trackIds: string[], locationIds: string[]): void {
    this.selectedTrackIds = new Set(trackIds);
    this.selectedLocationIds = new Set(locationIds);
    this.updateVisualSelection();
    // Don't notify - this was triggered externally
  }

  /**
   * Clear all selection
   */
  clearSelection(): void {
    this.selectedTrackIds.clear();
    this.selectedLocationIds.clear();
    this.updateVisualSelection();
    this.notifySelectionChanged();
  }

  /**
   * Get selected track IDs
   */
  getSelectedTrackIds(): string[] {
    return Array.from(this.selectedTrackIds);
  }

  /**
   * Get selected location IDs
   */
  getSelectedLocationIds(): string[] {
    return Array.from(this.selectedLocationIds);
  }

  /**
   * Check if a track is selected
   */
  isTrackSelected(trackId: string): boolean {
    return this.selectedTrackIds.has(trackId);
  }

  /**
   * Check if a location is selected
   */
  isLocationSelected(locationId: string): boolean {
    return this.selectedLocationIds.has(locationId);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private updateVisualSelection(): void {
    this.trackRenderer.setSelectedTracks(this.selectedTrackIds);
    this.locationRenderer.setSelectedLocations(this.selectedLocationIds);
  }

  private notifySelectionChanged(): void {
    const trackIds = Array.from(this.selectedTrackIds);
    const locationIds = Array.from(this.selectedLocationIds);
    const contextType = this.computeContextType(trackIds, locationIds);

    this.onSelectionChangedCallback(trackIds, locationIds, contextType);
  }

  private computeContextType(
    trackIds: string[],
    locationIds: string[]
  ): SelectionContextType {
    const hasTrack = trackIds.length > 0;
    const hasLocation = locationIds.length > 0;

    if (!hasTrack && !hasLocation) {
      return 'none';
    }

    if (hasTrack && hasLocation) {
      return 'mixed';
    }

    if (hasLocation) {
      return 'location';
    }

    return trackIds.length === 1 ? 'single-track' : 'multi-track';
  }
}
