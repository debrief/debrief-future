import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r as c}from"./index-B2-qRKKC.js";import{F as h}from"./FeatureList-DA8uwcCT.js";import{s as je,a as Re,b as De}from"./tools-B2FJeD6j.js";import{T as O}from"./ThemeProvider-DF0jq0Ad.js";import{D as Ie,i as Pe}from"./FilterDropdown-D8R_GT18.js";import{T as Me,a as We}from"./types-CcWckdPZ.js";import{L as Ne}from"./LayersToolbar-Bc57yKCh.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./index-CHJUuggG.js";import"./index-kS-9iBlu.js";import"./labels-D5TLrMt1.js";import"./defaultTheme-Tx6C8nph.js";import"./textfield-Dm39NdvL.js";const ft={title:"Components/FeatureList",component:h,parameters:{layout:"padded",docs:{description:{component:"FeatureList displays a virtualized scrollable list of features with selection support. Uses @tanstack/react-virtual for efficient rendering of large datasets."}}},tags:["autodocs"],decorators:[t=>e.jsx(O,{children:e.jsx(t,{})})]};function v(t){const a=["OWNSHIP","CONTACT","REFERENCE","SOLUTION"],o=["HMS Victory","USS Constitution","Contact Alpha","Contact Bravo","Reference Point","Solution Track","Unknown Vessel","Patrol Boat"];return Array.from({length:t},(n,s)=>({type:"Feature",id:`track-${s.toString().padStart(3,"0")}`,geometry:{type:"LineString",coordinates:[[-5+s*.1,50],[-4+s*.1,51]]},properties:{kind:"TRACK",platform_id:`PLT-${s.toString().padStart(3,"0")}`,platform_name:`${o[s%o.length]} ${Math.floor(s/o.length)||""}`.trim(),track_type:a[s%4]??"CONTACT",start_time:new Date(Date.now()-Math.random()*864e5).toISOString(),end_time:new Date(Date.now()+Math.random()*864e5).toISOString(),positions:[]}}))}function ye(t){const a=["WAYPOINT","REFERENCE"],o=["Alpha Point","Bravo Marker","Charlie Station","Delta Buoy","Echo Reference","Foxtrot Position"];return Array.from({length:t},(n,s)=>({type:"Feature",id:`ref-${s.toString().padStart(3,"0")}`,geometry:{type:"Point",coordinates:[-3+s*.1,52+s*.05]},properties:{kind:"POINT",name:`${o[s%o.length]} ${Math.floor(s/o.length)||""}`.trim(),location_type:a[s%2]??"WAYPOINT",valid_from:"2024-01-15T00:00:00Z",valid_until:"2024-01-15T23:59:59Z"}}))}const Te=v(5),Se=ye(3),f={type:"FeatureCollection",features:[...Te,...Se]},y={args:{features:f,height:300},parameters:{docs:{description:{story:"Basic feature list showing tracks and reference locations."}}}};function Be(){const[t,a]=c.useState(new Set),o=n=>{a(s=>{const d=new Set(s);return d.has(n)?d.delete(n):d.add(n),d})};return e.jsxs("div",{children:[e.jsxs("div",{style:{marginBottom:16},children:[e.jsx("strong",{children:"Selected:"})," ",t.size>0?Array.from(t).join(", "):"None",t.size>0&&e.jsx("button",{onClick:()=>a(new Set),style:{marginLeft:12},children:"Clear"})]}),e.jsx(h,{features:f,selectedIds:t,onSelect:o,height:350})]})}const T={render:()=>e.jsx(Be,{}),parameters:{docs:{description:{story:"Click on rows to select them. Click again to deselect."}}}},He=v(1e3),S={args:{features:{type:"FeatureCollection",features:He},height:400},parameters:{docs:{description:{story:"List with 1000 features demonstrating virtualization. Only visible rows are rendered for performance."}}}},k={args:{features:{type:"FeatureCollection",features:[]},height:200},parameters:{docs:{description:{story:"Empty feature list displays a helpful message."}}}};function Ue(){const[t,a]=c.useState(!0),[o,n]=c.useState(!0),s=d=>{const p="track_type"in d.properties;return!(p&&!t||!p&&!o)};return e.jsxs("div",{children:[e.jsxs("div",{style:{marginBottom:16,display:"flex",gap:16},children:[e.jsxs("label",{children:[e.jsx("input",{type:"checkbox",checked:t,onChange:d=>a(d.target.checked)})," ","Show Tracks"]}),e.jsxs("label",{children:[e.jsx("input",{type:"checkbox",checked:o,onChange:d=>n(d.target.checked)})," ","Show Locations"]})]}),e.jsx(h,{features:f,filter:s,height:300})]})}const w={render:()=>e.jsx(Ue,{}),parameters:{docs:{description:{story:"Feature list with filter controls to show/hide different feature types."}}}},C={args:{features:f,height:400,rowHeight:56},parameters:{docs:{description:{story:"Feature list with larger row height for better readability."}}}},F={render:()=>e.jsx(O,{theme:{variant:"dark"},children:e.jsx(h,{features:f,height:300})}),parameters:{backgrounds:{default:"dark"},docs:{description:{story:"Feature list with dark theme applied."}}}},ze={type:"FeatureCollection",features:Te},b={args:{features:ze,height:250},parameters:{docs:{description:{story:"Feature list showing only track features with type badges."}}}},$e={type:"FeatureCollection",features:Se},_={args:{features:$e,height:200},parameters:{docs:{description:{story:"Feature list showing only reference location features."}}}},Ye=v(12),Ke=ye(4),g={type:"FeatureCollection",features:[...Ye,...Ke]};function ke(){const[t,a]=c.useState(new Set),[o,n]=c.useState(()=>{const r=g.features.slice(2,4).map(l=>l.id);return new Set(r)}),[s,d]=c.useState(!0),[p,we]=c.useState(Ie),[Ce,Z]=c.useState(!1),[Fe,j]=c.useState(!1),R=c.useMemo(()=>new Me(je),[]),be=c.useMemo(()=>Array.from(t),[t]),_e=c.useMemo(()=>{const r={};for(const i of t){const m=g.features.find(u=>u.id===i);if(m){const u=m.properties.kind;r[u]=(r[u]||0)+1}}const l=We(r);return R.getMatchResults(l)},[t,R]),Le=c.useMemo(()=>{const r=Pe(p),l=!s&&o.size>0;if(!(!r&&!l))return i=>{if(!s&&o.has(i.id))return!1;const m=i.properties.kind;if(m&&p.featureTypes[m]===!1)return!1;if(p.textQuery){const u=p.textQuery.toLowerCase();if(!("platform_name"in i.properties?i.properties.platform_name:"name"in i.properties?i.properties.name:i.id??"").toLowerCase().includes(u))return!1}return!0}},[p,s,o]),xe=r=>{a(r),Z(!0)},Ae=r=>{r==="selectAll"?a(new Set(g.features.map(l=>l.id))):console.log("Apply to selection:",r)},Ee=r=>{console.log("Delete features:",r)},Oe=r=>{n(l=>{const i=new Set(l);for(const m of r)i.has(m)?i.delete(m):i.add(m);return i})},ve=(r,l)=>{console.log("Run tool:",r,"on features:",l),j(!0)},Ze=r=>{r==="run"&&Z(!1),r==="associated"&&j(!1)};return e.jsxs("div",{style:{width:420},children:[e.jsx(Ne,{selectedFeatureIds:be,features:g.features,hiddenIds:o,toolMatches:_e,sourceFiles:De,resultFiles:Re,toolsChanged:Ce,resultsChanged:Fe,filterState:p,showHidden:s,onDelete:Ee,onToggleVisibility:Oe,onRunTool:ve,onFilterChange:we,onShowHiddenChange:d,onApplyToSelection:Ae,onFileAction:(r,l)=>console.log("File action:",l,r.name),onDropdownOpened:Ze}),e.jsx(h,{features:g,selectedIds:t,hiddenIds:o,onSelectionChange:xe,filter:Le,height:350})]})}const L={render:()=>e.jsx(ke,{}),parameters:{docs:{description:{story:"FeatureList with LayersToolbar above. Select features to enable toolbar actions. Filter narrows the list. Run dropdown shows context-sensitive tools based on selection. Associated Files shows source/result files. Yellow halo appears on tool/result changes."}}}},x={render:()=>e.jsx(O,{theme:{variant:"dark"},children:e.jsx(ke,{})}),parameters:{backgrounds:{default:"dark"},docs:{description:{story:"Combined FeatureList + LayersToolbar in dark theme."}}}};function E(t,a=45){return Array.from({length:t},(o,n)=>({time:new Date(Date.UTC(2024,0,15,8,n*5,0)).toISOString(),bearing:(a+n*2)%360,...n===0&&t>5?{ambiguous_bearing:(a+180)%360}:{}}))}const Ge={type:"Feature",id:"case-a-simple",geometry:{type:"LineString",coordinates:[[-5,50],[-4,51]]},properties:{kind:"TRACK",platform_id:"PLT-A",platform_name:"Case A — Simple Track",track_type:"OWNSHIP",start_time:"2024-01-15T08:00:00Z",end_time:"2024-01-15T12:00:00Z",positions:[{time:"2024-01-15T08:00:00Z",course:90,speed:12.5},{time:"2024-01-15T09:00:00Z",course:95,speed:13},{time:"2024-01-15T10:00:00Z",course:100,speed:12}]}},Ve={type:"Feature",id:"case-b-compound",geometry:{type:"LineString",coordinates:[[-5,50],[-4,51]]},properties:{kind:"TRACK",platform_id:"PLT-B",platform_name:"Case B — Compound (No Sensors)",track_type:"SOLUTION",start_time:"2024-01-15T08:00:00Z",end_time:"2024-01-15T12:00:00Z",positions:[],segments:[{segment_type:"TMA_SEGMENT",name:"leg-alpha",start_time:"2024-01-15T08:00:00Z",end_time:"2024-01-15T10:00:00Z",positions:[{time:"2024-01-15T08:00:00Z",course:45,speed:8},{time:"2024-01-15T09:00:00Z",course:50,speed:9}]},{segment_type:"TMA_SEGMENT",name:"leg-bravo",start_time:"2024-01-15T10:00:00Z",end_time:"2024-01-15T12:00:00Z",positions:[{time:"2024-01-15T10:00:00Z",course:120,speed:7}]}]}},Qe={type:"Feature",id:"case-c-sensors",geometry:{type:"LineString",coordinates:[[-5,50],[-4,51]]},properties:{kind:"TRACK",platform_id:"PLT-C",platform_name:"Case C — Track with Sensors",track_type:"OWNSHIP",start_time:"2024-01-15T08:00:00Z",end_time:"2024-01-15T12:00:00Z",positions:[{time:"2024-01-15T08:00:00Z",course:90,speed:12.5},{time:"2024-01-15T09:00:00Z",course:95,speed:13},{time:"2024-01-15T10:00:00Z",course:100,speed:12}],sensors:[{name:"TOWED_ARRAY",contacts:E(42)},{name:"HULL_ARRAY",contacts:E(17,200)}]}},qe={type:"Feature",id:"case-d-compound-sensors",geometry:{type:"LineString",coordinates:[[-5,50],[-4,51]]},properties:{kind:"TRACK",platform_id:"PLT-D",platform_name:"Case D — Compound + Sensors",track_type:"SOLUTION",start_time:"2024-01-15T08:00:00Z",end_time:"2024-01-15T12:00:00Z",positions:[],segments:[{segment_type:"TMA_SEGMENT",name:"leg-one",start_time:"2024-01-15T08:00:00Z",end_time:"2024-01-15T10:00:00Z",positions:[{time:"2024-01-15T08:00:00Z",course:45,speed:8}]},{segment_type:"TMA_SEGMENT",name:"leg-two",start_time:"2024-01-15T10:00:00Z",end_time:"2024-01-15T12:00:00Z",positions:[{time:"2024-01-15T10:00:00Z",course:120,speed:7}]}],sensors:[{name:"BOW_ARRAY",contacts:E(8,90)}]}},Je={type:"Feature",id:"edge-cases",geometry:{type:"LineString",coordinates:[[-5,50],[-4,51]]},properties:{kind:"TRACK",platform_id:"PLT-E",platform_name:"Edge Cases — Zero/Ambiguous",track_type:"OWNSHIP",start_time:"2024-01-15T08:00:00Z",end_time:"2024-01-15T12:00:00Z",positions:[{time:"2024-01-15T08:00:00Z",course:0,speed:5}],sensors:[{name:"EMPTY_SENSOR",contacts:[]},{name:"AMBIGUOUS_SENSOR",contacts:[{time:"2024-01-15T08:00:00Z",bearing:45,ambiguous_bearing:225},{time:"2024-01-15T08:05:00Z",bearing:359}]}]}},Xe={type:"FeatureCollection",features:[Ge,Ve,Qe,qe,Je]};function et(){const[t,a]=c.useState(new Set);return e.jsxs("div",{children:[e.jsxs("div",{style:{marginBottom:16},children:[e.jsx("strong",{children:"Selected:"})," ",t.size>0?Array.from(t).join(", "):"None",t.size>0&&e.jsx("button",{onClick:()=>a(new Set),style:{marginLeft:12},children:"Clear"})]}),e.jsx(h,{features:Xe,selectedIds:t,onSelectionChange:a,showInfoIcon:!0,onChildInfoClick:(o,n)=>{window.alert(`Info for: ${n.id}
Label: ${n.label}
Sublabel: ${n.sublabel??"n/a"}`)},height:500})]})}const A={render:()=>e.jsx(et,{}),parameters:{docs:{description:{story:"All four layout cases for sensor-aware track rendering (#179). Case A: simple track (positions as direct children). Case B: compound track (Track Segments wrapper). Case C: simple track + sensors (Positions + Sensors groups). Case D: compound track + sensors (Track Segments + Sensors groups). Plus edge cases: zero-contact sensor, ambiguous bearing."}}}};var D,I,P;y.parameters={...y.parameters,docs:{...(D=y.parameters)==null?void 0:D.docs,source:{originalSource:`{
  args: {
    features: sampleData,
    height: 300
  },
  parameters: {
    docs: {
      description: {
        story: 'Basic feature list showing tracks and reference locations.'
      }
    }
  }
}`,...(P=(I=y.parameters)==null?void 0:I.docs)==null?void 0:P.source}}};var M,W,N;T.parameters={...T.parameters,docs:{...(M=T.parameters)==null?void 0:M.docs,source:{originalSource:`{
  render: () => <SelectableListExample />,
  parameters: {
    docs: {
      description: {
        story: 'Click on rows to select them. Click again to deselect.'
      }
    }
  }
}`,...(N=(W=T.parameters)==null?void 0:W.docs)==null?void 0:N.source}}};var B,H,U;S.parameters={...S.parameters,docs:{...(B=S.parameters)==null?void 0:B.docs,source:{originalSource:`{
  args: {
    features: {
      type: 'FeatureCollection',
      features: manyFeatures
    },
    height: 400
  },
  parameters: {
    docs: {
      description: {
        story: 'List with 1000 features demonstrating virtualization. Only visible rows are rendered for performance.'
      }
    }
  }
}`,...(U=(H=S.parameters)==null?void 0:H.docs)==null?void 0:U.source}}};var z,$,Y;k.parameters={...k.parameters,docs:{...(z=k.parameters)==null?void 0:z.docs,source:{originalSource:`{
  args: {
    features: {
      type: 'FeatureCollection',
      features: []
    },
    height: 200
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty feature list displays a helpful message.'
      }
    }
  }
}`,...(Y=($=k.parameters)==null?void 0:$.docs)==null?void 0:Y.source}}};var K,G,V;w.parameters={...w.parameters,docs:{...(K=w.parameters)==null?void 0:K.docs,source:{originalSource:`{
  render: () => <FilteredListExample />,
  parameters: {
    docs: {
      description: {
        story: 'Feature list with filter controls to show/hide different feature types.'
      }
    }
  }
}`,...(V=(G=w.parameters)==null?void 0:G.docs)==null?void 0:V.source}}};var Q,q,J;C.parameters={...C.parameters,docs:{...(Q=C.parameters)==null?void 0:Q.docs,source:{originalSource:`{
  args: {
    features: sampleData,
    height: 400,
    rowHeight: 56
  },
  parameters: {
    docs: {
      description: {
        story: 'Feature list with larger row height for better readability.'
      }
    }
  }
}`,...(J=(q=C.parameters)==null?void 0:q.docs)==null?void 0:J.source}}};var X,ee,te;F.parameters={...F.parameters,docs:{...(X=F.parameters)==null?void 0:X.docs,source:{originalSource:`{
  render: () => <ThemeProvider theme={{
    variant: 'dark'
  }}>
      <FeatureList features={sampleData} height={300} />
    </ThemeProvider>,
  parameters: {
    backgrounds: {
      default: 'dark'
    },
    docs: {
      description: {
        story: 'Feature list with dark theme applied.'
      }
    }
  }
}`,...(te=(ee=F.parameters)==null?void 0:ee.docs)==null?void 0:te.source}}};var se,re,oe;b.parameters={...b.parameters,docs:{...(se=b.parameters)==null?void 0:se.docs,source:{originalSource:`{
  args: {
    features: tracksOnly,
    height: 250
  },
  parameters: {
    docs: {
      description: {
        story: 'Feature list showing only track features with type badges.'
      }
    }
  }
}`,...(oe=(re=b.parameters)==null?void 0:re.docs)==null?void 0:oe.source}}};var ae,ne,ie;_.parameters={..._.parameters,docs:{...(ae=_.parameters)==null?void 0:ae.docs,source:{originalSource:`{
  args: {
    features: locationsOnly,
    height: 200
  },
  parameters: {
    docs: {
      description: {
        story: 'Feature list showing only reference location features.'
      }
    }
  }
}`,...(ie=(ne=_.parameters)==null?void 0:ne.docs)==null?void 0:ie.source}}};var ce,le,de;L.parameters={...L.parameters,docs:{...(ce=L.parameters)==null?void 0:ce.docs,source:{originalSource:`{
  render: () => <FeatureListWithToolbarExample />,
  parameters: {
    docs: {
      description: {
        story: 'FeatureList with LayersToolbar above. Select features to enable toolbar actions. ' + 'Filter narrows the list. Run dropdown shows context-sensitive tools based on selection. ' + 'Associated Files shows source/result files. Yellow halo appears on tool/result changes.'
      }
    }
  }
}`,...(de=(le=L.parameters)==null?void 0:le.docs)==null?void 0:de.source}}};var pe,me,ue;x.parameters={...x.parameters,docs:{...(pe=x.parameters)==null?void 0:pe.docs,source:{originalSource:`{
  render: () => <ThemeProvider theme={{
    variant: 'dark'
  }}>
      <FeatureListWithToolbarExample />
    </ThemeProvider>,
  parameters: {
    backgrounds: {
      default: 'dark'
    },
    docs: {
      description: {
        story: 'Combined FeatureList + LayersToolbar in dark theme.'
      }
    }
  }
}`,...(ue=(me=x.parameters)==null?void 0:me.docs)==null?void 0:ue.source}}};var he,ge,fe;A.parameters={...A.parameters,docs:{...(he=A.parameters)==null?void 0:he.docs,source:{originalSource:`{
  render: () => <TracksWithSensorsExample />,
  parameters: {
    docs: {
      description: {
        story: 'All four layout cases for sensor-aware track rendering (#179). ' + 'Case A: simple track (positions as direct children). ' + 'Case B: compound track (Track Segments wrapper). ' + 'Case C: simple track + sensors (Positions + Sensors groups). ' + 'Case D: compound track + sensors (Track Segments + Sensors groups). ' + 'Plus edge cases: zero-contact sensor, ambiguous bearing.'
      }
    }
  }
}`,...(fe=(ge=A.parameters)==null?void 0:ge.docs)==null?void 0:fe.source}}};const yt=["Default","WithSelection","ManyFeatures","Empty","WithFilter","CustomRowHeight","DarkTheme","TracksOnly","LocationsOnly","WithToolbar","WithToolbarDarkTheme","TracksWithSensors"];export{C as CustomRowHeight,F as DarkTheme,y as Default,k as Empty,_ as LocationsOnly,S as ManyFeatures,b as TracksOnly,A as TracksWithSensors,w as WithFilter,T as WithSelection,L as WithToolbar,x as WithToolbarDarkTheme,yt as __namedExportsOrder,ft as default};
