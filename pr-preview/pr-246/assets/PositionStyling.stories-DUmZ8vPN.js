import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r as w}from"./index-B2-qRKKC.js";import{M as C}from"./MapView-DDhnBfth.js";import{T as D}from"./TimeController-BZiLl7Fy.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./TileLayer-Cckmdc0V.js";import"./index-kS-9iBlu.js";import"./labels-ByPsOtwN.js";import"./Tooltip-CeZQf7Zv.js";import"./time-DRS43qp1.js";import"./leaflet-geoman-Cc97th-d.js";/* empty css                */import"./textfield-Dm39NdvL.js";const a=new Date("2026-01-27T10:00:00Z").getTime(),p=6e4;function g(r,l,s,i,o,n,c,t,m,M){var _,T;return{type:"Feature",id:r,geometry:{type:"LineString",coordinates:i},properties:{kind:"TRACK",platform_id:r,platform_name:l,track_type:"CONTACT",start_time:((_=o[0])==null?void 0:_.time)??"",end_time:((T=o[o.length-1])==null?void 0:T.time)??"",times:n,positions:o,style:{line:{color:s},point:{shape:"circle",radius:4,fill:!0,fill_color:s,color:s}},default_position_style:c,symbol_interval:t,label_interval:m,position_style_overrides:M}}}function v(r,l,s,i){const o=[],n=[],c=[];for(let t=0;t<l;t++){const m=r+t*4*p;o.push([s+t*.002+Math.sin(t*.2)*.003,i+t*.001+Math.cos(t*.2)*.002]),c.push(m),n.push({time:new Date(m).toISOString(),course:45+Math.sin(t*.3)*10,speed:12+Math.cos(t*.2)*2})}return{coordinates:o,positions:n,times:c}}const u=v(a,30,-4,50.3),P=g("track-symbols-interval","CONTACT ALPHA (symbols every 20m)","#2196F3",u.coordinates,u.positions,u.times,{show_symbol:!1,symbol:"circle",show_label:!1},"PT20M",void 0,void 0),h=v(a+5*p,30,-3.95,50.28),j=g("track-labels-interval","CONTACT BRAVO (labels every 30m)","#4CAF50",h.coordinates,h.positions,h.times,{show_symbol:!1,symbol:"circle",show_label:!1},void 0,"PT30M",void 0),b=v(a+10*p,30,-4.05,50.25),y=new Array(30).fill(null);y[5]={show_symbol:!0,show_label:!0,symbol:"square",label:"Contact detected"};y[15]={show_symbol:!0,show_label:!0,symbol:"triangle",label:"Course change"};y[25]={show_symbol:!0,show_label:!0,symbol:"square",label:"Lost contact"};const A=g("track-combined","OWNSHIP (combined styling)","#FF9800",b.coordinates,b.positions,b.times,{show_symbol:!1,symbol:"circle",show_label:!1},"PT15M","PT60M",y),O=[P,j,A],f=[a,a+120*p];function I(){const[r,l]=w.useState(f[0]),[s,i]=w.useState("full");return e.jsxs("div",{style:{display:"flex",flexDirection:"column",height:"100vh",gap:0},children:[e.jsxs("div",{style:{padding:"8px",background:"#2d2d2d",color:"#fff",fontSize:"14px"},children:[e.jsx("strong",{children:"Position Styling Demo"}),e.jsxs("ul",{style:{margin:"4px 0",paddingLeft:"20px"},children:[e.jsx("li",{children:"Blue track: Symbols every 20 minutes"}),e.jsx("li",{children:"Green track: Labels every 30 minutes"}),e.jsx("li",{children:"Orange track: Symbols every 15m, labels every 1h, plus custom overrides"})]})]}),e.jsx("div",{style:{flex:1,minHeight:0},children:e.jsx(C,{features:O,currentTime:r,displayMode:s,height:"100%",autoFitBounds:!0})}),e.jsx("div",{style:{padding:"8px",borderTop:"1px solid #ccc",background:"#1e1e1e"},children:e.jsx(D,{timeExtent:f,initialTime:f[0],initialDisplayMode:s,onTimeChange:l,onDisplayModeChange:i})})]})}const W={title:"MapView/Position Styling",parameters:{layout:"fullscreen"}},d={render:()=>e.jsx(I,{}),parameters:{docs:{description:{story:`
Demonstrates the position styling cascade:

1. **Default style**: All positions start with no symbols/labels (show_symbol: false, show_label: false)
2. **Interval rules**: symbol_interval and label_interval specify ISO 8601 durations (e.g., PT20M = 20 minutes)
3. **Per-position overrides**: Custom labels and symbols for significant events

The orange track shows all three levels of the cascade working together.
        `}}}};var x,k,S;d.parameters={...d.parameters,docs:{...(x=d.parameters)==null?void 0:x.docs,source:{originalSource:`{
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
}`,...(S=(k=d.parameters)==null?void 0:k.docs)==null?void 0:S.source}}};const Z=["IntervalBasedStyling"];export{d as IntervalBasedStyling,Z as __namedExportsOrder,W as default};
