import{j as o}from"./jsx-runtime-DF2Pcvd1.js";import{r as D}from"./index-B2-qRKKC.js";import{E as I}from"./ExerciseListView-BZpGcOu2.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./index-CHJUuggG.js";import"./index-kS-9iBlu.js";const Te=["Frigate","Destroyer","Submarine","Carrier","Corvette","Cruiser","Patrol Vessel","Mine Sweeper","Tanker","Helicopter"],ke=["training","exercise","deployment","patrol","anti-submarine","surface-warfare","carrier-ops","escort","logistics","surveillance"],_=["Jane Smith","John Williams","Sarah Chen","David Park","Maria Garcia","Robert Taylor","Emily Brown","Michael Johnson","Lisa Anderson","James Wilson"],xe=["GB","US","FR","DE","NO","DK","NL","IT","ES","CA"],b=["Neptune","Trident","Sentinel","Guardian","Corsair","Resolute","Vigilant","Tempest","Horizon","Aurora","Defender","Interceptor","Majestic","Sovereign","Pathfinder","Vanguard","Expedition","Discovery","Gallant","Steadfast"];function ye(e,r){return new Date(e.getTime()+Math.random()*(r.getTime()-e.getTime()))}function w(e,r){return[...e].sort(()=>.5-Math.random()).slice(0,r)}function Ee(e){const r=b[e%b.length]??"Unknown",t=e>=b.length?` ${Math.floor(e/b.length)+1}`:"",s=`Exercise ${r}${t}`,a=ye(new Date("2023-01-01"),new Date("2024-12-31")),m=Math.floor(Math.random()*720)+1,l=new Date(a.getTime()+m*36e5),n=Math.floor(Math.random()*4)+1,y=Math.floor(Math.random()*3)+1,i=Math.floor(Math.random()*3)+1,c=Math.floor(Math.random()*5)+1,d=-10+Math.random()*30,f=40+Math.random()*20,E=2+Math.random()*5;return{id:`exercise-${String(e).padStart(3,"0")}`,title:s,itemPath:`exercises/${r.toLowerCase()}${t.trim()?`-${t.trim()}`:""}/item.json`,bbox:[d-E/2,f-E/2,d+E/2,f+E/2],datetime:a.toISOString(),startDatetime:a.toISOString(),endDatetime:l.toISOString(),vesselClasses:w(Te,n),tags:w(ke,y),author:_[e%_.length]??null,nationalities:w(xe,i),trackNames:Array.from({length:c},(we,ve)=>`Track ${ve+1}`),trackDataHref:`exercises/${r.toLowerCase()}/data.geojson`}}function ge(e){return Array.from({length:e},(r,t)=>Ee(t))}function be(e=5){const r=ge(e),t=Date.now();return r.map((s,a)=>({plotId:s.id,title:s.title,storeId:"default-store",lastOpened:new Date(t-(a+1)*36e5).toISOString(),uri:`debrief://store/default-store/${s.itemPath}`}))}function Ie(e,r=2){const[t,s,a,m]=e,l=[];for(let n=0;n<r;n++){const y=20+Math.floor(Math.random()*30),i=[];let c=t+Math.random()*(a-t),d=s+Math.random()*(m-s);for(let f=0;f<y;f++)i.push([c,d]),c+=(Math.random()-.5)*(a-t)*.1,d+=(Math.random()-.5)*(m-s)*.1,c=Math.max(t,Math.min(a,c)),d=Math.max(s,Math.min(m,d));l.push({type:"Feature",geometry:{type:"LineString",coordinates:i},properties:{name:`Track ${n+1}`,id:`track-${n}`}})}return{type:"FeatureCollection",features:l}}const p=ge(100),De=p.slice(0,5),Me=be(5),Be={title:"Components/ExerciseListView",component:I,tags:["autodocs"],decorators:[e=>o.jsx("div",{style:{width:"400px",height:"700px",background:"var(--vscode-editor-background, #1e1e1e)"},children:o.jsx(e,{})})]},C=e=>{console.log("Selected:",e)};function u({items:e,recentItems:r,initialSort:t}){const[s,a]=D.useState(new Map),m=D.useRef(new Set),l=D.useCallback((n,y)=>{if(m.current.has(n))return;m.current.add(n);const i=e.find(c=>c.id===n);i!=null&&i.bbox&&setTimeout(()=>{const c=Ie(i.bbox,Math.floor(Math.random()*3)+1);a(d=>new Map(d).set(n,c))},100+Math.random()*200)},[e]);return o.jsx(I,{items:e,recentItems:r,onItemSelect:C,onRequestTrackData:l,trackData:s,initialSort:t})}const h={render:()=>o.jsx(u,{items:p})},S={render:()=>o.jsx(u,{items:p,recentItems:Me})},g={render:()=>o.jsx(I,{items:[],onItemSelect:C})},M={render:()=>o.jsx(I,{items:[],onItemSelect:C})},v={render:()=>o.jsx(u,{items:p,initialSort:{dimension:"title",direction:"asc"}})},T={render:()=>o.jsx(u,{items:p,initialSort:{dimension:"duration",direction:"desc"}})},k={render:()=>o.jsx(u,{items:De})},x={decorators:[e=>o.jsx("div",{style:{width:"400px",height:"700px",background:"#ffffff","--vscode-editor-background":"#ffffff","--vscode-editor-foreground":"#333333","--vscode-focusBorder":"#0066cc","--vscode-list-hoverBackground":"#f0f0f0","--vscode-list-activeSelectionBackground":"#ddeeff","--vscode-panel-border":"#e0e0e0","--vscode-descriptionForeground":"#666666","--vscode-badge-background":"#e0e0e0","--vscode-badge-foreground":"#333333","--vscode-editorWidget-background":"#f5f5f5","--vscode-charts-blue":"#0066cc","--vscode-charts-red":"#cc0000","--vscode-charts-green":"#009900","--vscode-font-family":'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',"--vscode-font-size":"13px"},children:o.jsx(e,{})})],render:()=>o.jsx(u,{items:p,recentItems:Me})};var O,R,j,L,B;h.parameters={...h.parameters,docs:{...(O=h.parameters)==null?void 0:O.docs,source:{originalSource:`{
  render: () => <WithTrackData items={MOCK_100_ITEMS} />
}`,...(j=(R=h.parameters)==null?void 0:R.docs)==null?void 0:j.source},description:{story:"Default view with 100 items and lazy-loaded track thumbnails",...(B=(L=h.parameters)==null?void 0:L.docs)==null?void 0:B.description}}};var N,W,K,$,A;S.parameters={...S.parameters,docs:{...(N=S.parameters)==null?void 0:N.docs,source:{originalSource:`{
  render: () => <WithTrackData items={MOCK_100_ITEMS} recentItems={MOCK_RECENT_ITEMS} />
}`,...(K=(W=S.parameters)==null?void 0:W.docs)==null?void 0:K.source},description:{story:"List with recently opened exercises at the top",...(A=($=S.parameters)==null?void 0:$.docs)==null?void 0:A.description}}};var F,V,P,z,G;g.parameters={...g.parameters,docs:{...(F=g.parameters)==null?void 0:F.docs,source:{originalSource:`{
  render: () => <ExerciseListView items={[]} onItemSelect={handleSelect} />
}`,...(P=(V=g.parameters)==null?void 0:V.docs)==null?void 0:P.source},description:{story:"Empty state — no exercises in the store",...(G=(z=g.parameters)==null?void 0:z.docs)==null?void 0:G.description}}};var H,U,J,q,X;M.parameters={...M.parameters,docs:{...(H=M.parameters)==null?void 0:H.docs,source:{originalSource:`{
  render: () => <ExerciseListView items={[]} onItemSelect={handleSelect} />
}`,...(J=(U=M.parameters)==null?void 0:U.docs)==null?void 0:J.source},description:{story:"No matches — would be shown when filters exclude all items",...(X=(q=M.parameters)==null?void 0:q.docs)==null?void 0:X.description}}};var Q,Y,Z,ee,te;v.parameters={...v.parameters,docs:{...(Q=v.parameters)==null?void 0:Q.docs,source:{originalSource:`{
  render: () => <WithTrackData items={MOCK_100_ITEMS} initialSort={{
    dimension: 'title',
    direction: 'asc'
  }} />
}`,...(Z=(Y=v.parameters)==null?void 0:Y.docs)==null?void 0:Z.source},description:{story:"Sorted alphabetically by title",...(te=(ee=v.parameters)==null?void 0:ee.docs)==null?void 0:te.description}}};var re,oe,se,ae,ne;T.parameters={...T.parameters,docs:{...(re=T.parameters)==null?void 0:re.docs,source:{originalSource:`{
  render: () => <WithTrackData items={MOCK_100_ITEMS} initialSort={{
    dimension: 'duration',
    direction: 'desc'
  }} />
}`,...(se=(oe=T.parameters)==null?void 0:oe.docs)==null?void 0:se.source},description:{story:"Sorted by duration (longest first)",...(ne=(ae=T.parameters)==null?void 0:ae.docs)==null?void 0:ne.description}}};var ce,ie,de,me,le;k.parameters={...k.parameters,docs:{...(ce=k.parameters)==null?void 0:ce.docs,source:{originalSource:`{
  render: () => <WithTrackData items={MOCK_5_ITEMS} />
}`,...(de=(ie=k.parameters)==null?void 0:ie.docs)==null?void 0:de.source},description:{story:"Short list with only 5 items",...(le=(me=k.parameters)==null?void 0:me.docs)==null?void 0:le.description}}};var pe,ue,fe,he,Se;x.parameters={...x.parameters,docs:{...(pe=x.parameters)==null?void 0:pe.docs,source:{originalSource:`{
  decorators: [Story => <div style={{
    width: '400px',
    height: '700px',
    background: '#ffffff',
    // @ts-expect-error CSS custom properties
    '--vscode-editor-background': '#ffffff',
    '--vscode-editor-foreground': '#333333',
    '--vscode-focusBorder': '#0066cc',
    '--vscode-list-hoverBackground': '#f0f0f0',
    '--vscode-list-activeSelectionBackground': '#ddeeff',
    '--vscode-panel-border': '#e0e0e0',
    '--vscode-descriptionForeground': '#666666',
    '--vscode-badge-background': '#e0e0e0',
    '--vscode-badge-foreground': '#333333',
    '--vscode-editorWidget-background': '#f5f5f5',
    '--vscode-charts-blue': '#0066cc',
    '--vscode-charts-red': '#cc0000',
    '--vscode-charts-green': '#009900',
    '--vscode-font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    '--vscode-font-size': '13px'
  } as React.CSSProperties}>
        <Story />
      </div>],
  render: () => <WithTrackData items={MOCK_100_ITEMS} recentItems={MOCK_RECENT_ITEMS} />
}`,...(fe=(ue=x.parameters)==null?void 0:ue.docs)==null?void 0:fe.source},description:{story:"Light theme variant",...(Se=(he=x.parameters)==null?void 0:he.docs)==null?void 0:Se.description}}};const Ne=["Default","WithRecentItems","EmptyState","NoMatches","SortByTitle","SortByDuration","FewItems","LightTheme"];export{h as Default,g as EmptyState,k as FewItems,x as LightTheme,M as NoMatches,T as SortByDuration,v as SortByTitle,S as WithRecentItems,Ne as __namedExportsOrder,Be as default};
