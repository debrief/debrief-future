/**
 * Outline Provider - Document symbol provider for selection outline
 *
 * Shows selected tracks and locations in VS Code's Outline panel.
 */

import * as vscode from 'vscode';
import type { Track, ReferenceLocation } from '../types/plot';

export class OutlineProvider implements vscode.DocumentSymbolProvider {
  private tracks: Track[] = [];
  private locations: ReferenceLocation[] = [];

  /**
   * Update data for outline
   */
  setData(tracks: Track[], locations: ReferenceLocation[]): void {
    this.tracks = tracks;
    this.locations = locations;
  }

  /**
   * Provide document symbols
   */
  provideDocumentSymbols(
    _document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DocumentSymbol[]> {
    const symbols: vscode.DocumentSymbol[] = [];

    // Add selected tracks
    const selectedTracks = this.tracks.filter((t) => t.selected);
    for (const track of selectedTracks) {
      const symbol = new vscode.DocumentSymbol(
        track.name,
        track.platformType ?? '',
        vscode.SymbolKind.Function,
        new vscode.Range(0, 0, 0, 0),
        new vscode.Range(0, 0, 0, 0)
      );
      symbols.push(symbol);
    }

    // Add selected locations
    const selectedLocations = this.locations.filter((l) => l.selected);
    for (const location of selectedLocations) {
      const symbol = new vscode.DocumentSymbol(
        location.name,
        location.locationType ?? '',
        vscode.SymbolKind.Constant,
        new vscode.Range(0, 0, 0, 0),
        new vscode.Range(0, 0, 0, 0)
      );
      symbols.push(symbol);
    }

    return symbols;
  }
}
