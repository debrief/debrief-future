import{j as oe}from"./jsx-runtime-DF2Pcvd1.js";import{S as ae,H as re}from"./HardBlockModal-CNPHIuVg.js";import"./index-B2-qRKKC.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./textfield-Dm39NdvL.js";function n(r,e,a){return{sceneId:r,title:a,timestampIso:e,dtgLabel:te(e),thumbnailHref:"data:image/svg+xml;utf8,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150"><rect width="200" height="150" fill="#2b5bb0"/><text x="100" y="80" text-anchor="middle" fill="white" font-family="monospace" font-size="14">${r}</text></svg>`),state:{kind:"ok"}}}function te(r){const e=new Date(r),a=ne=>ne.toString().padStart(2,"0"),ee=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];return`${a(e.getUTCDate())}${a(e.getUTCHours())}${a(e.getUTCMinutes())}Z ${ee[e.getUTCMonth()]} ${a(e.getUTCFullYear()%100)}`}const o=[n("scene-1","2026-04-20T14:00:00.000Z","Exercise start — North channel"),n("scene-2","2026-04-20T14:15:00.000Z","Contact with surface group"),n("scene-3","2026-04-20T14:35:00.000Z","Bearing-only track lock")],ge={title:"Panels/StoryboardPanel",component:ae,parameters:{layout:"padded"}},t={args:{scenes:[],activeStoryboardName:null,captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},i={args:{scenes:[],activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},s={args:{scenes:o.slice(0,1),activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},c={args:{scenes:o,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},d={args:{scenes:o,activeStoryboardName:"Exercise Alpha",captureInFlight:!0,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},ie={canGoBackward:!1,canGoForward:!0,sceneNumber:1,sceneTotal:3,transitionInFlight:!1},l={args:{scenes:o,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},currentSceneId:"scene-1",transport:ie,onTransportForward:()=>{},onTransportBackward:()=>{}}},se={kind:"missing-features",missingFeatureIds:["track-nimitz","annotation-bearing-lock"]},ce=[{storyboardId:"sb-commander",name:"Commander's view",sceneCount:5,lastModifiedIso:"2026-04-20T15:00:00.000Z"},{storyboardId:"sb-asw",name:"ASW evidence",sceneCount:3,lastModifiedIso:"2026-04-20T14:30:00.000Z"},{storyboardId:"sb-training",name:"Training debrief",sceneCount:2,lastModifiedIso:"2026-04-20T14:00:00.000Z"}],de=[n("scene-1","2026-04-20T14:00:00.000Z","Exercise start"),n("scene-2","2026-04-20T14:10:00.000Z","First contact"),n("scene-3","2026-04-20T14:20:00.000Z","Bearing fix"),n("scene-4","2026-04-20T14:30:00.000Z","CPA estimate"),n("scene-5","2026-04-20T14:45:00.000Z","Disengagement")],le={canGoBackward:!0,canGoForward:!0,sceneNumber:2,sceneTotal:5,transitionInFlight:!1},u={args:{scenes:de,activeStoryboardName:"Commander's view",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},storyboards:ce,activeStoryboardId:"sb-commander",currentSceneId:"scene-2",transport:le,onActiveStoryboardChange:()=>{},onCreateStoryboard:()=>{},onRenameStoryboard:()=>{},onDeleteStoryboard:()=>{},onTransportForward:()=>{},onTransportBackward:()=>{}}},p={name:"HardBlockModal (missing features)",render:()=>oe.jsx(re,{sceneTitle:"201435Z APR 26 — Surface contact",reason:se,jumpPastLabel:"Jump past this scene",openForEditingLabel:"Open for editing",onJumpPast:()=>{},onOpenForEditing:()=>{},onDismiss:()=>{}})},f={sceneId:"scene-1",title:"Exercise start — North channel",description:null,timestamp:"2026-04-20T14:00:00.000Z",titleIsEditing:!1,editFormOpen:!1,pendingDelete:!1,stale:!1,unresolvedFeatureIds:[],missingData:{kind:"ok"}},m={args:{scenes:o,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},sceneEditViewModels:{"scene-1":{...f,description:"**Brief:** contact gained bearing 023°. Hold course.",editFormOpen:!0}},onSceneTitleRenameCommit:()=>{},onSceneDescriptionSubmit:()=>{},onSceneDeleteRequested:()=>{},onSceneUpdateToCurrentClicked:()=>{},onSceneDuplicateClicked:()=>{},onSceneCopyToOtherClicked:()=>{},onSceneRefreshThumbnailClicked:()=>{}}},S={args:{scenes:o,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},pendingUndoToast:{sceneId:"scene-2",sceneTitle:"Contact with surface group",deletedAt:"2026-04-24T12:00:00.000Z",canUndo:!0},sceneEditViewModels:{"scene-2":{...f,sceneId:"scene-2",title:"Contact with surface group",pendingDelete:!0}},onSceneUndoDeleteClicked:()=>{}}},C={args:{scenes:o,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},sceneEditViewModels:{"scene-2":{...f,sceneId:"scene-2",title:"Contact with surface group",stale:!0,unresolvedFeatureIds:["track-alpha","track-bravo"]}},onSceneRefreshThumbnailClicked:()=>{}}},g={args:{scenes:o,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},sceneEditViewModels:{"scene-3":{...f,sceneId:"scene-3",title:"Bearing-only track lock",description:null,timestamp:"2026-04-20T14:35:00.000Z",editFormOpen:!0,missingData:{kind:"missing-features",ids:["track-alpha","track-bravo","track-charlie"]}}},onSceneTitleRenameCommit:()=>{},onSceneDescriptionSubmit:()=>{},onSceneDeleteRequested:()=>{},onSceneUpdateToCurrentClicked:()=>{},onSceneDuplicateClicked:()=>{},onSceneCopyToOtherClicked:()=>{},onSceneRefreshThumbnailClicked:()=>{}}};var h,k,E;t.parameters={...t.parameters,docs:{...(h=t.parameters)==null?void 0:h.docs,source:{originalSource:`{
  args: {
    scenes: [],
    activeStoryboardName: null,
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(E=(k=t.parameters)==null?void 0:k.docs)==null?void 0:E.source}}};var T,v,b;i.parameters={...i.parameters,docs:{...(T=i.parameters)==null?void 0:T.docs,source:{originalSource:`{
  args: {
    scenes: [],
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(b=(v=i.parameters)==null?void 0:v.docs)==null?void 0:b.source}}};var R,w,I;s.parameters={...s.parameters,docs:{...(R=s.parameters)==null?void 0:R.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE.slice(0, 1),
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(I=(w=s.parameters)==null?void 0:w.docs)==null?void 0:I.source}}};var y,F,A;c.parameters={...c.parameters,docs:{...(y=c.parameters)==null?void 0:y.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(A=(F=c.parameters)==null?void 0:F.docs)==null?void 0:A.source}}};var N,D,_;d.parameters={...d.parameters,docs:{...(N=d.parameters)==null?void 0:N.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: true,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(_=(D=d.parameters)==null?void 0:D.docs)==null?void 0:_.source}}};var M,x,B;l.parameters={...l.parameters,docs:{...(M=l.parameters)==null?void 0:M.docs,source:{originalSource:`{
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
}`,...(B=(x=l.parameters)==null?void 0:x.docs)==null?void 0:B.source}}};var O,U,H;u.parameters={...u.parameters,docs:{...(O=u.parameters)==null?void 0:O.docs,source:{originalSource:`{
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
}`,...(H=(U=u.parameters)==null?void 0:U.docs)==null?void 0:H.source}}};var Z,P,V;p.parameters={...p.parameters,docs:{...(Z=p.parameters)==null?void 0:Z.docs,source:{originalSource:`{
  name: 'HardBlockModal (missing features)',
  render: () => <HardBlockModal sceneTitle="201435Z APR 26 — Surface contact" reason={HARD_BLOCK_REASON} jumpPastLabel="Jump past this scene" openForEditingLabel="Open for editing" onJumpPast={() => undefined} onOpenForEditing={() => undefined} onDismiss={() => undefined} />
}`,...(V=(P=p.parameters)==null?void 0:P.docs)==null?void 0:V.source}}};var W,L,J;m.parameters={...m.parameters,docs:{...(W=m.parameters)==null?void 0:W.docs,source:{originalSource:`{
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
}`,...(J=(L=m.parameters)==null?void 0:L.docs)==null?void 0:J.source}}};var $,j,G;S.parameters={...S.parameters,docs:{...($=S.parameters)==null?void 0:$.docs,source:{originalSource:`{
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
}`,...(G=(j=S.parameters)==null?void 0:j.docs)==null?void 0:G.source}}};var q,Y,z;C.parameters={...C.parameters,docs:{...(q=C.parameters)==null?void 0:q.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
    sceneEditViewModels: {
      'scene-2': {
        ...EDIT_VM_BASE,
        sceneId: 'scene-2',
        title: 'Contact with surface group',
        stale: true,
        unresolvedFeatureIds: ['track-alpha', 'track-bravo']
      }
    },
    onSceneRefreshThumbnailClicked: () => undefined
  }
}`,...(z=(Y=C.parameters)==null?void 0:Y.docs)==null?void 0:z.source}}};var K,Q,X;g.parameters={...g.parameters,docs:{...(K=g.parameters)==null?void 0:K.docs,source:{originalSource:`{
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
}`,...(X=(Q=g.parameters)==null?void 0:Q.docs)==null?void 0:X.source}}};const fe=["Empty","EmptyStoryboard","WithOneScene","WithThreeScenes","Capturing","Transport","WithMultipleStoryboards","HardBlockModalStory","WithEditForm","WithUndoToast","WithStaleBadge","WithMissingDataRemediation"];export{d as Capturing,t as Empty,i as EmptyStoryboard,p as HardBlockModalStory,l as Transport,m as WithEditForm,g as WithMissingDataRemediation,u as WithMultipleStoryboards,s as WithOneScene,C as WithStaleBadge,c as WithThreeScenes,S as WithUndoToast,fe as __namedExportsOrder,ge as default};
