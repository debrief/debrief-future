What happens when you realise a parameter was wrong after running ten more analysis steps on top of it? Today: re-run everything manually, hoping you remember the right values. Soon in Future Debrief: edit the one parameter and the system replays every subsequent operation automatically.

The replay engine is a pure-function module with dependency injection -- no framework coupling, fully testable with mocks. It operates in-memory on the Zustand store, and if a tool version has changed since the original run, replay halts immediately rather than silently producing different results.

https://debrief.github.io/blog/2026/02/11/planning-replay-and-parameter-tuning

#FutureDebrief #MaritimeAnalysis #OpenSource
