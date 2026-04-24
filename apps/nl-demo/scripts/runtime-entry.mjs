/**
 * Combined React + ReactDOM bundle entry. Bundling both packages into one
 * module ensures ReactDOM and React share a single instance (otherwise
 * ReactDOM cannot reach React's hook dispatcher).
 *
 * The importmap in index.html maps BOTH `react` and `react-dom/client` to the
 * same bundled file (`data/vendor/runtime.js`).
 */

import React, {
  Children,
  Component,
  Fragment,
  PureComponent,
  StrictMode,
  Suspense,
  createContext,
  createElement,
  createRef,
  forwardRef,
  isValidElement,
  lazy,
  memo,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useId,
  useImperativeHandle,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  version,
} from "react";

import { createRoot, hydrateRoot } from "react-dom/client";

export {
  // React
  Children,
  Component,
  Fragment,
  PureComponent,
  StrictMode,
  Suspense,
  createContext,
  createElement,
  createRef,
  forwardRef,
  isValidElement,
  lazy,
  memo,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useId,
  useImperativeHandle,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  version,

  // ReactDOM client
  createRoot,
  hydrateRoot,
};

export default React;
