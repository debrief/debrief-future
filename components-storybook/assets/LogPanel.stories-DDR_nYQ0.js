import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r as t}from"./index-B2-qRKKC.js";import{L as d,D as A}from"./types-8oziUK4w.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./ParameterEditor-BTx1TVlf.js";const r={"track-alpha":"Track Alpha","track-bravo":"Track Bravo","track-charlie":"Track Charlie","result-rb-001":"Range & Bearing Result","result-cpa-001":"CPA Result","deleted-feature":void 0},s=[{activityId:"act-005",timestamp:"2026-02-09T14:35:00Z",toolName:"Range & Bearing",toolVersion:"1.2.0",parameters:{maxRange:{value:5e3,default:!1,tunable:!0},units:{value:"metres",default:!0,tunable:!1}},usedFeatureIds:["track-alpha","track-bravo"],generatedFeatureIds:["result-rb-001"],executionDuration:"PT0.5S",generatedResultId:"result-rb-001",operationCategory:"calculation"},{activityId:"act-004",timestamp:"2026-02-09T14:30:00Z",toolName:"Closest Approach",toolVersion:"1.1.0",parameters:{threshold:{value:2e3,default:!1,tunable:!0}},usedFeatureIds:["track-alpha","track-charlie"],generatedFeatureIds:["result-cpa-001"],executionDuration:"PT1.2S",generatedResultId:"result-cpa-001",operationCategory:"calculation"},{activityId:"act-003",timestamp:"2026-02-09T14:25:00Z",toolName:"Track Statistics",toolVersion:"1.0.0",parameters:{},usedFeatureIds:["track-alpha"],generatedFeatureIds:[],executionDuration:"PT0.3S",generatedResultId:null,operationCategory:"calculation"},{activityId:"act-002",timestamp:"2026-02-09T14:20:00Z",toolName:"change-track-color",toolVersion:"1.0.0",parameters:{color:{value:"#ff0000",default:!1,tunable:!1}},usedFeatureIds:["track-bravo"],generatedFeatureIds:[],executionDuration:"PT0.05S",generatedResultId:null,operationCategory:"property-edit"},{activityId:"act-001",timestamp:"2026-02-09T14:00:00Z",toolName:"load-rep",toolVersion:"1.0.0",parameters:{file:{value:"exercise_data.rep",default:!1,tunable:!1}},usedFeatureIds:[],generatedFeatureIds:["track-alpha","track-bravo","track-charlie"],executionDuration:"PT2.1S",generatedResultId:null,operationCategory:"import"}],de={activityId:"act-006",timestamp:"2026-02-09T14:40:00Z",toolName:"Range & Bearing",toolVersion:"1.2.0",parameters:{},usedFeatureIds:["track-alpha","deleted-feature"],generatedFeatureIds:[],executionDuration:"PT0.4S",generatedResultId:null,operationCategory:"calculation"};function n(a){const[o,i]=t.useState(a.initialMode??"normal"),[l,c]=t.useState(a.initialView??"timeline"),[N,M]=t.useState(null),[I,x]=t.useState(A),[le,T]=t.useState(null),ce=w=>{w.type==="action:invoke"&&(T(`Action "${w.payload.actionType}" is not yet available.`),setTimeout(()=>T(null),3e3))};return e.jsx("div",{style:{width:320,height:600,border:"1px solid #333"},children:e.jsx(d,{entries:a.entries,featureNames:a.featureNames,presentationMode:o,viewMode:l,selectedEntryId:N,filterState:I,hasActiveSession:a.hasActiveSession,plotName:"Exercise Alpha",actionResultMessage:le,onMessage:ce,onPresentationModeChange:i,onViewModeChange:c,onFilterStateChange:x,onSelectedEntryChange:M})})}const ge={title:"LogPanel",component:d,parameters:{layout:"centered"}},u={name:"Timeline Default",render:()=>e.jsx(n,{entries:s,featureNames:r,hasActiveSession:!0})},m={name:"Empty State (No Plot)",render:()=>e.jsx(n,{entries:[],featureNames:{},hasActiveSession:!1})},p={name:"Empty State (No Entries)",render:()=>e.jsx(n,{entries:[],featureNames:r,hasActiveSession:!0})},S={name:"Entry Selected",render:()=>{const a=()=>{const[o,i]=t.useState("act-005"),[l,c]=t.useState(A);return e.jsx("div",{style:{width:320,height:600,border:"1px solid #333"},children:e.jsx(d,{entries:s,featureNames:r,presentationMode:"normal",viewMode:"timeline",selectedEntryId:o,filterState:l,hasActiveSession:!0,plotName:"Exercise Alpha",actionResultMessage:null,onFilterStateChange:c,onSelectedEntryChange:i})})};return e.jsx(a,{})}},h={name:"Entry with Deleted Feature",render:()=>e.jsx(n,{entries:[de,...s],featureNames:r,hasActiveSession:!0})},g={name:"Compact Mode",render:()=>e.jsx(n,{entries:s,featureNames:r,hasActiveSession:!0,initialMode:"compact"})},y={name:"Normal Mode",render:()=>e.jsx(n,{entries:s,featureNames:r,hasActiveSession:!0,initialMode:"normal"})},v={name:"Detailed Mode",render:()=>e.jsx(n,{entries:s,featureNames:r,hasActiveSession:!0,initialMode:"detailed"})},E={name:"Filter Active",render:()=>{const a=()=>{const[o,i]=t.useState("normal"),[l,c]=t.useState("timeline"),[N,M]=t.useState(null),[I,x]=t.useState({searchText:"",toolType:null,operationCategory:null,isExpanded:!0});return e.jsx("div",{style:{width:320,height:600,border:"1px solid #333"},children:e.jsx(d,{entries:s,featureNames:r,presentationMode:o,viewMode:l,selectedEntryId:N,filterState:I,hasActiveSession:!0,plotName:"Exercise Alpha",actionResultMessage:null,onPresentationModeChange:i,onViewModeChange:c,onFilterStateChange:x,onSelectedEntryChange:M})})};return e.jsx(a,{})}},f={name:"By-Feature View",render:()=>e.jsx(n,{entries:s,featureNames:r,hasActiveSession:!0,initialView:"by-feature"})},F={name:"Actions Disabled (No Selection)",render:()=>{const a=()=>{const[o,i]=t.useState(A);return e.jsx("div",{style:{width:320,height:600,border:"1px solid #333"},children:e.jsx(d,{entries:s,featureNames:r,presentationMode:"normal",viewMode:"timeline",selectedEntryId:null,filterState:o,hasActiveSession:!0,plotName:"Exercise Alpha",actionResultMessage:null,onFilterStateChange:i})})};return e.jsx(a,{})}};var P,C,D;u.parameters={...u.parameters,docs:{...(P=u.parameters)==null?void 0:P.docs,source:{originalSource:`{
  name: 'Timeline Default',
  render: () => <LogPanelInteractive entries={sampleEntries} featureNames={sampleFeatureNames} hasActiveSession={true} />
}`,...(D=(C=u.parameters)==null?void 0:C.docs)==null?void 0:D.source}}};var b,R,j;m.parameters={...m.parameters,docs:{...(b=m.parameters)==null?void 0:b.docs,source:{originalSource:`{
  name: 'Empty State (No Plot)',
  render: () => <LogPanelInteractive entries={[]} featureNames={{}} hasActiveSession={false} />
}`,...(j=(R=m.parameters)==null?void 0:R.docs)==null?void 0:j.source}}};var L,V,k;p.parameters={...p.parameters,docs:{...(L=p.parameters)==null?void 0:L.docs,source:{originalSource:`{
  name: 'Empty State (No Entries)',
  render: () => <LogPanelInteractive entries={[]} featureNames={sampleFeatureNames} hasActiveSession={true} />
}`,...(k=(V=p.parameters)==null?void 0:V.docs)==null?void 0:k.source}}};var W,_,B;S.parameters={...S.parameters,docs:{...(W=S.parameters)==null?void 0:W.docs,source:{originalSource:`{
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
}`,...(B=(_=S.parameters)==null?void 0:_.docs)==null?void 0:B.source}}};var Z,U,O;h.parameters={...h.parameters,docs:{...(Z=h.parameters)==null?void 0:Z.docs,source:{originalSource:`{
  name: 'Entry with Deleted Feature',
  render: () => <LogPanelInteractive entries={[entryWithDeletedFeature, ...sampleEntries]} featureNames={sampleFeatureNames} hasActiveSession={true} />
}`,...(O=(U=h.parameters)==null?void 0:U.docs)==null?void 0:O.source}}};var $,q,z;g.parameters={...g.parameters,docs:{...($=g.parameters)==null?void 0:$.docs,source:{originalSource:`{
  name: 'Compact Mode',
  render: () => <LogPanelInteractive entries={sampleEntries} featureNames={sampleFeatureNames} hasActiveSession={true} initialMode="compact" />
}`,...(z=(q=g.parameters)==null?void 0:q.docs)==null?void 0:z.source}}};var G,H,J;y.parameters={...y.parameters,docs:{...(G=y.parameters)==null?void 0:G.docs,source:{originalSource:`{
  name: 'Normal Mode',
  render: () => <LogPanelInteractive entries={sampleEntries} featureNames={sampleFeatureNames} hasActiveSession={true} initialMode="normal" />
}`,...(J=(H=y.parameters)==null?void 0:H.docs)==null?void 0:J.source}}};var K,Q,X;v.parameters={...v.parameters,docs:{...(K=v.parameters)==null?void 0:K.docs,source:{originalSource:`{
  name: 'Detailed Mode',
  render: () => <LogPanelInteractive entries={sampleEntries} featureNames={sampleFeatureNames} hasActiveSession={true} initialMode="detailed" />
}`,...(X=(Q=v.parameters)==null?void 0:Q.docs)==null?void 0:X.source}}};var Y,ee,te;E.parameters={...E.parameters,docs:{...(Y=E.parameters)==null?void 0:Y.docs,source:{originalSource:`{
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
}`,...(te=(ee=E.parameters)==null?void 0:ee.docs)==null?void 0:te.source}}};var ae,re,se;f.parameters={...f.parameters,docs:{...(ae=f.parameters)==null?void 0:ae.docs,source:{originalSource:`{
  name: 'By-Feature View',
  render: () => <LogPanelInteractive entries={sampleEntries} featureNames={sampleFeatureNames} hasActiveSession={true} initialView="by-feature" />
}`,...(se=(re=f.parameters)==null?void 0:re.docs)==null?void 0:se.source}}};var ne,oe,ie;F.parameters={...F.parameters,docs:{...(ne=F.parameters)==null?void 0:ne.docs,source:{originalSource:`{
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
}`,...(ie=(oe=F.parameters)==null?void 0:oe.docs)==null?void 0:ie.source}}};const ye=["TimelineDefault","EmptyNoPlot","EmptyNoEntries","EntrySelected","EntryWithDeletedFeature","CompactMode","NormalMode","DetailedMode","FilterActive","ByFeatureView","ActionsDisabled"];export{F as ActionsDisabled,f as ByFeatureView,g as CompactMode,v as DetailedMode,p as EmptyNoEntries,m as EmptyNoPlot,S as EntrySelected,h as EntryWithDeletedFeature,E as FilterActive,y as NormalMode,u as TimelineDefault,ye as __namedExportsOrder,ge as default};
