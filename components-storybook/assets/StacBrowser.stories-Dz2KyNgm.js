import{j as n}from"./jsx-runtime-DF2Pcvd1.js";import{S as w}from"./StacBrowser-BIa16d7g.js";import{T as _}from"./ThemeProvider-47c8oKUw.js";import"./index-B2-qRKKC.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./client-CMlFXbYy.js";import"./index-kS-9iBlu.js";import"./interval-BLw0Yh9p.js";import"./types-CuJnRqfe.js";import"./bounds-BbBIf5Id.js";import"./TileLayer-Cckmdc0V.js";import"./TimelineView-DZw56FzU.js";import"./FilterBar-BqSomdWF.js";import"./CascadingMenu-BgTnOB60.js";import"./ExerciseListView-CXJ54syZ.js";import"./index-CHJUuggG.js";import"./defaultTheme-lXwsM3al.js";function a(t,e={}){return{id:t,title:`Exercise ${t}`,itemPath:`/catalog/${t}/item.json`,bbox:null,datetime:null,startDatetime:"2025-01-01T00:00:00Z",endDatetime:"2025-01-15T00:00:00Z",platforms:[],tags:[],featureTags:[],author:null,collection:null,modified:null,...e}}const A=[a("ex-001",{title:"North Atlantic Patrol",bbox:[-20,50,-10,60],startDatetime:"2025-01-01T00:00:00Z",endDatetime:"2025-01-15T00:00:00Z",platforms:[{id:"ARGYLL",name:"HMS Argyll",nationality:"GB",vessel_class:"surface/warship/frigate/type23",vessel_role:"frigate",domain:"surface"},{id:"CONTACT-ALPHA",name:"Contact Alpha",domain:"unknown"}],tags:["asw","blue-water"],author:"CDR Smith",collection:"exercises-2025"}),a("ex-002",{title:"Mediterranean Carrier Strike",bbox:[10,30,30,40],startDatetime:"2025-02-01T00:00:00Z",endDatetime:"2025-03-15T00:00:00Z",platforms:[{id:"DIAMOND",name:"HMS Diamond",nationality:"GB",vessel_class:"surface/warship/destroyer/type45",vessel_role:"destroyer",domain:"surface"},{id:"AQUITAINE",name:"FS Aquitaine",nationality:"FR",vessel_class:"surface/warship/frigate/type23",vessel_role:"frigate",domain:"surface"}],tags:["carrier-ops","blue-water"],author:"CDR Jones",collection:"exercises-2025"}),a("ex-003",{title:"Pacific Submarine Exercise",bbox:[140,20,160,40],startDatetime:"2025-03-01T00:00:00Z",endDatetime:"2025-04-01T00:00:00Z",platforms:[{id:"SORYU",name:"JS Soryu",nationality:"JP",vessel_class:"subsurface/submarine/ssn",vessel_role:"ssn",domain:"subsurface"}],tags:["asw"],author:"CDR Tanaka",collection:"training-2025"}),a("ex-004",{title:"Baltic Surface Action",bbox:[15,54,25,60],startDatetime:"2025-01-15T00:00:00Z",endDatetime:"2025-02-15T00:00:00Z",platforms:[{id:"SACHSEN",name:"FGS Sachsen",nationality:"DE",vessel_class:"surface/warship/frigate/type26",vessel_role:"frigate",domain:"surface"}],tags:["surface-action"],author:"CDR Mueller",collection:"exercises-2025"}),a("ex-005",{title:"Exercise Without Bbox",bbox:null,startDatetime:"2025-01-10T00:00:00Z",endDatetime:"2025-01-20T00:00:00Z",platforms:[{id:"ARGYLL",name:"HMS Argyll",nationality:"GB",vessel_class:"surface/warship/frigate/type23",domain:"surface"}],tags:["tabletop"],author:"CDR Williams"}),a("ex-006",{title:"Exercise Without Time",bbox:[-5,50,5,55],datetime:null,startDatetime:null,endDatetime:null,platforms:[{id:"AQUITAINE",name:"FS Aquitaine",nationality:"FR",vessel_class:"surface/warship/frigate/type23",domain:"surface"}],tags:["historical"]})],o=[{id:"surface",label:"Surface",children:[{id:"warship",label:"Warship",children:[{id:"frigate",label:"Frigate",children:[{id:"type23",label:"Type 23"},{id:"type26",label:"Type 26"}]},{id:"destroyer",label:"Destroyer",children:[{id:"type45",label:"Type 45"}]}]}]},{id:"submarine",label:"Submarine",children:[{id:"nuclear",label:"Nuclear",children:[{id:"ssn",label:"SSN"},{id:"ssbn",label:"SSBN"}]}]}],k={title:"Browser/StacBrowser",component:w,decorators:[t=>n.jsx(_,{children:n.jsx("div",{style:{height:"100vh",width:"100%"},children:n.jsx(t,{})})})],parameters:{layout:"fullscreen"}},r={args:{items:A,taxonomy:o,onItemSelect:t=>console.log("Selected:",t)}},s={args:{items:[],taxonomy:o,onItemSelect:t=>console.log("Selected:",t)}},i={args:{items:Array.from({length:50},(t,e)=>a(`ex-${String(e+1).padStart(3,"0")}`,{title:`Exercise ${e+1}`,bbox:[-180+e*7%360,-60+e*3%120,-170+e*7%360,-50+e*3%120],startDatetime:new Date(2024,0,1+e*7).toISOString(),endDatetime:new Date(2024,0,8+e*7).toISOString(),platforms:e%3===0?[{id:`SC${String(e).padStart(2,"0")}`,name:`Submerged Contact ${String(e).padStart(2,"0")}`,vessel_class:"subsurface/submarine/ssn",domain:"subsurface"}]:[{id:`FRG${String(e).padStart(2,"0")}`,nationality:["GB","FR","DE","JP"][e%4],vessel_class:"surface/warship/frigate/type23",domain:"surface"}]})),taxonomy:o}};var l,c,m,d,p;r.parameters={...r.parameters,docs:{...(l=r.parameters)==null?void 0:l.docs,source:{originalSource:`{
  args: {
    items: MOCK_ITEMS,
    taxonomy: MOCK_TAXONOMY,
    onItemSelect: (itemPath: string) => console.log('Selected:', itemPath)
  }
}`,...(m=(c=r.parameters)==null?void 0:c.docs)==null?void 0:m.source},description:{story:"Default view with all exercises and no filters active.",...(p=(d=r.parameters)==null?void 0:d.docs)==null?void 0:p.description}}};var u,f,S,g,b;s.parameters={...s.parameters,docs:{...(u=s.parameters)==null?void 0:u.docs,source:{originalSource:`{
  args: {
    items: [],
    taxonomy: MOCK_TAXONOMY,
    onItemSelect: (itemPath: string) => console.log('Selected:', itemPath)
  }
}`,...(S=(f=s.parameters)==null?void 0:f.docs)==null?void 0:S.source},description:{story:"View with zero exercises — demonstrates empty state handling.",...(b=(g=s.parameters)==null?void 0:g.docs)==null?void 0:b.description}}};var h,y,x,D,T;i.parameters={...i.parameters,docs:{...(h=i.parameters)==null?void 0:h.docs,source:{originalSource:`{
  args: {
    items: Array.from({
      length: 50
    }, (_, i) => makeItem(\`ex-\${String(i + 1).padStart(3, '0')}\`, {
      title: \`Exercise \${i + 1}\`,
      bbox: [-180 + i * 7 % 360, -60 + i * 3 % 120, -170 + i * 7 % 360, -50 + i * 3 % 120],
      startDatetime: new Date(2024, 0, 1 + i * 7).toISOString(),
      endDatetime: new Date(2024, 0, 8 + i * 7).toISOString(),
      platforms: i % 3 === 0 ? [{
        id: \`SC\${String(i).padStart(2, '0')}\`,
        name: \`Submerged Contact \${String(i).padStart(2, '0')}\`,
        vessel_class: 'subsurface/submarine/ssn',
        domain: 'subsurface'
      }] satisfies PlatformRecord[] : [{
        id: \`FRG\${String(i).padStart(2, '0')}\`,
        nationality: ['GB', 'FR', 'DE', 'JP'][i % 4],
        vessel_class: 'surface/warship/frigate/type23',
        domain: 'surface'
      }] satisfies PlatformRecord[]
    })),
    taxonomy: MOCK_TAXONOMY
  }
}`,...(x=(y=i.parameters)==null?void 0:y.docs)==null?void 0:x.source},description:{story:"View with many exercises for scroll/performance testing.",...(T=(D=i.parameters)==null?void 0:D.docs)==null?void 0:T.description}}};const H=["Default","ZeroResults","ManyExercises"];export{r as Default,i as ManyExercises,s as ZeroResults,H as __namedExportsOrder,k as default};
