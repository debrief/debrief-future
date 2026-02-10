Plots in Future Debrief are stored as STAC Items in a filesystem catalog. This week we shipped a component that makes that structure visible.

StacFileTree is a React tree view built for the shared component library. It loads STAC catalog nodes lazily — children appear when you expand a folder, then stay cached. Double-click an Item to open the plot. When you restore a snapshot, new or changed files get highlighted, and ancestor folders show "contains changes" markers.

We built it without a third-party tree library. Existing tools like react-arborist are capable, but they bring their own styling systems. Our map and timeline components already use BEM naming and CSS custom properties matching the design tokens. A custom tree keeps everything consistent.

The component uses a FilesystemAdapter pattern, so it works with both real filesystems and memfs in tests. That meant we could write 40 unit tests without touching disk. The bundle is 7.9 kB.

Next step is wiring it into the VS Code extension sidebar, where analysts can browse the catalog and jump between plots.

[Read more →](https://debrief.github.io/debrief-future/shipped/2026/02/10/shipped-stac-file-tree.html)

#FutureDebrief #MaritimeAnalysis #OpenSource
