import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r as h}from"./index-B2-qRKKC.js";import{C as p,b as l}from"./ColourDimensionSelector-DB6UYK_h.js";import{T as g}from"./ThemeProvider-DF0jq0Ad.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./defaultTheme-Tx6C8nph.js";function D({dimensions:r}){const[t,u]=h.useState(null);return e.jsxs("div",{children:[e.jsx(p,{dimensions:r,activeDimensionId:t,onDimensionChange:u}),e.jsxs("p",{style:{marginTop:12,fontSize:12,color:"#666"},children:["Active: ",t??"(none)"]})]})}const C={title:"Colour Engine/ColourDimensionSelector",component:p,parameters:{layout:"padded",docs:{description:{component:"ColourDimensionSelector provides a dropdown to choose the active colour dimension (Age, Tag) or reset to none."}}},tags:["autodocs"],decorators:[r=>e.jsx(g,{children:e.jsx(r,{})})]},o={render:()=>e.jsx(D,{dimensions:l}),parameters:{docs:{description:{story:'Interactive selector with built-in dimensions. Select a dimension or choose "None" to reset.'}}}},s={args:{dimensions:l,activeDimensionId:"tag",onDimensionChange:()=>{}},parameters:{docs:{description:{story:'Selector with "Tag" pre-selected.'}}}};var i,n,a;o.parameters={...o.parameters,docs:{...(i=o.parameters)==null?void 0:i.docs,source:{originalSource:`{
  render: () => <SelectorWrapper dimensions={builtInDimensions} />,
  parameters: {
    docs: {
      description: {
        story: 'Interactive selector with built-in dimensions. Select a dimension or choose "None" to reset.'
      }
    }
  }
}`,...(a=(n=o.parameters)==null?void 0:n.docs)==null?void 0:a.source}}};var c,m,d;s.parameters={...s.parameters,docs:{...(c=s.parameters)==null?void 0:c.docs,source:{originalSource:`{
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
}`,...(d=(m=s.parameters)==null?void 0:m.docs)==null?void 0:d.source}}};const b=["Default","WithPreselection"];export{o as Default,s as WithPreselection,b as __namedExportsOrder,C as default};
