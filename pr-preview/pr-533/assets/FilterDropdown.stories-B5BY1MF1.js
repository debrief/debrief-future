import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r as a}from"./index-B2-qRKKC.js";import{F as n,D as i}from"./FilterDropdown-D8R_GT18.js";import{T as c}from"./ThemeProvider-CpMh1h6x.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./textfield-Dm39NdvL.js";import"./defaultTheme-lXwsM3al.js";const s=["CONTACT","POINT","TRACK","ZONE"],G={title:"Components/LayersToolbar/FilterDropdown",component:n,parameters:{layout:"padded",docs:{description:{component:"FilterDropdown provides text search, scope selection, feature type checkboxes (built from feature kinds), visibility filters, temporal range, and apply-to-selection actions."}}},tags:["autodocs"],decorators:[t=>e.jsx(c,{children:e.jsx("div",{style:{maxWidth:300},children:e.jsx(t,{})})})]};function V(){const[t,r]=a.useState(i);return e.jsxs("div",{children:[e.jsx(n,{featureKinds:s,filterState:t,onFilterChange:r,onApplyToSelection:o=>console.log("Apply to selection:",o)}),e.jsx("pre",{style:{marginTop:16,fontSize:11,color:"#666"},children:JSON.stringify(t,null,2)})]})}const p={render:()=>e.jsx(V,{}),parameters:{docs:{description:{story:"Interactive filter dropdown showing all sections. State displayed below."}}}},d={render:()=>{const[t,r]=a.useState({...i,textQuery:"HMS"});return e.jsx(n,{featureKinds:s,filterState:t,onFilterChange:r,onApplyToSelection:o=>console.log("Apply:",o)})}},S={render:()=>{const[t,r]=a.useState({...i,featureTypes:{TRACK:!0,CONTACT:!1,ZONE:!1,POINT:!0}});return e.jsx(n,{featureKinds:s,filterState:t,onFilterChange:r})}},u={render:()=>{const[t,r]=a.useState({...i,temporal:{after:"2024-06-15T08:00",before:"2024-06-15T20:00"}});return e.jsx(n,{featureKinds:s,filterState:t,onFilterChange:r})}},f={render:()=>{const[t,r]=a.useState({textQuery:"Victory",searchScope:{name:!0,type:!1,platform:!0,attachments:!1},featureTypes:{TRACK:!0,CONTACT:!1,ZONE:!1,POINT:!1},visibility:"visible-only",temporal:{after:"2024-06-15T08:00",before:"2024-06-15T20:00"}});return e.jsx(n,{featureKinds:s,filterState:t,onFilterChange:r,onApplyToSelection:o=>console.log("Apply:",o)})}},m={render:()=>{const[t,r]=a.useState(i);return e.jsx(c,{theme:{variant:"dark"},children:e.jsx(n,{featureKinds:s,filterState:t,onFilterChange:r,onApplyToSelection:o=>console.log("Apply:",o)})})},parameters:{backgrounds:{default:"dark"}}};function U(){const[t,r]=a.useState(i),[o,W]=a.useState(i),[M,R]=a.useState(i);return e.jsxs("div",{style:{display:"flex",gap:24,flexWrap:"wrap"},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,fontWeight:600,marginBottom:4},children:"Light"}),e.jsx(c,{theme:{variant:"light"},children:e.jsx(n,{featureKinds:s,filterState:t,onFilterChange:r,onApplyToSelection:l=>console.log("Apply:",l)})})]}),e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,fontWeight:600,marginBottom:4},children:"Dark"}),e.jsx(c,{theme:{variant:"dark"},children:e.jsx(n,{featureKinds:s,filterState:o,onFilterChange:W,onApplyToSelection:l=>console.log("Apply:",l)})})]}),e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,fontWeight:600,marginBottom:4},children:"VS Code"}),e.jsx(c,{theme:{variant:"vscode"},children:e.jsx(n,{featureKinds:s,filterState:M,onFilterChange:R,onApplyToSelection:l=>console.log("Apply:",l)})})]})]})}const T={render:()=>e.jsx(U,{}),parameters:{docs:{description:{story:"Shows FilterDropdown in Light, Dark, and VS Code themes side-by-side for visual comparison."}}}};var h,F,y;p.parameters={...p.parameters,docs:{...(h=p.parameters)==null?void 0:h.docs,source:{originalSource:`{
  render: () => <InteractiveFilter />,
  parameters: {
    docs: {
      description: {
        story: 'Interactive filter dropdown showing all sections. State displayed below.'
      }
    }
  }
}`,...(y=(F=p.parameters)==null?void 0:F.docs)==null?void 0:y.source}}};var g,A,x;d.parameters={...d.parameters,docs:{...(g=d.parameters)==null?void 0:g.docs,source:{originalSource:`{
  render: () => {
    const [filterState, setFilterState] = useState<FilterState>({
      ...DEFAULT_FILTER_STATE,
      textQuery: 'HMS'
    });
    return <FilterDropdown featureKinds={SAMPLE_KINDS} filterState={filterState} onFilterChange={setFilterState} onApplyToSelection={action => console.log('Apply:', action)} />;
  }
}`,...(x=(A=d.parameters)==null?void 0:A.docs)==null?void 0:x.source}}};var C,v,D;S.parameters={...S.parameters,docs:{...(C=S.parameters)==null?void 0:C.docs,source:{originalSource:`{
  render: () => {
    const [filterState, setFilterState] = useState<FilterState>({
      ...DEFAULT_FILTER_STATE,
      featureTypes: {
        TRACK: true,
        CONTACT: false,
        ZONE: false,
        POINT: true
      }
    });
    return <FilterDropdown featureKinds={SAMPLE_KINDS} filterState={filterState} onFilterChange={setFilterState} />;
  }
}`,...(D=(v=S.parameters)==null?void 0:v.docs)==null?void 0:D.source}}};var j,E,K;u.parameters={...u.parameters,docs:{...(j=u.parameters)==null?void 0:j.docs,source:{originalSource:`{
  render: () => {
    const [filterState, setFilterState] = useState<FilterState>({
      ...DEFAULT_FILTER_STATE,
      temporal: {
        after: '2024-06-15T08:00',
        before: '2024-06-15T20:00'
      }
    });
    return <FilterDropdown featureKinds={SAMPLE_KINDS} filterState={filterState} onFilterChange={setFilterState} />;
  }
}`,...(K=(E=u.parameters)==null?void 0:E.docs)==null?void 0:K.source}}};var N,L,I;f.parameters={...f.parameters,docs:{...(N=f.parameters)==null?void 0:N.docs,source:{originalSource:`{
  render: () => {
    const [filterState, setFilterState] = useState<FilterState>({
      textQuery: 'Victory',
      searchScope: {
        name: true,
        type: false,
        platform: true,
        attachments: false
      },
      featureTypes: {
        TRACK: true,
        CONTACT: false,
        ZONE: false,
        POINT: false
      },
      visibility: 'visible-only',
      temporal: {
        after: '2024-06-15T08:00',
        before: '2024-06-15T20:00'
      }
    });
    return <FilterDropdown featureKinds={SAMPLE_KINDS} filterState={filterState} onFilterChange={setFilterState} onApplyToSelection={action => console.log('Apply:', action)} />;
  }
}`,...(I=(L=f.parameters)==null?void 0:L.docs)==null?void 0:I.source}}};var w,b,_;m.parameters={...m.parameters,docs:{...(w=m.parameters)==null?void 0:w.docs,source:{originalSource:`{
  render: () => {
    const [filterState, setFilterState] = useState<FilterState>(DEFAULT_FILTER_STATE);
    return <ThemeProvider theme={{
      variant: 'dark'
    }}>
        <FilterDropdown featureKinds={SAMPLE_KINDS} filterState={filterState} onFilterChange={setFilterState} onApplyToSelection={action => console.log('Apply:', action)} />
      </ThemeProvider>;
  },
  parameters: {
    backgrounds: {
      default: 'dark'
    }
  }
}`,...(_=(b=m.parameters)==null?void 0:b.docs)==null?void 0:_.source}}};var O,k,P;T.parameters={...T.parameters,docs:{...(O=T.parameters)==null?void 0:O.docs,source:{originalSource:`{
  render: () => <MultiContextFilter />,
  parameters: {
    docs: {
      description: {
        story: 'Shows FilterDropdown in Light, Dark, and VS Code themes side-by-side for visual comparison.'
      }
    }
  }
}`,...(P=(k=T.parameters)==null?void 0:k.docs)==null?void 0:P.source}}};const X=["Default","WithActiveTextFilter","WithTypeFilters","WithTemporalFilters","WithAllFiltersActive","DarkTheme","MultiContext"];export{m as DarkTheme,p as Default,T as MultiContext,d as WithActiveTextFilter,f as WithAllFiltersActive,u as WithTemporalFilters,S as WithTypeFilters,X as __namedExportsOrder,G as default};
