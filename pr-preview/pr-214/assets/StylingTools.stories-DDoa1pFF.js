import{j as o}from"./jsx-runtime-CmtfZKef.js";import{A as a}from"./App-DP57Wrgm.js";/* empty css                */import{T as p}from"./ThemeProvider-F2_Ncok2.js";import"./index-Dm8qopDP.js";import"./_commonjsHelpers-BosuxZz1.js";import"./time-BIZLE8XT.js";import"./labels-TgJWcFVo.js";import"./TimeController-Ci9Vu_6D.js";import"./textfield-CEXwfpd0.js";import"./CatalogOverview-C4LZOHT7.js";import"./Tooltip-DgOyNYjX.js";import"./index-U031Rcde.js";import"./ActivityPanel-CeANGjTm.js";import"./ToolsPanel-umbk_iEN.js";import"./LayersToolbar-BHrBb-rj.js";import"./FilterDropdown-BNB4AvTl.js";import"./FeatureList-DRSQl_KI.js";import"./MapView-BzRbMn-Y.js";const O={title:"Apps/WebShell/StylingTools",component:a,decorators:[n=>o.jsx(p,{children:o.jsx(n,{})})],parameters:{layout:"fullscreen",viewport:{defaultViewport:"responsive"},docs:{description:{component:`
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
        `}}}};var e,s,r,l,i;t.parameters={...t.parameters,docs:{...(e=t.parameters)==null?void 0:e.docs,source:{originalSource:`{
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
}`,...(r=(s=t.parameters)==null?void 0:s.docs)==null?void 0:r.source},description:{story:`Full integration demo for styling tools.

Steps to verify:
1. Double-click a plot in the catalog
2. Select a track on the map
3. Observe 6 tools in the Tools panel (4 styling + 2 built-in)
4. Run any styling tool — result message appears`,...(i=(l=t.parameters)==null?void 0:l.docs)==null?void 0:i.description}}};const C=["StylingToolsDemo"];export{t as StylingToolsDemo,C as __namedExportsOrder,O as default};
