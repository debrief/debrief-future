Detection likelihood zones from pure Python math — no GIS libraries needed.

The buffer-zone-generator takes a vessel track and produces three concentric polygons at 3nm, 6nm, and 12nm using the Vincenty destination formula and convex hull construction. A Protocol-based sensor model keeps detection ranges cleanly separated from geometry logic, so swapping in realistic sensor physics later won't touch the tool's internals.

48 tests, 100% coverage, handles antimeridian crossings, single-point tracks, and custom distance overrides. Third step in a five-tool reactive cascade where moving a track automatically regenerates every downstream analysis.

#FutureDebrief #MaritimeAnalysis #OpenSource
