import{j as n}from"./jsx-runtime-DF2Pcvd1.js";import{r as l}from"./index-B2-qRKKC.js";import{L as N}from"./ParameterEditor-BZGlfG-N.js";import"./_commonjsHelpers-Cpj98o6Y.js";function re(a,e){switch(e.type){case"float":case"integer":{const r=Number(a);return isNaN(r)?"Must be a valid number.":e.type==="integer"&&!Number.isInteger(r)?"Must be a whole number.":e.min!==void 0&&r<e.min?`Must be at least ${e.min}.`:e.max!==void 0&&r>e.max?`Must be at most ${e.max}.`:null}case"duration":{const r=String(a).trim();return!/^PT(\d+H)?(\d+M)?(\d+(\.\d+)?S)?$/.test(r)||r==="PT"?"Must be a valid ISO 8601 duration (e.g. PT30S, PT1M30S).":null}case"enum":{const r=String(a);return e.allowedValues&&!e.allowedValues.includes(r)?`Must be one of: ${e.allowedValues.join(", ")}.`:null}case"boolean":return null;case"string":return e.pattern&&!new RegExp(e.pattern).test(String(a))?`Must match pattern: ${e.pattern}`:null;default:return null}}function g({name:a,value:e,typeInfo:r,tunable:u,onCommit:m,onCancel:p}){const[b,j]=l.useState(!1),[o,i]=l.useState(e),[T,v]=l.useState(null),s=l.useRef(null);l.useEffect(()=>{b&&s.current&&s.current.focus()},[b]);const V=l.useCallback(()=>{u&&(j(!0),i(e),v(null))},[u,e]),E=l.useCallback(()=>{let t=o;r.type==="float"?t=parseFloat(String(o)):r.type==="integer"?t=parseInt(String(o),10):r.type==="boolean"&&(t=!!o);const P=re(t,r);if(P){v(P);return}j(!1),v(null),m(a,t)},[o,r,a,m]),k=l.useCallback(()=>{j(!1),i(e),v(null),p()},[e,p]),d=l.useCallback(t=>{t.key==="Enter"?(t.preventDefault(),E()):t.key==="Escape"&&(t.preventDefault(),k())},[E,k]),I=["log-panel__param-editor",b?"log-panel__param-editor--editing":""].filter(Boolean).join(" ");if(!u)return n.jsx("div",{className:I,"data-testid":`param-editor-${a}`,children:n.jsx("span",{className:"log-panel__param-editor-value",title:N.tuneNotTunable,children:String(e)})});if(!b)return n.jsx("div",{className:I,"data-testid":`param-editor-${a}`,children:n.jsx("span",{className:"log-panel__param-editor-value log-panel__param-editor-value--clickable",onClick:V,role:"button",tabIndex:0,onKeyDown:t=>{(t.key==="Enter"||t.key===" ")&&(t.preventDefault(),V())},children:String(e)})});const te=()=>{switch(r.type){case"float":return n.jsx("input",{ref:s,type:"number",step:"any",min:r.min,max:r.max,value:String(o),onChange:t=>i(t.target.value),onKeyDown:d,"data-testid":`param-editor-input-${a}`,className:"log-panel__param-editor-input-field"});case"integer":return n.jsx("input",{ref:s,type:"number",step:1,min:r.min,max:r.max,value:String(o),onChange:t=>i(t.target.value),onKeyDown:d,"data-testid":`param-editor-input-${a}`,className:"log-panel__param-editor-input-field"});case"duration":return n.jsx("input",{ref:s,type:"text",placeholder:"PT30S",value:String(o),onChange:t=>i(t.target.value),onKeyDown:d,"data-testid":`param-editor-input-${a}`,className:"log-panel__param-editor-input-field"});case"enum":return n.jsx("select",{ref:s,value:String(o),onChange:t=>i(t.target.value),onKeyDown:d,"data-testid":`param-editor-input-${a}`,className:"log-panel__param-editor-input-field",children:(r.allowedValues??[]).map(t=>n.jsx("option",{value:t,children:t},t))});case"boolean":return n.jsx("input",{ref:s,type:"checkbox",checked:!!o,onChange:t=>i(t.target.checked),onKeyDown:d,"data-testid":`param-editor-input-${a}`,className:"log-panel__param-editor-input-field"});case"string":return n.jsx("input",{ref:s,type:"text",pattern:r.pattern,value:String(o),onChange:t=>i(t.target.value),onKeyDown:d,"data-testid":`param-editor-input-${a}`,className:"log-panel__param-editor-input-field"});default:return null}};return n.jsxs("div",{className:I,"data-testid":`param-editor-${a}`,children:[n.jsxs("div",{className:"log-panel__param-editor-input",children:[n.jsx("label",{className:"log-panel__param-editor-label",children:r.label}),te(),T&&n.jsx("div",{className:"log-panel__param-editor-error",role:"alert",children:T})]}),n.jsxs("div",{className:"log-panel__param-editor-actions",children:[n.jsx("button",{className:"log-panel__param-editor-btn log-panel__param-editor-btn--commit",onClick:E,"data-testid":"param-editor-commit",title:N.tuneCommit,children:"✓"}),n.jsx("button",{className:"log-panel__param-editor-btn log-panel__param-editor-btn--cancel",onClick:k,"data-testid":"param-editor-cancel",title:N.tuneCancel,children:"✗"})]})]})}g.__docgenInfo={description:"",methods:[],displayName:"ParameterEditor",props:{name:{required:!0,tsType:{name:"string"},description:""},value:{required:!0,tsType:{name:"unknown"},description:""},typeInfo:{required:!0,tsType:{name:"signature",type:"object",raw:`{
  type: 'float' | 'integer' | 'duration' | 'enum' | 'boolean' | 'string';
  min?: number;
  max?: number;
  allowedValues?: string[];
  pattern?: string;
  label: string;
}`,signature:{properties:[{key:"type",value:{name:"union",raw:"'float' | 'integer' | 'duration' | 'enum' | 'boolean' | 'string'",elements:[{name:"literal",value:"'float'"},{name:"literal",value:"'integer'"},{name:"literal",value:"'duration'"},{name:"literal",value:"'enum'"},{name:"literal",value:"'boolean'"},{name:"literal",value:"'string'"}],required:!0}},{key:"min",value:{name:"number",required:!1}},{key:"max",value:{name:"number",required:!1}},{key:"allowedValues",value:{name:"Array",elements:[{name:"string"}],raw:"string[]",required:!1}},{key:"pattern",value:{name:"string",required:!1}},{key:"label",value:{name:"string",required:!0}}]}},description:""},tunable:{required:!0,tsType:{name:"boolean"},description:""},onCommit:{required:!0,tsType:{name:"signature",type:"function",raw:"(name: string, newValue: unknown) => void",signature:{arguments:[{type:{name:"string"},name:"name"},{type:{name:"unknown"},name:"newValue"}],return:{name:"void"}}},description:""},onCancel:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};function c(a){const[e,r]=l.useState(a.value),u=l.useCallback((m,p)=>{r(p),a.onCommit(m,p)},[a.onCommit]);return n.jsxs("div",{style:{width:280,padding:12,border:"1px solid #333",background:"#1e1e1e",color:"#ccc"},children:[n.jsx(g,{...a,value:e,onCommit:u}),n.jsxs("div",{style:{marginTop:8,fontSize:11,color:"#888"},children:["Current value: ",n.jsx("code",{children:JSON.stringify(e)})]})]})}const ue={title:"LogPanel/ParameterEditor",component:g,parameters:{layout:"centered"}},C={name:"Float Input",render:()=>n.jsx(c,{name:"maxRange",value:5e3,typeInfo:{type:"float",min:0,max:5e4,label:"Max Range"},tunable:!0,onCommit:(a,e)=>console.log("Committed:",a,e),onCancel:()=>console.log("Cancelled")})},f={name:"Integer Input",render:()=>n.jsx(c,{name:"sampleCount",value:100,typeInfo:{type:"integer",min:1,max:1e3,label:"Sample Count"},tunable:!0,onCommit:(a,e)=>console.log("Committed:",a,e),onCancel:()=>console.log("Cancelled")})},x={name:"Duration Input",render:()=>n.jsx(c,{name:"interval",value:"PT60S",typeInfo:{type:"duration",label:"Interval"},tunable:!0,onCommit:(a,e)=>console.log("Committed:",a,e),onCancel:()=>console.log("Cancelled")})},y={name:"Enum Input",render:()=>n.jsx(c,{name:"method",value:"linear",typeInfo:{type:"enum",allowedValues:["linear","cubic","nearest"],label:"Interpolation Method"},tunable:!0,onCommit:(a,e)=>console.log("Committed:",a,e),onCancel:()=>console.log("Cancelled")})},h={name:"Boolean Input",render:()=>n.jsx(c,{name:"includeOutliers",value:!0,typeInfo:{type:"boolean",label:"Include Outliers"},tunable:!0,onCommit:(a,e)=>console.log("Committed:",a,e),onCancel:()=>console.log("Cancelled")})},S={name:"String Input",render:()=>n.jsx(c,{name:"label",value:"Track Alpha",typeInfo:{type:"string",label:"Label"},tunable:!0,onCommit:(a,e)=>console.log("Committed:",a,e),onCancel:()=>console.log("Cancelled")})},_={name:"Non-Tunable (Read Only)",render:()=>n.jsx("div",{style:{width:280,padding:12,border:"1px solid #333",background:"#1e1e1e",color:"#ccc"},children:n.jsx(g,{name:"units",value:"metres",typeInfo:{type:"string",label:"Units"},tunable:!1,onCommit:()=>{},onCancel:()=>{}})})},w={name:"Validation Error",render:()=>{const a=()=>{const[e,r]=l.useState(50);return n.jsxs("div",{style:{width:280,padding:12,border:"1px solid #333",background:"#1e1e1e",color:"#ccc"},children:[n.jsx(g,{name:"threshold",value:e,typeInfo:{type:"float",min:0,max:100,label:"Threshold (0-100)"},tunable:!0,onCommit:(u,m)=>{r(m),console.log("Committed:",u,m)},onCancel:()=>console.log("Cancelled")}),n.jsx("div",{style:{marginTop:8,fontSize:11,color:"#888"},children:"Try entering a value above 100 or below 0 to see the validation error."})]})};return n.jsx(a,{})}};var D,$,M;C.parameters={...C.parameters,docs:{...(D=C.parameters)==null?void 0:D.docs,source:{originalSource:`{
  name: 'Float Input',
  render: () => <ParameterEditorWrapper name="maxRange" value={5000} typeInfo={{
    type: 'float',
    min: 0,
    max: 50000,
    label: 'Max Range'
  }} tunable={true} onCommit={(name, val) => console.log('Committed:', name, val)} onCancel={() => console.log('Cancelled')} />
}`,...(M=($=C.parameters)==null?void 0:$.docs)==null?void 0:M.source}}};var q,R,O;f.parameters={...f.parameters,docs:{...(q=f.parameters)==null?void 0:q.docs,source:{originalSource:`{
  name: 'Integer Input',
  render: () => <ParameterEditorWrapper name="sampleCount" value={100} typeInfo={{
    type: 'integer',
    min: 1,
    max: 1000,
    label: 'Sample Count'
  }} tunable={true} onCommit={(name, val) => console.log('Committed:', name, val)} onCancel={() => console.log('Cancelled')} />
}`,...(O=(R=f.parameters)==null?void 0:R.docs)==null?void 0:O.source}}};var W,K,B;x.parameters={...x.parameters,docs:{...(W=x.parameters)==null?void 0:W.docs,source:{originalSource:`{
  name: 'Duration Input',
  render: () => <ParameterEditorWrapper name="interval" value="PT60S" typeInfo={{
    type: 'duration',
    label: 'Interval'
  }} tunable={true} onCommit={(name, val) => console.log('Committed:', name, val)} onCancel={() => console.log('Cancelled')} />
}`,...(B=(K=x.parameters)==null?void 0:K.docs)==null?void 0:B.source}}};var L,F,A;y.parameters={...y.parameters,docs:{...(L=y.parameters)==null?void 0:L.docs,source:{originalSource:`{
  name: 'Enum Input',
  render: () => <ParameterEditorWrapper name="method" value="linear" typeInfo={{
    type: 'enum',
    allowedValues: ['linear', 'cubic', 'nearest'],
    label: 'Interpolation Method'
  }} tunable={true} onCommit={(name, val) => console.log('Committed:', name, val)} onCancel={() => console.log('Cancelled')} />
}`,...(A=(F=y.parameters)==null?void 0:F.docs)==null?void 0:A.source}}};var z,G,U;h.parameters={...h.parameters,docs:{...(z=h.parameters)==null?void 0:z.docs,source:{originalSource:`{
  name: 'Boolean Input',
  render: () => <ParameterEditorWrapper name="includeOutliers" value={true} typeInfo={{
    type: 'boolean',
    label: 'Include Outliers'
  }} tunable={true} onCommit={(name, val) => console.log('Committed:', name, val)} onCancel={() => console.log('Cancelled')} />
}`,...(U=(G=h.parameters)==null?void 0:G.docs)==null?void 0:U.source}}};var H,J,Q;S.parameters={...S.parameters,docs:{...(H=S.parameters)==null?void 0:H.docs,source:{originalSource:`{
  name: 'String Input',
  render: () => <ParameterEditorWrapper name="label" value="Track Alpha" typeInfo={{
    type: 'string',
    label: 'Label'
  }} tunable={true} onCommit={(name, val) => console.log('Committed:', name, val)} onCancel={() => console.log('Cancelled')} />
}`,...(Q=(J=S.parameters)==null?void 0:J.docs)==null?void 0:Q.source}}};var X,Y,Z;_.parameters={..._.parameters,docs:{...(X=_.parameters)==null?void 0:X.docs,source:{originalSource:`{
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
}`,...(Z=(Y=_.parameters)==null?void 0:Y.docs)==null?void 0:Z.source}}};var ee,ae,ne;w.parameters={...w.parameters,docs:{...(ee=w.parameters)==null?void 0:ee.docs,source:{originalSource:`{
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
}`,...(ne=(ae=w.parameters)==null?void 0:ae.docs)==null?void 0:ne.source}}};const me=["FloatInput","IntegerInput","DurationInput","EnumInput","BooleanInput","StringInput","NonTunable","ValidationError"];export{h as BooleanInput,x as DurationInput,y as EnumInput,C as FloatInput,f as IntegerInput,_ as NonTunable,S as StringInput,w as ValidationError,me as __namedExportsOrder,ue as default};
