import{j as o}from"./jsx-runtime-DF2Pcvd1.js";import"./interval-CUv8kruJ.js";import{a7 as n}from"./App-DhRw97Yy.js";/* empty css                */import{T as a}from"./ThemeProvider-DF0jq0Ad.js";import"./index-B2-qRKKC.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./types-CuJnRqfe.js";import"./FilterBar-CUTO5rAZ.js";import"./index-kS-9iBlu.js";import"./CascadingMenu-BgTnOB60.js";import"./applyClickToSelection-BH9K4Nvj.js";import"./time-CSps8V6f.js";import"./labels-Bx3GzQt_.js";import"./readOnlyBanner-CjV2_gL6.js";import"./ParameterEditor-j09_We3v.js";import"./ParameterEditor-DMejAiLo.js";import"./iframe-BKCAORUW.js";import"./FeatureList-BxnH_LPr.js";import"./index-CHJUuggG.js";import"./useStoryboardEditReducer-CYOhcMTq.js";import"./StoryboardPanel-B98Zl81F.js";import"./textfield-Dm39NdvL.js";import"./LogPanel-bA_dtMDY.js";import"./paramTypeResolver-Br4vj1cK.js";import"./TimeController-BQb5Lh1r.js";import"./drawingPalette-B8cqKU8M.js";import"./index-B1Wj4M0z.js";import"./StacFileTree-9qY9uyTU.js";import"./MapView-HvEuWmo4.js";import"./TileLayer-Cckmdc0V.js";import"./bounds-BbBIf5Id.js";import"./useTheme-DUm7hPwc.js";import"./defaultTheme-Tx6C8nph.js";import"./ViewportLockBanner-Cbyss5BQ.js";import"./leaflet-geoman-Cc97th-d.js";import"./ActivityPanel-B8tdjPUg.js";import"./ToolsPanel-C7_uRYfR.js";import"./ContextMenu-qheFrteX.js";import"./LayersToolbar-Bc57yKCh.js";import"./FilterDropdown-D8R_GT18.js";import"./FormatMenu-C20Tm7MD.js";import"./GeometryDialog-CHN-2Uji.js";import"./StacBrowser-BRtXF0sh.js";import"./client-CMlFXbYy.js";import"./TimelineView-DZw56FzU.js";import"./ExerciseListView--Pt1uCAi.js";const rt={title:"Apps/WebShell/StylingTools",component:n,decorators:[p=>o.jsx(a,{children:o.jsx(p,{})})],parameters:{layout:"fullscreen",viewport:{defaultViewport:"responsive"},docs:{description:{component:`
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
4. Run any styling tool — result message appears`,...(l=(s=t.parameters)==null?void 0:s.docs)==null?void 0:l.description}}};const it=["StylingToolsDemo"];export{t as StylingToolsDemo,it as __namedExportsOrder,rt as default};
