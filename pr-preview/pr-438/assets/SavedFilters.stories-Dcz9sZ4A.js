import{j as t}from"./jsx-runtime-DF2Pcvd1.js";import{r as n}from"./index-B2-qRKKC.js";import{I as D,F as E}from"./FilterBar-pVq1MK4g.js";import{T as _}from"./ThemeProvider-mvcGjblv.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./index-kS-9iBlu.js";import"./CascadingMenu-BgTnOB60.js";function o(e,s={}){return{id:e,title:`Exercise ${e}`,itemPath:`/catalog/${e}/item.json`,bbox:null,datetime:null,startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-01T12:00:00Z",platforms:[],tags:[],featureTags:[],author:null,collection:null,modified:null,...s}}const l=[o("ex-001",{title:"CASEX Alpha",platforms:[{id:"ARGYLL",name:"HMS Argyll",nationality:"FR",vessel_class:"surface/warship/frigate/type23",vessel_role:"frigate",domain:"surface"}],tags:["convoy","blue-water"],author:"CDR Smith",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-01T04:00:00Z"}),o("ex-002",{title:"CASEX Bravo",platforms:[{id:"DIAMOND",name:"HMS Diamond",nationality:"GB",vessel_class:"surface/warship/destroyer/type45",vessel_role:"destroyer",domain:"surface"}],tags:["asw","shallow-water"],author:"CDR Jones",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-02T12:00:00Z"}),o("ex-003",{title:"GROUPEX Charlie",platforms:[{id:"ARGYLL",name:"HMS Argyll",nationality:"FR",vessel_class:"surface/warship/frigate/type23",vessel_role:"frigate",domain:"surface"},{id:"DIAMOND",name:"HMS Diamond",nationality:"GB",vessel_class:"surface/warship/destroyer/type45",vessel_role:"destroyer",domain:"surface"}],tags:["convoy","asw"],author:"CDR Smith",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-04T00:00:00Z"})],d=[{id:"surface",label:"Surface",children:[{id:"warship",label:"Warship",children:[{id:"frigate",label:"Frigate",children:[{id:"type23",label:"Type 23"},{id:"type26",label:"Type 26"}]},{id:"destroyer",label:"Destroyer",children:[{id:"type45",label:"Type 45"}]}]}]}],w={version:1,configurations:[{id:"saved-1",name:"French Exercises",filterBarState:{items:[{kind:"lozenge",id:"s1-l1",filterType:"nationality",value:"French"}]},cql2Json:{op:"eq",args:[{property:"nationality"},"French"]},createdAt:"2026-03-01T10:00:00.000Z",updatedAt:"2026-03-01T10:00:00.000Z"},{id:"saved-2",name:"ASW Convoy",filterBarState:{items:[{kind:"lozenge",id:"s2-l1",filterType:"tag",value:"asw"},{kind:"lozenge",id:"s2-l2",filterType:"tag",value:"convoy"}]},cql2Json:{op:"and",args:[]},createdAt:"2026-02-15T08:00:00.000Z",updatedAt:"2026-02-15T08:00:00.000Z"}]};function m({items:e,taxonomy:s,initialFilterState:T,initialSaved:F}){const[x]=n.useState(()=>new D(F)),[C,O]=n.useState(e.length),M=n.useCallback(A=>{O(A.length)},[]);return t.jsxs("div",{children:[t.jsx(E,{items:e,taxonomy:s,onFilteredItems:M,initialFilterState:T,savedFiltersStorage:x}),t.jsxs("div",{style:{padding:"8px 12px",fontSize:"12px",color:"var(--vscode-descriptionForeground, #666)"},children:["Showing ",C," of ",e.length," exercises"]})]})}const R={title:"FilterBar/Saved Filters",parameters:{layout:"padded",docs:{description:{component:"Save, restore, and delete named filter configurations. Saved filters persist via platform-native storage."}}},tags:["autodocs"],decorators:[e=>t.jsx(_,{children:t.jsx(e,{})})]},a={name:"Empty (No Saved Filters)",render:()=>t.jsx(m,{items:l,taxonomy:d})},r={name:"With Saved Filters",render:()=>t.jsx(m,{items:l,taxonomy:d,initialSaved:w})},i={name:"Save Flow",render:()=>t.jsx(m,{items:l,taxonomy:d,initialFilterState:{items:[{kind:"lozenge",id:"demo-1",filterType:"nationality",value:"French"},{kind:"lozenge",id:"demo-2",filterType:"tag",value:"convoy"}]}}),parameters:{docs:{description:{story:"Filter bar pre-populated with active filters. Click Save to name and persist the current configuration."}}}};var c,p,u;a.parameters={...a.parameters,docs:{...(c=a.parameters)==null?void 0:c.docs,source:{originalSource:`{
  name: 'Empty (No Saved Filters)',
  render: () => <SavedFiltersWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />
}`,...(u=(p=a.parameters)==null?void 0:p.docs)==null?void 0:u.source}}};var v,y,S;r.parameters={...r.parameters,docs:{...(v=r.parameters)==null?void 0:v.docs,source:{originalSource:`{
  name: 'With Saved Filters',
  render: () => <SavedFiltersWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialSaved={SAVED_COLLECTION} />
}`,...(S=(y=r.parameters)==null?void 0:y.docs)==null?void 0:S.source}}};var f,g,h;i.parameters={...i.parameters,docs:{...(f=i.parameters)==null?void 0:f.docs,source:{originalSource:`{
  name: 'Save Flow',
  render: () => <SavedFiltersWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={{
    items: [{
      kind: 'lozenge',
      id: 'demo-1',
      filterType: 'nationality',
      value: 'French'
    }, {
      kind: 'lozenge',
      id: 'demo-2',
      filterType: 'tag',
      value: 'convoy'
    }]
  }} />,
  parameters: {
    docs: {
      description: {
        story: 'Filter bar pre-populated with active filters. Click Save to name and persist the current configuration.'
      }
    }
  }
}`,...(h=(g=i.parameters)==null?void 0:g.docs)==null?void 0:h.source}}};const z=["Empty","WithSaved","SaveFlow"];export{a as Empty,i as SaveFlow,r as WithSaved,z as __namedExportsOrder,R as default};
