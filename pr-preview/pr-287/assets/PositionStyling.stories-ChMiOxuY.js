import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r as T}from"./index-B2-qRKKC.js";import{M as D}from"./MapView-DkABJc-C.js";import{T as C}from"./TimeController-BZiLl7Fy.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./TileLayer-Cckmdc0V.js";import"./index-kS-9iBlu.js";import"./labels-BZlSJt0c.js";import"./Tooltip-CeZQf7Zv.js";import"./time-CarbVYF2.js";import"./leaflet-geoman-Cc97th-d.js";/* empty css                */import"./textfield-Dm39NdvL.js";const n=new Date("2026-01-27T10:00:00Z").getTime(),p=6e4;function g(l,i,t,a,o,c,m,s,d,S){var v,w;return{type:"Feature",id:l,geometry:{type:"LineString",coordinates:a},properties:{kind:"TRACK",platform_id:l,platform_name:i,track_type:"CONTACT",start_time:((v=o[0])==null?void 0:v.time)??"",end_time:((w=o[o.length-1])==null?void 0:w.time)??"",times:c,positions:o,style:{line:{color:t},point:{shape:"circle",radius:4,fill:!0,fill_color:t,color:t}},default_position_style:m,symbol_interval:s,label_interval:d,position_style_overrides:S}}}function _(l,i,t,a){const o=[],c=[],m=[];for(let s=0;s<i;s++){const d=l+s*4*p;o.push([t+s*.002+Math.sin(s*.2)*.003,a+s*.001+Math.cos(s*.2)*.002]),m.push(d),c.push({time:new Date(d).toISOString(),course:45+Math.sin(s*.3)*10,speed:12+Math.cos(s*.2)*2})}return{coordinates:o,positions:c,times:m}}const u=_(n,30,-4,50.3),P=g("track-symbols-interval","CONTACT ALPHA (symbols every 20m)","#2196F3",u.coordinates,u.positions,u.times,{show_symbol:!1,symbol:"circle",show_label:!1},"PT20M",void 0,void 0),h=_(n+5*p,30,-3.95,50.28),j=g("track-labels-interval","CONTACT BRAVO (labels every 30m)","#4CAF50",h.coordinates,h.positions,h.times,{show_symbol:!1,symbol:"circle",show_label:!1},void 0,"PT30M",void 0),b=_(n+10*p,30,-4.05,50.25),r=new Array(30).fill(null);r[3]={show_symbol:!0,show_label:!0,symbol:"square",label:"Contact detected"};r[9]={show_symbol:!0,show_label:!0,symbol:"triangle",label:"Course change"};r[15]={show_symbol:!0,show_label:!0,symbol:"diamond",label:"Manoeuvre"};r[21]={show_symbol:!0,show_label:!0,symbol:"cross",label:"Datum"};r[27]={show_symbol:!0,show_label:!0,symbol:"square",label:"Lost contact"};const A=g("track-combined","OWNSHIP (combined styling)","#FF9800",b.coordinates,b.positions,b.times,{show_symbol:!1,symbol:"circle",show_label:!1},"PT15M","PT60M",r),O=[P,j,A],f=[n,n+120*p];function I(){const[l,i]=T.useState(f[0]),[t,a]=T.useState("full");return e.jsxs("div",{style:{display:"flex",flexDirection:"column",height:"100vh",gap:0},children:[e.jsxs("div",{style:{padding:"8px",background:"#2d2d2d",color:"#fff",fontSize:"14px"},children:[e.jsx("strong",{children:"Position Styling Demo"}),e.jsxs("ul",{style:{margin:"4px 0",paddingLeft:"20px"},children:[e.jsx("li",{children:"Blue track: Symbols every 20 minutes"}),e.jsx("li",{children:"Green track: Labels every 30 minutes"}),e.jsx("li",{children:"Orange track: Symbols every 15m, labels every 1h, plus overrides (square, triangle, diamond, cross)"})]})]}),e.jsx("div",{style:{flex:1,minHeight:0},children:e.jsx(D,{features:O,currentTime:l,displayMode:t,height:"100%",autoFitBounds:!0})}),e.jsx("div",{style:{padding:"8px",borderTop:"1px solid #ccc",background:"#1e1e1e"},children:e.jsx(C,{timeExtent:f,initialTime:f[0],initialDisplayMode:t,onTimeChange:i,onDisplayModeChange:a})})]})}const W={title:"MapView/Position Styling",parameters:{layout:"fullscreen"}},y={render:()=>e.jsx(I,{}),parameters:{docs:{description:{story:`
Demonstrates the position styling cascade:

1. **Default style**: All positions start with no symbols/labels (show_symbol: false, show_label: false)
2. **Interval rules**: symbol_interval and label_interval specify ISO 8601 durations (e.g., PT20M = 20 minutes)
3. **Per-position overrides**: Custom labels and symbols for significant events

The orange track shows all three levels of the cascade working together.
        `}}}};var x,k,M;y.parameters={...y.parameters,docs:{...(x=y.parameters)==null?void 0:x.docs,source:{originalSource:`{
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
}`,...(M=(k=y.parameters)==null?void 0:k.docs)==null?void 0:M.source}}};const Z=["IntervalBasedStyling"];export{y as IntervalBasedStyling,Z as __namedExportsOrder,W as default};
