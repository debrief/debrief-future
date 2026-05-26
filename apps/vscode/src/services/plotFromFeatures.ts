/**
 * Shim — re-exports `plotFromFeatures` / `featuresFromPlot` from the
 * shared module they were hoisted to during the T-HOIST step of spec #264.
 *
 * Existing imports from `./services/plotFromFeatures` continue to work
 * unchanged.
 */

export {
  plotFromFeatures,
  featuresFromPlot,
} from '@debrief/components/storyboardPlayback';
