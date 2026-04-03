import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r as t}from"./index-B2-qRKKC.js";import{L as S,D as L,C as Me}from"./types-B8SQ42Xo.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./ParameterEditor-C7QjHcVw.js";import"./paramTypeResolver-C0MCmcI9.js";const n={"track-alpha":"Track Alpha","track-bravo":"Track Bravo","track-charlie":"Track Charlie","result-rb-001":"Range & Bearing Result","result-cpa-001":"CPA Result","deleted-feature":void 0},r=[{activityId:"act-005",timestamp:"2026-02-09T14:35:00Z",toolName:"Range & Bearing",toolVersion:"1.2.0",parameters:{maxRange:{value:5e3,default:!1,tunable:!0},units:{value:"metres",default:!0,tunable:!1}},usedFeatureIds:["track-alpha","track-bravo"],generatedFeatureIds:["result-rb-001"],executionDuration:"PT0.5S",generatedResultId:"result-rb-001",operationCategory:"calculation"},{activityId:"act-004",timestamp:"2026-02-09T14:30:00Z",toolName:"Closest Approach",toolVersion:"1.1.0",parameters:{threshold:{value:2e3,default:!1,tunable:!0}},usedFeatureIds:["track-alpha","track-charlie"],generatedFeatureIds:["result-cpa-001"],executionDuration:"PT1.2S",generatedResultId:"result-cpa-001",operationCategory:"calculation"},{activityId:"act-003",timestamp:"2026-02-09T14:25:00Z",toolName:"Track Statistics",toolVersion:"1.0.0",parameters:{},usedFeatureIds:["track-alpha"],generatedFeatureIds:[],executionDuration:"PT0.3S",generatedResultId:null,operationCategory:"calculation"},{activityId:"act-002",timestamp:"2026-02-09T14:20:00Z",toolName:"change-track-color",toolVersion:"1.0.0",parameters:{color:{value:"red",default:!1,tunable:!0}},usedFeatureIds:["track-bravo"],generatedFeatureIds:[],executionDuration:"PT0.05S",generatedResultId:null,operationCategory:"property-edit"},{activityId:"act-001",timestamp:"2026-02-09T14:00:00Z",toolName:"load-rep",toolVersion:"1.0.0",parameters:{file:{value:"exercise_data.rep",default:!1,tunable:!1}},usedFeatureIds:[],generatedFeatureIds:["track-alpha","track-bravo","track-charlie"],executionDuration:"PT2.1S",generatedResultId:null,operationCategory:"import"}],Le={activityId:"act-006",timestamp:"2026-02-09T14:40:00Z",toolName:"Range & Bearing",toolVersion:"1.2.0",parameters:{},usedFeatureIds:["track-alpha","deleted-feature"],generatedFeatureIds:[],executionDuration:"PT0.4S",generatedResultId:null,operationCategory:"calculation"};function c(a){const[s,o]=t.useState(a.initialView??"timeline"),[d,u]=t.useState(null),[h,g]=t.useState(L),[W,y]=t.useState(null),F=v=>{v.type==="action:invoke"&&(y(`Action "${v.payload.actionType}" is not yet available.`),setTimeout(()=>y(null),3e3))};return e.jsx("div",{style:{width:320,height:600,border:"1px solid #333"},children:e.jsx(S,{entries:a.entries,featureNames:a.featureNames,viewMode:s,selectedEntryId:d,filterState:h,hasActiveSession:a.hasActiveSession,plotName:"Exercise Alpha",actionResultMessage:W,onMessage:F,onViewModeChange:o,onFilterStateChange:g,onSelectedEntryChange:u})})}const ze={title:"LogPanel",component:S,parameters:{layout:"centered"}},N={name:"Timeline Default",render:()=>e.jsx(c,{entries:r,featureNames:n,hasActiveSession:!0})},x={name:"Empty State (No Plot)",render:()=>e.jsx(c,{entries:[],featureNames:{},hasActiveSession:!1})},I={name:"Empty State (No Entries)",render:()=>e.jsx(c,{entries:[],featureNames:n,hasActiveSession:!0})},w={name:"Entry Selected",render:()=>{const a=()=>{const[s,o]=t.useState("act-005"),[d,u]=t.useState(L);return e.jsx("div",{style:{width:320,height:600,border:"1px solid #333"},children:e.jsx(S,{entries:r,featureNames:n,viewMode:"timeline",selectedEntryId:s,filterState:d,hasActiveSession:!0,plotName:"Exercise Alpha",actionResultMessage:null,onFilterStateChange:u,onSelectedEntryChange:o})})};return e.jsx(a,{})}},C={name:"Entry with Deleted Feature",render:()=>e.jsx(c,{entries:[Le,...r],featureNames:n,hasActiveSession:!0})},b={name:"Compact View",render:()=>e.jsx(c,{entries:r,featureNames:n,hasActiveSession:!0,initialView:"compact"})},A={name:"Timeline View",render:()=>e.jsx(c,{entries:r,featureNames:n,hasActiveSession:!0,initialView:"timeline"})},T={name:"Detailed View",render:()=>e.jsx(c,{entries:r,featureNames:n,hasActiveSession:!0,initialView:"detailed"})},V={name:"Filter Active",render:()=>{const a=()=>{const[s,o]=t.useState("timeline"),[d,u]=t.useState(null),[h,g]=t.useState({searchText:"",toolType:null,operationCategory:null,isExpanded:!0});return e.jsx("div",{style:{width:320,height:600,border:"1px solid #333"},children:e.jsx(S,{entries:r,featureNames:n,viewMode:s,selectedEntryId:d,filterState:h,hasActiveSession:!0,plotName:"Exercise Alpha",actionResultMessage:null,onViewModeChange:o,onFilterStateChange:g,onSelectedEntryChange:u})})};return e.jsx(a,{})}},k={name:"By-Feature View",render:()=>e.jsx(c,{entries:r,featureNames:n,hasActiveSession:!0,initialView:"by-feature"})},j={name:"Actions Disabled (No Selection)",render:()=>{const a=()=>{const[s,o]=t.useState(L);return e.jsx("div",{style:{width:320,height:600,border:"1px solid #333"},children:e.jsx(S,{entries:r,featureNames:n,viewMode:"timeline",selectedEntryId:null,filterState:s,hasActiveSession:!0,plotName:"Exercise Alpha",actionResultMessage:null,onFilterStateChange:o})})};return e.jsx(a,{})}},We={...r[0],activityId:"act-disabled-001",disabled:!0},Be={...r[0],activityId:"act-rationale-001",rationale:"Increased range to capture distant contacts from the latest exercise data."};function B(a){const[s,o]=t.useState("timeline"),[d,u]=t.useState(null),[h,g]=t.useState(L),[W,y]=t.useState(null),[F,v]=t.useState(a.entries),je=t.useCallback(l=>{l.type==="action:invoke"&&(y(`Action "${l.payload.actionType}" invoked.`),setTimeout(()=>y(null),3e3))},[]),De=t.useCallback(l=>{const m=F.find(i=>i.toolName===l),p=[];if(m)for(const[i,f]of Object.entries(m.parameters)){const E=typeof f.value=="number",_=i==="color";p.push({name:i,type:E?"number":"string",description:null,tunable:f.tunable,defaultValue:f.default?f.value:null,minimum:E?0:null,maximum:E?Number(f.value)*3:null,step:E?1:null,choices:_?["red","blue","green","yellow","orange","purple","cyan","magenta","white","pink","navy","teal"]:null,paramType:_?"NamedColor":null})}return Promise.resolve(p)},[F]),Re=t.useCallback((l,m)=>{v(p=>p.map(i=>i.activityId===l?{...i,disabled:m}:i))},[]),Pe=t.useCallback((l,m)=>{v(p=>p.map(i=>i.activityId===l?{...i,rationale:m}:i))},[]);return e.jsx("div",{style:{width:320,height:600,border:"1px solid #333"},children:e.jsx(S,{entries:F,featureNames:a.featureNames,viewMode:s,selectedEntryId:d,filterState:h,hasActiveSession:!0,plotName:"Exercise Alpha",actionResultMessage:W,onMessage:je,onViewModeChange:o,onFilterStateChange:g,onSelectedEntryChange:u,onSchemaRequest:De,onDisableToggle:Re,onRationaleUpdate:Pe})})}const D={name:"Flip Card — Edit Icon",render:()=>e.jsx(B,{entries:r,featureNames:n})},R={name:"Flip Card — Disabled Entry",render:()=>e.jsx(B,{entries:[We,...r.slice(1)],featureNames:n})},P={name:"Flip Card — With Rationale",render:()=>e.jsx(B,{entries:[Be,...r.slice(1)],featureNames:n})},M={name:"CardFlip Primitive",render:()=>{const a=()=>{const[s,o]=t.useState(!1);return e.jsxs("div",{style:{width:320,padding:16},children:[e.jsx("button",{onClick:()=>o(!s),style:{marginBottom:8},children:s?"Show Front":"Show Back"}),e.jsx(Me,{isFlipped:s,front:e.jsxs("div",{style:{padding:16,background:"#1e1e1e",border:"1px solid #333"},children:[e.jsx("strong",{children:"Front Face"}),e.jsx("p",{children:"Tool name, features, parameters"})]}),back:e.jsxs("div",{style:{padding:16,background:"#252526",border:"1px solid #333"},children:[e.jsx("strong",{children:"Back Face (Edit)"}),e.jsx("p",{children:"Parameter controls, rationale, disable"})]})})]})};return e.jsx(a,{})}};var Z,U,q;N.parameters={...N.parameters,docs:{...(Z=N.parameters)==null?void 0:Z.docs,source:{originalSource:`{
  name: 'Timeline Default',
  render: () => <LogPanelInteractive entries={sampleEntries} featureNames={sampleFeatureNames} hasActiveSession={true} />
}`,...(q=(U=N.parameters)==null?void 0:U.docs)==null?void 0:q.source}}};var O,$,z;x.parameters={...x.parameters,docs:{...(O=x.parameters)==null?void 0:O.docs,source:{originalSource:`{
  name: 'Empty State (No Plot)',
  render: () => <LogPanelInteractive entries={[]} featureNames={{}} hasActiveSession={false} />
}`,...(z=($=x.parameters)==null?void 0:$.docs)==null?void 0:z.source}}};var G,H,J;I.parameters={...I.parameters,docs:{...(G=I.parameters)==null?void 0:G.docs,source:{originalSource:`{
  name: 'Empty State (No Entries)',
  render: () => <LogPanelInteractive entries={[]} featureNames={sampleFeatureNames} hasActiveSession={true} />
}`,...(J=(H=I.parameters)==null?void 0:H.docs)==null?void 0:J.source}}};var K,Q,X;w.parameters={...w.parameters,docs:{...(K=w.parameters)==null?void 0:K.docs,source:{originalSource:`{
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
}`,...(X=(Q=w.parameters)==null?void 0:Q.docs)==null?void 0:X.source}}};var Y,ee,te;C.parameters={...C.parameters,docs:{...(Y=C.parameters)==null?void 0:Y.docs,source:{originalSource:`{
  name: 'Entry with Deleted Feature',
  render: () => <LogPanelInteractive entries={[entryWithDeletedFeature, ...sampleEntries]} featureNames={sampleFeatureNames} hasActiveSession={true} />
}`,...(te=(ee=C.parameters)==null?void 0:ee.docs)==null?void 0:te.source}}};var ae,re,se;b.parameters={...b.parameters,docs:{...(ae=b.parameters)==null?void 0:ae.docs,source:{originalSource:`{
  name: 'Compact View',
  render: () => <LogPanelInteractive entries={sampleEntries} featureNames={sampleFeatureNames} hasActiveSession={true} initialView="compact" />
}`,...(se=(re=b.parameters)==null?void 0:re.docs)==null?void 0:se.source}}};var ne,ie,oe;A.parameters={...A.parameters,docs:{...(ne=A.parameters)==null?void 0:ne.docs,source:{originalSource:`{
  name: 'Timeline View',
  render: () => <LogPanelInteractive entries={sampleEntries} featureNames={sampleFeatureNames} hasActiveSession={true} initialView="timeline" />
}`,...(oe=(ie=A.parameters)==null?void 0:ie.docs)==null?void 0:oe.source}}};var le,ce,de;T.parameters={...T.parameters,docs:{...(le=T.parameters)==null?void 0:le.docs,source:{originalSource:`{
  name: 'Detailed View',
  render: () => <LogPanelInteractive entries={sampleEntries} featureNames={sampleFeatureNames} hasActiveSession={true} initialView="detailed" />
}`,...(de=(ce=T.parameters)==null?void 0:ce.docs)==null?void 0:de.source}}};var ue,me,pe;V.parameters={...V.parameters,docs:{...(ue=V.parameters)==null?void 0:ue.docs,source:{originalSource:`{
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
}`,...(pe=(me=V.parameters)==null?void 0:me.docs)==null?void 0:pe.source}}};var Se,he,ge;k.parameters={...k.parameters,docs:{...(Se=k.parameters)==null?void 0:Se.docs,source:{originalSource:`{
  name: 'By-Feature View',
  render: () => <LogPanelInteractive entries={sampleEntries} featureNames={sampleFeatureNames} hasActiveSession={true} initialView="by-feature" />
}`,...(ge=(he=k.parameters)==null?void 0:he.docs)==null?void 0:ge.source}}};var ye,Fe,ve;j.parameters={...j.parameters,docs:{...(ye=j.parameters)==null?void 0:ye.docs,source:{originalSource:`{
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
}`,...(ve=(Fe=j.parameters)==null?void 0:Fe.docs)==null?void 0:ve.source}}};var fe,Ee,Ne;D.parameters={...D.parameters,docs:{...(fe=D.parameters)==null?void 0:fe.docs,source:{originalSource:`{
  name: 'Flip Card — Edit Icon',
  render: () => <FlipCardInteractive entries={sampleEntries} featureNames={sampleFeatureNames} />
}`,...(Ne=(Ee=D.parameters)==null?void 0:Ee.docs)==null?void 0:Ne.source}}};var xe,Ie,we;R.parameters={...R.parameters,docs:{...(xe=R.parameters)==null?void 0:xe.docs,source:{originalSource:`{
  name: 'Flip Card — Disabled Entry',
  render: () => <FlipCardInteractive entries={[disabledEntry, ...sampleEntries.slice(1)]} featureNames={sampleFeatureNames} />
}`,...(we=(Ie=R.parameters)==null?void 0:Ie.docs)==null?void 0:we.source}}};var Ce,be,Ae;P.parameters={...P.parameters,docs:{...(Ce=P.parameters)==null?void 0:Ce.docs,source:{originalSource:`{
  name: 'Flip Card — With Rationale',
  render: () => <FlipCardInteractive entries={[entryWithRationale, ...sampleEntries.slice(1)]} featureNames={sampleFeatureNames} />
}`,...(Ae=(be=P.parameters)==null?void 0:be.docs)==null?void 0:Ae.source}}};var Te,Ve,ke;M.parameters={...M.parameters,docs:{...(Te=M.parameters)==null?void 0:Te.docs,source:{originalSource:`{
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
}`,...(ke=(Ve=M.parameters)==null?void 0:Ve.docs)==null?void 0:ke.source}}};const Ge=["TimelineDefault","EmptyNoPlot","EmptyNoEntries","EntrySelected","EntryWithDeletedFeature","CompactView","TimelineView","DetailedView","FilterActive","ByFeatureView","ActionsDisabled","FlipCardDefault","FlipCardDisabled","FlipCardRationale","CardFlipPrimitive"];export{j as ActionsDisabled,k as ByFeatureView,M as CardFlipPrimitive,b as CompactView,T as DetailedView,I as EmptyNoEntries,x as EmptyNoPlot,w as EntrySelected,C as EntryWithDeletedFeature,V as FilterActive,D as FlipCardDefault,R as FlipCardDisabled,P as FlipCardRationale,N as TimelineDefault,A as TimelineView,Ge as __namedExportsOrder,ze as default};
