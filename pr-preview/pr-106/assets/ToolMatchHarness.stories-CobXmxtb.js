var ye=Object.defineProperty;var Se=(t,s,n)=>s in t?ye(t,s,{enumerable:!0,configurable:!0,writable:!0,value:n}):t[s]=n;var N=(t,s,n)=>Se(t,typeof s!="symbol"?s+"":s,n);import{j as a}from"./jsx-runtime-DF2Pcvd1.js";import{r as u}from"./index-B2-qRKKC.js";import{T as de}from"./ThemeProvider-KrJW1DiK.js";import"./_commonjsHelpers-Cpj98o6Y.js";function Te(t,s){const n=t.requirements??[];if(n.length===0)return"";const r=[];for(const d of n){const l=s.get(d.kind)??0,i=d.min??0,c=d.max,m=_e(d.kind);l<i&&(i===1&&l===0?r.push(`Requires at least 1 ${m}`):i===c?r.push(`Requires exactly ${i} ${_(m,i)} (${l} selected)`):r.push(`Requires at least ${i} ${_(m,i)} (${l} selected)`)),c!=null&&l>c&&(c===0?r.push(`Does not accept ${m} features (${l} in selection)`):i===c?r.push(`Requires exactly ${c} ${_(m,c)} (${l} selected)`):r.push(`Maximum ${c} ${_(m,c)} allowed (${l} selected)`))}return r[0]??""}function _e(t){return t.toLowerCase().replace(/_/g," ")}function _(t,s){return s===1?t:t.endsWith("s")||t.endsWith("x")||t.endsWith("ch")||t.endsWith("sh")?t+"es":t+"s"}class be{constructor(s){N(this,"tools");this.tools=[...s].sort((n,r)=>n.name.localeCompare(r.name))}getMatchResults(s){return this.tools.map(n=>{const r=this.isToolActive(n,s);return{tool:n,isActive:r,explanation:r?"":Te(n,s)}})}getActiveTools(s){return this.tools.filter(n=>this.isToolActive(n,s))}getInactiveTools(s){return this.tools.filter(n=>!this.isToolActive(n,s))}isToolActive(s,n){const r=s.requirements??[];if(r.length===0)return!0;for(const d of r){const l=n.get(d.kind)??0,i=d.min??0;if(l<i||d.max!==void 0&&d.max!==null&&l>d.max)return!1}return!0}getAllTools(){return[...this.tools]}}function we(t){return new Map(Object.entries(t))}const me=[{id:"track-1",kind:"TRACK",name:"HMS Victory"},{id:"track-2",kind:"TRACK",name:"USS Constitution"},{id:"track-3",kind:"TRACK",name:"Contact Alpha"},{id:"ref-1",kind:"POINT",name:"Waypoint Alpha"},{id:"ref-2",kind:"POINT",name:"Waypoint Bravo"},{id:"narrative-1",kind:"NARRATIVE",name:"Log Entry 1"},{id:"narrative-2",kind:"NARRATIVE",name:"Log Entry 2"}];function Ae(){const t=new Map;for(const s of me){const n=t.get(s.kind)??[];t.set(s.kind,[...n,s])}return t}function je(t){return{TRACK:"Tracks",POINT:"Reference Points",NARRATIVE:"Narratives"}[t]??t}function he({features:t,tools:s,initialSelection:n=[],initialShowInactive:r=!1,className:d,style:l}){const[i,c]=u.useState(new Set(n)),[m,pe]=u.useState(r),w=u.useMemo(()=>new be(s),[s]),A=u.useMemo(()=>{const e={};for(const h of i){const o=t.find(p=>p.id===h);o&&(e[o.kind]=(e[o.kind]??0)+1)}return we(e)},[i,t]),v=u.useMemo(()=>w.getMatchResults(A),[w,A]),ue=u.useMemo(()=>Ae(),[]),j=u.useMemo(()=>m?v:v.filter(e=>e.isActive),[v,m]),ve=e=>{c(h=>{const o=new Set(h);return o.has(e)?o.delete(e):o.add(e),o})},fe=e=>{const h=t.filter(o=>o.kind===e);c(o=>{const p=new Set(o);for(const b of h)p.add(b.id);return p})},ge=e=>{const h=t.filter(o=>o.kind===e);c(o=>{const p=new Set(o);for(const b of h)p.delete(b.id);return p})},ke=v.filter(e=>e.isActive).length,xe=v.length;return a.jsxs("div",{className:`tool-match-harness ${d??""}`,style:l,"data-testid":"tool-match-harness",children:[a.jsxs("div",{className:"tool-match-harness__features","data-testid":"features-panel",children:[a.jsxs("div",{className:"tool-match-harness__header",children:[a.jsx("h3",{children:"Features"}),a.jsxs("span",{className:"tool-match-harness__count",children:[i.size," selected"]})]}),a.jsx("div",{className:"tool-match-harness__feature-list",children:Array.from(ue.entries()).map(([e,h])=>a.jsxs("div",{className:"tool-match-harness__feature-group",children:[a.jsxs("div",{className:"tool-match-harness__group-header",children:[a.jsx("span",{className:"tool-match-harness__group-label",children:je(e)}),a.jsxs("div",{className:"tool-match-harness__group-actions",children:[a.jsx("button",{type:"button",onClick:()=>fe(e),className:"tool-match-harness__action-btn","data-testid":`select-all-${e.toLowerCase()}`,children:"All"}),a.jsx("button",{type:"button",onClick:()=>ge(e),className:"tool-match-harness__action-btn","data-testid":`clear-${e.toLowerCase()}`,children:"Clear"})]})]}),h.map(o=>a.jsxs("label",{className:"tool-match-harness__feature-item","data-testid":`feature-${o.id}`,children:[a.jsx("input",{type:"checkbox",checked:i.has(o.id),onChange:()=>ve(o.id),"data-testid":`checkbox-${o.id}`}),a.jsx("span",{className:"tool-match-harness__feature-name",children:o.name})]},o.id))]},e))})]}),a.jsxs("div",{className:"tool-match-harness__tools","data-testid":"tools-panel",children:[a.jsxs("div",{className:"tool-match-harness__header",children:[a.jsx("h3",{children:"Available Tools"}),a.jsxs("span",{className:"tool-match-harness__count",children:[ke," of ",xe," active"]})]}),a.jsx("div",{className:"tool-match-harness__toggle",children:a.jsxs("label",{"data-testid":"show-inactive-toggle",children:[a.jsx("input",{type:"checkbox",checked:m,onChange:e=>pe(e.target.checked),"data-testid":"show-inactive-checkbox"}),"Show inactive tools"]})}),a.jsx("div",{className:"tool-match-harness__tool-list","data-testid":"tool-list",children:j.length===0?a.jsx("div",{className:"tool-match-harness__empty","data-testid":"tools-empty-state",children:"No tools available for current selection"}):j.map(e=>a.jsxs("div",{className:`tool-match-harness__tool-item ${e.isActive?"tool-match-harness__tool-item--active":"tool-match-harness__tool-item--inactive"}`,"data-testid":`tool-${e.tool.id}`,"data-active":e.isActive,children:[a.jsxs("div",{className:"tool-match-harness__tool-header",children:[a.jsx("span",{className:"tool-match-harness__tool-name",children:e.tool.name}),e.isActive&&a.jsx("span",{className:"tool-match-harness__tool-badge","data-testid":`badge-${e.tool.id}`,children:"Active"})]}),e.tool.description&&a.jsx("div",{className:"tool-match-harness__tool-description",children:e.tool.description}),!e.isActive&&e.explanation&&a.jsx("div",{className:"tool-match-harness__tool-explanation","data-testid":`explanation-${e.tool.id}`,children:e.explanation})]},e.tool.id))})]})]})}he.__docgenInfo={description:`ToolMatchHarness displays a feature selection panel and tool matching results.

@example
\`\`\`tsx
<ToolMatchHarness
  features={sampleFeatures}
  tools={sampleTools}
/>
\`\`\``,methods:[],displayName:"ToolMatchHarness",props:{features:{required:!0,tsType:{name:"Array",elements:[{name:"SimpleFeature"}],raw:"SimpleFeature[]"},description:"Features to display in the selection panel"},tools:{required:!0,tsType:{name:"Array",elements:[{name:"Tool"}],raw:"Tool[]"},description:"Tools to match against the selection"},initialSelection:{required:!1,tsType:{name:"Array",elements:[{name:"string"}],raw:"string[]"},description:"Initial selected feature IDs",defaultValue:{value:"[]",computed:!1}},initialShowInactive:{required:!1,tsType:{name:"boolean"},description:"Whether to show inactive tools initially",defaultValue:{value:"false",computed:!1}},className:{required:!1,tsType:{name:"string"},description:"Additional CSS class"},style:{required:!1,tsType:{name:"CSSProperties"},description:"Additional inline styles"}}};const Ne=[{id:"range-calculation",name:"Range Calculation",description:"Calculate range and bearing between two tracks",version:"1.0.0",requirements:[{kind:"TRACK",min:2,max:2}]},{id:"bearing-to-point",name:"Bearing to Point",description:"Calculate bearing from a track to a reference point",version:"1.0.0",requirements:[{kind:"TRACK",min:1,max:1},{kind:"POINT",min:1,max:1}]},{id:"area-analysis",name:"Area Analysis",description:"Analyze area bounded by 3+ reference points",version:"1.0.0",requirements:[{kind:"POINT",min:3}]},{id:"track-summary",name:"Track Summary",description:"Generate summary statistics for selected tracks",version:"1.0.0",requirements:[{kind:"TRACK",min:1}]},{id:"global-statistics",name:"Global Statistics",description:"Show overall plot statistics (no selection required)",version:"1.0.0",requirements:[]}],Me={title:"ToolMatch/Harness",component:he,parameters:{layout:"padded",docs:{description:{component:"ToolMatchHarness is a visual verification harness for context-sensitive tool offering. It displays a feature selection panel (left) and tool list (right) that updates based on selection."}}},tags:["autodocs"],decorators:[t=>a.jsx(de,{children:a.jsx("div",{style:{maxWidth:900,margin:"0 auto"},children:a.jsx(t,{})})})],args:{features:me,tools:Ne}},f={parameters:{docs:{description:{story:"Initial state with no features selected. Only tools with no requirements are active."}}}},g={args:{initialSelection:["track-1","track-2"]},parameters:{docs:{description:{story:'With two tracks selected, "Range Calculation" and "Track Summary" become active.'}}}},k={args:{initialSelection:["track-1","ref-1"]},parameters:{docs:{description:{story:'With one track and one reference point selected, "Bearing to Point" becomes active.'}}}},x={args:{initialSelection:["track-1"],initialShowInactive:!0},parameters:{docs:{description:{story:"Shows all tools with explanations for why inactive tools are unavailable."}}}},y={args:{initialSelection:["track-1","track-2","track-3"]},parameters:{docs:{description:{story:'With all three tracks selected, "Track Summary" is active but "Range Calculation" is not (requires exactly 2).'}}}},S={args:{initialSelection:["track-1","track-2","ref-1","ref-2","narrative-1"],initialShowInactive:!0},parameters:{docs:{description:{story:"Complex selection showing various tool states with inactive toggle enabled."}}}},T={args:{initialSelection:["track-1","track-2"],initialShowInactive:!0},decorators:[t=>a.jsx(de,{theme:{variant:"dark"},children:a.jsx("div",{style:{maxWidth:900,margin:"0 auto",padding:20,background:"#1e1e1e"},children:a.jsx(t,{})})})],parameters:{backgrounds:{default:"dark"},docs:{description:{story:"ToolMatchHarness with dark theme."}}}};var C,I,R,q,$;f.parameters={...f.parameters,docs:{...(C=f.parameters)==null?void 0:C.docs,source:{originalSource:`{
  parameters: {
    docs: {
      description: {
        story: 'Initial state with no features selected. Only tools with no requirements are active.'
      }
    }
  }
}`,...(R=(I=f.parameters)==null?void 0:I.docs)==null?void 0:R.source},description:{story:`Default state with no selection.
Only "Global Statistics" tool is active (no requirements).`,...($=(q=f.parameters)==null?void 0:q.docs)==null?void 0:$.description}}};var M,P,W,F,K;g.parameters={...g.parameters,docs:{...(M=g.parameters)==null?void 0:M.docs,source:{originalSource:`{
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
}`,...(W=(P=g.parameters)==null?void 0:P.docs)==null?void 0:W.source},description:{story:"Two tracks selected - Range Calculation becomes active.",...(K=(F=g.parameters)==null?void 0:F.docs)==null?void 0:K.description}}};var O,H,D,E,L;k.parameters={...k.parameters,docs:{...(O=k.parameters)==null?void 0:O.docs,source:{originalSource:`{
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
}`,...(D=(H=k.parameters)==null?void 0:H.docs)==null?void 0:D.source},description:{story:"One track and one point selected - Bearing to Point active.",...(L=(E=k.parameters)==null?void 0:E.docs)==null?void 0:L.description}}};var B,V,z,G,U;x.parameters={...x.parameters,docs:{...(B=x.parameters)==null?void 0:B.docs,source:{originalSource:`{
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
}`,...(z=(V=x.parameters)==null?void 0:V.docs)==null?void 0:z.source},description:{story:"Show inactive tools toggle enabled.",...(U=(G=x.parameters)==null?void 0:G.docs)==null?void 0:U.description}}};var J,Q,X,Y,Z;y.parameters={...y.parameters,docs:{...(J=y.parameters)==null?void 0:J.docs,source:{originalSource:`{
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
}`,...(X=(Q=y.parameters)==null?void 0:Q.docs)==null?void 0:X.source},description:{story:"All tracks selected - Track Summary active.",...(Z=(Y=y.parameters)==null?void 0:Y.docs)==null?void 0:Z.description}}};var ee,te,ae,se,ne;S.parameters={...S.parameters,docs:{...(ee=S.parameters)==null?void 0:ee.docs,source:{originalSource:`{
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
}`,...(ae=(te=S.parameters)==null?void 0:te.docs)==null?void 0:ae.source},description:{story:"Many features selected - demonstrates complex matching.",...(ne=(se=S.parameters)==null?void 0:se.docs)==null?void 0:ne.description}}};var oe,re,ie,ce,le;T.parameters={...T.parameters,docs:{...(oe=T.parameters)==null?void 0:oe.docs,source:{originalSource:`{
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
}`,...(ie=(re=T.parameters)==null?void 0:re.docs)==null?void 0:ie.source},description:{story:"Dark theme variant.",...(le=(ce=T.parameters)==null?void 0:ce.docs)==null?void 0:le.description}}};const Pe=["Default","TwoTracksSelected","TrackAndPoint","ShowInactive","AllTracksSelected","ComplexSelection","DarkTheme"];export{y as AllTracksSelected,S as ComplexSelection,T as DarkTheme,f as Default,x as ShowInactive,k as TrackAndPoint,g as TwoTracksSelected,Pe as __namedExportsOrder,Me as default};
