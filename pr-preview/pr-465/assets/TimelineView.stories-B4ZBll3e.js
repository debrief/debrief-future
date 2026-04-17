import{j as a}from"./jsx-runtime-DF2Pcvd1.js";import{r as L}from"./index-B2-qRKKC.js";import{fn as g}from"./index-CLEdRh-S.js";import{T as K}from"./TimelineView-DZw56FzU.js";import"./_commonjsHelpers-Cpj98o6Y.js";const oe={title:"Browser/TimelineView",component:K,tags:["autodocs"],args:{onTemporalFilterChange:g(),onItemSelect:g()},decorators:[t=>a.jsx("div",{style:{width:"100%",height:"400px",background:"var(--vscode-editor-background, #1e1e1e)"},children:a.jsx(t,{})})]};function e(t){return{title:t.title??t.id,itemPath:`exercises/${t.id}/item.json`,bbox:null,datetime:null,startDatetime:null,endDatetime:null,platforms:[],tags:[],featureTags:[],author:null,collection:null,modified:null,...t}}const u=[e({id:"alpha",title:"Exercise Alpha",startDatetime:"2022-03-15T08:00:00Z",endDatetime:"2022-03-17T18:00:00Z"}),e({id:"bravo",title:"Exercise Bravo",startDatetime:"2022-06-01T06:00:00Z",endDatetime:"2022-06-05T22:00:00Z"}),e({id:"charlie",title:"Patrol Charlie",startDatetime:"2023-01-10T00:00:00Z",endDatetime:"2023-01-12T12:00:00Z"}),e({id:"delta",title:"Exercise Delta",startDatetime:"2023-04-20T14:00:00Z",endDatetime:"2023-04-25T20:00:00Z"}),e({id:"echo",title:"Exercise Echo",startDatetime:"2023-08-05T10:00:00Z",endDatetime:"2023-08-06T10:00:00Z"}),e({id:"foxtrot",title:"Exercise Foxtrot",startDatetime:"2023-11-15T06:00:00Z",endDatetime:"2023-12-01T18:00:00Z"}),e({id:"golf",title:"Exercise Golf",startDatetime:"2024-02-01T00:00:00Z",endDatetime:"2024-02-28T23:59:00Z"}),e({id:"hotel",title:"Exercise Hotel",startDatetime:"2024-05-10T08:00:00Z",endDatetime:"2024-05-15T18:00:00Z"}),e({id:"india",title:"Exercise India",startDatetime:"2024-09-01T06:00:00Z",endDatetime:"2024-09-10T22:00:00Z"}),e({id:"juliet",title:"Exercise Juliet",startDatetime:"2025-01-15T00:00:00Z",endDatetime:"2025-02-15T00:00:00Z"})],Q=Array.from({length:100},(t,r)=>{const i=2020+Math.floor(r/12),p=r%12+1;return e({id:`ex-${r}`,title:`Exercise ${String(r).padStart(3,"0")}`,startDatetime:`${i}-${String(p).padStart(2,"0")}-01T00:00:00Z`,endDatetime:`${i}-${String(p).padStart(2,"0")}-${10+r%15}T00:00:00Z`})}),U=[e({id:"range-1",title:"Full Range",startDatetime:"2024-01-01T00:00:00Z",endDatetime:"2024-06-30T00:00:00Z"}),e({id:"point-1",title:"Single Point",datetime:"2024-03-15T12:00:00Z"}),e({id:"no-time",title:"No Time Data"}),e({id:"range-2",title:"Short Range",startDatetime:"2024-04-01T08:00:00Z",endDatetime:"2024-04-01T20:00:00Z"})];function ee({filter:t}){return a.jsxs("div",{"data-testid":"time-period-panel",style:{padding:"8px 12px",fontSize:"12px",fontFamily:"var(--vscode-font-family, monospace)",color:"#ccc",background:"#252526",borderTop:"1px solid #333",display:"flex",alignItems:"center",gap:"8px"},children:[a.jsx("span",{style:{color:"#888",fontWeight:500},children:"Visible range:"}),t?a.jsxs("span",{children:[new Date(t.start).toISOString().replace("T"," ").slice(0,19)," – ",new Date(t.end).toISOString().replace("T"," ").slice(0,19)]}):a.jsx("span",{style:{color:"#666",fontStyle:"italic"},children:"Full extent (Ctrl+scroll to zoom, drag to pan)"})]})}const s={args:{items:u}},o={render:()=>{const[t,r]=L.useState(null);return a.jsxs("div",{style:{height:"100%",display:"flex",flexDirection:"column"},children:[a.jsx("div",{style:{flex:1},children:a.jsx(K,{items:u,onTemporalFilterChange:r,onItemSelect:i=>console.log("Selected:",i)})}),a.jsx(ee,{filter:t})]})}},n={args:{items:[]}},l={args:{items:[e({id:"pt-1",title:"Patrol Alpha",datetime:"2024-03-15T12:00:00Z"}),e({id:"pt-2",title:"Patrol Bravo",datetime:"2024-06-20T08:00:00Z"}),e({id:"pt-3",title:"Patrol Charlie",datetime:"2024-09-10T18:00:00Z"})]}},c={args:{items:Q}},d={args:{items:U}},m={args:{items:u,colourFn:t=>{const r=["#e74c3c","#3498db","#2ecc71","#f39c12","#9b59b6","#1abc9c","#e67e22","#2980b9","#27ae60","#c0392b"],i=u.findIndex(p=>p.id===t.id);return r[i%r.length]??null}}};var T,x,h,S,D;s.parameters={...s.parameters,docs:{...(T=s.parameters)==null?void 0:T.docs,source:{originalSource:`{
  args: {
    items: TEN_ITEMS
  }
}`,...(h=(x=s.parameters)==null?void 0:x.docs)==null?void 0:h.source},description:{story:"Default: 10 exercises with varied temporal ranges across 2022–2025",...(D=(S=s.parameters)==null?void 0:S.docs)==null?void 0:D.description}}};var f,Z,E,y,I;o.parameters={...o.parameters,docs:{...(f=o.parameters)==null?void 0:f.docs,source:{originalSource:`{
  render: () => {
    const [filter, setFilter] = useState<TemporalFilter | null>(null);
    return <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
        <div style={{
        flex: 1
      }}>
          <TimelineView items={TEN_ITEMS} onTemporalFilterChange={setFilter} onItemSelect={path => console.log('Selected:', path)} />
        </div>
        <TimePeriodPanel filter={filter} />
      </div>;
  }
}`,...(E=(Z=o.parameters)==null?void 0:Z.docs)==null?void 0:E.source},description:{story:"Interactive story with Ctrl+scroll zoom, drag-to-pan, and time period panel",...(I=(y=o.parameters)==null?void 0:y.docs)==null?void 0:I.description}}};var b,M,v,P,j;n.parameters={...n.parameters,docs:{...(b=n.parameters)==null?void 0:b.docs,source:{originalSource:`{
  args: {
    items: []
  }
}`,...(v=(M=n.parameters)==null?void 0:M.docs)==null?void 0:v.source},description:{story:"Empty state: no exercises",...(j=(P=n.parameters)==null?void 0:P.docs)==null?void 0:j.description}}};var w,F,_,C,k;l.parameters={...l.parameters,docs:{...(w=l.parameters)==null?void 0:w.docs,source:{originalSource:`{
  args: {
    items: [makeStacItem({
      id: 'pt-1',
      title: 'Patrol Alpha',
      datetime: '2024-03-15T12:00:00Z'
    }), makeStacItem({
      id: 'pt-2',
      title: 'Patrol Bravo',
      datetime: '2024-06-20T08:00:00Z'
    }), makeStacItem({
      id: 'pt-3',
      title: 'Patrol Charlie',
      datetime: '2024-09-10T18:00:00Z'
    })]
  }
}`,...(_=(F=l.parameters)==null?void 0:F.docs)==null?void 0:_.source},description:{story:"Single-datetime items showing as point markers",...(k=(C=l.parameters)==null?void 0:C.docs)==null?void 0:k.description}}};var N,$,A,W,B;c.parameters={...c.parameters,docs:{...(N=c.parameters)==null?void 0:N.docs,source:{originalSource:`{
  args: {
    items: MANY_ITEMS
  }
}`,...(A=($=c.parameters)==null?void 0:$.docs)==null?void 0:A.source},description:{story:"100+ exercises — demonstrates vertical scrolling with fixed 30px row height",...(B=(W=c.parameters)==null?void 0:W.docs)==null?void 0:B.description}}};var V,z,O,R,X;d.parameters={...d.parameters,docs:{...(V=d.parameters)==null?void 0:V.docs,source:{originalSource:`{
  args: {
    items: MIXED_ITEMS
  }
}`,...(O=(z=d.parameters)==null?void 0:z.docs)==null?void 0:O.source},description:{story:"Mixed metadata: range, single datetime, no time data",...(X=(R=d.parameters)==null?void 0:R.docs)==null?void 0:X.description}}};var Y,G,H,J,q;m.parameters={...m.parameters,docs:{...(Y=m.parameters)==null?void 0:Y.docs,source:{originalSource:`{
  args: {
    items: TEN_ITEMS,
    colourFn: (item: StacBrowserItem) => {
      const colours = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#2980b9', '#27ae60', '#c0392b'];
      const idx = TEN_ITEMS.findIndex(i => i.id === item.id);
      return colours[idx % colours.length] ?? null;
    }
  }
}`,...(H=(G=m.parameters)==null?void 0:G.docs)==null?void 0:H.source},description:{story:"With colour scheme: bars coloured by index",...(q=(J=m.parameters)==null?void 0:J.docs)==null?void 0:q.description}}};const ne=["Default","WithZoomPan","Empty","SingleDatetime","ManyItems","MixedMetadata","WithColourScheme"];export{s as Default,n as Empty,c as ManyItems,d as MixedMetadata,l as SingleDatetime,m as WithColourScheme,o as WithZoomPan,ne as __namedExportsOrder,oe as default};
