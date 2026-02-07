A bug slipped through our tests last week. The fix took 5 minutes — but the bug had been hiding for weeks because our tests were testing the wrong thing.

The STAC service handles all plot data storage in Future Debrief. Our existing tests duplicated the service's categorization logic instead of calling the actual methods. When the real code drifted, the tests kept passing.

This week we're adding proper unit tests — 60 test cases covering all public methods, with mocked file system operations. The goal is >80% coverage and confidence that edge cases (missing files, malformed JSON, null geometries) fail explicitly rather than silently.

Defence analysis can't afford silent data failures.

[Link to planning post]

#FutureDebrief #Testing #OpenSource
