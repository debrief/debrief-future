import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r as x}from"./index-B2-qRKKC.js";import{C as b}from"./ContextMenu-qheFrteX.js";import{T as ae}from"./ThemeProvider-yoWuHKa_.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./defaultTheme-Tx6C8nph.js";const xe={title:"Components/ContextMenu",component:b,parameters:{layout:"centered",docs:{description:{component:`
Reusable inline context menu for parameter selection.

## Features

- **Keyboard navigation**: Arrow Up/Down, Enter to select, Escape to dismiss
- **Viewport repositioning**: Auto-adjusts to stay within viewport bounds
- **Custom input**: Optional "Custom..." mode for free-form text entry
- **Validation**: Custom input supports validation with error messages
- **Accessibility**: Uses \`role="menu"\` and \`role="menuitem"\`

## Usage

\`\`\`tsx
import { ContextMenu } from '@debrief/components';

<ContextMenu
  items={[
    { id: 'red', label: 'Red' },
    { id: 'blue', label: 'Blue' },
  ]}
  anchorPosition={{ x: 100, y: 200 }}
  onSelect={(id) => console.log('Selected:', id)}
  onDismiss={() => setOpen(false)}
/>
\`\`\`
        `}}},tags:["autodocs"],decorators:[(r,t)=>{const s=t.globals.theme||"dark";return e.jsx(ae,{theme:{variant:s},children:e.jsx("div",{style:{width:400,height:400,position:"relative",background:"var(--debrief-bg-secondary, #252526)"},children:e.jsx(r,{})})})}]},g=[{id:"red",label:"Red",description:"#FF0000"},{id:"green",label:"Green",description:"#00FF00"},{id:"blue",label:"Blue",description:"#0000FF"},{id:"yellow",label:"Yellow",description:"#FFFF00"},{id:"cyan",label:"Cyan",description:"#00FFFF"}],de=[{id:"linear",label:"Linear",description:"Straight-line interpolation between points"},{id:"cubic",label:"Cubic",description:"Smooth cubic spline interpolation"},{id:"nearest",label:"Nearest",description:"Snap to nearest known value"}],pe=Array.from({length:25},(r,t)=>({id:`item-${t+1}`,label:`Option ${t+1}`,description:t%3===0?`Description for option ${t+1}`:void 0}));function o({items:r,header:t,showCustomOption:s,validateCustom:v,anchorPosition:ce={x:20,y:20}}){const[u,f]=x.useState(null),[me,h]=x.useState(!1);return me?e.jsxs("div",{style:{padding:20,color:"var(--debrief-text-primary, #ccc)"},children:[e.jsxs("p",{children:["Menu dismissed. ",u?`Last selected: ${u}`:"No selection."]}),e.jsx("button",{style:{marginTop:8,padding:"4px 12px",cursor:"pointer"},onClick:()=>h(!1),children:"Reopen"})]}):e.jsxs(e.Fragment,{children:[e.jsx(b,{items:r,anchorPosition:ce,header:t,onSelect:y=>{f(y),h(!0)},onDismiss:()=>h(!0),showCustomOption:s,onCustomValue:y=>{f(`custom:${y}`),h(!0)},validateCustom:v}),u&&e.jsxs("div",{style:{position:"absolute",bottom:8,left:8,fontSize:11,color:"var(--debrief-text-muted, #808080)"},children:["Last selected: ",u]})]})}const i={render:()=>e.jsx(o,{items:g})},n={render:()=>e.jsx(o,{items:de,header:"Interpolation Method"})},a={render:()=>e.jsx(o,{items:g,header:"Track Color",showCustomOption:!0})},d={render:()=>e.jsx(o,{items:g,header:"Track Color",showCustomOption:!0,validateCustom:r=>/^#[0-9A-Fa-f]{6}$/.test(r)?null:"Must be a valid hex color (e.g. #FF0000)."}),parameters:{docs:{description:{story:'Select "Custom..." and try entering an invalid hex color to see the validation error.'}}}},c={render:()=>{const r=()=>{const[t,s]=x.useState(null);return t?e.jsxs("div",{style:{padding:20,color:"var(--debrief-text-primary, #ccc)"},children:["Submitted: ",t]}):e.jsx(b,{items:[],anchorPosition:{x:20,y:20},header:"Custom Value",onSelect:()=>{},onDismiss:()=>{},showCustomOption:!1,onCustomValue:v=>s(v)})};return e.jsx(r,{})},parameters:{docs:{description:{story:"Shows the menu with an empty items list, simulating a direct custom entry scenario."}}}},m={render:()=>e.jsx(o,{items:pe,header:"Select an Option"}),parameters:{docs:{description:{story:"With 25 items, the menu becomes scrollable. Keyboard navigation wraps around at the boundaries."}}}},p={render:()=>e.jsx(o,{items:g,header:"Edge-Positioned Menu",anchorPosition:{x:300,y:300}}),parameters:{docs:{description:{story:"The menu is anchored at (300, 300) within a 400x400 container. It auto-repositions to avoid overflowing the viewport."}}}},l={render:()=>e.jsx(ae,{theme:{variant:"light"},children:e.jsx("div",{style:{width:400,height:300,position:"relative",background:"#f5f5f5"},children:e.jsx(o,{items:de,header:"Interpolation Method",showCustomOption:!0})})}),parameters:{docs:{description:{story:"Context menu styled for light theme environments."}}}};var C,w,S,M,I;i.parameters={...i.parameters,docs:{...(C=i.parameters)==null?void 0:C.docs,source:{originalSource:`{
  render: () => <InteractiveWrapper items={COLOR_ITEMS} />
}`,...(S=(w=i.parameters)==null?void 0:w.docs)==null?void 0:S.source},description:{story:`Basic enum menu with color items. Demonstrates keyboard navigation
and item descriptions.`,...(I=(M=i.parameters)==null?void 0:M.docs)==null?void 0:I.description}}};var O,T,j,F,E;n.parameters={...n.parameters,docs:{...(O=n.parameters)==null?void 0:O.docs,source:{originalSource:`{
  render: () => <InteractiveWrapper items={INTERPOLATION_ITEMS} header="Interpolation Method" />
}`,...(j=(T=n.parameters)==null?void 0:T.docs)==null?void 0:j.source},description:{story:`Menu with a parameter name header. Useful for showing which
parameter the menu is editing.`,...(E=(F=n.parameters)==null?void 0:F.docs)==null?void 0:E.description}}};var W,R,L,P,_;a.parameters={...a.parameters,docs:{...(W=a.parameters)==null?void 0:W.docs,source:{originalSource:`{
  render: () => <InteractiveWrapper items={COLOR_ITEMS} header="Track Color" showCustomOption />
}`,...(L=(R=a.parameters)==null?void 0:R.docs)==null?void 0:L.source},description:{story:`Menu showing the "Custom..." option at the bottom.
Clicking it switches to free-form text input mode.`,...(_=(P=a.parameters)==null?void 0:P.docs)==null?void 0:_.description}}};var k,V,A,D,N;d.parameters={...d.parameters,docs:{...(k=d.parameters)==null?void 0:k.docs,source:{originalSource:`{
  render: () => <InteractiveWrapper items={COLOR_ITEMS} header="Track Color" showCustomOption validateCustom={value => {
    if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
      return 'Must be a valid hex color (e.g. #FF0000).';
    }
    return null;
  }} />,
  parameters: {
    docs: {
      description: {
        story: 'Select "Custom..." and try entering an invalid hex color to see the validation error.'
      }
    }
  }
}`,...(A=(V=d.parameters)==null?void 0:V.docs)==null?void 0:A.source},description:{story:`Menu with custom input and validation. Values must be valid
hex color codes (e.g. #FF0000).`,...(N=(D=d.parameters)==null?void 0:D.docs)==null?void 0:N.description}}};var $,U,B,K,Y;c.parameters={...c.parameters,docs:{...($=c.parameters)==null?void 0:$.docs,source:{originalSource:`{
  render: () => {
    const Wrapper = () => {
      const [result, setResult] = useState<string | null>(null);
      if (result) {
        return <div style={{
          padding: 20,
          color: 'var(--debrief-text-primary, #ccc)'
        }}>
            Submitted: {result}
          </div>;
      }
      return <ContextMenu items={[]} anchorPosition={{
        x: 20,
        y: 20
      }} header="Custom Value" onSelect={() => {}} onDismiss={() => {}} showCustomOption={false} onCustomValue={value => setResult(value)} />;
    };
    return <Wrapper />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the menu with an empty items list, simulating a direct custom entry scenario.'
      }
    }
  }
}`,...(B=(U=c.parameters)==null?void 0:U.docs)==null?void 0:B.source},description:{story:`Menu pre-opened in custom input mode, demonstrating the input field,
submit/cancel buttons, and error state.`,...(Y=(K=c.parameters)==null?void 0:K.docs)==null?void 0:Y.description}}};var H,z,G,q,J;m.parameters={...m.parameters,docs:{...(H=m.parameters)==null?void 0:H.docs,source:{originalSource:`{
  render: () => <InteractiveWrapper items={MANY_ITEMS} header="Select an Option" />,
  parameters: {
    docs: {
      description: {
        story: 'With 25 items, the menu becomes scrollable. Keyboard navigation wraps around at the boundaries.'
      }
    }
  }
}`,...(G=(z=m.parameters)==null?void 0:z.docs)==null?void 0:G.source},description:{story:`Menu with many items, demonstrating the scrollable container.
The menu enforces a max-height and scrolls when items overflow.`,...(J=(q=m.parameters)==null?void 0:q.docs)==null?void 0:J.description}}};var Q,X,Z,ee,te;p.parameters={...p.parameters,docs:{...(Q=p.parameters)==null?void 0:Q.docs,source:{originalSource:`{
  render: () => <InteractiveWrapper items={COLOR_ITEMS} header="Edge-Positioned Menu" anchorPosition={{
    x: 300,
    y: 300
  }} />,
  parameters: {
    docs: {
      description: {
        story: 'The menu is anchored at (300, 300) within a 400x400 container. It auto-repositions to avoid overflowing the viewport.'
      }
    }
  }
}`,...(Z=(X=p.parameters)==null?void 0:X.docs)==null?void 0:Z.source},description:{story:`Menu positioned near the bottom-right edge to demonstrate
automatic viewport repositioning.`,...(te=(ee=p.parameters)==null?void 0:ee.docs)==null?void 0:te.description}}};var re,oe,se,ie,ne;l.parameters={...l.parameters,docs:{...(re=l.parameters)==null?void 0:re.docs,source:{originalSource:`{
  render: () => <ThemeProvider theme={{
    variant: 'light'
  }}>
      <div style={{
      width: 400,
      height: 300,
      position: 'relative',
      background: '#f5f5f5'
    }}>
        <InteractiveWrapper items={INTERPOLATION_ITEMS} header="Interpolation Method" showCustomOption />
      </div>
    </ThemeProvider>,
  parameters: {
    docs: {
      description: {
        story: 'Context menu styled for light theme environments.'
      }
    }
  }
}`,...(se=(oe=l.parameters)==null?void 0:oe.docs)==null?void 0:se.source},description:{story:"Light theme variant.",...(ne=(ie=l.parameters)==null?void 0:ie.docs)==null?void 0:ne.description}}};const be=["Default","WithHeader","WithCustomOption","WithCustomValidation","CustomInputMode","ManyItems","ViewportRepositioning","LightTheme"];export{c as CustomInputMode,i as Default,l as LightTheme,m as ManyItems,p as ViewportRepositioning,a as WithCustomOption,d as WithCustomValidation,n as WithHeader,be as __namedExportsOrder,xe as default};
