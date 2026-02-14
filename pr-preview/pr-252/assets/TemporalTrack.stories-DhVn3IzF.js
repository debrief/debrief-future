import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r as c}from"./index-B2-qRKKC.js";import{M as u}from"./MapView-BgCPErS_.js";import{T as h}from"./TimeController-BZiLl7Fy.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./TileLayer-Cckmdc0V.js";import"./index-kS-9iBlu.js";import"./labels-D4DpyF2F.js";import"./Tooltip-CeZQf7Zv.js";import"./time-DWPBvZ9w.js";import"./leaflet-geoman-Cc97th-d.js";/* empty css                */import"./textfield-Dm39NdvL.js";const m=new Date("2026-01-27T10:00:00Z").getTime(),d=6e4;function T(r,i,s,p,w,b,E,A,O=0){const g=[],y=[];for(let o=0;o<A;o++)g.push([p+b*o+Math.sin(o*.3)*.005,w+E*o+Math.cos(o*.3)*.003]),y.push(m+O+o*d);return{type:"Feature",id:r,geometry:{type:"LineString",coordinates:g},properties:{kind:"TRACK",name:i,color:s,times:y,trackType:"SURFACE"}}}const B=T("track-ownship","OWNSHIP","#4CAF50",-4,50.3,.002,.001,120,0),H=T("track-contact-1","CONTACT ALPHA","#2196F3",-3.95,50.28,.0015,.0012,100,10*d),I=T("track-contact-2","CONTACT BRAVO","#FF9800",-4.05,50.35,.001,-8e-4,90,5*d),x=[B,H,I],t=[m,m+120*d];function R(){const[r,i]=c.useState(t[0]),[s,p]=c.useState("full");return e.jsxs("div",{style:{display:"flex",flexDirection:"column",height:"100vh",gap:0},children:[e.jsx("div",{style:{flex:1,minHeight:0},children:e.jsx(u,{features:x,currentTime:r,displayMode:s,height:"100%",autoFitBounds:!0})}),e.jsx("div",{style:{padding:"8px",borderTop:"1px solid #ccc",background:"#1e1e1e"},children:e.jsx(h,{timeExtent:t,initialTime:t[0],initialDisplayMode:s,onTimeChange:i,onDisplayModeChange:p})})]})}function V(){const[r,i]=c.useState(t[0]);return e.jsxs("div",{style:{display:"flex",flexDirection:"column",height:"100vh"},children:[e.jsx("div",{style:{flex:1,minHeight:0},children:e.jsx(u,{features:x,currentTime:r,displayMode:"full",height:"100%",autoFitBounds:!0})}),e.jsx("div",{style:{padding:"8px",borderTop:"1px solid #ccc",background:"#1e1e1e"},children:e.jsx(h,{timeExtent:t,initialTime:t[0],initialDisplayMode:"full",onTimeChange:i})})]})}function N(){const[r,i]=c.useState(t[0]);return e.jsxs("div",{style:{display:"flex",flexDirection:"column",height:"100vh"},children:[e.jsx("div",{style:{flex:1,minHeight:0},children:e.jsx(u,{features:x,currentTime:r,displayMode:"trail",height:"100%",autoFitBounds:!0})}),e.jsx("div",{style:{padding:"8px",borderTop:"1px solid #ccc",background:"#1e1e1e"},children:e.jsx(h,{timeExtent:t,initialTime:t[0],initialDisplayMode:"trail",onTimeChange:i})})]})}const Y={title:"MapView/Temporal Track Rendering",parameters:{layout:"fullscreen"}},a={render:()=>e.jsx(R,{}),parameters:{docs:{description:{story:"Full integrated demo with MapView + TimeController. Supports both display modes, playback, and mode switching."}}}},n={render:()=>e.jsx(V,{}),parameters:{docs:{description:{story:"Full-track mode: complete track paths visible with highlight markers at current time position."}}}},l={render:()=>e.jsx(N,{}),parameters:{docs:{description:{story:"Snail-trail mode: track paths grow from start to current time position."}}}};var k,f,M;a.parameters={...a.parameters,docs:{...(k=a.parameters)==null?void 0:k.docs,source:{originalSource:`{
  render: () => <TemporalTrackDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Full integrated demo with MapView + TimeController. Supports both display modes, playback, and mode switching.'
      }
    }
  }
}`,...(M=(f=a.parameters)==null?void 0:f.docs)==null?void 0:M.source}}};var j,S,C;n.parameters={...n.parameters,docs:{...(j=n.parameters)==null?void 0:j.docs,source:{originalSource:`{
  render: () => <FullTrackOnlyDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Full-track mode: complete track paths visible with highlight markers at current time position.'
      }
    }
  }
}`,...(C=(S=n.parameters)==null?void 0:S.docs)==null?void 0:C.source}}};var D,F,v;l.parameters={...l.parameters,docs:{...(D=l.parameters)==null?void 0:D.docs,source:{originalSource:`{
  render: () => <SnailTrailOnlyDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Snail-trail mode: track paths grow from start to current time position.'
      }
    }
  }
}`,...(v=(F=l.parameters)==null?void 0:F.docs)==null?void 0:v.source}}};const $=["IntegratedDemo","FullTrackMode","SnailTrailMode"];export{n as FullTrackMode,a as IntegratedDemo,l as SnailTrailMode,$ as __namedExportsOrder,Y as default};
