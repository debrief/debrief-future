import{j as Q}from"./jsx-runtime-DF2Pcvd1.js";import{S as X,H as ee}from"./HardBlockModal-BFBe_7xv.js";import"./index-B2-qRKKC.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./textfield-Dm39NdvL.js";function n(t,e,r){return{sceneId:t,title:r,timestampIso:e,dtgLabel:ne(e),thumbnailHref:"data:image/svg+xml;utf8,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150"><rect width="200" height="150" fill="#2b5bb0"/><text x="100" y="80" text-anchor="middle" fill="white" font-family="monospace" font-size="14">${t}</text></svg>`),state:{kind:"ok"}}}function ne(t){const e=new Date(t),r=K=>K.toString().padStart(2,"0"),z=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];return`${r(e.getUTCDate())}${r(e.getUTCHours())}${r(e.getUTCMinutes())}Z ${z[e.getUTCMonth()]} ${r(e.getUTCFullYear()%100)}`}const o=[n("scene-1","2026-04-20T14:00:00.000Z","Exercise start — North channel"),n("scene-2","2026-04-20T14:15:00.000Z","Contact with surface group"),n("scene-3","2026-04-20T14:35:00.000Z","Bearing-only track lock")],pe={title:"Panels/StoryboardPanel",component:X,parameters:{layout:"padded"}},a={args:{scenes:[],activeStoryboardName:null,captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},i={args:{scenes:[],activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},s={args:{scenes:o.slice(0,1),activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},c={args:{scenes:o,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},d={args:{scenes:o,activeStoryboardName:"Exercise Alpha",captureInFlight:!0,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},oe={canGoBackward:!1,canGoForward:!0,sceneNumber:1,sceneTotal:3,transitionInFlight:!1},l={args:{scenes:o,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},currentSceneId:"scene-1",transport:oe,onTransportForward:()=>{},onTransportBackward:()=>{}}},re={kind:"missing-features",missingFeatureIds:["track-nimitz","annotation-bearing-lock"]},te=[{storyboardId:"sb-commander",name:"Commander's view",sceneCount:5,lastModifiedIso:"2026-04-20T15:00:00.000Z"},{storyboardId:"sb-asw",name:"ASW evidence",sceneCount:3,lastModifiedIso:"2026-04-20T14:30:00.000Z"},{storyboardId:"sb-training",name:"Training debrief",sceneCount:2,lastModifiedIso:"2026-04-20T14:00:00.000Z"}],ae=[n("scene-1","2026-04-20T14:00:00.000Z","Exercise start"),n("scene-2","2026-04-20T14:10:00.000Z","First contact"),n("scene-3","2026-04-20T14:20:00.000Z","Bearing fix"),n("scene-4","2026-04-20T14:30:00.000Z","CPA estimate"),n("scene-5","2026-04-20T14:45:00.000Z","Disengagement")],ie={canGoBackward:!0,canGoForward:!0,sceneNumber:2,sceneTotal:5,transitionInFlight:!1},u={args:{scenes:ae,activeStoryboardName:"Commander's view",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},storyboards:te,activeStoryboardId:"sb-commander",currentSceneId:"scene-2",transport:ie,onActiveStoryboardChange:()=>{},onCreateStoryboard:()=>{},onRenameStoryboard:()=>{},onDeleteStoryboard:()=>{},onTransportForward:()=>{},onTransportBackward:()=>{}}},p={name:"HardBlockModal (missing features)",render:()=>Q.jsx(ee,{sceneTitle:"201435Z APR 26 — Surface contact",reason:re,jumpPastLabel:"Jump past this scene",openForEditingLabel:"Open for editing",onJumpPast:()=>{},onOpenForEditing:()=>{},onDismiss:()=>{}})},g={sceneId:"scene-1",title:"Exercise start — North channel",description:null,timestamp:"2026-04-20T14:00:00.000Z",titleIsEditing:!1,editFormOpen:!1,pendingDelete:!1,stale:!1,unresolvedFeatureIds:[],missingData:{kind:"ok"}},m={args:{scenes:o,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},sceneEditViewModels:{"scene-1":{...g,description:"**Brief:** contact gained bearing 023°. Hold course.",editFormOpen:!0}},onSceneTitleRenameCommit:()=>{},onSceneDescriptionSubmit:()=>{},onSceneDeleteRequested:()=>{},onSceneUpdateToCurrentClicked:()=>{},onSceneDuplicateClicked:()=>{},onSceneCopyToOtherClicked:()=>{},onSceneRefreshThumbnailClicked:()=>{}}},S={args:{scenes:o,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},pendingUndoToast:{sceneId:"scene-2",sceneTitle:"Contact with surface group",deletedAt:"2026-04-24T12:00:00.000Z",canUndo:!0},sceneEditViewModels:{"scene-2":{...g,sceneId:"scene-2",title:"Contact with surface group",pendingDelete:!0}},onSceneUndoDeleteClicked:()=>{}}},C={args:{scenes:o,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},sceneEditViewModels:{"scene-3":{...g,sceneId:"scene-3",title:"Bearing-only track lock",description:null,timestamp:"2026-04-20T14:35:00.000Z",editFormOpen:!0,missingData:{kind:"missing-features",ids:["track-alpha","track-bravo","track-charlie"]}}},onSceneTitleRenameCommit:()=>{},onSceneDescriptionSubmit:()=>{},onSceneDeleteRequested:()=>{},onSceneUpdateToCurrentClicked:()=>{},onSceneDuplicateClicked:()=>{},onSceneCopyToOtherClicked:()=>{},onSceneRefreshThumbnailClicked:()=>{}}};var f,h,k;a.parameters={...a.parameters,docs:{...(f=a.parameters)==null?void 0:f.docs,source:{originalSource:`{
  args: {
    scenes: [],
    activeStoryboardName: null,
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(k=(h=a.parameters)==null?void 0:h.docs)==null?void 0:k.source}}};var E,T,v;i.parameters={...i.parameters,docs:{...(E=i.parameters)==null?void 0:E.docs,source:{originalSource:`{
  args: {
    scenes: [],
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(v=(T=i.parameters)==null?void 0:T.docs)==null?void 0:v.source}}};var b,R,y;s.parameters={...s.parameters,docs:{...(b=s.parameters)==null?void 0:b.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE.slice(0, 1),
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(y=(R=s.parameters)==null?void 0:R.docs)==null?void 0:y.source}}};var w,I,F;c.parameters={...c.parameters,docs:{...(w=c.parameters)==null?void 0:w.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(F=(I=c.parameters)==null?void 0:I.docs)==null?void 0:F.source}}};var A,N,D;d.parameters={...d.parameters,docs:{...(A=d.parameters)==null?void 0:A.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: true,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(D=(N=d.parameters)==null?void 0:N.docs)==null?void 0:D.source}}};var _,x,M;l.parameters={...l.parameters,docs:{...(_=l.parameters)==null?void 0:_.docs,source:{originalSource:`{
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
}`,...(M=(x=l.parameters)==null?void 0:x.docs)==null?void 0:M.source}}};var O,B,U;u.parameters={...u.parameters,docs:{...(O=u.parameters)==null?void 0:O.docs,source:{originalSource:`{
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
}`,...(U=(B=u.parameters)==null?void 0:B.docs)==null?void 0:U.source}}};var H,Z,P;p.parameters={...p.parameters,docs:{...(H=p.parameters)==null?void 0:H.docs,source:{originalSource:`{
  name: 'HardBlockModal (missing features)',
  render: () => <HardBlockModal sceneTitle="201435Z APR 26 — Surface contact" reason={HARD_BLOCK_REASON} jumpPastLabel="Jump past this scene" openForEditingLabel="Open for editing" onJumpPast={() => undefined} onOpenForEditing={() => undefined} onDismiss={() => undefined} />
}`,...(P=(Z=p.parameters)==null?void 0:Z.docs)==null?void 0:P.source}}};var V,W,L;m.parameters={...m.parameters,docs:{...(V=m.parameters)==null?void 0:V.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
    sceneEditViewModels: {
      'scene-1': {
        ...EDIT_VM_BASE,
        description: '**Brief:** contact gained bearing 023°. Hold course.',
        editFormOpen: true
      }
    },
    onSceneTitleRenameCommit: () => undefined,
    onSceneDescriptionSubmit: () => undefined,
    onSceneDeleteRequested: () => undefined,
    onSceneUpdateToCurrentClicked: () => undefined,
    onSceneDuplicateClicked: () => undefined,
    onSceneCopyToOtherClicked: () => undefined,
    onSceneRefreshThumbnailClicked: () => undefined
  }
}`,...(L=(W=m.parameters)==null?void 0:W.docs)==null?void 0:L.source}}};var J,$,j;S.parameters={...S.parameters,docs:{...(J=S.parameters)==null?void 0:J.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
    pendingUndoToast: {
      sceneId: 'scene-2',
      sceneTitle: 'Contact with surface group',
      deletedAt: '2026-04-24T12:00:00.000Z',
      canUndo: true
    },
    sceneEditViewModels: {
      'scene-2': {
        ...EDIT_VM_BASE,
        sceneId: 'scene-2',
        title: 'Contact with surface group',
        pendingDelete: true
      }
    },
    onSceneUndoDeleteClicked: () => undefined
  }
}`,...(j=($=S.parameters)==null?void 0:$.docs)==null?void 0:j.source}}};var G,q,Y;C.parameters={...C.parameters,docs:{...(G=C.parameters)==null?void 0:G.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
    sceneEditViewModels: {
      'scene-3': {
        ...EDIT_VM_BASE,
        sceneId: 'scene-3',
        title: 'Bearing-only track lock',
        description: null,
        timestamp: '2026-04-20T14:35:00.000Z',
        editFormOpen: true,
        missingData: {
          kind: 'missing-features',
          ids: ['track-alpha', 'track-bravo', 'track-charlie']
        }
      }
    },
    onSceneTitleRenameCommit: () => undefined,
    onSceneDescriptionSubmit: () => undefined,
    onSceneDeleteRequested: () => undefined,
    onSceneUpdateToCurrentClicked: () => undefined,
    onSceneDuplicateClicked: () => undefined,
    onSceneCopyToOtherClicked: () => undefined,
    onSceneRefreshThumbnailClicked: () => undefined
  }
}`,...(Y=(q=C.parameters)==null?void 0:q.docs)==null?void 0:Y.source}}};const me=["Empty","EmptyStoryboard","WithOneScene","WithThreeScenes","Capturing","Transport","WithMultipleStoryboards","HardBlockModalStory","WithEditForm","WithUndoToast","WithMissingDataRemediation"];export{d as Capturing,a as Empty,i as EmptyStoryboard,p as HardBlockModalStory,l as Transport,m as WithEditForm,C as WithMissingDataRemediation,u as WithMultipleStoryboards,s as WithOneScene,c as WithThreeScenes,S as WithUndoToast,me as __namedExportsOrder,pe as default};
