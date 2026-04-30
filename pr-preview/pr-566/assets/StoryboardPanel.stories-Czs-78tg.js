import{j as I}from"./jsx-runtime-DF2Pcvd1.js";import{S as Me,H as Ne}from"./HardBlockModal-CYLTrFU0.js";import{r as d}from"./index-B2-qRKKC.js";import"./textfield-Dm39NdvL.js";import"./_commonjsHelpers-Cpj98o6Y.js";function Ae(e){return{sceneRows:[],activeStoryboardId:null,activeStoryboardName:null,storyboards:[],currentSceneId:null,transport:void 0,captureInFlight:!1,theme:"dark",sceneEditViewModelsFromExtension:{},storyboardEditViewModel:null,staleFlags:new Map,pendingUndoToast:null,editFormOpenFor:null,overflowMenuOpenFor:null,overflowMenuAnchorRect:null,...e}}function De(e){const r=new Map;for(const n of e)r.set(n.sceneId,n);return r}function Ve(e,r){switch(r.type){case"scenes-message":{const{scenes:n,activeStoryboardName:s,activeStoryboardId:t,sceneEditViewModels:u,pendingUndoToast:f,storyboardEditViewModel:i}=r.payload,c=e.editFormOpenFor!==null&&n.some(m=>m.sceneId===e.editFormOpenFor)?e.editFormOpenFor:null;return{...e,sceneRows:n,activeStoryboardName:s,activeStoryboardId:t,sceneEditViewModelsFromExtension:u??e.sceneEditViewModelsFromExtension,pendingUndoToast:f===void 0?e.pendingUndoToast:f,storyboardEditViewModel:i===void 0?e.storyboardEditViewModel:i,editFormOpenFor:c}}case"snapshot-message":{const{storyboards:n,scenes:s,activeStoryboardId:t,activeStoryboardName:u,currentSceneId:f,transport:i,sceneEditViewModels:c,pendingUndoToast:m,storyboardEditViewModel:S}=r.payload,w=e.editFormOpenFor!==null&&s.some(l=>l.sceneId===e.editFormOpenFor)?e.editFormOpenFor:null;return{...e,storyboards:n,sceneRows:s,activeStoryboardId:t,activeStoryboardName:u,currentSceneId:f,transport:i,sceneEditViewModelsFromExtension:c??e.sceneEditViewModelsFromExtension,pendingUndoToast:m===void 0?e.pendingUndoToast:m,storyboardEditViewModel:S===void 0?e.storyboardEditViewModel:S,editFormOpenFor:w}}case"scene-edit-form-open":return e.sceneRows.some(n=>n.sceneId===r.sceneId)?{...e,editFormOpenFor:r.sceneId}:e;case"scene-stale-flags-updated":return{...e,staleFlags:De(r.flags)};case"scene-undo-toast-shown":return{...e,pendingUndoToast:r.toast};case"capture-in-flight":return{...e,captureInFlight:r.inFlight};case"theme-changed":return{...e,theme:r.theme};case"expand-row-toggle":{if(!e.sceneRows.some(s=>s.sceneId===r.sceneId))return e;const n=e.editFormOpenFor===r.sceneId?null:r.sceneId;return{...e,editFormOpenFor:n}}case"scene-edit-form-close":return e.editFormOpenFor===null?e:{...e,editFormOpenFor:null};case"scene-undo-toast-dismissed":return e.pendingUndoToast===null?e:{...e,pendingUndoToast:null};case"overflow-menu-open":return e.sceneRows.some(n=>n.sceneId===r.sceneId)?{...e,overflowMenuOpenFor:r.sceneId,overflowMenuAnchorRect:r.anchorRect}:e;case"overflow-menu-close":return e.overflowMenuOpenFor===null?e:{...e,overflowMenuOpenFor:null,overflowMenuAnchorRect:null}}}function Oe(e){const r={};for(const n of e.sceneRows){const s=e.sceneEditViewModelsFromExtension[n.sceneId],t=e.staleFlags.get(n.sceneId),u=e.editFormOpenFor===n.sceneId;s!==void 0?r[n.sceneId]={...s,editFormOpen:u||s.editFormOpen,stale:t!==void 0?t.stale:s.stale,unresolvedFeatureIds:t!==void 0?t.unresolvedFeatureIds:s.unresolvedFeatureIds}:r[n.sceneId]={sceneId:n.sceneId,title:n.title,description:null,timestamp:n.timestampIso,titleIsEditing:!1,editFormOpen:u,pendingDelete:!1,stale:t!==void 0?t.stale:!1,unresolvedFeatureIds:t!==void 0?t.unresolvedFeatureIds:[],missingData:{kind:"ok"}}}return r}function Ue(e){const[r,n]=d.useReducer(Ve,e,Ae),s=d.useCallback(m=>{n({type:"expand-row-toggle",sceneId:m})},[]),t=d.useCallback(()=>{n({type:"scene-edit-form-close"})},[]),u=d.useCallback((m,S)=>{n({type:"overflow-menu-open",sceneId:m,anchorRect:S})},[]),f=d.useCallback(()=>{n({type:"overflow-menu-close"})},[]),i=d.useCallback(()=>{n({type:"scene-undo-toast-dismissed"})},[]),c=Oe(r);return{state:r,dispatch:n,sceneEditViewModels:c,toggleExpandRow:s,closeEditForm:t,openOverflowMenu:u,closeOverflowMenu:f,dismissUndoToast:i}}const Be={canGoBackward:!1,canGoForward:!1,sceneNumber:0,sceneTotal:0,transitionInFlight:!1};function _e(e,r){const n=r.staleSceneIds??[],s=r.pendingDeleteSceneIds??[],t=r.missingDataBySceneId??{},u={},f=[];for(const i of e.scenes){const c=e.sceneEditViewModels[i.sceneId],m=s.includes(i.sceneId),S=t[i.sceneId],w=S&&S.length>0?{kind:"missing-features",ids:S}:(c==null?void 0:c.missingData)??{kind:"ok"};u[i.sceneId]={sceneId:i.sceneId,title:(c==null?void 0:c.title)??i.title,description:(c==null?void 0:c.description)??null,timestamp:(c==null?void 0:c.timestamp)??i.timestampIso,titleIsEditing:!1,editFormOpen:!1,pendingDelete:m,stale:!1,unresolvedFeatureIds:[],missingData:w},n.includes(i.sceneId)&&f.push({sceneId:i.sceneId,stale:!0,unresolvedFeatureIds:["track-alpha","track-bravo"]})}return{sceneEditViewModels:u,staleFlags:f}}function He(e,r={}){const n=Ue(),{state:s,dispatch:t,sceneEditViewModels:u,openOverflowMenu:f,closeOverflowMenu:i,dismissUndoToast:c}=n,m=r.knobs??{},S=r.initial??{},w=r.recordOutbound??Pe,l=d.useRef(s);l.current=s;const E=d.useRef(e);E.current=e;const k=d.useRef(m);k.current=m;const y=d.useRef(w);y.current=w;const P=d.useRef(!1);d.useEffect(()=>{if(P.current)return;P.current=!0;const{sceneEditViewModels:o,staleFlags:a}=_e(e,S);t({type:"snapshot-message",payload:{storyboards:e.storyboards,scenes:e.scenes,activeStoryboardId:e.activeStoryboardId,activeStoryboardName:e.activeStoryboardName,currentSceneId:null,transport:{...Be,sceneTotal:e.scenes.length,canGoForward:e.scenes.length>1},sceneEditViewModels:o,pendingUndoToast:null,storyboardEditViewModel:e.storyboardEditViewModel}}),a.length>0&&t({type:"scene-stale-flags-updated",flags:a})},[]);const Z=d.useCallback(o=>{y.current("scene-delete-requested",{sceneId:o});const a=l.current.sceneRows.find(p=>p.sceneId===o);if(!a)return;const g={sceneId:o,sceneTitle:a.title,deletedAt:new Date().toISOString(),canUndo:!0};t({type:"scene-undo-toast-shown",toast:g});const h=l.current.sceneRows.filter(p=>p.sceneId!==o);t({type:"scenes-message",payload:{scenes:h,activeStoryboardName:l.current.activeStoryboardName,activeStoryboardId:l.current.activeStoryboardId}})},[t]),W=d.useCallback(o=>{y.current("scene-undo-delete-clicked",{sceneId:o}),t({type:"scene-undo-toast-shown",toast:null}),t({type:"scenes-message",payload:{scenes:E.current.scenes,activeStoryboardName:E.current.activeStoryboardName,activeStoryboardId:E.current.activeStoryboardId}})},[t]),L=d.useCallback(o=>{if(k.current.induceRefreshFailure===o){y.current("scene-refresh-failed",{sceneId:o});return}y.current("scene-refresh-thumbnail-clicked",{sceneId:o});const a=[];for(const[g,h]of l.current.staleFlags.entries())g!==o&&a.push(h);t({type:"scene-stale-flags-updated",flags:a})},[t]),j=d.useCallback(o=>{const a=k.current.induceRefreshFailure;if(a!==void 0){y.current("storyboard-refresh-all-stale-partial-failure",{storyboardId:o,failedSceneIds:[a]});const g=[];for(const[h,p]of l.current.staleFlags.entries())h===a&&g.push(p);t({type:"scene-stale-flags-updated",flags:g});return}y.current("storyboard-refresh-all-stale-clicked",{storyboardId:o}),t({type:"scene-stale-flags-updated",flags:[]})},[t]),G=d.useCallback(o=>{if(k.current.induceCopyFailure===o){y.current("scene-copy-to-other-failed",{sceneId:o});return}y.current("scene-copy-to-other-clicked",{sceneId:o})},[]),b=d.useCallback((o,a)=>{y.current(o,a)},[]),xe=d.useMemo(()=>({onCaptureClick:()=>b("capture-clicked",{}),onSceneRowClick:o=>b("scene-row-clicked",{sceneId:o}),onSceneRowExpandToggle:o=>t({type:"expand-row-toggle",sceneId:o}),onSceneOverflowMenuOpen:f,onSceneOverflowMenuClose:i,onSceneEditFormCancel:()=>t({type:"scene-edit-form-close"}),onSceneTitleRenameCommit:(o,a)=>{b("scene-title-rename-committed",{sceneId:o,newTitle:a});const g=l.current.sceneRows.map(p=>p.sceneId===o?{...p,title:a}:p),h={};for(const[p,J]of Object.entries(l.current.sceneEditViewModelsFromExtension))h[p]=p===o?{...J,title:a}:J;t({type:"scene-edit-form-close"}),t({type:"scenes-message",payload:{scenes:g,activeStoryboardName:l.current.activeStoryboardName,activeStoryboardId:l.current.activeStoryboardId,sceneEditViewModels:h}})},onSceneDescriptionSubmit:(o,a)=>{b("scene-description-edit-submitted",{sceneId:o,description:a});const g={};for(const[h,p]of Object.entries(l.current.sceneEditViewModelsFromExtension))g[h]=h===o?{...p,description:a}:p;t({type:"scene-edit-form-close"}),t({type:"scenes-message",payload:{scenes:l.current.sceneRows,activeStoryboardName:l.current.activeStoryboardName,activeStoryboardId:l.current.activeStoryboardId,sceneEditViewModels:g}})},onSceneDeleteRequested:Z,onSceneUndoDeleteClicked:W,onSceneUpdateToCurrentClicked:o=>b("scene-update-to-current-clicked",{sceneId:o}),onSceneDuplicateClicked:o=>b("scene-duplicate-clicked",{sceneId:o}),onSceneCopyToOtherClicked:G,onSceneRefreshThumbnailClicked:L,onStoryboardRefreshAllStaleClicked:j,onStoryboardNameRenameCommit:(o,a)=>b("storyboard-name-rename-committed",{storyboardId:o,newName:a}),onStoryboardDescriptionSubmit:(o,a)=>b("storyboard-description-edit-submitted",{storyboardId:o,description:a}),onUndoToastDismiss:c}),[t,f,i,c,Z,W,L,j,G,b]);return{state:s,dispatch:t,sceneEditViewModels:u,handlers:xe}}function Pe(){}function v(e,r,n){return{sceneId:e,title:n,timestampIso:r,dtgLabel:Ze(r),thumbnailHref:"data:image/svg+xml;utf8,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150"><rect width="200" height="150" fill="#2b5bb0"/><text x="100" y="80" text-anchor="middle" fill="white" font-family="monospace" font-size="14">${e}</text></svg>`),state:{kind:"ok"}}}function Ze(e){const r=new Date(e),n=t=>t.toString().padStart(2,"0"),s=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];return`${n(r.getUTCDate())}${n(r.getUTCHours())}${n(r.getUTCMinutes())}Z ${s[r.getUTCMonth()]} ${n(r.getUTCFullYear()%100)}`}const F=[v("scene-1","2026-04-20T14:00:00.000Z","Exercise start — North channel"),v("scene-2","2026-04-20T14:15:00.000Z","Contact with surface group"),v("scene-3","2026-04-20T14:35:00.000Z","Bearing-only track lock")],en={title:"Panels/StoryboardPanel",component:Me,parameters:{layout:"padded"}},R={args:{scenes:[],activeStoryboardName:null,captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},C={args:{scenes:[],activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},T={args:{scenes:F.slice(0,1),activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},M={args:{scenes:F,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},O={args:{scenes:F,activeStoryboardName:"Exercise Alpha",captureInFlight:!0,onCaptureClick:()=>{},onSceneRowClick:()=>{}}},We={canGoBackward:!1,canGoForward:!0,sceneNumber:1,sceneTotal:3,transitionInFlight:!1},x={args:{scenes:F,activeStoryboardName:"Exercise Alpha",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},currentSceneId:"scene-1",transport:We,onTransportForward:()=>{},onTransportBackward:()=>{}}},Le={kind:"missing-features",missingFeatureIds:["track-nimitz","annotation-bearing-lock"]},je=[{storyboardId:"sb-commander",name:"Commander's view",sceneCount:5,lastModifiedIso:"2026-04-20T15:00:00.000Z"},{storyboardId:"sb-asw",name:"ASW evidence",sceneCount:3,lastModifiedIso:"2026-04-20T14:30:00.000Z"},{storyboardId:"sb-training",name:"Training debrief",sceneCount:2,lastModifiedIso:"2026-04-20T14:00:00.000Z"}],Ge=[v("scene-1","2026-04-20T14:00:00.000Z","Exercise start"),v("scene-2","2026-04-20T14:10:00.000Z","First contact"),v("scene-3","2026-04-20T14:20:00.000Z","Bearing fix"),v("scene-4","2026-04-20T14:30:00.000Z","CPA estimate"),v("scene-5","2026-04-20T14:45:00.000Z","Disengagement")],Je={canGoBackward:!0,canGoForward:!0,sceneNumber:2,sceneTotal:5,transitionInFlight:!1},N={args:{scenes:Ge,activeStoryboardName:"Commander's view",captureInFlight:!1,onCaptureClick:()=>{},onSceneRowClick:()=>{},storyboards:je,activeStoryboardId:"sb-commander",currentSceneId:"scene-2",transport:Je,onActiveStoryboardChange:()=>{},onCreateStoryboard:()=>{},onRenameStoryboard:()=>{},onDeleteStoryboard:()=>{},onTransportForward:()=>{},onTransportBackward:()=>{}}},A={name:"HardBlockModal (missing features)",render:()=>I.jsx(Ne,{sceneTitle:"201435Z APR 26 — Surface contact",reason:Le,jumpPastLabel:"Jump past this scene",openForEditingLabel:"Open for editing",onJumpPast:()=>{},onOpenForEditing:()=>{},onDismiss:()=>{}})},$e={sceneId:"scene-1",title:"Exercise start — North channel",description:null,timestamp:"2026-04-20T14:00:00.000Z",titleIsEditing:!1,editFormOpen:!1,pendingDelete:!1,stale:!1,unresolvedFeatureIds:[],missingData:{kind:"ok"}},Ye={storyboardId:"sb-alpha",name:"Exercise Alpha",description:"Surface-group exercise — North channel",nameIsEditing:!1,descriptionExpanded:!1,sceneCount:F.length};function _(e){const r={};for(const n of F){const s={...$e,sceneId:n.sceneId,title:n.title,timestamp:n.timestampIso};r[n.sceneId]={...s,...e[n.sceneId]}}return{storyboards:[{storyboardId:"sb-alpha",name:"Exercise Alpha",sceneCount:F.length,lastModifiedIso:"2026-04-20T14:35:00.000Z"},{storyboardId:"sb-bravo",name:"Exercise Bravo",sceneCount:0,lastModifiedIso:"2026-04-20T13:00:00.000Z"}],activeStoryboardId:"sb-alpha",activeStoryboardName:"Exercise Alpha",scenes:F,sceneEditViewModels:r,storyboardEditViewModel:Ye}}function H({fixture:e,initial:r,knobs:n}){const{state:s,handlers:t}=He(e,{initial:r,knobs:n}),u=Oe(s);return I.jsx(Me,{scenes:s.sceneRows,activeStoryboardName:s.activeStoryboardName,captureInFlight:s.captureInFlight,storyboards:s.storyboards.length>0?s.storyboards:void 0,activeStoryboardId:s.activeStoryboardId,currentSceneId:s.currentSceneId,transport:s.transport,sceneEditViewModels:u,storyboardEditViewModel:s.storyboardEditViewModel??void 0,pendingUndoToast:s.pendingUndoToast,overflowMenuOpenFor:s.overflowMenuOpenFor,overflowMenuAnchorRect:s.overflowMenuAnchorRect,...t})}const D={parameters:{docs:{description:{story:"Click the chevron on a row to expand its inline edit form. Submit persists the new title via the reducer; Cancel discards. Driven by the shared `useStoryOnlyMockHandlers` helper (Feature 234, ADR-027)."}}},render:()=>I.jsx(H,{fixture:_({"scene-1":{description:"**Brief:** contact gained bearing 023°. Hold course."}})})},V={parameters:{docs:{description:{story:"Right-click (or Shift+F10) any row → Delete to remove it; the Undo toast appears, click Undo to restore. Driven by the shared `useStoryOnlyMockHandlers` helper (Feature 234, ADR-027)."}}},render:()=>I.jsx(H,{fixture:_({})})},U={parameters:{docs:{description:{story:'Scene 2 starts stale; click its overflow → Refresh thumbnail to clear the badge. Toggle the `induceRefreshFailure` arg to "scene-2" to exercise the per-Scene failure branch (FR-043).'}}},argTypes:{induceRefreshFailure:{control:"select",options:[void 0,"scene-1","scene-2","scene-3"],description:"Feature 234 FR-043 — when set, refresh on the matching sceneId routes to the failure branch (badge stays)."}},args:{induceRefreshFailure:void 0},render:e=>I.jsx(H,{fixture:_({}),initial:{staleSceneIds:["scene-2"]},knobs:{induceRefreshFailure:e.induceRefreshFailure}})},B={parameters:{docs:{description:{story:"Scene 3 starts in a missing-features state. Tab through the panel — focus lands on the remediation affordance with a visible focus ring; press Enter to dispatch the remediation action."}}},render:()=>I.jsx(H,{fixture:_({"scene-3":{editFormOpen:!0,missingData:{kind:"missing-features",ids:["track-alpha","track-bravo","track-charlie"]}}}),initial:{missingDataBySceneId:{"scene-3":["track-alpha","track-bravo","track-charlie"]}}})};var $,Y,q;R.parameters={...R.parameters,docs:{...($=R.parameters)==null?void 0:$.docs,source:{originalSource:`{
  args: {
    scenes: [],
    activeStoryboardName: null,
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(q=(Y=R.parameters)==null?void 0:Y.docs)==null?void 0:q.source}}};var z,K,Q;C.parameters={...C.parameters,docs:{...(z=C.parameters)==null?void 0:z.docs,source:{originalSource:`{
  args: {
    scenes: [],
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(Q=(K=C.parameters)==null?void 0:K.docs)==null?void 0:Q.source}}};var X,ee,ne;T.parameters={...T.parameters,docs:{...(X=T.parameters)==null?void 0:X.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE.slice(0, 1),
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(ne=(ee=T.parameters)==null?void 0:ee.docs)==null?void 0:ne.source}}};var re,te,oe;M.parameters={...M.parameters,docs:{...(re=M.parameters)==null?void 0:re.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(oe=(te=M.parameters)==null?void 0:te.docs)==null?void 0:oe.source}}};var se,ae,ce;O.parameters={...O.parameters,docs:{...(se=O.parameters)==null?void 0:se.docs,source:{originalSource:`{
  args: {
    scenes: SCENES_THREE,
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: true,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined
  }
}`,...(ce=(ae=O.parameters)==null?void 0:ae.docs)==null?void 0:ce.source}}};var ie,de,le;x.parameters={...x.parameters,docs:{...(ie=x.parameters)==null?void 0:ie.docs,source:{originalSource:`{
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
}`,...(le=(de=x.parameters)==null?void 0:de.docs)==null?void 0:le.source}}};var ue,pe,me;N.parameters={...N.parameters,docs:{...(ue=N.parameters)==null?void 0:ue.docs,source:{originalSource:`{
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
}`,...(me=(pe=N.parameters)==null?void 0:pe.docs)==null?void 0:me.source}}};var fe,ge,he;A.parameters={...A.parameters,docs:{...(fe=A.parameters)==null?void 0:fe.docs,source:{originalSource:`{
  name: 'HardBlockModal (missing features)',
  render: () => <HardBlockModal sceneTitle="201435Z APR 26 — Surface contact" reason={HARD_BLOCK_REASON} jumpPastLabel="Jump past this scene" openForEditingLabel="Open for editing" onJumpPast={() => undefined} onOpenForEditing={() => undefined} onDismiss={() => undefined} />
}`,...(he=(ge=A.parameters)==null?void 0:ge.docs)==null?void 0:he.source}}};var Se,ye,be;D.parameters={...D.parameters,docs:{...(Se=D.parameters)==null?void 0:Se.docs,source:{originalSource:`{
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
}`,...(be=(ye=D.parameters)==null?void 0:ye.docs)==null?void 0:be.source}}};var ve,Fe,we;V.parameters={...V.parameters,docs:{...(ve=V.parameters)==null?void 0:ve.docs,source:{originalSource:`{
  parameters: {
    docs: {
      description: {
        story: 'Right-click (or Shift+F10) any row → Delete to remove it; the Undo toast appears, click Undo to restore. Driven by the shared \`useStoryOnlyMockHandlers\` helper (Feature 234, ADR-027).'
      }
    }
  },
  render: () => <InteractiveStoryboardPanel fixture={makeEditFixture({})} />
}`,...(we=(Fe=V.parameters)==null?void 0:Fe.docs)==null?void 0:we.source}}};var Ie,Ee,ke;U.parameters={...U.parameters,docs:{...(Ie=U.parameters)==null?void 0:Ie.docs,source:{originalSource:`{
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
}`,...(ke=(Ee=U.parameters)==null?void 0:Ee.docs)==null?void 0:ke.source}}};var Re,Ce,Te;B.parameters={...B.parameters,docs:{...(Re=B.parameters)==null?void 0:Re.docs,source:{originalSource:`{
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
}`,...(Te=(Ce=B.parameters)==null?void 0:Ce.docs)==null?void 0:Te.source}}};const nn=["Empty","EmptyStoryboard","WithOneScene","WithThreeScenes","Capturing","Transport","WithMultipleStoryboards","HardBlockModalStory","WithEditForm","WithUndoToast","WithStaleBadge","WithMissingDataRemediation"];export{O as Capturing,R as Empty,C as EmptyStoryboard,A as HardBlockModalStory,x as Transport,D as WithEditForm,B as WithMissingDataRemediation,N as WithMultipleStoryboards,T as WithOneScene,U as WithStaleBadge,M as WithThreeScenes,V as WithUndoToast,nn as __namedExportsOrder,en as default};
