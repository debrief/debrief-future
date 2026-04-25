import{j as e}from"./jsx-runtime-DF2Pcvd1.js";import{r as I}from"./index-B2-qRKKC.js";import{G as m}from"./GeometryDialog-CHN-2Uji.js";import{T as b}from"./ThemeProvider-eH7IAOIa.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./defaultTheme-CXXPMGCe.js";const Z={title:"Layers/GeometryDialog",component:m,parameters:{layout:"centered",docs:{description:{component:`GeometryDialog displays a feature's geometry type and coordinates in a fixed-position dialog. Designed for testability — Playwright scripts can locate it by role="dialog" and read data via data-testid attributes.`}}},tags:["autodocs"],decorators:[c=>e.jsx(b,{children:e.jsx("div",{style:{width:500,height:400,position:"relative"},children:e.jsx(c,{})})})]},o={args:{featureName:"HMS Victory",geometryType:"LineString",coordinates:[[-5.0123,50.3456],[-4.8901,50.5678],[-4.7654,50.789],[-4.6543,50.9012],[-4.5432,51.0123]],anchorPosition:{x:50,y:50},onDismiss:()=>console.log("Dismissed")},parameters:{docs:{description:{story:"LineString geometry from a track feature, showing numbered coordinate pairs."}}}},r={args:{featureName:"Waypoint Alpha",geometryType:"Point",coordinates:[-3.1234,52.5678],anchorPosition:{x:50,y:50},onDismiss:()=>console.log("Dismissed")},parameters:{docs:{description:{story:"Point geometry from a reference location."}}}},s={args:{featureName:"Sensor Array",geometryType:"MultiPoint",coordinates:[[-5,50],[-4.5,50.5],[-4,51]],anchorPosition:{x:50,y:50},onDismiss:()=>console.log("Dismissed")},parameters:{docs:{description:{story:"MultiPoint geometry showing multiple point coordinates."}}}},t={args:{featureName:"Exclusion Zone",geometryType:"MultiPolygon",coordinates:[[[[-5,50],[-4,50],[-4,51],[-5,51],[-5,50]]],[[[-3,52],[-2,52],[-2,53],[-3,53],[-3,52]]]],anchorPosition:{x:50,y:50},onDismiss:()=>console.log("Dismissed")},parameters:{docs:{description:{story:"MultiPolygon geometry with two polygons, showing nested structure."}}}},n={args:{featureName:"New Feature",geometryType:"LineString",coordinates:[],anchorPosition:{x:50,y:50},onDismiss:()=>console.log("Dismissed")},parameters:{docs:{description:{story:'Empty geometry shows "No coordinates" message.'}}}},i={render:()=>e.jsx(b,{theme:{variant:"dark"},children:e.jsx(m,{featureName:"HMS Victory",geometryType:"LineString",coordinates:[[-5,50],[-4,51],[-3,52]],anchorPosition:{x:50,y:50},onDismiss:()=>console.log("Dismissed")})}),parameters:{backgrounds:{default:"dark"},docs:{description:{story:"GeometryDialog in dark theme."}}}};function A(){const[c,d]=I.useState(!0);return e.jsxs("div",{children:[e.jsx("button",{onClick:()=>d(!0),style:{marginBottom:16},children:"Open Dialog"}),c&&e.jsx(m,{featureName:"Contact Alpha",geometryType:"LineString",coordinates:[[-5,50],[-4.5,50.5],[-4,51]],anchorPosition:{x:50,y:80},onDismiss:()=>d(!1)}),e.jsx("p",{style:{marginTop:16,fontSize:12,color:"#888"},children:"Click outside, press Escape, or click the × to dismiss."})]})}const a={render:()=>e.jsx(A,{}),parameters:{docs:{description:{story:"Interactive demo: open the dialog, dismiss it, re-open it."}}}};var p,y,l;o.parameters={...o.parameters,docs:{...(p=o.parameters)==null?void 0:p.docs,source:{originalSource:`{
  args: {
    featureName: 'HMS Victory',
    geometryType: 'LineString',
    coordinates: [[-5.0123, 50.3456], [-4.8901, 50.5678], [-4.7654, 50.7890], [-4.6543, 50.9012], [-4.5432, 51.0123]],
    anchorPosition: {
      x: 50,
      y: 50
    },
    onDismiss: () => console.log('Dismissed')
  },
  parameters: {
    docs: {
      description: {
        story: 'LineString geometry from a track feature, showing numbered coordinate pairs.'
      }
    }
  }
}`,...(l=(y=o.parameters)==null?void 0:y.docs)==null?void 0:l.source}}};var g,u,h;r.parameters={...r.parameters,docs:{...(g=r.parameters)==null?void 0:g.docs,source:{originalSource:`{
  args: {
    featureName: 'Waypoint Alpha',
    geometryType: 'Point',
    coordinates: [-3.1234, 52.5678],
    anchorPosition: {
      x: 50,
      y: 50
    },
    onDismiss: () => console.log('Dismissed')
  },
  parameters: {
    docs: {
      description: {
        story: 'Point geometry from a reference location.'
      }
    }
  }
}`,...(h=(u=r.parameters)==null?void 0:u.docs)==null?void 0:h.source}}};var D,P,f;s.parameters={...s.parameters,docs:{...(D=s.parameters)==null?void 0:D.docs,source:{originalSource:`{
  args: {
    featureName: 'Sensor Array',
    geometryType: 'MultiPoint',
    coordinates: [[-5.0, 50.0], [-4.5, 50.5], [-4.0, 51.0]],
    anchorPosition: {
      x: 50,
      y: 50
    },
    onDismiss: () => console.log('Dismissed')
  },
  parameters: {
    docs: {
      description: {
        story: 'MultiPoint geometry showing multiple point coordinates.'
      }
    }
  }
}`,...(f=(P=s.parameters)==null?void 0:P.docs)==null?void 0:f.source}}};var x,S,T;t.parameters={...t.parameters,docs:{...(x=t.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    featureName: 'Exclusion Zone',
    geometryType: 'MultiPolygon',
    coordinates: [[[[-5, 50], [-4, 50], [-4, 51], [-5, 51], [-5, 50]]], [[[-3, 52], [-2, 52], [-2, 53], [-3, 53], [-3, 52]]]],
    anchorPosition: {
      x: 50,
      y: 50
    },
    onDismiss: () => console.log('Dismissed')
  },
  parameters: {
    docs: {
      description: {
        story: 'MultiPolygon geometry with two polygons, showing nested structure.'
      }
    }
  }
}`,...(T=(S=t.parameters)==null?void 0:S.docs)==null?void 0:T.source}}};var k,G,N;n.parameters={...n.parameters,docs:{...(k=n.parameters)==null?void 0:k.docs,source:{originalSource:`{
  args: {
    featureName: 'New Feature',
    geometryType: 'LineString',
    coordinates: [],
    anchorPosition: {
      x: 50,
      y: 50
    },
    onDismiss: () => console.log('Dismissed')
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty geometry shows "No coordinates" message.'
      }
    }
  }
}`,...(N=(G=n.parameters)==null?void 0:G.docs)==null?void 0:N.source}}};var w,M,v;i.parameters={...i.parameters,docs:{...(w=i.parameters)==null?void 0:w.docs,source:{originalSource:`{
  render: () => <ThemeProvider theme={{
    variant: 'dark'
  }}>
      <GeometryDialog featureName="HMS Victory" geometryType="LineString" coordinates={[[-5.0, 50.0], [-4.0, 51.0], [-3.0, 52.0]]} anchorPosition={{
      x: 50,
      y: 50
    }} onDismiss={() => console.log('Dismissed')} />
    </ThemeProvider>,
  parameters: {
    backgrounds: {
      default: 'dark'
    },
    docs: {
      description: {
        story: 'GeometryDialog in dark theme.'
      }
    }
  }
}`,...(v=(M=i.parameters)==null?void 0:M.docs)==null?void 0:v.source}}};var j,E,L;a.parameters={...a.parameters,docs:{...(j=a.parameters)==null?void 0:j.docs,source:{originalSource:`{
  render: () => <InteractiveExample />,
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo: open the dialog, dismiss it, re-open it.'
      }
    }
  }
}`,...(L=(E=a.parameters)==null?void 0:E.docs)==null?void 0:L.source}}};const _=["TrackGeometry","PointGeometry","MultiPointGeometry","MultiPolygonGeometry","EmptyGeometry","DarkTheme","Interactive"];export{i as DarkTheme,n as EmptyGeometry,a as Interactive,s as MultiPointGeometry,t as MultiPolygonGeometry,r as PointGeometry,o as TrackGeometry,_ as __namedExportsOrder,Z as default};
