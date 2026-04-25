import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{T as r}from"./ThemeProvider-47c8oKUw.js";import{u as R}from"./useTheme-BAxHl-EG.js";import"./index-B2-qRKKC.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./defaultTheme-lXwsM3al.js";const E={title:"Foundation/ThemeProvider",component:r,parameters:{layout:"centered",docs:{description:{component:"ThemeProvider manages the Debrief design system tokens and theme variants. Wrap your application with ThemeProvider to enable consistent styling across all components."}}},tags:["autodocs"]};function d(){const{theme:c,resolvedVariant:C,isDark:S,setTheme:m}=R(),D={padding:"var(--debrief-space-lg)",backgroundColor:"var(--debrief-bg-secondary)",borderRadius:"var(--debrief-radius-md)",border:"1px solid var(--debrief-border-color)",minWidth:300},P={color:"var(--debrief-text-primary)",fontFamily:"var(--debrief-font-family)",fontSize:"var(--debrief-font-size-lg)",fontWeight:"var(--debrief-font-weight-bold)",marginBottom:"var(--debrief-space-md)"},o={color:"var(--debrief-text-secondary)",fontFamily:"var(--debrief-font-family)",fontSize:"var(--debrief-font-size-md)",marginBottom:"var(--debrief-space-sm)"},l={padding:"var(--debrief-space-sm) var(--debrief-space-md)",backgroundColor:"var(--debrief-color-primary)",color:"var(--debrief-text-inverse)",border:"none",borderRadius:"var(--debrief-radius-md)",cursor:"pointer",fontFamily:"var(--debrief-font-family)",fontSize:"var(--debrief-font-size-md)"},t=w=>({display:"inline-block",width:24,height:24,backgroundColor:w,borderRadius:"var(--debrief-radius-sm)",marginRight:"var(--debrief-space-xs)",border:"1px solid var(--debrief-border-color)"});return e.jsxs("div",{style:D,children:[e.jsx("h3",{style:P,children:"Theme Demo"}),e.jsxs("p",{style:o,children:["Current variant: ",c.variant]}),e.jsxs("p",{style:o,children:["Resolved: ",C]}),e.jsxs("p",{style:o,children:["Dark mode: ",S?"Yes":"No"]}),e.jsxs("div",{style:{marginTop:"var(--debrief-space-md)",marginBottom:"var(--debrief-space-md)"},children:[e.jsx("p",{style:{...o,fontWeight:"var(--debrief-font-weight-medium)"},children:"Track Colors:"}),e.jsxs("div",{children:[e.jsx("span",{style:t("var(--debrief-color-ownship)"),title:"Ownship"}),e.jsx("span",{style:t("var(--debrief-color-contact)"),title:"Contact"}),e.jsx("span",{style:t("var(--debrief-color-reference)"),title:"Reference"}),e.jsx("span",{style:t("var(--debrief-color-solution)"),title:"Solution"})]})]}),e.jsxs("div",{style:{display:"flex",gap:"var(--debrief-space-sm)"},children:[e.jsx("button",{style:l,onClick:()=>m({variant:"light"}),children:"Light"}),e.jsx("button",{style:l,onClick:()=>m({variant:"dark"}),children:"Dark"}),e.jsx("button",{style:l,onClick:()=>m({variant:"vscode"}),children:"VS Code"})]})]})}const s={render:()=>e.jsx(r,{children:e.jsx(d,{})})},n={render:()=>e.jsx(r,{theme:{variant:"dark"},children:e.jsx(d,{})})},a={render:()=>e.jsx(r,{theme:{variant:"vscode"},children:e.jsx(d,{})})},i={render:()=>{const c={variant:"light",tokens:{colorPrimary:"#8b5cf6",colorOwnship:"#8b5cf6",colorContact:"#ec4899"}};return e.jsx(r,{theme:c,children:e.jsx(d,{})})},parameters:{docs:{description:{story:"Custom tokens can override any theme variable."}}}};var h,p,v;s.parameters={...s.parameters,docs:{...(h=s.parameters)==null?void 0:h.docs,source:{originalSource:`{
  render: () => <ThemeProvider>
      <ThemeDemo />
    </ThemeProvider>
}`,...(v=(p=s.parameters)==null?void 0:p.docs)==null?void 0:v.source}}};var f,b,u;n.parameters={...n.parameters,docs:{...(f=n.parameters)==null?void 0:f.docs,source:{originalSource:`{
  render: () => <ThemeProvider theme={{
    variant: 'dark'
  }}>
      <ThemeDemo />
    </ThemeProvider>
}`,...(u=(b=n.parameters)==null?void 0:b.docs)==null?void 0:u.source}}};var y,x,g;a.parameters={...a.parameters,docs:{...(y=a.parameters)==null?void 0:y.docs,source:{originalSource:`{
  render: () => <ThemeProvider theme={{
    variant: 'vscode'
  }}>
      <ThemeDemo />
    </ThemeProvider>
}`,...(g=(x=a.parameters)==null?void 0:x.docs)==null?void 0:g.source}}};var T,j,k;i.parameters={...i.parameters,docs:{...(T=i.parameters)==null?void 0:T.docs,source:{originalSource:`{
  render: () => {
    const customTheme: Theme = {
      variant: 'light',
      tokens: {
        colorPrimary: '#8b5cf6',
        colorOwnship: '#8b5cf6',
        colorContact: '#ec4899'
      }
    };
    return <ThemeProvider theme={customTheme}>
        <ThemeDemo />
      </ThemeProvider>;
  },
  parameters: {
    docs: {
      description: {
        story: 'Custom tokens can override any theme variable.'
      }
    }
  }
}`,...(k=(j=i.parameters)==null?void 0:j.docs)==null?void 0:k.source}}};const _=["Default","DarkTheme","VSCodeTheme","CustomTokens"];export{i as CustomTokens,n as DarkTheme,s as Default,a as VSCodeTheme,_ as __namedExportsOrder,E as default};
