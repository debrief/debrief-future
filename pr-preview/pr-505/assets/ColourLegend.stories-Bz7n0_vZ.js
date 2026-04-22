import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{T as w}from"./ThemeProvider-CpMh1h6x.js";import"./index-B2-qRKKC.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./defaultTheme-lXwsM3al.js";const y=({legend:r,unclassifiedColour:v,className:t})=>{if(!r)return null;const d=r.gradient!==null;return e.jsxs("div",{className:`debrief-colour-legend${t?` ${t}`:""}`,"data-testid":"colour-legend",role:"region","aria-label":`Colour legend: ${r.dimension.label}`,children:[e.jsx("div",{className:"debrief-colour-legend__title","data-testid":"colour-legend-title",children:r.dimension.label}),d&&r.gradient&&e.jsxs("div",{className:"debrief-colour-legend__gradient","data-testid":"colour-legend-gradient",children:[e.jsxs("div",{className:"debrief-colour-legend__gradient-labels",children:[e.jsx("span",{children:r.gradient.minLabel}),e.jsx("span",{children:r.gradient.maxLabel})]}),e.jsx("div",{className:"debrief-colour-legend__gradient-bar",style:{background:`linear-gradient(to right, ${r.gradient.minColour}, ${r.gradient.maxColour})`}})]}),!d&&r.entries.length>0&&e.jsx("div",{className:"debrief-colour-legend__entries","data-testid":"colour-legend-entries",children:r.entries.map(s=>e.jsxs("div",{className:"debrief-colour-legend__entry",children:[e.jsx("span",{className:"debrief-colour-legend__swatch",style:{backgroundColor:s.colour}}),e.jsx("span",{className:"debrief-colour-legend__entry-label",children:s.label}),e.jsxs("span",{className:"debrief-colour-legend__entry-count",children:["(",s.count,")"]})]},s.label))}),r.hasUnclassified&&e.jsxs("div",{className:"debrief-colour-legend__entry debrief-colour-legend__entry--unclassified",children:[e.jsx("span",{className:"debrief-colour-legend__swatch",style:{backgroundColor:v}}),e.jsx("span",{className:"debrief-colour-legend__entry-label",children:"Unclassified"})]})]})};y.__docgenInfo={description:"",methods:[],displayName:"ColourLegend",props:{legend:{required:!0,tsType:{name:"union",raw:"LegendModel | null",elements:[{name:"LegendModel"},{name:"null"}]},description:"Legend model to render (null = no legend shown)"},unclassifiedColour:{required:!0,tsType:{name:"string"},description:'Colour for "Unclassified" items (shown when legend.hasUnclassified)'},className:{required:!1,tsType:{name:"string"},description:"Additional CSS class name"}}};const L={id:"tag",label:"Tag",type:"categorical",resolve:()=>null},N={id:"age",label:"Age",type:"gradient",resolve:()=>null},U={dimension:L,entries:[{label:"Frigate",colour:"#4477AA",count:12},{label:"Destroyer",colour:"#EE6677",count:8},{label:"Submarine",colour:"#228833",count:5},{label:"Carrier",colour:"#CCBB44",count:3},{label:"Corvette",colour:"#66CCEE",count:2}],gradient:null,hasUnclassified:!0},j={dimension:N,entries:[],gradient:{minLabel:"Jan 2020",maxLabel:"Mar 2026",minColour:"#C8D6E5",maxColour:"#2E86DE"},hasUnclassified:!1},D={title:"Colour Engine/ColourLegend",component:y,parameters:{layout:"padded",docs:{description:{component:"ColourLegend renders a gradient bar for continuous dimensions (Age) and discrete colour swatches for categorical dimensions (Tag)."}}},tags:["autodocs"],decorators:[r=>e.jsx(w,{children:e.jsx("div",{style:{maxWidth:250},children:e.jsx(r,{})})})]},n={args:{legend:U,unclassifiedColour:"#999999"},parameters:{docs:{description:{story:'Categorical legend with discrete colour swatches. Includes an "Unclassified" entry for items without metadata.'}}}},a={args:{legend:j,unclassifiedColour:"#999999"},parameters:{docs:{description:{story:"Gradient legend with a continuous colour bar showing the date range from oldest (faded) to most recent (vivid)."}}}},o={args:{legend:null,unclassifiedColour:"#999999"},parameters:{docs:{description:{story:"When no colour dimension is active, the legend renders nothing."}}}},E={...j,hasUnclassified:!0},i={args:{legend:E,unclassifiedColour:"#999999"},parameters:{docs:{description:{story:'Gradient legend with an additional "Unclassified" entry for items missing date metadata.'}}}};var l,c,u;n.parameters={...n.parameters,docs:{...(l=n.parameters)==null?void 0:l.docs,source:{originalSource:`{
  args: {
    legend: categoricalLegend,
    unclassifiedColour: '#999999'
  },
  parameters: {
    docs: {
      description: {
        story: 'Categorical legend with discrete colour swatches. Includes an "Unclassified" entry for items without metadata.'
      }
    }
  }
}`,...(u=(c=n.parameters)==null?void 0:c.docs)==null?void 0:u.source}}};var g,m,p;a.parameters={...a.parameters,docs:{...(g=a.parameters)==null?void 0:g.docs,source:{originalSource:`{
  args: {
    legend: gradientLegend,
    unclassifiedColour: '#999999'
  },
  parameters: {
    docs: {
      description: {
        story: 'Gradient legend with a continuous colour bar showing the date range from oldest (faded) to most recent (vivid).'
      }
    }
  }
}`,...(p=(m=a.parameters)==null?void 0:m.docs)==null?void 0:p.source}}};var f,h,b;o.parameters={...o.parameters,docs:{...(f=o.parameters)==null?void 0:f.docs,source:{originalSource:`{
  args: {
    legend: null,
    unclassifiedColour: '#999999'
  },
  parameters: {
    docs: {
      description: {
        story: 'When no colour dimension is active, the legend renders nothing.'
      }
    }
  }
}`,...(b=(h=o.parameters)==null?void 0:h.docs)==null?void 0:b.source}}};var C,_,x;i.parameters={...i.parameters,docs:{...(C=i.parameters)==null?void 0:C.docs,source:{originalSource:`{
  args: {
    legend: gradientWithUnclassified,
    unclassifiedColour: '#999999'
  },
  parameters: {
    docs: {
      description: {
        story: 'Gradient legend with an additional "Unclassified" entry for items missing date metadata.'
      }
    }
  }
}`,...(x=(_=i.parameters)==null?void 0:_.docs)==null?void 0:x.source}}};const $=["Categorical","Gradient","NoLegend","GradientWithUnclassified"];export{n as Categorical,a as Gradient,i as GradientWithUnclassified,o as NoLegend,$ as __namedExportsOrder,D as default};
