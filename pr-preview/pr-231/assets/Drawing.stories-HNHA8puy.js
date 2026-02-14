import{j as t}from"./jsx-runtime-DF2Pcvd1.js";import{r}from"./index-B2-qRKKC.js";import{M as C}from"./MapView-D-xTU21P.js";import{T as v}from"./ThemeProvider-mvcGjblv.js";import{c as D}from"./createDrawnFeature-BTSDyDwo.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./TileLayer-Cckmdc0V.js";import"./index-kS-9iBlu.js";import"./labels-ByPsOtwN.js";import"./Tooltip-CeZQf7Zv.js";import"./time-DRS43qp1.js";import"./leaflet-geoman-Cc97th-d.js";/* empty css                */const A={title:"Components/MapView/Drawing",parameters:{layout:"padded",docs:{description:{component:"Point and rectangle drawing on the map via the custom toolbar shape palette. Demonstrates createDrawnFeature() converting Geoman output to schema-compliant GeoJSON. Part of E05: Shape Drawing Tools (Feature 094)."}}},decorators:[d=>t.jsx(v,{children:t.jsx(d,{})})]},n={render:function(){const[a,m]=r.useState([]),[o,s]=r.useState(new Set),[f,S]=r.useState(null),[w,x]=r.useState(null),y=r.useCallback((e,b)=>{x(e);const i=D(e,b);i&&(m(j=>[...j,i]),s(new Set([i.id])))},[]),l=r.useCallback(e=>{s(new Set([e]))},[]),k=r.useCallback(()=>{s(new Set)},[]);return t.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:12},children:[t.jsx("div",{style:{height:500,position:"relative"},children:t.jsx(C,{features:a,selectedIds:o,onSelect:l,onBackgroundClick:k,drawingMode:f,onDrawingModeChange:S,onShapeCreated:y,autoFitBounds:!1,initialCenter:[50.4,-4.1],initialZoom:12,height:500})}),t.jsxs("div",{"data-testid":"drawn-features-list",children:[t.jsxs("h4",{style:{margin:"0 0 8px"},children:["Drawn Features (",a.length,")"]}),a.length===0&&t.jsx("p",{style:{color:"#888",fontSize:13},children:"Click '+' in the toolbar, then select Point or Rectangle to start drawing."}),a.map(e=>t.jsxs("div",{onClick:()=>l(e.id),"data-testid":`feature-${e.id}`,style:{padding:"8px 12px",marginBottom:4,background:o.has(e.id)?"#e3f2fd":"#f5f5f5",border:o.has(e.id)?"2px solid #1976D2":"1px solid #ddd",borderRadius:4,cursor:"pointer",fontSize:13},children:[t.jsx("strong",{children:e.properties.kind})," — ",e.properties.name??e.properties.label??e.id,t.jsxs("span",{style:{color:"#888",marginLeft:8},children:["[",e.geometry.type,"]"]})]},e.id))]}),w&&t.jsxs("details",{"data-testid":"json-inspector",children:[t.jsx("summary",{style:{cursor:"pointer",fontSize:13,color:"#666"},children:"Last drawn feature JSON (schema inspector)"}),t.jsx("pre",{style:{background:"#1e1e1e",color:"#d4d4d4",padding:12,borderRadius:4,fontSize:11,maxHeight:200,overflow:"auto",marginTop:4},children:a.length>0?JSON.stringify(a[a.length-1],null,2):"No features yet"})]})]})}};var c,p,u,g,h;n.parameters={...n.parameters,docs:{...(c=n.parameters)==null?void 0:c.docs,source:{originalSource:`{
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
}`,...(u=(p=n.parameters)==null?void 0:p.docs)==null?void 0:u.source},description:{story:`Interactive point and rectangle drawing demo.

1. Click the '+' button in the toolbar to open the shape palette
2. Select "Point" — click on the map to place a point marker
3. Select "Rectangle" — click and drag on the map to draw a rectangle

Drawn features appear in the list below the map with full schema details.
The most recently drawn feature is auto-selected (highlighted on map).`,...(h=(g=n.parameters)==null?void 0:g.docs)==null?void 0:h.description}}};const E=["PointAndRectangle"];export{n as PointAndRectangle,E as __namedExportsOrder,A as default};
