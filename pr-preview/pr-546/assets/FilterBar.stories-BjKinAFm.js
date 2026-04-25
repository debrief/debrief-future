import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r as d}from"./index-B2-qRKKC.js";import{F as b,I as we}from"./FilterBar-wETrcS0F.js";import{T as Ne}from"./ThemeProvider-eH7IAOIa.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./index-kS-9iBlu.js";import"./CascadingMenu-BgTnOB60.js";import"./defaultTheme-CXXPMGCe.js";function c(r,i={}){return{id:r,title:`Exercise ${r}`,itemPath:`/catalog/${r}/item.json`,bbox:null,datetime:null,startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-01T12:00:00Z",platforms:[],tags:[],featureTags:[],author:null,collection:null,modified:null,...i}}const t=[c("ex-001",{title:"CASEX Alpha",platforms:[{id:"ARGYLL",name:"HMS Argyll",nationality:"FR",vessel_class:"surface/warship/frigate/type23",vessel_role:"frigate",domain:"surface"},{id:"CONTACT-BRAVO",name:"Contact Bravo",domain:"unknown"}],tags:["convoy","blue-water"],author:"CDR Smith",collection:"exercises-2024",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-01T04:00:00Z"}),c("ex-002",{title:"CASEX Bravo",platforms:[{id:"DIAMOND",name:"HMS Diamond",nationality:"GB",vessel_class:"surface/warship/destroyer/type45",vessel_role:"destroyer",domain:"surface"},{id:"UNKNOWN-ALPHA",name:"Unknown Alpha",domain:"unknown"}],tags:["asw","shallow-water"],author:"CDR Jones",collection:"exercises-2024",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-02T12:00:00Z"}),c("ex-003",{title:"GROUPEX Charlie",platforms:[{id:"ARGYLL",name:"HMS Argyll",nationality:"GB",vessel_class:"surface/warship/frigate/type23",vessel_role:"frigate",domain:"surface"},{id:"DIAMOND",name:"HMS Diamond",nationality:"GB",vessel_class:"surface/warship/destroyer/type45",vessel_role:"destroyer",domain:"surface"},{id:"AQUITAINE",name:"FS Aquitaine",nationality:"FR",vessel_class:"surface/warship/frigate/type23",vessel_role:"frigate",domain:"surface"}],tags:["convoy","asw"],author:"CDR Smith",featureTags:["high-priority","reviewed"],collection:"exercises-2024",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-04T00:00:00Z"}),c("ex-004",{title:"TACEX Delta",platforms:[{id:"SACHSEN",name:"FGS Sachsen",nationality:"DE",vessel_class:"surface/warship/frigate/type26",vessel_role:"frigate",domain:"surface"}],tags:["surface-action"],author:"CDR Mueller",collection:"training-2025",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-15T00:00:00Z"}),c("ex-005",{title:"ASW Exercise Echo",platforms:[{id:"RUBIS",name:"FS Rubis",nationality:"FR",vessel_class:"subsurface/submarine/ssn",vessel_role:"ssn",domain:"subsurface"}],tags:["asw"],author:"CDR Dupont",collection:"training-2025",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-01T02:00:00Z"})],s=[{id:"surface",label:"Surface",children:[{id:"warship",label:"Warship",children:[{id:"frigate",label:"Frigate",children:[{id:"type23",label:"Type 23"},{id:"type26",label:"Type 26"}]},{id:"destroyer",label:"Destroyer",children:[{id:"type45",label:"Type 45"}]}]}]},{id:"submarine",label:"Submarine",children:[{id:"nuclear",label:"Nuclear",children:[{id:"ssn",label:"SSN"},{id:"ssbn",label:"SSBN"}]}]}];function a({items:r,taxonomy:i,initialFilterState:o}){const[n,l]=d.useState(r.length),k=d.useCallback(p=>{l(p.length)},[]);return e.jsxs("div",{children:[e.jsx(b,{items:r,taxonomy:i,onFilteredItems:k,initialFilterState:o}),e.jsxs("div",{style:{padding:"8px 12px",fontSize:"12px",color:"var(--vscode-descriptionForeground, #666)"},children:["Showing ",n," of ",r.length," exercises"]})]})}const be={items:[{kind:"lozenge",shape:"simple",id:"story-1",filterType:"nationality",value:"French"}]},Re={items:[{kind:"lozenge",shape:"simple",id:"story-1",filterType:"nationality",value:"French"},{kind:"lozenge",shape:"simple",id:"story-2",filterType:"tag",value:"asw"}]},De={items:[{kind:"or-container",id:"story-or-1",children:[{kind:"lozenge",shape:"simple",id:"story-or-c1",filterType:"nationality",value:"French"},{kind:"lozenge",shape:"simple",id:"story-or-c2",filterType:"nationality",value:"British"}]},{kind:"lozenge",shape:"simple",id:"story-3",filterType:"tag",value:"convoy"}]},Be={items:[{kind:"lozenge",shape:"simple",id:"story-t1",filterType:"vessel-class",value:"surface/warship/frigate/type23"},{kind:"lozenge",shape:"simple",id:"story-t2",filterType:"tag",value:"asw"},{kind:"lozenge",shape:"simple",id:"story-t3",filterType:"author",value:"CDR Smith"},{kind:"lozenge",shape:"simple",id:"story-t4",filterType:"nationality",value:"French"},{kind:"lozenge",shape:"simple",id:"story-t5",filterType:"duration",value:"<24H"},{kind:"lozenge",shape:"simple",id:"story-t6",filterType:"title",value:"CASEX"}]},Le={items:[{kind:"lozenge",shape:"simple",id:"story-z1",filterType:"nationality",value:"German"},{kind:"lozenge",shape:"simple",id:"story-z2",filterType:"author",value:"CDR Smith"}]},Ie={items:[{kind:"lozenge",shape:"platform",id:"story-p1",filterType:"platform",attributes:{nationality:"GB",domain:"subsurface"}}]},Pe={items:[{kind:"lozenge",shape:"platform",id:"story-p2",filterType:"platform",attributes:{nationality:"GB",vessel_role:"frigate"}},{kind:"lozenge",shape:"simple",id:"story-t-exercise",filterType:"tag",value:"convoy"}]},ze={items:[{kind:"or-container",id:"story-or-plat",children:[{kind:"lozenge",shape:"platform",id:"story-p3",filterType:"platform",attributes:{nationality:"GB",domain:"subsurface"}},{kind:"lozenge",shape:"platform",id:"story-p4",filterType:"platform",attributes:{nationality:"DE",vessel_role:"frigate"}}]}]},tt={title:"FilterBar",component:b,parameters:{layout:"padded",docs:{description:{component:"Persistent filter bar with lozenge UI, AND/OR logic, and drag-to-group support. All 10 SRD filter types with type-specific input methods."}}},tags:["autodocs"],decorators:[r=>e.jsx(Ne,{children:e.jsx(r,{})})]},m={render:()=>e.jsx(a,{items:t,taxonomy:s})},u={name:"Single Filter",render:()=>e.jsx(a,{items:t,taxonomy:s,initialFilterState:be}),parameters:{docs:{description:{story:"Click (+) and select a filter type, then choose a value. A lozenge appears and results narrow."}}}},h={name:"Multiple AND Filters",render:()=>e.jsx(a,{items:t,taxonomy:s,initialFilterState:Re}),parameters:{docs:{description:{story:"Add multiple filters — they combine with AND logic. Only exercises matching ALL filters appear."}}}},y={name:"OR Group",render:()=>e.jsx(a,{items:t,taxonomy:s,initialFilterState:De}),parameters:{docs:{description:{story:'Click (+) → "OR group" to create an OR container. Add filters inside or drag existing lozenges into it.'}}}},g={name:"Interactive",render:()=>e.jsx(a,{items:t,taxonomy:s}),parameters:{docs:{description:{story:"Full interactive demo: add, edit, remove, drag to OR group. Try building complex queries like (French OR British) AND convoy."}}}},T={name:"All Filter Types",render:()=>e.jsx(a,{items:t,taxonomy:s,initialFilterState:Be}),parameters:{docs:{description:{story:"Try all 10 filter types: Vessel Class (hierarchical), Plot Tag/Feature Tag/Author/Track Name/Nationality/Collection (dropdowns), Duration (buckets), Title/Plot Contents (free-text)."}}}},f={name:"Zero Results",render:()=>e.jsx(a,{items:t,taxonomy:s,initialFilterState:Le}),parameters:{docs:{description:{story:'Add incompatible filters (e.g., Nationality: German + Author: CDR Smith) to see the "0 of 5" state.'}}}},S={name:"With Platform Chip",render:()=>e.jsx(a,{items:t,taxonomy:s,initialFilterState:Ie}),parameters:{docs:{description:{story:'Compound "GB + Subsurface" platform chip (#186). The chip serialises to one `array_filter` CQL2 node over `debrief:platforms`, matching only plots where a single platform record satisfies all selected attributes.'}}}},C={name:"Platform Chip + Tag",render:()=>e.jsx(a,{items:t,taxonomy:s,initialFilterState:Pe}),parameters:{docs:{description:{story:"A platform chip alongside a tag chip. Combines via top-level AND: only items with a matching platform AND the required tag appear."}}}},A={name:"Platform Chips in an OR Group",render:()=>e.jsx(a,{items:t,taxonomy:s,initialFilterState:ze}),parameters:{docs:{description:{story:'Two platform chips inside an OR container: "British submarines OR German frigates".'}}}},Ke={items:[{kind:"lozenge",id:"vc-1",filterType:"vessel-class",value:"surface/warship/frigate/type23"}]},We={items:[{kind:"lozenge",id:"vc-branch",filterType:"vessel-class",value:"surface/warship"}]},x={name:"Vessel Taxonomy Navigation",render:()=>e.jsx(a,{items:t,taxonomy:s,initialFilterState:Ke}),parameters:{docs:{description:{story:'Vessel class lozenge displays human-readable label "Type 23" (not raw path). Click the lozenge to re-edit — the current selection is marked with ✓ in the dropdown.'}}}},_={name:"Vessel Taxonomy Search",render:()=>e.jsx(a,{items:t,taxonomy:s}),parameters:{docs:{description:{story:'Click (+) → Vessel Class to open the dropdown. A search input appears above the tree. Type to filter — e.g., "type 23" shows only matching nodes with ancestor paths preserved.'}}}},v={name:"Vessel Taxonomy Counts",render:()=>e.jsx(a,{items:t,taxonomy:s}),parameters:{docs:{description:{story:'Click (+) → Vessel Class. Each node shows a count badge (e.g., "Surface (4)"). Nodes with zero matches are dimmed and disabled. Counts update as other filters narrow the data set.'}}}},O={name:"Vessel Taxonomy Branch Selection",render:()=>e.jsx(a,{items:t,taxonomy:s,initialFilterState:We}),parameters:{docs:{description:{story:'Branch node "Warship" selected — lozenge shows "Vessel Class: Warship". Filtering matches all warship subtypes (frigates, destroyers). Click the lozenge to see "Warship" marked as current.'}}}},M={name:"Quick Search",render:()=>e.jsx(a,{items:t,taxonomy:s}),parameters:{docs:{description:{story:'Type in the Quick Search box to filter exercises by title in real-time. Press Enter to "graduate" the search into a title lozenge. Press Escape to clear. Keyboard shortcuts: "/" or Ctrl+F to focus.'}}}},F={name:"With Saved Filters",render:()=>{const r=new we({version:1,configurations:[{id:"demo-saved-1",name:"French Exercises",filterBarState:be,cql2Json:{},createdAt:"2026-03-01T10:00:00.000Z",updatedAt:"2026-03-01T10:00:00.000Z"}]});return e.jsx("div",{children:e.jsx(b,{items:t,taxonomy:s,onFilteredItems:()=>{},savedFiltersStorage:r})})},parameters:{docs:{description:{story:"FilterBar with saved filters integration. Use Save to persist and Historic Filters to restore."}}}},Ge={vessel_class_tree:{},nationalities:["GB","FR","DE"],exercise_names:[],tags:["alpha","beta"],feature_tags:[],_meta:{canonicalisation:"storybook-stub",exercise_parse_rule:"storybook-stub",generated_from_catalog:"storybook-stub",generated_from_registry:"storybook-stub",tool:"storybook-stub"}},je=[["auth-failure",{kind:"auth-failure",providerStatus:401,durationMs:42}],["rate-limit",{kind:"rate-limit",providerStatus:429,retryAfterSeconds:30,durationMs:42}],["provider-error",{kind:"provider-error",providerStatus:502,durationMs:42}],["timeout",{kind:"timeout",durationMs:12e3}],["malformed",{kind:"malformed-response",reason:"non-json",durationMs:42,responseBytes:128}],["not-configured",{kind:"not-configured",reason:"no-key",durationMs:0}],["ceiling-reached",{kind:"ceiling-reached",ceiling:50,durationMs:0}]];function Ve(r){const i=r.toLowerCase(),o=[];/\buk|british|royal navy\b/.test(i)&&o.push({filterType:"nationality",value:"GB"}),/french|france/.test(i)&&o.push({filterType:"nationality",value:"FR"}),/german|germany|bundes/.test(i)&&o.push({filterType:"nationality",value:"DE"}),o.length===0&&o.push({filterType:"title",value:r});const n=JSON.stringify({cql2:{},lozenges:o,unrecognised_terms:[]});return{kind:"success",rawResponse:n,durationMs:42,responseBytes:n.length,model:"claude-haiku-4-5-20251001"}}function Xe(r={}){let i=!1;return{async generate(o){i=!1;const n=o.match(/Phrase:\s*(.*)$/m),l=(n==null?void 0:n[1])??o,k=l.toLowerCase(),p=r.latencyMs??200;if(await new Promise(w=>setTimeout(w,p)),i)return{kind:"transport-error",reason:"cancelled",durationMs:p};for(const[w,ke]of je)if(k.includes(w))return ke;return Ve(l)},abort(){i=!0}}}function Ze(){const[r,i]=d.useState(t.length),o=d.useCallback(l=>{i(l.length)},[]),[n]=d.useState(()=>Xe({latencyMs:300}));return e.jsxs("div",{children:[e.jsx(b,{items:t,taxonomy:s,onFilteredItems:o,llmClient:n,nlEnums:Ge,liveModeLabel:"Live · Anthropic · claude-haiku-4-5-20251001 (stub)"}),e.jsxs("div",{style:{padding:"8px 12px",fontSize:"12px",color:"var(--vscode-descriptionForeground, #666)"},children:[e.jsxs("div",{children:["Showing ",r," of ",t.length," exercises"]}),e.jsx("div",{style:{marginTop:4,opacity:.7},children:"Try: “UK submarines”, “French frigates”, “auth-failure”, “timeout”, “rate-limit”, “malformed”, “ceiling-reached”."})]})]})}const E={name:"NL Mode — with stub client",render:()=>e.jsx(Ze,{}),parameters:{docs:{description:{story:"FilterBar in #191 NL mode driven by a deterministic stub LLM client. Typing a recognised phrase applies chips; typing one of the 7 failure keywords renders the matching banner. Used by the E2E suite for theme + interaction screenshots."}}}};var N,R,D;m.parameters={...m.parameters,docs:{...(N=m.parameters)==null?void 0:N.docs,source:{originalSource:`{
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />
}`,...(D=(R=m.parameters)==null?void 0:R.docs)==null?void 0:D.source}}};var B,L,I;u.parameters={...u.parameters,docs:{...(B=u.parameters)==null?void 0:B.docs,source:{originalSource:`{
  name: 'Single Filter',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={SINGLE_FILTER_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Click (+) and select a filter type, then choose a value. A lozenge appears and results narrow.'
      }
    }
  }
}`,...(I=(L=u.parameters)==null?void 0:L.docs)==null?void 0:I.source}}};var P,z,K;h.parameters={...h.parameters,docs:{...(P=h.parameters)==null?void 0:P.docs,source:{originalSource:`{
  name: 'Multiple AND Filters',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={MULTIPLE_AND_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Add multiple filters — they combine with AND logic. Only exercises matching ALL filters appear.'
      }
    }
  }
}`,...(K=(z=h.parameters)==null?void 0:z.docs)==null?void 0:K.source}}};var W,G,j;y.parameters={...y.parameters,docs:{...(W=y.parameters)==null?void 0:W.docs,source:{originalSource:`{
  name: 'OR Group',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={OR_GROUP_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Click (+) → "OR group" to create an OR container. Add filters inside or drag existing lozenges into it.'
      }
    }
  }
}`,...(j=(G=y.parameters)==null?void 0:G.docs)==null?void 0:j.source}}};var V,X,Z;g.parameters={...g.parameters,docs:{...(V=g.parameters)==null?void 0:V.docs,source:{originalSource:`{
  name: 'Interactive',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />,
  parameters: {
    docs: {
      description: {
        story: 'Full interactive demo: add, edit, remove, drag to OR group. Try building complex queries like (French OR British) AND convoy.'
      }
    }
  }
}`,...(Z=(X=g.parameters)==null?void 0:X.docs)==null?void 0:Z.source}}};var Y,U,H;T.parameters={...T.parameters,docs:{...(Y=T.parameters)==null?void 0:Y.docs,source:{originalSource:`{
  name: 'All Filter Types',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={ALL_TYPES_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Try all 10 filter types: Vessel Class (hierarchical), Plot Tag/Feature Tag/Author/Track Name/Nationality/Collection (dropdowns), Duration (buckets), Title/Plot Contents (free-text).'
      }
    }
  }
}`,...(H=(U=T.parameters)==null?void 0:U.docs)==null?void 0:H.source}}};var Q,q,J;f.parameters={...f.parameters,docs:{...(Q=f.parameters)==null?void 0:Q.docs,source:{originalSource:`{
  name: 'Zero Results',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={ZERO_RESULTS_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Add incompatible filters (e.g., Nationality: German + Author: CDR Smith) to see the "0 of 5" state.'
      }
    }
  }
}`,...(J=(q=f.parameters)==null?void 0:q.docs)==null?void 0:J.source}}};var $,ee,te;S.parameters={...S.parameters,docs:{...($=S.parameters)==null?void 0:$.docs,source:{originalSource:`{
  name: 'With Platform Chip',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={PLATFORM_CHIP_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Compound "GB + Subsurface" platform chip (#186). The chip serialises to one ' + '\`array_filter\` CQL2 node over \`debrief:platforms\`, matching only plots where a ' + 'single platform record satisfies all selected attributes.'
      }
    }
  }
}`,...(te=(ee=S.parameters)==null?void 0:ee.docs)==null?void 0:te.source}}};var re,se,ae;C.parameters={...C.parameters,docs:{...(re=C.parameters)==null?void 0:re.docs,source:{originalSource:`{
  name: 'Platform Chip + Tag',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={PLATFORM_AND_TAG_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'A platform chip alongside a tag chip. Combines via top-level AND: only items with ' + 'a matching platform AND the required tag appear.'
      }
    }
  }
}`,...(ae=(se=C.parameters)==null?void 0:se.docs)==null?void 0:ae.source}}};var ie,oe,ne;A.parameters={...A.parameters,docs:{...(ie=A.parameters)==null?void 0:ie.docs,source:{originalSource:`{
  name: 'Platform Chips in an OR Group',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={PLATFORM_OR_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Two platform chips inside an OR container: "British submarines OR German frigates".'
      }
    }
  }
}`,...(ne=(oe=A.parameters)==null?void 0:oe.docs)==null?void 0:ne.source}}};var le,ce,de;x.parameters={...x.parameters,docs:{...(le=x.parameters)==null?void 0:le.docs,source:{originalSource:`{
  name: 'Vessel Taxonomy Navigation',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={VESSEL_CLASS_SELECTED_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Vessel class lozenge displays human-readable label "Type 23" (not raw path). Click the lozenge to re-edit — the current selection is marked with ✓ in the dropdown.'
      }
    }
  }
}`,...(de=(ce=x.parameters)==null?void 0:ce.docs)==null?void 0:de.source}}};var pe,me,ue;_.parameters={..._.parameters,docs:{...(pe=_.parameters)==null?void 0:pe.docs,source:{originalSource:`{
  name: 'Vessel Taxonomy Search',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />,
  parameters: {
    docs: {
      description: {
        story: 'Click (+) → Vessel Class to open the dropdown. A search input appears above the tree. Type to filter — e.g., "type 23" shows only matching nodes with ancestor paths preserved.'
      }
    }
  }
}`,...(ue=(me=_.parameters)==null?void 0:me.docs)==null?void 0:ue.source}}};var he,ye,ge;v.parameters={...v.parameters,docs:{...(he=v.parameters)==null?void 0:he.docs,source:{originalSource:`{
  name: 'Vessel Taxonomy Counts',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />,
  parameters: {
    docs: {
      description: {
        story: 'Click (+) → Vessel Class. Each node shows a count badge (e.g., "Surface (4)"). Nodes with zero matches are dimmed and disabled. Counts update as other filters narrow the data set.'
      }
    }
  }
}`,...(ge=(ye=v.parameters)==null?void 0:ye.docs)==null?void 0:ge.source}}};var Te,fe,Se;O.parameters={...O.parameters,docs:{...(Te=O.parameters)==null?void 0:Te.docs,source:{originalSource:`{
  name: 'Vessel Taxonomy Branch Selection',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={BRANCH_SELECTED_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Branch node "Warship" selected — lozenge shows "Vessel Class: Warship". Filtering matches all warship subtypes (frigates, destroyers). Click the lozenge to see "Warship" marked as current.'
      }
    }
  }
}`,...(Se=(fe=O.parameters)==null?void 0:fe.docs)==null?void 0:Se.source}}};var Ce,Ae,xe;M.parameters={...M.parameters,docs:{...(Ce=M.parameters)==null?void 0:Ce.docs,source:{originalSource:`{
  name: 'Quick Search',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />,
  parameters: {
    docs: {
      description: {
        story: 'Type in the Quick Search box to filter exercises by title in real-time. ' + 'Press Enter to "graduate" the search into a title lozenge. ' + 'Press Escape to clear. Keyboard shortcuts: "/" or Ctrl+F to focus.'
      }
    }
  }
}`,...(xe=(Ae=M.parameters)==null?void 0:Ae.docs)==null?void 0:xe.source}}};var _e,ve,Oe;F.parameters={...F.parameters,docs:{...(_e=F.parameters)==null?void 0:_e.docs,source:{originalSource:`{
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
}`,...(Oe=(ve=F.parameters)==null?void 0:ve.docs)==null?void 0:Oe.source}}};var Me,Fe,Ee;E.parameters={...E.parameters,docs:{...(Me=E.parameters)==null?void 0:Me.docs,source:{originalSource:`{
  name: 'NL Mode — with stub client',
  render: () => <NlModeWrapper />,
  parameters: {
    docs: {
      description: {
        story: 'FilterBar in #191 NL mode driven by a deterministic stub LLM client. Typing a recognised phrase applies chips; typing one of the 7 failure keywords renders the matching banner. Used by the E2E suite for theme + interaction screenshots.'
      }
    }
  }
}`,...(Ee=(Fe=E.parameters)==null?void 0:Fe.docs)==null?void 0:Ee.source}}};const rt=["Empty","SingleFilter","MultipleAND","OrGroup","Interactive","AllFilterTypes","ZeroResults","WithPlatformChip","PlatformChipPlusTag","PlatformChipOrGroup","VesselTaxonomyNavigation","VesselTaxonomySearch","VesselTaxonomyCounts","VesselTaxonomyBranchSelection","QuickSearchDemo","WithSavedFilters","NlModeWithStubClient"];export{T as AllFilterTypes,m as Empty,g as Interactive,h as MultipleAND,E as NlModeWithStubClient,y as OrGroup,A as PlatformChipOrGroup,C as PlatformChipPlusTag,M as QuickSearchDemo,u as SingleFilter,O as VesselTaxonomyBranchSelection,v as VesselTaxonomyCounts,x as VesselTaxonomyNavigation,_ as VesselTaxonomySearch,S as WithPlatformChip,F as WithSavedFilters,f as ZeroResults,rt as __namedExportsOrder,tt as default};
