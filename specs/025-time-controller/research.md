# Research: Time Controller UI/UX

**Feature**: 025-time-controller
**Date**: 2026-01-24
**Status**: Complete

## Research Questions

### RQ-1: React Animation Strategy for Smooth Playback

**Question**: What animation approach ensures smooth 10+ fps playback in VS Code webview?

**Decision**: Use `requestAnimationFrame` with React state batching

**Rationale**:
- `requestAnimationFrame` synchronizes with browser refresh rate (typically 60fps)
- React 18's automatic batching prevents unnecessary re-renders
- VS Code webviews are Chromium-based, so standard browser APIs work
- Avoids dependency on animation libraries (keeps bundle small)

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|------------------|
| CSS animations | Cannot synchronize with time data; declarative not imperative |
| react-spring | Additional dependency; overkill for linear time progression |
| setInterval | Not synchronized with refresh rate; can cause jank |
| Web Animations API | Less React-friendly; harder to control programmatically |

### RQ-2: Time State Management Pattern

**Question**: How should time position state be managed across the component tree?

**Decision**: Controlled component pattern with lifted state

**Rationale**:
- Parent component (VS Code panel) owns the time position
- TimeController receives `currentTime`, `timeRange`, and `onTimeChange` props
- Enables synchronization between time controller and map display
- Follows React best practices for shared state

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|------------------|
| Internal state only | Cannot synchronize with external map component |
| React Context | Overkill for single-level prop drilling; adds complexity |
| Redux/Zustand | External state library unnecessary; controlled props sufficient |
| Custom event system | Non-standard; harder to reason about than props |

### RQ-3: Keyboard Event Handling in VS Code Webview

**Question**: How to handle keyboard shortcuts without conflicting with VS Code keybindings?

**Decision**: Use `onKeyDown` on focused container with `stopPropagation`

**Rationale**:
- Keyboard events only fire when the time controller panel has focus
- `stopPropagation` prevents VS Code from intercepting our shortcuts
- Space, Left, Right are unlikely to conflict with VS Code commands when panel focused
- No need for VS Code command registration (simpler implementation)

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|------------------|
| VS Code registerCommand | Requires extension host communication; more complex |
| Global key listener | Would capture keys even when panel unfocused |
| useHotkeys library | Additional dependency; our needs are simple |

### RQ-4: Time Display Format

**Question**: How should time be displayed for various time ranges?

**Decision**: Adaptive format based on range duration

**Rationale**:
- Short ranges (< 24h): Show HH:MM:SS
- Long ranges (>= 24h): Show "Day N HH:MM:SS" or date prefix
- Always show time to second precision (spec requirement)
- Use Intl.DateTimeFormat for locale-aware formatting

**Format Rules**:
```
Range < 1 hour:    MM:SS
Range < 24 hours:  HH:MM:SS
Range >= 24 hours: Jan 15 14:32:15 (locale-aware)
```

### RQ-5: Scrubber Interaction UX

**Question**: What interaction patterns work best for the time scrubber?

**Decision**: Click-to-jump + drag-to-scrub with visual feedback

**Rationale**:
- Click anywhere on track → jump to that time (standard slider behavior)
- Drag handle → continuous scrubbing with live updates
- Show time tooltip near cursor during drag
- Handle snaps to data boundaries at edges

**Interaction Details**:
- Minimum handle size: 12px (touch-friendly)
- Drag threshold: 3px (prevents accidental drags from clicks)
- Update frequency during drag: throttled to 60fps max

## Technology Decisions Summary

| Concern | Decision |
|---------|----------|
| Animation | `requestAnimationFrame` + React state |
| State management | Controlled component (props from parent) |
| Keyboard handling | `onKeyDown` with `stopPropagation` |
| Time formatting | Adaptive format via `Intl.DateTimeFormat` |
| Scrubber UX | Click-to-jump + drag-to-scrub |
| Styling | CSS custom properties for theming |
| Testing | Vitest + React Testing Library |

## Open Questions Resolved

All research questions resolved. No blockers for Phase 1.
