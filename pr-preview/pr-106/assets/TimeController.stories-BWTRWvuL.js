import{j as t}from"./jsx-runtime-DF2Pcvd1.js";import{r as n}from"./index-B2-qRKKC.js";import{T as J}from"./ThemeProvider-KrJW1DiK.js";import"./_commonjsHelpers-Cpj98o6Y.js";function X(a){const e=new Date(a),r=e.getUTCHours().toString().padStart(2,"0"),i=e.getUTCMinutes().toString().padStart(2,"0"),s=e.getUTCSeconds().toString().padStart(2,"0");return`${r}:${i}:${s}`}function Ut(a,e,r){const i=r-e;if(i<=0)return 0;const s=a-e;return Math.min(100,Math.max(0,s/i*100))}function ee(a,e,r){const i=r-e,s=Math.min(100,Math.max(0,a));return e+s/100*i}function ie(a,e){const r=e-a,i=Math.max(1e3,r/100);return i>=6e4?Math.round(i/6e4)*6e4:i>=1e3?Math.round(i/1e3)*1e3:i}function te(a,e,r){return Math.min(r,Math.max(e,a))}function qt(a){const{timeExtent:e,initialTime:r,initialSpeed:i=1,onTimeChange:s,onPlaybackStateChange:u,frameRate:h=30}=a,g=(e==null?void 0:e[0])??0,y=r??g,[d,o]=n.useState(y),[l,C]=n.useState("paused"),[v,w]=n.useState(i),c=n.useRef(null),f=n.useRef(0);n.useEffect(()=>{e&&o(S=>te(S,e[0],e[1]))},[e]);const p=n.useCallback(S=>{C(S),u==null||u(S)},[u]),m=n.useCallback(S=>{if(!e)return;const N=te(S,e[0],e[1]);o(N),s==null||s(N),N>=e[1]&&p("paused")},[e,s,p]);n.useEffect(()=>{if(l!=="playing"||!e){c.current!==null&&(cancelAnimationFrame(c.current),c.current=null);return}const S=1e3/h,N=v,se=Y=>{f.current===0&&(f.current=Y);const oe=Y-f.current;if(oe>=S){f.current=Y;const It=oe*N;o(Rt=>{const Lt=Rt+It,Z=te(Lt,e[0],e[1]);return s==null||s(Z),Z>=e[1]?(p("paused"),e[1]):Z})}c.current=requestAnimationFrame(se)};return f.current=0,c.current=requestAnimationFrame(se),()=>{c.current!==null&&(cancelAnimationFrame(c.current),c.current=null)}},[l,e,v,h,s,p]);const k=n.useCallback(()=>{e&&(d>=e[1]&&m(e[0]),p("playing"))},[e,d,m,p]),b=n.useCallback(()=>{p("paused")},[p]),P=n.useCallback(()=>{l==="playing"?b():k()},[l,k,b]),_=n.useCallback(S=>{w(S)},[]),E=n.useCallback(()=>{if(!e)return;const S=ie(e[0],e[1]);m(d+S)},[e,d,m]),j=n.useCallback(()=>{if(!e)return;const S=ie(e[0],e[1]);m(d-S)},[e,d,m]),A=e?d<=e[0]:!0,Q=e?d>=e[1]:!0;return{currentTime:d,setCurrentTime:m,playbackState:l,play:k,pause:b,togglePlayback:P,speed:v,setSpeed:_,scrubForward:E,scrubBackward:j,atStart:A,atEnd:Q}}function Mt({time:a,className:e}){const r=X(a);return t.jsx("div",{className:`debrief-time-display ${e??""}`,"aria-label":`Current time: ${r}`,"aria-live":"polite",children:t.jsx("span",{className:"debrief-time-display__value",children:r})})}Mt.__docgenInfo={description:"Displays the current time position in HH:MM:SS format.\n\n@example\n```tsx\n<TimeDisplay time={currentTime} />\n```",methods:[],displayName:"TimeDisplay",props:{time:{required:!0,tsType:{name:"number"},description:"Current time in milliseconds since epoch"},className:{required:!1,tsType:{name:"string"},description:"CSS class name"}}};function Dt({timeExtent:a,currentTime:e,onTimeChange:r,disabled:i=!1,className:s}){const u=n.useRef(null),[h,g]=n.useState(!1),[y,d]=a,o=Ut(e,y,d),l=n.useCallback(c=>{const f=u.current;if(!f)return e;const p=f.getBoundingClientRect(),m=c.clientX-p.left,k=p.width,b=m/k*100;return ee(b,y,d)},[y,d,e]),C=n.useCallback(c=>{if(i)return;const f=l(c);r(f)},[i,l,r]),v=n.useCallback(c=>{if(i)return;c.preventDefault(),g(!0);const f=m=>{const k=l(m);r(k)},p=()=>{g(!1),document.removeEventListener("mousemove",f),document.removeEventListener("mouseup",p)};document.addEventListener("mousemove",f),document.addEventListener("mouseup",p)},[i,l,r]),w=n.useCallback(c=>{if(i)return;g(!0);const f=b=>{const P=b.touches[0],_=u.current;if(!_||!P)return e;const E=_.getBoundingClientRect(),j=P.clientX-E.left,A=E.width,Q=j/A*100;return ee(Q,y,d)},p=b=>{b.preventDefault();const P=f(b);r(P)},m=()=>{g(!1),document.removeEventListener("touchmove",p),document.removeEventListener("touchend",m)};document.addEventListener("touchmove",p,{passive:!1}),document.addEventListener("touchend",m);const k=c.touches[0];if(k){const b=u.current;if(b){const P=b.getBoundingClientRect(),_=k.clientX-P.left,E=P.width,j=_/E*100,A=ee(j,y,d);r(A)}}},[i,y,d,e,r]);return t.jsxs("div",{className:`debrief-time-scrubber ${i?"debrief-time-scrubber--disabled":""} ${h?"debrief-time-scrubber--dragging":""} ${s??""}`,"aria-label":"Time scrubber","aria-valuemin":y,"aria-valuemax":d,"aria-valuenow":e,"aria-valuetext":X(e),role:"slider",tabIndex:i?-1:0,children:[t.jsxs("div",{className:"debrief-time-scrubber__labels",children:[t.jsx("span",{className:"debrief-time-scrubber__label debrief-time-scrubber__label--start",children:X(y)}),t.jsx("span",{className:"debrief-time-scrubber__label debrief-time-scrubber__label--end",children:X(d)})]}),t.jsxs("div",{ref:u,className:"debrief-time-scrubber__track",onClick:C,onMouseDown:v,onTouchStart:w,children:[t.jsx("div",{className:"debrief-time-scrubber__fill",style:{width:`${o}%`}}),t.jsx("div",{className:"debrief-time-scrubber__thumb",style:{left:`${o}%`},"aria-hidden":"true"})]})]})}Dt.__docgenInfo={description:`A draggable time scrubber for navigating through a time range.

@example
\`\`\`tsx
<TimeScrubber
  timeExtent={[startTime, endTime]}
  currentTime={currentTime}
  onTimeChange={setCurrentTime}
/>
\`\`\``,methods:[],displayName:"TimeScrubber",props:{timeExtent:{required:!0,tsType:{name:"tuple",raw:"[number, number]",elements:[{name:"number"},{name:"number"}]},description:"Time range [start, end] in milliseconds since epoch"},currentTime:{required:!0,tsType:{name:"number"},description:"Current time position"},onTimeChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(time: number) => void",signature:{arguments:[{type:{name:"number"},name:"time"}],return:{name:"void"}}},description:"Callback when time changes via scrubbing"},disabled:{required:!1,tsType:{name:"boolean"},description:"Whether the scrubber is disabled",defaultValue:{value:"false",computed:!1}},className:{required:!1,tsType:{name:"string"},description:"CSS class name"}}};function jt({playbackState:a,onToggle:e,disabled:r=!1,className:i}){const s=a==="playing";return t.jsx("button",{type:"button",className:`debrief-playback-controls ${s?"debrief-playback-controls--playing":"debrief-playback-controls--paused"} ${r?"debrief-playback-controls--disabled":""} ${i??""}`,onClick:e,disabled:r,"aria-label":s?"Pause":"Play",title:s?"Pause (Space)":"Play (Space)",children:s?t.jsxs("svg",{className:"debrief-playback-controls__icon",viewBox:"0 0 24 24",fill:"currentColor","aria-hidden":"true",children:[t.jsx("rect",{x:"6",y:"4",width:"4",height:"16",rx:"1"}),t.jsx("rect",{x:"14",y:"4",width:"4",height:"16",rx:"1"})]}):t.jsx("svg",{className:"debrief-playback-controls__icon",viewBox:"0 0 24 24",fill:"currentColor","aria-hidden":"true",children:t.jsx("path",{d:"M8 5v14l11-7z"})})})}jt.__docgenInfo={description:`Play/Pause button for controlling time playback.

@example
\`\`\`tsx
<PlaybackControls
  playbackState={playbackState}
  onToggle={togglePlayback}
/>
\`\`\``,methods:[],displayName:"PlaybackControls",props:{playbackState:{required:!0,tsType:{name:"union",raw:"'playing' | 'paused'",elements:[{name:"literal",value:"'playing'"},{name:"literal",value:"'paused'"}]},description:"Current playback state"},onToggle:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:"Callback to toggle playback"},disabled:{required:!1,tsType:{name:"boolean"},description:"Whether controls are disabled",defaultValue:{value:"false",computed:!1}},className:{required:!1,tsType:{name:"string"},description:"CSS class name"}}};const M=[1,2,4,8];function At({speed:a,onSpeedChange:e,disabled:r=!1,className:i}){const[s,u]=n.useState(!1),h=n.useRef(null);n.useEffect(()=>{const o=l=>{h.current&&!h.current.contains(l.target)&&u(!1)};if(s)return document.addEventListener("click",o),()=>document.removeEventListener("click",o)},[s]),n.useEffect(()=>{const o=l=>{l.key==="Escape"&&s&&u(!1)};return document.addEventListener("keydown",o),()=>document.removeEventListener("keydown",o)},[s]);const g=n.useCallback(()=>{r||u(o=>!o)},[r]),y=n.useCallback(o=>{e(o),u(!1)},[e]),d=n.useCallback(o=>{if(!r){if(o.key==="Enter"||o.key===" ")o.preventDefault(),u(l=>!l);else if(o.key==="ArrowDown"&&s){o.preventDefault();const l=M.indexOf(a),C=Math.min(l+1,M.length-1),v=M[C];v!==void 0&&e(v)}else if(o.key==="ArrowUp"&&s){o.preventDefault();const l=M.indexOf(a),C=Math.max(l-1,0),v=M[C];v!==void 0&&e(v)}}},[r,s,a,e]);return t.jsxs("div",{ref:h,className:`debrief-speed-selector ${s?"debrief-speed-selector--open":""} ${r?"debrief-speed-selector--disabled":""} ${i??""}`,children:[t.jsxs("button",{type:"button",className:"debrief-speed-selector__button",onClick:g,onKeyDown:d,disabled:r,"aria-haspopup":"listbox","aria-expanded":s,"aria-label":`Playback speed: ${a}x`,children:[t.jsxs("span",{className:"debrief-speed-selector__value",children:[a,"x"]}),t.jsx("svg",{className:"debrief-speed-selector__arrow",viewBox:"0 0 24 24",fill:"currentColor","aria-hidden":"true",children:t.jsx("path",{d:"M7 10l5 5 5-5z"})})]}),s&&t.jsx("ul",{className:"debrief-speed-selector__dropdown",role:"listbox",children:M.map(o=>t.jsxs("li",{className:`debrief-speed-selector__option ${o===a?"debrief-speed-selector__option--selected":""}`,role:"option","aria-selected":o===a,onClick:()=>y(o),children:[o,"x"]},o))})]})}At.__docgenInfo={description:`Dropdown selector for playback speed (1x, 2x, 4x, 8x).

@example
\`\`\`tsx
<SpeedSelector
  speed={speed}
  onSpeedChange={setSpeed}
/>
\`\`\``,methods:[],displayName:"SpeedSelector",props:{speed:{required:!0,tsType:{name:"union",raw:"1 | 2 | 4 | 8",elements:[{name:"literal",value:"1"},{name:"literal",value:"2"},{name:"literal",value:"4"},{name:"literal",value:"8"}]},description:"Current speed"},onSpeedChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(speed: PlaybackSpeed) => void",signature:{arguments:[{type:{name:"union",raw:"1 | 2 | 4 | 8",elements:[{name:"literal",value:"1"},{name:"literal",value:"2"},{name:"literal",value:"4"},{name:"literal",value:"8"}]},name:"speed"}],return:{name:"void"}}},description:"Callback when speed changes"},disabled:{required:!1,tsType:{name:"boolean"},description:"Whether selector is disabled",defaultValue:{value:"false",computed:!1}},className:{required:!1,tsType:{name:"string"},description:"CSS class name"}}};function Nt({mode:a,onModeChange:e,disabled:r=!1,className:i}){const s=a==="trail",u=n.useCallback(()=>{r||e(a==="full"?"trail":"full")},[r,a,e]),h=n.useCallback(g=>{r||(g.key==="Enter"||g.key===" ")&&(g.preventDefault(),u())},[r,u]);return t.jsxs("div",{className:`debrief-display-mode-toggle ${r?"debrief-display-mode-toggle--disabled":""} ${i??""}`,children:[t.jsx("span",{className:`debrief-display-mode-toggle__label ${s?"":"debrief-display-mode-toggle__label--active"}`,children:"Full"}),t.jsx("button",{type:"button",role:"switch","aria-checked":s,"aria-label":`Track display mode: ${a}`,className:`debrief-display-mode-toggle__switch ${s?"debrief-display-mode-toggle__switch--trail":""}`,onClick:u,onKeyDown:h,disabled:r,children:t.jsx("span",{className:"debrief-display-mode-toggle__thumb"})}),t.jsx("span",{className:`debrief-display-mode-toggle__label ${s?"debrief-display-mode-toggle__label--active":""}`,children:"Trail"})]})}Nt.__docgenInfo={description:`Toggle switch for track display mode (Full vs Trail).
- Full: Shows entire track regardless of time position
- Trail: Shows track history from start up to current time position

@example
\`\`\`tsx
<DisplayModeToggle
  mode={displayMode}
  onModeChange={setDisplayMode}
/>
\`\`\``,methods:[],displayName:"DisplayModeToggle",props:{mode:{required:!0,tsType:{name:"union",raw:"'full' | 'trail'",elements:[{name:"literal",value:"'full'"},{name:"literal",value:"'trail'"}]},description:"Current display mode"},onModeChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(mode: DisplayMode) => void",signature:{arguments:[{type:{name:"union",raw:"'full' | 'trail'",elements:[{name:"literal",value:"'full'"},{name:"literal",value:"'trail'"}]},name:"mode"}],return:{name:"void"}}},description:"Callback when mode changes"},disabled:{required:!1,tsType:{name:"boolean"},description:"Whether toggle is disabled",defaultValue:{value:"false",computed:!1}},className:{required:!1,tsType:{name:"string"},description:"CSS class name"}}};function re({timeExtent:a=null,initialTime:e,initialSpeed:r=1,initialDisplayMode:i="full",onTimeChange:s,onPlaybackStateChange:u,onDisplayModeChange:h,uiState:g,className:y,style:d}){const o=n.useRef(null),[l,C]=n.useState(i),v=g??(a?"ready":"empty"),w=v!=="ready",c=qt({timeExtent:a,initialTime:e,initialSpeed:r,onTimeChange:s,onPlaybackStateChange:u}),f=n.useCallback(m=>{C(m),h==null||h(m)},[h]);n.useEffect(()=>{const m=o.current;if(!m||w)return;const k=b=>{if(m.contains(document.activeElement))switch(b.key){case" ":b.preventDefault(),c.togglePlayback();break;case"ArrowRight":b.preventDefault(),c.scrubForward();break;case"ArrowLeft":b.preventDefault(),c.scrubBackward();break}};return m.addEventListener("keydown",k),()=>m.removeEventListener("keydown",k)},[w,c]);const p=n.useCallback(m=>{c.playbackState==="playing"&&c.pause(),c.setCurrentTime(m)},[c]);return v==="empty"?t.jsx("div",{ref:o,className:`debrief-time-controller debrief-time-controller--empty ${y??""}`,style:d,children:t.jsx("div",{className:"debrief-time-controller__empty-message",children:"No data loaded"})}):v==="loading"?t.jsx("div",{ref:o,className:`debrief-time-controller debrief-time-controller--loading ${y??""}`,style:d,children:t.jsx("div",{className:"debrief-time-controller__loading-message",children:"Loading..."})}):t.jsxs("div",{ref:o,className:`debrief-time-controller debrief-time-controller--ready ${y??""}`,style:d,tabIndex:0,role:"region","aria-label":"Time Controller",children:[t.jsx("div",{className:"debrief-time-controller__row debrief-time-controller__row--display",children:t.jsx(Mt,{time:c.currentTime})}),t.jsx("div",{className:"debrief-time-controller__row debrief-time-controller__row--scrubber",children:t.jsx(Dt,{timeExtent:a,currentTime:c.currentTime,onTimeChange:p,disabled:w})}),t.jsxs("div",{className:"debrief-time-controller__row debrief-time-controller__row--controls",children:[t.jsx(jt,{playbackState:c.playbackState,onToggle:c.togglePlayback,disabled:w}),t.jsx(Nt,{mode:l,onModeChange:f,disabled:w}),t.jsx(At,{speed:c.speed,onSpeedChange:c.setSpeed,disabled:w})]})]})}re.__docgenInfo={description:`Time controller component for VS Code extension sidebar.

Layout:
- Row 1: Time display (current position)
- Row 2: Time scrubber (full width)
- Row 3: Play/Pause | Full/Trail toggle | Speed selector

@example
\`\`\`tsx
<TimeController
  timeExtent={[startTime, endTime]}
  onTimeChange={(time) => updateMapToTime(time)}
  onDisplayModeChange={(mode) => setTrackDisplayMode(mode)}
/>
\`\`\``,methods:[],displayName:"TimeController",props:{timeExtent:{required:!1,tsType:{name:"union",raw:"TimeExtent | null",elements:[{name:"tuple",raw:"[number, number]",elements:[{name:"number"},{name:"number"}]},{name:"null"}]},description:"Time range [start, end] in milliseconds since epoch",defaultValue:{value:"null",computed:!1}},initialTime:{required:!1,tsType:{name:"number"},description:"Initial time position (defaults to start of range)"},initialSpeed:{required:!1,tsType:{name:"union",raw:"1 | 2 | 4 | 8",elements:[{name:"literal",value:"1"},{name:"literal",value:"2"},{name:"literal",value:"4"},{name:"literal",value:"8"}]},description:"Initial playback speed (defaults to 1)",defaultValue:{value:"1",computed:!1}},initialDisplayMode:{required:!1,tsType:{name:"union",raw:"'full' | 'trail'",elements:[{name:"literal",value:"'full'"},{name:"literal",value:"'trail'"}]},description:"Initial display mode (defaults to 'full')",defaultValue:{value:"'full'",computed:!1}},onTimeChange:{required:!1,tsType:{name:"signature",type:"function",raw:"(time: number) => void",signature:{arguments:[{type:{name:"number"},name:"time"}],return:{name:"void"}}},description:"Callback when time position changes"},onPlaybackStateChange:{required:!1,tsType:{name:"signature",type:"function",raw:"(state: PlaybackState) => void",signature:{arguments:[{type:{name:"union",raw:"'playing' | 'paused'",elements:[{name:"literal",value:"'playing'"},{name:"literal",value:"'paused'"}]},name:"state"}],return:{name:"void"}}},description:"Callback when playback state changes"},onDisplayModeChange:{required:!1,tsType:{name:"signature",type:"function",raw:"(mode: DisplayMode) => void",signature:{arguments:[{type:{name:"union",raw:"'full' | 'trail'",elements:[{name:"literal",value:"'full'"},{name:"literal",value:"'trail'"}]},name:"mode"}],return:{name:"void"}}},description:"Callback when display mode changes"},uiState:{required:!1,tsType:{name:"union",raw:"'empty' | 'loading' | 'ready'",elements:[{name:"literal",value:"'empty'"},{name:"literal",value:"'loading'"},{name:"literal",value:"'ready'"}]},description:"UI state override (for loading states)"},className:{required:!1,tsType:{name:"string"},description:"CSS class name"},style:{required:!1,tsType:{name:"ReactCSSProperties",raw:"React.CSSProperties"},description:"Inline styles"}}};const D=Date.now(),ne=60*60*1e3,ae=[D,D+ne],x=[D,D+8*ne],Gt=[D,D+24*ne],Kt={title:"Components/TimeController",component:re,parameters:{layout:"centered",docs:{description:{component:`
Time controller component for navigating through time-stamped track data.

## Features

- **Time Scrubber**: Drag or click to navigate to any point in time
- **Play/Pause**: Animate tracks forward through time
- **Speed Control**: 1x, 2x, 4x, 8x playback speeds
- **Keyboard Shortcuts**: Space (play/pause), Arrow keys (scrub)
- **Display Mode**: Toggle between Full track and Trail mode

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Toggle play/pause |
| Right Arrow | Scrub forward |
| Left Arrow | Scrub backward |

## Usage

\`\`\`tsx
import { TimeController } from '@debrief/components';

<TimeController
  timeExtent={[startTime, endTime]}
  onTimeChange={(time) => updateMapToTime(time)}
  onDisplayModeChange={(mode) => setTrackDisplayMode(mode)}
/>
\`\`\`
        `}}},tags:["autodocs"],argTypes:{timeExtent:{description:"Time range [start, end] in milliseconds since epoch",control:!1},initialSpeed:{description:"Initial playback speed",control:{type:"select"},options:[1,2,4,8]},initialDisplayMode:{description:"Initial display mode",control:{type:"radio"},options:["full","trail"]},uiState:{description:"Override UI state for testing",control:{type:"radio"},options:["empty","loading","ready"]}},decorators:[(a,e)=>{const r=e.globals.theme||"dark";return t.jsx(J,{theme:{variant:r},children:t.jsx("div",{style:{width:300,padding:16},children:t.jsx(a,{})})})}]};function T(a){var o;const[e,r]=n.useState(((o=a.timeExtent)==null?void 0:o[0])??0),[i,s]=n.useState("paused"),[u,h]=n.useState("full"),g=n.useCallback(l=>{r(l),console.log("Time changed:",new Date(l).toISOString())},[]),y=n.useCallback(l=>{s(l),console.log("Playback state:",l)},[]),d=n.useCallback(l=>{h(l),console.log("Display mode:",l)},[]);return t.jsxs("div",{children:[t.jsx(re,{...a,onTimeChange:g,onPlaybackStateChange:y,onDisplayModeChange:d}),t.jsxs("div",{style:{marginTop:16,fontSize:12,color:"#808080"},children:[t.jsxs("div",{children:["Time: ",new Date(e).toISOString()]}),t.jsxs("div",{children:["Playback: ",i]}),t.jsxs("div",{children:["Display: ",u]})]})]})}const I={render:()=>t.jsx(T,{timeExtent:x})},R={args:{timeExtent:null},parameters:{docs:{description:{story:'When no track data is loaded, the controller shows a disabled state with "No data loaded" message.'}}}},L={args:{timeExtent:x,uiState:"loading"},parameters:{docs:{description:{story:'While track data is loading, the controller shows a "Loading..." message.'}}}},U={render:()=>t.jsx(T,{timeExtent:x}),parameters:{docs:{description:{story:"When track data is loaded, all controls become active and usable."}}}},q={render:()=>t.jsx(T,{timeExtent:x}),parameters:{docs:{description:{story:`
### User Story 1: Manual Time Navigation (Priority: P1)

**Goal**: Analysts can manually navigate to specific points in time.

**How to test**:
1. Drag the time scrubber thumb left or right
2. Click anywhere on the scrubber track
3. Observe the time display updates immediately

**Acceptance Criteria**:
- Time display shows HH:MM:SS format
- Scrubber responds to drag and click
- Time range boundaries (start/end) are visible
        `}}}},G={render:()=>t.jsx(T,{timeExtent:ae}),parameters:{docs:{description:{story:"With a short time range (1 hour), the scrubber still functions with appropriate granularity."}}}},$={render:()=>t.jsx(T,{timeExtent:Gt}),parameters:{docs:{description:{story:"With a long time range (24 hours), the scrubber allows navigation across the full range."}}}},O={render:()=>t.jsx(T,{timeExtent:ae}),parameters:{docs:{description:{story:`
### User Story 2: Animated Playback (Priority: P2)

**Goal**: Analysts can watch tracks evolve over time.

**How to test**:
1. Click the Play button (triangle icon)
2. Watch the time advance and scrubber move
3. Click Pause to stop playback
4. Let it play to the end - it auto-pauses

**Acceptance Criteria**:
- Play button starts time progression
- Pause button stops immediately
- Auto-pause at end of range
        `}}}},H={render:()=>t.jsx(T,{timeExtent:ae,initialSpeed:4}),parameters:{docs:{description:{story:`
### User Story 3: Playback Speed Control (Priority: P3)

**Goal**: Analysts can adjust playback speed.

**How to test**:
1. Click the speed dropdown (shows "4x" initially)
2. Select a different speed (1x, 2x, 4x, 8x)
3. Start playback and observe the speed change

**Acceptance Criteria**:
- Dropdown shows current speed
- All speed options available
- Speed change takes effect immediately
        `}}}},F={render:()=>t.jsxs("div",{children:[t.jsxs("p",{style:{marginBottom:8,fontSize:12,color:"#808080"},children:["Click the controller, then use keyboard shortcuts:",t.jsx("br",{}),t.jsx("strong",{children:"Space"})," = Play/Pause | ",t.jsx("strong",{children:"Arrow keys"})," = Scrub"]}),t.jsx(T,{timeExtent:x})]}),parameters:{docs:{description:{story:`
### User Story 4: Keyboard-Driven Control (Priority: P4)

**Goal**: Power users can control playback via keyboard.

**How to test**:
1. Click the controller to give it focus
2. Press Space to toggle play/pause
3. Press Right Arrow to scrub forward
4. Press Left Arrow to scrub backward

**Keyboard Shortcuts**:
| Key | Action |
|-----|--------|
| Space | Toggle play/pause |
| Right Arrow | Scrub forward |
| Left Arrow | Scrub backward |
        `}}}},K={render:()=>t.jsx(T,{timeExtent:x,initialDisplayMode:"trail"}),parameters:{docs:{description:{story:`
### Display Mode Toggle

**Full mode**: Shows the entire track path regardless of current time position.

**Trail mode**: Shows only the track history from the start up to the current time position (like a "snail trail").

The toggle switch in the center of the controls row switches between modes.
        `}}}},W={render:()=>t.jsx(J,{theme:{variant:"light"},children:t.jsx("div",{style:{width:300,padding:16,background:"#f5f5f5"},children:t.jsx(T,{timeExtent:x})})}),parameters:{docs:{description:{story:"Time controller styled for light theme environments."}}}},V={render:()=>t.jsx(J,{theme:{variant:"dark"},children:t.jsx("div",{style:{width:300,padding:16,background:"#1e1e1e"},children:t.jsx(T,{timeExtent:x})})}),parameters:{docs:{description:{story:"Time controller styled for dark theme environments (default)."}}}},B={render:()=>t.jsx(J,{theme:{variant:"vscode"},children:t.jsx("div",{style:{width:300,padding:16,background:"#1e1e1e"},children:t.jsx(T,{timeExtent:x})})}),parameters:{docs:{description:{story:"Time controller styled for VS Code sidebar integration."}}}},z={render:()=>{const[a,e]=n.useState(x[0]);return t.jsxs("div",{children:[t.jsxs("div",{style:{marginBottom:8,fontSize:12,color:"#808080"},children:["Current: ",new Date(a).toISOString()]}),t.jsx("div",{style:{padding:"0 8px"}})]})},parameters:{docs:{description:{story:"Sub-components like TimeScrubber, PlaybackControls, and SpeedSelector can be imported individually for custom layouts."}}}};var le,ce,de,me,ue;I.parameters={...I.parameters,docs:{...(le=I.parameters)==null?void 0:le.docs,source:{originalSource:`{
  render: () => <InteractiveTimeController timeExtent={MEDIUM_RANGE} />
}`,...(de=(ce=I.parameters)==null?void 0:ce.docs)==null?void 0:de.source},description:{story:`Default time controller with an 8-hour time range.
Try dragging the scrubber, clicking play, and adjusting speed.`,...(ue=(me=I.parameters)==null?void 0:me.docs)==null?void 0:ue.description}}};var pe,ye,be,he,ge;R.parameters={...R.parameters,docs:{...(pe=R.parameters)==null?void 0:pe.docs,source:{originalSource:`{
  args: {
    timeExtent: null
  },
  parameters: {
    docs: {
      description: {
        story: 'When no track data is loaded, the controller shows a disabled state with "No data loaded" message.'
      }
    }
  }
}`,...(be=(ye=R.parameters)==null?void 0:ye.docs)==null?void 0:be.source},description:{story:"Empty state shown when no track data is loaded.",...(ge=(he=R.parameters)==null?void 0:he.docs)==null?void 0:ge.description}}};var fe,ve,Se,ke,Te;L.parameters={...L.parameters,docs:{...(fe=L.parameters)==null?void 0:fe.docs,source:{originalSource:`{
  args: {
    timeExtent: MEDIUM_RANGE,
    uiState: 'loading'
  },
  parameters: {
    docs: {
      description: {
        story: 'While track data is loading, the controller shows a "Loading..." message.'
      }
    }
  }
}`,...(Se=(ve=L.parameters)==null?void 0:ve.docs)==null?void 0:Se.source},description:{story:"Loading state shown while track data is being processed.",...(Te=(ke=L.parameters)==null?void 0:ke.docs)==null?void 0:Te.description}}};var we,xe,Ce,Pe,_e;U.parameters={...U.parameters,docs:{...(we=U.parameters)==null?void 0:we.docs,source:{originalSource:`{
  render: () => <InteractiveTimeController timeExtent={MEDIUM_RANGE} />,
  parameters: {
    docs: {
      description: {
        story: 'When track data is loaded, all controls become active and usable.'
      }
    }
  }
}`,...(Ce=(xe=U.parameters)==null?void 0:xe.docs)==null?void 0:Ce.source},description:{story:"Ready state with all controls active.",...(_e=(Pe=U.parameters)==null?void 0:Pe.docs)==null?void 0:_e.description}}};var Ee,Me,De,je,Ae;q.parameters={...q.parameters,docs:{...(Ee=q.parameters)==null?void 0:Ee.docs,source:{originalSource:`{
  render: () => <InteractiveTimeController timeExtent={MEDIUM_RANGE} />,
  parameters: {
    docs: {
      description: {
        story: \`
### User Story 1: Manual Time Navigation (Priority: P1)

**Goal**: Analysts can manually navigate to specific points in time.

**How to test**:
1. Drag the time scrubber thumb left or right
2. Click anywhere on the scrubber track
3. Observe the time display updates immediately

**Acceptance Criteria**:
- Time display shows HH:MM:SS format
- Scrubber responds to drag and click
- Time range boundaries (start/end) are visible
        \`
      }
    }
  }
}`,...(De=(Me=q.parameters)==null?void 0:Me.docs)==null?void 0:De.source},description:{story:`**User Story 1: Manual Time Navigation (P1)**

An analyst can manually navigate to specific points in time by:
- Dragging the time scrubber
- Clicking anywhere on the scrubber track

The time display updates immediately to show the current position.`,...(Ae=(je=q.parameters)==null?void 0:je.docs)==null?void 0:Ae.description}}};var Ne,Ie,Re,Le,Ue;G.parameters={...G.parameters,docs:{...(Ne=G.parameters)==null?void 0:Ne.docs,source:{originalSource:`{
  render: () => <InteractiveTimeController timeExtent={SHORT_RANGE} />,
  parameters: {
    docs: {
      description: {
        story: 'With a short time range (1 hour), the scrubber still functions with appropriate granularity.'
      }
    }
  }
}`,...(Re=(Ie=G.parameters)==null?void 0:Ie.docs)==null?void 0:Re.source},description:{story:"Short time range (1 hour) - tests granular scrubbing.",...(Ue=(Le=G.parameters)==null?void 0:Le.docs)==null?void 0:Ue.description}}};var qe,Ge,$e,Oe,He;$.parameters={...$.parameters,docs:{...(qe=$.parameters)==null?void 0:qe.docs,source:{originalSource:`{
  render: () => <InteractiveTimeController timeExtent={LONG_RANGE} />,
  parameters: {
    docs: {
      description: {
        story: 'With a long time range (24 hours), the scrubber allows navigation across the full range.'
      }
    }
  }
}`,...($e=(Ge=$.parameters)==null?void 0:Ge.docs)==null?void 0:$e.source},description:{story:"Long time range (24 hours) - tests navigation across large spans.",...(He=(Oe=$.parameters)==null?void 0:Oe.docs)==null?void 0:He.description}}};var Fe,Ke,We,Ve,Be;O.parameters={...O.parameters,docs:{...(Fe=O.parameters)==null?void 0:Fe.docs,source:{originalSource:`{
  render: () => <InteractiveTimeController timeExtent={SHORT_RANGE} />,
  parameters: {
    docs: {
      description: {
        story: \`
### User Story 2: Animated Playback (Priority: P2)

**Goal**: Analysts can watch tracks evolve over time.

**How to test**:
1. Click the Play button (triangle icon)
2. Watch the time advance and scrubber move
3. Click Pause to stop playback
4. Let it play to the end - it auto-pauses

**Acceptance Criteria**:
- Play button starts time progression
- Pause button stops immediately
- Auto-pause at end of range
        \`
      }
    }
  }
}`,...(We=(Ke=O.parameters)==null?void 0:Ke.docs)==null?void 0:We.source},description:{story:`**User Story 2: Animated Playback (P2)**

An analyst can watch tracks evolve over time by:
- Clicking the Play button to start animation
- Clicking Pause to stop at any point

Playback automatically pauses when reaching the end of the time range.`,...(Be=(Ve=O.parameters)==null?void 0:Ve.docs)==null?void 0:Be.description}}};var ze,Xe,Je,Qe,Ye;H.parameters={...H.parameters,docs:{...(ze=H.parameters)==null?void 0:ze.docs,source:{originalSource:`{
  render: () => <InteractiveTimeController timeExtent={SHORT_RANGE} initialSpeed={4} />,
  parameters: {
    docs: {
      description: {
        story: \`
### User Story 3: Playback Speed Control (Priority: P3)

**Goal**: Analysts can adjust playback speed.

**How to test**:
1. Click the speed dropdown (shows "4x" initially)
2. Select a different speed (1x, 2x, 4x, 8x)
3. Start playback and observe the speed change

**Acceptance Criteria**:
- Dropdown shows current speed
- All speed options available
- Speed change takes effect immediately
        \`
      }
    }
  }
}`,...(Je=(Xe=H.parameters)==null?void 0:Xe.docs)==null?void 0:Je.source},description:{story:`**User Story 3: Playback Speed Control (P3)**

An analyst can adjust playback speed to:
- Speed up through uneventful periods (4x, 8x)
- Slow down for detailed observation (1x, 2x)

Speed options: 1x, 2x, 4x, 8x real-time.`,...(Ye=(Qe=H.parameters)==null?void 0:Qe.docs)==null?void 0:Ye.description}}};var Ze,et,tt,rt,nt;F.parameters={...F.parameters,docs:{...(Ze=F.parameters)==null?void 0:Ze.docs,source:{originalSource:`{
  render: () => <div>
      <p style={{
      marginBottom: 8,
      fontSize: 12,
      color: '#808080'
    }}>
        Click the controller, then use keyboard shortcuts:
        <br />
        <strong>Space</strong> = Play/Pause | <strong>Arrow keys</strong> = Scrub
      </p>
      <InteractiveTimeController timeExtent={MEDIUM_RANGE} />
    </div>,
  parameters: {
    docs: {
      description: {
        story: \`
### User Story 4: Keyboard-Driven Control (Priority: P4)

**Goal**: Power users can control playback via keyboard.

**How to test**:
1. Click the controller to give it focus
2. Press Space to toggle play/pause
3. Press Right Arrow to scrub forward
4. Press Left Arrow to scrub backward

**Keyboard Shortcuts**:
| Key | Action |
|-----|--------|
| Space | Toggle play/pause |
| Right Arrow | Scrub forward |
| Left Arrow | Scrub backward |
        \`
      }
    }
  }
}`,...(tt=(et=F.parameters)==null?void 0:et.docs)==null?void 0:tt.source},description:{story:`**User Story 4: Keyboard-Driven Control (P4)**

Power users can control playback without leaving the keyboard:
- Space: Toggle play/pause
- Right Arrow: Scrub forward
- Left Arrow: Scrub backward

Click the controller first to give it focus.`,...(nt=(rt=F.parameters)==null?void 0:rt.docs)==null?void 0:nt.description}}};var at,st,ot,it,lt;K.parameters={...K.parameters,docs:{...(at=K.parameters)==null?void 0:at.docs,source:{originalSource:`{
  render: () => <InteractiveTimeController timeExtent={MEDIUM_RANGE} initialDisplayMode="trail" />,
  parameters: {
    docs: {
      description: {
        story: \`
### Display Mode Toggle

**Full mode**: Shows the entire track path regardless of current time position.

**Trail mode**: Shows only the track history from the start up to the current time position (like a "snail trail").

The toggle switch in the center of the controls row switches between modes.
        \`
      }
    }
  }
}`,...(ot=(st=K.parameters)==null?void 0:st.docs)==null?void 0:ot.source},description:{story:`**Display Mode: Full vs Trail**

Toggle between track display modes:
- **Full**: Shows entire track regardless of time position
- **Trail**: Shows track history from start up to current time`,...(lt=(it=K.parameters)==null?void 0:it.docs)==null?void 0:lt.description}}};var ct,dt,mt,ut,pt;W.parameters={...W.parameters,docs:{...(ct=W.parameters)==null?void 0:ct.docs,source:{originalSource:`{
  render: () => <ThemeProvider theme={{
    variant: 'light'
  }}>
      <div style={{
      width: 300,
      padding: 16,
      background: '#f5f5f5'
    }}>
        <InteractiveTimeController timeExtent={MEDIUM_RANGE} />
      </div>
    </ThemeProvider>,
  parameters: {
    docs: {
      description: {
        story: 'Time controller styled for light theme environments.'
      }
    }
  }
}`,...(mt=(dt=W.parameters)==null?void 0:dt.docs)==null?void 0:mt.source},description:{story:"Light theme variant.",...(pt=(ut=W.parameters)==null?void 0:ut.docs)==null?void 0:pt.description}}};var yt,bt,ht,gt,ft;V.parameters={...V.parameters,docs:{...(yt=V.parameters)==null?void 0:yt.docs,source:{originalSource:`{
  render: () => <ThemeProvider theme={{
    variant: 'dark'
  }}>
      <div style={{
      width: 300,
      padding: 16,
      background: '#1e1e1e'
    }}>
        <InteractiveTimeController timeExtent={MEDIUM_RANGE} />
      </div>
    </ThemeProvider>,
  parameters: {
    docs: {
      description: {
        story: 'Time controller styled for dark theme environments (default).'
      }
    }
  }
}`,...(ht=(bt=V.parameters)==null?void 0:bt.docs)==null?void 0:ht.source},description:{story:"Dark theme variant (default).",...(ft=(gt=V.parameters)==null?void 0:gt.docs)==null?void 0:ft.description}}};var vt,St,kt,Tt,wt;B.parameters={...B.parameters,docs:{...(vt=B.parameters)==null?void 0:vt.docs,source:{originalSource:`{
  render: () => <ThemeProvider theme={{
    variant: 'vscode'
  }}>
      <div style={{
      width: 300,
      padding: 16,
      background: '#1e1e1e'
    }}>
        <InteractiveTimeController timeExtent={MEDIUM_RANGE} />
      </div>
    </ThemeProvider>,
  parameters: {
    docs: {
      description: {
        story: 'Time controller styled for VS Code sidebar integration.'
      }
    }
  }
}`,...(kt=(St=B.parameters)==null?void 0:St.docs)==null?void 0:kt.source},description:{story:"VS Code theme variant (dark with VS Code colors).",...(wt=(Tt=B.parameters)==null?void 0:Tt.docs)==null?void 0:wt.description}}};var xt,Ct,Pt,_t,Et;z.parameters={...z.parameters,docs:{...(xt=z.parameters)==null?void 0:xt.docs,source:{originalSource:`{
  render: () => {
    const [time, setTime] = useState(MEDIUM_RANGE[0]);
    return <div>
        <div style={{
        marginBottom: 8,
        fontSize: 12,
        color: '#808080'
      }}>
          Current: {new Date(time).toISOString()}
        </div>
        <div style={{
        padding: '0 8px'
      }}>
          {/* Import TimeScrubber directly for custom usage */}
        </div>
      </div>;
  },
  parameters: {
    docs: {
      description: {
        story: 'Sub-components like TimeScrubber, PlaybackControls, and SpeedSelector can be imported individually for custom layouts.'
      }
    }
  }
}`,...(Pt=(Ct=z.parameters)==null?void 0:Ct.docs)==null?void 0:Pt.source},description:{story:`Individual sub-components can be used for custom layouts.
This shows the TimeScrubber component in isolation.`,...(Et=(_t=z.parameters)==null?void 0:_t.docs)==null?void 0:Et.description}}};const Wt=["Default","EmptyState","LoadingState","ReadyState","ManualNavigation","ShortTimeRange","LongTimeRange","AnimatedPlayback","SpeedControl","KeyboardControl","DisplayMode","LightTheme","DarkTheme","VSCodeTheme","TimeScrubberOnly"];export{O as AnimatedPlayback,V as DarkTheme,I as Default,K as DisplayMode,R as EmptyState,F as KeyboardControl,W as LightTheme,L as LoadingState,$ as LongTimeRange,q as ManualNavigation,U as ReadyState,G as ShortTimeRange,H as SpeedControl,z as TimeScrubberOnly,B as VSCodeTheme,Wt as __namedExportsOrder,Kt as default};
