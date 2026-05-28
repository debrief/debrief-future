import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r as o}from"./index-B2-qRKKC.js";import{A as r}from"./ActivityPanel-C9Ygkv78.js";import{T as x}from"./ThemeProvider-DF0jq0Ad.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./textfield-Dm39NdvL.js";import"./readOnlyBanner-llzwq9Gu.js";import"./ParameterEditor-j09_We3v.js";import"./ParameterEditor-DMejAiLo.js";import"./labels-Bx3GzQt_.js";import"./interval-CUv8kruJ.js";import"./types-CuJnRqfe.js";import"./TimeController-BQb5Lh1r.js";import"./ToolsPanel-C7_uRYfR.js";import"./paramTypeResolver-Br4vj1cK.js";import"./ContextMenu-qheFrteX.js";import"./LayersToolbar-Bc57yKCh.js";import"./FilterDropdown-D8R_GT18.js";import"./FeatureList-BxnH_LPr.js";import"./index-CHJUuggG.js";import"./index-kS-9iBlu.js";import"./applyClickToSelection-BH9K4Nvj.js";import"./FormatMenu-C20Tm7MD.js";import"./CascadingMenu-BgTnOB60.js";import"./GeometryDialog-CHN-2Uji.js";import"./defaultTheme-Tx6C8nph.js";const A=Date.now(),Ye=60*60*1e3,n=[A,A+8*Ye],l=[{id:"range-bearing",name:"Range & Bearing",description:"Calculate range and bearing between tracks",applicable:!0},{id:"closest-approach",name:"Closest Point of Approach",description:"Find closest approach point",applicable:!0},{id:"track-stats",name:"Track Statistics",description:"Calculate track statistics",applicable:!1,explanation:"Requires exactly 1 track"}],i=[{id:"track-1",type:"Feature",geometry:{type:"LineString",coordinates:[[0,0],[1,1]]},properties:{name:"HMS Belfast",kind:"TRACK",color:"#e41a1c"}},{id:"track-2",type:"Feature",geometry:{type:"LineString",coordinates:[[2,2],[3,3]]},properties:{name:"USS Enterprise",kind:"TRACK",color:"#377eb8"}},{id:"track-3",type:"Feature",geometry:{type:"LineString",coordinates:[[4,4],[5,5]]},properties:{name:"HMS Victory",kind:"TRACK",color:"#4daf4a"}}],bt={title:"Components/ActivityPanel",component:r,parameters:{layout:"centered",docs:{description:{component:`
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
        `}}},tags:["autodocs"],decorators:[(t,s)=>{const b=s.globals.theme||"dark";return e.jsx(x,{theme:{variant:b},children:e.jsx("div",{style:{width:320,height:600,background:b==="light"?"#f5f5f5":"#1e1e1e"},children:e.jsx(t,{})})})}]};function a(t){const[s,b]=o.useState({timeControllerCollapsed:!1,toolsCollapsed:!1,layersCollapsed:!1}),Je=o.useCallback(E=>{console.log("ActivityPanel message:",E)},[]),Qe=o.useCallback(E=>{console.log("Collapse state:",E),b(E)},[]);return e.jsx(r,{timeExtent:n,timeUiState:"ready",tools:l,features:i,selectedFeatureIds:["track-1"],hiddenIds:new Set,toolMatches:[],...t,collapseState:s,onCollapseStateChange:Qe,onMessage:Je})}const c={render:()=>e.jsx(a,{})},d={render:()=>e.jsx(a,{timeExtent:null,timeUiState:"empty",tools:[],features:[],selectedFeatureIds:[]}),parameters:{docs:{description:{story:"When no plot is loaded, the panel shows empty states for all sections."}}}},p={render:()=>e.jsx(a,{timeUiState:"loading",tools:[],features:[],selectedFeatureIds:[]}),parameters:{docs:{description:{story:"While data is loading, the time controller shows a loading message."}}}},m={render:()=>e.jsx(a,{}),parameters:{docs:{description:{story:"When data is loaded, all sections are active and usable."}}}},u={render:()=>{const[t,s]=o.useState({timeControllerCollapsed:!0,toolsCollapsed:!1,layersCollapsed:!1});return e.jsx(r,{timeExtent:n,timeUiState:"ready",tools:l,features:i,selectedFeatureIds:["track-1"],hiddenIds:new Set,toolMatches:[],collapseState:t,onCollapseStateChange:s,onMessage:console.log})},parameters:{docs:{description:{story:"Time Controller section can be collapsed to save space."}}}},h={render:()=>{const[t,s]=o.useState({timeControllerCollapsed:!1,toolsCollapsed:!0,layersCollapsed:!1});return e.jsx(r,{timeExtent:n,timeUiState:"ready",tools:l,features:i,selectedFeatureIds:["track-1"],hiddenIds:new Set,toolMatches:[],collapseState:t,onCollapseStateChange:s,onMessage:console.log})},parameters:{docs:{description:{story:"Tools section can be collapsed when not needed."}}}},y={render:()=>{const[t,s]=o.useState({timeControllerCollapsed:!1,toolsCollapsed:!1,layersCollapsed:!0});return e.jsx(r,{timeExtent:n,timeUiState:"ready",tools:l,features:i,selectedFeatureIds:["track-1"],hiddenIds:new Set,toolMatches:[],collapseState:t,onCollapseStateChange:s,onMessage:console.log})},parameters:{docs:{description:{story:"Layers section can be collapsed to focus on time control and tools."}}}},C={render:()=>{const[t,s]=o.useState({timeControllerCollapsed:!0,toolsCollapsed:!0,layersCollapsed:!0});return e.jsx(r,{timeExtent:n,timeUiState:"ready",tools:l,features:i,selectedFeatureIds:["track-1"],hiddenIds:new Set,toolMatches:[],collapseState:t,onCollapseStateChange:s,onMessage:console.log})},parameters:{docs:{description:{story:"All sections can be collapsed simultaneously to maximize workspace."}}}},S={render:()=>{const[t,s]=o.useState({timeControllerCollapsed:!1,toolsCollapsed:!0,layersCollapsed:!0});return e.jsx(r,{timeExtent:n,timeUiState:"ready",tools:l,features:i,selectedFeatureIds:["track-1"],hiddenIds:new Set,toolMatches:[],collapseState:t,onCollapseStateChange:s,onMessage:console.log})},parameters:{docs:{description:{story:"Focus on time navigation by collapsing other sections."}}}},g={render:()=>e.jsx(a,{selectedFeatureIds:[],tools:[{id:"range-bearing",name:"Range & Bearing",description:"Calculate range and bearing",applicable:!1,explanation:"Requires 2 tracks"},{id:"track-stats",name:"Track Statistics",description:"Calculate track statistics",applicable:!1,explanation:"Requires 1 track"}]}),parameters:{docs:{description:{story:"When no features are selected, tools show why they are not applicable."}}}},f={render:()=>e.jsx(a,{selectedFeatureIds:["track-1","track-2"]}),parameters:{docs:{description:{story:"With multiple features selected, tools that work on multi-selection become active."}}}},v={render:()=>e.jsx(a,{}),parameters:{docs:{description:{story:`Error boundaries isolate failures per section. If one section throws an error,
it shows an inline error message (with error icon and text) without crashing the other sections.

Each section is wrapped in its own error boundary, ensuring that:
- A failing Time Controller doesn't affect Tools or Layers
- A failing Tools panel doesn't affect Time Controller or Layers
- A failing Layers section doesn't affect Time Controller or Tools

This makes the panel more resilient to runtime errors in individual components.`}}}},T={render:()=>e.jsx(x,{theme:{variant:"light"},children:e.jsx("div",{style:{width:320,height:600,background:"#f5f5f5"},children:e.jsx(a,{})})}),parameters:{docs:{description:{story:"Activity panel styled for light theme environments."}}}},k={render:()=>e.jsx(x,{theme:{variant:"dark"},children:e.jsx("div",{style:{width:320,height:600,background:"#1e1e1e"},children:e.jsx(a,{})})}),parameters:{docs:{description:{story:"Activity panel styled for dark theme environments (default)."}}}},w={render:()=>e.jsx(x,{theme:{variant:"dark"},children:e.jsx("div",{style:{width:320,height:600,background:"#1e1e1e"},children:e.jsx(a,{})})}),parameters:{docs:{description:{story:"Activity panel styled for VS Code sidebar integration."}}}};var I,M,F,P,L;c.parameters={...c.parameters,docs:{...(I=c.parameters)==null?void 0:I.docs,source:{originalSource:`{
  render: () => <InteractiveActivityPanel />
}`,...(F=(M=c.parameters)==null?void 0:M.docs)==null?void 0:F.source},description:{story:`Default activity panel with all sections expanded and mock data loaded.
Try collapsing sections by clicking the headers.`,...(L=(P=c.parameters)==null?void 0:P.docs)==null?void 0:L.description}}};var O,j,U,R,_;d.parameters={...d.parameters,docs:{...(O=d.parameters)==null?void 0:O.docs,source:{originalSource:`{
  render: () => <InteractiveActivityPanel timeExtent={null} timeUiState="empty" tools={[]} features={[]} selectedFeatureIds={[]} />,
  parameters: {
    docs: {
      description: {
        story: 'When no plot is loaded, the panel shows empty states for all sections.'
      }
    }
  }
}`,...(U=(j=d.parameters)==null?void 0:j.docs)==null?void 0:U.source},description:{story:"Empty state when no plot is loaded.",...(_=(R=d.parameters)==null?void 0:R.docs)==null?void 0:_.description}}};var K,W,N,D,V;p.parameters={...p.parameters,docs:{...(K=p.parameters)==null?void 0:K.docs,source:{originalSource:`{
  render: () => <InteractiveActivityPanel timeUiState="loading" tools={[]} features={[]} selectedFeatureIds={[]} />,
  parameters: {
    docs: {
      description: {
        story: 'While data is loading, the time controller shows a loading message.'
      }
    }
  }
}`,...(N=(W=p.parameters)==null?void 0:W.docs)==null?void 0:N.source},description:{story:"Loading state while processing data.",...(V=(D=p.parameters)==null?void 0:D.docs)==null?void 0:V.description}}};var B,X,q,H,z;m.parameters={...m.parameters,docs:{...(B=m.parameters)==null?void 0:B.docs,source:{originalSource:`{
  render: () => <InteractiveActivityPanel />,
  parameters: {
    docs: {
      description: {
        story: 'When data is loaded, all sections are active and usable.'
      }
    }
  }
}`,...(q=(X=m.parameters)==null?void 0:X.docs)==null?void 0:q.source},description:{story:"Ready state with all data loaded.",...(z=(H=m.parameters)==null?void 0:H.docs)==null?void 0:z.description}}};var G,J,Q,Y,Z;u.parameters={...u.parameters,docs:{...(G=u.parameters)==null?void 0:G.docs,source:{originalSource:`{
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
}`,...(Q=(J=u.parameters)==null?void 0:J.docs)==null?void 0:Q.source},description:{story:"Time Controller collapsed - shows only Tools and Layers.",...(Z=(Y=u.parameters)==null?void 0:Y.docs)==null?void 0:Z.description}}};var $,ee,te,se,ae;h.parameters={...h.parameters,docs:{...($=h.parameters)==null?void 0:$.docs,source:{originalSource:`{
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
}`,...(te=(ee=h.parameters)==null?void 0:ee.docs)==null?void 0:te.source},description:{story:"Tools collapsed - shows only Time Controller and Layers.",...(ae=(se=h.parameters)==null?void 0:se.docs)==null?void 0:ae.description}}};var oe,re,ne,le,ie;y.parameters={...y.parameters,docs:{...(oe=y.parameters)==null?void 0:oe.docs,source:{originalSource:`{
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
}`,...(ne=(re=y.parameters)==null?void 0:re.docs)==null?void 0:ne.source},description:{story:"Layers collapsed - shows only Time Controller and Tools.",...(ie=(le=y.parameters)==null?void 0:le.docs)==null?void 0:ie.description}}};var ce,de,pe,me,ue;C.parameters={...C.parameters,docs:{...(ce=C.parameters)==null?void 0:ce.docs,source:{originalSource:`{
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
}`,...(pe=(de=C.parameters)==null?void 0:de.docs)==null?void 0:pe.source},description:{story:"All sections collapsed - shows only headers.",...(ue=(me=C.parameters)==null?void 0:me.docs)==null?void 0:ue.description}}};var he,ye,Ce,Se,ge;S.parameters={...S.parameters,docs:{...(he=S.parameters)==null?void 0:he.docs,source:{originalSource:`{
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
}`,...(Ce=(ye=S.parameters)==null?void 0:ye.docs)==null?void 0:Ce.source},description:{story:"Only Time Controller expanded - Tools and Layers collapsed.",...(ge=(Se=S.parameters)==null?void 0:Se.docs)==null?void 0:ge.description}}};var fe,ve,Te,ke,we;g.parameters={...g.parameters,docs:{...(fe=g.parameters)==null?void 0:fe.docs,source:{originalSource:`{
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
}`,...(Te=(ve=g.parameters)==null?void 0:ve.docs)==null?void 0:Te.source},description:{story:"No selection - shows all tools as inactive.",...(we=(ke=g.parameters)==null?void 0:ke.docs)==null?void 0:we.description}}};var be,Ee,xe,Ae,Ie;f.parameters={...f.parameters,docs:{...(be=f.parameters)==null?void 0:be.docs,source:{originalSource:`{
  render: () => <InteractiveActivityPanel selectedFeatureIds={['track-1', 'track-2']} />,
  parameters: {
    docs: {
      description: {
        story: 'With multiple features selected, tools that work on multi-selection become active.'
      }
    }
  }
}`,...(xe=(Ee=f.parameters)==null?void 0:Ee.docs)==null?void 0:xe.source},description:{story:"Multiple selection - shows applicable tools.",...(Ie=(Ae=f.parameters)==null?void 0:Ae.docs)==null?void 0:Ie.description}}};var Me,Fe,Pe,Le,Oe;v.parameters={...v.parameters,docs:{...(Me=v.parameters)==null?void 0:Me.docs,source:{originalSource:`{
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
}`,...(Pe=(Fe=v.parameters)==null?void 0:Fe.docs)==null?void 0:Pe.source},description:{story:`Error boundary demonstration - shows how errors in one section don't affect others.
The error boundary wraps each section independently, so if one section throws,
it shows an inline error message while other sections continue to work.`,...(Oe=(Le=v.parameters)==null?void 0:Le.docs)==null?void 0:Oe.description}}};var je,Ue,Re,_e,Ke;T.parameters={...T.parameters,docs:{...(je=T.parameters)==null?void 0:je.docs,source:{originalSource:`{
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
}`,...(Re=(Ue=T.parameters)==null?void 0:Ue.docs)==null?void 0:Re.source},description:{story:"Light theme variant.",...(Ke=(_e=T.parameters)==null?void 0:_e.docs)==null?void 0:Ke.description}}};var We,Ne,De,Ve,Be;k.parameters={...k.parameters,docs:{...(We=k.parameters)==null?void 0:We.docs,source:{originalSource:`{
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
}`,...(De=(Ne=k.parameters)==null?void 0:Ne.docs)==null?void 0:De.source},description:{story:"Dark theme variant (default).",...(Be=(Ve=k.parameters)==null?void 0:Ve.docs)==null?void 0:Be.description}}};var Xe,qe,He,ze,Ge;w.parameters={...w.parameters,docs:{...(Xe=w.parameters)==null?void 0:Xe.docs,source:{originalSource:`{
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
        story: 'Activity panel styled for VS Code sidebar integration.'
      }
    }
  }
}`,...(He=(qe=w.parameters)==null?void 0:qe.docs)==null?void 0:He.source},description:{story:"VS Code theme variant (dark with VS Code colors).",...(Ge=(ze=w.parameters)==null?void 0:ze.docs)==null?void 0:Ge.description}}};const Et=["Default","EmptyState","LoadingState","ReadyState","TimeControllerCollapsed","ToolsCollapsed","LayersCollapsed","AllCollapsed","OnlyTimeExpanded","NoSelection","MultipleSelection","ErrorBoundary","LightTheme","DarkTheme","VSCodeTheme"];export{C as AllCollapsed,k as DarkTheme,c as Default,d as EmptyState,v as ErrorBoundary,y as LayersCollapsed,T as LightTheme,p as LoadingState,f as MultipleSelection,g as NoSelection,S as OnlyTimeExpanded,m as ReadyState,u as TimeControllerCollapsed,h as ToolsCollapsed,w as VSCodeTheme,Et as __namedExportsOrder,bt as default};
