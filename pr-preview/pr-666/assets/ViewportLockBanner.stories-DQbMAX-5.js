import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r as h}from"./index-B2-qRKKC.js";import{V as x}from"./ViewportLockBanner-Cbyss5BQ.js";import{T as v}from"./ThemeProvider-DF0jq0Ad.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./defaultTheme-Tx6C8nph.js";const R={title:"Components/MapView/ViewportLockBanner",component:x,parameters:{layout:"centered",docs:{description:{component:"On-map banner that signals the viewport is locked (spec 260 / FR-005). Returns null when `locked={false}`. The banner itself is the unlock control — clicking it fires `onUnlock`."}}},decorators:[n=>e.jsx(v,{children:e.jsx("div",{style:{position:"relative",width:480,height:200,background:"var(--debrief-bg-secondary, #e8eef3)",border:"1px solid var(--debrief-border-color, #ccc)"},children:e.jsx(n,{})})})]},t={args:{locked:!0,onUnlock:()=>{}}},r={args:{locked:!1,onUnlock:()=>{}}},o={render:()=>{const n=()=>{const[s,c]=h.useState(!0);return e.jsxs(e.Fragment,{children:[e.jsx(x,{locked:s,onUnlock:()=>c(!1)}),!s&&e.jsx("button",{type:"button",style:{position:"absolute",bottom:12,left:"50%",transform:"translateX(-50%)",padding:"6px 14px"},onClick:()=>c(!0),children:"Re-lock"})]})};return e.jsx(n,{})}};var a,i,d;t.parameters={...t.parameters,docs:{...(a=t.parameters)==null?void 0:a.docs,source:{originalSource:`{
  args: {
    locked: true,
    onUnlock: () => undefined
  }
}`,...(d=(i=t.parameters)==null?void 0:i.docs)==null?void 0:d.source}}};var l,p,m;r.parameters={...r.parameters,docs:{...(l=r.parameters)==null?void 0:l.docs,source:{originalSource:`{
  args: {
    locked: false,
    onUnlock: () => undefined
  }
}`,...(m=(p=r.parameters)==null?void 0:p.docs)==null?void 0:m.source}}};var k,u,f,b,g;o.parameters={...o.parameters,docs:{...(k=o.parameters)==null?void 0:k.docs,source:{originalSource:`{
  render: () => {
    const InteractiveDemo = () => {
      const [locked, setLocked] = useState(true);
      return <>
          <ViewportLockBanner locked={locked} onUnlock={() => setLocked(false)} />
          {!locked && <button type="button" style={{
          position: 'absolute',
          bottom: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '6px 14px'
        }} onClick={() => setLocked(true)}>
              Re-lock
            </button>}
        </>;
    };
    return <InteractiveDemo />;
  }
}`,...(f=(u=o.parameters)==null?void 0:u.docs)==null?void 0:f.source},description:{story:"Interactive — click the banner to toggle the locked state.",...(g=(b=o.parameters)==null?void 0:b.docs)==null?void 0:g.description}}};const S=["Locked","Unlocked","Interactive"];export{o as Interactive,t as Locked,r as Unlocked,S as __namedExportsOrder,R as default};
