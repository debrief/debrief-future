# LinkedIn Planning Post: Shared React Component Library

**Character count target**: 150-200 words

---

What if stakeholders could review your UI components without installing anything?

We're building a shared React component library for Future Debrief — reusable map, timeline, and list components for maritime data visualization. The interesting part isn't the components themselves (Leaflet maps, Canvas timelines, virtualized lists). It's how we're approaching development.

**Storybook becomes our review platform.** Every component, every edge case, every theme variant — deployed to a public URL where anyone can interact with them. DSTL scientists reviewing UI decisions don't need to configure Electron or VS Code. They just open a browser.

This also means accessibility testing during development, living documentation for contributors, and community feedback before code ships.

The components will power both our Electron desktop app and VS Code extension, ensuring consistent UX across contexts.

We're starting implementation next week. Curious what component APIs should look like for your maritime analysis workflows? What timeline features matter most?

Read the full planning post and share your thoughts: [LINK]

#FutureDebrief #OpenSource #Storybook
