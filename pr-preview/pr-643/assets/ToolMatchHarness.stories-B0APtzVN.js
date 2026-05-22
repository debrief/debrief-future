import{j as t}from"./jsx-runtime-DF2Pcvd1.js";import{r as i}from"./index-B2-qRKKC.js";import{T as we,a as be}from"./types-CcWckdPZ.js";import{T as me}from"./ThemeProvider-DF0jq0Ad.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./defaultTheme-Tx6C8nph.js";const pe=[{id:"track-1",kind:"TRACK",name:"HMS Victory"},{id:"track-2",kind:"TRACK",name:"USS Constitution"},{id:"track-3",kind:"TRACK",name:"Contact Alpha"},{id:"ref-1",kind:"POINT",name:"Waypoint Alpha"},{id:"ref-2",kind:"POINT",name:"Waypoint Bravo"},{id:"rect-1",kind:"RECTANGLE",name:"Weapons-Hold Zone Charlie"},{id:"narrative-1",kind:"NARRATIVE",name:"Log Entry 1"},{id:"narrative-2",kind:"NARRATIVE",name:"Log Entry 2"}];function Ae(){const s=new Map;for(const r of pe){const f=s.get(r.kind)??[];s.set(r.kind,[...f,r])}return s}function Ce(s){return{TRACK:"Tracks",POINT:"Reference Points",RECTANGLE:"Zones",NARRATIVE:"Narratives"}[s]??s}function he({features:s,tools:r,initialSelection:f=[],initialShowInactive:ue=!1,className:ve,style:ge}){const[k,y]=i.useState(new Set(f)),[S,ke]=i.useState(ue),T=i.useMemo(()=>new we(r),[r]),_=i.useMemo(()=>{const e={};for(const o of k){const a=s.find(n=>n.id===o);a&&(e[a.kind]=(e[a.kind]??0)+1)}return be(e)},[k,s]),c=i.useMemo(()=>T.getMatchResults(_),[T,_]),fe=i.useMemo(()=>Ae(),[]),w=i.useMemo(()=>S?c:c.filter(e=>e.isActive),[c,S]),ye=e=>{y(o=>{const a=new Set(o);return a.has(e)?a.delete(e):a.add(e),a})},Se=e=>{const o=s.filter(a=>a.kind===e);y(a=>{const n=new Set(a);for(const x of o)n.add(x.id);return n})},xe=e=>{const o=s.filter(a=>a.kind===e);y(a=>{const n=new Set(a);for(const x of o)n.delete(x.id);return n})},Te=c.filter(e=>e.isActive).length,_e=c.length;return t.jsxs("div",{className:`tool-match-harness ${ve??""}`,style:ge,"data-testid":"tool-match-harness",children:[t.jsxs("div",{className:"tool-match-harness__features","data-testid":"features-panel",children:[t.jsxs("div",{className:"tool-match-harness__header",children:[t.jsx("h3",{children:"Features"}),t.jsxs("span",{className:"tool-match-harness__count",children:[k.size," selected"]})]}),t.jsx("div",{className:"tool-match-harness__feature-list",children:Array.from(fe.entries()).map(([e,o])=>t.jsxs("div",{className:"tool-match-harness__feature-group",children:[t.jsxs("div",{className:"tool-match-harness__group-header",children:[t.jsx("span",{className:"tool-match-harness__group-label",children:Ce(e)}),t.jsxs("div",{className:"tool-match-harness__group-actions",children:[t.jsx("button",{type:"button",onClick:()=>Se(e),className:"tool-match-harness__action-btn","data-testid":`select-all-${e.toLowerCase()}`,children:"All"}),t.jsx("button",{type:"button",onClick:()=>xe(e),className:"tool-match-harness__action-btn","data-testid":`clear-${e.toLowerCase()}`,children:"Clear"})]})]}),o.map(a=>t.jsxs("label",{className:"tool-match-harness__feature-item","data-testid":`feature-${a.id}`,children:[t.jsx("input",{type:"checkbox",checked:k.has(a.id),onChange:()=>ye(a.id),"data-testid":`checkbox-${a.id}`}),t.jsx("span",{className:"tool-match-harness__feature-name",children:a.name})]},a.id))]},e))})]}),t.jsxs("div",{className:"tool-match-harness__tools","data-testid":"tools-panel",children:[t.jsxs("div",{className:"tool-match-harness__header",children:[t.jsx("h3",{children:"Available Tools"}),t.jsxs("span",{className:"tool-match-harness__count",children:[Te," of ",_e," active"]})]}),t.jsx("div",{className:"tool-match-harness__toggle",children:t.jsxs("label",{"data-testid":"show-inactive-toggle",children:[t.jsx("input",{type:"checkbox",checked:S,onChange:e=>ke(e.target.checked),"data-testid":"show-inactive-checkbox"}),"Show inactive tools"]})}),t.jsx("div",{className:"tool-match-harness__tool-list","data-testid":"tool-list",children:w.length===0?t.jsx("div",{className:"tool-match-harness__empty","data-testid":"tools-empty-state",children:"No tools available for current selection"}):w.map(e=>t.jsxs("div",{className:`tool-match-harness__tool-item ${e.isActive?"tool-match-harness__tool-item--active":"tool-match-harness__tool-item--inactive"}`,"data-testid":`tool-${e.tool.id}`,"data-active":e.isActive,children:[t.jsxs("div",{className:"tool-match-harness__tool-header",children:[t.jsx("span",{className:"tool-match-harness__tool-name",children:e.tool.name}),e.isActive&&t.jsx("span",{className:"tool-match-harness__tool-badge","data-testid":`badge-${e.tool.id}`,children:"Active"})]}),e.tool.description&&t.jsx("div",{className:"tool-match-harness__tool-description",children:e.tool.description}),!e.isActive&&e.explanation&&t.jsx("div",{className:"tool-match-harness__tool-explanation","data-testid":`explanation-${e.tool.id}`,children:e.explanation})]},e.tool.id))})]})]})}he.__docgenInfo={description:`ToolMatchHarness displays a feature selection panel and tool matching results.

@example
\`\`\`tsx
<ToolMatchHarness
  features={sampleFeatures}
  tools={sampleTools}
/>
\`\`\``,methods:[],displayName:"ToolMatchHarness",props:{features:{required:!0,tsType:{name:"Array",elements:[{name:"SimpleFeature"}],raw:"SimpleFeature[]"},description:"Features to display in the selection panel"},tools:{required:!0,tsType:{name:"Array",elements:[{name:"Tool"}],raw:"Tool[]"},description:"Tools to match against the selection"},initialSelection:{required:!1,tsType:{name:"Array",elements:[{name:"string"}],raw:"string[]"},description:"Initial selected feature IDs",defaultValue:{value:"[]",computed:!1}},initialShowInactive:{required:!1,tsType:{name:"boolean"},description:"Whether to show inactive tools initially",defaultValue:{value:"false",computed:!1}},className:{required:!1,tsType:{name:"string"},description:"Additional CSS class"},style:{required:!1,tsType:{name:"CSSProperties"},description:"Additional inline styles"}}};const Ne=[{id:"range-calculation",name:"Range Calculation",description:"Calculate range and bearing between two tracks",version:"1.0.0",requirements:[{kind:"TRACK",min:2,max:2}]},{id:"bearing-to-point",name:"Bearing to Point",description:"Calculate bearing from a track to a reference point",version:"1.0.0",requirements:[{kind:"TRACK",min:1,max:1},{kind:"POINT",min:1,max:1}]},{id:"area-analysis",name:"Area Analysis",description:"Analyze area bounded by 3+ reference points",version:"1.0.0",requirements:[{kind:"POINT",min:3}]},{id:"track-summary",name:"Track Summary",description:"Generate summary statistics for selected tracks",version:"1.0.0",requirements:[{kind:"TRACK",min:1}]},{id:"global-statistics",name:"Global Statistics",description:"Show overall plot statistics (no selection required)",version:"1.0.0",requirements:[]},{id:"generate-reference-points",name:"Generate Reference Points",description:"Generates a grid or scatter pattern of reference points within a selected polygon",version:"1.0.0",requirements:[{kind:"RECTANGLE",min:1,max:1},{kind:"POLY",min:1,max:1},{kind:"CIRCLE",min:1,max:1}]}],Ee={title:"ToolMatch/Harness",component:he,parameters:{layout:"padded",docs:{description:{component:"ToolMatchHarness is a visual verification harness for context-sensitive tool offering. It displays a feature selection panel (left) and tool list (right) that updates based on selection."}}},tags:["autodocs"],decorators:[s=>t.jsx(me,{children:t.jsx("div",{style:{maxWidth:900,margin:"0 auto"},children:t.jsx(s,{})})})],args:{features:pe,tools:Ne}},l={parameters:{docs:{description:{story:"Initial state with no features selected. Only tools with no requirements are active."}}}},d={args:{initialSelection:["track-1","track-2"]},parameters:{docs:{description:{story:'With two tracks selected, "Range Calculation" and "Track Summary" become active.'}}}},m={args:{initialSelection:["track-1","ref-1"]},parameters:{docs:{description:{story:'With one track and one reference point selected, "Bearing to Point" becomes active.'}}}},p={args:{initialSelection:["track-1"],initialShowInactive:!0},parameters:{docs:{description:{story:"Shows all tools with explanations for why inactive tools are unavailable."}}}},h={args:{initialSelection:["track-1","track-2","track-3"]},parameters:{docs:{description:{story:'With all three tracks selected, "Track Summary" is active but "Range Calculation" is not (requires exactly 2).'}}}},u={args:{initialSelection:["track-1","track-2","ref-1","ref-2","narrative-1"],initialShowInactive:!0},parameters:{docs:{description:{story:"Complex selection showing various tool states with inactive toggle enabled."}}}},v={args:{initialSelection:["rect-1"],initialShowInactive:!0},parameters:{docs:{description:{story:'With one rectangle selected, "Generate Reference Points" becomes active.'}}}},g={args:{initialSelection:["track-1","track-2"],initialShowInactive:!0},decorators:[s=>t.jsx(me,{theme:{variant:"dark"},children:t.jsx("div",{style:{maxWidth:900,margin:"0 auto",padding:20,background:"#1e1e1e"},children:t.jsx(s,{})})})],parameters:{backgrounds:{default:"dark"},docs:{description:{story:"ToolMatchHarness with dark theme."}}}};var b,A,C,N,j;l.parameters={...l.parameters,docs:{...(b=l.parameters)==null?void 0:b.docs,source:{originalSource:`{
  parameters: {
    docs: {
      description: {
        story: 'Initial state with no features selected. Only tools with no requirements are active.'
      }
    }
  }
}`,...(C=(A=l.parameters)==null?void 0:A.docs)==null?void 0:C.source},description:{story:`Default state with no selection.
Only "Global Statistics" tool is active (no requirements).`,...(j=(N=l.parameters)==null?void 0:N.docs)==null?void 0:j.description}}};var R,I,P,q,M;d.parameters={...d.parameters,docs:{...(R=d.parameters)==null?void 0:R.docs,source:{originalSource:`{
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
}`,...(P=(I=d.parameters)==null?void 0:I.docs)==null?void 0:P.source},description:{story:"Two tracks selected - Range Calculation becomes active.",...(M=(q=d.parameters)==null?void 0:q.docs)==null?void 0:M.description}}};var E,W,F,G,K;m.parameters={...m.parameters,docs:{...(E=m.parameters)==null?void 0:E.docs,source:{originalSource:`{
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
}`,...(F=(W=m.parameters)==null?void 0:W.docs)==null?void 0:F.source},description:{story:"One track and one point selected - Bearing to Point active.",...(K=(G=m.parameters)==null?void 0:G.docs)==null?void 0:K.description}}};var O,H,L,$,D;p.parameters={...p.parameters,docs:{...(O=p.parameters)==null?void 0:O.docs,source:{originalSource:`{
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
}`,...(L=(H=p.parameters)==null?void 0:H.docs)==null?void 0:L.source},description:{story:"Show inactive tools toggle enabled.",...(D=($=p.parameters)==null?void 0:$.docs)==null?void 0:D.description}}};var B,V,z,Z,U;h.parameters={...h.parameters,docs:{...(B=h.parameters)==null?void 0:B.docs,source:{originalSource:`{
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
}`,...(z=(V=h.parameters)==null?void 0:V.docs)==null?void 0:z.source},description:{story:"All tracks selected - Track Summary active.",...(U=(Z=h.parameters)==null?void 0:Z.docs)==null?void 0:U.description}}};var Y,J,Q,X,ee;u.parameters={...u.parameters,docs:{...(Y=u.parameters)==null?void 0:Y.docs,source:{originalSource:`{
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
}`,...(Q=(J=u.parameters)==null?void 0:J.docs)==null?void 0:Q.source},description:{story:"Many features selected - demonstrates complex matching.",...(ee=(X=u.parameters)==null?void 0:X.docs)==null?void 0:ee.description}}};var te,ae,se,oe,re;v.parameters={...v.parameters,docs:{...(te=v.parameters)==null?void 0:te.docs,source:{originalSource:`{
  args: {
    initialSelection: ['rect-1'],
    initialShowInactive: true
  },
  parameters: {
    docs: {
      description: {
        story: 'With one rectangle selected, "Generate Reference Points" becomes active.'
      }
    }
  }
}`,...(se=(ae=v.parameters)==null?void 0:ae.docs)==null?void 0:se.source},description:{story:"Rectangle selected - Generate Reference Points becomes active.",...(re=(oe=v.parameters)==null?void 0:oe.docs)==null?void 0:re.description}}};var ne,ie,ce,le,de;g.parameters={...g.parameters,docs:{...(ne=g.parameters)==null?void 0:ne.docs,source:{originalSource:`{
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
}`,...(ce=(ie=g.parameters)==null?void 0:ie.docs)==null?void 0:ce.source},description:{story:"Dark theme variant.",...(de=(le=g.parameters)==null?void 0:le.docs)==null?void 0:de.description}}};const We=["Default","TwoTracksSelected","TrackAndPoint","ShowInactive","AllTracksSelected","ComplexSelection","RectangleSelected","DarkTheme"];export{h as AllTracksSelected,u as ComplexSelection,g as DarkTheme,l as Default,v as RectangleSelected,p as ShowInactive,m as TrackAndPoint,d as TwoTracksSelected,We as __namedExportsOrder,Ee as default};
