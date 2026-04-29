import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{T as r}from"./ThemeProvider-yoWuHKa_.js";import{u as L}from"./useTheme-DUm7hPwc.js";import"./index-B2-qRKKC.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./defaultTheme-Tx6C8nph.js";const V={title:"Foundation/ThemeProvider",component:r,parameters:{layout:"centered",docs:{description:{component:"ThemeProvider manages the Debrief design system tokens and theme variants. Wrap your application with ThemeProvider to enable consistent styling across all components."}}},tags:["autodocs"]};function o(){const{theme:h,resolvedVariant:w,isDark:R,setTheme:t}=L(),z={padding:"var(--debrief-space-lg)",backgroundColor:"var(--debrief-bg-secondary)",borderRadius:"var(--debrief-radius-md)",border:"1px solid var(--debrief-border-color)",minWidth:300},H={color:"var(--debrief-text-primary)",fontFamily:"var(--debrief-font-family)",fontSize:"var(--debrief-font-size-lg)",fontWeight:"var(--debrief-font-weight-bold)",marginBottom:"var(--debrief-space-md)"},a={color:"var(--debrief-text-secondary)",fontFamily:"var(--debrief-font-family)",fontSize:"var(--debrief-font-size-md)",marginBottom:"var(--debrief-space-sm)"},n={padding:"var(--debrief-space-sm) var(--debrief-space-md)",backgroundColor:"var(--debrief-color-primary)",color:"var(--debrief-text-inverse)",border:"none",borderRadius:"var(--debrief-radius-md)",cursor:"pointer",fontFamily:"var(--debrief-font-family)",fontSize:"var(--debrief-font-size-md)"},s=F=>({display:"inline-block",width:24,height:24,backgroundColor:F,borderRadius:"var(--debrief-radius-sm)",marginRight:"var(--debrief-space-xs)",border:"1px solid var(--debrief-border-color)"});return e.jsxs("div",{style:z,children:[e.jsx("h3",{style:H,children:"Theme Demo"}),e.jsxs("p",{style:a,children:["Current variant: ",h.variant]}),e.jsxs("p",{style:a,children:["Resolved: ",w]}),e.jsxs("p",{style:a,children:["Dark mode: ",R?"Yes":"No"]}),e.jsxs("div",{style:{marginTop:"var(--debrief-space-md)",marginBottom:"var(--debrief-space-md)"},children:[e.jsx("p",{style:{...a,fontWeight:"var(--debrief-font-weight-medium)"},children:"Track Colors:"}),e.jsxs("div",{children:[e.jsx("span",{style:s("var(--debrief-color-ownship)"),title:"Ownship"}),e.jsx("span",{style:s("var(--debrief-color-contact)"),title:"Contact"}),e.jsx("span",{style:s("var(--debrief-color-reference)"),title:"Reference"}),e.jsx("span",{style:s("var(--debrief-color-solution)"),title:"Solution"})]})]}),e.jsxs("div",{style:{display:"flex",gap:"var(--debrief-space-sm)"},children:[e.jsx("button",{style:n,onClick:()=>t({variant:"light"}),children:"Light"}),e.jsx("button",{style:n,onClick:()=>t({variant:"dark"}),children:"Dark"}),e.jsx("button",{style:n,onClick:()=>t({variant:"high-contrast-light"}),children:"HC Light"}),e.jsx("button",{style:n,onClick:()=>t({variant:"high-contrast-dark"}),children:"HC Dark"})]})]})}const i={render:()=>e.jsx(r,{children:e.jsx(o,{})})},d={render:()=>e.jsx(r,{theme:{variant:"dark"},children:e.jsx(o,{})})},c={render:()=>e.jsx(r,{theme:{variant:"high-contrast-light"},children:e.jsx(o,{})})},m={render:()=>e.jsx(r,{theme:{variant:"high-contrast-dark"},children:e.jsx(o,{})})},l={render:()=>{const h={variant:"light",tokens:{colorPrimary:"#8b5cf6",colorOwnship:"#8b5cf6",colorContact:"#ec4899"}};return e.jsx(r,{theme:h,children:e.jsx(o,{})})},parameters:{docs:{description:{story:"Custom tokens can override any theme variable."}}}};var p,v,f;i.parameters={...i.parameters,docs:{...(p=i.parameters)==null?void 0:p.docs,source:{originalSource:`{
  render: () => <ThemeProvider>
      <ThemeDemo />
    </ThemeProvider>
}`,...(f=(v=i.parameters)==null?void 0:v.docs)==null?void 0:f.source}}};var b,u,g;d.parameters={...d.parameters,docs:{...(b=d.parameters)==null?void 0:b.docs,source:{originalSource:`{
  render: () => <ThemeProvider theme={{
    variant: 'dark'
  }}>
      <ThemeDemo />
    </ThemeProvider>
}`,...(g=(u=d.parameters)==null?void 0:u.docs)==null?void 0:g.source}}};var y,x,T;c.parameters={...c.parameters,docs:{...(y=c.parameters)==null?void 0:y.docs,source:{originalSource:`{
  render: () => <ThemeProvider theme={{
    variant: 'high-contrast-light'
  }}>
      <ThemeDemo />
    </ThemeProvider>
}`,...(T=(x=c.parameters)==null?void 0:x.docs)==null?void 0:T.source}}};var k,j,C;m.parameters={...m.parameters,docs:{...(k=m.parameters)==null?void 0:k.docs,source:{originalSource:`{
  render: () => <ThemeProvider theme={{
    variant: 'high-contrast-dark'
  }}>
      <ThemeDemo />
    </ThemeProvider>
}`,...(C=(j=m.parameters)==null?void 0:j.docs)==null?void 0:C.source}}};var D,P,S;l.parameters={...l.parameters,docs:{...(D=l.parameters)==null?void 0:D.docs,source:{originalSource:`{
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
}`,...(S=(P=l.parameters)==null?void 0:P.docs)==null?void 0:S.source}}};const Y=["Default","DarkTheme","HighContrastLightTheme","HighContrastDarkTheme","CustomTokens"];export{l as CustomTokens,d as DarkTheme,i as Default,m as HighContrastDarkTheme,c as HighContrastLightTheme,Y as __namedExportsOrder,V as default};
