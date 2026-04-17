Reviewing a spec PR on a tablet is painful. Eight markdown files, no repo checkout, and GitHub's inline-review UI really does not want to play nicely with touch.

The next piece of work on Debrief is a small fix for that: a static browser-hosted SPA that takes a PR number, opens that feature's `specs/NNN-*/` folder, and renders every artefact — tables, task lists, highlighted code, inline evidence images — the way the writer intended. Reviewers can leave comments on a selected passage, on a whole document, or on the feature overall, and hit Submit once. That posts a single structured comment back to the PR, and the automated watcher we already have picks it up and iterates.

It is contributor plumbing, not an analyst feature — but the feedback loop between writing a spec and acting on review notes is where most of my week currently goes. Worth tightening.

Notes on the auth trade-offs, the handoff format, and what I'd like feedback on before I build it: {{post-url}}

#FutureDebrief #DeveloperExperience #OpenSource
