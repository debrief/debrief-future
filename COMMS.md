# Communications Strategy

This document defines how Future Debrief engages with stakeholders throughout development.

## Audiences

| Audience | Interest | Primary Channel |
|----------|----------|-----------------|
| DSTL / defence customers | Funding, adoption, capability planning | Blog, LinkedIn, beta previews |
| Open source community | Contributing, similar projects | GitHub, blog technical posts |
| Maritime analysis community | Using the tool, providing feedback | LinkedIn, YouTube demos, beta previews |
| Atlas (existing Debrief users) | Capability updates, adoption planning | Blog, LinkedIn |

All content is public by default — DSTL benefits from wider adoption and visibility.

## Project Ownership

Future Debrief is developed by **Deep Blue C Ltd**.

## Channels

### GitHub (Hub)
- **Repository**: Source code, issues, discussions
- **Project board**: Development progress visible to all
- **Releases**: Formal version announcements
- **Pages**: Blog and beta previews hosted here

### Blog (GitHub Pages)
`debrief.github.io/debrief-future/`

The central content hub. All detailed content lives here.

**Categories:**
- **Progress** — what got done
- **Roadmap** — what's coming
- **Technical** — deep dives, architecture decisions
- **Demos** — video walkthroughs (embedded from YouTube)
- **Releases** — formal version announcements

**Structure:** Chronological feed with category navigation.

### LinkedIn (Push)
Short-form posts that drive traffic to blog and beta previews.

- Teasers for new blog posts
- "What's Coming" announcements
- "Try the Beta" calls to action
- Milestone celebrations

### YouTube (Existing Debrief channel)
Video content, standalone but linked from blog.

- Demo walkthroughs (narrated for major milestones)
- Automated E2E test recordings (routine features)
- Architecture explainers

### Beta Previews (GitHub Pages)
`debrief.github.io/debrief-future/beta/`

Interactive previews using Storybook and SPAs.

- Component previews (Storybook)
- Workflow previews (lightweight SPAs)
- Feature-specific URLs for targeted feedback

**Automated Discussion Thread:** Each feature preview automatically generates a GitHub Discussion thread containing:
1. **Requirements summary** — what the feature aims to achieve (from feature spec)
2. **Strategy taken** — key design/implementation decisions (from implementation plan)
3. **Feedback prompts** — specific questions or areas where input is valuable
4. **Link to preview** — direct URL to try the feature

Content is pulled from the feature's specification and plan documents, ensuring consistency between internal planning and external communication.

This gives stakeholders a structured place to comment, ask questions, and suggest improvements.

## Content Flow

### Planning Phase
```
Feature planned
    ↓
Sequence diagrams / flowcharts created
    ↓
"What's Coming" blog post (with diagrams)
    ↓
LinkedIn teaser → drives to blog
```

### Development Phase
```
Feature in progress
    ↓
Beta preview deployed (Storybook/SPA)
    ↓
GitHub Discussion auto-generated (requirements, strategy, feedback prompts)
    ↓
"Try it now" LinkedIn post → drives to beta URL + Discussion
    ↓
1-week feedback pause (deliberate)
    ↓
Feedback collected from Discussion thread
    ↓
Refinements incorporated
```

### Delivery Phase
```
Milestone reached
    ↓
E2E test captured as video (automated or narrated)
    ↓
Video uploaded to YouTube
    ↓
Blog post written (embedded video, release notes)
    ↓
LinkedIn post → links to blog and video
```

## Content Generation

Content is a byproduct of development, not extra work. AI drafts all content from source documents.

| Development Activity | Content Output | AI Action |
|---------------------|----------------|-----------|
| Feature planning | "What's Coming" blog post | Draft from spec + diagrams |
| Architecture decisions | "Technical" deep dive | Draft from ADR/decision doc |
| Beta preview deployment | GitHub Discussion thread | Auto-generate from spec + plan |
| E2E test runs | Demo video | Capture automated; AI drafts description |
| Releases | "Releases" blog post | Draft from changelog + release notes |

**Human role:** Review drafts, approve/edit, publish. Engage in discussions.

**Approach:** AI-first content creation. AI drafts all content from development artifacts (specs, plans, changelogs). Human reviews and publishes. Human engages directly in feedback discussions; AI monitors and summarises.

## Feedback Mechanisms

