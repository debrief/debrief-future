import{j as o}from"./jsx-runtime-DF2Pcvd1.js";import{A as a}from"./App-DWwl6cKZ.js";/* empty css                */import{T as p}from"./ThemeProvider-mvcGjblv.js";import"./index-B2-qRKKC.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./time-CBZeHVFz.js";import"./labels-D4DpyF2F.js";import"./types-CH13Z4Jd.js";import"./ParameterEditor-BTx1TVlf.js";import"./TimeController-BZiLl7Fy.js";import"./textfield-Dm39NdvL.js";import"./createDrawnFeature-BV1XLVpI.js";import"./index-B1Wj4M0z.js";import"./StacFileTree-JcRk-kDX.js";import"./MapView-BkSoSV8o.js";import"./TileLayer-Cckmdc0V.js";import"./index-kS-9iBlu.js";import"./Tooltip-CeZQf7Zv.js";import"./leaflet-geoman-Cc97th-d.js";import"./ActivityPanel-5y_ty_eP.js";import"./ToolsPanel-DaStacFF.js";import"./ContextMenu-qheFrteX.js";import"./LayersToolbar-IJErpKcY.js";import"./FilterDropdown-D8R_GT18.js";import"./FeatureList-B6g2ZLqW.js";import"./FormatMenu-DAq2KjSz.js";import"./CatalogOverview-B5IzUrwD.js";import"./client-CMlFXbYy.js";const W={title:"Apps/WebShell/StylingTools",component:a,decorators:[n=>o.jsx(p,{children:o.jsx(n,{})})],parameters:{layout:"fullscreen",viewport:{defaultViewport:"responsive"},docs:{description:{component:`
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
4. Run any styling tool — result message appears`,...(l=(s=t.parameters)==null?void 0:s.docs)==null?void 0:l.description}}};const q=["StylingToolsDemo"];export{t as StylingToolsDemo,q as __namedExportsOrder,W as default};
