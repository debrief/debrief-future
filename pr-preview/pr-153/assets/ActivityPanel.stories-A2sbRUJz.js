import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r as s}from"./index-B2-qRKKC.js";import{l as U}from"./textfield-Dm39NdvL.js";import{T as Tt}from"./TimeController-YrrdAfN3.js";import{T as bt}from"./ToolsPanel-DgqMA8nn.js";import{L as kt}from"./LayersToolbar-BUs0gzzD.js";import{F as wt}from"./FeatureList-VHlyJxe3.js";import{T as q}from"./ThemeProvider-mvcGjblv.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./FilterDropdown-BgyHQuSK.js";import"./index-kS-9iBlu.js";import"./labels-KoqjLXr8.js";const xt={timeControllerCollapsed:!1,toolsCollapsed:!1,layersCollapsed:!1};class _ extends s.Component{constructor(a){super(a),this.state={hasError:!1}}static getDerivedStateFromError(a){return{hasError:!0,error:a}}componentDidCatch(a,l){console.error(`ActivityPanel: ${this.props.sectionName} error:`,a,l)}render(){return this.state.hasError?e.jsxs("div",{className:"debrief-activity-panel__section-error",children:[e.jsx(U,{name:"error"}),e.jsxs("span",{children:[this.props.sectionName," encountered an error"]})]}):this.props.children}}function O({title:r,icon:a,collapsed:l,onToggle:y,children:h}){return e.jsxs("div",{className:`debrief-activity-panel__section ${l?"debrief-activity-panel__section--collapsed":""}`,children:[e.jsxs("button",{type:"button",className:"debrief-activity-panel__section-header",onClick:y,"aria-expanded":!l,children:[e.jsx(U,{name:l?"chevron-right":"chevron-down"}),e.jsx(U,{name:a}),e.jsx("span",{className:"debrief-activity-panel__section-title",children:r})]}),!l&&e.jsx("div",{className:"debrief-activity-panel__section-content",children:h})]})}function i({timeExtent:r,currentTime:a,playbackSpeed:l,displayMode:y,timeUiState:h,tools:d=[],features:R=[],selectedFeatureIds:N=[],hiddenIds:D,toolMatches:dt=[],collapseState:ct,onCollapseStateChange:F,onMessage:t,className:pt}){const[mt,ut]=s.useState(xt),c=ct??mt,L=s.useCallback(o=>{const M={...c,[o]:!c[o]};ut(M),F==null||F(M)},[c,F]),yt=s.useCallback(o=>{t==null||t({type:"temporal:seek",payload:{time:o}})},[t]),ht=s.useCallback(o=>{o==="playing"?t==null||t({type:"temporal:play",payload:{rate:1}}):t==null||t({type:"temporal:pause"})},[t]),gt=s.useCallback(o=>{t==null||t({type:"temporal:displayMode",payload:{mode:o}})},[t]),ft=s.useCallback(o=>{t==null||t({type:"tool:run",payload:{toolId:o}})},[t]),Ct=s.useCallback(o=>{t==null||t({type:"layer:toggleVisibility",payload:{featureIds:o}})},[t]),St=s.useCallback(o=>{t==null||t({type:"layer:delete",payload:{featureIds:o}})},[t]),vt=s.useCallback(o=>{t==null||t({type:"layer:select",payload:{featureIds:Array.from(o)}})},[t]);return e.jsxs("div",{className:`debrief-activity-panel ${pt??""}`,role:"region","aria-label":"Activity Panel",children:[e.jsx(O,{title:"Time Controller",icon:"watch",collapsed:c.timeControllerCollapsed,onToggle:()=>L("timeControllerCollapsed"),children:e.jsx(_,{sectionName:"Time Controller",children:e.jsx(Tt,{timeExtent:r??void 0,initialTime:a,initialSpeed:l,initialDisplayMode:y,uiState:h,onTimeChange:yt,onPlaybackStateChange:ht,onDisplayModeChange:gt})})}),e.jsx(O,{title:"Tools",icon:"tools",collapsed:c.toolsCollapsed,onToggle:()=>L("toolsCollapsed"),children:e.jsx(_,{sectionName:"Tools",children:e.jsx(bt,{tools:d,onRunTool:ft})})}),e.jsx(O,{title:"Layers",icon:"layers",collapsed:c.layersCollapsed,onToggle:()=>L("layersCollapsed"),children:e.jsxs(_,{sectionName:"Layers",children:[e.jsx(kt,{selectedFeatureIds:N,features:R,hiddenIds:D,toolMatches:dt,onDelete:St,onToggleVisibility:Ct}),e.jsx(wt,{features:R,selectedIds:new Set(N),hiddenIds:D,onSelectionChange:vt,height:200})]})})]})}i.__docgenInfo={description:`ActivityPanel component.

@example
\`\`\`tsx
<ActivityPanel
  timeExtent={[startTime, endTime]}
  timeUiState="ready"
  tools={tools}
  features={features}
  selectedFeatureIds={selectedIds}
  onMessage={(msg) => handleMessage(msg)}
/>
\`\`\``,methods:[],displayName:"ActivityPanel",props:{timeExtent:{required:!1,tsType:{name:"union",raw:"[number, number] | null",elements:[{name:"tuple",raw:"[number, number]",elements:[{name:"number"},{name:"number"}]},{name:"null"}]},description:"Time range [start, end] in milliseconds since epoch"},currentTime:{required:!1,tsType:{name:"number"},description:"Current time position"},playbackState:{required:!1,tsType:{name:"union",raw:"'playing' | 'paused'",elements:[{name:"literal",value:"'playing'"},{name:"literal",value:"'paused'"}]},description:"Current playback state"},playbackSpeed:{required:!1,tsType:{name:"union",raw:"1 | 2 | 4 | 8 | 16 | 32 | 64",elements:[{name:"literal",value:"1"},{name:"literal",value:"2"},{name:"literal",value:"4"},{name:"literal",value:"8"},{name:"literal",value:"16"},{name:"literal",value:"32"},{name:"literal",value:"64"}]},description:"Playback speed multiplier"},displayMode:{required:!1,tsType:{name:"union",raw:"'full' | 'trail'",elements:[{name:"literal",value:"'full'"},{name:"literal",value:"'trail'"}]},description:"Track display mode"},timeUiState:{required:!1,tsType:{name:"union",raw:"'empty' | 'loading' | 'ready'",elements:[{name:"literal",value:"'empty'"},{name:"literal",value:"'loading'"},{name:"literal",value:"'ready'"}]},description:"UI state for time controller"},tools:{required:!1,tsType:{name:"Array",elements:[{name:"ToolsPanelItem"}],raw:"ToolsPanelItem[]"},description:"List of available tools",defaultValue:{value:"[]",computed:!1}},features:{required:!1,tsType:{name:"Array",elements:[{name:"union",raw:"TrackFeature | ReferenceLocation",elements:[{name:"TrackFeature"},{name:"ReferenceLocation"}]}],raw:"DebriefFeature[]"},description:"Features to display in the layers list",defaultValue:{value:"[]",computed:!1}},selectedFeatureIds:{required:!1,tsType:{name:"Array",elements:[{name:"string"}],raw:"string[]"},description:"IDs of selected features",defaultValue:{value:"[]",computed:!1}},hiddenIds:{required:!1,tsType:{name:"Set",elements:[{name:"string"}],raw:"Set<string>"},description:"IDs of hidden features"},toolMatches:{required:!1,tsType:{name:"Array",elements:[{name:"MatchResult"}],raw:"MatchResult[]"},description:"Tool match results for features",defaultValue:{value:"[]",computed:!1}},collapseState:{required:!1,tsType:{name:"ActivityPanelCollapseState"},description:"Current collapse state for all sections"},onCollapseStateChange:{required:!1,tsType:{name:"signature",type:"function",raw:"(state: ActivityPanelCollapseState) => void",signature:{arguments:[{type:{name:"ActivityPanelCollapseState"},name:"state"}],return:{name:"void"}}},description:"Callback when collapse state changes"},onMessage:{required:!1,tsType:{name:"signature",type:"function",raw:"(message: ActivityPanelMessage) => void",signature:{arguments:[{type:{name:"union",raw:`| { type: 'temporal:seek'; payload: { time: number } }
| { type: 'temporal:play'; payload: { rate: number } }
| { type: 'temporal:pause' }
| { type: 'temporal:displayMode'; payload: { mode: 'full' | 'trail' } }
| { type: 'tool:run'; payload: { toolId: string } }
| { type: 'layer:toggleVisibility'; payload: { featureIds: string[] } }
| { type: 'layer:delete'; payload: { featureIds: string[] } }
| { type: 'layer:select'; payload: { featureIds: string[] } }`,elements:[{name:"signature",type:"object",raw:"{ type: 'temporal:seek'; payload: { time: number } }",signature:{properties:[{key:"type",value:{name:"literal",value:"'temporal:seek'",required:!0}},{key:"payload",value:{name:"signature",type:"object",raw:"{ time: number }",signature:{properties:[{key:"time",value:{name:"number",required:!0}}]},required:!0}}]}},{name:"signature",type:"object",raw:"{ type: 'temporal:play'; payload: { rate: number } }",signature:{properties:[{key:"type",value:{name:"literal",value:"'temporal:play'",required:!0}},{key:"payload",value:{name:"signature",type:"object",raw:"{ rate: number }",signature:{properties:[{key:"rate",value:{name:"number",required:!0}}]},required:!0}}]}},{name:"signature",type:"object",raw:"{ type: 'temporal:pause' }",signature:{properties:[{key:"type",value:{name:"literal",value:"'temporal:pause'",required:!0}}]}},{name:"signature",type:"object",raw:"{ type: 'temporal:displayMode'; payload: { mode: 'full' | 'trail' } }",signature:{properties:[{key:"type",value:{name:"literal",value:"'temporal:displayMode'",required:!0}},{key:"payload",value:{name:"signature",type:"object",raw:"{ mode: 'full' | 'trail' }",signature:{properties:[{key:"mode",value:{name:"union",raw:"'full' | 'trail'",elements:[{name:"literal",value:"'full'"},{name:"literal",value:"'trail'"}],required:!0}}]},required:!0}}]}},{name:"signature",type:"object",raw:"{ type: 'tool:run'; payload: { toolId: string } }",signature:{properties:[{key:"type",value:{name:"literal",value:"'tool:run'",required:!0}},{key:"payload",value:{name:"signature",type:"object",raw:"{ toolId: string }",signature:{properties:[{key:"toolId",value:{name:"string",required:!0}}]},required:!0}}]}},{name:"signature",type:"object",raw:"{ type: 'layer:toggleVisibility'; payload: { featureIds: string[] } }",signature:{properties:[{key:"type",value:{name:"literal",value:"'layer:toggleVisibility'",required:!0}},{key:"payload",value:{name:"signature",type:"object",raw:"{ featureIds: string[] }",signature:{properties:[{key:"featureIds",value:{name:"Array",elements:[{name:"string"}],raw:"string[]",required:!0}}]},required:!0}}]}},{name:"signature",type:"object",raw:"{ type: 'layer:delete'; payload: { featureIds: string[] } }",signature:{properties:[{key:"type",value:{name:"literal",value:"'layer:delete'",required:!0}},{key:"payload",value:{name:"signature",type:"object",raw:"{ featureIds: string[] }",signature:{properties:[{key:"featureIds",value:{name:"Array",elements:[{name:"string"}],raw:"string[]",required:!0}}]},required:!0}}]}},{name:"signature",type:"object",raw:"{ type: 'layer:select'; payload: { featureIds: string[] } }",signature:{properties:[{key:"type",value:{name:"literal",value:"'layer:select'",required:!0}},{key:"payload",value:{name:"signature",type:"object",raw:"{ featureIds: string[] }",signature:{properties:[{key:"featureIds",value:{name:"Array",elements:[{name:"string"}],raw:"string[]",required:!0}}]},required:!0}}]}}]},name:"message"}],return:{name:"void"}}},description:"Callback for messages sent to the host"},className:{required:!1,tsType:{name:"string"},description:"CSS class name"}}};const V=Date.now(),It=60*60*1e3,p=[V,V+8*It],m=[{id:"range-bearing",name:"Range & Bearing",description:"Calculate range and bearing between tracks",applicable:!0},{id:"closest-approach",name:"Closest Point of Approach",description:"Find closest approach point",applicable:!0},{id:"track-stats",name:"Track Statistics",description:"Calculate track statistics",applicable:!1,explanation:"Requires exactly 1 track"}],u=[{id:"track-1",type:"Feature",geometry:{type:"LineString",coordinates:[[0,0],[1,1]]},properties:{name:"HMS Belfast",kind:"TRACK",color:"#e41a1c"}},{id:"track-2",type:"Feature",geometry:{type:"LineString",coordinates:[[2,2],[3,3]]},properties:{name:"USS Enterprise",kind:"TRACK",color:"#377eb8"}},{id:"track-3",type:"Feature",geometry:{type:"LineString",coordinates:[[4,4],[5,5]]},properties:{name:"HMS Victory",kind:"TRACK",color:"#4daf4a"}}],Dt={title:"Components/ActivityPanel",component:i,parameters:{layout:"centered",docs:{description:{component:`
Unified activity panel combining time control, tools, and layers.

## Features

- **Collapsible Sections**: Time Controller, Tools, and Layers can be collapsed independently
- **Integrated Time Control**: Full time navigation and playback controls
- **Tool Discovery**: Shows available analysis tools based on selection
- **Layer Management**: Combined toolbar and feature list for layer operations

## Usage

\`\`\`tsx
import { ActivityPanel } from '@debrief/components';

<ActivityPanel
  timeExtent={[startTime, endTime]}
  timeUiState="ready"
  tools={availableTools}
  features={layers}
  selectedFeatureIds={selection}
  onMessage={(msg) => handleMessage(msg)}
/>
\`\`\`
        `}}},tags:["autodocs"],decorators:[(r,a)=>{const l=a.globals.theme||"dark";return e.jsx(q,{theme:{variant:l},children:e.jsx("div",{style:{width:320,height:600,background:l==="light"?"#f5f5f5":"#1e1e1e"},children:e.jsx(r,{})})})}]};function n(r){const[a,l]=s.useState({timeControllerCollapsed:!1,toolsCollapsed:!1,layersCollapsed:!1}),y=s.useCallback(d=>{console.log("ActivityPanel message:",d)},[]),h=s.useCallback(d=>{console.log("Collapse state:",d),l(d)},[]);return e.jsx(i,{timeExtent:p,timeUiState:"ready",tools:m,features:u,selectedFeatureIds:["track-1"],hiddenIds:new Set,toolMatches:[],...r,collapseState:a,onCollapseStateChange:h,onMessage:y})}const g={render:()=>e.jsx(n,{})},f={render:()=>e.jsx(n,{timeExtent:null,timeUiState:"empty",tools:[],features:[],selectedFeatureIds:[]}),parameters:{docs:{description:{story:"When no plot is loaded, the panel shows empty states for all sections."}}}},C={render:()=>e.jsx(n,{timeUiState:"loading",tools:[],features:[],selectedFeatureIds:[]}),parameters:{docs:{description:{story:"While data is loading, the time controller shows a loading message."}}}},S={render:()=>e.jsx(n,{}),parameters:{docs:{description:{story:"When data is loaded, all sections are active and usable."}}}},v={render:()=>{const[r,a]=s.useState({timeControllerCollapsed:!0,toolsCollapsed:!1,layersCollapsed:!1});return e.jsx(i,{timeExtent:p,timeUiState:"ready",tools:m,features:u,selectedFeatureIds:["track-1"],hiddenIds:new Set,toolMatches:[],collapseState:r,onCollapseStateChange:a,onMessage:console.log})},parameters:{docs:{description:{story:"Time Controller section can be collapsed to save space."}}}},T={render:()=>{const[r,a]=s.useState({timeControllerCollapsed:!1,toolsCollapsed:!0,layersCollapsed:!1});return e.jsx(i,{timeExtent:p,timeUiState:"ready",tools:m,features:u,selectedFeatureIds:["track-1"],hiddenIds:new Set,toolMatches:[],collapseState:r,onCollapseStateChange:a,onMessage:console.log})},parameters:{docs:{description:{story:"Tools section can be collapsed when not needed."}}}},b={render:()=>{const[r,a]=s.useState({timeControllerCollapsed:!1,toolsCollapsed:!1,layersCollapsed:!0});return e.jsx(i,{timeExtent:p,timeUiState:"ready",tools:m,features:u,selectedFeatureIds:["track-1"],hiddenIds:new Set,toolMatches:[],collapseState:r,onCollapseStateChange:a,onMessage:console.log})},parameters:{docs:{description:{story:"Layers section can be collapsed to focus on time control and tools."}}}},k={render:()=>{const[r,a]=s.useState({timeControllerCollapsed:!0,toolsCollapsed:!0,layersCollapsed:!0});return e.jsx(i,{timeExtent:p,timeUiState:"ready",tools:m,features:u,selectedFeatureIds:["track-1"],hiddenIds:new Set,toolMatches:[],collapseState:r,onCollapseStateChange:a,onMessage:console.log})},parameters:{docs:{description:{story:"All sections can be collapsed simultaneously to maximize workspace."}}}},w={render:()=>{const[r,a]=s.useState({timeControllerCollapsed:!1,toolsCollapsed:!0,layersCollapsed:!0});return e.jsx(i,{timeExtent:p,timeUiState:"ready",tools:m,features:u,selectedFeatureIds:["track-1"],hiddenIds:new Set,toolMatches:[],collapseState:r,onCollapseStateChange:a,onMessage:console.log})},parameters:{docs:{description:{story:"Focus on time navigation by collapsing other sections."}}}},x={render:()=>e.jsx(n,{selectedFeatureIds:[],tools:[{id:"range-bearing",name:"Range & Bearing",description:"Calculate range and bearing",applicable:!1,explanation:"Requires 2 tracks"},{id:"track-stats",name:"Track Statistics",description:"Calculate track statistics",applicable:!1,explanation:"Requires 1 track"}]}),parameters:{docs:{description:{story:"When no features are selected, tools show why they are not applicable."}}}},I={render:()=>e.jsx(n,{selectedFeatureIds:["track-1","track-2"]}),parameters:{docs:{description:{story:"With multiple features selected, tools that work on multi-selection become active."}}}},A={render:()=>e.jsx(n,{}),parameters:{docs:{description:{story:`Error boundaries isolate failures per section. If one section throws an error,
it shows an inline error message (with error icon and text) without crashing the other sections.

Each section is wrapped in its own error boundary, ensuring that:
- A failing Time Controller doesn't affect Tools or Layers
- A failing Tools panel doesn't affect Time Controller or Layers
- A failing Layers section doesn't affect Time Controller or Tools

This makes the panel more resilient to runtime errors in individual components.`}}}},E={render:()=>e.jsx(q,{theme:{variant:"light"},children:e.jsx("div",{style:{width:320,height:600,background:"#f5f5f5"},children:e.jsx(n,{})})}),parameters:{docs:{description:{story:"Activity panel styled for light theme environments."}}}},j={render:()=>e.jsx(q,{theme:{variant:"dark"},children:e.jsx("div",{style:{width:320,height:600,background:"#1e1e1e"},children:e.jsx(n,{})})}),parameters:{docs:{description:{story:"Activity panel styled for dark theme environments (default)."}}}},P={render:()=>e.jsx(q,{theme:{variant:"vscode"},children:e.jsx("div",{style:{width:320,height:600,background:"#1e1e1e"},children:e.jsx(n,{})})}),parameters:{docs:{description:{story:"Activity panel styled for VS Code sidebar integration."}}}};var K,W,B,X,H;g.parameters={...g.parameters,docs:{...(K=g.parameters)==null?void 0:K.docs,source:{originalSource:`{
  render: () => <InteractiveActivityPanel />
}`,...(B=(W=g.parameters)==null?void 0:W.docs)==null?void 0:B.source},description:{story:`Default activity panel with all sections expanded and mock data loaded.
Try collapsing sections by clicking the headers.`,...(H=(X=g.parameters)==null?void 0:X.docs)==null?void 0:H.description}}};var $,z,G,J,Q;f.parameters={...f.parameters,docs:{...($=f.parameters)==null?void 0:$.docs,source:{originalSource:`{
  render: () => <InteractiveActivityPanel timeExtent={null} timeUiState="empty" tools={[]} features={[]} selectedFeatureIds={[]} />,
  parameters: {
    docs: {
      description: {
        story: 'When no plot is loaded, the panel shows empty states for all sections.'
      }
    }
  }
}`,...(G=(z=f.parameters)==null?void 0:z.docs)==null?void 0:G.source},description:{story:"Empty state when no plot is loaded.",...(Q=(J=f.parameters)==null?void 0:J.docs)==null?void 0:Q.description}}};var Y,Z,ee,te,ae;C.parameters={...C.parameters,docs:{...(Y=C.parameters)==null?void 0:Y.docs,source:{originalSource:`{
  render: () => <InteractiveActivityPanel timeUiState="loading" tools={[]} features={[]} selectedFeatureIds={[]} />,
  parameters: {
    docs: {
      description: {
        story: 'While data is loading, the time controller shows a loading message.'
      }
    }
  }
}`,...(ee=(Z=C.parameters)==null?void 0:Z.docs)==null?void 0:ee.source},description:{story:"Loading state while processing data.",...(ae=(te=C.parameters)==null?void 0:te.docs)==null?void 0:ae.description}}};var re,se,oe,le,ne;S.parameters={...S.parameters,docs:{...(re=S.parameters)==null?void 0:re.docs,source:{originalSource:`{
  render: () => <InteractiveActivityPanel />,
  parameters: {
    docs: {
      description: {
        story: 'When data is loaded, all sections are active and usable.'
      }
    }
  }
}`,...(oe=(se=S.parameters)==null?void 0:se.docs)==null?void 0:oe.source},description:{story:"Ready state with all data loaded.",...(ne=(le=S.parameters)==null?void 0:le.docs)==null?void 0:ne.description}}};var ie,de,ce,pe,me;v.parameters={...v.parameters,docs:{...(ie=v.parameters)==null?void 0:ie.docs,source:{originalSource:`{
  render: () => {
    const [collapseState, setCollapseState] = useState<ActivityPanelCollapseState>({
      timeControllerCollapsed: true,
      toolsCollapsed: false,
      layersCollapsed: false
    });
    return <ActivityPanel timeExtent={TIME_EXTENT} timeUiState="ready" tools={MOCK_TOOLS} features={MOCK_FEATURES} selectedFeatureIds={['track-1']} hiddenIds={new Set()} toolMatches={[]} collapseState={collapseState} onCollapseStateChange={setCollapseState} onMessage={console.log} />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Time Controller section can be collapsed to save space.'
      }
    }
  }
}`,...(ce=(de=v.parameters)==null?void 0:de.docs)==null?void 0:ce.source},description:{story:"Time Controller collapsed - shows only Tools and Layers.",...(me=(pe=v.parameters)==null?void 0:pe.docs)==null?void 0:me.description}}};var ue,ye,he,ge,fe;T.parameters={...T.parameters,docs:{...(ue=T.parameters)==null?void 0:ue.docs,source:{originalSource:`{
  render: () => {
    const [collapseState, setCollapseState] = useState<ActivityPanelCollapseState>({
      timeControllerCollapsed: false,
      toolsCollapsed: true,
      layersCollapsed: false
    });
    return <ActivityPanel timeExtent={TIME_EXTENT} timeUiState="ready" tools={MOCK_TOOLS} features={MOCK_FEATURES} selectedFeatureIds={['track-1']} hiddenIds={new Set()} toolMatches={[]} collapseState={collapseState} onCollapseStateChange={setCollapseState} onMessage={console.log} />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Tools section can be collapsed when not needed.'
      }
    }
  }
}`,...(he=(ye=T.parameters)==null?void 0:ye.docs)==null?void 0:he.source},description:{story:"Tools collapsed - shows only Time Controller and Layers.",...(fe=(ge=T.parameters)==null?void 0:ge.docs)==null?void 0:fe.description}}};var Ce,Se,ve,Te,be;b.parameters={...b.parameters,docs:{...(Ce=b.parameters)==null?void 0:Ce.docs,source:{originalSource:`{
  render: () => {
    const [collapseState, setCollapseState] = useState<ActivityPanelCollapseState>({
      timeControllerCollapsed: false,
      toolsCollapsed: false,
      layersCollapsed: true
    });
    return <ActivityPanel timeExtent={TIME_EXTENT} timeUiState="ready" tools={MOCK_TOOLS} features={MOCK_FEATURES} selectedFeatureIds={['track-1']} hiddenIds={new Set()} toolMatches={[]} collapseState={collapseState} onCollapseStateChange={setCollapseState} onMessage={console.log} />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Layers section can be collapsed to focus on time control and tools.'
      }
    }
  }
}`,...(ve=(Se=b.parameters)==null?void 0:Se.docs)==null?void 0:ve.source},description:{story:"Layers collapsed - shows only Time Controller and Tools.",...(be=(Te=b.parameters)==null?void 0:Te.docs)==null?void 0:be.description}}};var ke,we,xe,Ie,Ae;k.parameters={...k.parameters,docs:{...(ke=k.parameters)==null?void 0:ke.docs,source:{originalSource:`{
  render: () => {
    const [collapseState, setCollapseState] = useState<ActivityPanelCollapseState>({
      timeControllerCollapsed: true,
      toolsCollapsed: true,
      layersCollapsed: true
    });
    return <ActivityPanel timeExtent={TIME_EXTENT} timeUiState="ready" tools={MOCK_TOOLS} features={MOCK_FEATURES} selectedFeatureIds={['track-1']} hiddenIds={new Set()} toolMatches={[]} collapseState={collapseState} onCollapseStateChange={setCollapseState} onMessage={console.log} />;
  },
  parameters: {
    docs: {
      description: {
        story: 'All sections can be collapsed simultaneously to maximize workspace.'
      }
    }
  }
}`,...(xe=(we=k.parameters)==null?void 0:we.docs)==null?void 0:xe.source},description:{story:"All sections collapsed - shows only headers.",...(Ae=(Ie=k.parameters)==null?void 0:Ie.docs)==null?void 0:Ae.description}}};var Ee,je,Pe,Fe,qe;w.parameters={...w.parameters,docs:{...(Ee=w.parameters)==null?void 0:Ee.docs,source:{originalSource:`{
  render: () => {
    const [collapseState, setCollapseState] = useState<ActivityPanelCollapseState>({
      timeControllerCollapsed: false,
      toolsCollapsed: true,
      layersCollapsed: true
    });
    return <ActivityPanel timeExtent={TIME_EXTENT} timeUiState="ready" tools={MOCK_TOOLS} features={MOCK_FEATURES} selectedFeatureIds={['track-1']} hiddenIds={new Set()} toolMatches={[]} collapseState={collapseState} onCollapseStateChange={setCollapseState} onMessage={console.log} />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Focus on time navigation by collapsing other sections.'
      }
    }
  }
}`,...(Pe=(je=w.parameters)==null?void 0:je.docs)==null?void 0:Pe.source},description:{story:"Only Time Controller expanded - Tools and Layers collapsed.",...(qe=(Fe=w.parameters)==null?void 0:Fe.docs)==null?void 0:qe.description}}};var Le,_e,Oe,Ue,Re;x.parameters={...x.parameters,docs:{...(Le=x.parameters)==null?void 0:Le.docs,source:{originalSource:`{
  render: () => <InteractiveActivityPanel selectedFeatureIds={[]} tools={[{
    id: 'range-bearing',
    name: 'Range & Bearing',
    description: 'Calculate range and bearing',
    applicable: false,
    explanation: 'Requires 2 tracks'
  }, {
    id: 'track-stats',
    name: 'Track Statistics',
    description: 'Calculate track statistics',
    applicable: false,
    explanation: 'Requires 1 track'
  }]} />,
  parameters: {
    docs: {
      description: {
        story: 'When no features are selected, tools show why they are not applicable.'
      }
    }
  }
}`,...(Oe=(_e=x.parameters)==null?void 0:_e.docs)==null?void 0:Oe.source},description:{story:"No selection - shows all tools as inactive.",...(Re=(Ue=x.parameters)==null?void 0:Ue.docs)==null?void 0:Re.description}}};var Ne,De,Me,Ve,Ke;I.parameters={...I.parameters,docs:{...(Ne=I.parameters)==null?void 0:Ne.docs,source:{originalSource:`{
  render: () => <InteractiveActivityPanel selectedFeatureIds={['track-1', 'track-2']} />,
  parameters: {
    docs: {
      description: {
        story: 'With multiple features selected, tools that work on multi-selection become active.'
      }
    }
  }
}`,...(Me=(De=I.parameters)==null?void 0:De.docs)==null?void 0:Me.source},description:{story:"Multiple selection - shows applicable tools.",...(Ke=(Ve=I.parameters)==null?void 0:Ve.docs)==null?void 0:Ke.description}}};var We,Be,Xe,He,$e;A.parameters={...A.parameters,docs:{...(We=A.parameters)==null?void 0:We.docs,source:{originalSource:`{
  render: () => <InteractiveActivityPanel />,
  parameters: {
    docs: {
      description: {
        story: \`Error boundaries isolate failures per section. If one section throws an error,
it shows an inline error message (with error icon and text) without crashing the other sections.

Each section is wrapped in its own error boundary, ensuring that:
- A failing Time Controller doesn't affect Tools or Layers
- A failing Tools panel doesn't affect Time Controller or Layers
- A failing Layers section doesn't affect Time Controller or Tools

This makes the panel more resilient to runtime errors in individual components.\`
      }
    }
  }
}`,...(Xe=(Be=A.parameters)==null?void 0:Be.docs)==null?void 0:Xe.source},description:{story:`Error boundary demonstration - shows how errors in one section don't affect others.
The error boundary wraps each section independently, so if one section throws,
it shows an inline error message while other sections continue to work.`,...($e=(He=A.parameters)==null?void 0:He.docs)==null?void 0:$e.description}}};var ze,Ge,Je,Qe,Ye;E.parameters={...E.parameters,docs:{...(ze=E.parameters)==null?void 0:ze.docs,source:{originalSource:`{
  render: () => <ThemeProvider theme={{
    variant: 'light'
  }}>
      <div style={{
      width: 320,
      height: 600,
      background: '#f5f5f5'
    }}>
        <InteractiveActivityPanel />
      </div>
    </ThemeProvider>,
  parameters: {
    docs: {
      description: {
        story: 'Activity panel styled for light theme environments.'
      }
    }
  }
}`,...(Je=(Ge=E.parameters)==null?void 0:Ge.docs)==null?void 0:Je.source},description:{story:"Light theme variant.",...(Ye=(Qe=E.parameters)==null?void 0:Qe.docs)==null?void 0:Ye.description}}};var Ze,et,tt,at,rt;j.parameters={...j.parameters,docs:{...(Ze=j.parameters)==null?void 0:Ze.docs,source:{originalSource:`{
  render: () => <ThemeProvider theme={{
    variant: 'dark'
  }}>
      <div style={{
      width: 320,
      height: 600,
      background: '#1e1e1e'
    }}>
        <InteractiveActivityPanel />
      </div>
    </ThemeProvider>,
  parameters: {
    docs: {
      description: {
        story: 'Activity panel styled for dark theme environments (default).'
      }
    }
  }
}`,...(tt=(et=j.parameters)==null?void 0:et.docs)==null?void 0:tt.source},description:{story:"Dark theme variant (default).",...(rt=(at=j.parameters)==null?void 0:at.docs)==null?void 0:rt.description}}};var st,ot,lt,nt,it;P.parameters={...P.parameters,docs:{...(st=P.parameters)==null?void 0:st.docs,source:{originalSource:`{
  render: () => <ThemeProvider theme={{
    variant: 'vscode'
  }}>
      <div style={{
      width: 320,
      height: 600,
      background: '#1e1e1e'
    }}>
        <InteractiveActivityPanel />
      </div>
    </ThemeProvider>,
  parameters: {
    docs: {
      description: {
        story: 'Activity panel styled for VS Code sidebar integration.'
      }
    }
  }
}`,...(lt=(ot=P.parameters)==null?void 0:ot.docs)==null?void 0:lt.source},description:{story:"VS Code theme variant (dark with VS Code colors).",...(it=(nt=P.parameters)==null?void 0:nt.docs)==null?void 0:it.description}}};const Mt=["Default","EmptyState","LoadingState","ReadyState","TimeControllerCollapsed","ToolsCollapsed","LayersCollapsed","AllCollapsed","OnlyTimeExpanded","NoSelection","MultipleSelection","ErrorBoundary","LightTheme","DarkTheme","VSCodeTheme"];export{k as AllCollapsed,j as DarkTheme,g as Default,f as EmptyState,A as ErrorBoundary,b as LayersCollapsed,E as LightTheme,C as LoadingState,I as MultipleSelection,x as NoSelection,w as OnlyTimeExpanded,S as ReadyState,v as TimeControllerCollapsed,T as ToolsCollapsed,P as VSCodeTheme,Mt as __namedExportsOrder,Dt as default};
