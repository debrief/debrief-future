import{j as n}from"./jsx-runtime-BvcDW_wf.js";import{E as k}from"./ErrorView-D_xASz4m.js";import"./index-Bj8oR7bt.js";import"./index-diqPE6K5.js";import"./_commonjsHelpers-Cpj98o6Y.js";const w={title:"Components/ErrorView",component:k,parameters:{layout:"fullscreen"},decorators:[x=>n.jsx("div",{style:{height:"500px",display:"flex",flexDirection:"column"},children:n.jsx(x,{})})],argTypes:{onRetry:{action:"retry"}}},e={args:{error:{code:"PARSE_ERROR",message:"Failed to parse file: Invalid format at line 42",details:'Expected track identifier but found "INVALID" at position 128',resolution:"Check that the file is a valid REP format",retryable:!1}}},r={args:{error:{code:"STORE_ERROR",message:"Cannot access store: Permission denied",resolution:"Check that you have write permissions to the store directory",retryable:!0}}},o={args:{error:{code:"WRITE_ERROR",message:"Failed to write data: Disk full",details:"No space left on device (/shared/projects/alpha)",resolution:"Free up disk space or select a different store",retryable:!0}}},s={args:{error:{code:"SERVICE_ERROR",message:"Service unavailable: debrief-stac not responding",resolution:"Try restarting the application",retryable:!0}}},t={args:{error:{code:"UNKNOWN",message:"An unexpected error occurred",details:"Error: ENOENT: no such file or directory",retryable:!0}}},a={args:{error:{code:"PARSE_ERROR",message:"File format not supported",resolution:"This file type is not supported. Only REP files can be loaded.",retryable:!1},onRetry:void 0}};var i,c,d;e.parameters={...e.parameters,docs:{...(i=e.parameters)==null?void 0:i.docs,source:{originalSource:`{
  args: {
    error: {
      code: 'PARSE_ERROR',
      message: 'Failed to parse file: Invalid format at line 42',
      details: 'Expected track identifier but found "INVALID" at position 128',
      resolution: 'Check that the file is a valid REP format',
      retryable: false
    }
  }
}`,...(d=(c=e.parameters)==null?void 0:c.docs)==null?void 0:d.source}}};var l,p,u;r.parameters={...r.parameters,docs:{...(l=r.parameters)==null?void 0:l.docs,source:{originalSource:`{
  args: {
    error: {
      code: 'STORE_ERROR',
      message: 'Cannot access store: Permission denied',
      resolution: 'Check that you have write permissions to the store directory',
      retryable: true
    }
  }
}`,...(u=(p=r.parameters)==null?void 0:p.docs)==null?void 0:u.source}}};var m,R,E;o.parameters={...o.parameters,docs:{...(m=o.parameters)==null?void 0:m.docs,source:{originalSource:`{
  args: {
    error: {
      code: 'WRITE_ERROR',
      message: 'Failed to write data: Disk full',
      details: 'No space left on device (/shared/projects/alpha)',
      resolution: 'Free up disk space or select a different store',
      retryable: true
    }
  }
}`,...(E=(R=o.parameters)==null?void 0:R.docs)==null?void 0:E.source}}};var f,g,y;s.parameters={...s.parameters,docs:{...(f=s.parameters)==null?void 0:f.docs,source:{originalSource:`{
  args: {
    error: {
      code: 'SERVICE_ERROR',
      message: 'Service unavailable: debrief-stac not responding',
      resolution: 'Try restarting the application',
      retryable: true
    }
  }
}`,...(y=(g=s.parameters)==null?void 0:g.docs)==null?void 0:y.source}}};var h,b,S;t.parameters={...t.parameters,docs:{...(h=t.parameters)==null?void 0:h.docs,source:{originalSource:`{
  args: {
    error: {
      code: 'UNKNOWN',
      message: 'An unexpected error occurred',
      details: 'Error: ENOENT: no such file or directory',
      retryable: true
    }
  }
}`,...(S=(b=t.parameters)==null?void 0:b.docs)==null?void 0:S.source}}};var O,v,N;a.parameters={...a.parameters,docs:{...(O=a.parameters)==null?void 0:O.docs,source:{originalSource:`{
  args: {
    error: {
      code: 'PARSE_ERROR',
      message: 'File format not supported',
      resolution: 'This file type is not supported. Only REP files can be loaded.',
      retryable: false
    },
    onRetry: undefined
  }
}`,...(N=(v=a.parameters)==null?void 0:v.docs)==null?void 0:N.source}}};const A=["ParseError","StoreError","WriteError","ServiceError","UnknownError","NonRetryable"];export{a as NonRetryable,e as ParseError,s as ServiceError,r as StoreError,t as UnknownError,o as WriteError,A as __namedExportsOrder,w as default};
