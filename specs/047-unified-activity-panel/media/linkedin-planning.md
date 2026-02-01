Three VS Code sidebar panels, each with its own title bar and message channel, when one panel with collapsible sections would do. That is the kind of overhead that quietly steals screen real estate from the data analysts actually care about.

This week we are planning Feature 047 for Future Debrief: consolidating the Time Controller, Tools, and Layers panels into a single unified activity panel. The interesting constraint is that the sub-components need to work outside VS Code too -- they are shared React components that will eventually compose into Electron and Jupyter layouts as well.

Using vscrui's Pane component for the accordion sections gives us native VS Code styling without building custom collapse logic. Each section gets its own React ErrorBoundary, so a failure in one does not take down the others. The result is 45% less panel chrome and a single message-passing channel instead of three.

Full write-up with architecture decisions and open questions: [link]

#FutureDebrief #MaritimeAnalysis #VSCode
