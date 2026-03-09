import{j as o}from"./jsx-runtime-DF2Pcvd1.js";import{A as p}from"./App-pwogEFWo.js";/* empty css                */import{T as a}from"./ThemeProvider-mvcGjblv.js";import"./index-B2-qRKKC.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./time-CWSwsQ95.js";import"./labels-B1NxAApI.js";import"./types-DanFR5Hs.js";import"./ParameterEditor-Dr5F3Mwy.js";import"./paramTypeResolver-C0MCmcI9.js";import"./TimeController-BPlmdAut.js";import"./textfield-Dm39NdvL.js";import"./drawingPalette-D_RXapFN.js";import"./index-B1Wj4M0z.js";import"./StacFileTree-JcRk-kDX.js";import"./MapView-DLRMe2dR.js";import"./TileLayer-Dt8OtU2o.js";import"./index-kS-9iBlu.js";import"./bounds-C-ydt5-M.js";import"./leaflet-geoman-Cc97th-d.js";import"./ActivityPanel-CpM_R4mZ.js";import"./ToolsPanel-7c4Q4UQf.js";import"./ContextMenu-qheFrteX.js";import"./LayersToolbar-B7kWRDbx.js";import"./FilterDropdown-D8R_GT18.js";import"./FeatureList-CsXHihpt.js";import"./index-CHJUuggG.js";import"./FormatMenu-CHE7Gnnt.js";import"./CascadingMenu-BgTnOB60.js";import"./GeometryDialog-HA1-30SM.js";import"./StacBrowser-B45dzDJe.js";import"./client-CMlFXbYy.js";import"./timeline-helpers-BwD8KhFf.js";import"./FilterBar-CVKAkL-2.js";import"./CatalogOverview-KGuUGKDy.js";import"./TimelineView-Bd7gaRBC.js";import"./ExerciseListView-CIWfJF7t.js";const Q={title:"Apps/WebShell/StylingTools",component:p,decorators:[n=>o.jsx(a,{children:o.jsx(n,{})})],parameters:{layout:"fullscreen",viewport:{defaultViewport:"responsive"},docs:{description:{component:`
# Styling Tools Integration

Verifies that the 4 TypeScript styling tools are wired into the web-shell
via \`toolService\` → \`calcService\`.

## Tools

| Tool | Description |
|------|-------------|
| Set Track Color | Sets display color on track features |
| Apply Symbol Style | Applies symbol style to position markers |
| Label Interval | Sets time interval for label display |
| Symbol Interval | Sets time interval for position symbols |

## How to Test

1. Double-click **Exercise Alpha** to open the plot
2. Click a track on the map (or in the feature list) to select it
3. The Tools panel should show **6 tools** (2 built-in + 4 styling)
4. All 4 styling tools should be **active** when a track is selected
5. Click a styling tool to run it — a result message should appear
        `}}},tags:["autodocs"]},t={name:"Styling Tools Demo",parameters:{docs:{description:{story:`
Interactive demo of styling tool integration. Open a plot, select tracks,
and run styling tools to verify they execute correctly and display results.
        `}}}};var e,r,i,s,l;t.parameters={...t.parameters,docs:{...(e=t.parameters)==null?void 0:e.docs,source:{originalSource:`{
  name: 'Styling Tools Demo',
  parameters: {
    docs: {
      description: {
        story: \`
Interactive demo of styling tool integration. Open a plot, select tracks,
and run styling tools to verify they execute correctly and display results.
        \`
      }
    }
  }
}`,...(i=(r=t.parameters)==null?void 0:r.docs)==null?void 0:i.source},description:{story:`Full integration demo for styling tools.

Steps to verify:
1. Double-click a plot in the catalog
2. Select a track on the map
3. Observe 6 tools in the Tools panel (4 styling + 2 built-in)
4. Run any styling tool — result message appears`,...(l=(s=t.parameters)==null?void 0:s.docs)==null?void 0:l.description}}};const U=["StylingToolsDemo"];export{t as StylingToolsDemo,U as __namedExportsOrder,Q as default};
