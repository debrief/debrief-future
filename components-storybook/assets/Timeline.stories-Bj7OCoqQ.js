import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r as z}from"./index-B2-qRKKC.js";import{T as y}from"./Timeline-CA9UvHjZ.js";import{T as K}from"./ThemeProvider-CkyXO63D.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./time-CSps8V6f.js";import"./interval-CUv8kruJ.js";import"./types-CuJnRqfe.js";import"./labels-Bx3GzQt_.js";import"./defaultTheme-Tx6C8nph.js";const ie={title:"Components/Timeline",component:y,parameters:{layout:"padded",docs:{description:{component:"Timeline displays features on a time axis using HTML5 Canvas for efficient rendering. Supports selection, time range adjustment, and theming."}}},tags:["autodocs"],decorators:[t=>e.jsx(K,{children:e.jsx(t,{})})]};function k(t,s){const n=[],i=["OWNSHIP","CONTACT","REFERENCE","SOLUTION"];for(let a=0;a<t;a++){const m=Math.random()*4*60*60*1e3,o=(1+Math.random()*3)*60*60*1e3;n.push({type:"Feature",id:`track-${a.toString().padStart(3,"0")}`,geometry:{type:"LineString",coordinates:[[-5,50],[-4,51]]},properties:{kind:"TRACK",platform_id:`PLT-${a.toString().padStart(3,"0")}`,platform_name:`Vessel ${a+1}`,track_type:i[a%4]??"CONTACT",start_time:new Date(s+m).toISOString(),end_time:new Date(s+m+o).toISOString(),positions:[]}})}return n}const r=Date.parse("2024-01-15T06:00:00Z"),Z=k(5,r),c={type:"FeatureCollection",features:Z},p={args:{features:c,height:200},parameters:{docs:{description:{story:"Basic timeline with several tracks showing temporal spans."}}}};function q(){const[t,s]=z.useState(new Set),n=a=>{s(m=>{const o=new Set(m);return o.has(a)?o.delete(a):o.add(a),o})},i=()=>{s(new Set)};return e.jsxs("div",{children:[e.jsxs("div",{style:{marginBottom:16},children:[e.jsx("strong",{children:"Selected:"})," ",t.size>0?Array.from(t).join(", "):"None"]}),e.jsx(y,{features:c,selectedIds:t,onSelect:n,onBackgroundClick:i,height:250})]})}const d={render:()=>e.jsx(q,{}),parameters:{docs:{description:{story:"Click on bars to select them. Click background to clear selection."}}}},V=k(8,r);V.forEach((t,s)=>{const n=s*.5*60*60*1e3;t.properties.start_time=new Date(r+n).toISOString(),t.properties.end_time=new Date(r+n+3*60*60*1e3).toISOString()});const l={args:{features:{type:"FeatureCollection",features:V},height:300},parameters:{docs:{description:{story:"Timeline with overlapping time ranges. Each track gets its own row."}}}};function G(){const[t,s]=z.useState([r,r+216e5]),n=()=>{s([r-2*60*60*1e3,r+10*60*60*1e3])},i=()=>{s([r+1*60*60*1e3,r+4*60*60*1e3])};return e.jsxs("div",{children:[e.jsxs("div",{style:{marginBottom:16},children:[e.jsx("button",{onClick:n,style:{marginRight:8},children:"Expand Range"}),e.jsx("button",{onClick:i,children:"Contract Range"})]}),e.jsx(y,{features:c,timeExtent:t,height:200})]})}const u={render:()=>e.jsx(G,{}),parameters:{docs:{description:{story:"Timeline with custom time extent override. Use buttons to adjust visible range."}}}},J=k(50,r),h={args:{features:{type:"FeatureCollection",features:J},height:400},parameters:{docs:{description:{story:"Performance test with 50 tracks. Timeline should scroll smoothly."}}}},g={args:{features:{type:"FeatureCollection",features:[]},height:200},parameters:{docs:{description:{story:"Timeline with no temporal data shows empty message."}}}},f={args:{features:c,height:300,barHeight:36},parameters:{docs:{description:{story:"Timeline with larger bar height for better visibility."}}}},T={render:()=>e.jsx(K,{theme:{variant:"dark"},children:e.jsx(y,{features:c,height:200})}),parameters:{backgrounds:{default:"dark"},docs:{description:{story:"Timeline with dark theme applied."}}}};var S,x,w;p.parameters={...p.parameters,docs:{...(S=p.parameters)==null?void 0:S.docs,source:{originalSource:`{
  args: {
    features: sampleData,
    height: 200
  },
  parameters: {
    docs: {
      description: {
        story: 'Basic timeline with several tracks showing temporal spans.'
      }
    }
  }
}`,...(w=(x=p.parameters)==null?void 0:x.docs)==null?void 0:w.source}}};var C,v,b;d.parameters={...d.parameters,docs:{...(C=d.parameters)==null?void 0:C.docs,source:{originalSource:`{
  render: () => <SelectableTimelineExample />,
  parameters: {
    docs: {
      description: {
        story: 'Click on bars to select them. Click background to clear selection.'
      }
    }
  }
}`,...(b=(v=d.parameters)==null?void 0:v.docs)==null?void 0:b.source}}};var j,E,O;l.parameters={...l.parameters,docs:{...(j=l.parameters)==null?void 0:j.docs,source:{originalSource:`{
  args: {
    features: {
      type: 'FeatureCollection',
      features: overlappingTracks
    },
    height: 300
  },
  parameters: {
    docs: {
      description: {
        story: 'Timeline with overlapping time ranges. Each track gets its own row.'
      }
    }
  }
}`,...(O=(E=l.parameters)==null?void 0:E.docs)==null?void 0:O.source}}};var D,R,F;u.parameters={...u.parameters,docs:{...(D=u.parameters)==null?void 0:D.docs,source:{originalSource:`{
  render: () => <TimeRangeExample />,
  parameters: {
    docs: {
      description: {
        story: 'Timeline with custom time extent override. Use buttons to adjust visible range.'
      }
    }
  }
}`,...(F=(R=u.parameters)==null?void 0:R.docs)==null?void 0:F.source}}};var _,B,I;h.parameters={...h.parameters,docs:{...(_=h.parameters)==null?void 0:_.docs,source:{originalSource:`{
  args: {
    features: {
      type: 'FeatureCollection',
      features: manyTracks
    },
    height: 400
  },
  parameters: {
    docs: {
      description: {
        story: 'Performance test with 50 tracks. Timeline should scroll smoothly.'
      }
    }
  }
}`,...(I=(B=h.parameters)==null?void 0:B.docs)==null?void 0:I.source}}};var P,H,N;g.parameters={...g.parameters,docs:{...(P=g.parameters)==null?void 0:P.docs,source:{originalSource:`{
  args: {
    features: {
      type: 'FeatureCollection',
      features: []
    },
    height: 200
  },
  parameters: {
    docs: {
      description: {
        story: 'Timeline with no temporal data shows empty message.'
      }
    }
  }
}`,...(N=(H=g.parameters)==null?void 0:H.docs)==null?void 0:N.source}}};var M,A,L;f.parameters={...f.parameters,docs:{...(M=f.parameters)==null?void 0:M.docs,source:{originalSource:`{
  args: {
    features: sampleData,
    height: 300,
    barHeight: 36
  },
  parameters: {
    docs: {
      description: {
        story: 'Timeline with larger bar height for better visibility.'
      }
    }
  }
}`,...(L=(A=f.parameters)==null?void 0:A.docs)==null?void 0:L.source}}};var U,W,$;T.parameters={...T.parameters,docs:{...(U=T.parameters)==null?void 0:U.docs,source:{originalSource:`{
  render: () => <ThemeProvider theme={{
    variant: 'dark'
  }}>
      <Timeline features={sampleData} height={200} />
    </ThemeProvider>,
  parameters: {
    backgrounds: {
      default: 'dark'
    },
    docs: {
      description: {
        story: 'Timeline with dark theme applied.'
      }
    }
  }
}`,...($=(W=T.parameters)==null?void 0:W.docs)==null?void 0:$.source}}};const ce=["Default","WithSelection","Overlapping","CustomTimeRange","ManyTracks","Empty","CustomBarHeight","DarkTheme"];export{f as CustomBarHeight,u as CustomTimeRange,T as DarkTheme,p as Default,g as Empty,h as ManyTracks,l as Overlapping,d as WithSelection,ce as __namedExportsOrder,ie as default};
