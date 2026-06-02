import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r as t}from"./index-B2-qRKKC.js";import{L as g,D as B,C as Xe}from"./LogPanel-bA_dtMDY.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./ParameterEditor-DMejAiLo.js";import"./paramTypeResolver-Br4vj1cK.js";import"./types-CuJnRqfe.js";const a={"track-alpha":"Track Alpha","track-bravo":"Track Bravo","track-charlie":"Track Charlie","result-rb-001":"Range & Bearing Result","result-cpa-001":"CPA Result","deleted-feature":void 0},s=[{activity_id:"act-005",timestamp:"2026-02-09T14:35:00Z",toolName:"Range & Bearing",tool_version:"1.2.0",parameters:{maxRange:{value:5e3,default:!1,tunable:!0},units:{value:"metres",default:!0,tunable:!1}},usedFeatureIds:["track-alpha","track-bravo"],generatedFeatureIds:["result-rb-001"],execution_duration:"PT0.5S",generated_result_id:"result-rb-001",operationCategory:"calculation"},{activity_id:"act-004",timestamp:"2026-02-09T14:30:00Z",toolName:"Closest Approach",tool_version:"1.1.0",parameters:{threshold:{value:2e3,default:!1,tunable:!0}},usedFeatureIds:["track-alpha","track-charlie"],generatedFeatureIds:["result-cpa-001"],execution_duration:"PT1.2S",generated_result_id:"result-cpa-001",operationCategory:"calculation"},{activity_id:"act-003",timestamp:"2026-02-09T14:25:00Z",toolName:"Track Statistics",tool_version:"1.0.0",parameters:{},usedFeatureIds:["track-alpha"],generatedFeatureIds:[],execution_duration:"PT0.3S",generated_result_id:null,operationCategory:"calculation"},{activity_id:"act-002",timestamp:"2026-02-09T14:20:00Z",toolName:"change-track-color",tool_version:"1.0.0",parameters:{color:{value:"red",default:!1,tunable:!0}},usedFeatureIds:["track-bravo"],generatedFeatureIds:[],execution_duration:"PT0.05S",generated_result_id:null,operationCategory:"property-edit"},{activity_id:"act-001",timestamp:"2026-02-09T14:00:00Z",toolName:"load-rep",tool_version:"1.0.0",parameters:{file:{value:"exercise_data.rep",default:!1,tunable:!1}},usedFeatureIds:[],generatedFeatureIds:["track-alpha","track-bravo","track-charlie"],execution_duration:"PT2.1S",generated_result_id:null,operationCategory:"import"}],Ye={activity_id:"act-006",timestamp:"2026-02-09T14:40:00Z",toolName:"Range & Bearing",tool_version:"1.2.0",parameters:{},usedFeatureIds:["track-alpha","deleted-feature"],generatedFeatureIds:[],execution_duration:"PT0.4S",generated_result_id:null,operationCategory:"calculation"};function o(r){const[i,l]=t.useState(r.initialView??"timeline"),[c,u]=t.useState(null),[h,v]=t.useState(B),[U,S]=t.useState(null),y=f=>{f.type==="action:invoke"&&(S(`Action "${f.payload.actionType}" is not yet available.`),setTimeout(()=>S(null),3e3))};return e.jsx("div",{style:{width:320,height:600,border:"1px solid #333"},children:e.jsx(g,{entries:r.entries,featureNames:r.featureNames,viewMode:i,selectedEntryId:c,filterState:h,hasActiveSession:r.hasActiveSession,plotName:"Exercise Alpha",actionResultMessage:U,onMessage:y,onViewModeChange:l,onFilterStateChange:v,onSelectedEntryChange:u})})}const pt={title:"LogPanel",component:g,parameters:{layout:"centered"}},E={name:"Timeline Default",render:()=>e.jsx(o,{entries:s,featureNames:a,hasActiveSession:!0})},_={name:"Empty State (No Plot)",render:()=>e.jsx(o,{entries:[],featureNames:{},hasActiveSession:!1})},N={name:"Empty State (No Entries)",render:()=>e.jsx(o,{entries:[],featureNames:a,hasActiveSession:!0})},x={name:"Entry Selected",render:()=>{const r=()=>{const[i,l]=t.useState("act-005"),[c,u]=t.useState(B);return e.jsx("div",{style:{width:320,height:600,border:"1px solid #333"},children:e.jsx(g,{entries:s,featureNames:a,viewMode:"timeline",selectedEntryId:i,filterState:c,hasActiveSession:!0,plotName:"Exercise Alpha",actionResultMessage:null,onFilterStateChange:u,onSelectedEntryChange:l})})};return e.jsx(r,{})}},b={name:"Entry with Deleted Feature",render:()=>e.jsx(o,{entries:[Ye,...s],featureNames:a,hasActiveSession:!0})},I={name:"Compact View",render:()=>e.jsx(o,{entries:s,featureNames:a,hasActiveSession:!0,initialView:"compact"})},T={name:"Timeline View",render:()=>e.jsx(o,{entries:s,featureNames:a,hasActiveSession:!0,initialView:"timeline"})},w={name:"Detailed View",render:()=>e.jsx(o,{entries:s,featureNames:a,hasActiveSession:!0,initialView:"detailed"})},A={name:"Filter Active",render:()=>{const r=()=>{const[i,l]=t.useState("timeline"),[c,u]=t.useState(null),[h,v]=t.useState({searchText:"",toolType:null,operationCategory:null,isExpanded:!0});return e.jsx("div",{style:{width:320,height:600,border:"1px solid #333"},children:e.jsx(g,{entries:s,featureNames:a,viewMode:i,selectedEntryId:c,filterState:h,hasActiveSession:!0,plotName:"Exercise Alpha",actionResultMessage:null,onViewModeChange:l,onFilterStateChange:v,onSelectedEntryChange:u})})};return e.jsx(r,{})}},k={name:"By-Feature View",render:()=>e.jsx(o,{entries:s,featureNames:a,hasActiveSession:!0,initialView:"by-feature"})},P={name:"Actions Disabled (No Selection)",render:()=>{const r=()=>{const[i,l]=t.useState(B);return e.jsx("div",{style:{width:320,height:600,border:"1px solid #333"},children:e.jsx(g,{entries:s,featureNames:a,viewMode:"timeline",selectedEntryId:null,filterState:i,hasActiveSession:!0,plotName:"Exercise Alpha",actionResultMessage:null,onFilterStateChange:l})})};return e.jsx(r,{})}},et={...s[0],activity_id:"act-disabled-001",disabled:!0},tt={...s[0],activity_id:"act-rationale-001",rationale:"Increased range to capture distant contacts from the latest exercise data."};function q(r){const[i,l]=t.useState("timeline"),[c,u]=t.useState(null),[h,v]=t.useState(B),[U,S]=t.useState(null),[y,f]=t.useState(r.entries),Ge=t.useCallback(d=>{d.type==="action:invoke"&&(S(`Action "${d.payload.actionType}" invoked.`),setTimeout(()=>S(null),3e3))},[]),Je=t.useCallback(d=>{const m=y.find(n=>n.toolName===d),p=[];if(m)for(const[n,F]of Object.entries(m.parameters)){const C=typeof F.value=="number",O=n==="color";p.push({name:n,type:C?"number":"string",description:null,tunable:F.tunable,defaultValue:F.default?F.value:null,minimum:C?0:null,maximum:C?Number(F.value)*3:null,step:C?1:null,choices:O?["red","blue","green","yellow","orange","purple","cyan","magenta","white","pink","navy","teal"]:null,paramType:O?"NamedColor":null})}return Promise.resolve(p)},[y]),Ke=t.useCallback((d,m)=>{f(p=>p.map(n=>n.activity_id===d?{...n,disabled:m}:n))},[]),Qe=t.useCallback((d,m)=>{f(p=>p.map(n=>n.activity_id===d?{...n,rationale:m}:n))},[]);return e.jsx("div",{style:{width:320,height:600,border:"1px solid #333"},children:e.jsx(g,{entries:y,featureNames:r.featureNames,viewMode:i,selectedEntryId:c,filterState:h,hasActiveSession:!0,plotName:"Exercise Alpha",actionResultMessage:U,onMessage:Ge,onViewModeChange:l,onFilterStateChange:v,onSelectedEntryChange:u,onSchemaRequest:Je,onDisableToggle:Ke,onRationaleUpdate:Qe})})}const j={name:"Flip Card — Edit Icon",render:()=>e.jsx(q,{entries:s,featureNames:a})},R={name:"Flip Card — Disabled Entry",render:()=>e.jsx(q,{entries:[et,...s.slice(1)],featureNames:a})},V={name:"Flip Card — With Rationale",render:()=>e.jsx(q,{entries:[tt,...s.slice(1)],featureNames:a})},D={name:"CardFlip Primitive",render:()=>{const r=()=>{const[i,l]=t.useState(!1);return e.jsxs("div",{style:{width:320,padding:16},children:[e.jsx("button",{onClick:()=>l(!i),style:{marginBottom:8},children:i?"Show Front":"Show Back"}),e.jsx(Xe,{isFlipped:i,front:e.jsxs("div",{style:{padding:16,background:"#1e1e1e",border:"1px solid #333"},children:[e.jsx("strong",{children:"Front Face"}),e.jsx("p",{children:"Tool name, features, parameters"})]}),back:e.jsxs("div",{style:{padding:16,background:"#252526",border:"1px solid #333"},children:[e.jsx("strong",{children:"Back Face (Edit)"}),e.jsx("p",{children:"Parameter controls, rationale, disable"})]})})]})};return e.jsx(r,{})}},at=[{activity_id:"cat-import",timestamp:"2026-04-19T09:00:00Z",toolName:"import-rep",tool_version:"1.0.0",parameters:{file:{value:"alpha.rep",default:!1}},usedFeatureIds:[],generatedFeatureIds:["track-alpha"],execution_duration:"PT1.2S",generated_result_id:null,operationCategory:"import"},{activity_id:"cat-style",timestamp:"2026-04-19T09:01:00Z",toolName:"change-color",tool_version:"1.0.0",parameters:{color:{value:"#e11d48",default:!1}},usedFeatureIds:["track-alpha"],generatedFeatureIds:[],execution_duration:"PT0.1S",generated_result_id:null,operationCategory:"property-edit"},{activity_id:"cat-calc",timestamp:"2026-04-19T09:02:00Z",toolName:"bearing-between-tracks",tool_version:"1.2.0",parameters:{maxRange:{value:5e3,default:!1}},usedFeatureIds:["track-alpha","track-bravo"],generatedFeatureIds:[],execution_duration:"PT2.3S",generated_result_id:null,operationCategory:"calculation"},{activity_id:"cat-filter",timestamp:"2026-04-19T09:03:00Z",toolName:"time-filter",tool_version:"1.0.0",parameters:{mode:{value:"include",default:!1}},usedFeatureIds:["track-alpha"],generatedFeatureIds:[],execution_duration:"PT0.05S",generated_result_id:null,operationCategory:"calculation"},{activity_id:"cat-snapshot",timestamp:"2026-04-19T09:04:00Z",toolName:"export-png",tool_version:"1.0.0",parameters:{},usedFeatureIds:["track-alpha"],generatedFeatureIds:[],execution_duration:"PT0.4S",generated_result_id:null,operationCategory:"export",kind:"snapshot"},{activity_id:"cat-unknown",timestamp:"2026-04-19T09:05:00Z",toolName:"custom-unknown-tool",tool_version:"0.0.1",parameters:{note:{value:"fallback",default:!1}},usedFeatureIds:["track-alpha"],generatedFeatureIds:[],execution_duration:"PT0.2S",generated_result_id:null,operationCategory:"calculation"}],M={name:"Rich Card — All Categories",render:()=>e.jsx(o,{entries:at,featureNames:a,hasActiveSession:!0})},rt={activity_id:"chip-matrix",timestamp:"2026-04-19T10:00:00Z",toolName:"bearing-between-tracks",tool_version:"1.2.0",parameters:{colour:{value:"#00aa55",default:!1},speed:{value:12,default:!1},mode:{value:"auto",default:!1},visible:{value:!0,default:!1},range:{value:"10-200",default:!1},plain:{value:"HMS Alpha",default:!0},extra1:{value:1,default:!0},extra2:{value:2,default:!0}},usedFeatureIds:["track-alpha"],generatedFeatureIds:[],execution_duration:"PT1.0S",generated_result_id:null,operationCategory:"calculation"},L={name:"Rich Card — All Chip Types",render:()=>e.jsx(o,{entries:[rt],featureNames:a,hasActiveSession:!0})},st=[{activity_id:"edge-snapshot",timestamp:"2026-04-19T11:00:00Z",toolName:"export-png",tool_version:"1.0.0",parameters:{},usedFeatureIds:["track-alpha"],generatedFeatureIds:[],execution_duration:"PT0.3S",generated_result_id:null,operationCategory:"export",kind:"snapshot"},{activity_id:"edge-noparams",timestamp:"2026-04-19T11:01:00Z",toolName:"bearing-between-tracks",tool_version:"1.2.0",parameters:{},usedFeatureIds:["track-alpha","track-bravo"],generatedFeatureIds:[],execution_duration:"PT0.2S",generated_result_id:null,operationCategory:"calculation"},{activity_id:"edge-missing-dur",timestamp:"2026-04-19T11:02:00Z",toolName:"change-color",tool_version:"1.0.0",parameters:{color:{value:"red",default:!1}},usedFeatureIds:["track-alpha"],generatedFeatureIds:[],execution_duration:"",generated_result_id:null,operationCategory:"property-edit"},{activity_id:"edge-multi-track",timestamp:"2026-04-19T11:03:00Z",toolName:"bearing-between-tracks",tool_version:"1.2.0",parameters:{maxRange:{value:5e3,default:!1}},usedFeatureIds:["track-alpha","track-bravo","track-charlie"],generatedFeatureIds:[],execution_duration:"PT1.4S",generated_result_id:null,operationCategory:"calculation"}],W={name:"Rich Card — Edge Cases",render:()=>e.jsx(o,{entries:st,featureNames:a,hasActiveSession:!0})},it={activity_id:"disabled-sample",timestamp:"2026-04-19T12:00:00Z",toolName:"bearing-between-tracks",tool_version:"1.2.0",parameters:{maxRange:{value:5e3,default:!1},units:{value:"metres",default:!0}},usedFeatureIds:["track-alpha","track-bravo"],generatedFeatureIds:[],execution_duration:"PT0.9S",generated_result_id:null,operationCategory:"calculation",disabled:!0},Z={name:"Rich Card — Disabled",render:()=>e.jsx(o,{entries:[it,...s.slice(1)],featureNames:a,hasActiveSession:!0})};var $,H,z;E.parameters={...E.parameters,docs:{...($=E.parameters)==null?void 0:$.docs,source:{originalSource:`{
  name: 'Timeline Default',
  render: () => <LogPanelInteractive entries={sampleEntries} featureNames={sampleFeatureNames} hasActiveSession={true} />
}`,...(z=(H=E.parameters)==null?void 0:H.docs)==null?void 0:z.source}}};var G,J,K;_.parameters={..._.parameters,docs:{...(G=_.parameters)==null?void 0:G.docs,source:{originalSource:`{
  name: 'Empty State (No Plot)',
  render: () => <LogPanelInteractive entries={[]} featureNames={{}} hasActiveSession={false} />
}`,...(K=(J=_.parameters)==null?void 0:J.docs)==null?void 0:K.source}}};var Q,X,Y;N.parameters={...N.parameters,docs:{...(Q=N.parameters)==null?void 0:Q.docs,source:{originalSource:`{
  name: 'Empty State (No Entries)',
  render: () => <LogPanelInteractive entries={[]} featureNames={sampleFeatureNames} hasActiveSession={true} />
}`,...(Y=(X=N.parameters)==null?void 0:X.docs)==null?void 0:Y.source}}};var ee,te,ae;x.parameters={...x.parameters,docs:{...(ee=x.parameters)==null?void 0:ee.docs,source:{originalSource:`{
  name: 'Entry Selected',
  render: () => {
    // Pre-selected state wrapper
    const Wrapper = () => {
      const [selectedEntryId, setSelectedEntryId] = useState<string | null>('act-005');
      const [filterState, setFilterState] = useState<FilterState>(DEFAULT_FILTER_STATE);
      return <div style={{
        width: 320,
        height: 600,
        border: '1px solid #333'
      }}>
          <LogPanel entries={sampleEntries} featureNames={sampleFeatureNames} viewMode="timeline" selectedEntryId={selectedEntryId} filterState={filterState} hasActiveSession={true} plotName="Exercise Alpha" actionResultMessage={null} onFilterStateChange={setFilterState} onSelectedEntryChange={setSelectedEntryId} />
        </div>;
    };
    return <Wrapper />;
  }
}`,...(ae=(te=x.parameters)==null?void 0:te.docs)==null?void 0:ae.source}}};var re,se,ie;b.parameters={...b.parameters,docs:{...(re=b.parameters)==null?void 0:re.docs,source:{originalSource:`{
  name: 'Entry with Deleted Feature',
  render: () => <LogPanelInteractive entries={[entryWithDeletedFeature, ...sampleEntries]} featureNames={sampleFeatureNames} hasActiveSession={true} />
}`,...(ie=(se=b.parameters)==null?void 0:se.docs)==null?void 0:ie.source}}};var ne,oe,le;I.parameters={...I.parameters,docs:{...(ne=I.parameters)==null?void 0:ne.docs,source:{originalSource:`{
  name: 'Compact View',
  render: () => <LogPanelInteractive entries={sampleEntries} featureNames={sampleFeatureNames} hasActiveSession={true} initialView="compact" />
}`,...(le=(oe=I.parameters)==null?void 0:oe.docs)==null?void 0:le.source}}};var de,ce,ue;T.parameters={...T.parameters,docs:{...(de=T.parameters)==null?void 0:de.docs,source:{originalSource:`{
  name: 'Timeline View',
  render: () => <LogPanelInteractive entries={sampleEntries} featureNames={sampleFeatureNames} hasActiveSession={true} initialView="timeline" />
}`,...(ue=(ce=T.parameters)==null?void 0:ce.docs)==null?void 0:ue.source}}};var me,pe,ge;w.parameters={...w.parameters,docs:{...(me=w.parameters)==null?void 0:me.docs,source:{originalSource:`{
  name: 'Detailed View',
  render: () => <LogPanelInteractive entries={sampleEntries} featureNames={sampleFeatureNames} hasActiveSession={true} initialView="detailed" />
}`,...(ge=(pe=w.parameters)==null?void 0:pe.docs)==null?void 0:ge.source}}};var he,ve,Se;A.parameters={...A.parameters,docs:{...(he=A.parameters)==null?void 0:he.docs,source:{originalSource:`{
  name: 'Filter Active',
  render: () => {
    const Wrapper = () => {
      const [viewMode, setViewMode] = useState<ViewMode>('timeline');
      const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
      const [filterState, setFilterState] = useState<FilterState>({
        searchText: '',
        toolType: null,
        operationCategory: null,
        isExpanded: true
      });
      return <div style={{
        width: 320,
        height: 600,
        border: '1px solid #333'
      }}>
          <LogPanel entries={sampleEntries} featureNames={sampleFeatureNames} viewMode={viewMode} selectedEntryId={selectedEntryId} filterState={filterState} hasActiveSession={true} plotName="Exercise Alpha" actionResultMessage={null} onViewModeChange={setViewMode} onFilterStateChange={setFilterState} onSelectedEntryChange={setSelectedEntryId} />
        </div>;
    };
    return <Wrapper />;
  }
}`,...(Se=(ve=A.parameters)==null?void 0:ve.docs)==null?void 0:Se.source}}};var ye,fe,Fe;k.parameters={...k.parameters,docs:{...(ye=k.parameters)==null?void 0:ye.docs,source:{originalSource:`{
  name: 'By-Feature View',
  render: () => <LogPanelInteractive entries={sampleEntries} featureNames={sampleFeatureNames} hasActiveSession={true} initialView="by-feature" />
}`,...(Fe=(fe=k.parameters)==null?void 0:fe.docs)==null?void 0:Fe.source}}};var Ce,Ee,_e;P.parameters={...P.parameters,docs:{...(Ce=P.parameters)==null?void 0:Ce.docs,source:{originalSource:`{
  name: 'Actions Disabled (No Selection)',
  render: () => {
    const Wrapper = () => {
      const [filterState, setFilterState] = useState<FilterState>(DEFAULT_FILTER_STATE);
      return <div style={{
        width: 320,
        height: 600,
        border: '1px solid #333'
      }}>
          <LogPanel entries={sampleEntries} featureNames={sampleFeatureNames} viewMode="timeline" selectedEntryId={null} filterState={filterState} hasActiveSession={true} plotName="Exercise Alpha" actionResultMessage={null} onFilterStateChange={setFilterState} />
        </div>;
    };
    return <Wrapper />;
  }
}`,...(_e=(Ee=P.parameters)==null?void 0:Ee.docs)==null?void 0:_e.source}}};var Ne,xe,be;j.parameters={...j.parameters,docs:{...(Ne=j.parameters)==null?void 0:Ne.docs,source:{originalSource:`{
  name: 'Flip Card — Edit Icon',
  render: () => <FlipCardInteractive entries={sampleEntries} featureNames={sampleFeatureNames} />
}`,...(be=(xe=j.parameters)==null?void 0:xe.docs)==null?void 0:be.source}}};var Ie,Te,we;R.parameters={...R.parameters,docs:{...(Ie=R.parameters)==null?void 0:Ie.docs,source:{originalSource:`{
  name: 'Flip Card — Disabled Entry',
  render: () => <FlipCardInteractive entries={[disabledEntry, ...sampleEntries.slice(1)]} featureNames={sampleFeatureNames} />
}`,...(we=(Te=R.parameters)==null?void 0:Te.docs)==null?void 0:we.source}}};var Ae,ke,Pe;V.parameters={...V.parameters,docs:{...(Ae=V.parameters)==null?void 0:Ae.docs,source:{originalSource:`{
  name: 'Flip Card — With Rationale',
  render: () => <FlipCardInteractive entries={[entryWithRationale, ...sampleEntries.slice(1)]} featureNames={sampleFeatureNames} />
}`,...(Pe=(ke=V.parameters)==null?void 0:ke.docs)==null?void 0:Pe.source}}};var je,Re,Ve;D.parameters={...D.parameters,docs:{...(je=D.parameters)==null?void 0:je.docs,source:{originalSource:`{
  name: 'CardFlip Primitive',
  render: () => {
    const Wrapper = () => {
      const [isFlipped, setIsFlipped] = useState(false);
      return <div style={{
        width: 320,
        padding: 16
      }}>
          <button onClick={() => setIsFlipped(!isFlipped)} style={{
          marginBottom: 8
        }}>
            {isFlipped ? 'Show Front' : 'Show Back'}
          </button>
          <CardFlip isFlipped={isFlipped} front={<div style={{
          padding: 16,
          background: '#1e1e1e',
          border: '1px solid #333'
        }}>
                <strong>Front Face</strong>
                <p>Tool name, features, parameters</p>
              </div>} back={<div style={{
          padding: 16,
          background: '#252526',
          border: '1px solid #333'
        }}>
                <strong>Back Face (Edit)</strong>
                <p>Parameter controls, rationale, disable</p>
              </div>} />
        </div>;
    };
    return <Wrapper />;
  }
}`,...(Ve=(Re=D.parameters)==null?void 0:Re.docs)==null?void 0:Ve.source}}};var De,Me,Le;M.parameters={...M.parameters,docs:{...(De=M.parameters)==null?void 0:De.docs,source:{originalSource:`{
  name: 'Rich Card — All Categories',
  render: () => <LogPanelInteractive entries={allCategoriesEntries} featureNames={sampleFeatureNames} hasActiveSession={true} />
}`,...(Le=(Me=M.parameters)==null?void 0:Me.docs)==null?void 0:Le.source}}};var We,Ze,Be;L.parameters={...L.parameters,docs:{...(We=L.parameters)==null?void 0:We.docs,source:{originalSource:`{
  name: 'Rich Card — All Chip Types',
  render: () => <LogPanelInteractive entries={[allChipTypesEntry]} featureNames={sampleFeatureNames} hasActiveSession={true} />
}`,...(Be=(Ze=L.parameters)==null?void 0:Ze.docs)==null?void 0:Be.source}}};var Ue,qe,Oe;W.parameters={...W.parameters,docs:{...(Ue=W.parameters)==null?void 0:Ue.docs,source:{originalSource:`{
  name: 'Rich Card — Edge Cases',
  render: () => <LogPanelInteractive entries={edgeCaseEntries} featureNames={sampleFeatureNames} hasActiveSession={true} />
}`,...(Oe=(qe=W.parameters)==null?void 0:qe.docs)==null?void 0:Oe.source}}};var $e,He,ze;Z.parameters={...Z.parameters,docs:{...($e=Z.parameters)==null?void 0:$e.docs,source:{originalSource:`{
  name: 'Rich Card — Disabled',
  render: () => <LogPanelInteractive entries={[disabledEntryVariant, ...sampleEntries.slice(1)]} featureNames={sampleFeatureNames} hasActiveSession={true} />
}`,...(ze=(He=Z.parameters)==null?void 0:He.docs)==null?void 0:ze.source}}};const gt=["TimelineDefault","EmptyNoPlot","EmptyNoEntries","EntrySelected","EntryWithDeletedFeature","CompactView","TimelineView","DetailedView","FilterActive","ByFeatureView","ActionsDisabled","FlipCardDefault","FlipCardDisabled","FlipCardRationale","CardFlipPrimitive","AllCategories","AllChipTypes","EdgeCases","DisabledCard"];export{P as ActionsDisabled,M as AllCategories,L as AllChipTypes,k as ByFeatureView,D as CardFlipPrimitive,I as CompactView,w as DetailedView,Z as DisabledCard,W as EdgeCases,N as EmptyNoEntries,_ as EmptyNoPlot,x as EntrySelected,b as EntryWithDeletedFeature,A as FilterActive,j as FlipCardDefault,R as FlipCardDisabled,V as FlipCardRationale,E as TimelineDefault,T as TimelineView,gt as __namedExportsOrder,pt as default};
