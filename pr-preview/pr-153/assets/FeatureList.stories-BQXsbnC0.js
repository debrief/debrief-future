import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r as i}from"./index-B2-qRKKC.js";import{F as f}from"./FeatureList-VHlyJxe3.js";import{s as je,a as Ee,b as De}from"./tools-B2FJeD6j.js";import{T as j}from"./ThemeProvider-mvcGjblv.js";import{D as Oe,i as Ae}from"./FilterDropdown-BgyHQuSK.js";import{T as Re,c as _e}from"./types-j4WT0IKY.js";import{L as Me}from"./LayersToolbar-BUs0gzzD.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./index-kS-9iBlu.js";import"./labels-KoqjLXr8.js";import"./textfield-Dm39NdvL.js";const rt={title:"Components/FeatureList",component:f,parameters:{layout:"padded",docs:{description:{component:"FeatureList displays a virtualized scrollable list of features with selection support. Uses @tanstack/react-virtual for efficient rendering of large datasets."}}},tags:["autodocs"],decorators:[s=>e.jsx(j,{children:e.jsx(s,{})})]};function E(s){const l=["OWNSHIP","CONTACT","REFERENCE","SOLUTION"],o=["HMS Victory","USS Constitution","Contact Alpha","Contact Bravo","Reference Point","Solution Track","Unknown Vessel","Patrol Boat"];return Array.from({length:s},(d,t)=>({type:"Feature",id:`track-${t.toString().padStart(3,"0")}`,geometry:{type:"LineString",coordinates:[[-5+t*.1,50],[-4+t*.1,51]]},properties:{kind:"TRACK",platform_id:`PLT-${t.toString().padStart(3,"0")}`,platform_name:`${o[t%o.length]} ${Math.floor(t/o.length)||""}`.trim(),track_type:l[t%4]??"CONTACT",start_time:new Date(Date.now()-Math.random()*864e5).toISOString(),end_time:new Date(Date.now()+Math.random()*864e5).toISOString(),positions:[]}}))}function ue(s){const l=["WAYPOINT","REFERENCE"],o=["Alpha Point","Bravo Marker","Charlie Station","Delta Buoy","Echo Reference","Foxtrot Position"];return Array.from({length:s},(d,t)=>({type:"Feature",id:`ref-${t.toString().padStart(3,"0")}`,geometry:{type:"Point",coordinates:[-3+t*.1,52+t*.05]},properties:{kind:"POINT",name:`${o[t%o.length]} ${Math.floor(t/o.length)||""}`.trim(),location_type:l[t%2]??"WAYPOINT",valid_from:"2024-01-15T00:00:00Z",valid_until:"2024-01-15T23:59:59Z"}}))}const me=E(5),he=ue(3),g={type:"FeatureCollection",features:[...me,...he]},y={args:{features:g,height:300},parameters:{docs:{description:{story:"Basic feature list showing tracks and reference locations."}}}};function Ie(){const[s,l]=i.useState(new Set),o=d=>{l(t=>{const c=new Set(t);return c.has(d)?c.delete(d):c.add(d),c})};return e.jsxs("div",{children:[e.jsxs("div",{style:{marginBottom:16},children:[e.jsx("strong",{children:"Selected:"})," ",s.size>0?Array.from(s).join(", "):"None",s.size>0&&e.jsx("button",{onClick:()=>l(new Set),style:{marginLeft:12},children:"Clear"})]}),e.jsx(f,{features:g,selectedIds:s,onSelect:o,height:350})]})}const S={render:()=>e.jsx(Ie,{}),parameters:{docs:{description:{story:"Click on rows to select them. Click again to deselect."}}}},Pe=E(1e3),w={args:{features:{type:"FeatureCollection",features:Pe},height:400},parameters:{docs:{description:{story:"List with 1000 features demonstrating virtualization. Only visible rows are rendered for performance."}}}},F={args:{features:{type:"FeatureCollection",features:[]},height:200},parameters:{docs:{description:{story:"Empty feature list displays a helpful message."}}}};function We(){const[s,l]=i.useState(!0),[o,d]=i.useState(!0),t=c=>{const p="track_type"in c.properties;return!(p&&!s||!p&&!o)};return e.jsxs("div",{children:[e.jsxs("div",{style:{marginBottom:16,display:"flex",gap:16},children:[e.jsxs("label",{children:[e.jsx("input",{type:"checkbox",checked:s,onChange:c=>l(c.target.checked)})," ","Show Tracks"]}),e.jsxs("label",{children:[e.jsx("input",{type:"checkbox",checked:o,onChange:c=>d(c.target.checked)})," ","Show Locations"]})]}),e.jsx(f,{features:g,filter:t,height:300})]})}const T={render:()=>e.jsx(We,{}),parameters:{docs:{description:{story:"Feature list with filter controls to show/hide different feature types."}}}},k={args:{features:g,height:400,rowHeight:56},parameters:{docs:{description:{story:"Feature list with larger row height for better readability."}}}},b={render:()=>e.jsx(j,{theme:{variant:"dark"},children:e.jsx(f,{features:g,height:300})}),parameters:{backgrounds:{default:"dark"},docs:{description:{story:"Feature list with dark theme applied."}}}},He={type:"FeatureCollection",features:me},x={args:{features:He,height:250},parameters:{docs:{description:{story:"Feature list showing only track features with type badges."}}}},Ne={type:"FeatureCollection",features:he},C={args:{features:Ne,height:200},parameters:{docs:{description:{story:"Feature list showing only reference location features."}}}},Be=E(12),$e=ue(4),h={type:"FeatureCollection",features:[...Be,...$e]};function fe(){const[s,l]=i.useState(new Set),[o,d]=i.useState(()=>{const r=h.features.slice(2,4).map(n=>n.id);return new Set(r)}),[t,c]=i.useState(!0),[p,ge]=i.useState(Oe),[ye,D]=i.useState(!1),[Se,O]=i.useState(!1),A=i.useMemo(()=>new Re(je),[]),we=i.useMemo(()=>Array.from(s),[s]),Fe=i.useMemo(()=>{const r={};for(const a of s){const u=h.features.find(m=>m.id===a);if(u){const m=u.properties.kind;r[m]=(r[m]||0)+1}}const n=_e(r);return A.getMatchResults(n)},[s,A]),Te=i.useMemo(()=>{const r=Ae(p),n=!t&&o.size>0;if(!(!r&&!n))return a=>{if(!t&&o.has(a.id))return!1;const u=a.properties.kind;if(u&&p.featureTypes[u]===!1)return!1;if(p.textQuery){const m=p.textQuery.toLowerCase();if(!("platform_name"in a.properties?a.properties.platform_name:"name"in a.properties?a.properties.name:a.id??"").toLowerCase().includes(m))return!1}return!0}},[p,t,o]),ke=r=>{l(r),D(!0)},be=r=>{r==="selectAll"?l(new Set(h.features.map(n=>n.id))):console.log("Apply to selection:",r)},xe=r=>{console.log("Delete features:",r)},Ce=r=>{d(n=>{const a=new Set(n);for(const u of r)a.has(u)?a.delete(u):a.add(u);return a})},Le=(r,n)=>{console.log("Run tool:",r,"on features:",n),O(!0)},ve=r=>{r==="run"&&D(!1),r==="associated"&&O(!1)};return e.jsxs("div",{style:{width:420},children:[e.jsx(Me,{selectedFeatureIds:we,features:h.features,hiddenIds:o,toolMatches:Fe,sourceFiles:De,resultFiles:Ee,toolsChanged:ye,resultsChanged:Se,filterState:p,showHidden:t,onDelete:xe,onToggleVisibility:Ce,onRunTool:Le,onFilterChange:ge,onShowHiddenChange:c,onApplyToSelection:be,onFileAction:(r,n)=>console.log("File action:",n,r.name),onDropdownOpened:ve}),e.jsx(f,{features:h,selectedIds:s,hiddenIds:o,onSelectionChange:ke,filter:Te,height:350})]})}const L={render:()=>e.jsx(fe,{}),parameters:{docs:{description:{story:"FeatureList with LayersToolbar above. Select features to enable toolbar actions. Filter narrows the list. Run dropdown shows context-sensitive tools based on selection. Associated Files shows source/result files. Yellow halo appears on tool/result changes."}}}},v={render:()=>e.jsx(j,{theme:{variant:"dark"},children:e.jsx(fe,{})}),parameters:{backgrounds:{default:"dark"},docs:{description:{story:"Combined FeatureList + LayersToolbar in dark theme."}}}};var R,_,M;y.parameters={...y.parameters,docs:{...(R=y.parameters)==null?void 0:R.docs,source:{originalSource:`{
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
}`,...(M=(_=y.parameters)==null?void 0:_.docs)==null?void 0:M.source}}};var I,P,W;S.parameters={...S.parameters,docs:{...(I=S.parameters)==null?void 0:I.docs,source:{originalSource:`{
  render: () => <SelectableListExample />,
  parameters: {
    docs: {
      description: {
        story: 'Click on rows to select them. Click again to deselect.'
      }
    }
  }
}`,...(W=(P=S.parameters)==null?void 0:P.docs)==null?void 0:W.source}}};var H,N,B;w.parameters={...w.parameters,docs:{...(H=w.parameters)==null?void 0:H.docs,source:{originalSource:`{
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
}`,...(B=(N=w.parameters)==null?void 0:N.docs)==null?void 0:B.source}}};var $,z,U;F.parameters={...F.parameters,docs:{...($=F.parameters)==null?void 0:$.docs,source:{originalSource:`{
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
}`,...(U=(z=F.parameters)==null?void 0:z.docs)==null?void 0:U.source}}};var V,Y,Q;T.parameters={...T.parameters,docs:{...(V=T.parameters)==null?void 0:V.docs,source:{originalSource:`{
  render: () => <FilteredListExample />,
  parameters: {
    docs: {
      description: {
        story: 'Feature list with filter controls to show/hide different feature types.'
      }
    }
  }
}`,...(Q=(Y=T.parameters)==null?void 0:Y.docs)==null?void 0:Q.source}}};var Z,q,K;k.parameters={...k.parameters,docs:{...(Z=k.parameters)==null?void 0:Z.docs,source:{originalSource:`{
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
}`,...(K=(q=k.parameters)==null?void 0:q.docs)==null?void 0:K.source}}};var G,J,X;b.parameters={...b.parameters,docs:{...(G=b.parameters)==null?void 0:G.docs,source:{originalSource:`{
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
}`,...(X=(J=b.parameters)==null?void 0:J.docs)==null?void 0:X.source}}};var ee,te,re;x.parameters={...x.parameters,docs:{...(ee=x.parameters)==null?void 0:ee.docs,source:{originalSource:`{
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
}`,...(re=(te=x.parameters)==null?void 0:te.docs)==null?void 0:re.source}}};var se,oe,ae;C.parameters={...C.parameters,docs:{...(se=C.parameters)==null?void 0:se.docs,source:{originalSource:`{
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
}`,...(ae=(oe=C.parameters)==null?void 0:oe.docs)==null?void 0:ae.source}}};var ne,ie,ce;L.parameters={...L.parameters,docs:{...(ne=L.parameters)==null?void 0:ne.docs,source:{originalSource:`{
  render: () => <FeatureListWithToolbarExample />,
  parameters: {
    docs: {
      description: {
        story: 'FeatureList with LayersToolbar above. Select features to enable toolbar actions. ' + 'Filter narrows the list. Run dropdown shows context-sensitive tools based on selection. ' + 'Associated Files shows source/result files. Yellow halo appears on tool/result changes.'
      }
    }
  }
}`,...(ce=(ie=L.parameters)==null?void 0:ie.docs)==null?void 0:ce.source}}};var le,de,pe;v.parameters={...v.parameters,docs:{...(le=v.parameters)==null?void 0:le.docs,source:{originalSource:`{
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
}`,...(pe=(de=v.parameters)==null?void 0:de.docs)==null?void 0:pe.source}}};const st=["Default","WithSelection","ManyFeatures","Empty","WithFilter","CustomRowHeight","DarkTheme","TracksOnly","LocationsOnly","WithToolbar","WithToolbarDarkTheme"];export{k as CustomRowHeight,b as DarkTheme,y as Default,F as Empty,C as LocationsOnly,w as ManyFeatures,x as TracksOnly,T as WithFilter,S as WithSelection,L as WithToolbar,v as WithToolbarDarkTheme,st as __namedExportsOrder,rt as default};
