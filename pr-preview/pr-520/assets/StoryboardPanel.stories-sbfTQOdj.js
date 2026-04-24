import{j as D}from"./jsx-runtime-DF2Pcvd1.js";import{S as U,H as L}from"./HardBlockModal-BFBe_7xv.js";import"./index-B2-qRKKC.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./textfield-Dm39NdvL.js";function n(a,e,r){return{sceneId:a,title:r,timestampIso:e,dtgLabel:J(e),thumbnailHref:"data:image/svg+xml;utf8,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150"><rect width="200" height="150" fill="#2b5bb0"/><text x="100" y="80" text-anchor="middle" fill="white" font-family="monospace" font-size="14">${a}</text></svg>`),state:{kind:"ok"}}}function J(a){const e=new Date(a),r=Z=>Z.toString().padStart(2,"0"),P=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];return`${r(e.getUTCDate())}${r(e.getUTCHours())}${r(e.getUTCMinutes())}Z ${P[e.getUTCMonth()]} ${r(e.getUTCFullYear()%100)}`}const u=[n("scene-1","2026-04-20T14:00:00.000Z","Exercise start — North channel"),n("scene-2","2026-04-20T14:15:00.000Z","Contact with surface group"),n("scene-3","2026-04-20T14:35:00.000Z","Bearing-only track lock")],X={title:"Panels/StoryboardPanel",component:U,parameters:{layout:"padded"}},o={args:{scenes:[],activeStoryboardName:null,captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},t={args:{scenes:[],activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},s={args:{scenes:u.slice(0,1),activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},c={args:{scenes:u,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},i={args:{scenes:u,activeStoryboardName:"Exercise Alpha",captureInFlight:!0,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},W={canGoBackward:!1,canGoForward:!0,sceneNumber:1,sceneTotal:3,transitionInFlight:!1},d={args:{scenes:u,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},currentSceneId:"scene-1",transport:W,onTransportForward:()=>{},onTransportBackward:()=>{}}},$={kind:"missing-features",missingFeatureIds:["track-nimitz","annotation-bearing-lock"]},j=[{storyboardId:"sb-commander",name:"Commander's view",sceneCount:5,lastModifiedIso:"2026-04-20T15:00:00.000Z"},{storyboardId:"sb-asw",name:"ASW evidence",sceneCount:3,lastModifiedIso:"2026-04-20T14:30:00.000Z"},{storyboardId:"sb-training",name:"Training debrief",sceneCount:2,lastModifiedIso:"2026-04-20T14:00:00.000Z"}],G=[n("scene-1","2026-04-20T14:00:00.000Z","Exercise start"),n("scene-2","2026-04-20T14:10:00.000Z","First contact"),n("scene-3","2026-04-20T14:20:00.000Z","Bearing fix"),n("scene-4","2026-04-20T14:30:00.000Z","CPA estimate"),n("scene-5","2026-04-20T14:45:00.000Z","Disengagement")],Y={canGoBackward:!0,canGoForward:!0,sceneNumber:2,sceneTotal:5,transitionInFlight:!1},l={args:{scenes:G,activeStoryboardName:"Commander's view",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},storyboards:j,activeStoryboardId:"sb-commander",currentSceneId:"scene-2",transport:Y,onActiveStoryboardChange:()=>{},onCreateStoryboard:()=>{},onRenameStoryboard:()=>{},onDeleteStoryboard:()=>{},onTransportForward:()=>{},onTransportBackward:()=>{}}},p={name:"HardBlockModal (missing features)",render:()=>D.jsx(L,{sceneTitle:"201435Z APR 26 — Surface contact",reason:$,jumpPastLabel:"Jump past this scene",openForEditingLabel:"Open for editing",onJumpPast:()=>{},onOpenForEditing:()=>{},onDismiss:()=>{}})};var m,S,g;o.parameters={...o.parameters,docs:{...(m=o.parameters)==null?void 0:m.docs,source:{originalSource:`{
  args: {
    scenes: [],
    activeStoryboardName: null,
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(g=(S=o.parameters)==null?void 0:S.docs)==null?void 0:g.source}}};var C,f,T;t.parameters={...t.parameters,docs:{...(C=t.parameters)==null?void 0:C.docs,source:{originalSource:`{
  args: {
    scenes: [],
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(T=(f=t.parameters)==null?void 0:f.docs)==null?void 0:T.source}}};var b,h,E;s.parameters={...s.parameters,docs:{...(b=s.parameters)==null?void 0:b.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE.slice(0, 1),
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(E=(h=s.parameters)==null?void 0:h.docs)==null?void 0:E.source}}};var v,k,y;c.parameters={...c.parameters,docs:{...(v=c.parameters)==null?void 0:v.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(y=(k=c.parameters)==null?void 0:k.docs)==null?void 0:y.source}}};var R,w,I;i.parameters={...i.parameters,docs:{...(R=i.parameters)==null?void 0:R.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: true,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(I=(w=i.parameters)==null?void 0:w.docs)==null?void 0:I.source}}};var A,N,F;d.parameters={...d.parameters,docs:{...(A=d.parameters)==null?void 0:A.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
    currentSceneId: 'scene-1',
    transport: TRANSPORT_AT_1,
    onTransportForward: () => undefined,
    onTransportBackward: () => undefined
  }
}`,...(F=(N=d.parameters)==null?void 0:N.docs)==null?void 0:F.source}}};var x,O,_;l.parameters={...l.parameters,docs:{...(x=l.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    scenes: FIVE_SCENES,
    activeStoryboardName: "Commander's view",
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
    storyboards: MULTI_STORYBOARDS,
    activeStoryboardId: 'sb-commander',
    currentSceneId: 'scene-2',
    transport: TRANSPORT_MULTI,
    onActiveStoryboardChange: () => undefined,
    onCreateStoryboard: () => undefined,
    onRenameStoryboard: () => undefined,
    onDeleteStoryboard: () => undefined,
    onTransportForward: () => undefined,
    onTransportBackward: () => undefined
  }
}`,...(_=(O=l.parameters)==null?void 0:O.docs)==null?void 0:_.source}}};var B,M,H;p.parameters={...p.parameters,docs:{...(B=p.parameters)==null?void 0:B.docs,source:{originalSource:`{
  name: 'HardBlockModal (missing features)',
  render: () => <HardBlockModal sceneTitle="201435Z APR 26 — Surface contact" reason={HARD_BLOCK_REASON} jumpPastLabel="Jump past this scene" openForEditingLabel="Open for editing" onJumpPast={() => undefined} onOpenForEditing={() => undefined} onDismiss={() => undefined} />
}`,...(H=(M=p.parameters)==null?void 0:M.docs)==null?void 0:H.source}}};const ee=["Empty","EmptyStoryboard","WithOneScene","WithThreeScenes","Capturing","Transport","WithMultipleStoryboards","HardBlockModalStory"];export{i as Capturing,o as Empty,t as EmptyStoryboard,p as HardBlockModalStory,d as Transport,l as WithMultipleStoryboards,s as WithOneScene,c as WithThreeScenes,ee as __namedExportsOrder,X as default};