### Beta Previews
- **Auto-generated Discussion thread**: Each preview creates a GitHub Discussion with requirements, strategy, and feedback prompts
- **GitHub Issues**: Structured bug reports / specific feature requests (linked from Discussion)
- **In-app feedback**: Simple widget in beta previews linking to the Discussion thread

### General Feedback
- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: Questions, ideas, community conversation
- **LinkedIn comments**: Lightweight engagement, redirect substantive feedback to GitHub

### Feedback Pause Protocol
During deliberate feedback pauses:
1. Deploy beta preview
2. Discussion thread auto-generated with feedback prompts
3. Post "Try it now" on LinkedIn with link to Discussion
4. AI monitors Discussion for 1 week, produces daily/end-of-week digest
5. Human reviews digest, engages on key threads
6. AI summarises actionable feedback
7. Prioritise refinements before continuing

### Ongoing Feedback Monitoring
Outside of formal feedback pauses, AI periodically:
- Scans open Discussions for new comments
- Flags questions that need human response
- Produces weekly summary of community activity
- Highlights emerging themes or repeated requests

## Metrics

### Engagement (monthly review)
| Metric | Source | Target |
|--------|--------|--------|
| Blog page views | GitHub Pages analytics / simple analytics | Trend upward |
| YouTube video views | YouTube Studio | >100 per demo |
| LinkedIn post engagement | LinkedIn analytics | >5% engagement rate |
| GitHub stars | Repository | Trend upward |
| GitHub forks | Repository | Track community interest |

### Feedback Quality (per beta cycle)
| Metric | Source |
|--------|--------|
| Issues opened during feedback pause | GitHub Issues |
| Discussion threads created | GitHub Discussions |
| Unique contributors to feedback | GitHub |

### Community Health (quarterly review)
| Metric | Source |
|--------|--------|
| External contributors | GitHub |
| Organisations using `/contrib/` | Manual tracking |
| Questions answered by community (not maintainer) | GitHub Discussions |

## Cadence

**Milestone-driven, not calendar-driven** — post when there's something to show.

Expected rhythm during tracer bullet phase:
- Blog post every 2-4 weeks (as milestones land)
- LinkedIn post weekly (mix of teasers, progress, engagement)
- YouTube video per major feature demo
- Beta preview per user-facing feature

## Responsibilities

| Task | Owner | AI Role |
|------|-------|---------|
| Development milestones | Deep Blue C | — |
| Blog post drafting | AI | Draft from specs/plans; human review |
| LinkedIn post drafting | AI | Draft from blog content; human review |
| Discussion thread content | AI | Auto-generate from spec + plan |
| Video narration scripts | AI | Draft script; human records |
| Publishing (blog, social, YouTube) | Deep Blue C | — |
| Beta deployment | Automated (CI) | — |
| Feedback engagement | Deep Blue C | — |
| Feedback monitoring & summary | AI | Regular digest of new Discussion comments |
| Metrics review | Deep Blue C | AI can pull raw numbers |

### AI-Assisted Workflow

**Content creation:**
1. Milestone reached or feature planned
2. AI drafts content (blog post, LinkedIn teaser, Discussion thread) from source documents
3. Human reviews, edits if needed, publishes

**Feedback monitoring:**
1. AI periodically scans GitHub Discussions for new comments
2. AI produces summary digest: key themes, questions raised, actionable suggestions
3. Human reviews digest, engages directly where needed

This minimises manual authoring while keeping human judgment on publication and stakeholder engagement.

## Tools

| Purpose | Tool |
|---------|------|
| Blog | GitHub Pages (Jekyll or Hugo) |
| Beta previews | Storybook (static build) + SPAs |
| Discussion generation | GitHub Actions (auto-create on preview deploy) |
| Content drafting | LLM (Claude) — drafts from specs/plans |
| Feedback monitoring | LLM (Claude) — scans Discussions, produces digests |
| Video capture (automated) | Playwright trace / screen recording in CI |
| Video capture (narrated) | OBS or similar |
| Video hosting | YouTube (existing Debrief channel) |
| Social | LinkedIn |
| Analytics | GitHub insights + YouTube Studio + LinkedIn analytics |
| Feedback | GitHub Discussions (auto-generated per feature) + Issues |

---

*Document version: 1.0 — January 2026*
