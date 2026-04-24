import{j as t}from"./jsx-runtime-DF2Pcvd1.js";import{r as p}from"./index-B2-qRKKC.js";import{I as w,F as k}from"./FilterBar-BqSomdWF.js";import{T as I}from"./ThemeProvider-CpMh1h6x.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./index-kS-9iBlu.js";import"./CascadingMenu-BgTnOB60.js";import"./defaultTheme-lXwsM3al.js";function m(e,d={}){return{id:e,title:`Exercise ${e}`,itemPath:`/catalog/${e}/item.json`,bbox:null,datetime:null,startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-01T12:00:00Z",platforms:[],tags:[],featureTags:[],author:null,collection:null,modified:null,...d}}const n=[m("ex-001",{title:"CASEX Alpha",platforms:[{id:"ARGYLL",name:"HMS Argyll",nationality:"FR",vessel_class:"surface/warship/frigate/type23",vessel_role:"frigate",domain:"surface"}],tags:["convoy","blue-water"],author:"CDR Smith",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-01T04:00:00Z"}),m("ex-002",{title:"CASEX Bravo",platforms:[{id:"DIAMOND",name:"HMS Diamond",nationality:"GB",vessel_class:"surface/warship/destroyer/type45",vessel_role:"destroyer",domain:"surface"}],tags:["asw","shallow-water"],author:"CDR Jones",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-02T12:00:00Z"}),m("ex-003",{title:"GROUPEX Charlie",platforms:[{id:"ARGYLL",name:"HMS Argyll",nationality:"FR",vessel_class:"surface/warship/frigate/type23",vessel_role:"frigate",domain:"surface"},{id:"DIAMOND",name:"HMS Diamond",nationality:"GB",vessel_class:"surface/warship/destroyer/type45",vessel_role:"destroyer",domain:"surface"}],tags:["convoy","asw"],author:"CDR Smith",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-04T00:00:00Z"})],o=[{id:"surface",label:"Surface",children:[{id:"warship",label:"Warship",children:[{id:"frigate",label:"Frigate",children:[{id:"type23",label:"Type 23"},{id:"type26",label:"Type 26"}]},{id:"destroyer",label:"Destroyer",children:[{id:"type45",label:"Type 45"}]}]}]}],N={version:1,configurations:[{id:"saved-1",name:"French Exercises",filterBarState:{items:[{kind:"lozenge",shape:"simple",id:"s1-l1",filterType:"nationality",value:"French"}]},cql2Json:{op:"eq",args:[{property:"nationality"},"French"]},createdAt:"2026-03-01T10:00:00.000Z",updatedAt:"2026-03-01T10:00:00.000Z"},{id:"saved-2",name:"ASW Convoy",filterBarState:{items:[{kind:"lozenge",shape:"simple",id:"s2-l1",filterType:"tag",value:"asw"},{kind:"lozenge",shape:"simple",id:"s2-l2",filterType:"tag",value:"convoy"}]},cql2Json:{op:"and",args:[]},createdAt:"2026-02-15T08:00:00.000Z",updatedAt:"2026-02-15T08:00:00.000Z"}]};function l({items:e,taxonomy:d,initialFilterState:O,initialSaved:M}){const[_]=p.useState(()=>new w(M)),[b,A]=p.useState(e.length),E=p.useCallback(D=>{A(D.length)},[]);return t.jsxs("div",{children:[t.jsx(k,{items:e,taxonomy:d,onFilteredItems:E,initialFilterState:O,savedFiltersStorage:_}),t.jsxs("div",{style:{padding:"8px 12px",fontSize:"12px",color:"var(--vscode-descriptionForeground, #666)"},children:["Showing ",b," of ",e.length," exercises"]})]})}const X={title:"FilterBar/Saved Filters",parameters:{layout:"padded",docs:{description:{component:"Save, restore, and delete named filter configurations. Saved filters persist via platform-native storage."}}},tags:["autodocs"],decorators:[e=>t.jsx(I,{children:t.jsx(e,{})})]},a={name:"Empty (No Saved Filters)",render:()=>t.jsx(l,{items:n,taxonomy:o})},r={name:"With Saved Filters",render:()=>t.jsx(l,{items:n,taxonomy:o,initialSaved:N})},i={name:"Save Flow",render:()=>t.jsx(l,{items:n,taxonomy:o,initialFilterState:{items:[{kind:"lozenge",shape:"simple",id:"demo-1",filterType:"nationality",value:"French"},{kind:"lozenge",shape:"simple",id:"demo-2",filterType:"tag",value:"convoy"}]}}),parameters:{docs:{description:{story:"Filter bar pre-populated with active filters. Click Save to name and persist the current configuration."}}}},s={name:"Platform chip round-trip",render:()=>t.jsx(l,{items:n,taxonomy:o,initialFilterState:{items:[{kind:"lozenge",shape:"platform",id:"plat-saved-1",filterType:"platform",attributes:{nationality:"GB",vessel_role:"frigate"}},{kind:"lozenge",shape:"simple",id:"saved-tag-1",filterType:"tag",value:"convoy"}]}}),parameters:{docs:{description:{story:"Save a filter containing a platform chip, clear the bar, then restore — the chip and its attributes should be identical. The CQL2 JSON emitted before save and after restore is equal (#186, U32/U35)."}}}};var c,u,f;a.parameters={...a.parameters,docs:{...(c=a.parameters)==null?void 0:c.docs,source:{originalSource:`{
  name: 'Empty (No Saved Filters)',
  render: () => <SavedFiltersWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />
}`,...(f=(u=a.parameters)==null?void 0:u.docs)==null?void 0:f.source}}};var h,v,y;r.parameters={...r.parameters,docs:{...(h=r.parameters)==null?void 0:h.docs,source:{originalSource:`{
  name: 'With Saved Filters',
  render: () => <SavedFiltersWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialSaved={SAVED_COLLECTION} />
}`,...(y=(v=r.parameters)==null?void 0:v.docs)==null?void 0:y.source}}};var S,g,T;i.parameters={...i.parameters,docs:{...(S=i.parameters)==null?void 0:S.docs,source:{originalSource:`{
  name: 'Save Flow',
  render: () => <SavedFiltersWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={{
    items: [{
      kind: 'lozenge',
      shape: 'simple',
      id: 'demo-1',
      filterType: 'nationality',
      value: 'French'
    }, {
      kind: 'lozenge',
      shape: 'simple',
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
}`,...(T=(g=i.parameters)==null?void 0:g.docs)==null?void 0:T.source}}};var F,x,C;s.parameters={...s.parameters,docs:{...(F=s.parameters)==null?void 0:F.docs,source:{originalSource:`{
  name: 'Platform chip round-trip',
  render: () => <SavedFiltersWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={{
    items: [{
      kind: 'lozenge',
      shape: 'platform',
      id: 'plat-saved-1',
      filterType: 'platform',
      attributes: {
        nationality: 'GB',
        vessel_role: 'frigate'
      }
    }, {
      kind: 'lozenge',
      shape: 'simple',
      id: 'saved-tag-1',
      filterType: 'tag',
      value: 'convoy'
    }]
  }} />,
  parameters: {
    docs: {
      description: {
        story: 'Save a filter containing a platform chip, clear the bar, then restore — the chip ' + 'and its attributes should be identical. The CQL2 JSON emitted before save and after ' + 'restore is equal (#186, U32/U35).'
      }
    }
  }
}`,...(C=(x=s.parameters)==null?void 0:x.docs)==null?void 0:C.source}}};const G=["Empty","WithSaved","SaveFlow","PlatformChipRoundTrip"];export{a as Empty,s as PlatformChipRoundTrip,i as SaveFlow,r as WithSaved,G as __namedExportsOrder,X as default};
