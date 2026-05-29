import{j as o}from"./jsx-runtime-DF2Pcvd1.js";import"./interval-CUv8kruJ.js";import{a7 as u}from"./App-wQCWMtB1.js";/* empty css                */import{T as g}from"./ThemeProvider-DF0jq0Ad.js";import"./index-B2-qRKKC.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./types-CuJnRqfe.js";import"./FilterBar-CUTO5rAZ.js";import"./index-kS-9iBlu.js";import"./CascadingMenu-BgTnOB60.js";import"./applyClickToSelection-BH9K4Nvj.js";import"./time-CSps8V6f.js";import"./labels-Bx3GzQt_.js";import"./readOnlyBanner-DQOCUynw.js";import"./ParameterEditor-j09_We3v.js";import"./ParameterEditor-DMejAiLo.js";import"./iframe-CYjwIqEi.js";import"./FeatureList-Dc3A0TG2.js";import"./index-CHJUuggG.js";import"./useStoryboardEditReducer-CYOhcMTq.js";import"./StoryboardPanel-BcFMmIeF.js";import"./textfield-Dm39NdvL.js";import"./LogPanel-bA_dtMDY.js";import"./paramTypeResolver-Br4vj1cK.js";import"./TimeController-BQb5Lh1r.js";import"./drawingPalette-B8cqKU8M.js";import"./index-B1Wj4M0z.js";import"./StacFileTree-9qY9uyTU.js";import"./MapView-HvEuWmo4.js";import"./TileLayer-Cckmdc0V.js";import"./bounds-BbBIf5Id.js";import"./useTheme-DUm7hPwc.js";import"./defaultTheme-Tx6C8nph.js";import"./ViewportLockBanner-Cbyss5BQ.js";import"./leaflet-geoman-Cc97th-d.js";import"./ActivityPanel-C5uDuW_r.js";import"./ToolsPanel-C7_uRYfR.js";import"./ContextMenu-qheFrteX.js";import"./LayersToolbar-Bc57yKCh.js";import"./FilterDropdown-D8R_GT18.js";import"./FormatMenu-C20Tm7MD.js";import"./GeometryDialog-CHN-2Uji.js";import"./StacBrowser-BRtXF0sh.js";import"./client-CMlFXbYy.js";import"./TimelineView-DZw56FzU.js";import"./ExerciseListView--Pt1uCAi.js";const ce={title:"Apps/WebShell",component:u,decorators:[h=>o.jsx(g,{children:o.jsx(h,{})})],parameters:{layout:"fullscreen",viewport:{defaultViewport:"responsive"},docs:{description:{component:`
# Web Shell - Integrated Demo

A standalone browser application for reviewing Debrief component integration.

## Features

- **Welcome Page**: STAC Catalog browser showing available plots
- **Analysis View**: ActivityPanel (left) + MapView (right)
- **Selection Sync**: Click features on map or in list
- **Tool Execution**: Track Length, Bounding Box, and 4 styling tools

## Usage

1. Double-click a plot in the catalog to open it
2. Click tracks on the map to select them
3. Use tools in the Activity Panel
4. Click "Back to Catalog" to return
        `}}},tags:["autodocs"]},e={name:"Welcome Page"},t={name:"Integrated Demo",parameters:{docs:{description:{story:`
Full integrated demo showing the complete workflow:

1. **Welcome Page**: Browse the STAC catalog
2. **Open Plot**: Double-click "Exercise Alpha" to see 2 vessel tracks
3. **Select Features**: Click tracks on the map or in the feature list
4. **Run Tools**: Select a track and run "Track Length" to calculate distance
5. **Temporal Playback**: Use the time controller to animate tracks

This demo uses mock services with fixture data from the test-data directory.
        `}}}};var r,a,i,s,n;e.parameters={...e.parameters,docs:{...(r=e.parameters)==null?void 0:r.docs,source:{originalSource:`{
  name: 'Welcome Page'
}`,...(i=(a=e.parameters)==null?void 0:a.docs)==null?void 0:i.source},description:{story:`The default story shows the welcome page with the STAC catalog browser.
Double-click on "Exercise Alpha" or "Training Run 1" to open the analysis view.`,...(n=(s=e.parameters)==null?void 0:s.docs)==null?void 0:n.description}}};var m,c,p,l,d;t.parameters={...t.parameters,docs:{...(m=t.parameters)==null?void 0:m.docs,source:{originalSource:`{
  name: 'Integrated Demo',
  parameters: {
    docs: {
      description: {
        story: \`
Full integrated demo showing the complete workflow:

1. **Welcome Page**: Browse the STAC catalog
2. **Open Plot**: Double-click "Exercise Alpha" to see 2 vessel tracks
3. **Select Features**: Click tracks on the map or in the feature list
4. **Run Tools**: Select a track and run "Track Length" to calculate distance
5. **Temporal Playback**: Use the time controller to animate tracks

This demo uses mock services with fixture data from the test-data directory.
        \`
      }
    }
  }
}`,...(p=(c=t.parameters)==null?void 0:c.docs)==null?void 0:p.source},description:{story:`Shows the full integrated workflow.
This is the same as Default - use it to explore both views.`,...(d=(l=t.parameters)==null?void 0:l.docs)==null?void 0:d.description}}};const pe=["Default","IntegratedDemo"];export{e as Default,t as IntegratedDemo,pe as __namedExportsOrder,ce as default};
