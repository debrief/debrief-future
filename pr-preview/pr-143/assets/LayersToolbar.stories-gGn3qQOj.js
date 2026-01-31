import{j as o}from"./jsx-runtime-DF2Pcvd1.js";import{r as a}from"./index-B2-qRKKC.js";import{L as f,s as n,a as i,e as k,c as R,b as ne,d as ie,f as ce}from"./tools-aFJ6pSgx.js";import{T as ue,c as de}from"./types-va9JkSoG.js";import{D as J}from"./FilterDropdown-CbZBDR2X.js";import{T as X}from"./ThemeProvider-KrJW1DiK.js";import"./_commonjsHelpers-Cpj98o6Y.js";const pe=["OWNSHIP","CONTACT","REFERENCE","SOLUTION"],me=["#1565c0","#c62828","#7b1fa2","#2e7d32"],y=["HMS Victory","USS Constitution","Contact Alpha","Contact Bravo","HMS Dreadnought","USS Enterprise","Contact Charlie","Contact Delta","HMS Illustrious","USS Nimitz"];function ee(e){return{shape:"circle",radius:4,fill:!0,fill_color:e,color:e}}function ge(e){return{line:{color:e},point:ee(e)}}function te(e){const s=new Date("2024-06-15T08:00:00Z").getTime();return Array.from({length:e},(T,t)=>({type:"Feature",id:`track-${t.toString().padStart(3,"0")}`,geometry:{type:"LineString",coordinates:[[-5+t*.1,50],[-4+t*.1,51]]},properties:{kind:"TRACK",platform_id:`PLT-${t.toString().padStart(3,"0")}`,platform_name:`${y[t%y.length]} ${Math.floor(t/y.length)||""}`.trim(),track_type:pe[t%4]??"CONTACT",start_time:new Date(s+t*36e5).toISOString(),end_time:new Date(s+(t+12)*36e5).toISOString(),positions:[],style:ge(me[t%4]??"#1565c0")}}))}function se(e){const s=["Alpha Point","Bravo Marker","Charlie Station","Delta Buoy","Echo Reference","Foxtrot Position"];return Array.from({length:e},(T,t)=>({type:"Feature",id:`ref-${t.toString().padStart(3,"0")}`,geometry:{type:"Point",coordinates:[-3+t*.1,52+t*.05]},properties:{kind:"POINT",name:`${s[t%s.length]} ${Math.floor(t/s.length)||""}`.trim(),location_type:t%2===0?"WAYPOINT":"REFERENCE",style:ee(t%2===0?"#e65100":"#7b1fa2"),valid_from:"2024-06-15T00:00:00Z",valid_until:"2024-06-15T23:59:59Z"}}))}const l=[...te(20),...se(10)],Fe=[...te(3),...se(2)],Ie={title:"Components/LayersToolbar",component:f,parameters:{layout:"padded",docs:{description:{component:"LayersToolbar provides 5 buttons: Delete, Visibility, Run (selection-scoped) and Filter, Associated Files (plot-scoped). Integrates with ToolMatchService for context-sensitive tool menus."}}},tags:["autodocs"],decorators:[e=>o.jsx(X,{children:o.jsx("div",{style:{maxWidth:500},children:o.jsx(e,{})})})]},u={args:{selectedFeatureIds:[],features:l,toolMatches:k,sourceFiles:i,resultFiles:n}},d={args:{selectedFeatureIds:["track-000","track-001","ref-000"],features:l,toolMatches:R(),sourceFiles:i,resultFiles:n,onDelete:e=>console.log("Delete:",e),onToggleVisibility:e=>console.log("Toggle visibility:",e),onRunTool:(e,s)=>console.log("Run tool:",e,s)}},p={args:{selectedFeatureIds:["track-000"],features:l,toolMatches:R(),toolsChanged:!0,sourceFiles:i,resultFiles:n}},m={args:{selectedFeatureIds:[],features:l,toolMatches:k,resultsChanged:!0,sourceFiles:i,resultFiles:n}},g={render:()=>{const[e,s]=a.useState({...J,textQuery:"HMS"});return o.jsx(f,{selectedFeatureIds:[],features:l,filterState:e,onFilterChange:s})}},F={args:{selectedFeatureIds:["track-000"],features:Fe,toolMatches:k,sourceFiles:ie,resultFiles:ne}};function he(){const[e,s]=a.useState(["track-000","track-001"]),[T,t]=a.useState(J),[oe,C]=a.useState(!1),[re,I]=a.useState(!1),b=a.useMemo(()=>new ue(ce),[]),v=a.useMemo(()=>{const r=[];for(const c of e){const M=l.find(le=>le.id===c);M&&r.push(M.properties.kind)}return de(r)},[e]),ae=a.useMemo(()=>b.getMatchResults(v),[b,v]);return o.jsxs("div",{children:[o.jsx(f,{selectedFeatureIds:e,features:l,toolMatches:ae,toolsChanged:oe,resultsChanged:re,filterState:T,sourceFiles:i,resultFiles:n,onDelete:r=>console.log("Delete:",r),onToggleVisibility:r=>console.log("Visibility:",r),onRunTool:(r,c)=>console.log("Run:",r,c),onFilterChange:t,onApplyToSelection:r=>console.log("Apply:",r),onFileAction:(r,c)=>console.log("File action:",r.name,c),onDropdownOpened:r=>{r==="run"&&C(!1),r==="associated"&&I(!1)}}),o.jsxs("div",{style:{marginTop:12,fontSize:12,color:"#666"},children:[o.jsxs("p",{children:["Selected: ",e.join(", ")||"none"]}),o.jsx("button",{onClick:()=>s(["track-000","track-001"]),children:"Select 2 tracks"})," ",o.jsx("button",{onClick:()=>s(["track-000","ref-000"]),children:"Select track + point"})," ",o.jsx("button",{onClick:()=>s([]),children:"Clear selection"})," ",o.jsx("button",{onClick:()=>C(!0),children:"Trigger tools changed"})," ",o.jsx("button",{onClick:()=>I(!0),children:"Trigger results changed"})]})]})}const h={render:()=>o.jsx(he,{}),parameters:{docs:{description:{story:"Full interactive toolbar with live ToolMatchService integration. Use buttons below to change selection and trigger halo animations."}}}},S={render:()=>o.jsx(X,{theme:{variant:"dark"},children:o.jsx(f,{selectedFeatureIds:["track-000","track-001"],features:l,toolMatches:R(),sourceFiles:i,resultFiles:n,onDelete:e=>console.log("Delete:",e),onToggleVisibility:e=>console.log("Visibility:",e),onRunTool:(e,s)=>console.log("Run:",e,s)})}),parameters:{backgrounds:{default:"dark"}}};var x,D,E;u.parameters={...u.parameters,docs:{...(x=u.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    selectedFeatureIds: [],
    features: sampleFeatures,
    toolMatches: emptyToolResults,
    sourceFiles: sampleSourceFiles,
    resultFiles: sampleResultFiles
  }
}`,...(E=(D=u.parameters)==null?void 0:D.docs)==null?void 0:E.source}}};var A,j,_;d.parameters={...d.parameters,docs:{...(A=d.parameters)==null?void 0:A.docs,source:{originalSource:`{
  args: {
    selectedFeatureIds: ['track-000', 'track-001', 'ref-000'],
    features: sampleFeatures,
    toolMatches: createActiveToolResults(),
    sourceFiles: sampleSourceFiles,
    resultFiles: sampleResultFiles,
    onDelete: ids => console.log('Delete:', ids),
    onToggleVisibility: ids => console.log('Toggle visibility:', ids),
    onRunTool: (toolId, ids) => console.log('Run tool:', toolId, ids)
  }
}`,...(_=(j=d.parameters)==null?void 0:j.docs)==null?void 0:_.source}}};var w,L,W;p.parameters={...p.parameters,docs:{...(w=p.parameters)==null?void 0:w.docs,source:{originalSource:`{
  args: {
    selectedFeatureIds: ['track-000'],
    features: sampleFeatures,
    toolMatches: createActiveToolResults(),
    toolsChanged: true,
    sourceFiles: sampleSourceFiles,
    resultFiles: sampleResultFiles
  }
}`,...(W=(L=p.parameters)==null?void 0:L.docs)==null?void 0:W.source}}};var N,O,P;m.parameters={...m.parameters,docs:{...(N=m.parameters)==null?void 0:N.docs,source:{originalSource:`{
  args: {
    selectedFeatureIds: [],
    features: sampleFeatures,
    toolMatches: emptyToolResults,
    resultsChanged: true,
    sourceFiles: sampleSourceFiles,
    resultFiles: sampleResultFiles
  }
}`,...(P=(O=m.parameters)==null?void 0:O.docs)==null?void 0:P.source}}};var V,U,$;g.parameters={...g.parameters,docs:{...(V=g.parameters)==null?void 0:V.docs,source:{originalSource:`{
  render: () => {
    const [filterState, setFilterState] = useState<FilterState>({
      ...DEFAULT_FILTER_STATE,
      textQuery: 'HMS'
    });
    return <LayersToolbar selectedFeatureIds={[]} features={sampleFeatures} filterState={filterState} onFilterChange={setFilterState} />;
  }
}`,...($=(U=g.parameters)==null?void 0:U.docs)==null?void 0:$.source}}};var H,B,Z;F.parameters={...F.parameters,docs:{...(H=F.parameters)==null?void 0:H.docs,source:{originalSource:`{
  args: {
    selectedFeatureIds: ['track-000'],
    features: fewFeatures,
    toolMatches: emptyToolResults,
    sourceFiles: emptySourceFiles,
    resultFiles: emptyResultFiles
  }
}`,...(Z=(B=F.parameters)==null?void 0:B.docs)==null?void 0:Z.source}}};var z,Q,K;h.parameters={...h.parameters,docs:{...(z=h.parameters)==null?void 0:z.docs,source:{originalSource:`{
  render: () => <FullIntegrationExample />,
  parameters: {
    docs: {
      description: {
        story: 'Full interactive toolbar with live ToolMatchService integration. Use buttons below to change selection and trigger halo animations.'
      }
    }
  }
}`,...(K=(Q=h.parameters)==null?void 0:Q.docs)==null?void 0:K.source}}};var Y,q,G;S.parameters={...S.parameters,docs:{...(Y=S.parameters)==null?void 0:Y.docs,source:{originalSource:`{
  render: () => <ThemeProvider theme={{
    variant: 'dark'
  }}>
      <LayersToolbar selectedFeatureIds={['track-000', 'track-001']} features={sampleFeatures} toolMatches={createActiveToolResults()} sourceFiles={sampleSourceFiles} resultFiles={sampleResultFiles} onDelete={ids => console.log('Delete:', ids)} onToggleVisibility={ids => console.log('Visibility:', ids)} onRunTool={(toolId, ids) => console.log('Run:', toolId, ids)} />
    </ThemeProvider>,
  parameters: {
    backgrounds: {
      default: 'dark'
    }
  }
}`,...(G=(q=S.parameters)==null?void 0:q.docs)==null?void 0:G.source}}};const be=["NoSelection","WithSelection","WithToolsChanged","WithNewResults","WithActiveFilter","WithEmptyFiles","FullIntegration","DarkTheme"];export{S as DarkTheme,h as FullIntegration,u as NoSelection,g as WithActiveFilter,F as WithEmptyFiles,m as WithNewResults,d as WithSelection,p as WithToolsChanged,be as __namedExportsOrder,Ie as default};
