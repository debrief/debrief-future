import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{T as c}from"./ToolsPanel-Dfu2DdFh.js";import{T as d}from"./ThemeProvider-mvcGjblv.js";import"./index-B2-qRKKC.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./textfield-Dm39NdvL.js";const oe={title:"Components/ToolsPanel",component:c,parameters:{layout:"centered",docs:{description:{component:`
Panel displaying available analysis tools for the current feature selection.

## Features

- **Active Tools**: Shown with run button and full opacity
- **Inactive Tools**: Shown dimmed with explanation tooltip
- **Empty State**: Message when no tools available

## Usage

\`\`\`tsx
import { ToolsPanel } from '@debrief/components';

<ToolsPanel
  tools={toolMatches}
  onRunTool={(id) => runAnalysisTool(id)}
/>
\`\`\`
        `}}},tags:["autodocs"],argTypes:{tools:{description:"List of tools to display",control:!1},onRunTool:{description:"Callback when a tool is run",action:"run-tool"}},decorators:[(t,H)=>{const J=H.globals.theme||"dark";return e.jsx(d,{theme:{variant:J},children:e.jsx("div",{style:{width:320,padding:16},children:e.jsx(t,{})})})}]},p=[{id:"range",name:"Range & Bearing",description:"Calculate range and bearing between tracks",applicable:!0},{id:"speed",name:"Speed Calculator",description:"Calculate speed over ground",applicable:!0},{id:"intercept",name:"Intercept Solution",description:"Find intercept course and speed",applicable:!1,explanation:"Requires exactly 2 tracks"},{id:"cpa",name:"Closest Point of Approach",description:"Find CPA between tracks",applicable:!1,explanation:"Requires at least 2 tracks with overlapping time ranges"}],K=[{id:"range",name:"Range & Bearing",description:"Calculate range and bearing between tracks",applicable:!0},{id:"speed",name:"Speed Calculator",description:"Calculate speed over ground",applicable:!0},{id:"intercept",name:"Intercept Solution",description:"Find intercept course and speed",applicable:!0}],Q=[{id:"intercept",name:"Intercept Solution",description:"Find intercept course and speed",applicable:!1,explanation:"Requires exactly 2 tracks"},{id:"cpa",name:"Closest Point of Approach",description:"Find CPA between tracks",applicable:!1,explanation:"Requires at least 2 tracks with overlapping time ranges"}],r={args:{tools:p}},o={args:{tools:K},parameters:{docs:{description:{story:"When the current selection matches all tool requirements, all tools are shown as active with run buttons."}}}},n={args:{tools:Q},parameters:{docs:{description:{story:"When the current selection doesn't match any tool requirements, all tools are shown dimmed with explanations."}}}},s={args:{tools:[]},parameters:{docs:{description:{story:"When no tools are available (or no features selected), a message prompts the user to select features."}}}},a={args:{tools:p},render:t=>e.jsx(d,{theme:{variant:"light"},children:e.jsx("div",{style:{width:320,padding:16,background:"#f5f5f5"},children:e.jsx(c,{...t})})}),parameters:{docs:{description:{story:"Tools panel styled for light theme environments."}}}},i={args:{tools:p},render:t=>e.jsx(d,{theme:{variant:"dark"},children:e.jsx("div",{style:{width:320,padding:16,background:"#1e1e1e"},children:e.jsx(c,{...t})})}),parameters:{docs:{description:{story:"Tools panel styled for dark theme environments (default)."}}}},l={args:{tools:p},render:t=>e.jsx(d,{theme:{variant:"vscode"},children:e.jsx("div",{style:{width:320,padding:16,background:"#1e1e1e"},children:e.jsx(c,{...t})})}),parameters:{docs:{description:{story:"Tools panel styled for VS Code sidebar integration."}}}};var m,h,u,g,v;r.parameters={...r.parameters,docs:{...(m=r.parameters)==null?void 0:m.docs,source:{originalSource:`{
  args: {
    tools: MIXED_TOOLS
  }
}`,...(u=(h=r.parameters)==null?void 0:h.docs)==null?void 0:u.source},description:{story:"Default tools panel with a mix of active and inactive tools.",...(v=(g=r.parameters)==null?void 0:g.docs)==null?void 0:v.description}}};var y,T,f,w,b;o.parameters={...o.parameters,docs:{...(y=o.parameters)==null?void 0:y.docs,source:{originalSource:`{
  args: {
    tools: ALL_ACTIVE_TOOLS
  },
  parameters: {
    docs: {
      description: {
        story: 'When the current selection matches all tool requirements, all tools are shown as active with run buttons.'
      }
    }
  }
}`,...(f=(T=o.parameters)==null?void 0:T.docs)==null?void 0:f.source},description:{story:`Panel with all tools active.
Typically shown when selection matches all tool requirements.`,...(b=(w=o.parameters)==null?void 0:w.docs)==null?void 0:b.description}}};var S,x,k,C,L;n.parameters={...n.parameters,docs:{...(S=n.parameters)==null?void 0:S.docs,source:{originalSource:`{
  args: {
    tools: ALL_INACTIVE_TOOLS
  },
  parameters: {
    docs: {
      description: {
        story: 'When the current selection doesn\\'t match any tool requirements, all tools are shown dimmed with explanations.'
      }
    }
  }
}`,...(k=(x=n.parameters)==null?void 0:x.docs)==null?void 0:k.source},description:{story:`Panel with all tools inactive.
Typically shown when selection doesn't match any tool requirements.`,...(L=(C=n.parameters)==null?void 0:C.docs)==null?void 0:L.description}}};var P,A,O,I,E;s.parameters={...s.parameters,docs:{...(P=s.parameters)==null?void 0:P.docs,source:{originalSource:`{
  args: {
    tools: []
  },
  parameters: {
    docs: {
      description: {
        story: 'When no tools are available (or no features selected), a message prompts the user to select features.'
      }
    }
  }
}`,...(O=(A=s.parameters)==null?void 0:A.docs)==null?void 0:O.source},description:{story:"Empty state shown when no tools are available.",...(E=(I=s.parameters)==null?void 0:I.docs)==null?void 0:E.description}}};var _,j,D,q,V;a.parameters={...a.parameters,docs:{...(_=a.parameters)==null?void 0:_.docs,source:{originalSource:`{
  args: {
    tools: MIXED_TOOLS
  },
  render: args => <ThemeProvider theme={{
    variant: 'light'
  }}>
      <div style={{
      width: 320,
      padding: 16,
      background: '#f5f5f5'
    }}>
        <ToolsPanel {...args} />
      </div>
    </ThemeProvider>,
  parameters: {
    docs: {
      description: {
        story: 'Tools panel styled for light theme environments.'
      }
    }
  }
}`,...(D=(j=a.parameters)==null?void 0:j.docs)==null?void 0:D.source},description:{story:"Light theme variant.",...(V=(q=a.parameters)==null?void 0:q.docs)==null?void 0:V.description}}};var R,M,F,W,X;i.parameters={...i.parameters,docs:{...(R=i.parameters)==null?void 0:R.docs,source:{originalSource:`{
  args: {
    tools: MIXED_TOOLS
  },
  render: args => <ThemeProvider theme={{
    variant: 'dark'
  }}>
      <div style={{
      width: 320,
      padding: 16,
      background: '#1e1e1e'
    }}>
        <ToolsPanel {...args} />
      </div>
    </ThemeProvider>,
  parameters: {
    docs: {
      description: {
        story: 'Tools panel styled for dark theme environments (default).'
      }
    }
  }
}`,...(F=(M=i.parameters)==null?void 0:M.docs)==null?void 0:F.source},description:{story:"Dark theme variant (default).",...(X=(W=i.parameters)==null?void 0:W.docs)==null?void 0:X.description}}};var B,N,U,z,G;l.parameters={...l.parameters,docs:{...(B=l.parameters)==null?void 0:B.docs,source:{originalSource:`{
  args: {
    tools: MIXED_TOOLS
  },
  render: args => <ThemeProvider theme={{
    variant: 'vscode'
  }}>
      <div style={{
      width: 320,
      padding: 16,
      background: '#1e1e1e'
    }}>
        <ToolsPanel {...args} />
      </div>
    </ThemeProvider>,
  parameters: {
    docs: {
      description: {
        story: 'Tools panel styled for VS Code sidebar integration.'
      }
    }
  }
}`,...(U=(N=l.parameters)==null?void 0:N.docs)==null?void 0:U.source},description:{story:"VS Code theme variant (dark with VS Code colors).",...(G=(z=l.parameters)==null?void 0:z.docs)==null?void 0:G.description}}};const ne=["Default","AllActive","AllInactive","EmptyState","LightTheme","DarkTheme","VSCodeTheme"];export{o as AllActive,n as AllInactive,i as DarkTheme,r as Default,s as EmptyState,a as LightTheme,l as VSCodeTheme,ne as __namedExportsOrder,oe as default};
