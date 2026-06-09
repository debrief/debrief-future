import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r as o}from"./index-B2-qRKKC.js";import{A as r}from"./ActivityPanel-2pVSbVL0.js";import{T as E}from"./ThemeProvider-CkyXO63D.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./textfield-Dm39NdvL.js";import"./readOnlyBanner-DQOCUynw.js";import"./ParameterEditor-j09_We3v.js";import"./ParameterEditor-DMejAiLo.js";import"./labels-Bx3GzQt_.js";import"./interval-CUv8kruJ.js";import"./types-CuJnRqfe.js";import"./TimeController-BQb5Lh1r.js";import"./ToolsPanel-C7_uRYfR.js";import"./paramTypeResolver-Br4vj1cK.js";import"./ContextMenu-qheFrteX.js";import"./LayersToolbar-Bc57yKCh.js";import"./FilterDropdown-D8R_GT18.js";import"./FeatureList-D5IPgdaf.js";import"./index-CHJUuggG.js";import"./index-kS-9iBlu.js";import"./applyClickToSelection-BH9K4Nvj.js";import"./FormatMenu-C20Tm7MD.js";import"./CascadingMenu-BgTnOB60.js";import"./GeometryDialog-CHN-2Uji.js";import"./StoryboardPanel-B5wtbxwA.js";import"./defaultTheme-Tx6C8nph.js";const I=Date.now(),at=60*60*1e3,n=[I,I+8*at],i=[{id:"range-bearing",name:"Range & Bearing",description:"Calculate range and bearing between tracks",applicable:!0},{id:"closest-approach",name:"Closest Point of Approach",description:"Find closest approach point",applicable:!0},{id:"track-stats",name:"Track Statistics",description:"Calculate track statistics",applicable:!1,explanation:"Requires exactly 1 track"}],l=[{id:"track-1",type:"Feature",geometry:{type:"LineString",coordinates:[[0,0],[1,1]]},properties:{name:"HMS Belfast",kind:"TRACK",color:"#e41a1c"}},{id:"track-2",type:"Feature",geometry:{type:"LineString",coordinates:[[2,2],[3,3]]},properties:{name:"USS Enterprise",kind:"TRACK",color:"#377eb8"}},{id:"track-3",type:"Feature",geometry:{type:"LineString",coordinates:[[4,4],[5,5]]},properties:{name:"HMS Victory",kind:"TRACK",color:"#4daf4a"}}],Pt={title:"Components/ActivityPanel",component:r,parameters:{layout:"centered",docs:{description:{component:`
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
        `}}},tags:["autodocs"],decorators:[(t,s)=>{const b=s.globals.theme||"dark";return e.jsx(E,{theme:{variant:b},children:e.jsx("div",{style:{width:320,height:600,background:b==="light"?"#f5f5f5":"#1e1e1e"},children:e.jsx(t,{})})})}]};function a(t){const[s,b]=o.useState({timeControllerCollapsed:!1,toolsCollapsed:!1,layersCollapsed:!1}),tt=o.useCallback(A=>{console.log("ActivityPanel message:",A)},[]),st=o.useCallback(A=>{console.log("Collapse state:",A),b(A)},[]);return e.jsx(r,{timeExtent:n,timeUiState:"ready",tools:i,features:l,selectedFeatureIds:["track-1"],hiddenIds:new Set,toolMatches:[],...t,collapseState:s,onCollapseStateChange:st,onMessage:tt})}const c={render:()=>e.jsx(a,{})},d={render:()=>e.jsx(a,{timeExtent:null,timeUiState:"empty",tools:[],features:[],selectedFeatureIds:[]}),parameters:{docs:{description:{story:"When no plot is loaded, the panel shows empty states for all sections."}}}},p={render:()=>e.jsx(a,{timeUiState:"loading",tools:[],features:[],selectedFeatureIds:[]}),parameters:{docs:{description:{story:"While data is loading, the time controller shows a loading message."}}}},m={render:()=>e.jsx(a,{}),parameters:{docs:{description:{story:"When data is loaded, all sections are active and usable."}}}},h={render:()=>{const[t,s]=o.useState({timeControllerCollapsed:!0,toolsCollapsed:!1,layersCollapsed:!1});return e.jsx(r,{timeExtent:n,timeUiState:"ready",tools:i,features:l,selectedFeatureIds:["track-1"],hiddenIds:new Set,toolMatches:[],collapseState:t,onCollapseStateChange:s,onMessage:console.log})},parameters:{docs:{description:{story:"Time Controller section can be collapsed to save space."}}}},u={render:()=>{const[t,s]=o.useState({timeControllerCollapsed:!1,toolsCollapsed:!0,layersCollapsed:!1});return e.jsx(r,{timeExtent:n,timeUiState:"ready",tools:i,features:l,selectedFeatureIds:["track-1"],hiddenIds:new Set,toolMatches:[],collapseState:t,onCollapseStateChange:s,onMessage:console.log})},parameters:{docs:{description:{story:"Tools section can be collapsed when not needed."}}}},y={render:()=>{const[t,s]=o.useState({timeControllerCollapsed:!1,toolsCollapsed:!1,layersCollapsed:!0});return e.jsx(r,{timeExtent:n,timeUiState:"ready",tools:i,features:l,selectedFeatureIds:["track-1"],hiddenIds:new Set,toolMatches:[],collapseState:t,onCollapseStateChange:s,onMessage:console.log})},parameters:{docs:{description:{story:"Layers section can be collapsed to focus on time control and tools."}}}},g={render:()=>{const[t,s]=o.useState({timeControllerCollapsed:!0,toolsCollapsed:!0,layersCollapsed:!0});return e.jsx(r,{timeExtent:n,timeUiState:"ready",tools:i,features:l,selectedFeatureIds:["track-1"],hiddenIds:new Set,toolMatches:[],collapseState:t,onCollapseStateChange:s,onMessage:console.log})},parameters:{docs:{description:{story:"All sections can be collapsed simultaneously to maximize workspace."}}}},S={render:()=>{const[t,s]=o.useState({timeControllerCollapsed:!1,toolsCollapsed:!0,layersCollapsed:!0});return e.jsx(r,{timeExtent:n,timeUiState:"ready",tools:i,features:l,selectedFeatureIds:["track-1"],hiddenIds:new Set,toolMatches:[],collapseState:t,onCollapseStateChange:s,onMessage:console.log})},parameters:{docs:{description:{story:"Focus on time navigation by collapsing other sections."}}}},C={render:()=>e.jsx(a,{selectedFeatureIds:[],tools:[{id:"range-bearing",name:"Range & Bearing",description:"Calculate range and bearing",applicable:!1,explanation:"Requires 2 tracks"},{id:"track-stats",name:"Track Statistics",description:"Calculate track statistics",applicable:!1,explanation:"Requires 1 track"}]}),parameters:{docs:{description:{story:"When no features are selected, tools show why they are not applicable."}}}},f={render:()=>e.jsx(a,{selectedFeatureIds:["track-1","track-2"]}),parameters:{docs:{description:{story:"With multiple features selected, tools that work on multi-selection become active."}}}},T={render:()=>e.jsx(a,{}),parameters:{docs:{description:{story:`Error boundaries isolate failures per section. If one section throws an error,
it shows an inline error message (with error icon and text) without crashing the other sections.

Each section is wrapped in its own error boundary, ensuring that:
- A failing Time Controller doesn't affect Tools or Layers
- A failing Tools panel doesn't affect Time Controller or Layers
- A failing Layers section doesn't affect Time Controller or Tools

This makes the panel more resilient to runtime errors in individual components.`}}}},v={render:()=>e.jsx(E,{theme:{variant:"light"},children:e.jsx("div",{style:{width:320,height:600,background:"#f5f5f5"},children:e.jsx(a,{})})}),parameters:{docs:{description:{story:"Activity panel styled for light theme environments."}}}},w={render:()=>e.jsx(E,{theme:{variant:"dark"},children:e.jsx("div",{style:{width:320,height:600,background:"#1e1e1e"},children:e.jsx(a,{})})}),parameters:{docs:{description:{story:"Activity panel styled for dark theme environments (default)."}}}},x={render:()=>e.jsx(E,{theme:{variant:"dark"},children:e.jsx("div",{style:{width:320,height:600,background:"#1e1e1e"},children:e.jsx(a,{})})}),parameters:{docs:{description:{story:"Activity panel styled for VS Code sidebar integration."}}}},k={render:()=>e.jsx(E,{theme:{variant:"dark"},children:e.jsx("div",{style:{width:320,height:720,background:"#1e1e1e",overflow:"hidden"},children:e.jsx(r,{timeExtent:n,timeUiState:"ready",tools:i,features:l,selectedFeatureIds:["track-1"],hiddenIds:new Set,toolMatches:[],onMessage:console.log})})}),parameters:{docs:{description:{story:`
**Short-height adaptation (US4 — spec 281)**

When the panel is UNCONTROLLED (no \`collapseState\` prop) **and** the container
height is below ~820 px **and** a feature is selected, the panel automatically
collapses the Tools section on first render so the Properties section is
immediately visible without scrolling.

- This wrapper is 720 px tall — typical for a 1280×720 laptop.
- The Tools section starts collapsed; click the "Tools" header to expand it.
- \`onCollapseStateChange\` is NEVER called by the adaptation (not persisted).
- On the next open the panel renders fresh (no stored state).
        `}}}};var M,O,P,L,F;c.parameters={...c.parameters,docs:{...(M=c.parameters)==null?void 0:M.docs,source:{originalSource:`{
  render: () => <InteractiveActivityPanel />
}`,...(P=(O=c.parameters)==null?void 0:O.docs)==null?void 0:P.source},description:{story:`Default activity panel with all sections expanded and mock data loaded.
Try collapsing sections by clicking the headers.`,...(F=(L=c.parameters)==null?void 0:L.docs)==null?void 0:F.description}}};var U,R,j,_,N;d.parameters={...d.parameters,docs:{...(U=d.parameters)==null?void 0:U.docs,source:{originalSource:`{
  render: () => <InteractiveActivityPanel timeExtent={null} timeUiState="empty" tools={[]} features={[]} selectedFeatureIds={[]} />,
  parameters: {
    docs: {
      description: {
        story: 'When no plot is loaded, the panel shows empty states for all sections.'
      }
    }
  }
}`,...(j=(R=d.parameters)==null?void 0:R.docs)==null?void 0:j.source},description:{story:"Empty state when no plot is loaded.",...(N=(_=d.parameters)==null?void 0:_.docs)==null?void 0:N.description}}};var K,W,D,V,X;p.parameters={...p.parameters,docs:{...(K=p.parameters)==null?void 0:K.docs,source:{originalSource:`{
  render: () => <InteractiveActivityPanel timeUiState="loading" tools={[]} features={[]} selectedFeatureIds={[]} />,
  parameters: {
    docs: {
      description: {
        story: 'While data is loading, the time controller shows a loading message.'
      }
    }
  }
}`,...(D=(W=p.parameters)==null?void 0:W.docs)==null?void 0:D.source},description:{story:"Loading state while processing data.",...(X=(V=p.parameters)==null?void 0:V.docs)==null?void 0:X.description}}};var B,q,H,z,G;m.parameters={...m.parameters,docs:{...(B=m.parameters)==null?void 0:B.docs,source:{originalSource:`{
  render: () => <InteractiveActivityPanel />,
  parameters: {
    docs: {
      description: {
        story: 'When data is loaded, all sections are active and usable.'
      }
    }
  }
}`,...(H=(q=m.parameters)==null?void 0:q.docs)==null?void 0:H.source},description:{story:"Ready state with all data loaded.",...(G=(z=m.parameters)==null?void 0:z.docs)==null?void 0:G.description}}};var J,Q,Y,Z,$;h.parameters={...h.parameters,docs:{...(J=h.parameters)==null?void 0:J.docs,source:{originalSource:`{
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
}`,...(Y=(Q=h.parameters)==null?void 0:Q.docs)==null?void 0:Y.source},description:{story:"Time Controller collapsed - shows only Tools and Layers.",...($=(Z=h.parameters)==null?void 0:Z.docs)==null?void 0:$.description}}};var ee,te,se,ae,oe;u.parameters={...u.parameters,docs:{...(ee=u.parameters)==null?void 0:ee.docs,source:{originalSource:`{
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
}`,...(se=(te=u.parameters)==null?void 0:te.docs)==null?void 0:se.source},description:{story:"Tools collapsed - shows only Time Controller and Layers.",...(oe=(ae=u.parameters)==null?void 0:ae.docs)==null?void 0:oe.description}}};var re,ne,ie,le,ce;y.parameters={...y.parameters,docs:{...(re=y.parameters)==null?void 0:re.docs,source:{originalSource:`{
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
}`,...(ie=(ne=y.parameters)==null?void 0:ne.docs)==null?void 0:ie.source},description:{story:"Layers collapsed - shows only Time Controller and Tools.",...(ce=(le=y.parameters)==null?void 0:le.docs)==null?void 0:ce.description}}};var de,pe,me,he,ue;g.parameters={...g.parameters,docs:{...(de=g.parameters)==null?void 0:de.docs,source:{originalSource:`{
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
}`,...(me=(pe=g.parameters)==null?void 0:pe.docs)==null?void 0:me.source},description:{story:"All sections collapsed - shows only headers.",...(ue=(he=g.parameters)==null?void 0:he.docs)==null?void 0:ue.description}}};var ye,ge,Se,Ce,fe;S.parameters={...S.parameters,docs:{...(ye=S.parameters)==null?void 0:ye.docs,source:{originalSource:`{
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
}`,...(Se=(ge=S.parameters)==null?void 0:ge.docs)==null?void 0:Se.source},description:{story:"Only Time Controller expanded - Tools and Layers collapsed.",...(fe=(Ce=S.parameters)==null?void 0:Ce.docs)==null?void 0:fe.description}}};var Te,ve,we,xe,ke;C.parameters={...C.parameters,docs:{...(Te=C.parameters)==null?void 0:Te.docs,source:{originalSource:`{
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
}`,...(we=(ve=C.parameters)==null?void 0:ve.docs)==null?void 0:we.source},description:{story:"No selection - shows all tools as inactive.",...(ke=(xe=C.parameters)==null?void 0:xe.docs)==null?void 0:ke.description}}};var Ee,be,Ae,Ie,Me;f.parameters={...f.parameters,docs:{...(Ee=f.parameters)==null?void 0:Ee.docs,source:{originalSource:`{
  render: () => <InteractiveActivityPanel selectedFeatureIds={['track-1', 'track-2']} />,
  parameters: {
    docs: {
      description: {
        story: 'With multiple features selected, tools that work on multi-selection become active.'
      }
    }
  }
}`,...(Ae=(be=f.parameters)==null?void 0:be.docs)==null?void 0:Ae.source},description:{story:"Multiple selection - shows applicable tools.",...(Me=(Ie=f.parameters)==null?void 0:Ie.docs)==null?void 0:Me.description}}};var Oe,Pe,Le,Fe,Ue;T.parameters={...T.parameters,docs:{...(Oe=T.parameters)==null?void 0:Oe.docs,source:{originalSource:`{
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
}`,...(Le=(Pe=T.parameters)==null?void 0:Pe.docs)==null?void 0:Le.source},description:{story:`Error boundary demonstration - shows how errors in one section don't affect others.
The error boundary wraps each section independently, so if one section throws,
it shows an inline error message while other sections continue to work.`,...(Ue=(Fe=T.parameters)==null?void 0:Fe.docs)==null?void 0:Ue.description}}};var Re,je,_e,Ne,Ke;v.parameters={...v.parameters,docs:{...(Re=v.parameters)==null?void 0:Re.docs,source:{originalSource:`{
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
}`,...(_e=(je=v.parameters)==null?void 0:je.docs)==null?void 0:_e.source},description:{story:"Light theme variant.",...(Ke=(Ne=v.parameters)==null?void 0:Ne.docs)==null?void 0:Ke.description}}};var We,De,Ve,Xe,Be;w.parameters={...w.parameters,docs:{...(We=w.parameters)==null?void 0:We.docs,source:{originalSource:`{
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
}`,...(Ve=(De=w.parameters)==null?void 0:De.docs)==null?void 0:Ve.source},description:{story:"Dark theme variant (default).",...(Be=(Xe=w.parameters)==null?void 0:Xe.docs)==null?void 0:Be.description}}};var qe,He,ze,Ge,Je;x.parameters={...x.parameters,docs:{...(qe=x.parameters)==null?void 0:qe.docs,source:{originalSource:`{
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
}`,...(ze=(He=x.parameters)==null?void 0:He.docs)==null?void 0:ze.source},description:{story:"VS Code theme variant (dark with VS Code colors).",...(Je=(Ge=x.parameters)==null?void 0:Ge.docs)==null?void 0:Je.description}}};var Qe,Ye,Ze,$e,et;k.parameters={...k.parameters,docs:{...(Qe=k.parameters)==null?void 0:Qe.docs,source:{originalSource:`{
  render: () => <ThemeProvider theme={{
    variant: 'dark'
  }}>
      {/* Constrain to 720px tall — simulates a short-laptop viewport */}
      <div style={{
      width: 320,
      height: 720,
      background: '#1e1e1e',
      overflow: 'hidden'
    }}>
        {/* UNCONTROLLED — no collapseState prop, so the adaptation fires */}
        <ActivityPanel timeExtent={TIME_EXTENT} timeUiState="ready" tools={MOCK_TOOLS} features={MOCK_FEATURES} selectedFeatureIds={['track-1']} hiddenIds={new Set()} toolMatches={[]} onMessage={console.log}
      /* No collapseState prop → uncontrolled → short-height adaptation fires */ />
      </div>
    </ThemeProvider>,
  parameters: {
    docs: {
      description: {
        story: \`
**Short-height adaptation (US4 — spec 281)**

When the panel is UNCONTROLLED (no \\\`collapseState\\\` prop) **and** the container
height is below ~820 px **and** a feature is selected, the panel automatically
collapses the Tools section on first render so the Properties section is
immediately visible without scrolling.

- This wrapper is 720 px tall — typical for a 1280×720 laptop.
- The Tools section starts collapsed; click the "Tools" header to expand it.
- \\\`onCollapseStateChange\\\` is NEVER called by the adaptation (not persisted).
- On the next open the panel renders fresh (no stored state).
        \`
      }
    }
  }
}`,...(Ze=(Ye=k.parameters)==null?void 0:Ye.docs)==null?void 0:Ze.source},description:{story:`Short-height panel with a feature selected — demonstrates that Properties
is immediately reachable without manual scrolling on ~720px-tall viewports.

The wrapper is constrained to 720px height (matching a 1280×720 laptop).
When the panel is UNCONTROLLED and a feature is selected, the adaptation
automatically collapses the Tools section on mount so Properties is visible.

Users can still expand Tools by clicking the section header.`,...(et=($e=k.parameters)==null?void 0:$e.docs)==null?void 0:et.description}}};const Lt=["Default","EmptyState","LoadingState","ReadyState","TimeControllerCollapsed","ToolsCollapsed","LayersCollapsed","AllCollapsed","OnlyTimeExpanded","NoSelection","MultipleSelection","ErrorBoundary","LightTheme","DarkTheme","VSCodeTheme","ShortHeightPropertiesReachable"];export{g as AllCollapsed,w as DarkTheme,c as Default,d as EmptyState,T as ErrorBoundary,y as LayersCollapsed,v as LightTheme,p as LoadingState,f as MultipleSelection,C as NoSelection,S as OnlyTimeExpanded,m as ReadyState,k as ShortHeightPropertiesReachable,h as TimeControllerCollapsed,u as ToolsCollapsed,x as VSCodeTheme,Lt as __namedExportsOrder,Pt as default};
