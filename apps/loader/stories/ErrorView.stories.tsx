import type { Meta, StoryObj } from '@storybook/react';
import { ErrorView } from '../src/renderer/components/ErrorView';
import '../src/renderer/i18n';

const meta: Meta<typeof ErrorView> = {
  title: 'Components/ErrorView',
  component: ErrorView,
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
    onRetry: { action: 'retry' },
  },
};

export default meta;
type Story = StoryObj<typeof ErrorView>;

export const ParseError: Story = {
  args: {
    error: {
      code: 'PARSE_ERROR',
      message: 'Failed to parse file: Invalid format at line 42',
      details: 'Expected track identifier but found "INVALID" at position 128',
      resolution: 'Check that the file is a valid REP format',
      retryable: false,
    },
  },
};

export const StoreError: Story = {
  args: {
    error: {
      code: 'STORE_ERROR',
      message: 'Cannot access store: Permission denied',
      resolution: 'Check that you have write permissions to the store directory',
      retryable: true,
    },
  },
};

export const WriteError: Story = {
  args: {
    error: {
      code: 'WRITE_ERROR',
      message: 'Failed to write data: Disk full',
      details: 'No space left on device (/shared/projects/alpha)',
      resolution: 'Free up disk space or select a different store',
      retryable: true,
    },
  },
};

export const ServiceError: Story = {
  args: {
    error: {
      code: 'SERVICE_ERROR',
      message: 'Service unavailable: debrief-stac not responding',
      resolution: 'Try restarting the application',
      retryable: true,
    },
  },
};

export const UnknownError: Story = {
  args: {
    error: {
      code: 'UNKNOWN',
      message: 'An unexpected error occurred',
      details: 'Error: ENOENT: no such file or directory',
      retryable: true,
    },
  },
};

export const NonRetryable: Story = {
  args: {
    error: {
      code: 'PARSE_ERROR',
      message: 'File format not supported',
      resolution: 'This file type is not supported. Only REP files can be loaded.',
      retryable: false,
    },
    onRetry: undefined,
  },
};
