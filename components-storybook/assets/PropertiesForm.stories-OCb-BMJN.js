import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{F as A,S as _,M as T,R}from"./readOnlyBanner-llzwq9Gu.js";import"./index-B2-qRKKC.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./ParameterEditor-j09_We3v.js";import"./ParameterEditor-DMejAiLo.js";import"./labels-Bx3GzQt_.js";import"./interval-CUv8kruJ.js";import"./types-CuJnRqfe.js";const a=(r,t={})=>({type:"Feature",id:r,geometry:{type:"LineString",coordinates:[[-1.25,50.75],[-1.24,50.76],[-1.23,50.77],[-1.22,50.78],[-1.21,50.79]]},properties:{kind:"TRACK",tags:["intercept"],platform_id:"ssk/type212/HUNTER",display_name:"HMS Hunter",nationality:"GB",vessel_class:"submarine",vessel_type:"ssk",vessel_role:"hunter",domain:"subsurface",times:["2026-03-12T15:00:00Z","2026-03-12T15:01:00Z","2026-03-12T15:02:00Z","2026-03-12T15:03:00Z","2026-03-12T15:04:00Z"],...t}}),E=(r,t)=>({type:"Feature",id:r,geometry:{type:"Polygon",coordinates:[[[-1.3,50.7],[-1.2,50.7],[-1.2,50.8],[-1.3,50.8],[-1.3,50.7]]]},properties:{kind:"POLY",tags:[],name:"Exercise Area Alpha",vertex_metadata:t??[]}}),j=a("track-A",{vertex_metadata:[{path:"positions/2",label:"intercept",tags:["recurring-fix"],note:"CPA closest at this fix"}]}),c=()=>{},B=()=>{},O=()=>{},C={title:"PropertiesPanel/PropertiesForm",parameters:{layout:"padded",docs:{description:{component:"Mode-aware Properties panel surfaces (spec #192). Five stories cover the four editing modes plus the read-only banner."}}},tags:["autodocs"],decorators:[r=>e.jsx("div",{style:{width:360,padding:12},children:e.jsx(r,{})})]},o={name:"Feature mode — track with override",render:()=>e.jsx(A,{feature:a("track-A",{display_name:"HMS Hunter (override)"}),readOnly:!1,setFeatureField:c,revertField:B,unrevertField:O})},n={name:"Sub-feature mode — track point",render:()=>e.jsx(_,{feature:j,path:"positions/2",readOnly:!1,setVertexField:c})},s={name:"Sub-feature mode — polygon vertex",render:()=>e.jsx(_,{feature:E("poly-A",[{path:"rings/0/vertices/1",label:"NE corner",tags:["boundary"],note:"Northern exclusion-zone marker"}]),path:"rings/0/vertices/1",readOnly:!1,setVertexField:c})},i={name:"Multi-select summary — two features",render:()=>{const r=a("track-A",{display_name:"HMS Hunter",vessel_role:"hunter",tags:["intercept"]}),t=a("track-B",{display_name:"HMS Hunter",vessel_role:"escort",tags:["intercept"]}),H=new Map([["track-A",r],["track-B",t]]);return e.jsx(T,{featureIds:["track-A","track-B"],featuresById:H,readOnly:!1})}},d={name:"Read-only — banner + disabled inputs",render:()=>e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:8},children:[e.jsx(R,{reason:"Storage location is not writable"}),e.jsx(A,{feature:a("track-A"),readOnly:!0,setFeatureField:c,revertField:B,unrevertField:O})]})};var l,u,p;o.parameters={...o.parameters,docs:{...(l=o.parameters)==null?void 0:l.docs,source:{originalSource:`{
  name: 'Feature mode — track with override',
  render: () => <FeatureEditorMode feature={mockTrack('track-A', {
    display_name: 'HMS Hunter (override)'
  })} readOnly={false} setFeatureField={noopSetField} revertField={noopRevert} unrevertField={noopUnrevert} />
}`,...(p=(u=o.parameters)==null?void 0:u.docs)==null?void 0:p.source}}};var m,y,f;n.parameters={...n.parameters,docs:{...(m=n.parameters)==null?void 0:m.docs,source:{originalSource:`{
  name: 'Sub-feature mode — track point',
  render: () => <SubFeatureEditorMode feature={trackWithStagedVertex} path="positions/2" readOnly={false} setVertexField={noopSetField} />
}`,...(f=(y=n.parameters)==null?void 0:y.docs)==null?void 0:f.source}}};var F,k,S;s.parameters={...s.parameters,docs:{...(F=s.parameters)==null?void 0:F.docs,source:{originalSource:`{
  name: 'Sub-feature mode — polygon vertex',
  render: () => <SubFeatureEditorMode feature={mockPolygonAnnotation('poly-A', [{
    path: 'rings/0/vertices/1',
    label: 'NE corner',
    tags: ['boundary'],
    note: 'Northern exclusion-zone marker'
  }])} path="rings/0/vertices/1" readOnly={false} setVertexField={noopSetField} />
}`,...(S=(k=s.parameters)==null?void 0:k.docs)==null?void 0:S.source}}};var g,v,x;i.parameters={...i.parameters,docs:{...(g=i.parameters)==null?void 0:g.docs,source:{originalSource:`{
  name: 'Multi-select summary — two features',
  render: () => {
    const featureA = mockTrack('track-A', {
      display_name: 'HMS Hunter',
      vessel_role: 'hunter',
      tags: ['intercept']
    });
    const featureB = mockTrack('track-B', {
      display_name: 'HMS Hunter',
      vessel_role: 'escort',
      // differs from A
      tags: ['intercept']
    });
    const featuresById = new Map<string, DebriefFeature>([['track-A', featureA], ['track-B', featureB]]);
    return <MultiSelectSummaryMode featureIds={['track-A', 'track-B']} featuresById={featuresById} readOnly={false} />;
  }
}`,...(x=(v=i.parameters)==null?void 0:v.docs)==null?void 0:x.source}}};var M,b,h;d.parameters={...d.parameters,docs:{...(M=d.parameters)==null?void 0:M.docs,source:{originalSource:`{
  name: 'Read-only — banner + disabled inputs',
  render: () => {
    return <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }}>
        <ReadOnlyBanner reason="Storage location is not writable" />
        <FeatureEditorMode feature={mockTrack('track-A')} readOnly={true} setFeatureField={noopSetField} revertField={noopRevert} unrevertField={noopUnrevert} />
      </div>;
  }
}`,...(h=(b=d.parameters)==null?void 0:b.docs)==null?void 0:h.source}}};const L=["FeatureMode","SubFeatureTrack","SubFeaturePolygon","MultiSelectSummary","ReadOnly"];export{o as FeatureMode,i as MultiSelectSummary,d as ReadOnly,s as SubFeaturePolygon,n as SubFeatureTrack,L as __namedExportsOrder,C as default};
