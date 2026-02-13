import{j as a}from"./jsx-runtime-DF2Pcvd1.js";import{r as n}from"./index-B2-qRKKC.js";/* empty css                *//* empty css                       */import{T as D}from"./ThemeProvider-mvcGjblv.js";import{u as c,M as d,T as m}from"./TileLayer-Cckmdc0V.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./index-kS-9iBlu.js";function M(r={}){const{addControls:t=!1,controlOptions:o}=r,e=c(),s=n.useRef(!1);return n.useEffect(()=>{if(e.pm)return t&&!s.current&&(e.pm.addControls(o??{}),s.current=!0),()=>{s.current&&e.pm&&(e.pm.removeControls(),s.current=!1)}},[e,t,o]),{map:e}}function k({onShapeCreated:r}){const{map:t}=M({addControls:!0,controlOptions:{position:"topleft",drawCircleMarker:!1,drawText:!1,drawCircle:!1,cutPolygon:!1,rotateMode:!1}});return n.useEffect(()=>{if(!r)return;const o=e=>{"toGeoJSON"in e.layer&&typeof e.layer.toGeoJSON=="function"&&r(e.layer.toGeoJSON())};return t.on("pm:create",o),()=>{t.off("pm:create",o)}},[t,r]),null}function L({onShapeCreated:r}){M();const t=c();return n.useEffect(()=>{if(!r)return;const o=e=>{"toGeoJSON"in e.layer&&typeof e.layer.toGeoJSON=="function"&&r(e.layer.toGeoJSON())};return t.on("pm:create",o),()=>{t.off("pm:create",o)}},[t,r]),null}function J({label:r,shape:t}){const o=c(),[e,s]=n.useState(!1);n.useEffect(()=>{const u=()=>s(!1);return o.on("pm:create",u),()=>{o.off("pm:create",u)}},[o]);const O=n.useCallback(()=>{e?(o.pm.disableDraw(),s(!1)):(o.pm.enableDraw(t),s(!0))},[o,t,e]);return a.jsx("button",{onClick:O,style:{position:"absolute",top:10,right:10,zIndex:1e3,padding:"8px 16px",background:e?"#0066cc":"#fff",color:e?"#fff":"#333",border:"2px solid #0066cc",borderRadius:4,cursor:"pointer",fontWeight:"bold"},children:e?`Drawing ${r}...`:`Draw ${r}`})}const _={title:"Components/MapView/Geoman",parameters:{layout:"padded",docs:{description:{component:"Geoman integration stories demonstrating drawing capabilities on the Leaflet map. Part of E05: Shape Drawing Tools."}}},decorators:[r=>a.jsx(D,{children:a.jsx(r,{})})]},i={render:function(){const[t,o]=n.useState(null);return a.jsxs("div",{style:{height:500,position:"relative"},children:[a.jsxs(d,{center:[50.5,-4.5],zoom:10,style:{height:"100%",width:"100%"},children:[a.jsx(m,{url:"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}),a.jsx(k,{onShapeCreated:o})]}),t&&a.jsx("pre",{style:{position:"absolute",bottom:10,left:10,right:10,zIndex:1e3,background:"rgba(0,0,0,0.8)",color:"#0f0",padding:8,borderRadius:4,fontSize:11,maxHeight:150,overflow:"auto"},children:JSON.stringify(t,null,2)})]})}},l={render:function(){const[t,o]=n.useState(null);return a.jsxs("div",{style:{height:500,position:"relative"},children:[a.jsxs(d,{center:[50.5,-4.5],zoom:10,style:{height:"100%",width:"100%"},children:[a.jsx(m,{url:"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}),a.jsx(L,{onShapeCreated:o}),a.jsx(J,{label:"Polygon",shape:"Polygon"})]}),t&&a.jsx("pre",{style:{position:"absolute",bottom:10,left:10,right:10,zIndex:1e3,background:"rgba(0,0,0,0.8)",color:"#0f0",padding:8,borderRadius:4,fontSize:11,maxHeight:150,overflow:"auto"},children:JSON.stringify(t,null,2)})]})}},p={render:function(){return a.jsx("div",{style:{height:500},children:a.jsx(d,{center:[50.5,-4.5],zoom:10,style:{height:"100%",width:"100%"},children:a.jsx(m,{url:"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"})})})}};var f,h,g,y,b;i.parameters={...i.parameters,docs:{...(f=i.parameters)==null?void 0:f.docs,source:{originalSource:`{
  render: function GeomanToolbarStory() {
    const [lastShape, setLastShape] = useState<object | null>(null);
    return <div style={{
      height: 500,
      position: 'relative'
    }}>
        <MapContainer center={[50.5, -4.5]} zoom={10} style={{
        height: '100%',
        width: '100%'
      }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <GeomanWithToolbar onShapeCreated={setLastShape} />
        </MapContainer>
        {lastShape && <pre style={{
        position: 'absolute',
        bottom: 10,
        left: 10,
        right: 10,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.8)',
        color: '#0f0',
        padding: 8,
        borderRadius: 4,
        fontSize: 11,
        maxHeight: 150,
        overflow: 'auto'
      }}>
            {JSON.stringify(lastShape, null, 2)}
          </pre>}
      </div>;
  }
}`,...(g=(h=i.parameters)==null?void 0:h.docs)==null?void 0:g.source},description:{story:`Full Geoman toolbar with polygon, rectangle, polyline, and marker drawing.
Click a tool in the left toolbar to start drawing.`,...(b=(y=i.parameters)==null?void 0:y.docs)==null?void 0:b.description}}};var S,x,w,v,G;l.parameters={...l.parameters,docs:{...(S=l.parameters)==null?void 0:S.docs,source:{originalSource:`{
  render: function ProgrammaticStory() {
    const [lastShape, setLastShape] = useState<object | null>(null);
    return <div style={{
      height: 500,
      position: 'relative'
    }}>
        <MapContainer center={[50.5, -4.5]} zoom={10} style={{
        height: '100%',
        width: '100%'
      }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <GeomanProgrammatic onShapeCreated={setLastShape} />
          <DrawButton label="Polygon" shape="Polygon" />
        </MapContainer>
        {lastShape && <pre style={{
        position: 'absolute',
        bottom: 10,
        left: 10,
        right: 10,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.8)',
        color: '#0f0',
        padding: 8,
        borderRadius: 4,
        fontSize: 11,
        maxHeight: 150,
        overflow: 'auto'
      }}>
            {JSON.stringify(lastShape, null, 2)}
          </pre>}
      </div>;
  }
}`,...(w=(x=l.parameters)==null?void 0:x.docs)==null?void 0:w.source},description:{story:`Programmatic drawing via map.pm API — no Geoman toolbar visible.
Click the "Draw Polygon" button to enter drawing mode.`,...(G=(v=l.parameters)==null?void 0:v.docs)==null?void 0:G.description}}};var j,z,C,P,T;p.parameters={...p.parameters,docs:{...(j=p.parameters)==null?void 0:j.docs,source:{originalSource:`{
  render: function DormantStory() {
    return <div style={{
      height: 500
    }}>
        <MapContainer center={[50.5, -4.5]} zoom={10} style={{
        height: '100%',
        width: '100%'
      }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        </MapContainer>
      </div>;
  }
}`,...(C=(z=p.parameters)==null?void 0:z.docs)==null?void 0:C.source},description:{story:`Geoman loaded but dormant — no toolbar, no drawing mode.
Map behaves identically to pre-Geoman state.
This story proves Geoman does not interfere with normal map interaction.`,...(T=(P=p.parameters)==null?void 0:P.docs)==null?void 0:T.description}}};const $=["GeomanToolbar","Programmatic","Dormant"];export{p as Dormant,i as GeomanToolbar,l as Programmatic,$ as __namedExportsOrder,_ as default};
