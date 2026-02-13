import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{T as d}from"./ToolsPanel-9KZ_vcAK.js";import{T as p}from"./ThemeProvider-mvcGjblv.js";import"./index-B2-qRKKC.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./textfield-Dm39NdvL.js";import"./ContextMenu-smqYp-cW.js";const de={title:"Components/ToolsPanel",component:d,parameters:{layout:"centered",docs:{description:{component:`
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
        `}}},tags:["autodocs"],argTypes:{tools:{description:"List of tools to display",control:!1},onRunTool:{description:"Callback when a tool is run",action:"run-tool"}},decorators:[(t,$)=>{const ee=$.globals.theme||"dark";return e.jsx(p,{theme:{variant:ee},children:e.jsx("div",{style:{width:320,padding:16},children:e.jsx(t,{})})})}]},m=[{id:"range",name:"Range & Bearing",description:"Calculate range and bearing between tracks",applicable:!0},{id:"speed",name:"Speed Calculator",description:"Calculate speed over ground",applicable:!0},{id:"intercept",name:"Intercept Solution",description:"Find intercept course and speed",applicable:!1,explanation:"Requires exactly 2 tracks"},{id:"cpa",name:"Closest Point of Approach",description:"Find CPA between tracks",applicable:!1,explanation:"Requires at least 2 tracks with overlapping time ranges"}],te=[{id:"range",name:"Range & Bearing",description:"Calculate range and bearing between tracks",applicable:!0},{id:"speed",name:"Speed Calculator",description:"Calculate speed over ground",applicable:!0},{id:"intercept",name:"Intercept Solution",description:"Find intercept course and speed",applicable:!0}],re=[{id:"intercept",name:"Intercept Solution",description:"Find intercept course and speed",applicable:!1,explanation:"Requires exactly 2 tracks"},{id:"cpa",name:"Closest Point of Approach",description:"Find CPA between tracks",applicable:!1,explanation:"Requires at least 2 tracks with overlapping time ranges"}],r={args:{tools:m}},a={args:{tools:te},parameters:{docs:{description:{story:"When the current selection matches all tool requirements, all tools are shown as active with run buttons."}}}},o={args:{tools:re},parameters:{docs:{description:{story:"When the current selection doesn't match any tool requirements, all tools are shown dimmed with explanations."}}}},n={args:{tools:[]},parameters:{docs:{description:{story:"When no tools are available (or no features selected), a message prompts the user to select features."}}}},s={args:{tools:m},render:t=>e.jsx(p,{theme:{variant:"light"},children:e.jsx("div",{style:{width:320,padding:16,background:"#f5f5f5"},children:e.jsx(d,{...t})})}),parameters:{docs:{description:{story:"Tools panel styled for light theme environments."}}}},i={args:{tools:m},render:t=>e.jsx(p,{theme:{variant:"dark"},children:e.jsx("div",{style:{width:320,padding:16,background:"#1e1e1e"},children:e.jsx(d,{...t})})}),parameters:{docs:{description:{story:"Tools panel styled for dark theme environments (default)."}}}},l={args:{tools:m},render:t=>e.jsx(p,{theme:{variant:"vscode"},children:e.jsx("div",{style:{width:320,padding:16,background:"#1e1e1e"},children:e.jsx(d,{...t})})}),parameters:{docs:{description:{story:"Tools panel styled for VS Code sidebar integration."}}}},c={args:{tools:[{id:"set-track-color",name:"Set Track Color",description:"Sets the display color for track features",applicable:!0,parameters:[{name:"color",valueType:"enum",description:"Track colour",paramType:"NamedColor"}]},{id:"calculate-range",name:"Calculate Range",description:"Calculate range between tracks",applicable:!0}],hasToolInventory:!0,hasSelection:!0},parameters:{docs:{description:{story:"When a tool has parameters, clicking it opens a context menu to collect parameter values before execution. Tools without parameters execute immediately."}}}};var u,h,g,y,T;r.parameters={...r.parameters,docs:{...(u=r.parameters)==null?void 0:u.docs,source:{originalSource:`{
  args: {
    tools: MIXED_TOOLS
  }
}`,...(g=(h=r.parameters)==null?void 0:h.docs)==null?void 0:g.source},description:{story:"Default tools panel with a mix of active and inactive tools.",...(T=(y=r.parameters)==null?void 0:y.docs)==null?void 0:T.description}}};var v,f,b,w,k;a.parameters={...a.parameters,docs:{...(v=a.parameters)==null?void 0:v.docs,source:{originalSource:`{
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
}`,...(b=(f=a.parameters)==null?void 0:f.docs)==null?void 0:b.source},description:{story:`Panel with all tools active.
Typically shown when selection matches all tool requirements.`,...(k=(w=a.parameters)==null?void 0:w.docs)==null?void 0:k.description}}};var S,x,C,P,L;o.parameters={...o.parameters,docs:{...(S=o.parameters)==null?void 0:S.docs,source:{originalSource:`{
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
}`,...(C=(x=o.parameters)==null?void 0:x.docs)==null?void 0:C.source},description:{story:`Panel with all tools inactive.
Typically shown when selection doesn't match any tool requirements.`,...(L=(P=o.parameters)==null?void 0:P.docs)==null?void 0:L.description}}};var A,I,O,E,_;n.parameters={...n.parameters,docs:{...(A=n.parameters)==null?void 0:A.docs,source:{originalSource:`{
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
}`,...(O=(I=n.parameters)==null?void 0:I.docs)==null?void 0:O.source},description:{story:"Empty state shown when no tools are available.",...(_=(E=n.parameters)==null?void 0:E.docs)==null?void 0:_.description}}};var j,R,D,q,V;s.parameters={...s.parameters,docs:{...(j=s.parameters)==null?void 0:j.docs,source:{originalSource:`{
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
}`,...(D=(R=s.parameters)==null?void 0:R.docs)==null?void 0:D.source},description:{story:"Light theme variant.",...(V=(q=s.parameters)==null?void 0:q.docs)==null?void 0:V.description}}};var W,M,F,X,N;i.parameters={...i.parameters,docs:{...(W=i.parameters)==null?void 0:W.docs,source:{originalSource:`{
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
}`,...(F=(M=i.parameters)==null?void 0:M.docs)==null?void 0:F.source},description:{story:"Dark theme variant (default).",...(N=(X=i.parameters)==null?void 0:X.docs)==null?void 0:N.description}}};var z,B,U,G,H;l.parameters={...l.parameters,docs:{...(z=l.parameters)==null?void 0:z.docs,source:{originalSource:`{
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
}`,...(U=(B=l.parameters)==null?void 0:B.docs)==null?void 0:U.source},description:{story:"VS Code theme variant (dark with VS Code colors).",...(H=(G=l.parameters)==null?void 0:G.docs)==null?void 0:H.description}}};var J,K,Q,Y,Z;c.parameters={...c.parameters,docs:{...(J=c.parameters)==null?void 0:J.docs,source:{originalSource:`{
  args: {
    tools: [{
      id: 'set-track-color',
      name: 'Set Track Color',
      description: 'Sets the display color for track features',
      applicable: true,
      parameters: [{
        name: 'color',
        valueType: 'enum',
        description: 'Track colour',
        paramType: 'NamedColor'
      }]
    }, {
      id: 'calculate-range',
      name: 'Calculate Range',
      description: 'Calculate range between tracks',
      applicable: true
    }],
    hasToolInventory: true,
    hasSelection: true
  },
  parameters: {
    docs: {
      description: {
        story: 'When a tool has parameters, clicking it opens a context menu to collect parameter values before execution. Tools without parameters execute immediately.'
      }
    }
  }
}`,...(Q=(K=c.parameters)==null?void 0:K.docs)==null?void 0:Q.source},description:{story:`Tool with parameters triggers a ParameterCollector on click.
Click "Set Track Color" to see the colour picker context menu.
"Calculate Range" has no parameters and executes immediately.`,...(Z=(Y=c.parameters)==null?void 0:Y.docs)==null?void 0:Z.description}}};const pe=["Default","AllActive","AllInactive","EmptyState","LightTheme","DarkTheme","VSCodeTheme","WithParameterizedTool"];export{a as AllActive,o as AllInactive,i as DarkTheme,r as Default,n as EmptyState,s as LightTheme,l as VSCodeTheme,c as WithParameterizedTool,pe as __namedExportsOrder,de as default};
