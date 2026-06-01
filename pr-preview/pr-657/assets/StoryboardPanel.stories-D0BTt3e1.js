import{j as s}from"./jsx-runtime-DF2Pcvd1.js";import{R as Mn}from"./index-B2-qRKKC.js";import{S as B}from"./StoryboardPanel-LjeR6k8L.js";import{H as Bn}from"./HardBlockModal-Bvqxq9gu.js";import{u as Vn}from"./storyOnlyMockHandlers-CWCCvIdP.js";import{a as Wn}from"./useStoryboardEditReducer-CYOhcMTq.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./textfield-Dm39NdvL.js";function a(o,n,r){return{sceneId:o,title:r,timestampIso:n,dtgLabel:Hn(n),thumbnailHref:"data:image/svg+xml;utf8,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150"><rect width="200" height="150" fill="#2b5bb0"/><text x="100" y="80" text-anchor="middle" fill="white" font-family="monospace" font-size="14">${o}</text></svg>`),state:{kind:"ok"}}}function Hn(o){const n=new Date(o),r=i=>i.toString().padStart(2,"0"),e=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];return`${r(n.getUTCDate())}${r(n.getUTCHours())}${r(n.getUTCMinutes())}Z ${e[n.getUTCMonth()]} ${r(n.getUTCFullYear()%100)}`}const t=[a("scene-1","2026-04-20T14:00:00.000Z","Exercise start — North channel"),a("scene-2","2026-04-20T14:15:00.000Z","Contact with surface group"),a("scene-3","2026-04-20T14:35:00.000Z","Bearing-only track lock")],tr={title:"Panels/StoryboardPanel",component:B,parameters:{layout:"padded"}},b={args:{scenes:[],activeStoryboardName:null,captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},y={args:{scenes:[],activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},R={args:{scenes:t.slice(0,1),activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},E={args:{scenes:t,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},T={args:{scenes:t,activeStoryboardName:"Exercise Alpha",captureInFlight:!0,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},W=[a("scene-1","2026-04-20T10:00:00.000Z","Approach run"),a("scene-2","2026-04-20T10:15:00.000Z","Egress leg"),a("scene-3","2026-04-20T11:00:00.000Z","Final approach"),a("scene-4","2026-04-20T11:30:00.000Z","Contact datum")];function Zn(o,n,r,e=[]){return{sceneId:o,title:n,description:null,timestamp:r,titleIsEditing:!1,editFormOpen:!1,pendingDelete:!1,stale:!1,unresolvedFeatureIds:[],missingData:{kind:"ok"},overlapsWith:e}}const _n={"scene-1":[{sceneId:"scene-2",title:"Egress leg"}],"scene-2":[{sceneId:"scene-1",title:"Approach run"}]};function H(o,n){return o<n?`${o}|${n}`:`${n}|${o}`}function Ln(){const[o,n]=Mn.useState(()=>new Set),r={};for(const e of W){const i=(_n[e.sceneId]??[]).filter(c=>!o.has(H(e.sceneId,c.sceneId)));r[e.sceneId]=Zn(e.sceneId,e.title,e.timestampIso,i)}return s.jsx(B,{scenes:W,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},sceneEditViewModels:r,onSceneOverlapDismiss:(e,i)=>{n(c=>{const V=new Set(c);for(const On of i)V.add(H(e,On));return V})}})}const d={render:()=>s.jsx(Ln,{})},l={args:{scenes:t,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},onPreview:()=>{}}},p={args:{scenes:[],activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},onPreview:()=>{}}},u={args:{scenes:t,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},viewportLocked:!1,onViewportLockToggle:()=>{},hasActivePlot:!0}},m={args:{scenes:t,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},viewportLocked:!0,onViewportLockToggle:()=>{},hasActivePlot:!0}},f={args:{scenes:[],activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},viewportLocked:!1,onViewportLockToggle:()=>{},hasActivePlot:!1}},Un={canGoBackward:!1,canGoForward:!0,sceneNumber:1,sceneTotal:3,transitionInFlight:!1},I={args:{scenes:t,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},currentSceneId:"scene-1",transport:Un,onTransportForward:()=>{},onTransportBackward:()=>{}}},jn={kind:"missing-features",missingFeatureIds:["track-nimitz","annotation-bearing-lock"]},$n=[{storyboardId:"sb-commander",name:"Commander's view",sceneCount:5,lastModifiedIso:"2026-04-20T15:00:00.000Z"},{storyboardId:"sb-asw",name:"ASW evidence",sceneCount:3,lastModifiedIso:"2026-04-20T14:30:00.000Z"},{storyboardId:"sb-training",name:"Training debrief",sceneCount:2,lastModifiedIso:"2026-04-20T14:00:00.000Z"}],Jn=[a("scene-1","2026-04-20T14:00:00.000Z","Exercise start"),a("scene-2","2026-04-20T14:10:00.000Z","First contact"),a("scene-3","2026-04-20T14:20:00.000Z","Bearing fix"),a("scene-4","2026-04-20T14:30:00.000Z","CPA estimate"),a("scene-5","2026-04-20T14:45:00.000Z","Disengagement")],Gn={canGoBackward:!0,canGoForward:!0,sceneNumber:2,sceneTotal:5,transitionInFlight:!1},F={args:{scenes:Jn,activeStoryboardName:"Commander's view",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},storyboards:$n,activeStoryboardId:"sb-commander",currentSceneId:"scene-2",transport:Gn,onActiveStoryboardChange:()=>{},onCreateStoryboard:()=>{},onRenameStoryboard:()=>{},onDeleteStoryboard:()=>{},onTransportForward:()=>{},onTransportBackward:()=>{}}},N={name:"HardBlockModal (missing features)",render:()=>s.jsx(Bn,{sceneTitle:"201435Z APR 26 — Surface contact",reason:jn,jumpPastLabel:"Jump past this scene",openForEditingLabel:"Open for editing",onJumpPast:()=>{},onOpenForEditing:()=>{},onDismiss:()=>{}})},Yn={sceneId:"scene-1",title:"Exercise start — North channel",description:null,timestamp:"2026-04-20T14:00:00.000Z",titleIsEditing:!1,editFormOpen:!1,pendingDelete:!1,stale:!1,unresolvedFeatureIds:[],missingData:{kind:"ok"}},Kn={storyboardId:"sb-alpha",name:"Exercise Alpha",description:"Surface-group exercise — North channel",nameIsEditing:!1,descriptionExpanded:!1,sceneCount:t.length};function O(o){const n={};for(const r of t){const e={...Yn,sceneId:r.sceneId,title:r.title,timestamp:r.timestampIso};n[r.sceneId]={...e,...o[r.sceneId]}}return{storyboards:[{storyboardId:"sb-alpha",name:"Exercise Alpha",sceneCount:t.length,lastModifiedIso:"2026-04-20T14:35:00.000Z"},{storyboardId:"sb-bravo",name:"Exercise Bravo",sceneCount:0,lastModifiedIso:"2026-04-20T13:00:00.000Z"}],activeStoryboardId:"sb-alpha",activeStoryboardName:"Exercise Alpha",scenes:t,sceneEditViewModels:n,storyboardEditViewModel:Kn}}function M({fixture:o,initial:n,knobs:r}){const{state:e,handlers:i}=Vn(o,{initial:n,knobs:r}),c=Wn(e);return s.jsx(B,{scenes:e.sceneRows,activeStoryboardName:e.activeStoryboardName,captureInFlight:e.captureInFlight,storyboards:e.storyboards.length>0?e.storyboards:void 0,activeStoryboardId:e.activeStoryboardId,currentSceneId:e.currentSceneId,transport:e.transport,sceneEditViewModels:c,storyboardEditViewModel:e.storyboardEditViewModel??void 0,pendingUndoToast:e.pendingUndoToast,overflowMenuOpenFor:e.overflowMenuOpenFor,overflowMenuAnchorRect:e.overflowMenuAnchorRect,...i})}const x={parameters:{docs:{description:{story:"Click the chevron on a row to expand its inline edit form. Submit persists the new title via the reducer; Cancel discards. Driven by the shared `useStoryOnlyMockHandlers` helper (Feature 234, ADR-027)."}}},render:()=>s.jsx(M,{fixture:O({"scene-1":{description:"**Brief:** contact gained bearing 023°. Hold course."}})})},A={parameters:{docs:{description:{story:"Right-click (or Shift+F10) any row → Delete to remove it; the Undo toast appears, click Undo to restore. Driven by the shared `useStoryOnlyMockHandlers` helper (Feature 234, ADR-027)."}}},render:()=>s.jsx(M,{fixture:O({})})},P={parameters:{docs:{description:{story:'Scene 2 starts stale; click its overflow → Refresh thumbnail to clear the badge. Toggle the `induceRefreshFailure` arg to "scene-2" to exercise the per-Scene failure branch (FR-043).'}}},argTypes:{induceRefreshFailure:{control:"select",options:[void 0,"scene-1","scene-2","scene-3"],description:"Feature 234 FR-043 — when set, refresh on the matching sceneId routes to the failure branch (badge stays)."}},args:{induceRefreshFailure:void 0},render:o=>s.jsx(M,{fixture:O({}),initial:{staleSceneIds:["scene-2"]},knobs:{induceRefreshFailure:o.induceRefreshFailure}})},D={parameters:{docs:{description:{story:"Scene 3 starts in a missing-features state. Tab through the panel — focus lands on the remediation affordance with a visible focus ring; press Enter to dispatch the remediation action."}}},render:()=>s.jsx(M,{fixture:O({"scene-3":{editFormOpen:!0,missingData:{kind:"missing-features",ids:["track-alpha","track-bravo","track-charlie"]}}}),initial:{missingDataBySceneId:{"scene-3":["track-alpha","track-bravo","track-charlie"]}}})},h={args:{scenes:[],activeStoryboardName:null,captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},g={args:{scenes:[],activeStoryboardName:null,captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},namingRowViewModel:{visible:!0,pendingName:"Plot Alpha — storyboard",defaultName:"Plot Alpha — storyboard",collisionWith:null,canConfirm:!0},onNamingRowTextChanged:()=>{},onNamingRowConfirm:()=>{},onNamingRowCancel:()=>{}}},C={args:{scenes:[],activeStoryboardName:null,captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},namingRowViewModel:{visible:!0,pendingName:"Exercise Alpha",defaultName:"Plot Alpha — storyboard",collisionWith:"Exercise Alpha",canConfirm:!1},onNamingRowTextChanged:()=>{},onNamingRowConfirm:()=>{},onNamingRowCancel:()=>{}}},S={args:{scenes:t,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},collisionBannerViewModel:{visible:!0,conflictingSceneId:"scene-2",conflictingSceneTitle:"Contact with surface group",proposedTimestamp:"2026-04-20T14:15:00.000Z",proposedTimestampDtg:"201415Z APR 26",offsetCount:0,offsetCapReached:!1,offsetWouldExceedTimeRange:!1,offsetButtonHidden:!1,cause:"capture"},onCollisionReplace:()=>{},onCollisionOffset:()=>{},onCollisionCancel:()=>{}}},v={args:{scenes:t,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},collisionBannerViewModel:{visible:!0,conflictingSceneId:"scene-2",conflictingSceneTitle:"Contact with surface group",proposedTimestamp:"2026-04-20T14:16:00.000Z",proposedTimestampDtg:"201416Z APR 26",offsetCount:60,offsetCapReached:!0,offsetWouldExceedTimeRange:!1,offsetButtonHidden:!0,cause:"capture"},onCollisionReplace:()=>{},onCollisionOffset:()=>{},onCollisionCancel:()=>{}}},w={args:{scenes:t,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},collisionBannerViewModel:{visible:!0,conflictingSceneId:"scene-3",conflictingSceneTitle:"Bearing-only track lock",proposedTimestamp:"2026-04-20T14:35:00.000Z",proposedTimestampDtg:"201435Z APR 26",offsetCount:4,offsetCapReached:!1,offsetWouldExceedTimeRange:!0,offsetButtonHidden:!0,cause:"capture"},onCollisionReplace:()=>{},onCollisionOffset:()=>{},onCollisionCancel:()=>{}}},k={args:{scenes:t,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},sceneEditViewModels:{"scene-2":{sceneId:"scene-2",title:"Contact with surface group",description:null,timestamp:"2026-04-20T14:15:00.000Z",titleIsEditing:!1,editFormOpen:!0,pendingDelete:!1,stale:!1,unresolvedFeatureIds:[],missingData:{kind:"ok"}}},onSceneUpdateToCurrentClicked:()=>{}}};var Z,_,L;b.parameters={...b.parameters,docs:{...(Z=b.parameters)==null?void 0:Z.docs,source:{originalSource:`{
  args: {
    scenes: [],
    activeStoryboardName: null,
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(L=(_=b.parameters)==null?void 0:_.docs)==null?void 0:L.source}}};var U,j,$;y.parameters={...y.parameters,docs:{...(U=y.parameters)==null?void 0:U.docs,source:{originalSource:`{
  args: {
    scenes: [],
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...($=(j=y.parameters)==null?void 0:j.docs)==null?void 0:$.source}}};var J,G,Y;R.parameters={...R.parameters,docs:{...(J=R.parameters)==null?void 0:J.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE.slice(0, 1),
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(Y=(G=R.parameters)==null?void 0:G.docs)==null?void 0:Y.source}}};var K,z,q;E.parameters={...E.parameters,docs:{...(K=E.parameters)==null?void 0:K.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(q=(z=E.parameters)==null?void 0:z.docs)==null?void 0:q.source}}};var Q,X,ee;T.parameters={...T.parameters,docs:{...(Q=T.parameters)==null?void 0:Q.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: true,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(ee=(X=T.parameters)==null?void 0:X.docs)==null?void 0:ee.source}}};var ne,re,oe,te,ae;d.parameters={...d.parameters,docs:{...(ne=d.parameters)==null?void 0:ne.docs,source:{originalSource:`{
  render: () => <OverlapWarningStory />
}`,...(oe=(re=d.parameters)==null?void 0:re.docs)==null?void 0:oe.source},description:{story:`Two time-range Scenes whose windows overlap (Approach run 10:00–10:30 and
Egress leg 10:15–10:45) each carry a passive warning naming the other.
The non-overlapping time-range Scene and the instant Scene stay clean.
Clicking Dismiss clears the warning on both rows.`,...(ae=(te=d.parameters)==null?void 0:te.docs)==null?void 0:ae.description}}};var se,ie,ce,de,le;l.parameters={...l.parameters,docs:{...(se=l.parameters)==null?void 0:se.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
    onPreview: () => undefined
  }
}`,...(ce=(ie=l.parameters)==null?void 0:ie.docs)==null?void 0:ce.source},description:{story:"Preview button enabled — sits beside Capture in the header. Provided\n`onPreview` makes the button render; ≥1 scene makes it actionable.",...(le=(de=l.parameters)==null?void 0:de.docs)==null?void 0:le.description}}};var pe,ue,me,fe,he;p.parameters={...p.parameters,docs:{...(pe=p.parameters)==null?void 0:pe.docs,source:{originalSource:`{
  args: {
    scenes: [],
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
    onPreview: () => undefined
  }
}`,...(me=(ue=p.parameters)==null?void 0:ue.docs)==null?void 0:me.source},description:{story:`Preview button disabled — the active storyboard has no scenes, so the
button renders but is disabled with an explanatory tooltip (FR-007).`,...(he=(fe=p.parameters)==null?void 0:fe.docs)==null?void 0:he.description}}};var ge,Ce,Se,ve,we;u.parameters={...u.parameters,docs:{...(ge=u.parameters)==null?void 0:ge.docs,source:{originalSource:`{
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
}`,...(Se=(Ce=u.parameters)==null?void 0:Ce.docs)==null?void 0:Se.source},description:{story:'Padlock toggle unlocked — open-padlock glyph, `aria-pressed="false"`.\nThe control sits immediately to the left of Capture.',...(we=(ve=u.parameters)==null?void 0:ve.docs)==null?void 0:we.description}}};var ke,be,ye,Re,Ee;m.parameters={...m.parameters,docs:{...(ke=m.parameters)==null?void 0:ke.docs,source:{originalSource:`{
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
}`,...(ye=(be=m.parameters)==null?void 0:be.docs)==null?void 0:ye.source},description:{story:'Padlock toggle locked — closed-padlock glyph, `aria-pressed="true"`,\nhighlighted background. Demonstrates the visual relationship to Capture.',...(Ee=(Re=m.parameters)==null?void 0:Re.docs)==null?void 0:Ee.description}}};var Te,Ie,Fe,Ne,xe;f.parameters={...f.parameters,docs:{...(Te=f.parameters)==null?void 0:Te.docs,source:{originalSource:`{
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
}`,...(Fe=(Ie=f.parameters)==null?void 0:Ie.docs)==null?void 0:Fe.source},description:{story:"Padlock toggle disabled — no plot loaded (spec 260 / FR-013).",...(xe=(Ne=f.parameters)==null?void 0:Ne.docs)==null?void 0:xe.description}}};var Ae,Pe,De;I.parameters={...I.parameters,docs:{...(Ae=I.parameters)==null?void 0:Ae.docs,source:{originalSource:`{
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
}`,...(De=(Pe=I.parameters)==null?void 0:Pe.docs)==null?void 0:De.source}}};var Oe,Me,Be;F.parameters={...F.parameters,docs:{...(Oe=F.parameters)==null?void 0:Oe.docs,source:{originalSource:`{
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
}`,...(Be=(Me=F.parameters)==null?void 0:Me.docs)==null?void 0:Be.source}}};var Ve,We,He;N.parameters={...N.parameters,docs:{...(Ve=N.parameters)==null?void 0:Ve.docs,source:{originalSource:`{
  name: 'HardBlockModal (missing features)',
  render: () => <HardBlockModal sceneTitle="201435Z APR 26 — Surface contact" reason={HARD_BLOCK_REASON} jumpPastLabel="Jump past this scene" openForEditingLabel="Open for editing" onJumpPast={() => undefined} onOpenForEditing={() => undefined} onDismiss={() => undefined} />
}`,...(He=(We=N.parameters)==null?void 0:We.docs)==null?void 0:He.source}}};var Ze,_e,Le;x.parameters={...x.parameters,docs:{...(Ze=x.parameters)==null?void 0:Ze.docs,source:{originalSource:`{
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
}`,...(Le=(_e=x.parameters)==null?void 0:_e.docs)==null?void 0:Le.source}}};var Ue,je,$e;A.parameters={...A.parameters,docs:{...(Ue=A.parameters)==null?void 0:Ue.docs,source:{originalSource:`{
  parameters: {
    docs: {
      description: {
        story: 'Right-click (or Shift+F10) any row → Delete to remove it; the Undo toast appears, click Undo to restore. Driven by the shared \`useStoryOnlyMockHandlers\` helper (Feature 234, ADR-027).'
      }
    }
  },
  render: () => <InteractiveStoryboardPanel fixture={makeEditFixture({})} />
}`,...($e=(je=A.parameters)==null?void 0:je.docs)==null?void 0:$e.source}}};var Je,Ge,Ye;P.parameters={...P.parameters,docs:{...(Je=P.parameters)==null?void 0:Je.docs,source:{originalSource:`{
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
}`,...(Ye=(Ge=P.parameters)==null?void 0:Ge.docs)==null?void 0:Ye.source}}};var Ke,ze,qe;D.parameters={...D.parameters,docs:{...(Ke=D.parameters)==null?void 0:Ke.docs,source:{originalSource:`{
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
}`,...(qe=(ze=D.parameters)==null?void 0:ze.docs)==null?void 0:qe.source}}};var Qe,Xe,en,nn,rn;h.parameters={...h.parameters,docs:{...(Qe=h.parameters)==null?void 0:Qe.docs,source:{originalSource:`{
  args: {
    scenes: [],
    activeStoryboardName: null,
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(en=(Xe=h.parameters)==null?void 0:Xe.docs)==null?void 0:en.source},description:{story:"The empty rail with the primary Capture Scene affordance — the entry\npoint that replaces the legacy `Press Ctrl/Cmd+Alt+C on the map…`\nempty-state copy from #216.",...(rn=(nn=h.parameters)==null?void 0:nn.docs)==null?void 0:rn.description}}};var on,tn,an,sn,cn;g.parameters={...g.parameters,docs:{...(on=g.parameters)==null?void 0:on.docs,source:{originalSource:`{
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
}`,...(an=(tn=g.parameters)==null?void 0:tn.docs)==null?void 0:an.source},description:{story:`First-capture inline naming row. Pre-filled with the plot's default
name; analyst can edit, confirm, or cancel without ever leaving the
rail.`,...(cn=(sn=g.parameters)==null?void 0:sn.docs)==null?void 0:cn.description}}};var dn,ln,pn,un,mn;C.parameters={...C.parameters,docs:{...(dn=C.parameters)==null?void 0:dn.docs,source:{originalSource:`{
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
}`,...(pn=(ln=C.parameters)==null?void 0:ln.docs)==null?void 0:pn.source},description:{story:`First-capture naming row, but the analyst typed a name that already
exists on this plot. The inline collision warning fires; Confirm is
disabled until they pick a unique name.`,...(mn=(un=C.parameters)==null?void 0:un.docs)==null?void 0:mn.description}}};var fn,hn,gn,Cn,Sn;S.parameters={...S.parameters,docs:{...(fn=S.parameters)==null?void 0:fn.docs,source:{originalSource:`{
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
}`,...(gn=(hn=S.parameters)==null?void 0:hn.docs)==null?void 0:gn.source},description:{story:`Duplicate-timestamp collision banner — Replace / Offset / Cancel.
Anchored in the rail above the existing Scene list. The map and time
controller in the host's central area remain operable.`,...(Sn=(Cn=S.parameters)==null?void 0:Cn.docs)==null?void 0:Sn.description}}};var vn,wn,kn,bn,yn;v.parameters={...v.parameters,docs:{...(vn=v.parameters)==null?void 0:vn.docs,source:{originalSource:`{
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
}`,...(kn=(wn=v.parameters)==null?void 0:wn.docs)==null?void 0:kn.source},description:{story:`After 60 Offset presses, the banner replaces the Offset button with
an inline cap-reached message; only Replace and Cancel remain.`,...(yn=(bn=v.parameters)==null?void 0:bn.docs)==null?void 0:yn.description}}};var Rn,En,Tn,In,Fn;w.parameters={...w.parameters,docs:{...(Rn=w.parameters)==null?void 0:Rn.docs,source:{originalSource:`{
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
}`,...(Tn=(En=w.parameters)==null?void 0:En.docs)==null?void 0:Tn.source},description:{story:`FR-CAP-017a — when the next Offset would push past the plot's time
range, the banner replaces the Offset button with the inline
time-range message.`,...(Fn=(In=w.parameters)==null?void 0:In.docs)==null?void 0:Fn.description}}};var Nn,xn,An,Pn,Dn;k.parameters={...k.parameters,docs:{...(Nn=k.parameters)==null?void 0:Nn.docs,source:{originalSource:`{
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
}`,...(An=(xn=k.parameters)==null?void 0:xn.docs)==null?void 0:An.source},description:{story:`Visualises a Scene row with the Update-to-current affordance — the
primary maintenance op that re-anchors a Scene to live state in-row.
Re-uses the #218 visual treatment; included here so the new stories
file references it for E2E.`,...(Dn=(Pn=k.parameters)==null?void 0:Pn.docs)==null?void 0:Dn.description}}};const ar=["Empty","EmptyStoryboard","WithOneScene","WithThreeScenes","Capturing","WithOverlapWarnings","WithPreview","PreviewDisabledNoScenes","ViewportUnlocked","ViewportLocked","ViewportLockEmptyState","Transport","WithMultipleStoryboards","HardBlockModalStory","WithEditForm","WithUndoToast","WithStaleBadge","WithMissingDataRemediation","EmptyWithCaptureButton","FirstCaptureNamingRow","FirstCaptureNamingRowWithCollision","DuplicateTimestampBanner","DuplicateTimestampBannerOffsetCapped","DuplicateTimestampBannerExceedsTimeRange","RowWithUpdateToCurrent"];export{T as Capturing,S as DuplicateTimestampBanner,w as DuplicateTimestampBannerExceedsTimeRange,v as DuplicateTimestampBannerOffsetCapped,b as Empty,y as EmptyStoryboard,h as EmptyWithCaptureButton,g as FirstCaptureNamingRow,C as FirstCaptureNamingRowWithCollision,N as HardBlockModalStory,p as PreviewDisabledNoScenes,k as RowWithUpdateToCurrent,I as Transport,f as ViewportLockEmptyState,m as ViewportLocked,u as ViewportUnlocked,x as WithEditForm,D as WithMissingDataRemediation,F as WithMultipleStoryboards,R as WithOneScene,d as WithOverlapWarnings,l as WithPreview,P as WithStaleBadge,E as WithThreeScenes,A as WithUndoToast,ar as __namedExportsOrder,tr as default};
