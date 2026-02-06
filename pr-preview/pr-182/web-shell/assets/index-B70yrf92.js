(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))i(a);new MutationObserver(a=>{for(const l of a)if(l.type==="childList")for(const u of l.addedNodes)u.tagName==="LINK"&&u.rel==="modulepreload"&&i(u)}).observe(document,{childList:!0,subtree:!0});function r(a){const l={};return a.integrity&&(l.integrity=a.integrity),a.referrerPolicy&&(l.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?l.credentials="include":a.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function i(a){if(a.ep)return;a.ep=!0;const l=r(a);fetch(a.href,l)}})();var x_=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};function Hh(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}var Wh={exports:{}},Ya={},Uh={exports:{}},se={};/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var uo=Symbol.for("react.element"),w_=Symbol.for("react.portal"),k_=Symbol.for("react.fragment"),S_=Symbol.for("react.strict_mode"),C_=Symbol.for("react.profiler"),P_=Symbol.for("react.provider"),T_=Symbol.for("react.context"),E_=Symbol.for("react.forward_ref"),L_=Symbol.for("react.suspense"),z_=Symbol.for("react.memo"),M_=Symbol.for("react.lazy"),tf=Symbol.iterator;function N_(e){return e===null||typeof e!="object"?null:(e=tf&&e[tf]||e["@@iterator"],typeof e=="function"?e:null)}var Vh={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},Gh=Object.assign,Kh={};function ri(e,t,r){this.props=e,this.context=t,this.refs=Kh,this.updater=r||Vh}ri.prototype.isReactComponent={};ri.prototype.setState=function(e,t){if(typeof e!="object"&&typeof e!="function"&&e!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,e,t,"setState")};ri.prototype.forceUpdate=function(e){this.updater.enqueueForceUpdate(this,e,"forceUpdate")};function Yh(){}Yh.prototype=ri.prototype;function Wu(e,t,r){this.props=e,this.context=t,this.refs=Kh,this.updater=r||Vh}var Uu=Wu.prototype=new Yh;Uu.constructor=Wu;Gh(Uu,ri.prototype);Uu.isPureReactComponent=!0;var nf=Array.isArray,Qh=Object.prototype.hasOwnProperty,Vu={current:null},$h={key:!0,ref:!0,__self:!0,__source:!0};function qh(e,t,r){var i,a={},l=null,u=null;if(t!=null)for(i in t.ref!==void 0&&(u=t.ref),t.key!==void 0&&(l=""+t.key),t)Qh.call(t,i)&&!$h.hasOwnProperty(i)&&(a[i]=t[i]);var d=arguments.length-2;if(d===1)a.children=r;else if(1<d){for(var h=Array(d),p=0;p<d;p++)h[p]=arguments[p+2];a.children=h}if(e&&e.defaultProps)for(i in d=e.defaultProps,d)a[i]===void 0&&(a[i]=d[i]);return{$$typeof:uo,type:e,key:l,ref:u,props:a,_owner:Vu.current}}function A_(e,t){return{$$typeof:uo,type:e.type,key:t,ref:e.ref,props:e.props,_owner:e._owner}}function Gu(e){return typeof e=="object"&&e!==null&&e.$$typeof===uo}function O_(e){var t={"=":"=0",":":"=2"};return"$"+e.replace(/[=:]/g,function(r){return t[r]})}var rf=/\/+/g;function tl(e,t){return typeof e=="object"&&e!==null&&e.key!=null?O_(""+e.key):t.toString(36)}function ta(e,t,r,i,a){var l=typeof e;(l==="undefined"||l==="boolean")&&(e=null);var u=!1;if(e===null)u=!0;else switch(l){case"string":case"number":u=!0;break;case"object":switch(e.$$typeof){case uo:case w_:u=!0}}if(u)return u=e,a=a(u),e=i===""?"."+tl(u,0):i,nf(a)?(r="",e!=null&&(r=e.replace(rf,"$&/")+"/"),ta(a,t,r,"",function(p){return p})):a!=null&&(Gu(a)&&(a=A_(a,r+(!a.key||u&&u.key===a.key?"":(""+a.key).replace(rf,"$&/")+"/")+e)),t.push(a)),1;if(u=0,i=i===""?".":i+":",nf(e))for(var d=0;d<e.length;d++){l=e[d];var h=i+tl(l,d);u+=ta(l,t,r,h,a)}else if(h=N_(e),typeof h=="function")for(e=h.call(e),d=0;!(l=e.next()).done;)l=l.value,h=i+tl(l,d++),u+=ta(l,t,r,h,a);else if(l==="object")throw t=String(e),Error("Objects are not valid as a React child (found: "+(t==="[object Object]"?"object with keys {"+Object.keys(e).join(", ")+"}":t)+"). If you meant to render a collection of children, use an array instead.");return u}function Io(e,t,r){if(e==null)return e;var i=[],a=0;return ta(e,i,"","",function(l){return t.call(r,l,a++)}),i}function I_(e){if(e._status===-1){var t=e._result;t=t(),t.then(function(r){(e._status===0||e._status===-1)&&(e._status=1,e._result=r)},function(r){(e._status===0||e._status===-1)&&(e._status=2,e._result=r)}),e._status===-1&&(e._status=0,e._result=t)}if(e._status===1)return e._result.default;throw e._result}var nt={current:null},na={transition:null},R_={ReactCurrentDispatcher:nt,ReactCurrentBatchConfig:na,ReactCurrentOwner:Vu};function Jh(){throw Error("act(...) is not supported in production builds of React.")}se.Children={map:Io,forEach:function(e,t,r){Io(e,function(){t.apply(this,arguments)},r)},count:function(e){var t=0;return Io(e,function(){t++}),t},toArray:function(e){return Io(e,function(t){return t})||[]},only:function(e){if(!Gu(e))throw Error("React.Children.only expected to receive a single React element child.");return e}};se.Component=ri;se.Fragment=k_;se.Profiler=C_;se.PureComponent=Wu;se.StrictMode=S_;se.Suspense=L_;se.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=R_;se.act=Jh;se.cloneElement=function(e,t,r){if(e==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+e+".");var i=Gh({},e.props),a=e.key,l=e.ref,u=e._owner;if(t!=null){if(t.ref!==void 0&&(l=t.ref,u=Vu.current),t.key!==void 0&&(a=""+t.key),e.type&&e.type.defaultProps)var d=e.type.defaultProps;for(h in t)Qh.call(t,h)&&!$h.hasOwnProperty(h)&&(i[h]=t[h]===void 0&&d!==void 0?d[h]:t[h])}var h=arguments.length-2;if(h===1)i.children=r;else if(1<h){d=Array(h);for(var p=0;p<h;p++)d[p]=arguments[p+2];i.children=d}return{$$typeof:uo,type:e.type,key:a,ref:l,props:i,_owner:u}};se.createContext=function(e){return e={$$typeof:T_,_currentValue:e,_currentValue2:e,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},e.Provider={$$typeof:P_,_context:e},e.Consumer=e};se.createElement=qh;se.createFactory=function(e){var t=qh.bind(null,e);return t.type=e,t};se.createRef=function(){return{current:null}};se.forwardRef=function(e){return{$$typeof:E_,render:e}};se.isValidElement=Gu;se.lazy=function(e){return{$$typeof:M_,_payload:{_status:-1,_result:e},_init:I_}};se.memo=function(e,t){return{$$typeof:z_,type:e,compare:t===void 0?null:t}};se.startTransition=function(e){var t=na.transition;na.transition={};try{e()}finally{na.transition=t}};se.unstable_act=Jh;se.useCallback=function(e,t){return nt.current.useCallback(e,t)};se.useContext=function(e){return nt.current.useContext(e)};se.useDebugValue=function(){};se.useDeferredValue=function(e){return nt.current.useDeferredValue(e)};se.useEffect=function(e,t){return nt.current.useEffect(e,t)};se.useId=function(){return nt.current.useId()};se.useImperativeHandle=function(e,t,r){return nt.current.useImperativeHandle(e,t,r)};se.useInsertionEffect=function(e,t){return nt.current.useInsertionEffect(e,t)};se.useLayoutEffect=function(e,t){return nt.current.useLayoutEffect(e,t)};se.useMemo=function(e,t){return nt.current.useMemo(e,t)};se.useReducer=function(e,t,r){return nt.current.useReducer(e,t,r)};se.useRef=function(e){return nt.current.useRef(e)};se.useState=function(e){return nt.current.useState(e)};se.useSyncExternalStore=function(e,t,r){return nt.current.useSyncExternalStore(e,t,r)};se.useTransition=function(){return nt.current.useTransition()};se.version="18.3.1";Uh.exports=se;var P=Uh.exports;const cn=Hh(P);/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var D_=P,j_=Symbol.for("react.element"),B_=Symbol.for("react.fragment"),F_=Object.prototype.hasOwnProperty,Z_=D_.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,H_={key:!0,ref:!0,__self:!0,__source:!0};function Xh(e,t,r){var i,a={},l=null,u=null;r!==void 0&&(l=""+r),t.key!==void 0&&(l=""+t.key),t.ref!==void 0&&(u=t.ref);for(i in t)F_.call(t,i)&&!H_.hasOwnProperty(i)&&(a[i]=t[i]);if(e&&e.defaultProps)for(i in t=e.defaultProps,t)a[i]===void 0&&(a[i]=t[i]);return{$$typeof:j_,type:e,key:l,ref:u,props:a,_owner:Z_.current}}Ya.Fragment=B_;Ya.jsx=Xh;Ya.jsxs=Xh;Wh.exports=Ya;var w=Wh.exports,ep={exports:{}},yt={},tp={exports:{}},np={};/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */(function(e){function t(I,G){var j=I.length;I.push(G);e:for(;0<j;){var Y=j-1>>>1,ee=I[Y];if(0<a(ee,G))I[Y]=G,I[j]=ee,j=Y;else break e}}function r(I){return I.length===0?null:I[0]}function i(I){if(I.length===0)return null;var G=I[0],j=I.pop();if(j!==G){I[0]=j;e:for(var Y=0,ee=I.length,Te=ee>>>1;Y<Te;){var de=2*(Y+1)-1,ae=I[de],q=de+1,De=I[q];if(0>a(ae,j))q<ee&&0>a(De,ae)?(I[Y]=De,I[q]=j,Y=q):(I[Y]=ae,I[de]=j,Y=de);else if(q<ee&&0>a(De,j))I[Y]=De,I[q]=j,Y=q;else break e}}return G}function a(I,G){var j=I.sortIndex-G.sortIndex;return j!==0?j:I.id-G.id}if(typeof performance=="object"&&typeof performance.now=="function"){var l=performance;e.unstable_now=function(){return l.now()}}else{var u=Date,d=u.now();e.unstable_now=function(){return u.now()-d}}var h=[],p=[],b=1,_=null,y=3,C=!1,T=!1,k=!1,D=typeof setTimeout=="function"?setTimeout:null,x=typeof clearTimeout=="function"?clearTimeout:null,g=typeof setImmediate<"u"?setImmediate:null;typeof navigator<"u"&&navigator.scheduling!==void 0&&navigator.scheduling.isInputPending!==void 0&&navigator.scheduling.isInputPending.bind(navigator.scheduling);function v(I){for(var G=r(p);G!==null;){if(G.callback===null)i(p);else if(G.startTime<=I)i(p),G.sortIndex=G.expirationTime,t(h,G);else break;G=r(p)}}function E(I){if(k=!1,v(I),!T)if(r(h)!==null)T=!0,U(N);else{var G=r(p);G!==null&&X(E,G.startTime-I)}}function N(I,G){T=!1,k&&(k=!1,x(O),O=-1),C=!0;var j=y;try{for(v(G),_=r(h);_!==null&&(!(_.expirationTime>G)||I&&!V());){var Y=_.callback;if(typeof Y=="function"){_.callback=null,y=_.priorityLevel;var ee=Y(_.expirationTime<=G);G=e.unstable_now(),typeof ee=="function"?_.callback=ee:_===r(h)&&i(h),v(G)}else i(h);_=r(h)}if(_!==null)var Te=!0;else{var de=r(p);de!==null&&X(E,de.startTime-G),Te=!1}return Te}finally{_=null,y=j,C=!1}}var R=!1,z=null,O=-1,B=5,H=-1;function V(){return!(e.unstable_now()-H<B)}function oe(){if(z!==null){var I=e.unstable_now();H=I;var G=!0;try{G=z(!0,I)}finally{G?Ne():(R=!1,z=null)}}else R=!1}var Ne;if(typeof g=="function")Ne=function(){g(oe)};else if(typeof MessageChannel<"u"){var J=new MessageChannel,le=J.port2;J.port1.onmessage=oe,Ne=function(){le.postMessage(null)}}else Ne=function(){D(oe,0)};function U(I){z=I,R||(R=!0,Ne())}function X(I,G){O=D(function(){I(e.unstable_now())},G)}e.unstable_IdlePriority=5,e.unstable_ImmediatePriority=1,e.unstable_LowPriority=4,e.unstable_NormalPriority=3,e.unstable_Profiling=null,e.unstable_UserBlockingPriority=2,e.unstable_cancelCallback=function(I){I.callback=null},e.unstable_continueExecution=function(){T||C||(T=!0,U(N))},e.unstable_forceFrameRate=function(I){0>I||125<I?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):B=0<I?Math.floor(1e3/I):5},e.unstable_getCurrentPriorityLevel=function(){return y},e.unstable_getFirstCallbackNode=function(){return r(h)},e.unstable_next=function(I){switch(y){case 1:case 2:case 3:var G=3;break;default:G=y}var j=y;y=G;try{return I()}finally{y=j}},e.unstable_pauseExecution=function(){},e.unstable_requestPaint=function(){},e.unstable_runWithPriority=function(I,G){switch(I){case 1:case 2:case 3:case 4:case 5:break;default:I=3}var j=y;y=I;try{return G()}finally{y=j}},e.unstable_scheduleCallback=function(I,G,j){var Y=e.unstable_now();switch(typeof j=="object"&&j!==null?(j=j.delay,j=typeof j=="number"&&0<j?Y+j:Y):j=Y,I){case 1:var ee=-1;break;case 2:ee=250;break;case 5:ee=1073741823;break;case 4:ee=1e4;break;default:ee=5e3}return ee=j+ee,I={id:b++,callback:G,priorityLevel:I,startTime:j,expirationTime:ee,sortIndex:-1},j>Y?(I.sortIndex=j,t(p,I),r(h)===null&&I===r(p)&&(k?(x(O),O=-1):k=!0,X(E,j-Y))):(I.sortIndex=ee,t(h,I),T||C||(T=!0,U(N))),I},e.unstable_shouldYield=V,e.unstable_wrapCallback=function(I){var G=y;return function(){var j=y;y=G;try{return I.apply(this,arguments)}finally{y=j}}}})(np);tp.exports=np;var W_=tp.exports;/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var U_=P,_t=W_;function Z(e){for(var t="https://reactjs.org/docs/error-decoder.html?invariant="+e,r=1;r<arguments.length;r++)t+="&args[]="+encodeURIComponent(arguments[r]);return"Minified React error #"+e+"; visit "+t+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var rp=new Set,Vi={};function dr(e,t){Vr(e,t),Vr(e+"Capture",t)}function Vr(e,t){for(Vi[e]=t,e=0;e<t.length;e++)rp.add(t[e])}var dn=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),jl=Object.prototype.hasOwnProperty,V_=/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,of={},af={};function G_(e){return jl.call(af,e)?!0:jl.call(of,e)?!1:V_.test(e)?af[e]=!0:(of[e]=!0,!1)}function K_(e,t,r,i){if(r!==null&&r.type===0)return!1;switch(typeof t){case"function":case"symbol":return!0;case"boolean":return i?!1:r!==null?!r.acceptsBooleans:(e=e.toLowerCase().slice(0,5),e!=="data-"&&e!=="aria-");default:return!1}}function Y_(e,t,r,i){if(t===null||typeof t>"u"||K_(e,t,r,i))return!0;if(i)return!1;if(r!==null)switch(r.type){case 3:return!t;case 4:return t===!1;case 5:return isNaN(t);case 6:return isNaN(t)||1>t}return!1}function rt(e,t,r,i,a,l,u){this.acceptsBooleans=t===2||t===3||t===4,this.attributeName=i,this.attributeNamespace=a,this.mustUseProperty=r,this.propertyName=e,this.type=t,this.sanitizeURL=l,this.removeEmptyString=u}var Ye={};"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(e){Ye[e]=new rt(e,0,!1,e,null,!1,!1)});[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach(function(e){var t=e[0];Ye[t]=new rt(t,1,!1,e[1],null,!1,!1)});["contentEditable","draggable","spellCheck","value"].forEach(function(e){Ye[e]=new rt(e,2,!1,e.toLowerCase(),null,!1,!1)});["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach(function(e){Ye[e]=new rt(e,2,!1,e,null,!1,!1)});"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(e){Ye[e]=new rt(e,3,!1,e.toLowerCase(),null,!1,!1)});["checked","multiple","muted","selected"].forEach(function(e){Ye[e]=new rt(e,3,!0,e,null,!1,!1)});["capture","download"].forEach(function(e){Ye[e]=new rt(e,4,!1,e,null,!1,!1)});["cols","rows","size","span"].forEach(function(e){Ye[e]=new rt(e,6,!1,e,null,!1,!1)});["rowSpan","start"].forEach(function(e){Ye[e]=new rt(e,5,!1,e.toLowerCase(),null,!1,!1)});var Ku=/[\-:]([a-z])/g;function Yu(e){return e[1].toUpperCase()}"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(e){var t=e.replace(Ku,Yu);Ye[t]=new rt(t,1,!1,e,null,!1,!1)});"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(e){var t=e.replace(Ku,Yu);Ye[t]=new rt(t,1,!1,e,"http://www.w3.org/1999/xlink",!1,!1)});["xml:base","xml:lang","xml:space"].forEach(function(e){var t=e.replace(Ku,Yu);Ye[t]=new rt(t,1,!1,e,"http://www.w3.org/XML/1998/namespace",!1,!1)});["tabIndex","crossOrigin"].forEach(function(e){Ye[e]=new rt(e,1,!1,e.toLowerCase(),null,!1,!1)});Ye.xlinkHref=new rt("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1);["src","href","action","formAction"].forEach(function(e){Ye[e]=new rt(e,1,!1,e.toLowerCase(),null,!0,!0)});function Qu(e,t,r,i){var a=Ye.hasOwnProperty(t)?Ye[t]:null;(a!==null?a.type!==0:i||!(2<t.length)||t[0]!=="o"&&t[0]!=="O"||t[1]!=="n"&&t[1]!=="N")&&(Y_(t,r,a,i)&&(r=null),i||a===null?G_(t)&&(r===null?e.removeAttribute(t):e.setAttribute(t,""+r)):a.mustUseProperty?e[a.propertyName]=r===null?a.type===3?!1:"":r:(t=a.attributeName,i=a.attributeNamespace,r===null?e.removeAttribute(t):(a=a.type,r=a===3||a===4&&r===!0?"":""+r,i?e.setAttributeNS(i,t,r):e.setAttribute(t,r))))}var mn=U_.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,Ro=Symbol.for("react.element"),Pr=Symbol.for("react.portal"),Tr=Symbol.for("react.fragment"),$u=Symbol.for("react.strict_mode"),Bl=Symbol.for("react.profiler"),ip=Symbol.for("react.provider"),op=Symbol.for("react.context"),qu=Symbol.for("react.forward_ref"),Fl=Symbol.for("react.suspense"),Zl=Symbol.for("react.suspense_list"),Ju=Symbol.for("react.memo"),xn=Symbol.for("react.lazy"),ap=Symbol.for("react.offscreen"),sf=Symbol.iterator;function xi(e){return e===null||typeof e!="object"?null:(e=sf&&e[sf]||e["@@iterator"],typeof e=="function"?e:null)}var Pe=Object.assign,nl;function zi(e){if(nl===void 0)try{throw Error()}catch(r){var t=r.stack.trim().match(/\n( *(at )?)/);nl=t&&t[1]||""}return`
`+nl+e}var rl=!1;function il(e,t){if(!e||rl)return"";rl=!0;var r=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(t)if(t=function(){throw Error()},Object.defineProperty(t.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(t,[])}catch(p){var i=p}Reflect.construct(e,[],t)}else{try{t.call()}catch(p){i=p}e.call(t.prototype)}else{try{throw Error()}catch(p){i=p}e()}}catch(p){if(p&&i&&typeof p.stack=="string"){for(var a=p.stack.split(`
`),l=i.stack.split(`
`),u=a.length-1,d=l.length-1;1<=u&&0<=d&&a[u]!==l[d];)d--;for(;1<=u&&0<=d;u--,d--)if(a[u]!==l[d]){if(u!==1||d!==1)do if(u--,d--,0>d||a[u]!==l[d]){var h=`
`+a[u].replace(" at new "," at ");return e.displayName&&h.includes("<anonymous>")&&(h=h.replace("<anonymous>",e.displayName)),h}while(1<=u&&0<=d);break}}}finally{rl=!1,Error.prepareStackTrace=r}return(e=e?e.displayName||e.name:"")?zi(e):""}function Q_(e){switch(e.tag){case 5:return zi(e.type);case 16:return zi("Lazy");case 13:return zi("Suspense");case 19:return zi("SuspenseList");case 0:case 2:case 15:return e=il(e.type,!1),e;case 11:return e=il(e.type.render,!1),e;case 1:return e=il(e.type,!0),e;default:return""}}function Hl(e){if(e==null)return null;if(typeof e=="function")return e.displayName||e.name||null;if(typeof e=="string")return e;switch(e){case Tr:return"Fragment";case Pr:return"Portal";case Bl:return"Profiler";case $u:return"StrictMode";case Fl:return"Suspense";case Zl:return"SuspenseList"}if(typeof e=="object")switch(e.$$typeof){case op:return(e.displayName||"Context")+".Consumer";case ip:return(e._context.displayName||"Context")+".Provider";case qu:var t=e.render;return e=e.displayName,e||(e=t.displayName||t.name||"",e=e!==""?"ForwardRef("+e+")":"ForwardRef"),e;case Ju:return t=e.displayName||null,t!==null?t:Hl(e.type)||"Memo";case xn:t=e._payload,e=e._init;try{return Hl(e(t))}catch{}}return null}function $_(e){var t=e.type;switch(e.tag){case 24:return"Cache";case 9:return(t.displayName||"Context")+".Consumer";case 10:return(t._context.displayName||"Context")+".Provider";case 18:return"DehydratedFragment";case 11:return e=t.render,e=e.displayName||e.name||"",t.displayName||(e!==""?"ForwardRef("+e+")":"ForwardRef");case 7:return"Fragment";case 5:return t;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return Hl(t);case 8:return t===$u?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 17:case 2:case 14:case 15:if(typeof t=="function")return t.displayName||t.name||null;if(typeof t=="string")return t}return null}function Dn(e){switch(typeof e){case"boolean":case"number":case"string":case"undefined":return e;case"object":return e;default:return""}}function sp(e){var t=e.type;return(e=e.nodeName)&&e.toLowerCase()==="input"&&(t==="checkbox"||t==="radio")}function q_(e){var t=sp(e)?"checked":"value",r=Object.getOwnPropertyDescriptor(e.constructor.prototype,t),i=""+e[t];if(!e.hasOwnProperty(t)&&typeof r<"u"&&typeof r.get=="function"&&typeof r.set=="function"){var a=r.get,l=r.set;return Object.defineProperty(e,t,{configurable:!0,get:function(){return a.call(this)},set:function(u){i=""+u,l.call(this,u)}}),Object.defineProperty(e,t,{enumerable:r.enumerable}),{getValue:function(){return i},setValue:function(u){i=""+u},stopTracking:function(){e._valueTracker=null,delete e[t]}}}}function Do(e){e._valueTracker||(e._valueTracker=q_(e))}function lp(e){if(!e)return!1;var t=e._valueTracker;if(!t)return!0;var r=t.getValue(),i="";return e&&(i=sp(e)?e.checked?"true":"false":e.value),e=i,e!==r?(t.setValue(e),!0):!1}function ya(e){if(e=e||(typeof document<"u"?document:void 0),typeof e>"u")return null;try{return e.activeElement||e.body}catch{return e.body}}function Wl(e,t){var r=t.checked;return Pe({},t,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:r??e._wrapperState.initialChecked})}function lf(e,t){var r=t.defaultValue==null?"":t.defaultValue,i=t.checked!=null?t.checked:t.defaultChecked;r=Dn(t.value!=null?t.value:r),e._wrapperState={initialChecked:i,initialValue:r,controlled:t.type==="checkbox"||t.type==="radio"?t.checked!=null:t.value!=null}}function up(e,t){t=t.checked,t!=null&&Qu(e,"checked",t,!1)}function Ul(e,t){up(e,t);var r=Dn(t.value),i=t.type;if(r!=null)i==="number"?(r===0&&e.value===""||e.value!=r)&&(e.value=""+r):e.value!==""+r&&(e.value=""+r);else if(i==="submit"||i==="reset"){e.removeAttribute("value");return}t.hasOwnProperty("value")?Vl(e,t.type,r):t.hasOwnProperty("defaultValue")&&Vl(e,t.type,Dn(t.defaultValue)),t.checked==null&&t.defaultChecked!=null&&(e.defaultChecked=!!t.defaultChecked)}function uf(e,t,r){if(t.hasOwnProperty("value")||t.hasOwnProperty("defaultValue")){var i=t.type;if(!(i!=="submit"&&i!=="reset"||t.value!==void 0&&t.value!==null))return;t=""+e._wrapperState.initialValue,r||t===e.value||(e.value=t),e.defaultValue=t}r=e.name,r!==""&&(e.name=""),e.defaultChecked=!!e._wrapperState.initialChecked,r!==""&&(e.name=r)}function Vl(e,t,r){(t!=="number"||ya(e.ownerDocument)!==e)&&(r==null?e.defaultValue=""+e._wrapperState.initialValue:e.defaultValue!==""+r&&(e.defaultValue=""+r))}var Mi=Array.isArray;function Br(e,t,r,i){if(e=e.options,t){t={};for(var a=0;a<r.length;a++)t["$"+r[a]]=!0;for(r=0;r<e.length;r++)a=t.hasOwnProperty("$"+e[r].value),e[r].selected!==a&&(e[r].selected=a),a&&i&&(e[r].defaultSelected=!0)}else{for(r=""+Dn(r),t=null,a=0;a<e.length;a++){if(e[a].value===r){e[a].selected=!0,i&&(e[a].defaultSelected=!0);return}t!==null||e[a].disabled||(t=e[a])}t!==null&&(t.selected=!0)}}function Gl(e,t){if(t.dangerouslySetInnerHTML!=null)throw Error(Z(91));return Pe({},t,{value:void 0,defaultValue:void 0,children:""+e._wrapperState.initialValue})}function cf(e,t){var r=t.value;if(r==null){if(r=t.children,t=t.defaultValue,r!=null){if(t!=null)throw Error(Z(92));if(Mi(r)){if(1<r.length)throw Error(Z(93));r=r[0]}t=r}t==null&&(t=""),r=t}e._wrapperState={initialValue:Dn(r)}}function cp(e,t){var r=Dn(t.value),i=Dn(t.defaultValue);r!=null&&(r=""+r,r!==e.value&&(e.value=r),t.defaultValue==null&&e.defaultValue!==r&&(e.defaultValue=r)),i!=null&&(e.defaultValue=""+i)}function df(e){var t=e.textContent;t===e._wrapperState.initialValue&&t!==""&&t!==null&&(e.value=t)}function dp(e){switch(e){case"svg":return"http://www.w3.org/2000/svg";case"math":return"http://www.w3.org/1998/Math/MathML";default:return"http://www.w3.org/1999/xhtml"}}function Kl(e,t){return e==null||e==="http://www.w3.org/1999/xhtml"?dp(t):e==="http://www.w3.org/2000/svg"&&t==="foreignObject"?"http://www.w3.org/1999/xhtml":e}var jo,fp=function(e){return typeof MSApp<"u"&&MSApp.execUnsafeLocalFunction?function(t,r,i,a){MSApp.execUnsafeLocalFunction(function(){return e(t,r,i,a)})}:e}(function(e,t){if(e.namespaceURI!=="http://www.w3.org/2000/svg"||"innerHTML"in e)e.innerHTML=t;else{for(jo=jo||document.createElement("div"),jo.innerHTML="<svg>"+t.valueOf().toString()+"</svg>",t=jo.firstChild;e.firstChild;)e.removeChild(e.firstChild);for(;t.firstChild;)e.appendChild(t.firstChild)}});function Gi(e,t){if(t){var r=e.firstChild;if(r&&r===e.lastChild&&r.nodeType===3){r.nodeValue=t;return}}e.textContent=t}var Ii={animationIterationCount:!0,aspectRatio:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},J_=["Webkit","ms","Moz","O"];Object.keys(Ii).forEach(function(e){J_.forEach(function(t){t=t+e.charAt(0).toUpperCase()+e.substring(1),Ii[t]=Ii[e]})});function hp(e,t,r){return t==null||typeof t=="boolean"||t===""?"":r||typeof t!="number"||t===0||Ii.hasOwnProperty(e)&&Ii[e]?(""+t).trim():t+"px"}function pp(e,t){e=e.style;for(var r in t)if(t.hasOwnProperty(r)){var i=r.indexOf("--")===0,a=hp(r,t[r],i);r==="float"&&(r="cssFloat"),i?e.setProperty(r,a):e[r]=a}}var X_=Pe({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0});function Yl(e,t){if(t){if(X_[e]&&(t.children!=null||t.dangerouslySetInnerHTML!=null))throw Error(Z(137,e));if(t.dangerouslySetInnerHTML!=null){if(t.children!=null)throw Error(Z(60));if(typeof t.dangerouslySetInnerHTML!="object"||!("__html"in t.dangerouslySetInnerHTML))throw Error(Z(61))}if(t.style!=null&&typeof t.style!="object")throw Error(Z(62))}}function Ql(e,t){if(e.indexOf("-")===-1)return typeof t.is=="string";switch(e){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var $l=null;function Xu(e){return e=e.target||e.srcElement||window,e.correspondingUseElement&&(e=e.correspondingUseElement),e.nodeType===3?e.parentNode:e}var ql=null,Fr=null,Zr=null;function ff(e){if(e=ho(e)){if(typeof ql!="function")throw Error(Z(280));var t=e.stateNode;t&&(t=Xa(t),ql(e.stateNode,e.type,t))}}function mp(e){Fr?Zr?Zr.push(e):Zr=[e]:Fr=e}function gp(){if(Fr){var e=Fr,t=Zr;if(Zr=Fr=null,ff(e),t)for(e=0;e<t.length;e++)ff(t[e])}}function vp(e,t){return e(t)}function _p(){}var ol=!1;function yp(e,t,r){if(ol)return e(t,r);ol=!0;try{return vp(e,t,r)}finally{ol=!1,(Fr!==null||Zr!==null)&&(_p(),gp())}}function Ki(e,t){var r=e.stateNode;if(r===null)return null;var i=Xa(r);if(i===null)return null;r=i[t];e:switch(t){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(i=!i.disabled)||(e=e.type,i=!(e==="button"||e==="input"||e==="select"||e==="textarea")),e=!i;break e;default:e=!1}if(e)return null;if(r&&typeof r!="function")throw Error(Z(231,t,typeof r));return r}var Jl=!1;if(dn)try{var wi={};Object.defineProperty(wi,"passive",{get:function(){Jl=!0}}),window.addEventListener("test",wi,wi),window.removeEventListener("test",wi,wi)}catch{Jl=!1}function ey(e,t,r,i,a,l,u,d,h){var p=Array.prototype.slice.call(arguments,3);try{t.apply(r,p)}catch(b){this.onError(b)}}var Ri=!1,ba=null,xa=!1,Xl=null,ty={onError:function(e){Ri=!0,ba=e}};function ny(e,t,r,i,a,l,u,d,h){Ri=!1,ba=null,ey.apply(ty,arguments)}function ry(e,t,r,i,a,l,u,d,h){if(ny.apply(this,arguments),Ri){if(Ri){var p=ba;Ri=!1,ba=null}else throw Error(Z(198));xa||(xa=!0,Xl=p)}}function fr(e){var t=e,r=e;if(e.alternate)for(;t.return;)t=t.return;else{e=t;do t=e,t.flags&4098&&(r=t.return),e=t.return;while(e)}return t.tag===3?r:null}function bp(e){if(e.tag===13){var t=e.memoizedState;if(t===null&&(e=e.alternate,e!==null&&(t=e.memoizedState)),t!==null)return t.dehydrated}return null}function hf(e){if(fr(e)!==e)throw Error(Z(188))}function iy(e){var t=e.alternate;if(!t){if(t=fr(e),t===null)throw Error(Z(188));return t!==e?null:e}for(var r=e,i=t;;){var a=r.return;if(a===null)break;var l=a.alternate;if(l===null){if(i=a.return,i!==null){r=i;continue}break}if(a.child===l.child){for(l=a.child;l;){if(l===r)return hf(a),e;if(l===i)return hf(a),t;l=l.sibling}throw Error(Z(188))}if(r.return!==i.return)r=a,i=l;else{for(var u=!1,d=a.child;d;){if(d===r){u=!0,r=a,i=l;break}if(d===i){u=!0,i=a,r=l;break}d=d.sibling}if(!u){for(d=l.child;d;){if(d===r){u=!0,r=l,i=a;break}if(d===i){u=!0,i=l,r=a;break}d=d.sibling}if(!u)throw Error(Z(189))}}if(r.alternate!==i)throw Error(Z(190))}if(r.tag!==3)throw Error(Z(188));return r.stateNode.current===r?e:t}function xp(e){return e=iy(e),e!==null?wp(e):null}function wp(e){if(e.tag===5||e.tag===6)return e;for(e=e.child;e!==null;){var t=wp(e);if(t!==null)return t;e=e.sibling}return null}var kp=_t.unstable_scheduleCallback,pf=_t.unstable_cancelCallback,oy=_t.unstable_shouldYield,ay=_t.unstable_requestPaint,Me=_t.unstable_now,sy=_t.unstable_getCurrentPriorityLevel,ec=_t.unstable_ImmediatePriority,Sp=_t.unstable_UserBlockingPriority,wa=_t.unstable_NormalPriority,ly=_t.unstable_LowPriority,Cp=_t.unstable_IdlePriority,Qa=null,$t=null;function uy(e){if($t&&typeof $t.onCommitFiberRoot=="function")try{$t.onCommitFiberRoot(Qa,e,void 0,(e.current.flags&128)===128)}catch{}}var Dt=Math.clz32?Math.clz32:fy,cy=Math.log,dy=Math.LN2;function fy(e){return e>>>=0,e===0?32:31-(cy(e)/dy|0)|0}var Bo=64,Fo=4194304;function Ni(e){switch(e&-e){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return e&4194240;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return e&130023424;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 1073741824;default:return e}}function ka(e,t){var r=e.pendingLanes;if(r===0)return 0;var i=0,a=e.suspendedLanes,l=e.pingedLanes,u=r&268435455;if(u!==0){var d=u&~a;d!==0?i=Ni(d):(l&=u,l!==0&&(i=Ni(l)))}else u=r&~a,u!==0?i=Ni(u):l!==0&&(i=Ni(l));if(i===0)return 0;if(t!==0&&t!==i&&!(t&a)&&(a=i&-i,l=t&-t,a>=l||a===16&&(l&4194240)!==0))return t;if(i&4&&(i|=r&16),t=e.entangledLanes,t!==0)for(e=e.entanglements,t&=i;0<t;)r=31-Dt(t),a=1<<r,i|=e[r],t&=~a;return i}function hy(e,t){switch(e){case 1:case 2:case 4:return t+250;case 8:case 16:case 32:case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return t+5e3;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return-1;case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function py(e,t){for(var r=e.suspendedLanes,i=e.pingedLanes,a=e.expirationTimes,l=e.pendingLanes;0<l;){var u=31-Dt(l),d=1<<u,h=a[u];h===-1?(!(d&r)||d&i)&&(a[u]=hy(d,t)):h<=t&&(e.expiredLanes|=d),l&=~d}}function eu(e){return e=e.pendingLanes&-1073741825,e!==0?e:e&1073741824?1073741824:0}function Pp(){var e=Bo;return Bo<<=1,!(Bo&4194240)&&(Bo=64),e}function al(e){for(var t=[],r=0;31>r;r++)t.push(e);return t}function co(e,t,r){e.pendingLanes|=t,t!==536870912&&(e.suspendedLanes=0,e.pingedLanes=0),e=e.eventTimes,t=31-Dt(t),e[t]=r}function my(e,t){var r=e.pendingLanes&~t;e.pendingLanes=t,e.suspendedLanes=0,e.pingedLanes=0,e.expiredLanes&=t,e.mutableReadLanes&=t,e.entangledLanes&=t,t=e.entanglements;var i=e.eventTimes;for(e=e.expirationTimes;0<r;){var a=31-Dt(r),l=1<<a;t[a]=0,i[a]=-1,e[a]=-1,r&=~l}}function tc(e,t){var r=e.entangledLanes|=t;for(e=e.entanglements;r;){var i=31-Dt(r),a=1<<i;a&t|e[i]&t&&(e[i]|=t),r&=~a}}var pe=0;function Tp(e){return e&=-e,1<e?4<e?e&268435455?16:536870912:4:1}var Ep,nc,Lp,zp,Mp,tu=!1,Zo=[],Ln=null,zn=null,Mn=null,Yi=new Map,Qi=new Map,Sn=[],gy="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");function mf(e,t){switch(e){case"focusin":case"focusout":Ln=null;break;case"dragenter":case"dragleave":zn=null;break;case"mouseover":case"mouseout":Mn=null;break;case"pointerover":case"pointerout":Yi.delete(t.pointerId);break;case"gotpointercapture":case"lostpointercapture":Qi.delete(t.pointerId)}}function ki(e,t,r,i,a,l){return e===null||e.nativeEvent!==l?(e={blockedOn:t,domEventName:r,eventSystemFlags:i,nativeEvent:l,targetContainers:[a]},t!==null&&(t=ho(t),t!==null&&nc(t)),e):(e.eventSystemFlags|=i,t=e.targetContainers,a!==null&&t.indexOf(a)===-1&&t.push(a),e)}function vy(e,t,r,i,a){switch(t){case"focusin":return Ln=ki(Ln,e,t,r,i,a),!0;case"dragenter":return zn=ki(zn,e,t,r,i,a),!0;case"mouseover":return Mn=ki(Mn,e,t,r,i,a),!0;case"pointerover":var l=a.pointerId;return Yi.set(l,ki(Yi.get(l)||null,e,t,r,i,a)),!0;case"gotpointercapture":return l=a.pointerId,Qi.set(l,ki(Qi.get(l)||null,e,t,r,i,a)),!0}return!1}function Np(e){var t=Jn(e.target);if(t!==null){var r=fr(t);if(r!==null){if(t=r.tag,t===13){if(t=bp(r),t!==null){e.blockedOn=t,Mp(e.priority,function(){Lp(r)});return}}else if(t===3&&r.stateNode.current.memoizedState.isDehydrated){e.blockedOn=r.tag===3?r.stateNode.containerInfo:null;return}}}e.blockedOn=null}function ra(e){if(e.blockedOn!==null)return!1;for(var t=e.targetContainers;0<t.length;){var r=nu(e.domEventName,e.eventSystemFlags,t[0],e.nativeEvent);if(r===null){r=e.nativeEvent;var i=new r.constructor(r.type,r);$l=i,r.target.dispatchEvent(i),$l=null}else return t=ho(r),t!==null&&nc(t),e.blockedOn=r,!1;t.shift()}return!0}function gf(e,t,r){ra(e)&&r.delete(t)}function _y(){tu=!1,Ln!==null&&ra(Ln)&&(Ln=null),zn!==null&&ra(zn)&&(zn=null),Mn!==null&&ra(Mn)&&(Mn=null),Yi.forEach(gf),Qi.forEach(gf)}function Si(e,t){e.blockedOn===t&&(e.blockedOn=null,tu||(tu=!0,_t.unstable_scheduleCallback(_t.unstable_NormalPriority,_y)))}function $i(e){function t(a){return Si(a,e)}if(0<Zo.length){Si(Zo[0],e);for(var r=1;r<Zo.length;r++){var i=Zo[r];i.blockedOn===e&&(i.blockedOn=null)}}for(Ln!==null&&Si(Ln,e),zn!==null&&Si(zn,e),Mn!==null&&Si(Mn,e),Yi.forEach(t),Qi.forEach(t),r=0;r<Sn.length;r++)i=Sn[r],i.blockedOn===e&&(i.blockedOn=null);for(;0<Sn.length&&(r=Sn[0],r.blockedOn===null);)Np(r),r.blockedOn===null&&Sn.shift()}var Hr=mn.ReactCurrentBatchConfig,Sa=!0;function yy(e,t,r,i){var a=pe,l=Hr.transition;Hr.transition=null;try{pe=1,rc(e,t,r,i)}finally{pe=a,Hr.transition=l}}function by(e,t,r,i){var a=pe,l=Hr.transition;Hr.transition=null;try{pe=4,rc(e,t,r,i)}finally{pe=a,Hr.transition=l}}function rc(e,t,r,i){if(Sa){var a=nu(e,t,r,i);if(a===null)gl(e,t,i,Ca,r),mf(e,i);else if(vy(a,e,t,r,i))i.stopPropagation();else if(mf(e,i),t&4&&-1<gy.indexOf(e)){for(;a!==null;){var l=ho(a);if(l!==null&&Ep(l),l=nu(e,t,r,i),l===null&&gl(e,t,i,Ca,r),l===a)break;a=l}a!==null&&i.stopPropagation()}else gl(e,t,i,null,r)}}var Ca=null;function nu(e,t,r,i){if(Ca=null,e=Xu(i),e=Jn(e),e!==null)if(t=fr(e),t===null)e=null;else if(r=t.tag,r===13){if(e=bp(t),e!==null)return e;e=null}else if(r===3){if(t.stateNode.current.memoizedState.isDehydrated)return t.tag===3?t.stateNode.containerInfo:null;e=null}else t!==e&&(e=null);return Ca=e,null}function Ap(e){switch(e){case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 1;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"toggle":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 4;case"message":switch(sy()){case ec:return 1;case Sp:return 4;case wa:case ly:return 16;case Cp:return 536870912;default:return 16}default:return 16}}var Pn=null,ic=null,ia=null;function Op(){if(ia)return ia;var e,t=ic,r=t.length,i,a="value"in Pn?Pn.value:Pn.textContent,l=a.length;for(e=0;e<r&&t[e]===a[e];e++);var u=r-e;for(i=1;i<=u&&t[r-i]===a[l-i];i++);return ia=a.slice(e,1<i?1-i:void 0)}function oa(e){var t=e.keyCode;return"charCode"in e?(e=e.charCode,e===0&&t===13&&(e=13)):e=t,e===10&&(e=13),32<=e||e===13?e:0}function Ho(){return!0}function vf(){return!1}function bt(e){function t(r,i,a,l,u){this._reactName=r,this._targetInst=a,this.type=i,this.nativeEvent=l,this.target=u,this.currentTarget=null;for(var d in e)e.hasOwnProperty(d)&&(r=e[d],this[d]=r?r(l):l[d]);return this.isDefaultPrevented=(l.defaultPrevented!=null?l.defaultPrevented:l.returnValue===!1)?Ho:vf,this.isPropagationStopped=vf,this}return Pe(t.prototype,{preventDefault:function(){this.defaultPrevented=!0;var r=this.nativeEvent;r&&(r.preventDefault?r.preventDefault():typeof r.returnValue!="unknown"&&(r.returnValue=!1),this.isDefaultPrevented=Ho)},stopPropagation:function(){var r=this.nativeEvent;r&&(r.stopPropagation?r.stopPropagation():typeof r.cancelBubble!="unknown"&&(r.cancelBubble=!0),this.isPropagationStopped=Ho)},persist:function(){},isPersistent:Ho}),t}var ii={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(e){return e.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},oc=bt(ii),fo=Pe({},ii,{view:0,detail:0}),xy=bt(fo),sl,ll,Ci,$a=Pe({},fo,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:ac,button:0,buttons:0,relatedTarget:function(e){return e.relatedTarget===void 0?e.fromElement===e.srcElement?e.toElement:e.fromElement:e.relatedTarget},movementX:function(e){return"movementX"in e?e.movementX:(e!==Ci&&(Ci&&e.type==="mousemove"?(sl=e.screenX-Ci.screenX,ll=e.screenY-Ci.screenY):ll=sl=0,Ci=e),sl)},movementY:function(e){return"movementY"in e?e.movementY:ll}}),_f=bt($a),wy=Pe({},$a,{dataTransfer:0}),ky=bt(wy),Sy=Pe({},fo,{relatedTarget:0}),ul=bt(Sy),Cy=Pe({},ii,{animationName:0,elapsedTime:0,pseudoElement:0}),Py=bt(Cy),Ty=Pe({},ii,{clipboardData:function(e){return"clipboardData"in e?e.clipboardData:window.clipboardData}}),Ey=bt(Ty),Ly=Pe({},ii,{data:0}),yf=bt(Ly),zy={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},My={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},Ny={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function Ay(e){var t=this.nativeEvent;return t.getModifierState?t.getModifierState(e):(e=Ny[e])?!!t[e]:!1}function ac(){return Ay}var Oy=Pe({},fo,{key:function(e){if(e.key){var t=zy[e.key]||e.key;if(t!=="Unidentified")return t}return e.type==="keypress"?(e=oa(e),e===13?"Enter":String.fromCharCode(e)):e.type==="keydown"||e.type==="keyup"?My[e.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:ac,charCode:function(e){return e.type==="keypress"?oa(e):0},keyCode:function(e){return e.type==="keydown"||e.type==="keyup"?e.keyCode:0},which:function(e){return e.type==="keypress"?oa(e):e.type==="keydown"||e.type==="keyup"?e.keyCode:0}}),Iy=bt(Oy),Ry=Pe({},$a,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),bf=bt(Ry),Dy=Pe({},fo,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:ac}),jy=bt(Dy),By=Pe({},ii,{propertyName:0,elapsedTime:0,pseudoElement:0}),Fy=bt(By),Zy=Pe({},$a,{deltaX:function(e){return"deltaX"in e?e.deltaX:"wheelDeltaX"in e?-e.wheelDeltaX:0},deltaY:function(e){return"deltaY"in e?e.deltaY:"wheelDeltaY"in e?-e.wheelDeltaY:"wheelDelta"in e?-e.wheelDelta:0},deltaZ:0,deltaMode:0}),Hy=bt(Zy),Wy=[9,13,27,32],sc=dn&&"CompositionEvent"in window,Di=null;dn&&"documentMode"in document&&(Di=document.documentMode);var Uy=dn&&"TextEvent"in window&&!Di,Ip=dn&&(!sc||Di&&8<Di&&11>=Di),xf=" ",wf=!1;function Rp(e,t){switch(e){case"keyup":return Wy.indexOf(t.keyCode)!==-1;case"keydown":return t.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function Dp(e){return e=e.detail,typeof e=="object"&&"data"in e?e.data:null}var Er=!1;function Vy(e,t){switch(e){case"compositionend":return Dp(t);case"keypress":return t.which!==32?null:(wf=!0,xf);case"textInput":return e=t.data,e===xf&&wf?null:e;default:return null}}function Gy(e,t){if(Er)return e==="compositionend"||!sc&&Rp(e,t)?(e=Op(),ia=ic=Pn=null,Er=!1,e):null;switch(e){case"paste":return null;case"keypress":if(!(t.ctrlKey||t.altKey||t.metaKey)||t.ctrlKey&&t.altKey){if(t.char&&1<t.char.length)return t.char;if(t.which)return String.fromCharCode(t.which)}return null;case"compositionend":return Ip&&t.locale!=="ko"?null:t.data;default:return null}}var Ky={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function kf(e){var t=e&&e.nodeName&&e.nodeName.toLowerCase();return t==="input"?!!Ky[e.type]:t==="textarea"}function jp(e,t,r,i){mp(i),t=Pa(t,"onChange"),0<t.length&&(r=new oc("onChange","change",null,r,i),e.push({event:r,listeners:t}))}var ji=null,qi=null;function Yy(e){Qp(e,0)}function qa(e){var t=Mr(e);if(lp(t))return e}function Qy(e,t){if(e==="change")return t}var Bp=!1;if(dn){var cl;if(dn){var dl="oninput"in document;if(!dl){var Sf=document.createElement("div");Sf.setAttribute("oninput","return;"),dl=typeof Sf.oninput=="function"}cl=dl}else cl=!1;Bp=cl&&(!document.documentMode||9<document.documentMode)}function Cf(){ji&&(ji.detachEvent("onpropertychange",Fp),qi=ji=null)}function Fp(e){if(e.propertyName==="value"&&qa(qi)){var t=[];jp(t,qi,e,Xu(e)),yp(Yy,t)}}function $y(e,t,r){e==="focusin"?(Cf(),ji=t,qi=r,ji.attachEvent("onpropertychange",Fp)):e==="focusout"&&Cf()}function qy(e){if(e==="selectionchange"||e==="keyup"||e==="keydown")return qa(qi)}function Jy(e,t){if(e==="click")return qa(t)}function Xy(e,t){if(e==="input"||e==="change")return qa(t)}function e0(e,t){return e===t&&(e!==0||1/e===1/t)||e!==e&&t!==t}var Ft=typeof Object.is=="function"?Object.is:e0;function Ji(e,t){if(Ft(e,t))return!0;if(typeof e!="object"||e===null||typeof t!="object"||t===null)return!1;var r=Object.keys(e),i=Object.keys(t);if(r.length!==i.length)return!1;for(i=0;i<r.length;i++){var a=r[i];if(!jl.call(t,a)||!Ft(e[a],t[a]))return!1}return!0}function Pf(e){for(;e&&e.firstChild;)e=e.firstChild;return e}function Tf(e,t){var r=Pf(e);e=0;for(var i;r;){if(r.nodeType===3){if(i=e+r.textContent.length,e<=t&&i>=t)return{node:r,offset:t-e};e=i}e:{for(;r;){if(r.nextSibling){r=r.nextSibling;break e}r=r.parentNode}r=void 0}r=Pf(r)}}function Zp(e,t){return e&&t?e===t?!0:e&&e.nodeType===3?!1:t&&t.nodeType===3?Zp(e,t.parentNode):"contains"in e?e.contains(t):e.compareDocumentPosition?!!(e.compareDocumentPosition(t)&16):!1:!1}function Hp(){for(var e=window,t=ya();t instanceof e.HTMLIFrameElement;){try{var r=typeof t.contentWindow.location.href=="string"}catch{r=!1}if(r)e=t.contentWindow;else break;t=ya(e.document)}return t}function lc(e){var t=e&&e.nodeName&&e.nodeName.toLowerCase();return t&&(t==="input"&&(e.type==="text"||e.type==="search"||e.type==="tel"||e.type==="url"||e.type==="password")||t==="textarea"||e.contentEditable==="true")}function t0(e){var t=Hp(),r=e.focusedElem,i=e.selectionRange;if(t!==r&&r&&r.ownerDocument&&Zp(r.ownerDocument.documentElement,r)){if(i!==null&&lc(r)){if(t=i.start,e=i.end,e===void 0&&(e=t),"selectionStart"in r)r.selectionStart=t,r.selectionEnd=Math.min(e,r.value.length);else if(e=(t=r.ownerDocument||document)&&t.defaultView||window,e.getSelection){e=e.getSelection();var a=r.textContent.length,l=Math.min(i.start,a);i=i.end===void 0?l:Math.min(i.end,a),!e.extend&&l>i&&(a=i,i=l,l=a),a=Tf(r,l);var u=Tf(r,i);a&&u&&(e.rangeCount!==1||e.anchorNode!==a.node||e.anchorOffset!==a.offset||e.focusNode!==u.node||e.focusOffset!==u.offset)&&(t=t.createRange(),t.setStart(a.node,a.offset),e.removeAllRanges(),l>i?(e.addRange(t),e.extend(u.node,u.offset)):(t.setEnd(u.node,u.offset),e.addRange(t)))}}for(t=[],e=r;e=e.parentNode;)e.nodeType===1&&t.push({element:e,left:e.scrollLeft,top:e.scrollTop});for(typeof r.focus=="function"&&r.focus(),r=0;r<t.length;r++)e=t[r],e.element.scrollLeft=e.left,e.element.scrollTop=e.top}}var n0=dn&&"documentMode"in document&&11>=document.documentMode,Lr=null,ru=null,Bi=null,iu=!1;function Ef(e,t,r){var i=r.window===r?r.document:r.nodeType===9?r:r.ownerDocument;iu||Lr==null||Lr!==ya(i)||(i=Lr,"selectionStart"in i&&lc(i)?i={start:i.selectionStart,end:i.selectionEnd}:(i=(i.ownerDocument&&i.ownerDocument.defaultView||window).getSelection(),i={anchorNode:i.anchorNode,anchorOffset:i.anchorOffset,focusNode:i.focusNode,focusOffset:i.focusOffset}),Bi&&Ji(Bi,i)||(Bi=i,i=Pa(ru,"onSelect"),0<i.length&&(t=new oc("onSelect","select",null,t,r),e.push({event:t,listeners:i}),t.target=Lr)))}function Wo(e,t){var r={};return r[e.toLowerCase()]=t.toLowerCase(),r["Webkit"+e]="webkit"+t,r["Moz"+e]="moz"+t,r}var zr={animationend:Wo("Animation","AnimationEnd"),animationiteration:Wo("Animation","AnimationIteration"),animationstart:Wo("Animation","AnimationStart"),transitionend:Wo("Transition","TransitionEnd")},fl={},Wp={};dn&&(Wp=document.createElement("div").style,"AnimationEvent"in window||(delete zr.animationend.animation,delete zr.animationiteration.animation,delete zr.animationstart.animation),"TransitionEvent"in window||delete zr.transitionend.transition);function Ja(e){if(fl[e])return fl[e];if(!zr[e])return e;var t=zr[e],r;for(r in t)if(t.hasOwnProperty(r)&&r in Wp)return fl[e]=t[r];return e}var Up=Ja("animationend"),Vp=Ja("animationiteration"),Gp=Ja("animationstart"),Kp=Ja("transitionend"),Yp=new Map,Lf="abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");function Fn(e,t){Yp.set(e,t),dr(t,[e])}for(var hl=0;hl<Lf.length;hl++){var pl=Lf[hl],r0=pl.toLowerCase(),i0=pl[0].toUpperCase()+pl.slice(1);Fn(r0,"on"+i0)}Fn(Up,"onAnimationEnd");Fn(Vp,"onAnimationIteration");Fn(Gp,"onAnimationStart");Fn("dblclick","onDoubleClick");Fn("focusin","onFocus");Fn("focusout","onBlur");Fn(Kp,"onTransitionEnd");Vr("onMouseEnter",["mouseout","mouseover"]);Vr("onMouseLeave",["mouseout","mouseover"]);Vr("onPointerEnter",["pointerout","pointerover"]);Vr("onPointerLeave",["pointerout","pointerover"]);dr("onChange","change click focusin focusout input keydown keyup selectionchange".split(" "));dr("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));dr("onBeforeInput",["compositionend","keypress","textInput","paste"]);dr("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" "));dr("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" "));dr("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var Ai="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),o0=new Set("cancel close invalid load scroll toggle".split(" ").concat(Ai));function zf(e,t,r){var i=e.type||"unknown-event";e.currentTarget=r,ry(i,t,void 0,e),e.currentTarget=null}function Qp(e,t){t=(t&4)!==0;for(var r=0;r<e.length;r++){var i=e[r],a=i.event;i=i.listeners;e:{var l=void 0;if(t)for(var u=i.length-1;0<=u;u--){var d=i[u],h=d.instance,p=d.currentTarget;if(d=d.listener,h!==l&&a.isPropagationStopped())break e;zf(a,d,p),l=h}else for(u=0;u<i.length;u++){if(d=i[u],h=d.instance,p=d.currentTarget,d=d.listener,h!==l&&a.isPropagationStopped())break e;zf(a,d,p),l=h}}}if(xa)throw e=Xl,xa=!1,Xl=null,e}function ve(e,t){var r=t[uu];r===void 0&&(r=t[uu]=new Set);var i=e+"__bubble";r.has(i)||($p(t,e,2,!1),r.add(i))}function ml(e,t,r){var i=0;t&&(i|=4),$p(r,e,i,t)}var Uo="_reactListening"+Math.random().toString(36).slice(2);function Xi(e){if(!e[Uo]){e[Uo]=!0,rp.forEach(function(r){r!=="selectionchange"&&(o0.has(r)||ml(r,!1,e),ml(r,!0,e))});var t=e.nodeType===9?e:e.ownerDocument;t===null||t[Uo]||(t[Uo]=!0,ml("selectionchange",!1,t))}}function $p(e,t,r,i){switch(Ap(t)){case 1:var a=yy;break;case 4:a=by;break;default:a=rc}r=a.bind(null,t,r,e),a=void 0,!Jl||t!=="touchstart"&&t!=="touchmove"&&t!=="wheel"||(a=!0),i?a!==void 0?e.addEventListener(t,r,{capture:!0,passive:a}):e.addEventListener(t,r,!0):a!==void 0?e.addEventListener(t,r,{passive:a}):e.addEventListener(t,r,!1)}function gl(e,t,r,i,a){var l=i;if(!(t&1)&&!(t&2)&&i!==null)e:for(;;){if(i===null)return;var u=i.tag;if(u===3||u===4){var d=i.stateNode.containerInfo;if(d===a||d.nodeType===8&&d.parentNode===a)break;if(u===4)for(u=i.return;u!==null;){var h=u.tag;if((h===3||h===4)&&(h=u.stateNode.containerInfo,h===a||h.nodeType===8&&h.parentNode===a))return;u=u.return}for(;d!==null;){if(u=Jn(d),u===null)return;if(h=u.tag,h===5||h===6){i=l=u;continue e}d=d.parentNode}}i=i.return}yp(function(){var p=l,b=Xu(r),_=[];e:{var y=Yp.get(e);if(y!==void 0){var C=oc,T=e;switch(e){case"keypress":if(oa(r)===0)break e;case"keydown":case"keyup":C=Iy;break;case"focusin":T="focus",C=ul;break;case"focusout":T="blur",C=ul;break;case"beforeblur":case"afterblur":C=ul;break;case"click":if(r.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":C=_f;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":C=ky;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":C=jy;break;case Up:case Vp:case Gp:C=Py;break;case Kp:C=Fy;break;case"scroll":C=xy;break;case"wheel":C=Hy;break;case"copy":case"cut":case"paste":C=Ey;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":C=bf}var k=(t&4)!==0,D=!k&&e==="scroll",x=k?y!==null?y+"Capture":null:y;k=[];for(var g=p,v;g!==null;){v=g;var E=v.stateNode;if(v.tag===5&&E!==null&&(v=E,x!==null&&(E=Ki(g,x),E!=null&&k.push(eo(g,E,v)))),D)break;g=g.return}0<k.length&&(y=new C(y,T,null,r,b),_.push({event:y,listeners:k}))}}if(!(t&7)){e:{if(y=e==="mouseover"||e==="pointerover",C=e==="mouseout"||e==="pointerout",y&&r!==$l&&(T=r.relatedTarget||r.fromElement)&&(Jn(T)||T[fn]))break e;if((C||y)&&(y=b.window===b?b:(y=b.ownerDocument)?y.defaultView||y.parentWindow:window,C?(T=r.relatedTarget||r.toElement,C=p,T=T?Jn(T):null,T!==null&&(D=fr(T),T!==D||T.tag!==5&&T.tag!==6)&&(T=null)):(C=null,T=p),C!==T)){if(k=_f,E="onMouseLeave",x="onMouseEnter",g="mouse",(e==="pointerout"||e==="pointerover")&&(k=bf,E="onPointerLeave",x="onPointerEnter",g="pointer"),D=C==null?y:Mr(C),v=T==null?y:Mr(T),y=new k(E,g+"leave",C,r,b),y.target=D,y.relatedTarget=v,E=null,Jn(b)===p&&(k=new k(x,g+"enter",T,r,b),k.target=v,k.relatedTarget=D,E=k),D=E,C&&T)t:{for(k=C,x=T,g=0,v=k;v;v=wr(v))g++;for(v=0,E=x;E;E=wr(E))v++;for(;0<g-v;)k=wr(k),g--;for(;0<v-g;)x=wr(x),v--;for(;g--;){if(k===x||x!==null&&k===x.alternate)break t;k=wr(k),x=wr(x)}k=null}else k=null;C!==null&&Mf(_,y,C,k,!1),T!==null&&D!==null&&Mf(_,D,T,k,!0)}}e:{if(y=p?Mr(p):window,C=y.nodeName&&y.nodeName.toLowerCase(),C==="select"||C==="input"&&y.type==="file")var N=Qy;else if(kf(y))if(Bp)N=Xy;else{N=qy;var R=$y}else(C=y.nodeName)&&C.toLowerCase()==="input"&&(y.type==="checkbox"||y.type==="radio")&&(N=Jy);if(N&&(N=N(e,p))){jp(_,N,r,b);break e}R&&R(e,y,p),e==="focusout"&&(R=y._wrapperState)&&R.controlled&&y.type==="number"&&Vl(y,"number",y.value)}switch(R=p?Mr(p):window,e){case"focusin":(kf(R)||R.contentEditable==="true")&&(Lr=R,ru=p,Bi=null);break;case"focusout":Bi=ru=Lr=null;break;case"mousedown":iu=!0;break;case"contextmenu":case"mouseup":case"dragend":iu=!1,Ef(_,r,b);break;case"selectionchange":if(n0)break;case"keydown":case"keyup":Ef(_,r,b)}var z;if(sc)e:{switch(e){case"compositionstart":var O="onCompositionStart";break e;case"compositionend":O="onCompositionEnd";break e;case"compositionupdate":O="onCompositionUpdate";break e}O=void 0}else Er?Rp(e,r)&&(O="onCompositionEnd"):e==="keydown"&&r.keyCode===229&&(O="onCompositionStart");O&&(Ip&&r.locale!=="ko"&&(Er||O!=="onCompositionStart"?O==="onCompositionEnd"&&Er&&(z=Op()):(Pn=b,ic="value"in Pn?Pn.value:Pn.textContent,Er=!0)),R=Pa(p,O),0<R.length&&(O=new yf(O,e,null,r,b),_.push({event:O,listeners:R}),z?O.data=z:(z=Dp(r),z!==null&&(O.data=z)))),(z=Uy?Vy(e,r):Gy(e,r))&&(p=Pa(p,"onBeforeInput"),0<p.length&&(b=new yf("onBeforeInput","beforeinput",null,r,b),_.push({event:b,listeners:p}),b.data=z))}Qp(_,t)})}function eo(e,t,r){return{instance:e,listener:t,currentTarget:r}}function Pa(e,t){for(var r=t+"Capture",i=[];e!==null;){var a=e,l=a.stateNode;a.tag===5&&l!==null&&(a=l,l=Ki(e,r),l!=null&&i.unshift(eo(e,l,a)),l=Ki(e,t),l!=null&&i.push(eo(e,l,a))),e=e.return}return i}function wr(e){if(e===null)return null;do e=e.return;while(e&&e.tag!==5);return e||null}function Mf(e,t,r,i,a){for(var l=t._reactName,u=[];r!==null&&r!==i;){var d=r,h=d.alternate,p=d.stateNode;if(h!==null&&h===i)break;d.tag===5&&p!==null&&(d=p,a?(h=Ki(r,l),h!=null&&u.unshift(eo(r,h,d))):a||(h=Ki(r,l),h!=null&&u.push(eo(r,h,d)))),r=r.return}u.length!==0&&e.push({event:t,listeners:u})}var a0=/\r\n?/g,s0=/\u0000|\uFFFD/g;function Nf(e){return(typeof e=="string"?e:""+e).replace(a0,`
`).replace(s0,"")}function Vo(e,t,r){if(t=Nf(t),Nf(e)!==t&&r)throw Error(Z(425))}function Ta(){}var ou=null,au=null;function su(e,t){return e==="textarea"||e==="noscript"||typeof t.children=="string"||typeof t.children=="number"||typeof t.dangerouslySetInnerHTML=="object"&&t.dangerouslySetInnerHTML!==null&&t.dangerouslySetInnerHTML.__html!=null}var lu=typeof setTimeout=="function"?setTimeout:void 0,l0=typeof clearTimeout=="function"?clearTimeout:void 0,Af=typeof Promise=="function"?Promise:void 0,u0=typeof queueMicrotask=="function"?queueMicrotask:typeof Af<"u"?function(e){return Af.resolve(null).then(e).catch(c0)}:lu;function c0(e){setTimeout(function(){throw e})}function vl(e,t){var r=t,i=0;do{var a=r.nextSibling;if(e.removeChild(r),a&&a.nodeType===8)if(r=a.data,r==="/$"){if(i===0){e.removeChild(a),$i(t);return}i--}else r!=="$"&&r!=="$?"&&r!=="$!"||i++;r=a}while(r);$i(t)}function Nn(e){for(;e!=null;e=e.nextSibling){var t=e.nodeType;if(t===1||t===3)break;if(t===8){if(t=e.data,t==="$"||t==="$!"||t==="$?")break;if(t==="/$")return null}}return e}function Of(e){e=e.previousSibling;for(var t=0;e;){if(e.nodeType===8){var r=e.data;if(r==="$"||r==="$!"||r==="$?"){if(t===0)return e;t--}else r==="/$"&&t++}e=e.previousSibling}return null}var oi=Math.random().toString(36).slice(2),Qt="__reactFiber$"+oi,to="__reactProps$"+oi,fn="__reactContainer$"+oi,uu="__reactEvents$"+oi,d0="__reactListeners$"+oi,f0="__reactHandles$"+oi;function Jn(e){var t=e[Qt];if(t)return t;for(var r=e.parentNode;r;){if(t=r[fn]||r[Qt]){if(r=t.alternate,t.child!==null||r!==null&&r.child!==null)for(e=Of(e);e!==null;){if(r=e[Qt])return r;e=Of(e)}return t}e=r,r=e.parentNode}return null}function ho(e){return e=e[Qt]||e[fn],!e||e.tag!==5&&e.tag!==6&&e.tag!==13&&e.tag!==3?null:e}function Mr(e){if(e.tag===5||e.tag===6)return e.stateNode;throw Error(Z(33))}function Xa(e){return e[to]||null}var cu=[],Nr=-1;function Zn(e){return{current:e}}function ye(e){0>Nr||(e.current=cu[Nr],cu[Nr]=null,Nr--)}function ge(e,t){Nr++,cu[Nr]=e.current,e.current=t}var jn={},Je=Zn(jn),ct=Zn(!1),ar=jn;function Gr(e,t){var r=e.type.contextTypes;if(!r)return jn;var i=e.stateNode;if(i&&i.__reactInternalMemoizedUnmaskedChildContext===t)return i.__reactInternalMemoizedMaskedChildContext;var a={},l;for(l in r)a[l]=t[l];return i&&(e=e.stateNode,e.__reactInternalMemoizedUnmaskedChildContext=t,e.__reactInternalMemoizedMaskedChildContext=a),a}function dt(e){return e=e.childContextTypes,e!=null}function Ea(){ye(ct),ye(Je)}function If(e,t,r){if(Je.current!==jn)throw Error(Z(168));ge(Je,t),ge(ct,r)}function qp(e,t,r){var i=e.stateNode;if(t=t.childContextTypes,typeof i.getChildContext!="function")return r;i=i.getChildContext();for(var a in i)if(!(a in t))throw Error(Z(108,$_(e)||"Unknown",a));return Pe({},r,i)}function La(e){return e=(e=e.stateNode)&&e.__reactInternalMemoizedMergedChildContext||jn,ar=Je.current,ge(Je,e),ge(ct,ct.current),!0}function Rf(e,t,r){var i=e.stateNode;if(!i)throw Error(Z(169));r?(e=qp(e,t,ar),i.__reactInternalMemoizedMergedChildContext=e,ye(ct),ye(Je),ge(Je,e)):ye(ct),ge(ct,r)}var an=null,es=!1,_l=!1;function Jp(e){an===null?an=[e]:an.push(e)}function h0(e){es=!0,Jp(e)}function Hn(){if(!_l&&an!==null){_l=!0;var e=0,t=pe;try{var r=an;for(pe=1;e<r.length;e++){var i=r[e];do i=i(!0);while(i!==null)}an=null,es=!1}catch(a){throw an!==null&&(an=an.slice(e+1)),kp(ec,Hn),a}finally{pe=t,_l=!1}}return null}var Ar=[],Or=0,za=null,Ma=0,St=[],Ct=0,sr=null,sn=1,ln="";function $n(e,t){Ar[Or++]=Ma,Ar[Or++]=za,za=e,Ma=t}function Xp(e,t,r){St[Ct++]=sn,St[Ct++]=ln,St[Ct++]=sr,sr=e;var i=sn;e=ln;var a=32-Dt(i)-1;i&=~(1<<a),r+=1;var l=32-Dt(t)+a;if(30<l){var u=a-a%5;l=(i&(1<<u)-1).toString(32),i>>=u,a-=u,sn=1<<32-Dt(t)+a|r<<a|i,ln=l+e}else sn=1<<l|r<<a|i,ln=e}function uc(e){e.return!==null&&($n(e,1),Xp(e,1,0))}function cc(e){for(;e===za;)za=Ar[--Or],Ar[Or]=null,Ma=Ar[--Or],Ar[Or]=null;for(;e===sr;)sr=St[--Ct],St[Ct]=null,ln=St[--Ct],St[Ct]=null,sn=St[--Ct],St[Ct]=null}var vt=null,gt=null,we=!1,Rt=null;function em(e,t){var r=Pt(5,null,null,0);r.elementType="DELETED",r.stateNode=t,r.return=e,t=e.deletions,t===null?(e.deletions=[r],e.flags|=16):t.push(r)}function Df(e,t){switch(e.tag){case 5:var r=e.type;return t=t.nodeType!==1||r.toLowerCase()!==t.nodeName.toLowerCase()?null:t,t!==null?(e.stateNode=t,vt=e,gt=Nn(t.firstChild),!0):!1;case 6:return t=e.pendingProps===""||t.nodeType!==3?null:t,t!==null?(e.stateNode=t,vt=e,gt=null,!0):!1;case 13:return t=t.nodeType!==8?null:t,t!==null?(r=sr!==null?{id:sn,overflow:ln}:null,e.memoizedState={dehydrated:t,treeContext:r,retryLane:1073741824},r=Pt(18,null,null,0),r.stateNode=t,r.return=e,e.child=r,vt=e,gt=null,!0):!1;default:return!1}}function du(e){return(e.mode&1)!==0&&(e.flags&128)===0}function fu(e){if(we){var t=gt;if(t){var r=t;if(!Df(e,t)){if(du(e))throw Error(Z(418));t=Nn(r.nextSibling);var i=vt;t&&Df(e,t)?em(i,r):(e.flags=e.flags&-4097|2,we=!1,vt=e)}}else{if(du(e))throw Error(Z(418));e.flags=e.flags&-4097|2,we=!1,vt=e}}}function jf(e){for(e=e.return;e!==null&&e.tag!==5&&e.tag!==3&&e.tag!==13;)e=e.return;vt=e}function Go(e){if(e!==vt)return!1;if(!we)return jf(e),we=!0,!1;var t;if((t=e.tag!==3)&&!(t=e.tag!==5)&&(t=e.type,t=t!=="head"&&t!=="body"&&!su(e.type,e.memoizedProps)),t&&(t=gt)){if(du(e))throw tm(),Error(Z(418));for(;t;)em(e,t),t=Nn(t.nextSibling)}if(jf(e),e.tag===13){if(e=e.memoizedState,e=e!==null?e.dehydrated:null,!e)throw Error(Z(317));e:{for(e=e.nextSibling,t=0;e;){if(e.nodeType===8){var r=e.data;if(r==="/$"){if(t===0){gt=Nn(e.nextSibling);break e}t--}else r!=="$"&&r!=="$!"&&r!=="$?"||t++}e=e.nextSibling}gt=null}}else gt=vt?Nn(e.stateNode.nextSibling):null;return!0}function tm(){for(var e=gt;e;)e=Nn(e.nextSibling)}function Kr(){gt=vt=null,we=!1}function dc(e){Rt===null?Rt=[e]:Rt.push(e)}var p0=mn.ReactCurrentBatchConfig;function Pi(e,t,r){if(e=r.ref,e!==null&&typeof e!="function"&&typeof e!="object"){if(r._owner){if(r=r._owner,r){if(r.tag!==1)throw Error(Z(309));var i=r.stateNode}if(!i)throw Error(Z(147,e));var a=i,l=""+e;return t!==null&&t.ref!==null&&typeof t.ref=="function"&&t.ref._stringRef===l?t.ref:(t=function(u){var d=a.refs;u===null?delete d[l]:d[l]=u},t._stringRef=l,t)}if(typeof e!="string")throw Error(Z(284));if(!r._owner)throw Error(Z(290,e))}return e}function Ko(e,t){throw e=Object.prototype.toString.call(t),Error(Z(31,e==="[object Object]"?"object with keys {"+Object.keys(t).join(", ")+"}":e))}function Bf(e){var t=e._init;return t(e._payload)}function nm(e){function t(x,g){if(e){var v=x.deletions;v===null?(x.deletions=[g],x.flags|=16):v.push(g)}}function r(x,g){if(!e)return null;for(;g!==null;)t(x,g),g=g.sibling;return null}function i(x,g){for(x=new Map;g!==null;)g.key!==null?x.set(g.key,g):x.set(g.index,g),g=g.sibling;return x}function a(x,g){return x=Rn(x,g),x.index=0,x.sibling=null,x}function l(x,g,v){return x.index=v,e?(v=x.alternate,v!==null?(v=v.index,v<g?(x.flags|=2,g):v):(x.flags|=2,g)):(x.flags|=1048576,g)}function u(x){return e&&x.alternate===null&&(x.flags|=2),x}function d(x,g,v,E){return g===null||g.tag!==6?(g=Cl(v,x.mode,E),g.return=x,g):(g=a(g,v),g.return=x,g)}function h(x,g,v,E){var N=v.type;return N===Tr?b(x,g,v.props.children,E,v.key):g!==null&&(g.elementType===N||typeof N=="object"&&N!==null&&N.$$typeof===xn&&Bf(N)===g.type)?(E=a(g,v.props),E.ref=Pi(x,g,v),E.return=x,E):(E=fa(v.type,v.key,v.props,null,x.mode,E),E.ref=Pi(x,g,v),E.return=x,E)}function p(x,g,v,E){return g===null||g.tag!==4||g.stateNode.containerInfo!==v.containerInfo||g.stateNode.implementation!==v.implementation?(g=Pl(v,x.mode,E),g.return=x,g):(g=a(g,v.children||[]),g.return=x,g)}function b(x,g,v,E,N){return g===null||g.tag!==7?(g=rr(v,x.mode,E,N),g.return=x,g):(g=a(g,v),g.return=x,g)}function _(x,g,v){if(typeof g=="string"&&g!==""||typeof g=="number")return g=Cl(""+g,x.mode,v),g.return=x,g;if(typeof g=="object"&&g!==null){switch(g.$$typeof){case Ro:return v=fa(g.type,g.key,g.props,null,x.mode,v),v.ref=Pi(x,null,g),v.return=x,v;case Pr:return g=Pl(g,x.mode,v),g.return=x,g;case xn:var E=g._init;return _(x,E(g._payload),v)}if(Mi(g)||xi(g))return g=rr(g,x.mode,v,null),g.return=x,g;Ko(x,g)}return null}function y(x,g,v,E){var N=g!==null?g.key:null;if(typeof v=="string"&&v!==""||typeof v=="number")return N!==null?null:d(x,g,""+v,E);if(typeof v=="object"&&v!==null){switch(v.$$typeof){case Ro:return v.key===N?h(x,g,v,E):null;case Pr:return v.key===N?p(x,g,v,E):null;case xn:return N=v._init,y(x,g,N(v._payload),E)}if(Mi(v)||xi(v))return N!==null?null:b(x,g,v,E,null);Ko(x,v)}return null}function C(x,g,v,E,N){if(typeof E=="string"&&E!==""||typeof E=="number")return x=x.get(v)||null,d(g,x,""+E,N);if(typeof E=="object"&&E!==null){switch(E.$$typeof){case Ro:return x=x.get(E.key===null?v:E.key)||null,h(g,x,E,N);case Pr:return x=x.get(E.key===null?v:E.key)||null,p(g,x,E,N);case xn:var R=E._init;return C(x,g,v,R(E._payload),N)}if(Mi(E)||xi(E))return x=x.get(v)||null,b(g,x,E,N,null);Ko(g,E)}return null}function T(x,g,v,E){for(var N=null,R=null,z=g,O=g=0,B=null;z!==null&&O<v.length;O++){z.index>O?(B=z,z=null):B=z.sibling;var H=y(x,z,v[O],E);if(H===null){z===null&&(z=B);break}e&&z&&H.alternate===null&&t(x,z),g=l(H,g,O),R===null?N=H:R.sibling=H,R=H,z=B}if(O===v.length)return r(x,z),we&&$n(x,O),N;if(z===null){for(;O<v.length;O++)z=_(x,v[O],E),z!==null&&(g=l(z,g,O),R===null?N=z:R.sibling=z,R=z);return we&&$n(x,O),N}for(z=i(x,z);O<v.length;O++)B=C(z,x,O,v[O],E),B!==null&&(e&&B.alternate!==null&&z.delete(B.key===null?O:B.key),g=l(B,g,O),R===null?N=B:R.sibling=B,R=B);return e&&z.forEach(function(V){return t(x,V)}),we&&$n(x,O),N}function k(x,g,v,E){var N=xi(v);if(typeof N!="function")throw Error(Z(150));if(v=N.call(v),v==null)throw Error(Z(151));for(var R=N=null,z=g,O=g=0,B=null,H=v.next();z!==null&&!H.done;O++,H=v.next()){z.index>O?(B=z,z=null):B=z.sibling;var V=y(x,z,H.value,E);if(V===null){z===null&&(z=B);break}e&&z&&V.alternate===null&&t(x,z),g=l(V,g,O),R===null?N=V:R.sibling=V,R=V,z=B}if(H.done)return r(x,z),we&&$n(x,O),N;if(z===null){for(;!H.done;O++,H=v.next())H=_(x,H.value,E),H!==null&&(g=l(H,g,O),R===null?N=H:R.sibling=H,R=H);return we&&$n(x,O),N}for(z=i(x,z);!H.done;O++,H=v.next())H=C(z,x,O,H.value,E),H!==null&&(e&&H.alternate!==null&&z.delete(H.key===null?O:H.key),g=l(H,g,O),R===null?N=H:R.sibling=H,R=H);return e&&z.forEach(function(oe){return t(x,oe)}),we&&$n(x,O),N}function D(x,g,v,E){if(typeof v=="object"&&v!==null&&v.type===Tr&&v.key===null&&(v=v.props.children),typeof v=="object"&&v!==null){switch(v.$$typeof){case Ro:e:{for(var N=v.key,R=g;R!==null;){if(R.key===N){if(N=v.type,N===Tr){if(R.tag===7){r(x,R.sibling),g=a(R,v.props.children),g.return=x,x=g;break e}}else if(R.elementType===N||typeof N=="object"&&N!==null&&N.$$typeof===xn&&Bf(N)===R.type){r(x,R.sibling),g=a(R,v.props),g.ref=Pi(x,R,v),g.return=x,x=g;break e}r(x,R);break}else t(x,R);R=R.sibling}v.type===Tr?(g=rr(v.props.children,x.mode,E,v.key),g.return=x,x=g):(E=fa(v.type,v.key,v.props,null,x.mode,E),E.ref=Pi(x,g,v),E.return=x,x=E)}return u(x);case Pr:e:{for(R=v.key;g!==null;){if(g.key===R)if(g.tag===4&&g.stateNode.containerInfo===v.containerInfo&&g.stateNode.implementation===v.implementation){r(x,g.sibling),g=a(g,v.children||[]),g.return=x,x=g;break e}else{r(x,g);break}else t(x,g);g=g.sibling}g=Pl(v,x.mode,E),g.return=x,x=g}return u(x);case xn:return R=v._init,D(x,g,R(v._payload),E)}if(Mi(v))return T(x,g,v,E);if(xi(v))return k(x,g,v,E);Ko(x,v)}return typeof v=="string"&&v!==""||typeof v=="number"?(v=""+v,g!==null&&g.tag===6?(r(x,g.sibling),g=a(g,v),g.return=x,x=g):(r(x,g),g=Cl(v,x.mode,E),g.return=x,x=g),u(x)):r(x,g)}return D}var Yr=nm(!0),rm=nm(!1),Na=Zn(null),Aa=null,Ir=null,fc=null;function hc(){fc=Ir=Aa=null}function pc(e){var t=Na.current;ye(Na),e._currentValue=t}function hu(e,t,r){for(;e!==null;){var i=e.alternate;if((e.childLanes&t)!==t?(e.childLanes|=t,i!==null&&(i.childLanes|=t)):i!==null&&(i.childLanes&t)!==t&&(i.childLanes|=t),e===r)break;e=e.return}}function Wr(e,t){Aa=e,fc=Ir=null,e=e.dependencies,e!==null&&e.firstContext!==null&&(e.lanes&t&&(lt=!0),e.firstContext=null)}function Et(e){var t=e._currentValue;if(fc!==e)if(e={context:e,memoizedValue:t,next:null},Ir===null){if(Aa===null)throw Error(Z(308));Ir=e,Aa.dependencies={lanes:0,firstContext:e}}else Ir=Ir.next=e;return t}var Xn=null;function mc(e){Xn===null?Xn=[e]:Xn.push(e)}function im(e,t,r,i){var a=t.interleaved;return a===null?(r.next=r,mc(t)):(r.next=a.next,a.next=r),t.interleaved=r,hn(e,i)}function hn(e,t){e.lanes|=t;var r=e.alternate;for(r!==null&&(r.lanes|=t),r=e,e=e.return;e!==null;)e.childLanes|=t,r=e.alternate,r!==null&&(r.childLanes|=t),r=e,e=e.return;return r.tag===3?r.stateNode:null}var wn=!1;function gc(e){e.updateQueue={baseState:e.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,interleaved:null,lanes:0},effects:null}}function om(e,t){e=e.updateQueue,t.updateQueue===e&&(t.updateQueue={baseState:e.baseState,firstBaseUpdate:e.firstBaseUpdate,lastBaseUpdate:e.lastBaseUpdate,shared:e.shared,effects:e.effects})}function un(e,t){return{eventTime:e,lane:t,tag:0,payload:null,callback:null,next:null}}function An(e,t,r){var i=e.updateQueue;if(i===null)return null;if(i=i.shared,ce&2){var a=i.pending;return a===null?t.next=t:(t.next=a.next,a.next=t),i.pending=t,hn(e,r)}return a=i.interleaved,a===null?(t.next=t,mc(i)):(t.next=a.next,a.next=t),i.interleaved=t,hn(e,r)}function aa(e,t,r){if(t=t.updateQueue,t!==null&&(t=t.shared,(r&4194240)!==0)){var i=t.lanes;i&=e.pendingLanes,r|=i,t.lanes=r,tc(e,r)}}function Ff(e,t){var r=e.updateQueue,i=e.alternate;if(i!==null&&(i=i.updateQueue,r===i)){var a=null,l=null;if(r=r.firstBaseUpdate,r!==null){do{var u={eventTime:r.eventTime,lane:r.lane,tag:r.tag,payload:r.payload,callback:r.callback,next:null};l===null?a=l=u:l=l.next=u,r=r.next}while(r!==null);l===null?a=l=t:l=l.next=t}else a=l=t;r={baseState:i.baseState,firstBaseUpdate:a,lastBaseUpdate:l,shared:i.shared,effects:i.effects},e.updateQueue=r;return}e=r.lastBaseUpdate,e===null?r.firstBaseUpdate=t:e.next=t,r.lastBaseUpdate=t}function Oa(e,t,r,i){var a=e.updateQueue;wn=!1;var l=a.firstBaseUpdate,u=a.lastBaseUpdate,d=a.shared.pending;if(d!==null){a.shared.pending=null;var h=d,p=h.next;h.next=null,u===null?l=p:u.next=p,u=h;var b=e.alternate;b!==null&&(b=b.updateQueue,d=b.lastBaseUpdate,d!==u&&(d===null?b.firstBaseUpdate=p:d.next=p,b.lastBaseUpdate=h))}if(l!==null){var _=a.baseState;u=0,b=p=h=null,d=l;do{var y=d.lane,C=d.eventTime;if((i&y)===y){b!==null&&(b=b.next={eventTime:C,lane:0,tag:d.tag,payload:d.payload,callback:d.callback,next:null});e:{var T=e,k=d;switch(y=t,C=r,k.tag){case 1:if(T=k.payload,typeof T=="function"){_=T.call(C,_,y);break e}_=T;break e;case 3:T.flags=T.flags&-65537|128;case 0:if(T=k.payload,y=typeof T=="function"?T.call(C,_,y):T,y==null)break e;_=Pe({},_,y);break e;case 2:wn=!0}}d.callback!==null&&d.lane!==0&&(e.flags|=64,y=a.effects,y===null?a.effects=[d]:y.push(d))}else C={eventTime:C,lane:y,tag:d.tag,payload:d.payload,callback:d.callback,next:null},b===null?(p=b=C,h=_):b=b.next=C,u|=y;if(d=d.next,d===null){if(d=a.shared.pending,d===null)break;y=d,d=y.next,y.next=null,a.lastBaseUpdate=y,a.shared.pending=null}}while(!0);if(b===null&&(h=_),a.baseState=h,a.firstBaseUpdate=p,a.lastBaseUpdate=b,t=a.shared.interleaved,t!==null){a=t;do u|=a.lane,a=a.next;while(a!==t)}else l===null&&(a.shared.lanes=0);ur|=u,e.lanes=u,e.memoizedState=_}}function Zf(e,t,r){if(e=t.effects,t.effects=null,e!==null)for(t=0;t<e.length;t++){var i=e[t],a=i.callback;if(a!==null){if(i.callback=null,i=r,typeof a!="function")throw Error(Z(191,a));a.call(i)}}}var po={},qt=Zn(po),no=Zn(po),ro=Zn(po);function er(e){if(e===po)throw Error(Z(174));return e}function vc(e,t){switch(ge(ro,t),ge(no,e),ge(qt,po),e=t.nodeType,e){case 9:case 11:t=(t=t.documentElement)?t.namespaceURI:Kl(null,"");break;default:e=e===8?t.parentNode:t,t=e.namespaceURI||null,e=e.tagName,t=Kl(t,e)}ye(qt),ge(qt,t)}function Qr(){ye(qt),ye(no),ye(ro)}function am(e){er(ro.current);var t=er(qt.current),r=Kl(t,e.type);t!==r&&(ge(no,e),ge(qt,r))}function _c(e){no.current===e&&(ye(qt),ye(no))}var Se=Zn(0);function Ia(e){for(var t=e;t!==null;){if(t.tag===13){var r=t.memoizedState;if(r!==null&&(r=r.dehydrated,r===null||r.data==="$?"||r.data==="$!"))return t}else if(t.tag===19&&t.memoizedProps.revealOrder!==void 0){if(t.flags&128)return t}else if(t.child!==null){t.child.return=t,t=t.child;continue}if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return null;t=t.return}t.sibling.return=t.return,t=t.sibling}return null}var yl=[];function yc(){for(var e=0;e<yl.length;e++)yl[e]._workInProgressVersionPrimary=null;yl.length=0}var sa=mn.ReactCurrentDispatcher,bl=mn.ReactCurrentBatchConfig,lr=0,Ce=null,je=null,Ze=null,Ra=!1,Fi=!1,io=0,m0=0;function Qe(){throw Error(Z(321))}function bc(e,t){if(t===null)return!1;for(var r=0;r<t.length&&r<e.length;r++)if(!Ft(e[r],t[r]))return!1;return!0}function xc(e,t,r,i,a,l){if(lr=l,Ce=t,t.memoizedState=null,t.updateQueue=null,t.lanes=0,sa.current=e===null||e.memoizedState===null?y0:b0,e=r(i,a),Fi){l=0;do{if(Fi=!1,io=0,25<=l)throw Error(Z(301));l+=1,Ze=je=null,t.updateQueue=null,sa.current=x0,e=r(i,a)}while(Fi)}if(sa.current=Da,t=je!==null&&je.next!==null,lr=0,Ze=je=Ce=null,Ra=!1,t)throw Error(Z(300));return e}function wc(){var e=io!==0;return io=0,e}function Kt(){var e={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return Ze===null?Ce.memoizedState=Ze=e:Ze=Ze.next=e,Ze}function Lt(){if(je===null){var e=Ce.alternate;e=e!==null?e.memoizedState:null}else e=je.next;var t=Ze===null?Ce.memoizedState:Ze.next;if(t!==null)Ze=t,je=e;else{if(e===null)throw Error(Z(310));je=e,e={memoizedState:je.memoizedState,baseState:je.baseState,baseQueue:je.baseQueue,queue:je.queue,next:null},Ze===null?Ce.memoizedState=Ze=e:Ze=Ze.next=e}return Ze}function oo(e,t){return typeof t=="function"?t(e):t}function xl(e){var t=Lt(),r=t.queue;if(r===null)throw Error(Z(311));r.lastRenderedReducer=e;var i=je,a=i.baseQueue,l=r.pending;if(l!==null){if(a!==null){var u=a.next;a.next=l.next,l.next=u}i.baseQueue=a=l,r.pending=null}if(a!==null){l=a.next,i=i.baseState;var d=u=null,h=null,p=l;do{var b=p.lane;if((lr&b)===b)h!==null&&(h=h.next={lane:0,action:p.action,hasEagerState:p.hasEagerState,eagerState:p.eagerState,next:null}),i=p.hasEagerState?p.eagerState:e(i,p.action);else{var _={lane:b,action:p.action,hasEagerState:p.hasEagerState,eagerState:p.eagerState,next:null};h===null?(d=h=_,u=i):h=h.next=_,Ce.lanes|=b,ur|=b}p=p.next}while(p!==null&&p!==l);h===null?u=i:h.next=d,Ft(i,t.memoizedState)||(lt=!0),t.memoizedState=i,t.baseState=u,t.baseQueue=h,r.lastRenderedState=i}if(e=r.interleaved,e!==null){a=e;do l=a.lane,Ce.lanes|=l,ur|=l,a=a.next;while(a!==e)}else a===null&&(r.lanes=0);return[t.memoizedState,r.dispatch]}function wl(e){var t=Lt(),r=t.queue;if(r===null)throw Error(Z(311));r.lastRenderedReducer=e;var i=r.dispatch,a=r.pending,l=t.memoizedState;if(a!==null){r.pending=null;var u=a=a.next;do l=e(l,u.action),u=u.next;while(u!==a);Ft(l,t.memoizedState)||(lt=!0),t.memoizedState=l,t.baseQueue===null&&(t.baseState=l),r.lastRenderedState=l}return[l,i]}function sm(){}function lm(e,t){var r=Ce,i=Lt(),a=t(),l=!Ft(i.memoizedState,a);if(l&&(i.memoizedState=a,lt=!0),i=i.queue,kc(dm.bind(null,r,i,e),[e]),i.getSnapshot!==t||l||Ze!==null&&Ze.memoizedState.tag&1){if(r.flags|=2048,ao(9,cm.bind(null,r,i,a,t),void 0,null),We===null)throw Error(Z(349));lr&30||um(r,t,a)}return a}function um(e,t,r){e.flags|=16384,e={getSnapshot:t,value:r},t=Ce.updateQueue,t===null?(t={lastEffect:null,stores:null},Ce.updateQueue=t,t.stores=[e]):(r=t.stores,r===null?t.stores=[e]:r.push(e))}function cm(e,t,r,i){t.value=r,t.getSnapshot=i,fm(t)&&hm(e)}function dm(e,t,r){return r(function(){fm(t)&&hm(e)})}function fm(e){var t=e.getSnapshot;e=e.value;try{var r=t();return!Ft(e,r)}catch{return!0}}function hm(e){var t=hn(e,1);t!==null&&jt(t,e,1,-1)}function Hf(e){var t=Kt();return typeof e=="function"&&(e=e()),t.memoizedState=t.baseState=e,e={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:oo,lastRenderedState:e},t.queue=e,e=e.dispatch=_0.bind(null,Ce,e),[t.memoizedState,e]}function ao(e,t,r,i){return e={tag:e,create:t,destroy:r,deps:i,next:null},t=Ce.updateQueue,t===null?(t={lastEffect:null,stores:null},Ce.updateQueue=t,t.lastEffect=e.next=e):(r=t.lastEffect,r===null?t.lastEffect=e.next=e:(i=r.next,r.next=e,e.next=i,t.lastEffect=e)),e}function pm(){return Lt().memoizedState}function la(e,t,r,i){var a=Kt();Ce.flags|=e,a.memoizedState=ao(1|t,r,void 0,i===void 0?null:i)}function ts(e,t,r,i){var a=Lt();i=i===void 0?null:i;var l=void 0;if(je!==null){var u=je.memoizedState;if(l=u.destroy,i!==null&&bc(i,u.deps)){a.memoizedState=ao(t,r,l,i);return}}Ce.flags|=e,a.memoizedState=ao(1|t,r,l,i)}function Wf(e,t){return la(8390656,8,e,t)}function kc(e,t){return ts(2048,8,e,t)}function mm(e,t){return ts(4,2,e,t)}function gm(e,t){return ts(4,4,e,t)}function vm(e,t){if(typeof t=="function")return e=e(),t(e),function(){t(null)};if(t!=null)return e=e(),t.current=e,function(){t.current=null}}function _m(e,t,r){return r=r!=null?r.concat([e]):null,ts(4,4,vm.bind(null,t,e),r)}function Sc(){}function ym(e,t){var r=Lt();t=t===void 0?null:t;var i=r.memoizedState;return i!==null&&t!==null&&bc(t,i[1])?i[0]:(r.memoizedState=[e,t],e)}function bm(e,t){var r=Lt();t=t===void 0?null:t;var i=r.memoizedState;return i!==null&&t!==null&&bc(t,i[1])?i[0]:(e=e(),r.memoizedState=[e,t],e)}function xm(e,t,r){return lr&21?(Ft(r,t)||(r=Pp(),Ce.lanes|=r,ur|=r,e.baseState=!0),t):(e.baseState&&(e.baseState=!1,lt=!0),e.memoizedState=r)}function g0(e,t){var r=pe;pe=r!==0&&4>r?r:4,e(!0);var i=bl.transition;bl.transition={};try{e(!1),t()}finally{pe=r,bl.transition=i}}function wm(){return Lt().memoizedState}function v0(e,t,r){var i=In(e);if(r={lane:i,action:r,hasEagerState:!1,eagerState:null,next:null},km(e))Sm(t,r);else if(r=im(e,t,r,i),r!==null){var a=tt();jt(r,e,i,a),Cm(r,t,i)}}function _0(e,t,r){var i=In(e),a={lane:i,action:r,hasEagerState:!1,eagerState:null,next:null};if(km(e))Sm(t,a);else{var l=e.alternate;if(e.lanes===0&&(l===null||l.lanes===0)&&(l=t.lastRenderedReducer,l!==null))try{var u=t.lastRenderedState,d=l(u,r);if(a.hasEagerState=!0,a.eagerState=d,Ft(d,u)){var h=t.interleaved;h===null?(a.next=a,mc(t)):(a.next=h.next,h.next=a),t.interleaved=a;return}}catch{}finally{}r=im(e,t,a,i),r!==null&&(a=tt(),jt(r,e,i,a),Cm(r,t,i))}}function km(e){var t=e.alternate;return e===Ce||t!==null&&t===Ce}function Sm(e,t){Fi=Ra=!0;var r=e.pending;r===null?t.next=t:(t.next=r.next,r.next=t),e.pending=t}function Cm(e,t,r){if(r&4194240){var i=t.lanes;i&=e.pendingLanes,r|=i,t.lanes=r,tc(e,r)}}var Da={readContext:Et,useCallback:Qe,useContext:Qe,useEffect:Qe,useImperativeHandle:Qe,useInsertionEffect:Qe,useLayoutEffect:Qe,useMemo:Qe,useReducer:Qe,useRef:Qe,useState:Qe,useDebugValue:Qe,useDeferredValue:Qe,useTransition:Qe,useMutableSource:Qe,useSyncExternalStore:Qe,useId:Qe,unstable_isNewReconciler:!1},y0={readContext:Et,useCallback:function(e,t){return Kt().memoizedState=[e,t===void 0?null:t],e},useContext:Et,useEffect:Wf,useImperativeHandle:function(e,t,r){return r=r!=null?r.concat([e]):null,la(4194308,4,vm.bind(null,t,e),r)},useLayoutEffect:function(e,t){return la(4194308,4,e,t)},useInsertionEffect:function(e,t){return la(4,2,e,t)},useMemo:function(e,t){var r=Kt();return t=t===void 0?null:t,e=e(),r.memoizedState=[e,t],e},useReducer:function(e,t,r){var i=Kt();return t=r!==void 0?r(t):t,i.memoizedState=i.baseState=t,e={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:e,lastRenderedState:t},i.queue=e,e=e.dispatch=v0.bind(null,Ce,e),[i.memoizedState,e]},useRef:function(e){var t=Kt();return e={current:e},t.memoizedState=e},useState:Hf,useDebugValue:Sc,useDeferredValue:function(e){return Kt().memoizedState=e},useTransition:function(){var e=Hf(!1),t=e[0];return e=g0.bind(null,e[1]),Kt().memoizedState=e,[t,e]},useMutableSource:function(){},useSyncExternalStore:function(e,t,r){var i=Ce,a=Kt();if(we){if(r===void 0)throw Error(Z(407));r=r()}else{if(r=t(),We===null)throw Error(Z(349));lr&30||um(i,t,r)}a.memoizedState=r;var l={value:r,getSnapshot:t};return a.queue=l,Wf(dm.bind(null,i,l,e),[e]),i.flags|=2048,ao(9,cm.bind(null,i,l,r,t),void 0,null),r},useId:function(){var e=Kt(),t=We.identifierPrefix;if(we){var r=ln,i=sn;r=(i&~(1<<32-Dt(i)-1)).toString(32)+r,t=":"+t+"R"+r,r=io++,0<r&&(t+="H"+r.toString(32)),t+=":"}else r=m0++,t=":"+t+"r"+r.toString(32)+":";return e.memoizedState=t},unstable_isNewReconciler:!1},b0={readContext:Et,useCallback:ym,useContext:Et,useEffect:kc,useImperativeHandle:_m,useInsertionEffect:mm,useLayoutEffect:gm,useMemo:bm,useReducer:xl,useRef:pm,useState:function(){return xl(oo)},useDebugValue:Sc,useDeferredValue:function(e){var t=Lt();return xm(t,je.memoizedState,e)},useTransition:function(){var e=xl(oo)[0],t=Lt().memoizedState;return[e,t]},useMutableSource:sm,useSyncExternalStore:lm,useId:wm,unstable_isNewReconciler:!1},x0={readContext:Et,useCallback:ym,useContext:Et,useEffect:kc,useImperativeHandle:_m,useInsertionEffect:mm,useLayoutEffect:gm,useMemo:bm,useReducer:wl,useRef:pm,useState:function(){return wl(oo)},useDebugValue:Sc,useDeferredValue:function(e){var t=Lt();return je===null?t.memoizedState=e:xm(t,je.memoizedState,e)},useTransition:function(){var e=wl(oo)[0],t=Lt().memoizedState;return[e,t]},useMutableSource:sm,useSyncExternalStore:lm,useId:wm,unstable_isNewReconciler:!1};function Ot(e,t){if(e&&e.defaultProps){t=Pe({},t),e=e.defaultProps;for(var r in e)t[r]===void 0&&(t[r]=e[r]);return t}return t}function pu(e,t,r,i){t=e.memoizedState,r=r(i,t),r=r==null?t:Pe({},t,r),e.memoizedState=r,e.lanes===0&&(e.updateQueue.baseState=r)}var ns={isMounted:function(e){return(e=e._reactInternals)?fr(e)===e:!1},enqueueSetState:function(e,t,r){e=e._reactInternals;var i=tt(),a=In(e),l=un(i,a);l.payload=t,r!=null&&(l.callback=r),t=An(e,l,a),t!==null&&(jt(t,e,a,i),aa(t,e,a))},enqueueReplaceState:function(e,t,r){e=e._reactInternals;var i=tt(),a=In(e),l=un(i,a);l.tag=1,l.payload=t,r!=null&&(l.callback=r),t=An(e,l,a),t!==null&&(jt(t,e,a,i),aa(t,e,a))},enqueueForceUpdate:function(e,t){e=e._reactInternals;var r=tt(),i=In(e),a=un(r,i);a.tag=2,t!=null&&(a.callback=t),t=An(e,a,i),t!==null&&(jt(t,e,i,r),aa(t,e,i))}};function Uf(e,t,r,i,a,l,u){return e=e.stateNode,typeof e.shouldComponentUpdate=="function"?e.shouldComponentUpdate(i,l,u):t.prototype&&t.prototype.isPureReactComponent?!Ji(r,i)||!Ji(a,l):!0}function Pm(e,t,r){var i=!1,a=jn,l=t.contextType;return typeof l=="object"&&l!==null?l=Et(l):(a=dt(t)?ar:Je.current,i=t.contextTypes,l=(i=i!=null)?Gr(e,a):jn),t=new t(r,l),e.memoizedState=t.state!==null&&t.state!==void 0?t.state:null,t.updater=ns,e.stateNode=t,t._reactInternals=e,i&&(e=e.stateNode,e.__reactInternalMemoizedUnmaskedChildContext=a,e.__reactInternalMemoizedMaskedChildContext=l),t}function Vf(e,t,r,i){e=t.state,typeof t.componentWillReceiveProps=="function"&&t.componentWillReceiveProps(r,i),typeof t.UNSAFE_componentWillReceiveProps=="function"&&t.UNSAFE_componentWillReceiveProps(r,i),t.state!==e&&ns.enqueueReplaceState(t,t.state,null)}function mu(e,t,r,i){var a=e.stateNode;a.props=r,a.state=e.memoizedState,a.refs={},gc(e);var l=t.contextType;typeof l=="object"&&l!==null?a.context=Et(l):(l=dt(t)?ar:Je.current,a.context=Gr(e,l)),a.state=e.memoizedState,l=t.getDerivedStateFromProps,typeof l=="function"&&(pu(e,t,l,r),a.state=e.memoizedState),typeof t.getDerivedStateFromProps=="function"||typeof a.getSnapshotBeforeUpdate=="function"||typeof a.UNSAFE_componentWillMount!="function"&&typeof a.componentWillMount!="function"||(t=a.state,typeof a.componentWillMount=="function"&&a.componentWillMount(),typeof a.UNSAFE_componentWillMount=="function"&&a.UNSAFE_componentWillMount(),t!==a.state&&ns.enqueueReplaceState(a,a.state,null),Oa(e,r,a,i),a.state=e.memoizedState),typeof a.componentDidMount=="function"&&(e.flags|=4194308)}function $r(e,t){try{var r="",i=t;do r+=Q_(i),i=i.return;while(i);var a=r}catch(l){a=`
Error generating stack: `+l.message+`
`+l.stack}return{value:e,source:t,stack:a,digest:null}}function kl(e,t,r){return{value:e,source:null,stack:r??null,digest:t??null}}function gu(e,t){try{console.error(t.value)}catch(r){setTimeout(function(){throw r})}}var w0=typeof WeakMap=="function"?WeakMap:Map;function Tm(e,t,r){r=un(-1,r),r.tag=3,r.payload={element:null};var i=t.value;return r.callback=function(){Ba||(Ba=!0,Pu=i),gu(e,t)},r}function Em(e,t,r){r=un(-1,r),r.tag=3;var i=e.type.getDerivedStateFromError;if(typeof i=="function"){var a=t.value;r.payload=function(){return i(a)},r.callback=function(){gu(e,t)}}var l=e.stateNode;return l!==null&&typeof l.componentDidCatch=="function"&&(r.callback=function(){gu(e,t),typeof i!="function"&&(On===null?On=new Set([this]):On.add(this));var u=t.stack;this.componentDidCatch(t.value,{componentStack:u!==null?u:""})}),r}function Gf(e,t,r){var i=e.pingCache;if(i===null){i=e.pingCache=new w0;var a=new Set;i.set(t,a)}else a=i.get(t),a===void 0&&(a=new Set,i.set(t,a));a.has(r)||(a.add(r),e=R0.bind(null,e,t,r),t.then(e,e))}function Kf(e){do{var t;if((t=e.tag===13)&&(t=e.memoizedState,t=t!==null?t.dehydrated!==null:!0),t)return e;e=e.return}while(e!==null);return null}function Yf(e,t,r,i,a){return e.mode&1?(e.flags|=65536,e.lanes=a,e):(e===t?e.flags|=65536:(e.flags|=128,r.flags|=131072,r.flags&=-52805,r.tag===1&&(r.alternate===null?r.tag=17:(t=un(-1,1),t.tag=2,An(r,t,1))),r.lanes|=1),e)}var k0=mn.ReactCurrentOwner,lt=!1;function et(e,t,r,i){t.child=e===null?rm(t,null,r,i):Yr(t,e.child,r,i)}function Qf(e,t,r,i,a){r=r.render;var l=t.ref;return Wr(t,a),i=xc(e,t,r,i,l,a),r=wc(),e!==null&&!lt?(t.updateQueue=e.updateQueue,t.flags&=-2053,e.lanes&=~a,pn(e,t,a)):(we&&r&&uc(t),t.flags|=1,et(e,t,i,a),t.child)}function $f(e,t,r,i,a){if(e===null){var l=r.type;return typeof l=="function"&&!Nc(l)&&l.defaultProps===void 0&&r.compare===null&&r.defaultProps===void 0?(t.tag=15,t.type=l,Lm(e,t,l,i,a)):(e=fa(r.type,null,i,t,t.mode,a),e.ref=t.ref,e.return=t,t.child=e)}if(l=e.child,!(e.lanes&a)){var u=l.memoizedProps;if(r=r.compare,r=r!==null?r:Ji,r(u,i)&&e.ref===t.ref)return pn(e,t,a)}return t.flags|=1,e=Rn(l,i),e.ref=t.ref,e.return=t,t.child=e}function Lm(e,t,r,i,a){if(e!==null){var l=e.memoizedProps;if(Ji(l,i)&&e.ref===t.ref)if(lt=!1,t.pendingProps=i=l,(e.lanes&a)!==0)e.flags&131072&&(lt=!0);else return t.lanes=e.lanes,pn(e,t,a)}return vu(e,t,r,i,a)}function zm(e,t,r){var i=t.pendingProps,a=i.children,l=e!==null?e.memoizedState:null;if(i.mode==="hidden")if(!(t.mode&1))t.memoizedState={baseLanes:0,cachePool:null,transitions:null},ge(Dr,mt),mt|=r;else{if(!(r&1073741824))return e=l!==null?l.baseLanes|r:r,t.lanes=t.childLanes=1073741824,t.memoizedState={baseLanes:e,cachePool:null,transitions:null},t.updateQueue=null,ge(Dr,mt),mt|=e,null;t.memoizedState={baseLanes:0,cachePool:null,transitions:null},i=l!==null?l.baseLanes:r,ge(Dr,mt),mt|=i}else l!==null?(i=l.baseLanes|r,t.memoizedState=null):i=r,ge(Dr,mt),mt|=i;return et(e,t,a,r),t.child}function Mm(e,t){var r=t.ref;(e===null&&r!==null||e!==null&&e.ref!==r)&&(t.flags|=512,t.flags|=2097152)}function vu(e,t,r,i,a){var l=dt(r)?ar:Je.current;return l=Gr(t,l),Wr(t,a),r=xc(e,t,r,i,l,a),i=wc(),e!==null&&!lt?(t.updateQueue=e.updateQueue,t.flags&=-2053,e.lanes&=~a,pn(e,t,a)):(we&&i&&uc(t),t.flags|=1,et(e,t,r,a),t.child)}function qf(e,t,r,i,a){if(dt(r)){var l=!0;La(t)}else l=!1;if(Wr(t,a),t.stateNode===null)ua(e,t),Pm(t,r,i),mu(t,r,i,a),i=!0;else if(e===null){var u=t.stateNode,d=t.memoizedProps;u.props=d;var h=u.context,p=r.contextType;typeof p=="object"&&p!==null?p=Et(p):(p=dt(r)?ar:Je.current,p=Gr(t,p));var b=r.getDerivedStateFromProps,_=typeof b=="function"||typeof u.getSnapshotBeforeUpdate=="function";_||typeof u.UNSAFE_componentWillReceiveProps!="function"&&typeof u.componentWillReceiveProps!="function"||(d!==i||h!==p)&&Vf(t,u,i,p),wn=!1;var y=t.memoizedState;u.state=y,Oa(t,i,u,a),h=t.memoizedState,d!==i||y!==h||ct.current||wn?(typeof b=="function"&&(pu(t,r,b,i),h=t.memoizedState),(d=wn||Uf(t,r,d,i,y,h,p))?(_||typeof u.UNSAFE_componentWillMount!="function"&&typeof u.componentWillMount!="function"||(typeof u.componentWillMount=="function"&&u.componentWillMount(),typeof u.UNSAFE_componentWillMount=="function"&&u.UNSAFE_componentWillMount()),typeof u.componentDidMount=="function"&&(t.flags|=4194308)):(typeof u.componentDidMount=="function"&&(t.flags|=4194308),t.memoizedProps=i,t.memoizedState=h),u.props=i,u.state=h,u.context=p,i=d):(typeof u.componentDidMount=="function"&&(t.flags|=4194308),i=!1)}else{u=t.stateNode,om(e,t),d=t.memoizedProps,p=t.type===t.elementType?d:Ot(t.type,d),u.props=p,_=t.pendingProps,y=u.context,h=r.contextType,typeof h=="object"&&h!==null?h=Et(h):(h=dt(r)?ar:Je.current,h=Gr(t,h));var C=r.getDerivedStateFromProps;(b=typeof C=="function"||typeof u.getSnapshotBeforeUpdate=="function")||typeof u.UNSAFE_componentWillReceiveProps!="function"&&typeof u.componentWillReceiveProps!="function"||(d!==_||y!==h)&&Vf(t,u,i,h),wn=!1,y=t.memoizedState,u.state=y,Oa(t,i,u,a);var T=t.memoizedState;d!==_||y!==T||ct.current||wn?(typeof C=="function"&&(pu(t,r,C,i),T=t.memoizedState),(p=wn||Uf(t,r,p,i,y,T,h)||!1)?(b||typeof u.UNSAFE_componentWillUpdate!="function"&&typeof u.componentWillUpdate!="function"||(typeof u.componentWillUpdate=="function"&&u.componentWillUpdate(i,T,h),typeof u.UNSAFE_componentWillUpdate=="function"&&u.UNSAFE_componentWillUpdate(i,T,h)),typeof u.componentDidUpdate=="function"&&(t.flags|=4),typeof u.getSnapshotBeforeUpdate=="function"&&(t.flags|=1024)):(typeof u.componentDidUpdate!="function"||d===e.memoizedProps&&y===e.memoizedState||(t.flags|=4),typeof u.getSnapshotBeforeUpdate!="function"||d===e.memoizedProps&&y===e.memoizedState||(t.flags|=1024),t.memoizedProps=i,t.memoizedState=T),u.props=i,u.state=T,u.context=h,i=p):(typeof u.componentDidUpdate!="function"||d===e.memoizedProps&&y===e.memoizedState||(t.flags|=4),typeof u.getSnapshotBeforeUpdate!="function"||d===e.memoizedProps&&y===e.memoizedState||(t.flags|=1024),i=!1)}return _u(e,t,r,i,l,a)}function _u(e,t,r,i,a,l){Mm(e,t);var u=(t.flags&128)!==0;if(!i&&!u)return a&&Rf(t,r,!1),pn(e,t,l);i=t.stateNode,k0.current=t;var d=u&&typeof r.getDerivedStateFromError!="function"?null:i.render();return t.flags|=1,e!==null&&u?(t.child=Yr(t,e.child,null,l),t.child=Yr(t,null,d,l)):et(e,t,d,l),t.memoizedState=i.state,a&&Rf(t,r,!0),t.child}function Nm(e){var t=e.stateNode;t.pendingContext?If(e,t.pendingContext,t.pendingContext!==t.context):t.context&&If(e,t.context,!1),vc(e,t.containerInfo)}function Jf(e,t,r,i,a){return Kr(),dc(a),t.flags|=256,et(e,t,r,i),t.child}var yu={dehydrated:null,treeContext:null,retryLane:0};function bu(e){return{baseLanes:e,cachePool:null,transitions:null}}function Am(e,t,r){var i=t.pendingProps,a=Se.current,l=!1,u=(t.flags&128)!==0,d;if((d=u)||(d=e!==null&&e.memoizedState===null?!1:(a&2)!==0),d?(l=!0,t.flags&=-129):(e===null||e.memoizedState!==null)&&(a|=1),ge(Se,a&1),e===null)return fu(t),e=t.memoizedState,e!==null&&(e=e.dehydrated,e!==null)?(t.mode&1?e.data==="$!"?t.lanes=8:t.lanes=1073741824:t.lanes=1,null):(u=i.children,e=i.fallback,l?(i=t.mode,l=t.child,u={mode:"hidden",children:u},!(i&1)&&l!==null?(l.childLanes=0,l.pendingProps=u):l=os(u,i,0,null),e=rr(e,i,r,null),l.return=t,e.return=t,l.sibling=e,t.child=l,t.child.memoizedState=bu(r),t.memoizedState=yu,e):Cc(t,u));if(a=e.memoizedState,a!==null&&(d=a.dehydrated,d!==null))return S0(e,t,u,i,d,a,r);if(l){l=i.fallback,u=t.mode,a=e.child,d=a.sibling;var h={mode:"hidden",children:i.children};return!(u&1)&&t.child!==a?(i=t.child,i.childLanes=0,i.pendingProps=h,t.deletions=null):(i=Rn(a,h),i.subtreeFlags=a.subtreeFlags&14680064),d!==null?l=Rn(d,l):(l=rr(l,u,r,null),l.flags|=2),l.return=t,i.return=t,i.sibling=l,t.child=i,i=l,l=t.child,u=e.child.memoizedState,u=u===null?bu(r):{baseLanes:u.baseLanes|r,cachePool:null,transitions:u.transitions},l.memoizedState=u,l.childLanes=e.childLanes&~r,t.memoizedState=yu,i}return l=e.child,e=l.sibling,i=Rn(l,{mode:"visible",children:i.children}),!(t.mode&1)&&(i.lanes=r),i.return=t,i.sibling=null,e!==null&&(r=t.deletions,r===null?(t.deletions=[e],t.flags|=16):r.push(e)),t.child=i,t.memoizedState=null,i}function Cc(e,t){return t=os({mode:"visible",children:t},e.mode,0,null),t.return=e,e.child=t}function Yo(e,t,r,i){return i!==null&&dc(i),Yr(t,e.child,null,r),e=Cc(t,t.pendingProps.children),e.flags|=2,t.memoizedState=null,e}function S0(e,t,r,i,a,l,u){if(r)return t.flags&256?(t.flags&=-257,i=kl(Error(Z(422))),Yo(e,t,u,i)):t.memoizedState!==null?(t.child=e.child,t.flags|=128,null):(l=i.fallback,a=t.mode,i=os({mode:"visible",children:i.children},a,0,null),l=rr(l,a,u,null),l.flags|=2,i.return=t,l.return=t,i.sibling=l,t.child=i,t.mode&1&&Yr(t,e.child,null,u),t.child.memoizedState=bu(u),t.memoizedState=yu,l);if(!(t.mode&1))return Yo(e,t,u,null);if(a.data==="$!"){if(i=a.nextSibling&&a.nextSibling.dataset,i)var d=i.dgst;return i=d,l=Error(Z(419)),i=kl(l,i,void 0),Yo(e,t,u,i)}if(d=(u&e.childLanes)!==0,lt||d){if(i=We,i!==null){switch(u&-u){case 4:a=2;break;case 16:a=8;break;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:a=32;break;case 536870912:a=268435456;break;default:a=0}a=a&(i.suspendedLanes|u)?0:a,a!==0&&a!==l.retryLane&&(l.retryLane=a,hn(e,a),jt(i,e,a,-1))}return Mc(),i=kl(Error(Z(421))),Yo(e,t,u,i)}return a.data==="$?"?(t.flags|=128,t.child=e.child,t=D0.bind(null,e),a._reactRetry=t,null):(e=l.treeContext,gt=Nn(a.nextSibling),vt=t,we=!0,Rt=null,e!==null&&(St[Ct++]=sn,St[Ct++]=ln,St[Ct++]=sr,sn=e.id,ln=e.overflow,sr=t),t=Cc(t,i.children),t.flags|=4096,t)}function Xf(e,t,r){e.lanes|=t;var i=e.alternate;i!==null&&(i.lanes|=t),hu(e.return,t,r)}function Sl(e,t,r,i,a){var l=e.memoizedState;l===null?e.memoizedState={isBackwards:t,rendering:null,renderingStartTime:0,last:i,tail:r,tailMode:a}:(l.isBackwards=t,l.rendering=null,l.renderingStartTime=0,l.last=i,l.tail=r,l.tailMode=a)}function Om(e,t,r){var i=t.pendingProps,a=i.revealOrder,l=i.tail;if(et(e,t,i.children,r),i=Se.current,i&2)i=i&1|2,t.flags|=128;else{if(e!==null&&e.flags&128)e:for(e=t.child;e!==null;){if(e.tag===13)e.memoizedState!==null&&Xf(e,r,t);else if(e.tag===19)Xf(e,r,t);else if(e.child!==null){e.child.return=e,e=e.child;continue}if(e===t)break e;for(;e.sibling===null;){if(e.return===null||e.return===t)break e;e=e.return}e.sibling.return=e.return,e=e.sibling}i&=1}if(ge(Se,i),!(t.mode&1))t.memoizedState=null;else switch(a){case"forwards":for(r=t.child,a=null;r!==null;)e=r.alternate,e!==null&&Ia(e)===null&&(a=r),r=r.sibling;r=a,r===null?(a=t.child,t.child=null):(a=r.sibling,r.sibling=null),Sl(t,!1,a,r,l);break;case"backwards":for(r=null,a=t.child,t.child=null;a!==null;){if(e=a.alternate,e!==null&&Ia(e)===null){t.child=a;break}e=a.sibling,a.sibling=r,r=a,a=e}Sl(t,!0,r,null,l);break;case"together":Sl(t,!1,null,null,void 0);break;default:t.memoizedState=null}return t.child}function ua(e,t){!(t.mode&1)&&e!==null&&(e.alternate=null,t.alternate=null,t.flags|=2)}function pn(e,t,r){if(e!==null&&(t.dependencies=e.dependencies),ur|=t.lanes,!(r&t.childLanes))return null;if(e!==null&&t.child!==e.child)throw Error(Z(153));if(t.child!==null){for(e=t.child,r=Rn(e,e.pendingProps),t.child=r,r.return=t;e.sibling!==null;)e=e.sibling,r=r.sibling=Rn(e,e.pendingProps),r.return=t;r.sibling=null}return t.child}function C0(e,t,r){switch(t.tag){case 3:Nm(t),Kr();break;case 5:am(t);break;case 1:dt(t.type)&&La(t);break;case 4:vc(t,t.stateNode.containerInfo);break;case 10:var i=t.type._context,a=t.memoizedProps.value;ge(Na,i._currentValue),i._currentValue=a;break;case 13:if(i=t.memoizedState,i!==null)return i.dehydrated!==null?(ge(Se,Se.current&1),t.flags|=128,null):r&t.child.childLanes?Am(e,t,r):(ge(Se,Se.current&1),e=pn(e,t,r),e!==null?e.sibling:null);ge(Se,Se.current&1);break;case 19:if(i=(r&t.childLanes)!==0,e.flags&128){if(i)return Om(e,t,r);t.flags|=128}if(a=t.memoizedState,a!==null&&(a.rendering=null,a.tail=null,a.lastEffect=null),ge(Se,Se.current),i)break;return null;case 22:case 23:return t.lanes=0,zm(e,t,r)}return pn(e,t,r)}var Im,xu,Rm,Dm;Im=function(e,t){for(var r=t.child;r!==null;){if(r.tag===5||r.tag===6)e.appendChild(r.stateNode);else if(r.tag!==4&&r.child!==null){r.child.return=r,r=r.child;continue}if(r===t)break;for(;r.sibling===null;){if(r.return===null||r.return===t)return;r=r.return}r.sibling.return=r.return,r=r.sibling}};xu=function(){};Rm=function(e,t,r,i){var a=e.memoizedProps;if(a!==i){e=t.stateNode,er(qt.current);var l=null;switch(r){case"input":a=Wl(e,a),i=Wl(e,i),l=[];break;case"select":a=Pe({},a,{value:void 0}),i=Pe({},i,{value:void 0}),l=[];break;case"textarea":a=Gl(e,a),i=Gl(e,i),l=[];break;default:typeof a.onClick!="function"&&typeof i.onClick=="function"&&(e.onclick=Ta)}Yl(r,i);var u;r=null;for(p in a)if(!i.hasOwnProperty(p)&&a.hasOwnProperty(p)&&a[p]!=null)if(p==="style"){var d=a[p];for(u in d)d.hasOwnProperty(u)&&(r||(r={}),r[u]="")}else p!=="dangerouslySetInnerHTML"&&p!=="children"&&p!=="suppressContentEditableWarning"&&p!=="suppressHydrationWarning"&&p!=="autoFocus"&&(Vi.hasOwnProperty(p)?l||(l=[]):(l=l||[]).push(p,null));for(p in i){var h=i[p];if(d=a!=null?a[p]:void 0,i.hasOwnProperty(p)&&h!==d&&(h!=null||d!=null))if(p==="style")if(d){for(u in d)!d.hasOwnProperty(u)||h&&h.hasOwnProperty(u)||(r||(r={}),r[u]="");for(u in h)h.hasOwnProperty(u)&&d[u]!==h[u]&&(r||(r={}),r[u]=h[u])}else r||(l||(l=[]),l.push(p,r)),r=h;else p==="dangerouslySetInnerHTML"?(h=h?h.__html:void 0,d=d?d.__html:void 0,h!=null&&d!==h&&(l=l||[]).push(p,h)):p==="children"?typeof h!="string"&&typeof h!="number"||(l=l||[]).push(p,""+h):p!=="suppressContentEditableWarning"&&p!=="suppressHydrationWarning"&&(Vi.hasOwnProperty(p)?(h!=null&&p==="onScroll"&&ve("scroll",e),l||d===h||(l=[])):(l=l||[]).push(p,h))}r&&(l=l||[]).push("style",r);var p=l;(t.updateQueue=p)&&(t.flags|=4)}};Dm=function(e,t,r,i){r!==i&&(t.flags|=4)};function Ti(e,t){if(!we)switch(e.tailMode){case"hidden":t=e.tail;for(var r=null;t!==null;)t.alternate!==null&&(r=t),t=t.sibling;r===null?e.tail=null:r.sibling=null;break;case"collapsed":r=e.tail;for(var i=null;r!==null;)r.alternate!==null&&(i=r),r=r.sibling;i===null?t||e.tail===null?e.tail=null:e.tail.sibling=null:i.sibling=null}}function $e(e){var t=e.alternate!==null&&e.alternate.child===e.child,r=0,i=0;if(t)for(var a=e.child;a!==null;)r|=a.lanes|a.childLanes,i|=a.subtreeFlags&14680064,i|=a.flags&14680064,a.return=e,a=a.sibling;else for(a=e.child;a!==null;)r|=a.lanes|a.childLanes,i|=a.subtreeFlags,i|=a.flags,a.return=e,a=a.sibling;return e.subtreeFlags|=i,e.childLanes=r,t}function P0(e,t,r){var i=t.pendingProps;switch(cc(t),t.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return $e(t),null;case 1:return dt(t.type)&&Ea(),$e(t),null;case 3:return i=t.stateNode,Qr(),ye(ct),ye(Je),yc(),i.pendingContext&&(i.context=i.pendingContext,i.pendingContext=null),(e===null||e.child===null)&&(Go(t)?t.flags|=4:e===null||e.memoizedState.isDehydrated&&!(t.flags&256)||(t.flags|=1024,Rt!==null&&(Lu(Rt),Rt=null))),xu(e,t),$e(t),null;case 5:_c(t);var a=er(ro.current);if(r=t.type,e!==null&&t.stateNode!=null)Rm(e,t,r,i,a),e.ref!==t.ref&&(t.flags|=512,t.flags|=2097152);else{if(!i){if(t.stateNode===null)throw Error(Z(166));return $e(t),null}if(e=er(qt.current),Go(t)){i=t.stateNode,r=t.type;var l=t.memoizedProps;switch(i[Qt]=t,i[to]=l,e=(t.mode&1)!==0,r){case"dialog":ve("cancel",i),ve("close",i);break;case"iframe":case"object":case"embed":ve("load",i);break;case"video":case"audio":for(a=0;a<Ai.length;a++)ve(Ai[a],i);break;case"source":ve("error",i);break;case"img":case"image":case"link":ve("error",i),ve("load",i);break;case"details":ve("toggle",i);break;case"input":lf(i,l),ve("invalid",i);break;case"select":i._wrapperState={wasMultiple:!!l.multiple},ve("invalid",i);break;case"textarea":cf(i,l),ve("invalid",i)}Yl(r,l),a=null;for(var u in l)if(l.hasOwnProperty(u)){var d=l[u];u==="children"?typeof d=="string"?i.textContent!==d&&(l.suppressHydrationWarning!==!0&&Vo(i.textContent,d,e),a=["children",d]):typeof d=="number"&&i.textContent!==""+d&&(l.suppressHydrationWarning!==!0&&Vo(i.textContent,d,e),a=["children",""+d]):Vi.hasOwnProperty(u)&&d!=null&&u==="onScroll"&&ve("scroll",i)}switch(r){case"input":Do(i),uf(i,l,!0);break;case"textarea":Do(i),df(i);break;case"select":case"option":break;default:typeof l.onClick=="function"&&(i.onclick=Ta)}i=a,t.updateQueue=i,i!==null&&(t.flags|=4)}else{u=a.nodeType===9?a:a.ownerDocument,e==="http://www.w3.org/1999/xhtml"&&(e=dp(r)),e==="http://www.w3.org/1999/xhtml"?r==="script"?(e=u.createElement("div"),e.innerHTML="<script><\/script>",e=e.removeChild(e.firstChild)):typeof i.is=="string"?e=u.createElement(r,{is:i.is}):(e=u.createElement(r),r==="select"&&(u=e,i.multiple?u.multiple=!0:i.size&&(u.size=i.size))):e=u.createElementNS(e,r),e[Qt]=t,e[to]=i,Im(e,t,!1,!1),t.stateNode=e;e:{switch(u=Ql(r,i),r){case"dialog":ve("cancel",e),ve("close",e),a=i;break;case"iframe":case"object":case"embed":ve("load",e),a=i;break;case"video":case"audio":for(a=0;a<Ai.length;a++)ve(Ai[a],e);a=i;break;case"source":ve("error",e),a=i;break;case"img":case"image":case"link":ve("error",e),ve("load",e),a=i;break;case"details":ve("toggle",e),a=i;break;case"input":lf(e,i),a=Wl(e,i),ve("invalid",e);break;case"option":a=i;break;case"select":e._wrapperState={wasMultiple:!!i.multiple},a=Pe({},i,{value:void 0}),ve("invalid",e);break;case"textarea":cf(e,i),a=Gl(e,i),ve("invalid",e);break;default:a=i}Yl(r,a),d=a;for(l in d)if(d.hasOwnProperty(l)){var h=d[l];l==="style"?pp(e,h):l==="dangerouslySetInnerHTML"?(h=h?h.__html:void 0,h!=null&&fp(e,h)):l==="children"?typeof h=="string"?(r!=="textarea"||h!=="")&&Gi(e,h):typeof h=="number"&&Gi(e,""+h):l!=="suppressContentEditableWarning"&&l!=="suppressHydrationWarning"&&l!=="autoFocus"&&(Vi.hasOwnProperty(l)?h!=null&&l==="onScroll"&&ve("scroll",e):h!=null&&Qu(e,l,h,u))}switch(r){case"input":Do(e),uf(e,i,!1);break;case"textarea":Do(e),df(e);break;case"option":i.value!=null&&e.setAttribute("value",""+Dn(i.value));break;case"select":e.multiple=!!i.multiple,l=i.value,l!=null?Br(e,!!i.multiple,l,!1):i.defaultValue!=null&&Br(e,!!i.multiple,i.defaultValue,!0);break;default:typeof a.onClick=="function"&&(e.onclick=Ta)}switch(r){case"button":case"input":case"select":case"textarea":i=!!i.autoFocus;break e;case"img":i=!0;break e;default:i=!1}}i&&(t.flags|=4)}t.ref!==null&&(t.flags|=512,t.flags|=2097152)}return $e(t),null;case 6:if(e&&t.stateNode!=null)Dm(e,t,e.memoizedProps,i);else{if(typeof i!="string"&&t.stateNode===null)throw Error(Z(166));if(r=er(ro.current),er(qt.current),Go(t)){if(i=t.stateNode,r=t.memoizedProps,i[Qt]=t,(l=i.nodeValue!==r)&&(e=vt,e!==null))switch(e.tag){case 3:Vo(i.nodeValue,r,(e.mode&1)!==0);break;case 5:e.memoizedProps.suppressHydrationWarning!==!0&&Vo(i.nodeValue,r,(e.mode&1)!==0)}l&&(t.flags|=4)}else i=(r.nodeType===9?r:r.ownerDocument).createTextNode(i),i[Qt]=t,t.stateNode=i}return $e(t),null;case 13:if(ye(Se),i=t.memoizedState,e===null||e.memoizedState!==null&&e.memoizedState.dehydrated!==null){if(we&&gt!==null&&t.mode&1&&!(t.flags&128))tm(),Kr(),t.flags|=98560,l=!1;else if(l=Go(t),i!==null&&i.dehydrated!==null){if(e===null){if(!l)throw Error(Z(318));if(l=t.memoizedState,l=l!==null?l.dehydrated:null,!l)throw Error(Z(317));l[Qt]=t}else Kr(),!(t.flags&128)&&(t.memoizedState=null),t.flags|=4;$e(t),l=!1}else Rt!==null&&(Lu(Rt),Rt=null),l=!0;if(!l)return t.flags&65536?t:null}return t.flags&128?(t.lanes=r,t):(i=i!==null,i!==(e!==null&&e.memoizedState!==null)&&i&&(t.child.flags|=8192,t.mode&1&&(e===null||Se.current&1?Be===0&&(Be=3):Mc())),t.updateQueue!==null&&(t.flags|=4),$e(t),null);case 4:return Qr(),xu(e,t),e===null&&Xi(t.stateNode.containerInfo),$e(t),null;case 10:return pc(t.type._context),$e(t),null;case 17:return dt(t.type)&&Ea(),$e(t),null;case 19:if(ye(Se),l=t.memoizedState,l===null)return $e(t),null;if(i=(t.flags&128)!==0,u=l.rendering,u===null)if(i)Ti(l,!1);else{if(Be!==0||e!==null&&e.flags&128)for(e=t.child;e!==null;){if(u=Ia(e),u!==null){for(t.flags|=128,Ti(l,!1),i=u.updateQueue,i!==null&&(t.updateQueue=i,t.flags|=4),t.subtreeFlags=0,i=r,r=t.child;r!==null;)l=r,e=i,l.flags&=14680066,u=l.alternate,u===null?(l.childLanes=0,l.lanes=e,l.child=null,l.subtreeFlags=0,l.memoizedProps=null,l.memoizedState=null,l.updateQueue=null,l.dependencies=null,l.stateNode=null):(l.childLanes=u.childLanes,l.lanes=u.lanes,l.child=u.child,l.subtreeFlags=0,l.deletions=null,l.memoizedProps=u.memoizedProps,l.memoizedState=u.memoizedState,l.updateQueue=u.updateQueue,l.type=u.type,e=u.dependencies,l.dependencies=e===null?null:{lanes:e.lanes,firstContext:e.firstContext}),r=r.sibling;return ge(Se,Se.current&1|2),t.child}e=e.sibling}l.tail!==null&&Me()>qr&&(t.flags|=128,i=!0,Ti(l,!1),t.lanes=4194304)}else{if(!i)if(e=Ia(u),e!==null){if(t.flags|=128,i=!0,r=e.updateQueue,r!==null&&(t.updateQueue=r,t.flags|=4),Ti(l,!0),l.tail===null&&l.tailMode==="hidden"&&!u.alternate&&!we)return $e(t),null}else 2*Me()-l.renderingStartTime>qr&&r!==1073741824&&(t.flags|=128,i=!0,Ti(l,!1),t.lanes=4194304);l.isBackwards?(u.sibling=t.child,t.child=u):(r=l.last,r!==null?r.sibling=u:t.child=u,l.last=u)}return l.tail!==null?(t=l.tail,l.rendering=t,l.tail=t.sibling,l.renderingStartTime=Me(),t.sibling=null,r=Se.current,ge(Se,i?r&1|2:r&1),t):($e(t),null);case 22:case 23:return zc(),i=t.memoizedState!==null,e!==null&&e.memoizedState!==null!==i&&(t.flags|=8192),i&&t.mode&1?mt&1073741824&&($e(t),t.subtreeFlags&6&&(t.flags|=8192)):$e(t),null;case 24:return null;case 25:return null}throw Error(Z(156,t.tag))}function T0(e,t){switch(cc(t),t.tag){case 1:return dt(t.type)&&Ea(),e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 3:return Qr(),ye(ct),ye(Je),yc(),e=t.flags,e&65536&&!(e&128)?(t.flags=e&-65537|128,t):null;case 5:return _c(t),null;case 13:if(ye(Se),e=t.memoizedState,e!==null&&e.dehydrated!==null){if(t.alternate===null)throw Error(Z(340));Kr()}return e=t.flags,e&65536?(t.flags=e&-65537|128,t):null;case 19:return ye(Se),null;case 4:return Qr(),null;case 10:return pc(t.type._context),null;case 22:case 23:return zc(),null;case 24:return null;default:return null}}var Qo=!1,qe=!1,E0=typeof WeakSet=="function"?WeakSet:Set,K=null;function Rr(e,t){var r=e.ref;if(r!==null)if(typeof r=="function")try{r(null)}catch(i){Ee(e,t,i)}else r.current=null}function wu(e,t,r){try{r()}catch(i){Ee(e,t,i)}}var eh=!1;function L0(e,t){if(ou=Sa,e=Hp(),lc(e)){if("selectionStart"in e)var r={start:e.selectionStart,end:e.selectionEnd};else e:{r=(r=e.ownerDocument)&&r.defaultView||window;var i=r.getSelection&&r.getSelection();if(i&&i.rangeCount!==0){r=i.anchorNode;var a=i.anchorOffset,l=i.focusNode;i=i.focusOffset;try{r.nodeType,l.nodeType}catch{r=null;break e}var u=0,d=-1,h=-1,p=0,b=0,_=e,y=null;t:for(;;){for(var C;_!==r||a!==0&&_.nodeType!==3||(d=u+a),_!==l||i!==0&&_.nodeType!==3||(h=u+i),_.nodeType===3&&(u+=_.nodeValue.length),(C=_.firstChild)!==null;)y=_,_=C;for(;;){if(_===e)break t;if(y===r&&++p===a&&(d=u),y===l&&++b===i&&(h=u),(C=_.nextSibling)!==null)break;_=y,y=_.parentNode}_=C}r=d===-1||h===-1?null:{start:d,end:h}}else r=null}r=r||{start:0,end:0}}else r=null;for(au={focusedElem:e,selectionRange:r},Sa=!1,K=t;K!==null;)if(t=K,e=t.child,(t.subtreeFlags&1028)!==0&&e!==null)e.return=t,K=e;else for(;K!==null;){t=K;try{var T=t.alternate;if(t.flags&1024)switch(t.tag){case 0:case 11:case 15:break;case 1:if(T!==null){var k=T.memoizedProps,D=T.memoizedState,x=t.stateNode,g=x.getSnapshotBeforeUpdate(t.elementType===t.type?k:Ot(t.type,k),D);x.__reactInternalSnapshotBeforeUpdate=g}break;case 3:var v=t.stateNode.containerInfo;v.nodeType===1?v.textContent="":v.nodeType===9&&v.documentElement&&v.removeChild(v.documentElement);break;case 5:case 6:case 4:case 17:break;default:throw Error(Z(163))}}catch(E){Ee(t,t.return,E)}if(e=t.sibling,e!==null){e.return=t.return,K=e;break}K=t.return}return T=eh,eh=!1,T}function Zi(e,t,r){var i=t.updateQueue;if(i=i!==null?i.lastEffect:null,i!==null){var a=i=i.next;do{if((a.tag&e)===e){var l=a.destroy;a.destroy=void 0,l!==void 0&&wu(t,r,l)}a=a.next}while(a!==i)}}function rs(e,t){if(t=t.updateQueue,t=t!==null?t.lastEffect:null,t!==null){var r=t=t.next;do{if((r.tag&e)===e){var i=r.create;r.destroy=i()}r=r.next}while(r!==t)}}function ku(e){var t=e.ref;if(t!==null){var r=e.stateNode;switch(e.tag){case 5:e=r;break;default:e=r}typeof t=="function"?t(e):t.current=e}}function jm(e){var t=e.alternate;t!==null&&(e.alternate=null,jm(t)),e.child=null,e.deletions=null,e.sibling=null,e.tag===5&&(t=e.stateNode,t!==null&&(delete t[Qt],delete t[to],delete t[uu],delete t[d0],delete t[f0])),e.stateNode=null,e.return=null,e.dependencies=null,e.memoizedProps=null,e.memoizedState=null,e.pendingProps=null,e.stateNode=null,e.updateQueue=null}function Bm(e){return e.tag===5||e.tag===3||e.tag===4}function th(e){e:for(;;){for(;e.sibling===null;){if(e.return===null||Bm(e.return))return null;e=e.return}for(e.sibling.return=e.return,e=e.sibling;e.tag!==5&&e.tag!==6&&e.tag!==18;){if(e.flags&2||e.child===null||e.tag===4)continue e;e.child.return=e,e=e.child}if(!(e.flags&2))return e.stateNode}}function Su(e,t,r){var i=e.tag;if(i===5||i===6)e=e.stateNode,t?r.nodeType===8?r.parentNode.insertBefore(e,t):r.insertBefore(e,t):(r.nodeType===8?(t=r.parentNode,t.insertBefore(e,r)):(t=r,t.appendChild(e)),r=r._reactRootContainer,r!=null||t.onclick!==null||(t.onclick=Ta));else if(i!==4&&(e=e.child,e!==null))for(Su(e,t,r),e=e.sibling;e!==null;)Su(e,t,r),e=e.sibling}function Cu(e,t,r){var i=e.tag;if(i===5||i===6)e=e.stateNode,t?r.insertBefore(e,t):r.appendChild(e);else if(i!==4&&(e=e.child,e!==null))for(Cu(e,t,r),e=e.sibling;e!==null;)Cu(e,t,r),e=e.sibling}var Ge=null,It=!1;function yn(e,t,r){for(r=r.child;r!==null;)Fm(e,t,r),r=r.sibling}function Fm(e,t,r){if($t&&typeof $t.onCommitFiberUnmount=="function")try{$t.onCommitFiberUnmount(Qa,r)}catch{}switch(r.tag){case 5:qe||Rr(r,t);case 6:var i=Ge,a=It;Ge=null,yn(e,t,r),Ge=i,It=a,Ge!==null&&(It?(e=Ge,r=r.stateNode,e.nodeType===8?e.parentNode.removeChild(r):e.removeChild(r)):Ge.removeChild(r.stateNode));break;case 18:Ge!==null&&(It?(e=Ge,r=r.stateNode,e.nodeType===8?vl(e.parentNode,r):e.nodeType===1&&vl(e,r),$i(e)):vl(Ge,r.stateNode));break;case 4:i=Ge,a=It,Ge=r.stateNode.containerInfo,It=!0,yn(e,t,r),Ge=i,It=a;break;case 0:case 11:case 14:case 15:if(!qe&&(i=r.updateQueue,i!==null&&(i=i.lastEffect,i!==null))){a=i=i.next;do{var l=a,u=l.destroy;l=l.tag,u!==void 0&&(l&2||l&4)&&wu(r,t,u),a=a.next}while(a!==i)}yn(e,t,r);break;case 1:if(!qe&&(Rr(r,t),i=r.stateNode,typeof i.componentWillUnmount=="function"))try{i.props=r.memoizedProps,i.state=r.memoizedState,i.componentWillUnmount()}catch(d){Ee(r,t,d)}yn(e,t,r);break;case 21:yn(e,t,r);break;case 22:r.mode&1?(qe=(i=qe)||r.memoizedState!==null,yn(e,t,r),qe=i):yn(e,t,r);break;default:yn(e,t,r)}}function nh(e){var t=e.updateQueue;if(t!==null){e.updateQueue=null;var r=e.stateNode;r===null&&(r=e.stateNode=new E0),t.forEach(function(i){var a=j0.bind(null,e,i);r.has(i)||(r.add(i),i.then(a,a))})}}function At(e,t){var r=t.deletions;if(r!==null)for(var i=0;i<r.length;i++){var a=r[i];try{var l=e,u=t,d=u;e:for(;d!==null;){switch(d.tag){case 5:Ge=d.stateNode,It=!1;break e;case 3:Ge=d.stateNode.containerInfo,It=!0;break e;case 4:Ge=d.stateNode.containerInfo,It=!0;break e}d=d.return}if(Ge===null)throw Error(Z(160));Fm(l,u,a),Ge=null,It=!1;var h=a.alternate;h!==null&&(h.return=null),a.return=null}catch(p){Ee(a,t,p)}}if(t.subtreeFlags&12854)for(t=t.child;t!==null;)Zm(t,e),t=t.sibling}function Zm(e,t){var r=e.alternate,i=e.flags;switch(e.tag){case 0:case 11:case 14:case 15:if(At(t,e),Gt(e),i&4){try{Zi(3,e,e.return),rs(3,e)}catch(k){Ee(e,e.return,k)}try{Zi(5,e,e.return)}catch(k){Ee(e,e.return,k)}}break;case 1:At(t,e),Gt(e),i&512&&r!==null&&Rr(r,r.return);break;case 5:if(At(t,e),Gt(e),i&512&&r!==null&&Rr(r,r.return),e.flags&32){var a=e.stateNode;try{Gi(a,"")}catch(k){Ee(e,e.return,k)}}if(i&4&&(a=e.stateNode,a!=null)){var l=e.memoizedProps,u=r!==null?r.memoizedProps:l,d=e.type,h=e.updateQueue;if(e.updateQueue=null,h!==null)try{d==="input"&&l.type==="radio"&&l.name!=null&&up(a,l),Ql(d,u);var p=Ql(d,l);for(u=0;u<h.length;u+=2){var b=h[u],_=h[u+1];b==="style"?pp(a,_):b==="dangerouslySetInnerHTML"?fp(a,_):b==="children"?Gi(a,_):Qu(a,b,_,p)}switch(d){case"input":Ul(a,l);break;case"textarea":cp(a,l);break;case"select":var y=a._wrapperState.wasMultiple;a._wrapperState.wasMultiple=!!l.multiple;var C=l.value;C!=null?Br(a,!!l.multiple,C,!1):y!==!!l.multiple&&(l.defaultValue!=null?Br(a,!!l.multiple,l.defaultValue,!0):Br(a,!!l.multiple,l.multiple?[]:"",!1))}a[to]=l}catch(k){Ee(e,e.return,k)}}break;case 6:if(At(t,e),Gt(e),i&4){if(e.stateNode===null)throw Error(Z(162));a=e.stateNode,l=e.memoizedProps;try{a.nodeValue=l}catch(k){Ee(e,e.return,k)}}break;case 3:if(At(t,e),Gt(e),i&4&&r!==null&&r.memoizedState.isDehydrated)try{$i(t.containerInfo)}catch(k){Ee(e,e.return,k)}break;case 4:At(t,e),Gt(e);break;case 13:At(t,e),Gt(e),a=e.child,a.flags&8192&&(l=a.memoizedState!==null,a.stateNode.isHidden=l,!l||a.alternate!==null&&a.alternate.memoizedState!==null||(Ec=Me())),i&4&&nh(e);break;case 22:if(b=r!==null&&r.memoizedState!==null,e.mode&1?(qe=(p=qe)||b,At(t,e),qe=p):At(t,e),Gt(e),i&8192){if(p=e.memoizedState!==null,(e.stateNode.isHidden=p)&&!b&&e.mode&1)for(K=e,b=e.child;b!==null;){for(_=K=b;K!==null;){switch(y=K,C=y.child,y.tag){case 0:case 11:case 14:case 15:Zi(4,y,y.return);break;case 1:Rr(y,y.return);var T=y.stateNode;if(typeof T.componentWillUnmount=="function"){i=y,r=y.return;try{t=i,T.props=t.memoizedProps,T.state=t.memoizedState,T.componentWillUnmount()}catch(k){Ee(i,r,k)}}break;case 5:Rr(y,y.return);break;case 22:if(y.memoizedState!==null){ih(_);continue}}C!==null?(C.return=y,K=C):ih(_)}b=b.sibling}e:for(b=null,_=e;;){if(_.tag===5){if(b===null){b=_;try{a=_.stateNode,p?(l=a.style,typeof l.setProperty=="function"?l.setProperty("display","none","important"):l.display="none"):(d=_.stateNode,h=_.memoizedProps.style,u=h!=null&&h.hasOwnProperty("display")?h.display:null,d.style.display=hp("display",u))}catch(k){Ee(e,e.return,k)}}}else if(_.tag===6){if(b===null)try{_.stateNode.nodeValue=p?"":_.memoizedProps}catch(k){Ee(e,e.return,k)}}else if((_.tag!==22&&_.tag!==23||_.memoizedState===null||_===e)&&_.child!==null){_.child.return=_,_=_.child;continue}if(_===e)break e;for(;_.sibling===null;){if(_.return===null||_.return===e)break e;b===_&&(b=null),_=_.return}b===_&&(b=null),_.sibling.return=_.return,_=_.sibling}}break;case 19:At(t,e),Gt(e),i&4&&nh(e);break;case 21:break;default:At(t,e),Gt(e)}}function Gt(e){var t=e.flags;if(t&2){try{e:{for(var r=e.return;r!==null;){if(Bm(r)){var i=r;break e}r=r.return}throw Error(Z(160))}switch(i.tag){case 5:var a=i.stateNode;i.flags&32&&(Gi(a,""),i.flags&=-33);var l=th(e);Cu(e,l,a);break;case 3:case 4:var u=i.stateNode.containerInfo,d=th(e);Su(e,d,u);break;default:throw Error(Z(161))}}catch(h){Ee(e,e.return,h)}e.flags&=-3}t&4096&&(e.flags&=-4097)}function z0(e,t,r){K=e,Hm(e)}function Hm(e,t,r){for(var i=(e.mode&1)!==0;K!==null;){var a=K,l=a.child;if(a.tag===22&&i){var u=a.memoizedState!==null||Qo;if(!u){var d=a.alternate,h=d!==null&&d.memoizedState!==null||qe;d=Qo;var p=qe;if(Qo=u,(qe=h)&&!p)for(K=a;K!==null;)u=K,h=u.child,u.tag===22&&u.memoizedState!==null?oh(a):h!==null?(h.return=u,K=h):oh(a);for(;l!==null;)K=l,Hm(l),l=l.sibling;K=a,Qo=d,qe=p}rh(e)}else a.subtreeFlags&8772&&l!==null?(l.return=a,K=l):rh(e)}}function rh(e){for(;K!==null;){var t=K;if(t.flags&8772){var r=t.alternate;try{if(t.flags&8772)switch(t.tag){case 0:case 11:case 15:qe||rs(5,t);break;case 1:var i=t.stateNode;if(t.flags&4&&!qe)if(r===null)i.componentDidMount();else{var a=t.elementType===t.type?r.memoizedProps:Ot(t.type,r.memoizedProps);i.componentDidUpdate(a,r.memoizedState,i.__reactInternalSnapshotBeforeUpdate)}var l=t.updateQueue;l!==null&&Zf(t,l,i);break;case 3:var u=t.updateQueue;if(u!==null){if(r=null,t.child!==null)switch(t.child.tag){case 5:r=t.child.stateNode;break;case 1:r=t.child.stateNode}Zf(t,u,r)}break;case 5:var d=t.stateNode;if(r===null&&t.flags&4){r=d;var h=t.memoizedProps;switch(t.type){case"button":case"input":case"select":case"textarea":h.autoFocus&&r.focus();break;case"img":h.src&&(r.src=h.src)}}break;case 6:break;case 4:break;case 12:break;case 13:if(t.memoizedState===null){var p=t.alternate;if(p!==null){var b=p.memoizedState;if(b!==null){var _=b.dehydrated;_!==null&&$i(_)}}}break;case 19:case 17:case 21:case 22:case 23:case 25:break;default:throw Error(Z(163))}qe||t.flags&512&&ku(t)}catch(y){Ee(t,t.return,y)}}if(t===e){K=null;break}if(r=t.sibling,r!==null){r.return=t.return,K=r;break}K=t.return}}function ih(e){for(;K!==null;){var t=K;if(t===e){K=null;break}var r=t.sibling;if(r!==null){r.return=t.return,K=r;break}K=t.return}}function oh(e){for(;K!==null;){var t=K;try{switch(t.tag){case 0:case 11:case 15:var r=t.return;try{rs(4,t)}catch(h){Ee(t,r,h)}break;case 1:var i=t.stateNode;if(typeof i.componentDidMount=="function"){var a=t.return;try{i.componentDidMount()}catch(h){Ee(t,a,h)}}var l=t.return;try{ku(t)}catch(h){Ee(t,l,h)}break;case 5:var u=t.return;try{ku(t)}catch(h){Ee(t,u,h)}}}catch(h){Ee(t,t.return,h)}if(t===e){K=null;break}var d=t.sibling;if(d!==null){d.return=t.return,K=d;break}K=t.return}}var M0=Math.ceil,ja=mn.ReactCurrentDispatcher,Pc=mn.ReactCurrentOwner,Tt=mn.ReactCurrentBatchConfig,ce=0,We=null,Re=null,Ke=0,mt=0,Dr=Zn(0),Be=0,so=null,ur=0,is=0,Tc=0,Hi=null,st=null,Ec=0,qr=1/0,rn=null,Ba=!1,Pu=null,On=null,$o=!1,Tn=null,Fa=0,Wi=0,Tu=null,ca=-1,da=0;function tt(){return ce&6?Me():ca!==-1?ca:ca=Me()}function In(e){return e.mode&1?ce&2&&Ke!==0?Ke&-Ke:p0.transition!==null?(da===0&&(da=Pp()),da):(e=pe,e!==0||(e=window.event,e=e===void 0?16:Ap(e.type)),e):1}function jt(e,t,r,i){if(50<Wi)throw Wi=0,Tu=null,Error(Z(185));co(e,r,i),(!(ce&2)||e!==We)&&(e===We&&(!(ce&2)&&(is|=r),Be===4&&Cn(e,Ke)),ft(e,i),r===1&&ce===0&&!(t.mode&1)&&(qr=Me()+500,es&&Hn()))}function ft(e,t){var r=e.callbackNode;py(e,t);var i=ka(e,e===We?Ke:0);if(i===0)r!==null&&pf(r),e.callbackNode=null,e.callbackPriority=0;else if(t=i&-i,e.callbackPriority!==t){if(r!=null&&pf(r),t===1)e.tag===0?h0(ah.bind(null,e)):Jp(ah.bind(null,e)),u0(function(){!(ce&6)&&Hn()}),r=null;else{switch(Tp(i)){case 1:r=ec;break;case 4:r=Sp;break;case 16:r=wa;break;case 536870912:r=Cp;break;default:r=wa}r=$m(r,Wm.bind(null,e))}e.callbackPriority=t,e.callbackNode=r}}function Wm(e,t){if(ca=-1,da=0,ce&6)throw Error(Z(327));var r=e.callbackNode;if(Ur()&&e.callbackNode!==r)return null;var i=ka(e,e===We?Ke:0);if(i===0)return null;if(i&30||i&e.expiredLanes||t)t=Za(e,i);else{t=i;var a=ce;ce|=2;var l=Vm();(We!==e||Ke!==t)&&(rn=null,qr=Me()+500,nr(e,t));do try{O0();break}catch(d){Um(e,d)}while(!0);hc(),ja.current=l,ce=a,Re!==null?t=0:(We=null,Ke=0,t=Be)}if(t!==0){if(t===2&&(a=eu(e),a!==0&&(i=a,t=Eu(e,a))),t===1)throw r=so,nr(e,0),Cn(e,i),ft(e,Me()),r;if(t===6)Cn(e,i);else{if(a=e.current.alternate,!(i&30)&&!N0(a)&&(t=Za(e,i),t===2&&(l=eu(e),l!==0&&(i=l,t=Eu(e,l))),t===1))throw r=so,nr(e,0),Cn(e,i),ft(e,Me()),r;switch(e.finishedWork=a,e.finishedLanes=i,t){case 0:case 1:throw Error(Z(345));case 2:qn(e,st,rn);break;case 3:if(Cn(e,i),(i&130023424)===i&&(t=Ec+500-Me(),10<t)){if(ka(e,0)!==0)break;if(a=e.suspendedLanes,(a&i)!==i){tt(),e.pingedLanes|=e.suspendedLanes&a;break}e.timeoutHandle=lu(qn.bind(null,e,st,rn),t);break}qn(e,st,rn);break;case 4:if(Cn(e,i),(i&4194240)===i)break;for(t=e.eventTimes,a=-1;0<i;){var u=31-Dt(i);l=1<<u,u=t[u],u>a&&(a=u),i&=~l}if(i=a,i=Me()-i,i=(120>i?120:480>i?480:1080>i?1080:1920>i?1920:3e3>i?3e3:4320>i?4320:1960*M0(i/1960))-i,10<i){e.timeoutHandle=lu(qn.bind(null,e,st,rn),i);break}qn(e,st,rn);break;case 5:qn(e,st,rn);break;default:throw Error(Z(329))}}}return ft(e,Me()),e.callbackNode===r?Wm.bind(null,e):null}function Eu(e,t){var r=Hi;return e.current.memoizedState.isDehydrated&&(nr(e,t).flags|=256),e=Za(e,t),e!==2&&(t=st,st=r,t!==null&&Lu(t)),e}function Lu(e){st===null?st=e:st.push.apply(st,e)}function N0(e){for(var t=e;;){if(t.flags&16384){var r=t.updateQueue;if(r!==null&&(r=r.stores,r!==null))for(var i=0;i<r.length;i++){var a=r[i],l=a.getSnapshot;a=a.value;try{if(!Ft(l(),a))return!1}catch{return!1}}}if(r=t.child,t.subtreeFlags&16384&&r!==null)r.return=t,t=r;else{if(t===e)break;for(;t.sibling===null;){if(t.return===null||t.return===e)return!0;t=t.return}t.sibling.return=t.return,t=t.sibling}}return!0}function Cn(e,t){for(t&=~Tc,t&=~is,e.suspendedLanes|=t,e.pingedLanes&=~t,e=e.expirationTimes;0<t;){var r=31-Dt(t),i=1<<r;e[r]=-1,t&=~i}}function ah(e){if(ce&6)throw Error(Z(327));Ur();var t=ka(e,0);if(!(t&1))return ft(e,Me()),null;var r=Za(e,t);if(e.tag!==0&&r===2){var i=eu(e);i!==0&&(t=i,r=Eu(e,i))}if(r===1)throw r=so,nr(e,0),Cn(e,t),ft(e,Me()),r;if(r===6)throw Error(Z(345));return e.finishedWork=e.current.alternate,e.finishedLanes=t,qn(e,st,rn),ft(e,Me()),null}function Lc(e,t){var r=ce;ce|=1;try{return e(t)}finally{ce=r,ce===0&&(qr=Me()+500,es&&Hn())}}function cr(e){Tn!==null&&Tn.tag===0&&!(ce&6)&&Ur();var t=ce;ce|=1;var r=Tt.transition,i=pe;try{if(Tt.transition=null,pe=1,e)return e()}finally{pe=i,Tt.transition=r,ce=t,!(ce&6)&&Hn()}}function zc(){mt=Dr.current,ye(Dr)}function nr(e,t){e.finishedWork=null,e.finishedLanes=0;var r=e.timeoutHandle;if(r!==-1&&(e.timeoutHandle=-1,l0(r)),Re!==null)for(r=Re.return;r!==null;){var i=r;switch(cc(i),i.tag){case 1:i=i.type.childContextTypes,i!=null&&Ea();break;case 3:Qr(),ye(ct),ye(Je),yc();break;case 5:_c(i);break;case 4:Qr();break;case 13:ye(Se);break;case 19:ye(Se);break;case 10:pc(i.type._context);break;case 22:case 23:zc()}r=r.return}if(We=e,Re=e=Rn(e.current,null),Ke=mt=t,Be=0,so=null,Tc=is=ur=0,st=Hi=null,Xn!==null){for(t=0;t<Xn.length;t++)if(r=Xn[t],i=r.interleaved,i!==null){r.interleaved=null;var a=i.next,l=r.pending;if(l!==null){var u=l.next;l.next=a,i.next=u}r.pending=i}Xn=null}return e}function Um(e,t){do{var r=Re;try{if(hc(),sa.current=Da,Ra){for(var i=Ce.memoizedState;i!==null;){var a=i.queue;a!==null&&(a.pending=null),i=i.next}Ra=!1}if(lr=0,Ze=je=Ce=null,Fi=!1,io=0,Pc.current=null,r===null||r.return===null){Be=1,so=t,Re=null;break}e:{var l=e,u=r.return,d=r,h=t;if(t=Ke,d.flags|=32768,h!==null&&typeof h=="object"&&typeof h.then=="function"){var p=h,b=d,_=b.tag;if(!(b.mode&1)&&(_===0||_===11||_===15)){var y=b.alternate;y?(b.updateQueue=y.updateQueue,b.memoizedState=y.memoizedState,b.lanes=y.lanes):(b.updateQueue=null,b.memoizedState=null)}var C=Kf(u);if(C!==null){C.flags&=-257,Yf(C,u,d,l,t),C.mode&1&&Gf(l,p,t),t=C,h=p;var T=t.updateQueue;if(T===null){var k=new Set;k.add(h),t.updateQueue=k}else T.add(h);break e}else{if(!(t&1)){Gf(l,p,t),Mc();break e}h=Error(Z(426))}}else if(we&&d.mode&1){var D=Kf(u);if(D!==null){!(D.flags&65536)&&(D.flags|=256),Yf(D,u,d,l,t),dc($r(h,d));break e}}l=h=$r(h,d),Be!==4&&(Be=2),Hi===null?Hi=[l]:Hi.push(l),l=u;do{switch(l.tag){case 3:l.flags|=65536,t&=-t,l.lanes|=t;var x=Tm(l,h,t);Ff(l,x);break e;case 1:d=h;var g=l.type,v=l.stateNode;if(!(l.flags&128)&&(typeof g.getDerivedStateFromError=="function"||v!==null&&typeof v.componentDidCatch=="function"&&(On===null||!On.has(v)))){l.flags|=65536,t&=-t,l.lanes|=t;var E=Em(l,d,t);Ff(l,E);break e}}l=l.return}while(l!==null)}Km(r)}catch(N){t=N,Re===r&&r!==null&&(Re=r=r.return);continue}break}while(!0)}function Vm(){var e=ja.current;return ja.current=Da,e===null?Da:e}function Mc(){(Be===0||Be===3||Be===2)&&(Be=4),We===null||!(ur&268435455)&&!(is&268435455)||Cn(We,Ke)}function Za(e,t){var r=ce;ce|=2;var i=Vm();(We!==e||Ke!==t)&&(rn=null,nr(e,t));do try{A0();break}catch(a){Um(e,a)}while(!0);if(hc(),ce=r,ja.current=i,Re!==null)throw Error(Z(261));return We=null,Ke=0,Be}function A0(){for(;Re!==null;)Gm(Re)}function O0(){for(;Re!==null&&!oy();)Gm(Re)}function Gm(e){var t=Qm(e.alternate,e,mt);e.memoizedProps=e.pendingProps,t===null?Km(e):Re=t,Pc.current=null}function Km(e){var t=e;do{var r=t.alternate;if(e=t.return,t.flags&32768){if(r=T0(r,t),r!==null){r.flags&=32767,Re=r;return}if(e!==null)e.flags|=32768,e.subtreeFlags=0,e.deletions=null;else{Be=6,Re=null;return}}else if(r=P0(r,t,mt),r!==null){Re=r;return}if(t=t.sibling,t!==null){Re=t;return}Re=t=e}while(t!==null);Be===0&&(Be=5)}function qn(e,t,r){var i=pe,a=Tt.transition;try{Tt.transition=null,pe=1,I0(e,t,r,i)}finally{Tt.transition=a,pe=i}return null}function I0(e,t,r,i){do Ur();while(Tn!==null);if(ce&6)throw Error(Z(327));r=e.finishedWork;var a=e.finishedLanes;if(r===null)return null;if(e.finishedWork=null,e.finishedLanes=0,r===e.current)throw Error(Z(177));e.callbackNode=null,e.callbackPriority=0;var l=r.lanes|r.childLanes;if(my(e,l),e===We&&(Re=We=null,Ke=0),!(r.subtreeFlags&2064)&&!(r.flags&2064)||$o||($o=!0,$m(wa,function(){return Ur(),null})),l=(r.flags&15990)!==0,r.subtreeFlags&15990||l){l=Tt.transition,Tt.transition=null;var u=pe;pe=1;var d=ce;ce|=4,Pc.current=null,L0(e,r),Zm(r,e),t0(au),Sa=!!ou,au=ou=null,e.current=r,z0(r),ay(),ce=d,pe=u,Tt.transition=l}else e.current=r;if($o&&($o=!1,Tn=e,Fa=a),l=e.pendingLanes,l===0&&(On=null),uy(r.stateNode),ft(e,Me()),t!==null)for(i=e.onRecoverableError,r=0;r<t.length;r++)a=t[r],i(a.value,{componentStack:a.stack,digest:a.digest});if(Ba)throw Ba=!1,e=Pu,Pu=null,e;return Fa&1&&e.tag!==0&&Ur(),l=e.pendingLanes,l&1?e===Tu?Wi++:(Wi=0,Tu=e):Wi=0,Hn(),null}function Ur(){if(Tn!==null){var e=Tp(Fa),t=Tt.transition,r=pe;try{if(Tt.transition=null,pe=16>e?16:e,Tn===null)var i=!1;else{if(e=Tn,Tn=null,Fa=0,ce&6)throw Error(Z(331));var a=ce;for(ce|=4,K=e.current;K!==null;){var l=K,u=l.child;if(K.flags&16){var d=l.deletions;if(d!==null){for(var h=0;h<d.length;h++){var p=d[h];for(K=p;K!==null;){var b=K;switch(b.tag){case 0:case 11:case 15:Zi(8,b,l)}var _=b.child;if(_!==null)_.return=b,K=_;else for(;K!==null;){b=K;var y=b.sibling,C=b.return;if(jm(b),b===p){K=null;break}if(y!==null){y.return=C,K=y;break}K=C}}}var T=l.alternate;if(T!==null){var k=T.child;if(k!==null){T.child=null;do{var D=k.sibling;k.sibling=null,k=D}while(k!==null)}}K=l}}if(l.subtreeFlags&2064&&u!==null)u.return=l,K=u;else e:for(;K!==null;){if(l=K,l.flags&2048)switch(l.tag){case 0:case 11:case 15:Zi(9,l,l.return)}var x=l.sibling;if(x!==null){x.return=l.return,K=x;break e}K=l.return}}var g=e.current;for(K=g;K!==null;){u=K;var v=u.child;if(u.subtreeFlags&2064&&v!==null)v.return=u,K=v;else e:for(u=g;K!==null;){if(d=K,d.flags&2048)try{switch(d.tag){case 0:case 11:case 15:rs(9,d)}}catch(N){Ee(d,d.return,N)}if(d===u){K=null;break e}var E=d.sibling;if(E!==null){E.return=d.return,K=E;break e}K=d.return}}if(ce=a,Hn(),$t&&typeof $t.onPostCommitFiberRoot=="function")try{$t.onPostCommitFiberRoot(Qa,e)}catch{}i=!0}return i}finally{pe=r,Tt.transition=t}}return!1}function sh(e,t,r){t=$r(r,t),t=Tm(e,t,1),e=An(e,t,1),t=tt(),e!==null&&(co(e,1,t),ft(e,t))}function Ee(e,t,r){if(e.tag===3)sh(e,e,r);else for(;t!==null;){if(t.tag===3){sh(t,e,r);break}else if(t.tag===1){var i=t.stateNode;if(typeof t.type.getDerivedStateFromError=="function"||typeof i.componentDidCatch=="function"&&(On===null||!On.has(i))){e=$r(r,e),e=Em(t,e,1),t=An(t,e,1),e=tt(),t!==null&&(co(t,1,e),ft(t,e));break}}t=t.return}}function R0(e,t,r){var i=e.pingCache;i!==null&&i.delete(t),t=tt(),e.pingedLanes|=e.suspendedLanes&r,We===e&&(Ke&r)===r&&(Be===4||Be===3&&(Ke&130023424)===Ke&&500>Me()-Ec?nr(e,0):Tc|=r),ft(e,t)}function Ym(e,t){t===0&&(e.mode&1?(t=Fo,Fo<<=1,!(Fo&130023424)&&(Fo=4194304)):t=1);var r=tt();e=hn(e,t),e!==null&&(co(e,t,r),ft(e,r))}function D0(e){var t=e.memoizedState,r=0;t!==null&&(r=t.retryLane),Ym(e,r)}function j0(e,t){var r=0;switch(e.tag){case 13:var i=e.stateNode,a=e.memoizedState;a!==null&&(r=a.retryLane);break;case 19:i=e.stateNode;break;default:throw Error(Z(314))}i!==null&&i.delete(t),Ym(e,r)}var Qm;Qm=function(e,t,r){if(e!==null)if(e.memoizedProps!==t.pendingProps||ct.current)lt=!0;else{if(!(e.lanes&r)&&!(t.flags&128))return lt=!1,C0(e,t,r);lt=!!(e.flags&131072)}else lt=!1,we&&t.flags&1048576&&Xp(t,Ma,t.index);switch(t.lanes=0,t.tag){case 2:var i=t.type;ua(e,t),e=t.pendingProps;var a=Gr(t,Je.current);Wr(t,r),a=xc(null,t,i,e,a,r);var l=wc();return t.flags|=1,typeof a=="object"&&a!==null&&typeof a.render=="function"&&a.$$typeof===void 0?(t.tag=1,t.memoizedState=null,t.updateQueue=null,dt(i)?(l=!0,La(t)):l=!1,t.memoizedState=a.state!==null&&a.state!==void 0?a.state:null,gc(t),a.updater=ns,t.stateNode=a,a._reactInternals=t,mu(t,i,e,r),t=_u(null,t,i,!0,l,r)):(t.tag=0,we&&l&&uc(t),et(null,t,a,r),t=t.child),t;case 16:i=t.elementType;e:{switch(ua(e,t),e=t.pendingProps,a=i._init,i=a(i._payload),t.type=i,a=t.tag=F0(i),e=Ot(i,e),a){case 0:t=vu(null,t,i,e,r);break e;case 1:t=qf(null,t,i,e,r);break e;case 11:t=Qf(null,t,i,e,r);break e;case 14:t=$f(null,t,i,Ot(i.type,e),r);break e}throw Error(Z(306,i,""))}return t;case 0:return i=t.type,a=t.pendingProps,a=t.elementType===i?a:Ot(i,a),vu(e,t,i,a,r);case 1:return i=t.type,a=t.pendingProps,a=t.elementType===i?a:Ot(i,a),qf(e,t,i,a,r);case 3:e:{if(Nm(t),e===null)throw Error(Z(387));i=t.pendingProps,l=t.memoizedState,a=l.element,om(e,t),Oa(t,i,null,r);var u=t.memoizedState;if(i=u.element,l.isDehydrated)if(l={element:i,isDehydrated:!1,cache:u.cache,pendingSuspenseBoundaries:u.pendingSuspenseBoundaries,transitions:u.transitions},t.updateQueue.baseState=l,t.memoizedState=l,t.flags&256){a=$r(Error(Z(423)),t),t=Jf(e,t,i,r,a);break e}else if(i!==a){a=$r(Error(Z(424)),t),t=Jf(e,t,i,r,a);break e}else for(gt=Nn(t.stateNode.containerInfo.firstChild),vt=t,we=!0,Rt=null,r=rm(t,null,i,r),t.child=r;r;)r.flags=r.flags&-3|4096,r=r.sibling;else{if(Kr(),i===a){t=pn(e,t,r);break e}et(e,t,i,r)}t=t.child}return t;case 5:return am(t),e===null&&fu(t),i=t.type,a=t.pendingProps,l=e!==null?e.memoizedProps:null,u=a.children,su(i,a)?u=null:l!==null&&su(i,l)&&(t.flags|=32),Mm(e,t),et(e,t,u,r),t.child;case 6:return e===null&&fu(t),null;case 13:return Am(e,t,r);case 4:return vc(t,t.stateNode.containerInfo),i=t.pendingProps,e===null?t.child=Yr(t,null,i,r):et(e,t,i,r),t.child;case 11:return i=t.type,a=t.pendingProps,a=t.elementType===i?a:Ot(i,a),Qf(e,t,i,a,r);case 7:return et(e,t,t.pendingProps,r),t.child;case 8:return et(e,t,t.pendingProps.children,r),t.child;case 12:return et(e,t,t.pendingProps.children,r),t.child;case 10:e:{if(i=t.type._context,a=t.pendingProps,l=t.memoizedProps,u=a.value,ge(Na,i._currentValue),i._currentValue=u,l!==null)if(Ft(l.value,u)){if(l.children===a.children&&!ct.current){t=pn(e,t,r);break e}}else for(l=t.child,l!==null&&(l.return=t);l!==null;){var d=l.dependencies;if(d!==null){u=l.child;for(var h=d.firstContext;h!==null;){if(h.context===i){if(l.tag===1){h=un(-1,r&-r),h.tag=2;var p=l.updateQueue;if(p!==null){p=p.shared;var b=p.pending;b===null?h.next=h:(h.next=b.next,b.next=h),p.pending=h}}l.lanes|=r,h=l.alternate,h!==null&&(h.lanes|=r),hu(l.return,r,t),d.lanes|=r;break}h=h.next}}else if(l.tag===10)u=l.type===t.type?null:l.child;else if(l.tag===18){if(u=l.return,u===null)throw Error(Z(341));u.lanes|=r,d=u.alternate,d!==null&&(d.lanes|=r),hu(u,r,t),u=l.sibling}else u=l.child;if(u!==null)u.return=l;else for(u=l;u!==null;){if(u===t){u=null;break}if(l=u.sibling,l!==null){l.return=u.return,u=l;break}u=u.return}l=u}et(e,t,a.children,r),t=t.child}return t;case 9:return a=t.type,i=t.pendingProps.children,Wr(t,r),a=Et(a),i=i(a),t.flags|=1,et(e,t,i,r),t.child;case 14:return i=t.type,a=Ot(i,t.pendingProps),a=Ot(i.type,a),$f(e,t,i,a,r);case 15:return Lm(e,t,t.type,t.pendingProps,r);case 17:return i=t.type,a=t.pendingProps,a=t.elementType===i?a:Ot(i,a),ua(e,t),t.tag=1,dt(i)?(e=!0,La(t)):e=!1,Wr(t,r),Pm(t,i,a),mu(t,i,a,r),_u(null,t,i,!0,e,r);case 19:return Om(e,t,r);case 22:return zm(e,t,r)}throw Error(Z(156,t.tag))};function $m(e,t){return kp(e,t)}function B0(e,t,r,i){this.tag=e,this.key=r,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.ref=null,this.pendingProps=t,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=i,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function Pt(e,t,r,i){return new B0(e,t,r,i)}function Nc(e){return e=e.prototype,!(!e||!e.isReactComponent)}function F0(e){if(typeof e=="function")return Nc(e)?1:0;if(e!=null){if(e=e.$$typeof,e===qu)return 11;if(e===Ju)return 14}return 2}function Rn(e,t){var r=e.alternate;return r===null?(r=Pt(e.tag,t,e.key,e.mode),r.elementType=e.elementType,r.type=e.type,r.stateNode=e.stateNode,r.alternate=e,e.alternate=r):(r.pendingProps=t,r.type=e.type,r.flags=0,r.subtreeFlags=0,r.deletions=null),r.flags=e.flags&14680064,r.childLanes=e.childLanes,r.lanes=e.lanes,r.child=e.child,r.memoizedProps=e.memoizedProps,r.memoizedState=e.memoizedState,r.updateQueue=e.updateQueue,t=e.dependencies,r.dependencies=t===null?null:{lanes:t.lanes,firstContext:t.firstContext},r.sibling=e.sibling,r.index=e.index,r.ref=e.ref,r}function fa(e,t,r,i,a,l){var u=2;if(i=e,typeof e=="function")Nc(e)&&(u=1);else if(typeof e=="string")u=5;else e:switch(e){case Tr:return rr(r.children,a,l,t);case $u:u=8,a|=8;break;case Bl:return e=Pt(12,r,t,a|2),e.elementType=Bl,e.lanes=l,e;case Fl:return e=Pt(13,r,t,a),e.elementType=Fl,e.lanes=l,e;case Zl:return e=Pt(19,r,t,a),e.elementType=Zl,e.lanes=l,e;case ap:return os(r,a,l,t);default:if(typeof e=="object"&&e!==null)switch(e.$$typeof){case ip:u=10;break e;case op:u=9;break e;case qu:u=11;break e;case Ju:u=14;break e;case xn:u=16,i=null;break e}throw Error(Z(130,e==null?e:typeof e,""))}return t=Pt(u,r,t,a),t.elementType=e,t.type=i,t.lanes=l,t}function rr(e,t,r,i){return e=Pt(7,e,i,t),e.lanes=r,e}function os(e,t,r,i){return e=Pt(22,e,i,t),e.elementType=ap,e.lanes=r,e.stateNode={isHidden:!1},e}function Cl(e,t,r){return e=Pt(6,e,null,t),e.lanes=r,e}function Pl(e,t,r){return t=Pt(4,e.children!==null?e.children:[],e.key,t),t.lanes=r,t.stateNode={containerInfo:e.containerInfo,pendingChildren:null,implementation:e.implementation},t}function Z0(e,t,r,i,a){this.tag=t,this.containerInfo=e,this.finishedWork=this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.pendingContext=this.context=null,this.callbackPriority=0,this.eventTimes=al(0),this.expirationTimes=al(-1),this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=al(0),this.identifierPrefix=i,this.onRecoverableError=a,this.mutableSourceEagerHydrationData=null}function Ac(e,t,r,i,a,l,u,d,h){return e=new Z0(e,t,r,d,h),t===1?(t=1,l===!0&&(t|=8)):t=0,l=Pt(3,null,null,t),e.current=l,l.stateNode=e,l.memoizedState={element:i,isDehydrated:r,cache:null,transitions:null,pendingSuspenseBoundaries:null},gc(l),e}function H0(e,t,r){var i=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:Pr,key:i==null?null:""+i,children:e,containerInfo:t,implementation:r}}function qm(e){if(!e)return jn;e=e._reactInternals;e:{if(fr(e)!==e||e.tag!==1)throw Error(Z(170));var t=e;do{switch(t.tag){case 3:t=t.stateNode.context;break e;case 1:if(dt(t.type)){t=t.stateNode.__reactInternalMemoizedMergedChildContext;break e}}t=t.return}while(t!==null);throw Error(Z(171))}if(e.tag===1){var r=e.type;if(dt(r))return qp(e,r,t)}return t}function Jm(e,t,r,i,a,l,u,d,h){return e=Ac(r,i,!0,e,a,l,u,d,h),e.context=qm(null),r=e.current,i=tt(),a=In(r),l=un(i,a),l.callback=t??null,An(r,l,a),e.current.lanes=a,co(e,a,i),ft(e,i),e}function as(e,t,r,i){var a=t.current,l=tt(),u=In(a);return r=qm(r),t.context===null?t.context=r:t.pendingContext=r,t=un(l,u),t.payload={element:e},i=i===void 0?null:i,i!==null&&(t.callback=i),e=An(a,t,u),e!==null&&(jt(e,a,u,l),aa(e,a,u)),u}function Ha(e){if(e=e.current,!e.child)return null;switch(e.child.tag){case 5:return e.child.stateNode;default:return e.child.stateNode}}function lh(e,t){if(e=e.memoizedState,e!==null&&e.dehydrated!==null){var r=e.retryLane;e.retryLane=r!==0&&r<t?r:t}}function Oc(e,t){lh(e,t),(e=e.alternate)&&lh(e,t)}function W0(){return null}var Xm=typeof reportError=="function"?reportError:function(e){console.error(e)};function Ic(e){this._internalRoot=e}ss.prototype.render=Ic.prototype.render=function(e){var t=this._internalRoot;if(t===null)throw Error(Z(409));as(e,t,null,null)};ss.prototype.unmount=Ic.prototype.unmount=function(){var e=this._internalRoot;if(e!==null){this._internalRoot=null;var t=e.containerInfo;cr(function(){as(null,e,null,null)}),t[fn]=null}};function ss(e){this._internalRoot=e}ss.prototype.unstable_scheduleHydration=function(e){if(e){var t=zp();e={blockedOn:null,target:e,priority:t};for(var r=0;r<Sn.length&&t!==0&&t<Sn[r].priority;r++);Sn.splice(r,0,e),r===0&&Np(e)}};function Rc(e){return!(!e||e.nodeType!==1&&e.nodeType!==9&&e.nodeType!==11)}function ls(e){return!(!e||e.nodeType!==1&&e.nodeType!==9&&e.nodeType!==11&&(e.nodeType!==8||e.nodeValue!==" react-mount-point-unstable "))}function uh(){}function U0(e,t,r,i,a){if(a){if(typeof i=="function"){var l=i;i=function(){var p=Ha(u);l.call(p)}}var u=Jm(t,i,e,0,null,!1,!1,"",uh);return e._reactRootContainer=u,e[fn]=u.current,Xi(e.nodeType===8?e.parentNode:e),cr(),u}for(;a=e.lastChild;)e.removeChild(a);if(typeof i=="function"){var d=i;i=function(){var p=Ha(h);d.call(p)}}var h=Ac(e,0,!1,null,null,!1,!1,"",uh);return e._reactRootContainer=h,e[fn]=h.current,Xi(e.nodeType===8?e.parentNode:e),cr(function(){as(t,h,r,i)}),h}function us(e,t,r,i,a){var l=r._reactRootContainer;if(l){var u=l;if(typeof a=="function"){var d=a;a=function(){var h=Ha(u);d.call(h)}}as(t,u,e,a)}else u=U0(r,t,e,a,i);return Ha(u)}Ep=function(e){switch(e.tag){case 3:var t=e.stateNode;if(t.current.memoizedState.isDehydrated){var r=Ni(t.pendingLanes);r!==0&&(tc(t,r|1),ft(t,Me()),!(ce&6)&&(qr=Me()+500,Hn()))}break;case 13:cr(function(){var i=hn(e,1);if(i!==null){var a=tt();jt(i,e,1,a)}}),Oc(e,1)}};nc=function(e){if(e.tag===13){var t=hn(e,134217728);if(t!==null){var r=tt();jt(t,e,134217728,r)}Oc(e,134217728)}};Lp=function(e){if(e.tag===13){var t=In(e),r=hn(e,t);if(r!==null){var i=tt();jt(r,e,t,i)}Oc(e,t)}};zp=function(){return pe};Mp=function(e,t){var r=pe;try{return pe=e,t()}finally{pe=r}};ql=function(e,t,r){switch(t){case"input":if(Ul(e,r),t=r.name,r.type==="radio"&&t!=null){for(r=e;r.parentNode;)r=r.parentNode;for(r=r.querySelectorAll("input[name="+JSON.stringify(""+t)+'][type="radio"]'),t=0;t<r.length;t++){var i=r[t];if(i!==e&&i.form===e.form){var a=Xa(i);if(!a)throw Error(Z(90));lp(i),Ul(i,a)}}}break;case"textarea":cp(e,r);break;case"select":t=r.value,t!=null&&Br(e,!!r.multiple,t,!1)}};vp=Lc;_p=cr;var V0={usingClientEntryPoint:!1,Events:[ho,Mr,Xa,mp,gp,Lc]},Ei={findFiberByHostInstance:Jn,bundleType:0,version:"18.3.1",rendererPackageName:"react-dom"},G0={bundleType:Ei.bundleType,version:Ei.version,rendererPackageName:Ei.rendererPackageName,rendererConfig:Ei.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setErrorHandler:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:mn.ReactCurrentDispatcher,findHostInstanceByFiber:function(e){return e=xp(e),e===null?null:e.stateNode},findFiberByHostInstance:Ei.findFiberByHostInstance||W0,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null,reconcilerVersion:"18.3.1-next-f1338f8080-20240426"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"){var qo=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!qo.isDisabled&&qo.supportsFiber)try{Qa=qo.inject(G0),$t=qo}catch{}}yt.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=V0;yt.createPortal=function(e,t){var r=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!Rc(t))throw Error(Z(200));return H0(e,t,null,r)};yt.createRoot=function(e,t){if(!Rc(e))throw Error(Z(299));var r=!1,i="",a=Xm;return t!=null&&(t.unstable_strictMode===!0&&(r=!0),t.identifierPrefix!==void 0&&(i=t.identifierPrefix),t.onRecoverableError!==void 0&&(a=t.onRecoverableError)),t=Ac(e,1,!1,null,null,r,!1,i,a),e[fn]=t.current,Xi(e.nodeType===8?e.parentNode:e),new Ic(t)};yt.findDOMNode=function(e){if(e==null)return null;if(e.nodeType===1)return e;var t=e._reactInternals;if(t===void 0)throw typeof e.render=="function"?Error(Z(188)):(e=Object.keys(e).join(","),Error(Z(268,e)));return e=xp(t),e=e===null?null:e.stateNode,e};yt.flushSync=function(e){return cr(e)};yt.hydrate=function(e,t,r){if(!ls(t))throw Error(Z(200));return us(null,e,t,!0,r)};yt.hydrateRoot=function(e,t,r){if(!Rc(e))throw Error(Z(405));var i=r!=null&&r.hydratedSources||null,a=!1,l="",u=Xm;if(r!=null&&(r.unstable_strictMode===!0&&(a=!0),r.identifierPrefix!==void 0&&(l=r.identifierPrefix),r.onRecoverableError!==void 0&&(u=r.onRecoverableError)),t=Jm(t,null,e,1,r??null,a,!1,l,u),e[fn]=t.current,Xi(e),i)for(e=0;e<i.length;e++)r=i[e],a=r._getVersion,a=a(r._source),t.mutableSourceEagerHydrationData==null?t.mutableSourceEagerHydrationData=[r,a]:t.mutableSourceEagerHydrationData.push(r,a);return new ss(t)};yt.render=function(e,t,r){if(!ls(t))throw Error(Z(200));return us(null,e,t,!1,r)};yt.unmountComponentAtNode=function(e){if(!ls(e))throw Error(Z(40));return e._reactRootContainer?(cr(function(){us(null,null,e,!1,function(){e._reactRootContainer=null,e[fn]=null})}),!0):!1};yt.unstable_batchedUpdates=Lc;yt.unstable_renderSubtreeIntoContainer=function(e,t,r,i){if(!ls(r))throw Error(Z(200));if(e==null||e._reactInternals===void 0)throw Error(Z(38));return us(e,t,r,!1,i)};yt.version="18.3.1-next-f1338f8080-20240426";function eg(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(eg)}catch(e){console.error(e)}}eg(),ep.exports=yt;var Dc=ep.exports,tg,ch=Dc;tg=ch.createRoot,ch.hydrateRoot;function ng(e,t){const r=P.useRef(t);P.useEffect(function(){t!==r.current&&e.attributionControl!=null&&(r.current!=null&&e.attributionControl.removeAttribution(r.current),t!=null&&e.attributionControl.addAttribution(t)),r.current=t},[e,t])}function K0(e,t,r){t.center!==r.center&&e.setLatLng(t.center),t.radius!=null&&t.radius!==r.radius&&e.setRadius(t.radius)}const Y0=1;function Q0(e){return Object.freeze({__version:Y0,map:e})}function cs(e,t){return Object.freeze({...e,...t})}const rg=P.createContext(null),ig=rg.Provider;function ds(){const e=P.useContext(rg);if(e==null)throw new Error("No context provided: useLeafletContext() can only be used in a descendant of <MapContainer>");return e}function og(e){function t(r,i){const{instance:a,context:l}=e(r).current;return P.useImperativeHandle(i,()=>a),r.children==null?null:cn.createElement(ig,{value:l},r.children)}return P.forwardRef(t)}function $0(e){function t(r,i){const[a,l]=P.useState(!1),{instance:u}=e(r,l).current;P.useImperativeHandle(i,()=>u),P.useEffect(function(){a&&u.update()},[u,a,r.children]);const d=u._contentNode;return d?Dc.createPortal(r.children,d):null}return P.forwardRef(t)}function q0(e){function t(r,i){const{instance:a}=e(r).current;return P.useImperativeHandle(i,()=>a),null}return P.forwardRef(t)}function jc(e,t){const r=P.useRef();P.useEffect(function(){return t!=null&&e.instance.on(t),r.current=t,function(){r.current!=null&&e.instance.off(r.current),r.current=null}},[e,t])}function fs(e,t){const r=e.pane??t.pane;return r?{...e,pane:r}:e}function J0(e,t){return function(i,a){const l=ds(),u=e(fs(i,l),l);return ng(l.map,i.attribution),jc(u.current,i.eventHandlers),t(u.current,l,i,a),u}}var zu={exports:{}};/* @preserve
 * Leaflet 1.9.4, a JS library for interactive maps. https://leafletjs.com
 * (c) 2010-2023 Vladimir Agafonkin, (c) 2010-2011 CloudMade
 */(function(e,t){(function(r,i){i(t)})(x_,function(r){var i="1.9.4";function a(n){var o,s,c,f;for(s=1,c=arguments.length;s<c;s++){f=arguments[s];for(o in f)n[o]=f[o]}return n}var l=Object.create||function(){function n(){}return function(o){return n.prototype=o,new n}}();function u(n,o){var s=Array.prototype.slice;if(n.bind)return n.bind.apply(n,s.call(arguments,1));var c=s.call(arguments,2);return function(){return n.apply(o,c.length?c.concat(s.call(arguments)):arguments)}}var d=0;function h(n){return"_leaflet_id"in n||(n._leaflet_id=++d),n._leaflet_id}function p(n,o,s){var c,f,m,S;return S=function(){c=!1,f&&(m.apply(s,f),f=!1)},m=function(){c?f=arguments:(n.apply(s,arguments),setTimeout(S,o),c=!0)},m}function b(n,o,s){var c=o[1],f=o[0],m=c-f;return n===c&&s?n:((n-f)%m+m)%m+f}function _(){return!1}function y(n,o){if(o===!1)return n;var s=Math.pow(10,o===void 0?6:o);return Math.round(n*s)/s}function C(n){return n.trim?n.trim():n.replace(/^\s+|\s+$/g,"")}function T(n){return C(n).split(/\s+/)}function k(n,o){Object.prototype.hasOwnProperty.call(n,"options")||(n.options=n.options?l(n.options):{});for(var s in o)n.options[s]=o[s];return n.options}function D(n,o,s){var c=[];for(var f in n)c.push(encodeURIComponent(s?f.toUpperCase():f)+"="+encodeURIComponent(n[f]));return(!o||o.indexOf("?")===-1?"?":"&")+c.join("&")}var x=/\{ *([\w_ -]+) *\}/g;function g(n,o){return n.replace(x,function(s,c){var f=o[c];if(f===void 0)throw new Error("No value provided for variable "+s);return typeof f=="function"&&(f=f(o)),f})}var v=Array.isArray||function(n){return Object.prototype.toString.call(n)==="[object Array]"};function E(n,o){for(var s=0;s<n.length;s++)if(n[s]===o)return s;return-1}var N="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";function R(n){return window["webkit"+n]||window["moz"+n]||window["ms"+n]}var z=0;function O(n){var o=+new Date,s=Math.max(0,16-(o-z));return z=o+s,window.setTimeout(n,s)}var B=window.requestAnimationFrame||R("RequestAnimationFrame")||O,H=window.cancelAnimationFrame||R("CancelAnimationFrame")||R("CancelRequestAnimationFrame")||function(n){window.clearTimeout(n)};function V(n,o,s){if(s&&B===O)n.call(o);else return B.call(window,u(n,o))}function oe(n){n&&H.call(window,n)}var Ne={__proto__:null,extend:a,create:l,bind:u,get lastId(){return d},stamp:h,throttle:p,wrapNum:b,falseFn:_,formatNum:y,trim:C,splitWords:T,setOptions:k,getParamString:D,template:g,isArray:v,indexOf:E,emptyImageUrl:N,requestFn:B,cancelFn:H,requestAnimFrame:V,cancelAnimFrame:oe};function J(){}J.extend=function(n){var o=function(){k(this),this.initialize&&this.initialize.apply(this,arguments),this.callInitHooks()},s=o.__super__=this.prototype,c=l(s);c.constructor=o,o.prototype=c;for(var f in this)Object.prototype.hasOwnProperty.call(this,f)&&f!=="prototype"&&f!=="__super__"&&(o[f]=this[f]);return n.statics&&a(o,n.statics),n.includes&&(le(n.includes),a.apply(null,[c].concat(n.includes))),a(c,n),delete c.statics,delete c.includes,c.options&&(c.options=s.options?l(s.options):{},a(c.options,n.options)),c._initHooks=[],c.callInitHooks=function(){if(!this._initHooksCalled){s.callInitHooks&&s.callInitHooks.call(this),this._initHooksCalled=!0;for(var m=0,S=c._initHooks.length;m<S;m++)c._initHooks[m].call(this)}},o},J.include=function(n){var o=this.prototype.options;return a(this.prototype,n),n.options&&(this.prototype.options=o,this.mergeOptions(n.options)),this},J.mergeOptions=function(n){return a(this.prototype.options,n),this},J.addInitHook=function(n){var o=Array.prototype.slice.call(arguments,1),s=typeof n=="function"?n:function(){this[n].apply(this,o)};return this.prototype._initHooks=this.prototype._initHooks||[],this.prototype._initHooks.push(s),this};function le(n){if(!(typeof L>"u"||!L||!L.Mixin)){n=v(n)?n:[n];for(var o=0;o<n.length;o++)n[o]===L.Mixin.Events&&console.warn("Deprecated include of L.Mixin.Events: this property will be removed in future releases, please inherit from L.Evented instead.",new Error().stack)}}var U={on:function(n,o,s){if(typeof n=="object")for(var c in n)this._on(c,n[c],o);else{n=T(n);for(var f=0,m=n.length;f<m;f++)this._on(n[f],o,s)}return this},off:function(n,o,s){if(!arguments.length)delete this._events;else if(typeof n=="object")for(var c in n)this._off(c,n[c],o);else{n=T(n);for(var f=arguments.length===1,m=0,S=n.length;m<S;m++)f?this._off(n[m]):this._off(n[m],o,s)}return this},_on:function(n,o,s,c){if(typeof o!="function"){console.warn("wrong listener type: "+typeof o);return}if(this._listens(n,o,s)===!1){s===this&&(s=void 0);var f={fn:o,ctx:s};c&&(f.once=!0),this._events=this._events||{},this._events[n]=this._events[n]||[],this._events[n].push(f)}},_off:function(n,o,s){var c,f,m;if(this._events&&(c=this._events[n],!!c)){if(arguments.length===1){if(this._firingCount)for(f=0,m=c.length;f<m;f++)c[f].fn=_;delete this._events[n];return}if(typeof o!="function"){console.warn("wrong listener type: "+typeof o);return}var S=this._listens(n,o,s);if(S!==!1){var M=c[S];this._firingCount&&(M.fn=_,this._events[n]=c=c.slice()),c.splice(S,1)}}},fire:function(n,o,s){if(!this.listens(n,s))return this;var c=a({},o,{type:n,target:this,sourceTarget:o&&o.sourceTarget||this});if(this._events){var f=this._events[n];if(f){this._firingCount=this._firingCount+1||1;for(var m=0,S=f.length;m<S;m++){var M=f[m],A=M.fn;M.once&&this.off(n,A,M.ctx),A.call(M.ctx||this,c)}this._firingCount--}}return s&&this._propagateEvent(c),this},listens:function(n,o,s,c){typeof n!="string"&&console.warn('"string" type argument expected');var f=o;typeof o!="function"&&(c=!!o,f=void 0,s=void 0);var m=this._events&&this._events[n];if(m&&m.length&&this._listens(n,f,s)!==!1)return!0;if(c){for(var S in this._eventParents)if(this._eventParents[S].listens(n,o,s,c))return!0}return!1},_listens:function(n,o,s){if(!this._events)return!1;var c=this._events[n]||[];if(!o)return!!c.length;s===this&&(s=void 0);for(var f=0,m=c.length;f<m;f++)if(c[f].fn===o&&c[f].ctx===s)return f;return!1},once:function(n,o,s){if(typeof n=="object")for(var c in n)this._on(c,n[c],o,!0);else{n=T(n);for(var f=0,m=n.length;f<m;f++)this._on(n[f],o,s,!0)}return this},addEventParent:function(n){return this._eventParents=this._eventParents||{},this._eventParents[h(n)]=n,this},removeEventParent:function(n){return this._eventParents&&delete this._eventParents[h(n)],this},_propagateEvent:function(n){for(var o in this._eventParents)this._eventParents[o].fire(n.type,a({layer:n.target,propagatedFrom:n.target},n),!0)}};U.addEventListener=U.on,U.removeEventListener=U.clearAllEventListeners=U.off,U.addOneTimeEventListener=U.once,U.fireEvent=U.fire,U.hasEventListeners=U.listens;var X=J.extend(U);function I(n,o,s){this.x=s?Math.round(n):n,this.y=s?Math.round(o):o}var G=Math.trunc||function(n){return n>0?Math.floor(n):Math.ceil(n)};I.prototype={clone:function(){return new I(this.x,this.y)},add:function(n){return this.clone()._add(j(n))},_add:function(n){return this.x+=n.x,this.y+=n.y,this},subtract:function(n){return this.clone()._subtract(j(n))},_subtract:function(n){return this.x-=n.x,this.y-=n.y,this},divideBy:function(n){return this.clone()._divideBy(n)},_divideBy:function(n){return this.x/=n,this.y/=n,this},multiplyBy:function(n){return this.clone()._multiplyBy(n)},_multiplyBy:function(n){return this.x*=n,this.y*=n,this},scaleBy:function(n){return new I(this.x*n.x,this.y*n.y)},unscaleBy:function(n){return new I(this.x/n.x,this.y/n.y)},round:function(){return this.clone()._round()},_round:function(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this},floor:function(){return this.clone()._floor()},_floor:function(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this},ceil:function(){return this.clone()._ceil()},_ceil:function(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this},trunc:function(){return this.clone()._trunc()},_trunc:function(){return this.x=G(this.x),this.y=G(this.y),this},distanceTo:function(n){n=j(n);var o=n.x-this.x,s=n.y-this.y;return Math.sqrt(o*o+s*s)},equals:function(n){return n=j(n),n.x===this.x&&n.y===this.y},contains:function(n){return n=j(n),Math.abs(n.x)<=Math.abs(this.x)&&Math.abs(n.y)<=Math.abs(this.y)},toString:function(){return"Point("+y(this.x)+", "+y(this.y)+")"}};function j(n,o,s){return n instanceof I?n:v(n)?new I(n[0],n[1]):n==null?n:typeof n=="object"&&"x"in n&&"y"in n?new I(n.x,n.y):new I(n,o,s)}function Y(n,o){if(n)for(var s=o?[n,o]:n,c=0,f=s.length;c<f;c++)this.extend(s[c])}Y.prototype={extend:function(n){var o,s;if(!n)return this;if(n instanceof I||typeof n[0]=="number"||"x"in n)o=s=j(n);else if(n=ee(n),o=n.min,s=n.max,!o||!s)return this;return!this.min&&!this.max?(this.min=o.clone(),this.max=s.clone()):(this.min.x=Math.min(o.x,this.min.x),this.max.x=Math.max(s.x,this.max.x),this.min.y=Math.min(o.y,this.min.y),this.max.y=Math.max(s.y,this.max.y)),this},getCenter:function(n){return j((this.min.x+this.max.x)/2,(this.min.y+this.max.y)/2,n)},getBottomLeft:function(){return j(this.min.x,this.max.y)},getTopRight:function(){return j(this.max.x,this.min.y)},getTopLeft:function(){return this.min},getBottomRight:function(){return this.max},getSize:function(){return this.max.subtract(this.min)},contains:function(n){var o,s;return typeof n[0]=="number"||n instanceof I?n=j(n):n=ee(n),n instanceof Y?(o=n.min,s=n.max):o=s=n,o.x>=this.min.x&&s.x<=this.max.x&&o.y>=this.min.y&&s.y<=this.max.y},intersects:function(n){n=ee(n);var o=this.min,s=this.max,c=n.min,f=n.max,m=f.x>=o.x&&c.x<=s.x,S=f.y>=o.y&&c.y<=s.y;return m&&S},overlaps:function(n){n=ee(n);var o=this.min,s=this.max,c=n.min,f=n.max,m=f.x>o.x&&c.x<s.x,S=f.y>o.y&&c.y<s.y;return m&&S},isValid:function(){return!!(this.min&&this.max)},pad:function(n){var o=this.min,s=this.max,c=Math.abs(o.x-s.x)*n,f=Math.abs(o.y-s.y)*n;return ee(j(o.x-c,o.y-f),j(s.x+c,s.y+f))},equals:function(n){return n?(n=ee(n),this.min.equals(n.getTopLeft())&&this.max.equals(n.getBottomRight())):!1}};function ee(n,o){return!n||n instanceof Y?n:new Y(n,o)}function Te(n,o){if(n)for(var s=o?[n,o]:n,c=0,f=s.length;c<f;c++)this.extend(s[c])}Te.prototype={extend:function(n){var o=this._southWest,s=this._northEast,c,f;if(n instanceof ae)c=n,f=n;else if(n instanceof Te){if(c=n._southWest,f=n._northEast,!c||!f)return this}else return n?this.extend(q(n)||de(n)):this;return!o&&!s?(this._southWest=new ae(c.lat,c.lng),this._northEast=new ae(f.lat,f.lng)):(o.lat=Math.min(c.lat,o.lat),o.lng=Math.min(c.lng,o.lng),s.lat=Math.max(f.lat,s.lat),s.lng=Math.max(f.lng,s.lng)),this},pad:function(n){var o=this._southWest,s=this._northEast,c=Math.abs(o.lat-s.lat)*n,f=Math.abs(o.lng-s.lng)*n;return new Te(new ae(o.lat-c,o.lng-f),new ae(s.lat+c,s.lng+f))},getCenter:function(){return new ae((this._southWest.lat+this._northEast.lat)/2,(this._southWest.lng+this._northEast.lng)/2)},getSouthWest:function(){return this._southWest},getNorthEast:function(){return this._northEast},getNorthWest:function(){return new ae(this.getNorth(),this.getWest())},getSouthEast:function(){return new ae(this.getSouth(),this.getEast())},getWest:function(){return this._southWest.lng},getSouth:function(){return this._southWest.lat},getEast:function(){return this._northEast.lng},getNorth:function(){return this._northEast.lat},contains:function(n){typeof n[0]=="number"||n instanceof ae||"lat"in n?n=q(n):n=de(n);var o=this._southWest,s=this._northEast,c,f;return n instanceof Te?(c=n.getSouthWest(),f=n.getNorthEast()):c=f=n,c.lat>=o.lat&&f.lat<=s.lat&&c.lng>=o.lng&&f.lng<=s.lng},intersects:function(n){n=de(n);var o=this._southWest,s=this._northEast,c=n.getSouthWest(),f=n.getNorthEast(),m=f.lat>=o.lat&&c.lat<=s.lat,S=f.lng>=o.lng&&c.lng<=s.lng;return m&&S},overlaps:function(n){n=de(n);var o=this._southWest,s=this._northEast,c=n.getSouthWest(),f=n.getNorthEast(),m=f.lat>o.lat&&c.lat<s.lat,S=f.lng>o.lng&&c.lng<s.lng;return m&&S},toBBoxString:function(){return[this.getWest(),this.getSouth(),this.getEast(),this.getNorth()].join(",")},equals:function(n,o){return n?(n=de(n),this._southWest.equals(n.getSouthWest(),o)&&this._northEast.equals(n.getNorthEast(),o)):!1},isValid:function(){return!!(this._southWest&&this._northEast)}};function de(n,o){return n instanceof Te?n:new Te(n,o)}function ae(n,o,s){if(isNaN(n)||isNaN(o))throw new Error("Invalid LatLng object: ("+n+", "+o+")");this.lat=+n,this.lng=+o,s!==void 0&&(this.alt=+s)}ae.prototype={equals:function(n,o){if(!n)return!1;n=q(n);var s=Math.max(Math.abs(this.lat-n.lat),Math.abs(this.lng-n.lng));return s<=(o===void 0?1e-9:o)},toString:function(n){return"LatLng("+y(this.lat,n)+", "+y(this.lng,n)+")"},distanceTo:function(n){return it.distance(this,q(n))},wrap:function(){return it.wrapLatLng(this)},toBounds:function(n){var o=180*n/40075017,s=o/Math.cos(Math.PI/180*this.lat);return de([this.lat-o,this.lng-s],[this.lat+o,this.lng+s])},clone:function(){return new ae(this.lat,this.lng,this.alt)}};function q(n,o,s){return n instanceof ae?n:v(n)&&typeof n[0]!="object"?n.length===3?new ae(n[0],n[1],n[2]):n.length===2?new ae(n[0],n[1]):null:n==null?n:typeof n=="object"&&"lat"in n?new ae(n.lat,"lng"in n?n.lng:n.lon,n.alt):o===void 0?null:new ae(n,o,s)}var De={latLngToPoint:function(n,o){var s=this.projection.project(n),c=this.scale(o);return this.transformation._transform(s,c)},pointToLatLng:function(n,o){var s=this.scale(o),c=this.transformation.untransform(n,s);return this.projection.unproject(c)},project:function(n){return this.projection.project(n)},unproject:function(n){return this.projection.unproject(n)},scale:function(n){return 256*Math.pow(2,n)},zoom:function(n){return Math.log(n/256)/Math.LN2},getProjectedBounds:function(n){if(this.infinite)return null;var o=this.projection.bounds,s=this.scale(n),c=this.transformation.transform(o.min,s),f=this.transformation.transform(o.max,s);return new Y(c,f)},infinite:!1,wrapLatLng:function(n){var o=this.wrapLng?b(n.lng,this.wrapLng,!0):n.lng,s=this.wrapLat?b(n.lat,this.wrapLat,!0):n.lat,c=n.alt;return new ae(s,o,c)},wrapLatLngBounds:function(n){var o=n.getCenter(),s=this.wrapLatLng(o),c=o.lat-s.lat,f=o.lng-s.lng;if(c===0&&f===0)return n;var m=n.getSouthWest(),S=n.getNorthEast(),M=new ae(m.lat-c,m.lng-f),A=new ae(S.lat-c,S.lng-f);return new Te(M,A)}},it=a({},De,{wrapLng:[-180,180],R:6371e3,distance:function(n,o){var s=Math.PI/180,c=n.lat*s,f=o.lat*s,m=Math.sin((o.lat-n.lat)*s/2),S=Math.sin((o.lng-n.lng)*s/2),M=m*m+Math.cos(c)*Math.cos(f)*S*S,A=2*Math.atan2(Math.sqrt(M),Math.sqrt(1-M));return this.R*A}}),Zt=6378137,Un={R:Zt,MAX_LATITUDE:85.0511287798,project:function(n){var o=Math.PI/180,s=this.MAX_LATITUDE,c=Math.max(Math.min(s,n.lat),-s),f=Math.sin(c*o);return new I(this.R*n.lng*o,this.R*Math.log((1+f)/(1-f))/2)},unproject:function(n){var o=180/Math.PI;return new ae((2*Math.atan(Math.exp(n.y/this.R))-Math.PI/2)*o,n.x*o/this.R)},bounds:function(){var n=Zt*Math.PI;return new Y([-n,-n],[n,n])}()};function gn(n,o,s,c){if(v(n)){this._a=n[0],this._b=n[1],this._c=n[2],this._d=n[3];return}this._a=n,this._b=o,this._c=s,this._d=c}gn.prototype={transform:function(n,o){return this._transform(n.clone(),o)},_transform:function(n,o){return o=o||1,n.x=o*(this._a*n.x+this._b),n.y=o*(this._c*n.y+this._d),n},untransform:function(n,o){return o=o||1,new I((n.x/o-this._b)/this._a,(n.y/o-this._d)/this._c)}};function ot(n,o,s,c){return new gn(n,o,s,c)}var ks=a({},it,{code:"EPSG:3857",projection:Un,transformation:function(){var n=.5/(Math.PI*Un.R);return ot(n,.5,-n,.5)}()}),qg=a({},ks,{code:"EPSG:900913"});function Gc(n){return document.createElementNS("http://www.w3.org/2000/svg",n)}function Kc(n,o){var s="",c,f,m,S,M,A;for(c=0,m=n.length;c<m;c++){for(M=n[c],f=0,S=M.length;f<S;f++)A=M[f],s+=(f?"L":"M")+A.x+" "+A.y;s+=o?Q.svg?"z":"x":""}return s||"M0 0"}var Ss=document.documentElement.style,go="ActiveXObject"in window,Jg=go&&!document.addEventListener,Yc="msLaunchUri"in navigator&&!("documentMode"in document),Cs=Ht("webkit"),Qc=Ht("android"),$c=Ht("android 2")||Ht("android 3"),Xg=parseInt(/WebKit\/([0-9]+)|$/.exec(navigator.userAgent)[1],10),ev=Qc&&Ht("Google")&&Xg<537&&!("AudioNode"in window),Ps=!!window.opera,qc=!Yc&&Ht("chrome"),Jc=Ht("gecko")&&!Cs&&!Ps&&!go,tv=!qc&&Ht("safari"),Xc=Ht("phantom"),ed="OTransition"in Ss,nv=navigator.platform.indexOf("Win")===0,td=go&&"transition"in Ss,Ts="WebKitCSSMatrix"in window&&"m11"in new window.WebKitCSSMatrix&&!$c,nd="MozPerspective"in Ss,rv=!window.L_DISABLE_3D&&(td||Ts||nd)&&!ed&&!Xc,li=typeof orientation<"u"||Ht("mobile"),iv=li&&Cs,ov=li&&Ts,rd=!window.PointerEvent&&window.MSPointerEvent,id=!!(window.PointerEvent||rd),od="ontouchstart"in window||!!window.TouchEvent,av=!window.L_NO_TOUCH&&(od||id),sv=li&&Ps,lv=li&&Jc,uv=(window.devicePixelRatio||window.screen.deviceXDPI/window.screen.logicalXDPI)>1,cv=function(){var n=!1;try{var o=Object.defineProperty({},"passive",{get:function(){n=!0}});window.addEventListener("testPassiveEventSupport",_,o),window.removeEventListener("testPassiveEventSupport",_,o)}catch{}return n}(),dv=function(){return!!document.createElement("canvas").getContext}(),Es=!!(document.createElementNS&&Gc("svg").createSVGRect),fv=!!Es&&function(){var n=document.createElement("div");return n.innerHTML="<svg/>",(n.firstChild&&n.firstChild.namespaceURI)==="http://www.w3.org/2000/svg"}(),hv=!Es&&function(){try{var n=document.createElement("div");n.innerHTML='<v:shape adj="1"/>';var o=n.firstChild;return o.style.behavior="url(#default#VML)",o&&typeof o.adj=="object"}catch{return!1}}(),pv=navigator.platform.indexOf("Mac")===0,mv=navigator.platform.indexOf("Linux")===0;function Ht(n){return navigator.userAgent.toLowerCase().indexOf(n)>=0}var Q={ie:go,ielt9:Jg,edge:Yc,webkit:Cs,android:Qc,android23:$c,androidStock:ev,opera:Ps,chrome:qc,gecko:Jc,safari:tv,phantom:Xc,opera12:ed,win:nv,ie3d:td,webkit3d:Ts,gecko3d:nd,any3d:rv,mobile:li,mobileWebkit:iv,mobileWebkit3d:ov,msPointer:rd,pointer:id,touch:av,touchNative:od,mobileOpera:sv,mobileGecko:lv,retina:uv,passiveEvents:cv,canvas:dv,svg:Es,vml:hv,inlineSvg:fv,mac:pv,linux:mv},ad=Q.msPointer?"MSPointerDown":"pointerdown",sd=Q.msPointer?"MSPointerMove":"pointermove",ld=Q.msPointer?"MSPointerUp":"pointerup",ud=Q.msPointer?"MSPointerCancel":"pointercancel",Ls={touchstart:ad,touchmove:sd,touchend:ld,touchcancel:ud},cd={touchstart:xv,touchmove:vo,touchend:vo,touchcancel:vo},hr={},dd=!1;function gv(n,o,s){return o==="touchstart"&&bv(),cd[o]?(s=cd[o].bind(this,s),n.addEventListener(Ls[o],s,!1),s):(console.warn("wrong event specified:",o),_)}function vv(n,o,s){if(!Ls[o]){console.warn("wrong event specified:",o);return}n.removeEventListener(Ls[o],s,!1)}function _v(n){hr[n.pointerId]=n}function yv(n){hr[n.pointerId]&&(hr[n.pointerId]=n)}function fd(n){delete hr[n.pointerId]}function bv(){dd||(document.addEventListener(ad,_v,!0),document.addEventListener(sd,yv,!0),document.addEventListener(ld,fd,!0),document.addEventListener(ud,fd,!0),dd=!0)}function vo(n,o){if(o.pointerType!==(o.MSPOINTER_TYPE_MOUSE||"mouse")){o.touches=[];for(var s in hr)o.touches.push(hr[s]);o.changedTouches=[o],n(o)}}function xv(n,o){o.MSPOINTER_TYPE_TOUCH&&o.pointerType===o.MSPOINTER_TYPE_TOUCH&&Ue(o),vo(n,o)}function wv(n){var o={},s,c;for(c in n)s=n[c],o[c]=s&&s.bind?s.bind(n):s;return n=o,o.type="dblclick",o.detail=2,o.isTrusted=!1,o._simulated=!0,o}var kv=200;function Sv(n,o){n.addEventListener("dblclick",o);var s=0,c;function f(m){if(m.detail!==1){c=m.detail;return}if(!(m.pointerType==="mouse"||m.sourceCapabilities&&!m.sourceCapabilities.firesTouchEvents)){var S=vd(m);if(!(S.some(function(A){return A instanceof HTMLLabelElement&&A.attributes.for})&&!S.some(function(A){return A instanceof HTMLInputElement||A instanceof HTMLSelectElement}))){var M=Date.now();M-s<=kv?(c++,c===2&&o(wv(m))):c=1,s=M}}}return n.addEventListener("click",f),{dblclick:o,simDblclick:f}}function Cv(n,o){n.removeEventListener("dblclick",o.dblclick),n.removeEventListener("click",o.simDblclick)}var zs=bo(["transform","webkitTransform","OTransform","MozTransform","msTransform"]),ui=bo(["webkitTransition","transition","OTransition","MozTransition","msTransition"]),hd=ui==="webkitTransition"||ui==="OTransition"?ui+"End":"transitionend";function pd(n){return typeof n=="string"?document.getElementById(n):n}function ci(n,o){var s=n.style[o]||n.currentStyle&&n.currentStyle[o];if((!s||s==="auto")&&document.defaultView){var c=document.defaultView.getComputedStyle(n,null);s=c?c[o]:null}return s==="auto"?null:s}function fe(n,o,s){var c=document.createElement(n);return c.className=o||"",s&&s.appendChild(c),c}function ke(n){var o=n.parentNode;o&&o.removeChild(n)}function _o(n){for(;n.firstChild;)n.removeChild(n.firstChild)}function pr(n){var o=n.parentNode;o&&o.lastChild!==n&&o.appendChild(n)}function mr(n){var o=n.parentNode;o&&o.firstChild!==n&&o.insertBefore(n,o.firstChild)}function Ms(n,o){if(n.classList!==void 0)return n.classList.contains(o);var s=yo(n);return s.length>0&&new RegExp("(^|\\s)"+o+"(\\s|$)").test(s)}function ne(n,o){if(n.classList!==void 0)for(var s=T(o),c=0,f=s.length;c<f;c++)n.classList.add(s[c]);else if(!Ms(n,o)){var m=yo(n);Ns(n,(m?m+" ":"")+o)}}function Le(n,o){n.classList!==void 0?n.classList.remove(o):Ns(n,C((" "+yo(n)+" ").replace(" "+o+" "," ")))}function Ns(n,o){n.className.baseVal===void 0?n.className=o:n.className.baseVal=o}function yo(n){return n.correspondingElement&&(n=n.correspondingElement),n.className.baseVal===void 0?n.className:n.className.baseVal}function xt(n,o){"opacity"in n.style?n.style.opacity=o:"filter"in n.style&&Pv(n,o)}function Pv(n,o){var s=!1,c="DXImageTransform.Microsoft.Alpha";try{s=n.filters.item(c)}catch{if(o===1)return}o=Math.round(o*100),s?(s.Enabled=o!==100,s.Opacity=o):n.style.filter+=" progid:"+c+"(opacity="+o+")"}function bo(n){for(var o=document.documentElement.style,s=0;s<n.length;s++)if(n[s]in o)return n[s];return!1}function Vn(n,o,s){var c=o||new I(0,0);n.style[zs]=(Q.ie3d?"translate("+c.x+"px,"+c.y+"px)":"translate3d("+c.x+"px,"+c.y+"px,0)")+(s?" scale("+s+")":"")}function Ae(n,o){n._leaflet_pos=o,Q.any3d?Vn(n,o):(n.style.left=o.x+"px",n.style.top=o.y+"px")}function Gn(n){return n._leaflet_pos||new I(0,0)}var di,fi,As;if("onselectstart"in document)di=function(){te(window,"selectstart",Ue)},fi=function(){me(window,"selectstart",Ue)};else{var hi=bo(["userSelect","WebkitUserSelect","OUserSelect","MozUserSelect","msUserSelect"]);di=function(){if(hi){var n=document.documentElement.style;As=n[hi],n[hi]="none"}},fi=function(){hi&&(document.documentElement.style[hi]=As,As=void 0)}}function Os(){te(window,"dragstart",Ue)}function Is(){me(window,"dragstart",Ue)}var xo,Rs;function Ds(n){for(;n.tabIndex===-1;)n=n.parentNode;n.style&&(wo(),xo=n,Rs=n.style.outlineStyle,n.style.outlineStyle="none",te(window,"keydown",wo))}function wo(){xo&&(xo.style.outlineStyle=Rs,xo=void 0,Rs=void 0,me(window,"keydown",wo))}function md(n){do n=n.parentNode;while((!n.offsetWidth||!n.offsetHeight)&&n!==document.body);return n}function js(n){var o=n.getBoundingClientRect();return{x:o.width/n.offsetWidth||1,y:o.height/n.offsetHeight||1,boundingClientRect:o}}var Tv={__proto__:null,TRANSFORM:zs,TRANSITION:ui,TRANSITION_END:hd,get:pd,getStyle:ci,create:fe,remove:ke,empty:_o,toFront:pr,toBack:mr,hasClass:Ms,addClass:ne,removeClass:Le,setClass:Ns,getClass:yo,setOpacity:xt,testProp:bo,setTransform:Vn,setPosition:Ae,getPosition:Gn,get disableTextSelection(){return di},get enableTextSelection(){return fi},disableImageDrag:Os,enableImageDrag:Is,preventOutline:Ds,restoreOutline:wo,getSizedParentNode:md,getScale:js};function te(n,o,s,c){if(o&&typeof o=="object")for(var f in o)Fs(n,f,o[f],s);else{o=T(o);for(var m=0,S=o.length;m<S;m++)Fs(n,o[m],s,c)}return this}var Wt="_leaflet_events";function me(n,o,s,c){if(arguments.length===1)gd(n),delete n[Wt];else if(o&&typeof o=="object")for(var f in o)Zs(n,f,o[f],s);else if(o=T(o),arguments.length===2)gd(n,function(M){return E(o,M)!==-1});else for(var m=0,S=o.length;m<S;m++)Zs(n,o[m],s,c);return this}function gd(n,o){for(var s in n[Wt]){var c=s.split(/\d/)[0];(!o||o(c))&&Zs(n,c,null,null,s)}}var Bs={mouseenter:"mouseover",mouseleave:"mouseout",wheel:!("onwheel"in window)&&"mousewheel"};function Fs(n,o,s,c){var f=o+h(s)+(c?"_"+h(c):"");if(n[Wt]&&n[Wt][f])return this;var m=function(M){return s.call(c||n,M||window.event)},S=m;!Q.touchNative&&Q.pointer&&o.indexOf("touch")===0?m=gv(n,o,m):Q.touch&&o==="dblclick"?m=Sv(n,m):"addEventListener"in n?o==="touchstart"||o==="touchmove"||o==="wheel"||o==="mousewheel"?n.addEventListener(Bs[o]||o,m,Q.passiveEvents?{passive:!1}:!1):o==="mouseenter"||o==="mouseleave"?(m=function(M){M=M||window.event,Ws(n,M)&&S(M)},n.addEventListener(Bs[o],m,!1)):n.addEventListener(o,S,!1):n.attachEvent("on"+o,m),n[Wt]=n[Wt]||{},n[Wt][f]=m}function Zs(n,o,s,c,f){f=f||o+h(s)+(c?"_"+h(c):"");var m=n[Wt]&&n[Wt][f];if(!m)return this;!Q.touchNative&&Q.pointer&&o.indexOf("touch")===0?vv(n,o,m):Q.touch&&o==="dblclick"?Cv(n,m):"removeEventListener"in n?n.removeEventListener(Bs[o]||o,m,!1):n.detachEvent("on"+o,m),n[Wt][f]=null}function Kn(n){return n.stopPropagation?n.stopPropagation():n.originalEvent?n.originalEvent._stopped=!0:n.cancelBubble=!0,this}function Hs(n){return Fs(n,"wheel",Kn),this}function pi(n){return te(n,"mousedown touchstart dblclick contextmenu",Kn),n._leaflet_disable_click=!0,this}function Ue(n){return n.preventDefault?n.preventDefault():n.returnValue=!1,this}function Yn(n){return Ue(n),Kn(n),this}function vd(n){if(n.composedPath)return n.composedPath();for(var o=[],s=n.target;s;)o.push(s),s=s.parentNode;return o}function _d(n,o){if(!o)return new I(n.clientX,n.clientY);var s=js(o),c=s.boundingClientRect;return new I((n.clientX-c.left)/s.x-o.clientLeft,(n.clientY-c.top)/s.y-o.clientTop)}var Ev=Q.linux&&Q.chrome?window.devicePixelRatio:Q.mac?window.devicePixelRatio*3:window.devicePixelRatio>0?2*window.devicePixelRatio:1;function yd(n){return Q.edge?n.wheelDeltaY/2:n.deltaY&&n.deltaMode===0?-n.deltaY/Ev:n.deltaY&&n.deltaMode===1?-n.deltaY*20:n.deltaY&&n.deltaMode===2?-n.deltaY*60:n.deltaX||n.deltaZ?0:n.wheelDelta?(n.wheelDeltaY||n.wheelDelta)/2:n.detail&&Math.abs(n.detail)<32765?-n.detail*20:n.detail?n.detail/-32765*60:0}function Ws(n,o){var s=o.relatedTarget;if(!s)return!0;try{for(;s&&s!==n;)s=s.parentNode}catch{return!1}return s!==n}var Lv={__proto__:null,on:te,off:me,stopPropagation:Kn,disableScrollPropagation:Hs,disableClickPropagation:pi,preventDefault:Ue,stop:Yn,getPropagationPath:vd,getMousePosition:_d,getWheelDelta:yd,isExternalTarget:Ws,addListener:te,removeListener:me},bd=X.extend({run:function(n,o,s,c){this.stop(),this._el=n,this._inProgress=!0,this._duration=s||.25,this._easeOutPower=1/Math.max(c||.5,.2),this._startPos=Gn(n),this._offset=o.subtract(this._startPos),this._startTime=+new Date,this.fire("start"),this._animate()},stop:function(){this._inProgress&&(this._step(!0),this._complete())},_animate:function(){this._animId=V(this._animate,this),this._step()},_step:function(n){var o=+new Date-this._startTime,s=this._duration*1e3;o<s?this._runFrame(this._easeOut(o/s),n):(this._runFrame(1),this._complete())},_runFrame:function(n,o){var s=this._startPos.add(this._offset.multiplyBy(n));o&&s._round(),Ae(this._el,s),this.fire("step")},_complete:function(){oe(this._animId),this._inProgress=!1,this.fire("end")},_easeOut:function(n){return 1-Math.pow(1-n,this._easeOutPower)}}),ue=X.extend({options:{crs:ks,center:void 0,zoom:void 0,minZoom:void 0,maxZoom:void 0,layers:[],maxBounds:void 0,renderer:void 0,zoomAnimation:!0,zoomAnimationThreshold:4,fadeAnimation:!0,markerZoomAnimation:!0,transform3DLimit:8388608,zoomSnap:1,zoomDelta:1,trackResize:!0},initialize:function(n,o){o=k(this,o),this._handlers=[],this._layers={},this._zoomBoundLayers={},this._sizeChanged=!0,this._initContainer(n),this._initLayout(),this._onResize=u(this._onResize,this),this._initEvents(),o.maxBounds&&this.setMaxBounds(o.maxBounds),o.zoom!==void 0&&(this._zoom=this._limitZoom(o.zoom)),o.center&&o.zoom!==void 0&&this.setView(q(o.center),o.zoom,{reset:!0}),this.callInitHooks(),this._zoomAnimated=ui&&Q.any3d&&!Q.mobileOpera&&this.options.zoomAnimation,this._zoomAnimated&&(this._createAnimProxy(),te(this._proxy,hd,this._catchTransitionEnd,this)),this._addLayers(this.options.layers)},setView:function(n,o,s){if(o=o===void 0?this._zoom:this._limitZoom(o),n=this._limitCenter(q(n),o,this.options.maxBounds),s=s||{},this._stop(),this._loaded&&!s.reset&&s!==!0){s.animate!==void 0&&(s.zoom=a({animate:s.animate},s.zoom),s.pan=a({animate:s.animate,duration:s.duration},s.pan));var c=this._zoom!==o?this._tryAnimatedZoom&&this._tryAnimatedZoom(n,o,s.zoom):this._tryAnimatedPan(n,s.pan);if(c)return clearTimeout(this._sizeTimer),this}return this._resetView(n,o,s.pan&&s.pan.noMoveStart),this},setZoom:function(n,o){return this._loaded?this.setView(this.getCenter(),n,{zoom:o}):(this._zoom=n,this)},zoomIn:function(n,o){return n=n||(Q.any3d?this.options.zoomDelta:1),this.setZoom(this._zoom+n,o)},zoomOut:function(n,o){return n=n||(Q.any3d?this.options.zoomDelta:1),this.setZoom(this._zoom-n,o)},setZoomAround:function(n,o,s){var c=this.getZoomScale(o),f=this.getSize().divideBy(2),m=n instanceof I?n:this.latLngToContainerPoint(n),S=m.subtract(f).multiplyBy(1-1/c),M=this.containerPointToLatLng(f.add(S));return this.setView(M,o,{zoom:s})},_getBoundsCenterZoom:function(n,o){o=o||{},n=n.getBounds?n.getBounds():de(n);var s=j(o.paddingTopLeft||o.padding||[0,0]),c=j(o.paddingBottomRight||o.padding||[0,0]),f=this.getBoundsZoom(n,!1,s.add(c));if(f=typeof o.maxZoom=="number"?Math.min(o.maxZoom,f):f,f===1/0)return{center:n.getCenter(),zoom:f};var m=c.subtract(s).divideBy(2),S=this.project(n.getSouthWest(),f),M=this.project(n.getNorthEast(),f),A=this.unproject(S.add(M).divideBy(2).add(m),f);return{center:A,zoom:f}},fitBounds:function(n,o){if(n=de(n),!n.isValid())throw new Error("Bounds are not valid.");var s=this._getBoundsCenterZoom(n,o);return this.setView(s.center,s.zoom,o)},fitWorld:function(n){return this.fitBounds([[-90,-180],[90,180]],n)},panTo:function(n,o){return this.setView(n,this._zoom,{pan:o})},panBy:function(n,o){if(n=j(n).round(),o=o||{},!n.x&&!n.y)return this.fire("moveend");if(o.animate!==!0&&!this.getSize().contains(n))return this._resetView(this.unproject(this.project(this.getCenter()).add(n)),this.getZoom()),this;if(this._panAnim||(this._panAnim=new bd,this._panAnim.on({step:this._onPanTransitionStep,end:this._onPanTransitionEnd},this)),o.noMoveStart||this.fire("movestart"),o.animate!==!1){ne(this._mapPane,"leaflet-pan-anim");var s=this._getMapPanePos().subtract(n).round();this._panAnim.run(this._mapPane,s,o.duration||.25,o.easeLinearity)}else this._rawPanBy(n),this.fire("move").fire("moveend");return this},flyTo:function(n,o,s){if(s=s||{},s.animate===!1||!Q.any3d)return this.setView(n,o,s);this._stop();var c=this.project(this.getCenter()),f=this.project(n),m=this.getSize(),S=this._zoom;n=q(n),o=o===void 0?S:o;var M=Math.max(m.x,m.y),A=M*this.getZoomScale(S,o),F=f.distanceTo(c)||1,W=1.42,$=W*W;function ie(Oe){var Oo=Oe?-1:1,v_=Oe?A:M,__=A*A-M*M+Oo*$*$*F*F,y_=2*v_*$*F,el=__/y_,ef=Math.sqrt(el*el+1)-el,b_=ef<1e-9?-18:Math.log(ef);return b_}function Xe(Oe){return(Math.exp(Oe)-Math.exp(-Oe))/2}function Fe(Oe){return(Math.exp(Oe)+Math.exp(-Oe))/2}function kt(Oe){return Xe(Oe)/Fe(Oe)}var at=ie(0);function xr(Oe){return M*(Fe(at)/Fe(at+W*Oe))}function h_(Oe){return M*(Fe(at)*kt(at+W*Oe)-Xe(at))/$}function p_(Oe){return 1-Math.pow(1-Oe,1.5)}var m_=Date.now(),Jd=(ie(1)-at)/W,g_=s.duration?1e3*s.duration:1e3*Jd*.8;function Xd(){var Oe=(Date.now()-m_)/g_,Oo=p_(Oe)*Jd;Oe<=1?(this._flyToFrame=V(Xd,this),this._move(this.unproject(c.add(f.subtract(c).multiplyBy(h_(Oo)/F)),S),this.getScaleZoom(M/xr(Oo),S),{flyTo:!0})):this._move(n,o)._moveEnd(!0)}return this._moveStart(!0,s.noMoveStart),Xd.call(this),this},flyToBounds:function(n,o){var s=this._getBoundsCenterZoom(n,o);return this.flyTo(s.center,s.zoom,o)},setMaxBounds:function(n){return n=de(n),this.listens("moveend",this._panInsideMaxBounds)&&this.off("moveend",this._panInsideMaxBounds),n.isValid()?(this.options.maxBounds=n,this._loaded&&this._panInsideMaxBounds(),this.on("moveend",this._panInsideMaxBounds)):(this.options.maxBounds=null,this)},setMinZoom:function(n){var o=this.options.minZoom;return this.options.minZoom=n,this._loaded&&o!==n&&(this.fire("zoomlevelschange"),this.getZoom()<this.options.minZoom)?this.setZoom(n):this},setMaxZoom:function(n){var o=this.options.maxZoom;return this.options.maxZoom=n,this._loaded&&o!==n&&(this.fire("zoomlevelschange"),this.getZoom()>this.options.maxZoom)?this.setZoom(n):this},panInsideBounds:function(n,o){this._enforcingBounds=!0;var s=this.getCenter(),c=this._limitCenter(s,this._zoom,de(n));return s.equals(c)||this.panTo(c,o),this._enforcingBounds=!1,this},panInside:function(n,o){o=o||{};var s=j(o.paddingTopLeft||o.padding||[0,0]),c=j(o.paddingBottomRight||o.padding||[0,0]),f=this.project(this.getCenter()),m=this.project(n),S=this.getPixelBounds(),M=ee([S.min.add(s),S.max.subtract(c)]),A=M.getSize();if(!M.contains(m)){this._enforcingBounds=!0;var F=m.subtract(M.getCenter()),W=M.extend(m).getSize().subtract(A);f.x+=F.x<0?-W.x:W.x,f.y+=F.y<0?-W.y:W.y,this.panTo(this.unproject(f),o),this._enforcingBounds=!1}return this},invalidateSize:function(n){if(!this._loaded)return this;n=a({animate:!1,pan:!0},n===!0?{animate:!0}:n);var o=this.getSize();this._sizeChanged=!0,this._lastCenter=null;var s=this.getSize(),c=o.divideBy(2).round(),f=s.divideBy(2).round(),m=c.subtract(f);return!m.x&&!m.y?this:(n.animate&&n.pan?this.panBy(m):(n.pan&&this._rawPanBy(m),this.fire("move"),n.debounceMoveend?(clearTimeout(this._sizeTimer),this._sizeTimer=setTimeout(u(this.fire,this,"moveend"),200)):this.fire("moveend")),this.fire("resize",{oldSize:o,newSize:s}))},stop:function(){return this.setZoom(this._limitZoom(this._zoom)),this.options.zoomSnap||this.fire("viewreset"),this._stop()},locate:function(n){if(n=this._locateOptions=a({timeout:1e4,watch:!1},n),!("geolocation"in navigator))return this._handleGeolocationError({code:0,message:"Geolocation not supported."}),this;var o=u(this._handleGeolocationResponse,this),s=u(this._handleGeolocationError,this);return n.watch?this._locationWatchId=navigator.geolocation.watchPosition(o,s,n):navigator.geolocation.getCurrentPosition(o,s,n),this},stopLocate:function(){return navigator.geolocation&&navigator.geolocation.clearWatch&&navigator.geolocation.clearWatch(this._locationWatchId),this._locateOptions&&(this._locateOptions.setView=!1),this},_handleGeolocationError:function(n){if(this._container._leaflet_id){var o=n.code,s=n.message||(o===1?"permission denied":o===2?"position unavailable":"timeout");this._locateOptions.setView&&!this._loaded&&this.fitWorld(),this.fire("locationerror",{code:o,message:"Geolocation error: "+s+"."})}},_handleGeolocationResponse:function(n){if(this._container._leaflet_id){var o=n.coords.latitude,s=n.coords.longitude,c=new ae(o,s),f=c.toBounds(n.coords.accuracy*2),m=this._locateOptions;if(m.setView){var S=this.getBoundsZoom(f);this.setView(c,m.maxZoom?Math.min(S,m.maxZoom):S)}var M={latlng:c,bounds:f,timestamp:n.timestamp};for(var A in n.coords)typeof n.coords[A]=="number"&&(M[A]=n.coords[A]);this.fire("locationfound",M)}},addHandler:function(n,o){if(!o)return this;var s=this[n]=new o(this);return this._handlers.push(s),this.options[n]&&s.enable(),this},remove:function(){if(this._initEvents(!0),this.options.maxBounds&&this.off("moveend",this._panInsideMaxBounds),this._containerId!==this._container._leaflet_id)throw new Error("Map container is being reused by another instance");try{delete this._container._leaflet_id,delete this._containerId}catch{this._container._leaflet_id=void 0,this._containerId=void 0}this._locationWatchId!==void 0&&this.stopLocate(),this._stop(),ke(this._mapPane),this._clearControlPos&&this._clearControlPos(),this._resizeRequest&&(oe(this._resizeRequest),this._resizeRequest=null),this._clearHandlers(),this._loaded&&this.fire("unload");var n;for(n in this._layers)this._layers[n].remove();for(n in this._panes)ke(this._panes[n]);return this._layers=[],this._panes=[],delete this._mapPane,delete this._renderer,this},createPane:function(n,o){var s="leaflet-pane"+(n?" leaflet-"+n.replace("Pane","")+"-pane":""),c=fe("div",s,o||this._mapPane);return n&&(this._panes[n]=c),c},getCenter:function(){return this._checkIfLoaded(),this._lastCenter&&!this._moved()?this._lastCenter.clone():this.layerPointToLatLng(this._getCenterLayerPoint())},getZoom:function(){return this._zoom},getBounds:function(){var n=this.getPixelBounds(),o=this.unproject(n.getBottomLeft()),s=this.unproject(n.getTopRight());return new Te(o,s)},getMinZoom:function(){return this.options.minZoom===void 0?this._layersMinZoom||0:this.options.minZoom},getMaxZoom:function(){return this.options.maxZoom===void 0?this._layersMaxZoom===void 0?1/0:this._layersMaxZoom:this.options.maxZoom},getBoundsZoom:function(n,o,s){n=de(n),s=j(s||[0,0]);var c=this.getZoom()||0,f=this.getMinZoom(),m=this.getMaxZoom(),S=n.getNorthWest(),M=n.getSouthEast(),A=this.getSize().subtract(s),F=ee(this.project(M,c),this.project(S,c)).getSize(),W=Q.any3d?this.options.zoomSnap:1,$=A.x/F.x,ie=A.y/F.y,Xe=o?Math.max($,ie):Math.min($,ie);return c=this.getScaleZoom(Xe,c),W&&(c=Math.round(c/(W/100))*(W/100),c=o?Math.ceil(c/W)*W:Math.floor(c/W)*W),Math.max(f,Math.min(m,c))},getSize:function(){return(!this._size||this._sizeChanged)&&(this._size=new I(this._container.clientWidth||0,this._container.clientHeight||0),this._sizeChanged=!1),this._size.clone()},getPixelBounds:function(n,o){var s=this._getTopLeftPoint(n,o);return new Y(s,s.add(this.getSize()))},getPixelOrigin:function(){return this._checkIfLoaded(),this._pixelOrigin},getPixelWorldBounds:function(n){return this.options.crs.getProjectedBounds(n===void 0?this.getZoom():n)},getPane:function(n){return typeof n=="string"?this._panes[n]:n},getPanes:function(){return this._panes},getContainer:function(){return this._container},getZoomScale:function(n,o){var s=this.options.crs;return o=o===void 0?this._zoom:o,s.scale(n)/s.scale(o)},getScaleZoom:function(n,o){var s=this.options.crs;o=o===void 0?this._zoom:o;var c=s.zoom(n*s.scale(o));return isNaN(c)?1/0:c},project:function(n,o){return o=o===void 0?this._zoom:o,this.options.crs.latLngToPoint(q(n),o)},unproject:function(n,o){return o=o===void 0?this._zoom:o,this.options.crs.pointToLatLng(j(n),o)},layerPointToLatLng:function(n){var o=j(n).add(this.getPixelOrigin());return this.unproject(o)},latLngToLayerPoint:function(n){var o=this.project(q(n))._round();return o._subtract(this.getPixelOrigin())},wrapLatLng:function(n){return this.options.crs.wrapLatLng(q(n))},wrapLatLngBounds:function(n){return this.options.crs.wrapLatLngBounds(de(n))},distance:function(n,o){return this.options.crs.distance(q(n),q(o))},containerPointToLayerPoint:function(n){return j(n).subtract(this._getMapPanePos())},layerPointToContainerPoint:function(n){return j(n).add(this._getMapPanePos())},containerPointToLatLng:function(n){var o=this.containerPointToLayerPoint(j(n));return this.layerPointToLatLng(o)},latLngToContainerPoint:function(n){return this.layerPointToContainerPoint(this.latLngToLayerPoint(q(n)))},mouseEventToContainerPoint:function(n){return _d(n,this._container)},mouseEventToLayerPoint:function(n){return this.containerPointToLayerPoint(this.mouseEventToContainerPoint(n))},mouseEventToLatLng:function(n){return this.layerPointToLatLng(this.mouseEventToLayerPoint(n))},_initContainer:function(n){var o=this._container=pd(n);if(o){if(o._leaflet_id)throw new Error("Map container is already initialized.")}else throw new Error("Map container not found.");te(o,"scroll",this._onScroll,this),this._containerId=h(o)},_initLayout:function(){var n=this._container;this._fadeAnimated=this.options.fadeAnimation&&Q.any3d,ne(n,"leaflet-container"+(Q.touch?" leaflet-touch":"")+(Q.retina?" leaflet-retina":"")+(Q.ielt9?" leaflet-oldie":"")+(Q.safari?" leaflet-safari":"")+(this._fadeAnimated?" leaflet-fade-anim":""));var o=ci(n,"position");o!=="absolute"&&o!=="relative"&&o!=="fixed"&&o!=="sticky"&&(n.style.position="relative"),this._initPanes(),this._initControlPos&&this._initControlPos()},_initPanes:function(){var n=this._panes={};this._paneRenderers={},this._mapPane=this.createPane("mapPane",this._container),Ae(this._mapPane,new I(0,0)),this.createPane("tilePane"),this.createPane("overlayPane"),this.createPane("shadowPane"),this.createPane("markerPane"),this.createPane("tooltipPane"),this.createPane("popupPane"),this.options.markerZoomAnimation||(ne(n.markerPane,"leaflet-zoom-hide"),ne(n.shadowPane,"leaflet-zoom-hide"))},_resetView:function(n,o,s){Ae(this._mapPane,new I(0,0));var c=!this._loaded;this._loaded=!0,o=this._limitZoom(o),this.fire("viewprereset");var f=this._zoom!==o;this._moveStart(f,s)._move(n,o)._moveEnd(f),this.fire("viewreset"),c&&this.fire("load")},_moveStart:function(n,o){return n&&this.fire("zoomstart"),o||this.fire("movestart"),this},_move:function(n,o,s,c){o===void 0&&(o=this._zoom);var f=this._zoom!==o;return this._zoom=o,this._lastCenter=n,this._pixelOrigin=this._getNewPixelOrigin(n),c?s&&s.pinch&&this.fire("zoom",s):((f||s&&s.pinch)&&this.fire("zoom",s),this.fire("move",s)),this},_moveEnd:function(n){return n&&this.fire("zoomend"),this.fire("moveend")},_stop:function(){return oe(this._flyToFrame),this._panAnim&&this._panAnim.stop(),this},_rawPanBy:function(n){Ae(this._mapPane,this._getMapPanePos().subtract(n))},_getZoomSpan:function(){return this.getMaxZoom()-this.getMinZoom()},_panInsideMaxBounds:function(){this._enforcingBounds||this.panInsideBounds(this.options.maxBounds)},_checkIfLoaded:function(){if(!this._loaded)throw new Error("Set map center and zoom first.")},_initEvents:function(n){this._targets={},this._targets[h(this._container)]=this;var o=n?me:te;o(this._container,"click dblclick mousedown mouseup mouseover mouseout mousemove contextmenu keypress keydown keyup",this._handleDOMEvent,this),this.options.trackResize&&o(window,"resize",this._onResize,this),Q.any3d&&this.options.transform3DLimit&&(n?this.off:this.on).call(this,"moveend",this._onMoveEnd)},_onResize:function(){oe(this._resizeRequest),this._resizeRequest=V(function(){this.invalidateSize({debounceMoveend:!0})},this)},_onScroll:function(){this._container.scrollTop=0,this._container.scrollLeft=0},_onMoveEnd:function(){var n=this._getMapPanePos();Math.max(Math.abs(n.x),Math.abs(n.y))>=this.options.transform3DLimit&&this._resetView(this.getCenter(),this.getZoom())},_findEventTargets:function(n,o){for(var s=[],c,f=o==="mouseout"||o==="mouseover",m=n.target||n.srcElement,S=!1;m;){if(c=this._targets[h(m)],c&&(o==="click"||o==="preclick")&&this._draggableMoved(c)){S=!0;break}if(c&&c.listens(o,!0)&&(f&&!Ws(m,n)||(s.push(c),f))||m===this._container)break;m=m.parentNode}return!s.length&&!S&&!f&&this.listens(o,!0)&&(s=[this]),s},_isClickDisabled:function(n){for(;n&&n!==this._container;){if(n._leaflet_disable_click)return!0;n=n.parentNode}},_handleDOMEvent:function(n){var o=n.target||n.srcElement;if(!(!this._loaded||o._leaflet_disable_events||n.type==="click"&&this._isClickDisabled(o))){var s=n.type;s==="mousedown"&&Ds(o),this._fireDOMEvent(n,s)}},_mouseEvents:["click","dblclick","mouseover","mouseout","contextmenu"],_fireDOMEvent:function(n,o,s){if(n.type==="click"){var c=a({},n);c.type="preclick",this._fireDOMEvent(c,c.type,s)}var f=this._findEventTargets(n,o);if(s){for(var m=[],S=0;S<s.length;S++)s[S].listens(o,!0)&&m.push(s[S]);f=m.concat(f)}if(f.length){o==="contextmenu"&&Ue(n);var M=f[0],A={originalEvent:n};if(n.type!=="keypress"&&n.type!=="keydown"&&n.type!=="keyup"){var F=M.getLatLng&&(!M._radius||M._radius<=10);A.containerPoint=F?this.latLngToContainerPoint(M.getLatLng()):this.mouseEventToContainerPoint(n),A.layerPoint=this.containerPointToLayerPoint(A.containerPoint),A.latlng=F?M.getLatLng():this.layerPointToLatLng(A.layerPoint)}for(S=0;S<f.length;S++)if(f[S].fire(o,A,!0),A.originalEvent._stopped||f[S].options.bubblingMouseEvents===!1&&E(this._mouseEvents,o)!==-1)return}},_draggableMoved:function(n){return n=n.dragging&&n.dragging.enabled()?n:this,n.dragging&&n.dragging.moved()||this.boxZoom&&this.boxZoom.moved()},_clearHandlers:function(){for(var n=0,o=this._handlers.length;n<o;n++)this._handlers[n].disable()},whenReady:function(n,o){return this._loaded?n.call(o||this,{target:this}):this.on("load",n,o),this},_getMapPanePos:function(){return Gn(this._mapPane)||new I(0,0)},_moved:function(){var n=this._getMapPanePos();return n&&!n.equals([0,0])},_getTopLeftPoint:function(n,o){var s=n&&o!==void 0?this._getNewPixelOrigin(n,o):this.getPixelOrigin();return s.subtract(this._getMapPanePos())},_getNewPixelOrigin:function(n,o){var s=this.getSize()._divideBy(2);return this.project(n,o)._subtract(s)._add(this._getMapPanePos())._round()},_latLngToNewLayerPoint:function(n,o,s){var c=this._getNewPixelOrigin(s,o);return this.project(n,o)._subtract(c)},_latLngBoundsToNewLayerBounds:function(n,o,s){var c=this._getNewPixelOrigin(s,o);return ee([this.project(n.getSouthWest(),o)._subtract(c),this.project(n.getNorthWest(),o)._subtract(c),this.project(n.getSouthEast(),o)._subtract(c),this.project(n.getNorthEast(),o)._subtract(c)])},_getCenterLayerPoint:function(){return this.containerPointToLayerPoint(this.getSize()._divideBy(2))},_getCenterOffset:function(n){return this.latLngToLayerPoint(n).subtract(this._getCenterLayerPoint())},_limitCenter:function(n,o,s){if(!s)return n;var c=this.project(n,o),f=this.getSize().divideBy(2),m=new Y(c.subtract(f),c.add(f)),S=this._getBoundsOffset(m,s,o);return Math.abs(S.x)<=1&&Math.abs(S.y)<=1?n:this.unproject(c.add(S),o)},_limitOffset:function(n,o){if(!o)return n;var s=this.getPixelBounds(),c=new Y(s.min.add(n),s.max.add(n));return n.add(this._getBoundsOffset(c,o))},_getBoundsOffset:function(n,o,s){var c=ee(this.project(o.getNorthEast(),s),this.project(o.getSouthWest(),s)),f=c.min.subtract(n.min),m=c.max.subtract(n.max),S=this._rebound(f.x,-m.x),M=this._rebound(f.y,-m.y);return new I(S,M)},_rebound:function(n,o){return n+o>0?Math.round(n-o)/2:Math.max(0,Math.ceil(n))-Math.max(0,Math.floor(o))},_limitZoom:function(n){var o=this.getMinZoom(),s=this.getMaxZoom(),c=Q.any3d?this.options.zoomSnap:1;return c&&(n=Math.round(n/c)*c),Math.max(o,Math.min(s,n))},_onPanTransitionStep:function(){this.fire("move")},_onPanTransitionEnd:function(){Le(this._mapPane,"leaflet-pan-anim"),this.fire("moveend")},_tryAnimatedPan:function(n,o){var s=this._getCenterOffset(n)._trunc();return(o&&o.animate)!==!0&&!this.getSize().contains(s)?!1:(this.panBy(s,o),!0)},_createAnimProxy:function(){var n=this._proxy=fe("div","leaflet-proxy leaflet-zoom-animated");this._panes.mapPane.appendChild(n),this.on("zoomanim",function(o){var s=zs,c=this._proxy.style[s];Vn(this._proxy,this.project(o.center,o.zoom),this.getZoomScale(o.zoom,1)),c===this._proxy.style[s]&&this._animatingZoom&&this._onZoomTransitionEnd()},this),this.on("load moveend",this._animMoveEnd,this),this._on("unload",this._destroyAnimProxy,this)},_destroyAnimProxy:function(){ke(this._proxy),this.off("load moveend",this._animMoveEnd,this),delete this._proxy},_animMoveEnd:function(){var n=this.getCenter(),o=this.getZoom();Vn(this._proxy,this.project(n,o),this.getZoomScale(o,1))},_catchTransitionEnd:function(n){this._animatingZoom&&n.propertyName.indexOf("transform")>=0&&this._onZoomTransitionEnd()},_nothingToAnimate:function(){return!this._container.getElementsByClassName("leaflet-zoom-animated").length},_tryAnimatedZoom:function(n,o,s){if(this._animatingZoom)return!0;if(s=s||{},!this._zoomAnimated||s.animate===!1||this._nothingToAnimate()||Math.abs(o-this._zoom)>this.options.zoomAnimationThreshold)return!1;var c=this.getZoomScale(o),f=this._getCenterOffset(n)._divideBy(1-1/c);return s.animate!==!0&&!this.getSize().contains(f)?!1:(V(function(){this._moveStart(!0,s.noMoveStart||!1)._animateZoom(n,o,!0)},this),!0)},_animateZoom:function(n,o,s,c){this._mapPane&&(s&&(this._animatingZoom=!0,this._animateToCenter=n,this._animateToZoom=o,ne(this._mapPane,"leaflet-zoom-anim")),this.fire("zoomanim",{center:n,zoom:o,noUpdate:c}),this._tempFireZoomEvent||(this._tempFireZoomEvent=this._zoom!==this._animateToZoom),this._move(this._animateToCenter,this._animateToZoom,void 0,!0),setTimeout(u(this._onZoomTransitionEnd,this),250))},_onZoomTransitionEnd:function(){this._animatingZoom&&(this._mapPane&&Le(this._mapPane,"leaflet-zoom-anim"),this._animatingZoom=!1,this._move(this._animateToCenter,this._animateToZoom,void 0,!0),this._tempFireZoomEvent&&this.fire("zoom"),delete this._tempFireZoomEvent,this.fire("move"),this._moveEnd(!0))}});function zv(n,o){return new ue(n,o)}var Mt=J.extend({options:{position:"topright"},initialize:function(n){k(this,n)},getPosition:function(){return this.options.position},setPosition:function(n){var o=this._map;return o&&o.removeControl(this),this.options.position=n,o&&o.addControl(this),this},getContainer:function(){return this._container},addTo:function(n){this.remove(),this._map=n;var o=this._container=this.onAdd(n),s=this.getPosition(),c=n._controlCorners[s];return ne(o,"leaflet-control"),s.indexOf("bottom")!==-1?c.insertBefore(o,c.firstChild):c.appendChild(o),this._map.on("unload",this.remove,this),this},remove:function(){return this._map?(ke(this._container),this.onRemove&&this.onRemove(this._map),this._map.off("unload",this.remove,this),this._map=null,this):this},_refocusOnMap:function(n){this._map&&n&&n.screenX>0&&n.screenY>0&&this._map.getContainer().focus()}}),mi=function(n){return new Mt(n)};ue.include({addControl:function(n){return n.addTo(this),this},removeControl:function(n){return n.remove(),this},_initControlPos:function(){var n=this._controlCorners={},o="leaflet-",s=this._controlContainer=fe("div",o+"control-container",this._container);function c(f,m){var S=o+f+" "+o+m;n[f+m]=fe("div",S,s)}c("top","left"),c("top","right"),c("bottom","left"),c("bottom","right")},_clearControlPos:function(){for(var n in this._controlCorners)ke(this._controlCorners[n]);ke(this._controlContainer),delete this._controlCorners,delete this._controlContainer}});var xd=Mt.extend({options:{collapsed:!0,position:"topright",autoZIndex:!0,hideSingleBase:!1,sortLayers:!1,sortFunction:function(n,o,s,c){return s<c?-1:c<s?1:0}},initialize:function(n,o,s){k(this,s),this._layerControlInputs=[],this._layers=[],this._lastZIndex=0,this._handlingClick=!1,this._preventClick=!1;for(var c in n)this._addLayer(n[c],c);for(c in o)this._addLayer(o[c],c,!0)},onAdd:function(n){this._initLayout(),this._update(),this._map=n,n.on("zoomend",this._checkDisabledLayers,this);for(var o=0;o<this._layers.length;o++)this._layers[o].layer.on("add remove",this._onLayerChange,this);return this._container},addTo:function(n){return Mt.prototype.addTo.call(this,n),this._expandIfNotCollapsed()},onRemove:function(){this._map.off("zoomend",this._checkDisabledLayers,this);for(var n=0;n<this._layers.length;n++)this._layers[n].layer.off("add remove",this._onLayerChange,this)},addBaseLayer:function(n,o){return this._addLayer(n,o),this._map?this._update():this},addOverlay:function(n,o){return this._addLayer(n,o,!0),this._map?this._update():this},removeLayer:function(n){n.off("add remove",this._onLayerChange,this);var o=this._getLayer(h(n));return o&&this._layers.splice(this._layers.indexOf(o),1),this._map?this._update():this},expand:function(){ne(this._container,"leaflet-control-layers-expanded"),this._section.style.height=null;var n=this._map.getSize().y-(this._container.offsetTop+50);return n<this._section.clientHeight?(ne(this._section,"leaflet-control-layers-scrollbar"),this._section.style.height=n+"px"):Le(this._section,"leaflet-control-layers-scrollbar"),this._checkDisabledLayers(),this},collapse:function(){return Le(this._container,"leaflet-control-layers-expanded"),this},_initLayout:function(){var n="leaflet-control-layers",o=this._container=fe("div",n),s=this.options.collapsed;o.setAttribute("aria-haspopup",!0),pi(o),Hs(o);var c=this._section=fe("section",n+"-list");s&&(this._map.on("click",this.collapse,this),te(o,{mouseenter:this._expandSafely,mouseleave:this.collapse},this));var f=this._layersLink=fe("a",n+"-toggle",o);f.href="#",f.title="Layers",f.setAttribute("role","button"),te(f,{keydown:function(m){m.keyCode===13&&this._expandSafely()},click:function(m){Ue(m),this._expandSafely()}},this),s||this.expand(),this._baseLayersList=fe("div",n+"-base",c),this._separator=fe("div",n+"-separator",c),this._overlaysList=fe("div",n+"-overlays",c),o.appendChild(c)},_getLayer:function(n){for(var o=0;o<this._layers.length;o++)if(this._layers[o]&&h(this._layers[o].layer)===n)return this._layers[o]},_addLayer:function(n,o,s){this._map&&n.on("add remove",this._onLayerChange,this),this._layers.push({layer:n,name:o,overlay:s}),this.options.sortLayers&&this._layers.sort(u(function(c,f){return this.options.sortFunction(c.layer,f.layer,c.name,f.name)},this)),this.options.autoZIndex&&n.setZIndex&&(this._lastZIndex++,n.setZIndex(this._lastZIndex)),this._expandIfNotCollapsed()},_update:function(){if(!this._container)return this;_o(this._baseLayersList),_o(this._overlaysList),this._layerControlInputs=[];var n,o,s,c,f=0;for(s=0;s<this._layers.length;s++)c=this._layers[s],this._addItem(c),o=o||c.overlay,n=n||!c.overlay,f+=c.overlay?0:1;return this.options.hideSingleBase&&(n=n&&f>1,this._baseLayersList.style.display=n?"":"none"),this._separator.style.display=o&&n?"":"none",this},_onLayerChange:function(n){this._handlingClick||this._update();var o=this._getLayer(h(n.target)),s=o.overlay?n.type==="add"?"overlayadd":"overlayremove":n.type==="add"?"baselayerchange":null;s&&this._map.fire(s,o)},_createRadioElement:function(n,o){var s='<input type="radio" class="leaflet-control-layers-selector" name="'+n+'"'+(o?' checked="checked"':"")+"/>",c=document.createElement("div");return c.innerHTML=s,c.firstChild},_addItem:function(n){var o=document.createElement("label"),s=this._map.hasLayer(n.layer),c;n.overlay?(c=document.createElement("input"),c.type="checkbox",c.className="leaflet-control-layers-selector",c.defaultChecked=s):c=this._createRadioElement("leaflet-base-layers_"+h(this),s),this._layerControlInputs.push(c),c.layerId=h(n.layer),te(c,"click",this._onInputClick,this);var f=document.createElement("span");f.innerHTML=" "+n.name;var m=document.createElement("span");o.appendChild(m),m.appendChild(c),m.appendChild(f);var S=n.overlay?this._overlaysList:this._baseLayersList;return S.appendChild(o),this._checkDisabledLayers(),o},_onInputClick:function(){if(!this._preventClick){var n=this._layerControlInputs,o,s,c=[],f=[];this._handlingClick=!0;for(var m=n.length-1;m>=0;m--)o=n[m],s=this._getLayer(o.layerId).layer,o.checked?c.push(s):o.checked||f.push(s);for(m=0;m<f.length;m++)this._map.hasLayer(f[m])&&this._map.removeLayer(f[m]);for(m=0;m<c.length;m++)this._map.hasLayer(c[m])||this._map.addLayer(c[m]);this._handlingClick=!1,this._refocusOnMap()}},_checkDisabledLayers:function(){for(var n=this._layerControlInputs,o,s,c=this._map.getZoom(),f=n.length-1;f>=0;f--)o=n[f],s=this._getLayer(o.layerId).layer,o.disabled=s.options.minZoom!==void 0&&c<s.options.minZoom||s.options.maxZoom!==void 0&&c>s.options.maxZoom},_expandIfNotCollapsed:function(){return this._map&&!this.options.collapsed&&this.expand(),this},_expandSafely:function(){var n=this._section;this._preventClick=!0,te(n,"click",Ue),this.expand();var o=this;setTimeout(function(){me(n,"click",Ue),o._preventClick=!1})}}),Mv=function(n,o,s){return new xd(n,o,s)},Us=Mt.extend({options:{position:"topleft",zoomInText:'<span aria-hidden="true">+</span>',zoomInTitle:"Zoom in",zoomOutText:'<span aria-hidden="true">&#x2212;</span>',zoomOutTitle:"Zoom out"},onAdd:function(n){var o="leaflet-control-zoom",s=fe("div",o+" leaflet-bar"),c=this.options;return this._zoomInButton=this._createButton(c.zoomInText,c.zoomInTitle,o+"-in",s,this._zoomIn),this._zoomOutButton=this._createButton(c.zoomOutText,c.zoomOutTitle,o+"-out",s,this._zoomOut),this._updateDisabled(),n.on("zoomend zoomlevelschange",this._updateDisabled,this),s},onRemove:function(n){n.off("zoomend zoomlevelschange",this._updateDisabled,this)},disable:function(){return this._disabled=!0,this._updateDisabled(),this},enable:function(){return this._disabled=!1,this._updateDisabled(),this},_zoomIn:function(n){!this._disabled&&this._map._zoom<this._map.getMaxZoom()&&this._map.zoomIn(this._map.options.zoomDelta*(n.shiftKey?3:1))},_zoomOut:function(n){!this._disabled&&this._map._zoom>this._map.getMinZoom()&&this._map.zoomOut(this._map.options.zoomDelta*(n.shiftKey?3:1))},_createButton:function(n,o,s,c,f){var m=fe("a",s,c);return m.innerHTML=n,m.href="#",m.title=o,m.setAttribute("role","button"),m.setAttribute("aria-label",o),pi(m),te(m,"click",Yn),te(m,"click",f,this),te(m,"click",this._refocusOnMap,this),m},_updateDisabled:function(){var n=this._map,o="leaflet-disabled";Le(this._zoomInButton,o),Le(this._zoomOutButton,o),this._zoomInButton.setAttribute("aria-disabled","false"),this._zoomOutButton.setAttribute("aria-disabled","false"),(this._disabled||n._zoom===n.getMinZoom())&&(ne(this._zoomOutButton,o),this._zoomOutButton.setAttribute("aria-disabled","true")),(this._disabled||n._zoom===n.getMaxZoom())&&(ne(this._zoomInButton,o),this._zoomInButton.setAttribute("aria-disabled","true"))}});ue.mergeOptions({zoomControl:!0}),ue.addInitHook(function(){this.options.zoomControl&&(this.zoomControl=new Us,this.addControl(this.zoomControl))});var Nv=function(n){return new Us(n)},wd=Mt.extend({options:{position:"bottomleft",maxWidth:100,metric:!0,imperial:!0},onAdd:function(n){var o="leaflet-control-scale",s=fe("div",o),c=this.options;return this._addScales(c,o+"-line",s),n.on(c.updateWhenIdle?"moveend":"move",this._update,this),n.whenReady(this._update,this),s},onRemove:function(n){n.off(this.options.updateWhenIdle?"moveend":"move",this._update,this)},_addScales:function(n,o,s){n.metric&&(this._mScale=fe("div",o,s)),n.imperial&&(this._iScale=fe("div",o,s))},_update:function(){var n=this._map,o=n.getSize().y/2,s=n.distance(n.containerPointToLatLng([0,o]),n.containerPointToLatLng([this.options.maxWidth,o]));this._updateScales(s)},_updateScales:function(n){this.options.metric&&n&&this._updateMetric(n),this.options.imperial&&n&&this._updateImperial(n)},_updateMetric:function(n){var o=this._getRoundNum(n),s=o<1e3?o+" m":o/1e3+" km";this._updateScale(this._mScale,s,o/n)},_updateImperial:function(n){var o=n*3.2808399,s,c,f;o>5280?(s=o/5280,c=this._getRoundNum(s),this._updateScale(this._iScale,c+" mi",c/s)):(f=this._getRoundNum(o),this._updateScale(this._iScale,f+" ft",f/o))},_updateScale:function(n,o,s){n.style.width=Math.round(this.options.maxWidth*s)+"px",n.innerHTML=o},_getRoundNum:function(n){var o=Math.pow(10,(Math.floor(n)+"").length-1),s=n/o;return s=s>=10?10:s>=5?5:s>=3?3:s>=2?2:1,o*s}}),Av=function(n){return new wd(n)},Ov='<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8" class="leaflet-attribution-flag"><path fill="#4C7BE1" d="M0 0h12v4H0z"/><path fill="#FFD500" d="M0 4h12v3H0z"/><path fill="#E0BC00" d="M0 7h12v1H0z"/></svg>',Vs=Mt.extend({options:{position:"bottomright",prefix:'<a href="https://leafletjs.com" title="A JavaScript library for interactive maps">'+(Q.inlineSvg?Ov+" ":"")+"Leaflet</a>"},initialize:function(n){k(this,n),this._attributions={}},onAdd:function(n){n.attributionControl=this,this._container=fe("div","leaflet-control-attribution"),pi(this._container);for(var o in n._layers)n._layers[o].getAttribution&&this.addAttribution(n._layers[o].getAttribution());return this._update(),n.on("layeradd",this._addAttribution,this),this._container},onRemove:function(n){n.off("layeradd",this._addAttribution,this)},_addAttribution:function(n){n.layer.getAttribution&&(this.addAttribution(n.layer.getAttribution()),n.layer.once("remove",function(){this.removeAttribution(n.layer.getAttribution())},this))},setPrefix:function(n){return this.options.prefix=n,this._update(),this},addAttribution:function(n){return n?(this._attributions[n]||(this._attributions[n]=0),this._attributions[n]++,this._update(),this):this},removeAttribution:function(n){return n?(this._attributions[n]&&(this._attributions[n]--,this._update()),this):this},_update:function(){if(this._map){var n=[];for(var o in this._attributions)this._attributions[o]&&n.push(o);var s=[];this.options.prefix&&s.push(this.options.prefix),n.length&&s.push(n.join(", ")),this._container.innerHTML=s.join(' <span aria-hidden="true">|</span> ')}}});ue.mergeOptions({attributionControl:!0}),ue.addInitHook(function(){this.options.attributionControl&&new Vs().addTo(this)});var Iv=function(n){return new Vs(n)};Mt.Layers=xd,Mt.Zoom=Us,Mt.Scale=wd,Mt.Attribution=Vs,mi.layers=Mv,mi.zoom=Nv,mi.scale=Av,mi.attribution=Iv;var Ut=J.extend({initialize:function(n){this._map=n},enable:function(){return this._enabled?this:(this._enabled=!0,this.addHooks(),this)},disable:function(){return this._enabled?(this._enabled=!1,this.removeHooks(),this):this},enabled:function(){return!!this._enabled}});Ut.addTo=function(n,o){return n.addHandler(o,this),this};var Rv={Events:U},kd=Q.touch?"touchstart mousedown":"mousedown",vn=X.extend({options:{clickTolerance:3},initialize:function(n,o,s,c){k(this,c),this._element=n,this._dragStartTarget=o||n,this._preventOutline=s},enable:function(){this._enabled||(te(this._dragStartTarget,kd,this._onDown,this),this._enabled=!0)},disable:function(){this._enabled&&(vn._dragging===this&&this.finishDrag(!0),me(this._dragStartTarget,kd,this._onDown,this),this._enabled=!1,this._moved=!1)},_onDown:function(n){if(this._enabled&&(this._moved=!1,!Ms(this._element,"leaflet-zoom-anim"))){if(n.touches&&n.touches.length!==1){vn._dragging===this&&this.finishDrag();return}if(!(vn._dragging||n.shiftKey||n.which!==1&&n.button!==1&&!n.touches)&&(vn._dragging=this,this._preventOutline&&Ds(this._element),Os(),di(),!this._moving)){this.fire("down");var o=n.touches?n.touches[0]:n,s=md(this._element);this._startPoint=new I(o.clientX,o.clientY),this._startPos=Gn(this._element),this._parentScale=js(s);var c=n.type==="mousedown";te(document,c?"mousemove":"touchmove",this._onMove,this),te(document,c?"mouseup":"touchend touchcancel",this._onUp,this)}}},_onMove:function(n){if(this._enabled){if(n.touches&&n.touches.length>1){this._moved=!0;return}var o=n.touches&&n.touches.length===1?n.touches[0]:n,s=new I(o.clientX,o.clientY)._subtract(this._startPoint);!s.x&&!s.y||Math.abs(s.x)+Math.abs(s.y)<this.options.clickTolerance||(s.x/=this._parentScale.x,s.y/=this._parentScale.y,Ue(n),this._moved||(this.fire("dragstart"),this._moved=!0,ne(document.body,"leaflet-dragging"),this._lastTarget=n.target||n.srcElement,window.SVGElementInstance&&this._lastTarget instanceof window.SVGElementInstance&&(this._lastTarget=this._lastTarget.correspondingUseElement),ne(this._lastTarget,"leaflet-drag-target")),this._newPos=this._startPos.add(s),this._moving=!0,this._lastEvent=n,this._updatePosition())}},_updatePosition:function(){var n={originalEvent:this._lastEvent};this.fire("predrag",n),Ae(this._element,this._newPos),this.fire("drag",n)},_onUp:function(){this._enabled&&this.finishDrag()},finishDrag:function(n){Le(document.body,"leaflet-dragging"),this._lastTarget&&(Le(this._lastTarget,"leaflet-drag-target"),this._lastTarget=null),me(document,"mousemove touchmove",this._onMove,this),me(document,"mouseup touchend touchcancel",this._onUp,this),Is(),fi();var o=this._moved&&this._moving;this._moving=!1,vn._dragging=!1,o&&this.fire("dragend",{noInertia:n,distance:this._newPos.distanceTo(this._startPos)})}});function Sd(n,o,s){var c,f=[1,4,2,8],m,S,M,A,F,W,$,ie;for(m=0,W=n.length;m<W;m++)n[m]._code=Qn(n[m],o);for(M=0;M<4;M++){for($=f[M],c=[],m=0,W=n.length,S=W-1;m<W;S=m++)A=n[m],F=n[S],A._code&$?F._code&$||(ie=ko(F,A,$,o,s),ie._code=Qn(ie,o),c.push(ie)):(F._code&$&&(ie=ko(F,A,$,o,s),ie._code=Qn(ie,o),c.push(ie)),c.push(A));n=c}return n}function Cd(n,o){var s,c,f,m,S,M,A,F,W;if(!n||n.length===0)throw new Error("latlngs not passed");wt(n)||(console.warn("latlngs are not flat! Only the first ring will be used"),n=n[0]);var $=q([0,0]),ie=de(n),Xe=ie.getNorthWest().distanceTo(ie.getSouthWest())*ie.getNorthEast().distanceTo(ie.getNorthWest());Xe<1700&&($=Gs(n));var Fe=n.length,kt=[];for(s=0;s<Fe;s++){var at=q(n[s]);kt.push(o.project(q([at.lat-$.lat,at.lng-$.lng])))}for(M=A=F=0,s=0,c=Fe-1;s<Fe;c=s++)f=kt[s],m=kt[c],S=f.y*m.x-m.y*f.x,A+=(f.x+m.x)*S,F+=(f.y+m.y)*S,M+=S*3;M===0?W=kt[0]:W=[A/M,F/M];var xr=o.unproject(j(W));return q([xr.lat+$.lat,xr.lng+$.lng])}function Gs(n){for(var o=0,s=0,c=0,f=0;f<n.length;f++){var m=q(n[f]);o+=m.lat,s+=m.lng,c++}return q([o/c,s/c])}var Dv={__proto__:null,clipPolygon:Sd,polygonCenter:Cd,centroid:Gs};function Pd(n,o){if(!o||!n.length)return n.slice();var s=o*o;return n=Fv(n,s),n=Bv(n,s),n}function Td(n,o,s){return Math.sqrt(gi(n,o,s,!0))}function jv(n,o,s){return gi(n,o,s)}function Bv(n,o){var s=n.length,c=typeof Uint8Array<"u"?Uint8Array:Array,f=new c(s);f[0]=f[s-1]=1,Ks(n,f,o,0,s-1);var m,S=[];for(m=0;m<s;m++)f[m]&&S.push(n[m]);return S}function Ks(n,o,s,c,f){var m=0,S,M,A;for(M=c+1;M<=f-1;M++)A=gi(n[M],n[c],n[f],!0),A>m&&(S=M,m=A);m>s&&(o[S]=1,Ks(n,o,s,c,S),Ks(n,o,s,S,f))}function Fv(n,o){for(var s=[n[0]],c=1,f=0,m=n.length;c<m;c++)Zv(n[c],n[f])>o&&(s.push(n[c]),f=c);return f<m-1&&s.push(n[m-1]),s}var Ed;function Ld(n,o,s,c,f){var m=c?Ed:Qn(n,s),S=Qn(o,s),M,A,F;for(Ed=S;;){if(!(m|S))return[n,o];if(m&S)return!1;M=m||S,A=ko(n,o,M,s,f),F=Qn(A,s),M===m?(n=A,m=F):(o=A,S=F)}}function ko(n,o,s,c,f){var m=o.x-n.x,S=o.y-n.y,M=c.min,A=c.max,F,W;return s&8?(F=n.x+m*(A.y-n.y)/S,W=A.y):s&4?(F=n.x+m*(M.y-n.y)/S,W=M.y):s&2?(F=A.x,W=n.y+S*(A.x-n.x)/m):s&1&&(F=M.x,W=n.y+S*(M.x-n.x)/m),new I(F,W,f)}function Qn(n,o){var s=0;return n.x<o.min.x?s|=1:n.x>o.max.x&&(s|=2),n.y<o.min.y?s|=4:n.y>o.max.y&&(s|=8),s}function Zv(n,o){var s=o.x-n.x,c=o.y-n.y;return s*s+c*c}function gi(n,o,s,c){var f=o.x,m=o.y,S=s.x-f,M=s.y-m,A=S*S+M*M,F;return A>0&&(F=((n.x-f)*S+(n.y-m)*M)/A,F>1?(f=s.x,m=s.y):F>0&&(f+=S*F,m+=M*F)),S=n.x-f,M=n.y-m,c?S*S+M*M:new I(f,m)}function wt(n){return!v(n[0])||typeof n[0][0]!="object"&&typeof n[0][0]<"u"}function zd(n){return console.warn("Deprecated use of _flat, please use L.LineUtil.isFlat instead."),wt(n)}function Md(n,o){var s,c,f,m,S,M,A,F;if(!n||n.length===0)throw new Error("latlngs not passed");wt(n)||(console.warn("latlngs are not flat! Only the first ring will be used"),n=n[0]);var W=q([0,0]),$=de(n),ie=$.getNorthWest().distanceTo($.getSouthWest())*$.getNorthEast().distanceTo($.getNorthWest());ie<1700&&(W=Gs(n));var Xe=n.length,Fe=[];for(s=0;s<Xe;s++){var kt=q(n[s]);Fe.push(o.project(q([kt.lat-W.lat,kt.lng-W.lng])))}for(s=0,c=0;s<Xe-1;s++)c+=Fe[s].distanceTo(Fe[s+1])/2;if(c===0)F=Fe[0];else for(s=0,m=0;s<Xe-1;s++)if(S=Fe[s],M=Fe[s+1],f=S.distanceTo(M),m+=f,m>c){A=(m-c)/f,F=[M.x-A*(M.x-S.x),M.y-A*(M.y-S.y)];break}var at=o.unproject(j(F));return q([at.lat+W.lat,at.lng+W.lng])}var Hv={__proto__:null,simplify:Pd,pointToSegmentDistance:Td,closestPointOnSegment:jv,clipSegment:Ld,_getEdgeIntersection:ko,_getBitCode:Qn,_sqClosestPointOnSegment:gi,isFlat:wt,_flat:zd,polylineCenter:Md},Ys={project:function(n){return new I(n.lng,n.lat)},unproject:function(n){return new ae(n.y,n.x)},bounds:new Y([-180,-90],[180,90])},Qs={R:6378137,R_MINOR:6356752314245179e-9,bounds:new Y([-2003750834279e-5,-1549657073972e-5],[2003750834279e-5,1876465623138e-5]),project:function(n){var o=Math.PI/180,s=this.R,c=n.lat*o,f=this.R_MINOR/s,m=Math.sqrt(1-f*f),S=m*Math.sin(c),M=Math.tan(Math.PI/4-c/2)/Math.pow((1-S)/(1+S),m/2);return c=-s*Math.log(Math.max(M,1e-10)),new I(n.lng*o*s,c)},unproject:function(n){for(var o=180/Math.PI,s=this.R,c=this.R_MINOR/s,f=Math.sqrt(1-c*c),m=Math.exp(-n.y/s),S=Math.PI/2-2*Math.atan(m),M=0,A=.1,F;M<15&&Math.abs(A)>1e-7;M++)F=f*Math.sin(S),F=Math.pow((1-F)/(1+F),f/2),A=Math.PI/2-2*Math.atan(m*F)-S,S+=A;return new ae(S*o,n.x*o/s)}},Wv={__proto__:null,LonLat:Ys,Mercator:Qs,SphericalMercator:Un},Uv=a({},it,{code:"EPSG:3395",projection:Qs,transformation:function(){var n=.5/(Math.PI*Qs.R);return ot(n,.5,-n,.5)}()}),Nd=a({},it,{code:"EPSG:4326",projection:Ys,transformation:ot(1/180,1,-1/180,.5)}),Vv=a({},De,{projection:Ys,transformation:ot(1,0,-1,0),scale:function(n){return Math.pow(2,n)},zoom:function(n){return Math.log(n)/Math.LN2},distance:function(n,o){var s=o.lng-n.lng,c=o.lat-n.lat;return Math.sqrt(s*s+c*c)},infinite:!0});De.Earth=it,De.EPSG3395=Uv,De.EPSG3857=ks,De.EPSG900913=qg,De.EPSG4326=Nd,De.Simple=Vv;var Nt=X.extend({options:{pane:"overlayPane",attribution:null,bubblingMouseEvents:!0},addTo:function(n){return n.addLayer(this),this},remove:function(){return this.removeFrom(this._map||this._mapToAdd)},removeFrom:function(n){return n&&n.removeLayer(this),this},getPane:function(n){return this._map.getPane(n?this.options[n]||n:this.options.pane)},addInteractiveTarget:function(n){return this._map._targets[h(n)]=this,this},removeInteractiveTarget:function(n){return delete this._map._targets[h(n)],this},getAttribution:function(){return this.options.attribution},_layerAdd:function(n){var o=n.target;if(o.hasLayer(this)){if(this._map=o,this._zoomAnimated=o._zoomAnimated,this.getEvents){var s=this.getEvents();o.on(s,this),this.once("remove",function(){o.off(s,this)},this)}this.onAdd(o),this.fire("add"),o.fire("layeradd",{layer:this})}}});ue.include({addLayer:function(n){if(!n._layerAdd)throw new Error("The provided object is not a Layer.");var o=h(n);return this._layers[o]?this:(this._layers[o]=n,n._mapToAdd=this,n.beforeAdd&&n.beforeAdd(this),this.whenReady(n._layerAdd,n),this)},removeLayer:function(n){var o=h(n);return this._layers[o]?(this._loaded&&n.onRemove(this),delete this._layers[o],this._loaded&&(this.fire("layerremove",{layer:n}),n.fire("remove")),n._map=n._mapToAdd=null,this):this},hasLayer:function(n){return h(n)in this._layers},eachLayer:function(n,o){for(var s in this._layers)n.call(o,this._layers[s]);return this},_addLayers:function(n){n=n?v(n)?n:[n]:[];for(var o=0,s=n.length;o<s;o++)this.addLayer(n[o])},_addZoomLimit:function(n){(!isNaN(n.options.maxZoom)||!isNaN(n.options.minZoom))&&(this._zoomBoundLayers[h(n)]=n,this._updateZoomLevels())},_removeZoomLimit:function(n){var o=h(n);this._zoomBoundLayers[o]&&(delete this._zoomBoundLayers[o],this._updateZoomLevels())},_updateZoomLevels:function(){var n=1/0,o=-1/0,s=this._getZoomSpan();for(var c in this._zoomBoundLayers){var f=this._zoomBoundLayers[c].options;n=f.minZoom===void 0?n:Math.min(n,f.minZoom),o=f.maxZoom===void 0?o:Math.max(o,f.maxZoom)}this._layersMaxZoom=o===-1/0?void 0:o,this._layersMinZoom=n===1/0?void 0:n,s!==this._getZoomSpan()&&this.fire("zoomlevelschange"),this.options.maxZoom===void 0&&this._layersMaxZoom&&this.getZoom()>this._layersMaxZoom&&this.setZoom(this._layersMaxZoom),this.options.minZoom===void 0&&this._layersMinZoom&&this.getZoom()<this._layersMinZoom&&this.setZoom(this._layersMinZoom)}});var gr=Nt.extend({initialize:function(n,o){k(this,o),this._layers={};var s,c;if(n)for(s=0,c=n.length;s<c;s++)this.addLayer(n[s])},addLayer:function(n){var o=this.getLayerId(n);return this._layers[o]=n,this._map&&this._map.addLayer(n),this},removeLayer:function(n){var o=n in this._layers?n:this.getLayerId(n);return this._map&&this._layers[o]&&this._map.removeLayer(this._layers[o]),delete this._layers[o],this},hasLayer:function(n){var o=typeof n=="number"?n:this.getLayerId(n);return o in this._layers},clearLayers:function(){return this.eachLayer(this.removeLayer,this)},invoke:function(n){var o=Array.prototype.slice.call(arguments,1),s,c;for(s in this._layers)c=this._layers[s],c[n]&&c[n].apply(c,o);return this},onAdd:function(n){this.eachLayer(n.addLayer,n)},onRemove:function(n){this.eachLayer(n.removeLayer,n)},eachLayer:function(n,o){for(var s in this._layers)n.call(o,this._layers[s]);return this},getLayer:function(n){return this._layers[n]},getLayers:function(){var n=[];return this.eachLayer(n.push,n),n},setZIndex:function(n){return this.invoke("setZIndex",n)},getLayerId:function(n){return h(n)}}),Gv=function(n,o){return new gr(n,o)},Jt=gr.extend({addLayer:function(n){return this.hasLayer(n)?this:(n.addEventParent(this),gr.prototype.addLayer.call(this,n),this.fire("layeradd",{layer:n}))},removeLayer:function(n){return this.hasLayer(n)?(n in this._layers&&(n=this._layers[n]),n.removeEventParent(this),gr.prototype.removeLayer.call(this,n),this.fire("layerremove",{layer:n})):this},setStyle:function(n){return this.invoke("setStyle",n)},bringToFront:function(){return this.invoke("bringToFront")},bringToBack:function(){return this.invoke("bringToBack")},getBounds:function(){var n=new Te;for(var o in this._layers){var s=this._layers[o];n.extend(s.getBounds?s.getBounds():s.getLatLng())}return n}}),Kv=function(n,o){return new Jt(n,o)},vr=J.extend({options:{popupAnchor:[0,0],tooltipAnchor:[0,0],crossOrigin:!1},initialize:function(n){k(this,n)},createIcon:function(n){return this._createIcon("icon",n)},createShadow:function(n){return this._createIcon("shadow",n)},_createIcon:function(n,o){var s=this._getIconUrl(n);if(!s){if(n==="icon")throw new Error("iconUrl not set in Icon options (see the docs).");return null}var c=this._createImg(s,o&&o.tagName==="IMG"?o:null);return this._setIconStyles(c,n),(this.options.crossOrigin||this.options.crossOrigin==="")&&(c.crossOrigin=this.options.crossOrigin===!0?"":this.options.crossOrigin),c},_setIconStyles:function(n,o){var s=this.options,c=s[o+"Size"];typeof c=="number"&&(c=[c,c]);var f=j(c),m=j(o==="shadow"&&s.shadowAnchor||s.iconAnchor||f&&f.divideBy(2,!0));n.className="leaflet-marker-"+o+" "+(s.className||""),m&&(n.style.marginLeft=-m.x+"px",n.style.marginTop=-m.y+"px"),f&&(n.style.width=f.x+"px",n.style.height=f.y+"px")},_createImg:function(n,o){return o=o||document.createElement("img"),o.src=n,o},_getIconUrl:function(n){return Q.retina&&this.options[n+"RetinaUrl"]||this.options[n+"Url"]}});function Yv(n){return new vr(n)}var vi=vr.extend({options:{iconUrl:"marker-icon.png",iconRetinaUrl:"marker-icon-2x.png",shadowUrl:"marker-shadow.png",iconSize:[25,41],iconAnchor:[12,41],popupAnchor:[1,-34],tooltipAnchor:[16,-28],shadowSize:[41,41]},_getIconUrl:function(n){return typeof vi.imagePath!="string"&&(vi.imagePath=this._detectIconPath()),(this.options.imagePath||vi.imagePath)+vr.prototype._getIconUrl.call(this,n)},_stripUrl:function(n){var o=function(s,c,f){var m=c.exec(s);return m&&m[f]};return n=o(n,/^url\((['"])?(.+)\1\)$/,2),n&&o(n,/^(.*)marker-icon\.png$/,1)},_detectIconPath:function(){var n=fe("div","leaflet-default-icon-path",document.body),o=ci(n,"background-image")||ci(n,"backgroundImage");if(document.body.removeChild(n),o=this._stripUrl(o),o)return o;var s=document.querySelector('link[href$="leaflet.css"]');return s?s.href.substring(0,s.href.length-11-1):""}}),Ad=Ut.extend({initialize:function(n){this._marker=n},addHooks:function(){var n=this._marker._icon;this._draggable||(this._draggable=new vn(n,n,!0)),this._draggable.on({dragstart:this._onDragStart,predrag:this._onPreDrag,drag:this._onDrag,dragend:this._onDragEnd},this).enable(),ne(n,"leaflet-marker-draggable")},removeHooks:function(){this._draggable.off({dragstart:this._onDragStart,predrag:this._onPreDrag,drag:this._onDrag,dragend:this._onDragEnd},this).disable(),this._marker._icon&&Le(this._marker._icon,"leaflet-marker-draggable")},moved:function(){return this._draggable&&this._draggable._moved},_adjustPan:function(n){var o=this._marker,s=o._map,c=this._marker.options.autoPanSpeed,f=this._marker.options.autoPanPadding,m=Gn(o._icon),S=s.getPixelBounds(),M=s.getPixelOrigin(),A=ee(S.min._subtract(M).add(f),S.max._subtract(M).subtract(f));if(!A.contains(m)){var F=j((Math.max(A.max.x,m.x)-A.max.x)/(S.max.x-A.max.x)-(Math.min(A.min.x,m.x)-A.min.x)/(S.min.x-A.min.x),(Math.max(A.max.y,m.y)-A.max.y)/(S.max.y-A.max.y)-(Math.min(A.min.y,m.y)-A.min.y)/(S.min.y-A.min.y)).multiplyBy(c);s.panBy(F,{animate:!1}),this._draggable._newPos._add(F),this._draggable._startPos._add(F),Ae(o._icon,this._draggable._newPos),this._onDrag(n),this._panRequest=V(this._adjustPan.bind(this,n))}},_onDragStart:function(){this._oldLatLng=this._marker.getLatLng(),this._marker.closePopup&&this._marker.closePopup(),this._marker.fire("movestart").fire("dragstart")},_onPreDrag:function(n){this._marker.options.autoPan&&(oe(this._panRequest),this._panRequest=V(this._adjustPan.bind(this,n)))},_onDrag:function(n){var o=this._marker,s=o._shadow,c=Gn(o._icon),f=o._map.layerPointToLatLng(c);s&&Ae(s,c),o._latlng=f,n.latlng=f,n.oldLatLng=this._oldLatLng,o.fire("move",n).fire("drag",n)},_onDragEnd:function(n){oe(this._panRequest),delete this._oldLatLng,this._marker.fire("moveend").fire("dragend",n)}}),So=Nt.extend({options:{icon:new vi,interactive:!0,keyboard:!0,title:"",alt:"Marker",zIndexOffset:0,opacity:1,riseOnHover:!1,riseOffset:250,pane:"markerPane",shadowPane:"shadowPane",bubblingMouseEvents:!1,autoPanOnFocus:!0,draggable:!1,autoPan:!1,autoPanPadding:[50,50],autoPanSpeed:10},initialize:function(n,o){k(this,o),this._latlng=q(n)},onAdd:function(n){this._zoomAnimated=this._zoomAnimated&&n.options.markerZoomAnimation,this._zoomAnimated&&n.on("zoomanim",this._animateZoom,this),this._initIcon(),this.update()},onRemove:function(n){this.dragging&&this.dragging.enabled()&&(this.options.draggable=!0,this.dragging.removeHooks()),delete this.dragging,this._zoomAnimated&&n.off("zoomanim",this._animateZoom,this),this._removeIcon(),this._removeShadow()},getEvents:function(){return{zoom:this.update,viewreset:this.update}},getLatLng:function(){return this._latlng},setLatLng:function(n){var o=this._latlng;return this._latlng=q(n),this.update(),this.fire("move",{oldLatLng:o,latlng:this._latlng})},setZIndexOffset:function(n){return this.options.zIndexOffset=n,this.update()},getIcon:function(){return this.options.icon},setIcon:function(n){return this.options.icon=n,this._map&&(this._initIcon(),this.update()),this._popup&&this.bindPopup(this._popup,this._popup.options),this},getElement:function(){return this._icon},update:function(){if(this._icon&&this._map){var n=this._map.latLngToLayerPoint(this._latlng).round();this._setPos(n)}return this},_initIcon:function(){var n=this.options,o="leaflet-zoom-"+(this._zoomAnimated?"animated":"hide"),s=n.icon.createIcon(this._icon),c=!1;s!==this._icon&&(this._icon&&this._removeIcon(),c=!0,n.title&&(s.title=n.title),s.tagName==="IMG"&&(s.alt=n.alt||"")),ne(s,o),n.keyboard&&(s.tabIndex="0",s.setAttribute("role","button")),this._icon=s,n.riseOnHover&&this.on({mouseover:this._bringToFront,mouseout:this._resetZIndex}),this.options.autoPanOnFocus&&te(s,"focus",this._panOnFocus,this);var f=n.icon.createShadow(this._shadow),m=!1;f!==this._shadow&&(this._removeShadow(),m=!0),f&&(ne(f,o),f.alt=""),this._shadow=f,n.opacity<1&&this._updateOpacity(),c&&this.getPane().appendChild(this._icon),this._initInteraction(),f&&m&&this.getPane(n.shadowPane).appendChild(this._shadow)},_removeIcon:function(){this.options.riseOnHover&&this.off({mouseover:this._bringToFront,mouseout:this._resetZIndex}),this.options.autoPanOnFocus&&me(this._icon,"focus",this._panOnFocus,this),ke(this._icon),this.removeInteractiveTarget(this._icon),this._icon=null},_removeShadow:function(){this._shadow&&ke(this._shadow),this._shadow=null},_setPos:function(n){this._icon&&Ae(this._icon,n),this._shadow&&Ae(this._shadow,n),this._zIndex=n.y+this.options.zIndexOffset,this._resetZIndex()},_updateZIndex:function(n){this._icon&&(this._icon.style.zIndex=this._zIndex+n)},_animateZoom:function(n){var o=this._map._latLngToNewLayerPoint(this._latlng,n.zoom,n.center).round();this._setPos(o)},_initInteraction:function(){if(this.options.interactive&&(ne(this._icon,"leaflet-interactive"),this.addInteractiveTarget(this._icon),Ad)){var n=this.options.draggable;this.dragging&&(n=this.dragging.enabled(),this.dragging.disable()),this.dragging=new Ad(this),n&&this.dragging.enable()}},setOpacity:function(n){return this.options.opacity=n,this._map&&this._updateOpacity(),this},_updateOpacity:function(){var n=this.options.opacity;this._icon&&xt(this._icon,n),this._shadow&&xt(this._shadow,n)},_bringToFront:function(){this._updateZIndex(this.options.riseOffset)},_resetZIndex:function(){this._updateZIndex(0)},_panOnFocus:function(){var n=this._map;if(n){var o=this.options.icon.options,s=o.iconSize?j(o.iconSize):j(0,0),c=o.iconAnchor?j(o.iconAnchor):j(0,0);n.panInside(this._latlng,{paddingTopLeft:c,paddingBottomRight:s.subtract(c)})}},_getPopupAnchor:function(){return this.options.icon.options.popupAnchor},_getTooltipAnchor:function(){return this.options.icon.options.tooltipAnchor}});function Qv(n,o){return new So(n,o)}var _n=Nt.extend({options:{stroke:!0,color:"#3388ff",weight:3,opacity:1,lineCap:"round",lineJoin:"round",dashArray:null,dashOffset:null,fill:!1,fillColor:null,fillOpacity:.2,fillRule:"evenodd",interactive:!0,bubblingMouseEvents:!0},beforeAdd:function(n){this._renderer=n.getRenderer(this)},onAdd:function(){this._renderer._initPath(this),this._reset(),this._renderer._addPath(this)},onRemove:function(){this._renderer._removePath(this)},redraw:function(){return this._map&&this._renderer._updatePath(this),this},setStyle:function(n){return k(this,n),this._renderer&&(this._renderer._updateStyle(this),this.options.stroke&&n&&Object.prototype.hasOwnProperty.call(n,"weight")&&this._updateBounds()),this},bringToFront:function(){return this._renderer&&this._renderer._bringToFront(this),this},bringToBack:function(){return this._renderer&&this._renderer._bringToBack(this),this},getElement:function(){return this._path},_reset:function(){this._project(),this._update()},_clickTolerance:function(){return(this.options.stroke?this.options.weight/2:0)+(this._renderer.options.tolerance||0)}}),Co=_n.extend({options:{fill:!0,radius:10},initialize:function(n,o){k(this,o),this._latlng=q(n),this._radius=this.options.radius},setLatLng:function(n){var o=this._latlng;return this._latlng=q(n),this.redraw(),this.fire("move",{oldLatLng:o,latlng:this._latlng})},getLatLng:function(){return this._latlng},setRadius:function(n){return this.options.radius=this._radius=n,this.redraw()},getRadius:function(){return this._radius},setStyle:function(n){var o=n&&n.radius||this._radius;return _n.prototype.setStyle.call(this,n),this.setRadius(o),this},_project:function(){this._point=this._map.latLngToLayerPoint(this._latlng),this._updateBounds()},_updateBounds:function(){var n=this._radius,o=this._radiusY||n,s=this._clickTolerance(),c=[n+s,o+s];this._pxBounds=new Y(this._point.subtract(c),this._point.add(c))},_update:function(){this._map&&this._updatePath()},_updatePath:function(){this._renderer._updateCircle(this)},_empty:function(){return this._radius&&!this._renderer._bounds.intersects(this._pxBounds)},_containsPoint:function(n){return n.distanceTo(this._point)<=this._radius+this._clickTolerance()}});function $v(n,o){return new Co(n,o)}var $s=Co.extend({initialize:function(n,o,s){if(typeof o=="number"&&(o=a({},s,{radius:o})),k(this,o),this._latlng=q(n),isNaN(this.options.radius))throw new Error("Circle radius cannot be NaN");this._mRadius=this.options.radius},setRadius:function(n){return this._mRadius=n,this.redraw()},getRadius:function(){return this._mRadius},getBounds:function(){var n=[this._radius,this._radiusY||this._radius];return new Te(this._map.layerPointToLatLng(this._point.subtract(n)),this._map.layerPointToLatLng(this._point.add(n)))},setStyle:_n.prototype.setStyle,_project:function(){var n=this._latlng.lng,o=this._latlng.lat,s=this._map,c=s.options.crs;if(c.distance===it.distance){var f=Math.PI/180,m=this._mRadius/it.R/f,S=s.project([o+m,n]),M=s.project([o-m,n]),A=S.add(M).divideBy(2),F=s.unproject(A).lat,W=Math.acos((Math.cos(m*f)-Math.sin(o*f)*Math.sin(F*f))/(Math.cos(o*f)*Math.cos(F*f)))/f;(isNaN(W)||W===0)&&(W=m/Math.cos(Math.PI/180*o)),this._point=A.subtract(s.getPixelOrigin()),this._radius=isNaN(W)?0:A.x-s.project([F,n-W]).x,this._radiusY=A.y-S.y}else{var $=c.unproject(c.project(this._latlng).subtract([this._mRadius,0]));this._point=s.latLngToLayerPoint(this._latlng),this._radius=this._point.x-s.latLngToLayerPoint($).x}this._updateBounds()}});function qv(n,o,s){return new $s(n,o,s)}var Xt=_n.extend({options:{smoothFactor:1,noClip:!1},initialize:function(n,o){k(this,o),this._setLatLngs(n)},getLatLngs:function(){return this._latlngs},setLatLngs:function(n){return this._setLatLngs(n),this.redraw()},isEmpty:function(){return!this._latlngs.length},closestLayerPoint:function(n){for(var o=1/0,s=null,c=gi,f,m,S=0,M=this._parts.length;S<M;S++)for(var A=this._parts[S],F=1,W=A.length;F<W;F++){f=A[F-1],m=A[F];var $=c(n,f,m,!0);$<o&&(o=$,s=c(n,f,m))}return s&&(s.distance=Math.sqrt(o)),s},getCenter:function(){if(!this._map)throw new Error("Must add layer to map before using getCenter()");return Md(this._defaultShape(),this._map.options.crs)},getBounds:function(){return this._bounds},addLatLng:function(n,o){return o=o||this._defaultShape(),n=q(n),o.push(n),this._bounds.extend(n),this.redraw()},_setLatLngs:function(n){this._bounds=new Te,this._latlngs=this._convertLatLngs(n)},_defaultShape:function(){return wt(this._latlngs)?this._latlngs:this._latlngs[0]},_convertLatLngs:function(n){for(var o=[],s=wt(n),c=0,f=n.length;c<f;c++)s?(o[c]=q(n[c]),this._bounds.extend(o[c])):o[c]=this._convertLatLngs(n[c]);return o},_project:function(){var n=new Y;this._rings=[],this._projectLatlngs(this._latlngs,this._rings,n),this._bounds.isValid()&&n.isValid()&&(this._rawPxBounds=n,this._updateBounds())},_updateBounds:function(){var n=this._clickTolerance(),o=new I(n,n);this._rawPxBounds&&(this._pxBounds=new Y([this._rawPxBounds.min.subtract(o),this._rawPxBounds.max.add(o)]))},_projectLatlngs:function(n,o,s){var c=n[0]instanceof ae,f=n.length,m,S;if(c){for(S=[],m=0;m<f;m++)S[m]=this._map.latLngToLayerPoint(n[m]),s.extend(S[m]);o.push(S)}else for(m=0;m<f;m++)this._projectLatlngs(n[m],o,s)},_clipPoints:function(){var n=this._renderer._bounds;if(this._parts=[],!(!this._pxBounds||!this._pxBounds.intersects(n))){if(this.options.noClip){this._parts=this._rings;return}var o=this._parts,s,c,f,m,S,M,A;for(s=0,f=0,m=this._rings.length;s<m;s++)for(A=this._rings[s],c=0,S=A.length;c<S-1;c++)M=Ld(A[c],A[c+1],n,c,!0),M&&(o[f]=o[f]||[],o[f].push(M[0]),(M[1]!==A[c+1]||c===S-2)&&(o[f].push(M[1]),f++))}},_simplifyPoints:function(){for(var n=this._parts,o=this.options.smoothFactor,s=0,c=n.length;s<c;s++)n[s]=Pd(n[s],o)},_update:function(){this._map&&(this._clipPoints(),this._simplifyPoints(),this._updatePath())},_updatePath:function(){this._renderer._updatePoly(this)},_containsPoint:function(n,o){var s,c,f,m,S,M,A=this._clickTolerance();if(!this._pxBounds||!this._pxBounds.contains(n))return!1;for(s=0,m=this._parts.length;s<m;s++)for(M=this._parts[s],c=0,S=M.length,f=S-1;c<S;f=c++)if(!(!o&&c===0)&&Td(n,M[f],M[c])<=A)return!0;return!1}});function Jv(n,o){return new Xt(n,o)}Xt._flat=zd;var _r=Xt.extend({options:{fill:!0},isEmpty:function(){return!this._latlngs.length||!this._latlngs[0].length},getCenter:function(){if(!this._map)throw new Error("Must add layer to map before using getCenter()");return Cd(this._defaultShape(),this._map.options.crs)},_convertLatLngs:function(n){var o=Xt.prototype._convertLatLngs.call(this,n),s=o.length;return s>=2&&o[0]instanceof ae&&o[0].equals(o[s-1])&&o.pop(),o},_setLatLngs:function(n){Xt.prototype._setLatLngs.call(this,n),wt(this._latlngs)&&(this._latlngs=[this._latlngs])},_defaultShape:function(){return wt(this._latlngs[0])?this._latlngs[0]:this._latlngs[0][0]},_clipPoints:function(){var n=this._renderer._bounds,o=this.options.weight,s=new I(o,o);if(n=new Y(n.min.subtract(s),n.max.add(s)),this._parts=[],!(!this._pxBounds||!this._pxBounds.intersects(n))){if(this.options.noClip){this._parts=this._rings;return}for(var c=0,f=this._rings.length,m;c<f;c++)m=Sd(this._rings[c],n,!0),m.length&&this._parts.push(m)}},_updatePath:function(){this._renderer._updatePoly(this,!0)},_containsPoint:function(n){var o=!1,s,c,f,m,S,M,A,F;if(!this._pxBounds||!this._pxBounds.contains(n))return!1;for(m=0,A=this._parts.length;m<A;m++)for(s=this._parts[m],S=0,F=s.length,M=F-1;S<F;M=S++)c=s[S],f=s[M],c.y>n.y!=f.y>n.y&&n.x<(f.x-c.x)*(n.y-c.y)/(f.y-c.y)+c.x&&(o=!o);return o||Xt.prototype._containsPoint.call(this,n,!0)}});function Xv(n,o){return new _r(n,o)}var en=Jt.extend({initialize:function(n,o){k(this,o),this._layers={},n&&this.addData(n)},addData:function(n){var o=v(n)?n:n.features,s,c,f;if(o){for(s=0,c=o.length;s<c;s++)f=o[s],(f.geometries||f.geometry||f.features||f.coordinates)&&this.addData(f);return this}var m=this.options;if(m.filter&&!m.filter(n))return this;var S=Po(n,m);return S?(S.feature=Lo(n),S.defaultOptions=S.options,this.resetStyle(S),m.onEachFeature&&m.onEachFeature(n,S),this.addLayer(S)):this},resetStyle:function(n){return n===void 0?this.eachLayer(this.resetStyle,this):(n.options=a({},n.defaultOptions),this._setLayerStyle(n,this.options.style),this)},setStyle:function(n){return this.eachLayer(function(o){this._setLayerStyle(o,n)},this)},_setLayerStyle:function(n,o){n.setStyle&&(typeof o=="function"&&(o=o(n.feature)),n.setStyle(o))}});function Po(n,o){var s=n.type==="Feature"?n.geometry:n,c=s?s.coordinates:null,f=[],m=o&&o.pointToLayer,S=o&&o.coordsToLatLng||qs,M,A,F,W;if(!c&&!s)return null;switch(s.type){case"Point":return M=S(c),Od(m,n,M,o);case"MultiPoint":for(F=0,W=c.length;F<W;F++)M=S(c[F]),f.push(Od(m,n,M,o));return new Jt(f);case"LineString":case"MultiLineString":return A=To(c,s.type==="LineString"?0:1,S),new Xt(A,o);case"Polygon":case"MultiPolygon":return A=To(c,s.type==="Polygon"?1:2,S),new _r(A,o);case"GeometryCollection":for(F=0,W=s.geometries.length;F<W;F++){var $=Po({geometry:s.geometries[F],type:"Feature",properties:n.properties},o);$&&f.push($)}return new Jt(f);case"FeatureCollection":for(F=0,W=s.features.length;F<W;F++){var ie=Po(s.features[F],o);ie&&f.push(ie)}return new Jt(f);default:throw new Error("Invalid GeoJSON object.")}}function Od(n,o,s,c){return n?n(o,s):new So(s,c&&c.markersInheritOptions&&c)}function qs(n){return new ae(n[1],n[0],n[2])}function To(n,o,s){for(var c=[],f=0,m=n.length,S;f<m;f++)S=o?To(n[f],o-1,s):(s||qs)(n[f]),c.push(S);return c}function Js(n,o){return n=q(n),n.alt!==void 0?[y(n.lng,o),y(n.lat,o),y(n.alt,o)]:[y(n.lng,o),y(n.lat,o)]}function Eo(n,o,s,c){for(var f=[],m=0,S=n.length;m<S;m++)f.push(o?Eo(n[m],wt(n[m])?0:o-1,s,c):Js(n[m],c));return!o&&s&&f.length>0&&f.push(f[0].slice()),f}function yr(n,o){return n.feature?a({},n.feature,{geometry:o}):Lo(o)}function Lo(n){return n.type==="Feature"||n.type==="FeatureCollection"?n:{type:"Feature",properties:{},geometry:n}}var Xs={toGeoJSON:function(n){return yr(this,{type:"Point",coordinates:Js(this.getLatLng(),n)})}};So.include(Xs),$s.include(Xs),Co.include(Xs),Xt.include({toGeoJSON:function(n){var o=!wt(this._latlngs),s=Eo(this._latlngs,o?1:0,!1,n);return yr(this,{type:(o?"Multi":"")+"LineString",coordinates:s})}}),_r.include({toGeoJSON:function(n){var o=!wt(this._latlngs),s=o&&!wt(this._latlngs[0]),c=Eo(this._latlngs,s?2:o?1:0,!0,n);return o||(c=[c]),yr(this,{type:(s?"Multi":"")+"Polygon",coordinates:c})}}),gr.include({toMultiPoint:function(n){var o=[];return this.eachLayer(function(s){o.push(s.toGeoJSON(n).geometry.coordinates)}),yr(this,{type:"MultiPoint",coordinates:o})},toGeoJSON:function(n){var o=this.feature&&this.feature.geometry&&this.feature.geometry.type;if(o==="MultiPoint")return this.toMultiPoint(n);var s=o==="GeometryCollection",c=[];return this.eachLayer(function(f){if(f.toGeoJSON){var m=f.toGeoJSON(n);if(s)c.push(m.geometry);else{var S=Lo(m);S.type==="FeatureCollection"?c.push.apply(c,S.features):c.push(S)}}}),s?yr(this,{geometries:c,type:"GeometryCollection"}):{type:"FeatureCollection",features:c}}});function Id(n,o){return new en(n,o)}var e_=Id,zo=Nt.extend({options:{opacity:1,alt:"",interactive:!1,crossOrigin:!1,errorOverlayUrl:"",zIndex:1,className:""},initialize:function(n,o,s){this._url=n,this._bounds=de(o),k(this,s)},onAdd:function(){this._image||(this._initImage(),this.options.opacity<1&&this._updateOpacity()),this.options.interactive&&(ne(this._image,"leaflet-interactive"),this.addInteractiveTarget(this._image)),this.getPane().appendChild(this._image),this._reset()},onRemove:function(){ke(this._image),this.options.interactive&&this.removeInteractiveTarget(this._image)},setOpacity:function(n){return this.options.opacity=n,this._image&&this._updateOpacity(),this},setStyle:function(n){return n.opacity&&this.setOpacity(n.opacity),this},bringToFront:function(){return this._map&&pr(this._image),this},bringToBack:function(){return this._map&&mr(this._image),this},setUrl:function(n){return this._url=n,this._image&&(this._image.src=n),this},setBounds:function(n){return this._bounds=de(n),this._map&&this._reset(),this},getEvents:function(){var n={zoom:this._reset,viewreset:this._reset};return this._zoomAnimated&&(n.zoomanim=this._animateZoom),n},setZIndex:function(n){return this.options.zIndex=n,this._updateZIndex(),this},getBounds:function(){return this._bounds},getElement:function(){return this._image},_initImage:function(){var n=this._url.tagName==="IMG",o=this._image=n?this._url:fe("img");if(ne(o,"leaflet-image-layer"),this._zoomAnimated&&ne(o,"leaflet-zoom-animated"),this.options.className&&ne(o,this.options.className),o.onselectstart=_,o.onmousemove=_,o.onload=u(this.fire,this,"load"),o.onerror=u(this._overlayOnError,this,"error"),(this.options.crossOrigin||this.options.crossOrigin==="")&&(o.crossOrigin=this.options.crossOrigin===!0?"":this.options.crossOrigin),this.options.zIndex&&this._updateZIndex(),n){this._url=o.src;return}o.src=this._url,o.alt=this.options.alt},_animateZoom:function(n){var o=this._map.getZoomScale(n.zoom),s=this._map._latLngBoundsToNewLayerBounds(this._bounds,n.zoom,n.center).min;Vn(this._image,s,o)},_reset:function(){var n=this._image,o=new Y(this._map.latLngToLayerPoint(this._bounds.getNorthWest()),this._map.latLngToLayerPoint(this._bounds.getSouthEast())),s=o.getSize();Ae(n,o.min),n.style.width=s.x+"px",n.style.height=s.y+"px"},_updateOpacity:function(){xt(this._image,this.options.opacity)},_updateZIndex:function(){this._image&&this.options.zIndex!==void 0&&this.options.zIndex!==null&&(this._image.style.zIndex=this.options.zIndex)},_overlayOnError:function(){this.fire("error");var n=this.options.errorOverlayUrl;n&&this._url!==n&&(this._url=n,this._image.src=n)},getCenter:function(){return this._bounds.getCenter()}}),t_=function(n,o,s){return new zo(n,o,s)},Rd=zo.extend({options:{autoplay:!0,loop:!0,keepAspectRatio:!0,muted:!1,playsInline:!0},_initImage:function(){var n=this._url.tagName==="VIDEO",o=this._image=n?this._url:fe("video");if(ne(o,"leaflet-image-layer"),this._zoomAnimated&&ne(o,"leaflet-zoom-animated"),this.options.className&&ne(o,this.options.className),o.onselectstart=_,o.onmousemove=_,o.onloadeddata=u(this.fire,this,"load"),n){for(var s=o.getElementsByTagName("source"),c=[],f=0;f<s.length;f++)c.push(s[f].src);this._url=s.length>0?c:[o.src];return}v(this._url)||(this._url=[this._url]),!this.options.keepAspectRatio&&Object.prototype.hasOwnProperty.call(o.style,"objectFit")&&(o.style.objectFit="fill"),o.autoplay=!!this.options.autoplay,o.loop=!!this.options.loop,o.muted=!!this.options.muted,o.playsInline=!!this.options.playsInline;for(var m=0;m<this._url.length;m++){var S=fe("source");S.src=this._url[m],o.appendChild(S)}}});function n_(n,o,s){return new Rd(n,o,s)}var Dd=zo.extend({_initImage:function(){var n=this._image=this._url;ne(n,"leaflet-image-layer"),this._zoomAnimated&&ne(n,"leaflet-zoom-animated"),this.options.className&&ne(n,this.options.className),n.onselectstart=_,n.onmousemove=_}});function r_(n,o,s){return new Dd(n,o,s)}var Vt=Nt.extend({options:{interactive:!1,offset:[0,0],className:"",pane:void 0,content:""},initialize:function(n,o){n&&(n instanceof ae||v(n))?(this._latlng=q(n),k(this,o)):(k(this,n),this._source=o),this.options.content&&(this._content=this.options.content)},openOn:function(n){return n=arguments.length?n:this._source._map,n.hasLayer(this)||n.addLayer(this),this},close:function(){return this._map&&this._map.removeLayer(this),this},toggle:function(n){return this._map?this.close():(arguments.length?this._source=n:n=this._source,this._prepareOpen(),this.openOn(n._map)),this},onAdd:function(n){this._zoomAnimated=n._zoomAnimated,this._container||this._initLayout(),n._fadeAnimated&&xt(this._container,0),clearTimeout(this._removeTimeout),this.getPane().appendChild(this._container),this.update(),n._fadeAnimated&&xt(this._container,1),this.bringToFront(),this.options.interactive&&(ne(this._container,"leaflet-interactive"),this.addInteractiveTarget(this._container))},onRemove:function(n){n._fadeAnimated?(xt(this._container,0),this._removeTimeout=setTimeout(u(ke,void 0,this._container),200)):ke(this._container),this.options.interactive&&(Le(this._container,"leaflet-interactive"),this.removeInteractiveTarget(this._container))},getLatLng:function(){return this._latlng},setLatLng:function(n){return this._latlng=q(n),this._map&&(this._updatePosition(),this._adjustPan()),this},getContent:function(){return this._content},setContent:function(n){return this._content=n,this.update(),this},getElement:function(){return this._container},update:function(){this._map&&(this._container.style.visibility="hidden",this._updateContent(),this._updateLayout(),this._updatePosition(),this._container.style.visibility="",this._adjustPan())},getEvents:function(){var n={zoom:this._updatePosition,viewreset:this._updatePosition};return this._zoomAnimated&&(n.zoomanim=this._animateZoom),n},isOpen:function(){return!!this._map&&this._map.hasLayer(this)},bringToFront:function(){return this._map&&pr(this._container),this},bringToBack:function(){return this._map&&mr(this._container),this},_prepareOpen:function(n){var o=this._source;if(!o._map)return!1;if(o instanceof Jt){o=null;var s=this._source._layers;for(var c in s)if(s[c]._map){o=s[c];break}if(!o)return!1;this._source=o}if(!n)if(o.getCenter)n=o.getCenter();else if(o.getLatLng)n=o.getLatLng();else if(o.getBounds)n=o.getBounds().getCenter();else throw new Error("Unable to get source layer LatLng.");return this.setLatLng(n),this._map&&this.update(),!0},_updateContent:function(){if(this._content){var n=this._contentNode,o=typeof this._content=="function"?this._content(this._source||this):this._content;if(typeof o=="string")n.innerHTML=o;else{for(;n.hasChildNodes();)n.removeChild(n.firstChild);n.appendChild(o)}this.fire("contentupdate")}},_updatePosition:function(){if(this._map){var n=this._map.latLngToLayerPoint(this._latlng),o=j(this.options.offset),s=this._getAnchor();this._zoomAnimated?Ae(this._container,n.add(s)):o=o.add(n).add(s);var c=this._containerBottom=-o.y,f=this._containerLeft=-Math.round(this._containerWidth/2)+o.x;this._container.style.bottom=c+"px",this._container.style.left=f+"px"}},_getAnchor:function(){return[0,0]}});ue.include({_initOverlay:function(n,o,s,c){var f=o;return f instanceof n||(f=new n(c).setContent(o)),s&&f.setLatLng(s),f}}),Nt.include({_initOverlay:function(n,o,s,c){var f=s;return f instanceof n?(k(f,c),f._source=this):(f=o&&!c?o:new n(c,this),f.setContent(s)),f}});var Mo=Vt.extend({options:{pane:"popupPane",offset:[0,7],maxWidth:300,minWidth:50,maxHeight:null,autoPan:!0,autoPanPaddingTopLeft:null,autoPanPaddingBottomRight:null,autoPanPadding:[5,5],keepInView:!1,closeButton:!0,autoClose:!0,closeOnEscapeKey:!0,className:""},openOn:function(n){return n=arguments.length?n:this._source._map,!n.hasLayer(this)&&n._popup&&n._popup.options.autoClose&&n.removeLayer(n._popup),n._popup=this,Vt.prototype.openOn.call(this,n)},onAdd:function(n){Vt.prototype.onAdd.call(this,n),n.fire("popupopen",{popup:this}),this._source&&(this._source.fire("popupopen",{popup:this},!0),this._source instanceof _n||this._source.on("preclick",Kn))},onRemove:function(n){Vt.prototype.onRemove.call(this,n),n.fire("popupclose",{popup:this}),this._source&&(this._source.fire("popupclose",{popup:this},!0),this._source instanceof _n||this._source.off("preclick",Kn))},getEvents:function(){var n=Vt.prototype.getEvents.call(this);return(this.options.closeOnClick!==void 0?this.options.closeOnClick:this._map.options.closePopupOnClick)&&(n.preclick=this.close),this.options.keepInView&&(n.moveend=this._adjustPan),n},_initLayout:function(){var n="leaflet-popup",o=this._container=fe("div",n+" "+(this.options.className||"")+" leaflet-zoom-animated"),s=this._wrapper=fe("div",n+"-content-wrapper",o);if(this._contentNode=fe("div",n+"-content",s),pi(o),Hs(this._contentNode),te(o,"contextmenu",Kn),this._tipContainer=fe("div",n+"-tip-container",o),this._tip=fe("div",n+"-tip",this._tipContainer),this.options.closeButton){var c=this._closeButton=fe("a",n+"-close-button",o);c.setAttribute("role","button"),c.setAttribute("aria-label","Close popup"),c.href="#close",c.innerHTML='<span aria-hidden="true">&#215;</span>',te(c,"click",function(f){Ue(f),this.close()},this)}},_updateLayout:function(){var n=this._contentNode,o=n.style;o.width="",o.whiteSpace="nowrap";var s=n.offsetWidth;s=Math.min(s,this.options.maxWidth),s=Math.max(s,this.options.minWidth),o.width=s+1+"px",o.whiteSpace="",o.height="";var c=n.offsetHeight,f=this.options.maxHeight,m="leaflet-popup-scrolled";f&&c>f?(o.height=f+"px",ne(n,m)):Le(n,m),this._containerWidth=this._container.offsetWidth},_animateZoom:function(n){var o=this._map._latLngToNewLayerPoint(this._latlng,n.zoom,n.center),s=this._getAnchor();Ae(this._container,o.add(s))},_adjustPan:function(){if(this.options.autoPan){if(this._map._panAnim&&this._map._panAnim.stop(),this._autopanning){this._autopanning=!1;return}var n=this._map,o=parseInt(ci(this._container,"marginBottom"),10)||0,s=this._container.offsetHeight+o,c=this._containerWidth,f=new I(this._containerLeft,-s-this._containerBottom);f._add(Gn(this._container));var m=n.layerPointToContainerPoint(f),S=j(this.options.autoPanPadding),M=j(this.options.autoPanPaddingTopLeft||S),A=j(this.options.autoPanPaddingBottomRight||S),F=n.getSize(),W=0,$=0;m.x+c+A.x>F.x&&(W=m.x+c-F.x+A.x),m.x-W-M.x<0&&(W=m.x-M.x),m.y+s+A.y>F.y&&($=m.y+s-F.y+A.y),m.y-$-M.y<0&&($=m.y-M.y),(W||$)&&(this.options.keepInView&&(this._autopanning=!0),n.fire("autopanstart").panBy([W,$]))}},_getAnchor:function(){return j(this._source&&this._source._getPopupAnchor?this._source._getPopupAnchor():[0,0])}}),i_=function(n,o){return new Mo(n,o)};ue.mergeOptions({closePopupOnClick:!0}),ue.include({openPopup:function(n,o,s){return this._initOverlay(Mo,n,o,s).openOn(this),this},closePopup:function(n){return n=arguments.length?n:this._popup,n&&n.close(),this}}),Nt.include({bindPopup:function(n,o){return this._popup=this._initOverlay(Mo,this._popup,n,o),this._popupHandlersAdded||(this.on({click:this._openPopup,keypress:this._onKeyPress,remove:this.closePopup,move:this._movePopup}),this._popupHandlersAdded=!0),this},unbindPopup:function(){return this._popup&&(this.off({click:this._openPopup,keypress:this._onKeyPress,remove:this.closePopup,move:this._movePopup}),this._popupHandlersAdded=!1,this._popup=null),this},openPopup:function(n){return this._popup&&(this instanceof Jt||(this._popup._source=this),this._popup._prepareOpen(n||this._latlng)&&this._popup.openOn(this._map)),this},closePopup:function(){return this._popup&&this._popup.close(),this},togglePopup:function(){return this._popup&&this._popup.toggle(this),this},isPopupOpen:function(){return this._popup?this._popup.isOpen():!1},setPopupContent:function(n){return this._popup&&this._popup.setContent(n),this},getPopup:function(){return this._popup},_openPopup:function(n){if(!(!this._popup||!this._map)){Yn(n);var o=n.layer||n.target;if(this._popup._source===o&&!(o instanceof _n)){this._map.hasLayer(this._popup)?this.closePopup():this.openPopup(n.latlng);return}this._popup._source=o,this.openPopup(n.latlng)}},_movePopup:function(n){this._popup.setLatLng(n.latlng)},_onKeyPress:function(n){n.originalEvent.keyCode===13&&this._openPopup(n)}});var No=Vt.extend({options:{pane:"tooltipPane",offset:[0,0],direction:"auto",permanent:!1,sticky:!1,opacity:.9},onAdd:function(n){Vt.prototype.onAdd.call(this,n),this.setOpacity(this.options.opacity),n.fire("tooltipopen",{tooltip:this}),this._source&&(this.addEventParent(this._source),this._source.fire("tooltipopen",{tooltip:this},!0))},onRemove:function(n){Vt.prototype.onRemove.call(this,n),n.fire("tooltipclose",{tooltip:this}),this._source&&(this.removeEventParent(this._source),this._source.fire("tooltipclose",{tooltip:this},!0))},getEvents:function(){var n=Vt.prototype.getEvents.call(this);return this.options.permanent||(n.preclick=this.close),n},_initLayout:function(){var n="leaflet-tooltip",o=n+" "+(this.options.className||"")+" leaflet-zoom-"+(this._zoomAnimated?"animated":"hide");this._contentNode=this._container=fe("div",o),this._container.setAttribute("role","tooltip"),this._container.setAttribute("id","leaflet-tooltip-"+h(this))},_updateLayout:function(){},_adjustPan:function(){},_setPosition:function(n){var o,s,c=this._map,f=this._container,m=c.latLngToContainerPoint(c.getCenter()),S=c.layerPointToContainerPoint(n),M=this.options.direction,A=f.offsetWidth,F=f.offsetHeight,W=j(this.options.offset),$=this._getAnchor();M==="top"?(o=A/2,s=F):M==="bottom"?(o=A/2,s=0):M==="center"?(o=A/2,s=F/2):M==="right"?(o=0,s=F/2):M==="left"?(o=A,s=F/2):S.x<m.x?(M="right",o=0,s=F/2):(M="left",o=A+(W.x+$.x)*2,s=F/2),n=n.subtract(j(o,s,!0)).add(W).add($),Le(f,"leaflet-tooltip-right"),Le(f,"leaflet-tooltip-left"),Le(f,"leaflet-tooltip-top"),Le(f,"leaflet-tooltip-bottom"),ne(f,"leaflet-tooltip-"+M),Ae(f,n)},_updatePosition:function(){var n=this._map.latLngToLayerPoint(this._latlng);this._setPosition(n)},setOpacity:function(n){this.options.opacity=n,this._container&&xt(this._container,n)},_animateZoom:function(n){var o=this._map._latLngToNewLayerPoint(this._latlng,n.zoom,n.center);this._setPosition(o)},_getAnchor:function(){return j(this._source&&this._source._getTooltipAnchor&&!this.options.sticky?this._source._getTooltipAnchor():[0,0])}}),o_=function(n,o){return new No(n,o)};ue.include({openTooltip:function(n,o,s){return this._initOverlay(No,n,o,s).openOn(this),this},closeTooltip:function(n){return n.close(),this}}),Nt.include({bindTooltip:function(n,o){return this._tooltip&&this.isTooltipOpen()&&this.unbindTooltip(),this._tooltip=this._initOverlay(No,this._tooltip,n,o),this._initTooltipInteractions(),this._tooltip.options.permanent&&this._map&&this._map.hasLayer(this)&&this.openTooltip(),this},unbindTooltip:function(){return this._tooltip&&(this._initTooltipInteractions(!0),this.closeTooltip(),this._tooltip=null),this},_initTooltipInteractions:function(n){if(!(!n&&this._tooltipHandlersAdded)){var o=n?"off":"on",s={remove:this.closeTooltip,move:this._moveTooltip};this._tooltip.options.permanent?s.add=this._openTooltip:(s.mouseover=this._openTooltip,s.mouseout=this.closeTooltip,s.click=this._openTooltip,this._map?this._addFocusListeners():s.add=this._addFocusListeners),this._tooltip.options.sticky&&(s.mousemove=this._moveTooltip),this[o](s),this._tooltipHandlersAdded=!n}},openTooltip:function(n){return this._tooltip&&(this instanceof Jt||(this._tooltip._source=this),this._tooltip._prepareOpen(n)&&(this._tooltip.openOn(this._map),this.getElement?this._setAriaDescribedByOnLayer(this):this.eachLayer&&this.eachLayer(this._setAriaDescribedByOnLayer,this))),this},closeTooltip:function(){if(this._tooltip)return this._tooltip.close()},toggleTooltip:function(){return this._tooltip&&this._tooltip.toggle(this),this},isTooltipOpen:function(){return this._tooltip.isOpen()},setTooltipContent:function(n){return this._tooltip&&this._tooltip.setContent(n),this},getTooltip:function(){return this._tooltip},_addFocusListeners:function(){this.getElement?this._addFocusListenersOnLayer(this):this.eachLayer&&this.eachLayer(this._addFocusListenersOnLayer,this)},_addFocusListenersOnLayer:function(n){var o=typeof n.getElement=="function"&&n.getElement();o&&(te(o,"focus",function(){this._tooltip._source=n,this.openTooltip()},this),te(o,"blur",this.closeTooltip,this))},_setAriaDescribedByOnLayer:function(n){var o=typeof n.getElement=="function"&&n.getElement();o&&o.setAttribute("aria-describedby",this._tooltip._container.id)},_openTooltip:function(n){if(!(!this._tooltip||!this._map)){if(this._map.dragging&&this._map.dragging.moving()&&!this._openOnceFlag){this._openOnceFlag=!0;var o=this;this._map.once("moveend",function(){o._openOnceFlag=!1,o._openTooltip(n)});return}this._tooltip._source=n.layer||n.target,this.openTooltip(this._tooltip.options.sticky?n.latlng:void 0)}},_moveTooltip:function(n){var o=n.latlng,s,c;this._tooltip.options.sticky&&n.originalEvent&&(s=this._map.mouseEventToContainerPoint(n.originalEvent),c=this._map.containerPointToLayerPoint(s),o=this._map.layerPointToLatLng(c)),this._tooltip.setLatLng(o)}});var jd=vr.extend({options:{iconSize:[12,12],html:!1,bgPos:null,className:"leaflet-div-icon"},createIcon:function(n){var o=n&&n.tagName==="DIV"?n:document.createElement("div"),s=this.options;if(s.html instanceof Element?(_o(o),o.appendChild(s.html)):o.innerHTML=s.html!==!1?s.html:"",s.bgPos){var c=j(s.bgPos);o.style.backgroundPosition=-c.x+"px "+-c.y+"px"}return this._setIconStyles(o,"icon"),o},createShadow:function(){return null}});function a_(n){return new jd(n)}vr.Default=vi;var _i=Nt.extend({options:{tileSize:256,opacity:1,updateWhenIdle:Q.mobile,updateWhenZooming:!0,updateInterval:200,zIndex:1,bounds:null,minZoom:0,maxZoom:void 0,maxNativeZoom:void 0,minNativeZoom:void 0,noWrap:!1,pane:"tilePane",className:"",keepBuffer:2},initialize:function(n){k(this,n)},onAdd:function(){this._initContainer(),this._levels={},this._tiles={},this._resetView()},beforeAdd:function(n){n._addZoomLimit(this)},onRemove:function(n){this._removeAllTiles(),ke(this._container),n._removeZoomLimit(this),this._container=null,this._tileZoom=void 0},bringToFront:function(){return this._map&&(pr(this._container),this._setAutoZIndex(Math.max)),this},bringToBack:function(){return this._map&&(mr(this._container),this._setAutoZIndex(Math.min)),this},getContainer:function(){return this._container},setOpacity:function(n){return this.options.opacity=n,this._updateOpacity(),this},setZIndex:function(n){return this.options.zIndex=n,this._updateZIndex(),this},isLoading:function(){return this._loading},redraw:function(){if(this._map){this._removeAllTiles();var n=this._clampZoom(this._map.getZoom());n!==this._tileZoom&&(this._tileZoom=n,this._updateLevels()),this._update()}return this},getEvents:function(){var n={viewprereset:this._invalidateAll,viewreset:this._resetView,zoom:this._resetView,moveend:this._onMoveEnd};return this.options.updateWhenIdle||(this._onMove||(this._onMove=p(this._onMoveEnd,this.options.updateInterval,this)),n.move=this._onMove),this._zoomAnimated&&(n.zoomanim=this._animateZoom),n},createTile:function(){return document.createElement("div")},getTileSize:function(){var n=this.options.tileSize;return n instanceof I?n:new I(n,n)},_updateZIndex:function(){this._container&&this.options.zIndex!==void 0&&this.options.zIndex!==null&&(this._container.style.zIndex=this.options.zIndex)},_setAutoZIndex:function(n){for(var o=this.getPane().children,s=-n(-1/0,1/0),c=0,f=o.length,m;c<f;c++)m=o[c].style.zIndex,o[c]!==this._container&&m&&(s=n(s,+m));isFinite(s)&&(this.options.zIndex=s+n(-1,1),this._updateZIndex())},_updateOpacity:function(){if(this._map&&!Q.ielt9){xt(this._container,this.options.opacity);var n=+new Date,o=!1,s=!1;for(var c in this._tiles){var f=this._tiles[c];if(!(!f.current||!f.loaded)){var m=Math.min(1,(n-f.loaded)/200);xt(f.el,m),m<1?o=!0:(f.active?s=!0:this._onOpaqueTile(f),f.active=!0)}}s&&!this._noPrune&&this._pruneTiles(),o&&(oe(this._fadeFrame),this._fadeFrame=V(this._updateOpacity,this))}},_onOpaqueTile:_,_initContainer:function(){this._container||(this._container=fe("div","leaflet-layer "+(this.options.className||"")),this._updateZIndex(),this.options.opacity<1&&this._updateOpacity(),this.getPane().appendChild(this._container))},_updateLevels:function(){var n=this._tileZoom,o=this.options.maxZoom;if(n!==void 0){for(var s in this._levels)s=Number(s),this._levels[s].el.children.length||s===n?(this._levels[s].el.style.zIndex=o-Math.abs(n-s),this._onUpdateLevel(s)):(ke(this._levels[s].el),this._removeTilesAtZoom(s),this._onRemoveLevel(s),delete this._levels[s]);var c=this._levels[n],f=this._map;return c||(c=this._levels[n]={},c.el=fe("div","leaflet-tile-container leaflet-zoom-animated",this._container),c.el.style.zIndex=o,c.origin=f.project(f.unproject(f.getPixelOrigin()),n).round(),c.zoom=n,this._setZoomTransform(c,f.getCenter(),f.getZoom()),_(c.el.offsetWidth),this._onCreateLevel(c)),this._level=c,c}},_onUpdateLevel:_,_onRemoveLevel:_,_onCreateLevel:_,_pruneTiles:function(){if(this._map){var n,o,s=this._map.getZoom();if(s>this.options.maxZoom||s<this.options.minZoom){this._removeAllTiles();return}for(n in this._tiles)o=this._tiles[n],o.retain=o.current;for(n in this._tiles)if(o=this._tiles[n],o.current&&!o.active){var c=o.coords;this._retainParent(c.x,c.y,c.z,c.z-5)||this._retainChildren(c.x,c.y,c.z,c.z+2)}for(n in this._tiles)this._tiles[n].retain||this._removeTile(n)}},_removeTilesAtZoom:function(n){for(var o in this._tiles)this._tiles[o].coords.z===n&&this._removeTile(o)},_removeAllTiles:function(){for(var n in this._tiles)this._removeTile(n)},_invalidateAll:function(){for(var n in this._levels)ke(this._levels[n].el),this._onRemoveLevel(Number(n)),delete this._levels[n];this._removeAllTiles(),this._tileZoom=void 0},_retainParent:function(n,o,s,c){var f=Math.floor(n/2),m=Math.floor(o/2),S=s-1,M=new I(+f,+m);M.z=+S;var A=this._tileCoordsToKey(M),F=this._tiles[A];return F&&F.active?(F.retain=!0,!0):(F&&F.loaded&&(F.retain=!0),S>c?this._retainParent(f,m,S,c):!1)},_retainChildren:function(n,o,s,c){for(var f=2*n;f<2*n+2;f++)for(var m=2*o;m<2*o+2;m++){var S=new I(f,m);S.z=s+1;var M=this._tileCoordsToKey(S),A=this._tiles[M];if(A&&A.active){A.retain=!0;continue}else A&&A.loaded&&(A.retain=!0);s+1<c&&this._retainChildren(f,m,s+1,c)}},_resetView:function(n){var o=n&&(n.pinch||n.flyTo);this._setView(this._map.getCenter(),this._map.getZoom(),o,o)},_animateZoom:function(n){this._setView(n.center,n.zoom,!0,n.noUpdate)},_clampZoom:function(n){var o=this.options;return o.minNativeZoom!==void 0&&n<o.minNativeZoom?o.minNativeZoom:o.maxNativeZoom!==void 0&&o.maxNativeZoom<n?o.maxNativeZoom:n},_setView:function(n,o,s,c){var f=Math.round(o);this.options.maxZoom!==void 0&&f>this.options.maxZoom||this.options.minZoom!==void 0&&f<this.options.minZoom?f=void 0:f=this._clampZoom(f);var m=this.options.updateWhenZooming&&f!==this._tileZoom;(!c||m)&&(this._tileZoom=f,this._abortLoading&&this._abortLoading(),this._updateLevels(),this._resetGrid(),f!==void 0&&this._update(n),s||this._pruneTiles(),this._noPrune=!!s),this._setZoomTransforms(n,o)},_setZoomTransforms:function(n,o){for(var s in this._levels)this._setZoomTransform(this._levels[s],n,o)},_setZoomTransform:function(n,o,s){var c=this._map.getZoomScale(s,n.zoom),f=n.origin.multiplyBy(c).subtract(this._map._getNewPixelOrigin(o,s)).round();Q.any3d?Vn(n.el,f,c):Ae(n.el,f)},_resetGrid:function(){var n=this._map,o=n.options.crs,s=this._tileSize=this.getTileSize(),c=this._tileZoom,f=this._map.getPixelWorldBounds(this._tileZoom);f&&(this._globalTileRange=this._pxBoundsToTileRange(f)),this._wrapX=o.wrapLng&&!this.options.noWrap&&[Math.floor(n.project([0,o.wrapLng[0]],c).x/s.x),Math.ceil(n.project([0,o.wrapLng[1]],c).x/s.y)],this._wrapY=o.wrapLat&&!this.options.noWrap&&[Math.floor(n.project([o.wrapLat[0],0],c).y/s.x),Math.ceil(n.project([o.wrapLat[1],0],c).y/s.y)]},_onMoveEnd:function(){!this._map||this._map._animatingZoom||this._update()},_getTiledPixelBounds:function(n){var o=this._map,s=o._animatingZoom?Math.max(o._animateToZoom,o.getZoom()):o.getZoom(),c=o.getZoomScale(s,this._tileZoom),f=o.project(n,this._tileZoom).floor(),m=o.getSize().divideBy(c*2);return new Y(f.subtract(m),f.add(m))},_update:function(n){var o=this._map;if(o){var s=this._clampZoom(o.getZoom());if(n===void 0&&(n=o.getCenter()),this._tileZoom!==void 0){var c=this._getTiledPixelBounds(n),f=this._pxBoundsToTileRange(c),m=f.getCenter(),S=[],M=this.options.keepBuffer,A=new Y(f.getBottomLeft().subtract([M,-M]),f.getTopRight().add([M,-M]));if(!(isFinite(f.min.x)&&isFinite(f.min.y)&&isFinite(f.max.x)&&isFinite(f.max.y)))throw new Error("Attempted to load an infinite number of tiles");for(var F in this._tiles){var W=this._tiles[F].coords;(W.z!==this._tileZoom||!A.contains(new I(W.x,W.y)))&&(this._tiles[F].current=!1)}if(Math.abs(s-this._tileZoom)>1){this._setView(n,s);return}for(var $=f.min.y;$<=f.max.y;$++)for(var ie=f.min.x;ie<=f.max.x;ie++){var Xe=new I(ie,$);if(Xe.z=this._tileZoom,!!this._isValidTile(Xe)){var Fe=this._tiles[this._tileCoordsToKey(Xe)];Fe?Fe.current=!0:S.push(Xe)}}if(S.sort(function(at,xr){return at.distanceTo(m)-xr.distanceTo(m)}),S.length!==0){this._loading||(this._loading=!0,this.fire("loading"));var kt=document.createDocumentFragment();for(ie=0;ie<S.length;ie++)this._addTile(S[ie],kt);this._level.el.appendChild(kt)}}}},_isValidTile:function(n){var o=this._map.options.crs;if(!o.infinite){var s=this._globalTileRange;if(!o.wrapLng&&(n.x<s.min.x||n.x>s.max.x)||!o.wrapLat&&(n.y<s.min.y||n.y>s.max.y))return!1}if(!this.options.bounds)return!0;var c=this._tileCoordsToBounds(n);return de(this.options.bounds).overlaps(c)},_keyToBounds:function(n){return this._tileCoordsToBounds(this._keyToTileCoords(n))},_tileCoordsToNwSe:function(n){var o=this._map,s=this.getTileSize(),c=n.scaleBy(s),f=c.add(s),m=o.unproject(c,n.z),S=o.unproject(f,n.z);return[m,S]},_tileCoordsToBounds:function(n){var o=this._tileCoordsToNwSe(n),s=new Te(o[0],o[1]);return this.options.noWrap||(s=this._map.wrapLatLngBounds(s)),s},_tileCoordsToKey:function(n){return n.x+":"+n.y+":"+n.z},_keyToTileCoords:function(n){var o=n.split(":"),s=new I(+o[0],+o[1]);return s.z=+o[2],s},_removeTile:function(n){var o=this._tiles[n];o&&(ke(o.el),delete this._tiles[n],this.fire("tileunload",{tile:o.el,coords:this._keyToTileCoords(n)}))},_initTile:function(n){ne(n,"leaflet-tile");var o=this.getTileSize();n.style.width=o.x+"px",n.style.height=o.y+"px",n.onselectstart=_,n.onmousemove=_,Q.ielt9&&this.options.opacity<1&&xt(n,this.options.opacity)},_addTile:function(n,o){var s=this._getTilePos(n),c=this._tileCoordsToKey(n),f=this.createTile(this._wrapCoords(n),u(this._tileReady,this,n));this._initTile(f),this.createTile.length<2&&V(u(this._tileReady,this,n,null,f)),Ae(f,s),this._tiles[c]={el:f,coords:n,current:!0},o.appendChild(f),this.fire("tileloadstart",{tile:f,coords:n})},_tileReady:function(n,o,s){o&&this.fire("tileerror",{error:o,tile:s,coords:n});var c=this._tileCoordsToKey(n);s=this._tiles[c],s&&(s.loaded=+new Date,this._map._fadeAnimated?(xt(s.el,0),oe(this._fadeFrame),this._fadeFrame=V(this._updateOpacity,this)):(s.active=!0,this._pruneTiles()),o||(ne(s.el,"leaflet-tile-loaded"),this.fire("tileload",{tile:s.el,coords:n})),this._noTilesToLoad()&&(this._loading=!1,this.fire("load"),Q.ielt9||!this._map._fadeAnimated?V(this._pruneTiles,this):setTimeout(u(this._pruneTiles,this),250)))},_getTilePos:function(n){return n.scaleBy(this.getTileSize()).subtract(this._level.origin)},_wrapCoords:function(n){var o=new I(this._wrapX?b(n.x,this._wrapX):n.x,this._wrapY?b(n.y,this._wrapY):n.y);return o.z=n.z,o},_pxBoundsToTileRange:function(n){var o=this.getTileSize();return new Y(n.min.unscaleBy(o).floor(),n.max.unscaleBy(o).ceil().subtract([1,1]))},_noTilesToLoad:function(){for(var n in this._tiles)if(!this._tiles[n].loaded)return!1;return!0}});function s_(n){return new _i(n)}var br=_i.extend({options:{minZoom:0,maxZoom:18,subdomains:"abc",errorTileUrl:"",zoomOffset:0,tms:!1,zoomReverse:!1,detectRetina:!1,crossOrigin:!1,referrerPolicy:!1},initialize:function(n,o){this._url=n,o=k(this,o),o.detectRetina&&Q.retina&&o.maxZoom>0?(o.tileSize=Math.floor(o.tileSize/2),o.zoomReverse?(o.zoomOffset--,o.minZoom=Math.min(o.maxZoom,o.minZoom+1)):(o.zoomOffset++,o.maxZoom=Math.max(o.minZoom,o.maxZoom-1)),o.minZoom=Math.max(0,o.minZoom)):o.zoomReverse?o.minZoom=Math.min(o.maxZoom,o.minZoom):o.maxZoom=Math.max(o.minZoom,o.maxZoom),typeof o.subdomains=="string"&&(o.subdomains=o.subdomains.split("")),this.on("tileunload",this._onTileRemove)},setUrl:function(n,o){return this._url===n&&o===void 0&&(o=!0),this._url=n,o||this.redraw(),this},createTile:function(n,o){var s=document.createElement("img");return te(s,"load",u(this._tileOnLoad,this,o,s)),te(s,"error",u(this._tileOnError,this,o,s)),(this.options.crossOrigin||this.options.crossOrigin==="")&&(s.crossOrigin=this.options.crossOrigin===!0?"":this.options.crossOrigin),typeof this.options.referrerPolicy=="string"&&(s.referrerPolicy=this.options.referrerPolicy),s.alt="",s.src=this.getTileUrl(n),s},getTileUrl:function(n){var o={r:Q.retina?"@2x":"",s:this._getSubdomain(n),x:n.x,y:n.y,z:this._getZoomForUrl()};if(this._map&&!this._map.options.crs.infinite){var s=this._globalTileRange.max.y-n.y;this.options.tms&&(o.y=s),o["-y"]=s}return g(this._url,a(o,this.options))},_tileOnLoad:function(n,o){Q.ielt9?setTimeout(u(n,this,null,o),0):n(null,o)},_tileOnError:function(n,o,s){var c=this.options.errorTileUrl;c&&o.getAttribute("src")!==c&&(o.src=c),n(s,o)},_onTileRemove:function(n){n.tile.onload=null},_getZoomForUrl:function(){var n=this._tileZoom,o=this.options.maxZoom,s=this.options.zoomReverse,c=this.options.zoomOffset;return s&&(n=o-n),n+c},_getSubdomain:function(n){var o=Math.abs(n.x+n.y)%this.options.subdomains.length;return this.options.subdomains[o]},_abortLoading:function(){var n,o;for(n in this._tiles)if(this._tiles[n].coords.z!==this._tileZoom&&(o=this._tiles[n].el,o.onload=_,o.onerror=_,!o.complete)){o.src=N;var s=this._tiles[n].coords;ke(o),delete this._tiles[n],this.fire("tileabort",{tile:o,coords:s})}},_removeTile:function(n){var o=this._tiles[n];if(o)return o.el.setAttribute("src",N),_i.prototype._removeTile.call(this,n)},_tileReady:function(n,o,s){if(!(!this._map||s&&s.getAttribute("src")===N))return _i.prototype._tileReady.call(this,n,o,s)}});function Bd(n,o){return new br(n,o)}var Fd=br.extend({defaultWmsParams:{service:"WMS",request:"GetMap",layers:"",styles:"",format:"image/jpeg",transparent:!1,version:"1.1.1"},options:{crs:null,uppercase:!1},initialize:function(n,o){this._url=n;var s=a({},this.defaultWmsParams);for(var c in o)c in this.options||(s[c]=o[c]);o=k(this,o);var f=o.detectRetina&&Q.retina?2:1,m=this.getTileSize();s.width=m.x*f,s.height=m.y*f,this.wmsParams=s},onAdd:function(n){this._crs=this.options.crs||n.options.crs,this._wmsVersion=parseFloat(this.wmsParams.version);var o=this._wmsVersion>=1.3?"crs":"srs";this.wmsParams[o]=this._crs.code,br.prototype.onAdd.call(this,n)},getTileUrl:function(n){var o=this._tileCoordsToNwSe(n),s=this._crs,c=ee(s.project(o[0]),s.project(o[1])),f=c.min,m=c.max,S=(this._wmsVersion>=1.3&&this._crs===Nd?[f.y,f.x,m.y,m.x]:[f.x,f.y,m.x,m.y]).join(","),M=br.prototype.getTileUrl.call(this,n);return M+D(this.wmsParams,M,this.options.uppercase)+(this.options.uppercase?"&BBOX=":"&bbox=")+S},setParams:function(n,o){return a(this.wmsParams,n),o||this.redraw(),this}});function l_(n,o){return new Fd(n,o)}br.WMS=Fd,Bd.wms=l_;var tn=Nt.extend({options:{padding:.1},initialize:function(n){k(this,n),h(this),this._layers=this._layers||{}},onAdd:function(){this._container||(this._initContainer(),ne(this._container,"leaflet-zoom-animated")),this.getPane().appendChild(this._container),this._update(),this.on("update",this._updatePaths,this)},onRemove:function(){this.off("update",this._updatePaths,this),this._destroyContainer()},getEvents:function(){var n={viewreset:this._reset,zoom:this._onZoom,moveend:this._update,zoomend:this._onZoomEnd};return this._zoomAnimated&&(n.zoomanim=this._onAnimZoom),n},_onAnimZoom:function(n){this._updateTransform(n.center,n.zoom)},_onZoom:function(){this._updateTransform(this._map.getCenter(),this._map.getZoom())},_updateTransform:function(n,o){var s=this._map.getZoomScale(o,this._zoom),c=this._map.getSize().multiplyBy(.5+this.options.padding),f=this._map.project(this._center,o),m=c.multiplyBy(-s).add(f).subtract(this._map._getNewPixelOrigin(n,o));Q.any3d?Vn(this._container,m,s):Ae(this._container,m)},_reset:function(){this._update(),this._updateTransform(this._center,this._zoom);for(var n in this._layers)this._layers[n]._reset()},_onZoomEnd:function(){for(var n in this._layers)this._layers[n]._project()},_updatePaths:function(){for(var n in this._layers)this._layers[n]._update()},_update:function(){var n=this.options.padding,o=this._map.getSize(),s=this._map.containerPointToLayerPoint(o.multiplyBy(-n)).round();this._bounds=new Y(s,s.add(o.multiplyBy(1+n*2)).round()),this._center=this._map.getCenter(),this._zoom=this._map.getZoom()}}),Zd=tn.extend({options:{tolerance:0},getEvents:function(){var n=tn.prototype.getEvents.call(this);return n.viewprereset=this._onViewPreReset,n},_onViewPreReset:function(){this._postponeUpdatePaths=!0},onAdd:function(){tn.prototype.onAdd.call(this),this._draw()},_initContainer:function(){var n=this._container=document.createElement("canvas");te(n,"mousemove",this._onMouseMove,this),te(n,"click dblclick mousedown mouseup contextmenu",this._onClick,this),te(n,"mouseout",this._handleMouseOut,this),n._leaflet_disable_events=!0,this._ctx=n.getContext("2d")},_destroyContainer:function(){oe(this._redrawRequest),delete this._ctx,ke(this._container),me(this._container),delete this._container},_updatePaths:function(){if(!this._postponeUpdatePaths){var n;this._redrawBounds=null;for(var o in this._layers)n=this._layers[o],n._update();this._redraw()}},_update:function(){if(!(this._map._animatingZoom&&this._bounds)){tn.prototype._update.call(this);var n=this._bounds,o=this._container,s=n.getSize(),c=Q.retina?2:1;Ae(o,n.min),o.width=c*s.x,o.height=c*s.y,o.style.width=s.x+"px",o.style.height=s.y+"px",Q.retina&&this._ctx.scale(2,2),this._ctx.translate(-n.min.x,-n.min.y),this.fire("update")}},_reset:function(){tn.prototype._reset.call(this),this._postponeUpdatePaths&&(this._postponeUpdatePaths=!1,this._updatePaths())},_initPath:function(n){this._updateDashArray(n),this._layers[h(n)]=n;var o=n._order={layer:n,prev:this._drawLast,next:null};this._drawLast&&(this._drawLast.next=o),this._drawLast=o,this._drawFirst=this._drawFirst||this._drawLast},_addPath:function(n){this._requestRedraw(n)},_removePath:function(n){var o=n._order,s=o.next,c=o.prev;s?s.prev=c:this._drawLast=c,c?c.next=s:this._drawFirst=s,delete n._order,delete this._layers[h(n)],this._requestRedraw(n)},_updatePath:function(n){this._extendRedrawBounds(n),n._project(),n._update(),this._requestRedraw(n)},_updateStyle:function(n){this._updateDashArray(n),this._requestRedraw(n)},_updateDashArray:function(n){if(typeof n.options.dashArray=="string"){var o=n.options.dashArray.split(/[, ]+/),s=[],c,f;for(f=0;f<o.length;f++){if(c=Number(o[f]),isNaN(c))return;s.push(c)}n.options._dashArray=s}else n.options._dashArray=n.options.dashArray},_requestRedraw:function(n){this._map&&(this._extendRedrawBounds(n),this._redrawRequest=this._redrawRequest||V(this._redraw,this))},_extendRedrawBounds:function(n){if(n._pxBounds){var o=(n.options.weight||0)+1;this._redrawBounds=this._redrawBounds||new Y,this._redrawBounds.extend(n._pxBounds.min.subtract([o,o])),this._redrawBounds.extend(n._pxBounds.max.add([o,o]))}},_redraw:function(){this._redrawRequest=null,this._redrawBounds&&(this._redrawBounds.min._floor(),this._redrawBounds.max._ceil()),this._clear(),this._draw(),this._redrawBounds=null},_clear:function(){var n=this._redrawBounds;if(n){var o=n.getSize();this._ctx.clearRect(n.min.x,n.min.y,o.x,o.y)}else this._ctx.save(),this._ctx.setTransform(1,0,0,1,0,0),this._ctx.clearRect(0,0,this._container.width,this._container.height),this._ctx.restore()},_draw:function(){var n,o=this._redrawBounds;if(this._ctx.save(),o){var s=o.getSize();this._ctx.beginPath(),this._ctx.rect(o.min.x,o.min.y,s.x,s.y),this._ctx.clip()}this._drawing=!0;for(var c=this._drawFirst;c;c=c.next)n=c.layer,(!o||n._pxBounds&&n._pxBounds.intersects(o))&&n._updatePath();this._drawing=!1,this._ctx.restore()},_updatePoly:function(n,o){if(this._drawing){var s,c,f,m,S=n._parts,M=S.length,A=this._ctx;if(M){for(A.beginPath(),s=0;s<M;s++){for(c=0,f=S[s].length;c<f;c++)m=S[s][c],A[c?"lineTo":"moveTo"](m.x,m.y);o&&A.closePath()}this._fillStroke(A,n)}}},_updateCircle:function(n){if(!(!this._drawing||n._empty())){var o=n._point,s=this._ctx,c=Math.max(Math.round(n._radius),1),f=(Math.max(Math.round(n._radiusY),1)||c)/c;f!==1&&(s.save(),s.scale(1,f)),s.beginPath(),s.arc(o.x,o.y/f,c,0,Math.PI*2,!1),f!==1&&s.restore(),this._fillStroke(s,n)}},_fillStroke:function(n,o){var s=o.options;s.fill&&(n.globalAlpha=s.fillOpacity,n.fillStyle=s.fillColor||s.color,n.fill(s.fillRule||"evenodd")),s.stroke&&s.weight!==0&&(n.setLineDash&&n.setLineDash(o.options&&o.options._dashArray||[]),n.globalAlpha=s.opacity,n.lineWidth=s.weight,n.strokeStyle=s.color,n.lineCap=s.lineCap,n.lineJoin=s.lineJoin,n.stroke())},_onClick:function(n){for(var o=this._map.mouseEventToLayerPoint(n),s,c,f=this._drawFirst;f;f=f.next)s=f.layer,s.options.interactive&&s._containsPoint(o)&&(!(n.type==="click"||n.type==="preclick")||!this._map._draggableMoved(s))&&(c=s);this._fireEvent(c?[c]:!1,n)},_onMouseMove:function(n){if(!(!this._map||this._map.dragging.moving()||this._map._animatingZoom)){var o=this._map.mouseEventToLayerPoint(n);this._handleMouseHover(n,o)}},_handleMouseOut:function(n){var o=this._hoveredLayer;o&&(Le(this._container,"leaflet-interactive"),this._fireEvent([o],n,"mouseout"),this._hoveredLayer=null,this._mouseHoverThrottled=!1)},_handleMouseHover:function(n,o){if(!this._mouseHoverThrottled){for(var s,c,f=this._drawFirst;f;f=f.next)s=f.layer,s.options.interactive&&s._containsPoint(o)&&(c=s);c!==this._hoveredLayer&&(this._handleMouseOut(n),c&&(ne(this._container,"leaflet-interactive"),this._fireEvent([c],n,"mouseover"),this._hoveredLayer=c)),this._fireEvent(this._hoveredLayer?[this._hoveredLayer]:!1,n),this._mouseHoverThrottled=!0,setTimeout(u(function(){this._mouseHoverThrottled=!1},this),32)}},_fireEvent:function(n,o,s){this._map._fireDOMEvent(o,s||o.type,n)},_bringToFront:function(n){var o=n._order;if(o){var s=o.next,c=o.prev;if(s)s.prev=c;else return;c?c.next=s:s&&(this._drawFirst=s),o.prev=this._drawLast,this._drawLast.next=o,o.next=null,this._drawLast=o,this._requestRedraw(n)}},_bringToBack:function(n){var o=n._order;if(o){var s=o.next,c=o.prev;if(c)c.next=s;else return;s?s.prev=c:c&&(this._drawLast=c),o.prev=null,o.next=this._drawFirst,this._drawFirst.prev=o,this._drawFirst=o,this._requestRedraw(n)}}});function Hd(n){return Q.canvas?new Zd(n):null}var yi=function(){try{return document.namespaces.add("lvml","urn:schemas-microsoft-com:vml"),function(n){return document.createElement("<lvml:"+n+' class="lvml">')}}catch{}return function(n){return document.createElement("<"+n+' xmlns="urn:schemas-microsoft.com:vml" class="lvml">')}}(),u_={_initContainer:function(){this._container=fe("div","leaflet-vml-container")},_update:function(){this._map._animatingZoom||(tn.prototype._update.call(this),this.fire("update"))},_initPath:function(n){var o=n._container=yi("shape");ne(o,"leaflet-vml-shape "+(this.options.className||"")),o.coordsize="1 1",n._path=yi("path"),o.appendChild(n._path),this._updateStyle(n),this._layers[h(n)]=n},_addPath:function(n){var o=n._container;this._container.appendChild(o),n.options.interactive&&n.addInteractiveTarget(o)},_removePath:function(n){var o=n._container;ke(o),n.removeInteractiveTarget(o),delete this._layers[h(n)]},_updateStyle:function(n){var o=n._stroke,s=n._fill,c=n.options,f=n._container;f.stroked=!!c.stroke,f.filled=!!c.fill,c.stroke?(o||(o=n._stroke=yi("stroke")),f.appendChild(o),o.weight=c.weight+"px",o.color=c.color,o.opacity=c.opacity,c.dashArray?o.dashStyle=v(c.dashArray)?c.dashArray.join(" "):c.dashArray.replace(/( *, *)/g," "):o.dashStyle="",o.endcap=c.lineCap.replace("butt","flat"),o.joinstyle=c.lineJoin):o&&(f.removeChild(o),n._stroke=null),c.fill?(s||(s=n._fill=yi("fill")),f.appendChild(s),s.color=c.fillColor||c.color,s.opacity=c.fillOpacity):s&&(f.removeChild(s),n._fill=null)},_updateCircle:function(n){var o=n._point.round(),s=Math.round(n._radius),c=Math.round(n._radiusY||s);this._setPath(n,n._empty()?"M0 0":"AL "+o.x+","+o.y+" "+s+","+c+" 0,"+65535*360)},_setPath:function(n,o){n._path.v=o},_bringToFront:function(n){pr(n._container)},_bringToBack:function(n){mr(n._container)}},Ao=Q.vml?yi:Gc,bi=tn.extend({_initContainer:function(){this._container=Ao("svg"),this._container.setAttribute("pointer-events","none"),this._rootGroup=Ao("g"),this._container.appendChild(this._rootGroup)},_destroyContainer:function(){ke(this._container),me(this._container),delete this._container,delete this._rootGroup,delete this._svgSize},_update:function(){if(!(this._map._animatingZoom&&this._bounds)){tn.prototype._update.call(this);var n=this._bounds,o=n.getSize(),s=this._container;(!this._svgSize||!this._svgSize.equals(o))&&(this._svgSize=o,s.setAttribute("width",o.x),s.setAttribute("height",o.y)),Ae(s,n.min),s.setAttribute("viewBox",[n.min.x,n.min.y,o.x,o.y].join(" ")),this.fire("update")}},_initPath:function(n){var o=n._path=Ao("path");n.options.className&&ne(o,n.options.className),n.options.interactive&&ne(o,"leaflet-interactive"),this._updateStyle(n),this._layers[h(n)]=n},_addPath:function(n){this._rootGroup||this._initContainer(),this._rootGroup.appendChild(n._path),n.addInteractiveTarget(n._path)},_removePath:function(n){ke(n._path),n.removeInteractiveTarget(n._path),delete this._layers[h(n)]},_updatePath:function(n){n._project(),n._update()},_updateStyle:function(n){var o=n._path,s=n.options;o&&(s.stroke?(o.setAttribute("stroke",s.color),o.setAttribute("stroke-opacity",s.opacity),o.setAttribute("stroke-width",s.weight),o.setAttribute("stroke-linecap",s.lineCap),o.setAttribute("stroke-linejoin",s.lineJoin),s.dashArray?o.setAttribute("stroke-dasharray",s.dashArray):o.removeAttribute("stroke-dasharray"),s.dashOffset?o.setAttribute("stroke-dashoffset",s.dashOffset):o.removeAttribute("stroke-dashoffset")):o.setAttribute("stroke","none"),s.fill?(o.setAttribute("fill",s.fillColor||s.color),o.setAttribute("fill-opacity",s.fillOpacity),o.setAttribute("fill-rule",s.fillRule||"evenodd")):o.setAttribute("fill","none"))},_updatePoly:function(n,o){this._setPath(n,Kc(n._parts,o))},_updateCircle:function(n){var o=n._point,s=Math.max(Math.round(n._radius),1),c=Math.max(Math.round(n._radiusY),1)||s,f="a"+s+","+c+" 0 1,0 ",m=n._empty()?"M0 0":"M"+(o.x-s)+","+o.y+f+s*2+",0 "+f+-s*2+",0 ";this._setPath(n,m)},_setPath:function(n,o){n._path.setAttribute("d",o)},_bringToFront:function(n){pr(n._path)},_bringToBack:function(n){mr(n._path)}});Q.vml&&bi.include(u_);function Wd(n){return Q.svg||Q.vml?new bi(n):null}ue.include({getRenderer:function(n){var o=n.options.renderer||this._getPaneRenderer(n.options.pane)||this.options.renderer||this._renderer;return o||(o=this._renderer=this._createRenderer()),this.hasLayer(o)||this.addLayer(o),o},_getPaneRenderer:function(n){if(n==="overlayPane"||n===void 0)return!1;var o=this._paneRenderers[n];return o===void 0&&(o=this._createRenderer({pane:n}),this._paneRenderers[n]=o),o},_createRenderer:function(n){return this.options.preferCanvas&&Hd(n)||Wd(n)}});var Ud=_r.extend({initialize:function(n,o){_r.prototype.initialize.call(this,this._boundsToLatLngs(n),o)},setBounds:function(n){return this.setLatLngs(this._boundsToLatLngs(n))},_boundsToLatLngs:function(n){return n=de(n),[n.getSouthWest(),n.getNorthWest(),n.getNorthEast(),n.getSouthEast()]}});function c_(n,o){return new Ud(n,o)}bi.create=Ao,bi.pointsToPath=Kc,en.geometryToLayer=Po,en.coordsToLatLng=qs,en.coordsToLatLngs=To,en.latLngToCoords=Js,en.latLngsToCoords=Eo,en.getFeature=yr,en.asFeature=Lo,ue.mergeOptions({boxZoom:!0});var Vd=Ut.extend({initialize:function(n){this._map=n,this._container=n._container,this._pane=n._panes.overlayPane,this._resetStateTimeout=0,n.on("unload",this._destroy,this)},addHooks:function(){te(this._container,"mousedown",this._onMouseDown,this)},removeHooks:function(){me(this._container,"mousedown",this._onMouseDown,this)},moved:function(){return this._moved},_destroy:function(){ke(this._pane),delete this._pane},_resetState:function(){this._resetStateTimeout=0,this._moved=!1},_clearDeferredResetState:function(){this._resetStateTimeout!==0&&(clearTimeout(this._resetStateTimeout),this._resetStateTimeout=0)},_onMouseDown:function(n){if(!n.shiftKey||n.which!==1&&n.button!==1)return!1;this._clearDeferredResetState(),this._resetState(),di(),Os(),this._startPoint=this._map.mouseEventToContainerPoint(n),te(document,{contextmenu:Yn,mousemove:this._onMouseMove,mouseup:this._onMouseUp,keydown:this._onKeyDown},this)},_onMouseMove:function(n){this._moved||(this._moved=!0,this._box=fe("div","leaflet-zoom-box",this._container),ne(this._container,"leaflet-crosshair"),this._map.fire("boxzoomstart")),this._point=this._map.mouseEventToContainerPoint(n);var o=new Y(this._point,this._startPoint),s=o.getSize();Ae(this._box,o.min),this._box.style.width=s.x+"px",this._box.style.height=s.y+"px"},_finish:function(){this._moved&&(ke(this._box),Le(this._container,"leaflet-crosshair")),fi(),Is(),me(document,{contextmenu:Yn,mousemove:this._onMouseMove,mouseup:this._onMouseUp,keydown:this._onKeyDown},this)},_onMouseUp:function(n){if(!(n.which!==1&&n.button!==1)&&(this._finish(),!!this._moved)){this._clearDeferredResetState(),this._resetStateTimeout=setTimeout(u(this._resetState,this),0);var o=new Te(this._map.containerPointToLatLng(this._startPoint),this._map.containerPointToLatLng(this._point));this._map.fitBounds(o).fire("boxzoomend",{boxZoomBounds:o})}},_onKeyDown:function(n){n.keyCode===27&&(this._finish(),this._clearDeferredResetState(),this._resetState())}});ue.addInitHook("addHandler","boxZoom",Vd),ue.mergeOptions({doubleClickZoom:!0});var Gd=Ut.extend({addHooks:function(){this._map.on("dblclick",this._onDoubleClick,this)},removeHooks:function(){this._map.off("dblclick",this._onDoubleClick,this)},_onDoubleClick:function(n){var o=this._map,s=o.getZoom(),c=o.options.zoomDelta,f=n.originalEvent.shiftKey?s-c:s+c;o.options.doubleClickZoom==="center"?o.setZoom(f):o.setZoomAround(n.containerPoint,f)}});ue.addInitHook("addHandler","doubleClickZoom",Gd),ue.mergeOptions({dragging:!0,inertia:!0,inertiaDeceleration:3400,inertiaMaxSpeed:1/0,easeLinearity:.2,worldCopyJump:!1,maxBoundsViscosity:0});var Kd=Ut.extend({addHooks:function(){if(!this._draggable){var n=this._map;this._draggable=new vn(n._mapPane,n._container),this._draggable.on({dragstart:this._onDragStart,drag:this._onDrag,dragend:this._onDragEnd},this),this._draggable.on("predrag",this._onPreDragLimit,this),n.options.worldCopyJump&&(this._draggable.on("predrag",this._onPreDragWrap,this),n.on("zoomend",this._onZoomEnd,this),n.whenReady(this._onZoomEnd,this))}ne(this._map._container,"leaflet-grab leaflet-touch-drag"),this._draggable.enable(),this._positions=[],this._times=[]},removeHooks:function(){Le(this._map._container,"leaflet-grab"),Le(this._map._container,"leaflet-touch-drag"),this._draggable.disable()},moved:function(){return this._draggable&&this._draggable._moved},moving:function(){return this._draggable&&this._draggable._moving},_onDragStart:function(){var n=this._map;if(n._stop(),this._map.options.maxBounds&&this._map.options.maxBoundsViscosity){var o=de(this._map.options.maxBounds);this._offsetLimit=ee(this._map.latLngToContainerPoint(o.getNorthWest()).multiplyBy(-1),this._map.latLngToContainerPoint(o.getSouthEast()).multiplyBy(-1).add(this._map.getSize())),this._viscosity=Math.min(1,Math.max(0,this._map.options.maxBoundsViscosity))}else this._offsetLimit=null;n.fire("movestart").fire("dragstart"),n.options.inertia&&(this._positions=[],this._times=[])},_onDrag:function(n){if(this._map.options.inertia){var o=this._lastTime=+new Date,s=this._lastPos=this._draggable._absPos||this._draggable._newPos;this._positions.push(s),this._times.push(o),this._prunePositions(o)}this._map.fire("move",n).fire("drag",n)},_prunePositions:function(n){for(;this._positions.length>1&&n-this._times[0]>50;)this._positions.shift(),this._times.shift()},_onZoomEnd:function(){var n=this._map.getSize().divideBy(2),o=this._map.latLngToLayerPoint([0,0]);this._initialWorldOffset=o.subtract(n).x,this._worldWidth=this._map.getPixelWorldBounds().getSize().x},_viscousLimit:function(n,o){return n-(n-o)*this._viscosity},_onPreDragLimit:function(){if(!(!this._viscosity||!this._offsetLimit)){var n=this._draggable._newPos.subtract(this._draggable._startPos),o=this._offsetLimit;n.x<o.min.x&&(n.x=this._viscousLimit(n.x,o.min.x)),n.y<o.min.y&&(n.y=this._viscousLimit(n.y,o.min.y)),n.x>o.max.x&&(n.x=this._viscousLimit(n.x,o.max.x)),n.y>o.max.y&&(n.y=this._viscousLimit(n.y,o.max.y)),this._draggable._newPos=this._draggable._startPos.add(n)}},_onPreDragWrap:function(){var n=this._worldWidth,o=Math.round(n/2),s=this._initialWorldOffset,c=this._draggable._newPos.x,f=(c-o+s)%n+o-s,m=(c+o+s)%n-o-s,S=Math.abs(f+s)<Math.abs(m+s)?f:m;this._draggable._absPos=this._draggable._newPos.clone(),this._draggable._newPos.x=S},_onDragEnd:function(n){var o=this._map,s=o.options,c=!s.inertia||n.noInertia||this._times.length<2;if(o.fire("dragend",n),c)o.fire("moveend");else{this._prunePositions(+new Date);var f=this._lastPos.subtract(this._positions[0]),m=(this._lastTime-this._times[0])/1e3,S=s.easeLinearity,M=f.multiplyBy(S/m),A=M.distanceTo([0,0]),F=Math.min(s.inertiaMaxSpeed,A),W=M.multiplyBy(F/A),$=F/(s.inertiaDeceleration*S),ie=W.multiplyBy(-$/2).round();!ie.x&&!ie.y?o.fire("moveend"):(ie=o._limitOffset(ie,o.options.maxBounds),V(function(){o.panBy(ie,{duration:$,easeLinearity:S,noMoveStart:!0,animate:!0})}))}}});ue.addInitHook("addHandler","dragging",Kd),ue.mergeOptions({keyboard:!0,keyboardPanDelta:80});var Yd=Ut.extend({keyCodes:{left:[37],right:[39],down:[40],up:[38],zoomIn:[187,107,61,171],zoomOut:[189,109,54,173]},initialize:function(n){this._map=n,this._setPanDelta(n.options.keyboardPanDelta),this._setZoomDelta(n.options.zoomDelta)},addHooks:function(){var n=this._map._container;n.tabIndex<=0&&(n.tabIndex="0"),te(n,{focus:this._onFocus,blur:this._onBlur,mousedown:this._onMouseDown},this),this._map.on({focus:this._addHooks,blur:this._removeHooks},this)},removeHooks:function(){this._removeHooks(),me(this._map._container,{focus:this._onFocus,blur:this._onBlur,mousedown:this._onMouseDown},this),this._map.off({focus:this._addHooks,blur:this._removeHooks},this)},_onMouseDown:function(){if(!this._focused){var n=document.body,o=document.documentElement,s=n.scrollTop||o.scrollTop,c=n.scrollLeft||o.scrollLeft;this._map._container.focus(),window.scrollTo(c,s)}},_onFocus:function(){this._focused=!0,this._map.fire("focus")},_onBlur:function(){this._focused=!1,this._map.fire("blur")},_setPanDelta:function(n){var o=this._panKeys={},s=this.keyCodes,c,f;for(c=0,f=s.left.length;c<f;c++)o[s.left[c]]=[-1*n,0];for(c=0,f=s.right.length;c<f;c++)o[s.right[c]]=[n,0];for(c=0,f=s.down.length;c<f;c++)o[s.down[c]]=[0,n];for(c=0,f=s.up.length;c<f;c++)o[s.up[c]]=[0,-1*n]},_setZoomDelta:function(n){var o=this._zoomKeys={},s=this.keyCodes,c,f;for(c=0,f=s.zoomIn.length;c<f;c++)o[s.zoomIn[c]]=n;for(c=0,f=s.zoomOut.length;c<f;c++)o[s.zoomOut[c]]=-n},_addHooks:function(){te(document,"keydown",this._onKeyDown,this)},_removeHooks:function(){me(document,"keydown",this._onKeyDown,this)},_onKeyDown:function(n){if(!(n.altKey||n.ctrlKey||n.metaKey)){var o=n.keyCode,s=this._map,c;if(o in this._panKeys){if(!s._panAnim||!s._panAnim._inProgress)if(c=this._panKeys[o],n.shiftKey&&(c=j(c).multiplyBy(3)),s.options.maxBounds&&(c=s._limitOffset(j(c),s.options.maxBounds)),s.options.worldCopyJump){var f=s.wrapLatLng(s.unproject(s.project(s.getCenter()).add(c)));s.panTo(f)}else s.panBy(c)}else if(o in this._zoomKeys)s.setZoom(s.getZoom()+(n.shiftKey?3:1)*this._zoomKeys[o]);else if(o===27&&s._popup&&s._popup.options.closeOnEscapeKey)s.closePopup();else return;Yn(n)}}});ue.addInitHook("addHandler","keyboard",Yd),ue.mergeOptions({scrollWheelZoom:!0,wheelDebounceTime:40,wheelPxPerZoomLevel:60});var Qd=Ut.extend({addHooks:function(){te(this._map._container,"wheel",this._onWheelScroll,this),this._delta=0},removeHooks:function(){me(this._map._container,"wheel",this._onWheelScroll,this)},_onWheelScroll:function(n){var o=yd(n),s=this._map.options.wheelDebounceTime;this._delta+=o,this._lastMousePos=this._map.mouseEventToContainerPoint(n),this._startTime||(this._startTime=+new Date);var c=Math.max(s-(+new Date-this._startTime),0);clearTimeout(this._timer),this._timer=setTimeout(u(this._performZoom,this),c),Yn(n)},_performZoom:function(){var n=this._map,o=n.getZoom(),s=this._map.options.zoomSnap||0;n._stop();var c=this._delta/(this._map.options.wheelPxPerZoomLevel*4),f=4*Math.log(2/(1+Math.exp(-Math.abs(c))))/Math.LN2,m=s?Math.ceil(f/s)*s:f,S=n._limitZoom(o+(this._delta>0?m:-m))-o;this._delta=0,this._startTime=null,S&&(n.options.scrollWheelZoom==="center"?n.setZoom(o+S):n.setZoomAround(this._lastMousePos,o+S))}});ue.addInitHook("addHandler","scrollWheelZoom",Qd);var d_=600;ue.mergeOptions({tapHold:Q.touchNative&&Q.safari&&Q.mobile,tapTolerance:15});var $d=Ut.extend({addHooks:function(){te(this._map._container,"touchstart",this._onDown,this)},removeHooks:function(){me(this._map._container,"touchstart",this._onDown,this)},_onDown:function(n){if(clearTimeout(this._holdTimeout),n.touches.length===1){var o=n.touches[0];this._startPos=this._newPos=new I(o.clientX,o.clientY),this._holdTimeout=setTimeout(u(function(){this._cancel(),this._isTapValid()&&(te(document,"touchend",Ue),te(document,"touchend touchcancel",this._cancelClickPrevent),this._simulateEvent("contextmenu",o))},this),d_),te(document,"touchend touchcancel contextmenu",this._cancel,this),te(document,"touchmove",this._onMove,this)}},_cancelClickPrevent:function n(){me(document,"touchend",Ue),me(document,"touchend touchcancel",n)},_cancel:function(){clearTimeout(this._holdTimeout),me(document,"touchend touchcancel contextmenu",this._cancel,this),me(document,"touchmove",this._onMove,this)},_onMove:function(n){var o=n.touches[0];this._newPos=new I(o.clientX,o.clientY)},_isTapValid:function(){return this._newPos.distanceTo(this._startPos)<=this._map.options.tapTolerance},_simulateEvent:function(n,o){var s=new MouseEvent(n,{bubbles:!0,cancelable:!0,view:window,screenX:o.screenX,screenY:o.screenY,clientX:o.clientX,clientY:o.clientY});s._simulated=!0,o.target.dispatchEvent(s)}});ue.addInitHook("addHandler","tapHold",$d),ue.mergeOptions({touchZoom:Q.touch,bounceAtZoomLimits:!0});var qd=Ut.extend({addHooks:function(){ne(this._map._container,"leaflet-touch-zoom"),te(this._map._container,"touchstart",this._onTouchStart,this)},removeHooks:function(){Le(this._map._container,"leaflet-touch-zoom"),me(this._map._container,"touchstart",this._onTouchStart,this)},_onTouchStart:function(n){var o=this._map;if(!(!n.touches||n.touches.length!==2||o._animatingZoom||this._zooming)){var s=o.mouseEventToContainerPoint(n.touches[0]),c=o.mouseEventToContainerPoint(n.touches[1]);this._centerPoint=o.getSize()._divideBy(2),this._startLatLng=o.containerPointToLatLng(this._centerPoint),o.options.touchZoom!=="center"&&(this._pinchStartLatLng=o.containerPointToLatLng(s.add(c)._divideBy(2))),this._startDist=s.distanceTo(c),this._startZoom=o.getZoom(),this._moved=!1,this._zooming=!0,o._stop(),te(document,"touchmove",this._onTouchMove,this),te(document,"touchend touchcancel",this._onTouchEnd,this),Ue(n)}},_onTouchMove:function(n){if(!(!n.touches||n.touches.length!==2||!this._zooming)){var o=this._map,s=o.mouseEventToContainerPoint(n.touches[0]),c=o.mouseEventToContainerPoint(n.touches[1]),f=s.distanceTo(c)/this._startDist;if(this._zoom=o.getScaleZoom(f,this._startZoom),!o.options.bounceAtZoomLimits&&(this._zoom<o.getMinZoom()&&f<1||this._zoom>o.getMaxZoom()&&f>1)&&(this._zoom=o._limitZoom(this._zoom)),o.options.touchZoom==="center"){if(this._center=this._startLatLng,f===1)return}else{var m=s._add(c)._divideBy(2)._subtract(this._centerPoint);if(f===1&&m.x===0&&m.y===0)return;this._center=o.unproject(o.project(this._pinchStartLatLng,this._zoom).subtract(m),this._zoom)}this._moved||(o._moveStart(!0,!1),this._moved=!0),oe(this._animRequest);var S=u(o._move,o,this._center,this._zoom,{pinch:!0,round:!1},void 0);this._animRequest=V(S,this,!0),Ue(n)}},_onTouchEnd:function(){if(!this._moved||!this._zooming){this._zooming=!1;return}this._zooming=!1,oe(this._animRequest),me(document,"touchmove",this._onTouchMove,this),me(document,"touchend touchcancel",this._onTouchEnd,this),this._map.options.zoomAnimation?this._map._animateZoom(this._center,this._map._limitZoom(this._zoom),!0,this._map.options.zoomSnap):this._map._resetView(this._center,this._map._limitZoom(this._zoom))}});ue.addInitHook("addHandler","touchZoom",qd),ue.BoxZoom=Vd,ue.DoubleClickZoom=Gd,ue.Drag=Kd,ue.Keyboard=Yd,ue.ScrollWheelZoom=Qd,ue.TapHold=$d,ue.TouchZoom=qd,r.Bounds=Y,r.Browser=Q,r.CRS=De,r.Canvas=Zd,r.Circle=$s,r.CircleMarker=Co,r.Class=J,r.Control=Mt,r.DivIcon=jd,r.DivOverlay=Vt,r.DomEvent=Lv,r.DomUtil=Tv,r.Draggable=vn,r.Evented=X,r.FeatureGroup=Jt,r.GeoJSON=en,r.GridLayer=_i,r.Handler=Ut,r.Icon=vr,r.ImageOverlay=zo,r.LatLng=ae,r.LatLngBounds=Te,r.Layer=Nt,r.LayerGroup=gr,r.LineUtil=Hv,r.Map=ue,r.Marker=So,r.Mixin=Rv,r.Path=_n,r.Point=I,r.PolyUtil=Dv,r.Polygon=_r,r.Polyline=Xt,r.Popup=Mo,r.PosAnimation=bd,r.Projection=Wv,r.Rectangle=Ud,r.Renderer=tn,r.SVG=bi,r.SVGOverlay=Dd,r.TileLayer=br,r.Tooltip=No,r.Transformation=gn,r.Util=Ne,r.VideoOverlay=Rd,r.bind=u,r.bounds=ee,r.canvas=Hd,r.circle=qv,r.circleMarker=$v,r.control=mi,r.divIcon=a_,r.extend=a,r.featureGroup=Kv,r.geoJSON=Id,r.geoJson=e_,r.gridLayer=s_,r.icon=Yv,r.imageOverlay=t_,r.latLng=q,r.latLngBounds=de,r.layerGroup=Gv,r.map=zv,r.marker=Qv,r.point=j,r.polygon=Xv,r.polyline=Jv,r.popup=i_,r.rectangle=c_,r.setOptions=k,r.stamp=h,r.svg=Wd,r.svgOverlay=r_,r.tileLayer=Bd,r.tooltip=o_,r.transformation=ot,r.version=i,r.videoOverlay=n_;var f_=window.L;r.noConflict=function(){return window.L=f_,this},window.L=r})})(zu,zu.exports);var Wn=zu.exports;const kn=Hh(Wn);function ai(e,t,r){return Object.freeze({instance:e,context:t,container:r})}function hs(e,t){return t==null?function(i,a){const l=P.useRef();return l.current||(l.current=e(i,a)),l}:function(i,a){const l=P.useRef();l.current||(l.current=e(i,a));const u=P.useRef(i),{instance:d}=l.current;return P.useEffect(function(){u.current!==i&&(t(d,i,u.current),u.current=i)},[d,i,a]),l}}function ag(e,t){P.useEffect(function(){return(t.layerContainer??t.map).addLayer(e.instance),function(){var l;(l=t.layerContainer)==null||l.removeLayer(e.instance),t.map.removeLayer(e.instance)}},[t,e])}function sg(e){return function(r){const i=ds(),a=e(fs(r,i),i);return ng(i.map,r.attribution),jc(a.current,r.eventHandlers),ag(a.current,i),a}}function X0(e,t){const r=P.useRef();P.useEffect(function(){if(t.pathOptions!==r.current){const a=t.pathOptions??{};e.instance.setStyle(a),r.current=a}},[e,t])}function eb(e){return function(r){const i=ds(),a=e(fs(r,i),i);return jc(a.current,r.eventHandlers),ag(a.current,i),X0(a.current,r),a}}function tb(e,t){const r=hs(e,t),i=sg(r);return og(i)}function nb(e,t){const r=hs(e),i=J0(r,t);return $0(i)}function Bc(e,t){const r=hs(e,t),i=eb(r);return og(i)}function rb(e,t){const r=hs(e,t),i=sg(r);return q0(i)}function ib(e,t,r){const{opacity:i,zIndex:a}=t;i!=null&&i!==r.opacity&&e.setOpacity(i),a!=null&&a!==r.zIndex&&e.setZIndex(a)}function ps(){return ds().map}function ob(e){const t=ps();return P.useEffect(function(){return t.on(e),function(){t.off(e)}},[t,e]),t}const Mu=Bc(function({center:t,children:r,...i},a){const l=new Wn.CircleMarker(t,i);return ai(l,cs(a,{overlayContainer:l}))},K0),lg=Bc(function({data:t,...r},i){const a=new Wn.GeoJSON(t,r);return ai(a,cs(i,{overlayContainer:a}))},function(t,r,i){r.style!==i.style&&(r.style==null?t.resetStyle():t.setStyle(r.style))}),ab=tb(function({children:t,...r},i){const a=new Wn.LayerGroup([],r);return ai(a,cs(i,{layerContainer:a}))});function Nu(){return Nu=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var r=arguments[t];for(var i in r)Object.prototype.hasOwnProperty.call(r,i)&&(e[i]=r[i])}return e},Nu.apply(this,arguments)}function sb({bounds:e,boundsOptions:t,center:r,children:i,className:a,id:l,placeholder:u,style:d,whenReady:h,zoom:p,...b},_){const[y]=P.useState({className:a,id:l,style:d}),[C,T]=P.useState(null);P.useImperativeHandle(_,()=>(C==null?void 0:C.map)??null,[C]);const k=P.useCallback(x=>{if(x!==null&&C===null){const g=new Wn.Map(x,b);r!=null&&p!=null?g.setView(r,p):e!=null&&g.fitBounds(e,t),h!=null&&g.whenReady(h),T(Q0(g))}},[]);P.useEffect(()=>()=>{C==null||C.map.remove()},[C]);const D=C?cn.createElement(ig,{value:C},i):u??null;return cn.createElement("div",Nu({},y,{ref:k}),D)}const ug=P.forwardRef(sb),lb=Bc(function({bounds:t,...r},i){const a=new Wn.Rectangle(t,r);return ai(a,cs(i,{overlayContainer:a}))},function(t,r,i){r.bounds!==i.bounds&&t.setBounds(r.bounds)}),cg=rb(function({url:t,...r},i){const a=new Wn.TileLayer(t,fs(r,i));return ai(a,i)},function(t,r,i){ib(t,r,i);const{url:a}=r;a!=null&&a!==i.url&&t.setUrl(a)}),Wa=nb(function(t,r){const i=new Wn.Tooltip(t,r.overlayContainer);return ai(i,r)},function(t,r,{position:i},a){P.useEffect(function(){const u=r.overlayContainer;if(u==null)return;const{instance:d}=t,h=b=>{b.tooltip===d&&(i!=null&&d.setLatLng(i),d.update(),a(!0))},p=b=>{b.tooltip===d&&a(!1)};return u.on({tooltipopen:h,tooltipclose:p}),u.bindTooltip(d),function(){u.off({tooltipopen:h,tooltipclose:p}),u._map!=null&&u.unbindTooltip()}},[t,r,a,i])});function dg(e){if(!Array.isArray(e)||e.length===0)return[];if(typeof e[0]=="number")return[e];const t=[];for(const r of e)t.push(...dg(r));return t}function dh(e){const t=Array.isArray(e)?e:e.features;if(t.length===0)return null;let r=1/0,i=1/0,a=-1/0,l=-1/0;for(const u of t){if(!u.geometry)continue;const d=u;if(d.bbox&&d.bbox.length>=4){const p=d.bbox[0]??0,b=d.bbox[1]??0,_=d.bbox[2]??0,y=d.bbox[3]??0;r=Math.min(r,p),i=Math.min(i,b),a=Math.max(a,_),l=Math.max(l,y);continue}const h=dg(u.geometry.coordinates);for(const p of h)if(p.length>=2){const b=p[0],_=p[1];typeof b=="number"&&typeof _=="number"&&!isNaN(b)&&!isNaN(_)&&(r=Math.min(r,b),i=Math.min(i,_),a=Math.max(a,b),l=Math.max(l,_))}}return r===1/0||i===1/0?null:[r,i,a,l]}function Au(e,t=.1){const[r,i,a,l]=e,u=a-r,d=l-i,h=u*t,p=d*t;return[r-h,i-p,a+h,l+p]}function Bn(e){return e.properties.kind==="TRACK"}function fg(e){const t=e.properties;return Bn(e)?e.properties.platform_name||e.properties.platform_id||t.name||e.id||"Unnamed Track":e.properties.name||t.label||e.id||"Unnamed Feature"}function ms(e){var t,r;if(Bn(e)&&((r=(t=e.properties.style)==null?void 0:t.line)!=null&&r.color))return e.properties.style.line.color;if(Bn(e))switch(e.properties.track_type){case"OWNSHIP":return"#0066cc";case"CONTACT":return"#cc0000";case"REFERENCE":return"#666666";case"SOLUTION":return"#00cc66";default:return"#999999"}else switch(e.properties.location_type){case"DANGER_AREA":return"#cc0000";case"EXERCISE_AREA":return"#ff9900";default:return"#0066cc"}}function hg(e,t){if(e.length===0)return-1;if(e.length===1||t<=e[0])return 0;if(t>=e[e.length-1])return e.length-1;let r=0,i=e.length-1;for(;r<=i;){const u=r+i>>>1,d=e[u];if(d===t)return u;d<t?r=u+1:i=u-1}if(r>=e.length)return e.length-1;if(r===0)return 0;const a=Math.abs(e[r]-t),l=Math.abs(e[r-1]-t);return a<=l?r:r-1}function ub(e,t,r){if(e.length===0||t.length===0)return[];const i=hg(t,r);return i<0?[]:r<t[0]?[]:e.slice(0,i+1)}function pg(e){if(!e||!e.geometry||!e.properties||e.geometry.type!=="LineString")return null;const t=e.geometry.coordinates,r=e.properties.times;if(!r||!Array.isArray(r)||r.length===0||t.length===0||r.length!==t.length)return null;const i=r[0],a=r[r.length-1];return{trackId:String(e.id??""),coordinates:t,timestamps:r,timeExtent:[i,a]}}function cb(e,t,r){const i=P.useMemo(()=>pg(e),[e]),a=P.useMemo(()=>{if(!i)return{nearestIndex:-1,nearestTime:0,visibleCoordinates:[],showMarker:!1,markerPosition:null};const{coordinates:u,timestamps:d,timeExtent:h}=i,p=hg(d,t),b=p>=0?d[p]:0;if(r==="trail"){const C=ub(u,d,t);return{nearestIndex:p,nearestTime:b,visibleCoordinates:C,showMarker:!1,markerPosition:null}}const _=p>=0&&t>=h[0],y=_?u[p]:null;return{nearestIndex:p,nearestTime:b,visibleCoordinates:u,showMarker:_,markerPosition:y}},[i,t,r]),l=P.useMemo(()=>i?`${i.trackId}-${r}-${a.nearestIndex}`:"no-data",[i,r,a.nearestIndex]);return{renderState:a,renderKey:l,hasTemporalData:i!==null}}const db={radius:8,fillColor:"#ff6b6b",fillOpacity:1,strokeColor:"#ffffff",strokeWeight:2};function fb({position:e,style:t,tooltip:r}){const i={...db,...t};return w.jsx(Mu,{center:e,radius:i.radius,pathOptions:{fillColor:i.fillColor,fillOpacity:i.fillOpacity,color:i.strokeColor,weight:i.strokeWeight},children:r&&w.jsx(Wa,{direction:"top",children:r})})}function hb(e){const t=Array.isArray(e)?e:e.features;if(t.length===0)return null;let r=1/0,i=-1/0;for(const a of t)if(Bn(a)){let l=nn(a.properties.start_time),u=nn(a.properties.end_time);if(l===null||u===null){const h=a.properties.times;if(Array.isArray(h)&&h.length>0){const p=h[0],b=h[h.length-1];l===null&&p!==void 0&&(l=typeof p=="number"?p:nn(p)),u===null&&b!==void 0&&(u=typeof b=="number"?b:nn(b))}}l!==null&&(r=Math.min(r,l)),u!==null&&(i=Math.max(i,u))}else{const l=a.properties;if(l.valid_from){const u=nn(l.valid_from);u!==null&&(r=Math.min(r,u))}if(l.valid_until){const u=nn(l.valid_until);u!==null&&(i=Math.max(i,u))}if(l.start_time){const u=nn(l.start_time);u!==null&&(r=Math.min(r,u))}if(l.end_time){const u=nn(l.end_time);u!==null&&(i=Math.max(i,u))}if(l.time){const u=nn(l.time);u!==null&&(r=Math.min(r,u),i=Math.max(i,u))}}return r===1/0||i===-1/0?null:[r,i]}function nn(e){if(!e)return null;const t=Date.parse(e);return isNaN(t)?null:t}function fh(e){if(!e||typeof e!="string")return null;const t=e.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/);if(!t)return null;const[,r,i,a,l]=t;if(!r&&!i&&!a&&!l)return null;const u=parseInt(r||"0",10)*24*60*60*1e3+parseInt(i||"0",10)*60*60*1e3+parseInt(a||"0",10)*60*1e3+parseFloat(l||"0")*1e3;return u>0?u:null}function hh(e,t){const r=new Set;if(e.length===0||t<=0||(r.add(0),e.length===1))return r;const i=e[0],a=e[e.length-1];let l=i+t;for(;l<=a;){let u=-1,d=1/0;for(let h=0;h<e.length;h++){const p=Math.abs(e[h]-l);p<d&&(d=p,u=h)}u>=0&&r.add(u),l+=t}return e.length>1&&r.add(e.length-1),r}function pb(e,t,r,i,a,l){let u=t.show_symbol,d=t.symbol,h=t.show_label,p=null;if(r.has(e)&&(u=!0),i.has(e)&&(h=!0),a&&(a.show_symbol!==void 0&&a.show_symbol!==null&&(u=a.show_symbol),a.symbol&&(d=a.symbol),a.show_label!==void 0&&a.show_label!==null&&(h=a.show_label),a.label&&(p=a.label)),h&&!p&&l){const b=typeof l=="number"?l:Date.parse(l);isNaN(b)||(p=new Date(b).toLocaleTimeString())}return{showSymbol:u,symbol:d,showLabel:h,labelText:p}}function mb(e,t,r,i,a){const l=e.map(b=>Date.parse(b.time)),u=fh(r),d=fh(i),h=u?hh(l,u):new Set,p=d?hh(l,d):new Set;return e.map((b,_)=>{const y=(a==null?void 0:a[_])??null;return pb(_,t,h,p,y,b.time)})}const gb={show_symbol:!1,symbol:"circle",show_label:!1};function vb({feature:e,currentTime:t,displayMode:r="full",isSelected:i=!1}){const a=e.properties,l=ms(e),u=P.useMemo(()=>a.positions??[],[a.positions]),d=P.useMemo(()=>e.geometry.coordinates??[],[e.geometry.coordinates]),h=a.default_position_style??gb,p=a.symbol_interval,b=a.label_interval,_=a.position_style_overrides,y=P.useMemo(()=>u.length===0?[]:mb(u,h,p,b,_),[u,h,p,b,_]),C=P.useMemo(()=>{if(!t||r==="full"||u.length===0)return{start:0,end:u.length-1};let k=u.length-1;for(let D=0;D<u.length;D++){const x=u[D];if(!x)continue;if(Date.parse(x.time)>t){k=Math.max(0,D-1);break}}return{start:0,end:k}},[t,r,u]),T=P.useMemo(()=>{const k=[];for(let D=C.start;D<=C.end;D++){const x=y[D];if(!x||!x.showSymbol&&!x.showLabel)continue;const g=d[D];if(!g)continue;const v=[g[1],g[0]],E=i?"var(--debrief-selection-border)":l,N=_b(x.symbol);x.showSymbol?k.push(w.jsx(Mu,{center:v,radius:N,pathOptions:{color:E,fillColor:E,fillOpacity:.7,weight:2},children:x.showLabel&&x.labelText&&w.jsx(Wa,{permanent:!0,direction:"right",offset:[10,0],children:x.labelText})},`symbol-${D}`)):x.showLabel&&x.labelText&&k.push(w.jsx(Mu,{center:v,radius:0,pathOptions:{opacity:0,fillOpacity:0},children:w.jsx(Wa,{permanent:!0,direction:"right",offset:[5,0],children:x.labelText})},`label-${D}`))}return k},[C,y,d,l,i]);return T.length===0?null:w.jsx(ab,{children:T})}function _b(e){switch(e){case"square":return 6;case"triangle":return 7;case"circle":default:return 5}}function yb({feature:e,currentTime:t,displayMode:r,isSelected:i=!1,markerStyle:a,onClick:l}){var u;const{renderState:d,renderKey:h,hasTemporalData:p}=cb(e,t,r),b=ms(e),_=P.useMemo(()=>!p||d.visibleCoordinates.length<2?null:{type:"Feature",id:e.id,geometry:{type:"LineString",coordinates:d.visibleCoordinates},properties:e.properties},[e.id,e.properties,d.visibleCoordinates,p]),y=P.useMemo(()=>({color:i?"var(--debrief-selection-border)":b,weight:i?4:3,opacity:1}),[i,b]),C=P.useMemo(()=>{if(l)return(k,D)=>{D.on("click",x=>{var g;const v=x;(g=v.originalEvent)==null||g.stopPropagation(),l(String(e.id),v.originalEvent)})}},[l,e.id]);if(!_)return null;const T=d.markerPosition?[d.markerPosition[1],d.markerPosition[0]]:null;return w.jsxs(w.Fragment,{children:[w.jsx(lg,{data:_,style:()=>y,onEachFeature:C},h),d.showMarker&&T&&w.jsx(fb,{position:T,style:a,tooltip:(u=e.properties)==null?void 0:u.name}),Bn(e)&&w.jsx(vb,{feature:e,currentTime:t,displayMode:r,isSelected:i})]})}const bb="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAApCAYAAADAk4LOAAAFgUlEQVR4Aa1XA5BjWRTN2oW17d3YaZtr2962HUzbDNpjszW24mRt28p47v7zq/bXZtrp/lWnXr337j3nPCe85NcypgSFdugCpW5YoDAMRaIMqRi6aKq5E3YqDQO3qAwjVWrD8Ncq/RBpykd8oZUb/kaJutow8r1aP9II0WmLKLIsJyv1w/kqw9Ch2MYdB++12Onxee/QMwvf4/Dk/Lfp/i4nxTXtOoQ4pW5Aj7wpici1A9erdAN2OH64x8OSP9j3Ft3b7aWkTg/Fm91siTra0f9on5sQr9INejH6CUUUpavjFNq1B+Oadhxmnfa8RfEmN8VNAsQhPqF55xHkMzz3jSmChWU6f7/XZKNH+9+hBLOHYozuKQPxyMPUKkrX/K0uWnfFaJGS1QPRtZsOPtr3NsW0uyh6NNCOkU3Yz+bXbT3I8G3xE5EXLXtCXbbqwCO9zPQYPRTZ5vIDXD7U+w7rFDEoUUf7ibHIR4y6bLVPXrz8JVZEql13trxwue/uDivd3fkWRbS6/IA2bID4uk0UpF1N8qLlbBlXs4Ee7HLTfV1j54APvODnSfOWBqtKVvjgLKzF5YdEk5ewRkGlK0i33Eofffc7HT56jD7/6U+qH3Cx7SBLNntH5YIPvODnyfIXZYRVDPqgHtLs5ABHD3YzLuespb7t79FY34DjMwrVrcTuwlT55YMPvOBnRrJ4VXTdNnYug5ucHLBjEpt30701A3Ts+HEa73u6dT3FNWwflY86eMHPk+Yu+i6pzUpRrW7SNDg5JHR4KapmM5Wv2E8Tfcb1HoqqHMHU+uWDD7zg54mz5/2BSnizi9T1Dg4QQXLToGNCkb6tb1NU+QAlGr1++eADrzhn/u8Q2YZhQVlZ5+CAOtqfbhmaUCS1ezNFVm2imDbPmPng5wmz+gwh+oHDce0eUtQ6OGDIyR0uUhUsoO3vfDmmgOezH0mZN59x7MBi++WDL1g/eEiU3avlidO671bkLfwbw5XV2P8Pzo0ydy4t2/0eu33xYSOMOD8hTf4CrBtGMSoXfPLchX+J0ruSePw3LZeK0juPJbYzrhkH0io7B3k164hiGvawhOKMLkrQLyVpZg8rHFW7E2uHOL888IBPlNZ1FPzstSJM694fWr6RwpvcJK60+0HCILTBzZLFNdtAzJaohze60T8qBzyh5ZuOg5e7uwQppofEmf2++DYvmySqGBuKaicF1blQjhuHdvCIMvp8whTTfZzI7RldpwtSzL+F1+wkdZ2TBOW2gIF88PBTzD/gpeREAMEbxnJcaJHNHrpzji0gQCS6hdkEeYt9DF/2qPcEC8RM28Hwmr3sdNyht00byAut2k3gufWNtgtOEOFGUwcXWNDbdNbpgBGxEvKkOQsxivJx33iow0Vw5S6SVTrpVq11ysA2Rp7gTfPfktc6zhtXBBC+adRLshf6sG2RfHPZ5EAc4sVZ83yCN00Fk/4kggu40ZTvIEm5g24qtU4KjBrx/BTTH8ifVASAG7gKrnWxJDcU7x8X6Ecczhm3o6YicvsLXWfh3Ch1W0k8x0nXF+0fFxgt4phz8QvypiwCCFKMqXCnqXExjq10beH+UUA7+nG6mdG/Pu0f3LgFcGrl2s0kNNjpmoJ9o4B29CMO8dMT4Q5ox8uitF6fqsrJOr8qnwNbRzv6hSnG5wP+64C7h9lp30hKNtKdWjtdkbuPA19nJ7Tz3zR/ibgARbhb4AlhavcBebmTHcFl2fvYEnW0ox9xMxKBS8btJ+KiEbq9zA4RthQXDhPa0T9TEe69gWupwc6uBUphquXgf+/FrIjweHQS4/pduMe5ERUMHUd9xv8ZR98CxkS4F2n3EUrUZ10EYNw7BWm9x1GiPssi3GgiGRDKWRYZfXlON+dfNbM+GgIwYdwAAAAASUVORK5CYII=",xb="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAABSCAMAAAAhFXfZAAAC91BMVEVMaXEzeak2f7I4g7g3g7cua5gzeKg8hJo3grY4g7c3grU0gLI2frE0daAubJc2gbQwd6QzeKk2gLMtd5sxdKIua5g1frA2f7IydaM0e6w2fq41fK01eqo3grgubJgta5cxdKI1f7AydaQydaMxc6EubJgvbJkwcZ4ubZkwcJwubZgubJcydqUydKIxapgubJctbJcubZcubJcvbJYubJcvbZkubJctbJctbZcubJg2f7AubJcrbZcubJcubJcua5g3grY0fq8ubJcubJdEkdEwhsw6i88vhswuhcsuhMtBjMgthMsrg8srgss6is8qgcs8i9A9iMYtg8spgcoogMo7hcMngMonf8olfso4gr8kfck5iM8jfMk4iM8he8k1fro7itAgesk2hs8eecgzfLcofssdeMg0hc4cd8g2hcsxeLQbdsgZdcgxeLImfcszhM0vda4xgckzhM4xg84wf8Yxgs4udKsvfcQucqhUndROmdM1fK0wcZ8vb5w0eqpQm9MzeKhXoNVcpdYydKNWn9VZotVKltJFjsIwcJ1Rms9OlslLmtH///8+kc9epdYzd6dbo9VHkMM2f7FHmNBClM8ydqVcpNY9hro3gLM9hLczealQmcw3fa46f7A8gLMxc6I3eagyc6FIldJMl9JSnNRSntNNl9JPnNJFi75UnM9ZodVKksg8kM45jc09e6ZHltFBk883gbRBh7pDk9EwcaBzn784g7dKkcY2i81Om9M7j85Llc81is09g7Q4grY/j9A0eqxKmdFFltBEjcXf6fFImdBCiLxJl9FGlNFBi78yiMxVndEvbpo6js74+vx+psPP3+o/ks5HkcpGmNCjwdZCkNDM3ehYoNJEls+lxNkxh8xHks0+jdC1zd5Lg6r+/v/H2ufz9/o3jM3t8/edvdM/k89Th61OiLBSjbZklbaTt9BfptdjmL1AicBHj8hGk9FAgK1dkLNTjLRekrdClc/k7fM0icy0y9tgp9c4jc2NtM9Dlc8zicxeXZn3AAAAQ3RSTlMAHDdTb4yPA+LtnEQmC4L2EmHqB7XA0d0sr478x4/Yd5i1zOfyPkf1sLVq4Nh3FvjxopQ2/STNuFzUwFIwxKaejILpIBEV9wAABhVJREFUeF6s1NdyFEcYBeBeoQIhRAkLlRDGrhIgY3BJL8CVeKzuyXFzzjkn5ZxzzuScg3PO8cKzu70JkO0LfxdTU//pM9vTu7Xgf6KqOVTb9X7toRrVEfBf1HTVjZccrT/2by1VV928Yty9ZbVuucdz90frG8DBjl9pVApbOstvmMuvVgaNXSfAAd6pGxpy6yxf5ph43pS/4f3uoaGm2rdu72S9xzOvMymkZFq/ptDrk90mhW7e4zl7HLzhxGWPR20xmSxJ/VqldG5m9XhaVOA1DadsNh3Pu5L2N6QtPO/32JpqQBVVk20oy/Pi2s23WEvyfHbe1thadVQttvm7Llf65gGmXK67XtupyoM7HQhmXdLS8oGWJNeOJ3C5fG5XCEJnkez3/oFdsvgJ4l2ANZwhrJKk/7OSXa+3Vw2WJMlKnGkobouYk6T0TyX30klOUnTD9HJ5qpckL3EW/w4XF3Xd0FGywXUrstrclVsqz5Pd/sXFYyDnPdrLcQODmGOK47IZb4CmibmMn+MYRzFZ5jg33ZL/EJrWcszHmANy3ARBK/IXtciJy8VsitPSdE3uuHxzougojcUdr8/32atnz/ev3f/K5wtpxUTpcaI45zusVDpYtZi+jg0oU9b3x74h7+n9ABvYEZeKaVq0sh0AtLKsFtqNBdeT0MrSzwwlq9+x6xAO4tgOtSzbCjrNQQiNvQUbUEubvzBUeGw26yDCsRHCoLkTHDa7IdOLIThs/gHvChszh2CimE8peRs47cxANI0lYNB5y1DljpOF0IhzBDPOZnDOqYYbeGKECbPzWnXludPphw5c2YBq5zlwXphIbO4VDCZ0gnPfUO1TwZoYwAs2ExPCedAu9DAjfQUjzITQb3jNj0KG2Sgt6BHaQUdYzWz+XmBktOHwanXjaSTcwwziBcuMOtwBmqPrTOxFQR/DRKKPqyur0aiW6cULYsx6tBm0jXpR/AUWR6HRq9WVW6MRhIq5jLyjbaCTDCijyYJNpCajdyobP/eTw0iexBAKkJ3gA5KcQb2zBXsIBckn+xVv8jkZSaEFHE+jFEleAEfayRU0MouNoBmB/L50Ai/HSLIHxcrpCvnhSQAuakKp2C/YbCylJjXRVy/z3+Kv/RrNcCo+WUzlVEhzKffnTQnxeN9fWF88fiNCUdSTsaufaChKWInHeysygfpIqagoakW+vV20J8uyl6TyNKEZWV4oRSPyCkWpgOLSbkCObT8o2r6tlG58HQquf6O0v50tB7JM7F4EORd2dx/K0w/KHsVkLPaoYrwgP/y7krr3SSMA4zj+OBgmjYkxcdIJQyQRKgg2viX9Hddi9UBb29LrKR7CVVEEEXWojUkXNyfTNDE14W9gbHJNuhjDettN3ZvbOvdOqCD3Jp/9l+/wJE+9PkYGjx/fqkys3S2rMozM/o2106rfMUINo6hVqz+eu/hd1c4xTg0TAfy5kV+4UG6+IthHTU9woWmxuKNbTfuCSfovBCxq7EtHqvYL4Sm6F8GVxsSXHMQ07TOi1DKtZxjWaaIyi4CXWjxPccUw8WVbMYY5wxC1mzEyXMJWkllpRloi+Kkoq69sxBTlElF6aAxYUbjXNlhlDZilDnM4U5SlN5biRsRHnbx3mbeWjEh4mEyiuJDl5XcWVmX5GvNkFgLWZM5qwsop4/AWfLhU1cR7k1VVvcYCWRkOI6Xy5gmnphCYIkvzuNYzHzosq2oNk2RtSs8khfUOfHIDgR6ysYBaMpl4uEgk2U/oJTs9AaTSwma7dT69geAE2ZpEjUsn2ieJNHeKfrI3EcAGJ2ZaNgVuC8EBctCLc57P5u5led6IOBkIYkuQMrmmjChs4VkfOerHqSBkPzZlhe06RslZ3zMjk2sscqKwY0RcjKK+LWbzd7KiHhkncs/siFJ+V5eXxD34B8nVuJEpGJNmxN2gH3vSvp7J70tF+D1Ej8qUJD1TkErAND2GZwTFg/LubvmgiBG3SOvdlsqFQrkEzJCL1rstlnVFROixZoDDSuXQFHESwVGlcuQcMb/b42NgjLowh5MTDFE3vNB5qStRIErdCQEh6pLPR92anSUb/wAIhldAaDMpGgAAAABJRU5ErkJggg==",wb="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACkAAAApCAQAAAACach9AAACMUlEQVR4Ae3ShY7jQBAE0Aoz/f9/HTMzhg1zrdKUrJbdx+Kd2nD8VNudfsL/Th///dyQN2TH6f3y/BGpC379rV+S+qqetBOxImNQXL8JCAr2V4iMQXHGNJxeCfZXhSRBcQMfvkOWUdtfzlLgAENmZDcmo2TVmt8OSM2eXxBp3DjHSMFutqS7SbmemzBiR+xpKCNUIRkdkkYxhAkyGoBvyQFEJEefwSmmvBfJuJ6aKqKWnAkvGZOaZXTUgFqYULWNSHUckZuR1HIIimUExutRxwzOLROIG4vKmCKQt364mIlhSyzAf1m9lHZHJZrlAOMMztRRiKimp/rpdJDc9Awry5xTZCte7FHtuS8wJgeYGrex28xNTd086Dik7vUMscQOa8y4DoGtCCSkAKlNwpgNtphjrC6MIHUkR6YWxxs6Sc5xqn222mmCRFzIt8lEdKx+ikCtg91qS2WpwVfBelJCiQJwvzixfI9cxZQWgiSJelKnwBElKYtDOb2MFbhmUigbReQBV0Cg4+qMXSxXSyGUn4UbF8l+7qdSGnTC0XLCmahIgUHLhLOhpVCtw4CzYXvLQWQbJNmxoCsOKAxSgBJno75avolkRw8iIAFcsdc02e9iyCd8tHwmeSSoKTowIgvscSGZUOA7PuCN5b2BX9mQM7S0wYhMNU74zgsPBj3HU7wguAfnxxjFQGBE6pwN+GjME9zHY7zGp8wVxMShYX9NXvEWD3HbwJf4giO4CFIQxXScH1/TM+04kkBiAAAAAElFTkSuQmCC";var kb=Object.defineProperty,Sb=(e,t,r)=>t in e?kb(e,t,{enumerable:!0,configurable:!0,writable:!0,value:r}):e[t]=r,kr=(e,t,r)=>Sb(e,typeof t!="symbol"?t+"":t,r);class Cb extends kn.Control{constructor(t){super(t),kr(this,"container",null),kr(this,"map",null),kr(this,"visibleBounds",null),kr(this,"fitPadding",.1),kr(this,"showZoomControls",!0),kr(this,"showFitButton",!0),this.visibleBounds=t.visibleBounds,this.fitPadding=t.fitPadding,this.showZoomControls=t.showZoomControls,this.showFitButton=t.showFitButton}onAdd(t){return this.map=t,this.container=kn.DomUtil.create("div","debrief-leaflet-toolbar leaflet-bar"),this.render(),this.container}onRemove(){this.map=null,this.container=null}updateProps(t){this.visibleBounds=t.visibleBounds,this.fitPadding=t.fitPadding,this.showZoomControls=t.showZoomControls,this.showFitButton=t.showFitButton,this.render()}render(){if(!(!this.container||!this.map)){if(this.container.innerHTML="",this.showZoomControls){const t=this.createButton("+","Zoom in","debrief-leaflet-toolbar__button debrief-leaflet-toolbar__zoom-in",()=>{var i;return(i=this.map)==null?void 0:i.zoomIn()});this.container.appendChild(t);const r=this.createButton("−","Zoom out","debrief-leaflet-toolbar__button debrief-leaflet-toolbar__zoom-out",()=>{var i;return(i=this.map)==null?void 0:i.zoomOut()});this.container.appendChild(r)}if(this.showFitButton){const t=this.createButton(this.getFitIcon(),"Fit to visible features","debrief-leaflet-toolbar__button debrief-leaflet-toolbar__fit",()=>this.handleFitToWindow());t.innerHTML=this.getFitIcon(),this.container.appendChild(t)}}}createButton(t,r,i,a){const l=kn.DomUtil.create("a",i);return l.href="#",l.title=r,l.setAttribute("role","button"),l.setAttribute("aria-label",r),l.innerHTML=t,kn.DomEvent.disableClickPropagation(l),kn.DomEvent.on(l,"click",u=>{kn.DomEvent.preventDefault(u),a()}),l}getFitIcon(){return`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M15 3h6v6"></path>
      <path d="M9 21H3v-6"></path>
      <path d="M21 3l-7 7"></path>
      <path d="M3 21l7-7"></path>
    </svg>`}handleFitToWindow(){if(!this.map||!this.visibleBounds)return;const[t,r,i,a]=Au(this.visibleBounds,this.fitPadding);this.map.fitBounds([[r,t],[a,i]])}}function Pb({position:e="topleft",visibleBounds:t,fitPadding:r=.1,showZoomControls:i=!0,showFitButton:a=!0}){const l=ps(),u=P.useRef(null);return P.useEffect(()=>{if(!l._controlCorners)return;const h=new Cb({position:e,visibleBounds:t,fitPadding:r,showZoomControls:i,showFitButton:a});return h.addTo(l),u.current=h,()=>{h.remove(),u.current=null}},[l,e]),P.useEffect(()=>{u.current&&u.current.updateProps({visibleBounds:t,fitPadding:r,showZoomControls:i,showFitButton:a})},[t,r,i,a]),null}delete kn.Icon.Default.prototype._getIconUrl;kn.Icon.Default.mergeOptions({iconUrl:bb,iconRetinaUrl:xb,shadowUrl:wb});function Tb({bounds:e,autoFitBounds:t,viewport:r,fitBoundsTrigger:i,onZoomChange:a,onBoundsChange:l,onBackgroundClick:u}){const d=ps();return P.useEffect(()=>{if(t&&e){const[h,p,b,_]=Au(e,.1);d.fitBounds([[p,h],[_,b]])}},[d,e,t]),P.useEffect(()=>{r&&d.setView(r.center,r.zoom,{animate:!1})},[d,r]),P.useEffect(()=>{if(i!==void 0&&i>0&&e){const[h,p,b,_]=Au(e,.1);d.fitBounds([[p,h],[_,b]])}},[d,i,e]),ob({zoomend:()=>{a==null||a(d.getZoom())},moveend:()=>{const h=d.getBounds();l==null||l([h.getWest(),h.getSouth(),h.getEast(),h.getNorth()])},click:h=>{h.originalEvent.target.classList.contains("leaflet-container")&&(u==null||u())}}),null}function Eb({features:e,selectedIds:t=new Set,onSelect:r,onBackgroundClick:i,onZoomChange:a,onBoundsChange:l,initialZoom:u=10,initialCenter:d=[50,-4],viewport:h,autoFitBounds:p=!0,fitBoundsTrigger:b,tileLayerUrl:_="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",tileLayerAttribution:y='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',className:C,style:T,height:k=400,currentTime:D,displayMode:x="full",visibleIds:g,showToolbar:v=!0,toolbarPosition:E="topleft"}){const N=P.useMemo(()=>(Array.isArray(e)?e:e.features).filter(le=>{if(!le.geometry)return!1;const U=le.geometry.coordinates;return!(Array.isArray(U)&&U.length===0)}),[e]),{temporalFeatures:R,staticFeatures:z}=P.useMemo(()=>{if(D===void 0)return{temporalFeatures:[],staticFeatures:N};const J=[],le=[];for(const U of N)pg(U)?J.push(U):le.push(U);return{temporalFeatures:J,staticFeatures:le}},[N,D]),O=P.useMemo(()=>dh(N),[N]),B=P.useMemo(()=>{if(!g||g.size===0)return O;const J=N.filter(le=>g.has(le.id));return dh(J)},[N,g,O]),H=P.useMemo(()=>({type:"FeatureCollection",features:z.map(J=>({...J,geometry:{...J.geometry,coordinates:J.geometry.coordinates}}))}),[z]),V=P.useMemo(()=>J=>{if(!J)return{};const le=J,U=t.has(le.id),X=ms(le);return{color:U?"var(--debrief-selection-border)":X,weight:U?4:Bn(le)?3:2,opacity:1,fillColor:X,fillOpacity:U?.4:.2}},[t]),oe=P.useMemo(()=>(J,le)=>{const U=J,X=fg(U);le.bindTooltip(X,{permanent:!1,direction:"top"}),le.on("click",I=>{I.originalEvent.stopPropagation(),r==null||r(U.id,I.originalEvent)})},[r]),Ne={height:typeof k=="number"?`${k}px`:k,minHeight:"var(--debrief-map-min-height)",...T};return w.jsx("div",{className:`debrief-mapview ${C??""}`,style:Ne,children:w.jsxs(ug,{center:d,zoom:u,className:"debrief-mapview__container",style:{height:"100%",width:"100%"},zoomControl:!v,children:[w.jsx(cg,{url:_,attribution:y}),v&&w.jsx(Pb,{position:E,visibleBounds:B}),w.jsx(Tb,{bounds:O,autoFitBounds:p,viewport:h,fitBoundsTrigger:b,onZoomChange:a,onBoundsChange:l,onBackgroundClick:i}),z.length>0&&w.jsx(lg,{data:H,style:V,onEachFeature:oe},JSON.stringify(t.size)+z.length),D!==void 0&&R.map(J=>w.jsx(yb,{feature:J,currentTime:D,displayMode:x,isSelected:t.has(J.id),onClick:r},String(J.id)))]})})}function Sr(e,t,r){let i=r.initialDeps??[],a,l=!0;function u(){var d,h,p;let b;r.key&&((d=r.debug)!=null&&d.call(r))&&(b=Date.now());const _=e();if(!(_.length!==i.length||_.some((T,k)=>i[k]!==T)))return a;i=_;let C;if(r.key&&((h=r.debug)!=null&&h.call(r))&&(C=Date.now()),a=t(..._),r.key&&((p=r.debug)!=null&&p.call(r))){const T=Math.round((Date.now()-b)*100)/100,k=Math.round((Date.now()-C)*100)/100,D=k/16,x=(g,v)=>{for(g=String(g);g.length<v;)g=" "+g;return g};console.info(`%c⏱ ${x(k,5)} /${x(T,5)} ms`,`
            font-size: .6rem;
            font-weight: bold;
            color: hsl(${Math.max(0,Math.min(120-120*D,120))}deg 100% 31%);`,r==null?void 0:r.key)}return r!=null&&r.onChange&&!(l&&r.skipInitialOnChange)&&r.onChange(a),l=!1,a}return u.updateDeps=d=>{i=d},u}function ph(e,t){if(e===void 0)throw new Error("Unexpected undefined");return e}const Lb=(e,t)=>Math.abs(e-t)<1.01,zb=(e,t,r)=>{let i;return function(...a){e.clearTimeout(i),i=e.setTimeout(()=>t.apply(this,a),r)}},mh=e=>{const{offsetWidth:t,offsetHeight:r}=e;return{width:t,height:r}},Mb=e=>e,Nb=e=>{const t=Math.max(e.startIndex-e.overscan,0),r=Math.min(e.endIndex+e.overscan,e.count-1),i=[];for(let a=t;a<=r;a++)i.push(a);return i},Ab=(e,t)=>{const r=e.scrollElement;if(!r)return;const i=e.targetWindow;if(!i)return;const a=u=>{const{width:d,height:h}=u;t({width:Math.round(d),height:Math.round(h)})};if(a(mh(r)),!i.ResizeObserver)return()=>{};const l=new i.ResizeObserver(u=>{const d=()=>{const h=u[0];if(h!=null&&h.borderBoxSize){const p=h.borderBoxSize[0];if(p){a({width:p.inlineSize,height:p.blockSize});return}}a(mh(r))};e.options.useAnimationFrameWithResizeObserver?requestAnimationFrame(d):d()});return l.observe(r,{box:"border-box"}),()=>{l.unobserve(r)}},gh={passive:!0},vh=typeof window>"u"?!0:"onscrollend"in window,Ob=(e,t)=>{const r=e.scrollElement;if(!r)return;const i=e.targetWindow;if(!i)return;let a=0;const l=e.options.useScrollendEvent&&vh?()=>{}:zb(i,()=>{t(a,!1)},e.options.isScrollingResetDelay),u=b=>()=>{const{horizontal:_,isRtl:y}=e.options;a=_?r.scrollLeft*(y&&-1||1):r.scrollTop,l(),t(a,b)},d=u(!0),h=u(!1);r.addEventListener("scroll",d,gh);const p=e.options.useScrollendEvent&&vh;return p&&r.addEventListener("scrollend",h,gh),()=>{r.removeEventListener("scroll",d),p&&r.removeEventListener("scrollend",h)}},Ib=(e,t,r)=>{if(t!=null&&t.borderBoxSize){const i=t.borderBoxSize[0];if(i)return Math.round(i[r.options.horizontal?"inlineSize":"blockSize"])}return e[r.options.horizontal?"offsetWidth":"offsetHeight"]},Rb=(e,{adjustments:t=0,behavior:r},i)=>{var a,l;const u=e+t;(l=(a=i.scrollElement)==null?void 0:a.scrollTo)==null||l.call(a,{[i.options.horizontal?"left":"top"]:u,behavior:r})};class Db{constructor(t){this.unsubs=[],this.scrollElement=null,this.targetWindow=null,this.isScrolling=!1,this.currentScrollToIndex=null,this.measurementsCache=[],this.itemSizeCache=new Map,this.laneAssignments=new Map,this.pendingMeasuredCacheIndexes=[],this.prevLanes=void 0,this.lanesChangedFlag=!1,this.lanesSettling=!1,this.scrollRect=null,this.scrollOffset=null,this.scrollDirection=null,this.scrollAdjustments=0,this.elementsCache=new Map,this.observer=(()=>{let r=null;const i=()=>r||(!this.targetWindow||!this.targetWindow.ResizeObserver?null:r=new this.targetWindow.ResizeObserver(a=>{a.forEach(l=>{const u=()=>{this._measureElement(l.target,l)};this.options.useAnimationFrameWithResizeObserver?requestAnimationFrame(u):u()})}));return{disconnect:()=>{var a;(a=i())==null||a.disconnect(),r=null},observe:a=>{var l;return(l=i())==null?void 0:l.observe(a,{box:"border-box"})},unobserve:a=>{var l;return(l=i())==null?void 0:l.unobserve(a)}}})(),this.range=null,this.setOptions=r=>{Object.entries(r).forEach(([i,a])=>{typeof a>"u"&&delete r[i]}),this.options={debug:!1,initialOffset:0,overscan:1,paddingStart:0,paddingEnd:0,scrollPaddingStart:0,scrollPaddingEnd:0,horizontal:!1,getItemKey:Mb,rangeExtractor:Nb,onChange:()=>{},measureElement:Ib,initialRect:{width:0,height:0},scrollMargin:0,gap:0,indexAttribute:"data-index",initialMeasurementsCache:[],lanes:1,isScrollingResetDelay:150,enabled:!0,isRtl:!1,useScrollendEvent:!1,useAnimationFrameWithResizeObserver:!1,...r}},this.notify=r=>{var i,a;(a=(i=this.options).onChange)==null||a.call(i,this,r)},this.maybeNotify=Sr(()=>(this.calculateRange(),[this.isScrolling,this.range?this.range.startIndex:null,this.range?this.range.endIndex:null]),r=>{this.notify(r)},{key:!1,debug:()=>this.options.debug,initialDeps:[this.isScrolling,this.range?this.range.startIndex:null,this.range?this.range.endIndex:null]}),this.cleanup=()=>{this.unsubs.filter(Boolean).forEach(r=>r()),this.unsubs=[],this.observer.disconnect(),this.scrollElement=null,this.targetWindow=null},this._didMount=()=>()=>{this.cleanup()},this._willUpdate=()=>{var r;const i=this.options.enabled?this.options.getScrollElement():null;if(this.scrollElement!==i){if(this.cleanup(),!i){this.maybeNotify();return}this.scrollElement=i,this.scrollElement&&"ownerDocument"in this.scrollElement?this.targetWindow=this.scrollElement.ownerDocument.defaultView:this.targetWindow=((r=this.scrollElement)==null?void 0:r.window)??null,this.elementsCache.forEach(a=>{this.observer.observe(a)}),this.unsubs.push(this.options.observeElementRect(this,a=>{this.scrollRect=a,this.maybeNotify()})),this.unsubs.push(this.options.observeElementOffset(this,(a,l)=>{this.scrollAdjustments=0,this.scrollDirection=l?this.getScrollOffset()<a?"forward":"backward":null,this.scrollOffset=a,this.isScrolling=l,this.maybeNotify()})),this._scrollToOffset(this.getScrollOffset(),{adjustments:void 0,behavior:void 0})}},this.getSize=()=>this.options.enabled?(this.scrollRect=this.scrollRect??this.options.initialRect,this.scrollRect[this.options.horizontal?"width":"height"]):(this.scrollRect=null,0),this.getScrollOffset=()=>this.options.enabled?(this.scrollOffset=this.scrollOffset??(typeof this.options.initialOffset=="function"?this.options.initialOffset():this.options.initialOffset),this.scrollOffset):(this.scrollOffset=null,0),this.getFurthestMeasurement=(r,i)=>{const a=new Map,l=new Map;for(let u=i-1;u>=0;u--){const d=r[u];if(a.has(d.lane))continue;const h=l.get(d.lane);if(h==null||d.end>h.end?l.set(d.lane,d):d.end<h.end&&a.set(d.lane,!0),a.size===this.options.lanes)break}return l.size===this.options.lanes?Array.from(l.values()).sort((u,d)=>u.end===d.end?u.index-d.index:u.end-d.end)[0]:void 0},this.getMeasurementOptions=Sr(()=>[this.options.count,this.options.paddingStart,this.options.scrollMargin,this.options.getItemKey,this.options.enabled,this.options.lanes],(r,i,a,l,u,d)=>(this.prevLanes!==void 0&&this.prevLanes!==d&&(this.lanesChangedFlag=!0),this.prevLanes=d,this.pendingMeasuredCacheIndexes=[],{count:r,paddingStart:i,scrollMargin:a,getItemKey:l,enabled:u,lanes:d}),{key:!1}),this.getMeasurements=Sr(()=>[this.getMeasurementOptions(),this.itemSizeCache],({count:r,paddingStart:i,scrollMargin:a,getItemKey:l,enabled:u,lanes:d},h)=>{if(!u)return this.measurementsCache=[],this.itemSizeCache.clear(),this.laneAssignments.clear(),[];if(this.laneAssignments.size>r)for(const y of this.laneAssignments.keys())y>=r&&this.laneAssignments.delete(y);this.lanesChangedFlag&&(this.lanesChangedFlag=!1,this.lanesSettling=!0,this.measurementsCache=[],this.itemSizeCache.clear(),this.laneAssignments.clear(),this.pendingMeasuredCacheIndexes=[]),this.measurementsCache.length===0&&!this.lanesSettling&&(this.measurementsCache=this.options.initialMeasurementsCache,this.measurementsCache.forEach(y=>{this.itemSizeCache.set(y.key,y.size)}));const p=this.lanesSettling?0:this.pendingMeasuredCacheIndexes.length>0?Math.min(...this.pendingMeasuredCacheIndexes):0;this.pendingMeasuredCacheIndexes=[],this.lanesSettling&&this.measurementsCache.length===r&&(this.lanesSettling=!1);const b=this.measurementsCache.slice(0,p),_=new Array(d).fill(void 0);for(let y=0;y<p;y++){const C=b[y];C&&(_[C.lane]=y)}for(let y=p;y<r;y++){const C=l(y),T=this.laneAssignments.get(y);let k,D;if(T!==void 0&&this.options.lanes>1){k=T;const E=_[k],N=E!==void 0?b[E]:void 0;D=N?N.end+this.options.gap:i+a}else{const E=this.options.lanes===1?b[y-1]:this.getFurthestMeasurement(b,y);D=E?E.end+this.options.gap:i+a,k=E?E.lane:y%this.options.lanes,this.options.lanes>1&&this.laneAssignments.set(y,k)}const x=h.get(C),g=typeof x=="number"?x:this.options.estimateSize(y),v=D+g;b[y]={index:y,start:D,size:g,end:v,key:C,lane:k},_[k]=y}return this.measurementsCache=b,b},{key:!1,debug:()=>this.options.debug}),this.calculateRange=Sr(()=>[this.getMeasurements(),this.getSize(),this.getScrollOffset(),this.options.lanes],(r,i,a,l)=>this.range=r.length>0&&i>0?jb({measurements:r,outerSize:i,scrollOffset:a,lanes:l}):null,{key:!1,debug:()=>this.options.debug}),this.getVirtualIndexes=Sr(()=>{let r=null,i=null;const a=this.calculateRange();return a&&(r=a.startIndex,i=a.endIndex),this.maybeNotify.updateDeps([this.isScrolling,r,i]),[this.options.rangeExtractor,this.options.overscan,this.options.count,r,i]},(r,i,a,l,u)=>l===null||u===null?[]:r({startIndex:l,endIndex:u,overscan:i,count:a}),{key:!1,debug:()=>this.options.debug}),this.indexFromElement=r=>{const i=this.options.indexAttribute,a=r.getAttribute(i);return a?parseInt(a,10):(console.warn(`Missing attribute name '${i}={index}' on measured element.`),-1)},this._measureElement=(r,i)=>{const a=this.indexFromElement(r),l=this.measurementsCache[a];if(!l)return;const u=l.key,d=this.elementsCache.get(u);d!==r&&(d&&this.observer.unobserve(d),this.observer.observe(r),this.elementsCache.set(u,r)),r.isConnected&&this.resizeItem(a,this.options.measureElement(r,i,this))},this.resizeItem=(r,i)=>{const a=this.measurementsCache[r];if(!a)return;const l=this.itemSizeCache.get(a.key)??a.size,u=i-l;u!==0&&((this.shouldAdjustScrollPositionOnItemSizeChange!==void 0?this.shouldAdjustScrollPositionOnItemSizeChange(a,u,this):a.start<this.getScrollOffset()+this.scrollAdjustments)&&this._scrollToOffset(this.getScrollOffset(),{adjustments:this.scrollAdjustments+=u,behavior:void 0}),this.pendingMeasuredCacheIndexes.push(a.index),this.itemSizeCache=new Map(this.itemSizeCache.set(a.key,i)),this.notify(!1))},this.measureElement=r=>{if(!r){this.elementsCache.forEach((i,a)=>{i.isConnected||(this.observer.unobserve(i),this.elementsCache.delete(a))});return}this._measureElement(r,void 0)},this.getVirtualItems=Sr(()=>[this.getVirtualIndexes(),this.getMeasurements()],(r,i)=>{const a=[];for(let l=0,u=r.length;l<u;l++){const d=r[l],h=i[d];a.push(h)}return a},{key:!1,debug:()=>this.options.debug}),this.getVirtualItemForOffset=r=>{const i=this.getMeasurements();if(i.length!==0)return ph(i[mg(0,i.length-1,a=>ph(i[a]).start,r)])},this.getMaxScrollOffset=()=>{if(!this.scrollElement)return 0;if("scrollHeight"in this.scrollElement)return this.options.horizontal?this.scrollElement.scrollWidth-this.scrollElement.clientWidth:this.scrollElement.scrollHeight-this.scrollElement.clientHeight;{const r=this.scrollElement.document.documentElement;return this.options.horizontal?r.scrollWidth-this.scrollElement.innerWidth:r.scrollHeight-this.scrollElement.innerHeight}},this.getOffsetForAlignment=(r,i,a=0)=>{if(!this.scrollElement)return 0;const l=this.getSize(),u=this.getScrollOffset();i==="auto"&&(i=r>=u+l?"end":"start"),i==="center"?r+=(a-l)/2:i==="end"&&(r-=l);const d=this.getMaxScrollOffset();return Math.max(Math.min(d,r),0)},this.getOffsetForIndex=(r,i="auto")=>{r=Math.max(0,Math.min(r,this.options.count-1));const a=this.measurementsCache[r];if(!a)return;const l=this.getSize(),u=this.getScrollOffset();if(i==="auto")if(a.end>=u+l-this.options.scrollPaddingEnd)i="end";else if(a.start<=u+this.options.scrollPaddingStart)i="start";else return[u,i];if(i==="end"&&r===this.options.count-1)return[this.getMaxScrollOffset(),i];const d=i==="end"?a.end+this.options.scrollPaddingEnd:a.start-this.options.scrollPaddingStart;return[this.getOffsetForAlignment(d,i,a.size),i]},this.isDynamicMode=()=>this.elementsCache.size>0,this.scrollToOffset=(r,{align:i="start",behavior:a}={})=>{a==="smooth"&&this.isDynamicMode()&&console.warn("The `smooth` scroll behavior is not fully supported with dynamic size."),this._scrollToOffset(this.getOffsetForAlignment(r,i),{adjustments:void 0,behavior:a})},this.scrollToIndex=(r,{align:i="auto",behavior:a}={})=>{a==="smooth"&&this.isDynamicMode()&&console.warn("The `smooth` scroll behavior is not fully supported with dynamic size."),r=Math.max(0,Math.min(r,this.options.count-1)),this.currentScrollToIndex=r;let l=0;const u=10,d=p=>{if(!this.targetWindow)return;const b=this.getOffsetForIndex(r,p);if(!b){console.warn("Failed to get offset for index:",r);return}const[_,y]=b;this._scrollToOffset(_,{adjustments:void 0,behavior:a}),this.targetWindow.requestAnimationFrame(()=>{const C=()=>{if(this.currentScrollToIndex!==r)return;const T=this.getScrollOffset(),k=this.getOffsetForIndex(r,y);if(!k){console.warn("Failed to get offset for index:",r);return}Lb(k[0],T)||h(y)};this.isDynamicMode()?this.targetWindow.requestAnimationFrame(C):C()})},h=p=>{this.targetWindow&&this.currentScrollToIndex===r&&(l++,l<u?this.targetWindow.requestAnimationFrame(()=>d(p)):console.warn(`Failed to scroll to index ${r} after ${u} attempts.`))};d(i)},this.scrollBy=(r,{behavior:i}={})=>{i==="smooth"&&this.isDynamicMode()&&console.warn("The `smooth` scroll behavior is not fully supported with dynamic size."),this._scrollToOffset(this.getScrollOffset()+r,{adjustments:void 0,behavior:i})},this.getTotalSize=()=>{var r;const i=this.getMeasurements();let a;if(i.length===0)a=this.options.paddingStart;else if(this.options.lanes===1)a=((r=i[i.length-1])==null?void 0:r.end)??0;else{const l=Array(this.options.lanes).fill(null);let u=i.length-1;for(;u>=0&&l.some(d=>d===null);){const d=i[u];l[d.lane]===null&&(l[d.lane]=d.end),u--}a=Math.max(...l.filter(d=>d!==null))}return Math.max(a-this.options.scrollMargin+this.options.paddingEnd,0)},this._scrollToOffset=(r,{adjustments:i,behavior:a})=>{this.options.scrollToFn(r,{behavior:a,adjustments:i},this)},this.measure=()=>{this.itemSizeCache=new Map,this.laneAssignments=new Map,this.notify(!1)},this.setOptions(t)}}const mg=(e,t,r,i)=>{for(;e<=t;){const a=(e+t)/2|0,l=r(a);if(l<i)e=a+1;else if(l>i)t=a-1;else return a}return e>0?e-1:0};function jb({measurements:e,outerSize:t,scrollOffset:r,lanes:i}){const a=e.length-1,l=h=>e[h].start;if(e.length<=i)return{startIndex:0,endIndex:a};let u=mg(0,a,l,r),d=u;if(i===1)for(;d<a&&e[d].end<r+t;)d++;else if(i>1){const h=Array(i).fill(0);for(;d<a&&h.some(b=>b<r+t);){const b=e[d];h[b.lane]=b.end,d++}const p=Array(i).fill(r+t);for(;u>=0&&p.some(b=>b>=r);){const b=e[u];p[b.lane]=b.start,u--}u=Math.max(0,u-u%i),d=Math.min(a,d+(i-1-d%i))}return{startIndex:u,endIndex:d}}const _h=typeof document<"u"?P.useLayoutEffect:P.useEffect;function Bb({useFlushSync:e=!0,...t}){const r=P.useReducer(()=>({}),{})[1],i={...t,onChange:(l,u)=>{var d;e&&u?Dc.flushSync(r):r(),(d=t.onChange)==null||d.call(t,l,u)}},[a]=P.useState(()=>new Db(i));return a.setOptions(i),_h(()=>a._didMount(),[]),_h(()=>a._willUpdate()),a}function Fb(e){return Bb({observeElementRect:Ab,observeElementOffset:Ob,scrollToFn:Rb,...e})}function Zb(e){const t=e.properties;return Bn(e)?(e.properties.track_type||t.platformType)??"TRACK":(e.properties.location_type||t.locationType)??"POINT"}function Hb(e){if(Bn(e)){let t=e.properties.start_time,r=e.properties.end_time;if(!t||!r){const a=e.properties.times;if(Array.isArray(a)&&a.length>0){const l=a[0],u=a[a.length-1];!t&&typeof l=="string"&&(t=l),!r&&typeof u=="string"&&(r=u)}}if(t&&r){const i=new Date(t),a=new Date(r);return`${i.toLocaleTimeString()} - ${a.toLocaleTimeString()}`}}return null}function Wb({feature:e,isSelected:t,isHidden:r=!1,onClick:i,style:a}){const l=fg(e),u=Zb(e),d=ms(e),h=Hb(e),p=["debrief-feature-row",t&&"debrief-feature-row--selected",r&&"debrief-feature-row--hidden"].filter(Boolean).join(" ");return w.jsxs("div",{className:p,onClick:i,role:"button",tabIndex:0,onKeyDown:b=>{(b.key==="Enter"||b.key===" ")&&(b.preventDefault(),i(b))},style:a,children:[w.jsx("span",{className:"debrief-feature-row__indicator",style:{backgroundColor:d}}),w.jsxs("div",{className:"debrief-feature-row__content",children:[w.jsx("span",{className:"debrief-feature-row__name",children:l}),w.jsx("span",{className:"debrief-feature-row__type",children:u})]}),r&&w.jsx("span",{className:"debrief-feature-row__hidden-icon",title:"Hidden",children:w.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round",children:[w.jsx("path",{d:"M2 2l12 12"}),w.jsx("path",{d:"M6.5 6.5a2 2 0 0 0 3 3"}),w.jsx("path",{d:"M3.5 5.5C2.2 6.8 1.5 8 1.5 8s2.5 4.5 6.5 4.5c1 0 1.9-.3 2.7-.7"}),w.jsx("path",{d:"M10.7 10.7c2-1.3 3.3-2.7 3.3-2.7S11.5 3.5 8 3.5c-.7 0-1.3.1-1.9.3"})]})}),!r&&h&&w.jsx("span",{className:"debrief-feature-row__info",children:h})]})}function Ub(e){return Array.isArray(e)?e:e.features}function Vb({features:e,selectedIds:t=new Set,hiddenIds:r,onSelectionChange:i,onSelect:a,filter:l,height:u=300,rowHeight:d=40,className:h,style:p}){const b=P.useRef(null),_=P.useRef(null),y=P.useMemo(()=>{const g=Ub(e);return l?g.filter(l):g},[e,l]),C=P.useCallback((g,v)=>{const E=y[g];if(!E)return;if(!i){a==null||a(E.id),_.current=g;return}const N=v.ctrlKey||v.metaKey,R=v.shiftKey;let z;if(R&&_.current!==null){const O=Math.min(_.current,g),B=Math.max(_.current,g);z=new Set(N?t:[]);for(let H=O;H<=B;H++){const V=y[H];V&&z.add(V.id)}}else N?(z=new Set(t),z.has(E.id)?z.delete(E.id):z.add(E.id)):z=new Set([E.id]);_.current=g,i(z)},[y,t,i,a]),T=Fb({count:y.length,getScrollElement:()=>b.current,estimateSize:()=>d,overscan:5}),k=["debrief-feature-list",y.length===0&&"debrief-feature-list--empty",h].filter(Boolean).join(" "),D={height:`${u}px`,...p};if(y.length===0)return w.jsx("div",{className:k,style:D,children:w.jsx("div",{className:"debrief-feature-list__empty",children:"No features available"})});const x=T.getVirtualItems();return w.jsx("div",{className:k,style:D,children:w.jsx("div",{ref:b,className:"debrief-feature-list__scroll",style:{height:"100%",overflow:"auto"},children:w.jsx("div",{className:"debrief-feature-list__content",style:{height:`${T.getTotalSize()}px`,width:"100%",position:"relative"},children:x.map(g=>{const v=y[g.index];if(!v)return null;const E=t.has(v.id),N=(r==null?void 0:r.has(v.id))??!1;return w.jsx("div",{style:{position:"absolute",top:0,left:0,width:"100%",height:`${g.size}px`,transform:`translateY(${g.start}px)`},children:w.jsx(Wb,{feature:v,isSelected:E,isHidden:N,onClick:R=>C(g.index,R),style:{height:"100%"}})},g.key)})})})})}const Gb={theme:{variant:"light"},resolvedVariant:"light",setTheme:()=>{console.warn("ThemeProvider not found. Wrap your app with <ThemeProvider>.")},isDark:!1},gg=P.createContext(Gb);gg.displayName="DebriefThemeContext";const Kb={colorPrimary:"#0066cc",colorSecondary:"#6c757d",colorSuccess:"#28a745",colorWarning:"#ffc107",colorDanger:"#dc3545",colorOwnship:"#0066cc",colorContact:"#cc0000",colorReference:"#666666",colorSolution:"#00cc66",bgPrimary:"#ffffff",bgSecondary:"#f8f9fa",bgTertiary:"#e9ecef",textPrimary:"#212529",textSecondary:"#6c757d",textMuted:"#adb5bd",borderColor:"#dee2e6",borderColorFocus:"#0066cc",selectionBg:"rgba(0, 102, 204, 0.1)",selectionBorder:"#0066cc"},vg={colorPrimary:"#4da6ff",colorSecondary:"#8c939a",colorSuccess:"#48c774",colorWarning:"#ffdd57",colorDanger:"#f14668",colorOwnship:"#4da6ff",colorContact:"#ff6b6b",colorReference:"#888888",colorSolution:"#48c774",bgPrimary:"#1e1e1e",bgSecondary:"#252526",bgTertiary:"#2d2d30",textPrimary:"#cccccc",textSecondary:"#9d9d9d",textMuted:"#6d6d6d",borderColor:"#3c3c3c",borderColorFocus:"#4da6ff",selectionBg:"rgba(77, 166, 255, 0.15)",selectionBorder:"#4da6ff"},Yb={...vg};function Qb(e){switch(e){case"dark":return vg;case"vscode":return Yb;case"light":default:return Kb}}const $b={variant:"light"};function qb(e,t){return t?{...e,...t}:e}function Jb(){return typeof window>"u"?"light":window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}function Xb(e,t){const r=qb(Qb(e),t),i=document.documentElement;i.style.setProperty("--debrief-color-primary",r.colorPrimary),i.style.setProperty("--debrief-color-secondary",r.colorSecondary),i.style.setProperty("--debrief-color-success",r.colorSuccess),i.style.setProperty("--debrief-color-warning",r.colorWarning),i.style.setProperty("--debrief-color-danger",r.colorDanger),i.style.setProperty("--debrief-color-ownship",r.colorOwnship),i.style.setProperty("--debrief-color-contact",r.colorContact),i.style.setProperty("--debrief-color-reference",r.colorReference),i.style.setProperty("--debrief-color-solution",r.colorSolution),i.style.setProperty("--debrief-bg-primary",r.bgPrimary),i.style.setProperty("--debrief-bg-secondary",r.bgSecondary),i.style.setProperty("--debrief-bg-tertiary",r.bgTertiary),i.style.setProperty("--debrief-text-primary",r.textPrimary),i.style.setProperty("--debrief-text-secondary",r.textSecondary),i.style.setProperty("--debrief-text-muted",r.textMuted),i.style.setProperty("--debrief-border-color",r.borderColor),i.style.setProperty("--debrief-border-color-focus",r.borderColorFocus),i.style.setProperty("--debrief-selection-bg",r.selectionBg),i.style.setProperty("--debrief-selection-border",r.selectionBorder)}function ex({theme:e,children:t,container:r}){const[i,a]=P.useState(e??$b),[l,u]=P.useState(Jb);P.useEffect(()=>{if(typeof window>"u")return;const _=window.matchMedia("(prefers-color-scheme: dark)"),y=C=>{u(C.matches?"dark":"light")};return _.addEventListener("change",y),()=>_.removeEventListener("change",y)},[]);const d=P.useMemo(()=>i.variant==="system"?l:i.variant,[i.variant,l]);P.useEffect(()=>{(r??document.documentElement).setAttribute("data-theme",d),Xb(d,i.tokens)},[d,i.tokens,r]);const h=P.useCallback(_=>{a(y=>typeof _=="function"?_(y):_)},[]),p=d==="dark"||d==="vscode",b=P.useMemo(()=>({theme:i,resolvedVariant:d,setTheme:h,isDark:p}),[i,d,h,p]);return w.jsx(gg.Provider,{value:b,children:t})}function tx(e={}){const{initialSelection:t,maxSelection:r,onChange:i}=e,[a,l]=P.useState(()=>t?t instanceof Set?new Set(t):new Set(t):new Set),u=P.useCallback(g=>{l(g),i==null||i(g)},[i]),d=P.useCallback(g=>a.has(g),[a]),h=P.useCallback(g=>{u(new Set([g]))},[u]),p=P.useCallback(g=>{const v=new Set(a);if(v.has(g))v.delete(g);else{if(r!==void 0&&v.size>=r){const E=v.values().next().value;E&&v.delete(E)}v.add(g)}u(v)},[a,r,u]),b=P.useCallback(g=>{if(a.has(g)||r!==void 0&&a.size>=r)return;const v=new Set(a);v.add(g),u(v)},[a,r,u]),_=P.useCallback(g=>{if(!a.has(g))return;const v=new Set(a);v.delete(g),u(v)},[a,u]),y=P.useCallback(g=>{const v=r?g.slice(0,r):g;u(new Set(v))},[r,u]),C=P.useCallback(g=>{const v=new Set(a);for(const E of g)v.has(E)?v.delete(E):(r===void 0||v.size<r)&&v.add(E);u(v)},[a,r,u]),T=P.useCallback(()=>{u(new Set)},[u]),k=P.useCallback(g=>{const v=r?g.slice(0,r):g;u(new Set(v))},[r,u]),D=a.size,x=D>0;return P.useMemo(()=>({selectedIds:a,isSelected:d,select:h,toggle:p,add:b,remove:_,selectMultiple:y,toggleMultiple:C,clear:T,selectAll:k,count:D,hasSelection:x}),[a,d,h,p,b,_,y,C,T,k,D,x])}const nx={timeControllerCollapsed:!1,toolsCollapsed:!1,layersCollapsed:!1};function rx(e){const[t,r,i,a]=e;return[[r,t],[a,i]]}function ix(e){let t=1/0,r=1/0,i=-1/0,a=-1/0;for(const l of e){if(!l.bbox)continue;const[u,d,h,p]=l.bbox;r=Math.min(r,u),t=Math.min(t,d),a=Math.max(a,h),i=Math.max(i,p)}return t===1/0?null:[[t,r],[i,a]]}function ox({bounds:e}){const t=ps();return P.useEffect(()=>{e&&t.fitBounds(e,{padding:[20,20]})},[t,e]),null}function En(e){if(!e)return null;const t=new Date(e).getTime();return isNaN(t)?null:t}function ax(e){let t=1/0,r=-1/0;for(const i of e){const a=En(i.startDatetime)??En(i.datetime),l=En(i.endDatetime)??En(i.datetime);a!==null&&(t=Math.min(t,a)),l!==null&&(r=Math.max(r,l))}return t===1/0?null:(t===r&&(t-=36e5,r+=36e5),{min:t,max:r})}function yh(e){return new Date(e).toLocaleDateString(void 0,{year:"numeric",month:"short",day:"numeric"})}function bh(e,t,r){const i=e??r,a=t??r;return i&&a&&i!==a?`${new Date(i).toLocaleDateString()} – ${new Date(a).toLocaleDateString()}`:i?new Date(i).toLocaleDateString():"No time data"}const sx=({items:e,onItemSelect:t,initialSplitRatio:r=.6,onSplitRatioChange:i,className:a})=>{const[l,u]=P.useState(r),[d,h]=P.useState(!1),p=P.useRef(null),[b,_]=P.useState(null),y=P.useMemo(()=>e.filter(B=>B.bbox!==null),[e]),C=P.useMemo(()=>ix(y),[y]),T=P.useMemo(()=>ax(e),[e]),k=P.useCallback(B=>{B.preventDefault(),h(!0),B.target.setPointerCapture(B.pointerId)},[]),D=P.useCallback(B=>{if(!d||!p.current)return;const H=p.current.getBoundingClientRect(),V=Math.max(.1,Math.min(.9,(B.clientY-H.top)/H.height));u(V)},[d]),x=P.useCallback(B=>{var H;if(d&&(h(!1),B.target.releasePointerCapture(B.pointerId),i)){const V=(H=p.current)==null?void 0:H.getBoundingClientRect();if(V){const oe=Math.max(.1,Math.min(.9,(B.clientY-V.top)/V.height));i(oe)}}},[d,i]),g=P.useCallback(B=>{t==null||t(B)},[t]);if(e.length===0)return w.jsx("div",{className:`catalog-overview ${a??""}`,children:w.jsx("div",{className:"catalog-overview__empty",children:"No items in this catalog"})});const v=24,N=120+8,R=16,z=20,O=e.length*v+z+4;return w.jsxs("div",{ref:p,className:`catalog-overview ${a??""}`,style:{"--co-map-flex":l*10,"--co-timeline-flex":(1-l)*10},children:[w.jsx("div",{className:"catalog-overview__map",children:w.jsxs(ug,{center:[0,0],zoom:2,scrollWheelZoom:!0,doubleClickZoom:!1,style:{width:"100%",height:"100%"},children:[w.jsx(cg,{attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',url:"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}),C&&w.jsx(ox,{bounds:C}),y.map(B=>w.jsx(lb,{bounds:rx(B.bbox),pathOptions:{color:"var(--co-accent, #007fd4)",weight:2,fillOpacity:.15},eventHandlers:{dblclick:H=>{H.originalEvent.preventDefault(),H.originalEvent.stopPropagation(),g(B.itemPath)}},children:w.jsxs(Wa,{children:[w.jsx("strong",{children:B.title}),w.jsx("br",{}),bh(B.startDatetime,B.endDatetime,B.datetime)]})},B.id))]})}),w.jsx("div",{className:`catalog-overview__dragbar ${d?"catalog-overview__dragbar--active":""}`,onPointerDown:k,onPointerMove:D,onPointerUp:x}),w.jsxs("div",{className:"catalog-overview__timeline",children:[b&&w.jsx("div",{className:"catalog-overview__tooltip",style:{left:b.x+12,top:b.y-20},children:b.text}),w.jsxs("svg",{width:"100%",height:O,viewBox:`0 0 800 ${O}`,preserveAspectRatio:"xMidYMid meet",children:[T&&w.jsxs(w.Fragment,{children:[w.jsx("text",{x:N,y:O-2,className:"catalog-overview__timeline-axis-label",children:yh(T.min)}),w.jsx("text",{x:800-R,y:O-2,className:"catalog-overview__timeline-axis-label",textAnchor:"end",children:yh(T.max)}),w.jsx("line",{x1:N,y1:O-z,x2:800-R,y2:O-z,stroke:"currentColor",opacity:.3})]}),e.map((B,H)=>{const V=H*v+4,oe=V+4,Ne=v-8,J=800-N-R,le=En(B.startDatetime)??En(B.datetime),U=En(B.endDatetime)??En(B.datetime),X=le!==null,I=`${B.title}
${bh(B.startDatetime,B.endDatetime,B.datetime)}`;return w.jsxs("g",{children:[w.jsx("text",{x:4,y:V+v/2,className:"catalog-overview__timeline-label",children:B.title.length>16?B.title.slice(0,15)+"…":B.title}),X&&T?le===U?w.jsx("circle",{cx:N+(le-T.min)/(T.max-T.min)*J,cy:V+v/2,r:5,className:"catalog-overview__timeline-point",onMouseEnter:G=>_({x:G.clientX,y:G.clientY,text:I}),onMouseLeave:()=>_(null),onDoubleClick:()=>g(B.itemPath)}):w.jsx("rect",{x:N+(le-T.min)/(T.max-T.min)*J,y:oe,width:Math.max(4,((U??le)-le)/(T.max-T.min)*J),height:Ne,rx:2,className:"catalog-overview__timeline-bar",onMouseEnter:G=>_({x:G.clientX,y:G.clientY,text:I}),onMouseLeave:()=>_(null),onDoubleClick:()=>g(B.itemPath)}):w.jsx("text",{x:N,y:V+v/2,className:"catalog-overview__timeline-no-data",children:"no time data"})]},B.id)})]})]})]})};function ha(e){const t=new Date(e),r=t.getUTCHours().toString().padStart(2,"0"),i=t.getUTCMinutes().toString().padStart(2,"0"),a=t.getUTCSeconds().toString().padStart(2,"0");return`${r}:${i}:${a}`}function lx(e,t,r){const i=r-t;if(i<=0)return 0;const a=e-t;return Math.min(100,Math.max(0,a/i*100))}function Tl(e,t,r){const i=r-t,a=Math.min(100,Math.max(0,e));return t+a/100*i}function xh(e,t){const r=t-e,i=Math.max(1e3,r/100);return i>=6e4?Math.round(i/6e4)*6e4:i>=1e3?Math.round(i/1e3)*1e3:i}function El(e,t,r){return Math.min(r,Math.max(t,e))}function _g(e){const{timeExtent:t,initialTime:r,initialSpeed:i=1,onTimeChange:a,onPlaybackStateChange:l,frameRate:u=30}=e,d=(t==null?void 0:t[0])??0,h=r??d,[p,b]=P.useState(h),[_,y]=P.useState("paused"),[C,T]=P.useState(i),k=P.useRef(null),D=P.useRef(0);P.useEffect(()=>{t&&b(V=>El(V,t[0],t[1]))},[t]);const x=P.useCallback(V=>{y(V),l==null||l(V)},[l]),g=P.useCallback(V=>{if(!t)return;const oe=El(V,t[0],t[1]);b(oe),a==null||a(oe),oe>=t[1]&&x("paused")},[t,a,x]);P.useEffect(()=>{if(_!=="playing"||!t){k.current!==null&&(cancelAnimationFrame(k.current),k.current=null);return}const V=1e3/u,oe=C,Ne=J=>{D.current===0&&(D.current=J);const le=J-D.current;if(le>=V){D.current=J;const U=le*oe;b(X=>{const I=X+U,G=El(I,t[0],t[1]);return a==null||a(G),G>=t[1]?(x("paused"),t[1]):G})}k.current=requestAnimationFrame(Ne)};return D.current=0,k.current=requestAnimationFrame(Ne),()=>{k.current!==null&&(cancelAnimationFrame(k.current),k.current=null)}},[_,t,C,u,a,x]);const v=P.useCallback(()=>{t&&(p>=t[1]&&g(t[0]),x("playing"))},[t,p,g,x]),E=P.useCallback(()=>{x("paused")},[x]),N=P.useCallback(()=>{_==="playing"?E():v()},[_,v,E]),R=P.useCallback(V=>{T(V)},[]),z=P.useCallback(()=>{if(!t)return;const V=xh(t[0],t[1]);g(p+V)},[t,p,g]),O=P.useCallback(()=>{if(!t)return;const V=xh(t[0],t[1]);g(p-V)},[t,p,g]),B=t?p<=t[0]:!0,H=t?p>=t[1]:!0;return{currentTime:p,setCurrentTime:g,playbackState:_,play:v,pause:E,togglePlayback:N,speed:C,setSpeed:R,scrubForward:z,scrubBackward:O,atStart:B,atEnd:H}}function ux({time:e,className:t}){const r=ha(e);return w.jsx("div",{className:`debrief-time-display ${t??""}`,"aria-label":`Current time: ${r}`,"aria-live":"polite",children:w.jsx("span",{className:"debrief-time-display__value",children:r})})}function cx({timeExtent:e,currentTime:t,onTimeChange:r,disabled:i=!1,className:a}){const l=P.useRef(null),[u,d]=P.useState(!1),[h,p]=e,b=lx(t,h,p),_=P.useCallback(k=>{const D=l.current;if(!D)return t;const x=D.getBoundingClientRect(),g=k.clientX-x.left,v=x.width,E=g/v*100;return Tl(E,h,p)},[h,p,t]),y=P.useCallback(k=>{if(i)return;const D=_(k);r(D)},[i,_,r]),C=P.useCallback(k=>{if(i)return;k.preventDefault(),d(!0);const D=g=>{const v=_(g);r(v)},x=()=>{d(!1),document.removeEventListener("mousemove",D),document.removeEventListener("mouseup",x)};document.addEventListener("mousemove",D),document.addEventListener("mouseup",x)},[i,_,r]),T=P.useCallback(k=>{if(i)return;d(!0);const D=E=>{const N=E.touches[0],R=l.current;if(!R||!N)return t;const z=R.getBoundingClientRect(),O=N.clientX-z.left,B=z.width,H=O/B*100;return Tl(H,h,p)},x=E=>{E.preventDefault();const N=D(E);r(N)},g=()=>{d(!1),document.removeEventListener("touchmove",x),document.removeEventListener("touchend",g)};document.addEventListener("touchmove",x,{passive:!1}),document.addEventListener("touchend",g);const v=k.touches[0];if(v){const E=l.current;if(E){const N=E.getBoundingClientRect(),R=v.clientX-N.left,z=N.width,O=R/z*100,B=Tl(O,h,p);r(B)}}},[i,h,p,t,r]);return w.jsxs("div",{className:`debrief-time-scrubber ${i?"debrief-time-scrubber--disabled":""} ${u?"debrief-time-scrubber--dragging":""} ${a??""}`,"aria-label":"Time scrubber","aria-valuemin":h,"aria-valuemax":p,"aria-valuenow":t,"aria-valuetext":ha(t),role:"slider",tabIndex:i?-1:0,children:[w.jsxs("div",{className:"debrief-time-scrubber__labels",children:[w.jsx("span",{className:"debrief-time-scrubber__label debrief-time-scrubber__label--start",children:ha(h)}),w.jsx("span",{className:"debrief-time-scrubber__label debrief-time-scrubber__label--end",children:ha(p)})]}),w.jsxs("div",{ref:l,className:"debrief-time-scrubber__track",onClick:y,onMouseDown:C,onTouchStart:T,children:[w.jsx("div",{className:"debrief-time-scrubber__fill",style:{width:`${b}%`}}),w.jsx("div",{className:"debrief-time-scrubber__thumb",style:{left:`${b}%`},"aria-hidden":"true"})]})]})}var pt={},yg={exports:{}},Li={};/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var wh;function dx(){if(wh)return Li;wh=1;var e=cn,t=Symbol.for("react.element"),r=Symbol.for("react.fragment"),i=Object.prototype.hasOwnProperty,a=e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,l={key:!0,ref:!0,__self:!0,__source:!0};function u(d,h,p){var b,_={},y=null,C=null;p!==void 0&&(y=""+p),h.key!==void 0&&(y=""+h.key),h.ref!==void 0&&(C=h.ref);for(b in h)i.call(h,b)&&!l.hasOwnProperty(b)&&(_[b]=h[b]);if(d&&d.defaultProps)for(b in h=d.defaultProps,h)_[b]===void 0&&(_[b]=h[b]);return{$$typeof:t,type:d,key:y,ref:C,props:_,_owner:a.current}}return Li.Fragment=r,Li.jsx=u,Li.jsxs=u,Li}yg.exports=dx();var be=yg.exports,ut=function(){return ut=Object.assign||function(e){for(var t,r=1,i=arguments.length;r<i;r++){t=arguments[r];for(var a in t)Object.prototype.hasOwnProperty.call(t,a)&&(e[a]=t[a])}return e},ut.apply(this,arguments)};function Ua(e,t,r){if(r||arguments.length===2)for(var i=0,a=t.length,l;i<a;i++)(l||!(i in t))&&(l||(l=Array.prototype.slice.call(t,0,i)),l[i]=t[i]);return e.concat(l||Array.prototype.slice.call(t))}var _e="-ms-",Ui="-moz-",he="-webkit-",bg="comm",gs="rule",Fc="decl",fx="@import",xg="@keyframes",hx="@layer",wg=Math.abs,Zc=String.fromCharCode,Ou=Object.assign;function px(e,t){return He(e,0)^45?(((t<<2^He(e,0))<<2^He(e,1))<<2^He(e,2))<<2^He(e,3):0}function kg(e){return e.trim()}function on(e,t){return(e=t.exec(e))?e[0]:e}function re(e,t,r){return e.replace(t,r)}function pa(e,t,r){return e.indexOf(t,r)}function He(e,t){return e.charCodeAt(t)|0}function Jr(e,t,r){return e.slice(t,r)}function Yt(e){return e.length}function Sg(e){return e.length}function Oi(e,t){return t.push(e),e}function mx(e,t){return e.map(t).join("")}function kh(e,t){return e.filter(function(r){return!on(r,t)})}var vs=1,Xr=1,Cg=0,zt=0,Ie=0,si="";function _s(e,t,r,i,a,l,u,d){return{value:e,root:t,parent:r,type:i,props:a,children:l,line:vs,column:Xr,length:u,return:"",siblings:d}}function bn(e,t){return Ou(_s("",null,null,"",null,null,0,e.siblings),e,{length:-e.length},t)}function Cr(e){for(;e.root;)e=bn(e.root,{children:[e]});Oi(e,e.siblings)}function gx(){return Ie}function vx(){return Ie=zt>0?He(si,--zt):0,Xr--,Ie===10&&(Xr=1,vs--),Ie}function Bt(){return Ie=zt<Cg?He(si,zt++):0,Xr++,Ie===10&&(Xr=1,vs++),Ie}function ir(){return He(si,zt)}function ma(){return zt}function ys(e,t){return Jr(si,e,t)}function Iu(e){switch(e){case 0:case 9:case 10:case 13:case 32:return 5;case 33:case 43:case 44:case 47:case 62:case 64:case 126:case 59:case 123:case 125:return 4;case 58:return 3;case 34:case 39:case 40:case 91:return 2;case 41:case 93:return 1}return 0}function _x(e){return vs=Xr=1,Cg=Yt(si=e),zt=0,[]}function yx(e){return si="",e}function Ll(e){return kg(ys(zt-1,Ru(e===91?e+2:e===40?e+1:e)))}function bx(e){for(;(Ie=ir())&&Ie<33;)Bt();return Iu(e)>2||Iu(Ie)>3?"":" "}function xx(e,t){for(;--t&&Bt()&&!(Ie<48||Ie>102||Ie>57&&Ie<65||Ie>70&&Ie<97););return ys(e,ma()+(t<6&&ir()==32&&Bt()==32))}function Ru(e){for(;Bt();)switch(Ie){case e:return zt;case 34:case 39:e!==34&&e!==39&&Ru(Ie);break;case 40:e===41&&Ru(e);break;case 92:Bt();break}return zt}function wx(e,t){for(;Bt()&&e+Ie!==57&&!(e+Ie===84&&ir()===47););return"/*"+ys(t,zt-1)+"*"+Zc(e===47?e:Bt())}function kx(e){for(;!Iu(ir());)Bt();return ys(e,zt)}function Sx(e){return yx(ga("",null,null,null,[""],e=_x(e),0,[0],e))}function ga(e,t,r,i,a,l,u,d,h){for(var p=0,b=0,_=u,y=0,C=0,T=0,k=1,D=1,x=1,g=0,v="",E=a,N=l,R=i,z=v;D;)switch(T=g,g=Bt()){case 40:if(T!=108&&He(z,_-1)==58){pa(z+=re(Ll(g),"&","&\f"),"&\f",wg(p?d[p-1]:0))!=-1&&(x=-1);break}case 34:case 39:case 91:z+=Ll(g);break;case 9:case 10:case 13:case 32:z+=bx(T);break;case 92:z+=xx(ma()-1,7);continue;case 47:switch(ir()){case 42:case 47:Oi(Cx(wx(Bt(),ma()),t,r,h),h);break;default:z+="/"}break;case 123*k:d[p++]=Yt(z)*x;case 125*k:case 59:case 0:switch(g){case 0:case 125:D=0;case 59+b:x==-1&&(z=re(z,/\f/g,"")),C>0&&Yt(z)-_&&Oi(C>32?Ch(z+";",i,r,_-1,h):Ch(re(z," ","")+";",i,r,_-2,h),h);break;case 59:z+=";";default:if(Oi(R=Sh(z,t,r,p,b,a,d,v,E=[],N=[],_,l),l),g===123)if(b===0)ga(z,t,R,R,E,l,_,d,N);else switch(y===99&&He(z,3)===110?100:y){case 100:case 108:case 109:case 115:ga(e,R,R,i&&Oi(Sh(e,R,R,0,0,a,d,v,a,E=[],_,N),N),a,N,_,d,i?E:N);break;default:ga(z,R,R,R,[""],N,0,d,N)}}p=b=C=0,k=x=1,v=z="",_=u;break;case 58:_=1+Yt(z),C=T;default:if(k<1){if(g==123)--k;else if(g==125&&k++==0&&vx()==125)continue}switch(z+=Zc(g),g*k){case 38:x=b>0?1:(z+="\f",-1);break;case 44:d[p++]=(Yt(z)-1)*x,x=1;break;case 64:ir()===45&&(z+=Ll(Bt())),y=ir(),b=_=Yt(v=z+=kx(ma())),g++;break;case 45:T===45&&Yt(z)==2&&(k=0)}}return l}function Sh(e,t,r,i,a,l,u,d,h,p,b,_){for(var y=a-1,C=a===0?l:[""],T=Sg(C),k=0,D=0,x=0;k<i;++k)for(var g=0,v=Jr(e,y+1,y=wg(D=u[k])),E=e;g<T;++g)(E=kg(D>0?C[g]+" "+v:re(v,/&\f/g,C[g])))&&(h[x++]=E);return _s(e,t,r,a===0?gs:d,h,p,b,_)}function Cx(e,t,r,i){return _s(e,t,r,bg,Zc(gx()),Jr(e,2,-2),0,i)}function Ch(e,t,r,i,a){return _s(e,t,r,Fc,Jr(e,0,i),Jr(e,i+1,-1),i,a)}function Pg(e,t,r){switch(px(e,t)){case 5103:return he+"print-"+e+e;case 5737:case 4201:case 3177:case 3433:case 1641:case 4457:case 2921:case 5572:case 6356:case 5844:case 3191:case 6645:case 3005:case 6391:case 5879:case 5623:case 6135:case 4599:case 4855:case 4215:case 6389:case 5109:case 5365:case 5621:case 3829:return he+e+e;case 4789:return Ui+e+e;case 5349:case 4246:case 4810:case 6968:case 2756:return he+e+Ui+e+_e+e+e;case 5936:switch(He(e,t+11)){case 114:return he+e+_e+re(e,/[svh]\w+-[tblr]{2}/,"tb")+e;case 108:return he+e+_e+re(e,/[svh]\w+-[tblr]{2}/,"tb-rl")+e;case 45:return he+e+_e+re(e,/[svh]\w+-[tblr]{2}/,"lr")+e}case 6828:case 4268:case 2903:return he+e+_e+e+e;case 6165:return he+e+_e+"flex-"+e+e;case 5187:return he+e+re(e,/(\w+).+(:[^]+)/,he+"box-$1$2"+_e+"flex-$1$2")+e;case 5443:return he+e+_e+"flex-item-"+re(e,/flex-|-self/g,"")+(on(e,/flex-|baseline/)?"":_e+"grid-row-"+re(e,/flex-|-self/g,""))+e;case 4675:return he+e+_e+"flex-line-pack"+re(e,/align-content|flex-|-self/g,"")+e;case 5548:return he+e+_e+re(e,"shrink","negative")+e;case 5292:return he+e+_e+re(e,"basis","preferred-size")+e;case 6060:return he+"box-"+re(e,"-grow","")+he+e+_e+re(e,"grow","positive")+e;case 4554:return he+re(e,/([^-])(transform)/g,"$1"+he+"$2")+e;case 6187:return re(re(re(e,/(zoom-|grab)/,he+"$1"),/(image-set)/,he+"$1"),e,"")+e;case 5495:case 3959:return re(e,/(image-set\([^]*)/,he+"$1$`$1");case 4968:return re(re(e,/(.+:)(flex-)?(.*)/,he+"box-pack:$3"+_e+"flex-pack:$3"),/s.+-b[^;]+/,"justify")+he+e+e;case 4200:if(!on(e,/flex-|baseline/))return _e+"grid-column-align"+Jr(e,t)+e;break;case 2592:case 3360:return _e+re(e,"template-","")+e;case 4384:case 3616:return r&&r.some(function(i,a){return t=a,on(i.props,/grid-\w+-end/)})?~pa(e+(r=r[t].value),"span",0)?e:_e+re(e,"-start","")+e+_e+"grid-row-span:"+(~pa(r,"span",0)?on(r,/\d+/):+on(r,/\d+/)-+on(e,/\d+/))+";":_e+re(e,"-start","")+e;case 4896:case 4128:return r&&r.some(function(i){return on(i.props,/grid-\w+-start/)})?e:_e+re(re(e,"-end","-span"),"span ","")+e;case 4095:case 3583:case 4068:case 2532:return re(e,/(.+)-inline(.+)/,he+"$1$2")+e;case 8116:case 7059:case 5753:case 5535:case 5445:case 5701:case 4933:case 4677:case 5533:case 5789:case 5021:case 4765:if(Yt(e)-1-t>6)switch(He(e,t+1)){case 109:if(He(e,t+4)!==45)break;case 102:return re(e,/(.+:)(.+)-([^]+)/,"$1"+he+"$2-$3$1"+Ui+(He(e,t+3)==108?"$3":"$2-$3"))+e;case 115:return~pa(e,"stretch",0)?Pg(re(e,"stretch","fill-available"),t,r)+e:e}break;case 5152:case 5920:return re(e,/(.+?):(\d+)(\s*\/\s*(span)?\s*(\d+))?(.*)/,function(i,a,l,u,d,h,p){return _e+a+":"+l+p+(u?_e+a+"-span:"+(d?h:+h-+l)+p:"")+e});case 4949:if(He(e,t+6)===121)return re(e,":",":"+he)+e;break;case 6444:switch(He(e,He(e,14)===45?18:11)){case 120:return re(e,/(.+:)([^;\s!]+)(;|(\s+)?!.+)?/,"$1"+he+(He(e,14)===45?"inline-":"")+"box$3$1"+he+"$2$3$1"+_e+"$2box$3")+e;case 100:return re(e,":",":"+_e)+e}break;case 5719:case 2647:case 2135:case 3927:case 2391:return re(e,"scroll-","scroll-snap-")+e}return e}function Va(e,t){for(var r="",i=0;i<e.length;i++)r+=t(e[i],i,e,t)||"";return r}function Px(e,t,r,i){switch(e.type){case hx:if(e.children.length)break;case fx:case Fc:return e.return=e.return||e.value;case bg:return"";case xg:return e.return=e.value+"{"+Va(e.children,i)+"}";case gs:if(!Yt(e.value=e.props.join(",")))return""}return Yt(r=Va(e.children,i))?e.return=e.value+"{"+r+"}":""}function Tx(e){var t=Sg(e);return function(r,i,a,l){for(var u="",d=0;d<t;d++)u+=e[d](r,i,a,l)||"";return u}}function Ex(e){return function(t){t.root||(t=t.return)&&e(t)}}function Lx(e,t,r,i){if(e.length>-1&&!e.return)switch(e.type){case Fc:e.return=Pg(e.value,e.length,r);return;case xg:return Va([bn(e,{value:re(e.value,"@","@"+he)})],i);case gs:if(e.length)return mx(r=e.props,function(a){switch(on(a,i=/(::plac\w+|:read-\w+)/)){case":read-only":case":read-write":Cr(bn(e,{props:[re(a,/:(read-\w+)/,":"+Ui+"$1")]})),Cr(bn(e,{props:[a]})),Ou(e,{props:kh(r,i)});break;case"::placeholder":Cr(bn(e,{props:[re(a,/:(plac\w+)/,":"+he+"input-$1")]})),Cr(bn(e,{props:[re(a,/:(plac\w+)/,":"+Ui+"$1")]})),Cr(bn(e,{props:[re(a,/:(plac\w+)/,_e+"input-$1")]})),Cr(bn(e,{props:[a]})),Ou(e,{props:kh(r,i)});break}return""})}}var zx={animationIterationCount:1,aspectRatio:1,borderImageOutset:1,borderImageSlice:1,borderImageWidth:1,boxFlex:1,boxFlexGroup:1,boxOrdinalGroup:1,columnCount:1,columns:1,flex:1,flexGrow:1,flexPositive:1,flexShrink:1,flexNegative:1,flexOrder:1,gridRow:1,gridRowEnd:1,gridRowSpan:1,gridRowStart:1,gridColumn:1,gridColumnEnd:1,gridColumnSpan:1,gridColumnStart:1,msGridRow:1,msGridRowSpan:1,msGridColumn:1,msGridColumnSpan:1,fontWeight:1,lineHeight:1,opacity:1,order:1,orphans:1,tabSize:1,widows:1,zIndex:1,zoom:1,WebkitLineClamp:1,fillOpacity:1,floodOpacity:1,stopOpacity:1,strokeDasharray:1,strokeDashoffset:1,strokeMiterlimit:1,strokeOpacity:1,strokeWidth:1},ei=typeof process<"u"&&pt!==void 0&&(pt.REACT_APP_SC_ATTR||pt.SC_ATTR)||"data-styled",Tg="active",Eg="data-styled-version",bs="6.1.13",Hc=`/*!sc*/
`,Ga=typeof window<"u"&&"HTMLElement"in window,Mx=!!(typeof SC_DISABLE_SPEEDY=="boolean"?SC_DISABLE_SPEEDY:typeof process<"u"&&pt!==void 0&&pt.REACT_APP_SC_DISABLE_SPEEDY!==void 0&&pt.REACT_APP_SC_DISABLE_SPEEDY!==""?pt.REACT_APP_SC_DISABLE_SPEEDY!=="false"&&pt.REACT_APP_SC_DISABLE_SPEEDY:typeof process<"u"&&pt!==void 0&&pt.SC_DISABLE_SPEEDY!==void 0&&pt.SC_DISABLE_SPEEDY!==""&&pt.SC_DISABLE_SPEEDY!=="false"&&pt.SC_DISABLE_SPEEDY),xs=Object.freeze([]),ti=Object.freeze({});function Nx(e,t,r){return r===void 0&&(r=ti),e.theme!==r.theme&&e.theme||t||r.theme}var Lg=new Set(["a","abbr","address","area","article","aside","audio","b","base","bdi","bdo","big","blockquote","body","br","button","canvas","caption","cite","code","col","colgroup","data","datalist","dd","del","details","dfn","dialog","div","dl","dt","em","embed","fieldset","figcaption","figure","footer","form","h1","h2","h3","h4","h5","h6","header","hgroup","hr","html","i","iframe","img","input","ins","kbd","keygen","label","legend","li","link","main","map","mark","menu","menuitem","meta","meter","nav","noscript","object","ol","optgroup","option","output","p","param","picture","pre","progress","q","rp","rt","ruby","s","samp","script","section","select","small","source","span","strong","style","sub","summary","sup","table","tbody","td","textarea","tfoot","th","thead","time","tr","track","u","ul","use","var","video","wbr","circle","clipPath","defs","ellipse","foreignObject","g","image","line","linearGradient","marker","mask","path","pattern","polygon","polyline","radialGradient","rect","stop","svg","text","tspan"]),Ax=/[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~-]+/g,Ox=/(^-|-$)/g;function Ph(e){return e.replace(Ax,"-").replace(Ox,"")}var Ix=/(a)(d)/gi,Jo=52,Th=function(e){return String.fromCharCode(e+(e>25?39:97))};function Du(e){var t,r="";for(t=Math.abs(e);t>Jo;t=t/Jo|0)r=Th(t%Jo)+r;return(Th(t%Jo)+r).replace(Ix,"$1-$2")}var zl,zg=5381,jr=function(e,t){for(var r=t.length;r;)e=33*e^t.charCodeAt(--r);return e},Mg=function(e){return jr(zg,e)};function Rx(e){return Du(Mg(e)>>>0)}function Dx(e){return e.displayName||e.name||"Component"}function Ml(e){return typeof e=="string"&&!0}var Ng=typeof Symbol=="function"&&Symbol.for,Ag=Ng?Symbol.for("react.memo"):60115,jx=Ng?Symbol.for("react.forward_ref"):60112,Bx={childContextTypes:!0,contextType:!0,contextTypes:!0,defaultProps:!0,displayName:!0,getDefaultProps:!0,getDerivedStateFromError:!0,getDerivedStateFromProps:!0,mixins:!0,propTypes:!0,type:!0},Fx={name:!0,length:!0,prototype:!0,caller:!0,callee:!0,arguments:!0,arity:!0},Og={$$typeof:!0,compare:!0,defaultProps:!0,displayName:!0,propTypes:!0,type:!0},Zx=((zl={})[jx]={$$typeof:!0,render:!0,defaultProps:!0,displayName:!0,propTypes:!0},zl[Ag]=Og,zl);function Eh(e){return("type"in(t=e)&&t.type.$$typeof)===Ag?Og:"$$typeof"in e?Zx[e.$$typeof]:Bx;var t}var Hx=Object.defineProperty,Wx=Object.getOwnPropertyNames,Lh=Object.getOwnPropertySymbols,Ux=Object.getOwnPropertyDescriptor,Vx=Object.getPrototypeOf,zh=Object.prototype;function Ig(e,t,r){if(typeof t!="string"){if(zh){var i=Vx(t);i&&i!==zh&&Ig(e,i,r)}var a=Wx(t);Lh&&(a=a.concat(Lh(t)));for(var l=Eh(e),u=Eh(t),d=0;d<a.length;++d){var h=a[d];if(!(h in Fx||r&&r[h]||u&&h in u||l&&h in l)){var p=Ux(t,h);try{Hx(e,h,p)}catch{}}}}return e}function ni(e){return typeof e=="function"}function Wc(e){return typeof e=="object"&&"styledComponentId"in e}function tr(e,t){return e&&t?"".concat(e," ").concat(t):e||t||""}function Mh(e,t){if(e.length===0)return"";for(var r=e[0],i=1;i<e.length;i++)r+=e[i];return r}function lo(e){return e!==null&&typeof e=="object"&&e.constructor.name===Object.name&&!("props"in e&&e.$$typeof)}function ju(e,t,r){if(r===void 0&&(r=!1),!r&&!lo(e)&&!Array.isArray(e))return t;if(Array.isArray(t))for(var i=0;i<t.length;i++)e[i]=ju(e[i],t[i]);else if(lo(t))for(var i in t)e[i]=ju(e[i],t[i]);return e}function Uc(e,t){Object.defineProperty(e,"toString",{value:t})}function mo(e){for(var t=[],r=1;r<arguments.length;r++)t[r-1]=arguments[r];return new Error("An error occurred. See https://github.com/styled-components/styled-components/blob/main/packages/styled-components/src/utils/errors.md#".concat(e," for more information.").concat(t.length>0?" Args: ".concat(t.join(", ")):""))}var Gx=function(){function e(t){this.groupSizes=new Uint32Array(512),this.length=512,this.tag=t}return e.prototype.indexOfGroup=function(t){for(var r=0,i=0;i<t;i++)r+=this.groupSizes[i];return r},e.prototype.insertRules=function(t,r){if(t>=this.groupSizes.length){for(var i=this.groupSizes,a=i.length,l=a;t>=l;)if((l<<=1)<0)throw mo(16,"".concat(t));this.groupSizes=new Uint32Array(l),this.groupSizes.set(i),this.length=l;for(var u=a;u<l;u++)this.groupSizes[u]=0}for(var d=this.indexOfGroup(t+1),h=(u=0,r.length);u<h;u++)this.tag.insertRule(d,r[u])&&(this.groupSizes[t]++,d++)},e.prototype.clearGroup=function(t){if(t<this.length){var r=this.groupSizes[t],i=this.indexOfGroup(t),a=i+r;this.groupSizes[t]=0;for(var l=i;l<a;l++)this.tag.deleteRule(i)}},e.prototype.getGroup=function(t){var r="";if(t>=this.length||this.groupSizes[t]===0)return r;for(var i=this.groupSizes[t],a=this.indexOfGroup(t),l=a+i,u=a;u<l;u++)r+="".concat(this.tag.getRule(u)).concat(Hc);return r},e}(),va=new Map,Ka=new Map,_a=1,Xo=function(e){if(va.has(e))return va.get(e);for(;Ka.has(_a);)_a++;var t=_a++;return va.set(e,t),Ka.set(t,e),t},Kx=function(e,t){_a=t+1,va.set(e,t),Ka.set(t,e)},Yx="style[".concat(ei,"][").concat(Eg,'="').concat(bs,'"]'),Qx=new RegExp("^".concat(ei,'\\.g(\\d+)\\[id="([\\w\\d-]+)"\\].*?"([^"]*)')),$x=function(e,t,r){for(var i,a=r.split(","),l=0,u=a.length;l<u;l++)(i=a[l])&&e.registerName(t,i)},qx=function(e,t){for(var r,i=((r=t.textContent)!==null&&r!==void 0?r:"").split(Hc),a=[],l=0,u=i.length;l<u;l++){var d=i[l].trim();if(d){var h=d.match(Qx);if(h){var p=0|parseInt(h[1],10),b=h[2];p!==0&&(Kx(b,p),$x(e,b,h[3]),e.getTag().insertRules(p,a)),a.length=0}else a.push(d)}}},Nh=function(e){for(var t=document.querySelectorAll(Yx),r=0,i=t.length;r<i;r++){var a=t[r];a&&a.getAttribute(ei)!==Tg&&(qx(e,a),a.parentNode&&a.parentNode.removeChild(a))}};function Jx(){return typeof __webpack_nonce__<"u"?__webpack_nonce__:null}var Rg=function(e){var t=document.head,r=e||t,i=document.createElement("style"),a=function(d){var h=Array.from(d.querySelectorAll("style[".concat(ei,"]")));return h[h.length-1]}(r),l=a!==void 0?a.nextSibling:null;i.setAttribute(ei,Tg),i.setAttribute(Eg,bs);var u=Jx();return u&&i.setAttribute("nonce",u),r.insertBefore(i,l),i},Xx=function(){function e(t){this.element=Rg(t),this.element.appendChild(document.createTextNode("")),this.sheet=function(r){if(r.sheet)return r.sheet;for(var i=document.styleSheets,a=0,l=i.length;a<l;a++){var u=i[a];if(u.ownerNode===r)return u}throw mo(17)}(this.element),this.length=0}return e.prototype.insertRule=function(t,r){try{return this.sheet.insertRule(r,t),this.length++,!0}catch{return!1}},e.prototype.deleteRule=function(t){this.sheet.deleteRule(t),this.length--},e.prototype.getRule=function(t){var r=this.sheet.cssRules[t];return r&&r.cssText?r.cssText:""},e}(),e1=function(){function e(t){this.element=Rg(t),this.nodes=this.element.childNodes,this.length=0}return e.prototype.insertRule=function(t,r){if(t<=this.length&&t>=0){var i=document.createTextNode(r);return this.element.insertBefore(i,this.nodes[t]||null),this.length++,!0}return!1},e.prototype.deleteRule=function(t){this.element.removeChild(this.nodes[t]),this.length--},e.prototype.getRule=function(t){return t<this.length?this.nodes[t].textContent:""},e}(),t1=function(){function e(t){this.rules=[],this.length=0}return e.prototype.insertRule=function(t,r){return t<=this.length&&(this.rules.splice(t,0,r),this.length++,!0)},e.prototype.deleteRule=function(t){this.rules.splice(t,1),this.length--},e.prototype.getRule=function(t){return t<this.length?this.rules[t]:""},e}(),Ah=Ga,n1={isServer:!Ga,useCSSOMInjection:!Mx},Dg=function(){function e(t,r,i){t===void 0&&(t=ti),r===void 0&&(r={});var a=this;this.options=ut(ut({},n1),t),this.gs=r,this.names=new Map(i),this.server=!!t.isServer,!this.server&&Ga&&Ah&&(Ah=!1,Nh(this)),Uc(this,function(){return function(l){for(var u=l.getTag(),d=u.length,h="",p=function(_){var y=function(x){return Ka.get(x)}(_);if(y===void 0)return"continue";var C=l.names.get(y),T=u.getGroup(_);if(C===void 0||!C.size||T.length===0)return"continue";var k="".concat(ei,".g").concat(_,'[id="').concat(y,'"]'),D="";C!==void 0&&C.forEach(function(x){x.length>0&&(D+="".concat(x,","))}),h+="".concat(T).concat(k,'{content:"').concat(D,'"}').concat(Hc)},b=0;b<d;b++)p(b);return h}(a)})}return e.registerId=function(t){return Xo(t)},e.prototype.rehydrate=function(){!this.server&&Ga&&Nh(this)},e.prototype.reconstructWithOptions=function(t,r){return r===void 0&&(r=!0),new e(ut(ut({},this.options),t),this.gs,r&&this.names||void 0)},e.prototype.allocateGSInstance=function(t){return this.gs[t]=(this.gs[t]||0)+1},e.prototype.getTag=function(){return this.tag||(this.tag=(t=function(r){var i=r.useCSSOMInjection,a=r.target;return r.isServer?new t1(a):i?new Xx(a):new e1(a)}(this.options),new Gx(t)));var t},e.prototype.hasNameForId=function(t,r){return this.names.has(t)&&this.names.get(t).has(r)},e.prototype.registerName=function(t,r){if(Xo(t),this.names.has(t))this.names.get(t).add(r);else{var i=new Set;i.add(r),this.names.set(t,i)}},e.prototype.insertRules=function(t,r,i){this.registerName(t,r),this.getTag().insertRules(Xo(t),i)},e.prototype.clearNames=function(t){this.names.has(t)&&this.names.get(t).clear()},e.prototype.clearRules=function(t){this.getTag().clearGroup(Xo(t)),this.clearNames(t)},e.prototype.clearTag=function(){this.tag=void 0},e}(),r1=/&/g,i1=/^\s*\/\/.*$/gm;function jg(e,t){return e.map(function(r){return r.type==="rule"&&(r.value="".concat(t," ").concat(r.value),r.value=r.value.replaceAll(",",",".concat(t," ")),r.props=r.props.map(function(i){return"".concat(t," ").concat(i)})),Array.isArray(r.children)&&r.type!=="@keyframes"&&(r.children=jg(r.children,t)),r})}function o1(e){var t,r,i,a=ti,l=a.options,u=l===void 0?ti:l,d=a.plugins,h=d===void 0?xs:d,p=function(y,C,T){return T.startsWith(r)&&T.endsWith(r)&&T.replaceAll(r,"").length>0?".".concat(t):y},b=h.slice();b.push(function(y){y.type===gs&&y.value.includes("&")&&(y.props[0]=y.props[0].replace(r1,r).replace(i,p))}),u.prefix&&b.push(Lx),b.push(Px);var _=function(y,C,T,k){C===void 0&&(C=""),T===void 0&&(T=""),k===void 0&&(k="&"),t=k,r=C,i=new RegExp("\\".concat(r,"\\b"),"g");var D=y.replace(i1,""),x=Sx(T||C?"".concat(T," ").concat(C," { ").concat(D," }"):D);u.namespace&&(x=jg(x,u.namespace));var g=[];return Va(x,Tx(b.concat(Ex(function(v){return g.push(v)})))),g};return _.hash=h.length?h.reduce(function(y,C){return C.name||mo(15),jr(y,C.name)},zg).toString():"",_}var a1=new Dg,Bu=o1(),Bg=cn.createContext({shouldForwardProp:void 0,styleSheet:a1,stylis:Bu});Bg.Consumer;cn.createContext(void 0);function Oh(){return P.useContext(Bg)}var s1=function(){function e(t,r){var i=this;this.inject=function(a,l){l===void 0&&(l=Bu);var u=i.name+l.hash;a.hasNameForId(i.id,u)||a.insertRules(i.id,u,l(i.rules,u,"@keyframes"))},this.name=t,this.id="sc-keyframes-".concat(t),this.rules=r,Uc(this,function(){throw mo(12,String(i.name))})}return e.prototype.getName=function(t){return t===void 0&&(t=Bu),this.name+t.hash},e}(),l1=function(e){return e>="A"&&e<="Z"};function Ih(e){for(var t="",r=0;r<e.length;r++){var i=e[r];if(r===1&&i==="-"&&e[0]==="-")return e;l1(i)?t+="-"+i.toLowerCase():t+=i}return t.startsWith("ms-")?"-"+t:t}var Fg=function(e){return e==null||e===!1||e===""},Zg=function(e){var t,r,i=[];for(var a in e){var l=e[a];e.hasOwnProperty(a)&&!Fg(l)&&(Array.isArray(l)&&l.isCss||ni(l)?i.push("".concat(Ih(a),":"),l,";"):lo(l)?i.push.apply(i,Ua(Ua(["".concat(a," {")],Zg(l),!1),["}"],!1)):i.push("".concat(Ih(a),": ").concat((t=a,(r=l)==null||typeof r=="boolean"||r===""?"":typeof r!="number"||r===0||t in zx||t.startsWith("--")?String(r).trim():"".concat(r,"px")),";")))}return i};function or(e,t,r,i){if(Fg(e))return[];if(Wc(e))return[".".concat(e.styledComponentId)];if(ni(e)){if(!ni(l=e)||l.prototype&&l.prototype.isReactComponent||!t)return[e];var a=e(t);return or(a,t,r,i)}var l;return e instanceof s1?r?(e.inject(r,i),[e.getName(i)]):[e]:lo(e)?Zg(e):Array.isArray(e)?Array.prototype.concat.apply(xs,e.map(function(u){return or(u,t,r,i)})):[e.toString()]}function u1(e){for(var t=0;t<e.length;t+=1){var r=e[t];if(ni(r)&&!Wc(r))return!1}return!0}var c1=Mg(bs),d1=function(){function e(t,r,i){this.rules=t,this.staticRulesId="",this.isStatic=(i===void 0||i.isStatic)&&u1(t),this.componentId=r,this.baseHash=jr(c1,r),this.baseStyle=i,Dg.registerId(r)}return e.prototype.generateAndInjectStyles=function(t,r,i){var a=this.baseStyle?this.baseStyle.generateAndInjectStyles(t,r,i):"";if(this.isStatic&&!i.hash)if(this.staticRulesId&&r.hasNameForId(this.componentId,this.staticRulesId))a=tr(a,this.staticRulesId);else{var l=Mh(or(this.rules,t,r,i)),u=Du(jr(this.baseHash,l)>>>0);if(!r.hasNameForId(this.componentId,u)){var d=i(l,".".concat(u),void 0,this.componentId);r.insertRules(this.componentId,u,d)}a=tr(a,u),this.staticRulesId=u}else{for(var h=jr(this.baseHash,i.hash),p="",b=0;b<this.rules.length;b++){var _=this.rules[b];if(typeof _=="string")p+=_;else if(_){var y=Mh(or(_,t,r,i));h=jr(h,y+b),p+=y}}if(p){var C=Du(h>>>0);r.hasNameForId(this.componentId,C)||r.insertRules(this.componentId,C,i(p,".".concat(C),void 0,this.componentId)),a=tr(a,C)}}return a},e}(),Hg=cn.createContext(void 0);Hg.Consumer;var Nl={};function f1(e,t,r){var i=Wc(e),a=e,l=!Ml(e),u=t.attrs,d=u===void 0?xs:u,h=t.componentId,p=h===void 0?function(E,N){var R=typeof E!="string"?"sc":Ph(E);Nl[R]=(Nl[R]||0)+1;var z="".concat(R,"-").concat(Rx(bs+R+Nl[R]));return N?"".concat(N,"-").concat(z):z}(t.displayName,t.parentComponentId):h,b=t.displayName,_=b===void 0?function(E){return Ml(E)?"styled.".concat(E):"Styled(".concat(Dx(E),")")}(e):b,y=t.displayName&&t.componentId?"".concat(Ph(t.displayName),"-").concat(t.componentId):t.componentId||p,C=i&&a.attrs?a.attrs.concat(d).filter(Boolean):d,T=t.shouldForwardProp;if(i&&a.shouldForwardProp){var k=a.shouldForwardProp;if(t.shouldForwardProp){var D=t.shouldForwardProp;T=function(E,N){return k(E,N)&&D(E,N)}}else T=k}var x=new d1(r,y,i?a.componentStyle:void 0);function g(E,N){return function(R,z,O){var B=R.attrs,H=R.componentStyle,V=R.defaultProps,oe=R.foldedComponentIds,Ne=R.styledComponentId,J=R.target,le=cn.useContext(Hg),U=Oh(),X=R.shouldForwardProp||U.shouldForwardProp,I=Nx(z,le,V)||ti,G=function(ae,q,De){for(var it,Zt=ut(ut({},q),{className:void 0,theme:De}),Un=0;Un<ae.length;Un+=1){var gn=ni(it=ae[Un])?it(Zt):it;for(var ot in gn)Zt[ot]=ot==="className"?tr(Zt[ot],gn[ot]):ot==="style"?ut(ut({},Zt[ot]),gn[ot]):gn[ot]}return q.className&&(Zt.className=tr(Zt.className,q.className)),Zt}(B,z,I),j=G.as||J,Y={};for(var ee in G)G[ee]===void 0||ee[0]==="$"||ee==="as"||ee==="theme"&&G.theme===I||(ee==="forwardedAs"?Y.as=G.forwardedAs:X&&!X(ee,j)||(Y[ee]=G[ee]));var Te=function(ae,q){var De=Oh(),it=ae.generateAndInjectStyles(q,De.styleSheet,De.stylis);return it}(H,G),de=tr(oe,Ne);return Te&&(de+=" "+Te),G.className&&(de+=" "+G.className),Y[Ml(j)&&!Lg.has(j)?"class":"className"]=de,Y.ref=O,P.createElement(j,Y)}(v,E,N)}g.displayName=_;var v=cn.forwardRef(g);return v.attrs=C,v.componentStyle=x,v.displayName=_,v.shouldForwardProp=T,v.foldedComponentIds=i?tr(a.foldedComponentIds,a.styledComponentId):"",v.styledComponentId=y,v.target=i?a.target:e,Object.defineProperty(v,"defaultProps",{get:function(){return this._foldedDefaultProps},set:function(E){this._foldedDefaultProps=i?function(N){for(var R=[],z=1;z<arguments.length;z++)R[z-1]=arguments[z];for(var O=0,B=R;O<B.length;O++)ju(N,B[O],!0);return N}({},a.defaultProps,E):E}}),Uc(v,function(){return".".concat(v.styledComponentId)}),l&&Ig(v,e,{attrs:!0,componentStyle:!0,displayName:!0,foldedComponentIds:!0,shouldForwardProp:!0,styledComponentId:!0,target:!0}),v}function Rh(e,t){for(var r=[e[0]],i=0,a=t.length;i<a;i+=1)r.push(t[i],e[i+1]);return r}var Dh=function(e){return Object.assign(e,{isCss:!0})};function h1(e){for(var t=[],r=1;r<arguments.length;r++)t[r-1]=arguments[r];if(ni(e)||lo(e))return Dh(or(Rh(xs,Ua([e],t,!0))));var i=e;return t.length===0&&i.length===1&&typeof i[0]=="string"?or(i):Dh(or(Rh(i,t)))}function Fu(e,t,r){if(r===void 0&&(r=ti),!t)throw mo(1,t);var i=function(a){for(var l=[],u=1;u<arguments.length;u++)l[u-1]=arguments[u];return e(t,r,h1.apply(void 0,Ua([a],l,!1)))};return i.attrs=function(a){return Fu(e,t,ut(ut({},r),{attrs:Array.prototype.concat(r.attrs,a).filter(Boolean)}))},i.withConfig=function(a){return Fu(e,t,ut(ut({},r),a))},i}var Wg=function(e){return Fu(f1,e)},ht=Wg;Lg.forEach(function(e){ht[e]=Wg(e)});const p1=ht.button`
  display: inline-flex;
  outline: none;
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size, 13px);
  line-height: normal;
  color: var(--vscode-button-foreground);
  background: var(--vscode-button-background);
  border: 1px solid var(--vscode-button-border);
  border-radius: 2px;
  padding: 4px 11px;
  fill: currentColor;
  cursor: pointer;

  &:focus-visible {
    outline: 1px solid var(--vscode-focusBorder);
    outline-offset: 2px;
  }

  &:active {
    background: var(--vscode-button-background);
  }

  &:hover {
    background: var(--vscode-button-hoverBackground);
  }

  &::-moz-focus-inner {
    border: 0;
  }

  &.secondary {
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);

    &:active {
      background: var(--vscode-button-secondaryBackground);
    }

    &:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
  }

  &.icon {
    background: transparent;
    border: none;
    border-radius: 5px;
    color: var(--vscode-foreground);
    padding: 3px;

    &:hover {
      background: rgba(90, 93, 94, 0.31);
      outline: 1px dotted var(--vscode-contrastActiveBorder);
      outline-offset: -1px;
    }

    &:active {
      background: rgba(90, 93, 94, 0.31);
    }
  }

  &:disabled {
    opacity: 0.4;
    background: var(--vscode-button-background);
    cursor: not-allowed;

    &.secondary {
      background: var(--vscode-button-secondaryBackground);
    }
    
    &.icon {
      background: transparent;
    }
  }
`,xe=({appearance:e="primary",className:t,children:r,disabled:i=!1,type:a="button",onClick:l=void 0,...u})=>be.jsx(p1,{className:`vscrui-button ${e} ${t||""}`,disabled:i,onClick:l,type:a,...u,children:r});xe.displayName="VSCRUI_Badge";var Ve=[];for(var Al=0;Al<256;++Al)Ve.push((Al+256).toString(16).slice(1));function m1(e,t=0){return(Ve[e[t+0]]+Ve[e[t+1]]+Ve[e[t+2]]+Ve[e[t+3]]+"-"+Ve[e[t+4]]+Ve[e[t+5]]+"-"+Ve[e[t+6]]+Ve[e[t+7]]+"-"+Ve[e[t+8]]+Ve[e[t+9]]+"-"+Ve[e[t+10]]+Ve[e[t+11]]+Ve[e[t+12]]+Ve[e[t+13]]+Ve[e[t+14]]+Ve[e[t+15]]).toLowerCase()}var ea,g1=new Uint8Array(16);function v1(){if(!ea&&(ea=typeof crypto<"u"&&crypto.getRandomValues&&crypto.getRandomValues.bind(crypto),!ea))throw new Error("crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported");return ea(g1)}var _1=typeof crypto<"u"&&crypto.randomUUID&&crypto.randomUUID.bind(crypto);const jh={randomUUID:_1};function y1(e,t,r){if(jh.randomUUID&&!e)return jh.randomUUID();e=e||{};var i=e.random||(e.rng||v1)();return i[6]=i[6]&15|64,i[8]=i[8]&63|128,m1(i)}function Ug(){const[e,t]=P.useState("");return P.useEffect(()=>{t(y1())},[]),e}const b1=ht.label`
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
  display: flex;
  align-items: center;
  cursor: pointer;
  position: relative;
  outline: none;
  user-select: none;

  &.disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  input {
    opacity: 0;
    outline: none;
    appearance: none;
    position: absolute;
  }
`,Vg=ht.svg`
  background: var(--vscode-checkbox-background);
  border: 1px solid var(--vscode-checkbox-border);
  border-radius: 2px;
  color: var(--vscode-checkbox-foreground);
  display: inline-block;
  width: 16px;
  height: 16px;
  transition: 60ms transform ease-in-out;

  &:active, &:focus, &:focus-visible {
    border-color: var(--vscode-focusBorder);
  }
`,x1=ht.span`
  padding-left: 10px;
`,w1=({checked:e})=>be.jsx(Vg,{width:"16",height:"16",viewBox:"0 0 16 16",xmlns:"http://www.w3.org/2000/svg",fill:e?"currentColor":"transparent",children:be.jsx("path",{fillRule:"evenodd",clipRule:"evenodd",d:"M14.431 3.323l-8.47 10-.79-.036-3.35-4.77.818-.574 2.978 4.24 8.051-9.506.764.646z"})}),k1=()=>be.jsx(Vg,{width:"16",height:"16",viewBox:"0 0 16 16",xmlns:"http://www.w3.org/2000/svg",fill:"currentColor",children:be.jsx("rect",{x:"4",y:"4",height:"8",width:"8",rx:"2"})}),Zu=({checked:e,children:t,className:r,indeterminate:i,disabled:a,onChange:l,...u})=>{const[d,h]=P.useState(!!e),p=P.useRef(null),b=Ug(),_=y=>{h(y.target.checked),l&&l(y.target.checked)};return P.useEffect(()=>{h(!!e)},[e]),P.useEffect(()=>{p.current&&(p.current.indeterminate=i===!0)},[i]),be.jsxs(b1,{htmlFor:b,className:`vscrui-checkbox ${r||""} ${a?"disabled":""}`,...u,children:[be.jsx("input",{id:b,ref:p,type:"checkbox",checked:d,disabled:a,onChange:_}),i===!0?be.jsx(k1,{}):be.jsx(w1,{checked:d}),t&&be.jsx(x1,{className:"vscrui-checkbox__label",children:t})]})};Zu.displayName="VSCRUI_Checkbox";const S1=ht.div`
  display: inline-block;
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
  color: var(--vscode-foreground);
  cursor: pointer;
  box-sizing: border-box;
  min-width: 100px;
  position: relative;
  user-select: none;
  outline: none;
  vertical-align: top;

  &.disabled {
    opacity: 0.4;
    pointer-events: none;
    cursor: not-allowed;
  }
`,C1=ht.button`
  all: unset;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--vscode-dropdown-background);
  border: 1px solid var(--vscode-dropdown-border);
  border-radius: 2px;
  height: 26px;
  box-sizing: border-box;
  contain: content;
  cursor: pointer;
  line-height: normal;
  padding: 2px 6px 2px 8px;
  width: 100%;

  &:not([disabled]):active,
  &.open {
    border-color: var(--vscode-focusBorder);
  }

  &:focus {
    border-color: var(--vscode-focusBorder);
  }

  &:hover {
    background: inherit;
  }
`,P1=ht.div`
  background: var(--vscode-dropdown-background);
  border: 1px solid var(--vscode-focusBorder);
  box-sizing: border-box;
  left: 0px;
  max-height: 200px;
  padding: 0 0 4px 0;
  overflow-y: auto;
  position: absolute;
  width: 100%;
  z-index: 1;

  // Below
  border-radius: ${e=>e.position==="above"?"2px 2px 0 0":"0 0 2px 2px"};
  top: ${e=>e.position==="above"?"auto":"26px"};
  bottom: ${e=>e.position==="above"?"26px":"auto"};

  ul {
    box-sizing: border-box;
    cursor: pointer;
    list-style: none;
    margin: 0px;
    max-height: 222px;
    overflow: auto;
    padding: 1px;
  }
`,T1=ht.button`
  all: unset;
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
  color: var(--vscode-foreground);
  border: 1px solid transparent;
  border-radius: 2px;
  box-sizing: border-box;
  cursor: pointer;
  line-height: normal;
  margin: 0;
  outline: none;
  overflow: hidden;
  padding: 0 2px 1px;
  user-select: none;
  white-space: nowrap;
  text-overflow: ellipsis;
  width: 100%;

  &:focus-visible {
		border-color: var(--vscode-focusBorder);
		background: var(--vscode-list-activeSelectionBackground);
		color: var(--vscode-foreground);
  }

  &.active {
    background: var(--vscode-list-activeSelectionBackground);
    border: 1px solid transparent;
    color: var(--vscode-list-activeSelectionForeground);
  }

  &:active {
		background: var(--vscode-list-activeSelectionBackground);
		color: var(--vscode-list-activeSelectionForeground);
  }

  &:not(.active):hover {
    background: var(--vscode-list-activeSelectionBackground);
		border: 1px solid transparent;
		color: var(--vscode-list-activeSelectionForeground);
  }

  &:not(.active):active {
		background: var(--vscode-list-activeSelectionBackground);
		color: var(--vscode-list-activeSelectionForeground);
	}

  body[data-vscode-theme-kind='vscode-high-contrast'] &.active,
  body[data-vscode-theme-kind='vscode-high-contrast-light'] &.active,
  body[data-vscode-theme-kind='vscode-high-contrast'] &:not(.active):hover,
  body[data-vscode-theme-kind='vscode-high-contrast-light'] &:not(.active):hover {
    border-style: dotted;
    border-color: var(--vscode-list-focusOutline);
  }

  &:disabled {
		cursor: not-allowed;
		opacity: 0.4;

    &:hover {
      background: inherit;
      border-color: transparent;
    }
	}

  body[data-vscode-theme-kind='vscode-high-contrast'] &:disabled,
  body[data-vscode-theme-kind='vscode-high-contrast-light'] &:disabled,
  body[data-vscode-theme-kind='vscode-high-contrast'] &:disabled:hover,
  body[data-vscode-theme-kind='vscode-high-contrast-light'] &:disabled:hover {
    background: inherit;
    border-color: transparent;
  }
`,Vc=({className:e,disabled:t,open:r,value:i,options:a=[],placeholder:l="",position:u="below",onChange:d,...h})=>{const[p,b]=P.useState(void 0),[_,y]=P.useState(null),[C,T]=P.useState(r),k=P.useRef(null),D=P.useCallback(z=>{k.current&&!k.current.contains(z.target)&&(T(!1),y(null))},[k]),x=P.useCallback(z=>{if(z!==p){const O=a.find(B=>(typeof B=="string"?B:B.value)===z);b(z),d&&d(O)}T(!1)},[p]),g=P.useCallback(z=>{if(C&&z.preventDefault(),C&&z.key==="Escape")T(!1);else if(C&&z.key==="ArrowDown")y(_===null?0:Math.min(_+1,a.length-1));else if(C&&z.key==="ArrowUp")y(_===null?a.length-1:Math.max(_-1,0));else if(C&&z.key==="Enter"){const O=a[_||0],B=typeof O=="string"?O:O.value;T(!1),x(B)}},[_,C,x]),v=P.useMemo(()=>t||a.length===0,[t,a]),E=P.useMemo(()=>a.length>0?typeof a[0]=="string"?a[0]:a[0].value:"",[a]),N=P.useCallback(()=>{!t&&a.length>0&&T(!C)},[t,a,C]),R=P.useMemo(()=>{if(p&&p){const z=a.find(O=>(typeof O=="string"?O:O.value)===p);return z?typeof z=="string"?z:z.label:void 0}},[p,a]);return P.useEffect(()=>{T(!!r)},[r]),P.useEffect(()=>(C&&document.addEventListener("mousedown",D),()=>{document.removeEventListener("mousedown",D)}),[C]),P.useEffect(()=>{if(i!==void 0){const z=typeof i=="string"?i:i.value;b(z);const O=a.findIndex(B=>(typeof B=="string"?B:B.value)===i);y(O)}else b(""),y(null)},[i,a]),be.jsxs(S1,{className:`vscrui-dropdown ${v?"disabled":""} ${e||""}`,onKeyDown:g,ref:k,...h,children:[be.jsxs(C1,{className:`vscrui-checkbox__trigger ${C?"open":""}`,disabled:v,onClick:N,children:[be.jsx("span",{children:R||l||E}),be.jsx("svg",{width:"16",height:"16",viewBox:"0 0 16 16",xmlns:"http://www.w3.org/2000/svg",fill:"currentColor",children:be.jsx("path",{fillRule:"evenodd",clipRule:"evenodd",d:"M7.976 10.072l4.357-4.357.62.618L8.284 11h-.618L3 6.333l.619-.618 4.357 4.357z"})})]}),C&&!v&&be.jsx(P1,{className:"vscrui-checkbox__listbox",position:u,children:be.jsx("ul",{children:a.map((z,O)=>{const B=typeof z=="string"?z:z.value,H=typeof z=="string"?z:z.label,V=typeof z=="string"?!1:z.disabled;return be.jsx("li",{onMouseEnter:()=>y(O),children:be.jsx(T1,{className:`vscrui-checkbox__listbox__item ${_===null&&p===B||_===O?"active":""}`,"aria-selected":p===B?"true":"false",disabled:V,onClick:()=>x(B),children:H},O)},O)})})})]})};Vc.displayName="VSCRUI_Dropdown";const E1=ht.i`
  display: inline-block;
  color: var(--vscode-icon-foreground);
  display: inline-block;
  text-decoration: none;
  text-rendering: auto;
  text-align: center;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  user-select: none;

  &.codicon-spin {
    animation: spin 1.5s steps(30) infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`,ze=({className:e,name:t,spin:r=!1,size:i=16,...a})=>{const l=P.useMemo(()=>typeof i=="number"?`${i}px`:i,[i]);return be.jsx(E1,{className:`vscrui-icon codicon codicon-${t} ${r?"codicon-spin":""} ${e||""}`,style:{fontSize:l},...a})};ze.displayName="VSCRUI_Icon";const L1=ht.label`
  color: var(--vscode-foreground);
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
  font-weight: 400;
  margin: 0;
  overflow: hidden;
  padding: 4px 0 0;
  text-overflow: ellipsis;
  display: block;
  white-space: nowrap;
`,Gg=({children:e,className:t,...r})=>be.jsx(L1,{className:`vscrui-label ${t||""}`,...r,children:e});Gg.displayName="VSCRUI_Label";const z1=ht.div`
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
  display: inline-block;
  min-width: 100px;
`,M1=ht(Gg)`
  margin-bottom: 2px;
`,N1=ht.input`
  appearance: none;
  font-size: var(--vscode-font-size);
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: row;
  color: var(--vscode-input-foreground);
  background: var(--vscode-input-background);
  border-radius: 2px;
  border: 1px solid var(--vscode-dropdown-border);
  height: 26px;
  padding: 0 9px;
  width: 100%;

  &:hover,
	&:focus-visible,
	&:disabled,
	&:active,
  &:focus {
		outline: none;
    box-shadow: none;
	}

  &:not([disabled]):hover {
    background: var(--vscode-input-background);
    border-color: var(--vscode-dropdown-border);
  }

  &:not([disabled]):active {
    background: var(--vscode-input-background);
		border-color: var(--vscode-focusBorder);
	}

  &:not([disabled]):focus,
  &:not([disabled]):focus-within {
		border-color: var(--vscode-focusBorder);
  }

  &:disabled,
	&:readonly {
		cursor: not-allowed;
	}

  &:disabled {
    opacity: 0.4;
    border-color: var(--vscode-dropdown-border);
  }
`,Kg=({className:e,children:t,disabled:r,readonly:i,value:a,onChange:l,placeholder:u,...d})=>{const[h,p]=P.useState(a),b=Ug(),_=y=>{p(y.target.value),l&&l(y.target.value)};return P.useEffect(()=>{p(a)},[a]),be.jsxs(z1,{className:`vscrui-textfield ${e||""}`,...d,children:[t&&be.jsx(M1,{htmlFor:b,children:t}),be.jsx(N1,{type:"text",id:b,className:"vscrui-textfield__input",defaultValue:h,placeholder:u,disabled:r,readOnly:i,onChange:_})]})};Kg.displayName="VSCRUI_TextField";function A1({playbackState:e,onToggle:t,disabled:r=!1}){const i=e==="playing";return w.jsx(xe,{appearance:"icon",onClick:t,disabled:r,"aria-label":i?"Pause":"Play",title:i?"Pause (Space)":"Play (Space)",children:w.jsx(ze,{name:i?"debug-pause":"debug-start"})})}const Bh=[1,2,4,8,16,32,64];function O1({speed:e,onSpeedChange:t,disabled:r=!1}){const i=Bh.map(a=>({label:`${a}x`,value:String(a)}));return w.jsx(Vc,{options:i,value:String(e),disabled:r,onChange:a=>{if(typeof a=="string"){const l=Number(a);Bh.includes(l)&&t(l)}}})}function I1({mode:e,onModeChange:t,disabled:r=!1}){return w.jsxs("div",{className:"debrief-display-mode-toggle",role:"radiogroup","aria-label":"Track display mode",children:[w.jsx(xe,{appearance:e==="full"?"secondary":"icon",disabled:r,onClick:()=>t("full"),"aria-pressed":e==="full",title:"Show full track",children:"Full"}),w.jsx(xe,{appearance:e==="trail"?"secondary":"icon",disabled:r,onClick:()=>t("trail"),"aria-pressed":e==="trail",title:"Show trail to current time",children:"Trail"})]})}function R1({timeExtent:e=null,initialTime:t,initialSpeed:r=1,initialDisplayMode:i="full",onTimeChange:a,onPlaybackStateChange:l,onDisplayModeChange:u,uiState:d,className:h,style:p}){const b=P.useRef(null),[_,y]=P.useState(i),C=d??(e?"ready":"empty"),T=C!=="ready",k=_g({timeExtent:e,initialTime:t,initialSpeed:r,onTimeChange:a,onPlaybackStateChange:l}),D=P.useCallback(g=>{y(g),u==null||u(g)},[u]);P.useEffect(()=>{const g=b.current;if(!g||T)return;const v=E=>{if(g.contains(document.activeElement))switch(E.key){case" ":E.preventDefault(),k.togglePlayback();break;case"ArrowRight":E.preventDefault(),k.scrubForward();break;case"ArrowLeft":E.preventDefault(),k.scrubBackward();break}};return g.addEventListener("keydown",v),()=>g.removeEventListener("keydown",v)},[T,k]);const x=P.useCallback(g=>{k.playbackState==="playing"&&k.pause(),k.setCurrentTime(g)},[k]);return C==="empty"?w.jsx("div",{ref:b,className:`debrief-time-controller debrief-time-controller--empty ${h??""}`,style:p,children:w.jsx("div",{className:"debrief-time-controller__empty-message",children:"No data loaded"})}):C==="loading"?w.jsx("div",{ref:b,className:`debrief-time-controller debrief-time-controller--loading ${h??""}`,style:p,children:w.jsx("div",{className:"debrief-time-controller__loading-message",children:"Loading..."})}):w.jsxs("div",{ref:b,className:`debrief-time-controller debrief-time-controller--ready ${h??""}`,style:p,tabIndex:0,role:"region","aria-label":"Time Controller",children:[w.jsx("div",{className:"debrief-time-controller__row debrief-time-controller__row--display",children:w.jsx(ux,{time:k.currentTime})}),w.jsx("div",{className:"debrief-time-controller__row debrief-time-controller__row--scrubber",children:w.jsx(cx,{timeExtent:e,currentTime:k.currentTime,onTimeChange:x,disabled:T})}),w.jsxs("div",{className:"debrief-time-controller__row debrief-time-controller__row--controls",children:[w.jsx(A1,{playbackState:k.playbackState,onToggle:k.togglePlayback,disabled:T}),w.jsx(I1,{mode:_,onModeChange:D,disabled:T}),w.jsx(O1,{speed:k.speed,onSpeedChange:k.setSpeed,disabled:T})]})]})}const Yg={textQuery:"",searchScope:{name:!0,type:!0,platform:!0,attachments:!1},featureTypes:{},visibility:"all",temporal:{before:null,after:null}};function D1(e){if(e.textQuery!==""||e.visibility!=="all"||e.temporal.before!==null||e.temporal.after!==null)return!0;for(const t of Object.values(e.featureTypes))if(!t)return!0;return!1}const ws={delete:"Delete",toggleVisibility:"Toggle Visibility",run:"Run",filter:"Filter",associatedFiles:"Associated Files",searchPlaceholder:"Search features...",searchScopeName:"Name",searchScopeType:"Type",searchScopePlatform:"Platform",searchScopeAttachments:"Attachments",featureTypesTitle:"Feature types",visibilityAll:"All",visibilityHiddenOnly:"Hidden only",visibilityVisibleOnly:"Visible only",temporalAfter:"Features after",temporalBefore:"Features before",applySelectAll:"Select all",applySelectMatched:"Select matched",applyAddMatched:"Add matched to selection",applyRemoveMatched:"Remove matched from selection",clearAllFilters:"Clear all filters",fileCategory:"File",editCategory:"Edit",viewCategory:"View",analysisCategory:"Analysis",noToolsAvailable:"No tools available",exportSelection:"Export Selection",exportGeoJSON:"Export to GeoJSON",exportCSV:"Export to CSV",duplicate:"Duplicate",rename:"Rename",lockUnlock:"Lock/Unlock",zoomToSelection:"Zoom to Selection",panToFeature:"Pan to Feature",centerMap:"Center Map",sources:"Sources",results:"Results",open:"Open",openWith:"Open With...",revealInExplorer:"Reveal in Explorer",deleteFile:"Delete",provenanceWarning:"Warning: Removing source data breaks provenance chain",noFiles:"No files",showHidden:"Show hidden features",hideHidden:"Hide hidden features"};function j1({featureKinds:e,filterState:t,onFilterChange:r,onApplyToSelection:i,hasActiveFilter:a=!1,allSelected:l=!1,labels:u}){const d={...ws,...u},[h,p]=P.useState(t.textQuery),b=P.useRef(null);P.useEffect(()=>{p(t.textQuery)},[t.textQuery]);const _=P.useCallback(g=>{p(g),b.current&&clearTimeout(b.current),b.current=setTimeout(()=>{r({...t,textQuery:g})},150)},[t,r]);P.useEffect(()=>()=>{b.current&&clearTimeout(b.current)},[]);const y=(g,v)=>{r({...t,searchScope:{...t.searchScope,[g]:v}})},C=(g,v)=>{r({...t,featureTypes:{...t.featureTypes,[g]:v}})},T=g=>{r({...t,visibility:g})},k=(g,v)=>{r({...t,temporal:{...t.temporal,[g]:v}})},D=()=>{p(""),r(Yg)},x=[{label:d.visibilityAll,value:"all"},{label:d.visibilityHiddenOnly,value:"hidden-only"},{label:d.visibilityVisibleOnly,value:"visible-only"}];return w.jsxs("div",{className:"debrief-filter-dropdown",children:[w.jsxs("div",{className:"debrief-filter-dropdown__action-row",children:[i&&w.jsxs(w.Fragment,{children:[w.jsx(xe,{appearance:"icon",onClick:()=>i("selectAll"),disabled:l,title:d.applySelectAll,"aria-label":d.applySelectAll,children:w.jsx(ze,{name:"check-all"})}),w.jsx(xe,{appearance:"icon",onClick:()=>i("select"),disabled:!a,title:d.applySelectMatched,"aria-label":d.applySelectMatched,children:w.jsx(ze,{name:"check"})}),w.jsx(xe,{appearance:"icon",onClick:()=>i("add"),disabled:!a,title:d.applyAddMatched,"aria-label":d.applyAddMatched,children:w.jsx(ze,{name:"add"})}),w.jsx(xe,{appearance:"icon",onClick:()=>i("remove"),disabled:!a,title:d.applyRemoveMatched,"aria-label":d.applyRemoveMatched,children:w.jsx(ze,{name:"remove"})})]}),w.jsx("div",{className:"debrief-filter-dropdown__action-spacer"}),w.jsx(xe,{appearance:"icon",onClick:D,disabled:!a,title:d.clearAllFilters,"aria-label":d.clearAllFilters,children:w.jsx("svg",{width:"14",height:"14",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round",children:w.jsx("path",{d:"M4 14h8M7.5 14l5.3-5.3a2 2 0 0 0 0-2.8L10.1 3.1a2 2 0 0 0-2.8 0L2.6 7.8a2 2 0 0 0 0 2.8L5 13.1"})})})]}),w.jsx("div",{className:"debrief-filter-dropdown__divider"}),w.jsxs("div",{className:"debrief-filter-dropdown__section",children:[w.jsx(Kg,{placeholder:d.searchPlaceholder,value:h,onChange:_}),w.jsx("div",{className:"debrief-filter-dropdown__scope-row",children:[["name",d.searchScopeName],["type",d.searchScopeType],["platform",d.searchScopePlatform],["attachments",d.searchScopeAttachments]].map(([g,v])=>w.jsx(Zu,{checked:t.searchScope[g],onChange:E=>y(g,E),children:v},g))})]}),w.jsx("div",{className:"debrief-filter-dropdown__divider"}),e.length>0&&w.jsxs("div",{className:"debrief-filter-dropdown__section",children:[w.jsx("div",{className:"debrief-filter-dropdown__section-title",children:d.featureTypesTitle}),w.jsx("div",{className:"debrief-filter-dropdown__checkbox-grid",children:e.map(g=>w.jsx(Zu,{checked:t.featureTypes[g]??!0,onChange:v=>C(g,v),children:g},g))})]}),w.jsx("div",{className:"debrief-filter-dropdown__divider"}),w.jsx("div",{className:"debrief-filter-dropdown__section",children:w.jsx(Vc,{options:x,value:t.visibility,onChange:g=>{typeof g=="string"&&T(g)}})}),w.jsx("div",{className:"debrief-filter-dropdown__divider"}),w.jsxs("div",{className:"debrief-filter-dropdown__section",children:[w.jsxs("label",{className:"debrief-filter-dropdown__temporal-label",children:[d.temporalAfter,w.jsxs("div",{className:"debrief-filter-dropdown__temporal-row",children:[w.jsx("input",{type:"datetime-local",className:"debrief-filter-dropdown__temporal-input",value:t.temporal.after??"",onChange:g=>k("after",g.target.value||null)}),t.temporal.after&&w.jsx(xe,{appearance:"icon",onClick:()=>k("after",null),"aria-label":"Clear after filter",children:"×"})]})]}),w.jsxs("label",{className:"debrief-filter-dropdown__temporal-label",children:[d.temporalBefore,w.jsxs("div",{className:"debrief-filter-dropdown__temporal-row",children:[w.jsx("input",{type:"datetime-local",className:"debrief-filter-dropdown__temporal-input",value:t.temporal.before??"",onChange:g=>k("before",g.target.value||null)}),t.temporal.before&&w.jsx(xe,{appearance:"icon",onClick:()=>k("before",null),"aria-label":"Clear before filter",children:"×"})]})]})]})]})}function B1({toolMatches:e,selectedFeatureIds:t,onRunTool:r,onRunAction:i,labels:a}){const l={...ws,...a},u=P.useMemo(()=>{const h={id:"file",label:l.fileCategory,items:[{id:"export-selection",label:l.exportSelection},{id:"export-geojson",label:l.exportGeoJSON},{id:"export-csv",label:l.exportCSV}]},p={id:"edit",label:l.editCategory,items:[{id:"duplicate",label:l.duplicate},{id:"rename",label:l.rename},{id:"lock-unlock",label:l.lockUnlock}]},b={id:"view",label:l.viewCategory,items:[{id:"zoom-to-selection",label:l.zoomToSelection},{id:"pan-to-feature",label:l.panToFeature},{id:"center-map",label:l.centerMap}]},_=e.filter(T=>T.isActive),y=[];if(_.length===0)y.push({id:"no-tools",label:l.noToolsAvailable,disabled:!0});else{const T=new Map;for(const k of _){const D=k.tool.category??"Other",x=T.get(D)??[];T.set(D,[...x,k])}for(const[k,D]of T){y.length>0&&y.push({id:`sep-${k}`,label:"",disabled:!0}),y.push({id:`header-${k}`,label:k,disabled:!0});for(const x of D.sort((g,v)=>g.tool.name.localeCompare(v.tool.name)))y.push({id:x.tool.id,label:x.tool.name})}}const C={id:"analysis",label:l.analysisCategory,items:y};return[h,p,b,C]},[e,l]),d=(h,p)=>{h==="analysis"&&!p.startsWith("header-")&&!p.startsWith("sep-")&&p!=="no-tools"?r(p,t):h!=="analysis"&&(i==null||i(p,t))};return w.jsx("div",{className:"debrief-run-dropdown",children:u.map(h=>w.jsxs("div",{className:"debrief-run-dropdown__category",children:[w.jsxs("div",{className:"debrief-run-dropdown__category-trigger",children:[w.jsx("span",{className:"debrief-run-dropdown__arrow",children:"▸"}),h.label]}),w.jsx("div",{className:"debrief-run-dropdown__submenu",children:h.items.map(p=>p.label===""?w.jsx("div",{className:"debrief-run-dropdown__separator"},p.id):p.disabled&&p.id.startsWith("header-")?w.jsx("div",{className:"debrief-run-dropdown__group-header",children:p.label},p.id):w.jsx(xe,{appearance:"icon",className:`debrief-run-dropdown__item${p.disabled?" debrief-run-dropdown__item--disabled":""}`,disabled:p.disabled,onClick:()=>d(h.id,p.id),children:p.label},p.id))})]},h.id))})}function F1({sourceFiles:e,resultFiles:t,onFileAction:r,labels:i}){const a={...ws,...i},[l,u]=P.useState(null),[d,h]=P.useState(!1),p=y=>{u((l==null?void 0:l.path)===y.path?null:y),h(!1)},b=(y,C)=>{if(C==="delete"&&y.category==="source"&&!d){h(!0);return}r(y,C),u(null),h(!1)},_=(y,C)=>w.jsxs("div",{className:"debrief-associated-files__section",children:[w.jsx("div",{className:"debrief-associated-files__section-header",children:C}),y.length===0?w.jsx("div",{className:"debrief-associated-files__empty",children:a.noFiles}):y.map(T=>w.jsxs("div",{children:[w.jsxs(xe,{appearance:"icon",className:`debrief-associated-files__file${(l==null?void 0:l.path)===T.path?" debrief-associated-files__file--active":""}`,onClick:()=>p(T),children:[T.viewerType&&w.jsx("span",{className:"debrief-associated-files__viewer-badge",children:T.viewerType}),w.jsx("span",{className:"debrief-associated-files__file-name",children:T.name})]}),(l==null?void 0:l.path)===T.path&&w.jsxs("div",{className:"debrief-associated-files__context-menu",children:[d&&w.jsx("div",{className:"debrief-associated-files__provenance-warning",children:a.provenanceWarning}),w.jsx(xe,{appearance:"secondary",className:"debrief-associated-files__action",onClick:()=>b(T,"open"),children:a.open}),w.jsx(xe,{appearance:"secondary",className:"debrief-associated-files__action",onClick:()=>b(T,"openWith"),children:a.openWith}),w.jsx(xe,{appearance:"secondary",className:"debrief-associated-files__action",onClick:()=>b(T,"reveal"),children:a.revealInExplorer}),w.jsx("div",{className:"debrief-associated-files__separator"}),w.jsx(xe,{appearance:"secondary",className:"debrief-associated-files__action debrief-associated-files__action--danger",onClick:()=>b(T,"delete"),children:d?`${a.deleteFile} (confirm)`:a.deleteFile})]})]},T.path))]});return w.jsxs("div",{className:"debrief-associated-files",children:[_(e,a.sources),w.jsx("div",{className:"debrief-associated-files__divider"}),_(t,a.results)]})}function Z1({selectedFeatureIds:e,features:t,hiddenIds:r,toolMatches:i=[],sourceFiles:a=[],resultFiles:l=[],toolsChanged:u=!1,resultsChanged:d=!1,filterState:h,showHidden:p=!0,onDelete:b,onToggleVisibility:_,onRunTool:y,onRunAction:C,onFilterChange:T,onShowHiddenChange:k,onApplyToSelection:D,onFileAction:x,onDropdownOpened:g,labels:v,className:E}){const N={...ws,...v},R=h??Yg,[z,O]=P.useState(null),B=P.useRef(null),H=e.length>0,V=D1(R),oe=P.useMemo(()=>{if(!H||!r||r.size===0)return"all-visible";let U=0;for(const X of e)r.has(X)&&U++;return U===0?"all-visible":U===e.length?"all-hidden":"mixed"},[H,e,r]),Ne=P.useMemo(()=>{const U=new Set;for(const X of t)X.properties.kind&&U.add(X.properties.kind);return Array.from(U).sort()},[t]),J=P.useCallback(U=>{O(X=>X===U?null:((U==="run"||U==="associated")&&(g==null||g(U)),U))},[g]);P.useEffect(()=>{const U=X=>{X.key==="Escape"&&O(null)};return document.addEventListener("keydown",U),()=>document.removeEventListener("keydown",U)},[]),P.useEffect(()=>{const U=X=>{B.current&&!B.current.contains(X.target)&&O(null)};return document.addEventListener("mousedown",U),()=>document.removeEventListener("mousedown",U)},[]);const le=["debrief-layers-toolbar",E].filter(Boolean).join(" ");return w.jsxs("div",{className:le,ref:B,children:[w.jsxs("div",{className:"debrief-layers-toolbar__group",children:[w.jsx(xe,{appearance:"icon",disabled:!H,onClick:()=>H&&(b==null?void 0:b(e)),title:N.delete,"aria-label":N.delete,children:w.jsx(ze,{name:"trash"})}),w.jsx(xe,{appearance:"icon",disabled:!H,onClick:()=>H&&(_==null?void 0:_(e)),title:N.toggleVisibility,"aria-label":N.toggleVisibility,children:oe==="all-visible"?w.jsx(ze,{name:"eye-closed"}):oe==="all-hidden"?w.jsx(ze,{name:"eye"}):w.jsx(ze,{name:"eye"})}),w.jsxs("div",{className:"debrief-layers-toolbar__btn-wrapper",children:[w.jsxs(xe,{appearance:"icon",className:u?"debrief-toolbar-btn--halo":void 0,disabled:!H,onClick:()=>H&&J("run"),title:N.run,"aria-label":N.run,"aria-expanded":z==="run",children:[w.jsx(ze,{name:"play"}),w.jsx("span",{className:"debrief-layers-toolbar__arrow",children:"▾"})]}),z==="run"&&w.jsx("div",{className:"debrief-layers-toolbar__dropdown debrief-layers-toolbar__dropdown--left",children:w.jsx(B1,{toolMatches:i,selectedFeatureIds:e,onRunTool:(U,X)=>{y==null||y(U,X),O(null)},onRunAction:(U,X)=>{C==null||C(U,X),O(null)},labels:v})})]})]}),w.jsx("div",{className:"debrief-layers-toolbar__spacer"}),w.jsxs("div",{className:"debrief-layers-toolbar__group",children:[k&&w.jsx(xe,{appearance:"icon",onClick:()=>k(!p),title:p?N.hideHidden:N.showHidden,"aria-label":p?N.hideHidden:N.showHidden,"aria-pressed":!p,children:p?w.jsx(ze,{name:"eye-closed"}):w.jsx(ze,{name:"eye"})}),w.jsxs("div",{className:"debrief-layers-toolbar__btn-wrapper",children:[w.jsxs(xe,{appearance:"icon",onClick:()=>J("filter"),title:N.filter,"aria-label":N.filter,"aria-expanded":z==="filter",children:[V?w.jsx(ze,{name:"filter-filled"}):w.jsx(ze,{name:"search"}),w.jsx("span",{className:"debrief-layers-toolbar__arrow",children:"▾"})]}),z==="filter"&&w.jsx("div",{className:"debrief-layers-toolbar__dropdown debrief-layers-toolbar__dropdown--right",children:w.jsx(j1,{featureKinds:Ne,filterState:R,onFilterChange:U=>T==null?void 0:T(U),onApplyToSelection:D,hasActiveFilter:V,allSelected:e.length>0&&e.length>=t.length,labels:v})})]}),w.jsxs("div",{className:"debrief-layers-toolbar__btn-wrapper",children:[w.jsxs(xe,{appearance:"icon",className:d?"debrief-toolbar-btn--halo":void 0,onClick:()=>J("associated"),title:N.associatedFiles,"aria-label":N.associatedFiles,"aria-expanded":z==="associated",children:[w.jsx("svg",{width:"16",height:"16",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round",children:w.jsx("path",{d:"M10.5 4.5l-5 5a2.12 2.12 0 0 0 3 3l5-5a3.54 3.54 0 0 0-5-5l-5 5a4.95 4.95 0 0 0 7 7l4.5-4.5"})}),w.jsx("span",{className:"debrief-layers-toolbar__arrow",children:"▾"})]}),z==="associated"&&w.jsx("div",{className:"debrief-layers-toolbar__dropdown debrief-layers-toolbar__dropdown--right",children:w.jsx(F1,{sourceFiles:a,resultFiles:l,onFileAction:(U,X)=>{x==null||x(U,X)},labels:v})})]})]})]})}function H1({tools:e,onRunTool:t,className:r}){const i=e.filter(l=>l.applicable),a=e.filter(l=>!l.applicable);return e.length===0?w.jsx("div",{className:`debrief-tools-panel debrief-tools-panel--empty ${r??""}`,children:w.jsxs("div",{className:"debrief-tools-panel__message",children:[w.jsx(ze,{name:"info"}),w.jsx("span",{children:"Select features to see available tools"})]})}):w.jsx("div",{className:`debrief-tools-panel ${r??""}`,children:w.jsxs("ul",{className:"debrief-tools-panel__list",role:"list",children:[i.map(l=>w.jsxs("li",{className:"debrief-tools-panel__item debrief-tools-panel__item--active",onClick:()=>t==null?void 0:t(l.id),children:[w.jsx(xe,{appearance:"icon",onClick:()=>t==null?void 0:t(l.id),title:`Run ${l.name}`,children:w.jsx(ze,{name:"tools"})}),w.jsxs("div",{className:"debrief-tools-panel__item-text",children:[w.jsx("span",{className:"debrief-tools-panel__item-name",children:l.name}),w.jsx("span",{className:"debrief-tools-panel__item-desc",children:l.description})]})]},l.id)),a.map(l=>w.jsxs("li",{className:"debrief-tools-panel__item debrief-tools-panel__item--inactive",title:l.explanation??"Selection does not match requirements",children:[w.jsx("span",{className:"debrief-tools-panel__item-icon",children:w.jsx(ze,{name:"circle-slash"})}),w.jsxs("div",{className:"debrief-tools-panel__item-text",children:[w.jsx("span",{className:"debrief-tools-panel__item-name",children:l.name}),w.jsx("span",{className:"debrief-tools-panel__item-desc",children:l.explanation??l.description})]})]},l.id))]})})}class Ol extends P.Component{constructor(t){super(t),this.state={hasError:!1}}static getDerivedStateFromError(t){return{hasError:!0,error:t}}componentDidCatch(t,r){console.error(`ActivityPanel: ${this.props.sectionName} error:`,t,r)}render(){return this.state.hasError?w.jsxs("div",{className:"debrief-activity-panel__section-error",children:[w.jsx(ze,{name:"error"}),w.jsxs("span",{children:[this.props.sectionName," encountered an error"]})]}):this.props.children}}function Il({title:e,icon:t,collapsed:r,onToggle:i,layout:a="fixed",style:l,children:u}){const d=["debrief-activity-panel__section",r&&"debrief-activity-panel__section--collapsed",a==="flexible"&&!r&&"debrief-activity-panel__section--flexible"].filter(Boolean).join(" ");return w.jsxs("div",{className:d,style:l,children:[w.jsxs("button",{type:"button",className:"debrief-activity-panel__section-header",onClick:i,"aria-expanded":!r,children:[w.jsx(ze,{name:r?"chevron-right":"chevron-down"}),w.jsx(ze,{name:t}),w.jsx("span",{className:"debrief-activity-panel__section-title",children:e})]}),!r&&w.jsx("div",{className:"debrief-activity-panel__section-content",children:u})]})}function W1({onDrag:e}){const t=P.useRef(null);return P.useEffect(()=>{const r=t.current;if(!r)return;let i=0;const a=d=>{const h=d.clientY-i;i=d.clientY,e(h)},l=()=>{document.removeEventListener("pointermove",a),document.removeEventListener("pointerup",l),document.body.style.cursor="",document.body.style.userSelect=""},u=d=>{d.preventDefault(),i=d.clientY,document.body.style.cursor="row-resize",document.body.style.userSelect="none",document.addEventListener("pointermove",a),document.addEventListener("pointerup",l)};return r.addEventListener("pointerdown",u),()=>{r.removeEventListener("pointerdown",u),document.removeEventListener("pointermove",a),document.removeEventListener("pointerup",l)}},[e]),w.jsx("div",{ref:t,className:"debrief-activity-panel__resize-handle"})}function U1({timeExtent:e,currentTime:t,playbackSpeed:r,displayMode:i,timeUiState:a,tools:l=[],features:u=[],selectedFeatureIds:d=[],hiddenIds:h,toolMatches:p=[],sourceFiles:b=[],resultFiles:_=[],resultsChanged:y=!1,collapseState:C,onCollapseStateChange:T,onMessage:k,className:D}){const[x,g]=P.useState(nx),v=C??x,[E,N]=P.useState(0),R=P.useCallback(j=>{N(Y=>Y+j)},[]),z=P.useCallback(j=>{const Y={...v,[j]:!v[j]};g(Y),T==null||T(Y)},[v,T]),O=P.useCallback(j=>{k==null||k({type:"temporal:seek",payload:{time:j}})},[k]),B=P.useCallback(j=>{j==="playing"?k==null||k({type:"temporal:play",payload:{rate:1}}):k==null||k({type:"temporal:pause"})},[k]),H=P.useCallback(j=>{k==null||k({type:"temporal:displayMode",payload:{mode:j}})},[k]),V=P.useCallback(j=>{k==null||k({type:"tool:run",payload:{toolId:j}})},[k]),oe=P.useCallback(j=>{k==null||k({type:"layer:toggleVisibility",payload:{featureIds:j}})},[k]),Ne=P.useCallback(j=>{k==null||k({type:"layer:delete",payload:{featureIds:j}})},[k]),J=P.useCallback(j=>{k==null||k({type:"layer:select",payload:{featureIds:Array.from(j)}})},[k]),le=!v.toolsCollapsed,U=!v.layersCollapsed,X=le&&U,I=X?{flexBasis:`calc(50% + ${E}px)`}:void 0,G=X?{flexBasis:`calc(50% - ${E}px)`}:void 0;return w.jsxs("div",{className:`debrief-activity-panel ${D??""}`,role:"region","aria-label":"Activity Panel",children:[w.jsx(Il,{title:"Time Controller",icon:"watch",collapsed:v.timeControllerCollapsed,onToggle:()=>z("timeControllerCollapsed"),layout:"fixed",children:w.jsx(Ol,{sectionName:"Time Controller",children:w.jsx(R1,{timeExtent:e??void 0,initialTime:t,initialSpeed:r,initialDisplayMode:i,uiState:a,onTimeChange:O,onPlaybackStateChange:B,onDisplayModeChange:H})})}),w.jsx(Il,{title:"Tools",icon:"tools",collapsed:v.toolsCollapsed,onToggle:()=>z("toolsCollapsed"),layout:"flexible",style:I,children:w.jsx(Ol,{sectionName:"Tools",children:w.jsx(H1,{tools:l,onRunTool:V})})}),X&&w.jsx(W1,{onDrag:R}),w.jsx(Il,{title:"Layers",icon:"layers",collapsed:v.layersCollapsed,onToggle:()=>z("layersCollapsed"),layout:"flexible",style:G,children:w.jsxs(Ol,{sectionName:"Layers",children:[w.jsx(Z1,{selectedFeatureIds:d,features:u,hiddenIds:h,toolMatches:p,sourceFiles:b,resultFiles:_,resultsChanged:y,onDelete:Ne,onToggleVisibility:oe,onRunTool:j=>k==null?void 0:k({type:"tool:run",payload:{toolId:j}})}),w.jsx(Vb,{features:u,selectedIds:new Set(d),hiddenIds:h,onSelectionChange:J})]})})]})}(function(){try{if(typeof document<"u"){var e=document.createElement("style");e.appendChild(document.createTextNode(`/* required styles */\r
\r
.leaflet-pane,\r
.leaflet-tile,\r
.leaflet-marker-icon,\r
.leaflet-marker-shadow,\r
.leaflet-tile-container,\r
.leaflet-pane > svg,\r
.leaflet-pane > canvas,\r
.leaflet-zoom-box,\r
.leaflet-image-layer,\r
.leaflet-layer {\r
	position: absolute;\r
	left: 0;\r
	top: 0;\r
	}\r
.leaflet-container {\r
	overflow: hidden;\r
	}\r
.leaflet-tile,\r
.leaflet-marker-icon,\r
.leaflet-marker-shadow {\r
	-webkit-user-select: none;\r
	   -moz-user-select: none;\r
	        user-select: none;\r
	  -webkit-user-drag: none;\r
	}\r
/* Prevents IE11 from highlighting tiles in blue */\r
.leaflet-tile::selection {\r
	background: transparent;\r
}\r
/* Safari renders non-retina tile on retina better with this, but Chrome is worse */\r
.leaflet-safari .leaflet-tile {\r
	image-rendering: -webkit-optimize-contrast;\r
	}\r
/* hack that prevents hw layers "stretching" when loading new tiles */\r
.leaflet-safari .leaflet-tile-container {\r
	width: 1600px;\r
	height: 1600px;\r
	-webkit-transform-origin: 0 0;\r
	}\r
.leaflet-marker-icon,\r
.leaflet-marker-shadow {\r
	display: block;\r
	}\r
/* .leaflet-container svg: reset svg max-width decleration shipped in Joomla! (joomla.org) 3.x */\r
/* .leaflet-container img: map is broken in FF if you have max-width: 100% on tiles */\r
.leaflet-container .leaflet-overlay-pane svg {\r
	max-width: none !important;\r
	max-height: none !important;\r
	}\r
.leaflet-container .leaflet-marker-pane img,\r
.leaflet-container .leaflet-shadow-pane img,\r
.leaflet-container .leaflet-tile-pane img,\r
.leaflet-container img.leaflet-image-layer,\r
.leaflet-container .leaflet-tile {\r
	max-width: none !important;\r
	max-height: none !important;\r
	width: auto;\r
	padding: 0;\r
	}\r
\r
.leaflet-container img.leaflet-tile {\r
	/* See: https://bugs.chromium.org/p/chromium/issues/detail?id=600120 */\r
	mix-blend-mode: plus-lighter;\r
}\r
\r
.leaflet-container.leaflet-touch-zoom {\r
	-ms-touch-action: pan-x pan-y;\r
	touch-action: pan-x pan-y;\r
	}\r
.leaflet-container.leaflet-touch-drag {\r
	-ms-touch-action: pinch-zoom;\r
	/* Fallback for FF which doesn't support pinch-zoom */\r
	touch-action: none;\r
	touch-action: pinch-zoom;\r
}\r
.leaflet-container.leaflet-touch-drag.leaflet-touch-zoom {\r
	-ms-touch-action: none;\r
	touch-action: none;\r
}\r
.leaflet-container {\r
	-webkit-tap-highlight-color: transparent;\r
}\r
.leaflet-container a {\r
	-webkit-tap-highlight-color: rgba(51, 181, 229, 0.4);\r
}\r
.leaflet-tile {\r
	filter: inherit;\r
	visibility: hidden;\r
	}\r
.leaflet-tile-loaded {\r
	visibility: inherit;\r
	}\r
.leaflet-zoom-box {\r
	width: 0;\r
	height: 0;\r
	-moz-box-sizing: border-box;\r
	     box-sizing: border-box;\r
	z-index: 800;\r
	}\r
/* workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=888319 */\r
.leaflet-overlay-pane svg {\r
	-moz-user-select: none;\r
	}\r
\r
.leaflet-pane         { z-index: 400; }\r
\r
.leaflet-tile-pane    { z-index: 200; }\r
.leaflet-overlay-pane { z-index: 400; }\r
.leaflet-shadow-pane  { z-index: 500; }\r
.leaflet-marker-pane  { z-index: 600; }\r
.leaflet-tooltip-pane   { z-index: 650; }\r
.leaflet-popup-pane   { z-index: 700; }\r
\r
.leaflet-map-pane canvas { z-index: 100; }\r
.leaflet-map-pane svg    { z-index: 200; }\r
\r
.leaflet-vml-shape {\r
	width: 1px;\r
	height: 1px;\r
	}\r
.lvml {\r
	behavior: url(#default#VML);\r
	display: inline-block;\r
	position: absolute;\r
	}\r
\r
\r
/* control positioning */\r
\r
.leaflet-control {\r
	position: relative;\r
	z-index: 800;\r
	pointer-events: visiblePainted; /* IE 9-10 doesn't have auto */\r
	pointer-events: auto;\r
	}\r
.leaflet-top,\r
.leaflet-bottom {\r
	position: absolute;\r
	z-index: 1000;\r
	pointer-events: none;\r
	}\r
.leaflet-top {\r
	top: 0;\r
	}\r
.leaflet-right {\r
	right: 0;\r
	}\r
.leaflet-bottom {\r
	bottom: 0;\r
	}\r
.leaflet-left {\r
	left: 0;\r
	}\r
.leaflet-control {\r
	float: left;\r
	clear: both;\r
	}\r
.leaflet-right .leaflet-control {\r
	float: right;\r
	}\r
.leaflet-top .leaflet-control {\r
	margin-top: 10px;\r
	}\r
.leaflet-bottom .leaflet-control {\r
	margin-bottom: 10px;\r
	}\r
.leaflet-left .leaflet-control {\r
	margin-left: 10px;\r
	}\r
.leaflet-right .leaflet-control {\r
	margin-right: 10px;\r
	}\r
\r
\r
/* zoom and fade animations */\r
\r
.leaflet-fade-anim .leaflet-popup {\r
	opacity: 0;\r
	-webkit-transition: opacity 0.2s linear;\r
	   -moz-transition: opacity 0.2s linear;\r
	        transition: opacity 0.2s linear;\r
	}\r
.leaflet-fade-anim .leaflet-map-pane .leaflet-popup {\r
	opacity: 1;\r
	}\r
.leaflet-zoom-animated {\r
	-webkit-transform-origin: 0 0;\r
	    -ms-transform-origin: 0 0;\r
	        transform-origin: 0 0;\r
	}\r
svg.leaflet-zoom-animated {\r
	will-change: transform;\r
}\r
\r
.leaflet-zoom-anim .leaflet-zoom-animated {\r
	-webkit-transition: -webkit-transform 0.25s cubic-bezier(0,0,0.25,1);\r
	   -moz-transition:    -moz-transform 0.25s cubic-bezier(0,0,0.25,1);\r
	        transition:         transform 0.25s cubic-bezier(0,0,0.25,1);\r
	}\r
.leaflet-zoom-anim .leaflet-tile,\r
.leaflet-pan-anim .leaflet-tile {\r
	-webkit-transition: none;\r
	   -moz-transition: none;\r
	        transition: none;\r
	}\r
\r
.leaflet-zoom-anim .leaflet-zoom-hide {\r
	visibility: hidden;\r
	}\r
\r
\r
/* cursors */\r
\r
.leaflet-interactive {\r
	cursor: pointer;\r
	}\r
.leaflet-grab {\r
	cursor: -webkit-grab;\r
	cursor:    -moz-grab;\r
	cursor:         grab;\r
	}\r
.leaflet-crosshair,\r
.leaflet-crosshair .leaflet-interactive {\r
	cursor: crosshair;\r
	}\r
.leaflet-popup-pane,\r
.leaflet-control {\r
	cursor: auto;\r
	}\r
.leaflet-dragging .leaflet-grab,\r
.leaflet-dragging .leaflet-grab .leaflet-interactive,\r
.leaflet-dragging .leaflet-marker-draggable {\r
	cursor: move;\r
	cursor: -webkit-grabbing;\r
	cursor:    -moz-grabbing;\r
	cursor:         grabbing;\r
	}\r
\r
/* marker & overlays interactivity */\r
.leaflet-marker-icon,\r
.leaflet-marker-shadow,\r
.leaflet-image-layer,\r
.leaflet-pane > svg path,\r
.leaflet-tile-container {\r
	pointer-events: none;\r
	}\r
\r
.leaflet-marker-icon.leaflet-interactive,\r
.leaflet-image-layer.leaflet-interactive,\r
.leaflet-pane > svg path.leaflet-interactive,\r
svg.leaflet-image-layer.leaflet-interactive path {\r
	pointer-events: visiblePainted; /* IE 9-10 doesn't have auto */\r
	pointer-events: auto;\r
	}\r
\r
/* visual tweaks */\r
\r
.leaflet-container {\r
	background: #ddd;\r
	outline-offset: 1px;\r
	}\r
.leaflet-container a {\r
	color: #0078A8;\r
	}\r
.leaflet-zoom-box {\r
	border: 2px dotted #38f;\r
	background: rgba(255,255,255,0.5);\r
	}\r
\r
\r
/* general typography */\r
.leaflet-container {\r
	font-family: "Helvetica Neue", Arial, Helvetica, sans-serif;\r
	font-size: 12px;\r
	font-size: 0.75rem;\r
	line-height: 1.5;\r
	}\r
\r
\r
/* general toolbar styles */\r
\r
.leaflet-bar {\r
	box-shadow: 0 1px 5px rgba(0,0,0,0.65);\r
	border-radius: 4px;\r
	}\r
.leaflet-bar a {\r
	background-color: #fff;\r
	border-bottom: 1px solid #ccc;\r
	width: 26px;\r
	height: 26px;\r
	line-height: 26px;\r
	display: block;\r
	text-align: center;\r
	text-decoration: none;\r
	color: black;\r
	}\r
.leaflet-bar a,\r
.leaflet-control-layers-toggle {\r
	background-position: 50% 50%;\r
	background-repeat: no-repeat;\r
	display: block;\r
	}\r
.leaflet-bar a:hover,\r
.leaflet-bar a:focus {\r
	background-color: #f4f4f4;\r
	}\r
.leaflet-bar a:first-child {\r
	border-top-left-radius: 4px;\r
	border-top-right-radius: 4px;\r
	}\r
.leaflet-bar a:last-child {\r
	border-bottom-left-radius: 4px;\r
	border-bottom-right-radius: 4px;\r
	border-bottom: none;\r
	}\r
.leaflet-bar a.leaflet-disabled {\r
	cursor: default;\r
	background-color: #f4f4f4;\r
	color: #bbb;\r
	}\r
\r
.leaflet-touch .leaflet-bar a {\r
	width: 30px;\r
	height: 30px;\r
	line-height: 30px;\r
	}\r
.leaflet-touch .leaflet-bar a:first-child {\r
	border-top-left-radius: 2px;\r
	border-top-right-radius: 2px;\r
	}\r
.leaflet-touch .leaflet-bar a:last-child {\r
	border-bottom-left-radius: 2px;\r
	border-bottom-right-radius: 2px;\r
	}\r
\r
/* zoom control */\r
\r
.leaflet-control-zoom-in,\r
.leaflet-control-zoom-out {\r
	font: bold 18px 'Lucida Console', Monaco, monospace;\r
	text-indent: 1px;\r
	}\r
\r
.leaflet-touch .leaflet-control-zoom-in, .leaflet-touch .leaflet-control-zoom-out  {\r
	font-size: 22px;\r
	}\r
\r
\r
/* layers control */\r
\r
.leaflet-control-layers {\r
	box-shadow: 0 1px 5px rgba(0,0,0,0.4);\r
	background: #fff;\r
	border-radius: 5px;\r
	}\r
.leaflet-control-layers-toggle {\r
	background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAaCAQAAAADQ4RFAAACf0lEQVR4AY1UM3gkARTePdvdoTxXKc+qTl3aU5U6b2Kbkz3Gtq3Zw6ziLGNPzrYx7946Tr6/ee/XeCQ4D3ykPtL5tHno4n0d/h3+xfuWHGLX81cn7r0iTNzjr7LrlxCqPtkbTQEHeqOrTy4Yyt3VCi/IOB0v7rVC7q45Q3Gr5K6jt+3Gl5nCoDD4MtO+j96Wu8atmhGqcNGHObuf8OM/x3AMx38+4Z2sPqzCxRFK2aF2e5Jol56XTLyggAMTL56XOMoS1W4pOyjUcGGQdZxU6qRh7B9Zp+PfpOFlqt0zyDZckPi1ttmIp03jX8gyJ8a/PG2yutpS/Vol7peZIbZcKBAEEheEIAgFbDkz5H6Zrkm2hVWGiXKiF4Ycw0RWKdtC16Q7qe3X4iOMxruonzegJzWaXFrU9utOSsLUmrc0YjeWYjCW4PDMADElpJSSQ0vQvA1Tm6/JlKnqFs1EGyZiFCqnRZTEJJJiKRYzVYzJck2Rm6P4iH+cmSY0YzimYa8l0EtTODFWhcMIMVqdsI2uiTvKmTisIDHJ3od5GILVhBCarCfVRmo4uTjkhrhzkiBV7SsaqS+TzrzM1qpGGUFt28pIySQHR6h7F6KSwGWm97ay+Z+ZqMcEjEWebE7wxCSQwpkhJqoZA5ivCdZDjJepuJ9IQjGGUmuXJdBFUygxVqVsxFsLMbDe8ZbDYVCGKxs+W080max1hFCarCfV+C1KATwcnvE9gRRuMP2prdbWGowm1KB1y+zwMMENkM755cJ2yPDtqhTI6ED1M/82yIDtC/4j4BijjeObflpO9I9MwXTCsSX8jWAFeHr05WoLTJ5G8IQVS/7vwR6ohirYM7f6HzYpogfS3R2OAAAAAElFTkSuQmCC);\r
	width: 36px;\r
	height: 36px;\r
	}\r
.leaflet-retina .leaflet-control-layers-toggle {\r
	background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADQAAAA0CAQAAABvcdNgAAAEsklEQVR4AWL4TydIhpZK1kpWOlg0w3ZXP6D2soBtG42jeI6ZmQTHzAxiTbSJsYLjO9HhP+WOmcuhciVnmHVQcJnp7DFvScowZorad/+V/fVzMdMT2g9Cv9guXGv/7pYOrXh2U+RRR3dSd9JRx6bIFc/ekqHI29JC6pJ5ZEh1yWkhkbcFeSjxgx3L2m1cb1C7bceyxA+CNjT/Ifff+/kDk2u/w/33/IeCMOSaWZ4glosqT3DNnNZQ7Cs58/3Ce5HL78iZH/vKVIaYlqzfdLu8Vi7dnvUbEza5Idt36tquZFldl6N5Z/POLof0XLK61mZCmJSWjVF9tEjUluu74IUXvgttuVIHE7YxSkaYhJZam7yiM9Pv82JYfl9nptxZaxMJE4YSPty+vF0+Y2up9d3wwijfjZbabqm/3bZ9ecKHsiGmRflnn1MW4pjHf9oLufyn2z3y1D6n8g8TZhxyzipLNPnAUpsOiuWimg52psrTZYnOWYNDTMuWBWa0tJb4rgq1UvmutpaYEbZlwU3CLJm/ayYjHW5/h7xWLn9Hh1vepDkyf7dE7MtT5LR4e7yYpHrkhOUpEfssBLq2pPhAqoSWKUkk7EDqkmK6RrCEzqDjhNDWNE+XSMvkJRDWlZTmCW0l0PHQGRZY5t1L83kT0Y3l2SItk5JAWHl2dCOBm+fPu3fo5/3v61RMCO9Jx2EEYYhb0rmNQMX/vm7gqOEJLcXTGw3CAuRNeyaPWwjR8PRqKQ1PDA/dpv+on9Shox52WFnx0KY8onHayrJzm87i5h9xGw/tfkev0jGsQizqezUKjk12hBMKJ4kbCqGPVNXudyyrShovGw5CgxsRICxF6aRmSjlBnHRzg7Gx8fKqEubI2rahQYdR1YgDIRQO7JvQyD52hoIQx0mxa0ODtW2Iozn1le2iIRdzwWewedyZzewidueOGqlsn1MvcnQpuVwLGG3/IR1hIKxCjelIDZ8ldqWz25jWAsnldEnK0Zxro19TGVb2ffIZEsIO89EIEDvKMPrzmBOQcKQ+rroye6NgRRxqR4U8EAkz0CL6uSGOm6KQCdWjvjRiSP1BPalCRS5iQYiEIvxuBMJEWgzSoHADcVMuN7IuqqTeyUPq22qFimFtxDyBBJEwNyt6TM88blFHao/6tWWhuuOM4SAK4EI4QmFHA+SEyWlp4EQoJ13cYGzMu7yszEIBOm2rVmHUNqwAIQabISNMRstmdhNWcFLsSm+0tjJH1MdRxO5Nx0WDMhCtgD6OKgZeljJqJKc9po8juskR9XN0Y1lZ3mWjLR9JCO1jRDMd0fpYC2VnvjBSEFg7wBENc0R9HFlb0xvF1+TBEpF68d+DHR6IOWVv2BECtxo46hOFUBd/APU57WIoEwJhIi2CdpyZX0m93BZicktMj1AS9dClteUFAUNUIEygRZCtik5zSxI9MubTBH1GOiHsiLJ3OCoSZkILa9PxiN0EbvhsAo8tdAf9Seepd36lGWHmtNANTv5Jd0z4QYyeo/UEJqxKRpg5LZx6btLPsOaEmdMyxYdlc8LMaJnikDlhclqmPiQnTEpLUIZEwkRagjYkEibQErwhkTAKCLQEbUgkzJQWc/0PstHHcfEdQ+UAAAAASUVORK5CYII=);\r
	background-size: 26px 26px;\r
	}\r
.leaflet-touch .leaflet-control-layers-toggle {\r
	width: 44px;\r
	height: 44px;\r
	}\r
.leaflet-control-layers .leaflet-control-layers-list,\r
.leaflet-control-layers-expanded .leaflet-control-layers-toggle {\r
	display: none;\r
	}\r
.leaflet-control-layers-expanded .leaflet-control-layers-list {\r
	display: block;\r
	position: relative;\r
	}\r
.leaflet-control-layers-expanded {\r
	padding: 6px 10px 6px 6px;\r
	color: #333;\r
	background: #fff;\r
	}\r
.leaflet-control-layers-scrollbar {\r
	overflow-y: scroll;\r
	overflow-x: hidden;\r
	padding-right: 5px;\r
	}\r
.leaflet-control-layers-selector {\r
	margin-top: 2px;\r
	position: relative;\r
	top: 1px;\r
	}\r
.leaflet-control-layers label {\r
	display: block;\r
	font-size: 13px;\r
	font-size: 1.08333em;\r
	}\r
.leaflet-control-layers-separator {\r
	height: 0;\r
	border-top: 1px solid #ddd;\r
	margin: 5px -10px 5px -6px;\r
	}\r
\r
/* Default icon URLs */\r
.leaflet-default-icon-path { /* used only in path-guessing heuristic, see L.Icon.Default */\r
	background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAApCAYAAADAk4LOAAAFgUlEQVR4Aa1XA5BjWRTN2oW17d3YaZtr2962HUzbDNpjszW24mRt28p47v7zq/bXZtrp/lWnXr337j3nPCe85NcypgSFdugCpW5YoDAMRaIMqRi6aKq5E3YqDQO3qAwjVWrD8Ncq/RBpykd8oZUb/kaJutow8r1aP9II0WmLKLIsJyv1w/kqw9Ch2MYdB++12Onxee/QMwvf4/Dk/Lfp/i4nxTXtOoQ4pW5Aj7wpici1A9erdAN2OH64x8OSP9j3Ft3b7aWkTg/Fm91siTra0f9on5sQr9INejH6CUUUpavjFNq1B+Oadhxmnfa8RfEmN8VNAsQhPqF55xHkMzz3jSmChWU6f7/XZKNH+9+hBLOHYozuKQPxyMPUKkrX/K0uWnfFaJGS1QPRtZsOPtr3NsW0uyh6NNCOkU3Yz+bXbT3I8G3xE5EXLXtCXbbqwCO9zPQYPRTZ5vIDXD7U+w7rFDEoUUf7ibHIR4y6bLVPXrz8JVZEql13trxwue/uDivd3fkWRbS6/IA2bID4uk0UpF1N8qLlbBlXs4Ee7HLTfV1j54APvODnSfOWBqtKVvjgLKzF5YdEk5ewRkGlK0i33Eofffc7HT56jD7/6U+qH3Cx7SBLNntH5YIPvODnyfIXZYRVDPqgHtLs5ABHD3YzLuespb7t79FY34DjMwrVrcTuwlT55YMPvOBnRrJ4VXTdNnYug5ucHLBjEpt30701A3Ts+HEa73u6dT3FNWwflY86eMHPk+Yu+i6pzUpRrW7SNDg5JHR4KapmM5Wv2E8Tfcb1HoqqHMHU+uWDD7zg54mz5/2BSnizi9T1Dg4QQXLToGNCkb6tb1NU+QAlGr1++eADrzhn/u8Q2YZhQVlZ5+CAOtqfbhmaUCS1ezNFVm2imDbPmPng5wmz+gwh+oHDce0eUtQ6OGDIyR0uUhUsoO3vfDmmgOezH0mZN59x7MBi++WDL1g/eEiU3avlidO671bkLfwbw5XV2P8Pzo0ydy4t2/0eu33xYSOMOD8hTf4CrBtGMSoXfPLchX+J0ruSePw3LZeK0juPJbYzrhkH0io7B3k164hiGvawhOKMLkrQLyVpZg8rHFW7E2uHOL888IBPlNZ1FPzstSJM694fWr6RwpvcJK60+0HCILTBzZLFNdtAzJaohze60T8qBzyh5ZuOg5e7uwQppofEmf2++DYvmySqGBuKaicF1blQjhuHdvCIMvp8whTTfZzI7RldpwtSzL+F1+wkdZ2TBOW2gIF88PBTzD/gpeREAMEbxnJcaJHNHrpzji0gQCS6hdkEeYt9DF/2qPcEC8RM28Hwmr3sdNyht00byAut2k3gufWNtgtOEOFGUwcXWNDbdNbpgBGxEvKkOQsxivJx33iow0Vw5S6SVTrpVq11ysA2Rp7gTfPfktc6zhtXBBC+adRLshf6sG2RfHPZ5EAc4sVZ83yCN00Fk/4kggu40ZTvIEm5g24qtU4KjBrx/BTTH8ifVASAG7gKrnWxJDcU7x8X6Ecczhm3o6YicvsLXWfh3Ch1W0k8x0nXF+0fFxgt4phz8QvypiwCCFKMqXCnqXExjq10beH+UUA7+nG6mdG/Pu0f3LgFcGrl2s0kNNjpmoJ9o4B29CMO8dMT4Q5ox8uitF6fqsrJOr8qnwNbRzv6hSnG5wP+64C7h9lp30hKNtKdWjtdkbuPA19nJ7Tz3zR/ibgARbhb4AlhavcBebmTHcFl2fvYEnW0ox9xMxKBS8btJ+KiEbq9zA4RthQXDhPa0T9TEe69gWupwc6uBUphquXgf+/FrIjweHQS4/pduMe5ERUMHUd9xv8ZR98CxkS4F2n3EUrUZ10EYNw7BWm9x1GiPssi3GgiGRDKWRYZfXlON+dfNbM+GgIwYdwAAAAASUVORK5CYII=);\r
	}\r
\r
\r
/* attribution and scale controls */\r
\r
.leaflet-container .leaflet-control-attribution {\r
	background: #fff;\r
	background: rgba(255, 255, 255, 0.8);\r
	margin: 0;\r
	}\r
.leaflet-control-attribution,\r
.leaflet-control-scale-line {\r
	padding: 0 5px;\r
	color: #333;\r
	line-height: 1.4;\r
	}\r
.leaflet-control-attribution a {\r
	text-decoration: none;\r
	}\r
.leaflet-control-attribution a:hover,\r
.leaflet-control-attribution a:focus {\r
	text-decoration: underline;\r
	}\r
.leaflet-attribution-flag {\r
	display: inline !important;\r
	vertical-align: baseline !important;\r
	width: 1em;\r
	height: 0.6669em;\r
	}\r
.leaflet-left .leaflet-control-scale {\r
	margin-left: 5px;\r
	}\r
.leaflet-bottom .leaflet-control-scale {\r
	margin-bottom: 5px;\r
	}\r
.leaflet-control-scale-line {\r
	border: 2px solid #777;\r
	border-top: none;\r
	line-height: 1.1;\r
	padding: 2px 5px 1px;\r
	white-space: nowrap;\r
	-moz-box-sizing: border-box;\r
	     box-sizing: border-box;\r
	background: rgba(255, 255, 255, 0.8);\r
	text-shadow: 1px 1px #fff;\r
	}\r
.leaflet-control-scale-line:not(:first-child) {\r
	border-top: 2px solid #777;\r
	border-bottom: none;\r
	margin-top: -2px;\r
	}\r
.leaflet-control-scale-line:not(:first-child):not(:last-child) {\r
	border-bottom: 2px solid #777;\r
	}\r
\r
.leaflet-touch .leaflet-control-attribution,\r
.leaflet-touch .leaflet-control-layers,\r
.leaflet-touch .leaflet-bar {\r
	box-shadow: none;\r
	}\r
.leaflet-touch .leaflet-control-layers,\r
.leaflet-touch .leaflet-bar {\r
	border: 2px solid rgba(0,0,0,0.2);\r
	background-clip: padding-box;\r
	}\r
\r
\r
/* popup */\r
\r
.leaflet-popup {\r
	position: absolute;\r
	text-align: center;\r
	margin-bottom: 20px;\r
	}\r
.leaflet-popup-content-wrapper {\r
	padding: 1px;\r
	text-align: left;\r
	border-radius: 12px;\r
	}\r
.leaflet-popup-content {\r
	margin: 13px 24px 13px 20px;\r
	line-height: 1.3;\r
	font-size: 13px;\r
	font-size: 1.08333em;\r
	min-height: 1px;\r
	}\r
.leaflet-popup-content p {\r
	margin: 17px 0;\r
	margin: 1.3em 0;\r
	}\r
.leaflet-popup-tip-container {\r
	width: 40px;\r
	height: 20px;\r
	position: absolute;\r
	left: 50%;\r
	margin-top: -1px;\r
	margin-left: -20px;\r
	overflow: hidden;\r
	pointer-events: none;\r
	}\r
.leaflet-popup-tip {\r
	width: 17px;\r
	height: 17px;\r
	padding: 1px;\r
\r
	margin: -10px auto 0;\r
	pointer-events: auto;\r
\r
	-webkit-transform: rotate(45deg);\r
	   -moz-transform: rotate(45deg);\r
	    -ms-transform: rotate(45deg);\r
	        transform: rotate(45deg);\r
	}\r
.leaflet-popup-content-wrapper,\r
.leaflet-popup-tip {\r
	background: white;\r
	color: #333;\r
	box-shadow: 0 3px 14px rgba(0,0,0,0.4);\r
	}\r
.leaflet-container a.leaflet-popup-close-button {\r
	position: absolute;\r
	top: 0;\r
	right: 0;\r
	border: none;\r
	text-align: center;\r
	width: 24px;\r
	height: 24px;\r
	font: 16px/24px Tahoma, Verdana, sans-serif;\r
	color: #757575;\r
	text-decoration: none;\r
	background: transparent;\r
	}\r
.leaflet-container a.leaflet-popup-close-button:hover,\r
.leaflet-container a.leaflet-popup-close-button:focus {\r
	color: #585858;\r
	}\r
.leaflet-popup-scrolled {\r
	overflow: auto;\r
	}\r
\r
.leaflet-oldie .leaflet-popup-content-wrapper {\r
	-ms-zoom: 1;\r
	}\r
.leaflet-oldie .leaflet-popup-tip {\r
	width: 24px;\r
	margin: 0 auto;\r
\r
	-ms-filter: "progid:DXImageTransform.Microsoft.Matrix(M11=0.70710678, M12=0.70710678, M21=-0.70710678, M22=0.70710678)";\r
	filter: progid:DXImageTransform.Microsoft.Matrix(M11=0.70710678, M12=0.70710678, M21=-0.70710678, M22=0.70710678);\r
	}\r
\r
.leaflet-oldie .leaflet-control-zoom,\r
.leaflet-oldie .leaflet-control-layers,\r
.leaflet-oldie .leaflet-popup-content-wrapper,\r
.leaflet-oldie .leaflet-popup-tip {\r
	border: 1px solid #999;\r
	}\r
\r
\r
/* div icon */\r
\r
.leaflet-div-icon {\r
	background: #fff;\r
	border: 1px solid #666;\r
	}\r
\r
\r
/* Tooltip */\r
/* Base styles for the element that has a tooltip */\r
.leaflet-tooltip {\r
	position: absolute;\r
	padding: 6px;\r
	background-color: #fff;\r
	border: 1px solid #fff;\r
	border-radius: 3px;\r
	color: #222;\r
	white-space: nowrap;\r
	-webkit-user-select: none;\r
	-moz-user-select: none;\r
	-ms-user-select: none;\r
	user-select: none;\r
	pointer-events: none;\r
	box-shadow: 0 1px 3px rgba(0,0,0,0.4);\r
	}\r
.leaflet-tooltip.leaflet-interactive {\r
	cursor: pointer;\r
	pointer-events: auto;\r
	}\r
.leaflet-tooltip-top:before,\r
.leaflet-tooltip-bottom:before,\r
.leaflet-tooltip-left:before,\r
.leaflet-tooltip-right:before {\r
	position: absolute;\r
	pointer-events: none;\r
	border: 6px solid transparent;\r
	background: transparent;\r
	content: "";\r
	}\r
\r
/* Directions */\r
\r
.leaflet-tooltip-bottom {\r
	margin-top: 6px;\r
}\r
.leaflet-tooltip-top {\r
	margin-top: -6px;\r
}\r
.leaflet-tooltip-bottom:before,\r
.leaflet-tooltip-top:before {\r
	left: 50%;\r
	margin-left: -6px;\r
	}\r
.leaflet-tooltip-top:before {\r
	bottom: 0;\r
	margin-bottom: -12px;\r
	border-top-color: #fff;\r
	}\r
.leaflet-tooltip-bottom:before {\r
	top: 0;\r
	margin-top: -12px;\r
	margin-left: -6px;\r
	border-bottom-color: #fff;\r
	}\r
.leaflet-tooltip-left {\r
	margin-left: -6px;\r
}\r
.leaflet-tooltip-right {\r
	margin-left: 6px;\r
}\r
.leaflet-tooltip-left:before,\r
.leaflet-tooltip-right:before {\r
	top: 50%;\r
	margin-top: -6px;\r
	}\r
.leaflet-tooltip-left:before {\r
	right: 0;\r
	margin-right: -12px;\r
	border-left-color: #fff;\r
	}\r
.leaflet-tooltip-right:before {\r
	left: 0;\r
	margin-left: -12px;\r
	border-right-color: #fff;\r
	}\r
\r
/* Printing */\r
\r
@media print {\r
	/* Prevent printers from removing background-images of controls. */\r
	.leaflet-control {\r
		-webkit-print-color-adjust: exact;\r
		print-color-adjust: exact;\r
		}\r
	}\r
/**
 * MapView Component Styles
 */

.debrief-mapview {
  position: relative;
  width: 100%;
  border-radius: var(--debrief-radius-md);
  overflow: hidden;
  background-color: var(--debrief-bg-secondary);
}

.debrief-mapview__container {
  height: 100%;
  width: 100%;
}

/* Leaflet overrides for theming */
.debrief-mapview .leaflet-container {
  font-family: var(--debrief-font-family);
  background-color: var(--debrief-bg-secondary);
}

/* Control styling */
.debrief-mapview .leaflet-control-zoom {
  border: 1px solid var(--debrief-border-color);
  border-radius: var(--debrief-radius-md);
  overflow: hidden;
}

.debrief-mapview .leaflet-control-zoom a {
  background-color: var(--debrief-map-controls-bg);
  color: var(--debrief-text-primary);
  border-bottom: 1px solid var(--debrief-border-color);
  width: 30px;
  height: 30px;
  line-height: 30px;
}

.debrief-mapview .leaflet-control-zoom a:hover {
  background-color: var(--debrief-bg-tertiary);
}

.debrief-mapview .leaflet-control-zoom a:last-child {
  border-bottom: none;
}

/* Attribution styling */
.debrief-mapview .leaflet-control-attribution {
  background-color: var(--debrief-map-controls-bg);
  font-size: var(--debrief-font-size-xs);
  color: var(--debrief-text-muted);
  padding: 2px 6px;
  border-radius: var(--debrief-radius-sm);
}

.debrief-mapview .leaflet-control-attribution a {
  color: var(--debrief-color-primary);
}

/* Tooltip styling */
.debrief-mapview .leaflet-tooltip {
  background-color: var(--debrief-bg-primary);
  border: 1px solid var(--debrief-border-color);
  border-radius: var(--debrief-radius-sm);
  box-shadow: var(--debrief-shadow-md);
  color: var(--debrief-text-primary);
  font-family: var(--debrief-font-family);
  font-size: var(--debrief-font-size-sm);
  padding: var(--debrief-space-xs) var(--debrief-space-sm);
}

.debrief-mapview .leaflet-tooltip-top::before {
  border-top-color: var(--debrief-border-color);
}

/* Popup styling */
.debrief-mapview .leaflet-popup-content-wrapper {
  background-color: var(--debrief-bg-primary);
  border-radius: var(--debrief-radius-md);
  box-shadow: var(--debrief-shadow-lg);
}

.debrief-mapview .leaflet-popup-content {
  color: var(--debrief-text-primary);
  font-family: var(--debrief-font-family);
  font-size: var(--debrief-font-size-md);
}

.debrief-mapview .leaflet-popup-tip {
  background-color: var(--debrief-bg-primary);
}

/* Feature highlight on hover */
.debrief-mapview .leaflet-interactive:hover {
  cursor: pointer;
}

/* Selected feature styling - handled via style prop */

/* Loading state */
.debrief-mapview--loading {
  opacity: 0.7;
  pointer-events: none;
}

/* Empty state */
.debrief-mapview--empty .leaflet-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

.debrief-mapview__empty-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: var(--debrief-bg-primary);
  padding: var(--debrief-space-md);
  border-radius: var(--debrief-radius-md);
  color: var(--debrief-text-secondary);
  font-size: var(--debrief-font-size-md);
  z-index: var(--debrief-z-overlay);
}

/* Dark mode adjustments */
[data-theme='dark'] .debrief-mapview .leaflet-container {
  /* Use a dark tile layer or add overlay */
}

[data-theme='dark'] .debrief-mapview .leaflet-tile {
  filter: brightness(0.8) saturate(0.8);
}
/**
 * LeafletToolbar Component Styles
 */

.debrief-leaflet-toolbar {
  border: 1px solid var(--debrief-border-color);
  border-radius: var(--debrief-radius-md);
  overflow: hidden;
  box-shadow: var(--debrief-shadow-md);
}

.debrief-leaflet-toolbar__button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  background-color: var(--debrief-map-controls-bg);
  color: var(--debrief-text-primary);
  border-bottom: 1px solid var(--debrief-border-color);
  font-size: 18px;
  font-weight: 700;
  line-height: 30px;
  text-decoration: none;
  text-align: center;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.debrief-leaflet-toolbar__button:hover {
  background-color: var(--debrief-bg-tertiary);
}

.debrief-leaflet-toolbar__button:active {
  background-color: var(--debrief-bg-secondary);
}

.debrief-leaflet-toolbar__button:last-child {
  border-bottom: none;
}

/* Focus state for accessibility */
.debrief-leaflet-toolbar__button:focus {
  outline: 2px solid var(--debrief-color-primary);
  outline-offset: -2px;
}

/* Zoom buttons specific styling */
.debrief-leaflet-toolbar__zoom-in,
.debrief-leaflet-toolbar__zoom-out {
  font-family: 'Lucida Console', Monaco, monospace;
}

/* Fit button with SVG icon */
.debrief-leaflet-toolbar__fit {
  padding: 0;
}

.debrief-leaflet-toolbar__fit svg {
  width: 16px;
  height: 16px;
  stroke: currentColor;
}

/* Disabled state (when no features to fit) */
.debrief-leaflet-toolbar__button--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.debrief-leaflet-toolbar__button--disabled:hover {
  background-color: var(--debrief-map-controls-bg);
}
/**
 * Timeline Component Styles
 */

.debrief-timeline {
  position: relative;
  width: 100%;
  min-height: var(--debrief-timeline-height);
  border: 1px solid var(--debrief-border-color);
  border-radius: var(--debrief-radius-md);
  overflow: hidden;
  background-color: var(--debrief-bg-primary);
}

.debrief-timeline__axis {
  display: block;
  width: 100%;
  background-color: var(--debrief-bg-secondary);
  border-bottom: 1px solid var(--debrief-border-color);
}

.debrief-timeline__bars-container {
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
}

.debrief-timeline__bars {
  display: block;
  width: 100%;
}

/* Empty state */
.debrief-timeline--empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.debrief-timeline__empty-message {
  color: var(--debrief-text-muted);
  font-size: var(--debrief-font-size-md);
  font-family: var(--debrief-font-family);
}

/* Tooltip */
.debrief-timeline__tooltip {
  position: fixed;
  padding: var(--debrief-space-xs) var(--debrief-space-sm);
  background-color: var(--debrief-bg-primary);
  border: 1px solid var(--debrief-border-color);
  border-radius: var(--debrief-radius-sm);
  box-shadow: var(--debrief-shadow-md);
  color: var(--debrief-text-primary);
  font-size: var(--debrief-font-size-sm);
  font-family: var(--debrief-font-family);
  pointer-events: none;
  z-index: var(--debrief-z-tooltip);
  white-space: nowrap;
}

/* Scrollbar styling */
.debrief-timeline__bars-container::-webkit-scrollbar {
  width: 8px;
}

.debrief-timeline__bars-container::-webkit-scrollbar-track {
  background: var(--debrief-bg-secondary);
}

.debrief-timeline__bars-container::-webkit-scrollbar-thumb {
  background: var(--debrief-border-color);
  border-radius: 4px;
}

.debrief-timeline__bars-container::-webkit-scrollbar-thumb:hover {
  background: var(--debrief-text-muted);
}

/* Selection range indicator (future feature) */
.debrief-timeline__range-indicator {
  position: absolute;
  top: 0;
  height: 100%;
  background-color: var(--debrief-selection-bg);
  border-left: 2px solid var(--debrief-selection-border);
  border-right: 2px solid var(--debrief-selection-border);
  pointer-events: none;
}

/* Loading state */
.debrief-timeline--loading {
  opacity: 0.7;
  pointer-events: none;
}

.debrief-timeline--loading::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 24px;
  height: 24px;
  margin: -12px 0 0 -12px;
  border: 2px solid var(--debrief-color-primary);
  border-top-color: transparent;
  border-radius: 50%;
  animation: debrief-timeline-spin 0.8s linear infinite;
}

@keyframes debrief-timeline-spin {
  to {
    transform: rotate(360deg);
  }
}
/**
 * FeatureList component styles
 * Uses CSS custom properties for theming
 */

/* Container */
.debrief-feature-list {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--debrief-border-color, #e0e0e0);
  border-radius: var(--debrief-border-radius, 4px);
  background-color: var(--debrief-bg-primary, #ffffff);
  font-family: var(--debrief-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
  font-size: var(--debrief-font-size-sm, 13px);
}

/* Scroll container — always visible to show viewport proportion */
.debrief-feature-list__scroll {
  scrollbar-width: thin;
  scrollbar-color: var(--debrief-scrollbar-thumb, #c1c1c1) var(--debrief-scrollbar-track, #f1f1f1);
  overflow-y: scroll !important;
}

.debrief-feature-list__scroll::-webkit-scrollbar {
  width: 8px;
}

.debrief-feature-list__scroll::-webkit-scrollbar-track {
  background: var(--debrief-scrollbar-track, #f1f1f1);
}

.debrief-feature-list__scroll::-webkit-scrollbar-thumb {
  background: var(--debrief-scrollbar-thumb, #c1c1c1);
  border-radius: 4px;
}

.debrief-feature-list__scroll::-webkit-scrollbar-thumb:hover {
  background: var(--debrief-scrollbar-thumb-hover, #a8a8a8);
}

/* Content container for virtualization */
.debrief-feature-list__content {
  will-change: transform;
}

/* Empty state */
.debrief-feature-list--empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.debrief-feature-list__empty {
  color: var(--debrief-text-secondary, #666666);
  text-align: center;
  padding: 24px;
  font-style: italic;
}

/* Feature row */
.debrief-feature-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  border-bottom: 1px solid var(--debrief-border-color-light, #f0f0f0);
  box-sizing: border-box;
}

.debrief-feature-row:hover {
  background-color: var(--debrief-hover-bg, rgba(0, 0, 0, 0.04));
}

.debrief-feature-row:focus {
  outline: none;
  box-shadow: inset 0 0 0 2px var(--debrief-focus-ring, rgba(0, 102, 204, 0.4));
}

.debrief-feature-row:focus-visible {
  box-shadow: inset 0 0 0 2px var(--debrief-focus-ring, rgba(0, 102, 204, 0.4));
}

/* Selected state */
.debrief-feature-row--selected {
  background-color: var(--debrief-selection-bg, rgba(0, 102, 204, 0.1));
}

.debrief-feature-row--selected:hover {
  background-color: var(--debrief-selection-bg-hover, rgba(0, 102, 204, 0.15));
}

/* Color indicator */
.debrief-feature-row__indicator {
  flex-shrink: 0;
  width: 4px;
  height: 20px;
  border-radius: 2px;
}

/* Content area */
.debrief-feature-row__content {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Feature name */
.debrief-feature-row__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--debrief-text-primary, #1a1a1a);
  font-weight: 500;
}

/* Feature type badge */
.debrief-feature-row__type {
  flex-shrink: 0;
  padding: 2px 6px;
  border-radius: 3px;
  background-color: var(--debrief-badge-bg, #e8e8e8);
  color: var(--debrief-badge-text, #555555);
  font-size: var(--debrief-font-size-xs, 11px);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

/* Additional info (time range, etc.) */
.debrief-feature-row__info {
  flex-shrink: 0;
  color: var(--debrief-text-secondary, #666666);
  font-size: var(--debrief-font-size-xs, 11px);
}

/* Track type badges with specific colors */
.debrief-feature-row[data-track-type="OWNSHIP"] .debrief-feature-row__type {
  background-color: var(--debrief-ownship-badge-bg, #e3f2fd);
  color: var(--debrief-ownship-badge-text, #1565c0);
}

.debrief-feature-row[data-track-type="CONTACT"] .debrief-feature-row__type {
  background-color: var(--debrief-contact-badge-bg, #fce4ec);
  color: var(--debrief-contact-badge-text, #c62828);
}

.debrief-feature-row[data-track-type="REFERENCE"] .debrief-feature-row__type {
  background-color: var(--debrief-reference-badge-bg, #f3e5f5);
  color: var(--debrief-reference-badge-text, #7b1fa2);
}

.debrief-feature-row[data-track-type="SOLUTION"] .debrief-feature-row__type {
  background-color: var(--debrief-solution-badge-bg, #e8f5e9);
  color: var(--debrief-solution-badge-text, #2e7d32);
}

/* Location type badges */
.debrief-feature-row[data-location-type="WAYPOINT"] .debrief-feature-row__type {
  background-color: var(--debrief-waypoint-badge-bg, #fff3e0);
  color: var(--debrief-waypoint-badge-text, #e65100);
}

.debrief-feature-row[data-location-type="REFERENCE"] .debrief-feature-row__type {
  background-color: var(--debrief-location-reference-badge-bg, #f3e5f5);
  color: var(--debrief-location-reference-badge-text, #7b1fa2);
}

/* Hidden state */
.debrief-feature-row--hidden {
  opacity: 0.55;
}

.debrief-feature-row__hidden-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  color: var(--debrief-text-secondary, #666666);
}

/* Dark theme support */
[data-theme='dark'] .debrief-feature-list {
  border-color: var(--debrief-border-color, #3a3a3a);
  background-color: var(--debrief-bg-primary, #1e1e1e);
}

[data-theme='dark'] .debrief-feature-list__scroll {
  scrollbar-color: var(--debrief-scrollbar-thumb, #555555) var(--debrief-scrollbar-track, #2d2d2d);
}

[data-theme='dark'] .debrief-feature-row {
  border-bottom-color: var(--debrief-border-color-light, #2d2d2d);
}

[data-theme='dark'] .debrief-feature-row:hover {
  background-color: var(--debrief-hover-bg, rgba(255, 255, 255, 0.06));
}

[data-theme='dark'] .debrief-feature-row__name {
  color: var(--debrief-text-primary, #e0e0e0);
}

[data-theme='dark'] .debrief-feature-row__type {
  background-color: var(--debrief-badge-bg, #3a3a3a);
  color: var(--debrief-badge-text, #b0b0b0);
}

[data-theme='dark'] .debrief-feature-row__info {
  color: var(--debrief-text-secondary, #888888);
}

[data-theme='dark'] .debrief-feature-list__empty {
  color: var(--debrief-text-secondary, #888888);
}
/**
 * Debrief Design System Tokens
 * CSS Custom Properties for consistent styling across components.
 */

:root {
  /* Colors - Primary */
  --debrief-color-primary: #0066cc;
  --debrief-color-primary-hover: #0052a3;
  --debrief-color-primary-active: #003d7a;

  /* Colors - Secondary */
  --debrief-color-secondary: #6c757d;
  --debrief-color-secondary-hover: #5a6268;
  --debrief-color-secondary-active: #494e52;

  /* Colors - Status */
  --debrief-color-success: #28a745;
  --debrief-color-warning: #ffc107;
  --debrief-color-danger: #dc3545;
  --debrief-color-info: #17a2b8;
  --debrief-color-attention: rgba(255, 193, 7, 0.6);

  /* Colors - Track Types */
  --debrief-color-ownship: #0066cc;
  --debrief-color-contact: #cc0000;
  --debrief-color-reference: #666666;
  --debrief-color-solution: #00cc66;

  /* Colors - Background */
  --debrief-bg-primary: #ffffff;
  --debrief-bg-secondary: #f8f9fa;
  --debrief-bg-tertiary: #e9ecef;
  --debrief-bg-overlay: rgba(0, 0, 0, 0.5);

  /* Colors - Text */
  --debrief-text-primary: #212529;
  --debrief-text-secondary: #6c757d;
  --debrief-text-muted: #adb5bd;
  --debrief-text-inverse: #ffffff;

  /* Colors - Border */
  --debrief-border-color: #dee2e6;
  --debrief-border-color-focus: #0066cc;
  --debrief-border-color-error: #dc3545;

  /* Colors - Selection */
  --debrief-selection-bg: rgba(0, 102, 204, 0.1);
  --debrief-selection-border: #0066cc;

  /* Spacing */
  --debrief-space-xs: 4px;
  --debrief-space-sm: 8px;
  --debrief-space-md: 16px;
  --debrief-space-lg: 24px;
  --debrief-space-xl: 32px;
  --debrief-space-2xl: 48px;

  /* Typography */
  --debrief-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  --debrief-font-family-mono: 'SF Mono', Monaco, 'Cascadia Code', Consolas, monospace;

  --debrief-font-size-xs: 10px;
  --debrief-font-size-sm: 12px;
  --debrief-font-size-md: 14px;
  --debrief-font-size-lg: 16px;
  --debrief-font-size-xl: 20px;
  --debrief-font-size-2xl: 24px;

  --debrief-font-weight-normal: 400;
  --debrief-font-weight-medium: 500;
  --debrief-font-weight-bold: 600;

  --debrief-line-height-tight: 1.25;
  --debrief-line-height-normal: 1.5;
  --debrief-line-height-relaxed: 1.75;

  /* Border Radius */
  --debrief-radius-sm: 2px;
  --debrief-radius-md: 4px;
  --debrief-radius-lg: 8px;
  --debrief-radius-full: 9999px;

  /* Shadows */
  --debrief-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --debrief-shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --debrief-shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);

  /* Transitions */
  --debrief-transition-fast: 150ms ease-in-out;
  --debrief-transition-normal: 250ms ease-in-out;
  --debrief-transition-slow: 350ms ease-in-out;

  /* Z-Index */
  --debrief-z-dropdown: 1000;
  --debrief-z-sticky: 1020;
  --debrief-z-fixed: 1030;
  --debrief-z-overlay: 1040;
  --debrief-z-modal: 1050;
  --debrief-z-popover: 1060;
  --debrief-z-tooltip: 1070;

  /* Component-specific tokens */

  /* Map */
  --debrief-map-min-height: 300px;
  --debrief-map-controls-bg: rgba(255, 255, 255, 0.9);
  --debrief-map-controls-radius: var(--debrief-radius-md);

  /* Timeline */
  --debrief-timeline-height: 150px;
  --debrief-timeline-bar-height: 24px;
  --debrief-timeline-axis-height: 32px;
  --debrief-timeline-grid-color: rgba(0, 0, 0, 0.1);

  /* Feature List */
  --debrief-list-row-height: 40px;
  --debrief-list-hover-bg: var(--debrief-bg-secondary);
  --debrief-list-selected-bg: var(--debrief-selection-bg);
}

/* Dark theme overrides */
[data-theme='dark'],
.debrief-dark {
  --debrief-bg-primary: #1e1e1e;
  --debrief-bg-secondary: #252526;
  --debrief-bg-tertiary: #2d2d30;
  --debrief-bg-overlay: rgba(0, 0, 0, 0.7);

  --debrief-text-primary: #cccccc;
  --debrief-text-secondary: #9d9d9d;
  --debrief-text-muted: #6d6d6d;
  --debrief-text-inverse: #1e1e1e;

  --debrief-border-color: #3c3c3c;

  --debrief-map-controls-bg: rgba(30, 30, 30, 0.9);

  --debrief-timeline-grid-color: rgba(255, 255, 255, 0.1);
}

/* VS Code theme integration */
[data-theme='vscode'] {
  --debrief-bg-primary: var(--vscode-editor-background, #1e1e1e);
  --debrief-bg-secondary: var(--vscode-sideBar-background, #252526);
  --debrief-text-primary: var(--vscode-editor-foreground, #cccccc);
  --debrief-text-secondary: var(--vscode-descriptionForeground, #9d9d9d);
  --debrief-border-color: var(--vscode-panel-border, #3c3c3c);
  --debrief-color-primary: var(--vscode-focusBorder, #0066cc);
}
.catalog-overview {
  --co-bg: var(--vscode-editor-background, #1e1e1e);
  --co-fg: var(--vscode-editor-foreground, #cccccc);
  --co-accent: var(--vscode-focusBorder, #007fd4);
  --co-bar-fill: var(--vscode-charts-blue, #3794ff);
  --co-bar-hover: var(--vscode-charts-yellow, #cca700);
  --co-border: var(--vscode-panel-border, #444444);
  --co-tooltip-bg: var(--vscode-editorHoverWidget-background, #252526);
  --co-tooltip-fg: var(--vscode-editorHoverWidget-foreground, #cccccc);
  --co-dragbar: var(--vscode-sash-hoverBorder, #007fd4);

  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: var(--co-bg);
  color: var(--co-fg);
  overflow: hidden;
  font-family: var(--vscode-font-family, system-ui, sans-serif);
  font-size: var(--vscode-font-size, 13px);
}

/* Map region */
.catalog-overview__map {
  flex: var(--co-map-flex, 6);
  min-height: 80px;
  position: relative;
}

.catalog-overview__map .leaflet-container {
  width: 100%;
  height: 100%;
  background: var(--co-bg);
}

/* Drag bar */
.catalog-overview__dragbar {
  height: 6px;
  background: var(--co-border);
  cursor: row-resize;
  flex-shrink: 0;
  transition: background 0.15s;
}

.catalog-overview__dragbar:hover,
.catalog-overview__dragbar--active {
  background: var(--co-dragbar);
}

/* Timeline region */
.catalog-overview__timeline {
  flex: var(--co-timeline-flex, 4);
  min-height: 60px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px;
}

.catalog-overview__timeline svg {
  display: block;
  width: 100%;
}

/* Timeline elements */
.catalog-overview__timeline-bar {
  fill: var(--co-bar-fill);
  cursor: pointer;
  transition: fill 0.15s;
}

.catalog-overview__timeline-bar:hover {
  fill: var(--co-bar-hover);
}

.catalog-overview__timeline-point {
  fill: var(--co-bar-fill);
  cursor: pointer;
}

.catalog-overview__timeline-point:hover {
  fill: var(--co-bar-hover);
}

.catalog-overview__timeline-label {
  fill: var(--co-fg);
  font-size: 11px;
  dominant-baseline: middle;
}

.catalog-overview__timeline-axis-label {
  fill: var(--co-fg);
  font-size: 10px;
  opacity: 0.7;
}

.catalog-overview__timeline-no-data {
  fill: var(--co-fg);
  opacity: 0.5;
  font-size: 10px;
  font-style: italic;
  dominant-baseline: middle;
}

/* Tooltip */
.catalog-overview__tooltip {
  position: fixed;
  background: var(--co-tooltip-bg);
  color: var(--co-tooltip-fg);
  border: 1px solid var(--co-border);
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 12px;
  pointer-events: none;
  z-index: 10000;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* Empty state */
.catalog-overview__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  opacity: 0.6;
  font-style: italic;
}
/**
 * TimeController component styles.
 * Uses CSS custom properties for theming (from ThemeProvider).
 */

/* Main container */
.debrief-time-controller {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: var(--debrief-bg-secondary, #1e1e1e);
  border-radius: 4px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: var(--debrief-text-primary, #cccccc);
}

.debrief-time-controller:focus {
  outline: 2px solid var(--debrief-border-color-focus, #007acc);
  outline-offset: 2px;
}

/* Empty and loading states */
.debrief-time-controller--empty,
.debrief-time-controller--loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100px;
  opacity: 0.7;
}

.debrief-time-controller__empty-message,
.debrief-time-controller__loading-message {
  color: var(--debrief-text-muted, #808080);
  font-size: 13px;
}

/* Rows */
.debrief-time-controller__row {
  display: flex;
  align-items: center;
}

.debrief-time-controller__row--display {
  justify-content: center;
}

.debrief-time-controller__row--scrubber {
  width: 100%;
}

.debrief-time-controller__row--controls {
  justify-content: space-between;
  gap: 8px;
}

/* Time Display */
.debrief-time-display {
  font-size: 24px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.5px;
  color: var(--debrief-text-primary, #cccccc);
}

.debrief-time-display__value {
  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
}

/* Time Scrubber */
.debrief-time-scrubber {
  width: 100%;
  user-select: none;
}

.debrief-time-scrubber--disabled {
  opacity: 0.5;
  pointer-events: none;
}

.debrief-time-scrubber__labels {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.debrief-time-scrubber__label {
  font-size: 10px;
  color: var(--debrief-text-muted, #808080);
  font-variant-numeric: tabular-nums;
}

.debrief-time-scrubber__track {
  position: relative;
  height: 8px;
  background: var(--debrief-bg-tertiary, #333333);
  border-radius: 4px;
  cursor: pointer;
}

.debrief-time-scrubber--dragging .debrief-time-scrubber__track {
  cursor: grabbing;
}

.debrief-time-scrubber__fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: var(--debrief-color-primary, #007acc);
  border-radius: 4px 0 0 4px;
  pointer-events: none;
}

.debrief-time-scrubber__thumb {
  position: absolute;
  top: 50%;
  width: 16px;
  height: 16px;
  background: var(--debrief-color-primary, #007acc);
  border: 2px solid var(--debrief-bg-secondary, #1e1e1e);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  pointer-events: none;
  transition: transform 0.1s ease;
}

.debrief-time-scrubber--dragging .debrief-time-scrubber__thumb {
  transform: translate(-50%, -50%) scale(1.2);
}

.debrief-time-scrubber:focus {
  outline: none;
}

.debrief-time-scrubber:focus .debrief-time-scrubber__track {
  box-shadow: 0 0 0 2px var(--debrief-border-color-focus, #007acc);
}

/* Display Mode Toggle (button group layout) */
.debrief-display-mode-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Light theme overrides */
[data-theme='light'] .debrief-time-controller {
  background: var(--debrief-bg-secondary, #f3f3f3);
}

[data-theme='light'] .debrief-time-scrubber__track {
  background: var(--debrief-bg-tertiary, #e0e0e0);
}
/**
 * FilterDropdown component styles.
 * Uses CSS custom properties for theming.
 */

.debrief-filter-dropdown {
  width: 280px;
  background-color: var(--debrief-bg-primary, #ffffff);
  border: 1px solid var(--debrief-border-color, #e0e0e0);
  border-radius: var(--debrief-border-radius, 4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  font-family: var(--debrief-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
  font-size: var(--debrief-font-size-sm, 13px);
  max-height: 420px;
  overflow-y: auto;
}

.debrief-filter-dropdown__section {
  padding: 8px 12px;
}

.debrief-filter-dropdown__section-title {
  font-weight: 600;
  color: var(--debrief-text-secondary, #666666);
  font-size: var(--debrief-font-size-xs, 11px);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 6px;
}

.debrief-filter-dropdown__divider {
  height: 1px;
  background-color: var(--debrief-border-color-light, #f0f0f0);
  margin: 0;
}

/* Action icon row */
.debrief-filter-dropdown__action-row {
  display: flex;
  gap: 4px;
  padding: 6px 12px;
}

.debrief-filter-dropdown__action-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--debrief-border-color, #e0e0e0);
  border-radius: var(--debrief-border-radius, 4px);
  background: none;
  color: var(--debrief-text-primary, #1a1a1a);
  cursor: pointer;
}

.debrief-filter-dropdown__action-icon-btn:hover:not(:disabled) {
  background-color: var(--debrief-hover-bg, rgba(0, 0, 0, 0.04));
}

.debrief-filter-dropdown__action-icon-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.debrief-filter-dropdown__action-spacer {
  flex: 1;
}

/* Search input */
.debrief-filter-dropdown__search-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--debrief-border-color, #e0e0e0);
  border-radius: var(--debrief-border-radius, 4px);
  background-color: var(--debrief-bg-primary, #ffffff);
  color: var(--debrief-text-primary, #1a1a1a);
  font-size: var(--debrief-font-size-sm, 13px);
  font-family: inherit;
  box-sizing: border-box;
  outline: none;
}

.debrief-filter-dropdown__search-input:focus {
  border-color: var(--debrief-focus-ring, rgba(0, 102, 204, 0.4));
  box-shadow: 0 0 0 2px var(--debrief-focus-ring, rgba(0, 102, 204, 0.2));
}

.debrief-filter-dropdown__search-input::placeholder {
  color: var(--debrief-text-secondary, #666666);
}

/* Scope and checkbox rows */
.debrief-filter-dropdown__scope-row,
.debrief-filter-dropdown__checkbox-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-top: 6px;
}

.debrief-filter-dropdown__checkbox-label,
.debrief-filter-dropdown__radio-label {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  color: var(--debrief-text-primary, #1a1a1a);
  font-size: var(--debrief-font-size-sm, 13px);
  padding: 2px 0;
}

.debrief-filter-dropdown__checkbox-label input,
.debrief-filter-dropdown__radio-label input {
  margin: 0;
  cursor: pointer;
}

/* Temporal inputs */
.debrief-filter-dropdown__temporal-label {
  display: block;
  color: var(--debrief-text-secondary, #666666);
  font-size: var(--debrief-font-size-xs, 11px);
  margin-bottom: 6px;
}

.debrief-filter-dropdown__temporal-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 3px;
}

.debrief-filter-dropdown__temporal-input {
  flex: 1;
  padding: 4px 6px;
  border: 1px solid var(--debrief-border-color, #e0e0e0);
  border-radius: var(--debrief-border-radius, 4px);
  background-color: var(--debrief-bg-primary, #ffffff);
  color: var(--debrief-text-primary, #1a1a1a);
  font-size: var(--debrief-font-size-xs, 11px);
  font-family: inherit;
  box-sizing: border-box;
}

.debrief-filter-dropdown__temporal-clear {
  background: none;
  border: none;
  color: var(--debrief-text-secondary, #666666);
  cursor: pointer;
  font-size: 16px;
  padding: 2px 4px;
  line-height: 1;
}

.debrief-filter-dropdown__temporal-clear:hover {
  color: var(--debrief-text-primary, #1a1a1a);
}

/* Action buttons */
.debrief-filter-dropdown__action-btn {
  display: block;
  width: 100%;
  padding: 5px 8px;
  border: none;
  border-radius: var(--debrief-border-radius, 4px);
  background: none;
  color: var(--debrief-text-primary, #1a1a1a);
  font-size: var(--debrief-font-size-sm, 13px);
  font-family: inherit;
  cursor: pointer;
  text-align: left;
}

.debrief-filter-dropdown__action-btn:hover {
  background-color: var(--debrief-hover-bg, rgba(0, 0, 0, 0.04));
}

/* Clear all button */
.debrief-filter-dropdown__clear-btn {
  display: block;
  width: 100%;
  padding: 5px 8px;
  border: none;
  border-radius: var(--debrief-border-radius, 4px);
  background: none;
  color: var(--debrief-text-secondary, #666666);
  font-size: var(--debrief-font-size-sm, 13px);
  font-family: inherit;
  cursor: pointer;
  text-align: center;
}

.debrief-filter-dropdown__clear-btn:hover {
  background-color: var(--debrief-hover-bg, rgba(0, 0, 0, 0.04));
  color: var(--debrief-text-primary, #1a1a1a);
}

/* Dark theme */
[data-theme='dark'] .debrief-filter-dropdown {
  background-color: var(--debrief-bg-primary, #1e1e1e);
  border-color: var(--debrief-border-color, #3a3a3a);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

[data-theme='dark'] .debrief-filter-dropdown__divider {
  background-color: var(--debrief-border-color-light, #2d2d2d);
}

[data-theme='dark'] .debrief-filter-dropdown__search-input {
  background-color: var(--debrief-bg-primary, #1e1e1e);
  border-color: var(--debrief-border-color, #3a3a3a);
  color: var(--debrief-text-primary, #e0e0e0);
}

[data-theme='dark'] .debrief-filter-dropdown__search-input::placeholder {
  color: var(--debrief-text-secondary, #888888);
}

[data-theme='dark'] .debrief-filter-dropdown__checkbox-label,
[data-theme='dark'] .debrief-filter-dropdown__radio-label {
  color: var(--debrief-text-primary, #e0e0e0);
}

[data-theme='dark'] .debrief-filter-dropdown__temporal-input {
  background-color: var(--debrief-bg-primary, #1e1e1e);
  border-color: var(--debrief-border-color, #3a3a3a);
  color: var(--debrief-text-primary, #e0e0e0);
}

[data-theme='dark'] .debrief-filter-dropdown__action-icon-btn {
  border-color: var(--debrief-border-color, #3a3a3a);
  color: var(--debrief-text-primary, #e0e0e0);
}

[data-theme='dark'] .debrief-filter-dropdown__action-icon-btn:hover:not(:disabled) {
  background-color: var(--debrief-hover-bg, rgba(255, 255, 255, 0.06));
}

[data-theme='dark'] .debrief-filter-dropdown__action-btn {
  color: var(--debrief-text-primary, #e0e0e0);
}

[data-theme='dark'] .debrief-filter-dropdown__action-btn:hover {
  background-color: var(--debrief-hover-bg, rgba(255, 255, 255, 0.06));
}

[data-theme='dark'] .debrief-filter-dropdown__clear-btn {
  color: var(--debrief-text-secondary, #888888);
}

[data-theme='dark'] .debrief-filter-dropdown__clear-btn:hover {
  background-color: var(--debrief-hover-bg, rgba(255, 255, 255, 0.06));
  color: var(--debrief-text-primary, #e0e0e0);
}
/**
 * RunDropdown nested context menu styles.
 */

.debrief-run-dropdown {
  width: 180px;
  background-color: var(--debrief-bg-primary, #ffffff);
  border: 1px solid var(--debrief-border-color, #e0e0e0);
  border-radius: var(--debrief-border-radius, 4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  font-family: var(--debrief-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
  font-size: var(--debrief-font-size-sm, 13px);
  padding: 4px 0;
}

.debrief-run-dropdown__category {
  position: relative;
}

.debrief-run-dropdown__category-trigger {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  cursor: pointer;
  color: var(--debrief-text-primary, #1a1a1a);
}

.debrief-run-dropdown__category:hover .debrief-run-dropdown__arrow {
  transform: rotate(90deg);
}

.debrief-run-dropdown__category-trigger:hover {
  background-color: var(--debrief-hover-bg, rgba(0, 0, 0, 0.04));
}

.debrief-run-dropdown__arrow {
  color: var(--debrief-text-secondary, #666666);
  font-size: 10px;
  transition: transform 0.15s ease;
}

/* Submenu - appears on hover, positioned BELOW category in narrow panels */
.debrief-run-dropdown__submenu {
  display: none;
  position: relative; /* Inline below trigger, not flyout */
  margin-left: 8px;
  padding-left: 8px;
  border-left: 2px solid var(--debrief-border-color-light, #e0e0e0);
  background-color: var(--debrief-bg-primary, #ffffff);
}

.debrief-run-dropdown__category:hover > .debrief-run-dropdown__submenu {
  display: block;
}

.debrief-run-dropdown__item {
  display: block;
  width: 100%;
  padding: 5px 12px;
  border: none;
  background: none;
  color: var(--debrief-text-primary, #1a1a1a);
  font-size: var(--debrief-font-size-sm, 13px);
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  box-sizing: border-box;
}

.debrief-run-dropdown__item:hover:not(:disabled) {
  background-color: var(--debrief-hover-bg, rgba(0, 0, 0, 0.04));
}

.debrief-run-dropdown__item--disabled {
  color: var(--debrief-text-secondary, #666666);
  cursor: default;
  font-style: italic;
}

.debrief-run-dropdown__group-header {
  padding: 4px 12px 2px;
  font-weight: 600;
  font-size: var(--debrief-font-size-xs, 11px);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--debrief-text-secondary, #666666);
}

.debrief-run-dropdown__separator {
  height: 1px;
  background-color: var(--debrief-border-color-light, #f0f0f0);
  margin: 4px 0;
}

/* Dark theme */
[data-theme='dark'] .debrief-run-dropdown,
[data-theme='dark'] .debrief-run-dropdown__submenu {
  background-color: var(--debrief-bg-primary, #1e1e1e);
  border-color: var(--debrief-border-color, #3a3a3a);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

[data-theme='dark'] .debrief-run-dropdown__category-trigger {
  color: var(--debrief-text-primary, #e0e0e0);
}

[data-theme='dark'] .debrief-run-dropdown__category-trigger:hover {
  background-color: var(--debrief-hover-bg, rgba(255, 255, 255, 0.06));
}

[data-theme='dark'] .debrief-run-dropdown__item {
  color: var(--debrief-text-primary, #e0e0e0);
}

[data-theme='dark'] .debrief-run-dropdown__item:hover:not(:disabled) {
  background-color: var(--debrief-hover-bg, rgba(255, 255, 255, 0.06));
}

[data-theme='dark'] .debrief-run-dropdown__item--disabled {
  color: var(--debrief-text-secondary, #888888);
}

[data-theme='dark'] .debrief-run-dropdown__separator {
  background-color: var(--debrief-border-color-light, #2d2d2d);
}
/**
 * AssociatedFilesDropdown styles.
 */

.debrief-associated-files {
  width: 220px;
  max-width: calc(100vw - 24px); /* Constrain to viewport minus padding */
  background-color: var(--debrief-bg-primary, #ffffff);
  border: 1px solid var(--debrief-border-color, #e0e0e0);
  border-radius: var(--debrief-border-radius, 4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  font-family: var(--debrief-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
  font-size: var(--debrief-font-size-sm, 13px);
  max-height: 360px;
  overflow-y: auto;
}

.debrief-associated-files__section {
  padding: 4px 0;
}

.debrief-associated-files__section-header {
  padding: 6px 12px 4px;
  font-weight: 600;
  font-size: var(--debrief-font-size-xs, 11px);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--debrief-text-secondary, #666666);
}

.debrief-associated-files__divider {
  height: 1px;
  background-color: var(--debrief-border-color-light, #f0f0f0);
}

.debrief-associated-files__empty {
  padding: 6px 12px;
  color: var(--debrief-text-secondary, #666666);
  font-style: italic;
}

/* File row */
.debrief-associated-files__file {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 4px 12px;
  border: none;
  background: none;
  color: var(--debrief-text-primary, #1a1a1a);
  font-size: var(--debrief-font-size-sm, 13px);
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  box-sizing: border-box;
}

.debrief-associated-files__file:hover {
  background-color: var(--debrief-hover-bg, rgba(0, 0, 0, 0.04));
}

.debrief-associated-files__file--active {
  background-color: var(--debrief-selection-bg, rgba(0, 102, 204, 0.1));
}

.debrief-associated-files__viewer-badge {
  flex-shrink: 0;
  padding: 1px 4px;
  border-radius: 3px;
  background-color: var(--debrief-badge-bg, #e8e8e8);
  color: var(--debrief-badge-text, #555555);
  font-size: var(--debrief-font-size-xs, 11px);
  font-weight: 600;
}

.debrief-associated-files__file-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Context menu (inline below file) */
.debrief-associated-files__context-menu {
  padding: 2px 0;
  margin: 0 8px 4px;
  border: 1px solid var(--debrief-border-color-light, #f0f0f0);
  border-radius: var(--debrief-border-radius, 4px);
  background-color: var(--debrief-bg-primary, #ffffff);
}

.debrief-associated-files__action {
  display: block;
  width: 100%;
  padding: 4px 10px;
  border: none;
  background: none;
  color: var(--debrief-text-primary, #1a1a1a);
  font-size: var(--debrief-font-size-sm, 13px);
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  box-sizing: border-box;
}

.debrief-associated-files__action:hover {
  background-color: var(--debrief-hover-bg, rgba(0, 0, 0, 0.04));
}

.debrief-associated-files__action--danger {
  color: var(--debrief-color-danger);
}

.debrief-associated-files__action--danger:hover {
  background-color: color-mix(in srgb, var(--debrief-color-danger) 6%, transparent);
}

.debrief-associated-files__separator {
  height: 1px;
  background-color: var(--debrief-border-color-light, #f0f0f0);
  margin: 2px 0;
}

.debrief-associated-files__provenance-warning {
  padding: 4px 10px;
  color: var(--debrief-color-danger);
  font-size: var(--debrief-font-size-xs, 11px);
  font-style: italic;
}

/* Dark theme */
[data-theme='dark'] .debrief-associated-files {
  background-color: var(--debrief-bg-primary, #1e1e1e);
  border-color: var(--debrief-border-color, #3a3a3a);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

[data-theme='dark'] .debrief-associated-files__divider,
[data-theme='dark'] .debrief-associated-files__separator {
  background-color: var(--debrief-border-color-light, #2d2d2d);
}

[data-theme='dark'] .debrief-associated-files__file {
  color: var(--debrief-text-primary, #e0e0e0);
}

[data-theme='dark'] .debrief-associated-files__file:hover {
  background-color: var(--debrief-hover-bg, rgba(255, 255, 255, 0.06));
}

[data-theme='dark'] .debrief-associated-files__context-menu {
  background-color: var(--debrief-bg-primary, #1e1e1e);
  border-color: var(--debrief-border-color-light, #2d2d2d);
}

[data-theme='dark'] .debrief-associated-files__action {
  color: var(--debrief-text-primary, #e0e0e0);
}

[data-theme='dark'] .debrief-associated-files__action:hover {
  background-color: var(--debrief-hover-bg, rgba(255, 255, 255, 0.06));
}
/**
 * LayersToolbar component styles.
 */

.debrief-layers-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  background-color: var(--debrief-bg-primary, #ffffff);
  border: 1px solid var(--debrief-border-color, #e0e0e0);
  border-radius: var(--debrief-border-radius, 4px);
  font-family: var(--debrief-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
  /* Establish positioning context for dropdowns */
  position: relative;
}

.debrief-layers-toolbar__group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.debrief-layers-toolbar__spacer {
  flex: 1;
}

/* Button base */
.debrief-layers-toolbar__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 4px 6px;
  border: none;
  border-radius: var(--debrief-border-radius, 4px);
  background: none;
  color: var(--debrief-text-primary, #1a1a1a);
  cursor: pointer;
  font-family: inherit;
  font-size: var(--debrief-font-size-sm, 13px);
  line-height: 1;
  position: relative;
}

.debrief-layers-toolbar__btn:hover:not(:disabled) {
  background-color: var(--debrief-hover-bg, rgba(0, 0, 0, 0.06));
}

.debrief-layers-toolbar__btn:disabled {
  opacity: 0.35;
  cursor: default;
  pointer-events: none;
}

.debrief-layers-toolbar__btn--active {
  background-color: var(--debrief-selection-bg, rgba(0, 102, 204, 0.1));
}

.debrief-layers-toolbar__btn--with-arrow {
  padding-right: 4px;
}

.debrief-layers-toolbar__arrow {
  font-size: 10px;
  color: var(--debrief-text-secondary, #666666);
  margin-left: 1px;
}

/* SVG icons */
.debrief-layers-toolbar__btn svg {
  flex-shrink: 0;
}

/* Dropdown wrapper */
.debrief-layers-toolbar__btn-wrapper {
  position: relative;
}

.debrief-layers-toolbar__dropdown {
  position: absolute;
  top: 100%;
  margin-top: 4px;
  z-index: 1000; /* Above Leaflet map layers (which use z-index up to ~400) */
}

.debrief-layers-toolbar__dropdown--left {
  /* Align to left edge of button, constrain to not overflow right */
  left: 0;
  right: auto;
}

.debrief-layers-toolbar__dropdown--right {
  /* Align to right edge of button, constrain to not overflow left */
  right: 0;
  left: auto;
}

/* Dark theme */
[data-theme='dark'] .debrief-layers-toolbar {
  background-color: var(--debrief-bg-primary, #1e1e1e);
  border-color: var(--debrief-border-color, #3a3a3a);
}

[data-theme='dark'] .debrief-layers-toolbar__btn {
  color: var(--debrief-text-primary, #e0e0e0);
}

[data-theme='dark'] .debrief-layers-toolbar__btn:hover:not(:disabled) {
  background-color: var(--debrief-hover-bg, rgba(255, 255, 255, 0.08));
}

[data-theme='dark'] .debrief-layers-toolbar__arrow {
  color: var(--debrief-text-secondary, #888888);
}
/**
 * Yellow halo animation for toolbar buttons.
 * Applied when available tools or results change.
 */

@keyframes debrief-yellow-halo {
  0% {
    box-shadow: 0 0 0 0 var(--debrief-color-attention);
  }
  20% {
    box-shadow: 0 0 8px 3px color-mix(in srgb, var(--debrief-color-attention) 83%, transparent);
  }
  100% {
    box-shadow: 0 0 0 0 transparent;
  }
}

.debrief-toolbar-btn--halo {
  animation: debrief-yellow-halo 6s ease-out;
}
/**
 * ToolsPanel component styles.
 * Uses CSS custom properties for theming (from ThemeProvider).
 */

.debrief-tools-panel {
  display: flex;
  flex-direction: column;
  font-family: var(--debrief-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
}

.debrief-tools-panel--empty {
  padding: 12px;
}

.debrief-tools-panel__message {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--debrief-text-muted, #808080);
  font-size: 12px;
}

.debrief-tools-panel__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.debrief-tools-panel__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  cursor: default;
}

.debrief-tools-panel__item--active {
  cursor: pointer;
}

.debrief-tools-panel__item--active:hover {
  background: var(--debrief-bg-tertiary, #2a2d2e);
}

.debrief-tools-panel__item--inactive {
  opacity: 0.5;
}

.debrief-tools-panel__item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
}

.debrief-tools-panel__item-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.debrief-tools-panel__item-name {
  font-size: 13px;
  color: var(--debrief-text-primary, #cccccc);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.debrief-tools-panel__item-desc {
  font-size: 11px;
  color: var(--debrief-text-muted, #808080);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
/**
 * ActivityPanel styles - unified panel with collapsible sections.
 *
 * Layout model:
 *  - Time Controller: fixed height (content-sized), collapse only
 *  - Tools & Layers: flexible, share remaining vertical space, internal scroll
 *  - No top-level scrollbar — panel fills available height exactly
 */

.debrief-activity-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden; /* no top-level scrollbar */
  background: var(--debrief-bg-primary, #1e1e1e);
  color: var(--debrief-text-primary, #cccccc);
  /* Contain dropdowns within panel bounds */
  position: relative;
}

/* ── Section (shared) ──────────────────────────────────── */

.debrief-activity-panel__section {
  flex: 0 0 auto; /* default: fixed, sized to content */
  border-bottom: 1px solid var(--debrief-border-color, #454545);
  min-height: 0; /* allow flex children to shrink */
}

.debrief-activity-panel__section:last-child {
  border-bottom: none;
}

/* Flexible section — stretches to fill remaining space */
.debrief-activity-panel__section--flexible {
  flex: 1 1 0%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.debrief-activity-panel__section--flexible .debrief-activity-panel__section-content {
  flex: 1 1 0%;
  overflow-y: auto;
}

/* Collapsed — header only, no flex growth */
.debrief-activity-panel__section--collapsed {
  flex: 0 0 auto !important;
}

/* ── Section header ────────────────────────────────────── */

.debrief-activity-panel__section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 6px 8px;
  background: var(--debrief-bg-secondary, #252526);
  border: none;
  color: var(--debrief-text-primary, #cccccc);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
}

.debrief-activity-panel__section-header:hover {
  background: var(--debrief-bg-tertiary, #2a2d2e);
}

.debrief-activity-panel__section-header:focus-visible {
  outline: 1px solid var(--debrief-border-color-focus, #007acc);
  outline-offset: -1px;
}

.debrief-activity-panel__section-title {
  flex: 1;
  text-align: left;
}

/* ── Section content ───────────────────────────────────── */

.debrief-activity-panel__section-content {
  padding: 4px 0;
}

.debrief-activity-panel__section--collapsed .debrief-activity-panel__section-content {
  display: none;
}

/* ── Resize handle between flexible sections ───────────── */

.debrief-activity-panel__resize-handle {
  flex: 0 0 4px;
  cursor: row-resize;
  background: var(--debrief-border-color, #454545);
  transition: background-color 0.15s ease;
}

.debrief-activity-panel__resize-handle:hover {
  background: var(--debrief-border-color-focus, #007acc);
}

/* ── Error state ───────────────────────────────────────── */

.debrief-activity-panel__section-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  color: var(--debrief-text-muted, #808080);
  font-size: 12px;
}`)),document.head.appendChild(e)}}catch(t){console.error("vite-plugin-css-injected-by-js",t)}})();const V1=[{rel:"root",href:"./catalog.json",type:"application/json"},{rel:"self",href:"./catalog.json",type:"application/json"},{rel:"item",href:"./exercise-alpha/item.json",type:"application/json",title:"Exercise Alpha"},{rel:"item",href:"./training-run-1/item.json",type:"application/json",title:"Training Run 1"}],G1={links:V1},K1="Feature",Y1="1.0.0",Q1="exercise-alpha",$1={type:"Polygon",coordinates:[[[-4.156,50.261],[-4.03,50.261],[-4.03,50.333],[-4.156,50.333],[-4.156,50.261]]]},q1=[-4.156,50.261,-4.03,50.333],J1={title:"Exercise Alpha",description:"Naval exercise south of Plymouth, January 2024",datetime:"2024-01-15T09:30:00Z",start_datetime:"2024-01-15T09:30:00Z",end_datetime:"2024-01-15T14:00:00Z"},X1=[{rel:"root",href:"../catalog.json",type:"application/json"},{rel:"parent",href:"../catalog.json",type:"application/json"},{rel:"self",href:"./item.json",type:"application/json"}],ew={data:{href:"./exercise-alpha.geojson",type:"application/geo+json",title:"Track and Location Data",roles:["data"]},"range-bearing-track-hms-defender-track-uss-freedom":{href:"./assets/range-bearing-track-hms-defender-track-uss-freedom.json",type:"application/json",title:"range-bearing-track-hms-defender-track-uss-freedom.json",roles:["result"],"debrief:toolId":"range-bearing","debrief:sourceFeatures":["track-hms-defender","track-uss-freedom"]},"range-bearing-track-uss-freedom-track-hms-defender":{href:"./assets/range-bearing-track-uss-freedom-track-hms-defender.json",type:"application/json",title:"range-bearing-track-uss-freedom-track-hms-defender.json",roles:["result"],"debrief:toolId":"range-bearing","debrief:sourceFeatures":["track-uss-freedom","track-hms-defender"]}},tw={type:K1,stac_version:Y1,id:Q1,geometry:$1,bbox:q1,properties:J1,links:X1,assets:ew},nw={type:"FeatureCollection",features:[{id:"track-hms-defender",type:"Feature",geometry:{type:"LineString",coordinates:[[-4.1234,50.2619],[-4.1245,50.2631],[-4.1267,50.2645],[-4.1289,50.2662],[-4.1312,50.2678],[-4.1334,50.2697],[-4.1356,50.2719],[-4.1378,50.2742],[-4.1401,50.2764],[-4.1423,50.2786],[-4.1445,50.2808],[-4.1467,50.2831],[-4.1489,50.2853],[-4.1512,50.2875],[-4.1534,50.2897]]},properties:{id:"track-hms-defender",kind:"TRACK",name:"HMS Defender",platformType:"OWNSHIP",color:"#2196F3",times:["2024-01-15T09:30:00Z","2024-01-15T09:50:00Z","2024-01-15T10:10:00Z","2024-01-15T10:30:00Z","2024-01-15T10:50:00Z","2024-01-15T11:10:00Z","2024-01-15T11:30:00Z","2024-01-15T11:50:00Z","2024-01-15T12:10:00Z","2024-01-15T12:30:00Z","2024-01-15T12:50:00Z","2024-01-15T13:10:00Z","2024-01-15T13:30:00Z","2024-01-15T13:50:00Z","2024-01-15T14:00:00Z"]}},{id:"track-uss-freedom",type:"Feature",geometry:{type:"LineString",coordinates:[[-4.0923,50.2953],[-4.0945,50.2931],[-4.0967,50.2908],[-4.0989,50.2886],[-4.1012,50.2864],[-4.1034,50.2842],[-4.1056,50.2819],[-4.1078,50.2797],[-4.1101,50.2775],[-4.1123,50.2753],[-4.1145,50.2731],[-4.1167,50.2708],[-4.1189,50.2686],[-4.1212,50.2664],[-4.1234,50.2642]]},properties:{id:"track-uss-freedom",kind:"TRACK",name:"USS Freedom",platformType:"CONTACT",color:"#4CAF50",times:["2024-01-15T09:30:00Z","2024-01-15T09:50:00Z","2024-01-15T10:10:00Z","2024-01-15T10:30:00Z","2024-01-15T10:50:00Z","2024-01-15T11:10:00Z","2024-01-15T11:30:00Z","2024-01-15T11:50:00Z","2024-01-15T12:10:00Z","2024-01-15T12:30:00Z","2024-01-15T12:50:00Z","2024-01-15T13:10:00Z","2024-01-15T13:30:00Z","2024-01-15T13:50:00Z","2024-01-15T14:00:00Z"]}},{id:"loc-alpha-point",type:"Feature",geometry:{type:"Point",coordinates:[-4.1189,50.2742]},properties:{id:"loc-alpha-point",kind:"POINT",name:"Alpha Point",locationType:"WAYPOINT"}},{id:"loc-bravo-datum",type:"Feature",geometry:{type:"Point",coordinates:[-4.135,50.333]},properties:{id:"loc-bravo-datum",kind:"POINT",name:"Bravo Datum",locationType:"REFERENCE"}},{id:"circle-exclusion-zone",type:"Feature",geometry:{type:"Polygon",coordinates:[[[-4.11,50.288],[-4.105,50.2865],[-4.105,50.2795],[-4.11,50.278],[-4.115,50.2795],[-4.115,50.2865],[-4.11,50.288]]]},properties:{id:"circle-exclusion-zone",kind:"CIRCLE",center:[-4.11,50.283],radius:500,label:"Exclusion Zone",style:{fill:!0,fill_color:"#F44336",fill_opacity:.2,stroke:!0,color:"#F44336",weight:2,opacity:.8}}},{id:"rect-exercise-area",type:"Feature",geometry:{type:"Polygon",coordinates:[[[-4.07,50.2905],[-4.03,50.2905],[-4.03,50.2655],[-4.07,50.2655],[-4.07,50.2905]]]},properties:{id:"rect-exercise-area",kind:"RECTANGLE",label:"Weapons-Hold Zone Charlie",style:{fill:!0,fill_color:"#2196F3",fill_opacity:.1,stroke:!0,color:"#2196F3",weight:2,opacity:.6,dash_array:"10, 5"}}},{id:"line-sector-boundary",type:"Feature",geometry:{type:"LineString",coordinates:[[-4.15,50.263],[-4.09,50.293]]},properties:{id:"line-sector-boundary",kind:"LINE",label:"Sector Boundary",style:{stroke:!0,color:"#795548",weight:3,opacity:.7,dash_array:"15, 10"}}},{id:"vector-wind",type:"Feature",geometry:{type:"LineString",coordinates:[[-4.12,50.298],[-4.105,50.293]]},properties:{id:"vector-wind",kind:"VECTOR",origin:[-4.12,50.298],range:1200,bearing:135,label:"Wind Direction",style:{stroke:!0,color:"#607D8B",weight:2,opacity:.9}}},{id:"text-nav-warning",type:"Feature",geometry:{type:"Point",coordinates:[-4.1,50.291]},properties:{id:"text-nav-warning",kind:"TEXT",text:"NAV WARNING: Restricted area",label:"Nav Warning",style:{color:"#FF5722",weight:1,opacity:1}}},{id:"timetext-contact-report",type:"Feature",geometry:{type:"Point",coordinates:[-4.145,50.278]},properties:{id:"timetext-contact-report",kind:"TIMETEXT",text:"Contact bearing 045",label:"Contact Report",time:"2024-01-15T11:00:00Z",style:{color:"#9C27B0",weight:1,opacity:1}}},{id:"periodtext-exercise-phase",type:"Feature",geometry:{type:"Point",coordinates:[-4.095,50.268]},properties:{id:"periodtext-exercise-phase",kind:"PERIODTEXT",text:"Phase 2: ASW Ops",label:"Exercise Phase",start_time:"2024-01-15T11:00:00Z",end_time:"2024-01-15T13:00:00Z",style:{color:"#3F51B5",weight:1,opacity:1}}},{id:"poly-minefield",type:"Feature",geometry:{type:"Polygon",coordinates:[[[-4.132,50.293],[-4.128,50.295],[-4.124,50.294],[-4.123,50.291],[-4.126,50.289],[-4.131,50.29],[-4.132,50.293]]]},properties:{id:"poly-minefield",kind:"POLY",label:"Suspected Minefield",style:{fill:!0,fill_color:"#FF9800",fill_opacity:.25,stroke:!0,color:"#FF9800",weight:2,opacity:.8,dash_array:"5, 5"}}},{id:"polyline-shipping-lane",type:"Feature",geometry:{type:"LineString",coordinates:[[-4.14,50.298],[-4.135,50.3],[-4.128,50.299],[-4.122,50.301],[-4.118,50.3]]},properties:{id:"polyline-shipping-lane",kind:"POLYLINE",label:"Shipping Lane Boundary",style:{stroke:!0,color:"#009688",weight:2,opacity:.7,dash_array:"8, 4"}}},{id:"ellipse-uncertainty",type:"Feature",geometry:{type:"Polygon",coordinates:[[[-4.105,50.266],[-4.1025,50.2675],[-4.099,50.268],[-4.096,50.267],[-4.0945,50.265],[-4.095,50.263],[-4.0975,50.2615],[-4.101,50.261],[-4.104,50.262],[-4.1055,50.264],[-4.105,50.266]]]},properties:{id:"ellipse-uncertainty",kind:"ELLIPSE",center:[-4.1,50.2645],semi_major:400,semi_minor:200,orientation:30,label:"Position Uncertainty",time:"2024-01-15T11:30:00Z",style:{fill:!0,fill_color:"#E91E63",fill_opacity:.15,stroke:!0,color:"#E91E63",weight:1,opacity:.7}}},{id:"ellipse2-search-area",type:"Feature",geometry:{type:"Polygon",coordinates:[[[-4.142,50.27],[-4.14,50.272],[-4.137,50.2725],[-4.134,50.2715],[-4.133,50.2695],[-4.134,50.2675],[-4.137,50.267],[-4.14,50.268],[-4.142,50.27]]]},properties:{id:"ellipse2-search-area",kind:"ELLIPSE2",center:[-4.1375,50.2698],semi_major:350,semi_minor:180,orientation:60,label:"Search Area Estimate",start_time:"2024-01-15T10:00:00Z",end_time:"2024-01-15T12:00:00Z",style:{fill:!0,fill_color:"#673AB7",fill_opacity:.15,stroke:!0,color:"#673AB7",weight:1,opacity:.7,dash_array:"4, 4"}}},{id:"wheel-sonar",type:"Feature",geometry:{type:"Point",coordinates:[-4.13,50.275]},properties:{id:"wheel-sonar",kind:"WHEEL",label:"Sonar Coverage",radius:600,inner_radius:200,spoke_count:8,style:{stroke:!0,color:"#00BCD4",weight:1,opacity:.6}}},{id:"dynrect-patrol-box",type:"Feature",geometry:{type:"Polygon",coordinates:[[[-4.088,50.276],[-4.083,50.276],[-4.083,50.273],[-4.088,50.273],[-4.088,50.276]]]},properties:{id:"dynrect-patrol-box",kind:"DYNAMIC_RECT",label:"Patrol Box",group:"patrol-alpha",time:"2024-01-15T10:30:00Z",style:{fill:!0,fill_color:"#CDDC39",fill_opacity:.2,stroke:!0,color:"#CDDC39",weight:2,opacity:.8}}},{id:"dyncircle-guard-zone",type:"Feature",geometry:{type:"Polygon",coordinates:[[[-4.156,50.293],[-4.153,50.295],[-4.15,50.294],[-4.149,50.291],[-4.152,50.289],[-4.155,50.29],[-4.156,50.293]]]},properties:{id:"dyncircle-guard-zone",kind:"DYNAMIC_CIRCLE",center:[-4.1525,50.292],radius:300,label:"Guard Zone",group:"guard-bravo",time:"2024-01-15T11:00:00Z",style:{fill:!0,fill_color:"#FF5722",fill_opacity:.15,stroke:!0,color:"#FF5722",weight:2,opacity:.7}}},{id:"dynpoly-moving-zone",type:"Feature",geometry:{type:"Polygon",coordinates:[[[-4.092,50.288],[-4.089,50.29],[-4.085,50.289],[-4.084,50.286],[-4.087,50.284],[-4.091,50.285],[-4.092,50.288]]]},properties:{id:"dynpoly-moving-zone",kind:"DYNAMIC_POLY",label:"Moving Exclusion Zone",group:"exclusion-charlie",time:"2024-01-15T12:00:00Z",style:{fill:!0,fill_color:"#795548",fill_opacity:.2,stroke:!0,color:"#795548",weight:2,opacity:.8,dash_array:"6, 3"}}},{id:"sensor-bearing-1",type:"Feature",geometry:{type:"LineString",coordinates:[[-4.115,50.278],[-4.105,50.271]]},properties:{id:"sensor-bearing-1",kind:"SENSOR",label:"Sonar Contact B1",sensor_type:"SONAR",bearing:210,range:800,origin:[-4.115,50.278],time:"2024-01-15T11:15:00Z",style:{stroke:!0,color:"#E91E63",weight:1,opacity:.6,dash_array:"3, 3"}}},{id:"sensor2-bearing-only",type:"Feature",geometry:{type:"LineString",coordinates:[[-4.115,50.278],[-4.125,50.27]]},properties:{id:"sensor2-bearing-only",kind:"SENSOR2",label:"Passive Bearing B2",sensor_type:"PASSIVE",bearing:225,origin:[-4.115,50.278],time:"2024-01-15T11:20:00Z",style:{stroke:!0,color:"#9C27B0",weight:1,opacity:.5,dash_array:"2, 4"}}},{id:"tma-pos-estimate",type:"Feature",geometry:{type:"Polygon",coordinates:[[[-4.108,50.271],[-4.106,50.2725],[-4.103,50.2728],[-4.1005,50.2718],[-4.0995,50.27],[-4.1005,50.2685],[-4.103,50.268],[-4.106,50.2688],[-4.108,50.271]]]},properties:{id:"tma-pos-estimate",kind:"TMA_POS",label:"TMA Solution",center:[-4.104,50.2705],semi_major:250,semi_minor:150,orientation:45,course:180,speed:12,time:"2024-01-15T11:45:00Z",style:{fill:!0,fill_color:"#FF9800",fill_opacity:.2,stroke:!0,color:"#FF9800",weight:2,opacity:.8}}},{id:"narrative-entry-1",type:"Feature",geometry:{type:"Point",coordinates:[]},properties:{id:"narrative-entry-1",kind:"NARRATIVE",text:"Exercise Alpha commenced. HMS Defender departing Plymouth.",time:"2024-01-15T09:30:00Z"}},{id:"narrative-entry-2",type:"Feature",geometry:{type:"Point",coordinates:[]},properties:{id:"narrative-entry-2",kind:"NARRATIVE",text:"Sonar contact bearing 210, classified probable submarine.",time:"2024-01-15T11:15:00Z"}},{id:"narrative-entry-3",type:"Feature",geometry:{type:"Point",coordinates:[]},properties:{id:"narrative-entry-3",kind:"NARRATIVE",text:"Exercise Alpha complete. All units returning to port.",time:"2024-01-15T14:00:00Z"}},{type:"Feature",id:"stats-7d4fdb4a",properties:{source_track:"unknown",source_name:"USS Freedom",statistics:{point_count:15,duration_hours:0,distance_nm:2.22,average_speed_kts:0},kind:"track-statistics",provenance:{tool:"track-stats",version:"1.0.0",timestamp:"2026-02-05T14:08:36.599191Z",sources:[{id:"unknown",kind:"track"}],parameters:{}}},geometry:{type:"Point",coordinates:[-4.107833333333334,50.27972666666666]}}]},rw="Feature",iw="1.0.0",ow="training-run-1",aw={type:"Polygon",coordinates:[[[-4.2012,50.3456],[-4.1812,50.3456],[-4.1812,50.3656],[-4.2012,50.3656],[-4.2012,50.3456]]]},sw=[-4.2012,50.3456,-4.1812,50.3656],lw={title:"Training Run 1",description:"Single vessel training exercise",datetime:"2024-01-14T08:00:00Z",start_datetime:"2024-01-14T08:00:00Z",end_datetime:"2024-01-14T12:30:00Z"},uw=[{rel:"root",href:"../catalog.json",type:"application/json"},{rel:"parent",href:"../catalog.json",type:"application/json"},{rel:"self",href:"./item.json",type:"application/json"}],cw={data:{href:"./training-run-1.geojson",type:"application/geo+json",title:"Track and Location Data",roles:["data"]}},dw={type:rw,stac_version:iw,id:ow,geometry:aw,bbox:sw,properties:lw,links:uw,assets:cw},fw={type:"FeatureCollection",features:[{type:"Feature",geometry:{type:"LineString",coordinates:[[-4.2012,50.3456],[-4.1989,50.3478],[-4.1967,50.3501],[-4.1945,50.3523],[-4.1923,50.3545],[-4.1901,50.3567],[-4.1878,50.3589],[-4.1856,50.3612],[-4.1834,50.3634],[-4.1812,50.3656]]},properties:{id:"track-hms-sutherland",name:"HMS Sutherland",platformType:"Frigate",color:"#FF5722",times:["2024-01-14T08:00:00Z","2024-01-14T08:30:00Z","2024-01-14T09:00:00Z","2024-01-14T09:30:00Z","2024-01-14T10:00:00Z","2024-01-14T10:30:00Z","2024-01-14T11:00:00Z","2024-01-14T11:30:00Z","2024-01-14T12:00:00Z","2024-01-14T12:30:00Z"]}},{type:"Feature",geometry:{type:"Point",coordinates:[-4.1901,50.3512]},properties:{id:"loc-start-point",name:"Start Point",locationType:"Waypoint"}},{type:"Feature",geometry:{type:"Point",coordinates:[-4.1856,50.3589]},properties:{id:"loc-turn-point",name:"Turn Point",locationType:"Waypoint"}}]},Rl={"./exercise-alpha/item.json":{item:tw,data:nw},"./training-run-1/item.json":{item:dw,data:fw}};function hw(){return(G1.links??[]).filter(t=>t.rel==="item").map(t=>t.href)}function pw(e,t){return{id:t.id,title:t.properties.title??t.id,itemPath:e,bbox:t.bbox??null,datetime:t.properties.datetime??null,startDatetime:t.properties.start_datetime??null,endDatetime:t.properties.end_datetime??null}}function mw(){return{getItems(){return hw().map(t=>{const r=Rl[t];return r?pw(t,r.item):null}).filter(t=>t!==null)},getPlotData(e){const t=Rl[e];if(!t)throw new Error(`Unknown item path: ${e}`);return t.data},getItem(e){const t=Rl[e];return(t==null?void 0:t.item)??null}}}const Dl=mw();function Hu(e,t){const i=e[1]*Math.PI/180,a=t[1]*Math.PI/180,l=(t[1]-e[1])*Math.PI/180,u=(t[0]-e[0])*Math.PI/180,d=Math.sin(l/2)*Math.sin(l/2)+Math.cos(i)*Math.cos(a)*Math.sin(u/2)*Math.sin(u/2);return 6371e3*(2*Math.atan2(Math.sqrt(d),Math.sqrt(1-d)))}function gw(e){let t=0;for(let r=1;r<e.length;r++)t+=Hu(e[r-1],e[r]);return t}function vw(e){let t=1/0,r=1/0,i=-1/0,a=-1/0;function l(u){if(typeof u[0]=="number"){const[d,h]=u;t=Math.min(t,d),i=Math.max(i,d),r=Math.min(r,h),a=Math.max(a,h)}else u.forEach(l)}for(const u of e)u.geometry&&"coordinates"in u.geometry&&l(u.geometry.coordinates);return[t,r,i,a]}function _w(e){const[t,r,i,a]=e;return{type:"Feature",geometry:{type:"Polygon",coordinates:[[[t,r],[i,r],[i,a],[t,a],[t,r]]]},properties:{id:`bbox-result-${Date.now()}`,kind:"RECTANGLE",label:"Bounding Box Result",style:{fill:!0,fill_color:"#4CAF50",fill_opacity:.1,stroke:!0,color:"#4CAF50",weight:2,opacity:.8,dash_array:"5, 5"}}}}const Fh=[{id:"track-length",name:"Track Length",description:"Calculate total length of selected tracks",minTracks:1},{id:"bounding-box",name:"Bounding Box",description:"Calculate bounding box of selected features",minFeatures:1}];function Qg(e){var t;return((t=e.geometry)==null?void 0:t.type)==="LineString"&&e.properties!==null&&Array.isArray(e.properties.times)}function yw(e,t){const r=t.filter(Qg);if(e.minTracks!==void 0){if(r.length<e.minTracks)return{applicable:!1,explanation:`Requires at least ${e.minTracks} track${e.minTracks>1?"s":""} (${r.length} selected)`};if(e.maxTracks!==void 0&&r.length>e.maxTracks)return{applicable:!1,explanation:`Requires at most ${e.maxTracks} track${e.maxTracks>1?"s":""} (${r.length} selected)`}}return e.minFeatures!==void 0&&t.length<e.minFeatures?{applicable:!1,explanation:`Requires at least ${e.minFeatures} feature${e.minFeatures>1?"s":""} (${t.length} selected)`}:{applicable:!0}}function bw(){return{getTools(e){return Fh.map(t=>{const{applicable:r,explanation:i}=yw(t,e);return{id:t.id,name:t.name,description:t.description,applicable:r,explanation:i}})},runTool(e,t){var i,a;if(!Fh.find(l=>l.id===e))return{success:!1,message:`Unknown tool: ${e}`};switch(e){case"track-length":{const l=t.filter(Qg);if(l.length===0)return{success:!1,message:"No tracks selected"};let u=0;const d=[];for(const p of l){const b=p.geometry,_=gw(b.coordinates);u+=_;const y=((i=p.properties)==null?void 0:i.name)??((a=p.properties)==null?void 0:a.id)??"Unknown";d.push(`${y}: ${(_/1e3).toFixed(2)} km`)}return{success:!0,message:l.length===1?`Track length: ${(u/1e3).toFixed(2)} km`:`Total length: ${(u/1e3).toFixed(2)} km
${d.join(`
`)}`}}case"bounding-box":{if(t.length===0)return{success:!1,message:"No features selected"};const l=vw(t),u=_w(l),d=Hu([l[0],l[1]],[l[2],l[1]]),h=Hu([l[0],l[1]],[l[0],l[3]]);return{success:!0,message:`Bounding box: ${(d/1e3).toFixed(2)} km × ${(h/1e3).toFixed(2)} km`,resultLayer:u}}default:return{success:!1,message:`Tool not implemented: ${e}`}}}}}const Zh=bw();function xw(){const[e,t]=P.useState("welcome"),[r,i]=P.useState(null),[a,l]=P.useState([]),[u,d]=P.useState(null),[h,p]=P.useState("full"),b=P.useMemo(()=>Dl.getItems(),[]),_=tx(),y=P.useMemo(()=>r?r.features.features:[],[r]),C=P.useMemo(()=>[...y,...a],[y,a]),T=P.useMemo(()=>y.length===0?null:hb(y),[y]),k=_g({timeExtent:T}),D=P.useMemo(()=>y.filter(O=>_.selectedIds.has(O.id)),[y,_.selectedIds]),x=P.useMemo(()=>Zh.getTools(D),[D]),g=P.useCallback(O=>{try{const B=Dl.getPlotData(O),H=Dl.getItem(O);i({itemPath:O,title:(H==null?void 0:H.properties.title)??O,features:B}),l([]),d(null),_.clear(),t("analysis")}catch(B){console.error("Failed to load plot:",B)}},[_]),v=P.useCallback(()=>{t("welcome"),i(null),l([]),d(null),_.clear()},[_]),E=P.useCallback((O,B)=>{B.ctrlKey||B.metaKey?_.toggle(O):_.select(O)},[_]),N=P.useCallback(()=>{_.clear()},[_]),R=P.useCallback(O=>{const B=Zh.runTool(O,D);d(B.message),B.resultLayer&&l(H=>[...H,B.resultLayer])},[D]),z=P.useCallback(O=>{switch(O.type){case"temporal:seek":k.setCurrentTime(O.payload.time);break;case"temporal:play":k.play();break;case"temporal:pause":k.pause();break;case"temporal:displayMode":p(O.payload.mode);break;case"tool:run":R(O.payload.toolId);break;case"layer:select":_.selectMultiple(O.payload.featureIds);break}},[k,_,R]);return e==="welcome"?w.jsxs("div",{className:"web-shell web-shell--welcome",children:[w.jsxs("header",{className:"web-shell__header",children:[w.jsx("h1",{className:"web-shell__title",children:"Debrief Web Shell"}),w.jsx("p",{className:"web-shell__subtitle",children:"STAC Catalog Browser"})]}),w.jsx("main",{className:"web-shell__main",children:w.jsx(sx,{items:b,onItemSelect:g,className:"web-shell__catalog"})})]}):w.jsxs("div",{className:"web-shell web-shell--analysis",children:[w.jsxs("header",{className:"web-shell__header",children:[w.jsx("button",{type:"button",className:"web-shell__back-button",onClick:v,"aria-label":"Back to catalog",children:"← Back to Catalog"}),w.jsx("h1",{className:"web-shell__title",children:(r==null?void 0:r.title)??"Analysis"})]}),u&&w.jsxs("div",{className:"web-shell__tool-message",role:"status",children:[w.jsx("pre",{children:u}),w.jsx("button",{type:"button",onClick:()=>d(null),"aria-label":"Dismiss message",children:"×"})]}),w.jsxs("main",{className:"web-shell__main web-shell__main--split",children:[w.jsx("aside",{className:"web-shell__sidebar",children:w.jsx(U1,{timeExtent:T,currentTime:k.currentTime,playbackState:k.playbackState,playbackSpeed:k.speed,displayMode:h,timeUiState:T?"ready":"empty",tools:x,features:C,selectedFeatureIds:Array.from(_.selectedIds),onMessage:z})}),w.jsx("section",{className:"web-shell__map-container",children:w.jsx(Eb,{features:C,selectedIds:_.selectedIds,onSelect:E,onBackgroundClick:N,currentTime:k.currentTime,displayMode:h,height:"100%",className:"web-shell__map"})})]})]})}const $g=document.getElementById("root");if(!$g)throw new Error("Root element not found");const ww=tg($g);ww.render(w.jsx(P.StrictMode,{children:w.jsx(ex,{children:w.jsx(xw,{})})}));
