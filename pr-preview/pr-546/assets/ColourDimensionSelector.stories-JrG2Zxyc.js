import{j as n}from"./jsx-runtime-DF2Pcvd1.js";import{r as f}from"./index-B2-qRKKC.js";import{T as y}from"./ThemeProvider-eH7IAOIa.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./defaultTheme-CXXPMGCe.js";function b(e){return e.endDatetime??e.startDatetime??e.datetime}const x={id:"age",label:"Age",type:"gradient",resolve:e=>b(e)??null},S={id:"tag",label:"Tag",type:"categorical",resolve:e=>!e.tags||e.tags.length===0?null:e.tags[0]??null},v=[x,S],a=({dimensions:e,activeDimensionId:o,onDimensionChange:r,className:l})=>{const D=s=>{const c=s.target.value;r(c===""?null:c)};return n.jsxs("div",{className:`debrief-colour-selector${l?` ${l}`:""}`,"data-testid":"colour-dimension-selector",children:[n.jsx("label",{className:"debrief-colour-selector__label",htmlFor:"colour-dimension-select",children:"Colour by"}),n.jsxs("select",{id:"colour-dimension-select",className:"debrief-colour-selector__select",value:o??"",onChange:D,"data-testid":"colour-dimension-select",children:[n.jsx("option",{value:"",children:"None"}),e.map(s=>n.jsx("option",{value:s.id,children:s.label},s.id))]})]})};a.__docgenInfo={description:"",methods:[],displayName:"ColourDimensionSelector",props:{dimensions:{required:!0,tsType:{name:"unknown"},description:"Available dimensions to choose from"},activeDimensionId:{required:!0,tsType:{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]},description:"Currently active dimension ID (null = no dimension)"},onDimensionChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(dimensionId: string | null) => void",signature:{arguments:[{type:{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]},name:"dimensionId"}],return:{name:"void"}}},description:"Callback when the user selects a dimension"},className:{required:!1,tsType:{name:"string"},description:"Additional CSS class name"}}};function C({dimensions:e}){const[o,r]=f.useState(null);return n.jsxs("div",{children:[n.jsx(a,{dimensions:e,activeDimensionId:o,onDimensionChange:r}),n.jsxs("p",{style:{marginTop:12,fontSize:12,color:"#666"},children:["Active: ",o??"(none)"]})]})}const N={title:"Colour Engine/ColourDimensionSelector",component:a,parameters:{layout:"padded",docs:{description:{component:"ColourDimensionSelector provides a dropdown to choose the active colour dimension (Age, Tag) or reset to none."}}},tags:["autodocs"],decorators:[e=>n.jsx(y,{children:n.jsx(e,{})})]},t={render:()=>n.jsx(C,{dimensions:v}),parameters:{docs:{description:{story:'Interactive selector with built-in dimensions. Select a dimension or choose "None" to reset.'}}}},i={args:{dimensions:v,activeDimensionId:"tag",onDimensionChange:()=>{}},parameters:{docs:{description:{story:'Selector with "Tag" pre-selected.'}}}};var d,m,u;t.parameters={...t.parameters,docs:{...(d=t.parameters)==null?void 0:d.docs,source:{originalSource:`{
  render: () => <SelectorWrapper dimensions={builtInDimensions} />,
  parameters: {
    docs: {
      description: {
        story: 'Interactive selector with built-in dimensions. Select a dimension or choose "None" to reset.'
      }
    }
  }
}`,...(u=(m=t.parameters)==null?void 0:m.docs)==null?void 0:u.source}}};var p,g,h;i.parameters={...i.parameters,docs:{...(p=i.parameters)==null?void 0:p.docs,source:{originalSource:`{
  args: {
    dimensions: builtInDimensions,
    activeDimensionId: 'tag',
    onDimensionChange: () => {}
  },
  parameters: {
    docs: {
      description: {
        story: 'Selector with "Tag" pre-selected.'
      }
    }
  }
}`,...(h=(g=i.parameters)==null?void 0:g.docs)==null?void 0:h.source}}};const A=["Default","WithPreselection"];export{t as Default,i as WithPreselection,A as __namedExportsOrder,N as default};
