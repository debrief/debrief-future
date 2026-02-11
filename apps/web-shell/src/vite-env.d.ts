/// <reference types="vite/client" />

// Image module declarations for TypeScript when resolving shared components source
declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.css' {
  const content: string;
  export default content;
}
