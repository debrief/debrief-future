import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{a as R,T as o}from"./ThemeProvider-KrJW1DiK.js";import{r as z}from"./index-B2-qRKKC.js";import"./_commonjsHelpers-Cpj98o6Y.js";function E(){const r=z.useContext(R);if(!r)throw new Error("useTheme must be used within a ThemeProvider");return r}const B={title:"Foundation/ThemeProvider",component:o,parameters:{layout:"centered",docs:{description:{component:"ThemeProvider manages the Debrief design system tokens and theme variants. Wrap your application with ThemeProvider to enable consistent styling across all components."}}},tags:["autodocs"]};function c(){const{theme:r,resolvedVariant:C,isDark:S,setTheme:m}=E(),P={padding:"var(--debrief-space-lg)",backgroundColor:"var(--debrief-bg-secondary)",borderRadius:"var(--debrief-radius-md)",border:"1px solid var(--debrief-border-color)",minWidth:300},D={color:"var(--debrief-text-primary)",fontFamily:"var(--debrief-font-family)",fontSize:"var(--debrief-font-size-lg)",fontWeight:"var(--debrief-font-weight-bold)",marginBottom:"var(--debrief-space-md)"},t={color:"var(--debrief-text-secondary)",fontFamily:"var(--debrief-font-family)",fontSize:"var(--debrief-font-size-md)",marginBottom:"var(--debrief-space-sm)"},l={padding:"var(--debrief-space-sm) var(--debrief-space-md)",backgroundColor:"var(--debrief-color-primary)",color:"var(--debrief-text-inverse)",border:"none",borderRadius:"var(--debrief-radius-md)",cursor:"pointer",fontFamily:"var(--debrief-font-family)",fontSize:"var(--debrief-font-size-md)"},n=w=>({display:"inline-block",width:24,height:24,backgroundColor:w,borderRadius:"var(--debrief-radius-sm)",marginRight:"var(--debrief-space-xs)",border:"1px solid var(--debrief-border-color)"});return e.jsxs("div",{style:P,children:[e.jsx("h3",{style:D,children:"Theme Demo"}),e.jsxs("p",{style:t,children:["Current variant: ",r.variant]}),e.jsxs("p",{style:t,children:["Resolved: ",C]}),e.jsxs("p",{style:t,children:["Dark mode: ",S?"Yes":"No"]}),e.jsxs("div",{style:{marginTop:"var(--debrief-space-md)",marginBottom:"var(--debrief-space-md)"},children:[e.jsx("p",{style:{...t,fontWeight:"var(--debrief-font-weight-medium)"},children:"Track Colors:"}),e.jsxs("div",{children:[e.jsx("span",{style:n("var(--debrief-color-ownship)"),title:"Ownship"}),e.jsx("span",{style:n("var(--debrief-color-contact)"),title:"Contact"}),e.jsx("span",{style:n("var(--debrief-color-reference)"),title:"Reference"}),e.jsx("span",{style:n("var(--debrief-color-solution)"),title:"Solution"})]})]}),e.jsxs("div",{style:{display:"flex",gap:"var(--debrief-space-sm)"},children:[e.jsx("button",{style:l,onClick:()=>m({variant:"light"}),children:"Light"}),e.jsx("button",{style:l,onClick:()=>m({variant:"dark"}),children:"Dark"}),e.jsx("button",{style:l,onClick:()=>m({variant:"vscode"}),children:"VS Code"})]})]})}const s={render:()=>e.jsx(o,{children:e.jsx(c,{})})},a={render:()=>e.jsx(o,{theme:{variant:"dark"},children:e.jsx(c,{})})},i={render:()=>e.jsx(o,{theme:{variant:"vscode"},children:e.jsx(c,{})})},d={render:()=>{const r={variant:"light",tokens:{colorPrimary:"#8b5cf6",colorOwnship:"#8b5cf6",colorContact:"#ec4899"}};return e.jsx(o,{theme:r,children:e.jsx(c,{})})},parameters:{docs:{description:{story:"Custom tokens can override any theme variable."}}}};var h,v,p;s.parameters={...s.parameters,docs:{...(h=s.parameters)==null?void 0:h.docs,source:{originalSource:`{
  render: () => <ThemeProvider>
      <ThemeDemo />
    </ThemeProvider>
}`,...(p=(v=s.parameters)==null?void 0:v.docs)==null?void 0:p.source}}};var f,b,u;a.parameters={...a.parameters,docs:{...(f=a.parameters)==null?void 0:f.docs,source:{originalSource:`{
  render: () => <ThemeProvider theme={{
    variant: 'dark'
  }}>
      <ThemeDemo />
    </ThemeProvider>
}`,...(u=(b=a.parameters)==null?void 0:b.docs)==null?void 0:u.source}}};var y,x,T;i.parameters={...i.parameters,docs:{...(y=i.parameters)==null?void 0:y.docs,source:{originalSource:`{
  render: () => <ThemeProvider theme={{
    variant: 'vscode'
  }}>
      <ThemeDemo />
    </ThemeProvider>
}`,...(T=(x=i.parameters)==null?void 0:x.docs)==null?void 0:T.source}}};var g,j,k;d.parameters={...d.parameters,docs:{...(g=d.parameters)==null?void 0:g.docs,source:{originalSource:`{
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
}`,...(k=(j=d.parameters)==null?void 0:j.docs)==null?void 0:k.source}}};const _=["Default","DarkTheme","VSCodeTheme","CustomTokens"];export{d as CustomTokens,a as DarkTheme,s as Default,i as VSCodeTheme,_ as __namedExportsOrder,B as default};
