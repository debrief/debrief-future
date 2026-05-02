import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r as l}from"./index-B2-qRKKC.js";import{F as p,I as Ye}from"./FilterBar-CUTO5rAZ.js";import{T as Qe}from"./ThemeProvider-DF0jq0Ad.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./index-kS-9iBlu.js";import"./CascadingMenu-BgTnOB60.js";import"./defaultTheme-Tx6C8nph.js";function d(r,s={}){return{id:r,title:`Exercise ${r}`,itemPath:`/catalog/${r}/item.json`,bbox:null,datetime:null,startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-01T12:00:00Z",platforms:[],tags:[],featureTags:[],author:null,collection:null,modified:null,...s}}const t=[d("ex-001",{title:"CASEX Alpha",platforms:[{id:"ARGYLL",name:"HMS Argyll",nationality:"FR",vessel_class:"surface/warship/frigate/type23",vessel_role:"frigate",domain:"surface"},{id:"CONTACT-BRAVO",name:"Contact Bravo",domain:"unknown"}],tags:["convoy","blue-water"],author:"CDR Smith",collection:"exercises-2024",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-01T04:00:00Z"}),d("ex-002",{title:"CASEX Bravo",platforms:[{id:"DIAMOND",name:"HMS Diamond",nationality:"GB",vessel_class:"surface/warship/destroyer/type45",vessel_role:"destroyer",domain:"surface"},{id:"UNKNOWN-ALPHA",name:"Unknown Alpha",domain:"unknown"}],tags:["asw","shallow-water"],author:"CDR Jones",collection:"exercises-2024",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-02T12:00:00Z"}),d("ex-003",{title:"GROUPEX Charlie",platforms:[{id:"ARGYLL",name:"HMS Argyll",nationality:"GB",vessel_class:"surface/warship/frigate/type23",vessel_role:"frigate",domain:"surface"},{id:"DIAMOND",name:"HMS Diamond",nationality:"GB",vessel_class:"surface/warship/destroyer/type45",vessel_role:"destroyer",domain:"surface"},{id:"AQUITAINE",name:"FS Aquitaine",nationality:"FR",vessel_class:"surface/warship/frigate/type23",vessel_role:"frigate",domain:"surface"}],tags:["convoy","asw"],author:"CDR Smith",featureTags:["high-priority","reviewed"],collection:"exercises-2024",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-04T00:00:00Z"}),d("ex-004",{title:"TACEX Delta",platforms:[{id:"SACHSEN",name:"FGS Sachsen",nationality:"DE",vessel_class:"surface/warship/frigate/type26",vessel_role:"frigate",domain:"surface"}],tags:["surface-action"],author:"CDR Mueller",collection:"training-2025",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-15T00:00:00Z"}),d("ex-005",{title:"ASW Exercise Echo",platforms:[{id:"RUBIS",name:"FS Rubis",nationality:"FR",vessel_class:"subsurface/submarine/ssn",vessel_role:"ssn",domain:"subsurface"}],tags:["asw"],author:"CDR Dupont",collection:"training-2025",startDatetime:"2025-06-01T00:00:00Z",endDatetime:"2025-06-01T02:00:00Z"})],a=[{id:"surface",label:"Surface",children:[{id:"warship",label:"Warship",children:[{id:"frigate",label:"Frigate",children:[{id:"type23",label:"Type 23"},{id:"type26",label:"Type 26"}]},{id:"destroyer",label:"Destroyer",children:[{id:"type45",label:"Type 45"}]}]}]},{id:"submarine",label:"Submarine",children:[{id:"nuclear",label:"Nuclear",children:[{id:"ssn",label:"SSN"},{id:"ssbn",label:"SSBN"}]}]}];function n({items:r,taxonomy:s,initialFilterState:i}){const[o,c]=l.useState(r.length),D=l.useCallback(m=>{c(m.length)},[]);return e.jsxs("div",{children:[e.jsx(p,{items:r,taxonomy:s,onFilteredItems:D,initialFilterState:i}),e.jsxs("div",{style:{padding:"8px 12px",fontSize:"12px",color:"var(--vscode-descriptionForeground, #666)"},children:["Showing ",o," of ",r.length," exercises"]})]})}const He={items:[{kind:"lozenge",shape:"simple",id:"story-1",filterType:"nationality",value:"French"}]},qe={items:[{kind:"lozenge",shape:"simple",id:"story-1",filterType:"nationality",value:"French"},{kind:"lozenge",shape:"simple",id:"story-2",filterType:"tag",value:"asw"}]},Je={items:[{kind:"or-container",id:"story-or-1",children:[{kind:"lozenge",shape:"simple",id:"story-or-c1",filterType:"nationality",value:"French"},{kind:"lozenge",shape:"simple",id:"story-or-c2",filterType:"nationality",value:"British"}]},{kind:"lozenge",shape:"simple",id:"story-3",filterType:"tag",value:"convoy"}]},$e={items:[{kind:"lozenge",shape:"simple",id:"story-t1",filterType:"vessel-class",value:"surface/warship/frigate/type23"},{kind:"lozenge",shape:"simple",id:"story-t2",filterType:"tag",value:"asw"},{kind:"lozenge",shape:"simple",id:"story-t3",filterType:"author",value:"CDR Smith"},{kind:"lozenge",shape:"simple",id:"story-t4",filterType:"nationality",value:"French"},{kind:"lozenge",shape:"simple",id:"story-t5",filterType:"duration",value:"<24H"},{kind:"lozenge",shape:"simple",id:"story-t6",filterType:"title",value:"CASEX"}]},er={items:[{kind:"lozenge",shape:"simple",id:"story-z1",filterType:"nationality",value:"German"},{kind:"lozenge",shape:"simple",id:"story-z2",filterType:"author",value:"CDR Smith"}]},rr={items:[{kind:"lozenge",shape:"platform",id:"story-p1",filterType:"platform",attributes:{nationality:"GB",domain:"subsurface"}}]},tr={items:[{kind:"lozenge",shape:"platform",id:"story-p2",filterType:"platform",attributes:{nationality:"GB",vessel_role:"frigate"}},{kind:"lozenge",shape:"simple",id:"story-t-exercise",filterType:"tag",value:"convoy"}]},ar={items:[{kind:"or-container",id:"story-or-plat",children:[{kind:"lozenge",shape:"platform",id:"story-p3",filterType:"platform",attributes:{nationality:"GB",domain:"subsurface"}},{kind:"lozenge",shape:"platform",id:"story-p4",filterType:"platform",attributes:{nationality:"DE",vessel_role:"frigate"}}]}]},Sr={title:"FilterBar",component:p,parameters:{layout:"padded",docs:{description:{component:"Persistent filter bar with lozenge UI, AND/OR logic, and drag-to-group support. All 10 SRD filter types with type-specific input methods."}}},tags:["autodocs"],decorators:[r=>e.jsx(Qe,{children:e.jsx(r,{})})]},u={render:()=>e.jsx(n,{items:t,taxonomy:a})},h={name:"Single Filter",render:()=>e.jsx(n,{items:t,taxonomy:a,initialFilterState:He}),parameters:{docs:{description:{story:"Click (+) and select a filter type, then choose a value. A lozenge appears and results narrow."}}}},y={name:"Multiple AND Filters",render:()=>e.jsx(n,{items:t,taxonomy:a,initialFilterState:qe}),parameters:{docs:{description:{story:"Add multiple filters — they combine with AND logic. Only exercises matching ALL filters appear."}}}},g={name:"OR Group",render:()=>e.jsx(n,{items:t,taxonomy:a,initialFilterState:Je}),parameters:{docs:{description:{story:'Click (+) → "OR group" to create an OR container. Add filters inside or drag existing lozenges into it.'}}}},f={name:"Interactive",render:()=>e.jsx(n,{items:t,taxonomy:a}),parameters:{docs:{description:{story:"Full interactive demo: add, edit, remove, drag to OR group. Try building complex queries like (French OR British) AND convoy."}}}},T={name:"All Filter Types",render:()=>e.jsx(n,{items:t,taxonomy:a,initialFilterState:$e}),parameters:{docs:{description:{story:"Try all 10 filter types: Vessel Class (hierarchical), Plot Tag/Feature Tag/Author/Track Name/Nationality/Collection (dropdowns), Duration (buckets), Title/Plot Contents (free-text)."}}}},S={name:"Zero Results",render:()=>e.jsx(n,{items:t,taxonomy:a,initialFilterState:er}),parameters:{docs:{description:{story:'Add incompatible filters (e.g., Nationality: German + Author: CDR Smith) to see the "0 of 5" state.'}}}},b={name:"With Platform Chip",render:()=>e.jsx(n,{items:t,taxonomy:a,initialFilterState:rr}),parameters:{docs:{description:{story:'Compound "GB + Subsurface" platform chip (#186). The chip serialises to one `array_filter` CQL2 node over `debrief:platforms`, matching only plots where a single platform record satisfies all selected attributes.'}}}},v={name:"Platform Chip + Tag",render:()=>e.jsx(n,{items:t,taxonomy:a,initialFilterState:tr}),parameters:{docs:{description:{story:"A platform chip alongside a tag chip. Combines via top-level AND: only items with a matching platform AND the required tag appear."}}}},x={name:"Platform Chips in an OR Group",render:()=>e.jsx(n,{items:t,taxonomy:a,initialFilterState:ar}),parameters:{docs:{description:{story:'Two platform chips inside an OR container: "British submarines OR German frigates".'}}}},sr={items:[{kind:"lozenge",id:"vc-1",filterType:"vessel-class",value:"surface/warship/frigate/type23"}]},ir={items:[{kind:"lozenge",id:"vc-branch",filterType:"vessel-class",value:"surface/warship"}]},M={name:"Vessel Taxonomy Navigation",render:()=>e.jsx(n,{items:t,taxonomy:a,initialFilterState:sr}),parameters:{docs:{description:{story:'Vessel class lozenge displays human-readable label "Type 23" (not raw path). Click the lozenge to re-edit — the current selection is marked with ✓ in the dropdown.'}}}},C={name:"Vessel Taxonomy Search",render:()=>e.jsx(n,{items:t,taxonomy:a}),parameters:{docs:{description:{story:'Click (+) → Vessel Class to open the dropdown. A search input appears above the tree. Type to filter — e.g., "type 23" shows only matching nodes with ancestor paths preserved.'}}}},A={name:"Vessel Taxonomy Counts",render:()=>e.jsx(n,{items:t,taxonomy:a}),parameters:{docs:{description:{story:'Click (+) → Vessel Class. Each node shows a count badge (e.g., "Surface (4)"). Nodes with zero matches are dimmed and disabled. Counts update as other filters narrow the data set.'}}}},O={name:"Vessel Taxonomy Branch Selection",render:()=>e.jsx(n,{items:t,taxonomy:a,initialFilterState:ir}),parameters:{docs:{description:{story:'Branch node "Warship" selected — lozenge shows "Vessel Class: Warship". Filtering matches all warship subtypes (frigates, destroyers). Click the lozenge to see "Warship" marked as current.'}}}},_={name:"Quick Search",render:()=>e.jsx(n,{items:t,taxonomy:a}),parameters:{docs:{description:{story:'Type in the Quick Search box to filter exercises by title in real-time. Press Enter to "graduate" the search into a title lozenge. Press Escape to clear. Keyboard shortcuts: "/" or Ctrl+F to focus.'}}}},k={name:"With Saved Filters",render:()=>{const r=new Ye({version:1,configurations:[{id:"demo-saved-1",name:"French Exercises",filterBarState:He,cql2Json:{},createdAt:"2026-03-01T10:00:00.000Z",updatedAt:"2026-03-01T10:00:00.000Z"}]});return e.jsx("div",{children:e.jsx(p,{items:t,taxonomy:a,onFilteredItems:()=>{},savedFiltersStorage:r})})},parameters:{docs:{description:{story:"FilterBar with saved filters integration. Use Save to persist and Historic Filters to restore."}}}},Xe={vessel_class_tree:{},nationalities:["GB","FR","DE"],exercise_names:[],tags:["alpha","beta"],feature_tags:[],_meta:{canonicalisation:"storybook-stub",exercise_parse_rule:"storybook-stub",generated_from_catalog:"storybook-stub",generated_from_registry:"storybook-stub",tool:"storybook-stub"}},nr=[["auth-failure",{kind:"auth-failure",providerStatus:401,durationMs:42}],["rate-limit",{kind:"rate-limit",providerStatus:429,retryAfterSeconds:30,durationMs:42}],["provider-error",{kind:"provider-error",providerStatus:502,durationMs:42}],["timeout",{kind:"timeout",durationMs:12e3}],["malformed",{kind:"malformed-response",reason:"non-json",durationMs:42,responseBytes:128}],["not-configured",{kind:"not-configured",reason:"no-key",durationMs:0}],["ceiling-reached",{kind:"ceiling-reached",ceiling:50,durationMs:0}]];function or(r){const s=r.toLowerCase(),i=[];/\buk|british|royal navy\b/.test(s)&&i.push({filterType:"nationality",value:"GB"}),/french|france/.test(s)&&i.push({filterType:"nationality",value:"FR"}),/german|germany|bundes/.test(s)&&i.push({filterType:"nationality",value:"DE"}),i.length===0&&i.push({filterType:"title",value:r});const o=JSON.stringify({cql2:{},lozenges:i,unrecognised_terms:[]});return{kind:"success",rawResponse:o,durationMs:42,responseBytes:o.length,model:"claude-haiku-4-5-20251001"}}function lr(r={}){let s=!1;return{async generate(i){s=!1;const o=i.match(/Phrase:\s*(.*)$/m),c=(o==null?void 0:o[1])??i,D=c.toLowerCase(),m=r.latencyMs??200;if(await new Promise(B=>setTimeout(B,m)),s)return{kind:"transport-error",reason:"cancelled",durationMs:m};for(const[B,Ze]of nr)if(D.includes(B))return Ze;return or(c)},abort(){s=!0}}}function cr(){const[r,s]=l.useState(t.length),i=l.useCallback(c=>{s(c.length)},[]),[o]=l.useState(()=>lr({latencyMs:300}));return e.jsxs("div",{children:[e.jsx(p,{items:t,taxonomy:a,onFilteredItems:i,llmClient:o,nlEnums:Xe,liveModeLabel:"Live · Anthropic · claude-haiku-4-5-20251001 (stub)"}),e.jsxs("div",{style:{padding:"8px 12px",fontSize:"12px",color:"var(--vscode-descriptionForeground, #666)"},children:[e.jsxs("div",{children:["Showing ",r," of ",t.length," exercises"]}),e.jsx("div",{style:{marginTop:4,opacity:.7},children:"Try: “UK submarines”, “French frigates”, “auth-failure”, “timeout”, “rate-limit”, “malformed”, “ceiling-reached”."})]})]})}const F={name:"NL Mode — with stub client",render:()=>e.jsx(cr,{}),parameters:{docs:{description:{story:"FilterBar in #191 NL mode driven by a deterministic stub LLM client. Typing a recognised phrase applies chips; typing one of the 7 failure keywords renders the matching banner. Used by the E2E suite for theme + interaction screenshots."}}}};function dr(r){return{async generate(){return await new Promise(s=>setTimeout(s,100)),{kind:"keyring-unavailable",platformHint:r,durationMs:0}},abort(){}}}function R({platformHint:r}){const[s]=l.useState(()=>dr(r)),i=l.useCallback(o=>{console.info(`[storybook] banner action dispatched: ${o}`)},[]);return e.jsxs("div",{children:[e.jsx(p,{items:t,taxonomy:a,onFilteredItems:()=>{},llmClient:s,nlEnums:Xe,liveModeLabel:"Live · Anthropic · claude-haiku-4-5-20251001 (stub)",onBannerAction:i}),e.jsxs("div",{style:{padding:"8px 12px",fontSize:"12px",color:"var(--vscode-descriptionForeground, #666)"},children:["Submit any phrase — the stub returns",e.jsxs("code",{children:[' kind: "keyring-unavailable", platformHint: "',r,'" ']}),"once. The banner's headline stays OS-neutral; the platform hint paragraph (when not ",e.jsx("code",{children:"unknown"}),") names the appropriate OS keyring tool."]})]})}const E={name:"NL Mode — keyring-unavailable (Linux)",render:()=>e.jsx(R,{platformHint:"linux"}),parameters:{docs:{description:{story:"#198 — Linux keyring-unavailable banner. Headline names the OS keyring (not the API key); body has a Linux-specific hint paragraph; primary action opens troubleshooting help; secondary action opens settings (deliberately NOT primary, to avoid misdirecting the analyst into re-entering a key that is already saved)."}}}},N={name:"NL Mode — keyring-unavailable (macOS)",render:()=>e.jsx(R,{platformHint:"macos"}),parameters:{docs:{description:{story:"#198 — macOS variant. Same banner, hint paragraph names Keychain Access."}}}},w={name:"NL Mode — keyring-unavailable (Windows)",render:()=>e.jsx(R,{platformHint:"windows"}),parameters:{docs:{description:{story:"#198 — Windows variant. Same banner, hint paragraph names Credential Manager."}}}},L={name:"NL Mode — keyring-unavailable (unknown OS)",render:()=>e.jsx(R,{platformHint:"unknown"}),parameters:{docs:{description:{story:"#198 — fallback variant for unrecognised platforms. The platform-specific hint paragraph is suppressed (no placeholder text), but the banner remains usable with the same primary/secondary actions."}}}};var K,I,W;u.parameters={...u.parameters,docs:{...(K=u.parameters)==null?void 0:K.docs,source:{originalSource:`{
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />
}`,...(W=(I=u.parameters)==null?void 0:I.docs)==null?void 0:W.source}}};var P,z,j;h.parameters={...h.parameters,docs:{...(P=h.parameters)==null?void 0:P.docs,source:{originalSource:`{
  name: 'Single Filter',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={SINGLE_FILTER_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Click (+) and select a filter type, then choose a value. A lozenge appears and results narrow.'
      }
    }
  }
}`,...(j=(z=h.parameters)==null?void 0:z.docs)==null?void 0:j.source}}};var U,G,V;y.parameters={...y.parameters,docs:{...(U=y.parameters)==null?void 0:U.docs,source:{originalSource:`{
  name: 'Multiple AND Filters',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={MULTIPLE_AND_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Add multiple filters — they combine with AND logic. Only exercises matching ALL filters appear.'
      }
    }
  }
}`,...(V=(G=y.parameters)==null?void 0:G.docs)==null?void 0:V.source}}};var H,X,Z;g.parameters={...g.parameters,docs:{...(H=g.parameters)==null?void 0:H.docs,source:{originalSource:`{
  name: 'OR Group',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={OR_GROUP_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Click (+) → "OR group" to create an OR container. Add filters inside or drag existing lozenges into it.'
      }
    }
  }
}`,...(Z=(X=g.parameters)==null?void 0:X.docs)==null?void 0:Z.source}}};var Y,Q,q;f.parameters={...f.parameters,docs:{...(Y=f.parameters)==null?void 0:Y.docs,source:{originalSource:`{
  name: 'Interactive',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />,
  parameters: {
    docs: {
      description: {
        story: 'Full interactive demo: add, edit, remove, drag to OR group. Try building complex queries like (French OR British) AND convoy.'
      }
    }
  }
}`,...(q=(Q=f.parameters)==null?void 0:Q.docs)==null?void 0:q.source}}};var J,$,ee;T.parameters={...T.parameters,docs:{...(J=T.parameters)==null?void 0:J.docs,source:{originalSource:`{
  name: 'All Filter Types',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={ALL_TYPES_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Try all 10 filter types: Vessel Class (hierarchical), Plot Tag/Feature Tag/Author/Track Name/Nationality/Collection (dropdowns), Duration (buckets), Title/Plot Contents (free-text).'
      }
    }
  }
}`,...(ee=($=T.parameters)==null?void 0:$.docs)==null?void 0:ee.source}}};var re,te,ae;S.parameters={...S.parameters,docs:{...(re=S.parameters)==null?void 0:re.docs,source:{originalSource:`{
  name: 'Zero Results',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={ZERO_RESULTS_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Add incompatible filters (e.g., Nationality: German + Author: CDR Smith) to see the "0 of 5" state.'
      }
    }
  }
}`,...(ae=(te=S.parameters)==null?void 0:te.docs)==null?void 0:ae.source}}};var se,ie,ne;b.parameters={...b.parameters,docs:{...(se=b.parameters)==null?void 0:se.docs,source:{originalSource:`{
  name: 'With Platform Chip',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={PLATFORM_CHIP_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Compound "GB + Subsurface" platform chip (#186). The chip serialises to one ' + '\`array_filter\` CQL2 node over \`debrief:platforms\`, matching only plots where a ' + 'single platform record satisfies all selected attributes.'
      }
    }
  }
}`,...(ne=(ie=b.parameters)==null?void 0:ie.docs)==null?void 0:ne.source}}};var oe,le,ce;v.parameters={...v.parameters,docs:{...(oe=v.parameters)==null?void 0:oe.docs,source:{originalSource:`{
  name: 'Platform Chip + Tag',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={PLATFORM_AND_TAG_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'A platform chip alongside a tag chip. Combines via top-level AND: only items with ' + 'a matching platform AND the required tag appear.'
      }
    }
  }
}`,...(ce=(le=v.parameters)==null?void 0:le.docs)==null?void 0:ce.source}}};var de,pe,me;x.parameters={...x.parameters,docs:{...(de=x.parameters)==null?void 0:de.docs,source:{originalSource:`{
  name: 'Platform Chips in an OR Group',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={PLATFORM_OR_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Two platform chips inside an OR container: "British submarines OR German frigates".'
      }
    }
  }
}`,...(me=(pe=x.parameters)==null?void 0:pe.docs)==null?void 0:me.source}}};var ue,he,ye;M.parameters={...M.parameters,docs:{...(ue=M.parameters)==null?void 0:ue.docs,source:{originalSource:`{
  name: 'Vessel Taxonomy Navigation',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={VESSEL_CLASS_SELECTED_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Vessel class lozenge displays human-readable label "Type 23" (not raw path). Click the lozenge to re-edit — the current selection is marked with ✓ in the dropdown.'
      }
    }
  }
}`,...(ye=(he=M.parameters)==null?void 0:he.docs)==null?void 0:ye.source}}};var ge,fe,Te;C.parameters={...C.parameters,docs:{...(ge=C.parameters)==null?void 0:ge.docs,source:{originalSource:`{
  name: 'Vessel Taxonomy Search',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />,
  parameters: {
    docs: {
      description: {
        story: 'Click (+) → Vessel Class to open the dropdown. A search input appears above the tree. Type to filter — e.g., "type 23" shows only matching nodes with ancestor paths preserved.'
      }
    }
  }
}`,...(Te=(fe=C.parameters)==null?void 0:fe.docs)==null?void 0:Te.source}}};var Se,be,ve;A.parameters={...A.parameters,docs:{...(Se=A.parameters)==null?void 0:Se.docs,source:{originalSource:`{
  name: 'Vessel Taxonomy Counts',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />,
  parameters: {
    docs: {
      description: {
        story: 'Click (+) → Vessel Class. Each node shows a count badge (e.g., "Surface (4)"). Nodes with zero matches are dimmed and disabled. Counts update as other filters narrow the data set.'
      }
    }
  }
}`,...(ve=(be=A.parameters)==null?void 0:be.docs)==null?void 0:ve.source}}};var xe,Me,Ce;O.parameters={...O.parameters,docs:{...(xe=O.parameters)==null?void 0:xe.docs,source:{originalSource:`{
  name: 'Vessel Taxonomy Branch Selection',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} initialFilterState={BRANCH_SELECTED_STATE} />,
  parameters: {
    docs: {
      description: {
        story: 'Branch node "Warship" selected — lozenge shows "Vessel Class: Warship". Filtering matches all warship subtypes (frigates, destroyers). Click the lozenge to see "Warship" marked as current.'
      }
    }
  }
}`,...(Ce=(Me=O.parameters)==null?void 0:Me.docs)==null?void 0:Ce.source}}};var Ae,Oe,_e;_.parameters={..._.parameters,docs:{...(Ae=_.parameters)==null?void 0:Ae.docs,source:{originalSource:`{
  name: 'Quick Search',
  render: () => <FilterBarWrapper items={MOCK_ITEMS} taxonomy={MOCK_TAXONOMY} />,
  parameters: {
    docs: {
      description: {
        story: 'Type in the Quick Search box to filter exercises by title in real-time. ' + 'Press Enter to "graduate" the search into a title lozenge. ' + 'Press Escape to clear. Keyboard shortcuts: "/" or Ctrl+F to focus.'
      }
    }
  }
}`,...(_e=(Oe=_.parameters)==null?void 0:Oe.docs)==null?void 0:_e.source}}};var ke,Fe,Ee;k.parameters={...k.parameters,docs:{...(ke=k.parameters)==null?void 0:ke.docs,source:{originalSource:`{
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
}`,...(Ee=(Fe=k.parameters)==null?void 0:Fe.docs)==null?void 0:Ee.source}}};var Ne,we,Le;F.parameters={...F.parameters,docs:{...(Ne=F.parameters)==null?void 0:Ne.docs,source:{originalSource:`{
  name: 'NL Mode — with stub client',
  render: () => <NlModeWrapper />,
  parameters: {
    docs: {
      description: {
        story: 'FilterBar in #191 NL mode driven by a deterministic stub LLM client. Typing a recognised phrase applies chips; typing one of the 7 failure keywords renders the matching banner. Used by the E2E suite for theme + interaction screenshots.'
      }
    }
  }
}`,...(Le=(we=F.parameters)==null?void 0:we.docs)==null?void 0:Le.source}}};var Re,De,Be;E.parameters={...E.parameters,docs:{...(Re=E.parameters)==null?void 0:Re.docs,source:{originalSource:`{
  name: 'NL Mode — keyring-unavailable (Linux)',
  render: () => <NlKeyringUnavailableWrapper platformHint="linux" />,
  parameters: {
    docs: {
      description: {
        story: '#198 — Linux keyring-unavailable banner. Headline names the OS keyring (not the API key); body has a Linux-specific hint paragraph; primary action opens troubleshooting help; secondary action opens settings (deliberately NOT primary, to avoid misdirecting the analyst into re-entering a key that is already saved).'
      }
    }
  }
}`,...(Be=(De=E.parameters)==null?void 0:De.docs)==null?void 0:Be.source}}};var Ke,Ie,We;N.parameters={...N.parameters,docs:{...(Ke=N.parameters)==null?void 0:Ke.docs,source:{originalSource:`{
  name: 'NL Mode — keyring-unavailable (macOS)',
  render: () => <NlKeyringUnavailableWrapper platformHint="macos" />,
  parameters: {
    docs: {
      description: {
        story: '#198 — macOS variant. Same banner, hint paragraph names Keychain Access.'
      }
    }
  }
}`,...(We=(Ie=N.parameters)==null?void 0:Ie.docs)==null?void 0:We.source}}};var Pe,ze,je;w.parameters={...w.parameters,docs:{...(Pe=w.parameters)==null?void 0:Pe.docs,source:{originalSource:`{
  name: 'NL Mode — keyring-unavailable (Windows)',
  render: () => <NlKeyringUnavailableWrapper platformHint="windows" />,
  parameters: {
    docs: {
      description: {
        story: '#198 — Windows variant. Same banner, hint paragraph names Credential Manager.'
      }
    }
  }
}`,...(je=(ze=w.parameters)==null?void 0:ze.docs)==null?void 0:je.source}}};var Ue,Ge,Ve;L.parameters={...L.parameters,docs:{...(Ue=L.parameters)==null?void 0:Ue.docs,source:{originalSource:`{
  name: 'NL Mode — keyring-unavailable (unknown OS)',
  render: () => <NlKeyringUnavailableWrapper platformHint="unknown" />,
  parameters: {
    docs: {
      description: {
        story: '#198 — fallback variant for unrecognised platforms. The platform-specific hint paragraph is suppressed (no placeholder text), but the banner remains usable with the same primary/secondary actions.'
      }
    }
  }
}`,...(Ve=(Ge=L.parameters)==null?void 0:Ge.docs)==null?void 0:Ve.source}}};const br=["Empty","SingleFilter","MultipleAND","OrGroup","Interactive","AllFilterTypes","ZeroResults","WithPlatformChip","PlatformChipPlusTag","PlatformChipOrGroup","VesselTaxonomyNavigation","VesselTaxonomySearch","VesselTaxonomyCounts","VesselTaxonomyBranchSelection","QuickSearchDemo","WithSavedFilters","NlModeWithStubClient","NlModeKeyringUnavailable","NlModeKeyringUnavailableMacos","NlModeKeyringUnavailableWindows","NlModeKeyringUnavailableUnknown"];export{T as AllFilterTypes,u as Empty,f as Interactive,y as MultipleAND,E as NlModeKeyringUnavailable,N as NlModeKeyringUnavailableMacos,L as NlModeKeyringUnavailableUnknown,w as NlModeKeyringUnavailableWindows,F as NlModeWithStubClient,g as OrGroup,x as PlatformChipOrGroup,v as PlatformChipPlusTag,_ as QuickSearchDemo,h as SingleFilter,O as VesselTaxonomyBranchSelection,A as VesselTaxonomyCounts,M as VesselTaxonomyNavigation,C as VesselTaxonomySearch,b as WithPlatformChip,k as WithSavedFilters,S as ZeroResults,br as __namedExportsOrder,Sr as default};
