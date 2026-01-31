import{j as t}from"./jsx-runtime-DF2Pcvd1.js";import{r as o}from"./index-B2-qRKKC.js";import{F as a,D as s}from"./FilterDropdown-DPuFK2uQ.js";import{T as _}from"./ThemeProvider-KrJW1DiK.js";import"./_commonjsHelpers-Cpj98o6Y.js";const Q={title:"Components/LayersToolbar/FilterDropdown",component:a,parameters:{layout:"padded",docs:{description:{component:"FilterDropdown provides text search, scope selection, feature type checkboxes, visibility filters, temporal range, and apply-to-selection actions."}}},tags:["autodocs"],decorators:[e=>t.jsx(_,{children:t.jsx("div",{style:{maxWidth:300},children:t.jsx(e,{})})})]};function L(){const[e,r]=o.useState(s);return t.jsxs("div",{children:[t.jsx(a,{filterState:e,onFilterChange:r,onApplyToSelection:n=>console.log("Apply to selection:",n)}),t.jsx("pre",{style:{marginTop:16,fontSize:11,color:"#666"},children:JSON.stringify(e,null,2)})]})}const i={render:()=>t.jsx(L,{}),parameters:{docs:{description:{story:"Interactive filter dropdown showing all sections. State displayed below."}}}},l={render:()=>{const[e,r]=o.useState({...s,textQuery:"HMS"});return t.jsx(a,{filterState:e,onFilterChange:r,onApplyToSelection:n=>console.log("Apply:",n)})}},c={render:()=>{const[e,r]=o.useState({...s,featureTypes:{tracks:!0,contacts:!1,zones:!1,annotations:!0}});return t.jsx(a,{filterState:e,onFilterChange:r})}},p={render:()=>{const[e,r]=o.useState({...s,temporal:{after:"2024-06-15T08:00",before:"2024-06-15T20:00"}});return t.jsx(a,{filterState:e,onFilterChange:r})}},d={render:()=>{const[e,r]=o.useState({textQuery:"Victory",searchScope:{name:!0,type:!1,platform:!0,attachments:!1},featureTypes:{tracks:!0,contacts:!1,zones:!1,annotations:!1},visibility:"visible-only",temporal:{after:"2024-06-15T08:00",before:"2024-06-15T20:00"}});return t.jsx(a,{filterState:e,onFilterChange:r,onApplyToSelection:n=>console.log("Apply:",n)})}},S={render:()=>{const[e,r]=o.useState(s);return t.jsx(_,{theme:{variant:"dark"},children:t.jsx(a,{filterState:e,onFilterChange:r,onApplyToSelection:n=>console.log("Apply:",n)})})},parameters:{backgrounds:{default:"dark"}}};var u,m,f;i.parameters={...i.parameters,docs:{...(u=i.parameters)==null?void 0:u.docs,source:{originalSource:`{
  render: () => <InteractiveFilter />,
  parameters: {
    docs: {
      description: {
        story: 'Interactive filter dropdown showing all sections. State displayed below.'
      }
    }
  }
}`,...(f=(m=i.parameters)==null?void 0:m.docs)==null?void 0:f.source}}};var F,T,y;l.parameters={...l.parameters,docs:{...(F=l.parameters)==null?void 0:F.docs,source:{originalSource:`{
  render: () => {
    const [filterState, setFilterState] = useState<FilterState>({
      ...DEFAULT_FILTER_STATE,
      textQuery: 'HMS'
    });
    return <FilterDropdown filterState={filterState} onFilterChange={setFilterState} onApplyToSelection={action => console.log('Apply:', action)} />;
  }
}`,...(y=(T=l.parameters)==null?void 0:T.docs)==null?void 0:y.source}}};var h,g,A;c.parameters={...c.parameters,docs:{...(h=c.parameters)==null?void 0:h.docs,source:{originalSource:`{
  render: () => {
    const [filterState, setFilterState] = useState<FilterState>({
      ...DEFAULT_FILTER_STATE,
      featureTypes: {
        tracks: true,
        contacts: false,
        zones: false,
        annotations: true
      }
    });
    return <FilterDropdown filterState={filterState} onFilterChange={setFilterState} />;
  }
}`,...(A=(g=c.parameters)==null?void 0:g.docs)==null?void 0:A.source}}};var x,v,D;p.parameters={...p.parameters,docs:{...(x=p.parameters)==null?void 0:x.docs,source:{originalSource:`{
  render: () => {
    const [filterState, setFilterState] = useState<FilterState>({
      ...DEFAULT_FILTER_STATE,
      temporal: {
        after: '2024-06-15T08:00',
        before: '2024-06-15T20:00'
      }
    });
    return <FilterDropdown filterState={filterState} onFilterChange={setFilterState} />;
  }
}`,...(D=(v=p.parameters)==null?void 0:v.docs)==null?void 0:D.source}}};var E,b,j;d.parameters={...d.parameters,docs:{...(E=d.parameters)==null?void 0:E.docs,source:{originalSource:`{
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
        tracks: true,
        contacts: false,
        zones: false,
        annotations: false
      },
      visibility: 'visible-only',
      temporal: {
        after: '2024-06-15T08:00',
        before: '2024-06-15T20:00'
      }
    });
    return <FilterDropdown filterState={filterState} onFilterChange={setFilterState} onApplyToSelection={action => console.log('Apply:', action)} />;
  }
}`,...(j=(b=d.parameters)==null?void 0:b.docs)==null?void 0:j.source}}};var w,k,C;S.parameters={...S.parameters,docs:{...(w=S.parameters)==null?void 0:w.docs,source:{originalSource:`{
  render: () => {
    const [filterState, setFilterState] = useState<FilterState>(DEFAULT_FILTER_STATE);
    return <ThemeProvider theme={{
      variant: 'dark'
    }}>
        <FilterDropdown filterState={filterState} onFilterChange={setFilterState} onApplyToSelection={action => console.log('Apply:', action)} />
      </ThemeProvider>;
  },
  parameters: {
    backgrounds: {
      default: 'dark'
    }
  }
}`,...(C=(k=S.parameters)==null?void 0:k.docs)==null?void 0:C.source}}};const P=["Default","WithActiveTextFilter","WithTypeFilters","WithTemporalFilters","WithAllFiltersActive","DarkTheme"];export{S as DarkTheme,i as Default,l as WithActiveTextFilter,d as WithAllFiltersActive,p as WithTemporalFilters,c as WithTypeFilters,P as __namedExportsOrder,Q as default};
