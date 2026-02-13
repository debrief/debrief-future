A track with 500 positions tells you where a vessel was. It does not tell you where it was heading or how fast it was moving. Those values need to be derived.

The generate-courses-speeds tool landed in Future Debrief this week -- spec, Python, TypeScript, 10 new tests (352 total passing). It walks consecutive track positions, computes initial bearing and Haversine distance, and writes course and speed into each position's metadata. Standard library math only.

The interesting design choice: course is forward-looking. Position i gets the bearing toward position i+1. The last position carries forward from the penultimate leg. N values for N positions, no gaps.

This is the first track/manipulation tool and a building block. Dead reckoning, speed-change detection, and manoeuvre analysis all need course and speed as inputs. Now any loaded track can have them computed in one step.

[Read the full post: LINK]

#FutureDebrief #MaritimeAnalysis #OpenSource
