import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r as C}from"./index-B2-qRKKC.js";import{F as x,I as ce}from"./FilterBar-qM_g35yq.js";import{T as de}from"./ThemeProvider-mvcGjblv.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./index-kS-9iBlu.js";import"./CascadingMenu-BgTnOB60.js";function i(s,g={}){return{id:s,title:`Exercise ${s}`,itemPath:`/catalog/${s}/item.json`,bbox:null,datetime:null,startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-01T12:00:00Z",vesselClasses:[],tags:[],featureTags:[],author:null,trackNames:[],nationalities:[],collection:null,modified:null,...g}}const t=[i("ex-001",{title:"CASEX Alpha",nationalities:["French"],tags:["convoy","blue-water"],vesselClasses:["surface/warship/frigate/type23"],author:"CDR Smith",trackNames:["HMS Argyll","Contact Bravo"],collection:"exercises-2024",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-01T04:00:00Z"}),i("ex-002",{title:"CASEX Bravo",nationalities:["British"],tags:["asw","shallow-water"],vesselClasses:["surface/warship/destroyer/type45"],author:"CDR Jones",trackNames:["HMS Diamond","Unknown Alpha"],collection:"exercises-2024",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-02T12:00:00Z"}),i("ex-003",{title:"GROUPEX Charlie",nationalities:["French","British"],tags:["convoy","asw"],vesselClasses:["surface/warship/frigate/type23","surface/warship/destroyer/type45"],author:"CDR Smith",featureTags:["high-priority","reviewed"],trackNames:["HMS Argyll","HMS Diamond","FS Aquitaine"],collection:"exercises-2024",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-04T00:00:00Z"}),i("ex-004",{title:"TACEX Delta",nationalities:["German"],tags:["surface-action"],vesselClasses:["surface/warship/frigate/type26"],author:"CDR Mueller",trackNames:["FGS Sachsen"],collection:"training-2025",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-15T00:00:00Z"}),i("ex-005",{title:"ASW Exercise Echo",nationalities:["French"],tags:["asw"],vesselClasses:["submarine/nuclear/ssn"],author:"CDR Dupont",trackNames:["FS Rubis"],collection:"training-2025",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-01T02:00:00Z"})],r=[{id:"surface",label:"Surface",children:[{id:"warship",label:"Warship",children:[{id:"frigate",label:"Frigate",children:[{id:"type23",label:"Type 23"},{id:"type26",label:"Type 26"}]},{id:"destroyer",label:"Destroyer",children:[{id:"type45",label:"Type 45"}]}]}]},{id:"submarine",label:"Submarine",children:[{id:"nuclear",label:"Nuclear",children:[{id:"ssn",label:"SSN"},{id:"ssbn",label:"SSBN"}]}]}];function a({items:s,taxonomy:g,initialFilterState:ae}){const[ie,oe]=C.useState(s.length),ne=C.useCallback(le=>{oe(le.length)},[]);return e.jsxs("div",{children:[e.jsx(x,{items:s,taxonomy:g,onFilteredItems:ne,initialFilterState:ae}),e.jsxs("div",{style:{padding:"8px 12px",fontSize:"12px",color:"var(--vscode-descriptionForeground, #666)"},children:["Showing ",ie," of ",s.length," exercises"]})]})}const se={items:[{kind:"lozenge",id:"story-1",filterType:"nationality",value:"French"}]},pe={items:[{kind:"lozenge",id:"story-1",filterType:"nationality",value:"French"},{kind:"lozenge",id:"story-2",filterType:"tag",value:"asw"}]},me={items:[{kind:"or-container",id:"story-or-1",children:[{kind:"lozenge",id:"story-or-c1",filterType:"nationality",value:"French"},{kind:"lozenge",id:"story-or-c2",filterType:"nationality",value:"British"}]},{kind:"lozenge",id:"story-3",filterType:"tag",value:"convoy"}]},ue={items:[{kind:"lozenge",id:"story-t1",filterType:"vessel-class",value:"surface/warship/frigate/type23"},{kind:"lozenge",id:"story-t2",filterType:"tag",value:"asw"},{kind:"lozenge",id:"story-t3",filterType:"author",value:"CDR Smith"},{kind:"lozenge",id:"story-t4",filterType:"nationality",value:"French"},{kind:"lozenge",id:"story-t5",filterType:"duration",value:"<24H"},{kind:"lozenge",id:"story-t6",filterType:"title",value:"CASEX"}]},ye={items:[{kind:"lozenge",id:"story-z1",filterType:"nationality",value:"German"},{kind:"lozenge",id:"story-z2",filterType:"author",value:"CDR Smith"}]},ve={title:"FilterBar",component:x,parameters:{layout:"padded",docs:{description:{component:"Persistent filter bar with lozenge UI, AND/OR logic, and drag-to-group support. All 10 SRD filter types with type-specific input methods."}}},tags:["autodocs"],decorators:[s=>e.jsx(de,{children:e.jsx(s,{})})]},o={render:()=>e.jsx(a,{items:t,taxonomy:r})},n={name:"Single Filter",render:()=>e.jsx(a,{items:t,taxonomy:r,initialFilterState:se}),parameters:{docs:{description:{story:"Click (+) and select a filter type, then choose a value. A lozenge appears and results narrow."}}}},l={name:"Multiple AND Filters",render:()=>e.jsx(a,{items:t,taxonomy:r,initialFilterState:pe}),parameters:{docs:{description:{story:"Add multiple filters — they combine with AND logic. Only exercises matching ALL filters appear."}}}},c={name:"OR Group",render:()=>e.jsx(a,{items:t,taxonomy:r,initialFilterState:me}),parameters:{docs:{description:{story:'Click (+) → "OR group" to create an OR container. Add filters inside or drag existing lozenges into it.'}}}},d={name:"Interactive",render:()=>e.jsx(a,{items:t,taxonomy:r}),parameters:{docs:{description:{story:"Full interactive demo: add, edit, remove, drag to OR group. Try building complex queries like (French OR British) AND convoy."}}}},p={name:"All Filter Types",render:()=>e.jsx(a,{items:t,taxonomy:r,initialFilterState:ue}),parameters:{docs:{description:{story:"Try all 10 filter types: Vessel Class (hierarchical), Plot Tag/Feature Tag/Author/Track Name/Nationality/Collection (dropdowns), Duration (buckets), Title/Plot Contents (free-text)."}}}},m={name:"Zero Results",render:()=>e.jsx(a,{items:t,taxonomy:r,initialFilterState:ye}),parameters:{docs:{description:{story:'Add incompatible filters (e.g., Nationality: German + Author: CDR Smith) to see the "0 of 5" state.'}}}},he={items:[{kind:"lozenge",id:"vc-1",filterType:"vessel-class",value:"surface/warship/frigate/type23"}]},Te={items:[{kind:"lozenge",id:"vc-branch",filterType:"vessel-class",value:"surface/warship"}]},u={name:"Vessel Taxonomy Navigation",render:()=>e.jsx(a,{items:t,taxonomy:r,initialFilterState:he}),parameters:{docs:{description:{story:'Vessel class lozenge displays human-readable label "Type 23" (not raw path). Click the lozenge to re-edit — the current selection is marked with ✓ in the dropdown.'}}}},y={name:"Vessel Taxonomy Search",render:()=>e.jsx(a,{items:t,taxonomy:r}),parameters:{docs:{description:{story:'Click (+) → Vessel Class to open the dropdown. A search input appears above the tree. Type to filter — e.g., "type 23" shows only matching nodes with ancestor paths preserved.'}}}},h={name:"Vessel Taxonomy Counts",render:()=>e.jsx(a,{items:t,taxonomy:r}),parameters:{docs:{description:{story:'Click (+) → Vessel Class. Each node shows a count badge (e.g., "Surface (4)"). Nodes with zero matches are dimmed and disabled. Counts update as other filters narrow the data set.'}}}},T={name:"Vessel Taxonomy Branch Selection",render:()=>e.jsx(a,{items:t,taxonomy:r,initialFilterState:Te}),parameters:{docs:{description:{story:'Branch node "Warship" selected — lozenge shows "Vessel Class: Warship". Filtering matches all warship subtypes (frigates, destroyers). Click the lozenge to see "Warship" marked as current.'}}}},S={name:"With Saved Filters",render:()=>{const s=new ce({version:1,configurations:[{id:"demo-saved-1",name:"French Exercises",filterBarState:se,cql2Json:{},createdAt:"2026-03-01T10:00:00.000Z",updatedAt:"2026-03-01T10:00:00.000Z"}]});return e.jsx("div",{children:e.jsx(x,{items:t,taxonomy:r,onFilteredItems:()=>{},savedFiltersStorage:s})})},parameters:{docs:{description:{story:"FilterBar with saved filters integration. Use Save to persist and Historic Filters to restore."}}}};var A,F,f;o.parameters={...o.parameters,docs:{...(A=o.parameters)==null?void 0:A.docs,source:{originalSource:`{
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />
}`,...(f=(F=o.parameters)==null?void 0:F.docs)==null?void 0:f.source}}};var v,E,O;n.parameters={...n.parameters,docs:{...(v=n.parameters)==null?void 0:v.docs,source:{originalSource:`{
  name: 'Single Filter',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={SINGLE_FILTER_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Click (+) and select a filter type, then choose a value. A lozenge appears and results narrow.'
      }
    }
  }
}`,...(O=(E=n.parameters)==null?void 0:E.docs)==null?void 0:O.source}}};var M,_,w;l.parameters={...l.parameters,docs:{...(M=l.parameters)==null?void 0:M.docs,source:{originalSource:`{
  name: 'Multiple AND Filters',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={MULTIPLE_AND_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Add multiple filters — they combine with AND logic. Only exercises matching ALL filters appear.'
      }
    }
  }
}`,...(w=(_=l.parameters)==null?void 0:_.docs)==null?void 0:w.source}}};var N,k,D;c.parameters={...c.parameters,docs:{...(N=c.parameters)==null?void 0:N.docs,source:{originalSource:`{
  name: 'OR Group',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={OR_GROUP_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Click (+) → "OR group" to create an OR container. Add filters inside or drag existing lozenges into it.'
      }
    }
  }
}`,...(D=(k=c.parameters)==null?void 0:k.docs)==null?void 0:D.source}}};var b,R,B;d.parameters={...d.parameters,docs:{...(b=d.parameters)==null?void 0:b.docs,source:{originalSource:`{
  name: 'Interactive',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />,
  parameters: {
    docs: {
      description: {
        story: 'Full interactive demo: add, edit, remove, drag to OR group. Try building complex queries like (French OR British) AND convoy.'
      }
    }
  }
}`,...(B=(R=d.parameters)==null?void 0:R.docs)==null?void 0:B.source}}};var z,I,L;p.parameters={...p.parameters,docs:{...(z=p.parameters)==null?void 0:z.docs,source:{originalSource:`{
  name: 'All Filter Types',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={ALL_TYPES_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Try all 10 filter types: Vessel Class (hierarchical), Plot Tag/Feature Tag/Author/Track Name/Nationality/Collection (dropdowns), Duration (buckets), Title/Plot Contents (free-text).'
      }
    }
  }
}`,...(L=(I=p.parameters)==null?void 0:I.docs)==null?void 0:L.source}}};var V,K,W;m.parameters={...m.parameters,docs:{...(V=m.parameters)==null?void 0:V.docs,source:{originalSource:`{
  name: 'Zero Results',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={ZERO_RESULTS_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Add incompatible filters (e.g., Nationality: German + Author: CDR Smith) to see the "0 of 5" state.'
      }
    }
  }
}`,...(W=(K=m.parameters)==null?void 0:K.docs)==null?void 0:W.source}}};var Z,j,X;u.parameters={...u.parameters,docs:{...(Z=u.parameters)==null?void 0:Z.docs,source:{originalSource:`{
  name: 'Vessel Taxonomy Navigation',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={VESSEL_CLASS_SELECTED_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Vessel class lozenge displays human-readable label "Type 23" (not raw path). Click the lozenge to re-edit — the current selection is marked with ✓ in the dropdown.'
      }
    }
  }
}`,...(X=(j=u.parameters)==null?void 0:j.docs)==null?void 0:X.source}}};var G,Y,P;y.parameters={...y.parameters,docs:{...(G=y.parameters)==null?void 0:G.docs,source:{originalSource:`{
  name: 'Vessel Taxonomy Search',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />,
  parameters: {
    docs: {
      description: {
        story: 'Click (+) → Vessel Class to open the dropdown. A search input appears above the tree. Type to filter — e.g., "type 23" shows only matching nodes with ancestor paths preserved.'
      }
    }
  }
}`,...(P=(Y=y.parameters)==null?void 0:Y.docs)==null?void 0:P.source}}};var U,H,q;h.parameters={...h.parameters,docs:{...(U=h.parameters)==null?void 0:U.docs,source:{originalSource:`{
  name: 'Vessel Taxonomy Counts',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />,
  parameters: {
    docs: {
      description: {
        story: 'Click (+) → Vessel Class. Each node shows a count badge (e.g., "Surface (4)"). Nodes with zero matches are dimmed and disabled. Counts update as other filters narrow the data set.'
      }
    }
  }
}`,...(q=(H=h.parameters)==null?void 0:H.docs)==null?void 0:q.source}}};var J,$,Q;T.parameters={...T.parameters,docs:{...(J=T.parameters)==null?void 0:J.docs,source:{originalSource:`{
  name: 'Vessel Taxonomy Branch Selection',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={BRANCH_SELECTED_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Branch node "Warship" selected — lozenge shows "Vessel Class: Warship". Filtering matches all warship subtypes (frigates, destroyers). Click the lozenge to see "Warship" marked as current.'
      }
    }
  }
}`,...(Q=($=T.parameters)==null?void 0:$.docs)==null?void 0:Q.source}}};var ee,te,re;S.parameters={...S.parameters,docs:{...(ee=S.parameters)==null?void 0:ee.docs,source:{originalSource:`{
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
}`,...(re=(te=S.parameters)==null?void 0:te.docs)==null?void 0:re.source}}};const Ee=["Empty","SingleFilter","MultipleAND","OrGroup","Interactive","AllFilterTypes","ZeroResults","VesselTaxonomyNavigation","VesselTaxonomySearch","VesselTaxonomyCounts","VesselTaxonomyBranchSelection","WithSavedFilters"];export{p as AllFilterTypes,o as Empty,d as Interactive,l as MultipleAND,c as OrGroup,n as SingleFilter,T as VesselTaxonomyBranchSelection,h as VesselTaxonomyCounts,u as VesselTaxonomyNavigation,y as VesselTaxonomySearch,S as WithSavedFilters,m as ZeroResults,Ee as __namedExportsOrder,ve as default};
