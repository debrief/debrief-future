import{j as a}from"./jsx-runtime-DF2Pcvd1.js";import{r as n}from"./index-B2-qRKKC.js";import"./leaflet-geoman-Cc97th-d.js";/* empty css                */import{T as D}from"./ThemeProvider-yoWuHKa_.js";import{u as c,M as d,T as m}from"./TileLayer-Cckmdc0V.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./defaultTheme-Tx6C8nph.js";import"./index-kS-9iBlu.js";function M(r={}){const{addControls:o=!1,controlOptions:e}=r,t=c(),s=n.useRef(!1);return n.useEffect(()=>{if(t.pm)return o&&!s.current&&(t.pm.addControls(e??{}),s.current=!0),()=>{s.current&&t.pm&&(t.pm.removeControls(),s.current=!1)}},[t,o,e]),{map:t}}function k({onShapeCreated:r}){const{map:o}=M({addControls:!0,controlOptions:{position:"topleft",drawCircleMarker:!1,drawText:!1,drawCircle:!1,cutPolygon:!1,rotateMode:!1}});return n.useEffect(()=>{if(!r)return;const e=t=>{"toGeoJSON"in t.layer&&typeof t.layer.toGeoJSON=="function"&&r(t.layer.toGeoJSON())};return o.on("pm:create",e),()=>{o.off("pm:create",e)}},[o,r]),null}function L({onShapeCreated:r}){M();const o=c();return n.useEffect(()=>{if(!r)return;const e=t=>{"toGeoJSON"in t.layer&&typeof t.layer.toGeoJSON=="function"&&r(t.layer.toGeoJSON())};return o.on("pm:create",e),()=>{o.off("pm:create",e)}},[o,r]),null}function J({label:r,shape:o}){const e=c(),[t,s]=n.useState(!1);n.useEffect(()=>{const u=()=>s(!1);return e.on("pm:create",u),()=>{e.off("pm:create",u)}},[e]);const O=n.useCallback(()=>{e.pm&&(t?(e.pm.disableDraw(),s(!1)):(e.pm.enableDraw(o),s(!0)))},[e,o,t]);return a.jsx("button",{onClick:O,style:{position:"absolute",top:10,right:10,zIndex:1e3,padding:"8px 16px",background:t?"#0066cc":"#fff",color:t?"#fff":"#333",border:"2px solid #0066cc",borderRadius:4,cursor:"pointer",fontWeight:"bold"},children:t?`Drawing ${r}...`:`Draw ${r}`})}const $={title:"Components/MapView/Geoman",parameters:{layout:"padded",docs:{description:{component:"Geoman integration stories demonstrating drawing capabilities on the Leaflet map. Part of E05: Shape Drawing Tools."}}},decorators:[r=>a.jsx(D,{children:a.jsx(r,{})})]},i={render:function(){const[o,e]=n.useState(null);return a.jsxs("div",{style:{height:500,position:"relative"},children:[a.jsxs(d,{center:[50.5,-4.5],zoom:10,style:{height:"100%",width:"100%"},children:[a.jsx(m,{url:"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}),a.jsx(k,{onShapeCreated:e})]}),o&&a.jsx("pre",{style:{position:"absolute",bottom:10,left:10,right:10,zIndex:1e3,background:"rgba(0,0,0,0.8)",color:"#0f0",padding:8,borderRadius:4,fontSize:11,maxHeight:150,overflow:"auto"},children:JSON.stringify(o,null,2)})]})}},l={render:function(){const[o,e]=n.useState(null);return a.jsxs("div",{style:{height:500,position:"relative"},children:[a.jsxs(d,{center:[50.5,-4.5],zoom:10,style:{height:"100%",width:"100%"},children:[a.jsx(m,{url:"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}),a.jsx(L,{onShapeCreated:e}),a.jsx(J,{label:"Polygon",shape:"Polygon"})]}),o&&a.jsx("pre",{style:{position:"absolute",bottom:10,left:10,right:10,zIndex:1e3,background:"rgba(0,0,0,0.8)",color:"#0f0",padding:8,borderRadius:4,fontSize:11,maxHeight:150,overflow:"auto"},children:JSON.stringify(o,null,2)})]})}},p={render:function(){return a.jsx("div",{style:{height:500},children:a.jsx(d,{center:[50.5,-4.5],zoom:10,style:{height:"100%",width:"100%"},children:a.jsx(m,{url:"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"})})})}};var f,h,g,y,b;i.parameters={...i.parameters,docs:{...(f=i.parameters)==null?void 0:f.docs,source:{originalSource:`{
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
This story proves Geoman does not interfere with normal map interaction.`,...(T=(P=p.parameters)==null?void 0:P.docs)==null?void 0:T.description}}};const F=["GeomanToolbar","Programmatic","Dormant"];export{p as Dormant,i as GeomanToolbar,l as Programmatic,F as __namedExportsOrder,$ as default};
