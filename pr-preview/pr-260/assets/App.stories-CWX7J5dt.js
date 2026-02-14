import{j as o}from"./jsx-runtime-DF2Pcvd1.js";import{A as u}from"./App-B2HHEcIm.js";/* empty css                */import{T as g}from"./ThemeProvider-mvcGjblv.js";import"./index-B2-qRKKC.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./time-DWPBvZ9w.js";import"./labels-D4DpyF2F.js";import"./types-CH13Z4Jd.js";import"./ParameterEditor-BTx1TVlf.js";import"./TimeController-BZiLl7Fy.js";import"./textfield-Dm39NdvL.js";import"./createDrawnFeature-BV1XLVpI.js";import"./index-B1Wj4M0z.js";import"./StacFileTree-JcRk-kDX.js";import"./MapView-DlLvd_0s.js";import"./TileLayer-Cckmdc0V.js";import"./index-kS-9iBlu.js";import"./Tooltip-CeZQf7Zv.js";import"./leaflet-geoman-Cc97th-d.js";import"./ActivityPanel-DIdctTfo.js";import"./ToolsPanel-DaStacFF.js";import"./ContextMenu-qheFrteX.js";import"./LayersToolbar-CxJUs9AP.js";import"./FilterDropdown-BgyHQuSK.js";import"./FeatureList-DYEY4ntv.js";import"./CatalogOverview-B5IzUrwD.js";import"./client-CMlFXbYy.js";const G={title:"Apps/WebShell",component:u,decorators:[h=>o.jsx(g,{children:o.jsx(h,{})})],parameters:{layout:"fullscreen",viewport:{defaultViewport:"responsive"},docs:{description:{component:`
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
        `}}}};var r,a,s,i,n;e.parameters={...e.parameters,docs:{...(r=e.parameters)==null?void 0:r.docs,source:{originalSource:`{
  name: 'Welcome Page'
}`,...(s=(a=e.parameters)==null?void 0:a.docs)==null?void 0:s.source},description:{story:`The default story shows the welcome page with the STAC catalog browser.
Double-click on "Exercise Alpha" or "Training Run 1" to open the analysis view.`,...(n=(i=e.parameters)==null?void 0:i.docs)==null?void 0:n.description}}};var c,l,m,p,d;t.parameters={...t.parameters,docs:{...(c=t.parameters)==null?void 0:c.docs,source:{originalSource:`{
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
}`,...(m=(l=t.parameters)==null?void 0:l.docs)==null?void 0:m.source},description:{story:`Shows the full integrated workflow.
This is the same as Default - use it to explore both views.`,...(d=(p=t.parameters)==null?void 0:p.docs)==null?void 0:d.description}}};const H=["Default","IntegratedDemo"];export{e as Default,t as IntegratedDemo,H as __namedExportsOrder,G as default};
