import{j as s}from"./jsx-runtime-DF2Pcvd1.js";import{S as yn}from"./StoryboardPanel-DQhEKNtR.js";import{H as En}from"./HardBlockModal-Bvqxq9gu.js";import{u as Tn}from"./storyOnlyMockHandlers-CWCCvIdP.js";import{a as Fn}from"./useStoryboardEditReducer-CYOhcMTq.js";import"./index-B2-qRKKC.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./textfield-Dm39NdvL.js";function a(t,r,o){return{sceneId:t,title:o,timestampIso:r,dtgLabel:In(r),thumbnailHref:"data:image/svg+xml;utf8,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150"><rect width="200" height="150" fill="#2b5bb0"/><text x="100" y="80" text-anchor="middle" fill="white" font-family="monospace" font-size="14">${t}</text></svg>`),state:{kind:"ok"}}}function In(t){const r=new Date(t),o=D=>D.toString().padStart(2,"0"),e=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];return`${o(r.getUTCDate())}${o(r.getUTCHours())}${o(r.getUTCMinutes())}Z ${e[r.getUTCMonth()]} ${o(r.getUTCFullYear()%100)}`}const n=[a("scene-1","2026-04-20T14:00:00.000Z","Exercise start — North channel"),a("scene-2","2026-04-20T14:15:00.000Z","Contact with surface group"),a("scene-3","2026-04-20T14:35:00.000Z","Bearing-only track lock")],jn={title:"Panels/StoryboardPanel",component:yn,parameters:{layout:"padded"}},v={args:{scenes:[],activeStoryboardName:null,captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},b={args:{scenes:[],activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},w={args:{scenes:n.slice(0,1),activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},k={args:{scenes:n,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},y={args:{scenes:n,activeStoryboardName:"Exercise Alpha",captureInFlight:!0,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},i={args:{scenes:n,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},onPreview:()=>{}}},c={args:{scenes:[],activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},onPreview:()=>{}}},d={args:{scenes:n,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},viewportLocked:!1,onViewportLockToggle:()=>{},hasActivePlot:!0}},l={args:{scenes:n,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},viewportLocked:!0,onViewportLockToggle:()=>{},hasActivePlot:!0}},p={args:{scenes:[],activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},viewportLocked:!1,onViewportLockToggle:()=>{},hasActivePlot:!1}},Nn={canGoBackward:!1,canGoForward:!0,sceneNumber:1,sceneTotal:3,transitionInFlight:!1},R={args:{scenes:n,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},currentSceneId:"scene-1",transport:Nn,onTransportForward:()=>{},onTransportBackward:()=>{}}},xn={kind:"missing-features",missingFeatureIds:["track-nimitz","annotation-bearing-lock"]},An=[{storyboardId:"sb-commander",name:"Commander's view",sceneCount:5,lastModifiedIso:"2026-04-20T15:00:00.000Z"},{storyboardId:"sb-asw",name:"ASW evidence",sceneCount:3,lastModifiedIso:"2026-04-20T14:30:00.000Z"},{storyboardId:"sb-training",name:"Training debrief",sceneCount:2,lastModifiedIso:"2026-04-20T14:00:00.000Z"}],Pn=[a("scene-1","2026-04-20T14:00:00.000Z","Exercise start"),a("scene-2","2026-04-20T14:10:00.000Z","First contact"),a("scene-3","2026-04-20T14:20:00.000Z","Bearing fix"),a("scene-4","2026-04-20T14:30:00.000Z","CPA estimate"),a("scene-5","2026-04-20T14:45:00.000Z","Disengagement")],Dn={canGoBackward:!0,canGoForward:!0,sceneNumber:2,sceneTotal:5,transitionInFlight:!1},E={args:{scenes:Pn,activeStoryboardName:"Commander's view",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},storyboards:An,activeStoryboardId:"sb-commander",currentSceneId:"scene-2",transport:Dn,onActiveStoryboardChange:()=>{},onCreateStoryboard:()=>{},onRenameStoryboard:()=>{},onDeleteStoryboard:()=>{},onTransportForward:()=>{},onTransportBackward:()=>{}}},T={name:"HardBlockModal (missing features)",render:()=>s.jsx(En,{sceneTitle:"201435Z APR 26 — Surface contact",reason:xn,jumpPastLabel:"Jump past this scene",openForEditingLabel:"Open for editing",onJumpPast:()=>{},onOpenForEditing:()=>{},onDismiss:()=>{}})},Mn={sceneId:"scene-1",title:"Exercise start — North channel",description:null,timestamp:"2026-04-20T14:00:00.000Z",titleIsEditing:!1,editFormOpen:!1,pendingDelete:!1,stale:!1,unresolvedFeatureIds:[],missingData:{kind:"ok"}},Bn={storyboardId:"sb-alpha",name:"Exercise Alpha",description:"Surface-group exercise — North channel",nameIsEditing:!1,descriptionExpanded:!1,sceneCount:n.length};function A(t){const r={};for(const o of n){const e={...Mn,sceneId:o.sceneId,title:o.title,timestamp:o.timestampIso};r[o.sceneId]={...e,...t[o.sceneId]}}return{storyboards:[{storyboardId:"sb-alpha",name:"Exercise Alpha",sceneCount:n.length,lastModifiedIso:"2026-04-20T14:35:00.000Z"},{storyboardId:"sb-bravo",name:"Exercise Bravo",sceneCount:0,lastModifiedIso:"2026-04-20T13:00:00.000Z"}],activeStoryboardId:"sb-alpha",activeStoryboardName:"Exercise Alpha",scenes:n,sceneEditViewModels:r,storyboardEditViewModel:Bn}}function P({fixture:t,initial:r,knobs:o}){const{state:e,handlers:D}=Tn(t,{initial:r,knobs:o}),Rn=Fn(e);return s.jsx(yn,{scenes:e.sceneRows,activeStoryboardName:e.activeStoryboardName,captureInFlight:e.captureInFlight,storyboards:e.storyboards.length>0?e.storyboards:void 0,activeStoryboardId:e.activeStoryboardId,currentSceneId:e.currentSceneId,transport:e.transport,sceneEditViewModels:Rn,storyboardEditViewModel:e.storyboardEditViewModel??void 0,pendingUndoToast:e.pendingUndoToast,overflowMenuOpenFor:e.overflowMenuOpenFor,overflowMenuAnchorRect:e.overflowMenuAnchorRect,...D})}const F={parameters:{docs:{description:{story:'Choose "Edit scene…" from a row\'s ⋯ menu (or double-click the row) to open the edit dialog. Save persists the new title/description via the reducer; Cancel discards. Driven by the shared `useStoryOnlyMockHandlers` helper (Feature 234, ADR-027).'}}},render:()=>s.jsx(P,{fixture:A({"scene-1":{description:"**Brief:** contact gained bearing 023°. Hold course."}})})},I={parameters:{docs:{description:{story:"Right-click (or Shift+F10) any row → Delete to remove it; the Undo toast appears, click Undo to restore. Driven by the shared `useStoryOnlyMockHandlers` helper (Feature 234, ADR-027)."}}},render:()=>s.jsx(P,{fixture:A({})})},N={parameters:{docs:{description:{story:'Scene 2 starts stale; click its overflow → Refresh thumbnail to clear the badge. Toggle the `induceRefreshFailure` arg to "scene-2" to exercise the per-Scene failure branch (FR-043).'}}},argTypes:{induceRefreshFailure:{control:"select",options:[void 0,"scene-1","scene-2","scene-3"],description:"Feature 234 FR-043 — when set, refresh on the matching sceneId routes to the failure branch (badge stays)."}},args:{induceRefreshFailure:void 0},render:t=>s.jsx(P,{fixture:A({}),initial:{staleSceneIds:["scene-2"]},knobs:{induceRefreshFailure:t.induceRefreshFailure}})},x={parameters:{docs:{description:{story:"Scene 3 starts in a missing-features state. Tab through the panel — focus lands on the remediation affordance with a visible focus ring; press Enter to dispatch the remediation action."}}},render:()=>s.jsx(P,{fixture:A({"scene-3":{editFormOpen:!0,missingData:{kind:"missing-features",ids:["track-alpha","track-bravo","track-charlie"]}}}),initial:{missingDataBySceneId:{"scene-3":["track-alpha","track-bravo","track-charlie"]}}})},u={args:{scenes:[],activeStoryboardName:null,captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},onCreateStoryboard:()=>{}}},m={args:{scenes:[],activeStoryboardName:null,captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},namingRowViewModel:{visible:!0,pendingName:"Plot Alpha — storyboard",defaultName:"Plot Alpha — storyboard",collisionWith:null,canConfirm:!0},onNamingRowTextChanged:()=>{},onNamingRowConfirm:()=>{},onNamingRowCancel:()=>{}}},f={args:{scenes:[],activeStoryboardName:null,captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},namingRowViewModel:{visible:!0,pendingName:"Exercise Alpha",defaultName:"Plot Alpha — storyboard",collisionWith:"Exercise Alpha",canConfirm:!1},onNamingRowTextChanged:()=>{},onNamingRowConfirm:()=>{},onNamingRowCancel:()=>{}}},h={args:{scenes:n,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},collisionBannerViewModel:{visible:!0,conflictingSceneId:"scene-2",conflictingSceneTitle:"Contact with surface group",proposedTimestamp:"2026-04-20T14:15:00.000Z",proposedTimestampDtg:"201415Z APR 26",offsetCount:0,offsetCapReached:!1,offsetWouldExceedTimeRange:!1,offsetButtonHidden:!1,cause:"capture"},onCollisionReplace:()=>{},onCollisionOffset:()=>{},onCollisionCancel:()=>{}}},g={args:{scenes:n,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},collisionBannerViewModel:{visible:!0,conflictingSceneId:"scene-2",conflictingSceneTitle:"Contact with surface group",proposedTimestamp:"2026-04-20T14:16:00.000Z",proposedTimestampDtg:"201416Z APR 26",offsetCount:60,offsetCapReached:!0,offsetWouldExceedTimeRange:!1,offsetButtonHidden:!0,cause:"capture"},onCollisionReplace:()=>{},onCollisionOffset:()=>{},onCollisionCancel:()=>{}}},C={args:{scenes:n,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},collisionBannerViewModel:{visible:!0,conflictingSceneId:"scene-3",conflictingSceneTitle:"Bearing-only track lock",proposedTimestamp:"2026-04-20T14:35:00.000Z",proposedTimestampDtg:"201435Z APR 26",offsetCount:4,offsetCapReached:!1,offsetWouldExceedTimeRange:!0,offsetButtonHidden:!0,cause:"capture"},onCollisionReplace:()=>{},onCollisionOffset:()=>{},onCollisionCancel:()=>{}}},S={args:{scenes:n,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},sceneEditViewModels:{"scene-2":{sceneId:"scene-2",title:"Contact with surface group",description:null,timestamp:"2026-04-20T14:15:00.000Z",titleIsEditing:!1,editFormOpen:!0,pendingDelete:!1,stale:!1,unresolvedFeatureIds:[],missingData:{kind:"ok"}}},onSceneUpdateToCurrentClicked:()=>{}}};var M,B,O;v.parameters={...v.parameters,docs:{...(M=v.parameters)==null?void 0:M.docs,source:{originalSource:`{
  args: {
    scenes: [],
    activeStoryboardName: null,
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(O=(B=v.parameters)==null?void 0:B.docs)==null?void 0:O.source}}};var H,V,W;b.parameters={...b.parameters,docs:{...(H=b.parameters)==null?void 0:H.docs,source:{originalSource:`{
  args: {
    scenes: [],
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(W=(V=b.parameters)==null?void 0:V.docs)==null?void 0:W.source}}};var _,Z,L;w.parameters={...w.parameters,docs:{...(_=w.parameters)==null?void 0:_.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE.slice(0, 1),
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(L=(Z=w.parameters)==null?void 0:Z.docs)==null?void 0:L.source}}};var U,j,J;k.parameters={...k.parameters,docs:{...(U=k.parameters)==null?void 0:U.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(J=(j=k.parameters)==null?void 0:j.docs)==null?void 0:J.source}}};var $,G,Y;y.parameters={...y.parameters,docs:{...($=y.parameters)==null?void 0:$.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: true,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(Y=(G=y.parameters)==null?void 0:G.docs)==null?void 0:Y.source}}};var z,K,q,Q,X;i.parameters={...i.parameters,docs:{...(z=i.parameters)==null?void 0:z.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
    onPreview: () => undefined
  }
}`,...(q=(K=i.parameters)==null?void 0:K.docs)==null?void 0:q.source},description:{story:"Preview button enabled — sits beside Capture in the header. Provided\n`onPreview` makes the button render; ≥1 scene makes it actionable.",...(X=(Q=i.parameters)==null?void 0:Q.docs)==null?void 0:X.description}}};var ee,ne,oe,re,te;c.parameters={...c.parameters,docs:{...(ee=c.parameters)==null?void 0:ee.docs,source:{originalSource:`{
  args: {
    scenes: [],
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
    onPreview: () => undefined
  }
}`,...(oe=(ne=c.parameters)==null?void 0:ne.docs)==null?void 0:oe.source},description:{story:`Preview button disabled — the active storyboard has no scenes, so the
button renders but is disabled with an explanatory tooltip (FR-007).`,...(te=(re=c.parameters)==null?void 0:re.docs)==null?void 0:te.description}}};var ae,se,ie,ce,de;d.parameters={...d.parameters,docs:{...(ae=d.parameters)==null?void 0:ae.docs,source:{originalSource:`{
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
}`,...(ie=(se=d.parameters)==null?void 0:se.docs)==null?void 0:ie.source},description:{story:'Padlock toggle unlocked — open-padlock glyph, `aria-pressed="false"`.\nThe control sits immediately to the left of Capture.',...(de=(ce=d.parameters)==null?void 0:ce.docs)==null?void 0:de.description}}};var le,pe,ue,me,fe;l.parameters={...l.parameters,docs:{...(le=l.parameters)==null?void 0:le.docs,source:{originalSource:`{
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
}`,...(ue=(pe=l.parameters)==null?void 0:pe.docs)==null?void 0:ue.source},description:{story:'Padlock toggle locked — closed-padlock glyph, `aria-pressed="true"`,\nhighlighted background. Demonstrates the visual relationship to Capture.',...(fe=(me=l.parameters)==null?void 0:me.docs)==null?void 0:fe.description}}};var he,ge,Ce,Se,ve;p.parameters={...p.parameters,docs:{...(he=p.parameters)==null?void 0:he.docs,source:{originalSource:`{
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
}`,...(Ce=(ge=p.parameters)==null?void 0:ge.docs)==null?void 0:Ce.source},description:{story:"Padlock toggle disabled — no plot loaded (spec 260 / FR-013).",...(ve=(Se=p.parameters)==null?void 0:Se.docs)==null?void 0:ve.description}}};var be,we,ke;R.parameters={...R.parameters,docs:{...(be=R.parameters)==null?void 0:be.docs,source:{originalSource:`{
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
}`,...(ke=(we=R.parameters)==null?void 0:we.docs)==null?void 0:ke.source}}};var ye,Re,Ee;E.parameters={...E.parameters,docs:{...(ye=E.parameters)==null?void 0:ye.docs,source:{originalSource:`{
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
}`,...(Ee=(Re=E.parameters)==null?void 0:Re.docs)==null?void 0:Ee.source}}};var Te,Fe,Ie;T.parameters={...T.parameters,docs:{...(Te=T.parameters)==null?void 0:Te.docs,source:{originalSource:`{
  name: 'HardBlockModal (missing features)',
  render: () => <HardBlockModal sceneTitle="201435Z APR 26 — Surface contact" reason={HARD_BLOCK_REASON} jumpPastLabel="Jump past this scene" openForEditingLabel="Open for editing" onJumpPast={() => undefined} onOpenForEditing={() => undefined} onDismiss={() => undefined} />
}`,...(Ie=(Fe=T.parameters)==null?void 0:Fe.docs)==null?void 0:Ie.source}}};var Ne,xe,Ae;F.parameters={...F.parameters,docs:{...(Ne=F.parameters)==null?void 0:Ne.docs,source:{originalSource:`{
  parameters: {
    docs: {
      description: {
        story: 'Choose "Edit scene…" from a row\\'s ⋯ menu (or double-click the row) to open the edit dialog. Save persists the new title/description via the reducer; Cancel discards. Driven by the shared \`useStoryOnlyMockHandlers\` helper (Feature 234, ADR-027).'
      }
    }
  },
  render: () => <InteractiveStoryboardPanel fixture={makeEditFixture({
    'scene-1': {
      description: '**Brief:** contact gained bearing 023°. Hold course.'
    }
  })} />
}`,...(Ae=(xe=F.parameters)==null?void 0:xe.docs)==null?void 0:Ae.source}}};var Pe,De,Me;I.parameters={...I.parameters,docs:{...(Pe=I.parameters)==null?void 0:Pe.docs,source:{originalSource:`{
  parameters: {
    docs: {
      description: {
        story: 'Right-click (or Shift+F10) any row → Delete to remove it; the Undo toast appears, click Undo to restore. Driven by the shared \`useStoryOnlyMockHandlers\` helper (Feature 234, ADR-027).'
      }
    }
  },
  render: () => <InteractiveStoryboardPanel fixture={makeEditFixture({})} />
}`,...(Me=(De=I.parameters)==null?void 0:De.docs)==null?void 0:Me.source}}};var Be,Oe,He;N.parameters={...N.parameters,docs:{...(Be=N.parameters)==null?void 0:Be.docs,source:{originalSource:`{
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
}`,...(He=(Oe=N.parameters)==null?void 0:Oe.docs)==null?void 0:He.source}}};var Ve,We,_e;x.parameters={...x.parameters,docs:{...(Ve=x.parameters)==null?void 0:Ve.docs,source:{originalSource:`{
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
}`,...(_e=(We=x.parameters)==null?void 0:We.docs)==null?void 0:_e.source}}};var Ze,Le,Ue,je,Je;u.parameters={...u.parameters,docs:{...(Ze=u.parameters)==null?void 0:Ze.docs,source:{originalSource:`{
  args: {
    scenes: [],
    activeStoryboardName: null,
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
    onCreateStoryboard: () => undefined
  }
}`,...(Ue=(Le=u.parameters)==null?void 0:Le.docs)==null?void 0:Ue.source},description:{story:`The empty rail with the primary "Create storyboard" affordance — the
name-first entry point. (The header still carries a "Capture" button for
the capture-first flow.)`,...(Je=(je=u.parameters)==null?void 0:je.docs)==null?void 0:Je.description}}};var $e,Ge,Ye,ze,Ke;m.parameters={...m.parameters,docs:{...($e=m.parameters)==null?void 0:$e.docs,source:{originalSource:`{
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
}`,...(Ye=(Ge=m.parameters)==null?void 0:Ge.docs)==null?void 0:Ye.source},description:{story:`First-capture inline naming row. Pre-filled with the plot's default
name; analyst can edit, confirm, or cancel without ever leaving the
rail.`,...(Ke=(ze=m.parameters)==null?void 0:ze.docs)==null?void 0:Ke.description}}};var qe,Qe,Xe,en,nn;f.parameters={...f.parameters,docs:{...(qe=f.parameters)==null?void 0:qe.docs,source:{originalSource:`{
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
}`,...(Xe=(Qe=f.parameters)==null?void 0:Qe.docs)==null?void 0:Xe.source},description:{story:`First-capture naming row, but the analyst typed a name that already
exists on this plot. The inline collision warning fires; Confirm is
disabled until they pick a unique name.`,...(nn=(en=f.parameters)==null?void 0:en.docs)==null?void 0:nn.description}}};var on,rn,tn,an,sn;h.parameters={...h.parameters,docs:{...(on=h.parameters)==null?void 0:on.docs,source:{originalSource:`{
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
}`,...(tn=(rn=h.parameters)==null?void 0:rn.docs)==null?void 0:tn.source},description:{story:`Duplicate-timestamp collision banner — Replace / Offset / Cancel.
Anchored in the rail above the existing Scene list. The map and time
controller in the host's central area remain operable.`,...(sn=(an=h.parameters)==null?void 0:an.docs)==null?void 0:sn.description}}};var cn,dn,ln,pn,un;g.parameters={...g.parameters,docs:{...(cn=g.parameters)==null?void 0:cn.docs,source:{originalSource:`{
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
}`,...(ln=(dn=g.parameters)==null?void 0:dn.docs)==null?void 0:ln.source},description:{story:`After 60 Offset presses, the banner replaces the Offset button with
an inline cap-reached message; only Replace and Cancel remain.`,...(un=(pn=g.parameters)==null?void 0:pn.docs)==null?void 0:un.description}}};var mn,fn,hn,gn,Cn;C.parameters={...C.parameters,docs:{...(mn=C.parameters)==null?void 0:mn.docs,source:{originalSource:`{
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
}`,...(hn=(fn=C.parameters)==null?void 0:fn.docs)==null?void 0:hn.source},description:{story:`FR-CAP-017a — when the next Offset would push past the plot's time
range, the banner replaces the Offset button with the inline
time-range message.`,...(Cn=(gn=C.parameters)==null?void 0:gn.docs)==null?void 0:Cn.description}}};var Sn,vn,bn,wn,kn;S.parameters={...S.parameters,docs:{...(Sn=S.parameters)==null?void 0:Sn.docs,source:{originalSource:`{
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
}`,...(bn=(vn=S.parameters)==null?void 0:vn.docs)==null?void 0:bn.source},description:{story:`Visualises a Scene row with the Update-to-current affordance — the
primary maintenance op that re-anchors a Scene to live state in-row.
Re-uses the #218 visual treatment; included here so the new stories
file references it for E2E.`,...(kn=(wn=S.parameters)==null?void 0:wn.docs)==null?void 0:kn.description}}};const Jn=["Empty","EmptyStoryboard","WithOneScene","WithThreeScenes","Capturing","WithPreview","PreviewDisabledNoScenes","ViewportUnlocked","ViewportLocked","ViewportLockEmptyState","Transport","WithMultipleStoryboards","HardBlockModalStory","WithEditForm","WithUndoToast","WithStaleBadge","WithMissingDataRemediation","EmptyWithCreateButton","FirstCaptureNamingRow","FirstCaptureNamingRowWithCollision","DuplicateTimestampBanner","DuplicateTimestampBannerOffsetCapped","DuplicateTimestampBannerExceedsTimeRange","RowWithUpdateToCurrent"];export{y as Capturing,h as DuplicateTimestampBanner,C as DuplicateTimestampBannerExceedsTimeRange,g as DuplicateTimestampBannerOffsetCapped,v as Empty,b as EmptyStoryboard,u as EmptyWithCreateButton,m as FirstCaptureNamingRow,f as FirstCaptureNamingRowWithCollision,T as HardBlockModalStory,c as PreviewDisabledNoScenes,S as RowWithUpdateToCurrent,R as Transport,p as ViewportLockEmptyState,l as ViewportLocked,d as ViewportUnlocked,F as WithEditForm,x as WithMissingDataRemediation,E as WithMultipleStoryboards,w as WithOneScene,i as WithPreview,N as WithStaleBadge,k as WithThreeScenes,I as WithUndoToast,Jn as __namedExportsOrder,jn as default};
