import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r as f}from"./index-B2-qRKKC.js";import{M}from"./MapView-xsCN-N9J.js";import{T as C}from"./TimeController-YrrdAfN3.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./Tooltip-Bk-ETwTB.js";import"./index-kS-9iBlu.js";import"./labels-DlaBaZmR.js";import"./time-tsuwAw9e.js";/* empty css                */import"./textfield-Dm39NdvL.js";const a=new Date("2026-01-27T10:00:00Z").getTime(),m=6e4;function p(l,r,t,i,o,n,s,k,S){var h,b;return{type:"Feature",id:l,geometry:{type:"LineString",coordinates:i},properties:{kind:"TRACK",platform_id:l,platform_name:r,track_type:"CONTACT",start_time:((h=o[0])==null?void 0:h.time)??"",end_time:((b=o[o.length-1])==null?void 0:b.time)??"",positions:o,style:{line:{color:t},point:{shape:"circle",radius:4,fill:!0,fill_color:t,color:t}},default_position_style:n,symbol_interval:s,label_interval:k,position_style_overrides:S}}}function u(l,r,t,i){const o=[],n=[];for(let s=0;s<r;s++)o.push([t+s*.002+Math.sin(s*.2)*.003,i+s*.001+Math.cos(s*.2)*.002]),n.push({time:new Date(l+s*4*m).toISOString(),course:45+Math.sin(s*.3)*10,speed:12+Math.cos(s*.2)*2});return{coordinates:o,positions:n}}const g=u(a,30,-4,50.3),D=p("track-symbols-interval","CONTACT ALPHA (symbols every 20m)","#2196F3",g.coordinates,g.positions,{show_symbol:!1,symbol:"circle",show_label:!1},"PT20M",void 0,void 0),v=u(a+5*m,30,-3.95,50.28),P=p("track-labels-interval","CONTACT BRAVO (labels every 30m)","#4CAF50",v.coordinates,v.positions,{show_symbol:!1,symbol:"circle",show_label:!1},void 0,"PT30M",void 0),_=u(a+10*m,30,-4.05,50.25),d=new Array(30).fill(null);d[5]={show_symbol:!0,show_label:!0,symbol:"square",label:"Contact detected"};d[15]={show_symbol:!0,show_label:!0,symbol:"triangle",label:"Course change"};d[25]={show_symbol:!0,show_label:!0,symbol:"square",label:"Lost contact"};const j=p("track-combined","OWNSHIP (combined styling)","#FF9800",_.coordinates,_.positions,{show_symbol:!1,symbol:"circle",show_label:!1},"PT15M","PT60M",d),A=[D,P,j],y=[a,a+120*m];function O(){const[l,r]=f.useState(y[0]),[t,i]=f.useState("full");return e.jsxs("div",{style:{display:"flex",flexDirection:"column",height:"100vh",gap:0},children:[e.jsxs("div",{style:{padding:"8px",background:"#2d2d2d",color:"#fff",fontSize:"14px"},children:[e.jsx("strong",{children:"Position Styling Demo"}),e.jsxs("ul",{style:{margin:"4px 0",paddingLeft:"20px"},children:[e.jsx("li",{children:"Blue track: Symbols every 20 minutes"}),e.jsx("li",{children:"Green track: Labels every 30 minutes"}),e.jsx("li",{children:"Orange track: Symbols every 15m, labels every 1h, plus custom overrides"})]})]}),e.jsx("div",{style:{flex:1,minHeight:0},children:e.jsx(M,{features:A,currentTime:l,displayMode:t,height:"100%",autoFitBounds:!0})}),e.jsx("div",{style:{padding:"8px",borderTop:"1px solid #ccc",background:"#1e1e1e"},children:e.jsx(C,{timeExtent:y,initialTime:y[0],initialDisplayMode:t,onTimeChange:r,onDisplayModeChange:i})})]})}const G={title:"MapView/Position Styling",parameters:{layout:"fullscreen"}},c={render:()=>e.jsx(O,{}),parameters:{docs:{description:{story:`
Demonstrates the position styling cascade:

1. **Default style**: All positions start with no symbols/labels (show_symbol: false, show_label: false)
2. **Interval rules**: symbol_interval and label_interval specify ISO 8601 durations (e.g., PT20M = 20 minutes)
3. **Per-position overrides**: Custom labels and symbols for significant events

The orange track shows all three levels of the cascade working together.
        `}}}};var T,w,x;c.parameters={...c.parameters,docs:{...(T=c.parameters)==null?void 0:T.docs,source:{originalSource:`{
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
}`,...(x=(w=c.parameters)==null?void 0:w.docs)==null?void 0:x.source}}};const K=["IntervalBasedStyling"];export{c as IntervalBasedStyling,K as __namedExportsOrder,G as default};
