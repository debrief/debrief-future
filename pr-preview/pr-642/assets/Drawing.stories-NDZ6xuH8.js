import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r as a}from"./index-B2-qRKKC.js";import{M as k}from"./MapView-Df43O29V.js";import{T}from"./ThemeProvider-DF0jq0Ad.js";import{c as J,a as Z}from"./drawingPalette-B8cqKU8M.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./TileLayer-Cckmdc0V.js";import"./index-kS-9iBlu.js";import"./interval-CUv8kruJ.js";import"./types-CuJnRqfe.js";import"./bounds-BbBIf5Id.js";import"./labels-Bx3GzQt_.js";import"./useTheme-DUm7hPwc.js";import"./defaultTheme-Tx6C8nph.js";import"./ViewportLockBanner-Cbyss5BQ.js";import"./leaflet-geoman-Cc97th-d.js";/* empty css                */const re={title:"Components/MapView/Drawing",parameters:{layout:"padded",docs:{description:{component:"Shape drawing on the map via the custom toolbar shape palette. Demonstrates createDrawnFeature() converting Geoman output to schema-compliant GeoJSON for all four shape types: Point, Rectangle, Polygon, and Polyline. Part of E05: Shape Drawing Tools (Features 094, 095)."}}},decorators:[f=>e.jsx(T,{children:e.jsx(f,{})})]},p={render:function(){const[n,i]=a.useState([]),[d,s]=a.useState(new Set),[S,w]=a.useState(null),[l,y]=a.useState(null),x=a.useCallback((t,o)=>{y(t);const c=J(t,o);c&&(i(u=>[...u,c]),s(new Set([c.id])))},[]),m=a.useCallback(t=>{s(new Set([t]))},[]),r=a.useCallback(()=>{s(new Set)},[]);return e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:12},children:[e.jsx("div",{style:{height:500,position:"relative"},children:e.jsx(k,{features:n,selectedIds:d,onSelect:m,onBackgroundClick:r,drawingMode:S,onDrawingModeChange:w,onShapeCreated:x,autoFitBounds:!1,initialCenter:[50.4,-4.1],initialZoom:12,height:500})}),e.jsxs("div",{"data-testid":"drawn-features-list",children:[e.jsxs("h4",{style:{margin:"0 0 8px"},children:["Drawn Features (",n.length,")"]}),n.length===0&&e.jsx("p",{style:{color:"#888",fontSize:13},children:"Click '+' in the toolbar, then select a shape type to start drawing."}),n.map(t=>e.jsxs("div",{onClick:()=>m(t.id),"data-testid":`feature-${t.id}`,style:{padding:"8px 12px",marginBottom:4,background:d.has(t.id)?"#e3f2fd":"#f5f5f5",border:d.has(t.id)?"2px solid #1976D2":"1px solid #ddd",borderRadius:4,cursor:"pointer",fontSize:13},children:[e.jsx("strong",{children:t.properties.kind})," — ",t.properties.name??t.properties.label??t.id,e.jsxs("span",{style:{color:"#888",marginLeft:8},children:["[",t.geometry.type,"]"]})]},t.id))]}),l&&e.jsxs("details",{"data-testid":"json-inspector",children:[e.jsx("summary",{style:{cursor:"pointer",fontSize:13,color:"#666"},children:"Last drawn feature JSON (schema inspector)"}),e.jsx("pre",{style:{background:"#1e1e1e",color:"#d4d4d4",padding:12,borderRadius:4,fontSize:11,maxHeight:200,overflow:"auto",marginTop:4},children:n.length>0?JSON.stringify(n[n.length-1],null,2):"No features yet"})]})]})}},g={render:function(){const[n,i]=a.useState(null);return e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:12},children:[e.jsx("div",{style:{height:500,position:"relative"},children:e.jsx(k,{features:[],drawingMode:n,onDrawingModeChange:i,autoFitBounds:!1,initialCenter:[50.4,-4.1],initialZoom:12,height:500})}),e.jsxs("p",{style:{fontSize:13,color:"#666"},children:["Current mode: ",e.jsx("strong",{children:n??"none"}),n&&" — Look for the guidance text at the bottom of the map"]})]})}},h={render:function(){const[n,i]=a.useState([]),[d,s]=a.useState(new Set),[S,w]=a.useState(null),[l,y]=a.useState(0),x=a.useCallback((r,t)=>{const o=Z(t,l),c={source:"user-drawn",timestamp:new Date().toISOString(),operator:"storybook-user",action:"created"},u=J(r,t,{...o,provenance:c});u&&(i(v=>[...v,u]),s(new Set([u.id])),y(v=>v+1))},[l]),m=a.useCallback(r=>{s(new Set([r]))},[]);return e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:12},children:[e.jsx("div",{style:{height:500,position:"relative"},children:e.jsx(k,{features:n,selectedIds:d,onSelect:m,drawingMode:S,onDrawingModeChange:w,onShapeCreated:x,autoFitBounds:!1,initialCenter:[50.4,-4.1],initialZoom:12,height:500})}),e.jsxs("div",{"data-testid":"palette-features-list",children:[e.jsxs("h4",{style:{margin:"0 0 8px"},children:["Drawn Features (",n.length,") — Palette index: ",l]}),n.map(r=>{const t=r.properties.style,o=(t==null?void 0:t.color)??(t==null?void 0:t.fill_color)??"#999";return e.jsxs("div",{"data-testid":`palette-feature-${r.id}`,style:{padding:"6px 12px",marginBottom:4,borderLeft:`4px solid ${o}`,background:"#f5f5f5",borderRadius:4,fontSize:13},children:[e.jsx("span",{style:{color:o,fontWeight:700},children:o})," — ",r.properties.kind]},r.id)})]})]})}};var C,b,D,j,M;p.parameters={...p.parameters,docs:{...(C=p.parameters)==null?void 0:C.docs,source:{originalSource:`{
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
}`,...(D=(b=p.parameters)==null?void 0:b.docs)==null?void 0:D.source},description:{story:`Interactive drawing demo for all four shape types.

1. Click the '+' button in the toolbar to open the shape palette
2. Select "Point" — click on the map to place a point marker
3. Select "Rectangle" — click and drag on the map to draw a rectangle
4. Select "Polygon" — click to place vertices, double-click to close
5. Select "Polyline" — click to place vertices, double-click to finish

Drawn features appear in the list below the map with full schema details.
The most recently drawn feature is auto-selected (highlighted on map).`,...(M=(j=p.parameters)==null?void 0:j.docs)==null?void 0:M.description}}};var F,I,R,O,P;g.parameters={...g.parameters,docs:{...(F=g.parameters)==null?void 0:F.docs,source:{originalSource:`{
  render: function GuidanceOverlayStory() {
    const [drawingMode, setDrawingMode] = useState<DrawingMode>(null);
    return <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }}>
        <div style={{
        height: 500,
        position: 'relative'
      }}>
          <MapView features={[]} drawingMode={drawingMode} onDrawingModeChange={setDrawingMode} autoFitBounds={false} initialCenter={[50.4, -4.1]} initialZoom={12} height={500} />
        </div>
        <p style={{
        fontSize: 13,
        color: '#666'
      }}>
          Current mode: <strong>{drawingMode ?? 'none'}</strong>
          {drawingMode && ' — Look for the guidance text at the bottom of the map'}
        </p>
      </div>;
  }
}`,...(R=(I=g.parameters)==null?void 0:I.docs)==null?void 0:R.source},description:{story:`Guidance Overlay story — demonstrates the DrawingGuidanceOverlay component.

Use the toolbar buttons to switch between drawing modes.
The guidance overlay appears at the bottom-centre of the map
with mode-specific instruction text and "Press Esc to cancel".

Feature: 096-drawing-ux-persistence (FR-001 through FR-006)`,...(P=(O=g.parameters)==null?void 0:O.docs)==null?void 0:P.description}}};var G,B,z,L,N;h.parameters={...h.parameters,docs:{...(G=h.parameters)==null?void 0:G.docs,source:{originalSource:`{
  render: function PaletteCyclingStory() {
    const [features, setFeatures] = useState<DebriefFeature[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [drawingMode, setDrawingMode] = useState<DrawingMode>(null);
    const [paletteIndex, setPaletteIndex] = useState(0);
    const handleShapeCreated = useCallback((geojson: GeoJSON.Feature, mode: DrawingMode) => {
      const paletteOverrides = getPaletteStyleOverrides(mode, paletteIndex);
      const provenance: DrawnFeatureProvenance = {
        source: 'user-drawn',
        timestamp: new Date().toISOString(),
        operator: 'storybook-user',
        action: 'created'
      };
      const feature = createDrawnFeature(geojson, mode, {
        ...paletteOverrides,
        provenance
      });
      if (feature) {
        setFeatures(prev => [...prev, feature as DebriefFeature]);
        setSelectedIds(new Set([feature.id]));
        setPaletteIndex(prev => prev + 1);
      }
    }, [paletteIndex]);
    const handleSelect = useCallback((featureId: string) => {
      setSelectedIds(new Set([featureId]));
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
          <MapView features={features} selectedIds={selectedIds} onSelect={handleSelect} drawingMode={drawingMode} onDrawingModeChange={setDrawingMode} onShapeCreated={handleShapeCreated} autoFitBounds={false} initialCenter={[50.4, -4.1]} initialZoom={12} height={500} />
        </div>
        <div data-testid="palette-features-list">
          <h4 style={{
          margin: '0 0 8px'
        }}>
            Drawn Features ({features.length}) — Palette index: {paletteIndex}
          </h4>
          {features.map(f => {
          const style = (f.properties as Record<string, unknown>).style as Record<string, unknown> | undefined;
          const colour = style?.color as string ?? style?.fill_color as string ?? '#999';
          return <div key={f.id} data-testid={\`palette-feature-\${f.id}\`} style={{
            padding: '6px 12px',
            marginBottom: 4,
            borderLeft: \`4px solid \${colour}\`,
            background: '#f5f5f5',
            borderRadius: 4,
            fontSize: 13
          }}>
                <span style={{
              color: colour,
              fontWeight: 700
            }}>{colour}</span>
                {' — '}
                {(f.properties as Record<string, unknown>).kind as string}
              </div>;
        })}
        </div>
      </div>;
  }
}`,...(z=(B=h.parameters)==null?void 0:B.docs)==null?void 0:z.source},description:{story:`Palette Cycling story — demonstrates sequential colour assignment.

Draw multiple shapes to see each receive a different colour from
the 8-colour palette. Colours cycle after 8 shapes.

Feature: 096-drawing-ux-persistence (FR-007 through FR-010)`,...(N=(L=h.parameters)==null?void 0:L.docs)==null?void 0:N.description}}};const oe=["AllShapes","GuidanceOverlay","PaletteCycling"];export{p as AllShapes,g as GuidanceOverlay,h as PaletteCycling,oe as __namedExportsOrder,re as default};
