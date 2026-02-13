import{j as a}from"./jsx-runtime-DF2Pcvd1.js";import{r as d}from"./index-B2-qRKKC.js";import{M as D}from"./MapView-D-xTU21P.js";import{T as R}from"./ThemeProvider-mvcGjblv.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./TileLayer-Cckmdc0V.js";import"./index-kS-9iBlu.js";import"./labels-ByPsOtwN.js";import"./Tooltip-CeZQf7Zv.js";import"./time-DRS43qp1.js";import"./leaflet-geoman-Cc97th-d.js";/* empty css                */const F={shape:"circle",radius:6,fill:!0,fill_color:"#4CAF50",fill_opacity:.7,stroke:!0,color:"#388E3C",weight:2,opacity:1},v={fill:!0,fill_color:"#2196F3",fill_opacity:.15,stroke:!0,color:"#1976D2",weight:2,opacity:.8};function j(n,t){if(!n.geometry)return!1;if(t==="point"){if(n.geometry.type!=="Point")return!1;const e=n.geometry.coordinates;return Array.isArray(e)&&e.length>=2&&typeof e[0]=="number"&&typeof e[1]=="number"&&isFinite(e[0])&&isFinite(e[1])}if(t==="rectangle"){if(n.geometry.type!=="Polygon")return!1;const e=n.geometry.coordinates;if(!Array.isArray(e)||e.length===0)return!1;const i=e[0];if(!Array.isArray(i)||i.length<5)return!1;let o=1/0,c=-1/0,u=1/0,p=-1/0;for(const f of i){if(!Array.isArray(f)||f.length<2)return!1;const[l,s]=f;if(typeof l!="number"||typeof s!="number")return!1;l<o&&(o=l),l>c&&(c=l),s<u&&(u=s),s>p&&(p=s)}return c-o>0&&p-u>0}return!1}function I(n,t,e){if(!t||!j(n,t))return null;const i=crypto.randomUUID();if(t==="point"){const o=n.geometry;return{type:"Feature",id:i,geometry:{type:"Point",coordinates:o.coordinates},properties:{kind:"POINT",name:"Drawn Point",location_type:"REFERENCE",style:{...F,...e==null?void 0:e.pointStyle}}}}if(t==="rectangle"){const o=n.geometry;return{type:"Feature",id:i,geometry:{type:"Polygon",coordinates:o.coordinates},properties:{kind:"RECTANGLE",label:"Drawn Rectangle",style:{...v,...e==null?void 0:e.rectangleStyle}}}}return null}const J={title:"Components/MapView/Drawing",parameters:{layout:"padded",docs:{description:{component:"Point and rectangle drawing on the map via the custom toolbar shape palette. Demonstrates createDrawnFeature() converting Geoman output to schema-compliant GeoJSON. Part of E05: Shape Drawing Tools (Feature 094)."}}},decorators:[n=>a.jsx(R,{children:a.jsx(n,{})})]},g={render:function(){const[t,e]=d.useState([]),[i,o]=d.useState(new Set),[c,u]=d.useState(null),[p,f]=d.useState(null),l=d.useCallback((r,b)=>{f(r);const m=I(r,b);m&&(e(C=>[...C,m]),o(new Set([m.id])))},[]),s=d.useCallback(r=>{o(new Set([r]))},[]),x=d.useCallback(()=>{o(new Set)},[]);return a.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:12},children:[a.jsx("div",{style:{height:500,position:"relative"},children:a.jsx(D,{features:t,selectedIds:i,onSelect:s,onBackgroundClick:x,drawingMode:c,onDrawingModeChange:u,onShapeCreated:l,autoFitBounds:!1,initialCenter:[50.4,-4.1],initialZoom:12,height:500})}),a.jsxs("div",{"data-testid":"drawn-features-list",children:[a.jsxs("h4",{style:{margin:"0 0 8px"},children:["Drawn Features (",t.length,")"]}),t.length===0&&a.jsx("p",{style:{color:"#888",fontSize:13},children:"Click '+' in the toolbar, then select Point or Rectangle to start drawing."}),t.map(r=>a.jsxs("div",{onClick:()=>s(r.id),"data-testid":`feature-${r.id}`,style:{padding:"8px 12px",marginBottom:4,background:i.has(r.id)?"#e3f2fd":"#f5f5f5",border:i.has(r.id)?"2px solid #1976D2":"1px solid #ddd",borderRadius:4,cursor:"pointer",fontSize:13},children:[a.jsx("strong",{children:r.properties.kind})," — ",r.properties.name??r.properties.label??r.id,a.jsxs("span",{style:{color:"#888",marginLeft:8},children:["[",r.geometry.type,"]"]})]},r.id))]}),p&&a.jsxs("details",{"data-testid":"json-inspector",children:[a.jsx("summary",{style:{cursor:"pointer",fontSize:13,color:"#666"},children:"Last drawn feature JSON (schema inspector)"}),a.jsx("pre",{style:{background:"#1e1e1e",color:"#d4d4d4",padding:12,borderRadius:4,fontSize:11,maxHeight:200,overflow:"auto",marginTop:4},children:t.length>0?JSON.stringify(t[t.length-1],null,2):"No features yet"})]})]})}};var h,y,w,S,k;g.parameters={...g.parameters,docs:{...(h=g.parameters)==null?void 0:h.docs,source:{originalSource:`{
  render: function PointAndRectangleStory() {
    const [features, setFeatures] = useState<DebriefFeature[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [drawingMode, setDrawingMode] = useState<DrawingMode>(null);
    const [lastRawGeojson, setLastRawGeojson] = useState<object | null>(null);
    const handleShapeCreated = useCallback((geojson: GeoJSON.Feature, mode: DrawingMode) => {
      setLastRawGeojson(geojson);
      const feature = createDrawnFeature(geojson, mode);
      if (feature) {
        setFeatures(prev => [...prev, feature as DebriefFeature]);
        setSelectedIds(new Set([feature.id]));
      }
    }, []);
    const handleSelect = useCallback((featureId: string) => {
      setSelectedIds(new Set([featureId]));
    }, []);
    const handleBackgroundClick = useCallback(() => {
      setSelectedIds(new Set());
    }, []);
    return <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }}>
        <div style={{
        height: 500,
        position: 'relative'
      }}>
          <MapView features={features} selectedIds={selectedIds} onSelect={handleSelect} onBackgroundClick={handleBackgroundClick} drawingMode={drawingMode} onDrawingModeChange={setDrawingMode} onShapeCreated={handleShapeCreated} autoFitBounds={false} initialCenter={[50.4, -4.1]} initialZoom={12} height={500} />
        </div>

        {/* Feature list */}
        <div data-testid="drawn-features-list">
          <h4 style={{
          margin: '0 0 8px'
        }}>
            Drawn Features ({features.length})
          </h4>
          {features.length === 0 && <p style={{
          color: '#888',
          fontSize: 13
        }}>
              Click '+' in the toolbar, then select Point or Rectangle to start drawing.
            </p>}
          {features.map(f => <div key={f.id} onClick={() => handleSelect(f.id)} data-testid={\`feature-\${f.id}\`} style={{
          padding: '8px 12px',
          marginBottom: 4,
          background: selectedIds.has(f.id) ? '#e3f2fd' : '#f5f5f5',
          border: selectedIds.has(f.id) ? '2px solid #1976D2' : '1px solid #ddd',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 13
        }}>
              <strong>{(f.properties as Record<string, unknown>).kind as string}</strong>
              {' — '}
              {(f.properties as Record<string, unknown>).name as string ?? (f.properties as Record<string, unknown>).label as string ?? f.id}
              <span style={{
            color: '#888',
            marginLeft: 8
          }}>
                [{f.geometry.type}]
              </span>
            </div>)}
        </div>

        {/* JSON inspector for schema verification */}
        {lastRawGeojson && <details data-testid="json-inspector">
            <summary style={{
          cursor: 'pointer',
          fontSize: 13,
          color: '#666'
        }}>
              Last drawn feature JSON (schema inspector)
            </summary>
            <pre style={{
          background: '#1e1e1e',
          color: '#d4d4d4',
          padding: 12,
          borderRadius: 4,
          fontSize: 11,
          maxHeight: 200,
          overflow: 'auto',
          marginTop: 4
        }}>
              {features.length > 0 ? JSON.stringify(features[features.length - 1], null, 2) : 'No features yet'}
            </pre>
          </details>}
      </div>;
  }
}`,...(w=(y=g.parameters)==null?void 0:y.docs)==null?void 0:w.source},description:{story:`Interactive point and rectangle drawing demo.

1. Click the '+' button in the toolbar to open the shape palette
2. Select "Point" — click on the map to place a point marker
3. Select "Rectangle" — click and drag on the map to draw a rectangle

Drawn features appear in the list below the map with full schema details.
The most recently drawn feature is auto-selected (highlighted on map).`,...(k=(S=g.parameters)==null?void 0:S.docs)==null?void 0:k.description}}};const U=["PointAndRectangle"];export{g as PointAndRectangle,U as __namedExportsOrder,J as default};
