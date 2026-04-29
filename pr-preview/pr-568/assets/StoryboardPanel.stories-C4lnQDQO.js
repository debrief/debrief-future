import{j as y}from"./jsx-runtime-DF2Pcvd1.js";import{S as Cn}from"./StoryboardPanel-DTNOgKX5.js";import{H as bn}from"./HardBlockModal-Bvqxq9gu.js";import{r as l}from"./index-B2-qRKKC.js";import{u as vn,c as Rn}from"./useStoryboardEditReducer-B5tonDZp.js";import"./textfield-Dm39NdvL.js";import"./_commonjsHelpers-Cpj98o6Y.js";const wn={canGoBackward:!1,canGoForward:!1,sceneNumber:0,sceneTotal:0,transitionInFlight:!1};function kn(o,a){const s=a.staleSceneIds??[],r=a.pendingDeleteSceneIds??[],n=a.missingDataBySceneId??{},C={},b=[];for(const u of o.scenes){const i=o.sceneEditViewModels[u.sceneId],N=r.includes(u.sceneId),v=n[u.sceneId],x=v&&v.length>0?{kind:"missing-features",ids:v}:(i==null?void 0:i.missingData)??{kind:"ok"};C[u.sceneId]={sceneId:u.sceneId,title:(i==null?void 0:i.title)??u.title,description:(i==null?void 0:i.description)??null,timestamp:(i==null?void 0:i.timestamp)??u.timestampIso,titleIsEditing:!1,editFormOpen:!1,pendingDelete:N,stale:!1,unresolvedFeatureIds:[],missingData:x},s.includes(u.sceneId)&&b.push({sceneId:u.sceneId,stale:!0,unresolvedFeatureIds:["track-alpha","track-bravo"]})}return{sceneEditViewModels:C,staleFlags:b}}function En(o,a={}){const s=vn(),{state:r,dispatch:n,sceneEditViewModels:C,openOverflowMenu:b,closeOverflowMenu:u,dismissUndoToast:i}=s,N=a.knobs??{},v=a.initial??{},x=a.recordOutbound??Tn,c=l.useRef(r);c.current=r;const A=l.useRef(o);A.current=o;const M=l.useRef(N);M.current=N;const h=l.useRef(x);h.current=x;const $=l.useRef(!1);l.useEffect(()=>{if($.current)return;$.current=!0;const{sceneEditViewModels:e,staleFlags:t}=kn(o,v);n({type:"snapshot-message",payload:{storyboards:o.storyboards,scenes:o.scenes,activeStoryboardId:o.activeStoryboardId,activeStoryboardName:o.activeStoryboardName,currentSceneId:null,transport:{...wn,sceneTotal:o.scenes.length,canGoForward:o.scenes.length>1},sceneEditViewModels:e,pendingUndoToast:null,storyboardEditViewModel:o.storyboardEditViewModel}}),t.length>0&&n({type:"scene-stale-flags-updated",flags:t})},[]);const Y=l.useCallback(e=>{h.current("scene-delete-requested",{sceneId:e});const t=c.current.sceneRows.find(d=>d.sceneId===e);if(!t)return;const m={sceneId:e,sceneTitle:t.title,deletedAt:new Date().toISOString(),canUndo:!0};n({type:"scene-undo-toast-shown",toast:m});const f=c.current.sceneRows.filter(d=>d.sceneId!==e);n({type:"scenes-message",payload:{scenes:f,activeStoryboardName:c.current.activeStoryboardName,activeStoryboardId:c.current.activeStoryboardId}})},[n]),q=l.useCallback(e=>{h.current("scene-undo-delete-clicked",{sceneId:e}),n({type:"scene-undo-toast-shown",toast:null}),n({type:"scenes-message",payload:{scenes:A.current.scenes,activeStoryboardName:A.current.activeStoryboardName,activeStoryboardId:A.current.activeStoryboardId}})},[n]),z=l.useCallback(e=>{if(M.current.induceRefreshFailure===e){h.current("scene-refresh-failed",{sceneId:e});return}h.current("scene-refresh-thumbnail-clicked",{sceneId:e});const t=[];for(const[m,f]of c.current.staleFlags.entries())m!==e&&t.push(f);n({type:"scene-stale-flags-updated",flags:t})},[n]),K=l.useCallback(e=>{const t=M.current.induceRefreshFailure;if(t!==void 0){h.current("storyboard-refresh-all-stale-partial-failure",{storyboardId:e,failedSceneIds:[t]});const m=[];for(const[f,d]of c.current.staleFlags.entries())f===t&&m.push(d);n({type:"scene-stale-flags-updated",flags:m});return}h.current("storyboard-refresh-all-stale-clicked",{storyboardId:e}),n({type:"scene-stale-flags-updated",flags:[]})},[n]),Q=l.useCallback(e=>{if(M.current.induceCopyFailure===e){h.current("scene-copy-to-other-failed",{sceneId:e});return}h.current("scene-copy-to-other-clicked",{sceneId:e})},[]),g=l.useCallback((e,t)=>{h.current(e,t)},[]),yn=l.useMemo(()=>({onCaptureClick:()=>g("capture-clicked",{}),onSceneRowClick:e=>g("scene-row-clicked",{sceneId:e}),onSceneRowExpandToggle:e=>n({type:"expand-row-toggle",sceneId:e}),onSceneOverflowMenuOpen:b,onSceneOverflowMenuClose:u,onSceneEditFormCancel:()=>n({type:"scene-edit-form-close"}),onSceneTitleRenameCommit:(e,t)=>{g("scene-title-rename-committed",{sceneId:e,newTitle:t});const m=c.current.sceneRows.map(d=>d.sceneId===e?{...d,title:t}:d),f={};for(const[d,X]of Object.entries(c.current.sceneEditViewModelsFromExtension))f[d]=d===e?{...X,title:t}:X;n({type:"scene-edit-form-close"}),n({type:"scenes-message",payload:{scenes:m,activeStoryboardName:c.current.activeStoryboardName,activeStoryboardId:c.current.activeStoryboardId,sceneEditViewModels:f}})},onSceneDescriptionSubmit:(e,t)=>{g("scene-description-edit-submitted",{sceneId:e,description:t});const m={};for(const[f,d]of Object.entries(c.current.sceneEditViewModelsFromExtension))m[f]=f===e?{...d,description:t}:d;n({type:"scene-edit-form-close"}),n({type:"scenes-message",payload:{scenes:c.current.sceneRows,activeStoryboardName:c.current.activeStoryboardName,activeStoryboardId:c.current.activeStoryboardId,sceneEditViewModels:m}})},onSceneDeleteRequested:Y,onSceneUndoDeleteClicked:q,onSceneUpdateToCurrentClicked:e=>g("scene-update-to-current-clicked",{sceneId:e}),onSceneDuplicateClicked:e=>g("scene-duplicate-clicked",{sceneId:e}),onSceneCopyToOtherClicked:Q,onSceneRefreshThumbnailClicked:z,onStoryboardRefreshAllStaleClicked:K,onStoryboardNameRenameCommit:(e,t)=>g("storyboard-name-rename-committed",{storyboardId:e,newName:t}),onStoryboardDescriptionSubmit:(e,t)=>g("storyboard-description-edit-submitted",{storyboardId:e,description:t}),onUndoToastDismiss:i}),[n,b,u,i,Y,q,z,K,Q,g]);return{state:r,dispatch:n,sceneEditViewModels:C,handlers:yn}}function Tn(){}function S(o,a,s){return{sceneId:o,title:s,timestampIso:a,dtgLabel:In(a),thumbnailHref:"data:image/svg+xml;utf8,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150"><rect width="200" height="150" fill="#2b5bb0"/><text x="100" y="80" text-anchor="middle" fill="white" font-family="monospace" font-size="14">${o}</text></svg>`),state:{kind:"ok"}}}function In(o){const a=new Date(o),s=n=>n.toString().padStart(2,"0"),r=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];return`${s(a.getUTCDate())}${s(a.getUTCHours())}${s(a.getUTCMinutes())}Z ${r[a.getUTCMonth()]} ${s(a.getUTCFullYear()%100)}`}const p=[S("scene-1","2026-04-20T14:00:00.000Z","Exercise start — North channel"),S("scene-2","2026-04-20T14:15:00.000Z","Contact with surface group"),S("scene-3","2026-04-20T14:35:00.000Z","Bearing-only track lock")],_n={title:"Panels/StoryboardPanel",component:Cn,parameters:{layout:"padded"}},D={args:{scenes:[],activeStoryboardName:null,captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},O={args:{scenes:[],activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},B={args:{scenes:p.slice(0,1),activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},V={args:{scenes:p,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},P={args:{scenes:p,activeStoryboardName:"Exercise Alpha",captureInFlight:!0,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},Fn={canGoBackward:!1,canGoForward:!0,sceneNumber:1,sceneTotal:3,transitionInFlight:!1},U={args:{scenes:p,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},currentSceneId:"scene-1",transport:Fn,onTransportForward:()=>{},onTransportBackward:()=>{}}},Nn={kind:"missing-features",missingFeatureIds:["track-nimitz","annotation-bearing-lock"]},xn=[{storyboardId:"sb-commander",name:"Commander's view",sceneCount:5,lastModifiedIso:"2026-04-20T15:00:00.000Z"},{storyboardId:"sb-asw",name:"ASW evidence",sceneCount:3,lastModifiedIso:"2026-04-20T14:30:00.000Z"},{storyboardId:"sb-training",name:"Training debrief",sceneCount:2,lastModifiedIso:"2026-04-20T14:00:00.000Z"}],An=[S("scene-1","2026-04-20T14:00:00.000Z","Exercise start"),S("scene-2","2026-04-20T14:10:00.000Z","First contact"),S("scene-3","2026-04-20T14:20:00.000Z","Bearing fix"),S("scene-4","2026-04-20T14:30:00.000Z","CPA estimate"),S("scene-5","2026-04-20T14:45:00.000Z","Disengagement")],Mn={canGoBackward:!0,canGoForward:!0,sceneNumber:2,sceneTotal:5,transitionInFlight:!1},H={args:{scenes:An,activeStoryboardName:"Commander's view",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},storyboards:xn,activeStoryboardId:"sb-commander",currentSceneId:"scene-2",transport:Mn,onActiveStoryboardChange:()=>{},onCreateStoryboard:()=>{},onRenameStoryboard:()=>{},onDeleteStoryboard:()=>{},onTransportForward:()=>{},onTransportBackward:()=>{}}},W={name:"HardBlockModal (missing features)",render:()=>y.jsx(bn,{sceneTitle:"201435Z APR 26 — Surface contact",reason:Nn,jumpPastLabel:"Jump past this scene",openForEditingLabel:"Open for editing",onJumpPast:()=>{},onOpenForEditing:()=>{},onDismiss:()=>{}})},Dn={sceneId:"scene-1",title:"Exercise start — North channel",description:null,timestamp:"2026-04-20T14:00:00.000Z",titleIsEditing:!1,editFormOpen:!1,pendingDelete:!1,stale:!1,unresolvedFeatureIds:[],missingData:{kind:"ok"}},On={storyboardId:"sb-alpha",name:"Exercise Alpha",description:"Surface-group exercise — North channel",nameIsEditing:!1,descriptionExpanded:!1,sceneCount:p.length};function G(o){const a={};for(const s of p){const r={...Dn,sceneId:s.sceneId,title:s.title,timestamp:s.timestampIso};a[s.sceneId]={...r,...o[s.sceneId]}}return{storyboards:[{storyboardId:"sb-alpha",name:"Exercise Alpha",sceneCount:p.length,lastModifiedIso:"2026-04-20T14:35:00.000Z"},{storyboardId:"sb-bravo",name:"Exercise Bravo",sceneCount:0,lastModifiedIso:"2026-04-20T13:00:00.000Z"}],activeStoryboardId:"sb-alpha",activeStoryboardName:"Exercise Alpha",scenes:p,sceneEditViewModels:a,storyboardEditViewModel:On}}function J({fixture:o,initial:a,knobs:s}){const{state:r,handlers:n}=En(o,{initial:a,knobs:s}),C=Rn(r);return y.jsx(Cn,{scenes:r.sceneRows,activeStoryboardName:r.activeStoryboardName,captureInFlight:r.captureInFlight,storyboards:r.storyboards.length>0?r.storyboards:void 0,activeStoryboardId:r.activeStoryboardId,currentSceneId:r.currentSceneId,transport:r.transport,sceneEditViewModels:C,storyboardEditViewModel:r.storyboardEditViewModel??void 0,pendingUndoToast:r.pendingUndoToast,overflowMenuOpenFor:r.overflowMenuOpenFor,overflowMenuAnchorRect:r.overflowMenuAnchorRect,...n})}const Z={parameters:{docs:{description:{story:"Click the chevron on a row to expand its inline edit form. Submit persists the new title via the reducer; Cancel discards. Driven by the shared `useStoryOnlyMockHandlers` helper (Feature 234, ADR-027)."}}},render:()=>y.jsx(J,{fixture:G({"scene-1":{description:"**Brief:** contact gained bearing 023°. Hold course."}})})},_={parameters:{docs:{description:{story:"Right-click (or Shift+F10) any row → Delete to remove it; the Undo toast appears, click Undo to restore. Driven by the shared `useStoryOnlyMockHandlers` helper (Feature 234, ADR-027)."}}},render:()=>y.jsx(J,{fixture:G({})})},L={parameters:{docs:{description:{story:'Scene 2 starts stale; click its overflow → Refresh thumbnail to clear the badge. Toggle the `induceRefreshFailure` arg to "scene-2" to exercise the per-Scene failure branch (FR-043).'}}},argTypes:{induceRefreshFailure:{control:"select",options:[void 0,"scene-1","scene-2","scene-3"],description:"Feature 234 FR-043 — when set, refresh on the matching sceneId routes to the failure branch (badge stays)."}},args:{induceRefreshFailure:void 0},render:o=>y.jsx(J,{fixture:G({}),initial:{staleSceneIds:["scene-2"]},knobs:{induceRefreshFailure:o.induceRefreshFailure}})},j={parameters:{docs:{description:{story:"Scene 3 starts in a missing-features state. Tab through the panel — focus lands on the remediation affordance with a visible focus ring; press Enter to dispatch the remediation action."}}},render:()=>y.jsx(J,{fixture:G({"scene-3":{editFormOpen:!0,missingData:{kind:"missing-features",ids:["track-alpha","track-bravo","track-charlie"]}}}),initial:{missingDataBySceneId:{"scene-3":["track-alpha","track-bravo","track-charlie"]}}})},R={args:{scenes:[],activeStoryboardName:null,captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},w={args:{scenes:[],activeStoryboardName:null,captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},namingRowViewModel:{visible:!0,pendingName:"Plot Alpha — storyboard",defaultName:"Plot Alpha — storyboard",collisionWith:null,canConfirm:!0},onNamingRowTextChanged:()=>{},onNamingRowConfirm:()=>{},onNamingRowCancel:()=>{}}},k={args:{scenes:[],activeStoryboardName:null,captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},namingRowViewModel:{visible:!0,pendingName:"Exercise Alpha",defaultName:"Plot Alpha — storyboard",collisionWith:"Exercise Alpha",canConfirm:!1},onNamingRowTextChanged:()=>{},onNamingRowConfirm:()=>{},onNamingRowCancel:()=>{}}},E={args:{scenes:p,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},collisionBannerViewModel:{visible:!0,conflictingSceneId:"scene-2",conflictingSceneTitle:"Contact with surface group",proposedTimestamp:"2026-04-20T14:15:00.000Z",proposedTimestampDtg:"201415Z APR 26",offsetCount:0,offsetCapReached:!1,offsetWouldExceedTimeRange:!1,offsetButtonHidden:!1,cause:"capture"},onCollisionReplace:()=>{},onCollisionOffset:()=>{},onCollisionCancel:()=>{}}},T={args:{scenes:p,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},collisionBannerViewModel:{visible:!0,conflictingSceneId:"scene-2",conflictingSceneTitle:"Contact with surface group",proposedTimestamp:"2026-04-20T14:16:00.000Z",proposedTimestampDtg:"201416Z APR 26",offsetCount:60,offsetCapReached:!0,offsetWouldExceedTimeRange:!1,offsetButtonHidden:!0,cause:"capture"},onCollisionReplace:()=>{},onCollisionOffset:()=>{},onCollisionCancel:()=>{}}},I={args:{scenes:p,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},collisionBannerViewModel:{visible:!0,conflictingSceneId:"scene-3",conflictingSceneTitle:"Bearing-only track lock",proposedTimestamp:"2026-04-20T14:35:00.000Z",proposedTimestampDtg:"201435Z APR 26",offsetCount:4,offsetCapReached:!1,offsetWouldExceedTimeRange:!0,offsetButtonHidden:!0,cause:"capture"},onCollisionReplace:()=>{},onCollisionOffset:()=>{},onCollisionCancel:()=>{}}},F={args:{scenes:p,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},sceneEditViewModels:{"scene-2":{sceneId:"scene-2",title:"Contact with surface group",description:null,timestamp:"2026-04-20T14:15:00.000Z",titleIsEditing:!1,editFormOpen:!0,pendingDelete:!1,stale:!1,unresolvedFeatureIds:[],missingData:{kind:"ok"}}},onSceneUpdateToCurrentClicked:()=>{}}};var ee,ne,te;D.parameters={...D.parameters,docs:{...(ee=D.parameters)==null?void 0:ee.docs,source:{originalSource:`{
  args: {
    scenes: [],
    activeStoryboardName: null,
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(te=(ne=D.parameters)==null?void 0:ne.docs)==null?void 0:te.source}}};var oe,re,ae;O.parameters={...O.parameters,docs:{...(oe=O.parameters)==null?void 0:oe.docs,source:{originalSource:`{
  args: {
    scenes: [],
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(ae=(re=O.parameters)==null?void 0:re.docs)==null?void 0:ae.source}}};var se,ie,ce;B.parameters={...B.parameters,docs:{...(se=B.parameters)==null?void 0:se.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE.slice(0, 1),
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(ce=(ie=B.parameters)==null?void 0:ie.docs)==null?void 0:ce.source}}};var de,le,ue;V.parameters={...V.parameters,docs:{...(de=V.parameters)==null?void 0:de.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(ue=(le=V.parameters)==null?void 0:le.docs)==null?void 0:ue.source}}};var pe,me,fe;P.parameters={...P.parameters,docs:{...(pe=P.parameters)==null?void 0:pe.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: true,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(fe=(me=P.parameters)==null?void 0:me.docs)==null?void 0:fe.source}}};var he,ge,Se;U.parameters={...U.parameters,docs:{...(he=U.parameters)==null?void 0:he.docs,source:{originalSource:`{
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
}`,...(Se=(ge=U.parameters)==null?void 0:ge.docs)==null?void 0:Se.source}}};var Ce,ye,be;H.parameters={...H.parameters,docs:{...(Ce=H.parameters)==null?void 0:Ce.docs,source:{originalSource:`{
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
}`,...(be=(ye=H.parameters)==null?void 0:ye.docs)==null?void 0:be.source}}};var ve,Re,we;W.parameters={...W.parameters,docs:{...(ve=W.parameters)==null?void 0:ve.docs,source:{originalSource:`{
  name: 'HardBlockModal (missing features)',
  render: () => <HardBlockModal sceneTitle="201435Z APR 26 — Surface contact" reason={HARD_BLOCK_REASON} jumpPastLabel="Jump past this scene" openForEditingLabel="Open for editing" onJumpPast={() => undefined} onOpenForEditing={() => undefined} onDismiss={() => undefined} />
}`,...(we=(Re=W.parameters)==null?void 0:Re.docs)==null?void 0:we.source}}};var ke,Ee,Te;Z.parameters={...Z.parameters,docs:{...(ke=Z.parameters)==null?void 0:ke.docs,source:{originalSource:`{
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
}`,...(Te=(Ee=Z.parameters)==null?void 0:Ee.docs)==null?void 0:Te.source}}};var Ie,Fe,Ne;_.parameters={..._.parameters,docs:{...(Ie=_.parameters)==null?void 0:Ie.docs,source:{originalSource:`{
  parameters: {
    docs: {
      description: {
        story: 'Right-click (or Shift+F10) any row → Delete to remove it; the Undo toast appears, click Undo to restore. Driven by the shared \`useStoryOnlyMockHandlers\` helper (Feature 234, ADR-027).'
      }
    }
  },
  render: () => <InteractiveStoryboardPanel fixture={makeEditFixture({})} />
}`,...(Ne=(Fe=_.parameters)==null?void 0:Fe.docs)==null?void 0:Ne.source}}};var xe,Ae,Me;L.parameters={...L.parameters,docs:{...(xe=L.parameters)==null?void 0:xe.docs,source:{originalSource:`{
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
}`,...(Me=(Ae=L.parameters)==null?void 0:Ae.docs)==null?void 0:Me.source}}};var De,Oe,Be;j.parameters={...j.parameters,docs:{...(De=j.parameters)==null?void 0:De.docs,source:{originalSource:`{
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
}`,...(Be=(Oe=j.parameters)==null?void 0:Oe.docs)==null?void 0:Be.source}}};var Ve,Pe,Ue,He,We;R.parameters={...R.parameters,docs:{...(Ve=R.parameters)==null?void 0:Ve.docs,source:{originalSource:`{
  args: {
    scenes: [],
    activeStoryboardName: null,
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(Ue=(Pe=R.parameters)==null?void 0:Pe.docs)==null?void 0:Ue.source},description:{story:"The empty rail with the primary Capture Scene affordance — the entry\npoint that replaces the legacy `Press Ctrl/Cmd+Alt+C on the map…`\nempty-state copy from #216.",...(We=(He=R.parameters)==null?void 0:He.docs)==null?void 0:We.description}}};var Ze,_e,Le,je,Ge;w.parameters={...w.parameters,docs:{...(Ze=w.parameters)==null?void 0:Ze.docs,source:{originalSource:`{
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
}`,...(Le=(_e=w.parameters)==null?void 0:_e.docs)==null?void 0:Le.source},description:{story:`First-capture inline naming row. Pre-filled with the plot's default
name; analyst can edit, confirm, or cancel without ever leaving the
rail.`,...(Ge=(je=w.parameters)==null?void 0:je.docs)==null?void 0:Ge.description}}};var Je,$e,Ye,qe,ze;k.parameters={...k.parameters,docs:{...(Je=k.parameters)==null?void 0:Je.docs,source:{originalSource:`{
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
}`,...(Ye=($e=k.parameters)==null?void 0:$e.docs)==null?void 0:Ye.source},description:{story:`First-capture naming row, but the analyst typed a name that already
exists on this plot. The inline collision warning fires; Confirm is
disabled until they pick a unique name.`,...(ze=(qe=k.parameters)==null?void 0:qe.docs)==null?void 0:ze.description}}};var Ke,Qe,Xe,en,nn;E.parameters={...E.parameters,docs:{...(Ke=E.parameters)==null?void 0:Ke.docs,source:{originalSource:`{
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
}`,...(Xe=(Qe=E.parameters)==null?void 0:Qe.docs)==null?void 0:Xe.source},description:{story:`Duplicate-timestamp collision banner — Replace / Offset / Cancel.
Anchored in the rail above the existing Scene list. The map and time
controller in the host's central area remain operable.`,...(nn=(en=E.parameters)==null?void 0:en.docs)==null?void 0:nn.description}}};var tn,on,rn,an,sn;T.parameters={...T.parameters,docs:{...(tn=T.parameters)==null?void 0:tn.docs,source:{originalSource:`{
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
}`,...(rn=(on=T.parameters)==null?void 0:on.docs)==null?void 0:rn.source},description:{story:`After 60 Offset presses, the banner replaces the Offset button with
an inline cap-reached message; only Replace and Cancel remain.`,...(sn=(an=T.parameters)==null?void 0:an.docs)==null?void 0:sn.description}}};var cn,dn,ln,un,pn;I.parameters={...I.parameters,docs:{...(cn=I.parameters)==null?void 0:cn.docs,source:{originalSource:`{
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
}`,...(ln=(dn=I.parameters)==null?void 0:dn.docs)==null?void 0:ln.source},description:{story:`FR-CAP-017a — when the next Offset would push past the plot's time
range, the banner replaces the Offset button with the inline
time-range message.`,...(pn=(un=I.parameters)==null?void 0:un.docs)==null?void 0:pn.description}}};var mn,fn,hn,gn,Sn;F.parameters={...F.parameters,docs:{...(mn=F.parameters)==null?void 0:mn.docs,source:{originalSource:`{
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
}`,...(hn=(fn=F.parameters)==null?void 0:fn.docs)==null?void 0:hn.source},description:{story:`Visualises a Scene row with the Update-to-current affordance — the
primary maintenance op that re-anchors a Scene to live state in-row.
Re-uses the #218 visual treatment; included here so the new stories
file references it for E2E.`,...(Sn=(gn=F.parameters)==null?void 0:gn.docs)==null?void 0:Sn.description}}};const Ln=["Empty","EmptyStoryboard","WithOneScene","WithThreeScenes","Capturing","Transport","WithMultipleStoryboards","HardBlockModalStory","WithEditForm","WithUndoToast","WithStaleBadge","WithMissingDataRemediation","EmptyWithCaptureButton","FirstCaptureNamingRow","FirstCaptureNamingRowWithCollision","DuplicateTimestampBanner","DuplicateTimestampBannerOffsetCapped","DuplicateTimestampBannerExceedsTimeRange","RowWithUpdateToCurrent"];export{P as Capturing,E as DuplicateTimestampBanner,I as DuplicateTimestampBannerExceedsTimeRange,T as DuplicateTimestampBannerOffsetCapped,D as Empty,O as EmptyStoryboard,R as EmptyWithCaptureButton,w as FirstCaptureNamingRow,k as FirstCaptureNamingRowWithCollision,W as HardBlockModalStory,F as RowWithUpdateToCurrent,U as Transport,Z as WithEditForm,j as WithMissingDataRemediation,H as WithMultipleStoryboards,B as WithOneScene,L as WithStaleBadge,V as WithThreeScenes,_ as WithUndoToast,Ln as __namedExportsOrder,_n as default};
