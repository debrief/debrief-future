import{j as s}from"./jsx-runtime-DF2Pcvd1.js";import{S as pn}from"./StoryboardPanel-B98Zl81F.js";import{H as mn}from"./HardBlockModal-Bvqxq9gu.js";import{u as fn}from"./storyOnlyMockHandlers-CWCCvIdP.js";import{a as hn}from"./useStoryboardEditReducer-CYOhcMTq.js";import"./index-B2-qRKKC.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./textfield-Dm39NdvL.js";function a(r,t,n){return{sceneId:r,title:n,timestampIso:t,dtgLabel:gn(t),thumbnailHref:"data:image/svg+xml;utf8,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150"><rect width="200" height="150" fill="#2b5bb0"/><text x="100" y="80" text-anchor="middle" fill="white" font-family="monospace" font-size="14">${r}</text></svg>`),state:{kind:"ok"}}}function gn(r){const t=new Date(r),n=A=>A.toString().padStart(2,"0"),e=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];return`${n(t.getUTCDate())}${n(t.getUTCHours())}${n(t.getUTCMinutes())}Z ${e[t.getUTCMonth()]} ${n(t.getUTCFullYear()%100)}`}const o=[a("scene-1","2026-04-20T14:00:00.000Z","Exercise start — North channel"),a("scene-2","2026-04-20T14:15:00.000Z","Contact with surface group"),a("scene-3","2026-04-20T14:35:00.000Z","Bearing-only track lock")],Dn={title:"Panels/StoryboardPanel",component:pn,parameters:{layout:"padded"}},C={args:{scenes:[],activeStoryboardName:null,captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},S={args:{scenes:[],activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},v={args:{scenes:o.slice(0,1),activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},k={args:{scenes:o,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},w={args:{scenes:o,activeStoryboardName:"Exercise Alpha",captureInFlight:!0,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},i={args:{scenes:o,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},viewportLocked:!1,onViewportLockToggle:()=>{},hasActivePlot:!0}},c={args:{scenes:o,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},viewportLocked:!0,onViewportLockToggle:()=>{},hasActivePlot:!0}},d={args:{scenes:[],activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},viewportLocked:!1,onViewportLockToggle:()=>{},hasActivePlot:!1}},Cn={canGoBackward:!1,canGoForward:!0,sceneNumber:1,sceneTotal:3,transitionInFlight:!1},b={args:{scenes:o,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},currentSceneId:"scene-1",transport:Cn,onTransportForward:()=>{},onTransportBackward:()=>{}}},Sn={kind:"missing-features",missingFeatureIds:["track-nimitz","annotation-bearing-lock"]},vn=[{storyboardId:"sb-commander",name:"Commander's view",sceneCount:5,lastModifiedIso:"2026-04-20T15:00:00.000Z"},{storyboardId:"sb-asw",name:"ASW evidence",sceneCount:3,lastModifiedIso:"2026-04-20T14:30:00.000Z"},{storyboardId:"sb-training",name:"Training debrief",sceneCount:2,lastModifiedIso:"2026-04-20T14:00:00.000Z"}],kn=[a("scene-1","2026-04-20T14:00:00.000Z","Exercise start"),a("scene-2","2026-04-20T14:10:00.000Z","First contact"),a("scene-3","2026-04-20T14:20:00.000Z","Bearing fix"),a("scene-4","2026-04-20T14:30:00.000Z","CPA estimate"),a("scene-5","2026-04-20T14:45:00.000Z","Disengagement")],wn={canGoBackward:!0,canGoForward:!0,sceneNumber:2,sceneTotal:5,transitionInFlight:!1},y={args:{scenes:kn,activeStoryboardName:"Commander's view",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},storyboards:vn,activeStoryboardId:"sb-commander",currentSceneId:"scene-2",transport:wn,onActiveStoryboardChange:()=>{},onCreateStoryboard:()=>{},onRenameStoryboard:()=>{},onDeleteStoryboard:()=>{},onTransportForward:()=>{},onTransportBackward:()=>{}}},R={name:"HardBlockModal (missing features)",render:()=>s.jsx(mn,{sceneTitle:"201435Z APR 26 — Surface contact",reason:Sn,jumpPastLabel:"Jump past this scene",openForEditingLabel:"Open for editing",onJumpPast:()=>{},onOpenForEditing:()=>{},onDismiss:()=>{}})},bn={sceneId:"scene-1",title:"Exercise start — North channel",description:null,timestamp:"2026-04-20T14:00:00.000Z",titleIsEditing:!1,editFormOpen:!1,pendingDelete:!1,stale:!1,unresolvedFeatureIds:[],missingData:{kind:"ok"}},yn={storyboardId:"sb-alpha",name:"Exercise Alpha",description:"Surface-group exercise — North channel",nameIsEditing:!1,descriptionExpanded:!1,sceneCount:o.length};function N(r){const t={};for(const n of o){const e={...bn,sceneId:n.sceneId,title:n.title,timestamp:n.timestampIso};t[n.sceneId]={...e,...r[n.sceneId]}}return{storyboards:[{storyboardId:"sb-alpha",name:"Exercise Alpha",sceneCount:o.length,lastModifiedIso:"2026-04-20T14:35:00.000Z"},{storyboardId:"sb-bravo",name:"Exercise Bravo",sceneCount:0,lastModifiedIso:"2026-04-20T13:00:00.000Z"}],activeStoryboardId:"sb-alpha",activeStoryboardName:"Exercise Alpha",scenes:o,sceneEditViewModels:t,storyboardEditViewModel:yn}}function x({fixture:r,initial:t,knobs:n}){const{state:e,handlers:A}=fn(r,{initial:t,knobs:n}),un=hn(e);return s.jsx(pn,{scenes:e.sceneRows,activeStoryboardName:e.activeStoryboardName,captureInFlight:e.captureInFlight,storyboards:e.storyboards.length>0?e.storyboards:void 0,activeStoryboardId:e.activeStoryboardId,currentSceneId:e.currentSceneId,transport:e.transport,sceneEditViewModels:un,storyboardEditViewModel:e.storyboardEditViewModel??void 0,pendingUndoToast:e.pendingUndoToast,overflowMenuOpenFor:e.overflowMenuOpenFor,overflowMenuAnchorRect:e.overflowMenuAnchorRect,...A})}const E={parameters:{docs:{description:{story:"Click the chevron on a row to expand its inline edit form. Submit persists the new title via the reducer; Cancel discards. Driven by the shared `useStoryOnlyMockHandlers` helper (Feature 234, ADR-027)."}}},render:()=>s.jsx(x,{fixture:N({"scene-1":{description:"**Brief:** contact gained bearing 023°. Hold course."}})})},T={parameters:{docs:{description:{story:"Right-click (or Shift+F10) any row → Delete to remove it; the Undo toast appears, click Undo to restore. Driven by the shared `useStoryOnlyMockHandlers` helper (Feature 234, ADR-027)."}}},render:()=>s.jsx(x,{fixture:N({})})},F={parameters:{docs:{description:{story:'Scene 2 starts stale; click its overflow → Refresh thumbnail to clear the badge. Toggle the `induceRefreshFailure` arg to "scene-2" to exercise the per-Scene failure branch (FR-043).'}}},argTypes:{induceRefreshFailure:{control:"select",options:[void 0,"scene-1","scene-2","scene-3"],description:"Feature 234 FR-043 — when set, refresh on the matching sceneId routes to the failure branch (badge stays)."}},args:{induceRefreshFailure:void 0},render:r=>s.jsx(x,{fixture:N({}),initial:{staleSceneIds:["scene-2"]},knobs:{induceRefreshFailure:r.induceRefreshFailure}})},I={parameters:{docs:{description:{story:"Scene 3 starts in a missing-features state. Tab through the panel — focus lands on the remediation affordance with a visible focus ring; press Enter to dispatch the remediation action."}}},render:()=>s.jsx(x,{fixture:N({"scene-3":{editFormOpen:!0,missingData:{kind:"missing-features",ids:["track-alpha","track-bravo","track-charlie"]}}}),initial:{missingDataBySceneId:{"scene-3":["track-alpha","track-bravo","track-charlie"]}}})},l={args:{scenes:[],activeStoryboardName:null,captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},p={args:{scenes:[],activeStoryboardName:null,captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},namingRowViewModel:{visible:!0,pendingName:"Plot Alpha — storyboard",defaultName:"Plot Alpha — storyboard",collisionWith:null,canConfirm:!0},onNamingRowTextChanged:()=>{},onNamingRowConfirm:()=>{},onNamingRowCancel:()=>{}}},u={args:{scenes:[],activeStoryboardName:null,captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},namingRowViewModel:{visible:!0,pendingName:"Exercise Alpha",defaultName:"Plot Alpha — storyboard",collisionWith:"Exercise Alpha",canConfirm:!1},onNamingRowTextChanged:()=>{},onNamingRowConfirm:()=>{},onNamingRowCancel:()=>{}}},m={args:{scenes:o,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},collisionBannerViewModel:{visible:!0,conflictingSceneId:"scene-2",conflictingSceneTitle:"Contact with surface group",proposedTimestamp:"2026-04-20T14:15:00.000Z",proposedTimestampDtg:"201415Z APR 26",offsetCount:0,offsetCapReached:!1,offsetWouldExceedTimeRange:!1,offsetButtonHidden:!1,cause:"capture"},onCollisionReplace:()=>{},onCollisionOffset:()=>{},onCollisionCancel:()=>{}}},f={args:{scenes:o,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},collisionBannerViewModel:{visible:!0,conflictingSceneId:"scene-2",conflictingSceneTitle:"Contact with surface group",proposedTimestamp:"2026-04-20T14:16:00.000Z",proposedTimestampDtg:"201416Z APR 26",offsetCount:60,offsetCapReached:!0,offsetWouldExceedTimeRange:!1,offsetButtonHidden:!0,cause:"capture"},onCollisionReplace:()=>{},onCollisionOffset:()=>{},onCollisionCancel:()=>{}}},h={args:{scenes:o,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},collisionBannerViewModel:{visible:!0,conflictingSceneId:"scene-3",conflictingSceneTitle:"Bearing-only track lock",proposedTimestamp:"2026-04-20T14:35:00.000Z",proposedTimestampDtg:"201435Z APR 26",offsetCount:4,offsetCapReached:!1,offsetWouldExceedTimeRange:!0,offsetButtonHidden:!0,cause:"capture"},onCollisionReplace:()=>{},onCollisionOffset:()=>{},onCollisionCancel:()=>{}}},g={args:{scenes:o,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},sceneEditViewModels:{"scene-2":{sceneId:"scene-2",title:"Contact with surface group",description:null,timestamp:"2026-04-20T14:15:00.000Z",titleIsEditing:!1,editFormOpen:!0,pendingDelete:!1,stale:!1,unresolvedFeatureIds:[],missingData:{kind:"ok"}}},onSceneUpdateToCurrentClicked:()=>{}}};var D,M,B;C.parameters={...C.parameters,docs:{...(D=C.parameters)==null?void 0:D.docs,source:{originalSource:`{
  args: {
    scenes: [],
    activeStoryboardName: null,
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(B=(M=C.parameters)==null?void 0:M.docs)==null?void 0:B.source}}};var O,P,V;S.parameters={...S.parameters,docs:{...(O=S.parameters)==null?void 0:O.docs,source:{originalSource:`{
  args: {
    scenes: [],
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(V=(P=S.parameters)==null?void 0:P.docs)==null?void 0:V.source}}};var H,W,Z;v.parameters={...v.parameters,docs:{...(H=v.parameters)==null?void 0:H.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE.slice(0, 1),
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(Z=(W=v.parameters)==null?void 0:W.docs)==null?void 0:Z.source}}};var _,L,U;k.parameters={...k.parameters,docs:{...(_=k.parameters)==null?void 0:_.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(U=(L=k.parameters)==null?void 0:L.docs)==null?void 0:U.source}}};var j,J,$;w.parameters={...w.parameters,docs:{...(j=w.parameters)==null?void 0:j.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: true,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...($=(J=w.parameters)==null?void 0:J.docs)==null?void 0:$.source}}};var G,Y,z,K,q;i.parameters={...i.parameters,docs:{...(G=i.parameters)==null?void 0:G.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
    viewportLocked: false,
    onViewportLockToggle: () => undefined,
    hasActivePlot: true
  }
}`,...(z=(Y=i.parameters)==null?void 0:Y.docs)==null?void 0:z.source},description:{story:'Padlock toggle unlocked — open-padlock glyph, `aria-pressed="false"`.\nThe control sits immediately to the left of Capture.',...(q=(K=i.parameters)==null?void 0:K.docs)==null?void 0:q.description}}};var Q,X,ee,ne,oe;c.parameters={...c.parameters,docs:{...(Q=c.parameters)==null?void 0:Q.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
    viewportLocked: true,
    onViewportLockToggle: () => undefined,
    hasActivePlot: true
  }
}`,...(ee=(X=c.parameters)==null?void 0:X.docs)==null?void 0:ee.source},description:{story:'Padlock toggle locked — closed-padlock glyph, `aria-pressed="true"`,\nhighlighted background. Demonstrates the visual relationship to Capture.',...(oe=(ne=c.parameters)==null?void 0:ne.docs)==null?void 0:oe.description}}};var te,re,ae,se,ie;d.parameters={...d.parameters,docs:{...(te=d.parameters)==null?void 0:te.docs,source:{originalSource:`{
  args: {
    scenes: [],
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
    viewportLocked: false,
    onViewportLockToggle: () => undefined,
    hasActivePlot: false
  }
}`,...(ae=(re=d.parameters)==null?void 0:re.docs)==null?void 0:ae.source},description:{story:"Padlock toggle disabled — no plot loaded (spec 260 / FR-013).",...(ie=(se=d.parameters)==null?void 0:se.docs)==null?void 0:ie.description}}};var ce,de,le;b.parameters={...b.parameters,docs:{...(ce=b.parameters)==null?void 0:ce.docs,source:{originalSource:`{
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
}`,...(le=(de=b.parameters)==null?void 0:de.docs)==null?void 0:le.source}}};var pe,ue,me;y.parameters={...y.parameters,docs:{...(pe=y.parameters)==null?void 0:pe.docs,source:{originalSource:`{
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
}`,...(me=(ue=y.parameters)==null?void 0:ue.docs)==null?void 0:me.source}}};var fe,he,ge;R.parameters={...R.parameters,docs:{...(fe=R.parameters)==null?void 0:fe.docs,source:{originalSource:`{
  name: 'HardBlockModal (missing features)',
  render: () => <HardBlockModal sceneTitle="201435Z APR 26 — Surface contact" reason={HARD_BLOCK_REASON} jumpPastLabel="Jump past this scene" openForEditingLabel="Open for editing" onJumpPast={() => undefined} onOpenForEditing={() => undefined} onDismiss={() => undefined} />
}`,...(ge=(he=R.parameters)==null?void 0:he.docs)==null?void 0:ge.source}}};var Ce,Se,ve;E.parameters={...E.parameters,docs:{...(Ce=E.parameters)==null?void 0:Ce.docs,source:{originalSource:`{
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
}`,...(ve=(Se=E.parameters)==null?void 0:Se.docs)==null?void 0:ve.source}}};var ke,we,be;T.parameters={...T.parameters,docs:{...(ke=T.parameters)==null?void 0:ke.docs,source:{originalSource:`{
  parameters: {
    docs: {
      description: {
        story: 'Right-click (or Shift+F10) any row → Delete to remove it; the Undo toast appears, click Undo to restore. Driven by the shared \`useStoryOnlyMockHandlers\` helper (Feature 234, ADR-027).'
      }
    }
  },
  render: () => <InteractiveStoryboardPanel fixture={makeEditFixture({})} />
}`,...(be=(we=T.parameters)==null?void 0:we.docs)==null?void 0:be.source}}};var ye,Re,Ee;F.parameters={...F.parameters,docs:{...(ye=F.parameters)==null?void 0:ye.docs,source:{originalSource:`{
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
}`,...(Ee=(Re=F.parameters)==null?void 0:Re.docs)==null?void 0:Ee.source}}};var Te,Fe,Ie;I.parameters={...I.parameters,docs:{...(Te=I.parameters)==null?void 0:Te.docs,source:{originalSource:`{
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
}`,...(Ie=(Fe=I.parameters)==null?void 0:Fe.docs)==null?void 0:Ie.source}}};var Ne,xe,Ae,De,Me;l.parameters={...l.parameters,docs:{...(Ne=l.parameters)==null?void 0:Ne.docs,source:{originalSource:`{
  args: {
    scenes: [],
    activeStoryboardName: null,
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(Ae=(xe=l.parameters)==null?void 0:xe.docs)==null?void 0:Ae.source},description:{story:"The empty rail with the primary Capture Scene affordance — the entry\npoint that replaces the legacy `Press Ctrl/Cmd+Alt+C on the map…`\nempty-state copy from #216.",...(Me=(De=l.parameters)==null?void 0:De.docs)==null?void 0:Me.description}}};var Be,Oe,Pe,Ve,He;p.parameters={...p.parameters,docs:{...(Be=p.parameters)==null?void 0:Be.docs,source:{originalSource:`{
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
}`,...(Pe=(Oe=p.parameters)==null?void 0:Oe.docs)==null?void 0:Pe.source},description:{story:`First-capture inline naming row. Pre-filled with the plot's default
name; analyst can edit, confirm, or cancel without ever leaving the
rail.`,...(He=(Ve=p.parameters)==null?void 0:Ve.docs)==null?void 0:He.description}}};var We,Ze,_e,Le,Ue;u.parameters={...u.parameters,docs:{...(We=u.parameters)==null?void 0:We.docs,source:{originalSource:`{
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
}`,...(_e=(Ze=u.parameters)==null?void 0:Ze.docs)==null?void 0:_e.source},description:{story:`First-capture naming row, but the analyst typed a name that already
exists on this plot. The inline collision warning fires; Confirm is
disabled until they pick a unique name.`,...(Ue=(Le=u.parameters)==null?void 0:Le.docs)==null?void 0:Ue.description}}};var je,Je,$e,Ge,Ye;m.parameters={...m.parameters,docs:{...(je=m.parameters)==null?void 0:je.docs,source:{originalSource:`{
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
}`,...($e=(Je=m.parameters)==null?void 0:Je.docs)==null?void 0:$e.source},description:{story:`Duplicate-timestamp collision banner — Replace / Offset / Cancel.
Anchored in the rail above the existing Scene list. The map and time
controller in the host's central area remain operable.`,...(Ye=(Ge=m.parameters)==null?void 0:Ge.docs)==null?void 0:Ye.description}}};var ze,Ke,qe,Qe,Xe;f.parameters={...f.parameters,docs:{...(ze=f.parameters)==null?void 0:ze.docs,source:{originalSource:`{
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
}`,...(qe=(Ke=f.parameters)==null?void 0:Ke.docs)==null?void 0:qe.source},description:{story:`After 60 Offset presses, the banner replaces the Offset button with
an inline cap-reached message; only Replace and Cancel remain.`,...(Xe=(Qe=f.parameters)==null?void 0:Qe.docs)==null?void 0:Xe.description}}};var en,nn,on,tn,rn;h.parameters={...h.parameters,docs:{...(en=h.parameters)==null?void 0:en.docs,source:{originalSource:`{
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
}`,...(on=(nn=h.parameters)==null?void 0:nn.docs)==null?void 0:on.source},description:{story:`FR-CAP-017a — when the next Offset would push past the plot's time
range, the banner replaces the Offset button with the inline
time-range message.`,...(rn=(tn=h.parameters)==null?void 0:tn.docs)==null?void 0:rn.description}}};var an,sn,cn,dn,ln;g.parameters={...g.parameters,docs:{...(an=g.parameters)==null?void 0:an.docs,source:{originalSource:`{
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
}`,...(cn=(sn=g.parameters)==null?void 0:sn.docs)==null?void 0:cn.source},description:{story:`Visualises a Scene row with the Update-to-current affordance — the
primary maintenance op that re-anchors a Scene to live state in-row.
Re-uses the #218 visual treatment; included here so the new stories
file references it for E2E.`,...(ln=(dn=g.parameters)==null?void 0:dn.docs)==null?void 0:ln.description}}};const Mn=["Empty","EmptyStoryboard","WithOneScene","WithThreeScenes","Capturing","ViewportUnlocked","ViewportLocked","ViewportLockEmptyState","Transport","WithMultipleStoryboards","HardBlockModalStory","WithEditForm","WithUndoToast","WithStaleBadge","WithMissingDataRemediation","EmptyWithCaptureButton","FirstCaptureNamingRow","FirstCaptureNamingRowWithCollision","DuplicateTimestampBanner","DuplicateTimestampBannerOffsetCapped","DuplicateTimestampBannerExceedsTimeRange","RowWithUpdateToCurrent"];export{w as Capturing,m as DuplicateTimestampBanner,h as DuplicateTimestampBannerExceedsTimeRange,f as DuplicateTimestampBannerOffsetCapped,C as Empty,S as EmptyStoryboard,l as EmptyWithCaptureButton,p as FirstCaptureNamingRow,u as FirstCaptureNamingRowWithCollision,R as HardBlockModalStory,g as RowWithUpdateToCurrent,b as Transport,d as ViewportLockEmptyState,c as ViewportLocked,i as ViewportUnlocked,E as WithEditForm,I as WithMissingDataRemediation,y as WithMultipleStoryboards,v as WithOneScene,F as WithStaleBadge,k as WithThreeScenes,T as WithUndoToast,Mn as __namedExportsOrder,Dn as default};
