import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{T as m}from"./ToolsPanel-BqlWd7h-.js";import{T as u}from"./ThemeProvider-DF0jq0Ad.js";import"./index-B2-qRKKC.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./textfield-Dm39NdvL.js";import"./paramTypeResolver-Br4vj1cK.js";import"./types-CuJnRqfe.js";import"./ContextMenu-qheFrteX.js";import"./defaultTheme-Tx6C8nph.js";const Ce={title:"Components/ToolsPanel",component:m,parameters:{layout:"centered",docs:{description:{component:`
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
        `}}},tags:["autodocs"],argTypes:{tools:{description:"List of tools to display",control:!1},onRunTool:{description:"Callback when a tool is run",action:"run-tool"}},decorators:[(t,de)=>{const me=de.globals.theme||"dark";return e.jsx(u,{theme:{variant:me},children:e.jsx("div",{style:{width:320,padding:16},children:e.jsx(t,{})})})}]},h=[{id:"range",name:"Range & Bearing",description:"Calculate range and bearing between tracks",applicable:!0},{id:"speed",name:"Speed Calculator",description:"Calculate speed over ground",applicable:!0},{id:"intercept",name:"Intercept Solution",description:"Find intercept course and speed",applicable:!1,explanation:"Requires exactly 2 tracks"},{id:"cpa",name:"Closest Point of Approach",description:"Find CPA between tracks",applicable:!1,explanation:"Requires at least 2 tracks with overlapping time ranges"}],ue=[{id:"range",name:"Range & Bearing",description:"Calculate range and bearing between tracks",applicable:!0},{id:"speed",name:"Speed Calculator",description:"Calculate speed over ground",applicable:!0},{id:"intercept",name:"Intercept Solution",description:"Find intercept course and speed",applicable:!0}],he=[{id:"intercept",name:"Intercept Solution",description:"Find intercept course and speed",applicable:!1,explanation:"Requires exactly 2 tracks"},{id:"cpa",name:"Closest Point of Approach",description:"Find CPA between tracks",applicable:!1,explanation:"Requires at least 2 tracks with overlapping time ranges"}],a={args:{tools:h}},r={args:{tools:ue},parameters:{docs:{description:{story:"When the current selection matches all tool requirements, all tools are shown as active with run buttons."}}}},o={args:{tools:he},parameters:{docs:{description:{story:"When the current selection doesn't match any tool requirements, all tools are shown dimmed with explanations."}}}},n={args:{tools:[]},parameters:{docs:{description:{story:"When no tools are available (or no features selected), a message prompts the user to select features."}}}},s={args:{tools:h},render:t=>e.jsx(u,{theme:{variant:"light"},children:e.jsx("div",{style:{width:320,padding:16,background:"#f5f5f5"},children:e.jsx(m,{...t})})}),parameters:{docs:{description:{story:"Tools panel styled for light theme environments."}}}},i={args:{tools:h},render:t=>e.jsx(u,{theme:{variant:"dark"},children:e.jsx("div",{style:{width:320,padding:16,background:"#1e1e1e"},children:e.jsx(m,{...t})})}),parameters:{docs:{description:{story:"Tools panel styled for dark theme environments (default)."}}}},l={args:{tools:h},render:t=>e.jsx(u,{theme:{variant:"dark"},children:e.jsx("div",{style:{width:320,padding:16,background:"#1e1e1e"},children:e.jsx(m,{...t})})}),parameters:{docs:{description:{story:"Tools panel styled for VS Code sidebar integration."}}}},c={args:{tools:[{id:"set-track-color",name:"Set Track Color",description:"Sets the display color for track features",applicable:!0,parameters:[{name:"color",valueType:"enum",description:"Track colour",paramType:"NamedColor"}]},{id:"calculate-range",name:"Calculate Range",description:"Calculate range between tracks",applicable:!0}],hasToolInventory:!0,hasSelection:!0},parameters:{docs:{description:{story:"When a tool has parameters, clicking it opens a context menu to collect parameter values before execution. Tools without parameters execute immediately."}}}},p={args:{tools:[{id:"style-track",name:"Style Track",description:"Sets display style for track features",applicable:!0,parameters:[{name:"color",valueType:"enum",description:"Track colour",paramType:"NamedColor"},{name:"symbol",valueType:"enum",description:"Marker shape",paramType:"MarkerSymbol"}]}],hasToolInventory:!0,hasSelection:!0},parameters:{docs:{description:{story:"When a tool has multiple parameters, the context menu presents each parameter for collection before executing the tool."}}}},d={args:{tools:[{id:"toggle-labels",name:"Toggle Labels",description:"Toggle position label visibility on tracks",applicable:!0,parameters:[{name:"show_labels",valueType:"boolean",description:"Show position labels"}]}],hasToolInventory:!0,hasSelection:!0},parameters:{docs:{description:{story:"When a tool has a boolean parameter, the context menu presents a toggle control for the true/false value."}}}};var g,y,T,v,b;a.parameters={...a.parameters,docs:{...(g=a.parameters)==null?void 0:g.docs,source:{originalSource:`{
  args: {
    tools: MIXED_TOOLS
  }
}`,...(T=(y=a.parameters)==null?void 0:y.docs)==null?void 0:T.source},description:{story:"Default tools panel with a mix of active and inactive tools.",...(b=(v=a.parameters)==null?void 0:v.docs)==null?void 0:b.description}}};var f,k,S,w,x;r.parameters={...r.parameters,docs:{...(f=r.parameters)==null?void 0:f.docs,source:{originalSource:`{
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
}`,...(S=(k=r.parameters)==null?void 0:k.docs)==null?void 0:S.source},description:{story:`Panel with all tools active.
Typically shown when selection matches all tool requirements.`,...(x=(w=r.parameters)==null?void 0:w.docs)==null?void 0:x.description}}};var C,P,L,I,A;o.parameters={...o.parameters,docs:{...(C=o.parameters)==null?void 0:C.docs,source:{originalSource:`{
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
}`,...(L=(P=o.parameters)==null?void 0:P.docs)==null?void 0:L.source},description:{story:`Panel with all tools inactive.
Typically shown when selection doesn't match any tool requirements.`,...(A=(I=o.parameters)==null?void 0:I.docs)==null?void 0:A.description}}};var O,W,_,E,j;n.parameters={...n.parameters,docs:{...(O=n.parameters)==null?void 0:O.docs,source:{originalSource:`{
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
}`,...(_=(W=n.parameters)==null?void 0:W.docs)==null?void 0:_.source},description:{story:"Empty state shown when no tools are available.",...(j=(E=n.parameters)==null?void 0:E.docs)==null?void 0:j.description}}};var M,R,D,q,V;s.parameters={...s.parameters,docs:{...(M=s.parameters)==null?void 0:M.docs,source:{originalSource:`{
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
}`,...(D=(R=s.parameters)==null?void 0:R.docs)==null?void 0:D.source},description:{story:"Light theme variant.",...(V=(q=s.parameters)==null?void 0:q.docs)==null?void 0:V.description}}};var F,N,X,B,z;i.parameters={...i.parameters,docs:{...(F=i.parameters)==null?void 0:F.docs,source:{originalSource:`{
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
}`,...(X=(N=i.parameters)==null?void 0:N.docs)==null?void 0:X.source},description:{story:"Dark theme variant (default).",...(z=(B=i.parameters)==null?void 0:B.docs)==null?void 0:z.description}}};var U,G,H,J,K;l.parameters={...l.parameters,docs:{...(U=l.parameters)==null?void 0:U.docs,source:{originalSource:`{
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
        story: 'Tools panel styled for VS Code sidebar integration.'
      }
    }
  }
}`,...(H=(G=l.parameters)==null?void 0:G.docs)==null?void 0:H.source},description:{story:"VS Code theme variant (dark with VS Code colors).",...(K=(J=l.parameters)==null?void 0:J.docs)==null?void 0:K.description}}};var Q,Y,Z,$,ee;c.parameters={...c.parameters,docs:{...(Q=c.parameters)==null?void 0:Q.docs,source:{originalSource:`{
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
}`,...(Z=(Y=c.parameters)==null?void 0:Y.docs)==null?void 0:Z.source},description:{story:`Tool with parameters triggers a ParameterCollector on click.
Click "Set Track Color" to see the colour picker context menu.
"Calculate Range" has no parameters and executes immediately.`,...(ee=($=c.parameters)==null?void 0:$.docs)==null?void 0:ee.description}}};var te,ae,re,oe,ne;p.parameters={...p.parameters,docs:{...(te=p.parameters)==null?void 0:te.docs,source:{originalSource:`{
  args: {
    tools: [{
      id: 'style-track',
      name: 'Style Track',
      description: 'Sets display style for track features',
      applicable: true,
      parameters: [{
        name: 'color',
        valueType: 'enum',
        description: 'Track colour',
        paramType: 'NamedColor'
      }, {
        name: 'symbol',
        valueType: 'enum',
        description: 'Marker shape',
        paramType: 'MarkerSymbol'
      }]
    }],
    hasToolInventory: true,
    hasSelection: true
  },
  parameters: {
    docs: {
      description: {
        story: 'When a tool has multiple parameters, the context menu presents each parameter for collection before executing the tool.'
      }
    }
  }
}`,...(re=(ae=p.parameters)==null?void 0:ae.docs)==null?void 0:re.source},description:{story:`Tool with multiple parameters collects all values before execution.
Click "Style Track" to see the multi-parameter context menu.`,...(ne=(oe=p.parameters)==null?void 0:oe.docs)==null?void 0:ne.description}}};var se,ie,le,ce,pe;d.parameters={...d.parameters,docs:{...(se=d.parameters)==null?void 0:se.docs,source:{originalSource:`{
  args: {
    tools: [{
      id: 'toggle-labels',
      name: 'Toggle Labels',
      description: 'Toggle position label visibility on tracks',
      applicable: true,
      parameters: [{
        name: 'show_labels',
        valueType: 'boolean',
        description: 'Show position labels'
      }]
    }],
    hasToolInventory: true,
    hasSelection: true
  },
  parameters: {
    docs: {
      description: {
        story: 'When a tool has a boolean parameter, the context menu presents a toggle control for the true/false value.'
      }
    }
  }
}`,...(le=(ie=d.parameters)==null?void 0:ie.docs)==null?void 0:le.source},description:{story:`Tool with a boolean parameter shows a toggle control.
Click "Toggle Labels" to see the boolean parameter context menu.`,...(pe=(ce=d.parameters)==null?void 0:ce.docs)==null?void 0:pe.description}}};const Pe=["Default","AllActive","AllInactive","EmptyState","LightTheme","DarkTheme","VSCodeTheme","WithParameterizedTool","WithMultiParameterTool","WithBooleanParameterTool"];export{r as AllActive,o as AllInactive,i as DarkTheme,a as Default,n as EmptyState,s as LightTheme,l as VSCodeTheme,d as WithBooleanParameterTool,p as WithMultiParameterTool,c as WithParameterizedTool,Pe as __namedExportsOrder,Ce as default};
