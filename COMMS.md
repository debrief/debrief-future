# Communications Strategy

This document defines how Future Debrief engages with stakeholders throughout development.

## Audiences

| Audience | Interest | Primary Channel |
|----------|----------|-----------------|
| DSTL / defence customers | Funding, adoption, capability planning | Blog, LinkedIn, beta previews |
| Open source community | Contributing, similar projects | GitHub, blog technical posts |
| Maritime analysis community | Using the tool, providing feedback | LinkedIn, YouTube demos, beta previews |
| Atlas (existing Debrief users) | Capability updates, adoption planning | Blog, LinkedIn |

All content is public by default — community benefits from wider adoption and visibility.

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
"Try it now" LinkedIn post → drives to beta URL
    ↓
1-week feedback pause (deliberate)
    ↓
Feedback collected and reviewed
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

Content is a byproduct of development, not extra work:

| Development Activity | Content Output |
|---------------------|----------------|
| Feature planning | Sequence diagrams → "What's Coming" post |
| Architecture decisions | Flowcharts → "Technical" deep dive |
| E2E test runs | Screen recordings → demo videos |
| Releases | Release notes → "Releases" post |
| Beta deployment | Interactive preview → feedback opportunity |

**Approach:** AI-assisted drafting. Provide bullet points, AI drafts posts/articles for review.

## Feedback Mechanisms

### Beta Previews
- **GitHub Issues**: Structured feedback with labels (`feedback`, `beta`, feature name)
- **Discussion threads**: Open-ended conversation in GitHub Discussions
- **In-app feedback**: Simple feedback widget in beta previews linking to issue template

### General Feedback
- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: Questions, ideas, community conversation
- **LinkedIn comments**: Lightweight engagement, redirect substantive feedback to GitHub

### Feedback Pause Protocol
During deliberate feedback pauses:
1. Deploy beta preview
2. Post "Try it now" on LinkedIn with specific questions
3. Monitor GitHub issues/discussions for 1 week
4. Summarise feedback in internal note
5. Prioritise refinements before continuing

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

| Task | Owner |
|------|-------|
| Development milestones | Deep Blue C |
| Content drafting (AI-assisted) | Deep Blue C + AI |
| Blog publishing | Deep Blue C |
| LinkedIn posting | Deep Blue C |
| YouTube upload | Deep Blue C |
| Beta deployment | Automated (CI) |
| Feedback review | Deep Blue C |
| Metrics review | Deep Blue C (monthly) |

## Tools

| Purpose | Tool |
|---------|------|
| Blog | GitHub Pages (Jekyll or Hugo) |
| Beta previews | Storybook (static build) + SPAs |
| Video capture (automated) | Playwright trace / screen recording in CI |
| Video capture (narrated) | OBS or similar |
| Video hosting | YouTube (existing Debrief channel) |
| Social | LinkedIn |
| Analytics | GitHub insights + YouTube Studio + LinkedIn analytics |
| Feedback | GitHub Issues + Discussions |

---

*Document version: 1.0 — January 2026*
