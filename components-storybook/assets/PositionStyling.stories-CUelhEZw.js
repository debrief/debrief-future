import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r as S}from"./index-B2-qRKKC.js";import{M as P}from"./MapView-Y54c10tG.js";import{T as F}from"./TimeController-BPlmdAut.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./TileLayer-Cckmdc0V.js";import"./index-kS-9iBlu.js";import"./bounds-Ct4a5CCP.js";import"./labels-B1NxAApI.js";import"./time-CWSwsQ95.js";import"./leaflet-geoman-Cc97th-d.js";/* empty css                */import"./textfield-Dm39NdvL.js";const r=new Date("2026-01-27T10:00:00Z").getTime(),y=6e4;function u(s,a,t,i,l,c,m,o,d,E){var x,w;return{type:"Feature",id:s,geometry:{type:"LineString",coordinates:i},properties:{kind:"TRACK",platform_id:s,platform_name:a,track_type:"CONTACT",start_time:((x=l[0])==null?void 0:x.time)??"",end_time:((w=l[l.length-1])==null?void 0:w.time)??"",times:c,positions:l,style:{line:{color:t},point:{shape:"circle",radius:4,fill:!0,fill_color:t,color:t}},default_position_style:m,symbol_interval:o,label_interval:d,position_style_overrides:E}}}function b(s,a,t,i){const l=[],c=[],m=[];for(let o=0;o<a;o++){const d=s+o*4*y;l.push([t+o*.002+Math.sin(o*.2)*.003,i+o*.001+Math.cos(o*.2)*.002]),m.push(d),c.push({time:new Date(d).toISOString(),course:45+Math.sin(o*.3)*10,speed:12+Math.cos(o*.2)*2})}return{coordinates:l,positions:c,times:m}}const f=b(r,30,-4,50.3),O=u("track-symbols-interval","CONTACT ALPHA (symbols every 20m)","#2196F3",f.coordinates,f.positions,f.times,{show_symbol:!1,symbol:"circle",show_label:!1},"PT20M",void 0,void 0),g=b(r+5*y,30,-3.95,50.28),I=u("track-labels-interval","CONTACT BRAVO (labels every 30m)","#4CAF50",g.coordinates,g.positions,g.times,{show_symbol:!1,symbol:"circle",show_label:!1},void 0,"PT30M",void 0),_=b(r+10*y,30,-4.05,50.25),n=new Array(30).fill(null);n[3]={show_symbol:!0,show_label:!0,symbol:"square",label:"Contact detected"};n[9]={show_symbol:!0,show_label:!0,symbol:"triangle",label:"Course change"};n[15]={show_symbol:!0,show_label:!0,symbol:"diamond",label:"Manoeuvre"};n[21]={show_symbol:!0,show_label:!0,symbol:"cross",label:"Datum"};n[27]={show_symbol:!0,show_label:!0,symbol:"square",label:"Lost contact"};const B=u("track-combined","OWNSHIP (combined styling)","#FF9800",_.coordinates,_.positions,_.times,{show_symbol:!1,symbol:"circle",show_label:!1},"PT15M","PT60M",n),L=[O,I,B],v=[r,r+120*y];function q(){const[s,a]=S.useState(v[0]),[t,i]=S.useState("full");return e.jsxs("div",{style:{display:"flex",flexDirection:"column",height:"100vh",gap:0},children:[e.jsxs("div",{style:{padding:"8px",background:"#2d2d2d",color:"#fff",fontSize:"14px"},children:[e.jsx("strong",{children:"Position Styling Demo"}),e.jsxs("ul",{style:{margin:"4px 0",paddingLeft:"20px"},children:[e.jsx("li",{children:"Blue track: Symbols every 20 minutes"}),e.jsx("li",{children:"Green track: Labels every 30 minutes"}),e.jsx("li",{children:"Orange track: Symbols every 15m, labels every 1h, plus overrides (square, triangle, diamond, cross)"})]})]}),e.jsx("div",{style:{flex:1,minHeight:0},children:e.jsx(P,{features:L,currentTime:s,displayMode:t,height:"100%",autoFitBounds:!0})}),e.jsx("div",{style:{padding:"8px",borderTop:"1px solid #ccc",background:"#1e1e1e"},children:e.jsx(F,{timeExtent:v,initialTime:v[0],initialDisplayMode:t,onTimeChange:a,onDisplayModeChange:i})})]})}const ee={title:"MapView/Position Styling",parameters:{layout:"fullscreen"}},A=[{shape:"circle",name:"Circle (default)",color:"#2196F3"},{shape:"square",name:"Square",color:"#4CAF50"},{shape:"triangle",name:"Triangle",color:"#FF9800"},{shape:"diamond",name:"Diamond",color:"#E91E63"},{shape:"cross",name:"Cross",color:"#9C27B0"}],H=A.map((s,a)=>{const t=b(r,15,-4+a*.04,50.3-a*.02);return u(`track-shape-${s.shape}`,s.name,s.color,t.coordinates,t.positions,t.times,{show_symbol:!0,symbol:s.shape,show_label:!1})});function N(){return e.jsxs("div",{style:{display:"flex",flexDirection:"column",height:"100vh",gap:0},children:[e.jsxs("div",{style:{padding:"8px",background:"#2d2d2d",color:"#fff",fontSize:"14px"},children:[e.jsx("strong",{children:"Symbol Shapes Demo"})," — each track uses a different default symbol shape",e.jsx("ul",{style:{margin:"4px 0",paddingLeft:"20px"},children:A.map(s=>e.jsx("li",{style:{color:s.color},children:s.name},s.shape))})]}),e.jsx("div",{style:{flex:1,minHeight:0},children:e.jsx(P,{features:H,height:"100%",autoFitBounds:!0})})]})}const p={render:()=>e.jsx(N,{}),parameters:{docs:{description:{story:`
Demonstrates all five symbol shapes as default track symbols.
Each track has \`default_position_style.show_symbol: true\` with a different symbol.
This matches the output of the **apply-symbol-style** tool.
        `}}}},h={render:()=>e.jsx(q,{}),parameters:{docs:{description:{story:`
Demonstrates the position styling cascade:

1. **Default style**: All positions start with no symbols/labels (show_symbol: false, show_label: false)
2. **Interval rules**: symbol_interval and label_interval specify ISO 8601 durations (e.g., PT20M = 20 minutes)
3. **Per-position overrides**: Custom labels and symbols for significant events

The orange track shows all three levels of the cascade working together.
        `}}}};var T,k,D;p.parameters={...p.parameters,docs:{...(T=p.parameters)==null?void 0:T.docs,source:{originalSource:`{
  render: () => <SymbolShapesDemo />,
  parameters: {
    docs: {
      description: {
        story: \`
Demonstrates all five symbol shapes as default track symbols.
Each track has \\\`default_position_style.show_symbol: true\\\` with a different symbol.
This matches the output of the **apply-symbol-style** tool.
        \`
      }
    }
  }
}`,...(D=(k=p.parameters)==null?void 0:k.docs)==null?void 0:D.source}}};var j,C,M;h.parameters={...h.parameters,docs:{...(j=h.parameters)==null?void 0:j.docs,source:{originalSource:`{
  render: () => <PositionStylingDemo />,
  parameters: {
    docs: {
      description: {
        story: \`
Demonstrates the position styling cascade:

1. **Default style**: All positions start with no symbols/labels (show_symbol: false, show_label: false)
2. **Interval rules**: symbol_interval and label_interval specify ISO 8601 durations (e.g., PT20M = 20 minutes)
3. **Per-position overrides**: Custom labels and symbols for significant events

The orange track shows all three levels of the cascade working together.
        \`
      }
    }
  }
}`,...(M=(C=h.parameters)==null?void 0:C.docs)==null?void 0:M.source}}};const se=["SymbolShapes","IntervalBasedStyling"];export{h as IntervalBasedStyling,p as SymbolShapes,se as __namedExportsOrder,ee as default};
