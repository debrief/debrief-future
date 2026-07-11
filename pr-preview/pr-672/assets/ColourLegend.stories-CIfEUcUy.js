import{j as a}from"./jsx-runtime-DF2Pcvd1.js";import{C as b}from"./ColourLegend-D38NEJCw.js";import{T as w}from"./ThemeProvider-CkyXO63D.js";import"./index-B2-qRKKC.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./defaultTheme-Tx6C8nph.js";const v={id:"tag",label:"Tag",type:"categorical",resolve:()=>null},L={id:"age",label:"Age",type:"gradient",resolve:()=>null},U={dimension:v,entries:[{label:"Frigate",colour:"#4477AA",count:12},{label:"Destroyer",colour:"#EE6677",count:8},{label:"Submarine",colour:"#228833",count:5},{label:"Carrier",colour:"#CCBB44",count:3},{label:"Corvette",colour:"#66CCEE",count:2}],gradient:null,hasUnclassified:!0},C={dimension:L,entries:[],gradient:{minLabel:"Jan 2020",maxLabel:"Mar 2026",minColour:"#C8D6E5",maxColour:"#2E86DE"},hasUnclassified:!1},A={title:"Colour Engine/ColourLegend",component:b,parameters:{layout:"padded",docs:{description:{component:"ColourLegend renders a gradient bar for continuous dimensions (Age) and discrete colour swatches for categorical dimensions (Tag)."}}},tags:["autodocs"],decorators:[y=>a.jsx(w,{children:a.jsx("div",{style:{maxWidth:250},children:a.jsx(y,{})})})]},e={args:{legend:U,unclassifiedColour:"#999999"},parameters:{docs:{description:{story:'Categorical legend with discrete colour swatches. Includes an "Unclassified" entry for items without metadata.'}}}},r={args:{legend:C,unclassifiedColour:"#999999"},parameters:{docs:{description:{story:"Gradient legend with a continuous colour bar showing the date range from oldest (faded) to most recent (vivid)."}}}},o={args:{legend:null,unclassifiedColour:"#999999"},parameters:{docs:{description:{story:"When no colour dimension is active, the legend renders nothing."}}}},x={...C,hasUnclassified:!0},s={args:{legend:x,unclassifiedColour:"#999999"},parameters:{docs:{description:{story:'Gradient legend with an additional "Unclassified" entry for items missing date metadata.'}}}};var n,t,i;e.parameters={...e.parameters,docs:{...(n=e.parameters)==null?void 0:n.docs,source:{originalSource:`{
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
}`,...(i=(t=e.parameters)==null?void 0:t.docs)==null?void 0:i.source}}};var d,c,l;r.parameters={...r.parameters,docs:{...(d=r.parameters)==null?void 0:d.docs,source:{originalSource:`{
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
}`,...(l=(c=r.parameters)==null?void 0:c.docs)==null?void 0:l.source}}};var u,g,m;o.parameters={...o.parameters,docs:{...(u=o.parameters)==null?void 0:u.docs,source:{originalSource:`{
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
}`,...(m=(g=o.parameters)==null?void 0:g.docs)==null?void 0:m.source}}};var p,f,h;s.parameters={...s.parameters,docs:{...(p=s.parameters)==null?void 0:p.docs,source:{originalSource:`{
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
}`,...(h=(f=s.parameters)==null?void 0:f.docs)==null?void 0:h.source}}};const T=["Categorical","Gradient","NoLegend","GradientWithUnclassified"];export{e as Categorical,r as Gradient,s as GradientWithUnclassified,o as NoLegend,T as __namedExportsOrder,A as default};
