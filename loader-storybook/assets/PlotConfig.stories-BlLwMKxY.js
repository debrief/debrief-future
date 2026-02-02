import{j as a}from"./jsx-runtime-BvcDW_wf.js";import{a as C}from"./index-XGVADEMf.js";import"./index-Bj8oR7bt.js";import"./index-diqPE6K5.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./WizardNavigation-D8oAE3Jx.js";const o={id:"project",name:"Project Alpha Store",path:"/shared/projects/alpha/catalog",plotCount:3,accessible:!0},k={title:"Components/PlotConfig",component:C,parameters:{layout:"fullscreen"},decorators:[x=>a.jsx("div",{style:{height:"500px",display:"flex",flexDirection:"column"},children:a.jsx(x,{})})],argTypes:{onTabChange:{action:"tabChange"},onPlotSelect:{action:"plotSelect"},onNewPlotNameChange:{action:"nameChange"},onNewPlotDescriptionChange:{action:"descChange"},onBack:{action:"back"},onCancel:{action:"cancel"},onLoad:{action:"load"}}},e={args:{store:o,activeTab:"create-new",selectedPlot:null,newPlotForm:{name:"",description:"",errors:{}}}},r={args:{store:o,activeTab:"create-new",selectedPlot:null,newPlotForm:{name:"Exercise Neptune Analysis",description:"Track analysis for Exercise Neptune Q4 2024",errors:{}}}},t={args:{store:o,activeTab:"create-new",selectedPlot:null,newPlotForm:{name:"",description:"",errors:{name:"Plot name is required"}}}},n={args:{store:o,activeTab:"add-existing",selectedPlot:null,newPlotForm:{name:"",description:"",errors:{}}}};var s,c,i;e.parameters={...e.parameters,docs:{...(s=e.parameters)==null?void 0:s.docs,source:{originalSource:`{
  args: {
    store: mockStore,
    activeTab: 'create-new',
    selectedPlot: null,
    newPlotForm: {
      name: '',
      description: '',
      errors: {}
    }
  }
}`,...(i=(c=e.parameters)==null?void 0:c.docs)==null?void 0:i.source}}};var l,m,p;r.parameters={...r.parameters,docs:{...(l=r.parameters)==null?void 0:l.docs,source:{originalSource:`{
  args: {
    store: mockStore,
    activeTab: 'create-new',
    selectedPlot: null,
    newPlotForm: {
      name: 'Exercise Neptune Analysis',
      description: 'Track analysis for Exercise Neptune Q4 2024',
      errors: {}
    }
  }
}`,...(p=(m=r.parameters)==null?void 0:m.docs)==null?void 0:p.source}}};var d,u,g;t.parameters={...t.parameters,docs:{...(d=t.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    store: mockStore,
    activeTab: 'create-new',
    selectedPlot: null,
    newPlotForm: {
      name: '',
      description: '',
      errors: {
        name: 'Plot name is required'
      }
    }
  }
}`,...(g=(u=t.parameters)==null?void 0:u.docs)==null?void 0:g.source}}};var P,w,h;n.parameters={...n.parameters,docs:{...(P=n.parameters)==null?void 0:P.docs,source:{originalSource:`{
  args: {
    store: mockStore,
    activeTab: 'add-existing',
    selectedPlot: null,
    newPlotForm: {
      name: '',
      description: '',
      errors: {}
    }
  }
}`,...(h=(w=n.parameters)==null?void 0:w.docs)==null?void 0:h.source}}};const v=["CreateNewTab","CreateNewWithInput","CreateNewWithError","AddExistingTab"];export{n as AddExistingTab,e as CreateNewTab,t as CreateNewWithError,r as CreateNewWithInput,v as __namedExportsOrder,k as default};
