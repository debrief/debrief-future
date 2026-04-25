import{j as t}from"./jsx-runtime-DF2Pcvd1.js";import{r as a}from"./index-B2-qRKKC.js";import{L as l}from"./LayersToolbar-Bc57yKCh.js";import{T as ue,a as me}from"./types-DpfMJDyn.js";import{a as i,b as c,e as x,c as k,d as pe,f as ge,s as he}from"./tools-B2FJeD6j.js";import{D as oe}from"./FilterDropdown-D8R_GT18.js";import{T as m}from"./ThemeProvider-CpMh1h6x.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./textfield-Dm39NdvL.js";import"./defaultTheme-lXwsM3al.js";const Fe=["OWNSHIP","CONTACT","REFERENCE","SOLUTION"],fe=["#1565c0","#c62828","#7b1fa2","#2e7d32"],b=["HMS Victory","USS Constitution","Contact Alpha","Contact Bravo","HMS Dreadnought","USS Enterprise","Contact Charlie","Contact Delta","HMS Illustrious","USS Nimitz"];function re(e){return{shape:"circle",radius:4,fill:!0,fill_color:e,color:e}}function Se(e){return{line:{color:e},point:re(e)}}function ne(e){const s=new Date("2024-06-15T08:00:00Z").getTime();return Array.from({length:e},(d,o)=>({type:"Feature",id:`track-${o.toString().padStart(3,"0")}`,geometry:{type:"LineString",coordinates:[[-5+o*.1,50],[-4+o*.1,51]]},properties:{kind:"TRACK",platform_id:`PLT-${o.toString().padStart(3,"0")}`,platform_name:`${b[o%b.length]} ${Math.floor(o/b.length)||""}`.trim(),track_type:Fe[o%4]??"CONTACT",start_time:new Date(s+o*36e5).toISOString(),end_time:new Date(s+(o+12)*36e5).toISOString(),positions:[],style:Se(fe[o%4]??"#1565c0"),default_position_style:{show_symbol:!1,symbol:"circle",show_label:!1}}}))}function ae(e){const s=["Alpha Point","Bravo Marker","Charlie Station","Delta Buoy","Echo Reference","Foxtrot Position"];return Array.from({length:e},(d,o)=>({type:"Feature",id:`ref-${o.toString().padStart(3,"0")}`,geometry:{type:"Point",coordinates:[-3+o*.1,52+o*.05]},properties:{kind:"POINT",name:`${s[o%s.length]} ${Math.floor(o/s.length)||""}`.trim(),location_type:o%2===0?"WAYPOINT":"REFERENCE",style:re(o%2===0?"#e65100":"#7b1fa2"),valid_from:"2024-06-15T00:00:00Z",valid_until:"2024-06-15T23:59:59Z"}}))}const n=[...ne(20),...ae(10)],Te=[...ne(3),...ae(2)],Ae={title:"Components/LayersToolbar",component:l,parameters:{layout:"padded",docs:{description:{component:"LayersToolbar provides 5 buttons: Delete, Visibility, Run (selection-scoped) and Filter, Associated Files (plot-scoped). Integrates with ToolMatchService for context-sensitive tool menus."}}},tags:["autodocs"],decorators:[e=>t.jsx(m,{children:t.jsx("div",{style:{maxWidth:500},children:t.jsx(e,{})})})]},p={args:{selectedFeatureIds:[],features:n,toolMatches:x,sourceFiles:c,resultFiles:i}},g={args:{selectedFeatureIds:["track-000","track-001","ref-000"],features:n,toolMatches:k(),sourceFiles:c,resultFiles:i,onDelete:e=>console.log("Delete:",e),onToggleVisibility:e=>console.log("Toggle visibility:",e),onRunTool:(e,s)=>console.log("Run tool:",e,s)}},h={args:{selectedFeatureIds:["track-000"],features:n,toolMatches:k(),toolsChanged:!0,sourceFiles:c,resultFiles:i}},F={args:{selectedFeatureIds:[],features:n,toolMatches:x,resultsChanged:!0,sourceFiles:c,resultFiles:i}},f={render:()=>{const[e,s]=a.useState({...oe,textQuery:"HMS"});return t.jsx(l,{selectedFeatureIds:[],features:n,filterState:e,onFilterChange:s})}},S={args:{selectedFeatureIds:["track-000"],features:Te,toolMatches:x,sourceFiles:ge,resultFiles:pe}};function ye(){const[e,s]=a.useState(["track-000","track-001"]),[d,o]=a.useState(oe),[le,R]=a.useState(!1),[ie,C]=a.useState(!1),I=a.useMemo(()=>new ue(he),[]),M=a.useMemo(()=>{const r=[];for(const u of e){const j=n.find(de=>de.id===u);j&&r.push(j.properties.kind)}return me(r)},[e]),ce=a.useMemo(()=>I.getMatchResults(M),[I,M]);return t.jsxs("div",{children:[t.jsx(l,{selectedFeatureIds:e,features:n,toolMatches:ce,toolsChanged:le,resultsChanged:ie,filterState:d,sourceFiles:c,resultFiles:i,onDelete:r=>console.log("Delete:",r),onToggleVisibility:r=>console.log("Visibility:",r),onRunTool:(r,u)=>console.log("Run:",r,u),onFilterChange:o,onApplyToSelection:r=>console.log("Apply:",r),onFileAction:(r,u)=>console.log("File action:",r.name,u),onDropdownOpened:r=>{r==="run"&&R(!1),r==="associated"&&C(!1)}}),t.jsxs("div",{style:{marginTop:12,fontSize:12,color:"#666"},children:[t.jsxs("p",{children:["Selected: ",e.join(", ")||"none"]}),t.jsx("button",{onClick:()=>s(["track-000","track-001"]),children:"Select 2 tracks"})," ",t.jsx("button",{onClick:()=>s(["track-000","ref-000"]),children:"Select track + point"})," ",t.jsx("button",{onClick:()=>s([]),children:"Clear selection"})," ",t.jsx("button",{onClick:()=>R(!0),children:"Trigger tools changed"})," ",t.jsx("button",{onClick:()=>C(!0),children:"Trigger results changed"})]})]})}const T={render:()=>t.jsx(ye,{}),parameters:{docs:{description:{story:"Full interactive toolbar with live ToolMatchService integration. Use buttons below to change selection and trigger halo animations."}}}},y={render:()=>t.jsx(m,{theme:{variant:"dark"},children:t.jsx(l,{selectedFeatureIds:["track-000","track-001"],features:n,toolMatches:k(),sourceFiles:c,resultFiles:i,onDelete:e=>console.log("Delete:",e),onToggleVisibility:e=>console.log("Visibility:",e),onRunTool:(e,s)=>console.log("Run:",e,s)})}),parameters:{backgrounds:{default:"dark"}}},v={render:()=>{const e={selectedFeatureIds:["track-000","track-001"],features:n,toolMatches:k(),sourceFiles:c,resultFiles:i,onDelete:s=>console.log("Delete:",s),onToggleVisibility:s=>console.log("Visibility:",s),onRunTool:(s,d)=>console.log("Run:",s,d)};return t.jsxs("div",{style:{display:"flex",gap:24,flexWrap:"wrap"},children:[t.jsxs("div",{children:[t.jsx("div",{style:{fontSize:11,fontWeight:600,marginBottom:4},children:"Light"}),t.jsx(m,{theme:{variant:"light"},children:t.jsx(l,{...e})})]}),t.jsxs("div",{children:[t.jsx("div",{style:{fontSize:11,fontWeight:600,marginBottom:4},children:"Dark"}),t.jsx(m,{theme:{variant:"dark"},children:t.jsx(l,{...e})})]}),t.jsxs("div",{children:[t.jsx("div",{style:{fontSize:11,fontWeight:600,marginBottom:4},children:"VS Code"}),t.jsx(m,{theme:{variant:"vscode"},children:t.jsx(l,{...e})})]})]})},parameters:{docs:{description:{story:"Shows LayersToolbar in Light, Dark, and VS Code themes side-by-side for visual comparison."}}}};var D,A,E;p.parameters={...p.parameters,docs:{...(D=p.parameters)==null?void 0:D.docs,source:{originalSource:`{
  args: {
    selectedFeatureIds: [],
    features: sampleFeatures,
    toolMatches: emptyToolResults,
    sourceFiles: sampleSourceFiles,
    resultFiles: sampleResultFiles
  }
}`,...(E=(A=p.parameters)==null?void 0:A.docs)==null?void 0:E.source}}};var L,P,W;g.parameters={...g.parameters,docs:{...(L=g.parameters)==null?void 0:L.docs,source:{originalSource:`{
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
}`,...(W=(P=g.parameters)==null?void 0:P.docs)==null?void 0:W.source}}};var _,w,V;h.parameters={...h.parameters,docs:{...(_=h.parameters)==null?void 0:_.docs,source:{originalSource:`{
  args: {
    selectedFeatureIds: ['track-000'],
    features: sampleFeatures,
    toolMatches: createActiveToolResults(),
    toolsChanged: true,
    sourceFiles: sampleSourceFiles,
    resultFiles: sampleResultFiles
  }
}`,...(V=(w=h.parameters)==null?void 0:w.docs)==null?void 0:V.source}}};var N,O,B;F.parameters={...F.parameters,docs:{...(N=F.parameters)==null?void 0:N.docs,source:{originalSource:`{
  args: {
    selectedFeatureIds: [],
    features: sampleFeatures,
    toolMatches: emptyToolResults,
    resultsChanged: true,
    sourceFiles: sampleSourceFiles,
    resultFiles: sampleResultFiles
  }
}`,...(B=(O=F.parameters)==null?void 0:O.docs)==null?void 0:B.source}}};var z,U,$;f.parameters={...f.parameters,docs:{...(z=f.parameters)==null?void 0:z.docs,source:{originalSource:`{
  render: () => {
    const [filterState, setFilterState] = useState<FilterState>({
      ...DEFAULT_FILTER_STATE,
      textQuery: 'HMS'
    });
    return <LayersToolbar selectedFeatureIds={[]} features={sampleFeatures} filterState={filterState} onFilterChange={setFilterState} />;
  }
}`,...($=(U=f.parameters)==null?void 0:U.docs)==null?void 0:$.source}}};var H,Z,Q;S.parameters={...S.parameters,docs:{...(H=S.parameters)==null?void 0:H.docs,source:{originalSource:`{
  args: {
    selectedFeatureIds: ['track-000'],
    features: fewFeatures,
    toolMatches: emptyToolResults,
    sourceFiles: emptySourceFiles,
    resultFiles: emptyResultFiles
  }
}`,...(Q=(Z=S.parameters)==null?void 0:Z.docs)==null?void 0:Q.source}}};var K,Y,q;T.parameters={...T.parameters,docs:{...(K=T.parameters)==null?void 0:K.docs,source:{originalSource:`{
  render: () => <FullIntegrationExample />,
  parameters: {
    docs: {
      description: {
        story: 'Full interactive toolbar with live ToolMatchService integration. Use buttons below to change selection and trigger halo animations.'
      }
    }
  }
}`,...(q=(Y=T.parameters)==null?void 0:Y.docs)==null?void 0:q.source}}};var G,J,X;y.parameters={...y.parameters,docs:{...(G=y.parameters)==null?void 0:G.docs,source:{originalSource:`{
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
}`,...(X=(J=y.parameters)==null?void 0:J.docs)==null?void 0:X.source}}};var ee,te,se;v.parameters={...v.parameters,docs:{...(ee=v.parameters)==null?void 0:ee.docs,source:{originalSource:`{
  render: () => {
    const sharedProps = {
      selectedFeatureIds: ['track-000', 'track-001'] as string[],
      features: sampleFeatures,
      toolMatches: createActiveToolResults(),
      sourceFiles: sampleSourceFiles,
      resultFiles: sampleResultFiles,
      onDelete: (ids: string[]) => console.log('Delete:', ids),
      onToggleVisibility: (ids: string[]) => console.log('Visibility:', ids),
      onRunTool: (toolId: string, ids: string[]) => console.log('Run:', toolId, ids)
    };
    return <div style={{
      display: 'flex',
      gap: 24,
      flexWrap: 'wrap'
    }}>
        <div>
          <div style={{
          fontSize: 11,
          fontWeight: 600,
          marginBottom: 4
        }}>Light</div>
          <ThemeProvider theme={{
          variant: 'light'
        }}>
            <LayersToolbar {...sharedProps} />
          </ThemeProvider>
        </div>
        <div>
          <div style={{
          fontSize: 11,
          fontWeight: 600,
          marginBottom: 4
        }}>Dark</div>
          <ThemeProvider theme={{
          variant: 'dark'
        }}>
            <LayersToolbar {...sharedProps} />
          </ThemeProvider>
        </div>
        <div>
          <div style={{
          fontSize: 11,
          fontWeight: 600,
          marginBottom: 4
        }}>VS Code</div>
          <ThemeProvider theme={{
          variant: 'vscode'
        }}>
            <LayersToolbar {...sharedProps} />
          </ThemeProvider>
        </div>
      </div>;
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows LayersToolbar in Light, Dark, and VS Code themes side-by-side for visual comparison.'
      }
    }
  }
}`,...(se=(te=v.parameters)==null?void 0:te.docs)==null?void 0:se.source}}};const Ee=["NoSelection","WithSelection","WithToolsChanged","WithNewResults","WithActiveFilter","WithEmptyFiles","FullIntegration","DarkTheme","MultiContext"];export{y as DarkTheme,T as FullIntegration,v as MultiContext,p as NoSelection,f as WithActiveFilter,S as WithEmptyFiles,F as WithNewResults,g as WithSelection,h as WithToolsChanged,Ee as __namedExportsOrder,Ae as default};
