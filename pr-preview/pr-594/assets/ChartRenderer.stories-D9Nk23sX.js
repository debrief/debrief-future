import{j as t}from"./jsx-runtime-DF2Pcvd1.js";import{r as A}from"./index-B2-qRKKC.js";import{C as r,t as _}from"./index-B1Wj4M0z.js";import"./_commonjsHelpers-Cpj98o6Y.js";const b="zone_histogram",z="Buffer Zone Point Distribution",j={xAxis:{label:"Zone",type:"nominal"},yAxis:{label:"Count",type:"quantitative",units:"points"}},w=[{zone:"Zone A (0-5 nm)",count:42},{zone:"Zone B (5-10 nm)",count:17},{zone:"Zone C (10-15 nm)",count:8},{zone:"Zone D (15-20 nm)",count:3}],B={type:b,title:z,metadata:j,data:w},L="range_bearing_series",R="Range and Bearing over Time",k={xAxis:{label:"Time",type:"temporal"},yAxis:{label:"Range",type:"quantitative",units:"nm"}},$=[{name:"Track A → Track B",data:[{time:"2024-01-15T10:00:00Z",value:12.5},{time:"2024-01-15T10:05:00Z",value:11.8},{time:"2024-01-15T10:10:00Z",value:10.2},{time:"2024-01-15T10:15:00Z",value:9.7},{time:"2024-01-15T10:20:00Z",value:8.3},{time:"2024-01-15T10:25:00Z",value:7.1}]},{name:"Track A → Track C",data:[{time:"2024-01-15T10:00:00Z",value:20},{time:"2024-01-15T10:05:00Z",value:19.2},{time:"2024-01-15T10:10:00Z",value:18.5},{time:"2024-01-15T10:15:00Z",value:17},{time:"2024-01-15T10:20:00Z",value:16.8},{time:"2024-01-15T10:25:00Z",value:15.4}]}],F={type:L,title:R,metadata:k,series:$},W="zone_histogram",M="Empty Zone Distribution",q={xAxis:{label:"Zone",type:"nominal"},yAxis:{label:"Count",type:"quantitative",units:"points"}},H=[],I={type:W,title:M,metadata:q,data:H},N={title:"Components/ChartRenderer",component:r,parameters:{layout:"padded"}};function m(e){return A.useMemo(()=>{const n=_(e);return n.ok?n.spec:null},[e])}const a={name:"Bar Chart (zone_histogram)",render:()=>{const e=m(B);return t.jsx("div",{style:{width:"100%",maxWidth:600},children:t.jsx(r,{spec:e})})}},s={name:"Line Chart (range_bearing_series)",render:()=>{const e=m(F);return t.jsx("div",{style:{width:"100%",maxWidth:600},children:t.jsx(r,{spec:e})})}},o={name:"Empty Dataset",render:()=>{const e=_(I),n=e.ok?e.spec:null;return t.jsxs("div",{style:{width:"100%",maxWidth:600},children:[t.jsx(r,{spec:n}),!e.ok&&t.jsxs("p",{style:{color:"var(--vscode-descriptionForeground, #888)",textAlign:"center"},children:["Transformer message: ",e.error.message]})]})}},i={name:"Error State (null spec)",render:()=>t.jsx("div",{style:{width:"100%",maxWidth:600},children:t.jsx(r,{spec:null})})},c={name:"Large Dataset (10,000 points)",render:()=>{const e=A.useMemo(()=>({type:"zone_histogram",title:"Large Dataset — 10,000 Zones",metadata:{xAxis:{label:"Zone ID",type:"ordinal"},yAxis:{label:"Count",type:"quantitative"}},data:Array.from({length:1e4},(O,E)=>({zone:`Z${String(E).padStart(5,"0")}`,count:Math.floor(Math.random()*100)}))}),[]),n=m(e);return t.jsx("div",{style:{width:"100%"},children:t.jsx(r,{spec:n})})}};var d,l,p;a.parameters={...a.parameters,docs:{...(d=a.parameters)==null?void 0:d.docs,source:{originalSource:`{
  name: 'Bar Chart (zone_histogram)',
  render: () => {
    const spec = useTransformedSpec(zoneHistogramFixture as DatasetEnvelope);
    return <div style={{
      width: '100%',
      maxWidth: 600
    }}>
        <ChartRenderer spec={spec} />
      </div>;
  }
}`,...(p=(l=a.parameters)==null?void 0:l.docs)==null?void 0:p.source}}};var u,h,x;s.parameters={...s.parameters,docs:{...(u=s.parameters)==null?void 0:u.docs,source:{originalSource:`{
  name: 'Line Chart (range_bearing_series)',
  render: () => {
    const spec = useTransformedSpec(rangeBearingFixture as DatasetEnvelope);
    return <div style={{
      width: '100%',
      maxWidth: 600
    }}>
        <ChartRenderer spec={spec} />
      </div>;
  }
}`,...(x=(h=s.parameters)==null?void 0:h.docs)==null?void 0:x.source}}};var y,g,v;o.parameters={...o.parameters,docs:{...(y=o.parameters)==null?void 0:y.docs,source:{originalSource:`{
  name: 'Empty Dataset',
  render: () => {
    // Transformer returns empty_data error → spec is null → error state
    const result = transformDataset(emptyFixture as DatasetEnvelope);
    const spec = result.ok ? result.spec : null;
    return <div style={{
      width: '100%',
      maxWidth: 600
    }}>
        <ChartRenderer spec={spec} />
        {!result.ok && <p style={{
        color: 'var(--vscode-descriptionForeground, #888)',
        textAlign: 'center'
      }}>
            Transformer message: {result.error.message}
          </p>}
      </div>;
  }
}`,...(v=(g=o.parameters)==null?void 0:g.docs)==null?void 0:v.source}}};var Z,T,C;i.parameters={...i.parameters,docs:{...(Z=i.parameters)==null?void 0:Z.docs,source:{originalSource:`{
  name: 'Error State (null spec)',
  render: () => <div style={{
    width: '100%',
    maxWidth: 600
  }}>
      <ChartRenderer spec={null} />
    </div>
}`,...(C=(T=i.parameters)==null?void 0:T.docs)==null?void 0:C.source}}};var f,D,S;c.parameters={...c.parameters,docs:{...(f=c.parameters)==null?void 0:f.docs,source:{originalSource:`{
  name: 'Large Dataset (10,000 points)',
  render: () => {
    const dataset: DatasetEnvelope = useMemo(() => ({
      type: 'zone_histogram',
      title: 'Large Dataset — 10,000 Zones',
      metadata: {
        xAxis: {
          label: 'Zone ID',
          type: 'ordinal' as const
        },
        yAxis: {
          label: 'Count',
          type: 'quantitative' as const
        }
      },
      data: Array.from({
        length: 10000
      }, (_, i) => ({
        zone: \`Z\${String(i).padStart(5, '0')}\`,
        count: Math.floor(Math.random() * 100)
      }))
    }), []);
    const spec = useTransformedSpec(dataset);
    return <div style={{
      width: '100%'
    }}>
        <ChartRenderer spec={spec} />
      </div>;
  }
}`,...(S=(D=c.parameters)==null?void 0:D.docs)==null?void 0:S.source}}};const Q=["BarChart","LineChart","EmptyState","ErrorState","LargeDataset"];export{a as BarChart,o as EmptyState,i as ErrorState,c as LargeDataset,s as LineChart,Q as __namedExportsOrder,N as default};
