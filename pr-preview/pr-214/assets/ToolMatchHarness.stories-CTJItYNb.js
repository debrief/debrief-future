import{j as t}from"./jsx-runtime-CmtfZKef.js";import{r as i}from"./index-Dm8qopDP.js";import{T as fe,c as ye}from"./types-j4WT0IKY.js";import{T as re}from"./ThemeProvider-F2_Ncok2.js";import"./_commonjsHelpers-BosuxZz1.js";const ne=[{id:"track-1",kind:"TRACK",name:"HMS Victory"},{id:"track-2",kind:"TRACK",name:"USS Constitution"},{id:"track-3",kind:"TRACK",name:"Contact Alpha"},{id:"ref-1",kind:"POINT",name:"Waypoint Alpha"},{id:"ref-2",kind:"POINT",name:"Waypoint Bravo"},{id:"narrative-1",kind:"NARRATIVE",name:"Log Entry 1"},{id:"narrative-2",kind:"NARRATIVE",name:"Log Entry 2"}];function xe(){const s=new Map;for(const r of ne){const k=s.get(r.kind)??[];s.set(r.kind,[...k,r])}return s}function Se(s){return{TRACK:"Tracks",POINT:"Reference Points",NARRATIVE:"Narratives"}[s]??s}function ie({features:s,tools:r,initialSelection:k=[],initialShowInactive:ce=!1,className:le,style:de}){const[g,f]=i.useState(new Set(k)),[y,me]=i.useState(ce),S=i.useMemo(()=>new fe(r),[r]),T=i.useMemo(()=>{const e={};for(const o of g){const a=s.find(n=>n.id===o);a&&(e[a.kind]=(e[a.kind]??0)+1)}return ye(e)},[g,s]),c=i.useMemo(()=>S.getMatchResults(T),[S,T]),he=i.useMemo(()=>xe(),[]),_=i.useMemo(()=>y?c:c.filter(e=>e.isActive),[c,y]),pe=e=>{f(o=>{const a=new Set(o);return a.has(e)?a.delete(e):a.add(e),a})},ue=e=>{const o=s.filter(a=>a.kind===e);f(a=>{const n=new Set(a);for(const x of o)n.add(x.id);return n})},ve=e=>{const o=s.filter(a=>a.kind===e);f(a=>{const n=new Set(a);for(const x of o)n.delete(x.id);return n})},ge=c.filter(e=>e.isActive).length,ke=c.length;return t.jsxs("div",{className:`tool-match-harness ${le??""}`,style:de,"data-testid":"tool-match-harness",children:[t.jsxs("div",{className:"tool-match-harness__features","data-testid":"features-panel",children:[t.jsxs("div",{className:"tool-match-harness__header",children:[t.jsx("h3",{children:"Features"}),t.jsxs("span",{className:"tool-match-harness__count",children:[g.size," selected"]})]}),t.jsx("div",{className:"tool-match-harness__feature-list",children:Array.from(he.entries()).map(([e,o])=>t.jsxs("div",{className:"tool-match-harness__feature-group",children:[t.jsxs("div",{className:"tool-match-harness__group-header",children:[t.jsx("span",{className:"tool-match-harness__group-label",children:Se(e)}),t.jsxs("div",{className:"tool-match-harness__group-actions",children:[t.jsx("button",{type:"button",onClick:()=>ue(e),className:"tool-match-harness__action-btn","data-testid":`select-all-${e.toLowerCase()}`,children:"All"}),t.jsx("button",{type:"button",onClick:()=>ve(e),className:"tool-match-harness__action-btn","data-testid":`clear-${e.toLowerCase()}`,children:"Clear"})]})]}),o.map(a=>t.jsxs("label",{className:"tool-match-harness__feature-item","data-testid":`feature-${a.id}`,children:[t.jsx("input",{type:"checkbox",checked:g.has(a.id),onChange:()=>pe(a.id),"data-testid":`checkbox-${a.id}`}),t.jsx("span",{className:"tool-match-harness__feature-name",children:a.name})]},a.id))]},e))})]}),t.jsxs("div",{className:"tool-match-harness__tools","data-testid":"tools-panel",children:[t.jsxs("div",{className:"tool-match-harness__header",children:[t.jsx("h3",{children:"Available Tools"}),t.jsxs("span",{className:"tool-match-harness__count",children:[ge," of ",ke," active"]})]}),t.jsx("div",{className:"tool-match-harness__toggle",children:t.jsxs("label",{"data-testid":"show-inactive-toggle",children:[t.jsx("input",{type:"checkbox",checked:y,onChange:e=>me(e.target.checked),"data-testid":"show-inactive-checkbox"}),"Show inactive tools"]})}),t.jsx("div",{className:"tool-match-harness__tool-list","data-testid":"tool-list",children:_.length===0?t.jsx("div",{className:"tool-match-harness__empty","data-testid":"tools-empty-state",children:"No tools available for current selection"}):_.map(e=>t.jsxs("div",{className:`tool-match-harness__tool-item ${e.isActive?"tool-match-harness__tool-item--active":"tool-match-harness__tool-item--inactive"}`,"data-testid":`tool-${e.tool.id}`,"data-active":e.isActive,children:[t.jsxs("div",{className:"tool-match-harness__tool-header",children:[t.jsx("span",{className:"tool-match-harness__tool-name",children:e.tool.name}),e.isActive&&t.jsx("span",{className:"tool-match-harness__tool-badge","data-testid":`badge-${e.tool.id}`,children:"Active"})]}),e.tool.description&&t.jsx("div",{className:"tool-match-harness__tool-description",children:e.tool.description}),!e.isActive&&e.explanation&&t.jsx("div",{className:"tool-match-harness__tool-explanation","data-testid":`explanation-${e.tool.id}`,children:e.explanation})]},e.tool.id))})]})]})}ie.__docgenInfo={description:`ToolMatchHarness displays a feature selection panel and tool matching results.

@example
\`\`\`tsx
<ToolMatchHarness
  features={sampleFeatures}
  tools={sampleTools}
/>
\`\`\``,methods:[],displayName:"ToolMatchHarness",props:{features:{required:!0,tsType:{name:"Array",elements:[{name:"SimpleFeature"}],raw:"SimpleFeature[]"},description:"Features to display in the selection panel"},tools:{required:!0,tsType:{name:"Array",elements:[{name:"Tool"}],raw:"Tool[]"},description:"Tools to match against the selection"},initialSelection:{required:!1,tsType:{name:"Array",elements:[{name:"string"}],raw:"string[]"},description:"Initial selected feature IDs",defaultValue:{value:"[]",computed:!1}},initialShowInactive:{required:!1,tsType:{name:"boolean"},description:"Whether to show inactive tools initially",defaultValue:{value:"false",computed:!1}},className:{required:!1,tsType:{name:"string"},description:"Additional CSS class"},style:{required:!1,tsType:{name:"CSSProperties"},description:"Additional inline styles"}}};const Te=[{id:"range-calculation",name:"Range Calculation",description:"Calculate range and bearing between two tracks",version:"1.0.0",requirements:[{kind:"TRACK",min:2,max:2}]},{id:"bearing-to-point",name:"Bearing to Point",description:"Calculate bearing from a track to a reference point",version:"1.0.0",requirements:[{kind:"TRACK",min:1,max:1},{kind:"POINT",min:1,max:1}]},{id:"area-analysis",name:"Area Analysis",description:"Analyze area bounded by 3+ reference points",version:"1.0.0",requirements:[{kind:"POINT",min:3}]},{id:"track-summary",name:"Track Summary",description:"Generate summary statistics for selected tracks",version:"1.0.0",requirements:[{kind:"TRACK",min:1}]},{id:"global-statistics",name:"Global Statistics",description:"Show overall plot statistics (no selection required)",version:"1.0.0",requirements:[]}],Ne={title:"ToolMatch/Harness",component:ie,parameters:{layout:"padded",docs:{description:{component:"ToolMatchHarness is a visual verification harness for context-sensitive tool offering. It displays a feature selection panel (left) and tool list (right) that updates based on selection."}}},tags:["autodocs"],decorators:[s=>t.jsx(re,{children:t.jsx("div",{style:{maxWidth:900,margin:"0 auto"},children:t.jsx(s,{})})})],args:{features:ne,tools:Te}},l={parameters:{docs:{description:{story:"Initial state with no features selected. Only tools with no requirements are active."}}}},d={args:{initialSelection:["track-1","track-2"]},parameters:{docs:{description:{story:'With two tracks selected, "Range Calculation" and "Track Summary" become active.'}}}},m={args:{initialSelection:["track-1","ref-1"]},parameters:{docs:{description:{story:'With one track and one reference point selected, "Bearing to Point" becomes active.'}}}},h={args:{initialSelection:["track-1"],initialShowInactive:!0},parameters:{docs:{description:{story:"Shows all tools with explanations for why inactive tools are unavailable."}}}},p={args:{initialSelection:["track-1","track-2","track-3"]},parameters:{docs:{description:{story:'With all three tracks selected, "Track Summary" is active but "Range Calculation" is not (requires exactly 2).'}}}},u={args:{initialSelection:["track-1","track-2","ref-1","ref-2","narrative-1"],initialShowInactive:!0},parameters:{docs:{description:{story:"Complex selection showing various tool states with inactive toggle enabled."}}}},v={args:{initialSelection:["track-1","track-2"],initialShowInactive:!0},decorators:[s=>t.jsx(re,{theme:{variant:"dark"},children:t.jsx("div",{style:{maxWidth:900,margin:"0 auto",padding:20,background:"#1e1e1e"},children:t.jsx(s,{})})})],parameters:{backgrounds:{default:"dark"},docs:{description:{story:"ToolMatchHarness with dark theme."}}}};var w,b,A,j,N;l.parameters={...l.parameters,docs:{...(w=l.parameters)==null?void 0:w.docs,source:{originalSource:`{
  parameters: {
    docs: {
      description: {
        story: 'Initial state with no features selected. Only tools with no requirements are active.'
      }
    }
  }
}`,...(A=(b=l.parameters)==null?void 0:b.docs)==null?void 0:A.source},description:{story:`Default state with no selection.
Only "Global Statistics" tool is active (no requirements).`,...(N=(j=l.parameters)==null?void 0:j.docs)==null?void 0:N.description}}};var C,I,R,M,q;d.parameters={...d.parameters,docs:{...(C=d.parameters)==null?void 0:C.docs,source:{originalSource:`{
  args: {
    initialSelection: ['track-1', 'track-2']
  },
  parameters: {
    docs: {
      description: {
        story: 'With two tracks selected, "Range Calculation" and "Track Summary" become active.'
      }
    }
  }
}`,...(R=(I=d.parameters)==null?void 0:I.docs)==null?void 0:R.source},description:{story:"Two tracks selected - Range Calculation becomes active.",...(q=(M=d.parameters)==null?void 0:M.docs)==null?void 0:q.description}}};var P,F,W,K,O;m.parameters={...m.parameters,docs:{...(P=m.parameters)==null?void 0:P.docs,source:{originalSource:`{
  args: {
    initialSelection: ['track-1', 'ref-1']
  },
  parameters: {
    docs: {
      description: {
        story: 'With one track and one reference point selected, "Bearing to Point" becomes active.'
      }
    }
  }
}`,...(W=(F=m.parameters)==null?void 0:F.docs)==null?void 0:W.source},description:{story:"One track and one point selected - Bearing to Point active.",...(O=(K=m.parameters)==null?void 0:K.docs)==null?void 0:O.description}}};var H,$,E,D,B;h.parameters={...h.parameters,docs:{...(H=h.parameters)==null?void 0:H.docs,source:{originalSource:`{
  args: {
    initialSelection: ['track-1'],
    initialShowInactive: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows all tools with explanations for why inactive tools are unavailable.'
      }
    }
  }
}`,...(E=($=h.parameters)==null?void 0:$.docs)==null?void 0:E.source},description:{story:"Show inactive tools toggle enabled.",...(B=(D=h.parameters)==null?void 0:D.docs)==null?void 0:B.description}}};var V,L,G,z,U;p.parameters={...p.parameters,docs:{...(V=p.parameters)==null?void 0:V.docs,source:{originalSource:`{
  args: {
    initialSelection: ['track-1', 'track-2', 'track-3']
  },
  parameters: {
    docs: {
      description: {
        story: 'With all three tracks selected, "Track Summary" is active but "Range Calculation" is not (requires exactly 2).'
      }
    }
  }
}`,...(G=(L=p.parameters)==null?void 0:L.docs)==null?void 0:G.source},description:{story:"All tracks selected - Track Summary active.",...(U=(z=p.parameters)==null?void 0:z.docs)==null?void 0:U.description}}};var J,Q,X,Y,Z;u.parameters={...u.parameters,docs:{...(J=u.parameters)==null?void 0:J.docs,source:{originalSource:`{
  args: {
    initialSelection: ['track-1', 'track-2', 'ref-1', 'ref-2', 'narrative-1'],
    initialShowInactive: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Complex selection showing various tool states with inactive toggle enabled.'
      }
    }
  }
}`,...(X=(Q=u.parameters)==null?void 0:Q.docs)==null?void 0:X.source},description:{story:"Many features selected - demonstrates complex matching.",...(Z=(Y=u.parameters)==null?void 0:Y.docs)==null?void 0:Z.description}}};var ee,te,ae,se,oe;v.parameters={...v.parameters,docs:{...(ee=v.parameters)==null?void 0:ee.docs,source:{originalSource:`{
  args: {
    initialSelection: ['track-1', 'track-2'],
    initialShowInactive: true
  },
  decorators: [Story => <ThemeProvider theme={{
    variant: 'dark'
  }}>
        <div style={{
      maxWidth: 900,
      margin: '0 auto',
      padding: 20,
      background: '#1e1e1e'
    }}>
          <Story />
        </div>
      </ThemeProvider>],
  parameters: {
    backgrounds: {
      default: 'dark'
    },
    docs: {
      description: {
        story: 'ToolMatchHarness with dark theme.'
      }
    }
  }
}`,...(ae=(te=v.parameters)==null?void 0:te.docs)==null?void 0:ae.source},description:{story:"Dark theme variant.",...(oe=(se=v.parameters)==null?void 0:se.docs)==null?void 0:oe.description}}};const Ce=["Default","TwoTracksSelected","TrackAndPoint","ShowInactive","AllTracksSelected","ComplexSelection","DarkTheme"];export{p as AllTracksSelected,u as ComplexSelection,v as DarkTheme,l as Default,h as ShowInactive,m as TrackAndPoint,d as TwoTracksSelected,Ce as __namedExportsOrder,Ne as default};
