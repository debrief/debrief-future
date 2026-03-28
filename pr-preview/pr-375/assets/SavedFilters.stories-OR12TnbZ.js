import{j as t}from"./jsx-runtime-DF2Pcvd1.js";import{r as n}from"./index-B2-qRKKC.js";import{I as M,F as A}from"./FilterBar-CIjfrd1d.js";import{T as D}from"./ThemeProvider-mvcGjblv.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./index-kS-9iBlu.js";import"./CascadingMenu-BgTnOB60.js";function o(e,s={}){return{id:e,title:`Exercise ${e}`,itemPath:`/catalog/${e}/item.json`,bbox:null,datetime:null,startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-01T12:00:00Z",vesselClasses:[],tags:[],featureTags:[],author:null,trackNames:[],nationalities:[],collection:null,modified:null,...s}}const l=[o("ex-001",{title:"CASEX Alpha",nationalities:["French"],tags:["convoy","blue-water"],vesselClasses:["surface/warship/frigate/type23"],author:"CDR Smith",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-01T04:00:00Z"}),o("ex-002",{title:"CASEX Bravo",nationalities:["British"],tags:["asw","shallow-water"],vesselClasses:["surface/warship/destroyer/type45"],author:"CDR Jones",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-02T12:00:00Z"}),o("ex-003",{title:"GROUPEX Charlie",nationalities:["French","British"],tags:["convoy","asw"],vesselClasses:["surface/warship/frigate/type23","surface/warship/destroyer/type45"],author:"CDR Smith",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-04T00:00:00Z"})],d=[{id:"surface",label:"Surface",children:[{id:"warship",label:"Warship",children:[{id:"frigate",label:"Frigate",children:[{id:"type23",label:"Type 23"},{id:"type26",label:"Type 26"}]},{id:"destroyer",label:"Destroyer",children:[{id:"type45",label:"Type 45"}]}]}]}],b={version:1,configurations:[{id:"saved-1",name:"French Exercises",filterBarState:{items:[{kind:"lozenge",id:"s1-l1",filterType:"nationality",value:"French"}]},cql2Json:{op:"eq",args:[{property:"nationality"},"French"]},createdAt:"2026-03-01T10:00:00.000Z",updatedAt:"2026-03-01T10:00:00.000Z"},{id:"saved-2",name:"ASW Convoy",filterBarState:{items:[{kind:"lozenge",id:"s2-l1",filterType:"tag",value:"asw"},{kind:"lozenge",id:"s2-l2",filterType:"tag",value:"convoy"}]},cql2Json:{op:"and",args:[]},createdAt:"2026-02-15T08:00:00.000Z",updatedAt:"2026-02-15T08:00:00.000Z"}]};function c({items:e,taxonomy:s,initialFilterState:T,initialSaved:F}){const[x]=n.useState(()=>new M(F)),[C,O]=n.useState(e.length),E=n.useCallback(w=>{O(w.length)},[]);return t.jsxs("div",{children:[t.jsx(A,{items:e,taxonomy:s,onFilteredItems:E,initialFilterState:T,savedFiltersStorage:x}),t.jsxs("div",{style:{padding:"8px 12px",fontSize:"12px",color:"var(--vscode-descriptionForeground, #666)"},children:["Showing ",C," of ",e.length," exercises"]})]})}const z={title:"FilterBar/Saved Filters",parameters:{layout:"padded",docs:{description:{component:"Save, restore, and delete named filter configurations. Saved filters persist via platform-native storage."}}},tags:["autodocs"],decorators:[e=>t.jsx(D,{children:t.jsx(e,{})})]},a={name:"Empty (No Saved Filters)",render:()=>t.jsx(c,{items:l,taxonomy:d})},r={name:"With Saved Filters",render:()=>t.jsx(c,{items:l,taxonomy:d,initialSaved:b})},i={name:"Save Flow",render:()=>t.jsx(c,{items:l,taxonomy:d,initialFilterState:{items:[{kind:"lozenge",id:"demo-1",filterType:"nationality",value:"French"},{kind:"lozenge",id:"demo-2",filterType:"tag",value:"convoy"}]}}),parameters:{docs:{description:{story:"Filter bar pre-populated with active filters. Click Save to name and persist the current configuration."}}}};var p,m,u;a.parameters={...a.parameters,docs:{...(p=a.parameters)==null?void 0:p.docs,source:{originalSource:`{
  name: 'Empty (No Saved Filters)',
  render: () => <SavedFiltersWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />
}`,...(u=(m=a.parameters)==null?void 0:m.docs)==null?void 0:u.source}}};var v,y,h;r.parameters={...r.parameters,docs:{...(v=r.parameters)==null?void 0:v.docs,source:{originalSource:`{
  name: 'With Saved Filters',
  render: () => <SavedFiltersWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialSaved={SAVED_COLLECTION} />
}`,...(h=(y=r.parameters)==null?void 0:y.docs)==null?void 0:h.source}}};var S,g,f;i.parameters={...i.parameters,docs:{...(S=i.parameters)==null?void 0:S.docs,source:{originalSource:`{
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
}`,...(f=(g=i.parameters)==null?void 0:g.docs)==null?void 0:f.source}}};const K=["Empty","WithSaved","SaveFlow"];export{a as Empty,i as SaveFlow,r as WithSaved,K as __namedExportsOrder,z as default};
