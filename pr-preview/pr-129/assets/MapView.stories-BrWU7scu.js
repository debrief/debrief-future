import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r as J}from"./index-B2-qRKKC.js";import{M as l}from"./MapView-D5Tp7wuJ.js";import{T as Y}from"./ThemeProvider-KrJW1DiK.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./labels-DlaBaZmR.js";import"./index-kS-9iBlu.js";/* empty css                */const ue={title:"Components/MapView",component:l,parameters:{layout:"padded",docs:{description:{component:"MapView displays GeoJSON features on an interactive Leaflet map. Supports tracks, reference locations, selection, and theming."}}},tags:["autodocs"],decorators:[t=>e.jsx(Y,{children:e.jsx(t,{})})]},q={type:"Feature",id:"track-001",geometry:{type:"LineString",coordinates:[[-5,50],[-4.8,50.2],[-4.5,50.5],[-4.2,50.7],[-4,51]]},properties:{kind:"TRACK",platform_id:"PLT-001",platform_name:"HMS Defender",track_type:"OWNSHIP",start_time:"2024-01-15T08:00:00Z",end_time:"2024-01-15T12:00:00Z",positions:[],color:"#0066cc"}},Q={type:"Feature",id:"track-002",geometry:{type:"LineString",coordinates:[[-4.8,50.8],[-4.6,50.6],[-4.4,50.4],[-4.2,50.3]]},properties:{kind:"TRACK",platform_id:"PLT-002",platform_name:"Contact Alpha",track_type:"CONTACT",start_time:"2024-01-15T09:00:00Z",end_time:"2024-01-15T11:00:00Z",positions:[]}},X={type:"Feature",id:"ref-001",geometry:{type:"Point",coordinates:[-4.3,50.6]},properties:{kind:"POINT",name:"Waypoint Alpha",location_type:"WAYPOINT",description:"Navigation checkpoint"}},ee={type:"Feature",id:"ref-002",geometry:{type:"Point",coordinates:[-4.7,50.3]},properties:{kind:"POINT",name:"Danger Zone",location_type:"DANGER_AREA",description:"Restricted area"}},c={type:"FeatureCollection",features:[q,Q,X,ee]},d={args:{features:c,height:500},parameters:{docs:{description:{story:"Basic map displaying tracks and reference locations."}}}};function te(){const[t,n]=J.useState(new Set),r=a=>{n(i=>{const s=new Set(i);return s.has(a)?s.delete(a):s.add(a),s})},p=()=>{n(new Set)};return e.jsxs("div",{children:[e.jsxs("div",{style:{marginBottom:16},children:[e.jsx("strong",{children:"Selected:"})," ",t.size>0?Array.from(t).join(", "):"None"]}),e.jsx(l,{features:c,selectedIds:t,onSelect:r,onBackgroundClick:p,height:500})]})}const m={render:()=>e.jsx(te,{}),parameters:{docs:{description:{story:"Click on features to select them. Click background to clear selection."}}}};function re(t){const n=[];for(let r=0;r<t;r++){const p=-6+Math.random()*4,a=49+Math.random()*4,i=5+Math.floor(Math.random()*10),s=[];let o=p,C=a;for(let w=0;w<i;w++)s.push([o,C]),o+=(Math.random()-.5)*.2,C+=(Math.random()-.5)*.2;n.push({type:"Feature",id:`track-${r.toString().padStart(4,"0")}`,geometry:{type:"LineString",coordinates:s},properties:{kind:"TRACK",platform_id:`PLT-${r.toString().padStart(4,"0")}`,platform_name:`Vessel ${r+1}`,track_type:r%4===0?"OWNSHIP":r%4===1?"CONTACT":r%4===2?"REFERENCE":"SOLUTION",start_time:new Date(Date.now()-Math.random()*864e5).toISOString(),end_time:new Date().toISOString(),positions:[]}})}return{type:"FeatureCollection",features:n}}const ae=re(100),u={args:{features:ae,height:500},parameters:{docs:{description:{story:"Performance test with 100 tracks. Map should remain responsive."}}}},h={args:{features:{type:"FeatureCollection",features:[]},height:400,autoFitBounds:!1,initialCenter:[51.5,-.1],initialZoom:8},parameters:{docs:{description:{story:"Empty map with no features. Shows base tile layer only."}}}},g={args:{features:[q],height:400},parameters:{docs:{description:{story:"Single track feature auto-fitted to bounds."}}}},f={args:{features:c,height:500,tileLayerUrl:"https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",tileLayerAttribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'},parameters:{docs:{description:{story:"Map using a custom tile layer (CartoDB Light)."}}}},y={render:()=>e.jsx(Y,{theme:{variant:"dark"},children:e.jsx(l,{features:c,height:500})}),parameters:{backgrounds:{default:"dark"},docs:{description:{story:"Map with dark theme applied."}}}};function se(){const[t,n]=J.useState(new Set),r=(a,i)=>{n(s=>{const o=new Set(s);return i.ctrlKey||i.metaKey?o.has(a)?o.delete(a):o.add(a):(o.clear(),o.add(a)),o})},p=()=>{n(new Set)};return e.jsxs("div",{children:[e.jsxs("div",{style:{marginBottom:16},children:[e.jsxs("strong",{children:["Selected (",t.size,"):"]})," ",t.size>0?Array.from(t).join(", "):"None",e.jsx("br",{}),e.jsx("small",{children:"Hold Ctrl/Cmd to multi-select. Click background to clear."})]}),e.jsx(l,{features:c,selectedIds:t,onSelect:r,onBackgroundClick:p,height:500})]})}const S={render:()=>e.jsx(se,{}),parameters:{docs:{description:{story:"Multi-select features using Ctrl/Cmd+Click. Single click selects only that feature."}}}},k={render:()=>e.jsx(l,{features:c,onSelect:t=>console.log("Selected:",t)}),parameters:{docs:{description:{story:`
**Success Criteria SC-001**: Display a map with track features using 5 or fewer lines of code.

\`\`\`tsx
import { MapView } from '@debrief/components/MapView';

<MapView
  features={plotData}
  onSelect={(id) => console.log('Selected:', id)}
/>
\`\`\`
        `}}}};var M,x,T;d.parameters={...d.parameters,docs:{...(M=d.parameters)==null?void 0:M.docs,source:{originalSource:`{
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
}`,...(T=(x=d.parameters)==null?void 0:x.docs)==null?void 0:T.source}}};var D,L,b;m.parameters={...m.parameters,docs:{...(D=m.parameters)==null?void 0:D.docs,source:{originalSource:`{
  render: () => <SelectableMapExample />,
  parameters: {
    docs: {
      description: {
        story: 'Click on features to select them. Click background to clear selection.'
      }
    }
  }
}`,...(b=(L=m.parameters)==null?void 0:L.docs)==null?void 0:b.source}}};var j,_,E;u.parameters={...u.parameters,docs:{...(j=u.parameters)==null?void 0:j.docs,source:{originalSource:`{
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
}`,...(E=(_=u.parameters)==null?void 0:_.docs)==null?void 0:E.source}}};var A,O,P;h.parameters={...h.parameters,docs:{...(A=h.parameters)==null?void 0:A.docs,source:{originalSource:`{
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
}`,...(P=(O=h.parameters)==null?void 0:O.docs)==null?void 0:P.source}}};var v,F,N;g.parameters={...g.parameters,docs:{...(v=g.parameters)==null?void 0:v.docs,source:{originalSource:`{
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
}`,...(N=(F=g.parameters)==null?void 0:F.docs)==null?void 0:N.source}}};var B,I,V;f.parameters={...f.parameters,docs:{...(B=f.parameters)==null?void 0:B.docs,source:{originalSource:`{
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
}`,...(V=(I=f.parameters)==null?void 0:I.docs)==null?void 0:V.source}}};var R,Z,W;y.parameters={...y.parameters,docs:{...(R=y.parameters)==null?void 0:R.docs,source:{originalSource:`{
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
}`,...(W=(Z=y.parameters)==null?void 0:Z.docs)==null?void 0:W.source}}};var z,K,H;S.parameters={...S.parameters,docs:{...(z=S.parameters)==null?void 0:z.docs,source:{originalSource:`{
  render: () => <MultiSelectMapExample />,
  parameters: {
    docs: {
      description: {
        story: 'Multi-select features using Ctrl/Cmd+Click. Single click selects only that feature.'
      }
    }
  }
}`,...(H=(K=S.parameters)==null?void 0:K.docs)==null?void 0:H.source}}};var U,$,G;k.parameters={...k.parameters,docs:{...(U=k.parameters)==null?void 0:U.docs,source:{originalSource:`{
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
}`,...(G=($=k.parameters)==null?void 0:$.docs)==null?void 0:G.source}}};const he=["Default","WithSelection","LargeDataset","Empty","SingleTrack","CustomTileLayer","DarkTheme","MultiSelect","FiveLineExample"];export{f as CustomTileLayer,y as DarkTheme,d as Default,h as Empty,k as FiveLineExample,u as LargeDataset,S as MultiSelect,g as SingleTrack,m as WithSelection,he as __namedExportsOrder,ue as default};
