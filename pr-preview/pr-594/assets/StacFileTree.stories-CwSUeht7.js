import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r as C}from"./index-B2-qRKKC.js";import{S as c}from"./StacFileTree-9qY9uyTU.js";import{T as k}from"./ThemeProvider-DF0jq0Ad.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./textfield-Dm39NdvL.js";import"./defaultTheme-Tx6C8nph.js";function w(s){const o=new Map;for(const[t,r]of Object.entries(s)){o.set(t,{content:r,isDirectory:!1});const a=t.split("/").filter(Boolean);for(let i=1;i<a.length;i++){const l="/"+a.slice(0,i).join("/");o.has(l)||o.set(l,{isDirectory:!0})}o.has("/")||o.set("/",{isDirectory:!0})}return{async readDirectory(t){const r=t.endsWith("/")&&t!=="/"?t.slice(0,-1):t,a=o.get(r);if(!a||!a.isDirectory)throw new Error(`Not a directory: ${t}`);const i=r==="/"?"/":r+"/",l=new Map;for(const[n]of o){if(n===r||!n.startsWith(i))continue;const d=n.slice(i.length),E=d.indexOf("/"),h=E===-1?d:d.slice(0,E);if(h&&!l.has(h)){const he=i+h,I=o.get(he);l.set(h,I?I.isDirectory:!0)}}return Array.from(l.entries()).sort(([n],[d])=>n.localeCompare(d)).map(([n,d])=>({name:n,isDirectory:d}))},async stat(t){const r=t.endsWith("/")&&t!=="/"?t.slice(0,-1):t,a=o.get(r);if(!a)throw new Error(`Path not found: ${t}`);return{isDirectory:a.isDirectory,size:a.isDirectory?0:a.content.length,modifiedTime:Date.now()}},async readFile(t){const r=o.get(t);if(!r||r.isDirectory)throw new Error(`Not a file: ${t}`);return r.content}}}const ge={"/catalog-1/catalog.json":JSON.stringify({type:"Catalog",id:"catalog-1",description:"Main Catalog"}),"/catalog-1/collection-a/collection.json":JSON.stringify({type:"Collection",id:"collection-a",description:"Collection A"}),"/catalog-1/collection-a/item-001/item.json":JSON.stringify({type:"Feature",id:"item-001",geometry:{type:"Point",coordinates:[0,0]},properties:{}}),"/catalog-1/collection-a/item-001/track.geojson":JSON.stringify({type:"FeatureCollection",features:[]}),"/catalog-1/collection-a/item-001/snapshot-1.json":JSON.stringify({id:"snapshot-1",timestamp:"2024-01-15T10:00:00Z"}),"/catalog-1/collection-a/item-002/item.json":JSON.stringify({type:"Feature",id:"item-002",geometry:{type:"Point",coordinates:[1,1]},properties:{}}),"/catalog-1/collection-a/item-002/track.geojson":JSON.stringify({type:"FeatureCollection",features:[]}),"/catalog-2/catalog.json":JSON.stringify({type:"Catalog",id:"catalog-2",description:"Second Catalog"}),"/catalog-2/item-003/item.json":JSON.stringify({type:"Feature",id:"item-003",geometry:{type:"Point",coordinates:[2,2]},properties:{}}),"/catalog-2/item-003/data.geojson":JSON.stringify({type:"FeatureCollection",features:[]})},me={"/empty-catalog/catalog.json":JSON.stringify({type:"Catalog",id:"empty-catalog",description:"Empty Catalog"})},pe={"/catalog/catalog.json":JSON.stringify({type:"Catalog",id:"catalog",description:"Single Item Catalog"}),"/catalog/item-001/item.json":JSON.stringify({type:"Feature",id:"item-001",geometry:{type:"Point",coordinates:[0,0]},properties:{}}),"/catalog/item-001/track.geojson":JSON.stringify({type:"FeatureCollection",features:[]})},ye={"/catalog/catalog.json":JSON.stringify({type:"Catalog",id:"catalog",description:"Catalog with Snapshots"}),"/catalog/item-001/item.json":JSON.stringify({type:"Feature",id:"item-001",geometry:{type:"Point",coordinates:[0,0]},properties:{}}),"/catalog/item-001/snapshot-1.json":JSON.stringify({id:"snapshot-1",timestamp:"2024-01-15T10:00:00Z"}),"/catalog/item-001/snapshot-2.json":JSON.stringify({id:"snapshot-2",timestamp:"2024-01-15T11:00:00Z"}),"/catalog/item-002/item.json":JSON.stringify({type:"Feature",id:"item-002",geometry:{type:"Point",coordinates:[1,1]},properties:{}}),"/catalog/item-002/snapshot-3.json":JSON.stringify({id:"snapshot-3",timestamp:"2024-01-15T12:00:00Z"})};function de(){return w(ge)}function ue(){return w(me)}function fe(){return w(pe)}function Se(){return w(ye)}const Oe={title:"Components/StacFileTree",component:c,parameters:{layout:"padded",docs:{description:{component:"StacFileTree displays a hierarchical tree view of STAC catalog filesystem structure. Supports lazy loading, highlighting, and item selection. Uses filesystem adapter pattern for flexibility across different storage backends (memfs, Node fs, VS Code workspace.fs)."}}},tags:["autodocs"],decorators:[s=>e.jsx(k,{children:e.jsx("div",{style:{height:"400px",width:"100%"},children:e.jsx(s,{})})})]},v=de(),g={args:{fs:v,rootPath:"/catalog-1"},parameters:{docs:{description:{story:"Basic file tree showing a STAC catalog with collections and items. Click to expand/collapse nodes. Root node is expanded by default."}}}},xe=ue(),m={args:{fs:xe,rootPath:"/empty-catalog"},parameters:{docs:{description:{story:"File tree with an empty catalog (no children)."}}}},je=fe(),p={args:{fs:je,rootPath:"/catalog"},parameters:{docs:{description:{story:"File tree with a catalog containing a single item."}}}},b=Se(),y={args:{fs:b,rootPath:"/catalog",highlightedPaths:["/catalog/item-001/snapshot-1.json","/catalog/item-002/snapshot-3.json"]},parameters:{docs:{description:{story:"File tree with highlighted paths (snapshot files). Highlighted nodes have yellow background. Parent directories containing highlights have a subtle left border."}}}};function Fe(){const[s,o]=C.useState("/catalog-1/collection-a/item-001"),t=r=>{o(r),console.log("Selected item:",r)};return e.jsxs("div",{style:{height:"400px"},children:[e.jsxs("div",{style:{marginBottom:12,fontSize:13},children:[e.jsx("strong",{children:"Current item:"})," ",s||"None"]}),e.jsx(c,{fs:v,rootPath:"/catalog-1",currentItemPath:s,onItemSelect:t})]})}const u={render:()=>e.jsx(Fe,{}),parameters:{docs:{description:{story:"File tree with current item selection. Double-click an item node to select it. Current item is highlighted with blue background and border."}}}};function Pe(){const[s,o]=C.useState(),[t,r]=C.useState(["/catalog/item-001/snapshot-1.json"]),a=n=>{o(n)},i=()=>{r([...t,"/catalog/item-002/snapshot-3.json"])},l=()=>{r([])};return e.jsxs("div",{style:{height:"500px"},children:[e.jsxs("div",{style:{marginBottom:12,fontSize:13},children:[e.jsxs("div",{children:[e.jsx("strong",{children:"Current item:"})," ",s||"None"]}),e.jsxs("div",{style:{marginTop:8},children:[e.jsx("strong",{children:"Highlighted paths:"})," ",t.length,e.jsx("button",{onClick:i,style:{marginLeft:8},children:"Add Highlight"}),e.jsx("button",{onClick:l,style:{marginLeft:8},children:"Clear Highlights"})]})]}),e.jsx(c,{fs:b,rootPath:"/catalog",currentItemPath:s,highlightedPaths:t,onItemSelect:a})]})}const f={render:()=>e.jsx(Pe,{}),parameters:{docs:{description:{story:"Interactive file tree with both current item selection and highlights. Double-click items to select. Use buttons to add/clear highlights."}}}},S={render:()=>e.jsx(k,{theme:{variant:"dark"},children:e.jsx("div",{style:{height:"400px"},children:e.jsx(c,{fs:v,rootPath:"/catalog-1",currentItemPath:"/catalog-1/collection-a/item-001"})})}),parameters:{backgrounds:{default:"dark"},docs:{description:{story:"File tree with dark theme applied."}}}},x={render:()=>e.jsx(k,{theme:{variant:"dark"},children:e.jsx("div",{style:{height:"400px"},children:e.jsx(c,{fs:b,rootPath:"/catalog",highlightedPaths:["/catalog/item-001/snapshot-1.json","/catalog/item-001/snapshot-2.json"],currentItemPath:"/catalog/item-001"})})}),parameters:{backgrounds:{default:"dark"},docs:{description:{story:"File tree with dark theme, highlights, and current item selection."}}}},j={render:()=>{const s={stat:()=>Promise.reject(new Error("Failed to read directory")),readDirectory:()=>Promise.reject(new Error("Failed to read directory")),readFile:()=>Promise.reject(new Error("Failed to read file"))};return e.jsx("div",{style:{height:"400px"},children:e.jsx(c,{fs:s,rootPath:"/nonexistent"})})},parameters:{docs:{description:{story:"File tree showing error state with retry button."}}}};function Ce(){const[s,o]=C.useState(0);return e.jsxs("div",{style:{height:"400px"},children:[e.jsx("div",{style:{marginBottom:12},children:e.jsxs("button",{onClick:()=>o(t=>t+1),children:["Refresh Tree (key: ",s,")"]})}),e.jsx(c,{fs:v,rootPath:"/catalog-1",refreshKey:s})]})}const F={render:()=>e.jsx(Ce,{}),parameters:{docs:{description:{story:"File tree with refresh capability. Click button to increment refreshKey and reload the tree."}}}},T=de(),P={render:()=>e.jsxs("div",{style:{display:"flex",gap:16,height:"400px"},children:[e.jsxs("div",{style:{flex:1},children:[e.jsx("h4",{style:{margin:"0 0 8px 0",fontSize:14},children:"Catalog 1"}),e.jsx(c,{fs:T,rootPath:"/catalog-1"})]}),e.jsxs("div",{style:{flex:1},children:[e.jsx("h4",{style:{margin:"0 0 8px 0",fontSize:14},children:"Catalog 2"}),e.jsx(c,{fs:T,rootPath:"/catalog-2"})]})]}),parameters:{docs:{description:{story:"Multiple file trees side by side, each showing a different catalog."}}}};var O,N,D;g.parameters={...g.parameters,docs:{...(O=g.parameters)==null?void 0:O.docs,source:{originalSource:`{
  args: {
    fs: populatedFs,
    rootPath: '/catalog-1'
  },
  parameters: {
    docs: {
      description: {
        story: 'Basic file tree showing a STAC catalog with collections and items. ' + 'Click to expand/collapse nodes. Root node is expanded by default.'
      }
    }
  }
}`,...(D=(N=g.parameters)==null?void 0:N.docs)==null?void 0:D.source}}};var J,A,H;m.parameters={...m.parameters,docs:{...(J=m.parameters)==null?void 0:J.docs,source:{originalSource:`{
  args: {
    fs: emptyFs,
    rootPath: '/empty-catalog'
  },
  parameters: {
    docs: {
      description: {
        story: 'File tree with an empty catalog (no children).'
      }
    }
  }
}`,...(H=(A=m.parameters)==null?void 0:A.docs)==null?void 0:H.source}}};var R,_,z;p.parameters={...p.parameters,docs:{...(R=p.parameters)==null?void 0:R.docs,source:{originalSource:`{
  args: {
    fs: singleItemFs,
    rootPath: '/catalog'
  },
  parameters: {
    docs: {
      description: {
        story: 'File tree with a catalog containing a single item.'
      }
    }
  }
}`,...(z=(_=p.parameters)==null?void 0:_.docs)==null?void 0:z.source}}};var M,W,L;y.parameters={...y.parameters,docs:{...(M=y.parameters)==null?void 0:M.docs,source:{originalSource:`{
  args: {
    fs: snapshotFs,
    rootPath: '/catalog',
    highlightedPaths: ['/catalog/item-001/snapshot-1.json', '/catalog/item-002/snapshot-3.json']
  },
  parameters: {
    docs: {
      description: {
        story: 'File tree with highlighted paths (snapshot files). ' + 'Highlighted nodes have yellow background. ' + 'Parent directories containing highlights have a subtle left border.'
      }
    }
  }
}`,...(L=(W=y.parameters)==null?void 0:W.docs)==null?void 0:L.source}}};var B,K,U;u.parameters={...u.parameters,docs:{...(B=u.parameters)==null?void 0:B.docs,source:{originalSource:`{
  render: () => <CurrentItemSelectedExample />,
  parameters: {
    docs: {
      description: {
        story: 'File tree with current item selection. ' + 'Double-click an item node to select it. ' + 'Current item is highlighted with blue background and border.'
      }
    }
  }
}`,...(U=(K=u.parameters)==null?void 0:K.docs)==null?void 0:U.source}}};var Z,$,G;f.parameters={...f.parameters,docs:{...(Z=f.parameters)==null?void 0:Z.docs,source:{originalSource:`{
  render: () => <InteractiveExample />,
  parameters: {
    docs: {
      description: {
        story: 'Interactive file tree with both current item selection and highlights. ' + 'Double-click items to select. Use buttons to add/clear highlights.'
      }
    }
  }
}`,...(G=($=f.parameters)==null?void 0:$.docs)==null?void 0:G.source}}};var V,Y,q;S.parameters={...S.parameters,docs:{...(V=S.parameters)==null?void 0:V.docs,source:{originalSource:`{
  render: () => <ThemeProvider theme={{
    variant: 'dark'
  }}>
      <div style={{
      height: '400px'
    }}>
        <StacFileTree fs={populatedFs} rootPath="/catalog-1" currentItemPath="/catalog-1/collection-a/item-001" />
      </div>
    </ThemeProvider>,
  parameters: {
    backgrounds: {
      default: 'dark'
    },
    docs: {
      description: {
        story: 'File tree with dark theme applied.'
      }
    }
  }
}`,...(q=(Y=S.parameters)==null?void 0:Y.docs)==null?void 0:q.source}}};var Q,X,ee;x.parameters={...x.parameters,docs:{...(Q=x.parameters)==null?void 0:Q.docs,source:{originalSource:`{
  render: () => <ThemeProvider theme={{
    variant: 'dark'
  }}>
      <div style={{
      height: '400px'
    }}>
        <StacFileTree fs={snapshotFs} rootPath="/catalog" highlightedPaths={['/catalog/item-001/snapshot-1.json', '/catalog/item-001/snapshot-2.json']} currentItemPath="/catalog/item-001" />
      </div>
    </ThemeProvider>,
  parameters: {
    backgrounds: {
      default: 'dark'
    },
    docs: {
      description: {
        story: 'File tree with dark theme, highlights, and current item selection.'
      }
    }
  }
}`,...(ee=(X=x.parameters)==null?void 0:X.docs)==null?void 0:ee.source}}};var te,re,oe;j.parameters={...j.parameters,docs:{...(te=j.parameters)==null?void 0:te.docs,source:{originalSource:`{
  render: () => {
    const errorFs = {
      stat: () => Promise.reject(new Error('Failed to read directory')),
      readDirectory: () => Promise.reject(new Error('Failed to read directory')),
      readFile: () => Promise.reject(new Error('Failed to read file'))
    };
    return <div style={{
      height: '400px'
    }}>
        <StacFileTree fs={errorFs} rootPath="/nonexistent" />
      </div>;
  },
  parameters: {
    docs: {
      description: {
        story: 'File tree showing error state with retry button.'
      }
    }
  }
}`,...(oe=(re=j.parameters)==null?void 0:re.docs)==null?void 0:oe.source}}};var se,ae,ie;F.parameters={...F.parameters,docs:{...(se=F.parameters)==null?void 0:se.docs,source:{originalSource:`{
  render: () => <RefreshExample />,
  parameters: {
    docs: {
      description: {
        story: 'File tree with refresh capability. Click button to increment refreshKey and reload the tree.'
      }
    }
  }
}`,...(ie=(ae=F.parameters)==null?void 0:ae.docs)==null?void 0:ie.source}}};var ne,ce,le;P.parameters={...P.parameters,docs:{...(ne=P.parameters)==null?void 0:ne.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    gap: 16,
    height: '400px'
  }}>
      <div style={{
      flex: 1
    }}>
        <h4 style={{
        margin: '0 0 8px 0',
        fontSize: 14
      }}>Catalog 1</h4>
        <StacFileTree fs={multipleCatalogsFs} rootPath="/catalog-1" />
      </div>
      <div style={{
      flex: 1
    }}>
        <h4 style={{
        margin: '0 0 8px 0',
        fontSize: 14
      }}>Catalog 2</h4>
        <StacFileTree fs={multipleCatalogsFs} rootPath="/catalog-2" />
      </div>
    </div>,
  parameters: {
    docs: {
      description: {
        story: 'Multiple file trees side by side, each showing a different catalog.'
      }
    }
  }
}`,...(le=(ce=P.parameters)==null?void 0:ce.docs)==null?void 0:le.source}}};const Ne=["Default","Empty","SingleItem","WithHighlights","CurrentItemSelected","Interactive","DarkTheme","DarkThemeWithHighlights","ErrorState","WithRefresh","MultipleCatalogs"];export{u as CurrentItemSelected,S as DarkTheme,x as DarkThemeWithHighlights,g as Default,m as Empty,j as ErrorState,f as Interactive,P as MultipleCatalogs,p as SingleItem,y as WithHighlights,F as WithRefresh,Ne as __namedExportsOrder,Oe as default};
