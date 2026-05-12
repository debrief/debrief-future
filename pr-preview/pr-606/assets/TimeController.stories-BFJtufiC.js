import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r as o}from"./index-B2-qRKKC.js";import{T as tt,P as dt}from"./TimeController-lMtOLirO.js";import{T}from"./ThemeProvider-DF0jq0Ad.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./textfield-Dm39NdvL.js";import"./defaultTheme-Tx6C8nph.js";const s=Date.now(),C=60*60*1e3,E=[s,s+C],n=[s,s+8*C],lt=[s,s+24*C],St={title:"Components/TimeController",component:tt,parameters:{layout:"centered",docs:{description:{component:`
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
        `}}},tags:["autodocs"],argTypes:{timeExtent:{description:"Time range [start, end] in milliseconds since epoch",control:!1},initialSpeed:{description:"Initial playback speed",control:{type:"select"},options:[1,2,4,8]},initialDisplayMode:{description:"Initial display mode",control:{type:"radio"},options:["full","trail"]},uiState:{description:"Override UI state for testing",control:{type:"radio"},options:["empty","loading","ready"]}},decorators:[(r,x)=>{const P=x.globals.theme||"dark";return e.jsx(T,{theme:{variant:P},children:e.jsx("div",{style:{width:300,padding:16},children:e.jsx(r,{})})})}]};function t(r){var A;const[x,P]=o.useState(((A=r.timeExtent)==null?void 0:A[0])??0),[rt,nt]=o.useState("paused"),[at,ot]=o.useState("full"),st=o.useCallback(a=>{P(a),console.log("Time changed:",new Date(a).toISOString())},[]),it=o.useCallback(a=>{nt(a),console.log("Playback state:",a)},[]),ct=o.useCallback(a=>{ot(a),console.log("Display mode:",a)},[]);return e.jsxs("div",{children:[e.jsx(tt,{...r,onTimeChange:st,onPlaybackStateChange:it,onDisplayModeChange:ct}),e.jsxs("div",{style:{marginTop:16,fontSize:12,color:"#808080"},children:[e.jsxs("div",{children:["Time: ",new Date(x).toISOString()]}),e.jsxs("div",{children:["Playback: ",rt]}),e.jsxs("div",{children:["Display: ",at]})]})]})}const i={render:()=>e.jsx(t,{timeExtent:n})},c={args:{timeExtent:null},parameters:{docs:{description:{story:'When no track data is loaded, the controller shows a disabled state with "No data loaded" message.'}}}},d={args:{timeExtent:n,uiState:"loading"},parameters:{docs:{description:{story:'While track data is loading, the controller shows a "Loading..." message.'}}}},l={render:()=>e.jsx(t,{timeExtent:n}),parameters:{docs:{description:{story:"When track data is loaded, all controls become active and usable."}}}},p={render:()=>e.jsx(t,{timeExtent:n}),parameters:{docs:{description:{story:`
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
        `}}}},m={render:()=>e.jsx(t,{timeExtent:E}),parameters:{docs:{description:{story:"With a short time range (1 hour), the scrubber still functions with appropriate granularity."}}}},u={render:()=>e.jsx(t,{timeExtent:lt}),parameters:{docs:{description:{story:"With a long time range (24 hours), the scrubber allows navigation across the full range."}}}},y={render:()=>e.jsx(t,{timeExtent:E}),parameters:{docs:{description:{story:`
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
        `}}}},h={render:()=>e.jsx(t,{timeExtent:E,initialSpeed:4}),parameters:{docs:{description:{story:`
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
        `}}}},g={render:()=>e.jsxs("div",{children:[e.jsxs("p",{style:{marginBottom:8,fontSize:12,color:"#808080"},children:["Click the controller, then use keyboard shortcuts:",e.jsx("br",{}),e.jsx("strong",{children:"Space"})," = Play/Pause | ",e.jsx("strong",{children:"Arrow keys"})," = Scrub"]}),e.jsx(t,{timeExtent:n})]}),parameters:{docs:{description:{story:`
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
        `}}}},b={render:()=>e.jsx(t,{timeExtent:n,initialDisplayMode:"trail"}),parameters:{docs:{description:{story:`
### Display Mode Toggle

**Full mode**: Shows the entire track path regardless of current time position.

**Trail mode**: Shows only the track history from the start up to the current time position (like a "snail trail").

The toggle switch in the center of the controls row switches between modes.
        `}}}},S={render:()=>e.jsx(T,{theme:{variant:"light"},children:e.jsx("div",{style:{width:300,padding:16,background:"#f5f5f5"},children:e.jsx(t,{timeExtent:n})})}),parameters:{docs:{description:{story:"Time controller styled for light theme environments."}}}},v={render:()=>e.jsx(T,{theme:{variant:"dark"},children:e.jsx("div",{style:{width:300,padding:16,background:"#1e1e1e"},children:e.jsx(t,{timeExtent:n})})}),parameters:{docs:{description:{story:"Time controller styled for dark theme environments (default)."}}}},k={render:()=>e.jsx(T,{theme:{variant:"dark"},children:e.jsx("div",{style:{width:300,padding:16,background:"#1e1e1e"},children:e.jsx(t,{timeExtent:n})})}),parameters:{docs:{description:{story:"Time controller styled for VS Code sidebar integration."}}}},w={render:()=>{const[r,x]=o.useState(n[0]);return e.jsxs("div",{children:[e.jsxs("div",{style:{marginBottom:8,fontSize:12,color:"#808080"},children:["Current: ",new Date(r).toISOString()]}),e.jsx("div",{style:{padding:"0 8px"}})]})},parameters:{docs:{description:{story:"Sub-components like TimeScrubber, PlaybackControls, and SpeedSelector can be imported individually for custom layouts."}}}},f={render:()=>e.jsx("div",{style:{display:"flex",gap:24,padding:16},children:["stopped","paused","playing"].map(r=>e.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",gap:8},children:[e.jsxs("div",{style:{fontSize:12,color:"#808080"},children:['playbackState = "',r,'"']}),e.jsx(dt,{playbackState:r,onToggle:()=>{}})]},r))}),parameters:{docs:{description:{story:"Regression guard for Feature 205 FR-023 / FR-025 — `stopped` renders identically to `paused`. If this story visually diverges between the first two buttons, revisit the `stopped ≡ paused` rule documented in ADR-NN (`docs/project_notes/decisions.md`)."}}}};var D,M,j,R,I;i.parameters={...i.parameters,docs:{...(D=i.parameters)==null?void 0:D.docs,source:{originalSource:`{
  render: () => <InteractiveTimeController timeExtent={MEDIUM_RANGE} />
}`,...(j=(M=i.parameters)==null?void 0:M.docs)==null?void 0:j.source},description:{story:`Default time controller with an 8-hour time range.
Try dragging the scrubber, clicking play, and adjusting speed.`,...(I=(R=i.parameters)==null?void 0:R.docs)==null?void 0:I.description}}};var N,G,U,L,_;c.parameters={...c.parameters,docs:{...(N=c.parameters)==null?void 0:N.docs,source:{originalSource:`{
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
}`,...(U=(G=c.parameters)==null?void 0:G.docs)==null?void 0:U.source},description:{story:"Empty state shown when no track data is loaded.",...(_=(L=c.parameters)==null?void 0:L.docs)==null?void 0:_.description}}};var O,H,F,W,K;d.parameters={...d.parameters,docs:{...(O=d.parameters)==null?void 0:O.docs,source:{originalSource:`{
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
}`,...(F=(H=d.parameters)==null?void 0:H.docs)==null?void 0:F.source},description:{story:"Loading state shown while track data is being processed.",...(K=(W=d.parameters)==null?void 0:W.docs)==null?void 0:K.description}}};var z,V,q,B,J;l.parameters={...l.parameters,docs:{...(z=l.parameters)==null?void 0:z.docs,source:{originalSource:`{
  render: () => <InteractiveTimeController timeExtent={MEDIUM_RANGE} />,
  parameters: {
    docs: {
      description: {
        story: 'When track data is loaded, all controls become active and usable.'
      }
    }
  }
}`,...(q=(V=l.parameters)==null?void 0:V.docs)==null?void 0:q.source},description:{story:"Ready state with all controls active.",...(J=(B=l.parameters)==null?void 0:B.docs)==null?void 0:J.description}}};var Q,X,Y,Z,$;p.parameters={...p.parameters,docs:{...(Q=p.parameters)==null?void 0:Q.docs,source:{originalSource:`{
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
}`,...(Y=(X=p.parameters)==null?void 0:X.docs)==null?void 0:Y.source},description:{story:`**User Story 1: Manual Time Navigation (P1)**

An analyst can manually navigate to specific points in time by:
- Dragging the time scrubber
- Clicking anywhere on the scrubber track

The time display updates immediately to show the current position.`,...($=(Z=p.parameters)==null?void 0:Z.docs)==null?void 0:$.description}}};var ee,te,re,ne,ae;m.parameters={...m.parameters,docs:{...(ee=m.parameters)==null?void 0:ee.docs,source:{originalSource:`{
  render: () => <InteractiveTimeController timeExtent={SHORT_RANGE} />,
  parameters: {
    docs: {
      description: {
        story: 'With a short time range (1 hour), the scrubber still functions with appropriate granularity.'
      }
    }
  }
}`,...(re=(te=m.parameters)==null?void 0:te.docs)==null?void 0:re.source},description:{story:"Short time range (1 hour) - tests granular scrubbing.",...(ae=(ne=m.parameters)==null?void 0:ne.docs)==null?void 0:ae.description}}};var oe,se,ie,ce,de;u.parameters={...u.parameters,docs:{...(oe=u.parameters)==null?void 0:oe.docs,source:{originalSource:`{
  render: () => <InteractiveTimeController timeExtent={LONG_RANGE} />,
  parameters: {
    docs: {
      description: {
        story: 'With a long time range (24 hours), the scrubber allows navigation across the full range.'
      }
    }
  }
}`,...(ie=(se=u.parameters)==null?void 0:se.docs)==null?void 0:ie.source},description:{story:"Long time range (24 hours) - tests navigation across large spans.",...(de=(ce=u.parameters)==null?void 0:ce.docs)==null?void 0:de.description}}};var le,pe,me,ue,ye;y.parameters={...y.parameters,docs:{...(le=y.parameters)==null?void 0:le.docs,source:{originalSource:`{
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
}`,...(me=(pe=y.parameters)==null?void 0:pe.docs)==null?void 0:me.source},description:{story:`**User Story 2: Animated Playback (P2)**

An analyst can watch tracks evolve over time by:
- Clicking the Play button to start animation
- Clicking Pause to stop at any point

Playback automatically pauses when reaching the end of the time range.`,...(ye=(ue=y.parameters)==null?void 0:ue.docs)==null?void 0:ye.description}}};var he,ge,be,Se,ve;h.parameters={...h.parameters,docs:{...(he=h.parameters)==null?void 0:he.docs,source:{originalSource:`{
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
}`,...(be=(ge=h.parameters)==null?void 0:ge.docs)==null?void 0:be.source},description:{story:`**User Story 3: Playback Speed Control (P3)**

An analyst can adjust playback speed to:
- Speed up through uneventful periods (4x, 8x)
- Slow down for detailed observation (1x, 2x)

Speed options: 1x, 2x, 4x, 8x real-time.`,...(ve=(Se=h.parameters)==null?void 0:Se.docs)==null?void 0:ve.description}}};var ke,we,fe,xe,Te;g.parameters={...g.parameters,docs:{...(ke=g.parameters)==null?void 0:ke.docs,source:{originalSource:`{
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
}`,...(fe=(we=g.parameters)==null?void 0:we.docs)==null?void 0:fe.source},description:{story:`**User Story 4: Keyboard-Driven Control (P4)**

Power users can control playback without leaving the keyboard:
- Space: Toggle play/pause
- Right Arrow: Scrub forward
- Left Arrow: Scrub backward

Click the controller first to give it focus.`,...(Te=(xe=g.parameters)==null?void 0:xe.docs)==null?void 0:Te.description}}};var Pe,Ce,Ee,Ae,De;b.parameters={...b.parameters,docs:{...(Pe=b.parameters)==null?void 0:Pe.docs,source:{originalSource:`{
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
}`,...(Ee=(Ce=b.parameters)==null?void 0:Ce.docs)==null?void 0:Ee.source},description:{story:`**Display Mode: Full vs Trail**

Toggle between track display modes:
- **Full**: Shows entire track regardless of time position
- **Trail**: Shows track history from start up to current time`,...(De=(Ae=b.parameters)==null?void 0:Ae.docs)==null?void 0:De.description}}};var Me,je,Re,Ie,Ne;S.parameters={...S.parameters,docs:{...(Me=S.parameters)==null?void 0:Me.docs,source:{originalSource:`{
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
}`,...(Re=(je=S.parameters)==null?void 0:je.docs)==null?void 0:Re.source},description:{story:"Light theme variant.",...(Ne=(Ie=S.parameters)==null?void 0:Ie.docs)==null?void 0:Ne.description}}};var Ge,Ue,Le,_e,Oe;v.parameters={...v.parameters,docs:{...(Ge=v.parameters)==null?void 0:Ge.docs,source:{originalSource:`{
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
}`,...(Le=(Ue=v.parameters)==null?void 0:Ue.docs)==null?void 0:Le.source},description:{story:"Dark theme variant (default).",...(Oe=(_e=v.parameters)==null?void 0:_e.docs)==null?void 0:Oe.description}}};var He,Fe,We,Ke,ze;k.parameters={...k.parameters,docs:{...(He=k.parameters)==null?void 0:He.docs,source:{originalSource:`{
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
        story: 'Time controller styled for VS Code sidebar integration.'
      }
    }
  }
}`,...(We=(Fe=k.parameters)==null?void 0:Fe.docs)==null?void 0:We.source},description:{story:"VS Code theme variant (dark with VS Code colors).",...(ze=(Ke=k.parameters)==null?void 0:Ke.docs)==null?void 0:ze.description}}};var Ve,qe,Be,Je,Qe;w.parameters={...w.parameters,docs:{...(Ve=w.parameters)==null?void 0:Ve.docs,source:{originalSource:`{
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
}`,...(Be=(qe=w.parameters)==null?void 0:qe.docs)==null?void 0:Be.source},description:{story:`Individual sub-components can be used for custom layouts.
This shows the TimeScrubber component in isolation.`,...(Qe=(Je=w.parameters)==null?void 0:Je.docs)==null?void 0:Qe.description}}};var Xe,Ye,Ze,$e,et;f.parameters={...f.parameters,docs:{...(Xe=f.parameters)==null?void 0:Xe.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    gap: 24,
    padding: 16
  }}>
      {(['stopped', 'paused', 'playing'] as const).map(state => <div key={state} style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8
    }}>
          <div style={{
        fontSize: 12,
        color: '#808080'
      }}>playbackState = &quot;{state}&quot;</div>
          <PlaybackControls playbackState={state} onToggle={() => undefined} />
        </div>)}
    </div>,
  parameters: {
    docs: {
      description: {
        story: 'Regression guard for Feature 205 FR-023 / FR-025 — \`stopped\` renders identically to \`paused\`. ' + 'If this story visually diverges between the first two buttons, revisit the \`stopped ≡ paused\` rule ' + 'documented in ADR-NN (\`docs/project_notes/decisions.md\`).'
      }
    }
  }
}`,...(Ze=(Ye=f.parameters)==null?void 0:Ye.docs)==null?void 0:Ze.source},description:{story:`Feature 205 / FR-025: visual regression guard for the stopped ≡ paused
rendering rule. The PlaybackState vocabulary widened from two states
('playing' | 'paused') to three ('stopped' | 'playing' | 'paused') when
session-state and component-side enums were consolidated into LinkML.
The \`stopped\` state is rendered identically to \`paused\` — same play
glyph, same aria-label="Play", same enabled onClick — so existing
\`'playing' ?  : 'paused'\` branches work unchanged.

Stopped and Paused should be visually indistinguishable below; Playing
differs (pause glyph + "Pause" aria-label).`,...(et=($e=f.parameters)==null?void 0:$e.docs)==null?void 0:et.description}}};const vt=["Default","EmptyState","LoadingState","ReadyState","ManualNavigation","ShortTimeRange","LongTimeRange","AnimatedPlayback","SpeedControl","KeyboardControl","DisplayMode","LightTheme","DarkTheme","VSCodeTheme","TimeScrubberOnly","PlaybackStateStoppedEquivPaused"];export{y as AnimatedPlayback,v as DarkTheme,i as Default,b as DisplayMode,c as EmptyState,g as KeyboardControl,S as LightTheme,d as LoadingState,u as LongTimeRange,p as ManualNavigation,f as PlaybackStateStoppedEquivPaused,l as ReadyState,m as ShortTimeRange,h as SpeedControl,w as TimeScrubberOnly,k as VSCodeTheme,vt as __namedExportsOrder,St as default};
