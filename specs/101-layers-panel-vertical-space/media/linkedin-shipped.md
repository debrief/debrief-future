The Activity Panel in the VS Code extension had a persistent layout bug: collapse the Time Controller and Tools sections, and the Layers section wouldn't expand to fill the space. Large whitespace gaps made it look broken.

Two CSS rule changes fixed it — making the section-content wrapper a flex container and adding `flex: 1 1 0%` to the FeatureList. The flex-basis override takes precedence over the inline 300px height, and scrolling responsibility moves one level down in the DOM to where it belongs.

All 8 collapse-state combinations now produce correct layouts. 597 component tests still pass. 7 new Playwright tests verify every collapse state across light, dark, and VS Code themes. No regressions in the 1,660 total project tests.

Small polish fixes matter. This one was worth shipping well.

#FutureDebrief #DefenceAnalysis #CSS
