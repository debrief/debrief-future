import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r as _}from"./index-B2-qRKKC.js";import{F as x,I as Fe}from"./FilterBar-BqSomdWF.js";import{T as ve}from"./ThemeProvider-47c8oKUw.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./index-kS-9iBlu.js";import"./CascadingMenu-BgTnOB60.js";import"./defaultTheme-lXwsM3al.js";function i(s,O={}){return{id:s,title:`Exercise ${s}`,itemPath:`/catalog/${s}/item.json`,bbox:null,datetime:null,startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-01T12:00:00Z",platforms:[],tags:[],featureTags:[],author:null,collection:null,modified:null,...O}}const t=[i("ex-001",{title:"CASEX Alpha",platforms:[{id:"ARGYLL",name:"HMS Argyll",nationality:"FR",vessel_class:"surface/warship/frigate/type23",vessel_role:"frigate",domain:"surface"},{id:"CONTACT-BRAVO",name:"Contact Bravo",domain:"unknown"}],tags:["convoy","blue-water"],author:"CDR Smith",collection:"exercises-2024",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-01T04:00:00Z"}),i("ex-002",{title:"CASEX Bravo",platforms:[{id:"DIAMOND",name:"HMS Diamond",nationality:"GB",vessel_class:"surface/warship/destroyer/type45",vessel_role:"destroyer",domain:"surface"},{id:"UNKNOWN-ALPHA",name:"Unknown Alpha",domain:"unknown"}],tags:["asw","shallow-water"],author:"CDR Jones",collection:"exercises-2024",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-02T12:00:00Z"}),i("ex-003",{title:"GROUPEX Charlie",platforms:[{id:"ARGYLL",name:"HMS Argyll",nationality:"GB",vessel_class:"surface/warship/frigate/type23",vessel_role:"frigate",domain:"surface"},{id:"DIAMOND",name:"HMS Diamond",nationality:"GB",vessel_class:"surface/warship/destroyer/type45",vessel_role:"destroyer",domain:"surface"},{id:"AQUITAINE",name:"FS Aquitaine",nationality:"FR",vessel_class:"surface/warship/frigate/type23",vessel_role:"frigate",domain:"surface"}],tags:["convoy","asw"],author:"CDR Smith",featureTags:["high-priority","reviewed"],collection:"exercises-2024",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-04T00:00:00Z"}),i("ex-004",{title:"TACEX Delta",platforms:[{id:"SACHSEN",name:"FGS Sachsen",nationality:"DE",vessel_class:"surface/warship/frigate/type26",vessel_role:"frigate",domain:"surface"}],tags:["surface-action"],author:"CDR Mueller",collection:"training-2025",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-15T00:00:00Z"}),i("ex-005",{title:"ASW Exercise Echo",platforms:[{id:"RUBIS",name:"FS Rubis",nationality:"FR",vessel_class:"subsurface/submarine/ssn",vessel_role:"ssn",domain:"subsurface"}],tags:["asw"],author:"CDR Dupont",collection:"training-2025",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-01T02:00:00Z"})],r=[{id:"surface",label:"Surface",children:[{id:"warship",label:"Warship",children:[{id:"frigate",label:"Frigate",children:[{id:"type23",label:"Type 23"},{id:"type26",label:"Type 26"}]},{id:"destroyer",label:"Destroyer",children:[{id:"type45",label:"Type 45"}]}]}]},{id:"submarine",label:"Submarine",children:[{id:"nuclear",label:"Nuclear",children:[{id:"ssn",label:"SSN"},{id:"ssbn",label:"SSBN"}]}]}];function a({items:s,taxonomy:O,initialFilterState:Ae}){const[Ce,Oe]=_.useState(s.length),xe=_.useCallback(_e=>{Oe(_e.length)},[]);return e.jsxs("div",{children:[e.jsx(x,{items:s,taxonomy:O,onFilteredItems:xe,initialFilterState:Ae}),e.jsxs("div",{style:{padding:"8px 12px",fontSize:"12px",color:"var(--vscode-descriptionForeground, #666)"},children:["Showing ",Ce," of ",s.length," exercises"]})]})}const fe={items:[{kind:"lozenge",shape:"simple",id:"story-1",filterType:"nationality",value:"French"}]},Ee={items:[{kind:"lozenge",shape:"simple",id:"story-1",filterType:"nationality",value:"French"},{kind:"lozenge",shape:"simple",id:"story-2",filterType:"tag",value:"asw"}]},Me={items:[{kind:"or-container",id:"story-or-1",children:[{kind:"lozenge",shape:"simple",id:"story-or-c1",filterType:"nationality",value:"French"},{kind:"lozenge",shape:"simple",id:"story-or-c2",filterType:"nationality",value:"British"}]},{kind:"lozenge",shape:"simple",id:"story-3",filterType:"tag",value:"convoy"}]},be={items:[{kind:"lozenge",shape:"simple",id:"story-t1",filterType:"vessel-class",value:"surface/warship/frigate/type23"},{kind:"lozenge",shape:"simple",id:"story-t2",filterType:"tag",value:"asw"},{kind:"lozenge",shape:"simple",id:"story-t3",filterType:"author",value:"CDR Smith"},{kind:"lozenge",shape:"simple",id:"story-t4",filterType:"nationality",value:"French"},{kind:"lozenge",shape:"simple",id:"story-t5",filterType:"duration",value:"<24H"},{kind:"lozenge",shape:"simple",id:"story-t6",filterType:"title",value:"CASEX"}]},we={items:[{kind:"lozenge",shape:"simple",id:"story-z1",filterType:"nationality",value:"German"},{kind:"lozenge",shape:"simple",id:"story-z2",filterType:"author",value:"CDR Smith"}]},Ne={items:[{kind:"lozenge",shape:"platform",id:"story-p1",filterType:"platform",attributes:{nationality:"GB",domain:"subsurface"}}]},Re={items:[{kind:"lozenge",shape:"platform",id:"story-p2",filterType:"platform",attributes:{nationality:"GB",vessel_role:"frigate"}},{kind:"lozenge",shape:"simple",id:"story-t-exercise",filterType:"tag",value:"convoy"}]},De={items:[{kind:"or-container",id:"story-or-plat",children:[{kind:"lozenge",shape:"platform",id:"story-p3",filterType:"platform",attributes:{nationality:"GB",domain:"subsurface"}},{kind:"lozenge",shape:"platform",id:"story-p4",filterType:"platform",attributes:{nationality:"DE",vessel_role:"frigate"}}]}]},je={title:"FilterBar",component:x,parameters:{layout:"padded",docs:{description:{component:"Persistent filter bar with lozenge UI, AND/OR logic, and drag-to-group support. All 10 SRD filter types with type-specific input methods."}}},tags:["autodocs"],decorators:[s=>e.jsx(ve,{children:e.jsx(s,{})})]},o={render:()=>e.jsx(a,{items:t,taxonomy:r})},n={name:"Single Filter",render:()=>e.jsx(a,{items:t,taxonomy:r,initialFilterState:fe}),parameters:{docs:{description:{story:"Click (+) and select a filter type, then choose a value. A lozenge appears and results narrow."}}}},l={name:"Multiple AND Filters",render:()=>e.jsx(a,{items:t,taxonomy:r,initialFilterState:Ee}),parameters:{docs:{description:{story:"Add multiple filters — they combine with AND logic. Only exercises matching ALL filters appear."}}}},c={name:"OR Group",render:()=>e.jsx(a,{items:t,taxonomy:r,initialFilterState:Me}),parameters:{docs:{description:{story:'Click (+) → "OR group" to create an OR container. Add filters inside or drag existing lozenges into it.'}}}},p={name:"Interactive",render:()=>e.jsx(a,{items:t,taxonomy:r}),parameters:{docs:{description:{story:"Full interactive demo: add, edit, remove, drag to OR group. Try building complex queries like (French OR British) AND convoy."}}}},d={name:"All Filter Types",render:()=>e.jsx(a,{items:t,taxonomy:r,initialFilterState:be}),parameters:{docs:{description:{story:"Try all 10 filter types: Vessel Class (hierarchical), Plot Tag/Feature Tag/Author/Track Name/Nationality/Collection (dropdowns), Duration (buckets), Title/Plot Contents (free-text)."}}}},m={name:"Zero Results",render:()=>e.jsx(a,{items:t,taxonomy:r,initialFilterState:we}),parameters:{docs:{description:{story:'Add incompatible filters (e.g., Nationality: German + Author: CDR Smith) to see the "0 of 5" state.'}}}},u={name:"With Platform Chip",render:()=>e.jsx(a,{items:t,taxonomy:r,initialFilterState:Ne}),parameters:{docs:{description:{story:'Compound "GB + Subsurface" platform chip (#186). The chip serialises to one `array_filter` CQL2 node over `debrief:platforms`, matching only plots where a single platform record satisfies all selected attributes.'}}}},h={name:"Platform Chip + Tag",render:()=>e.jsx(a,{items:t,taxonomy:r,initialFilterState:Re}),parameters:{docs:{description:{story:"A platform chip alongside a tag chip. Combines via top-level AND: only items with a matching platform AND the required tag appear."}}}},y={name:"Platform Chips in an OR Group",render:()=>e.jsx(a,{items:t,taxonomy:r,initialFilterState:De}),parameters:{docs:{description:{story:'Two platform chips inside an OR container: "British submarines OR German frigates".'}}}},ke={items:[{kind:"lozenge",id:"vc-1",filterType:"vessel-class",value:"surface/warship/frigate/type23"}]},Be={items:[{kind:"lozenge",id:"vc-branch",filterType:"vessel-class",value:"surface/warship"}]},T={name:"Vessel Taxonomy Navigation",render:()=>e.jsx(a,{items:t,taxonomy:r,initialFilterState:ke}),parameters:{docs:{description:{story:'Vessel class lozenge displays human-readable label "Type 23" (not raw path). Click the lozenge to re-edit — the current selection is marked with ✓ in the dropdown.'}}}},g={name:"Vessel Taxonomy Search",render:()=>e.jsx(a,{items:t,taxonomy:r}),parameters:{docs:{description:{story:'Click (+) → Vessel Class to open the dropdown. A search input appears above the tree. Type to filter — e.g., "type 23" shows only matching nodes with ancestor paths preserved.'}}}},S={name:"Vessel Taxonomy Counts",render:()=>e.jsx(a,{items:t,taxonomy:r}),parameters:{docs:{description:{story:'Click (+) → Vessel Class. Each node shows a count badge (e.g., "Surface (4)"). Nodes with zero matches are dimmed and disabled. Counts update as other filters narrow the data set.'}}}},f={name:"Vessel Taxonomy Branch Selection",render:()=>e.jsx(a,{items:t,taxonomy:r,initialFilterState:Be}),parameters:{docs:{description:{story:'Branch node "Warship" selected — lozenge shows "Vessel Class: Warship". Filtering matches all warship subtypes (frigates, destroyers). Click the lozenge to see "Warship" marked as current.'}}}},A={name:"Quick Search",render:()=>e.jsx(a,{items:t,taxonomy:r}),parameters:{docs:{description:{story:'Type in the Quick Search box to filter exercises by title in real-time. Press Enter to "graduate" the search into a title lozenge. Press Escape to clear. Keyboard shortcuts: "/" or Ctrl+F to focus.'}}}},C={name:"With Saved Filters",render:()=>{const s=new Fe({version:1,configurations:[{id:"demo-saved-1",name:"French Exercises",filterBarState:fe,cql2Json:{},createdAt:"2026-03-01T10:00:00.000Z",updatedAt:"2026-03-01T10:00:00.000Z"}]});return e.jsx("div",{children:e.jsx(x,{items:t,taxonomy:r,onFilteredItems:()=>{},savedFiltersStorage:s})})},parameters:{docs:{description:{story:"FilterBar with saved filters integration. Use Save to persist and Historic Filters to restore."}}}};var F,v,E;o.parameters={...o.parameters,docs:{...(F=o.parameters)==null?void 0:F.docs,source:{originalSource:`{
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />
}`,...(E=(v=o.parameters)==null?void 0:v.docs)==null?void 0:E.source}}};var M,b,w;n.parameters={...n.parameters,docs:{...(M=n.parameters)==null?void 0:M.docs,source:{originalSource:`{
  name: 'Single Filter',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={SINGLE_FILTER_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Click (+) and select a filter type, then choose a value. A lozenge appears and results narrow.'
      }
    }
  }
}`,...(w=(b=n.parameters)==null?void 0:b.docs)==null?void 0:w.source}}};var N,R,D;l.parameters={...l.parameters,docs:{...(N=l.parameters)==null?void 0:N.docs,source:{originalSource:`{
  name: 'Multiple AND Filters',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={MULTIPLE_AND_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Add multiple filters — they combine with AND logic. Only exercises matching ALL filters appear.'
      }
    }
  }
}`,...(D=(R=l.parameters)==null?void 0:R.docs)==null?void 0:D.source}}};var k,B,I;c.parameters={...c.parameters,docs:{...(k=c.parameters)==null?void 0:k.docs,source:{originalSource:`{
  name: 'OR Group',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={OR_GROUP_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Click (+) → "OR group" to create an OR container. Add filters inside or drag existing lozenges into it.'
      }
    }
  }
}`,...(I=(B=c.parameters)==null?void 0:B.docs)==null?void 0:I.source}}};var z,L,P;p.parameters={...p.parameters,docs:{...(z=p.parameters)==null?void 0:z.docs,source:{originalSource:`{
  name: 'Interactive',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />,
  parameters: {
    docs: {
      description: {
        story: 'Full interactive demo: add, edit, remove, drag to OR group. Try building complex queries like (French OR British) AND convoy.'
      }
    }
  }
}`,...(P=(L=p.parameters)==null?void 0:L.docs)==null?void 0:P.source}}};var K,W,G;d.parameters={...d.parameters,docs:{...(K=d.parameters)==null?void 0:K.docs,source:{originalSource:`{
  name: 'All Filter Types',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={ALL_TYPES_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Try all 10 filter types: Vessel Class (hierarchical), Plot Tag/Feature Tag/Author/Track Name/Nationality/Collection (dropdowns), Duration (buckets), Title/Plot Contents (free-text).'
      }
    }
  }
}`,...(G=(W=d.parameters)==null?void 0:W.docs)==null?void 0:G.source}}};var V,j,X;m.parameters={...m.parameters,docs:{...(V=m.parameters)==null?void 0:V.docs,source:{originalSource:`{
  name: 'Zero Results',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={ZERO_RESULTS_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Add incompatible filters (e.g., Nationality: German + Author: CDR Smith) to see the "0 of 5" state.'
      }
    }
  }
}`,...(X=(j=m.parameters)==null?void 0:j.docs)==null?void 0:X.source}}};var Z,Y,U;u.parameters={...u.parameters,docs:{...(Z=u.parameters)==null?void 0:Z.docs,source:{originalSource:`{
  name: 'With Platform Chip',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={PLATFORM_CHIP_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Compound "GB + Subsurface" platform chip (#186). The chip serialises to one ' + '\`array_filter\` CQL2 node over \`debrief:platforms\`, matching only plots where a ' + 'single platform record satisfies all selected attributes.'
      }
    }
  }
}`,...(U=(Y=u.parameters)==null?void 0:Y.docs)==null?void 0:U.source}}};var H,Q,q;h.parameters={...h.parameters,docs:{...(H=h.parameters)==null?void 0:H.docs,source:{originalSource:`{
  name: 'Platform Chip + Tag',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={PLATFORM_AND_TAG_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'A platform chip alongside a tag chip. Combines via top-level AND: only items with ' + 'a matching platform AND the required tag appear.'
      }
    }
  }
}`,...(q=(Q=h.parameters)==null?void 0:Q.docs)==null?void 0:q.source}}};var J,$,ee;y.parameters={...y.parameters,docs:{...(J=y.parameters)==null?void 0:J.docs,source:{originalSource:`{
  name: 'Platform Chips in an OR Group',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={PLATFORM_OR_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Two platform chips inside an OR container: "British submarines OR German frigates".'
      }
    }
  }
}`,...(ee=($=y.parameters)==null?void 0:$.docs)==null?void 0:ee.source}}};var te,re,ae;T.parameters={...T.parameters,docs:{...(te=T.parameters)==null?void 0:te.docs,source:{originalSource:`{
  name: 'Vessel Taxonomy Navigation',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={VESSEL_CLASS_SELECTED_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Vessel class lozenge displays human-readable label "Type 23" (not raw path). Click the lozenge to re-edit — the current selection is marked with ✓ in the dropdown.'
      }
    }
  }
}`,...(ae=(re=T.parameters)==null?void 0:re.docs)==null?void 0:ae.source}}};var se,ie,oe;g.parameters={...g.parameters,docs:{...(se=g.parameters)==null?void 0:se.docs,source:{originalSource:`{
  name: 'Vessel Taxonomy Search',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />,
  parameters: {
    docs: {
      description: {
        story: 'Click (+) → Vessel Class to open the dropdown. A search input appears above the tree. Type to filter — e.g., "type 23" shows only matching nodes with ancestor paths preserved.'
      }
    }
  }
}`,...(oe=(ie=g.parameters)==null?void 0:ie.docs)==null?void 0:oe.source}}};var ne,le,ce;S.parameters={...S.parameters,docs:{...(ne=S.parameters)==null?void 0:ne.docs,source:{originalSource:`{
  name: 'Vessel Taxonomy Counts',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />,
  parameters: {
    docs: {
      description: {
        story: 'Click (+) → Vessel Class. Each node shows a count badge (e.g., "Surface (4)"). Nodes with zero matches are dimmed and disabled. Counts update as other filters narrow the data set.'
      }
    }
  }
}`,...(ce=(le=S.parameters)==null?void 0:le.docs)==null?void 0:ce.source}}};var pe,de,me;f.parameters={...f.parameters,docs:{...(pe=f.parameters)==null?void 0:pe.docs,source:{originalSource:`{
  name: 'Vessel Taxonomy Branch Selection',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={BRANCH_SELECTED_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Branch node "Warship" selected — lozenge shows "Vessel Class: Warship". Filtering matches all warship subtypes (frigates, destroyers). Click the lozenge to see "Warship" marked as current.'
      }
    }
  }
}`,...(me=(de=f.parameters)==null?void 0:de.docs)==null?void 0:me.source}}};var ue,he,ye;A.parameters={...A.parameters,docs:{...(ue=A.parameters)==null?void 0:ue.docs,source:{originalSource:`{
  name: 'Quick Search',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />,
  parameters: {
    docs: {
      description: {
        story: 'Type in the Quick Search box to filter exercises by title in real-time. ' + 'Press Enter to "graduate" the search into a title lozenge. ' + 'Press Escape to clear. Keyboard shortcuts: "/" or Ctrl+F to focus.'
      }
    }
  }
}`,...(ye=(he=A.parameters)==null?void 0:he.docs)==null?void 0:ye.source}}};var Te,ge,Se;C.parameters={...C.parameters,docs:{...(Te=C.parameters)==null?void 0:Te.docs,source:{originalSource:`{
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
}`,...(Se=(ge=C.parameters)==null?void 0:ge.docs)==null?void 0:Se.source}}};const Xe=["Empty","SingleFilter","MultipleAND","OrGroup","Interactive","AllFilterTypes","ZeroResults","WithPlatformChip","PlatformChipPlusTag","PlatformChipOrGroup","VesselTaxonomyNavigation","VesselTaxonomySearch","VesselTaxonomyCounts","VesselTaxonomyBranchSelection","QuickSearchDemo","WithSavedFilters"];export{d as AllFilterTypes,o as Empty,p as Interactive,l as MultipleAND,c as OrGroup,y as PlatformChipOrGroup,h as PlatformChipPlusTag,A as QuickSearchDemo,n as SingleFilter,f as VesselTaxonomyBranchSelection,S as VesselTaxonomyCounts,T as VesselTaxonomyNavigation,g as VesselTaxonomySearch,u as WithPlatformChip,C as WithSavedFilters,m as ZeroResults,Xe as __namedExportsOrder,je as default};
