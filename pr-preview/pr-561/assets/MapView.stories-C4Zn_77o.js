import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r as T}from"./index-B2-qRKKC.js";import{M as i}from"./MapView-CQxrEcBF.js";import{T as ce}from"./ThemeProvider-yoWuHKa_.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./TileLayer-Cckmdc0V.js";import"./index-kS-9iBlu.js";import"./interval-BLw0Yh9p.js";import"./types-CuJnRqfe.js";import"./bounds-BbBIf5Id.js";import"./labels-ebbTtwlG.js";import"./useTheme-DUm7hPwc.js";import"./defaultTheme-Tx6C8nph.js";import"./leaflet-geoman-Cc97th-d.js";/* empty css                */const _e={title:"Components/MapView",component:i,parameters:{layout:"padded",docs:{description:{component:"MapView displays GeoJSON features on an interactive Leaflet map. Supports tracks, reference locations, selection, and theming."}}},tags:["autodocs"],decorators:[r=>e.jsx(ce,{children:e.jsx(r,{})})]},le={type:"Feature",id:"track-001",geometry:{type:"LineString",coordinates:[[-5,50],[-4.8,50.2],[-4.5,50.5],[-4.2,50.7],[-4,51]]},properties:{kind:"TRACK",platform_id:"PLT-001",platform_name:"HMS Defender",track_type:"OWNSHIP",start_time:"2024-01-15T08:00:00Z",end_time:"2024-01-15T12:00:00Z",positions:[],color:"#0066cc"}},pe={type:"Feature",id:"track-002",geometry:{type:"LineString",coordinates:[[-4.8,50.8],[-4.6,50.6],[-4.4,50.4],[-4.2,50.3]]},properties:{kind:"TRACK",platform_id:"PLT-002",platform_name:"Contact Alpha",track_type:"CONTACT",start_time:"2024-01-15T09:00:00Z",end_time:"2024-01-15T11:00:00Z",positions:[]}},de={type:"Feature",id:"ref-001",geometry:{type:"Point",coordinates:[-4.3,50.6]},properties:{kind:"POINT",name:"Waypoint Alpha",location_type:"WAYPOINT",description:"Navigation checkpoint"}},me={type:"Feature",id:"ref-002",geometry:{type:"Point",coordinates:[-4.7,50.3]},properties:{kind:"POINT",name:"Danger Zone",location_type:"DANGER_AREA",description:"Restricted area"}},s={type:"FeatureCollection",features:[le,pe,de,me]},d={args:{features:s,height:500},parameters:{docs:{description:{story:"Basic map displaying tracks and reference locations."}}}};function ue(){const[r,n]=T.useState(new Set),o=t=>{n(l=>{const a=new Set(l);return a.has(t)?a.delete(t):a.add(t),a})},p=()=>{n(new Set)};return e.jsxs("div",{children:[e.jsxs("div",{style:{marginBottom:16},children:[e.jsx("strong",{children:"Selected:"})," ",r.size>0?Array.from(r).join(", "):"None"]}),e.jsx(i,{features:s,selectedIds:r,onSelect:o,onBackgroundClick:p,height:500})]})}const m={render:()=>e.jsx(ue,{}),parameters:{docs:{description:{story:"Click on features to select them. Click background to clear selection."}}}};function he(r){const n=[];for(let o=0;o<r;o++){const p=-6+Math.random()*4,t=49+Math.random()*4,l=5+Math.floor(Math.random()*10),a=[];let c=p,v=t;for(let j=0;j<l;j++)a.push([c,v]),c+=(Math.random()-.5)*.2,v+=(Math.random()-.5)*.2;n.push({type:"Feature",id:`track-${o.toString().padStart(4,"0")}`,geometry:{type:"LineString",coordinates:a},properties:{kind:"TRACK",platform_id:`PLT-${o.toString().padStart(4,"0")}`,platform_name:`Vessel ${o+1}`,track_type:o%4===0?"OWNSHIP":o%4===1?"CONTACT":o%4===2?"REFERENCE":"SOLUTION",start_time:new Date(Date.now()-Math.random()*864e5).toISOString(),end_time:new Date().toISOString(),positions:[]}})}return{type:"FeatureCollection",features:n}}const ge=he(100),u={args:{features:ge,height:500},parameters:{docs:{description:{story:"Performance test with 100 tracks. Map should remain responsive."}}}},h={args:{features:{type:"FeatureCollection",features:[]},height:400,autoFitBounds:!1,initialCenter:[51.5,-.1],initialZoom:8},parameters:{docs:{description:{story:"Empty map with no features. Shows base tile layer only."}}}},g={args:{features:[le],height:400},parameters:{docs:{description:{story:"Single track feature auto-fitted to bounds."}}}},f={args:{features:s,height:500,tileLayerUrl:"https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",tileLayerAttribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'},parameters:{docs:{description:{story:"Map using a custom tile layer (CartoDB Light)."}}}},y={render:()=>e.jsx(ce,{theme:{variant:"dark"},children:e.jsx(i,{features:s,height:500})}),parameters:{backgrounds:{default:"dark"},docs:{description:{story:"Map with dark theme applied."}}}};function fe(){const[r,n]=T.useState(new Set),o=(t,l)=>{n(a=>{const c=new Set(a);return l.ctrlKey||l.metaKey?c.has(t)?c.delete(t):c.add(t):(c.clear(),c.add(t)),c})},p=()=>{n(new Set)};return e.jsxs("div",{children:[e.jsxs("div",{style:{marginBottom:16},children:[e.jsxs("strong",{children:["Selected (",r.size,"):"]})," ",r.size>0?Array.from(r).join(", "):"None",e.jsx("br",{}),e.jsx("small",{children:"Hold Ctrl/Cmd to multi-select. Click background to clear."})]}),e.jsx(i,{features:s,selectedIds:r,onSelect:o,onBackgroundClick:p,height:500})]})}const S={render:()=>e.jsx(fe,{}),parameters:{docs:{description:{story:"Multi-select features using Ctrl/Cmd+Click. Single click selects only that feature."}}}},b={render:()=>e.jsx(i,{features:s,onSelect:r=>console.log("Selected:",r)}),parameters:{docs:{description:{story:`
**Success Criteria SC-001**: Display a map with track features using 5 or fewer lines of code.

\`\`\`tsx
import { MapView } from '@debrief/components/MapView';

<MapView
  features={plotData}
  onSelect={(id) => console.log('Selected:', id)}
/>
\`\`\`
        `}}}};function ye(){const[r,n]=T.useState(new Set(["track-001","track-002","ref-001","ref-002"])),o=t=>{n(l=>{const a=new Set(l);return a.has(t)?a.delete(t):a.add(t),a})},p=["track-001","track-002","ref-001","ref-002"];return e.jsxs("div",{children:[e.jsxs("div",{style:{marginBottom:16},children:[e.jsx("strong",{children:"Toggle Visibility:"}),e.jsx("div",{style:{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"},children:p.map(t=>e.jsxs("label",{style:{display:"flex",alignItems:"center",gap:4},children:[e.jsx("input",{type:"checkbox",checked:r.has(t),onChange:()=>o(t)}),t]},t))}),e.jsx("small",{style:{display:"block",marginTop:8},children:"Use the toolbar's fit-to-window button (bottom icon) to zoom to visible features only."})]}),e.jsx(i,{features:s,visibleIds:r,height:500})]})}const x={render:()=>e.jsx(ye,{}),parameters:{docs:{description:{story:"Toggle feature visibility and use the fit-to-window button to zoom to only the visible features."}}}},k={render:()=>e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16},children:[e.jsxs("div",{children:[e.jsx("div",{style:{marginBottom:8},children:e.jsx("strong",{children:"Top Left (default)"})}),e.jsx(i,{features:s,height:250,toolbarPosition:"topleft"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{marginBottom:8},children:e.jsx("strong",{children:"Top Right"})}),e.jsx(i,{features:s,height:250,toolbarPosition:"topright"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{marginBottom:8},children:e.jsx("strong",{children:"Bottom Left"})}),e.jsx(i,{features:s,height:250,toolbarPosition:"bottomleft"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{marginBottom:8},children:e.jsx("strong",{children:"Bottom Right"})}),e.jsx(i,{features:s,height:250,toolbarPosition:"bottomright"})]})]}),parameters:{docs:{description:{story:"Toolbar can be positioned at any corner of the map using the toolbarPosition prop."}}}},w={args:{features:s,height:400,showToolbar:!1},parameters:{docs:{description:{story:"Map with custom toolbar hidden, showing the default Leaflet zoom control."}}}};var C,M,D;d.parameters={...d.parameters,docs:{...(C=d.parameters)==null?void 0:C.docs,source:{originalSource:`{
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
}`,...(D=(M=d.parameters)==null?void 0:M.docs)==null?void 0:D.source}}};var L,P,B;m.parameters={...m.parameters,docs:{...(L=m.parameters)==null?void 0:L.docs,source:{originalSource:`{
  render: () => <SelectableMapExample />,
  parameters: {
    docs: {
      description: {
        story: 'Click on features to select them. Click background to clear selection.'
      }
    }
  }
}`,...(B=(P=m.parameters)==null?void 0:P.docs)==null?void 0:B.source}}};var V,_,E;u.parameters={...u.parameters,docs:{...(V=u.parameters)==null?void 0:V.docs,source:{originalSource:`{
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
}`,...(E=(_=u.parameters)==null?void 0:_.docs)==null?void 0:E.source}}};var A,F,O;h.parameters={...h.parameters,docs:{...(A=h.parameters)==null?void 0:A.docs,source:{originalSource:`{
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
}`,...(O=(F=h.parameters)==null?void 0:F.docs)==null?void 0:O.source}}};var I,N,R;g.parameters={...g.parameters,docs:{...(I=g.parameters)==null?void 0:I.docs,source:{originalSource:`{
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
}`,...(R=(N=g.parameters)==null?void 0:N.docs)==null?void 0:R.source}}};var z,W,Z;f.parameters={...f.parameters,docs:{...(z=f.parameters)==null?void 0:z.docs,source:{originalSource:`{
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
}`,...(Z=(W=f.parameters)==null?void 0:W.docs)==null?void 0:Z.source}}};var K,H,U;y.parameters={...y.parameters,docs:{...(K=y.parameters)==null?void 0:K.docs,source:{originalSource:`{
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
}`,...(U=(H=y.parameters)==null?void 0:H.docs)==null?void 0:U.source}}};var $,G,J;S.parameters={...S.parameters,docs:{...($=S.parameters)==null?void 0:$.docs,source:{originalSource:`{
  render: () => <MultiSelectMapExample />,
  parameters: {
    docs: {
      description: {
        story: 'Multi-select features using Ctrl/Cmd+Click. Single click selects only that feature.'
      }
    }
  }
}`,...(J=(G=S.parameters)==null?void 0:G.docs)==null?void 0:J.source}}};var Y,q,Q;b.parameters={...b.parameters,docs:{...(Y=b.parameters)==null?void 0:Y.docs,source:{originalSource:`{
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
}`,...(Q=(q=b.parameters)==null?void 0:q.docs)==null?void 0:Q.source}}};var X,ee,te;x.parameters={...x.parameters,docs:{...(X=x.parameters)==null?void 0:X.docs,source:{originalSource:`{
  render: () => <FitToVisibleExample />,
  parameters: {
    docs: {
      description: {
        story: 'Toggle feature visibility and use the fit-to-window button to zoom to only the visible features.'
      }
    }
  }
}`,...(te=(ee=x.parameters)==null?void 0:ee.docs)==null?void 0:te.source}}};var re,oe,ae;k.parameters={...k.parameters,docs:{...(re=k.parameters)==null?void 0:re.docs,source:{originalSource:`{
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
}`,...(ae=(oe=k.parameters)==null?void 0:oe.docs)==null?void 0:ae.source}}};var se,ne,ie;w.parameters={...w.parameters,docs:{...(se=w.parameters)==null?void 0:se.docs,source:{originalSource:`{
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
}`,...(ie=(ne=w.parameters)==null?void 0:ne.docs)==null?void 0:ie.source}}};const Ee=["Default","WithSelection","LargeDataset","Empty","SingleTrack","CustomTileLayer","DarkTheme","MultiSelect","FiveLineExample","FitToVisible","ToolbarPositions","NoToolbar"];export{f as CustomTileLayer,y as DarkTheme,d as Default,h as Empty,x as FitToVisible,b as FiveLineExample,u as LargeDataset,S as MultiSelect,w as NoToolbar,g as SingleTrack,k as ToolbarPositions,m as WithSelection,Ee as __namedExportsOrder,_e as default};
