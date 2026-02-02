import{j as o}from"./jsx-runtime-BvcDW_wf.js";import{S as x}from"./index-CJe9mKuN.js";import"./index-Bj8oR7bt.js";import"./index-diqPE6K5.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./WizardNavigation-D8oAE3Jx.js";const v={title:"Components/StoreCard",component:x,parameters:{layout:"centered"},decorators:[j=>o.jsx("div",{style:{width:"400px"},children:o.jsx(j,{})})],argTypes:{onSelect:{action:"select"}}},e={args:{store:{id:"local",name:"Local Analysis Store",path:"/home/user/debrief/local-catalog",plotCount:5,accessible:!0},selected:!1}},r={args:{store:{id:"local",name:"Local Analysis Store",path:"/home/user/debrief/local-catalog",plotCount:5,accessible:!0},selected:!0}},a={args:{store:{id:"project",name:"Enterprise Project Store",path:"/shared/enterprise/debrief-catalog",plotCount:128,accessible:!0},selected:!1}},t={args:{store:{id:"remote",name:"Remote Network Store",path:"/mnt/network/catalog",plotCount:0,accessible:!1,accessError:"Network path not available"},selected:!1}},s={args:{store:{id:"deep",name:"Deeply Nested Store",path:"/home/user/projects/maritime/analysis/2024/q4/exercise-bravo/debrief-catalog",plotCount:3,accessible:!0},selected:!1}};var n,c,l;e.parameters={...e.parameters,docs:{...(n=e.parameters)==null?void 0:n.docs,source:{originalSource:`{
  args: {
    store: {
      id: 'local',
      name: 'Local Analysis Store',
      path: '/home/user/debrief/local-catalog',
      plotCount: 5,
      accessible: true
    },
    selected: false
  }
}`,...(l=(c=e.parameters)==null?void 0:c.docs)==null?void 0:l.source}}};var i,p,d;r.parameters={...r.parameters,docs:{...(i=r.parameters)==null?void 0:i.docs,source:{originalSource:`{
  args: {
    store: {
      id: 'local',
      name: 'Local Analysis Store',
      path: '/home/user/debrief/local-catalog',
      plotCount: 5,
      accessible: true
    },
    selected: true
  }
}`,...(d=(p=r.parameters)==null?void 0:p.docs)==null?void 0:d.source}}};var m,u,g;a.parameters={...a.parameters,docs:{...(m=a.parameters)==null?void 0:m.docs,source:{originalSource:`{
  args: {
    store: {
      id: 'project',
      name: 'Enterprise Project Store',
      path: '/shared/enterprise/debrief-catalog',
      plotCount: 128,
      accessible: true
    },
    selected: false
  }
}`,...(g=(u=a.parameters)==null?void 0:u.docs)==null?void 0:g.source}}};var b,h,f;t.parameters={...t.parameters,docs:{...(b=t.parameters)==null?void 0:b.docs,source:{originalSource:`{
  args: {
    store: {
      id: 'remote',
      name: 'Remote Network Store',
      path: '/mnt/network/catalog',
      plotCount: 0,
      accessible: false,
      accessError: 'Network path not available'
    },
    selected: false
  }
}`,...(f=(h=t.parameters)==null?void 0:h.docs)==null?void 0:f.source}}};var S,y,C;s.parameters={...s.parameters,docs:{...(S=s.parameters)==null?void 0:S.docs,source:{originalSource:`{
  args: {
    store: {
      id: 'deep',
      name: 'Deeply Nested Store',
      path: '/home/user/projects/maritime/analysis/2024/q4/exercise-bravo/debrief-catalog',
      plotCount: 3,
      accessible: true
    },
    selected: false
  }
}`,...(C=(y=s.parameters)==null?void 0:y.docs)==null?void 0:C.source}}};const A=["Default","Selected","ManyPlots","Inaccessible","LongPath"];export{e as Default,t as Inaccessible,s as LongPath,a as ManyPlots,r as Selected,A as __namedExportsOrder,v as default};
