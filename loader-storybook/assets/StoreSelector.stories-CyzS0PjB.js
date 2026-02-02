import{j as a}from"./jsx-runtime-BvcDW_wf.js";import{a as b}from"./index-CJe9mKuN.js";import"./index-Bj8oR7bt.js";import"./index-diqPE6K5.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./WizardNavigation-D8oAE3Jx.js";const e=[{id:"local",name:"Local Analysis Store",path:"/home/user/debrief/local-catalog",plotCount:3,accessible:!0},{id:"project",name:"Project Alpha Store",path:"/shared/projects/alpha/catalog",plotCount:12,accessible:!0},{id:"inaccessible",name:"Remote Store (Offline)",path:"/mnt/network/debrief-catalog",plotCount:0,accessible:!1,accessError:"Network path not available"}],v={title:"Components/StoreSelector",component:b,parameters:{layout:"fullscreen"},decorators:[x=>a.jsx("div",{style:{height:"500px",display:"flex",flexDirection:"column"},children:a.jsx(x,{})})],argTypes:{onSelect:{action:"select"},onNext:{action:"next"},onCancel:{action:"cancel"}}},o={args:{stores:e,selectedStore:null}},r={args:{stores:[e[0]],selectedStore:null}},t={args:{stores:e,selectedStore:e[1]}},s={args:{stores:[e[2],e[0]],selectedStore:null}};var c,n,l;o.parameters={...o.parameters,docs:{...(c=o.parameters)==null?void 0:c.docs,source:{originalSource:`{
  args: {
    stores: mockStores,
    selectedStore: null
  }
}`,...(l=(n=o.parameters)==null?void 0:n.docs)==null?void 0:l.source}}};var i,m,p;r.parameters={...r.parameters,docs:{...(i=r.parameters)==null?void 0:i.docs,source:{originalSource:`{
  args: {
    stores: [mockStores[0]],
    selectedStore: null
  }
}`,...(p=(m=r.parameters)==null?void 0:m.docs)==null?void 0:p.source}}};var S,d,u;t.parameters={...t.parameters,docs:{...(S=t.parameters)==null?void 0:S.docs,source:{originalSource:`{
  args: {
    stores: mockStores,
    selectedStore: mockStores[1]
  }
}`,...(u=(d=t.parameters)==null?void 0:d.docs)==null?void 0:u.source}}};var g,h,f;s.parameters={...s.parameters,docs:{...(g=s.parameters)==null?void 0:g.docs,source:{originalSource:`{
  args: {
    stores: [mockStores[2], mockStores[0]],
    selectedStore: null
  }
}`,...(f=(h=s.parameters)==null?void 0:h.docs)==null?void 0:f.source}}};const w=["MultipleStores","SingleStore","WithSelection","WithInaccessibleStore"];export{o as MultipleStores,r as SingleStore,s as WithInaccessibleStore,t as WithSelection,w as __namedExportsOrder,v as default};
