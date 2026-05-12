import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r as m}from"./index-B2-qRKKC.js";import{M as h}from"./MapView-v3qk7sHj.js";import{T}from"./TimeController-FnleaGso.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./TileLayer-Cckmdc0V.js";import"./index-kS-9iBlu.js";import"./interval-CUv8kruJ.js";import"./types-CuJnRqfe.js";import"./bounds-BbBIf5Id.js";import"./labels-D5TLrMt1.js";import"./useTheme-DUm7hPwc.js";import"./defaultTheme-Tx6C8nph.js";import"./leaflet-geoman-Cc97th-d.js";/* empty css                */import"./textfield-Dm39NdvL.js";const u=new Date("2026-01-27T10:00:00Z").getTime(),p=6e4;function g(i,o,n,d,E,O,A,I,B=0){var k,f;const y=[],s=[];for(let r=0;r<I;r++){const H=u+B+r*p;y.push([d+O*r+Math.sin(r*.3)*.005,E+A*r+Math.cos(r*.3)*.003]),s.push({time:new Date(H).toISOString(),course:45+Math.sin(r*.3)*10,speed:12})}return{type:"Feature",id:i,geometry:{type:"LineString",coordinates:y},properties:{kind:"TRACK",name:o,color:n,start_time:((k=s[0])==null?void 0:k.time)??"",end_time:((f=s[s.length-1])==null?void 0:f.time)??"",positions:s,trackType:"SURFACE"}}}const R=g("track-ownship","OWNSHIP","#4CAF50",-4,50.3,.002,.001,120,0),V=g("track-contact-1","CONTACT ALPHA","#2196F3",-3.95,50.28,.0015,.0012,100,10*p),_=g("track-contact-2","CONTACT BRAVO","#FF9800",-4.05,50.35,.001,-8e-4,90,5*p),x=[R,V,_],t=[u,u+120*p];function N(){const[i,o]=m.useState(t[0]),[n,d]=m.useState("full");return e.jsxs("div",{style:{display:"flex",flexDirection:"column",height:"100vh",gap:0},children:[e.jsx("div",{style:{flex:1,minHeight:0},children:e.jsx(h,{features:x,currentTime:i,displayMode:n,height:"100%",autoFitBounds:!0})}),e.jsx("div",{style:{padding:"8px",borderTop:"1px solid #ccc",background:"#1e1e1e"},children:e.jsx(T,{timeExtent:t,initialTime:t[0],initialDisplayMode:n,onTimeChange:o,onDisplayModeChange:d})})]})}function L(){const[i,o]=m.useState(t[0]);return e.jsxs("div",{style:{display:"flex",flexDirection:"column",height:"100vh"},children:[e.jsx("div",{style:{flex:1,minHeight:0},children:e.jsx(h,{features:x,currentTime:i,displayMode:"full",height:"100%",autoFitBounds:!0})}),e.jsx("div",{style:{padding:"8px",borderTop:"1px solid #ccc",background:"#1e1e1e"},children:e.jsx(T,{timeExtent:t,initialTime:t[0],initialDisplayMode:"full",onTimeChange:o})})]})}function P(){const[i,o]=m.useState(t[0]);return e.jsxs("div",{style:{display:"flex",flexDirection:"column",height:"100vh"},children:[e.jsx("div",{style:{flex:1,minHeight:0},children:e.jsx(h,{features:x,currentTime:i,displayMode:"trail",height:"100%",autoFitBounds:!0})}),e.jsx("div",{style:{padding:"8px",borderTop:"1px solid #ccc",background:"#1e1e1e"},children:e.jsx(T,{timeExtent:t,initialTime:t[0],initialDisplayMode:"trail",onTimeChange:o})})]})}const oe={title:"MapView/Temporal Track Rendering",parameters:{layout:"fullscreen"}},a={render:()=>e.jsx(N,{}),parameters:{docs:{description:{story:"Full integrated demo with MapView + TimeController. Supports both display modes, playback, and mode switching."}}}},c={render:()=>e.jsx(L,{}),parameters:{docs:{description:{story:"Full-track mode: complete track paths visible with highlight markers at current time position."}}}},l={render:()=>e.jsx(P,{}),parameters:{docs:{description:{story:"Snail-trail mode: track paths grow from start to current time position."}}}};var M,S,j;a.parameters={...a.parameters,docs:{...(M=a.parameters)==null?void 0:M.docs,source:{originalSource:`{
  render: () => <TemporalTrackDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Full integrated demo with MapView + TimeController. Supports both display modes, playback, and mode switching.'
      }
    }
  }
}`,...(j=(S=a.parameters)==null?void 0:S.docs)==null?void 0:j.source}}};var D,C,F;c.parameters={...c.parameters,docs:{...(D=c.parameters)==null?void 0:D.docs,source:{originalSource:`{
  render: () => <FullTrackOnlyDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Full-track mode: complete track paths visible with highlight markers at current time position.'
      }
    }
  }
}`,...(F=(C=c.parameters)==null?void 0:C.docs)==null?void 0:F.source}}};var w,v,b;l.parameters={...l.parameters,docs:{...(w=l.parameters)==null?void 0:w.docs,source:{originalSource:`{
  render: () => <SnailTrailOnlyDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Snail-trail mode: track paths grow from start to current time position.'
      }
    }
  }
}`,...(b=(v=l.parameters)==null?void 0:v.docs)==null?void 0:b.source}}};const se=["IntegratedDemo","FullTrackMode","SnailTrailMode"];export{c as FullTrackMode,a as IntegratedDemo,l as SnailTrailMode,se as __namedExportsOrder,oe as default};
