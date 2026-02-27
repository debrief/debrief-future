import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r as t}from"./index-B2-qRKKC.js";import{L as p,D,C as Re}from"./types-xwOpVKDK.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./ParameterEditor-BZGlfG-N.js";const n={"track-alpha":"Track Alpha","track-bravo":"Track Bravo","track-charlie":"Track Charlie","result-rb-001":"Range & Bearing Result","result-cpa-001":"CPA Result","deleted-feature":void 0},r=[{activityId:"act-005",timestamp:"2026-02-09T14:35:00Z",toolName:"Range & Bearing",toolVersion:"1.2.0",parameters:{maxRange:{value:5e3,default:!1,tunable:!0},units:{value:"metres",default:!0,tunable:!1}},usedFeatureIds:["track-alpha","track-bravo"],generatedFeatureIds:["result-rb-001"],executionDuration:"PT0.5S",generatedResultId:"result-rb-001",operationCategory:"calculation"},{activityId:"act-004",timestamp:"2026-02-09T14:30:00Z",toolName:"Closest Approach",toolVersion:"1.1.0",parameters:{threshold:{value:2e3,default:!1,tunable:!0}},usedFeatureIds:["track-alpha","track-charlie"],generatedFeatureIds:["result-cpa-001"],executionDuration:"PT1.2S",generatedResultId:"result-cpa-001",operationCategory:"calculation"},{activityId:"act-003",timestamp:"2026-02-09T14:25:00Z",toolName:"Track Statistics",toolVersion:"1.0.0",parameters:{},usedFeatureIds:["track-alpha"],generatedFeatureIds:[],executionDuration:"PT0.3S",generatedResultId:null,operationCategory:"calculation"},{activityId:"act-002",timestamp:"2026-02-09T14:20:00Z",toolName:"change-track-color",toolVersion:"1.0.0",parameters:{color:{value:"#ff0000",default:!1,tunable:!1}},usedFeatureIds:["track-bravo"],generatedFeatureIds:[],executionDuration:"PT0.05S",generatedResultId:null,operationCategory:"property-edit"},{activityId:"act-001",timestamp:"2026-02-09T14:00:00Z",toolName:"load-rep",toolVersion:"1.0.0",parameters:{file:{value:"exercise_data.rep",default:!1,tunable:!1}},usedFeatureIds:[],generatedFeatureIds:["track-alpha","track-bravo","track-charlie"],executionDuration:"PT2.1S",generatedResultId:null,operationCategory:"import"}],Ve={activityId:"act-006",timestamp:"2026-02-09T14:40:00Z",toolName:"Range & Bearing",toolVersion:"1.2.0",parameters:{},usedFeatureIds:["track-alpha","deleted-feature"],generatedFeatureIds:[],executionDuration:"PT0.4S",generatedResultId:null,operationCategory:"calculation"};function o(a){const[s,i]=t.useState(a.initialMode??"normal"),[l,d]=t.useState(a.initialView??"timeline"),[m,S]=t.useState(null),[h,g]=t.useState(D),[R,F]=t.useState(null),V=v=>{v.type==="action:invoke"&&(F(`Action "${v.payload.actionType}" is not yet available.`),setTimeout(()=>F(null),3e3))};return e.jsx("div",{style:{width:320,height:600,border:"1px solid #333"},children:e.jsx(p,{entries:a.entries,featureNames:a.featureNames,presentationMode:s,viewMode:l,selectedEntryId:m,filterState:h,hasActiveSession:a.hasActiveSession,plotName:"Exercise Alpha",actionResultMessage:R,onMessage:V,onPresentationModeChange:i,onViewModeChange:d,onFilterStateChange:g,onSelectedEntryChange:S})})}const $e={title:"LogPanel",component:p,parameters:{layout:"centered"}},y={name:"Timeline Default",render:()=>e.jsx(o,{entries:r,featureNames:n,hasActiveSession:!0})},f={name:"Empty State (No Plot)",render:()=>e.jsx(o,{entries:[],featureNames:{},hasActiveSession:!1})},E={name:"Empty State (No Entries)",render:()=>e.jsx(o,{entries:[],featureNames:n,hasActiveSession:!0})},N={name:"Entry Selected",render:()=>{const a=()=>{const[s,i]=t.useState("act-005"),[l,d]=t.useState(D);return e.jsx("div",{style:{width:320,height:600,border:"1px solid #333"},children:e.jsx(p,{entries:r,featureNames:n,presentationMode:"normal",viewMode:"timeline",selectedEntryId:s,filterState:l,hasActiveSession:!0,plotName:"Exercise Alpha",actionResultMessage:null,onFilterStateChange:d,onSelectedEntryChange:i})})};return e.jsx(a,{})}},x={name:"Entry with Deleted Feature",render:()=>e.jsx(o,{entries:[Ve,...r],featureNames:n,hasActiveSession:!0})},I={name:"Compact Mode",render:()=>e.jsx(o,{entries:r,featureNames:n,hasActiveSession:!0,initialMode:"compact"})},M={name:"Normal Mode",render:()=>e.jsx(o,{entries:r,featureNames:n,hasActiveSession:!0,initialMode:"normal"})},C={name:"Detailed Mode",render:()=>e.jsx(o,{entries:r,featureNames:n,hasActiveSession:!0,initialMode:"detailed"})},b={name:"Filter Active",render:()=>{const a=()=>{const[s,i]=t.useState("normal"),[l,d]=t.useState("timeline"),[m,S]=t.useState(null),[h,g]=t.useState({searchText:"",toolType:null,operationCategory:null,isExpanded:!0});return e.jsx("div",{style:{width:320,height:600,border:"1px solid #333"},children:e.jsx(p,{entries:r,featureNames:n,presentationMode:s,viewMode:l,selectedEntryId:m,filterState:h,hasActiveSession:!0,plotName:"Exercise Alpha",actionResultMessage:null,onPresentationModeChange:i,onViewModeChange:d,onFilterStateChange:g,onSelectedEntryChange:S})})};return e.jsx(a,{})}},A={name:"By-Feature View",render:()=>e.jsx(o,{entries:r,featureNames:n,hasActiveSession:!0,initialView:"by-feature"})},w={name:"Actions Disabled (No Selection)",render:()=>{const a=()=>{const[s,i]=t.useState(D);return e.jsx("div",{style:{width:320,height:600,border:"1px solid #333"},children:e.jsx(p,{entries:r,featureNames:n,presentationMode:"normal",viewMode:"timeline",selectedEntryId:null,filterState:s,hasActiveSession:!0,plotName:"Exercise Alpha",actionResultMessage:null,onFilterStateChange:i})})};return e.jsx(a,{})}},Le={...r[0],activityId:"act-disabled-001",disabled:!0},We={...r[0],activityId:"act-rationale-001",rationale:"Increased range to capture distant contacts from the latest exercise data."};function B(a){const[s,i]=t.useState("normal"),[l,d]=t.useState("timeline"),[m,S]=t.useState(null),[h,g]=t.useState(D),[R,F]=t.useState(null),[V,v]=t.useState(a.entries),Pe=t.useCallback(c=>{c.type==="action:invoke"&&(F(`Action "${c.payload.actionType}" invoked.`),setTimeout(()=>F(null),3e3))},[]),ke=t.useCallback(c=>{},[]),je=t.useCallback((c,L)=>{v(W=>W.map(u=>u.activityId===c?{...u,disabled:L}:u))},[]),De=t.useCallback((c,L)=>{v(W=>W.map(u=>u.activityId===c?{...u,rationale:L}:u))},[]);return e.jsx("div",{style:{width:320,height:600,border:"1px solid #333"},children:e.jsx(p,{entries:V,featureNames:a.featureNames,presentationMode:s,viewMode:l,selectedEntryId:m,filterState:h,hasActiveSession:!0,plotName:"Exercise Alpha",actionResultMessage:R,onMessage:Pe,onPresentationModeChange:i,onViewModeChange:d,onFilterStateChange:g,onSelectedEntryChange:S,onSchemaRequest:ke,onDisableToggle:je,onRationaleUpdate:De})})}const T={name:"Flip Card — Edit Icon",render:()=>e.jsx(B,{entries:r,featureNames:n})},P={name:"Flip Card — Disabled Entry",render:()=>e.jsx(B,{entries:[Le,...r.slice(1)],featureNames:n})},k={name:"Flip Card — With Rationale",render:()=>e.jsx(B,{entries:[We,...r.slice(1)],featureNames:n})},j={name:"CardFlip Primitive",render:()=>{const a=()=>{const[s,i]=t.useState(!1);return e.jsxs("div",{style:{width:320,padding:16},children:[e.jsx("button",{onClick:()=>i(!s),style:{marginBottom:8},children:s?"Show Front":"Show Back"}),e.jsx(Re,{isFlipped:s,front:e.jsxs("div",{style:{padding:16,background:"#1e1e1e",border:"1px solid #333"},children:[e.jsx("strong",{children:"Front Face"}),e.jsx("p",{children:"Tool name, features, parameters"})]}),back:e.jsxs("div",{style:{padding:16,background:"#252526",border:"1px solid #333"},children:[e.jsx("strong",{children:"Back Face (Edit)"}),e.jsx("p",{children:"Parameter controls, rationale, disable"})]})})]})};return e.jsx(a,{})}};var _,Z,U;y.parameters={...y.parameters,docs:{...(_=y.parameters)==null?void 0:_.docs,source:{originalSource:`{
  name: 'Timeline Default',
  render: () => <LogPanelInteractive entries={sampleEntries} featureNames={sampleFeatureNames} hasActiveSession={true} />
}`,...(U=(Z=y.parameters)==null?void 0:Z.docs)==null?void 0:U.source}}};var q,$,O;f.parameters={...f.parameters,docs:{...(q=f.parameters)==null?void 0:q.docs,source:{originalSource:`{
  name: 'Empty State (No Plot)',
  render: () => <LogPanelInteractive entries={[]} featureNames={{}} hasActiveSession={false} />
}`,...(O=($=f.parameters)==null?void 0:$.docs)==null?void 0:O.source}}};var z,G,H;E.parameters={...E.parameters,docs:{...(z=E.parameters)==null?void 0:z.docs,source:{originalSource:`{
  name: 'Empty State (No Entries)',
  render: () => <LogPanelInteractive entries={[]} featureNames={sampleFeatureNames} hasActiveSession={true} />
}`,...(H=(G=E.parameters)==null?void 0:G.docs)==null?void 0:H.source}}};var J,K,Q;N.parameters={...N.parameters,docs:{...(J=N.parameters)==null?void 0:J.docs,source:{originalSource:`{
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
}`,...(Q=(K=N.parameters)==null?void 0:K.docs)==null?void 0:Q.source}}};var X,Y,ee;x.parameters={...x.parameters,docs:{...(X=x.parameters)==null?void 0:X.docs,source:{originalSource:`{
  name: 'Entry with Deleted Feature',
  render: () => <LogPanelInteractive entries={[entryWithDeletedFeature, ...sampleEntries]} featureNames={sampleFeatureNames} hasActiveSession={true} />
}`,...(ee=(Y=x.parameters)==null?void 0:Y.docs)==null?void 0:ee.source}}};var te,ae,re;I.parameters={...I.parameters,docs:{...(te=I.parameters)==null?void 0:te.docs,source:{originalSource:`{
  name: 'Compact Mode',
  render: () => <LogPanelInteractive entries={sampleEntries} featureNames={sampleFeatureNames} hasActiveSession={true} initialMode="compact" />
}`,...(re=(ae=I.parameters)==null?void 0:ae.docs)==null?void 0:re.source}}};var se,ne,ie;M.parameters={...M.parameters,docs:{...(se=M.parameters)==null?void 0:se.docs,source:{originalSource:`{
  name: 'Normal Mode',
  render: () => <LogPanelInteractive entries={sampleEntries} featureNames={sampleFeatureNames} hasActiveSession={true} initialMode="normal" />
}`,...(ie=(ne=M.parameters)==null?void 0:ne.docs)==null?void 0:ie.source}}};var oe,le,de;C.parameters={...C.parameters,docs:{...(oe=C.parameters)==null?void 0:oe.docs,source:{originalSource:`{
  name: 'Detailed Mode',
  render: () => <LogPanelInteractive entries={sampleEntries} featureNames={sampleFeatureNames} hasActiveSession={true} initialMode="detailed" />
}`,...(de=(le=C.parameters)==null?void 0:le.docs)==null?void 0:de.source}}};var ce,ue,pe;b.parameters={...b.parameters,docs:{...(ce=b.parameters)==null?void 0:ce.docs,source:{originalSource:`{
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
}`,...(pe=(ue=b.parameters)==null?void 0:ue.docs)==null?void 0:pe.source}}};var me,Se,he;A.parameters={...A.parameters,docs:{...(me=A.parameters)==null?void 0:me.docs,source:{originalSource:`{
  name: 'By-Feature View',
  render: () => <LogPanelInteractive entries={sampleEntries} featureNames={sampleFeatureNames} hasActiveSession={true} initialView="by-feature" />
}`,...(he=(Se=A.parameters)==null?void 0:Se.docs)==null?void 0:he.source}}};var ge,Fe,ve;w.parameters={...w.parameters,docs:{...(ge=w.parameters)==null?void 0:ge.docs,source:{originalSource:`{
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
}`,...(ve=(Fe=w.parameters)==null?void 0:Fe.docs)==null?void 0:ve.source}}};var ye,fe,Ee;T.parameters={...T.parameters,docs:{...(ye=T.parameters)==null?void 0:ye.docs,source:{originalSource:`{
  name: 'Flip Card — Edit Icon',
  render: () => <FlipCardInteractive entries={sampleEntries} featureNames={sampleFeatureNames} />
}`,...(Ee=(fe=T.parameters)==null?void 0:fe.docs)==null?void 0:Ee.source}}};var Ne,xe,Ie;P.parameters={...P.parameters,docs:{...(Ne=P.parameters)==null?void 0:Ne.docs,source:{originalSource:`{
  name: 'Flip Card — Disabled Entry',
  render: () => <FlipCardInteractive entries={[disabledEntry, ...sampleEntries.slice(1)]} featureNames={sampleFeatureNames} />
}`,...(Ie=(xe=P.parameters)==null?void 0:xe.docs)==null?void 0:Ie.source}}};var Me,Ce,be;k.parameters={...k.parameters,docs:{...(Me=k.parameters)==null?void 0:Me.docs,source:{originalSource:`{
  name: 'Flip Card — With Rationale',
  render: () => <FlipCardInteractive entries={[entryWithRationale, ...sampleEntries.slice(1)]} featureNames={sampleFeatureNames} />
}`,...(be=(Ce=k.parameters)==null?void 0:Ce.docs)==null?void 0:be.source}}};var Ae,we,Te;j.parameters={...j.parameters,docs:{...(Ae=j.parameters)==null?void 0:Ae.docs,source:{originalSource:`{
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
}`,...(Te=(we=j.parameters)==null?void 0:we.docs)==null?void 0:Te.source}}};const Oe=["TimelineDefault","EmptyNoPlot","EmptyNoEntries","EntrySelected","EntryWithDeletedFeature","CompactMode","NormalMode","DetailedMode","FilterActive","ByFeatureView","ActionsDisabled","FlipCardDefault","FlipCardDisabled","FlipCardRationale","CardFlipPrimitive"];export{w as ActionsDisabled,A as ByFeatureView,j as CardFlipPrimitive,I as CompactMode,C as DetailedMode,E as EmptyNoEntries,f as EmptyNoPlot,N as EntrySelected,x as EntryWithDeletedFeature,b as FilterActive,T as FlipCardDefault,P as FlipCardDisabled,k as FlipCardRationale,M as NormalMode,y as TimelineDefault,Oe as __namedExportsOrder,$e as default};
