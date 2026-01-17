import { addons } from '@storybook/manager-api';
import { create } from '@storybook/theming/create';

const debriefTheme = create({
  base: 'light',
  brandTitle: 'Debrief Components',
  brandUrl: 'https://github.com/debrief/debrief-future',
  brandTarget: '_blank',

  // Colors
  colorPrimary: '#0066cc',
  colorSecondary: '#0066cc',

  // UI
  appBg: '#f5f5f5',
  appContentBg: '#ffffff',
  appBorderColor: '#e0e0e0',
  appBorderRadius: 4,

  // Text colors
  textColor: '#333333',
  textInverseColor: '#ffffff',

  // Toolbar default and active colors
  barTextColor: '#666666',
  barSelectedColor: '#0066cc',
  barBg: '#ffffff',

  // Form colors
  inputBg: '#ffffff',
  inputBorder: '#cccccc',
  inputTextColor: '#333333',
  inputBorderRadius: 4,
});

addons.setConfig({
  theme: debriefTheme,
  sidebar: {
    showRoots: true,
  },
});
