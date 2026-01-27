# Usage Example: Quick Capture → Interview Workflow

This document demonstrates the complete workflow from quick idea capture to full specification.

## Scenario

A developer has a flash of inspiration during a meeting but can't stop to conduct a full interview. They capture the idea quickly, then return later to complete the requirements.

---

## Step 1: Quick Capture with `/idea --defer`

```
Human: /idea --defer Add batch export feature for analysis reports
```

**Expected Flow**:
1. Scout evaluates idea (passes hard filters)
2. Interview is skipped (defer mode)
3. Item added to BACKLOG.md with status `needs-interview`
4. Preliminary scores assigned

**Expected Output**:
```
## Quick Capture: Add batch export feature for analysis reports

### 1. Scout Evaluation
✅ Passes hard filters

### 2. Interview Deferred
⏭️ Skipping detailed interview for quick capture

### 3. Added to Backlog
Item **042** added as Feature
Status: `needs-interview`

### 4. Preliminary Scores
| V | M | A | Total |
|---|---|---|-------|
| 4 | 3 | 4 | 11 |

**Note**: Scores are preliminary based on limited information.

### Next Steps
- Run `/interview` later to complete requirements gathering
- Interview will create GitHub issue and refine scores
- After interview, item proceeds to normal approval flow
```

**BACKLOG.md Entry**:
```
| 042 | Feature | Add batch export feature for analysis reports | 4 | 3 | 4 | 11 | - | needs-interview |
```

---

## Step 2: Return Later to Complete Interview

The developer returns with dedicated time to flesh out the idea.

```
Human: /interview 042
```

**Expected Flow**:
1. Item 042 selected from `needs-interview` items
2. Scout conducts adaptive interview (3-5 questions)
3. GitHub issue created with structured summary
4. BACKLOG.md updated: status → `proposed`, description linked to issue
5. Scores refined with full information
6. Strategic review for approval

**Example Interview Questions** (multiple-choice format):
```
What is the primary use case for batch export?

A) Exporting multiple analyses for external reporting
B) Archiving completed projects
C) Sharing with team members who don't have Debrief
D) Other (please describe)
```

```
What file formats should be supported?

A) PDF only (for formal reports)
B) PDF and CSV (reports + data)
C) PDF, CSV, and GeoJSON (full data portability)
D) User-configurable format selection
```

**Expected Final Output**:
```
## Interview Complete: Add batch export feature for analysis reports

### 1. Item Selected
ID: 042 | Category: Feature
Original capture: quick capture via --defer

### 2. Interview Conducted
Questions asked: 4
Key findings:
- Primary use case: External stakeholder reporting
- Required formats: PDF and CSV
- Scope: Selected analyses, not entire workspace
- Integration: Should work with existing export menu

### 3. Issue Created
#156: [Add batch export feature for analysis reports](https://github.com/debrief/debrief-future/issues/156)

### 4. Backlog Updated
Status: `needs-interview` → `proposed`

### 5. Scores Refined
| Dimension | Preliminary | Final | Change |
|-----------|-------------|-------|--------|
| Value | 4 | 5 | +1 |
| Media | 3 | 4 | +1 |
| Autonomy | 4 | 4 | - |
| **Total** | 11 | 13 | +2 |

### 6. Strategic Review
✅ **Approved** — Aligns with "User Experience" theme, clear requirements

### Next Step
When ready to implement, run: `/speckit.start 042`
```

**BACKLOG.md Entry After Interview**:
```
| 042 | Feature | [Add batch export feature for analysis reports](https://github.com/debrief/debrief-future/issues/156) | 5 | 4 | 4 | 13 | Medium | approved |
```

---

## Step 3: Begin Specification (Optional)

With the item now approved, the developer can begin specification work:

```
Human: /speckit.start 042
```

This would fail if run before `/interview` with the message:
> "Item 042 needs interview first. Run `/interview` to complete requirements gathering."

---

## Key Benefits

1. **No idea lost**: Capture happens in seconds when inspiration strikes
2. **Quality maintained**: Full interview ensures proper requirements gathering
3. **Flexible timing**: Interview can happen hours or days after capture
4. **Clear status**: `needs-interview` status makes pending items visible
5. **Workflow protection**: `/speckit.start` prevents premature specification
