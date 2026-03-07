import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{T as w}from"./ThemeProvider-mvcGjblv.js";import"./index-B2-qRKKC.js";import"./_commonjsHelpers-Cpj98o6Y.js";const y=({legend:s,unclassifiedColour:j,className:t})=>{if(!s)return null;const l=s.gradient!==null;return e.jsxs("div",{className:`debrief-colour-legend${t?` ${t}`:""}`,"data-testid":"colour-legend",role:"region","aria-label":`Colour legend: ${s.dimension.label}`,children:[e.jsx("div",{className:"debrief-colour-legend__title","data-testid":"colour-legend-title",children:s.dimension.label}),l&&s.gradient&&e.jsxs("div",{className:"debrief-colour-legend__gradient","data-testid":"colour-legend-gradient",children:[e.jsxs("div",{className:"debrief-colour-legend__gradient-labels",children:[e.jsx("span",{children:s.gradient.minLabel}),e.jsx("span",{children:s.gradient.maxLabel})]}),e.jsx("div",{className:"debrief-colour-legend__gradient-bar",style:{background:`linear-gradient(to right, ${s.gradient.minColour}, ${s.gradient.maxColour})`}})]}),!l&&s.entries.length>0&&e.jsx("div",{className:"debrief-colour-legend__entries","data-testid":"colour-legend-entries",children:s.entries.map(r=>e.jsxs("div",{className:"debrief-colour-legend__entry",children:[e.jsx("span",{className:"debrief-colour-legend__swatch",style:{backgroundColor:r.colour}}),e.jsx("span",{className:"debrief-colour-legend__entry-label",children:r.label}),e.jsxs("span",{className:"debrief-colour-legend__entry-count",children:["(",r.count,")"]})]},r.label))}),s.hasUnclassified&&e.jsxs("div",{className:"debrief-colour-legend__entry debrief-colour-legend__entry--unclassified",children:[e.jsx("span",{className:"debrief-colour-legend__swatch",style:{backgroundColor:j}}),e.jsx("span",{className:"debrief-colour-legend__entry-label",children:"Unclassified"})]})]})};y.__docgenInfo={description:"",methods:[],displayName:"ColourLegend",props:{legend:{required:!0,tsType:{name:"union",raw:"LegendModel | null",elements:[{name:"LegendModel"},{name:"null"}]},description:"Legend model to render (null = no legend shown)"},unclassifiedColour:{required:!0,tsType:{name:"string"},description:'Colour for "Unclassified" items (shown when legend.hasUnclassified)'},className:{required:!1,tsType:{name:"string"},description:"Additional CSS class name"}}};const L={id:"vessel-class",label:"Vessel Class",type:"categorical",resolve:()=>null},N={id:"age",label:"Age",type:"gradient",resolve:()=>null},U={dimension:L,entries:[{label:"Frigate",colour:"#4477AA",count:12},{label:"Destroyer",colour:"#EE6677",count:8},{label:"Submarine",colour:"#228833",count:5},{label:"Carrier",colour:"#CCBB44",count:3},{label:"Corvette",colour:"#66CCEE",count:2}],gradient:null,hasUnclassified:!0},v={dimension:N,entries:[],gradient:{minLabel:"Jan 2020",maxLabel:"Mar 2026",minColour:"#C8D6E5",maxColour:"#2E86DE"},hasUnclassified:!1},A={title:"Colour Engine/ColourLegend",component:y,parameters:{layout:"padded",docs:{description:{component:"ColourLegend renders a gradient bar for continuous dimensions (Age) and discrete colour swatches for categorical dimensions (Vessel Class, Tag)."}}},tags:["autodocs"],decorators:[s=>e.jsx(w,{children:e.jsx("div",{style:{maxWidth:250},children:e.jsx(s,{})})})]},n={args:{legend:U,unclassifiedColour:"#999999"},parameters:{docs:{description:{story:'Categorical legend with discrete colour swatches, one per vessel class. Includes an "Unclassified" entry for items without metadata.'}}}},a={args:{legend:v,unclassifiedColour:"#999999"},parameters:{docs:{description:{story:"Gradient legend with a continuous colour bar showing the date range from oldest (faded) to most recent (vivid)."}}}},o={args:{legend:null,unclassifiedColour:"#999999"},parameters:{docs:{description:{story:"When no colour dimension is active, the legend renders nothing."}}}},E={...v,hasUnclassified:!0},i={args:{legend:E,unclassifiedColour:"#999999"},parameters:{docs:{description:{story:'Gradient legend with an additional "Unclassified" entry for items missing date metadata.'}}}};var d,c,u;n.parameters={...n.parameters,docs:{...(d=n.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    legend: categoricalLegend,
    unclassifiedColour: '#999999'
  },
  parameters: {
    docs: {
      description: {
        story: 'Categorical legend with discrete colour swatches, one per vessel class. Includes an "Unclassified" entry for items without metadata.'
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
}`,...(x=(_=i.parameters)==null?void 0:_.docs)==null?void 0:x.source}}};const D=["Categorical","Gradient","NoLegend","GradientWithUnclassified"];export{n as Categorical,a as Gradient,i as GradientWithUnclassified,o as NoLegend,D as __namedExportsOrder,A as default};
