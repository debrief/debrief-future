import{j as s}from"./jsx-runtime-DF2Pcvd1.js";import{S as $e}from"./StoryboardPanel-CxSPYNBP.js";import{H as Ye}from"./HardBlockModal-Bvqxq9gu.js";import{u as ze}from"./storyOnlyMockHandlers-CWCCvIdP.js";import{a as Ke}from"./useStoryboardEditReducer-CYOhcMTq.js";import"./index-B2-qRKKC.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./textfield-Dm39NdvL.js";function o(r,t,n){return{sceneId:r,title:n,timestampIso:t,dtgLabel:qe(t),thumbnailHref:"data:image/svg+xml;utf8,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150"><rect width="200" height="150" fill="#2b5bb0"/><text x="100" y="80" text-anchor="middle" fill="white" font-family="monospace" font-size="14">${r}</text></svg>`),state:{kind:"ok"}}}function qe(r){const t=new Date(r),n=F=>F.toString().padStart(2,"0"),e=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];return`${n(t.getUTCDate())}${n(t.getUTCHours())}${n(t.getUTCMinutes())}Z ${e[t.getUTCMonth()]} ${n(t.getUTCFullYear()%100)}`}const a=[o("scene-1","2026-04-20T14:00:00.000Z","Exercise start — North channel"),o("scene-2","2026-04-20T14:15:00.000Z","Contact with surface group"),o("scene-3","2026-04-20T14:35:00.000Z","Bearing-only track lock")],fn={title:"Panels/StoryboardPanel",component:$e,parameters:{layout:"padded"}},f={args:{scenes:[],activeStoryboardName:null,captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},h={args:{scenes:[],activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},g={args:{scenes:a.slice(0,1),activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},C={args:{scenes:a,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},S={args:{scenes:a,activeStoryboardName:"Exercise Alpha",captureInFlight:!0,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},Qe={canGoBackward:!1,canGoForward:!0,sceneNumber:1,sceneTotal:3,transitionInFlight:!1},v={args:{scenes:a,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},currentSceneId:"scene-1",transport:Qe,onTransportForward:()=>{},onTransportBackward:()=>{}}},Xe={kind:"missing-features",missingFeatureIds:["track-nimitz","annotation-bearing-lock"]},en=[{storyboardId:"sb-commander",name:"Commander's view",sceneCount:5,lastModifiedIso:"2026-04-20T15:00:00.000Z"},{storyboardId:"sb-asw",name:"ASW evidence",sceneCount:3,lastModifiedIso:"2026-04-20T14:30:00.000Z"},{storyboardId:"sb-training",name:"Training debrief",sceneCount:2,lastModifiedIso:"2026-04-20T14:00:00.000Z"}],nn=[o("scene-1","2026-04-20T14:00:00.000Z","Exercise start"),o("scene-2","2026-04-20T14:10:00.000Z","First contact"),o("scene-3","2026-04-20T14:20:00.000Z","Bearing fix"),o("scene-4","2026-04-20T14:30:00.000Z","CPA estimate"),o("scene-5","2026-04-20T14:45:00.000Z","Disengagement")],tn={canGoBackward:!0,canGoForward:!0,sceneNumber:2,sceneTotal:5,transitionInFlight:!1},b={args:{scenes:nn,activeStoryboardName:"Commander's view",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},storyboards:en,activeStoryboardId:"sb-commander",currentSceneId:"scene-2",transport:tn,onActiveStoryboardChange:()=>{},onCreateStoryboard:()=>{},onRenameStoryboard:()=>{},onDeleteStoryboard:()=>{},onTransportForward:()=>{},onTransportBackward:()=>{}}},R={name:"HardBlockModal (missing features)",render:()=>s.jsx(Ye,{sceneTitle:"201435Z APR 26 — Surface contact",reason:Xe,jumpPastLabel:"Jump past this scene",openForEditingLabel:"Open for editing",onJumpPast:()=>{},onOpenForEditing:()=>{},onDismiss:()=>{}})},an={sceneId:"scene-1",title:"Exercise start — North channel",description:null,timestamp:"2026-04-20T14:00:00.000Z",titleIsEditing:!1,editFormOpen:!1,pendingDelete:!1,stale:!1,unresolvedFeatureIds:[],missingData:{kind:"ok"}},rn={storyboardId:"sb-alpha",name:"Exercise Alpha",description:"Surface-group exercise — North channel",nameIsEditing:!1,descriptionExpanded:!1,sceneCount:a.length};function E(r){const t={};for(const n of a){const e={...an,sceneId:n.sceneId,title:n.title,timestamp:n.timestampIso};t[n.sceneId]={...e,...r[n.sceneId]}}return{storyboards:[{storyboardId:"sb-alpha",name:"Exercise Alpha",sceneCount:a.length,lastModifiedIso:"2026-04-20T14:35:00.000Z"},{storyboardId:"sb-bravo",name:"Exercise Bravo",sceneCount:0,lastModifiedIso:"2026-04-20T13:00:00.000Z"}],activeStoryboardId:"sb-alpha",activeStoryboardName:"Exercise Alpha",scenes:a,sceneEditViewModels:t,storyboardEditViewModel:rn}}function I({fixture:r,initial:t,knobs:n}){const{state:e,handlers:F}=ze(r,{initial:t,knobs:n}),Ge=Ke(e);return s.jsx($e,{scenes:e.sceneRows,activeStoryboardName:e.activeStoryboardName,captureInFlight:e.captureInFlight,storyboards:e.storyboards.length>0?e.storyboards:void 0,activeStoryboardId:e.activeStoryboardId,currentSceneId:e.currentSceneId,transport:e.transport,sceneEditViewModels:Ge,storyboardEditViewModel:e.storyboardEditViewModel??void 0,pendingUndoToast:e.pendingUndoToast,overflowMenuOpenFor:e.overflowMenuOpenFor,overflowMenuAnchorRect:e.overflowMenuAnchorRect,...F})}const y={parameters:{docs:{description:{story:"Click the chevron on a row to expand its inline edit form. Submit persists the new title via the reducer; Cancel discards. Driven by the shared `useStoryOnlyMockHandlers` helper (Feature 234, ADR-027)."}}},render:()=>s.jsx(I,{fixture:E({"scene-1":{description:"**Brief:** contact gained bearing 023°. Hold course."}})})},w={parameters:{docs:{description:{story:"Right-click (or Shift+F10) any row → Delete to remove it; the Undo toast appears, click Undo to restore. Driven by the shared `useStoryOnlyMockHandlers` helper (Feature 234, ADR-027)."}}},render:()=>s.jsx(I,{fixture:E({})})},T={parameters:{docs:{description:{story:'Scene 2 starts stale; click its overflow → Refresh thumbnail to clear the badge. Toggle the `induceRefreshFailure` arg to "scene-2" to exercise the per-Scene failure branch (FR-043).'}}},argTypes:{induceRefreshFailure:{control:"select",options:[void 0,"scene-1","scene-2","scene-3"],description:"Feature 234 FR-043 — when set, refresh on the matching sceneId routes to the failure branch (badge stays)."}},args:{induceRefreshFailure:void 0},render:r=>s.jsx(I,{fixture:E({}),initial:{staleSceneIds:["scene-2"]},knobs:{induceRefreshFailure:r.induceRefreshFailure}})},k={parameters:{docs:{description:{story:"Scene 3 starts in a missing-features state. Tab through the panel — focus lands on the remediation affordance with a visible focus ring; press Enter to dispatch the remediation action."}}},render:()=>s.jsx(I,{fixture:E({"scene-3":{editFormOpen:!0,missingData:{kind:"missing-features",ids:["track-alpha","track-bravo","track-charlie"]}}}),initial:{missingDataBySceneId:{"scene-3":["track-alpha","track-bravo","track-charlie"]}}})},i={args:{scenes:[],activeStoryboardName:null,captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},c={args:{scenes:[],activeStoryboardName:null,captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},namingRowViewModel:{visible:!0,pendingName:"Plot Alpha — storyboard",defaultName:"Plot Alpha — storyboard",collisionWith:null,canConfirm:!0},onNamingRowTextChanged:()=>{},onNamingRowConfirm:()=>{},onNamingRowCancel:()=>{}}},d={args:{scenes:[],activeStoryboardName:null,captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},namingRowViewModel:{visible:!0,pendingName:"Exercise Alpha",defaultName:"Plot Alpha — storyboard",collisionWith:"Exercise Alpha",canConfirm:!1},onNamingRowTextChanged:()=>{},onNamingRowConfirm:()=>{},onNamingRowCancel:()=>{}}},l={args:{scenes:a,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},collisionBannerViewModel:{visible:!0,conflictingSceneId:"scene-2",conflictingSceneTitle:"Contact with surface group",proposedTimestamp:"2026-04-20T14:15:00.000Z",proposedTimestampDtg:"201415Z APR 26",offsetCount:0,offsetCapReached:!1,offsetWouldExceedTimeRange:!1,offsetButtonHidden:!1,cause:"capture"},onCollisionReplace:()=>{},onCollisionOffset:()=>{},onCollisionCancel:()=>{}}},p={args:{scenes:a,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},collisionBannerViewModel:{visible:!0,conflictingSceneId:"scene-2",conflictingSceneTitle:"Contact with surface group",proposedTimestamp:"2026-04-20T14:16:00.000Z",proposedTimestampDtg:"201416Z APR 26",offsetCount:60,offsetCapReached:!0,offsetWouldExceedTimeRange:!1,offsetButtonHidden:!0,cause:"capture"},onCollisionReplace:()=>{},onCollisionOffset:()=>{},onCollisionCancel:()=>{}}},u={args:{scenes:a,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},collisionBannerViewModel:{visible:!0,conflictingSceneId:"scene-3",conflictingSceneTitle:"Bearing-only track lock",proposedTimestamp:"2026-04-20T14:35:00.000Z",proposedTimestampDtg:"201435Z APR 26",offsetCount:4,offsetCapReached:!1,offsetWouldExceedTimeRange:!0,offsetButtonHidden:!0,cause:"capture"},onCollisionReplace:()=>{},onCollisionOffset:()=>{},onCollisionCancel:()=>{}}},m={args:{scenes:a,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},sceneEditViewModels:{"scene-2":{sceneId:"scene-2",title:"Contact with surface group",description:null,timestamp:"2026-04-20T14:15:00.000Z",titleIsEditing:!1,editFormOpen:!0,pendingDelete:!1,stale:!1,unresolvedFeatureIds:[],missingData:{kind:"ok"}}},onSceneUpdateToCurrentClicked:()=>{}}};var x,N,A;f.parameters={...f.parameters,docs:{...(x=f.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    scenes: [],
    activeStoryboardName: null,
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(A=(N=f.parameters)==null?void 0:N.docs)==null?void 0:A.source}}};var M,D,B;h.parameters={...h.parameters,docs:{...(M=h.parameters)==null?void 0:M.docs,source:{originalSource:`{
  args: {
    scenes: [],
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(B=(D=h.parameters)==null?void 0:D.docs)==null?void 0:B.source}}};var O,P,H;g.parameters={...g.parameters,docs:{...(O=g.parameters)==null?void 0:O.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE.slice(0, 1),
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(H=(P=g.parameters)==null?void 0:P.docs)==null?void 0:H.source}}};var W,Z,_;C.parameters={...C.parameters,docs:{...(W=C.parameters)==null?void 0:W.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(_=(Z=C.parameters)==null?void 0:Z.docs)==null?void 0:_.source}}};var U,V,L;S.parameters={...S.parameters,docs:{...(U=S.parameters)==null?void 0:U.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: true,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(L=(V=S.parameters)==null?void 0:V.docs)==null?void 0:L.source}}};var j,J,$;v.parameters={...v.parameters,docs:{...(j=v.parameters)==null?void 0:j.docs,source:{originalSource:`{
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
}`,...($=(J=v.parameters)==null?void 0:J.docs)==null?void 0:$.source}}};var G,Y,z;b.parameters={...b.parameters,docs:{...(G=b.parameters)==null?void 0:G.docs,source:{originalSource:`{
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
}`,...(z=(Y=b.parameters)==null?void 0:Y.docs)==null?void 0:z.source}}};var K,q,Q;R.parameters={...R.parameters,docs:{...(K=R.parameters)==null?void 0:K.docs,source:{originalSource:`{
  name: 'HardBlockModal (missing features)',
  render: () => <HardBlockModal sceneTitle="201435Z APR 26 — Surface contact" reason={HARD_BLOCK_REASON} jumpPastLabel="Jump past this scene" openForEditingLabel="Open for editing" onJumpPast={() => undefined} onOpenForEditing={() => undefined} onDismiss={() => undefined} />
}`,...(Q=(q=R.parameters)==null?void 0:q.docs)==null?void 0:Q.source}}};var X,ee,ne;y.parameters={...y.parameters,docs:{...(X=y.parameters)==null?void 0:X.docs,source:{originalSource:`{
  parameters: {
    docs: {
      description: {
        story: 'Click the chevron on a row to expand its inline edit form. Submit persists the new title via the reducer; Cancel discards. Driven by the shared \`useStoryOnlyMockHandlers\` helper (Feature 234, ADR-027).'
      }
    }
  },
  render: () => <InteractiveStoryboardPanel fixture={makeEditFixture({
    'scene-1': {
      description: '**Brief:** contact gained bearing 023°. Hold course.'
    }
  })} />
}`,...(ne=(ee=y.parameters)==null?void 0:ee.docs)==null?void 0:ne.source}}};var te,ae,re;w.parameters={...w.parameters,docs:{...(te=w.parameters)==null?void 0:te.docs,source:{originalSource:`{
  parameters: {
    docs: {
      description: {
        story: 'Right-click (or Shift+F10) any row → Delete to remove it; the Undo toast appears, click Undo to restore. Driven by the shared \`useStoryOnlyMockHandlers\` helper (Feature 234, ADR-027).'
      }
    }
  },
  render: () => <InteractiveStoryboardPanel fixture={makeEditFixture({})} />
}`,...(re=(ae=w.parameters)==null?void 0:ae.docs)==null?void 0:re.source}}};var oe,se,ie;T.parameters={...T.parameters,docs:{...(oe=T.parameters)==null?void 0:oe.docs,source:{originalSource:`{
  parameters: {
    docs: {
      description: {
        story: 'Scene 2 starts stale; click its overflow → Refresh thumbnail to clear the badge. Toggle the \`induceRefreshFailure\` arg to "scene-2" to exercise the per-Scene failure branch (FR-043).'
      }
    }
  },
  argTypes: {
    induceRefreshFailure: {
      control: 'select',
      options: [undefined, 'scene-1', 'scene-2', 'scene-3'],
      description: 'Feature 234 FR-043 — when set, refresh on the matching sceneId routes to the failure branch (badge stays).'
    }
  },
  args: {
    induceRefreshFailure: undefined
  },
  render: args => <InteractiveStoryboardPanel fixture={makeEditFixture({})} initial={{
    staleSceneIds: ['scene-2']
  }} knobs={{
    induceRefreshFailure: args.induceRefreshFailure
  }} />
}`,...(ie=(se=T.parameters)==null?void 0:se.docs)==null?void 0:ie.source}}};var ce,de,le;k.parameters={...k.parameters,docs:{...(ce=k.parameters)==null?void 0:ce.docs,source:{originalSource:`{
  parameters: {
    docs: {
      description: {
        story: 'Scene 3 starts in a missing-features state. Tab through the panel — focus lands on the remediation affordance with a visible focus ring; press Enter to dispatch the remediation action.'
      }
    }
  },
  render: () => <InteractiveStoryboardPanel fixture={makeEditFixture({
    'scene-3': {
      editFormOpen: true,
      missingData: {
        kind: 'missing-features',
        ids: ['track-alpha', 'track-bravo', 'track-charlie']
      }
    }
  })} initial={{
    missingDataBySceneId: {
      'scene-3': ['track-alpha', 'track-bravo', 'track-charlie']
    }
  }} />
}`,...(le=(de=k.parameters)==null?void 0:de.docs)==null?void 0:le.source}}};var pe,ue,me,fe,he;i.parameters={...i.parameters,docs:{...(pe=i.parameters)==null?void 0:pe.docs,source:{originalSource:`{
  args: {
    scenes: [],
    activeStoryboardName: null,
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(me=(ue=i.parameters)==null?void 0:ue.docs)==null?void 0:me.source},description:{story:"The empty rail with the primary Capture Scene affordance — the entry\npoint that replaces the legacy `Press Ctrl/Cmd+Alt+C on the map…`\nempty-state copy from #216.",...(he=(fe=i.parameters)==null?void 0:fe.docs)==null?void 0:he.description}}};var ge,Ce,Se,ve,be;c.parameters={...c.parameters,docs:{...(ge=c.parameters)==null?void 0:ge.docs,source:{originalSource:`{
  args: {
    scenes: [],
    activeStoryboardName: null,
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
    namingRowViewModel: {
      visible: true,
      pendingName: 'Plot Alpha — storyboard',
      defaultName: 'Plot Alpha — storyboard',
      collisionWith: null,
      canConfirm: true
    },
    onNamingRowTextChanged: () => undefined,
    onNamingRowConfirm: () => undefined,
    onNamingRowCancel: () => undefined
  }
}`,...(Se=(Ce=c.parameters)==null?void 0:Ce.docs)==null?void 0:Se.source},description:{story:`First-capture inline naming row. Pre-filled with the plot's default
name; analyst can edit, confirm, or cancel without ever leaving the
rail.`,...(be=(ve=c.parameters)==null?void 0:ve.docs)==null?void 0:be.description}}};var Re,ye,we,Te,ke;d.parameters={...d.parameters,docs:{...(Re=d.parameters)==null?void 0:Re.docs,source:{originalSource:`{
  args: {
    scenes: [],
    activeStoryboardName: null,
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
    namingRowViewModel: {
      visible: true,
      pendingName: 'Exercise Alpha',
      defaultName: 'Plot Alpha — storyboard',
      collisionWith: 'Exercise Alpha',
      canConfirm: false
    },
    onNamingRowTextChanged: () => undefined,
    onNamingRowConfirm: () => undefined,
    onNamingRowCancel: () => undefined
  }
}`,...(we=(ye=d.parameters)==null?void 0:ye.docs)==null?void 0:we.source},description:{story:`First-capture naming row, but the analyst typed a name that already
exists on this plot. The inline collision warning fires; Confirm is
disabled until they pick a unique name.`,...(ke=(Te=d.parameters)==null?void 0:Te.docs)==null?void 0:ke.description}}};var Ee,Ie,Fe,xe,Ne;l.parameters={...l.parameters,docs:{...(Ee=l.parameters)==null?void 0:Ee.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
    collisionBannerViewModel: {
      visible: true,
      conflictingSceneId: 'scene-2',
      conflictingSceneTitle: 'Contact with surface group',
      proposedTimestamp: '2026-04-20T14:15:00.000Z',
      proposedTimestampDtg: '201415Z APR 26',
      offsetCount: 0,
      offsetCapReached: false,
      offsetWouldExceedTimeRange: false,
      offsetButtonHidden: false,
      cause: 'capture'
    },
    onCollisionReplace: () => undefined,
    onCollisionOffset: () => undefined,
    onCollisionCancel: () => undefined
  }
}`,...(Fe=(Ie=l.parameters)==null?void 0:Ie.docs)==null?void 0:Fe.source},description:{story:`Duplicate-timestamp collision banner — Replace / Offset / Cancel.
Anchored in the rail above the existing Scene list. The map and time
controller in the host's central area remain operable.`,...(Ne=(xe=l.parameters)==null?void 0:xe.docs)==null?void 0:Ne.description}}};var Ae,Me,De,Be,Oe;p.parameters={...p.parameters,docs:{...(Ae=p.parameters)==null?void 0:Ae.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
    collisionBannerViewModel: {
      visible: true,
      conflictingSceneId: 'scene-2',
      conflictingSceneTitle: 'Contact with surface group',
      proposedTimestamp: '2026-04-20T14:16:00.000Z',
      proposedTimestampDtg: '201416Z APR 26',
      offsetCount: 60,
      offsetCapReached: true,
      offsetWouldExceedTimeRange: false,
      offsetButtonHidden: true,
      cause: 'capture'
    },
    onCollisionReplace: () => undefined,
    onCollisionOffset: () => undefined,
    onCollisionCancel: () => undefined
  }
}`,...(De=(Me=p.parameters)==null?void 0:Me.docs)==null?void 0:De.source},description:{story:`After 60 Offset presses, the banner replaces the Offset button with
an inline cap-reached message; only Replace and Cancel remain.`,...(Oe=(Be=p.parameters)==null?void 0:Be.docs)==null?void 0:Oe.description}}};var Pe,He,We,Ze,_e;u.parameters={...u.parameters,docs:{...(Pe=u.parameters)==null?void 0:Pe.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
    collisionBannerViewModel: {
      visible: true,
      conflictingSceneId: 'scene-3',
      conflictingSceneTitle: 'Bearing-only track lock',
      proposedTimestamp: '2026-04-20T14:35:00.000Z',
      proposedTimestampDtg: '201435Z APR 26',
      offsetCount: 4,
      offsetCapReached: false,
      offsetWouldExceedTimeRange: true,
      offsetButtonHidden: true,
      cause: 'capture'
    },
    onCollisionReplace: () => undefined,
    onCollisionOffset: () => undefined,
    onCollisionCancel: () => undefined
  }
}`,...(We=(He=u.parameters)==null?void 0:He.docs)==null?void 0:We.source},description:{story:`FR-CAP-017a — when the next Offset would push past the plot's time
range, the banner replaces the Offset button with the inline
time-range message.`,...(_e=(Ze=u.parameters)==null?void 0:Ze.docs)==null?void 0:_e.description}}};var Ue,Ve,Le,je,Je;m.parameters={...m.parameters,docs:{...(Ue=m.parameters)==null?void 0:Ue.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
    sceneEditViewModels: {
      'scene-2': {
        sceneId: 'scene-2',
        title: 'Contact with surface group',
        description: null,
        timestamp: '2026-04-20T14:15:00.000Z',
        titleIsEditing: false,
        editFormOpen: true,
        pendingDelete: false,
        stale: false,
        unresolvedFeatureIds: [],
        missingData: {
          kind: 'ok'
        }
      }
    },
    onSceneUpdateToCurrentClicked: () => undefined
  }
}`,...(Le=(Ve=m.parameters)==null?void 0:Ve.docs)==null?void 0:Le.source},description:{story:`Visualises a Scene row with the Update-to-current affordance — the
primary maintenance op that re-anchors a Scene to live state in-row.
Re-uses the #218 visual treatment; included here so the new stories
file references it for E2E.`,...(Je=(je=m.parameters)==null?void 0:je.docs)==null?void 0:Je.description}}};const hn=["Empty","EmptyStoryboard","WithOneScene","WithThreeScenes","Capturing","Transport","WithMultipleStoryboards","HardBlockModalStory","WithEditForm","WithUndoToast","WithStaleBadge","WithMissingDataRemediation","EmptyWithCaptureButton","FirstCaptureNamingRow","FirstCaptureNamingRowWithCollision","DuplicateTimestampBanner","DuplicateTimestampBannerOffsetCapped","DuplicateTimestampBannerExceedsTimeRange","RowWithUpdateToCurrent"];export{S as Capturing,l as DuplicateTimestampBanner,u as DuplicateTimestampBannerExceedsTimeRange,p as DuplicateTimestampBannerOffsetCapped,f as Empty,h as EmptyStoryboard,i as EmptyWithCaptureButton,c as FirstCaptureNamingRow,d as FirstCaptureNamingRowWithCollision,R as HardBlockModalStory,m as RowWithUpdateToCurrent,v as Transport,y as WithEditForm,k as WithMissingDataRemediation,b as WithMultipleStoryboards,g as WithOneScene,T as WithStaleBadge,C as WithThreeScenes,w as WithUndoToast,hn as __namedExportsOrder,fn as default};
