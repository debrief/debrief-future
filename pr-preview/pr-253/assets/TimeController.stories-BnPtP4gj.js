import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r as o}from"./index-B2-qRKKC.js";import{T as Qe}from"./TimeController-BZiLl7Fy.js";import{T}from"./ThemeProvider-mvcGjblv.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./textfield-Dm39NdvL.js";const s=Date.now(),C=60*60*1e3,P=[s,s+C],r=[s,s+8*C],nt=[s,s+24*C],lt={title:"Components/TimeController",component:Qe,parameters:{layout:"centered",docs:{description:{component:`
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
        `}}},tags:["autodocs"],argTypes:{timeExtent:{description:"Time range [start, end] in milliseconds since epoch",control:!1},initialSpeed:{description:"Initial playback speed",control:{type:"select"},options:[1,2,4,8]},initialDisplayMode:{description:"Initial display mode",control:{type:"radio"},options:["full","trail"]},uiState:{description:"Override UI state for testing",control:{type:"radio"},options:["empty","loading","ready"]}},decorators:[(a,x)=>{const f=x.globals.theme||"dark";return e.jsx(T,{theme:{variant:f},children:e.jsx("div",{style:{width:300,padding:16},children:e.jsx(a,{})})})}]};function t(a){var E;const[x,f]=o.useState(((E=a.timeExtent)==null?void 0:E[0])??0),[Xe,Ye]=o.useState("paused"),[Ze,$e]=o.useState("full"),et=o.useCallback(n=>{f(n),console.log("Time changed:",new Date(n).toISOString())},[]),tt=o.useCallback(n=>{Ye(n),console.log("Playback state:",n)},[]),rt=o.useCallback(n=>{$e(n),console.log("Display mode:",n)},[]);return e.jsxs("div",{children:[e.jsx(Qe,{...a,onTimeChange:et,onPlaybackStateChange:tt,onDisplayModeChange:rt}),e.jsxs("div",{style:{marginTop:16,fontSize:12,color:"#808080"},children:[e.jsxs("div",{children:["Time: ",new Date(x).toISOString()]}),e.jsxs("div",{children:["Playback: ",Xe]}),e.jsxs("div",{children:["Display: ",Ze]})]})]})}const i={render:()=>e.jsx(t,{timeExtent:r})},c={args:{timeExtent:null},parameters:{docs:{description:{story:'When no track data is loaded, the controller shows a disabled state with "No data loaded" message.'}}}},d={args:{timeExtent:r,uiState:"loading"},parameters:{docs:{description:{story:'While track data is loading, the controller shows a "Loading..." message.'}}}},l={render:()=>e.jsx(t,{timeExtent:r}),parameters:{docs:{description:{story:"When track data is loaded, all controls become active and usable."}}}},p={render:()=>e.jsx(t,{timeExtent:r}),parameters:{docs:{description:{story:`
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
        `}}}},m={render:()=>e.jsx(t,{timeExtent:P}),parameters:{docs:{description:{story:"With a short time range (1 hour), the scrubber still functions with appropriate granularity."}}}},u={render:()=>e.jsx(t,{timeExtent:nt}),parameters:{docs:{description:{story:"With a long time range (24 hours), the scrubber allows navigation across the full range."}}}},y={render:()=>e.jsx(t,{timeExtent:P}),parameters:{docs:{description:{story:`
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
        `}}}},h={render:()=>e.jsx(t,{timeExtent:P,initialSpeed:4}),parameters:{docs:{description:{story:`
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
        `}}}},g={render:()=>e.jsxs("div",{children:[e.jsxs("p",{style:{marginBottom:8,fontSize:12,color:"#808080"},children:["Click the controller, then use keyboard shortcuts:",e.jsx("br",{}),e.jsx("strong",{children:"Space"})," = Play/Pause | ",e.jsx("strong",{children:"Arrow keys"})," = Scrub"]}),e.jsx(t,{timeExtent:r})]}),parameters:{docs:{description:{story:`
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
        `}}}},b={render:()=>e.jsx(t,{timeExtent:r,initialDisplayMode:"trail"}),parameters:{docs:{description:{story:`
### Display Mode Toggle

**Full mode**: Shows the entire track path regardless of current time position.

**Trail mode**: Shows only the track history from the start up to the current time position (like a "snail trail").

The toggle switch in the center of the controls row switches between modes.
        `}}}},S={render:()=>e.jsx(T,{theme:{variant:"light"},children:e.jsx("div",{style:{width:300,padding:16,background:"#f5f5f5"},children:e.jsx(t,{timeExtent:r})})}),parameters:{docs:{description:{story:"Time controller styled for light theme environments."}}}},v={render:()=>e.jsx(T,{theme:{variant:"dark"},children:e.jsx("div",{style:{width:300,padding:16,background:"#1e1e1e"},children:e.jsx(t,{timeExtent:r})})}),parameters:{docs:{description:{story:"Time controller styled for dark theme environments (default)."}}}},k={render:()=>e.jsx(T,{theme:{variant:"vscode"},children:e.jsx("div",{style:{width:300,padding:16,background:"#1e1e1e"},children:e.jsx(t,{timeExtent:r})})}),parameters:{docs:{description:{story:"Time controller styled for VS Code sidebar integration."}}}},w={render:()=>{const[a,x]=o.useState(r[0]);return e.jsxs("div",{children:[e.jsxs("div",{style:{marginBottom:8,fontSize:12,color:"#808080"},children:["Current: ",new Date(a).toISOString()]}),e.jsx("div",{style:{padding:"0 8px"}})]})},parameters:{docs:{description:{story:"Sub-components like TimeScrubber, PlaybackControls, and SpeedSelector can be imported individually for custom layouts."}}}};var A,D,M,j,R;i.parameters={...i.parameters,docs:{...(A=i.parameters)==null?void 0:A.docs,source:{originalSource:`{
  render: () => <InteractiveTimeController timeExtent={MEDIUM_RANGE} />
}`,...(M=(D=i.parameters)==null?void 0:D.docs)==null?void 0:M.source},description:{story:`Default time controller with an 8-hour time range.
Try dragging the scrubber, clicking play, and adjusting speed.`,...(R=(j=i.parameters)==null?void 0:j.docs)==null?void 0:R.description}}};var I,G,N,U,L;c.parameters={...c.parameters,docs:{...(I=c.parameters)==null?void 0:I.docs,source:{originalSource:`{
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
}`,...(N=(G=c.parameters)==null?void 0:G.docs)==null?void 0:N.source},description:{story:"Empty state shown when no track data is loaded.",...(L=(U=c.parameters)==null?void 0:U.docs)==null?void 0:L.description}}};var _,O,H,W,K;d.parameters={...d.parameters,docs:{...(_=d.parameters)==null?void 0:_.docs,source:{originalSource:`{
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
}`,...(H=(O=d.parameters)==null?void 0:O.docs)==null?void 0:H.source},description:{story:"Loading state shown while track data is being processed.",...(K=(W=d.parameters)==null?void 0:W.docs)==null?void 0:K.description}}};var F,V,z,B,q;l.parameters={...l.parameters,docs:{...(F=l.parameters)==null?void 0:F.docs,source:{originalSource:`{
  render: () => <InteractiveTimeController timeExtent={MEDIUM_RANGE} />,
  parameters: {
    docs: {
      description: {
        story: 'When track data is loaded, all controls become active and usable.'
      }
    }
  }
}`,...(z=(V=l.parameters)==null?void 0:V.docs)==null?void 0:z.source},description:{story:"Ready state with all controls active.",...(q=(B=l.parameters)==null?void 0:B.docs)==null?void 0:q.description}}};var J,Q,X,Y,Z;p.parameters={...p.parameters,docs:{...(J=p.parameters)==null?void 0:J.docs,source:{originalSource:`{
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
}`,...(X=(Q=p.parameters)==null?void 0:Q.docs)==null?void 0:X.source},description:{story:`**User Story 1: Manual Time Navigation (P1)**

An analyst can manually navigate to specific points in time by:
- Dragging the time scrubber
- Clicking anywhere on the scrubber track

The time display updates immediately to show the current position.`,...(Z=(Y=p.parameters)==null?void 0:Y.docs)==null?void 0:Z.description}}};var $,ee,te,re,ne;m.parameters={...m.parameters,docs:{...($=m.parameters)==null?void 0:$.docs,source:{originalSource:`{
  render: () => <InteractiveTimeController timeExtent={SHORT_RANGE} />,
  parameters: {
    docs: {
      description: {
        story: 'With a short time range (1 hour), the scrubber still functions with appropriate granularity.'
      }
    }
  }
}`,...(te=(ee=m.parameters)==null?void 0:ee.docs)==null?void 0:te.source},description:{story:"Short time range (1 hour) - tests granular scrubbing.",...(ne=(re=m.parameters)==null?void 0:re.docs)==null?void 0:ne.description}}};var oe,ae,se,ie,ce;u.parameters={...u.parameters,docs:{...(oe=u.parameters)==null?void 0:oe.docs,source:{originalSource:`{
  render: () => <InteractiveTimeController timeExtent={LONG_RANGE} />,
  parameters: {
    docs: {
      description: {
        story: 'With a long time range (24 hours), the scrubber allows navigation across the full range.'
      }
    }
  }
}`,...(se=(ae=u.parameters)==null?void 0:ae.docs)==null?void 0:se.source},description:{story:"Long time range (24 hours) - tests navigation across large spans.",...(ce=(ie=u.parameters)==null?void 0:ie.docs)==null?void 0:ce.description}}};var de,le,pe,me,ue;y.parameters={...y.parameters,docs:{...(de=y.parameters)==null?void 0:de.docs,source:{originalSource:`{
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
}`,...(pe=(le=y.parameters)==null?void 0:le.docs)==null?void 0:pe.source},description:{story:`**User Story 2: Animated Playback (P2)**

An analyst can watch tracks evolve over time by:
- Clicking the Play button to start animation
- Clicking Pause to stop at any point

Playback automatically pauses when reaching the end of the time range.`,...(ue=(me=y.parameters)==null?void 0:me.docs)==null?void 0:ue.description}}};var ye,he,ge,be,Se;h.parameters={...h.parameters,docs:{...(ye=h.parameters)==null?void 0:ye.docs,source:{originalSource:`{
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
}`,...(ge=(he=h.parameters)==null?void 0:he.docs)==null?void 0:ge.source},description:{story:`**User Story 3: Playback Speed Control (P3)**

An analyst can adjust playback speed to:
- Speed up through uneventful periods (4x, 8x)
- Slow down for detailed observation (1x, 2x)

Speed options: 1x, 2x, 4x, 8x real-time.`,...(Se=(be=h.parameters)==null?void 0:be.docs)==null?void 0:Se.description}}};var ve,ke,we,xe,Te;g.parameters={...g.parameters,docs:{...(ve=g.parameters)==null?void 0:ve.docs,source:{originalSource:`{
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
}`,...(we=(ke=g.parameters)==null?void 0:ke.docs)==null?void 0:we.source},description:{story:`**User Story 4: Keyboard-Driven Control (P4)**

Power users can control playback without leaving the keyboard:
- Space: Toggle play/pause
- Right Arrow: Scrub forward
- Left Arrow: Scrub backward

Click the controller first to give it focus.`,...(Te=(xe=g.parameters)==null?void 0:xe.docs)==null?void 0:Te.description}}};var fe,Ce,Pe,Ee,Ae;b.parameters={...b.parameters,docs:{...(fe=b.parameters)==null?void 0:fe.docs,source:{originalSource:`{
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
}`,...(Pe=(Ce=b.parameters)==null?void 0:Ce.docs)==null?void 0:Pe.source},description:{story:`**Display Mode: Full vs Trail**

Toggle between track display modes:
- **Full**: Shows entire track regardless of time position
- **Trail**: Shows track history from start up to current time`,...(Ae=(Ee=b.parameters)==null?void 0:Ee.docs)==null?void 0:Ae.description}}};var De,Me,je,Re,Ie;S.parameters={...S.parameters,docs:{...(De=S.parameters)==null?void 0:De.docs,source:{originalSource:`{
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
}`,...(je=(Me=S.parameters)==null?void 0:Me.docs)==null?void 0:je.source},description:{story:"Light theme variant.",...(Ie=(Re=S.parameters)==null?void 0:Re.docs)==null?void 0:Ie.description}}};var Ge,Ne,Ue,Le,_e;v.parameters={...v.parameters,docs:{...(Ge=v.parameters)==null?void 0:Ge.docs,source:{originalSource:`{
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
}`,...(Ue=(Ne=v.parameters)==null?void 0:Ne.docs)==null?void 0:Ue.source},description:{story:"Dark theme variant (default).",...(_e=(Le=v.parameters)==null?void 0:Le.docs)==null?void 0:_e.description}}};var Oe,He,We,Ke,Fe;k.parameters={...k.parameters,docs:{...(Oe=k.parameters)==null?void 0:Oe.docs,source:{originalSource:`{
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
}`,...(We=(He=k.parameters)==null?void 0:He.docs)==null?void 0:We.source},description:{story:"VS Code theme variant (dark with VS Code colors).",...(Fe=(Ke=k.parameters)==null?void 0:Ke.docs)==null?void 0:Fe.description}}};var Ve,ze,Be,qe,Je;w.parameters={...w.parameters,docs:{...(Ve=w.parameters)==null?void 0:Ve.docs,source:{originalSource:`{
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
}`,...(Be=(ze=w.parameters)==null?void 0:ze.docs)==null?void 0:Be.source},description:{story:`Individual sub-components can be used for custom layouts.
This shows the TimeScrubber component in isolation.`,...(Je=(qe=w.parameters)==null?void 0:qe.docs)==null?void 0:Je.description}}};const pt=["Default","EmptyState","LoadingState","ReadyState","ManualNavigation","ShortTimeRange","LongTimeRange","AnimatedPlayback","SpeedControl","KeyboardControl","DisplayMode","LightTheme","DarkTheme","VSCodeTheme","TimeScrubberOnly"];export{y as AnimatedPlayback,v as DarkTheme,i as Default,b as DisplayMode,c as EmptyState,g as KeyboardControl,S as LightTheme,d as LoadingState,u as LongTimeRange,p as ManualNavigation,l as ReadyState,m as ShortTimeRange,h as SpeedControl,w as TimeScrubberOnly,k as VSCodeTheme,pt as __namedExportsOrder,lt as default};
