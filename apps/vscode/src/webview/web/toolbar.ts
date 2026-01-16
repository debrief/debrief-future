/**
 * Toolbar - Floating toolbar controls for the map
 */

export class Toolbar {
  private container: HTMLElement | null = null;
  private onZoomIn: () => void = () => {};
  private onZoomOut: () => void = () => {};
  private onFitBounds: () => void = () => {};
  private onExport: () => void = () => {};

  /**
   * Initialize toolbar with callbacks
   */
  initialize(callbacks: {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onFitBounds: () => void;
    onExport: () => void;
  }): void {
    this.onZoomIn = callbacks.onZoomIn;
    this.onZoomOut = callbacks.onZoomOut;
    this.onFitBounds = callbacks.onFitBounds;
    this.onExport = callbacks.onExport;

    this.setupEventListeners();
  }

  /**
   * Set up button event listeners
   */
  private setupEventListeners(): void {
    document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
      this.onZoomIn();
    });

    document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
      this.onZoomOut();
    });

    document.getElementById('btn-fit-bounds')?.addEventListener('click', () => {
      this.onFitBounds();
    });

    document.getElementById('btn-export')?.addEventListener('click', () => {
      this.onExport();
    });
  }

  /**
   * Show the toolbar
   */
  show(): void {
    this.container = document.getElementById('toolbar');
    if (this.container) {
      this.container.classList.remove('hidden');
    }
  }

  /**
   * Hide the toolbar
   */
  hide(): void {
    if (this.container) {
      this.container.classList.add('hidden');
    }
  }
}
