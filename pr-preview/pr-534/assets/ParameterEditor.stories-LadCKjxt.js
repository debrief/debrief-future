import{j as a}from"./jsx-runtime-DF2Pcvd1.js";import{r as b}from"./index-B2-qRKKC.js";import{P as p}from"./ParameterEditor-j09_We3v.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./ParameterEditor-DMejAiLo.js";function n(e){const[o,g]=b.useState(e.value),C=b.useCallback((t,v)=>{g(v),e.onCommit(t,v)},[e.onCommit]);return a.jsxs("div",{style:{width:280,padding:12,border:"1px solid #333",background:"#1e1e1e",color:"#ccc"},children:[a.jsx(p,{...e,value:o,onCommit:C}),a.jsxs("div",{style:{marginTop:8,fontSize:11,color:"#888"},children:["Current value: ",a.jsx("code",{children:JSON.stringify(o)})]})]})}const H={title:"LogPanel/ParameterEditor",component:p,parameters:{layout:"centered"}},r={name:"Float Input",render:()=>a.jsx(n,{name:"maxRange",value:5e3,typeInfo:{type:"float",min:0,max:5e4,label:"Max Range"},tunable:!0,onCommit:(e,o)=>console.log("Committed:",e,o),onCancel:()=>console.log("Cancelled")})},l={name:"Integer Input",render:()=>a.jsx(n,{name:"sampleCount",value:100,typeInfo:{type:"integer",min:1,max:1e3,label:"Sample Count"},tunable:!0,onCommit:(e,o)=>console.log("Committed:",e,o),onCancel:()=>console.log("Cancelled")})},m={name:"Duration Input",render:()=>a.jsx(n,{name:"interval",value:"PT60S",typeInfo:{type:"duration",label:"Interval"},tunable:!0,onCommit:(e,o)=>console.log("Committed:",e,o),onCancel:()=>console.log("Cancelled")})},s={name:"Enum Input",render:()=>a.jsx(n,{name:"method",value:"linear",typeInfo:{type:"enum",allowedValues:["linear","cubic","nearest"],label:"Interpolation Method"},tunable:!0,onCommit:(e,o)=>console.log("Committed:",e,o),onCancel:()=>console.log("Cancelled")})},i={name:"Boolean Input",render:()=>a.jsx(n,{name:"includeOutliers",value:!0,typeInfo:{type:"boolean",label:"Include Outliers"},tunable:!0,onCommit:(e,o)=>console.log("Committed:",e,o),onCancel:()=>console.log("Cancelled")})},c={name:"String Input",render:()=>a.jsx(n,{name:"label",value:"Track Alpha",typeInfo:{type:"string",label:"Label"},tunable:!0,onCommit:(e,o)=>console.log("Committed:",e,o),onCancel:()=>console.log("Cancelled")})},u={name:"Non-Tunable (Read Only)",render:()=>a.jsx("div",{style:{width:280,padding:12,border:"1px solid #333",background:"#1e1e1e",color:"#ccc"},children:a.jsx(p,{name:"units",value:"metres",typeInfo:{type:"string",label:"Units"},tunable:!1,onCommit:()=>{},onCancel:()=>{}})})},d={name:"Validation Error",render:()=>{const e=()=>{const[o,g]=b.useState(50);return a.jsxs("div",{style:{width:280,padding:12,border:"1px solid #333",background:"#1e1e1e",color:"#ccc"},children:[a.jsx(p,{name:"threshold",value:o,typeInfo:{type:"float",min:0,max:100,label:"Threshold (0-100)"},tunable:!0,onCommit:(C,t)=>{g(t),console.log("Committed:",C,t)},onCancel:()=>console.log("Cancelled")}),a.jsx("div",{style:{marginTop:8,fontSize:11,color:"#888"},children:"Try entering a value above 100 or below 0 to see the validation error."})]})};return a.jsx(e,{})}};var I,y,x;r.parameters={...r.parameters,docs:{...(I=r.parameters)==null?void 0:I.docs,source:{originalSource:`{
  name: 'Float Input',
  render: () => <ParameterEditorWrapper name="maxRange" value={5000} typeInfo={{
    type: 'float',
    min: 0,
    max: 50000,
    label: 'Max Range'
  }} tunable={true} onCommit={(name, val) => console.log('Committed:', name, val)} onCancel={() => console.log('Cancelled')} />
}`,...(x=(y=r.parameters)==null?void 0:y.docs)==null?void 0:x.source}}};var f,h,S;l.parameters={...l.parameters,docs:{...(f=l.parameters)==null?void 0:f.docs,source:{originalSource:`{
  name: 'Integer Input',
  render: () => <ParameterEditorWrapper name="sampleCount" value={100} typeInfo={{
    type: 'integer',
    min: 1,
    max: 1000,
    label: 'Sample Count'
  }} tunable={true} onCommit={(name, val) => console.log('Committed:', name, val)} onCancel={() => console.log('Cancelled')} />
}`,...(S=(h=l.parameters)==null?void 0:h.docs)==null?void 0:S.source}}};var E,j,T;m.parameters={...m.parameters,docs:{...(E=m.parameters)==null?void 0:E.docs,source:{originalSource:`{
  name: 'Duration Input',
  render: () => <ParameterEditorWrapper name="interval" value="PT60S" typeInfo={{
    type: 'duration',
    label: 'Interval'
  }} tunable={true} onCommit={(name, val) => console.log('Committed:', name, val)} onCancel={() => console.log('Cancelled')} />
}`,...(T=(j=m.parameters)==null?void 0:j.docs)==null?void 0:T.source}}};var P,w,V;s.parameters={...s.parameters,docs:{...(P=s.parameters)==null?void 0:P.docs,source:{originalSource:`{
  name: 'Enum Input',
  render: () => <ParameterEditorWrapper name="method" value="linear" typeInfo={{
    type: 'enum',
    allowedValues: ['linear', 'cubic', 'nearest'],
    label: 'Interpolation Method'
  }} tunable={true} onCommit={(name, val) => console.log('Committed:', name, val)} onCancel={() => console.log('Cancelled')} />
}`,...(V=(w=s.parameters)==null?void 0:w.docs)==null?void 0:V.source}}};var k,W,O;i.parameters={...i.parameters,docs:{...(k=i.parameters)==null?void 0:k.docs,source:{originalSource:`{
  name: 'Boolean Input',
  render: () => <ParameterEditorWrapper name="includeOutliers" value={true} typeInfo={{
    type: 'boolean',
    label: 'Include Outliers'
  }} tunable={true} onCommit={(name, val) => console.log('Committed:', name, val)} onCancel={() => console.log('Cancelled')} />
}`,...(O=(W=i.parameters)==null?void 0:W.docs)==null?void 0:O.source}}};var R,N,B;c.parameters={...c.parameters,docs:{...(R=c.parameters)==null?void 0:R.docs,source:{originalSource:`{
  name: 'String Input',
  render: () => <ParameterEditorWrapper name="label" value="Track Alpha" typeInfo={{
    type: 'string',
    label: 'Label'
  }} tunable={true} onCommit={(name, val) => console.log('Committed:', name, val)} onCancel={() => console.log('Cancelled')} />
}`,...(B=(N=c.parameters)==null?void 0:N.docs)==null?void 0:B.source}}};var D,F,M;u.parameters={...u.parameters,docs:{...(D=u.parameters)==null?void 0:D.docs,source:{originalSource:`{
  name: 'Non-Tunable (Read Only)',
  render: () => <div style={{
    width: 280,
    padding: 12,
    border: '1px solid #333',
    background: '#1e1e1e',
    color: '#ccc'
  }}>
      <ParameterEditor name="units" value="metres" typeInfo={{
      type: 'string',
      label: 'Units'
    }} tunable={false} onCommit={() => {}} onCancel={() => {}} />
    </div>
}`,...(M=(F=u.parameters)==null?void 0:F.docs)==null?void 0:M.source}}};var z,L,A;d.parameters={...d.parameters,docs:{...(z=d.parameters)==null?void 0:z.docs,source:{originalSource:`{
  name: 'Validation Error',
  render: () => {
    /**
     * This story demonstrates a float input with tight constraints.
     * Click the value to edit, then enter an out-of-range number to trigger validation.
     */
    const Wrapper = () => {
      const [value, setValue] = useState<unknown>(50);
      return <div style={{
        width: 280,
        padding: 12,
        border: '1px solid #333',
        background: '#1e1e1e',
        color: '#ccc'
      }}>
          <ParameterEditor name="threshold" value={value} typeInfo={{
          type: 'float',
          min: 0,
          max: 100,
          label: 'Threshold (0-100)'
        }} tunable={true} onCommit={(name, newValue) => {
          setValue(newValue);
          console.log('Committed:', name, newValue);
        }} onCancel={() => console.log('Cancelled')} />
          <div style={{
          marginTop: 8,
          fontSize: 11,
          color: '#888'
        }}>
            Try entering a value above 100 or below 0 to see the validation error.
          </div>
        </div>;
    };
    return <Wrapper />;
  }
}`,...(A=(L=d.parameters)==null?void 0:L.docs)==null?void 0:A.source}}};const K=["FloatInput","IntegerInput","DurationInput","EnumInput","BooleanInput","StringInput","NonTunable","ValidationError"];export{i as BooleanInput,m as DurationInput,s as EnumInput,r as FloatInput,l as IntegerInput,u as NonTunable,c as StringInput,d as ValidationError,K as __namedExportsOrder,H as default};
