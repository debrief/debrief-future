import type { Meta, StoryObj } from '@storybook/react';
import { StoreSelector } from '../src/renderer/components/StoreSelector';
import type { StacStoreInfo } from '../src/renderer/types/store';
import '../src/renderer/i18n';

const mockStores: StacStoreInfo[] = [
  {
    id: 'local',
    name: 'Local Analysis Store',
    path: '/home/user/debrief/local-catalog',
    plotCount: 3,
    accessible: true,
  },
  {
    id: 'project',
    name: 'Project Alpha Store',
    path: '/shared/projects/alpha/catalog',
    plotCount: 12,
    accessible: true,
  },
  {
    id: 'inaccessible',
    name: 'Remote Store (Offline)',
    path: '/mnt/network/debrief-catalog',
    plotCount: 0,
    accessible: false,
    accessError: 'Network path not available',
  },
];

const meta: Meta<typeof StoreSelector> = {
  title: 'Components/StoreSelector',
  component: StoreSelector,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    onSelect: { action: 'select' },
    onNext: { action: 'next' },
    onCancel: { action: 'cancel' },
  },
};

export default meta;
type Story = StoryObj<typeof StoreSelector>;

export const MultipleStores: Story = {
  args: {
    stores: mockStores,
    selectedStore: null,
  },
};

export const SingleStore: Story = {
  args: {
    stores: [mockStores[0]],
    selectedStore: null,
  },
};

export const WithSelection: Story = {
  args: {
    stores: mockStores,
    selectedStore: mockStores[1],
  },
};

export const WithInaccessibleStore: Story = {
  args: {
    stores: [mockStores[2], mockStores[0]],
    selectedStore: null,
  },
};
