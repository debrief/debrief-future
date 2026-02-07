Last week's bug taught us something: tests that duplicate implementation logic aren't actually testing the implementation.

Our STAC service tests reimplemented categorization logic - when the real code drifted, the tests kept passing. A five-line bug hid for weeks.

We added 64 unit tests that mock the filesystem and call actual service methods. Coverage went from gaps to 97%. The specific bug case - what happens when there's no GeoJSON asset - is now explicitly tested.

The trick was counting `fs.readFileSync` calls to verify cache behaviour. Unit tests caught cache invalidation edge cases that integration tests would have missed.

Defence analysis needs reliable data handling. Now the STAC service has it.

[Link to full post]

#FutureDebrief #Testing #OpenSource
