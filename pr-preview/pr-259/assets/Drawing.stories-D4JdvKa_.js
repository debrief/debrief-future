import{j as t}from"./jsx-runtime-DF2Pcvd1.js";import{r}from"./index-B2-qRKKC.js";import{M as C}from"./MapView-CPr9ej8Q.js";import{T as v}from"./ThemeProvider-mvcGjblv.js";import{c as D}from"./createDrawnFeature-BV1XLVpI.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./TileLayer-Cckmdc0V.js";import"./index-kS-9iBlu.js";import"./labels-D4DpyF2F.js";import"./Tooltip-CeZQf7Zv.js";import"./time-CBZeHVFz.js";import"./leaflet-geoman-Cc97th-d.js";/* empty css                */const A={title:"Components/MapView/Drawing",parameters:{layout:"padded",docs:{description:{component:"Shape drawing on the map via the custom toolbar shape palette. Demonstrates createDrawnFeature() converting Geoman output to schema-compliant GeoJSON for all four shape types: Point, Rectangle, Polygon, and Polyline. Part of E05: Shape Drawing Tools (Features 094, 095)."}}},decorators:[l=>t.jsx(v,{children:t.jsx(l,{})})]},s={render:function(){const[a,f]=r.useState([]),[o,n]=r.useState(new Set),[m,S]=r.useState(null),[w,y]=r.useState(null),k=r.useCallback((e,b)=>{y(e);const i=D(e,b);i&&(f(j=>[...j,i]),n(new Set([i.id])))},[]),d=r.useCallback(e=>{n(new Set([e]))},[]),x=r.useCallback(()=>{n(new Set)},[]);return t.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:12},children:[t.jsx("div",{style:{height:500,position:"relative"},children:t.jsx(C,{features:a,selectedIds:o,onSelect:d,onBackgroundClick:x,drawingMode:m,onDrawingModeChange:S,onShapeCreated:k,autoFitBounds:!1,initialCenter:[50.4,-4.1],initialZoom:12,height:500})}),t.jsxs("div",{"data-testid":"drawn-features-list",children:[t.jsxs("h4",{style:{margin:"0 0 8px"},children:["Drawn Features (",a.length,")"]}),a.length===0&&t.jsx("p",{style:{color:"#888",fontSize:13},children:"Click '+' in the toolbar, then select a shape type to start drawing."}),a.map(e=>t.jsxs("div",{onClick:()=>d(e.id),"data-testid":`feature-${e.id}`,style:{padding:"8px 12px",marginBottom:4,background:o.has(e.id)?"#e3f2fd":"#f5f5f5",border:o.has(e.id)?"2px solid #1976D2":"1px solid #ddd",borderRadius:4,cursor:"pointer",fontSize:13},children:[t.jsx("strong",{children:e.properties.kind})," — ",e.properties.name??e.properties.label??e.id,t.jsxs("span",{style:{color:"#888",marginLeft:8},children:["[",e.geometry.type,"]"]})]},e.id))]}),w&&t.jsxs("details",{"data-testid":"json-inspector",children:[t.jsx("summary",{style:{cursor:"pointer",fontSize:13,color:"#666"},children:"Last drawn feature JSON (schema inspector)"}),t.jsx("pre",{style:{background:"#1e1e1e",color:"#d4d4d4",padding:12,borderRadius:4,fontSize:11,maxHeight:200,overflow:"auto",marginTop:4},children:a.length>0?JSON.stringify(a[a.length-1],null,2):"No features yet"})]})]})}};var c,p,u,h,g;s.parameters={...s.parameters,docs:{...(c=s.parameters)==null?void 0:c.docs,source:{originalSource:`{
  render: function AllShapesStory() {
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
              Click '+' in the toolbar, then select a shape type to start drawing.
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
}`,...(u=(p=s.parameters)==null?void 0:p.docs)==null?void 0:u.source},description:{story:`Interactive drawing demo for all four shape types.

1. Click the '+' button in the toolbar to open the shape palette
2. Select "Point" — click on the map to place a point marker
3. Select "Rectangle" — click and drag on the map to draw a rectangle
4. Select "Polygon" — click to place vertices, double-click to close
5. Select "Polyline" — click to place vertices, double-click to finish

Drawn features appear in the list below the map with full schema details.
The most recently drawn feature is auto-selected (highlighted on map).`,...(g=(h=s.parameters)==null?void 0:h.docs)==null?void 0:g.description}}};const E=["AllShapes"];export{s as AllShapes,E as __namedExportsOrder,A as default};
