import{j as o}from"./jsx-runtime-DF2Pcvd1.js";import{A as u}from"./App-D445N7bN.js";/* empty css                */import{T as g}from"./ThemeProvider-mvcGjblv.js";import"./index-B2-qRKKC.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./time-DRS43qp1.js";import"./labels-ByPsOtwN.js";import"./types-CH13Z4Jd.js";import"./ParameterEditor-BTx1TVlf.js";import"./TimeController-BZiLl7Fy.js";import"./textfield-Dm39NdvL.js";import"./CatalogOverview-B5IzUrwD.js";import"./TileLayer-Cckmdc0V.js";import"./index-kS-9iBlu.js";import"./Tooltip-CeZQf7Zv.js";import"./StacFileTree-QPvJ10Md.js";import"./ActivityPanel-DslsBSAu.js";import"./ToolsPanel-DaStacFF.js";import"./ContextMenu-qheFrteX.js";import"./LayersToolbar-DhEpAW8m.js";import"./FilterDropdown-BgyHQuSK.js";import"./FeatureList-C1G_T8NP.js";import"./MapView-CHwitRz7.js";import"./leaflet-geoman-Cc97th-d.js";const M={title:"Apps/WebShell",component:u,decorators:[h=>o.jsx(g,{children:o.jsx(h,{})})],parameters:{layout:"fullscreen",viewport:{defaultViewport:"responsive"},docs:{description:{component:`
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
This is the same as Default - use it to explore both views.`,...(d=(p=t.parameters)==null?void 0:p.docs)==null?void 0:d.description}}};const q=["Default","IntegratedDemo"];export{e as Default,t as IntegratedDemo,q as __namedExportsOrder,M as default};
