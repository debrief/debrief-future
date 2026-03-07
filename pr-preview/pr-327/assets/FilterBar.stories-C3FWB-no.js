import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r as g}from"./index-B2-qRKKC.js";import{F as T,I as Y}from"./FilterBar-C1uUdLtD.js";import{T as H}from"./ThemeProvider-mvcGjblv.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./index-kS-9iBlu.js";import"./CascadingMenu-CbnovLcn.js";function s(t,y={}){return{id:t,title:`Exercise ${t}`,itemPath:`/catalog/${t}/item.json`,bbox:null,datetime:null,startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-01T12:00:00Z",vesselClasses:[],tags:[],featureTags:[],author:null,trackNames:[],nationalities:[],collection:null,modified:null,...y}}const r=[s("ex-001",{title:"CASEX Alpha",nationalities:["French"],tags:["convoy","blue-water"],vesselClasses:["surface/warship/frigate/type23"],author:"CDR Smith",trackNames:["HMS Argyll","Contact Bravo"],collection:"exercises-2024",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-01T04:00:00Z"}),s("ex-002",{title:"CASEX Bravo",nationalities:["British"],tags:["asw","shallow-water"],vesselClasses:["surface/warship/destroyer/type45"],author:"CDR Jones",trackNames:["HMS Diamond","Unknown Alpha"],collection:"exercises-2024",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-02T12:00:00Z"}),s("ex-003",{title:"GROUPEX Charlie",nationalities:["French","British"],tags:["convoy","asw"],vesselClasses:["surface/warship/frigate/type23","surface/warship/destroyer/type45"],author:"CDR Smith",featureTags:["high-priority","reviewed"],trackNames:["HMS Argyll","HMS Diamond","FS Aquitaine"],collection:"exercises-2024",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-04T00:00:00Z"}),s("ex-004",{title:"TACEX Delta",nationalities:["German"],tags:["surface-action"],vesselClasses:["surface/warship/frigate/type26"],author:"CDR Mueller",trackNames:["FGS Sachsen"],collection:"training-2025",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-15T00:00:00Z"}),s("ex-005",{title:"ASW Exercise Echo",nationalities:["French"],tags:["asw"],vesselClasses:["submarine/nuclear/ssn"],author:"CDR Dupont",trackNames:["FS Rubis"],collection:"training-2025",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-01T02:00:00Z"})],a=[{id:"surface",label:"Surface",children:[{id:"warship",label:"Warship",children:[{id:"frigate",label:"Frigate",children:[{id:"type23",label:"Type 23"},{id:"type26",label:"Type 26"}]},{id:"destroyer",label:"Destroyer",children:[{id:"type45",label:"Type 45"}]}]}]},{id:"submarine",label:"Submarine",children:[{id:"nuclear",label:"Nuclear",children:[{id:"ssn",label:"SSN"},{id:"ssbn",label:"SSBN"}]}]}];function i({items:t,taxonomy:y,initialFilterState:G}){const[P,W]=g.useState(t.length),X=g.useCallback(U=>{W(U.length)},[]);return e.jsxs("div",{children:[e.jsx(T,{items:t,taxonomy:y,onFilteredItems:X,initialFilterState:G}),e.jsxs("div",{style:{padding:"8px 12px",fontSize:"12px",color:"var(--vscode-descriptionForeground, #666)"},children:["Showing ",P," of ",t.length," exercises"]})]})}const j={items:[{kind:"lozenge",id:"story-1",filterType:"nationality",value:"French"}]},q={items:[{kind:"lozenge",id:"story-1",filterType:"nationality",value:"French"},{kind:"lozenge",id:"story-2",filterType:"tag",value:"asw"}]},J={items:[{kind:"or-container",id:"story-or-1",children:[{kind:"lozenge",id:"story-or-c1",filterType:"nationality",value:"French"},{kind:"lozenge",id:"story-or-c2",filterType:"nationality",value:"British"}]},{kind:"lozenge",id:"story-3",filterType:"tag",value:"convoy"}]},V={items:[{kind:"lozenge",id:"story-t1",filterType:"vessel-class",value:"surface/warship/frigate/type23"},{kind:"lozenge",id:"story-t2",filterType:"tag",value:"asw"},{kind:"lozenge",id:"story-t3",filterType:"author",value:"CDR Smith"},{kind:"lozenge",id:"story-t4",filterType:"nationality",value:"French"},{kind:"lozenge",id:"story-t5",filterType:"duration",value:"<24H"},{kind:"lozenge",id:"story-t6",filterType:"title",value:"CASEX"}]},$={items:[{kind:"lozenge",id:"story-z1",filterType:"nationality",value:"German"},{kind:"lozenge",id:"story-z2",filterType:"author",value:"CDR Smith"}]},ne={title:"FilterBar",component:T,parameters:{layout:"padded",docs:{description:{component:"Persistent filter bar with lozenge UI, AND/OR logic, and drag-to-group support. All 10 SRD filter types with type-specific input methods."}}},tags:["autodocs"],decorators:[t=>e.jsx(H,{children:e.jsx(t,{})})]},n={render:()=>e.jsx(i,{items:r,taxonomy:a})},o={name:"Single Filter",render:()=>e.jsx(i,{items:r,taxonomy:a,initialFilterState:j}),parameters:{docs:{description:{story:"Click (+) and select a filter type, then choose a value. A lozenge appears and results narrow."}}}},l={name:"Multiple AND Filters",render:()=>e.jsx(i,{items:r,taxonomy:a,initialFilterState:q}),parameters:{docs:{description:{story:"Add multiple filters — they combine with AND logic. Only exercises matching ALL filters appear."}}}},c={name:"OR Group",render:()=>e.jsx(i,{items:r,taxonomy:a,initialFilterState:J}),parameters:{docs:{description:{story:'Click (+) → "OR group" to create an OR container. Add filters inside or drag existing lozenges into it.'}}}},d={name:"Interactive",render:()=>e.jsx(i,{items:r,taxonomy:a}),parameters:{docs:{description:{story:"Full interactive demo: add, edit, remove, drag to OR group. Try building complex queries like (French OR British) AND convoy."}}}},p={name:"All Filter Types",render:()=>e.jsx(i,{items:r,taxonomy:a,initialFilterState:V}),parameters:{docs:{description:{story:"Try all 10 filter types: Vessel Class (hierarchical), Plot Tag/Feature Tag/Author/Track Name/Nationality/Collection (dropdowns), Duration (buckets), Title/Plot Contents (free-text)."}}}},m={name:"Zero Results",render:()=>e.jsx(i,{items:r,taxonomy:a,initialFilterState:$}),parameters:{docs:{description:{story:'Add incompatible filters (e.g., Nationality: German + Author: CDR Smith) to see the "0 of 5" state.'}}}},u={name:"With Saved Filters",render:()=>{const t=new Y({version:1,configurations:[{id:"demo-saved-1",name:"French Exercises",filterBarState:j,cql2Json:{},createdAt:"2026-03-01T10:00:00.000Z",updatedAt:"2026-03-01T10:00:00.000Z"}]});return e.jsx("div",{children:e.jsx(T,{items:r,taxonomy:a,onFilteredItems:()=>{},savedFiltersStorage:t})})},parameters:{docs:{description:{story:"FilterBar with saved filters integration. Use Save to persist and Historic Filters to restore."}}}};var h,S,F;n.parameters={...n.parameters,docs:{...(h=n.parameters)==null?void 0:h.docs,source:{originalSource:`{
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />
}`,...(F=(S=n.parameters)==null?void 0:S.docs)==null?void 0:F.source}}};var f,A,v;o.parameters={...o.parameters,docs:{...(f=o.parameters)==null?void 0:f.docs,source:{originalSource:`{
  name: 'Single Filter',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={SINGLE_FILTER_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Click (+) and select a filter type, then choose a value. A lozenge appears and results narrow.'
      }
    }
  }
}`,...(v=(A=o.parameters)==null?void 0:A.docs)==null?void 0:v.source}}};var x,O,C;l.parameters={...l.parameters,docs:{...(x=l.parameters)==null?void 0:x.docs,source:{originalSource:`{
  name: 'Multiple AND Filters',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={MULTIPLE_AND_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Add multiple filters — they combine with AND logic. Only exercises matching ALL filters appear.'
      }
    }
  }
}`,...(C=(O=l.parameters)==null?void 0:O.docs)==null?void 0:C.source}}};var E,M,_;c.parameters={...c.parameters,docs:{...(E=c.parameters)==null?void 0:E.docs,source:{originalSource:`{
  name: 'OR Group',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={OR_GROUP_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Click (+) → "OR group" to create an OR container. Add filters inside or drag existing lozenges into it.'
      }
    }
  }
}`,...(_=(M=c.parameters)==null?void 0:M.docs)==null?void 0:_.source}}};var D,R,N;d.parameters={...d.parameters,docs:{...(D=d.parameters)==null?void 0:D.docs,source:{originalSource:`{
  name: 'Interactive',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />,
  parameters: {
    docs: {
      description: {
        story: 'Full interactive demo: add, edit, remove, drag to OR group. Try building complex queries like (French OR British) AND convoy.'
      }
    }
  }
}`,...(N=(R=d.parameters)==null?void 0:R.docs)==null?void 0:N.source}}};var k,w,b;p.parameters={...p.parameters,docs:{...(k=p.parameters)==null?void 0:k.docs,source:{originalSource:`{
  name: 'All Filter Types',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={ALL_TYPES_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Try all 10 filter types: Vessel Class (hierarchical), Plot Tag/Feature Tag/Author/Track Name/Nationality/Collection (dropdowns), Duration (buckets), Title/Plot Contents (free-text).'
      }
    }
  }
}`,...(b=(w=p.parameters)==null?void 0:w.docs)==null?void 0:b.source}}};var I,B,z;m.parameters={...m.parameters,docs:{...(I=m.parameters)==null?void 0:I.docs,source:{originalSource:`{
  name: 'Zero Results',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={ZERO_RESULTS_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Add incompatible filters (e.g., Nationality: German + Author: CDR Smith) to see the "0 of 5" state.'
      }
    }
  }
}`,...(z=(B=m.parameters)==null?void 0:B.docs)==null?void 0:z.source}}};var Z,L,K;u.parameters={...u.parameters,docs:{...(Z=u.parameters)==null?void 0:Z.docs,source:{originalSource:`{
  name: 'With Saved Filters',
  render: () => {
    const storage = new InMemoryStorage({
      version: 1,
      configurations: [{
        id: 'demo-saved-1',
        name: 'French Exercises',
        filterBarState: SINGLE_FILTER_STATE,
        cql2Json: {},
        createdAt: '2026-03-01T10:00:00.000Z',
        updatedAt: '2026-03-01T10:00:00.000Z'
      }]
    });
    return <div>
        <FilterBar items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} onFilteredItems={() => {}} savedFiltersStorage={storage} />
      </div>;
  },
  parameters: {
    docs: {
      description: {
        story: 'FilterBar with saved filters integration. Use Save to persist and Historic Filters to restore.'
      }
    }
  }
}`,...(K=(L=u.parameters)==null?void 0:L.docs)==null?void 0:K.source}}};const oe=["Empty","SingleFilter","MultipleAND","OrGroup","Interactive","AllFilterTypes","ZeroResults","WithSavedFilters"];export{p as AllFilterTypes,n as Empty,d as Interactive,l as MultipleAND,c as OrGroup,o as SingleFilter,u as WithSavedFilters,m as ZeroResults,oe as __namedExportsOrder,ne as default};
