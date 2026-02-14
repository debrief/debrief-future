import{j as o}from"./jsx-runtime-DF2Pcvd1.js";import{A as a}from"./App-slaI5NTo.js";/* empty css                */import{T as p}from"./ThemeProvider-mvcGjblv.js";import"./index-B2-qRKKC.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./time-DWPBvZ9w.js";import"./labels-D4DpyF2F.js";import"./types-CH13Z4Jd.js";import"./ParameterEditor-BTx1TVlf.js";import"./TimeController-BZiLl7Fy.js";import"./textfield-Dm39NdvL.js";import"./createDrawnFeature-BV1XLVpI.js";import"./index-CiLCJEmK.js";import"./CatalogOverview-B5IzUrwD.js";import"./TileLayer-Cckmdc0V.js";import"./index-kS-9iBlu.js";import"./Tooltip-CeZQf7Zv.js";import"./StacFileTree-JcRk-kDX.js";import"./ActivityPanel-DIdctTfo.js";import"./ToolsPanel-DaStacFF.js";import"./ContextMenu-qheFrteX.js";import"./LayersToolbar-CxJUs9AP.js";import"./FilterDropdown-BgyHQuSK.js";import"./FeatureList-DYEY4ntv.js";import"./MapView-DlLvd_0s.js";import"./leaflet-geoman-Cc97th-d.js";import"./ChartRenderer-WFdOR94s.js";const P={title:"Apps/WebShell/StylingTools",component:a,decorators:[n=>o.jsx(p,{children:o.jsx(n,{})})],parameters:{layout:"fullscreen",viewport:{defaultViewport:"responsive"},docs:{description:{component:`
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
        `}}}};var e,r,s,i,l;t.parameters={...t.parameters,docs:{...(e=t.parameters)==null?void 0:e.docs,source:{originalSource:`{
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
}`,...(s=(r=t.parameters)==null?void 0:r.docs)==null?void 0:s.source},description:{story:`Full integration demo for styling tools.

Steps to verify:
1. Double-click a plot in the catalog
2. Select a track on the map
3. Observe 6 tools in the Tools panel (4 styling + 2 built-in)
4. Run any styling tool — result message appears`,...(l=(i=t.parameters)==null?void 0:i.docs)==null?void 0:l.description}}};const W=["StylingToolsDemo"];export{t as StylingToolsDemo,W as __namedExportsOrder,P as default};
