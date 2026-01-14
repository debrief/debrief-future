import type { Meta, StoryObj } from '@storybook/react';
import { SuccessView } from '../src/renderer/components/SuccessView';
import '../src/renderer/i18n';

const meta: Meta<typeof SuccessView> = {
  title: 'Components/SuccessView',
  component: SuccessView,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SuccessView>;

export const Default: Story = {
  args: {
    result: {
      plotId: 'plot-neptune',
      plotName: 'Operation Neptune',
      storeName: 'Project Alpha Store',
      featuresLoaded: 45,
      assetPath: '/shared/projects/alpha/catalog/plot-neptune/assets/sample-track.rep',
      provenanceId: 'prov-abc123',
    },
  },
};

export const ManyFeatures: Story = {
  args: {
    result: {
      plotId: 'plot-fleet',
      plotName: 'Fleet Exercise 2024',
      storeName: 'Local Analysis Store',
      featuresLoaded: 1542,
      assetPath: '/home/user/debrief/local-catalog/plot-fleet/assets/fleet-data.rep',
      provenanceId: 'prov-xyz789',
    },
  },
};

export const SingleFeature: Story = {
  args: {
    result: {
      plotId: 'plot-single',
      plotName: 'Quick Test',
      storeName: 'Local Analysis Store',
      featuresLoaded: 1,
      assetPath: '/home/user/debrief/local-catalog/plot-single/assets/test.rep',
      provenanceId: 'prov-test001',
    },
  },
};
