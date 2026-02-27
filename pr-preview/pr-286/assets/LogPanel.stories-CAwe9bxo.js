import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r as t}from"./index-B2-qRKKC.js";import{L as S,D as B,C as Le}from"./types-CC7Ic2Ai.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./ParameterEditor-Dr5F3Mwy.js";const n={"track-alpha":"Track Alpha","track-bravo":"Track Bravo","track-charlie":"Track Charlie","result-rb-001":"Range & Bearing Result","result-cpa-001":"CPA Result","deleted-feature":void 0},r=[{activityId:"act-005",timestamp:"2026-02-09T14:35:00Z",toolName:"Range & Bearing",toolVersion:"1.2.0",parameters:{maxRange:{value:5e3,default:!1,tunable:!0},units:{value:"metres",default:!0,tunable:!1}},usedFeatureIds:["track-alpha","track-bravo"],generatedFeatureIds:["result-rb-001"],executionDuration:"PT0.5S",generatedResultId:"result-rb-001",operationCategory:"calculation"},{activityId:"act-004",timestamp:"2026-02-09T14:30:00Z",toolName:"Closest Approach",toolVersion:"1.1.0",parameters:{threshold:{value:2e3,default:!1,tunable:!0}},usedFeatureIds:["track-alpha","track-charlie"],generatedFeatureIds:["result-cpa-001"],executionDuration:"PT1.2S",generatedResultId:"result-cpa-001",operationCategory:"calculation"},{activityId:"act-003",timestamp:"2026-02-09T14:25:00Z",toolName:"Track Statistics",toolVersion:"1.0.0",parameters:{},usedFeatureIds:["track-alpha"],generatedFeatureIds:[],executionDuration:"PT0.3S",generatedResultId:null,operationCategory:"calculation"},{activityId:"act-002",timestamp:"2026-02-09T14:20:00Z",toolName:"change-track-color",toolVersion:"1.0.0",parameters:{color:{value:"#ff0000",default:!1,tunable:!1}},usedFeatureIds:["track-bravo"],generatedFeatureIds:[],executionDuration:"PT0.05S",generatedResultId:null,operationCategory:"property-edit"},{activityId:"act-001",timestamp:"2026-02-09T14:00:00Z",toolName:"load-rep",toolVersion:"1.0.0",parameters:{file:{value:"exercise_data.rep",default:!1,tunable:!1}},usedFeatureIds:[],generatedFeatureIds:["track-alpha","track-bravo","track-charlie"],executionDuration:"PT2.1S",generatedResultId:null,operationCategory:"import"}],We={activityId:"act-006",timestamp:"2026-02-09T14:40:00Z",toolName:"Range & Bearing",toolVersion:"1.2.0",parameters:{},usedFeatureIds:["track-alpha","deleted-feature"],generatedFeatureIds:[],executionDuration:"PT0.4S",generatedResultId:null,operationCategory:"calculation"};function d(a){const[s,o]=t.useState(a.initialMode??"normal"),[c,u]=t.useState(a.initialView??"timeline"),[h,g]=t.useState(null),[F,v]=t.useState(B),[_,y]=t.useState(null),f=E=>{E.type==="action:invoke"&&(y(`Action "${E.payload.actionType}" is not yet available.`),setTimeout(()=>y(null),3e3))};return e.jsx("div",{style:{width:320,height:600,border:"1px solid #333"},children:e.jsx(S,{entries:a.entries,featureNames:a.featureNames,presentationMode:s,viewMode:c,selectedEntryId:h,filterState:F,hasActiveSession:a.hasActiveSession,plotName:"Exercise Alpha",actionResultMessage:_,onMessage:f,onPresentationModeChange:o,onViewModeChange:u,onFilterStateChange:v,onSelectedEntryChange:g})})}const ze={title:"LogPanel",component:S,parameters:{layout:"centered"}},M={name:"Timeline Default",render:()=>e.jsx(d,{entries:r,featureNames:n,hasActiveSession:!0})},I={name:"Empty State (No Plot)",render:()=>e.jsx(d,{entries:[],featureNames:{},hasActiveSession:!1})},C={name:"Empty State (No Entries)",render:()=>e.jsx(d,{entries:[],featureNames:n,hasActiveSession:!0})},b={name:"Entry Selected",render:()=>{const a=()=>{const[s,o]=t.useState("act-005"),[c,u]=t.useState(B);return e.jsx("div",{style:{width:320,height:600,border:"1px solid #333"},children:e.jsx(S,{entries:r,featureNames:n,presentationMode:"normal",viewMode:"timeline",selectedEntryId:s,filterState:c,hasActiveSession:!0,plotName:"Exercise Alpha",actionResultMessage:null,onFilterStateChange:u,onSelectedEntryChange:o})})};return e.jsx(a,{})}},A={name:"Entry with Deleted Feature",render:()=>e.jsx(d,{entries:[We,...r],featureNames:n,hasActiveSession:!0})},T={name:"Compact Mode",render:()=>e.jsx(d,{entries:r,featureNames:n,hasActiveSession:!0,initialMode:"compact"})},w={name:"Normal Mode",render:()=>e.jsx(d,{entries:r,featureNames:n,hasActiveSession:!0,initialMode:"normal"})},P={name:"Detailed Mode",render:()=>e.jsx(d,{entries:r,featureNames:n,hasActiveSession:!0,initialMode:"detailed"})},j={name:"Filter Active",render:()=>{const a=()=>{const[s,o]=t.useState("normal"),[c,u]=t.useState("timeline"),[h,g]=t.useState(null),[F,v]=t.useState({searchText:"",toolType:null,operationCategory:null,isExpanded:!0});return e.jsx("div",{style:{width:320,height:600,border:"1px solid #333"},children:e.jsx(S,{entries:r,featureNames:n,presentationMode:s,viewMode:c,selectedEntryId:h,filterState:F,hasActiveSession:!0,plotName:"Exercise Alpha",actionResultMessage:null,onPresentationModeChange:o,onViewModeChange:u,onFilterStateChange:v,onSelectedEntryChange:g})})};return e.jsx(a,{})}},k={name:"By-Feature View",render:()=>e.jsx(d,{entries:r,featureNames:n,hasActiveSession:!0,initialView:"by-feature"})},D={name:"Actions Disabled (No Selection)",render:()=>{const a=()=>{const[s,o]=t.useState(B);return e.jsx("div",{style:{width:320,height:600,border:"1px solid #333"},children:e.jsx(S,{entries:r,featureNames:n,presentationMode:"normal",viewMode:"timeline",selectedEntryId:null,filterState:s,hasActiveSession:!0,plotName:"Exercise Alpha",actionResultMessage:null,onFilterStateChange:o})})};return e.jsx(a,{})}},Be={...r[0],activityId:"act-disabled-001",disabled:!0},_e={...r[0],activityId:"act-rationale-001",rationale:"Increased range to capture distant contacts from the latest exercise data."};function Z(a){const[s,o]=t.useState("normal"),[c,u]=t.useState("timeline"),[h,g]=t.useState(null),[F,v]=t.useState(B),[_,y]=t.useState(null),[f,E]=t.useState(a.entries),ke=t.useCallback(l=>{l.type==="action:invoke"&&(y(`Action "${l.payload.actionType}" invoked.`),setTimeout(()=>y(null),3e3))},[]),De=t.useCallback(l=>{const m=f.find(i=>i.toolName===l),p=[];if(m)for(const[i,N]of Object.entries(m.parameters)){const x=typeof N.value=="number";p.push({name:i,type:x?"number":"string",description:`Parameter "${i}"`,tunable:N.tunable,defaultValue:N.default?N.value:null,minimum:x?0:null,maximum:x?Number(N.value)*3:null,step:x?1:null,choices:null,paramType:null})}return Promise.resolve(p)},[f]),Re=t.useCallback((l,m)=>{E(p=>p.map(i=>i.activityId===l?{...i,disabled:m}:i))},[]),Ve=t.useCallback((l,m)=>{E(p=>p.map(i=>i.activityId===l?{...i,rationale:m}:i))},[]);return e.jsx("div",{style:{width:320,height:600,border:"1px solid #333"},children:e.jsx(S,{entries:f,featureNames:a.featureNames,presentationMode:s,viewMode:c,selectedEntryId:h,filterState:F,hasActiveSession:!0,plotName:"Exercise Alpha",actionResultMessage:_,onMessage:ke,onPresentationModeChange:o,onViewModeChange:u,onFilterStateChange:v,onSelectedEntryChange:g,onSchemaRequest:De,onDisableToggle:Re,onRationaleUpdate:Ve})})}const R={name:"Flip Card — Edit Icon",render:()=>e.jsx(Z,{entries:r,featureNames:n})},V={name:"Flip Card — Disabled Entry",render:()=>e.jsx(Z,{entries:[Be,...r.slice(1)],featureNames:n})},L={name:"Flip Card — With Rationale",render:()=>e.jsx(Z,{entries:[_e,...r.slice(1)],featureNames:n})},W={name:"CardFlip Primitive",render:()=>{const a=()=>{const[s,o]=t.useState(!1);return e.jsxs("div",{style:{width:320,padding:16},children:[e.jsx("button",{onClick:()=>o(!s),style:{marginBottom:8},children:s?"Show Front":"Show Back"}),e.jsx(Le,{isFlipped:s,front:e.jsxs("div",{style:{padding:16,background:"#1e1e1e",border:"1px solid #333"},children:[e.jsx("strong",{children:"Front Face"}),e.jsx("p",{children:"Tool name, features, parameters"})]}),back:e.jsxs("div",{style:{padding:16,background:"#252526",border:"1px solid #333"},children:[e.jsx("strong",{children:"Back Face (Edit)"}),e.jsx("p",{children:"Parameter controls, rationale, disable"})]})})]})};return e.jsx(a,{})}};var U,$,q;M.parameters={...M.parameters,docs:{...(U=M.parameters)==null?void 0:U.docs,source:{originalSource:`{
  name: 'Timeline Default',
  render: () => <LogPanelInteractive entries={sampleEntries} featureNames={sampleFeatureNames} hasActiveSession={true} />
}`,...(q=($=M.parameters)==null?void 0:$.docs)==null?void 0:q.source}}};var O,z,G;I.parameters={...I.parameters,docs:{...(O=I.parameters)==null?void 0:O.docs,source:{originalSource:`{
  name: 'Empty State (No Plot)',
  render: () => <LogPanelInteractive entries={[]} featureNames={{}} hasActiveSession={false} />
}`,...(G=(z=I.parameters)==null?void 0:z.docs)==null?void 0:G.source}}};var H,J,K;C.parameters={...C.parameters,docs:{...(H=C.parameters)==null?void 0:H.docs,source:{originalSource:`{
  name: 'Empty State (No Entries)',
  render: () => <LogPanelInteractive entries={[]} featureNames={sampleFeatureNames} hasActiveSession={true} />
}`,...(K=(J=C.parameters)==null?void 0:J.docs)==null?void 0:K.source}}};var Q,X,Y;b.parameters={...b.parameters,docs:{...(Q=b.parameters)==null?void 0:Q.docs,source:{originalSource:`{
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
          <LogPanel entries={sampleEntries} featureNames={sampleFeatureNames} presentationMode="normal" viewMode="timeline" selectedEntryId={selectedEntryId} filterState={filterState} hasActiveSession={true} plotName="Exercise Alpha" actionResultMessage={null} onFilterStateChange={setFilterState} onSelectedEntryChange={setSelectedEntryId} />
        </div>;
    };
    return <Wrapper />;
  }
}`,...(Y=(X=b.parameters)==null?void 0:X.docs)==null?void 0:Y.source}}};var ee,te,ae;A.parameters={...A.parameters,docs:{...(ee=A.parameters)==null?void 0:ee.docs,source:{originalSource:`{
  name: 'Entry with Deleted Feature',
  render: () => <LogPanelInteractive entries={[entryWithDeletedFeature, ...sampleEntries]} featureNames={sampleFeatureNames} hasActiveSession={true} />
}`,...(ae=(te=A.parameters)==null?void 0:te.docs)==null?void 0:ae.source}}};var re,se,ne;T.parameters={...T.parameters,docs:{...(re=T.parameters)==null?void 0:re.docs,source:{originalSource:`{
  name: 'Compact Mode',
  render: () => <LogPanelInteractive entries={sampleEntries} featureNames={sampleFeatureNames} hasActiveSession={true} initialMode="compact" />
}`,...(ne=(se=T.parameters)==null?void 0:se.docs)==null?void 0:ne.source}}};var ie,oe,le;w.parameters={...w.parameters,docs:{...(ie=w.parameters)==null?void 0:ie.docs,source:{originalSource:`{
  name: 'Normal Mode',
  render: () => <LogPanelInteractive entries={sampleEntries} featureNames={sampleFeatureNames} hasActiveSession={true} initialMode="normal" />
}`,...(le=(oe=w.parameters)==null?void 0:oe.docs)==null?void 0:le.source}}};var de,ce,ue;P.parameters={...P.parameters,docs:{...(de=P.parameters)==null?void 0:de.docs,source:{originalSource:`{
  name: 'Detailed Mode',
  render: () => <LogPanelInteractive entries={sampleEntries} featureNames={sampleFeatureNames} hasActiveSession={true} initialMode="detailed" />
}`,...(ue=(ce=P.parameters)==null?void 0:ce.docs)==null?void 0:ue.source}}};var me,pe,Se;j.parameters={...j.parameters,docs:{...(me=j.parameters)==null?void 0:me.docs,source:{originalSource:`{
  name: 'Filter Active',
  render: () => {
    const Wrapper = () => {
      const [presentationMode, setPresentationMode] = useState<PresentationMode>('normal');
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
          <LogPanel entries={sampleEntries} featureNames={sampleFeatureNames} presentationMode={presentationMode} viewMode={viewMode} selectedEntryId={selectedEntryId} filterState={filterState} hasActiveSession={true} plotName="Exercise Alpha" actionResultMessage={null} onPresentationModeChange={setPresentationMode} onViewModeChange={setViewMode} onFilterStateChange={setFilterState} onSelectedEntryChange={setSelectedEntryId} />
        </div>;
    };
    return <Wrapper />;
  }
}`,...(Se=(pe=j.parameters)==null?void 0:pe.docs)==null?void 0:Se.source}}};var he,ge,Fe;k.parameters={...k.parameters,docs:{...(he=k.parameters)==null?void 0:he.docs,source:{originalSource:`{
  name: 'By-Feature View',
  render: () => <LogPanelInteractive entries={sampleEntries} featureNames={sampleFeatureNames} hasActiveSession={true} initialView="by-feature" />
}`,...(Fe=(ge=k.parameters)==null?void 0:ge.docs)==null?void 0:Fe.source}}};var ve,ye,fe;D.parameters={...D.parameters,docs:{...(ve=D.parameters)==null?void 0:ve.docs,source:{originalSource:`{
  name: 'Actions Disabled (No Selection)',
  render: () => {
    const Wrapper = () => {
      const [filterState, setFilterState] = useState<FilterState>(DEFAULT_FILTER_STATE);
      return <div style={{
        width: 320,
        height: 600,
        border: '1px solid #333'
      }}>
          <LogPanel entries={sampleEntries} featureNames={sampleFeatureNames} presentationMode="normal" viewMode="timeline" selectedEntryId={null} filterState={filterState} hasActiveSession={true} plotName="Exercise Alpha" actionResultMessage={null} onFilterStateChange={setFilterState} />
        </div>;
    };
    return <Wrapper />;
  }
}`,...(fe=(ye=D.parameters)==null?void 0:ye.docs)==null?void 0:fe.source}}};var Ee,Ne,xe;R.parameters={...R.parameters,docs:{...(Ee=R.parameters)==null?void 0:Ee.docs,source:{originalSource:`{
  name: 'Flip Card — Edit Icon',
  render: () => <FlipCardInteractive entries={sampleEntries} featureNames={sampleFeatureNames} />
}`,...(xe=(Ne=R.parameters)==null?void 0:Ne.docs)==null?void 0:xe.source}}};var Me,Ie,Ce;V.parameters={...V.parameters,docs:{...(Me=V.parameters)==null?void 0:Me.docs,source:{originalSource:`{
  name: 'Flip Card — Disabled Entry',
  render: () => <FlipCardInteractive entries={[disabledEntry, ...sampleEntries.slice(1)]} featureNames={sampleFeatureNames} />
}`,...(Ce=(Ie=V.parameters)==null?void 0:Ie.docs)==null?void 0:Ce.source}}};var be,Ae,Te;L.parameters={...L.parameters,docs:{...(be=L.parameters)==null?void 0:be.docs,source:{originalSource:`{
  name: 'Flip Card — With Rationale',
  render: () => <FlipCardInteractive entries={[entryWithRationale, ...sampleEntries.slice(1)]} featureNames={sampleFeatureNames} />
}`,...(Te=(Ae=L.parameters)==null?void 0:Ae.docs)==null?void 0:Te.source}}};var we,Pe,je;W.parameters={...W.parameters,docs:{...(we=W.parameters)==null?void 0:we.docs,source:{originalSource:`{
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
}`,...(je=(Pe=W.parameters)==null?void 0:Pe.docs)==null?void 0:je.source}}};const Ge=["TimelineDefault","EmptyNoPlot","EmptyNoEntries","EntrySelected","EntryWithDeletedFeature","CompactMode","NormalMode","DetailedMode","FilterActive","ByFeatureView","ActionsDisabled","FlipCardDefault","FlipCardDisabled","FlipCardRationale","CardFlipPrimitive"];export{D as ActionsDisabled,k as ByFeatureView,W as CardFlipPrimitive,T as CompactMode,P as DetailedMode,C as EmptyNoEntries,I as EmptyNoPlot,b as EntrySelected,A as EntryWithDeletedFeature,j as FilterActive,R as FlipCardDefault,V as FlipCardDisabled,L as FlipCardRationale,w as NormalMode,M as TimelineDefault,Ge as __namedExportsOrder,ze as default};
