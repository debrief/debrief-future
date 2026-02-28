import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r as t}from"./index-B2-qRKKC.js";import{L as S,D as B,C as We}from"./types-q3PewLnL.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./ParameterEditor-Dr5F3Mwy.js";const i={"track-alpha":"Track Alpha","track-bravo":"Track Bravo","track-charlie":"Track Charlie","result-rb-001":"Range & Bearing Result","result-cpa-001":"CPA Result","deleted-feature":void 0},r=[{activityId:"act-005",timestamp:"2026-02-09T14:35:00Z",toolName:"Range & Bearing",toolVersion:"1.2.0",parameters:{maxRange:{value:5e3,default:!1,tunable:!0},units:{value:"metres",default:!0,tunable:!1}},usedFeatureIds:["track-alpha","track-bravo"],generatedFeatureIds:["result-rb-001"],executionDuration:"PT0.5S",generatedResultId:"result-rb-001",operationCategory:"calculation"},{activityId:"act-004",timestamp:"2026-02-09T14:30:00Z",toolName:"Closest Approach",toolVersion:"1.1.0",parameters:{threshold:{value:2e3,default:!1,tunable:!0}},usedFeatureIds:["track-alpha","track-charlie"],generatedFeatureIds:["result-cpa-001"],executionDuration:"PT1.2S",generatedResultId:"result-cpa-001",operationCategory:"calculation"},{activityId:"act-003",timestamp:"2026-02-09T14:25:00Z",toolName:"Track Statistics",toolVersion:"1.0.0",parameters:{},usedFeatureIds:["track-alpha"],generatedFeatureIds:[],executionDuration:"PT0.3S",generatedResultId:null,operationCategory:"calculation"},{activityId:"act-002",timestamp:"2026-02-09T14:20:00Z",toolName:"change-track-color",toolVersion:"1.0.0",parameters:{color:{value:"red",default:!1,tunable:!0}},usedFeatureIds:["track-bravo"],generatedFeatureIds:[],executionDuration:"PT0.05S",generatedResultId:null,operationCategory:"property-edit"},{activityId:"act-001",timestamp:"2026-02-09T14:00:00Z",toolName:"load-rep",toolVersion:"1.0.0",parameters:{file:{value:"exercise_data.rep",default:!1,tunable:!1}},usedFeatureIds:[],generatedFeatureIds:["track-alpha","track-bravo","track-charlie"],executionDuration:"PT2.1S",generatedResultId:null,operationCategory:"import"}],Be={activityId:"act-006",timestamp:"2026-02-09T14:40:00Z",toolName:"Range & Bearing",toolVersion:"1.2.0",parameters:{},usedFeatureIds:["track-alpha","deleted-feature"],generatedFeatureIds:[],executionDuration:"PT0.4S",generatedResultId:null,operationCategory:"calculation"};function d(a){const[s,o]=t.useState(a.initialMode??"normal"),[c,u]=t.useState(a.initialView??"timeline"),[h,g]=t.useState(null),[y,F]=t.useState(B),[_,v]=t.useState(null),f=E=>{E.type==="action:invoke"&&(v(`Action "${E.payload.actionType}" is not yet available.`),setTimeout(()=>v(null),3e3))};return e.jsx("div",{style:{width:320,height:600,border:"1px solid #333"},children:e.jsx(S,{entries:a.entries,featureNames:a.featureNames,presentationMode:s,viewMode:c,selectedEntryId:h,filterState:y,hasActiveSession:a.hasActiveSession,plotName:"Exercise Alpha",actionResultMessage:_,onMessage:f,onPresentationModeChange:o,onViewModeChange:u,onFilterStateChange:F,onSelectedEntryChange:g})})}const Ge={title:"LogPanel",component:S,parameters:{layout:"centered"}},M={name:"Timeline Default",render:()=>e.jsx(d,{entries:r,featureNames:i,hasActiveSession:!0})},I={name:"Empty State (No Plot)",render:()=>e.jsx(d,{entries:[],featureNames:{},hasActiveSession:!1})},C={name:"Empty State (No Entries)",render:()=>e.jsx(d,{entries:[],featureNames:i,hasActiveSession:!0})},b={name:"Entry Selected",render:()=>{const a=()=>{const[s,o]=t.useState("act-005"),[c,u]=t.useState(B);return e.jsx("div",{style:{width:320,height:600,border:"1px solid #333"},children:e.jsx(S,{entries:r,featureNames:i,presentationMode:"normal",viewMode:"timeline",selectedEntryId:s,filterState:c,hasActiveSession:!0,plotName:"Exercise Alpha",actionResultMessage:null,onFilterStateChange:u,onSelectedEntryChange:o})})};return e.jsx(a,{})}},A={name:"Entry with Deleted Feature",render:()=>e.jsx(d,{entries:[Be,...r],featureNames:i,hasActiveSession:!0})},w={name:"Compact Mode",render:()=>e.jsx(d,{entries:r,featureNames:i,hasActiveSession:!0,initialMode:"compact"})},T={name:"Normal Mode",render:()=>e.jsx(d,{entries:r,featureNames:i,hasActiveSession:!0,initialMode:"normal"})},P={name:"Detailed Mode",render:()=>e.jsx(d,{entries:r,featureNames:i,hasActiveSession:!0,initialMode:"detailed"})},k={name:"Filter Active",render:()=>{const a=()=>{const[s,o]=t.useState("normal"),[c,u]=t.useState("timeline"),[h,g]=t.useState(null),[y,F]=t.useState({searchText:"",toolType:null,operationCategory:null,isExpanded:!0});return e.jsx("div",{style:{width:320,height:600,border:"1px solid #333"},children:e.jsx(S,{entries:r,featureNames:i,presentationMode:s,viewMode:c,selectedEntryId:h,filterState:y,hasActiveSession:!0,plotName:"Exercise Alpha",actionResultMessage:null,onPresentationModeChange:o,onViewModeChange:u,onFilterStateChange:F,onSelectedEntryChange:g})})};return e.jsx(a,{})}},j={name:"By-Feature View",render:()=>e.jsx(d,{entries:r,featureNames:i,hasActiveSession:!0,initialView:"by-feature"})},D={name:"Actions Disabled (No Selection)",render:()=>{const a=()=>{const[s,o]=t.useState(B);return e.jsx("div",{style:{width:320,height:600,border:"1px solid #333"},children:e.jsx(S,{entries:r,featureNames:i,presentationMode:"normal",viewMode:"timeline",selectedEntryId:null,filterState:s,hasActiveSession:!0,plotName:"Exercise Alpha",actionResultMessage:null,onFilterStateChange:o})})};return e.jsx(a,{})}},_e={...r[0],activityId:"act-disabled-001",disabled:!0},Ze={...r[0],activityId:"act-rationale-001",rationale:"Increased range to capture distant contacts from the latest exercise data."};function Z(a){const[s,o]=t.useState("normal"),[c,u]=t.useState("timeline"),[h,g]=t.useState(null),[y,F]=t.useState(B),[_,v]=t.useState(null),[f,E]=t.useState(a.entries),De=t.useCallback(l=>{l.type==="action:invoke"&&(v(`Action "${l.payload.actionType}" invoked.`),setTimeout(()=>v(null),3e3))},[]),Re=t.useCallback(l=>{const m=f.find(n=>n.toolName===l),p=[];if(m)for(const[n,N]of Object.entries(m.parameters)){const x=typeof N.value=="number",U=n==="color";p.push({name:n,type:x?"number":"string",description:`Parameter "${n}"`,tunable:N.tunable,defaultValue:N.default?N.value:null,minimum:x?0:null,maximum:x?Number(N.value)*3:null,step:x?1:null,choices:U?["red","blue","green","yellow","orange","purple","cyan","magenta","white","pink","navy","teal"]:null,paramType:U?"NamedColor":null})}return Promise.resolve(p)},[f]),Ve=t.useCallback((l,m)=>{E(p=>p.map(n=>n.activityId===l?{...n,disabled:m}:n))},[]),Le=t.useCallback((l,m)=>{E(p=>p.map(n=>n.activityId===l?{...n,rationale:m}:n))},[]);return e.jsx("div",{style:{width:320,height:600,border:"1px solid #333"},children:e.jsx(S,{entries:f,featureNames:a.featureNames,presentationMode:s,viewMode:c,selectedEntryId:h,filterState:y,hasActiveSession:!0,plotName:"Exercise Alpha",actionResultMessage:_,onMessage:De,onPresentationModeChange:o,onViewModeChange:u,onFilterStateChange:F,onSelectedEntryChange:g,onSchemaRequest:Re,onDisableToggle:Ve,onRationaleUpdate:Le})})}const R={name:"Flip Card — Edit Icon",render:()=>e.jsx(Z,{entries:r,featureNames:i})},V={name:"Flip Card — Disabled Entry",render:()=>e.jsx(Z,{entries:[_e,...r.slice(1)],featureNames:i})},L={name:"Flip Card — With Rationale",render:()=>e.jsx(Z,{entries:[Ze,...r.slice(1)],featureNames:i})},W={name:"CardFlip Primitive",render:()=>{const a=()=>{const[s,o]=t.useState(!1);return e.jsxs("div",{style:{width:320,padding:16},children:[e.jsx("button",{onClick:()=>o(!s),style:{marginBottom:8},children:s?"Show Front":"Show Back"}),e.jsx(We,{isFlipped:s,front:e.jsxs("div",{style:{padding:16,background:"#1e1e1e",border:"1px solid #333"},children:[e.jsx("strong",{children:"Front Face"}),e.jsx("p",{children:"Tool name, features, parameters"})]}),back:e.jsxs("div",{style:{padding:16,background:"#252526",border:"1px solid #333"},children:[e.jsx("strong",{children:"Back Face (Edit)"}),e.jsx("p",{children:"Parameter controls, rationale, disable"})]})})]})};return e.jsx(a,{})}};var $,q,O;M.parameters={...M.parameters,docs:{...($=M.parameters)==null?void 0:$.docs,source:{originalSource:`{
  name: 'Timeline Default',
  render: () => <LogPanelInteractive entries={sampleEntries} featureNames={sampleFeatureNames} hasActiveSession={true} />
}`,...(O=(q=M.parameters)==null?void 0:q.docs)==null?void 0:O.source}}};var z,G,H;I.parameters={...I.parameters,docs:{...(z=I.parameters)==null?void 0:z.docs,source:{originalSource:`{
  name: 'Empty State (No Plot)',
  render: () => <LogPanelInteractive entries={[]} featureNames={{}} hasActiveSession={false} />
}`,...(H=(G=I.parameters)==null?void 0:G.docs)==null?void 0:H.source}}};var J,K,Q;C.parameters={...C.parameters,docs:{...(J=C.parameters)==null?void 0:J.docs,source:{originalSource:`{
  name: 'Empty State (No Entries)',
  render: () => <LogPanelInteractive entries={[]} featureNames={sampleFeatureNames} hasActiveSession={true} />
}`,...(Q=(K=C.parameters)==null?void 0:K.docs)==null?void 0:Q.source}}};var X,Y,ee;b.parameters={...b.parameters,docs:{...(X=b.parameters)==null?void 0:X.docs,source:{originalSource:`{
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
}`,...(ee=(Y=b.parameters)==null?void 0:Y.docs)==null?void 0:ee.source}}};var te,ae,re;A.parameters={...A.parameters,docs:{...(te=A.parameters)==null?void 0:te.docs,source:{originalSource:`{
  name: 'Entry with Deleted Feature',
  render: () => <LogPanelInteractive entries={[entryWithDeletedFeature, ...sampleEntries]} featureNames={sampleFeatureNames} hasActiveSession={true} />
}`,...(re=(ae=A.parameters)==null?void 0:ae.docs)==null?void 0:re.source}}};var se,ne,ie;w.parameters={...w.parameters,docs:{...(se=w.parameters)==null?void 0:se.docs,source:{originalSource:`{
  name: 'Compact Mode',
  render: () => <LogPanelInteractive entries={sampleEntries} featureNames={sampleFeatureNames} hasActiveSession={true} initialMode="compact" />
}`,...(ie=(ne=w.parameters)==null?void 0:ne.docs)==null?void 0:ie.source}}};var oe,le,de;T.parameters={...T.parameters,docs:{...(oe=T.parameters)==null?void 0:oe.docs,source:{originalSource:`{
  name: 'Normal Mode',
  render: () => <LogPanelInteractive entries={sampleEntries} featureNames={sampleFeatureNames} hasActiveSession={true} initialMode="normal" />
}`,...(de=(le=T.parameters)==null?void 0:le.docs)==null?void 0:de.source}}};var ce,ue,me;P.parameters={...P.parameters,docs:{...(ce=P.parameters)==null?void 0:ce.docs,source:{originalSource:`{
  name: 'Detailed Mode',
  render: () => <LogPanelInteractive entries={sampleEntries} featureNames={sampleFeatureNames} hasActiveSession={true} initialMode="detailed" />
}`,...(me=(ue=P.parameters)==null?void 0:ue.docs)==null?void 0:me.source}}};var pe,Se,he;k.parameters={...k.parameters,docs:{...(pe=k.parameters)==null?void 0:pe.docs,source:{originalSource:`{
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
}`,...(he=(Se=k.parameters)==null?void 0:Se.docs)==null?void 0:he.source}}};var ge,ye,Fe;j.parameters={...j.parameters,docs:{...(ge=j.parameters)==null?void 0:ge.docs,source:{originalSource:`{
  name: 'By-Feature View',
  render: () => <LogPanelInteractive entries={sampleEntries} featureNames={sampleFeatureNames} hasActiveSession={true} initialView="by-feature" />
}`,...(Fe=(ye=j.parameters)==null?void 0:ye.docs)==null?void 0:Fe.source}}};var ve,fe,Ee;D.parameters={...D.parameters,docs:{...(ve=D.parameters)==null?void 0:ve.docs,source:{originalSource:`{
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
}`,...(Ee=(fe=D.parameters)==null?void 0:fe.docs)==null?void 0:Ee.source}}};var Ne,xe,Me;R.parameters={...R.parameters,docs:{...(Ne=R.parameters)==null?void 0:Ne.docs,source:{originalSource:`{
  name: 'Flip Card — Edit Icon',
  render: () => <FlipCardInteractive entries={sampleEntries} featureNames={sampleFeatureNames} />
}`,...(Me=(xe=R.parameters)==null?void 0:xe.docs)==null?void 0:Me.source}}};var Ie,Ce,be;V.parameters={...V.parameters,docs:{...(Ie=V.parameters)==null?void 0:Ie.docs,source:{originalSource:`{
  name: 'Flip Card — Disabled Entry',
  render: () => <FlipCardInteractive entries={[disabledEntry, ...sampleEntries.slice(1)]} featureNames={sampleFeatureNames} />
}`,...(be=(Ce=V.parameters)==null?void 0:Ce.docs)==null?void 0:be.source}}};var Ae,we,Te;L.parameters={...L.parameters,docs:{...(Ae=L.parameters)==null?void 0:Ae.docs,source:{originalSource:`{
  name: 'Flip Card — With Rationale',
  render: () => <FlipCardInteractive entries={[entryWithRationale, ...sampleEntries.slice(1)]} featureNames={sampleFeatureNames} />
}`,...(Te=(we=L.parameters)==null?void 0:we.docs)==null?void 0:Te.source}}};var Pe,ke,je;W.parameters={...W.parameters,docs:{...(Pe=W.parameters)==null?void 0:Pe.docs,source:{originalSource:`{
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
}`,...(je=(ke=W.parameters)==null?void 0:ke.docs)==null?void 0:je.source}}};const He=["TimelineDefault","EmptyNoPlot","EmptyNoEntries","EntrySelected","EntryWithDeletedFeature","CompactMode","NormalMode","DetailedMode","FilterActive","ByFeatureView","ActionsDisabled","FlipCardDefault","FlipCardDisabled","FlipCardRationale","CardFlipPrimitive"];export{D as ActionsDisabled,j as ByFeatureView,W as CardFlipPrimitive,w as CompactMode,P as DetailedMode,C as EmptyNoEntries,I as EmptyNoPlot,b as EntrySelected,A as EntryWithDeletedFeature,k as FilterActive,R as FlipCardDefault,V as FlipCardDisabled,L as FlipCardRationale,T as NormalMode,M as TimelineDefault,He as __namedExportsOrder,Ge as default};
