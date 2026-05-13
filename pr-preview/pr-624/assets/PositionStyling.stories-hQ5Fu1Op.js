import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r as _}from"./index-B2-qRKKC.js";import{M}from"./MapView-CZFjYMOW.js";import{T as E}from"./TimeController-BQb5Lh1r.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./TileLayer-Cckmdc0V.js";import"./index-kS-9iBlu.js";import"./interval-CUv8kruJ.js";import"./types-CuJnRqfe.js";import"./bounds-BbBIf5Id.js";import"./labels-Bx3GzQt_.js";import"./useTheme-DUm7hPwc.js";import"./defaultTheme-Tx6C8nph.js";import"./leaflet-geoman-Cc97th-d.js";/* empty css                */import"./textfield-Dm39NdvL.js";const l=new Date("2026-01-27T10:00:00Z").getTime(),p=6e4;function h(s,a,t,i,r,c,o,u,A){var f,g;return{type:"Feature",id:s,geometry:{type:"LineString",coordinates:i},properties:{kind:"TRACK",platform_id:s,platform_name:a,track_type:"CONTACT",start_time:((f=r[0])==null?void 0:f.time)??"",end_time:((g=r[r.length-1])==null?void 0:g.time)??"",positions:r,style:{line:{color:t},point:{shape:"circle",radius:4,fill:!0,fill_color:t,color:t}},default_position_style:c,symbol_interval:o,label_interval:u,position_style_overrides:A}}}function y(s,a,t,i){const r=[],c=[];for(let o=0;o<a;o++){const u=s+o*4*p;r.push([t+o*.002+Math.sin(o*.2)*.003,i+o*.001+Math.cos(o*.2)*.002]),c.push({time:new Date(u).toISOString(),course:45+Math.sin(o*.3)*10,speed:12+Math.cos(o*.2)*2})}return{coordinates:r,positions:c}}const v=y(l,30,-4,50.3),F=h("track-symbols-interval","CONTACT ALPHA (symbols every 20m)","#2196F3",v.coordinates,v.positions,{show_symbol:!1,symbol:"circle",show_label:!1},"PT20M",void 0,void 0),x=y(l+5*p,30,-3.95,50.28),O=h("track-labels-interval","CONTACT BRAVO (labels every 30m)","#4CAF50",x.coordinates,x.positions,{show_symbol:!1,symbol:"circle",show_label:!1},void 0,"PT30M",void 0),w=y(l+10*p,30,-4.05,50.25),n=new Array(30).fill(null);n[3]={show_symbol:!0,show_label:!0,symbol:"square",label:"Contact detected"};n[9]={show_symbol:!0,show_label:!0,symbol:"triangle",label:"Course change"};n[15]={show_symbol:!0,show_label:!0,symbol:"diamond",label:"Manoeuvre"};n[21]={show_symbol:!0,show_label:!0,symbol:"cross",label:"Datum"};n[27]={show_symbol:!0,show_label:!0,symbol:"square",label:"Lost contact"};const I=h("track-combined","OWNSHIP (combined styling)","#FF9800",w.coordinates,w.positions,{show_symbol:!1,symbol:"circle",show_label:!1},"PT15M","PT60M",n),B=[F,O,I],b=[l,l+120*p];function L(){const[s,a]=_.useState(b[0]),[t,i]=_.useState("full");return e.jsxs("div",{style:{display:"flex",flexDirection:"column",height:"100vh",gap:0},children:[e.jsxs("div",{style:{padding:"8px",background:"#2d2d2d",color:"#fff",fontSize:"14px"},children:[e.jsx("strong",{children:"Position Styling Demo"}),e.jsxs("ul",{style:{margin:"4px 0",paddingLeft:"20px"},children:[e.jsx("li",{children:"Blue track: Symbols every 20 minutes"}),e.jsx("li",{children:"Green track: Labels every 30 minutes"}),e.jsx("li",{children:"Orange track: Symbols every 15m, labels every 1h, plus overrides (square, triangle, diamond, cross)"})]})]}),e.jsx("div",{style:{flex:1,minHeight:0},children:e.jsx(M,{features:B,currentTime:s,displayMode:t,height:"100%",autoFitBounds:!0})}),e.jsx("div",{style:{padding:"8px",borderTop:"1px solid #ccc",background:"#1e1e1e"},children:e.jsx(E,{timeExtent:b,initialTime:b[0],initialDisplayMode:t,onTimeChange:a,onDisplayModeChange:i})})]})}const te={title:"MapView/Position Styling",parameters:{layout:"fullscreen"}},P=[{shape:"circle",name:"Circle (default)",color:"#2196F3"},{shape:"square",name:"Square",color:"#4CAF50"},{shape:"triangle",name:"Triangle",color:"#FF9800"},{shape:"diamond",name:"Diamond",color:"#E91E63"},{shape:"cross",name:"Cross",color:"#9C27B0"}],q=P.map((s,a)=>{const t=y(l,15,-4+a*.04,50.3-a*.02);return h(`track-shape-${s.shape}`,s.name,s.color,t.coordinates,t.positions,{show_symbol:!0,symbol:s.shape,show_label:!1})});function H(){return e.jsxs("div",{style:{display:"flex",flexDirection:"column",height:"100vh",gap:0},children:[e.jsxs("div",{style:{padding:"8px",background:"#2d2d2d",color:"#fff",fontSize:"14px"},children:[e.jsx("strong",{children:"Symbol Shapes Demo"})," — each track uses a different default symbol shape",e.jsx("ul",{style:{margin:"4px 0",paddingLeft:"20px"},children:P.map(s=>e.jsx("li",{style:{color:s.color},children:s.name},s.shape))})]}),e.jsx("div",{style:{flex:1,minHeight:0},children:e.jsx(M,{features:q,height:"100%",autoFitBounds:!0})})]})}const m={render:()=>e.jsx(H,{}),parameters:{docs:{description:{story:`
Demonstrates all five symbol shapes as default track symbols.
Each track has \`default_position_style.show_symbol: true\` with a different symbol.
This matches the output of the **apply-symbol-style** tool.
        `}}}},d={render:()=>e.jsx(L,{}),parameters:{docs:{description:{story:`
Demonstrates the position styling cascade:

1. **Default style**: All positions start with no symbols/labels (show_symbol: false, show_label: false)
2. **Interval rules**: symbol_interval and label_interval specify ISO 8601 durations (e.g., PT20M = 20 minutes)
3. **Per-position overrides**: Custom labels and symbols for significant events

The orange track shows all three levels of the cascade working together.
        `}}}};var S,T,k;m.parameters={...m.parameters,docs:{...(S=m.parameters)==null?void 0:S.docs,source:{originalSource:`{
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
}`,...(k=(T=m.parameters)==null?void 0:T.docs)==null?void 0:k.source}}};var D,j,C;d.parameters={...d.parameters,docs:{...(D=d.parameters)==null?void 0:D.docs,source:{originalSource:`{
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
}`,...(C=(j=d.parameters)==null?void 0:j.docs)==null?void 0:C.source}}};const oe=["SymbolShapes","IntervalBasedStyling"];export{d as IntervalBasedStyling,m as SymbolShapes,oe as __namedExportsOrder,te as default};
