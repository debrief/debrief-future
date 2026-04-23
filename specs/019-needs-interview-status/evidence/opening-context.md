## What We're Building

Ideas arrive at inconvenient times. You're debugging something, a thought strikes, and you want to capture it before it evaporates — but the full requirements interview takes several minutes.

We're adding a `--defer` flag to the `/idea` command. Capture the essence now, defer the detailed interview until you have time. The backlog gains a new `needs-interview` status, and a new `/interview` command lets you batch-process deferred items when you're ready.

The interview itself is being redesigned around multiple-choice questions, asked one at a time. Choose an option or write your own — faster than open-ended prompts, less cognitive overhead.

## How It Fits

This extends the speckit workflow that bridges backlog management and specification. Currently, `/idea` always conducts a full interview before adding to the backlog. Adding `needs-interview` as a status acknowledges that quick capture and thorough requirements gathering serve different moments.

The workflow becomes: quick capture → deferred interview → scoring → approval → specification.

## Key Decisions

- **Status position**: `needs-interview` comes before `proposed`, since scoring depends on having enough detail
- **Preliminary scores**: Even deferred items get estimated V/M/A scores, marked as preliminary
- **Question format**: Multiple-choice with custom option, presented one at a time
- **Validation**: `/speckit.start` blocks on `needs-interview` items with a clear redirect to `/interview`
