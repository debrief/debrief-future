import{j as i}from"./jsx-runtime-DF2Pcvd1.js";import{r as f}from"./index-B2-qRKKC.js";import{f as ve,p as F,c as we}from"./time-CBN9LM6t.js";import{i as Se,a as ke,d as Ce,g as Re}from"./labels-ebbTtwlG.js";import{T as pe}from"./ThemeProvider-CpMh1h6x.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./interval-BLw0Yh9p.js";import"./types-CuJnRqfe.js";import"./defaultTheme-lXwsM3al.js";function Ee(e,a){const t=[1e3,5e3,1e4,3e4,6e4,3e5,6e5,18e5,36e5,72e5,144e5,216e5,432e5,864e5,1728e5,6048e5];for(const n of t)if(e/n<=a)return n;return t[t.length-1]??6048e5}function xe(e,a){const{width:t,height:n,timeExtent:l,fontFamily:p="-apple-system, BlinkMacSystemFont, sans-serif",fontSize:o=10,textColor:v="#666666",gridColor:R="rgba(0, 0, 0, 0.1)",tickColor:b="#999999"}=a,[g,T]=l,r=T-g;if(r<=0)return;e.clearRect(0,0,t,n),e.fillStyle="var(--debrief-bg-secondary, #f8f9fa)",e.fillRect(0,0,t,n),e.strokeStyle=R,e.lineWidth=1,e.beginPath(),e.moveTo(0,.5),e.lineTo(t,.5),e.stroke();const h=Math.floor(t/80),w=Ee(r,h),c=Math.ceil(g/w)*w;e.font=`${o}px ${p}`,e.textAlign="center",e.textBaseline="top";for(let S=c;S<=T;S+=w){const k=(S-g)/r*t;e.strokeStyle=b,e.beginPath(),e.moveTo(k,0),e.lineTo(k,6),e.stroke();const m=ve(S,"short");e.fillStyle=v,e.fillText(m,k,8)}if(r>864e5){e.textAlign="left",e.fillStyle=v;const S=new Date(g).toLocaleDateString();e.fillText(S,4,8)}}function Me(e,a){const{width:t,timeExtent:n,barHeight:l=24,barPadding:p=4,selectedIds:o=new Set}=a,[v,R]=n,b=R-v;if(b<=0)return[];const g=[];let T=p;for(const r of e){let h=null,w=null;if(Se(r)?(h=F(r.properties.start_time),w=F(r.properties.end_time)):ke(r)&&(h=F(r.properties.valid_from),w=F(r.properties.valid_until)),h===null||w===null)continue;const c=(h-v)/b*t,S=Math.max(4,(w-h)/b*t);g.push({feature_id:r.id,x:Math.max(0,c),y:T,width:Math.min(S,t-c),height:l,label:Re(r),color:Ce(r),isSelected:o.has(r.id)}),T+=l+p}return g}function _e(e,a,t){const{width:n,height:l,barRadius:p=3,selectionColor:o="rgba(0, 102, 204, 0.3)",fontFamily:v="-apple-system, BlinkMacSystemFont, sans-serif",fontSize:R=11}=t;e.clearRect(0,0,n,l),e.fillStyle="var(--debrief-bg-primary, #ffffff)",e.fillRect(0,0,n,l),e.strokeStyle="var(--debrief-timeline-grid-color, rgba(0, 0, 0, 0.05))",e.lineWidth=1;for(const b of a)e.beginPath(),e.moveTo(0,b.y+b.height+2),e.lineTo(n,b.y+b.height+2),e.stroke();for(const b of a){const{x:g,y:T,width:r,height:h,color:w,isSelected:c,label:S}=b;if(c&&(e.fillStyle=o,e.fillRect(0,T-2,n,h+4),e.strokeStyle="var(--debrief-selection-border, #0066cc)",e.lineWidth=2,e.strokeRect(g-1,T-1,r+2,h+2)),e.fillStyle=w,e.beginPath(),r>p*2?e.roundRect(g,T,r,h,p):e.rect(g,T,r,h),e.fill(),e.strokeStyle="rgba(0, 0, 0, 0.2)",e.lineWidth=1,e.stroke(),r>40){e.font=`${R}px ${v}`,e.fillStyle="#ffffff",e.textAlign="left",e.textBaseline="middle";const k=r-8;let m=S,y=e.measureText(m).width;for(;y>k&&m.length>3;)m=m.slice(0,-4)+"...",y=e.measureText(m).width;y<=k&&(e.shadowColor="rgba(0, 0, 0, 0.5)",e.shadowBlur=2,e.shadowOffsetX=1,e.shadowOffsetY=1,e.fillText(m,g+4,T+h/2),e.shadowColor="transparent",e.shadowBlur=0)}}}function $(e,a,t){for(const n of t)if(e>=n.x&&e<=n.x+n.width&&a>=n.y&&a<=n.y+n.height)return n;return null}function M({features:e,selectedIds:a=new Set,onSelect:t,onBackgroundClick:n,onTimeRangeChange:l,timeExtent:p,height:o=200,barHeight:v=24,className:R,style:b}){var q;const g=f.useRef(null),T=f.useRef(null),r=f.useRef(null),[h,w]=f.useState(null),[c,S]=f.useState(0),k=f.useMemo(()=>Array.isArray(e)?e:e.features,[e]),m=f.useMemo(()=>p||we(k),[k,p]),y=f.useMemo(()=>!m||c===0?[]:Me(k,{width:c,timeExtent:m,barHeight:v,selectedIds:a}),[k,m,c,o,v,a]);f.useEffect(()=>{const s=g.current;if(!s)return;const d=new ResizeObserver(u=>{for(const E of u)S(E.contentRect.width)});return d.observe(s),S(s.clientWidth),()=>d.disconnect()},[]),f.useEffect(()=>{const s=T.current;if(!s||!m||c===0)return;const d=s.getContext("2d");if(!d)return;const u=window.devicePixelRatio||1;s.width=c*u,s.height=32*u,d.scale(u,u),xe(d,{width:c,height:32,timeExtent:m})},[c,m]),f.useEffect(()=>{const s=r.current;if(!s||!m||c===0)return;const d=s.getContext("2d");if(!d)return;const u=window.devicePixelRatio||1,E=o-32;s.width=c*u,s.height=E*u,d.scale(u,u),_e(d,y,{width:c,height:E})},[c,m,y,o,v,a]);const ge=f.useCallback(s=>{const d=r.current;if(!d)return;const u=d.getBoundingClientRect(),E=s.clientX-u.left,B=s.clientY-u.top,x=$(E,B,y);x?t==null||t(x.feature_id,s):n==null||n()},[y,t,n]),ye=f.useCallback(s=>{const d=r.current;if(!d)return;const u=d.getBoundingClientRect(),E=s.clientX-u.left,B=s.clientY-u.top,x=$(E,B,y);w((x==null?void 0:x.feature_id)??null),d.style.cursor=x?"pointer":"default"},[y]),be=f.useCallback(()=>{w(null)},[]),H={height:o,...b},Te=f.useMemo(()=>{if(y.length===0)return o-32;const s=y[y.length-1];return Math.max(o-32,((s==null?void 0:s.y)??0)+v+8)},[y,o,v]);return m?i.jsxs("div",{ref:g,className:`debrief-timeline ${R??""}`,style:H,children:[i.jsx("canvas",{ref:T,className:"debrief-timeline__axis",style:{width:"100%",height:32}}),i.jsx("div",{className:"debrief-timeline__bars-container",style:{height:o-32},children:i.jsx("canvas",{ref:r,className:"debrief-timeline__bars",style:{width:"100%",height:Te},onClick:ge,onMouseMove:ye,onMouseLeave:be})}),h&&i.jsx("div",{className:"debrief-timeline__tooltip",children:(q=y.find(s=>s.feature_id===h))==null?void 0:q.label})]}):i.jsx("div",{className:`debrief-timeline debrief-timeline--empty ${R??""}`,style:H,children:i.jsx("div",{className:"debrief-timeline__empty-message",children:"No temporal data available"})})}M.__docgenInfo={description:`Timeline component for displaying features on a time axis.
Uses HTML5 Canvas for efficient rendering of many features.

@example
\`\`\`tsx
import { Timeline } from '@debrief/components/Timeline';

<Timeline
  features={plotData}
  selectedIds={selection.selectedIds}
  onSelect={(id) => selection.toggle(id)}
/>
\`\`\``,methods:[],displayName:"Timeline",props:{features:{required:!0,tsType:{name:"union",raw:"DebriefFeatureCollection | DebriefFeature[]",elements:[{name:"DebriefFeatureCollection"},{name:"Array",elements:[{name:"union",raw:`| TrackFeature
| ReferenceLocation
| MultiPointFeature
| MultiPolygonFeature
| SchemaAnnotationFeature`,elements:[{name:"TrackFeature"},{name:"ReferenceLocation"},{name:"MultiPointFeature"},{name:"MultiPolygonFeature"},{name:"union",raw:`| NarrativeEntry
| CircleAnnotation
| RectangleAnnotation
| LineAnnotation
| TextAnnotation
| VectorAnnotation
| PolyAnnotation`,elements:[{name:"NarrativeEntry"},{name:"CircleAnnotation"},{name:"RectangleAnnotation"},{name:"LineAnnotation"},{name:"TextAnnotation"},{name:"VectorAnnotation"},{name:"PolyAnnotation"}]}]}],raw:"DebriefFeature[]"}]},description:"GeoJSON features to display"},selectedIds:{required:!1,tsType:{name:"Set",elements:[{name:"string"}],raw:"Set<string>"},description:"Set of selected feature IDs",defaultValue:{value:"new Set()",computed:!1}},onSelect:{required:!1,tsType:{name:"signature",type:"function",raw:"(featureId: string, event: React.MouseEvent) => void",signature:{arguments:[{type:{name:"string"},name:"featureId"},{type:{name:"ReactMouseEvent",raw:"React.MouseEvent"},name:"event"}],return:{name:"void"}}},description:"Callback when a feature bar is clicked"},onBackgroundClick:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:"Callback when clicking empty space"},onTimeRangeChange:{required:!1,tsType:{name:"signature",type:"function",raw:"(timeExtent: TimeExtent) => void",signature:{arguments:[{type:{name:"tuple",raw:"[number, number]",elements:[{name:"number"},{name:"number"}]},name:"timeExtent"}],return:{name:"void"}}},description:"Callback when visible time range changes"},timeExtent:{required:!1,tsType:{name:"tuple",raw:"[number, number]",elements:[{name:"number"},{name:"number"}]},description:"Override time extent (for synchronized views)"},height:{required:!1,tsType:{name:"number"},description:"Height of the component",defaultValue:{value:"200",computed:!1}},barHeight:{required:!1,tsType:{name:"number"},description:"Height of each feature bar",defaultValue:{value:"24",computed:!1}},className:{required:!1,tsType:{name:"string"},description:"CSS class name"},style:{required:!1,tsType:{name:"ReactCSSProperties",raw:"React.CSSProperties"},description:"Inline styles"}}};const $e={title:"Components/Timeline",component:M,parameters:{layout:"padded",docs:{description:{component:"Timeline displays features on a time axis using HTML5 Canvas for efficient rendering. Supports selection, time range adjustment, and theming."}}},tags:["autodocs"],decorators:[e=>i.jsx(pe,{children:i.jsx(e,{})})]};function W(e,a){const t=[],n=["OWNSHIP","CONTACT","REFERENCE","SOLUTION"];for(let l=0;l<e;l++){const p=Math.random()*4*60*60*1e3,o=(1+Math.random()*3)*60*60*1e3;t.push({type:"Feature",id:`track-${l.toString().padStart(3,"0")}`,geometry:{type:"LineString",coordinates:[[-5,50],[-4,51]]},properties:{kind:"TRACK",platform_id:`PLT-${l.toString().padStart(3,"0")}`,platform_name:`Vessel ${l+1}`,track_type:n[l%4]??"CONTACT",start_time:new Date(a+p).toISOString(),end_time:new Date(a+p+o).toISOString(),positions:[]}})}return t}const C=Date.parse("2024-01-15T06:00:00Z"),Fe=W(5,C),_={type:"FeatureCollection",features:Fe},j={args:{features:_,height:200},parameters:{docs:{description:{story:"Basic timeline with several tracks showing temporal spans."}}}};function je(){const[e,a]=f.useState(new Set),t=l=>{a(p=>{const o=new Set(p);return o.has(l)?o.delete(l):o.add(l),o})},n=()=>{a(new Set)};return i.jsxs("div",{children:[i.jsxs("div",{style:{marginBottom:16},children:[i.jsx("strong",{children:"Selected:"})," ",e.size>0?Array.from(e).join(", "):"None"]}),i.jsx(M,{features:_,selectedIds:e,onSelect:t,onBackgroundClick:n,height:250})]})}const A={render:()=>i.jsx(je,{}),parameters:{docs:{description:{story:"Click on bars to select them. Click background to clear selection."}}}},he=W(8,C);he.forEach((e,a)=>{const t=a*.5*60*60*1e3;e.properties.start_time=new Date(C+t).toISOString(),e.properties.end_time=new Date(C+t+3*60*60*1e3).toISOString()});const P={args:{features:{type:"FeatureCollection",features:he},height:300},parameters:{docs:{description:{story:"Timeline with overlapping time ranges. Each track gets its own row."}}}};function Ae(){const[e,a]=f.useState([C,C+216e5]),t=()=>{a([C-2*60*60*1e3,C+10*60*60*1e3])},n=()=>{a([C+1*60*60*1e3,C+4*60*60*1e3])};return i.jsxs("div",{children:[i.jsxs("div",{style:{marginBottom:16},children:[i.jsx("button",{onClick:t,style:{marginRight:8},children:"Expand Range"}),i.jsx("button",{onClick:n,children:"Contract Range"})]}),i.jsx(M,{features:_,timeExtent:e,height:200})]})}const D={render:()=>i.jsx(Ae,{}),parameters:{docs:{description:{story:"Timeline with custom time extent override. Use buttons to adjust visible range."}}}},Pe=W(50,C),O={args:{features:{type:"FeatureCollection",features:Pe},height:400},parameters:{docs:{description:{story:"Performance test with 50 tracks. Timeline should scroll smoothly."}}}},N={args:{features:{type:"FeatureCollection",features:[]},height:200},parameters:{docs:{description:{story:"Timeline with no temporal data shows empty message."}}}},I={args:{features:_,height:300,barHeight:36},parameters:{docs:{description:{story:"Timeline with larger bar height for better visibility."}}}},L={render:()=>i.jsx(pe,{theme:{variant:"dark"},children:i.jsx(M,{features:_,height:200})}),parameters:{backgrounds:{default:"dark"},docs:{description:{story:"Timeline with dark theme applied."}}}};var z,V,U;j.parameters={...j.parameters,docs:{...(z=j.parameters)==null?void 0:z.docs,source:{originalSource:`{
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
}`,...(U=(V=j.parameters)==null?void 0:V.docs)==null?void 0:U.source}}};var X,Y,G;A.parameters={...A.parameters,docs:{...(X=A.parameters)==null?void 0:X.docs,source:{originalSource:`{
  render: () => <SelectableTimelineExample />,
  parameters: {
    docs: {
      description: {
        story: 'Click on bars to select them. Click background to clear selection.'
      }
    }
  }
}`,...(G=(Y=A.parameters)==null?void 0:Y.docs)==null?void 0:G.source}}};var J,K,Z;P.parameters={...P.parameters,docs:{...(J=P.parameters)==null?void 0:J.docs,source:{originalSource:`{
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
}`,...(Z=(K=P.parameters)==null?void 0:K.docs)==null?void 0:Z.source}}};var Q,ee,te;D.parameters={...D.parameters,docs:{...(Q=D.parameters)==null?void 0:Q.docs,source:{originalSource:`{
  render: () => <TimeRangeExample />,
  parameters: {
    docs: {
      description: {
        story: 'Timeline with custom time extent override. Use buttons to adjust visible range.'
      }
    }
  }
}`,...(te=(ee=D.parameters)==null?void 0:ee.docs)==null?void 0:te.source}}};var ne,re,ae;O.parameters={...O.parameters,docs:{...(ne=O.parameters)==null?void 0:ne.docs,source:{originalSource:`{
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
}`,...(ae=(re=O.parameters)==null?void 0:re.docs)==null?void 0:ae.source}}};var se,ie,oe;N.parameters={...N.parameters,docs:{...(se=N.parameters)==null?void 0:se.docs,source:{originalSource:`{
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
}`,...(oe=(ie=N.parameters)==null?void 0:ie.docs)==null?void 0:oe.source}}};var le,ce,me;I.parameters={...I.parameters,docs:{...(le=I.parameters)==null?void 0:le.docs,source:{originalSource:`{
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
}`,...(me=(ce=I.parameters)==null?void 0:ce.docs)==null?void 0:me.source}}};var de,ue,fe;L.parameters={...L.parameters,docs:{...(de=L.parameters)==null?void 0:de.docs,source:{originalSource:`{
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
}`,...(fe=(ue=L.parameters)==null?void 0:ue.docs)==null?void 0:fe.source}}};const ze=["Default","WithSelection","Overlapping","CustomTimeRange","ManyTracks","Empty","CustomBarHeight","DarkTheme"];export{I as CustomBarHeight,D as CustomTimeRange,L as DarkTheme,j as Default,N as Empty,O as ManyTracks,P as Overlapping,A as WithSelection,ze as __namedExportsOrder,$e as default};
