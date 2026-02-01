import{j as t}from"./jsx-runtime-DF2Pcvd1.js";import{r as o}from"./index-B2-qRKKC.js";import{F as a,D as i}from"./FilterDropdown-EGOz7Ihi.js";import{T as O}from"./ThemeProvider-KrJW1DiK.js";import"./_commonjsHelpers-Cpj98o6Y.js";const s=["CONTACT","POINT","TRACK","ZONE"],W={title:"Components/LayersToolbar/FilterDropdown",component:a,parameters:{layout:"padded",docs:{description:{component:"FilterDropdown provides text search, scope selection, feature type checkboxes (built from feature kinds), visibility filters, temporal range, and apply-to-selection actions."}}},tags:["autodocs"],decorators:[e=>t.jsx(O,{children:t.jsx("div",{style:{maxWidth:300},children:t.jsx(e,{})})})]};function b(){const[e,r]=o.useState(i);return t.jsxs("div",{children:[t.jsx(a,{featureKinds:s,filterState:e,onFilterChange:r,onApplyToSelection:n=>console.log("Apply to selection:",n)}),t.jsx("pre",{style:{marginTop:16,fontSize:11,color:"#666"},children:JSON.stringify(e,null,2)})]})}const l={render:()=>t.jsx(b,{}),parameters:{docs:{description:{story:"Interactive filter dropdown showing all sections. State displayed below."}}}},c={render:()=>{const[e,r]=o.useState({...i,textQuery:"HMS"});return t.jsx(a,{featureKinds:s,filterState:e,onFilterChange:r,onApplyToSelection:n=>console.log("Apply:",n)})}},p={render:()=>{const[e,r]=o.useState({...i,featureTypes:{TRACK:!0,CONTACT:!1,ZONE:!1,POINT:!0}});return t.jsx(a,{featureKinds:s,filterState:e,onFilterChange:r})}},d={render:()=>{const[e,r]=o.useState({...i,temporal:{after:"2024-06-15T08:00",before:"2024-06-15T20:00"}});return t.jsx(a,{featureKinds:s,filterState:e,onFilterChange:r})}},S={render:()=>{const[e,r]=o.useState({textQuery:"Victory",searchScope:{name:!0,type:!1,platform:!0,attachments:!1},featureTypes:{TRACK:!0,CONTACT:!1,ZONE:!1,POINT:!1},visibility:"visible-only",temporal:{after:"2024-06-15T08:00",before:"2024-06-15T20:00"}});return t.jsx(a,{featureKinds:s,filterState:e,onFilterChange:r,onApplyToSelection:n=>console.log("Apply:",n)})}},u={render:()=>{const[e,r]=o.useState(i);return t.jsx(O,{theme:{variant:"dark"},children:t.jsx(a,{featureKinds:s,filterState:e,onFilterChange:r,onApplyToSelection:n=>console.log("Apply:",n)})})},parameters:{backgrounds:{default:"dark"}}};var f,T,m;l.parameters={...l.parameters,docs:{...(f=l.parameters)==null?void 0:f.docs,source:{originalSource:`{
  render: () => <InteractiveFilter />,
  parameters: {
    docs: {
      description: {
        story: 'Interactive filter dropdown showing all sections. State displayed below.'
      }
    }
  }
}`,...(m=(T=l.parameters)==null?void 0:T.docs)==null?void 0:m.source}}};var F,A,y;c.parameters={...c.parameters,docs:{...(F=c.parameters)==null?void 0:F.docs,source:{originalSource:`{
  render: () => {
    const [filterState, setFilterState] = useState<FilterState>({
      ...DEFAULT_FILTER_STATE,
      textQuery: 'HMS'
    });
    return <FilterDropdown featureKinds={SAMPLE_KINDS} filterState={filterState} onFilterChange={setFilterState} onApplyToSelection={action => console.log('Apply:', action)} />;
  }
}`,...(y=(A=c.parameters)==null?void 0:A.docs)==null?void 0:y.source}}};var h,g,E;p.parameters={...p.parameters,docs:{...(h=p.parameters)==null?void 0:h.docs,source:{originalSource:`{
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
}`,...(E=(g=p.parameters)==null?void 0:g.docs)==null?void 0:E.source}}};var x,C,D;d.parameters={...d.parameters,docs:{...(x=d.parameters)==null?void 0:x.docs,source:{originalSource:`{
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
}`,...(D=(C=d.parameters)==null?void 0:C.docs)==null?void 0:D.source}}};var K,N,v;S.parameters={...S.parameters,docs:{...(K=S.parameters)==null?void 0:K.docs,source:{originalSource:`{
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
}`,...(v=(N=S.parameters)==null?void 0:N.docs)==null?void 0:v.source}}};var I,_,L;u.parameters={...u.parameters,docs:{...(I=u.parameters)==null?void 0:I.docs,source:{originalSource:`{
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
}`,...(L=(_=u.parameters)==null?void 0:_.docs)==null?void 0:L.source}}};const M=["Default","WithActiveTextFilter","WithTypeFilters","WithTemporalFilters","WithAllFiltersActive","DarkTheme"];export{u as DarkTheme,l as Default,c as WithActiveTextFilter,S as WithAllFiltersActive,d as WithTemporalFilters,p as WithTypeFilters,M as __namedExportsOrder,W as default};
