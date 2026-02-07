When you're building multiple VS Code webview panels across a team, component consistency becomes a real problem fast. Different developers reach for different libraries, and the result feels stitched together.

We're standardising on vscrui -- a React component library built specifically for VS Code webviews -- as the single component foundation for all Debrief panels. It replaces Microsoft's deprecated Webview UI Toolkit, works entirely offline (important when your analysts are at sea or on classified networks), and covers the forms, layout, and interactive elements that every panel needs.

This week we're writing the reference documentation so any contributor knows exactly which components to use and how they're organised. No code changes -- just making the implicit explicit.

Full planning post: [LINK]

#FutureDebrief #MaritimeAnalysis #OpenSource
