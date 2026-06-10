import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{fn as i}from"./index-CLEdRh-S.js";import{r as v}from"./index-B2-qRKKC.js";import{M as l}from"./MapView-HvEuWmo4.js";import{T as ue}from"./ThemeProvider-CkyXO63D.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./TileLayer-Cckmdc0V.js";import"./index-kS-9iBlu.js";import"./interval-CUv8kruJ.js";import"./types-CuJnRqfe.js";import"./bounds-BbBIf5Id.js";import"./labels-Bx3GzQt_.js";import"./applyClickToSelection-BH9K4Nvj.js";import"./useTheme-DUm7hPwc.js";import"./defaultTheme-Tx6C8nph.js";import"./ViewportLockBanner-Cbyss5BQ.js";import"./leaflet-geoman-Cc97th-d.js";/* empty css                */const ze={title:"Components/MapView",component:l,parameters:{layout:"padded",docs:{description:{component:"MapView displays GeoJSON features on an interactive Leaflet map. Supports tracks, reference locations, selection, and theming."}}},tags:["autodocs"],decorators:[r=>e.jsx(ue,{children:e.jsx(r,{})})]},he={type:"Feature",id:"track-001",geometry:{type:"LineString",coordinates:[[-5,50],[-4.8,50.2],[-4.5,50.5],[-4.2,50.7],[-4,51]]},properties:{kind:"TRACK",platform_id:"PLT-001",platform_name:"HMS Defender",track_type:"OWNSHIP",start_time:"2024-01-15T08:00:00Z",end_time:"2024-01-15T12:00:00Z",positions:[],color:"#0066cc"}},ge={type:"Feature",id:"track-002",geometry:{type:"LineString",coordinates:[[-4.8,50.8],[-4.6,50.6],[-4.4,50.4],[-4.2,50.3]]},properties:{kind:"TRACK",platform_id:"PLT-002",platform_name:"Contact Alpha",track_type:"CONTACT",start_time:"2024-01-15T09:00:00Z",end_time:"2024-01-15T11:00:00Z",positions:[]}},fe={type:"Feature",id:"ref-001",geometry:{type:"Point",coordinates:[-4.3,50.6]},properties:{kind:"POINT",name:"Waypoint Alpha",location_type:"WAYPOINT",description:"Navigation checkpoint"}},ye={type:"Feature",id:"ref-002",geometry:{type:"Point",coordinates:[-4.7,50.3]},properties:{kind:"POINT",name:"Danger Zone",location_type:"DANGER_AREA",description:"Restricted area"}},s={type:"FeatureCollection",features:[he,ge,fe,ye]},m={args:{features:s,height:500},parameters:{docs:{description:{story:"Basic map displaying tracks and reference locations."}}}};function be(){const[r,n]=v.useState(new Set),o=t=>{n(p=>{const a=new Set(p);return a.has(t)?a.delete(t):a.add(t),a})},d=()=>{n(new Set)};return e.jsxs("div",{children:[e.jsxs("div",{style:{marginBottom:16},children:[e.jsx("strong",{children:"Selected:"})," ",r.size>0?Array.from(r).join(", "):"None"]}),e.jsx(l,{features:s,selectedIds:r,onSelect:o,onBackgroundClick:d,height:500})]})}const u={render:()=>e.jsx(be,{}),parameters:{docs:{description:{story:"Click on features to select them. Click background to clear selection."}}}};function Se(r){const n=[];for(let o=0;o<r;o++){const d=-6+Math.random()*4,t=49+Math.random()*4,p=5+Math.floor(Math.random()*10),a=[];let c=d,M=t;for(let j=0;j<p;j++)a.push([c,M]),c+=(Math.random()-.5)*.2,M+=(Math.random()-.5)*.2;n.push({type:"Feature",id:`track-${o.toString().padStart(4,"0")}`,geometry:{type:"LineString",coordinates:a},properties:{kind:"TRACK",platform_id:`PLT-${o.toString().padStart(4,"0")}`,platform_name:`Vessel ${o+1}`,track_type:o%4===0?"OWNSHIP":o%4===1?"CONTACT":o%4===2?"REFERENCE":"SOLUTION",start_time:new Date(Date.now()-Math.random()*864e5).toISOString(),end_time:new Date().toISOString(),positions:[]}})}return{type:"FeatureCollection",features:n}}const ke=Se(100),h={args:{features:ke,height:500},parameters:{docs:{description:{story:"Performance test with 100 tracks. Map should remain responsive."}}}},g={args:{features:{type:"FeatureCollection",features:[]},height:400,autoFitBounds:!1,initialCenter:[51.5,-.1],initialZoom:8},parameters:{docs:{description:{story:"Empty map with no features. Shows base tile layer only."}}}},f={args:{features:[he],height:400},parameters:{docs:{description:{story:"Single track feature auto-fitted to bounds."}}}},y={args:{features:s,height:500,tileLayerUrl:"https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",tileLayerAttribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'},parameters:{docs:{description:{story:"Map using a custom tile layer (CartoDB Light)."}}}},b={render:()=>e.jsx(ue,{theme:{variant:"dark"},children:e.jsx(l,{features:s,height:500})}),parameters:{backgrounds:{default:"dark"},docs:{description:{story:"Map with dark theme applied."}}}};function xe(){const[r,n]=v.useState(new Set),o=(t,p)=>{n(a=>{const c=new Set(a);return p.ctrlKey||p.metaKey?c.has(t)?c.delete(t):c.add(t):(c.clear(),c.add(t)),c})},d=()=>{n(new Set)};return e.jsxs("div",{children:[e.jsxs("div",{style:{marginBottom:16},children:[e.jsxs("strong",{children:["Selected (",r.size,"):"]})," ",r.size>0?Array.from(r).join(", "):"None",e.jsx("br",{}),e.jsx("small",{children:"Hold Ctrl/Cmd to multi-select. Click background to clear."})]}),e.jsx(l,{features:s,selectedIds:r,onSelect:o,onBackgroundClick:d,height:500})]})}const S={render:()=>e.jsx(xe,{}),parameters:{docs:{description:{story:"Multi-select features using Ctrl/Cmd+Click. Single click selects only that feature."}}}},k={render:()=>e.jsx(l,{features:s,onSelect:r=>console.log("Selected:",r)}),parameters:{docs:{description:{story:`
**Success Criteria SC-001**: Display a map with track features using 5 or fewer lines of code.

\`\`\`tsx
import { MapView } from '@debrief/components/MapView';

<MapView
  features={plotData}
  onSelect={(id) => console.log('Selected:', id)}
/>
\`\`\`
        `}}}};function we(){const[r,n]=v.useState(new Set(["track-001","track-002","ref-001","ref-002"])),o=t=>{n(p=>{const a=new Set(p);return a.has(t)?a.delete(t):a.add(t),a})},d=["track-001","track-002","ref-001","ref-002"];return e.jsxs("div",{children:[e.jsxs("div",{style:{marginBottom:16},children:[e.jsx("strong",{children:"Toggle Visibility:"}),e.jsx("div",{style:{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"},children:d.map(t=>e.jsxs("label",{style:{display:"flex",alignItems:"center",gap:4},children:[e.jsx("input",{type:"checkbox",checked:r.has(t),onChange:()=>o(t)}),t]},t))}),e.jsx("small",{style:{display:"block",marginTop:8},children:"Use the toolbar's fit-to-window button (bottom icon) to zoom to visible features only."})]}),e.jsx(l,{features:s,visibleIds:r,height:500})]})}const x={render:()=>e.jsx(we,{}),parameters:{docs:{description:{story:"Toggle feature visibility and use the fit-to-window button to zoom to only the visible features."}}}},w={render:()=>e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16},children:[e.jsxs("div",{children:[e.jsx("div",{style:{marginBottom:8},children:e.jsx("strong",{children:"Top Left (default)"})}),e.jsx(l,{features:s,height:250,toolbarPosition:"topleft"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{marginBottom:8},children:e.jsx("strong",{children:"Top Right"})}),e.jsx(l,{features:s,height:250,toolbarPosition:"topright"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{marginBottom:8},children:e.jsx("strong",{children:"Bottom Left"})}),e.jsx(l,{features:s,height:250,toolbarPosition:"bottomleft"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{marginBottom:8},children:e.jsx("strong",{children:"Bottom Right"})}),e.jsx(l,{features:s,height:250,toolbarPosition:"bottomright"})]})]}),parameters:{docs:{description:{story:"Toolbar can be positioned at any corner of the map using the toolbarPosition prop."}}}},C={args:{features:s,height:400,showToolbar:!1},parameters:{docs:{description:{story:"Map with custom toolbar hidden, showing the default Leaflet zoom control."}}}},T={args:{features:s,height:400,tileLayerUrl:"./tiles/{z}/{x}/{y}.png",tileLayerAttribution:"© OpenStreetMap contributors (basemap tiles bundled for offline briefing)",errorTileUrl:"./tiles/placeholder.png",maxZoom:12,noWrap:!0,tileLayerCrossOrigin:!1,onSelect:i(),onBackgroundClick:i(),onZoomChange:i(),onBoundsChange:i(),onMapReady:i(),onFlyToComplete:i(),onSceneRectangleClick:i(),onDrawingModeChange:i(),onShapeCreated:i(),onViewportLockChange:i()},parameters:{docs:{description:{story:"The four props the air-gapped briefing renderer SPA (#264) needs to load tiles from a `file://` origin: `errorTileUrl` (placeholder served when a tile is missing), `maxZoom` (clamps zoom-in attempts to the bundled-tile depth), `noWrap` (keeps playback bounded to the captured tile set), and `tileLayerCrossOrigin={false}` (omits the `crossorigin` attribute that would otherwise block `file://`-origin loads in Chromium). All four default to today's behaviour for existing MapView consumers."}}}};var L,D,P;m.parameters={...m.parameters,docs:{...(L=m.parameters)==null?void 0:L.docs,source:{originalSource:`{
  args: {
    features: sampleData,
    height: 500
  },
  parameters: {
    docs: {
      description: {
        story: 'Basic map displaying tracks and reference locations.'
      }
    }
  }
}`,...(P=(D=m.parameters)==null?void 0:D.docs)==null?void 0:P.source}}};var B,V,A;u.parameters={...u.parameters,docs:{...(B=u.parameters)==null?void 0:B.docs,source:{originalSource:`{
  render: () => <SelectableMapExample />,
  parameters: {
    docs: {
      description: {
        story: 'Click on features to select them. Click background to clear selection.'
      }
    }
  }
}`,...(A=(V=u.parameters)==null?void 0:V.docs)==null?void 0:A.source}}};var O,E,_;h.parameters={...h.parameters,docs:{...(O=h.parameters)==null?void 0:O.docs,source:{originalSource:`{
  args: {
    features: largeDataset,
    height: 500
  },
  parameters: {
    docs: {
      description: {
        story: 'Performance test with 100 tracks. Map should remain responsive.'
      }
    }
  }
}`,...(_=(E=h.parameters)==null?void 0:E.docs)==null?void 0:_.source}}};var F,R,I;g.parameters={...g.parameters,docs:{...(F=g.parameters)==null?void 0:F.docs,source:{originalSource:`{
  args: {
    features: {
      type: 'FeatureCollection',
      features: []
    },
    height: 400,
    autoFitBounds: false,
    initialCenter: [51.5, -0.1],
    initialZoom: 8
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty map with no features. Shows base tile layer only.'
      }
    }
  }
}`,...(I=(R=g.parameters)==null?void 0:R.docs)==null?void 0:I.source}}};var N,z,Z;f.parameters={...f.parameters,docs:{...(N=f.parameters)==null?void 0:N.docs,source:{originalSource:`{
  args: {
    features: [sampleTrack],
    height: 400
  },
  parameters: {
    docs: {
      description: {
        story: 'Single track feature auto-fitted to bounds.'
      }
    }
  }
}`,...(Z=(z=f.parameters)==null?void 0:z.docs)==null?void 0:Z.source}}};var W,U,K;y.parameters={...y.parameters,docs:{...(W=y.parameters)==null?void 0:W.docs,source:{originalSource:`{
  args: {
    features: sampleData,
    height: 500,
    tileLayerUrl: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    tileLayerAttribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  },
  parameters: {
    docs: {
      description: {
        story: 'Map using a custom tile layer (CartoDB Light).'
      }
    }
  }
}`,...(K=(U=y.parameters)==null?void 0:U.docs)==null?void 0:K.source}}};var H,$,G;b.parameters={...b.parameters,docs:{...(H=b.parameters)==null?void 0:H.docs,source:{originalSource:`{
  render: () => <ThemeProvider theme={{
    variant: 'dark'
  }}>
      <MapView features={sampleData} height={500} />
    </ThemeProvider>,
  parameters: {
    backgrounds: {
      default: 'dark'
    },
    docs: {
      description: {
        story: 'Map with dark theme applied.'
      }
    }
  }
}`,...(G=($=b.parameters)==null?void 0:$.docs)==null?void 0:G.source}}};var J,Y,q;S.parameters={...S.parameters,docs:{...(J=S.parameters)==null?void 0:J.docs,source:{originalSource:`{
  render: () => <MultiSelectMapExample />,
  parameters: {
    docs: {
      description: {
        story: 'Multi-select features using Ctrl/Cmd+Click. Single click selects only that feature.'
      }
    }
  }
}`,...(q=(Y=S.parameters)==null?void 0:Y.docs)==null?void 0:q.source}}};var Q,X,ee;k.parameters={...k.parameters,docs:{...(Q=k.parameters)==null?void 0:Q.docs,source:{originalSource:`{
  render: () => {
    // SC-001: Display a map with 5 or fewer lines of code
    return <MapView features={sampleData} onSelect={id => console.log('Selected:', id)} />;
  },
  parameters: {
    docs: {
      description: {
        story: \`
**Success Criteria SC-001**: Display a map with track features using 5 or fewer lines of code.

\\\`\\\`\\\`tsx
import { MapView } from '@debrief/components/MapView';

<MapView
  features={plotData}
  onSelect={(id) => console.log('Selected:', id)}
/>
\\\`\\\`\\\`
        \`
      }
    }
  }
}`,...(ee=(X=k.parameters)==null?void 0:X.docs)==null?void 0:ee.source}}};var te,re,oe;x.parameters={...x.parameters,docs:{...(te=x.parameters)==null?void 0:te.docs,source:{originalSource:`{
  render: () => <FitToVisibleExample />,
  parameters: {
    docs: {
      description: {
        story: 'Toggle feature visibility and use the fit-to-window button to zoom to only the visible features.'
      }
    }
  }
}`,...(oe=(re=x.parameters)==null?void 0:re.docs)==null?void 0:oe.source}}};var ae,se,ne;w.parameters={...w.parameters,docs:{...(ae=w.parameters)==null?void 0:ae.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16
  }}>
      <div>
        <div style={{
        marginBottom: 8
      }}><strong>Top Left (default)</strong></div>
        <MapView features={sampleData} height={250} toolbarPosition="topleft" />
      </div>
      <div>
        <div style={{
        marginBottom: 8
      }}><strong>Top Right</strong></div>
        <MapView features={sampleData} height={250} toolbarPosition="topright" />
      </div>
      <div>
        <div style={{
        marginBottom: 8
      }}><strong>Bottom Left</strong></div>
        <MapView features={sampleData} height={250} toolbarPosition="bottomleft" />
      </div>
      <div>
        <div style={{
        marginBottom: 8
      }}><strong>Bottom Right</strong></div>
        <MapView features={sampleData} height={250} toolbarPosition="bottomright" />
      </div>
    </div>,
  parameters: {
    docs: {
      description: {
        story: 'Toolbar can be positioned at any corner of the map using the toolbarPosition prop.'
      }
    }
  }
}`,...(ne=(se=w.parameters)==null?void 0:se.docs)==null?void 0:ne.source}}};var ie,le,ce;C.parameters={...C.parameters,docs:{...(ie=C.parameters)==null?void 0:ie.docs,source:{originalSource:`{
  args: {
    features: sampleData,
    height: 400,
    showToolbar: false
  },
  parameters: {
    docs: {
      description: {
        story: 'Map with custom toolbar hidden, showing the default Leaflet zoom control.'
      }
    }
  }
}`,...(ce=(le=C.parameters)==null?void 0:le.docs)==null?void 0:ce.source}}};var pe,de,me;T.parameters={...T.parameters,docs:{...(pe=T.parameters)==null?void 0:pe.docs,source:{originalSource:`{
  args: {
    features: sampleData,
    height: 400,
    // The four new props this story exercises:
    tileLayerUrl: './tiles/{z}/{x}/{y}.png',
    tileLayerAttribution: '© OpenStreetMap contributors (basemap tiles bundled for offline briefing)',
    errorTileUrl: './tiles/placeholder.png',
    maxZoom: 12,
    noWrap: true,
    tileLayerCrossOrigin: false,
    // Explicit spies for the action callbacks Storybook would otherwise
    // bind implicitly (Storybook 8 deprecation).
    onSelect: fn(),
    onBackgroundClick: fn(),
    onZoomChange: fn(),
    onBoundsChange: fn(),
    onMapReady: fn(),
    onFlyToComplete: fn(),
    onSceneRectangleClick: fn(),
    onDrawingModeChange: fn(),
    onShapeCreated: fn(),
    onViewportLockChange: fn()
  },
  parameters: {
    docs: {
      description: {
        story: 'The four props the air-gapped briefing renderer SPA (#264) needs to load tiles from a \`file://\` origin: \`errorTileUrl\` (placeholder served when a tile is missing), \`maxZoom\` (clamps zoom-in attempts to the bundled-tile depth), \`noWrap\` (keeps playback bounded to the captured tile set), and \`tileLayerCrossOrigin={false}\` (omits the \`crossorigin\` attribute that would otherwise block \`file://\`-origin loads in Chromium). All four default to today\\'s behaviour for existing MapView consumers.'
      }
    }
  }
}`,...(me=(de=T.parameters)==null?void 0:de.docs)==null?void 0:me.source}}};const Ze=["Default","WithSelection","LargeDataset","Empty","SingleTrack","CustomTileLayer","DarkTheme","MultiSelect","FiveLineExample","FitToVisible","ToolbarPositions","NoToolbar","BriefingTileLayerProps"];export{T as BriefingTileLayerProps,y as CustomTileLayer,b as DarkTheme,m as Default,g as Empty,x as FitToVisible,k as FiveLineExample,h as LargeDataset,S as MultiSelect,C as NoToolbar,f as SingleTrack,w as ToolbarPositions,u as WithSelection,Ze as __namedExportsOrder,ze as default};
