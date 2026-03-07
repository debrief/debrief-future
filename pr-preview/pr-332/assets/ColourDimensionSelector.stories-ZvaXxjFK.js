import{j as s}from"./jsx-runtime-DF2Pcvd1.js";import{r as C}from"./index-B2-qRKKC.js";import{T as f}from"./ThemeProvider-mvcGjblv.js";import"./_commonjsHelpers-Cpj98o6Y.js";function y(e){return e.endDatetime??e.startDatetime??e.datetime}const b={id:"age",label:"Age",type:"gradient",resolve:e=>y(e)??null},x={id:"vessel-class",label:"Vessel Class",type:"categorical",resolve:e=>{if(!e.vesselClasses||e.vesselClasses.length===0)return null;const n=e.vesselClasses[0];if(!n)return null;const o=n.split("/");return o[o.length-1]??null}},S={id:"tag",label:"Tag",type:"categorical",resolve:e=>!e.tags||e.tags.length===0?null:e.tags[0]??null},v=[b,x,S],l=({dimensions:e,activeDimensionId:n,onDimensionChange:o,className:a})=>{const D=t=>{const c=t.target.value;o(c===""?null:c)};return s.jsxs("div",{className:`debrief-colour-selector${a?` ${a}`:""}`,"data-testid":"colour-dimension-selector",children:[s.jsx("label",{className:"debrief-colour-selector__label",htmlFor:"colour-dimension-select",children:"Colour by"}),s.jsxs("select",{id:"colour-dimension-select",className:"debrief-colour-selector__select",value:n??"",onChange:D,"data-testid":"colour-dimension-select",children:[s.jsx("option",{value:"",children:"None"}),e.map(t=>s.jsx("option",{value:t.id,children:t.label},t.id))]})]})};l.__docgenInfo={description:"",methods:[],displayName:"ColourDimensionSelector",props:{dimensions:{required:!0,tsType:{name:"unknown"},description:"Available dimensions to choose from"},activeDimensionId:{required:!0,tsType:{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]},description:"Currently active dimension ID (null = no dimension)"},onDimensionChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(dimensionId: string | null) => void",signature:{arguments:[{type:{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]},name:"dimensionId"}],return:{name:"void"}}},description:"Callback when the user selects a dimension"},className:{required:!1,tsType:{name:"string"},description:"Additional CSS class name"}}};function I({dimensions:e}){const[n,o]=C.useState(null);return s.jsxs("div",{children:[s.jsx(l,{dimensions:e,activeDimensionId:n,onDimensionChange:o}),s.jsxs("p",{style:{marginTop:12,fontSize:12,color:"#666"},children:["Active: ",n??"(none)"]})]})}const N={title:"Colour Engine/ColourDimensionSelector",component:l,parameters:{layout:"padded",docs:{description:{component:"ColourDimensionSelector provides a dropdown to choose the active colour dimension (Age, Vessel Class, Tag) or reset to none."}}},tags:["autodocs"],decorators:[e=>s.jsx(f,{children:s.jsx(e,{})})]},r={render:()=>s.jsx(I,{dimensions:v}),parameters:{docs:{description:{story:'Interactive selector with all three built-in dimensions. Select a dimension or choose "None" to reset.'}}}},i={args:{dimensions:v,activeDimensionId:"vessel-class",onDimensionChange:()=>{}},parameters:{docs:{description:{story:'Selector with "Vessel Class" pre-selected.'}}}};var d,m,u;r.parameters={...r.parameters,docs:{...(d=r.parameters)==null?void 0:d.docs,source:{originalSource:`{
  render: () => <SelectorWrapper dimensions={builtInDimensions} />,
  parameters: {
    docs: {
      description: {
        story: 'Interactive selector with all three built-in dimensions. Select a dimension or choose "None" to reset.'
      }
    }
  }
}`,...(u=(m=r.parameters)==null?void 0:m.docs)==null?void 0:u.source}}};var p,g,h;i.parameters={...i.parameters,docs:{...(p=i.parameters)==null?void 0:p.docs,source:{originalSource:`{
  args: {
    dimensions: builtInDimensions,
    activeDimensionId: 'vessel-class',
    onDimensionChange: () => {}
  },
  parameters: {
    docs: {
      description: {
        story: 'Selector with "Vessel Class" pre-selected.'
      }
    }
  }
}`,...(h=(g=i.parameters)==null?void 0:g.docs)==null?void 0:h.source}}};const A=["Default","WithPreselection"];export{r as Default,i as WithPreselection,A as __namedExportsOrder,N as default};
