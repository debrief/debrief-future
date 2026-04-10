import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r as f}from"./index-B2-qRKKC.js";import{F as C,I as ue}from"./FilterBar-lKE-eoHv.js";import{T as ye}from"./ThemeProvider-mvcGjblv.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./index-kS-9iBlu.js";import"./CascadingMenu-BgTnOB60.js";function i(a,x={}){return{id:a,title:`Exercise ${a}`,itemPath:`/catalog/${a}/item.json`,bbox:null,datetime:null,startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-01T12:00:00Z",vesselClasses:[],tags:[],featureTags:[],author:null,trackNames:[],nationalities:[],collection:null,modified:null,...x}}const t=[i("ex-001",{title:"CASEX Alpha",nationalities:["French"],tags:["convoy","blue-water"],vesselClasses:["surface/warship/frigate/type23"],author:"CDR Smith",trackNames:["HMS Argyll","Contact Bravo"],collection:"exercises-2024",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-01T04:00:00Z"}),i("ex-002",{title:"CASEX Bravo",nationalities:["British"],tags:["asw","shallow-water"],vesselClasses:["surface/warship/destroyer/type45"],author:"CDR Jones",trackNames:["HMS Diamond","Unknown Alpha"],collection:"exercises-2024",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-02T12:00:00Z"}),i("ex-003",{title:"GROUPEX Charlie",nationalities:["French","British"],tags:["convoy","asw"],vesselClasses:["surface/warship/frigate/type23","surface/warship/destroyer/type45"],author:"CDR Smith",featureTags:["high-priority","reviewed"],trackNames:["HMS Argyll","HMS Diamond","FS Aquitaine"],collection:"exercises-2024",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-04T00:00:00Z"}),i("ex-004",{title:"TACEX Delta",nationalities:["German"],tags:["surface-action"],vesselClasses:["surface/warship/frigate/type26"],author:"CDR Mueller",trackNames:["FGS Sachsen"],collection:"training-2025",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-15T00:00:00Z"}),i("ex-005",{title:"ASW Exercise Echo",nationalities:["French"],tags:["asw"],vesselClasses:["submarine/nuclear/ssn"],author:"CDR Dupont",trackNames:["FS Rubis"],collection:"training-2025",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-01T02:00:00Z"})],r=[{id:"surface",label:"Surface",children:[{id:"warship",label:"Warship",children:[{id:"frigate",label:"Frigate",children:[{id:"type23",label:"Type 23"},{id:"type26",label:"Type 26"}]},{id:"destroyer",label:"Destroyer",children:[{id:"type45",label:"Type 45"}]}]}]},{id:"submarine",label:"Submarine",children:[{id:"nuclear",label:"Nuclear",children:[{id:"ssn",label:"SSN"},{id:"ssbn",label:"SSBN"}]}]}];function s({items:a,taxonomy:x,initialFilterState:le}){const[ce,de]=f.useState(a.length),pe=f.useCallback(me=>{de(me.length)},[]);return e.jsxs("div",{children:[e.jsx(C,{items:a,taxonomy:x,onFilteredItems:pe,initialFilterState:le}),e.jsxs("div",{style:{padding:"8px 12px",fontSize:"12px",color:"var(--vscode-descriptionForeground, #666)"},children:["Showing ",ce," of ",a.length," exercises"]})]})}const ne={items:[{kind:"lozenge",id:"story-1",filterType:"nationality",value:"French"}]},he={items:[{kind:"lozenge",id:"story-1",filterType:"nationality",value:"French"},{kind:"lozenge",id:"story-2",filterType:"tag",value:"asw"}]},Te={items:[{kind:"or-container",id:"story-or-1",children:[{kind:"lozenge",id:"story-or-c1",filterType:"nationality",value:"French"},{kind:"lozenge",id:"story-or-c2",filterType:"nationality",value:"British"}]},{kind:"lozenge",id:"story-3",filterType:"tag",value:"convoy"}]},Se={items:[{kind:"lozenge",id:"story-t1",filterType:"vessel-class",value:"surface/warship/frigate/type23"},{kind:"lozenge",id:"story-t2",filterType:"tag",value:"asw"},{kind:"lozenge",id:"story-t3",filterType:"author",value:"CDR Smith"},{kind:"lozenge",id:"story-t4",filterType:"nationality",value:"French"},{kind:"lozenge",id:"story-t5",filterType:"duration",value:"<24H"},{kind:"lozenge",id:"story-t6",filterType:"title",value:"CASEX"}]},ge={items:[{kind:"lozenge",id:"story-z1",filterType:"nationality",value:"German"},{kind:"lozenge",id:"story-z2",filterType:"author",value:"CDR Smith"}]},_e={title:"FilterBar",component:C,parameters:{layout:"padded",docs:{description:{component:"Persistent filter bar with lozenge UI, AND/OR logic, and drag-to-group support. All 10 SRD filter types with type-specific input methods."}}},tags:["autodocs"],decorators:[a=>e.jsx(ye,{children:e.jsx(a,{})})]},o={render:()=>e.jsx(s,{items:t,taxonomy:r})},n={name:"Single Filter",render:()=>e.jsx(s,{items:t,taxonomy:r,initialFilterState:ne}),parameters:{docs:{description:{story:"Click (+) and select a filter type, then choose a value. A lozenge appears and results narrow."}}}},l={name:"Multiple AND Filters",render:()=>e.jsx(s,{items:t,taxonomy:r,initialFilterState:he}),parameters:{docs:{description:{story:"Add multiple filters — they combine with AND logic. Only exercises matching ALL filters appear."}}}},c={name:"OR Group",render:()=>e.jsx(s,{items:t,taxonomy:r,initialFilterState:Te}),parameters:{docs:{description:{story:'Click (+) → "OR group" to create an OR container. Add filters inside or drag existing lozenges into it.'}}}},d={name:"Interactive",render:()=>e.jsx(s,{items:t,taxonomy:r}),parameters:{docs:{description:{story:"Full interactive demo: add, edit, remove, drag to OR group. Try building complex queries like (French OR British) AND convoy."}}}},p={name:"All Filter Types",render:()=>e.jsx(s,{items:t,taxonomy:r,initialFilterState:Se}),parameters:{docs:{description:{story:"Try all 10 filter types: Vessel Class (hierarchical), Plot Tag/Feature Tag/Author/Track Name/Nationality/Collection (dropdowns), Duration (buckets), Title/Plot Contents (free-text)."}}}},m={name:"Zero Results",render:()=>e.jsx(s,{items:t,taxonomy:r,initialFilterState:ge}),parameters:{docs:{description:{story:'Add incompatible filters (e.g., Nationality: German + Author: CDR Smith) to see the "0 of 5" state.'}}}},xe={items:[{kind:"lozenge",id:"vc-1",filterType:"vessel-class",value:"surface/warship/frigate/type23"}]},Ce={items:[{kind:"lozenge",id:"vc-branch",filterType:"vessel-class",value:"surface/warship"}]},u={name:"Vessel Taxonomy Navigation",render:()=>e.jsx(s,{items:t,taxonomy:r,initialFilterState:xe}),parameters:{docs:{description:{story:'Vessel class lozenge displays human-readable label "Type 23" (not raw path). Click the lozenge to re-edit — the current selection is marked with ✓ in the dropdown.'}}}},y={name:"Vessel Taxonomy Search",render:()=>e.jsx(s,{items:t,taxonomy:r}),parameters:{docs:{description:{story:'Click (+) → Vessel Class to open the dropdown. A search input appears above the tree. Type to filter — e.g., "type 23" shows only matching nodes with ancestor paths preserved.'}}}},h={name:"Vessel Taxonomy Counts",render:()=>e.jsx(s,{items:t,taxonomy:r}),parameters:{docs:{description:{story:'Click (+) → Vessel Class. Each node shows a count badge (e.g., "Surface (4)"). Nodes with zero matches are dimmed and disabled. Counts update as other filters narrow the data set.'}}}},T={name:"Vessel Taxonomy Branch Selection",render:()=>e.jsx(s,{items:t,taxonomy:r,initialFilterState:Ce}),parameters:{docs:{description:{story:'Branch node "Warship" selected — lozenge shows "Vessel Class: Warship". Filtering matches all warship subtypes (frigates, destroyers). Click the lozenge to see "Warship" marked as current.'}}}},S={name:"Quick Search",render:()=>e.jsx(s,{items:t,taxonomy:r}),parameters:{docs:{description:{story:'Type in the Quick Search box to filter exercises by title in real-time. Press Enter to "graduate" the search into a title lozenge. Press Escape to clear. Keyboard shortcuts: "/" or Ctrl+F to focus.'}}}},g={name:"With Saved Filters",render:()=>{const a=new ue({version:1,configurations:[{id:"demo-saved-1",name:"French Exercises",filterBarState:ne,cql2Json:{},createdAt:"2026-03-01T10:00:00.000Z",updatedAt:"2026-03-01T10:00:00.000Z"}]});return e.jsx("div",{children:e.jsx(C,{items:t,taxonomy:r,onFilteredItems:()=>{},savedFiltersStorage:a})})},parameters:{docs:{description:{story:"FilterBar with saved filters integration. Use Save to persist and Historic Filters to restore."}}}};var F,A,E;o.parameters={...o.parameters,docs:{...(F=o.parameters)==null?void 0:F.docs,source:{originalSource:`{
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />
}`,...(E=(A=o.parameters)==null?void 0:A.docs)==null?void 0:E.source}}};var O,v,M;n.parameters={...n.parameters,docs:{...(O=n.parameters)==null?void 0:O.docs,source:{originalSource:`{
  name: 'Single Filter',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={SINGLE_FILTER_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Click (+) and select a filter type, then choose a value. A lozenge appears and results narrow.'
      }
    }
  }
}`,...(M=(v=n.parameters)==null?void 0:v.docs)==null?void 0:M.source}}};var _,k,w;l.parameters={...l.parameters,docs:{...(_=l.parameters)==null?void 0:_.docs,source:{originalSource:`{
  name: 'Multiple AND Filters',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={MULTIPLE_AND_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Add multiple filters — they combine with AND logic. Only exercises matching ALL filters appear.'
      }
    }
  }
}`,...(w=(k=l.parameters)==null?void 0:k.docs)==null?void 0:w.source}}};var N,b,D;c.parameters={...c.parameters,docs:{...(N=c.parameters)==null?void 0:N.docs,source:{originalSource:`{
  name: 'OR Group',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={OR_GROUP_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Click (+) → "OR group" to create an OR container. Add filters inside or drag existing lozenges into it.'
      }
    }
  }
}`,...(D=(b=c.parameters)==null?void 0:b.docs)==null?void 0:D.source}}};var R,z,B;d.parameters={...d.parameters,docs:{...(R=d.parameters)==null?void 0:R.docs,source:{originalSource:`{
  name: 'Interactive',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />,
  parameters: {
    docs: {
      description: {
        story: 'Full interactive demo: add, edit, remove, drag to OR group. Try building complex queries like (French OR British) AND convoy.'
      }
    }
  }
}`,...(B=(z=d.parameters)==null?void 0:z.docs)==null?void 0:B.source}}};var I,K,L;p.parameters={...p.parameters,docs:{...(I=p.parameters)==null?void 0:I.docs,source:{originalSource:`{
  name: 'All Filter Types',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={ALL_TYPES_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Try all 10 filter types: Vessel Class (hierarchical), Plot Tag/Feature Tag/Author/Track Name/Nationality/Collection (dropdowns), Duration (buckets), Title/Plot Contents (free-text).'
      }
    }
  }
}`,...(L=(K=p.parameters)==null?void 0:K.docs)==null?void 0:L.source}}};var V,W,j;m.parameters={...m.parameters,docs:{...(V=m.parameters)==null?void 0:V.docs,source:{originalSource:`{
  name: 'Zero Results',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={ZERO_RESULTS_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Add incompatible filters (e.g., Nationality: German + Author: CDR Smith) to see the "0 of 5" state.'
      }
    }
  }
}`,...(j=(W=m.parameters)==null?void 0:W.docs)==null?void 0:j.source}}};var Z,X,P;u.parameters={...u.parameters,docs:{...(Z=u.parameters)==null?void 0:Z.docs,source:{originalSource:`{
  name: 'Vessel Taxonomy Navigation',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={VESSEL_CLASS_SELECTED_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Vessel class lozenge displays human-readable label "Type 23" (not raw path). Click the lozenge to re-edit — the current selection is marked with ✓ in the dropdown.'
      }
    }
  }
}`,...(P=(X=u.parameters)==null?void 0:X.docs)==null?void 0:P.source}}};var Y,G,U;y.parameters={...y.parameters,docs:{...(Y=y.parameters)==null?void 0:Y.docs,source:{originalSource:`{
  name: 'Vessel Taxonomy Search',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />,
  parameters: {
    docs: {
      description: {
        story: 'Click (+) → Vessel Class to open the dropdown. A search input appears above the tree. Type to filter — e.g., "type 23" shows only matching nodes with ancestor paths preserved.'
      }
    }
  }
}`,...(U=(G=y.parameters)==null?void 0:G.docs)==null?void 0:U.source}}};var H,Q,q;h.parameters={...h.parameters,docs:{...(H=h.parameters)==null?void 0:H.docs,source:{originalSource:`{
  name: 'Vessel Taxonomy Counts',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />,
  parameters: {
    docs: {
      description: {
        story: 'Click (+) → Vessel Class. Each node shows a count badge (e.g., "Surface (4)"). Nodes with zero matches are dimmed and disabled. Counts update as other filters narrow the data set.'
      }
    }
  }
}`,...(q=(Q=h.parameters)==null?void 0:Q.docs)==null?void 0:q.source}}};var J,$,ee;T.parameters={...T.parameters,docs:{...(J=T.parameters)==null?void 0:J.docs,source:{originalSource:`{
  name: 'Vessel Taxonomy Branch Selection',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={BRANCH_SELECTED_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Branch node "Warship" selected — lozenge shows "Vessel Class: Warship". Filtering matches all warship subtypes (frigates, destroyers). Click the lozenge to see "Warship" marked as current.'
      }
    }
  }
}`,...(ee=($=T.parameters)==null?void 0:$.docs)==null?void 0:ee.source}}};var te,re,se;S.parameters={...S.parameters,docs:{...(te=S.parameters)==null?void 0:te.docs,source:{originalSource:`{
  name: 'Quick Search',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />,
  parameters: {
    docs: {
      description: {
        story: 'Type in the Quick Search box to filter exercises by title in real-time. ' + 'Press Enter to "graduate" the search into a title lozenge. ' + 'Press Escape to clear. Keyboard shortcuts: "/" or Ctrl+F to focus.'
      }
    }
  }
}`,...(se=(re=S.parameters)==null?void 0:re.docs)==null?void 0:se.source}}};var ae,ie,oe;g.parameters={...g.parameters,docs:{...(ae=g.parameters)==null?void 0:ae.docs,source:{originalSource:`{
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
}`,...(oe=(ie=g.parameters)==null?void 0:ie.docs)==null?void 0:oe.source}}};const ke=["Empty","SingleFilter","MultipleAND","OrGroup","Interactive","AllFilterTypes","ZeroResults","VesselTaxonomyNavigation","VesselTaxonomySearch","VesselTaxonomyCounts","VesselTaxonomyBranchSelection","QuickSearchDemo","WithSavedFilters"];export{p as AllFilterTypes,o as Empty,d as Interactive,l as MultipleAND,c as OrGroup,S as QuickSearchDemo,n as SingleFilter,T as VesselTaxonomyBranchSelection,h as VesselTaxonomyCounts,u as VesselTaxonomyNavigation,y as VesselTaxonomySearch,g as WithSavedFilters,m as ZeroResults,ke as __namedExportsOrder,_e as default};
