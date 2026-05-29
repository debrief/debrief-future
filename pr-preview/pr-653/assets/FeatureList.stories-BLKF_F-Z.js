import{j as r}from"./jsx-runtime-DF2Pcvd1.js";import{r as c}from"./index-B2-qRKKC.js";import{F as h}from"./FeatureList-Dc3A0TG2.js";import{s as $e,a as ze,b as Ue}from"./tools-B2FJeD6j.js";import{T as j}from"./ThemeProvider-DF0jq0Ad.js";import{D as Ye,i as Ke}from"./FilterDropdown-D8R_GT18.js";import{T as Ve,a as Xe}from"./types-CcWckdPZ.js";import{L as Qe}from"./LayersToolbar-Bc57yKCh.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./index-CHJUuggG.js";import"./index-kS-9iBlu.js";import"./labels-Bx3GzQt_.js";import"./applyClickToSelection-BH9K4Nvj.js";import"./defaultTheme-Tx6C8nph.js";import"./textfield-Dm39NdvL.js";const Ot={title:"Components/FeatureList",component:h,parameters:{layout:"padded",docs:{description:{component:"FeatureList displays a virtualized scrollable list of features with selection support. Uses @tanstack/react-virtual for efficient rendering of large datasets."}}},tags:["autodocs"],decorators:[t=>r.jsx(j,{children:r.jsx(t,{})})]};function f(t){const a=["OWNSHIP","CONTACT","REFERENCE","SOLUTION"],s=["HMS Victory","USS Constitution","Contact Alpha","Contact Bravo","Reference Point","Solution Track","Unknown Vessel","Patrol Boat"];return Array.from({length:t},(n,e)=>({type:"Feature",id:`track-${e.toString().padStart(3,"0")}`,geometry:{type:"LineString",coordinates:[[-5+e*.1,50],[-4+e*.1,51]]},properties:{kind:"TRACK",platform_id:`PLT-${e.toString().padStart(3,"0")}`,platform_name:`${s[e%s.length]} ${Math.floor(e/s.length)||""}`.trim(),track_type:a[e%4]??"CONTACT",start_time:new Date(Date.now()-Math.random()*864e5).toISOString(),end_time:new Date(Date.now()+Math.random()*864e5).toISOString(),positions:[]}}))}function Le(t){const a=["WAYPOINT","REFERENCE"],s=["Alpha Point","Bravo Marker","Charlie Station","Delta Buoy","Echo Reference","Foxtrot Position"];return Array.from({length:t},(n,e)=>({type:"Feature",id:`ref-${e.toString().padStart(3,"0")}`,geometry:{type:"Point",coordinates:[-3+e*.1,52+e*.05]},properties:{kind:"POINT",name:`${s[e%s.length]} ${Math.floor(e/s.length)||""}`.trim(),location_type:a[e%2]??"WAYPOINT",valid_from:"2024-01-15T00:00:00Z",valid_until:"2024-01-15T23:59:59Z"}}))}const Ae=f(5),Ee=Le(3),y={type:"FeatureCollection",features:[...Ae,...Ee]},R="01HZSB258000000000000000XX";function Oe(t,a){const s=Date.parse("2026-04-20T10:00:00Z");return Array.from({length:t},(n,e)=>({type:"Feature",id:`scene-${e.toString().padStart(3,"0")}`,geometry:{type:"Polygon",coordinates:[[[-1.5+e*.05,50.5],[-1.4+e*.05,50.5],[-1.4+e*.05,50.6],[-1.5+e*.05,50.6],[-1.5+e*.05,50.5]]]},properties:{kind:"STORYBOARD_SCENE",id:`01HZSC25800000000000000${String(e).padStart(2,"0")}`,storyboard_id:a,title:`Scene ${e+1} — ${new Date(s+e*6e4).toISOString().slice(11,19)}Z`,viewport:{center:[-1.25,50.55],zoom:11,bearing:0},timestamp:new Date(s+e*6e4).toISOString(),visible_feature_ids:[],feature_set_hash:"0".repeat(64),thumbnail_asset_ref:`thumb-${e}.png`,transition_duration_ms:500,display_mode:e%2===0?"trail":"full",_polygon_source:"bounds"}}))}function Z(t,a){return{type:"Feature",id:t,geometry:{type:"Polygon",coordinates:[[[-1.55,50.45],[-1.2,50.45],[-1.2,50.65],[-1.55,50.65],[-1.55,50.45]]]},properties:{kind:"STORYBOARD",id:t,name:a,schema_version:2}}}const qe={type:"FeatureCollection",features:[...f(2),Z(R,"Engagement Brief"),...Oe(5,R)]},Je={type:"FeatureCollection",features:[...f(2),Z(R,"Engagement Brief"),...Oe(5,R),Z("01HZSB259000000000000000XX","Empty Storyboard")]},S={args:{features:qe,height:360},parameters:{docs:{description:{story:"Spec #258 / US4 — each Storyboard renders as a single collapsible parent row with the scene count in a `(N)` badge. Scenes appear as indented children when the parent is expanded; otherwise they are hidden under the parent. Tracks continue to render at the top level alongside the storyboard parent."}}}},T={args:{features:Je,height:480},parameters:{docs:{description:{story:"Spec #258 — same fixture as `StoryboardGrouping` plus a second storyboard with zero scenes. The empty storyboard renders with `(0)` and a disabled chevron (FR-013), so authors can still see it exists."}}}},b={args:{features:y,height:300},parameters:{docs:{description:{story:"Basic feature list showing tracks and reference locations."}}}};function et(){const[t,a]=c.useState(new Set),s=n=>{a(e=>{const l=new Set(e);return l.has(n)?l.delete(n):l.add(n),l})};return r.jsxs("div",{children:[r.jsxs("div",{style:{marginBottom:16},children:[r.jsx("strong",{children:"Selected:"})," ",t.size>0?Array.from(t).join(", "):"None",t.size>0&&r.jsx("button",{onClick:()=>a(new Set),style:{marginLeft:12},children:"Clear"})]}),r.jsx(h,{features:y,selectedIds:t,onSelect:s,height:350})]})}const k={render:()=>r.jsx(et,{}),parameters:{docs:{description:{story:"Click on rows to select them. Click again to deselect."}}}},tt=f(1e3),w={args:{features:{type:"FeatureCollection",features:tt},height:400},parameters:{docs:{description:{story:"List with 1000 features demonstrating virtualization. Only visible rows are rendered for performance."}}}},_={args:{features:{type:"FeatureCollection",features:[]},height:200},parameters:{docs:{description:{story:"Empty feature list displays a helpful message."}}}};function rt(){const[t,a]=c.useState(!0),[s,n]=c.useState(!0),e=l=>{const p="track_type"in l.properties;return!(p&&!t||!p&&!s)};return r.jsxs("div",{children:[r.jsxs("div",{style:{marginBottom:16,display:"flex",gap:16},children:[r.jsxs("label",{children:[r.jsx("input",{type:"checkbox",checked:t,onChange:l=>a(l.target.checked)})," ","Show Tracks"]}),r.jsxs("label",{children:[r.jsx("input",{type:"checkbox",checked:s,onChange:l=>n(l.target.checked)})," ","Show Locations"]})]}),r.jsx(h,{features:y,filter:e,height:300})]})}const C={render:()=>r.jsx(rt,{}),parameters:{docs:{description:{story:"Feature list with filter controls to show/hide different feature types."}}}},F={args:{features:y,height:400,rowHeight:56},parameters:{docs:{description:{story:"Feature list with larger row height for better readability."}}}},x={render:()=>r.jsx(j,{theme:{variant:"dark"},children:r.jsx(h,{features:y,height:300})}),parameters:{backgrounds:{default:"dark"},docs:{description:{story:"Feature list with dark theme applied."}}}},st={type:"FeatureCollection",features:Ae},L={args:{features:st,height:250},parameters:{docs:{description:{story:"Feature list showing only track features with type badges."}}}},ot={type:"FeatureCollection",features:Ee},A={args:{features:ot,height:200},parameters:{docs:{description:{story:"Feature list showing only reference location features."}}}},at=f(12),nt=Le(4),g={type:"FeatureCollection",features:[...at,...nt]};function ve(){const[t,a]=c.useState(new Set),[s,n]=c.useState(()=>{const o=g.features.slice(2,4).map(d=>d.id);return new Set(o)}),[e,l]=c.useState(!0),[p,Re]=c.useState(Ye),[Ze,I]=c.useState(!1),[De,P]=c.useState(!1),M=c.useMemo(()=>new Ve($e),[]),je=c.useMemo(()=>Array.from(t),[t]),Ie=c.useMemo(()=>{const o={};for(const i of t){const u=g.features.find(m=>m.id===i);if(u){const m=u.properties.kind;o[m]=(o[m]||0)+1}}const d=Xe(o);return M.getMatchResults(d)},[t,M]),Pe=c.useMemo(()=>{const o=Ke(p),d=!e&&s.size>0;if(!(!o&&!d))return i=>{if(!e&&s.has(i.id))return!1;const u=i.properties.kind;if(u&&p.featureTypes[u]===!1)return!1;if(p.textQuery){const m=p.textQuery.toLowerCase();if(!("platform_name"in i.properties?i.properties.platform_name:"name"in i.properties?i.properties.name:i.id??"").toLowerCase().includes(m))return!1}return!0}},[p,e,s]),Me=o=>{a(o),I(!0)},Ne=o=>{o==="selectAll"?a(new Set(g.features.map(d=>d.id))):console.log("Apply to selection:",o)},We=o=>{console.log("Delete features:",o)},Be=o=>{n(d=>{const i=new Set(d);for(const u of o)i.has(u)?i.delete(u):i.add(u);return i})},He=(o,d)=>{console.log("Run tool:",o,"on features:",d),P(!0)},Ge=o=>{o==="run"&&I(!1),o==="associated"&&P(!1)};return r.jsxs("div",{style:{width:420},children:[r.jsx(Qe,{selectedFeatureIds:je,features:g.features,hiddenIds:s,toolMatches:Ie,sourceFiles:Ue,resultFiles:ze,toolsChanged:Ze,resultsChanged:De,filterState:p,showHidden:e,onDelete:We,onToggleVisibility:Be,onRunTool:He,onFilterChange:Re,onShowHiddenChange:l,onApplyToSelection:Ne,onFileAction:(o,d)=>console.log("File action:",d,o.name),onDropdownOpened:Ge}),r.jsx(h,{features:g,selectedIds:t,hiddenIds:s,onSelectionChange:Me,filter:Pe,height:350})]})}const E={render:()=>r.jsx(ve,{}),parameters:{docs:{description:{story:"FeatureList with LayersToolbar above. Select features to enable toolbar actions. Filter narrows the list. Run dropdown shows context-sensitive tools based on selection. Associated Files shows source/result files. Yellow halo appears on tool/result changes."}}}},O={render:()=>r.jsx(j,{theme:{variant:"dark"},children:r.jsx(ve,{})}),parameters:{backgrounds:{default:"dark"},docs:{description:{story:"Combined FeatureList + LayersToolbar in dark theme."}}}};function D(t,a=45){return Array.from({length:t},(s,n)=>({time:new Date(Date.UTC(2024,0,15,8,n*5,0)).toISOString(),bearing:(a+n*2)%360,...n===0&&t>5?{ambiguous_bearing:(a+180)%360}:{}}))}const it={type:"Feature",id:"case-a-simple",geometry:{type:"LineString",coordinates:[[-5,50],[-4,51]]},properties:{kind:"TRACK",platform_id:"PLT-A",platform_name:"Case A — Simple Track",track_type:"OWNSHIP",start_time:"2024-01-15T08:00:00Z",end_time:"2024-01-15T12:00:00Z",positions:[{time:"2024-01-15T08:00:00Z",course:90,speed:12.5},{time:"2024-01-15T09:00:00Z",course:95,speed:13},{time:"2024-01-15T10:00:00Z",course:100,speed:12}]}},ct={type:"Feature",id:"case-b-compound",geometry:{type:"LineString",coordinates:[[-5,50],[-4,51]]},properties:{kind:"TRACK",platform_id:"PLT-B",platform_name:"Case B — Compound (No Sensors)",track_type:"SOLUTION",start_time:"2024-01-15T08:00:00Z",end_time:"2024-01-15T12:00:00Z",positions:[],segments:[{segment_type:"TMA_SEGMENT",name:"leg-alpha",start_time:"2024-01-15T08:00:00Z",end_time:"2024-01-15T10:00:00Z",positions:[{time:"2024-01-15T08:00:00Z",course:45,speed:8},{time:"2024-01-15T09:00:00Z",course:50,speed:9}]},{segment_type:"TMA_SEGMENT",name:"leg-bravo",start_time:"2024-01-15T10:00:00Z",end_time:"2024-01-15T12:00:00Z",positions:[{time:"2024-01-15T10:00:00Z",course:120,speed:7}]}]}},dt={type:"Feature",id:"case-c-sensors",geometry:{type:"LineString",coordinates:[[-5,50],[-4,51]]},properties:{kind:"TRACK",platform_id:"PLT-C",platform_name:"Case C — Track with Sensors",track_type:"OWNSHIP",start_time:"2024-01-15T08:00:00Z",end_time:"2024-01-15T12:00:00Z",positions:[{time:"2024-01-15T08:00:00Z",course:90,speed:12.5},{time:"2024-01-15T09:00:00Z",course:95,speed:13},{time:"2024-01-15T10:00:00Z",course:100,speed:12}],sensors:[{name:"TOWED_ARRAY",contacts:D(42)},{name:"HULL_ARRAY",contacts:D(17,200)}]}},lt={type:"Feature",id:"case-d-compound-sensors",geometry:{type:"LineString",coordinates:[[-5,50],[-4,51]]},properties:{kind:"TRACK",platform_id:"PLT-D",platform_name:"Case D — Compound + Sensors",track_type:"SOLUTION",start_time:"2024-01-15T08:00:00Z",end_time:"2024-01-15T12:00:00Z",positions:[],segments:[{segment_type:"TMA_SEGMENT",name:"leg-one",start_time:"2024-01-15T08:00:00Z",end_time:"2024-01-15T10:00:00Z",positions:[{time:"2024-01-15T08:00:00Z",course:45,speed:8}]},{segment_type:"TMA_SEGMENT",name:"leg-two",start_time:"2024-01-15T10:00:00Z",end_time:"2024-01-15T12:00:00Z",positions:[{time:"2024-01-15T10:00:00Z",course:120,speed:7}]}],sensors:[{name:"BOW_ARRAY",contacts:D(8,90)}]}},pt={type:"Feature",id:"edge-cases",geometry:{type:"LineString",coordinates:[[-5,50],[-4,51]]},properties:{kind:"TRACK",platform_id:"PLT-E",platform_name:"Edge Cases — Zero/Ambiguous",track_type:"OWNSHIP",start_time:"2024-01-15T08:00:00Z",end_time:"2024-01-15T12:00:00Z",positions:[{time:"2024-01-15T08:00:00Z",course:0,speed:5}],sensors:[{name:"EMPTY_SENSOR",contacts:[]},{name:"AMBIGUOUS_SENSOR",contacts:[{time:"2024-01-15T08:00:00Z",bearing:45,ambiguous_bearing:225},{time:"2024-01-15T08:05:00Z",bearing:359}]}]}},ut={type:"FeatureCollection",features:[it,ct,dt,lt,pt]};function mt(){const[t,a]=c.useState(new Set);return r.jsxs("div",{children:[r.jsxs("div",{style:{marginBottom:16},children:[r.jsx("strong",{children:"Selected:"})," ",t.size>0?Array.from(t).join(", "):"None",t.size>0&&r.jsx("button",{onClick:()=>a(new Set),style:{marginLeft:12},children:"Clear"})]}),r.jsx(h,{features:ut,selectedIds:t,onSelectionChange:a,showInfoIcon:!0,onChildInfoClick:(s,n)=>{window.alert(`Info for: ${n.id}
Label: ${n.label}
Sublabel: ${n.sublabel??"n/a"}`)},height:500})]})}const v={render:()=>r.jsx(mt,{}),parameters:{docs:{description:{story:"All four layout cases for sensor-aware track rendering (#179). Case A: simple track (positions as direct children). Case B: compound track (Track Segments wrapper). Case C: simple track + sensors (Positions + Sensors groups). Case D: compound track + sensors (Track Segments + Sensors groups). Plus edge cases: zero-contact sensor, ambiguous bearing."}}}};var N,W,B;S.parameters={...S.parameters,docs:{...(N=S.parameters)==null?void 0:N.docs,source:{originalSource:`{
  args: {
    features: storyboardGroupingFeatures,
    height: 360
  },
  parameters: {
    docs: {
      description: {
        story: 'Spec #258 / US4 — each Storyboard renders as a single collapsible parent row with the scene count in a \`(N)\` badge. Scenes appear as indented children when the parent is expanded; otherwise they are hidden under the parent. Tracks continue to render at the top level alongside the storyboard parent.'
      }
    }
  }
}`,...(B=(W=S.parameters)==null?void 0:W.docs)==null?void 0:B.source}}};var H,G,$;T.parameters={...T.parameters,docs:{...(H=T.parameters)==null?void 0:H.docs,source:{originalSource:`{
  args: {
    features: storyboardGroupingExpandedFeatures,
    height: 480
  },
  parameters: {
    docs: {
      description: {
        story: 'Spec #258 — same fixture as \`StoryboardGrouping\` plus a second storyboard with zero scenes. The empty storyboard renders with \`(0)\` and a disabled chevron (FR-013), so authors can still see it exists.'
      }
    }
  }
}`,...($=(G=T.parameters)==null?void 0:G.docs)==null?void 0:$.source}}};var z,U,Y;b.parameters={...b.parameters,docs:{...(z=b.parameters)==null?void 0:z.docs,source:{originalSource:`{
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
}`,...(Y=(U=b.parameters)==null?void 0:U.docs)==null?void 0:Y.source}}};var K,V,X;k.parameters={...k.parameters,docs:{...(K=k.parameters)==null?void 0:K.docs,source:{originalSource:`{
  render: () => <SelectableListExample />,
  parameters: {
    docs: {
      description: {
        story: 'Click on rows to select them. Click again to deselect.'
      }
    }
  }
}`,...(X=(V=k.parameters)==null?void 0:V.docs)==null?void 0:X.source}}};var Q,q,J;w.parameters={...w.parameters,docs:{...(Q=w.parameters)==null?void 0:Q.docs,source:{originalSource:`{
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
}`,...(J=(q=w.parameters)==null?void 0:q.docs)==null?void 0:J.source}}};var ee,te,re;_.parameters={..._.parameters,docs:{...(ee=_.parameters)==null?void 0:ee.docs,source:{originalSource:`{
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
}`,...(re=(te=_.parameters)==null?void 0:te.docs)==null?void 0:re.source}}};var se,oe,ae;C.parameters={...C.parameters,docs:{...(se=C.parameters)==null?void 0:se.docs,source:{originalSource:`{
  render: () => <FilteredListExample />,
  parameters: {
    docs: {
      description: {
        story: 'Feature list with filter controls to show/hide different feature types.'
      }
    }
  }
}`,...(ae=(oe=C.parameters)==null?void 0:oe.docs)==null?void 0:ae.source}}};var ne,ie,ce;F.parameters={...F.parameters,docs:{...(ne=F.parameters)==null?void 0:ne.docs,source:{originalSource:`{
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
}`,...(ce=(ie=F.parameters)==null?void 0:ie.docs)==null?void 0:ce.source}}};var de,le,pe;x.parameters={...x.parameters,docs:{...(de=x.parameters)==null?void 0:de.docs,source:{originalSource:`{
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
}`,...(pe=(le=x.parameters)==null?void 0:le.docs)==null?void 0:pe.source}}};var ue,me,he;L.parameters={...L.parameters,docs:{...(ue=L.parameters)==null?void 0:ue.docs,source:{originalSource:`{
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
}`,...(he=(me=L.parameters)==null?void 0:me.docs)==null?void 0:he.source}}};var ge,fe,ye;A.parameters={...A.parameters,docs:{...(ge=A.parameters)==null?void 0:ge.docs,source:{originalSource:`{
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
}`,...(ye=(fe=A.parameters)==null?void 0:fe.docs)==null?void 0:ye.source}}};var Se,Te,be;E.parameters={...E.parameters,docs:{...(Se=E.parameters)==null?void 0:Se.docs,source:{originalSource:`{
  render: () => <FeatureListWithToolbarExample />,
  parameters: {
    docs: {
      description: {
        story: 'FeatureList with LayersToolbar above. Select features to enable toolbar actions. ' + 'Filter narrows the list. Run dropdown shows context-sensitive tools based on selection. ' + 'Associated Files shows source/result files. Yellow halo appears on tool/result changes.'
      }
    }
  }
}`,...(be=(Te=E.parameters)==null?void 0:Te.docs)==null?void 0:be.source}}};var ke,we,_e;O.parameters={...O.parameters,docs:{...(ke=O.parameters)==null?void 0:ke.docs,source:{originalSource:`{
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
}`,...(_e=(we=O.parameters)==null?void 0:we.docs)==null?void 0:_e.source}}};var Ce,Fe,xe;v.parameters={...v.parameters,docs:{...(Ce=v.parameters)==null?void 0:Ce.docs,source:{originalSource:`{
  render: () => <TracksWithSensorsExample />,
  parameters: {
    docs: {
      description: {
        story: 'All four layout cases for sensor-aware track rendering (#179). ' + 'Case A: simple track (positions as direct children). ' + 'Case B: compound track (Track Segments wrapper). ' + 'Case C: simple track + sensors (Positions + Sensors groups). ' + 'Case D: compound track + sensors (Track Segments + Sensors groups). ' + 'Plus edge cases: zero-contact sensor, ambiguous bearing.'
      }
    }
  }
}`,...(xe=(Fe=v.parameters)==null?void 0:Fe.docs)==null?void 0:xe.source}}};const vt=["StoryboardGrouping","StoryboardGroupingExpanded","Default","WithSelection","ManyFeatures","Empty","WithFilter","CustomRowHeight","DarkTheme","TracksOnly","LocationsOnly","WithToolbar","WithToolbarDarkTheme","TracksWithSensors"];export{F as CustomRowHeight,x as DarkTheme,b as Default,_ as Empty,A as LocationsOnly,w as ManyFeatures,S as StoryboardGrouping,T as StoryboardGroupingExpanded,L as TracksOnly,v as TracksWithSensors,C as WithFilter,k as WithSelection,E as WithToolbar,O as WithToolbarDarkTheme,vt as __namedExportsOrder,Ot as default};
