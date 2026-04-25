import{j as o}from"./jsx-runtime-DF2Pcvd1.js";import"./interval-BLw0Yh9p.js";import{A as u}from"./App-ClVkhxsD.js";/* empty css                */import{T as g}from"./ThemeProvider-47c8oKUw.js";import"./index-B2-qRKKC.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./types-CuJnRqfe.js";import"./FilterBar-BqSomdWF.js";import"./index-kS-9iBlu.js";import"./CascadingMenu-BgTnOB60.js";import"./time-CBN9LM6t.js";import"./labels-ebbTtwlG.js";import"./LogPanel-CM8Y224-.js";import"./ParameterEditor-DMejAiLo.js";import"./paramTypeResolver-Br4vj1cK.js";import"./TimeController-D_1r5dpO.js";import"./textfield-Dm39NdvL.js";import"./drawingPalette-D_RXapFN.js";import"./index-B1Wj4M0z.js";import"./StacFileTree-9qY9uyTU.js";import"./MapView-DyMFBF89.js";import"./TileLayer-Cckmdc0V.js";import"./bounds-BbBIf5Id.js";import"./useTheme-BAxHl-EG.js";import"./defaultTheme-lXwsM3al.js";import"./leaflet-geoman-Cc97th-d.js";import"./ActivityPanel-ClqHCwlZ.js";import"./ToolsPanel-BqlWd7h-.js";import"./ContextMenu-qheFrteX.js";import"./LayersToolbar-Bc57yKCh.js";import"./FilterDropdown-D8R_GT18.js";import"./FeatureList-DVIX6ol4.js";import"./index-CHJUuggG.js";import"./FormatMenu-CHE7Gnnt.js";import"./GeometryDialog-CHN-2Uji.js";import"./ParameterEditor-j09_We3v.js";import"./StacBrowser-BIa16d7g.js";import"./client-CMlFXbYy.js";import"./TimelineView-DZw56FzU.js";import"./ExerciseListView-CXJ54syZ.js";const re={title:"Apps/WebShell",component:u,decorators:[h=>o.jsx(g,{children:o.jsx(h,{})})],parameters:{layout:"fullscreen",viewport:{defaultViewport:"responsive"},docs:{description:{component:`
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
Double-click on "Exercise Alpha" or "Training Run 1" to open the analysis view.`,...(n=(s=e.parameters)==null?void 0:s.docs)==null?void 0:n.description}}};var c,m,l,p,d;t.parameters={...t.parameters,docs:{...(c=t.parameters)==null?void 0:c.docs,source:{originalSource:`{
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
}`,...(l=(m=t.parameters)==null?void 0:m.docs)==null?void 0:l.source},description:{story:`Shows the full integrated workflow.
This is the same as Default - use it to explore both views.`,...(d=(p=t.parameters)==null?void 0:p.docs)==null?void 0:d.description}}};const ae=["Default","IntegratedDemo"];export{e as Default,t as IntegratedDemo,ae as __namedExportsOrder,re as default};
