import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r}from"./index-B2-qRKKC.js";import{l as V}from"./textfield-Dm39NdvL.js";import{T as jt}from"./TimeController-YrrdAfN3.js";import{T as Pt}from"./ToolsPanel-DgqMA8nn.js";import{L as Lt}from"./LayersToolbar-BUs0gzzD.js";import{F as Ft}from"./FeatureList-C02Klk5_.js";import{T as R}from"./ThemeProvider-mvcGjblv.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./FilterDropdown-BgyHQuSK.js";import"./index-kS-9iBlu.js";import"./labels-DlaBaZmR.js";const qt={timeControllerCollapsed:!1,toolsCollapsed:!1,layersCollapsed:!1};class D extends r.Component{constructor(a){super(a),this.state={hasError:!1}}static getDerivedStateFromError(a){return{hasError:!0,error:a}}componentDidCatch(a,o){console.error(`ActivityPanel: ${this.props.sectionName} error:`,a,o)}render(){return this.state.hasError?e.jsxs("div",{className:"debrief-activity-panel__section-error",children:[e.jsx(V,{name:"error"}),e.jsxs("span",{children:[this.props.sectionName," encountered an error"]})]}):this.props.children}}function M({title:s,icon:a,collapsed:o,onToggle:d,layout:p="fixed",style:n,children:y}){const i=["debrief-activity-panel__section",o&&"debrief-activity-panel__section--collapsed",p==="flexible"&&!o&&"debrief-activity-panel__section--flexible"].filter(Boolean).join(" ");return e.jsxs("div",{className:i,style:n,children:[e.jsxs("button",{type:"button",className:"debrief-activity-panel__section-header",onClick:d,"aria-expanded":!o,children:[e.jsx(V,{name:o?"chevron-right":"chevron-down"}),e.jsx(V,{name:a}),e.jsx("span",{className:"debrief-activity-panel__section-title",children:s})]}),!o&&e.jsx("div",{className:"debrief-activity-panel__section-content",children:y})]})}function _t({onDrag:s}){const a=r.useRef(null);return r.useEffect(()=>{const o=a.current;if(!o)return;let d=0;const p=i=>{const q=i.clientY-d;d=i.clientY,s(q)},n=()=>{document.removeEventListener("pointermove",p),document.removeEventListener("pointerup",n),document.body.style.cursor="",document.body.style.userSelect=""},y=i=>{i.preventDefault(),d=i.clientY,document.body.style.cursor="row-resize",document.body.style.userSelect="none",document.addEventListener("pointermove",p),document.addEventListener("pointerup",n)};return o.addEventListener("pointerdown",y),()=>{o.removeEventListener("pointerdown",y),document.removeEventListener("pointermove",p),document.removeEventListener("pointerup",n)}},[s]),e.jsx("div",{ref:a,className:"debrief-activity-panel__resize-handle"})}function u({timeExtent:s,currentTime:a,playbackSpeed:o,displayMode:d,timeUiState:p,tools:n=[],features:y=[],selectedFeatureIds:i=[],hiddenIds:q,toolMatches:pt=[],collapseState:mt,onCollapseStateChange:_,onMessage:t,className:ut}){const[yt,ht]=r.useState(qt),m=mt??yt,[K,ft]=r.useState(0),gt=r.useCallback(l=>{ft(O=>O+l)},[]),U=r.useCallback(l=>{const O={...m,[l]:!m[l]};ht(O),_==null||_(O)},[m,_]),vt=r.useCallback(l=>{t==null||t({type:"temporal:seek",payload:{time:l}})},[t]),Ct=r.useCallback(l=>{l==="playing"?t==null||t({type:"temporal:play",payload:{rate:1}}):t==null||t({type:"temporal:pause"})},[t]),St=r.useCallback(l=>{t==null||t({type:"temporal:displayMode",payload:{mode:l}})},[t]),bt=r.useCallback(l=>{t==null||t({type:"tool:run",payload:{toolId:l}})},[t]),Tt=r.useCallback(l=>{t==null||t({type:"layer:toggleVisibility",payload:{featureIds:l}})},[t]),kt=r.useCallback(l=>{t==null||t({type:"layer:delete",payload:{featureIds:l}})},[t]),wt=r.useCallback(l=>{t==null||t({type:"layer:select",payload:{featureIds:Array.from(l)}})},[t]),xt=!m.toolsCollapsed,Et=!m.layersCollapsed,N=xt&&Et,It=N?{flexBasis:`calc(50% + ${K}px)`}:void 0,At=N?{flexBasis:`calc(50% - ${K}px)`}:void 0;return e.jsxs("div",{className:`debrief-activity-panel ${ut??""}`,role:"region","aria-label":"Activity Panel",children:[e.jsx(M,{title:"Time Controller",icon:"watch",collapsed:m.timeControllerCollapsed,onToggle:()=>U("timeControllerCollapsed"),layout:"fixed",children:e.jsx(D,{sectionName:"Time Controller",children:e.jsx(jt,{timeExtent:s??void 0,initialTime:a,initialSpeed:o,initialDisplayMode:d,uiState:p,onTimeChange:vt,onPlaybackStateChange:Ct,onDisplayModeChange:St})})}),e.jsx(M,{title:"Tools",icon:"tools",collapsed:m.toolsCollapsed,onToggle:()=>U("toolsCollapsed"),layout:"flexible",style:It,children:e.jsx(D,{sectionName:"Tools",children:e.jsx(Pt,{tools:n,onRunTool:bt})})}),N&&e.jsx(_t,{onDrag:gt}),e.jsx(M,{title:"Layers",icon:"layers",collapsed:m.layersCollapsed,onToggle:()=>U("layersCollapsed"),layout:"flexible",style:At,children:e.jsxs(D,{sectionName:"Layers",children:[e.jsx(Lt,{selectedFeatureIds:i,features:y,hiddenIds:q,toolMatches:pt,onDelete:kt,onToggleVisibility:Tt}),e.jsx(Ft,{features:y,selectedIds:new Set(i),hiddenIds:q,onSelectionChange:wt})]})})]})}u.__docgenInfo={description:`ActivityPanel component.

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
| { type: 'layer:select'; payload: { featureIds: string[] } }`,elements:[{name:"signature",type:"object",raw:"{ type: 'temporal:seek'; payload: { time: number } }",signature:{properties:[{key:"type",value:{name:"literal",value:"'temporal:seek'",required:!0}},{key:"payload",value:{name:"signature",type:"object",raw:"{ time: number }",signature:{properties:[{key:"time",value:{name:"number",required:!0}}]},required:!0}}]}},{name:"signature",type:"object",raw:"{ type: 'temporal:play'; payload: { rate: number } }",signature:{properties:[{key:"type",value:{name:"literal",value:"'temporal:play'",required:!0}},{key:"payload",value:{name:"signature",type:"object",raw:"{ rate: number }",signature:{properties:[{key:"rate",value:{name:"number",required:!0}}]},required:!0}}]}},{name:"signature",type:"object",raw:"{ type: 'temporal:pause' }",signature:{properties:[{key:"type",value:{name:"literal",value:"'temporal:pause'",required:!0}}]}},{name:"signature",type:"object",raw:"{ type: 'temporal:displayMode'; payload: { mode: 'full' | 'trail' } }",signature:{properties:[{key:"type",value:{name:"literal",value:"'temporal:displayMode'",required:!0}},{key:"payload",value:{name:"signature",type:"object",raw:"{ mode: 'full' | 'trail' }",signature:{properties:[{key:"mode",value:{name:"union",raw:"'full' | 'trail'",elements:[{name:"literal",value:"'full'"},{name:"literal",value:"'trail'"}],required:!0}}]},required:!0}}]}},{name:"signature",type:"object",raw:"{ type: 'tool:run'; payload: { toolId: string } }",signature:{properties:[{key:"type",value:{name:"literal",value:"'tool:run'",required:!0}},{key:"payload",value:{name:"signature",type:"object",raw:"{ toolId: string }",signature:{properties:[{key:"toolId",value:{name:"string",required:!0}}]},required:!0}}]}},{name:"signature",type:"object",raw:"{ type: 'layer:toggleVisibility'; payload: { featureIds: string[] } }",signature:{properties:[{key:"type",value:{name:"literal",value:"'layer:toggleVisibility'",required:!0}},{key:"payload",value:{name:"signature",type:"object",raw:"{ featureIds: string[] }",signature:{properties:[{key:"featureIds",value:{name:"Array",elements:[{name:"string"}],raw:"string[]",required:!0}}]},required:!0}}]}},{name:"signature",type:"object",raw:"{ type: 'layer:delete'; payload: { featureIds: string[] } }",signature:{properties:[{key:"type",value:{name:"literal",value:"'layer:delete'",required:!0}},{key:"payload",value:{name:"signature",type:"object",raw:"{ featureIds: string[] }",signature:{properties:[{key:"featureIds",value:{name:"Array",elements:[{name:"string"}],raw:"string[]",required:!0}}]},required:!0}}]}},{name:"signature",type:"object",raw:"{ type: 'layer:select'; payload: { featureIds: string[] } }",signature:{properties:[{key:"type",value:{name:"literal",value:"'layer:select'",required:!0}},{key:"payload",value:{name:"signature",type:"object",raw:"{ featureIds: string[] }",signature:{properties:[{key:"featureIds",value:{name:"Array",elements:[{name:"string"}],raw:"string[]",required:!0}}]},required:!0}}]}}]},name:"message"}],return:{name:"void"}}},description:"Callback for messages sent to the host"},className:{required:!1,tsType:{name:"string"},description:"CSS class name"}}};const W=Date.now(),Ot=60*60*1e3,h=[W,W+8*Ot],f=[{id:"range-bearing",name:"Range & Bearing",description:"Calculate range and bearing between tracks",applicable:!0},{id:"closest-approach",name:"Closest Point of Approach",description:"Find closest approach point",applicable:!0},{id:"track-stats",name:"Track Statistics",description:"Calculate track statistics",applicable:!1,explanation:"Requires exactly 1 track"}],g=[{id:"track-1",type:"Feature",geometry:{type:"LineString",coordinates:[[0,0],[1,1]]},properties:{name:"HMS Belfast",kind:"TRACK",color:"#e41a1c"}},{id:"track-2",type:"Feature",geometry:{type:"LineString",coordinates:[[2,2],[3,3]]},properties:{name:"USS Enterprise",kind:"TRACK",color:"#377eb8"}},{id:"track-3",type:"Feature",geometry:{type:"LineString",coordinates:[[4,4],[5,5]]},properties:{name:"HMS Victory",kind:"TRACK",color:"#4daf4a"}}],Yt={title:"Components/ActivityPanel",component:u,parameters:{layout:"centered",docs:{description:{component:`
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
        `}}},tags:["autodocs"],decorators:[(s,a)=>{const o=a.globals.theme||"dark";return e.jsx(R,{theme:{variant:o},children:e.jsx("div",{style:{width:320,height:600,background:o==="light"?"#f5f5f5":"#1e1e1e"},children:e.jsx(s,{})})})}]};function c(s){const[a,o]=r.useState({timeControllerCollapsed:!1,toolsCollapsed:!1,layersCollapsed:!1}),d=r.useCallback(n=>{console.log("ActivityPanel message:",n)},[]),p=r.useCallback(n=>{console.log("Collapse state:",n),o(n)},[]);return e.jsx(u,{timeExtent:h,timeUiState:"ready",tools:f,features:g,selectedFeatureIds:["track-1"],hiddenIds:new Set,toolMatches:[],...s,collapseState:a,onCollapseStateChange:p,onMessage:d})}const v={render:()=>e.jsx(c,{})},C={render:()=>e.jsx(c,{timeExtent:null,timeUiState:"empty",tools:[],features:[],selectedFeatureIds:[]}),parameters:{docs:{description:{story:"When no plot is loaded, the panel shows empty states for all sections."}}}},S={render:()=>e.jsx(c,{timeUiState:"loading",tools:[],features:[],selectedFeatureIds:[]}),parameters:{docs:{description:{story:"While data is loading, the time controller shows a loading message."}}}},b={render:()=>e.jsx(c,{}),parameters:{docs:{description:{story:"When data is loaded, all sections are active and usable."}}}},T={render:()=>{const[s,a]=r.useState({timeControllerCollapsed:!0,toolsCollapsed:!1,layersCollapsed:!1});return e.jsx(u,{timeExtent:h,timeUiState:"ready",tools:f,features:g,selectedFeatureIds:["track-1"],hiddenIds:new Set,toolMatches:[],collapseState:s,onCollapseStateChange:a,onMessage:console.log})},parameters:{docs:{description:{story:"Time Controller section can be collapsed to save space."}}}},k={render:()=>{const[s,a]=r.useState({timeControllerCollapsed:!1,toolsCollapsed:!0,layersCollapsed:!1});return e.jsx(u,{timeExtent:h,timeUiState:"ready",tools:f,features:g,selectedFeatureIds:["track-1"],hiddenIds:new Set,toolMatches:[],collapseState:s,onCollapseStateChange:a,onMessage:console.log})},parameters:{docs:{description:{story:"Tools section can be collapsed when not needed."}}}},w={render:()=>{const[s,a]=r.useState({timeControllerCollapsed:!1,toolsCollapsed:!1,layersCollapsed:!0});return e.jsx(u,{timeExtent:h,timeUiState:"ready",tools:f,features:g,selectedFeatureIds:["track-1"],hiddenIds:new Set,toolMatches:[],collapseState:s,onCollapseStateChange:a,onMessage:console.log})},parameters:{docs:{description:{story:"Layers section can be collapsed to focus on time control and tools."}}}},x={render:()=>{const[s,a]=r.useState({timeControllerCollapsed:!0,toolsCollapsed:!0,layersCollapsed:!0});return e.jsx(u,{timeExtent:h,timeUiState:"ready",tools:f,features:g,selectedFeatureIds:["track-1"],hiddenIds:new Set,toolMatches:[],collapseState:s,onCollapseStateChange:a,onMessage:console.log})},parameters:{docs:{description:{story:"All sections can be collapsed simultaneously to maximize workspace."}}}},E={render:()=>{const[s,a]=r.useState({timeControllerCollapsed:!1,toolsCollapsed:!0,layersCollapsed:!0});return e.jsx(u,{timeExtent:h,timeUiState:"ready",tools:f,features:g,selectedFeatureIds:["track-1"],hiddenIds:new Set,toolMatches:[],collapseState:s,onCollapseStateChange:a,onMessage:console.log})},parameters:{docs:{description:{story:"Focus on time navigation by collapsing other sections."}}}},I={render:()=>e.jsx(c,{selectedFeatureIds:[],tools:[{id:"range-bearing",name:"Range & Bearing",description:"Calculate range and bearing",applicable:!1,explanation:"Requires 2 tracks"},{id:"track-stats",name:"Track Statistics",description:"Calculate track statistics",applicable:!1,explanation:"Requires 1 track"}]}),parameters:{docs:{description:{story:"When no features are selected, tools show why they are not applicable."}}}},A={render:()=>e.jsx(c,{selectedFeatureIds:["track-1","track-2"]}),parameters:{docs:{description:{story:"With multiple features selected, tools that work on multi-selection become active."}}}},j={render:()=>e.jsx(c,{}),parameters:{docs:{description:{story:`Error boundaries isolate failures per section. If one section throws an error,
it shows an inline error message (with error icon and text) without crashing the other sections.

Each section is wrapped in its own error boundary, ensuring that:
- A failing Time Controller doesn't affect Tools or Layers
- A failing Tools panel doesn't affect Time Controller or Layers
- A failing Layers section doesn't affect Time Controller or Tools

This makes the panel more resilient to runtime errors in individual components.`}}}},P={render:()=>e.jsx(R,{theme:{variant:"light"},children:e.jsx("div",{style:{width:320,height:600,background:"#f5f5f5"},children:e.jsx(c,{})})}),parameters:{docs:{description:{story:"Activity panel styled for light theme environments."}}}},L={render:()=>e.jsx(R,{theme:{variant:"dark"},children:e.jsx("div",{style:{width:320,height:600,background:"#1e1e1e"},children:e.jsx(c,{})})}),parameters:{docs:{description:{story:"Activity panel styled for dark theme environments (default)."}}}},F={render:()=>e.jsx(R,{theme:{variant:"vscode"},children:e.jsx("div",{style:{width:320,height:600,background:"#1e1e1e"},children:e.jsx(c,{})})}),parameters:{docs:{description:{story:"Activity panel styled for VS Code sidebar integration."}}}};var B,z,X,H,Y;v.parameters={...v.parameters,docs:{...(B=v.parameters)==null?void 0:B.docs,source:{originalSource:`{
  render: () => <InteractiveActivityPanel />
}`,...(X=(z=v.parameters)==null?void 0:z.docs)==null?void 0:X.source},description:{story:`Default activity panel with all sections expanded and mock data loaded.
Try collapsing sections by clicking the headers.`,...(Y=(H=v.parameters)==null?void 0:H.docs)==null?void 0:Y.description}}};var $,G,J,Q,Z;C.parameters={...C.parameters,docs:{...($=C.parameters)==null?void 0:$.docs,source:{originalSource:`{
  render: () => <InteractiveActivityPanel timeExtent={null} timeUiState="empty" tools={[]} features={[]} selectedFeatureIds={[]} />,
  parameters: {
    docs: {
      description: {
        story: 'When no plot is loaded, the panel shows empty states for all sections.'
      }
    }
  }
}`,...(J=(G=C.parameters)==null?void 0:G.docs)==null?void 0:J.source},description:{story:"Empty state when no plot is loaded.",...(Z=(Q=C.parameters)==null?void 0:Q.docs)==null?void 0:Z.description}}};var ee,te,ae,re,se;S.parameters={...S.parameters,docs:{...(ee=S.parameters)==null?void 0:ee.docs,source:{originalSource:`{
  render: () => <InteractiveActivityPanel timeUiState="loading" tools={[]} features={[]} selectedFeatureIds={[]} />,
  parameters: {
    docs: {
      description: {
        story: 'While data is loading, the time controller shows a loading message.'
      }
    }
  }
}`,...(ae=(te=S.parameters)==null?void 0:te.docs)==null?void 0:ae.source},description:{story:"Loading state while processing data.",...(se=(re=S.parameters)==null?void 0:re.docs)==null?void 0:se.description}}};var oe,le,ne,ie,ce;b.parameters={...b.parameters,docs:{...(oe=b.parameters)==null?void 0:oe.docs,source:{originalSource:`{
  render: () => <InteractiveActivityPanel />,
  parameters: {
    docs: {
      description: {
        story: 'When data is loaded, all sections are active and usable.'
      }
    }
  }
}`,...(ne=(le=b.parameters)==null?void 0:le.docs)==null?void 0:ne.source},description:{story:"Ready state with all data loaded.",...(ce=(ie=b.parameters)==null?void 0:ie.docs)==null?void 0:ce.description}}};var de,pe,me,ue,ye;T.parameters={...T.parameters,docs:{...(de=T.parameters)==null?void 0:de.docs,source:{originalSource:`{
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
}`,...(me=(pe=T.parameters)==null?void 0:pe.docs)==null?void 0:me.source},description:{story:"Time Controller collapsed - shows only Tools and Layers.",...(ye=(ue=T.parameters)==null?void 0:ue.docs)==null?void 0:ye.description}}};var he,fe,ge,ve,Ce;k.parameters={...k.parameters,docs:{...(he=k.parameters)==null?void 0:he.docs,source:{originalSource:`{
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
}`,...(ge=(fe=k.parameters)==null?void 0:fe.docs)==null?void 0:ge.source},description:{story:"Tools collapsed - shows only Time Controller and Layers.",...(Ce=(ve=k.parameters)==null?void 0:ve.docs)==null?void 0:Ce.description}}};var Se,be,Te,ke,we;w.parameters={...w.parameters,docs:{...(Se=w.parameters)==null?void 0:Se.docs,source:{originalSource:`{
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
}`,...(Te=(be=w.parameters)==null?void 0:be.docs)==null?void 0:Te.source},description:{story:"Layers collapsed - shows only Time Controller and Tools.",...(we=(ke=w.parameters)==null?void 0:ke.docs)==null?void 0:we.description}}};var xe,Ee,Ie,Ae,je;x.parameters={...x.parameters,docs:{...(xe=x.parameters)==null?void 0:xe.docs,source:{originalSource:`{
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
}`,...(Ie=(Ee=x.parameters)==null?void 0:Ee.docs)==null?void 0:Ie.source},description:{story:"All sections collapsed - shows only headers.",...(je=(Ae=x.parameters)==null?void 0:Ae.docs)==null?void 0:je.description}}};var Pe,Le,Fe,qe,_e;E.parameters={...E.parameters,docs:{...(Pe=E.parameters)==null?void 0:Pe.docs,source:{originalSource:`{
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
}`,...(Fe=(Le=E.parameters)==null?void 0:Le.docs)==null?void 0:Fe.source},description:{story:"Only Time Controller expanded - Tools and Layers collapsed.",...(_e=(qe=E.parameters)==null?void 0:qe.docs)==null?void 0:_e.description}}};var Oe,Re,Ue,Ne,De;I.parameters={...I.parameters,docs:{...(Oe=I.parameters)==null?void 0:Oe.docs,source:{originalSource:`{
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
}`,...(Ue=(Re=I.parameters)==null?void 0:Re.docs)==null?void 0:Ue.source},description:{story:"No selection - shows all tools as inactive.",...(De=(Ne=I.parameters)==null?void 0:Ne.docs)==null?void 0:De.description}}};var Me,Ve,Ke,We,Be;A.parameters={...A.parameters,docs:{...(Me=A.parameters)==null?void 0:Me.docs,source:{originalSource:`{
  render: () => <InteractiveActivityPanel selectedFeatureIds={['track-1', 'track-2']} />,
  parameters: {
    docs: {
      description: {
        story: 'With multiple features selected, tools that work on multi-selection become active.'
      }
    }
  }
}`,...(Ke=(Ve=A.parameters)==null?void 0:Ve.docs)==null?void 0:Ke.source},description:{story:"Multiple selection - shows applicable tools.",...(Be=(We=A.parameters)==null?void 0:We.docs)==null?void 0:Be.description}}};var ze,Xe,He,Ye,$e;j.parameters={...j.parameters,docs:{...(ze=j.parameters)==null?void 0:ze.docs,source:{originalSource:`{
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
}`,...(He=(Xe=j.parameters)==null?void 0:Xe.docs)==null?void 0:He.source},description:{story:`Error boundary demonstration - shows how errors in one section don't affect others.
The error boundary wraps each section independently, so if one section throws,
it shows an inline error message while other sections continue to work.`,...($e=(Ye=j.parameters)==null?void 0:Ye.docs)==null?void 0:$e.description}}};var Ge,Je,Qe,Ze,et;P.parameters={...P.parameters,docs:{...(Ge=P.parameters)==null?void 0:Ge.docs,source:{originalSource:`{
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
}`,...(Qe=(Je=P.parameters)==null?void 0:Je.docs)==null?void 0:Qe.source},description:{story:"Light theme variant.",...(et=(Ze=P.parameters)==null?void 0:Ze.docs)==null?void 0:et.description}}};var tt,at,rt,st,ot;L.parameters={...L.parameters,docs:{...(tt=L.parameters)==null?void 0:tt.docs,source:{originalSource:`{
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
}`,...(rt=(at=L.parameters)==null?void 0:at.docs)==null?void 0:rt.source},description:{story:"Dark theme variant (default).",...(ot=(st=L.parameters)==null?void 0:st.docs)==null?void 0:ot.description}}};var lt,nt,it,ct,dt;F.parameters={...F.parameters,docs:{...(lt=F.parameters)==null?void 0:lt.docs,source:{originalSource:`{
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
}`,...(it=(nt=F.parameters)==null?void 0:nt.docs)==null?void 0:it.source},description:{story:"VS Code theme variant (dark with VS Code colors).",...(dt=(ct=F.parameters)==null?void 0:ct.docs)==null?void 0:dt.description}}};const $t=["Default","EmptyState","LoadingState","ReadyState","TimeControllerCollapsed","ToolsCollapsed","LayersCollapsed","AllCollapsed","OnlyTimeExpanded","NoSelection","MultipleSelection","ErrorBoundary","LightTheme","DarkTheme","VSCodeTheme"];export{x as AllCollapsed,L as DarkTheme,v as Default,C as EmptyState,j as ErrorBoundary,w as LayersCollapsed,P as LightTheme,S as LoadingState,A as MultipleSelection,I as NoSelection,E as OnlyTimeExpanded,b as ReadyState,T as TimeControllerCollapsed,k as ToolsCollapsed,F as VSCodeTheme,$t as __namedExportsOrder,Yt as default};
