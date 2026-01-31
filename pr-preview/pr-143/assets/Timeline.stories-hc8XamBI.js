import{j as c}from"./jsx-runtime-DF2Pcvd1.js";import{r as p}from"./index-B2-qRKKC.js";import{i as pe,g as we,a as Se}from"./labels-DlaBaZmR.js";import{T as he}from"./ThemeProvider-KrJW1DiK.js";import"./_commonjsHelpers-Cpj98o6Y.js";function ke(e){const r=Array.isArray(e)?e:e.features;if(r.length===0)return null;let t=1/0,n=-1/0;for(const o of r)if(pe(o)){const l=x(o.properties.start_time),a=x(o.properties.end_time);l!==null&&(t=Math.min(t,l)),a!==null&&(n=Math.max(n,a))}else{const l=o.properties;if(l.valid_from){const a=x(l.valid_from);a!==null&&(t=Math.min(t,a))}if(l.valid_until){const a=x(l.valid_until);a!==null&&(n=Math.max(n,a))}}return t===1/0||n===-1/0?null:[t,n]}function x(e){if(!e)return null;const r=Date.parse(e);return isNaN(r)?null:r}function Ce(e,r="medium"){const t=new Date(e);switch(r){case"short":return t.toLocaleTimeString(void 0,{hour:"2-digit",minute:"2-digit"});case"long":return t.toLocaleString(void 0,{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"});case"medium":default:return t.toLocaleString(void 0,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}}function Re(e,r){const t=[1e3,5e3,1e4,3e4,6e4,3e5,6e5,18e5,36e5,72e5,144e5,216e5,432e5,864e5,1728e5,6048e5];for(const n of t)if(e/n<=r)return n;return t[t.length-1]??6048e5}function Ee(e,r){const{width:t,height:n,timeExtent:o,fontFamily:l="-apple-system, BlinkMacSystemFont, sans-serif",fontSize:a=10,textColor:v="#666666",gridColor:R="rgba(0, 0, 0, 0.1)",tickColor:T="#999999"}=r,[g,b]=o,s=b-g;if(s<=0)return;e.clearRect(0,0,t,n),e.fillStyle="var(--debrief-bg-secondary, #f8f9fa)",e.fillRect(0,0,t,n),e.strokeStyle=R,e.lineWidth=1,e.beginPath(),e.moveTo(0,.5),e.lineTo(t,.5),e.stroke();const h=Math.floor(t/80),w=Re(s,h),m=Math.ceil(g/w)*w;e.font=`${a}px ${l}`,e.textAlign="center",e.textBaseline="top";for(let S=m;S<=b;S+=w){const k=(S-g)/s*t;e.strokeStyle=T,e.beginPath(),e.moveTo(k,0),e.lineTo(k,6),e.stroke();const d=Ce(S,"short");e.fillStyle=v,e.fillText(d,k,8)}if(s>864e5){e.textAlign="left",e.fillStyle=v;const S=new Date(g).toLocaleDateString();e.fillText(S,4,8)}}function xe(e,r){const{width:t,timeExtent:n,barHeight:o=24,barPadding:l=4,selectedIds:a=new Set}=r,[v,R]=n,T=R-v;if(T<=0)return[];const g=[];let b=l;for(const s of e){let h=null,w=null;if(pe(s)?(h=x(s.properties.start_time),w=x(s.properties.end_time)):(h=x(s.properties.valid_from),w=x(s.properties.valid_until)),h===null||w===null)continue;const m=(h-v)/T*t,S=Math.max(4,(w-h)/T*t);g.push({featureId:s.id,x:Math.max(0,m),y:b,width:Math.min(S,t-m),height:o,label:Se(s),color:we(s),isSelected:a.has(s.id)}),b+=o+l}return g}function _e(e,r,t){const{width:n,height:o,barRadius:l=3,selectionColor:a="rgba(0, 102, 204, 0.3)",fontFamily:v="-apple-system, BlinkMacSystemFont, sans-serif",fontSize:R=11}=t;e.clearRect(0,0,n,o),e.fillStyle="var(--debrief-bg-primary, #ffffff)",e.fillRect(0,0,n,o),e.strokeStyle="var(--debrief-timeline-grid-color, rgba(0, 0, 0, 0.05))",e.lineWidth=1;for(const T of r)e.beginPath(),e.moveTo(0,T.y+T.height+2),e.lineTo(n,T.y+T.height+2),e.stroke();for(const T of r){const{x:g,y:b,width:s,height:h,color:w,isSelected:m,label:S}=T;if(m&&(e.fillStyle=a,e.fillRect(0,b-2,n,h+4),e.strokeStyle="var(--debrief-selection-border, #0066cc)",e.lineWidth=2,e.strokeRect(g-1,b-1,s+2,h+2)),e.fillStyle=w,e.beginPath(),s>l*2?e.roundRect(g,b,s,h,l):e.rect(g,b,s,h),e.fill(),e.strokeStyle="rgba(0, 0, 0, 0.2)",e.lineWidth=1,e.stroke(),s>40){e.font=`${R}px ${v}`,e.fillStyle="#ffffff",e.textAlign="left",e.textBaseline="middle";const k=s-8;let d=S,y=e.measureText(d).width;for(;y>k&&d.length>3;)d=d.slice(0,-4)+"...",y=e.measureText(d).width;y<=k&&(e.shadowColor="rgba(0, 0, 0, 0.5)",e.shadowBlur=2,e.shadowOffsetX=1,e.shadowOffsetY=1,e.fillText(d,g+4,b+h/2),e.shadowColor="transparent",e.shadowBlur=0)}}}function $(e,r,t){for(const n of t)if(e>=n.x&&e<=n.x+n.width&&r>=n.y&&r<=n.y+n.height)return n;return null}function M({features:e,selectedIds:r=new Set,onSelect:t,onBackgroundClick:n,onTimeRangeChange:o,timeExtent:l,height:a=200,barHeight:v=24,className:R,style:T}){var q;const g=p.useRef(null),b=p.useRef(null),s=p.useRef(null),[h,w]=p.useState(null),[m,S]=p.useState(0),k=p.useMemo(()=>Array.isArray(e)?e:e.features,[e]),d=p.useMemo(()=>l||ke(k),[k,l]),y=p.useMemo(()=>!d||m===0?[]:xe(k,{width:m,timeExtent:d,barHeight:v,selectedIds:r}),[k,d,m,a,v,r]);p.useEffect(()=>{const i=g.current;if(!i)return;const u=new ResizeObserver(f=>{for(const E of f)S(E.contentRect.width)});return u.observe(i),S(i.clientWidth),()=>u.disconnect()},[]),p.useEffect(()=>{const i=b.current;if(!i||!d||m===0)return;const u=i.getContext("2d");if(!u)return;const f=window.devicePixelRatio||1;i.width=m*f,i.height=32*f,u.scale(f,f),Ee(u,{width:m,height:32,timeExtent:d})},[m,d]),p.useEffect(()=>{const i=s.current;if(!i||!d||m===0)return;const u=i.getContext("2d");if(!u)return;const f=window.devicePixelRatio||1,E=a-32;i.width=m*f,i.height=E*f,u.scale(f,f),_e(u,y,{width:m,height:E})},[m,d,y,a,v,r]);const ye=p.useCallback(i=>{const u=s.current;if(!u)return;const f=u.getBoundingClientRect(),E=i.clientX-f.left,B=i.clientY-f.top,_=$(E,B,y);_?t==null||t(_.featureId,i):n==null||n()},[y,t,n]),Te=p.useCallback(i=>{const u=s.current;if(!u)return;const f=u.getBoundingClientRect(),E=i.clientX-f.left,B=i.clientY-f.top,_=$(E,B,y);w((_==null?void 0:_.featureId)??null),u.style.cursor=_?"pointer":"default"},[y]),be=p.useCallback(()=>{w(null)},[]),H={height:a,...T},ve=p.useMemo(()=>{if(y.length===0)return a-32;const i=y[y.length-1];return Math.max(a-32,((i==null?void 0:i.y)??0)+v+8)},[y,a,v]);return d?c.jsxs("div",{ref:g,className:`debrief-timeline ${R??""}`,style:H,children:[c.jsx("canvas",{ref:b,className:"debrief-timeline__axis",style:{width:"100%",height:32}}),c.jsx("div",{className:"debrief-timeline__bars-container",style:{height:a-32},children:c.jsx("canvas",{ref:s,className:"debrief-timeline__bars",style:{width:"100%",height:ve},onClick:ye,onMouseMove:Te,onMouseLeave:be})}),h&&c.jsx("div",{className:"debrief-timeline__tooltip",children:(q=y.find(i=>i.featureId===h))==null?void 0:q.label})]}):c.jsx("div",{className:`debrief-timeline debrief-timeline--empty ${R??""}`,style:H,children:c.jsx("div",{className:"debrief-timeline__empty-message",children:"No temporal data available"})})}M.__docgenInfo={description:`Timeline component for displaying features on a time axis.
Uses HTML5 Canvas for efficient rendering of many features.

@example
\`\`\`tsx
import { Timeline } from '@debrief/components/Timeline';

<Timeline
  features={plotData}
  selectedIds={selection.selectedIds}
  onSelect={(id) => selection.toggle(id)}
/>
\`\`\``,methods:[],displayName:"Timeline",props:{features:{required:!0,tsType:{name:"union",raw:"DebriefFeatureCollection | DebriefFeature[]",elements:[{name:"DebriefFeatureCollection"},{name:"Array",elements:[{name:"union",raw:"TrackFeature | ReferenceLocation",elements:[{name:"TrackFeature"},{name:"ReferenceLocation"}]}],raw:"DebriefFeature[]"}]},description:"GeoJSON features to display"},selectedIds:{required:!1,tsType:{name:"Set",elements:[{name:"string"}],raw:"Set<string>"},description:"Set of selected feature IDs",defaultValue:{value:"new Set()",computed:!1}},onSelect:{required:!1,tsType:{name:"signature",type:"function",raw:"(featureId: string, event: React.MouseEvent) => void",signature:{arguments:[{type:{name:"string"},name:"featureId"},{type:{name:"ReactMouseEvent",raw:"React.MouseEvent"},name:"event"}],return:{name:"void"}}},description:"Callback when a feature bar is clicked"},onBackgroundClick:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:"Callback when clicking empty space"},onTimeRangeChange:{required:!1,tsType:{name:"signature",type:"function",raw:"(timeExtent: TimeExtent) => void",signature:{arguments:[{type:{name:"tuple",raw:"[number, number]",elements:[{name:"number"},{name:"number"}]},name:"timeExtent"}],return:{name:"void"}}},description:"Callback when visible time range changes"},timeExtent:{required:!1,tsType:{name:"tuple",raw:"[number, number]",elements:[{name:"number"},{name:"number"}]},description:"Override time extent (for synchronized views)"},height:{required:!1,tsType:{name:"number"},description:"Height of the component",defaultValue:{value:"200",computed:!1}},barHeight:{required:!1,tsType:{name:"number"},description:"Height of each feature bar",defaultValue:{value:"24",computed:!1}},className:{required:!1,tsType:{name:"string"},description:"CSS class name"},style:{required:!1,tsType:{name:"ReactCSSProperties",raw:"React.CSSProperties"},description:"Inline styles"}}};const Ae={title:"Components/Timeline",component:M,parameters:{layout:"padded",docs:{description:{component:"Timeline displays features on a time axis using HTML5 Canvas for efficient rendering. Supports selection, time range adjustment, and theming."}}},tags:["autodocs"],decorators:[e=>c.jsx(he,{children:c.jsx(e,{})})]};function W(e,r){const t=[],n=["OWNSHIP","CONTACT","REFERENCE","SOLUTION"];for(let o=0;o<e;o++){const l=Math.random()*4*60*60*1e3,a=(1+Math.random()*3)*60*60*1e3;t.push({type:"Feature",id:`track-${o.toString().padStart(3,"0")}`,geometry:{type:"LineString",coordinates:[[-5,50],[-4,51]]},properties:{kind:"TRACK",platform_id:`PLT-${o.toString().padStart(3,"0")}`,platform_name:`Vessel ${o+1}`,track_type:n[o%4]??"CONTACT",start_time:new Date(r+l).toISOString(),end_time:new Date(r+l+a).toISOString(),positions:[]}})}return t}const C=Date.parse("2024-01-15T06:00:00Z"),Me=W(5,C),j={type:"FeatureCollection",features:Me},F={args:{features:j,height:200},parameters:{docs:{description:{story:"Basic timeline with several tracks showing temporal spans."}}}};function je(){const[e,r]=p.useState(new Set),t=o=>{r(l=>{const a=new Set(l);return a.has(o)?a.delete(o):a.add(o),a})},n=()=>{r(new Set)};return c.jsxs("div",{children:[c.jsxs("div",{style:{marginBottom:16},children:[c.jsx("strong",{children:"Selected:"})," ",e.size>0?Array.from(e).join(", "):"None"]}),c.jsx(M,{features:j,selectedIds:e,onSelect:t,onBackgroundClick:n,height:250})]})}const I={render:()=>c.jsx(je,{}),parameters:{docs:{description:{story:"Click on bars to select them. Click background to clear selection."}}}},ge=W(8,C);ge.forEach((e,r)=>{const t=r*.5*60*60*1e3;e.properties.start_time=new Date(C+t).toISOString(),e.properties.end_time=new Date(C+t+3*60*60*1e3).toISOString()});const D={args:{features:{type:"FeatureCollection",features:ge},height:300},parameters:{docs:{description:{story:"Timeline with overlapping time ranges. Each track gets its own row."}}}};function Fe(){const[e,r]=p.useState([C,C+216e5]),t=()=>{r([C-2*60*60*1e3,C+10*60*60*1e3])},n=()=>{r([C+1*60*60*1e3,C+4*60*60*1e3])};return c.jsxs("div",{children:[c.jsxs("div",{style:{marginBottom:16},children:[c.jsx("button",{onClick:t,style:{marginRight:8},children:"Expand Range"}),c.jsx("button",{onClick:n,children:"Contract Range"})]}),c.jsx(M,{features:j,timeExtent:e,height:200})]})}const O={render:()=>c.jsx(Fe,{}),parameters:{docs:{description:{story:"Timeline with custom time extent override. Use buttons to adjust visible range."}}}},Ie=W(50,C),N={args:{features:{type:"FeatureCollection",features:Ie},height:400},parameters:{docs:{description:{story:"Performance test with 50 tracks. Timeline should scroll smoothly."}}}},L={args:{features:{type:"FeatureCollection",features:[]},height:200},parameters:{docs:{description:{story:"Timeline with no temporal data shows empty message."}}}},P={args:{features:j,height:300,barHeight:36},parameters:{docs:{description:{story:"Timeline with larger bar height for better visibility."}}}},A={render:()=>c.jsx(he,{theme:{variant:"dark"},children:c.jsx(M,{features:j,height:200})}),parameters:{backgrounds:{default:"dark"},docs:{description:{story:"Timeline with dark theme applied."}}}};var z,U,V;F.parameters={...F.parameters,docs:{...(z=F.parameters)==null?void 0:z.docs,source:{originalSource:`{
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
}`,...(V=(U=F.parameters)==null?void 0:U.docs)==null?void 0:V.source}}};var X,Y,G;I.parameters={...I.parameters,docs:{...(X=I.parameters)==null?void 0:X.docs,source:{originalSource:`{
  render: () => <SelectableTimelineExample />,
  parameters: {
    docs: {
      description: {
        story: 'Click on bars to select them. Click background to clear selection.'
      }
    }
  }
}`,...(G=(Y=I.parameters)==null?void 0:Y.docs)==null?void 0:G.source}}};var J,K,Z;D.parameters={...D.parameters,docs:{...(J=D.parameters)==null?void 0:J.docs,source:{originalSource:`{
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
}`,...(Z=(K=D.parameters)==null?void 0:K.docs)==null?void 0:Z.source}}};var Q,ee,te;O.parameters={...O.parameters,docs:{...(Q=O.parameters)==null?void 0:Q.docs,source:{originalSource:`{
  render: () => <TimeRangeExample />,
  parameters: {
    docs: {
      description: {
        story: 'Timeline with custom time extent override. Use buttons to adjust visible range.'
      }
    }
  }
}`,...(te=(ee=O.parameters)==null?void 0:ee.docs)==null?void 0:te.source}}};var ne,re,ae;N.parameters={...N.parameters,docs:{...(ne=N.parameters)==null?void 0:ne.docs,source:{originalSource:`{
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
}`,...(ae=(re=N.parameters)==null?void 0:re.docs)==null?void 0:ae.source}}};var se,ie,oe;L.parameters={...L.parameters,docs:{...(se=L.parameters)==null?void 0:se.docs,source:{originalSource:`{
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
}`,...(oe=(ie=L.parameters)==null?void 0:ie.docs)==null?void 0:oe.source}}};var le,ce,me;P.parameters={...P.parameters,docs:{...(le=P.parameters)==null?void 0:le.docs,source:{originalSource:`{
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
}`,...(me=(ce=P.parameters)==null?void 0:ce.docs)==null?void 0:me.source}}};var de,ue,fe;A.parameters={...A.parameters,docs:{...(de=A.parameters)==null?void 0:de.docs,source:{originalSource:`{
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
}`,...(fe=(ue=A.parameters)==null?void 0:ue.docs)==null?void 0:fe.source}}};const Be=["Default","WithSelection","Overlapping","CustomTimeRange","ManyTracks","Empty","CustomBarHeight","DarkTheme"];export{P as CustomBarHeight,O as CustomTimeRange,A as DarkTheme,F as Default,L as Empty,N as ManyTracks,D as Overlapping,I as WithSelection,Be as __namedExportsOrder,Ae as default};
