import{j as i}from"./jsx-runtime-DF2Pcvd1.js";import{r as f}from"./index-B2-qRKKC.js";import{f as ve,p as F,c as we}from"./time-DWPBvZ9w.js";import{i as Se,a as ke,g as Ce,b as Re}from"./labels-D4DpyF2F.js";import{T as pe}from"./ThemeProvider-mvcGjblv.js";import"./_commonjsHelpers-Cpj98o6Y.js";function Ee(e,s){const t=[1e3,5e3,1e4,3e4,6e4,3e5,6e5,18e5,36e5,72e5,144e5,216e5,432e5,864e5,1728e5,6048e5];for(const r of t)if(e/r<=s)return r;return t[t.length-1]??6048e5}function Me(e,s){const{width:t,height:r,timeExtent:l,fontFamily:p="-apple-system, BlinkMacSystemFont, sans-serif",fontSize:o=10,textColor:v="#666666",gridColor:R="rgba(0, 0, 0, 0.1)",tickColor:b="#999999"}=s,[g,T]=l,n=T-g;if(n<=0)return;e.clearRect(0,0,t,r),e.fillStyle="var(--debrief-bg-secondary, #f8f9fa)",e.fillRect(0,0,t,r),e.strokeStyle=R,e.lineWidth=1,e.beginPath(),e.moveTo(0,.5),e.lineTo(t,.5),e.stroke();const h=Math.floor(t/80),w=Ee(n,h),c=Math.ceil(g/w)*w;e.font=`${o}px ${p}`,e.textAlign="center",e.textBaseline="top";for(let S=c;S<=T;S+=w){const k=(S-g)/n*t;e.strokeStyle=b,e.beginPath(),e.moveTo(k,0),e.lineTo(k,6),e.stroke();const m=ve(S,"short");e.fillStyle=v,e.fillText(m,k,8)}if(n>864e5){e.textAlign="left",e.fillStyle=v;const S=new Date(g).toLocaleDateString();e.fillText(S,4,8)}}function xe(e,s){const{width:t,timeExtent:r,barHeight:l=24,barPadding:p=4,selectedIds:o=new Set}=s,[v,R]=r,b=R-v;if(b<=0)return[];const g=[];let T=p;for(const n of e){let h=null,w=null;if(Se(n)?(h=F(n.properties.start_time),w=F(n.properties.end_time)):ke(n)&&(h=F(n.properties.valid_from),w=F(n.properties.valid_until)),h===null||w===null)continue;const c=(h-v)/b*t,S=Math.max(4,(w-h)/b*t);g.push({featureId:n.id,x:Math.max(0,c),y:T,width:Math.min(S,t-c),height:l,label:Re(n),color:Ce(n),isSelected:o.has(n.id)}),T+=l+p}return g}function je(e,s,t){const{width:r,height:l,barRadius:p=3,selectionColor:o="rgba(0, 102, 204, 0.3)",fontFamily:v="-apple-system, BlinkMacSystemFont, sans-serif",fontSize:R=11}=t;e.clearRect(0,0,r,l),e.fillStyle="var(--debrief-bg-primary, #ffffff)",e.fillRect(0,0,r,l),e.strokeStyle="var(--debrief-timeline-grid-color, rgba(0, 0, 0, 0.05))",e.lineWidth=1;for(const b of s)e.beginPath(),e.moveTo(0,b.y+b.height+2),e.lineTo(r,b.y+b.height+2),e.stroke();for(const b of s){const{x:g,y:T,width:n,height:h,color:w,isSelected:c,label:S}=b;if(c&&(e.fillStyle=o,e.fillRect(0,T-2,r,h+4),e.strokeStyle="var(--debrief-selection-border, #0066cc)",e.lineWidth=2,e.strokeRect(g-1,T-1,n+2,h+2)),e.fillStyle=w,e.beginPath(),n>p*2?e.roundRect(g,T,n,h,p):e.rect(g,T,n,h),e.fill(),e.strokeStyle="rgba(0, 0, 0, 0.2)",e.lineWidth=1,e.stroke(),n>40){e.font=`${R}px ${v}`,e.fillStyle="#ffffff",e.textAlign="left",e.textBaseline="middle";const k=n-8;let m=S,y=e.measureText(m).width;for(;y>k&&m.length>3;)m=m.slice(0,-4)+"...",y=e.measureText(m).width;y<=k&&(e.shadowColor="rgba(0, 0, 0, 0.5)",e.shadowBlur=2,e.shadowOffsetX=1,e.shadowOffsetY=1,e.fillText(m,g+4,T+h/2),e.shadowColor="transparent",e.shadowBlur=0)}}}function $(e,s,t){for(const r of t)if(e>=r.x&&e<=r.x+r.width&&s>=r.y&&s<=r.y+r.height)return r;return null}function x({features:e,selectedIds:s=new Set,onSelect:t,onBackgroundClick:r,onTimeRangeChange:l,timeExtent:p,height:o=200,barHeight:v=24,className:R,style:b}){var q;const g=f.useRef(null),T=f.useRef(null),n=f.useRef(null),[h,w]=f.useState(null),[c,S]=f.useState(0),k=f.useMemo(()=>Array.isArray(e)?e:e.features,[e]),m=f.useMemo(()=>p||we(k),[k,p]),y=f.useMemo(()=>!m||c===0?[]:xe(k,{width:c,timeExtent:m,barHeight:v,selectedIds:s}),[k,m,c,o,v,s]);f.useEffect(()=>{const a=g.current;if(!a)return;const d=new ResizeObserver(u=>{for(const E of u)S(E.contentRect.width)});return d.observe(a),S(a.clientWidth),()=>d.disconnect()},[]),f.useEffect(()=>{const a=T.current;if(!a||!m||c===0)return;const d=a.getContext("2d");if(!d)return;const u=window.devicePixelRatio||1;a.width=c*u,a.height=32*u,d.scale(u,u),Me(d,{width:c,height:32,timeExtent:m})},[c,m]),f.useEffect(()=>{const a=n.current;if(!a||!m||c===0)return;const d=a.getContext("2d");if(!d)return;const u=window.devicePixelRatio||1,E=o-32;a.width=c*u,a.height=E*u,d.scale(u,u),je(d,y,{width:c,height:E})},[c,m,y,o,v,s]);const ge=f.useCallback(a=>{const d=n.current;if(!d)return;const u=d.getBoundingClientRect(),E=a.clientX-u.left,A=a.clientY-u.top,M=$(E,A,y);M?t==null||t(M.featureId,a):r==null||r()},[y,t,r]),ye=f.useCallback(a=>{const d=n.current;if(!d)return;const u=d.getBoundingClientRect(),E=a.clientX-u.left,A=a.clientY-u.top,M=$(E,A,y);w((M==null?void 0:M.featureId)??null),d.style.cursor=M?"pointer":"default"},[y]),be=f.useCallback(()=>{w(null)},[]),H={height:o,...b},Te=f.useMemo(()=>{if(y.length===0)return o-32;const a=y[y.length-1];return Math.max(o-32,((a==null?void 0:a.y)??0)+v+8)},[y,o,v]);return m?i.jsxs("div",{ref:g,className:`debrief-timeline ${R??""}`,style:H,children:[i.jsx("canvas",{ref:T,className:"debrief-timeline__axis",style:{width:"100%",height:32}}),i.jsx("div",{className:"debrief-timeline__bars-container",style:{height:o-32},children:i.jsx("canvas",{ref:n,className:"debrief-timeline__bars",style:{width:"100%",height:Te},onClick:ge,onMouseMove:ye,onMouseLeave:be})}),h&&i.jsx("div",{className:"debrief-timeline__tooltip",children:(q=y.find(a=>a.featureId===h))==null?void 0:q.label})]}):i.jsx("div",{className:`debrief-timeline debrief-timeline--empty ${R??""}`,style:H,children:i.jsx("div",{className:"debrief-timeline__empty-message",children:"No temporal data available"})})}x.__docgenInfo={description:`Timeline component for displaying features on a time axis.
Uses HTML5 Canvas for efficient rendering of many features.

@example
\`\`\`tsx
import { Timeline } from '@debrief/components/Timeline';

<Timeline
  features={plotData}
  selectedIds={selection.selectedIds}
  onSelect={(id) => selection.toggle(id)}
/>
\`\`\``,methods:[],displayName:"Timeline",props:{features:{required:!0,tsType:{name:"union",raw:"DebriefFeatureCollection | DebriefFeature[]",elements:[{name:"DebriefFeatureCollection"},{name:"Array",elements:[{name:"union",raw:"TrackFeature | ReferenceLocation | MultiPointFeature | MultiPolygonFeature",elements:[{name:"TrackFeature"},{name:"ReferenceLocation"},{name:"MultiPointFeature"},{name:"MultiPolygonFeature"}]}],raw:"DebriefFeature[]"}]},description:"GeoJSON features to display"},selectedIds:{required:!1,tsType:{name:"Set",elements:[{name:"string"}],raw:"Set<string>"},description:"Set of selected feature IDs",defaultValue:{value:"new Set()",computed:!1}},onSelect:{required:!1,tsType:{name:"signature",type:"function",raw:"(featureId: string, event: React.MouseEvent) => void",signature:{arguments:[{type:{name:"string"},name:"featureId"},{type:{name:"ReactMouseEvent",raw:"React.MouseEvent"},name:"event"}],return:{name:"void"}}},description:"Callback when a feature bar is clicked"},onBackgroundClick:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:"Callback when clicking empty space"},onTimeRangeChange:{required:!1,tsType:{name:"signature",type:"function",raw:"(timeExtent: TimeExtent) => void",signature:{arguments:[{type:{name:"tuple",raw:"[number, number]",elements:[{name:"number"},{name:"number"}]},name:"timeExtent"}],return:{name:"void"}}},description:"Callback when visible time range changes"},timeExtent:{required:!1,tsType:{name:"tuple",raw:"[number, number]",elements:[{name:"number"},{name:"number"}]},description:"Override time extent (for synchronized views)"},height:{required:!1,tsType:{name:"number"},description:"Height of the component",defaultValue:{value:"200",computed:!1}},barHeight:{required:!1,tsType:{name:"number"},description:"Height of each feature bar",defaultValue:{value:"24",computed:!1}},className:{required:!1,tsType:{name:"string"},description:"CSS class name"},style:{required:!1,tsType:{name:"ReactCSSProperties",raw:"React.CSSProperties"},description:"Inline styles"}}};const We={title:"Components/Timeline",component:x,parameters:{layout:"padded",docs:{description:{component:"Timeline displays features on a time axis using HTML5 Canvas for efficient rendering. Supports selection, time range adjustment, and theming."}}},tags:["autodocs"],decorators:[e=>i.jsx(pe,{children:i.jsx(e,{})})]};function W(e,s){const t=[],r=["OWNSHIP","CONTACT","REFERENCE","SOLUTION"];for(let l=0;l<e;l++){const p=Math.random()*4*60*60*1e3,o=(1+Math.random()*3)*60*60*1e3;t.push({type:"Feature",id:`track-${l.toString().padStart(3,"0")}`,geometry:{type:"LineString",coordinates:[[-5,50],[-4,51]]},properties:{kind:"TRACK",platform_id:`PLT-${l.toString().padStart(3,"0")}`,platform_name:`Vessel ${l+1}`,track_type:r[l%4]??"CONTACT",start_time:new Date(s+p).toISOString(),end_time:new Date(s+p+o).toISOString(),positions:[]}})}return t}const C=Date.parse("2024-01-15T06:00:00Z"),Fe=W(5,C),j={type:"FeatureCollection",features:Fe},_={args:{features:j,height:200},parameters:{docs:{description:{story:"Basic timeline with several tracks showing temporal spans."}}}};function _e(){const[e,s]=f.useState(new Set),t=l=>{s(p=>{const o=new Set(p);return o.has(l)?o.delete(l):o.add(l),o})},r=()=>{s(new Set)};return i.jsxs("div",{children:[i.jsxs("div",{style:{marginBottom:16},children:[i.jsx("strong",{children:"Selected:"})," ",e.size>0?Array.from(e).join(", "):"None"]}),i.jsx(x,{features:j,selectedIds:e,onSelect:t,onBackgroundClick:r,height:250})]})}const D={render:()=>i.jsx(_e,{}),parameters:{docs:{description:{story:"Click on bars to select them. Click background to clear selection."}}}},he=W(8,C);he.forEach((e,s)=>{const t=s*.5*60*60*1e3;e.properties.start_time=new Date(C+t).toISOString(),e.properties.end_time=new Date(C+t+3*60*60*1e3).toISOString()});const I={args:{features:{type:"FeatureCollection",features:he},height:300},parameters:{docs:{description:{story:"Timeline with overlapping time ranges. Each track gets its own row."}}}};function De(){const[e,s]=f.useState([C,C+216e5]),t=()=>{s([C-2*60*60*1e3,C+10*60*60*1e3])},r=()=>{s([C+1*60*60*1e3,C+4*60*60*1e3])};return i.jsxs("div",{children:[i.jsxs("div",{style:{marginBottom:16},children:[i.jsx("button",{onClick:t,style:{marginRight:8},children:"Expand Range"}),i.jsx("button",{onClick:r,children:"Contract Range"})]}),i.jsx(x,{features:j,timeExtent:e,height:200})]})}const O={render:()=>i.jsx(De,{}),parameters:{docs:{description:{story:"Timeline with custom time extent override. Use buttons to adjust visible range."}}}},Ie=W(50,C),P={args:{features:{type:"FeatureCollection",features:Ie},height:400},parameters:{docs:{description:{story:"Performance test with 50 tracks. Timeline should scroll smoothly."}}}},B={args:{features:{type:"FeatureCollection",features:[]},height:200},parameters:{docs:{description:{story:"Timeline with no temporal data shows empty message."}}}},N={args:{features:j,height:300,barHeight:36},parameters:{docs:{description:{story:"Timeline with larger bar height for better visibility."}}}},L={render:()=>i.jsx(pe,{theme:{variant:"dark"},children:i.jsx(x,{features:j,height:200})}),parameters:{backgrounds:{default:"dark"},docs:{description:{story:"Timeline with dark theme applied."}}}};var z,U,V;_.parameters={..._.parameters,docs:{...(z=_.parameters)==null?void 0:z.docs,source:{originalSource:`{
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
}`,...(V=(U=_.parameters)==null?void 0:U.docs)==null?void 0:V.source}}};var X,Y,G;D.parameters={...D.parameters,docs:{...(X=D.parameters)==null?void 0:X.docs,source:{originalSource:`{
  render: () => <SelectableTimelineExample />,
  parameters: {
    docs: {
      description: {
        story: 'Click on bars to select them. Click background to clear selection.'
      }
    }
  }
}`,...(G=(Y=D.parameters)==null?void 0:Y.docs)==null?void 0:G.source}}};var J,K,Z;I.parameters={...I.parameters,docs:{...(J=I.parameters)==null?void 0:J.docs,source:{originalSource:`{
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
}`,...(Z=(K=I.parameters)==null?void 0:K.docs)==null?void 0:Z.source}}};var Q,ee,te;O.parameters={...O.parameters,docs:{...(Q=O.parameters)==null?void 0:Q.docs,source:{originalSource:`{
  render: () => <TimeRangeExample />,
  parameters: {
    docs: {
      description: {
        story: 'Timeline with custom time extent override. Use buttons to adjust visible range.'
      }
    }
  }
}`,...(te=(ee=O.parameters)==null?void 0:ee.docs)==null?void 0:te.source}}};var re,ne,se;P.parameters={...P.parameters,docs:{...(re=P.parameters)==null?void 0:re.docs,source:{originalSource:`{
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
}`,...(se=(ne=P.parameters)==null?void 0:ne.docs)==null?void 0:se.source}}};var ae,ie,oe;B.parameters={...B.parameters,docs:{...(ae=B.parameters)==null?void 0:ae.docs,source:{originalSource:`{
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
}`,...(oe=(ie=B.parameters)==null?void 0:ie.docs)==null?void 0:oe.source}}};var le,ce,me;N.parameters={...N.parameters,docs:{...(le=N.parameters)==null?void 0:le.docs,source:{originalSource:`{
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
}`,...(me=(ce=N.parameters)==null?void 0:ce.docs)==null?void 0:me.source}}};var de,ue,fe;L.parameters={...L.parameters,docs:{...(de=L.parameters)==null?void 0:de.docs,source:{originalSource:`{
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
}`,...(fe=(ue=L.parameters)==null?void 0:ue.docs)==null?void 0:fe.source}}};const He=["Default","WithSelection","Overlapping","CustomTimeRange","ManyTracks","Empty","CustomBarHeight","DarkTheme"];export{N as CustomBarHeight,O as CustomTimeRange,L as DarkTheme,_ as Default,B as Empty,P as ManyTracks,I as Overlapping,D as WithSelection,He as __namedExportsOrder,We as default};
