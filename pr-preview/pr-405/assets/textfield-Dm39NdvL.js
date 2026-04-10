import{R as Z,r as S}from"./index-B2-qRKKC.js";var O={},wt={exports:{}},se={};/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var ot;function tr(){if(ot)return se;ot=1;var e=Z,t=Symbol.for("react.element"),r=Symbol.for("react.fragment"),n=Object.prototype.hasOwnProperty,o=e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,a={key:!0,ref:!0,__self:!0,__source:!0};function i(u,c,l){var d,p={},v=null,f=null;l!==void 0&&(v=""+l),c.key!==void 0&&(v=""+c.key),c.ref!==void 0&&(f=c.ref);for(d in c)n.call(c,d)&&!a.hasOwnProperty(d)&&(p[d]=c[d]);if(u&&u.defaultProps)for(d in c=u.defaultProps,c)p[d]===void 0&&(p[d]=c[d]);return{$$typeof:t,type:u,key:v,ref:f,props:p,_owner:o.current}}return se.Fragment=r,se.jsx=i,se.jsxs=i,se}wt.exports=tr();var C=wt.exports,B=function(){return B=Object.assign||function(e){for(var t,r=1,n=arguments.length;r<n;r++){t=arguments[r];for(var o in t)Object.prototype.hasOwnProperty.call(t,o)&&(e[o]=t[o])}return e},B.apply(this,arguments)};function Ce(e,t,r){if(r||arguments.length===2)for(var n=0,o=t.length,a;n<o;n++)(a||!(n in t))&&(a||(a=Array.prototype.slice.call(t,0,n)),a[n]=t[n]);return e.concat(a||Array.prototype.slice.call(t))}var k="-ms-",ue="-moz-",m="-webkit-",kt="comm",ze="rule",Ze="decl",rr="@import",St="@keyframes",nr="@layer",Ct=Math.abs,qe=String.fromCharCode,Ve=Object.assign;function or(e,t){return N(e,0)^45?(((t<<2^N(e,0))<<2^N(e,1))<<2^N(e,2))<<2^N(e,3):0}function $t(e){return e.trim()}function M(e,t){return(e=t.exec(e))?e[0]:e}function h(e,t,r){return e.replace(t,r)}function ye(e,t,r){return e.indexOf(t,r)}function N(e,t){return e.charCodeAt(t)|0}function q(e,t,r){return e.slice(t,r)}function T(e){return e.length}function _t(e){return e.length}function ce(e,t){return t.push(e),e}function ar(e,t){return e.map(t).join("")}function at(e,t){return e.filter(function(r){return!M(r,t)})}var Ie=1,K=1,Rt=0,D=0,A=0,ne="";function Ae(e,t,r,n,o,a,i,u){return{value:e,root:t,parent:r,type:n,props:o,children:a,line:Ie,column:K,length:i,return:"",siblings:u}}function V(e,t){return Ve(Ae("",null,null,"",null,null,0,e.siblings),e,{length:-e.length},t)}function X(e){for(;e.root;)e=V(e.root,{children:[e]});ce(e,e.siblings)}function ir(){return A}function sr(){return A=D>0?N(ne,--D):0,K--,A===10&&(K=1,Ie--),A}function F(){return A=D<Rt?N(ne,D++):0,K++,A===10&&(K=1,Ie++),A}function H(){return N(ne,D)}function xe(){return D}function je(e,t){return q(ne,e,t)}function Ye(e){switch(e){case 0:case 9:case 10:case 13:case 32:return 5;case 33:case 43:case 44:case 47:case 62:case 64:case 126:case 59:case 123:case 125:return 4;case 58:return 3;case 34:case 39:case 40:case 91:return 2;case 41:case 93:return 1}return 0}function cr(e){return Ie=K=1,Rt=T(ne=e),D=0,[]}function ur(e){return ne="",e}function Te(e){return $t(je(D-1,We(e===91?e+2:e===40?e+1:e)))}function dr(e){for(;(A=H())&&A<33;)F();return Ye(e)>2||Ye(A)>3?"":" "}function lr(e,t){for(;--t&&F()&&!(A<48||A>102||A>57&&A<65||A>70&&A<97););return je(e,xe()+(t<6&&H()==32&&F()==32))}function We(e){for(;F();)switch(A){case e:return D;case 34:case 39:e!==34&&e!==39&&We(A);break;case 40:e===41&&We(e);break;case 92:F();break}return D}function pr(e,t){for(;F()&&e+A!==57&&!(e+A===84&&H()===47););return"/*"+je(t,D-1)+"*"+qe(e===47?e:F())}function fr(e){for(;!Ye(H());)F();return je(e,D)}function vr(e){return ur(we("",null,null,null,[""],e=cr(e),0,[0],e))}function we(e,t,r,n,o,a,i,u,c){for(var l=0,d=0,p=i,v=0,f=0,b=0,w=1,E=1,$=1,_=0,x="",R=o,I=a,y=n,s=x;E;)switch(b=_,_=F()){case 40:if(b!=108&&N(s,p-1)==58){ye(s+=h(Te(_),"&","&\f"),"&\f",Ct(l?u[l-1]:0))!=-1&&($=-1);break}case 34:case 39:case 91:s+=Te(_);break;case 9:case 10:case 13:case 32:s+=dr(b);break;case 92:s+=lr(xe()-1,7);continue;case 47:switch(H()){case 42:case 47:ce(hr(pr(F(),xe()),t,r,c),c);break;default:s+="/"}break;case 123*w:u[l++]=T(s)*$;case 125*w:case 59:case 0:switch(_){case 0:case 125:E=0;case 59+d:$==-1&&(s=h(s,/\f/g,"")),f>0&&T(s)-p&&ce(f>32?st(s+";",n,r,p-1,c):st(h(s," ","")+";",n,r,p-2,c),c);break;case 59:s+=";";default:if(ce(y=it(s,t,r,l,d,o,u,x,R=[],I=[],p,a),a),_===123)if(d===0)we(s,t,y,y,R,a,p,u,I);else switch(v===99&&N(s,3)===110?100:v){case 100:case 108:case 109:case 115:we(e,y,y,n&&ce(it(e,y,y,0,0,o,u,x,o,R=[],p,I),I),o,I,p,u,n?R:I);break;default:we(s,y,y,y,[""],I,0,u,I)}}l=d=f=0,w=$=1,x=s="",p=i;break;case 58:p=1+T(s),f=b;default:if(w<1){if(_==123)--w;else if(_==125&&w++==0&&sr()==125)continue}switch(s+=qe(_),_*w){case 38:$=d>0?1:(s+="\f",-1);break;case 44:u[l++]=(T(s)-1)*$,$=1;break;case 64:H()===45&&(s+=Te(F())),v=H(),d=p=T(x=s+=fr(xe())),_++;break;case 45:b===45&&T(s)==2&&(w=0)}}return a}function it(e,t,r,n,o,a,i,u,c,l,d,p){for(var v=o-1,f=o===0?a:[""],b=_t(f),w=0,E=0,$=0;w<n;++w)for(var _=0,x=q(e,v+1,v=Ct(E=i[w])),R=e;_<b;++_)(R=$t(E>0?f[_]+" "+x:h(x,/&\f/g,f[_])))&&(c[$++]=R);return Ae(e,t,r,o===0?ze:u,c,l,d,p)}function hr(e,t,r,n){return Ae(e,t,r,kt,qe(ir()),q(e,2,-2),0,n)}function st(e,t,r,n,o){return Ae(e,t,r,Ze,q(e,0,n),q(e,n+1,-1),n,o)}function zt(e,t,r){switch(or(e,t)){case 5103:return m+"print-"+e+e;case 5737:case 4201:case 3177:case 3433:case 1641:case 4457:case 2921:case 5572:case 6356:case 5844:case 3191:case 6645:case 3005:case 6391:case 5879:case 5623:case 6135:case 4599:case 4855:case 4215:case 6389:case 5109:case 5365:case 5621:case 3829:return m+e+e;case 4789:return ue+e+e;case 5349:case 4246:case 4810:case 6968:case 2756:return m+e+ue+e+k+e+e;case 5936:switch(N(e,t+11)){case 114:return m+e+k+h(e,/[svh]\w+-[tblr]{2}/,"tb")+e;case 108:return m+e+k+h(e,/[svh]\w+-[tblr]{2}/,"tb-rl")+e;case 45:return m+e+k+h(e,/[svh]\w+-[tblr]{2}/,"lr")+e}case 6828:case 4268:case 2903:return m+e+k+e+e;case 6165:return m+e+k+"flex-"+e+e;case 5187:return m+e+h(e,/(\w+).+(:[^]+)/,m+"box-$1$2"+k+"flex-$1$2")+e;case 5443:return m+e+k+"flex-item-"+h(e,/flex-|-self/g,"")+(M(e,/flex-|baseline/)?"":k+"grid-row-"+h(e,/flex-|-self/g,""))+e;case 4675:return m+e+k+"flex-line-pack"+h(e,/align-content|flex-|-self/g,"")+e;case 5548:return m+e+k+h(e,"shrink","negative")+e;case 5292:return m+e+k+h(e,"basis","preferred-size")+e;case 6060:return m+"box-"+h(e,"-grow","")+m+e+k+h(e,"grow","positive")+e;case 4554:return m+h(e,/([^-])(transform)/g,"$1"+m+"$2")+e;case 6187:return h(h(h(e,/(zoom-|grab)/,m+"$1"),/(image-set)/,m+"$1"),e,"")+e;case 5495:case 3959:return h(e,/(image-set\([^]*)/,m+"$1$`$1");case 4968:return h(h(e,/(.+:)(flex-)?(.*)/,m+"box-pack:$3"+k+"flex-pack:$3"),/s.+-b[^;]+/,"justify")+m+e+e;case 4200:if(!M(e,/flex-|baseline/))return k+"grid-column-align"+q(e,t)+e;break;case 2592:case 3360:return k+h(e,"template-","")+e;case 4384:case 3616:return r&&r.some(function(n,o){return t=o,M(n.props,/grid-\w+-end/)})?~ye(e+(r=r[t].value),"span",0)?e:k+h(e,"-start","")+e+k+"grid-row-span:"+(~ye(r,"span",0)?M(r,/\d+/):+M(r,/\d+/)-+M(e,/\d+/))+";":k+h(e,"-start","")+e;case 4896:case 4128:return r&&r.some(function(n){return M(n.props,/grid-\w+-start/)})?e:k+h(h(e,"-end","-span"),"span ","")+e;case 4095:case 3583:case 4068:case 2532:return h(e,/(.+)-inline(.+)/,m+"$1$2")+e;case 8116:case 7059:case 5753:case 5535:case 5445:case 5701:case 4933:case 4677:case 5533:case 5789:case 5021:case 4765:if(T(e)-1-t>6)switch(N(e,t+1)){case 109:if(N(e,t+4)!==45)break;case 102:return h(e,/(.+:)(.+)-([^]+)/,"$1"+m+"$2-$3$1"+ue+(N(e,t+3)==108?"$3":"$2-$3"))+e;case 115:return~ye(e,"stretch",0)?zt(h(e,"stretch","fill-available"),t,r)+e:e}break;case 5152:case 5920:return h(e,/(.+?):(\d+)(\s*\/\s*(span)?\s*(\d+))?(.*)/,function(n,o,a,i,u,c,l){return k+o+":"+a+l+(i?k+o+"-span:"+(u?c:+c-+a)+l:"")+e});case 4949:if(N(e,t+6)===121)return h(e,":",":"+m)+e;break;case 6444:switch(N(e,N(e,14)===45?18:11)){case 120:return h(e,/(.+:)([^;\s!]+)(;|(\s+)?!.+)?/,"$1"+m+(N(e,14)===45?"inline-":"")+"box$3$1"+m+"$2$3$1"+k+"$2box$3")+e;case 100:return h(e,":",":"+k)+e}break;case 5719:case 2647:case 2135:case 3927:case 2391:return h(e,"scroll-","scroll-snap-")+e}return e}function $e(e,t){for(var r="",n=0;n<e.length;n++)r+=t(e[n],n,e,t)||"";return r}function gr(e,t,r,n){switch(e.type){case nr:if(e.children.length)break;case rr:case Ze:return e.return=e.return||e.value;case kt:return"";case St:return e.return=e.value+"{"+$e(e.children,n)+"}";case ze:if(!T(e.value=e.props.join(",")))return""}return T(r=$e(e.children,n))?e.return=e.value+"{"+r+"}":""}function br(e){var t=_t(e);return function(r,n,o,a){for(var i="",u=0;u<t;u++)i+=e[u](r,n,o,a)||"";return i}}function mr(e){return function(t){t.root||(t=t.return)&&e(t)}}function yr(e,t,r,n){if(e.length>-1&&!e.return)switch(e.type){case Ze:e.return=zt(e.value,e.length,r);return;case St:return $e([V(e,{value:h(e.value,"@","@"+m)})],n);case ze:if(e.length)return ar(r=e.props,function(o){switch(M(o,n=/(::plac\w+|:read-\w+)/)){case":read-only":case":read-write":X(V(e,{props:[h(o,/:(read-\w+)/,":"+ue+"$1")]})),X(V(e,{props:[o]})),Ve(e,{props:at(r,n)});break;case"::placeholder":X(V(e,{props:[h(o,/:(plac\w+)/,":"+m+"input-$1")]})),X(V(e,{props:[h(o,/:(plac\w+)/,":"+ue+"$1")]})),X(V(e,{props:[h(o,/:(plac\w+)/,k+"input-$1")]})),X(V(e,{props:[o]})),Ve(e,{props:at(r,n)});break}return""})}}var xr={animationIterationCount:1,aspectRatio:1,borderImageOutset:1,borderImageSlice:1,borderImageWidth:1,boxFlex:1,boxFlexGroup:1,boxOrdinalGroup:1,columnCount:1,columns:1,flex:1,flexGrow:1,flexPositive:1,flexShrink:1,flexNegative:1,flexOrder:1,gridRow:1,gridRowEnd:1,gridRowSpan:1,gridRowStart:1,gridColumn:1,gridColumnEnd:1,gridColumnSpan:1,gridColumnStart:1,msGridRow:1,msGridRowSpan:1,msGridColumn:1,msGridColumnSpan:1,fontWeight:1,lineHeight:1,opacity:1,order:1,orphans:1,tabSize:1,widows:1,zIndex:1,zoom:1,WebkitLineClamp:1,fillOpacity:1,floodOpacity:1,stopOpacity:1,strokeDasharray:1,strokeDashoffset:1,strokeMiterlimit:1,strokeOpacity:1,strokeWidth:1},ee=typeof process<"u"&&O!==void 0&&(O.REACT_APP_SC_ATTR||O.SC_ATTR)||"data-styled",It="active",At="data-styled-version",Ne="6.1.13",Ke=`/*!sc*/
`,_e=typeof window<"u"&&"HTMLElement"in window,wr=!!(typeof SC_DISABLE_SPEEDY=="boolean"?SC_DISABLE_SPEEDY:typeof process<"u"&&O!==void 0&&O.REACT_APP_SC_DISABLE_SPEEDY!==void 0&&O.REACT_APP_SC_DISABLE_SPEEDY!==""?O.REACT_APP_SC_DISABLE_SPEEDY!=="false"&&O.REACT_APP_SC_DISABLE_SPEEDY:typeof process<"u"&&O!==void 0&&O.SC_DISABLE_SPEEDY!==void 0&&O.SC_DISABLE_SPEEDY!==""&&O.SC_DISABLE_SPEEDY!=="false"&&O.SC_DISABLE_SPEEDY),Pe=Object.freeze([]),te=Object.freeze({});function kr(e,t,r){return r===void 0&&(r=te),e.theme!==r.theme&&e.theme||t||r.theme}var jt=new Set(["a","abbr","address","area","article","aside","audio","b","base","bdi","bdo","big","blockquote","body","br","button","canvas","caption","cite","code","col","colgroup","data","datalist","dd","del","details","dfn","dialog","div","dl","dt","em","embed","fieldset","figcaption","figure","footer","form","h1","h2","h3","h4","h5","h6","header","hgroup","hr","html","i","iframe","img","input","ins","kbd","keygen","label","legend","li","link","main","map","mark","menu","menuitem","meta","meter","nav","noscript","object","ol","optgroup","option","output","p","param","picture","pre","progress","q","rp","rt","ruby","s","samp","script","section","select","small","source","span","strong","style","sub","summary","sup","table","tbody","td","textarea","tfoot","th","thead","time","tr","track","u","ul","use","var","video","wbr","circle","clipPath","defs","ellipse","foreignObject","g","image","line","linearGradient","marker","mask","path","pattern","polygon","polyline","radialGradient","rect","stop","svg","text","tspan"]),Sr=/[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~-]+/g,Cr=/(^-|-$)/g;function ct(e){return e.replace(Sr,"-").replace(Cr,"")}var $r=/(a)(d)/gi,ge=52,ut=function(e){return String.fromCharCode(e+(e>25?39:97))};function He(e){var t,r="";for(t=Math.abs(e);t>ge;t=t/ge|0)r=ut(t%ge)+r;return(ut(t%ge)+r).replace($r,"$1-$2")}var Ue,Nt=5381,Q=function(e,t){for(var r=t.length;r;)e=33*e^t.charCodeAt(--r);return e},Pt=function(e){return Q(Nt,e)};function _r(e){return He(Pt(e)>>>0)}function Rr(e){return e.displayName||e.name||"Component"}function Me(e){return typeof e=="string"&&!0}var Et=typeof Symbol=="function"&&Symbol.for,Bt=Et?Symbol.for("react.memo"):60115,zr=Et?Symbol.for("react.forward_ref"):60112,Ir={childContextTypes:!0,contextType:!0,contextTypes:!0,defaultProps:!0,displayName:!0,getDefaultProps:!0,getDerivedStateFromError:!0,getDerivedStateFromProps:!0,mixins:!0,propTypes:!0,type:!0},Ar={name:!0,length:!0,prototype:!0,caller:!0,callee:!0,arguments:!0,arity:!0},Ot={$$typeof:!0,compare:!0,defaultProps:!0,displayName:!0,propTypes:!0,type:!0},jr=((Ue={})[zr]={$$typeof:!0,render:!0,defaultProps:!0,displayName:!0,propTypes:!0},Ue[Bt]=Ot,Ue);function dt(e){return("type"in(t=e)&&t.type.$$typeof)===Bt?Ot:"$$typeof"in e?jr[e.$$typeof]:Ir;var t}var Nr=Object.defineProperty,Pr=Object.getOwnPropertyNames,lt=Object.getOwnPropertySymbols,Er=Object.getOwnPropertyDescriptor,Br=Object.getPrototypeOf,pt=Object.prototype;function Dt(e,t,r){if(typeof t!="string"){if(pt){var n=Br(t);n&&n!==pt&&Dt(e,n,r)}var o=Pr(t);lt&&(o=o.concat(lt(t)));for(var a=dt(e),i=dt(t),u=0;u<o.length;++u){var c=o[u];if(!(c in Ar||r&&r[c]||i&&c in i||a&&c in a)){var l=Er(t,c);try{Nr(e,c,l)}catch{}}}}return e}function re(e){return typeof e=="function"}function et(e){return typeof e=="object"&&"styledComponentId"in e}function W(e,t){return e&&t?"".concat(e," ").concat(t):e||t||""}function ft(e,t){if(e.length===0)return"";for(var r=e[0],n=1;n<e.length;n++)r+=e[n];return r}function de(e){return e!==null&&typeof e=="object"&&e.constructor.name===Object.name&&!("props"in e&&e.$$typeof)}function Je(e,t,r){if(r===void 0&&(r=!1),!r&&!de(e)&&!Array.isArray(e))return t;if(Array.isArray(t))for(var n=0;n<t.length;n++)e[n]=Je(e[n],t[n]);else if(de(t))for(var n in t)e[n]=Je(e[n],t[n]);return e}function tt(e,t){Object.defineProperty(e,"toString",{value:t})}function le(e){for(var t=[],r=1;r<arguments.length;r++)t[r-1]=arguments[r];return new Error("An error occurred. See https://github.com/styled-components/styled-components/blob/main/packages/styled-components/src/utils/errors.md#".concat(e," for more information.").concat(t.length>0?" Args: ".concat(t.join(", ")):""))}var Or=function(){function e(t){this.groupSizes=new Uint32Array(512),this.length=512,this.tag=t}return e.prototype.indexOfGroup=function(t){for(var r=0,n=0;n<t;n++)r+=this.groupSizes[n];return r},e.prototype.insertRules=function(t,r){if(t>=this.groupSizes.length){for(var n=this.groupSizes,o=n.length,a=o;t>=a;)if((a<<=1)<0)throw le(16,"".concat(t));this.groupSizes=new Uint32Array(a),this.groupSizes.set(n),this.length=a;for(var i=o;i<a;i++)this.groupSizes[i]=0}for(var u=this.indexOfGroup(t+1),c=(i=0,r.length);i<c;i++)this.tag.insertRule(u,r[i])&&(this.groupSizes[t]++,u++)},e.prototype.clearGroup=function(t){if(t<this.length){var r=this.groupSizes[t],n=this.indexOfGroup(t),o=n+r;this.groupSizes[t]=0;for(var a=n;a<o;a++)this.tag.deleteRule(n)}},e.prototype.getGroup=function(t){var r="";if(t>=this.length||this.groupSizes[t]===0)return r;for(var n=this.groupSizes[t],o=this.indexOfGroup(t),a=o+n,i=o;i<a;i++)r+="".concat(this.tag.getRule(i)).concat(Ke);return r},e}(),ke=new Map,Re=new Map,Se=1,be=function(e){if(ke.has(e))return ke.get(e);for(;Re.has(Se);)Se++;var t=Se++;return ke.set(e,t),Re.set(t,e),t},Dr=function(e,t){Se=t+1,ke.set(e,t),Re.set(t,e)},Fr="style[".concat(ee,"][").concat(At,'="').concat(Ne,'"]'),Tr=new RegExp("^".concat(ee,'\\.g(\\d+)\\[id="([\\w\\d-]+)"\\].*?"([^"]*)')),Ur=function(e,t,r){for(var n,o=r.split(","),a=0,i=o.length;a<i;a++)(n=o[a])&&e.registerName(t,n)},Mr=function(e,t){for(var r,n=((r=t.textContent)!==null&&r!==void 0?r:"").split(Ke),o=[],a=0,i=n.length;a<i;a++){var u=n[a].trim();if(u){var c=u.match(Tr);if(c){var l=0|parseInt(c[1],10),d=c[2];l!==0&&(Dr(d,l),Ur(e,d,c[3]),e.getTag().insertRules(l,o)),o.length=0}else o.push(u)}}},vt=function(e){for(var t=document.querySelectorAll(Fr),r=0,n=t.length;r<n;r++){var o=t[r];o&&o.getAttribute(ee)!==It&&(Mr(e,o),o.parentNode&&o.parentNode.removeChild(o))}};function Gr(){return typeof __webpack_nonce__<"u"?__webpack_nonce__:null}var Ft=function(e){var t=document.head,r=e||t,n=document.createElement("style"),o=function(u){var c=Array.from(u.querySelectorAll("style[".concat(ee,"]")));return c[c.length-1]}(r),a=o!==void 0?o.nextSibling:null;n.setAttribute(ee,It),n.setAttribute(At,Ne);var i=Gr();return i&&n.setAttribute("nonce",i),r.insertBefore(n,a),n},Lr=function(){function e(t){this.element=Ft(t),this.element.appendChild(document.createTextNode("")),this.sheet=function(r){if(r.sheet)return r.sheet;for(var n=document.styleSheets,o=0,a=n.length;o<a;o++){var i=n[o];if(i.ownerNode===r)return i}throw le(17)}(this.element),this.length=0}return e.prototype.insertRule=function(t,r){try{return this.sheet.insertRule(r,t),this.length++,!0}catch{return!1}},e.prototype.deleteRule=function(t){this.sheet.deleteRule(t),this.length--},e.prototype.getRule=function(t){var r=this.sheet.cssRules[t];return r&&r.cssText?r.cssText:""},e}(),Vr=function(){function e(t){this.element=Ft(t),this.nodes=this.element.childNodes,this.length=0}return e.prototype.insertRule=function(t,r){if(t<=this.length&&t>=0){var n=document.createTextNode(r);return this.element.insertBefore(n,this.nodes[t]||null),this.length++,!0}return!1},e.prototype.deleteRule=function(t){this.element.removeChild(this.nodes[t]),this.length--},e.prototype.getRule=function(t){return t<this.length?this.nodes[t].textContent:""},e}(),Yr=function(){function e(t){this.rules=[],this.length=0}return e.prototype.insertRule=function(t,r){return t<=this.length&&(this.rules.splice(t,0,r),this.length++,!0)},e.prototype.deleteRule=function(t){this.rules.splice(t,1),this.length--},e.prototype.getRule=function(t){return t<this.length?this.rules[t]:""},e}(),ht=_e,Wr={isServer:!_e,useCSSOMInjection:!wr},Tt=function(){function e(t,r,n){t===void 0&&(t=te),r===void 0&&(r={});var o=this;this.options=B(B({},Wr),t),this.gs=r,this.names=new Map(n),this.server=!!t.isServer,!this.server&&_e&&ht&&(ht=!1,vt(this)),tt(this,function(){return function(a){for(var i=a.getTag(),u=i.length,c="",l=function(p){var v=function($){return Re.get($)}(p);if(v===void 0)return"continue";var f=a.names.get(v),b=i.getGroup(p);if(f===void 0||!f.size||b.length===0)return"continue";var w="".concat(ee,".g").concat(p,'[id="').concat(v,'"]'),E="";f!==void 0&&f.forEach(function($){$.length>0&&(E+="".concat($,","))}),c+="".concat(b).concat(w,'{content:"').concat(E,'"}').concat(Ke)},d=0;d<u;d++)l(d);return c}(o)})}return e.registerId=function(t){return be(t)},e.prototype.rehydrate=function(){!this.server&&_e&&vt(this)},e.prototype.reconstructWithOptions=function(t,r){return r===void 0&&(r=!0),new e(B(B({},this.options),t),this.gs,r&&this.names||void 0)},e.prototype.allocateGSInstance=function(t){return this.gs[t]=(this.gs[t]||0)+1},e.prototype.getTag=function(){return this.tag||(this.tag=(t=function(r){var n=r.useCSSOMInjection,o=r.target;return r.isServer?new Yr(o):n?new Lr(o):new Vr(o)}(this.options),new Or(t)));var t},e.prototype.hasNameForId=function(t,r){return this.names.has(t)&&this.names.get(t).has(r)},e.prototype.registerName=function(t,r){if(be(t),this.names.has(t))this.names.get(t).add(r);else{var n=new Set;n.add(r),this.names.set(t,n)}},e.prototype.insertRules=function(t,r,n){this.registerName(t,r),this.getTag().insertRules(be(t),n)},e.prototype.clearNames=function(t){this.names.has(t)&&this.names.get(t).clear()},e.prototype.clearRules=function(t){this.getTag().clearGroup(be(t)),this.clearNames(t)},e.prototype.clearTag=function(){this.tag=void 0},e}(),Hr=/&/g,Jr=/^\s*\/\/.*$/gm;function Ut(e,t){return e.map(function(r){return r.type==="rule"&&(r.value="".concat(t," ").concat(r.value),r.value=r.value.replaceAll(",",",".concat(t," ")),r.props=r.props.map(function(n){return"".concat(t," ").concat(n)})),Array.isArray(r.children)&&r.type!=="@keyframes"&&(r.children=Ut(r.children,t)),r})}function Xr(e){var t,r,n,o=te,a=o.options,i=a===void 0?te:a,u=o.plugins,c=u===void 0?Pe:u,l=function(v,f,b){return b.startsWith(r)&&b.endsWith(r)&&b.replaceAll(r,"").length>0?".".concat(t):v},d=c.slice();d.push(function(v){v.type===ze&&v.value.includes("&")&&(v.props[0]=v.props[0].replace(Hr,r).replace(n,l))}),i.prefix&&d.push(yr),d.push(gr);var p=function(v,f,b,w){f===void 0&&(f=""),b===void 0&&(b=""),w===void 0&&(w="&"),t=w,r=f,n=new RegExp("\\".concat(r,"\\b"),"g");var E=v.replace(Jr,""),$=vr(b||f?"".concat(b," ").concat(f," { ").concat(E," }"):E);i.namespace&&($=Ut($,i.namespace));var _=[];return $e($,br(d.concat(mr(function(x){return _.push(x)})))),_};return p.hash=c.length?c.reduce(function(v,f){return f.name||le(15),Q(v,f.name)},Nt).toString():"",p}var Qr=new Tt,Xe=Xr(),Mt=Z.createContext({shouldForwardProp:void 0,styleSheet:Qr,stylis:Xe});Mt.Consumer;Z.createContext(void 0);function gt(){return S.useContext(Mt)}var Zr=function(){function e(t,r){var n=this;this.inject=function(o,a){a===void 0&&(a=Xe);var i=n.name+a.hash;o.hasNameForId(n.id,i)||o.insertRules(n.id,i,a(n.rules,i,"@keyframes"))},this.name=t,this.id="sc-keyframes-".concat(t),this.rules=r,tt(this,function(){throw le(12,String(n.name))})}return e.prototype.getName=function(t){return t===void 0&&(t=Xe),this.name+t.hash},e}(),qr=function(e){return e>="A"&&e<="Z"};function bt(e){for(var t="",r=0;r<e.length;r++){var n=e[r];if(r===1&&n==="-"&&e[0]==="-")return e;qr(n)?t+="-"+n.toLowerCase():t+=n}return t.startsWith("ms-")?"-"+t:t}var Gt=function(e){return e==null||e===!1||e===""},Lt=function(e){var t,r,n=[];for(var o in e){var a=e[o];e.hasOwnProperty(o)&&!Gt(a)&&(Array.isArray(a)&&a.isCss||re(a)?n.push("".concat(bt(o),":"),a,";"):de(a)?n.push.apply(n,Ce(Ce(["".concat(o," {")],Lt(a),!1),["}"],!1)):n.push("".concat(bt(o),": ").concat((t=o,(r=a)==null||typeof r=="boolean"||r===""?"":typeof r!="number"||r===0||t in xr||t.startsWith("--")?String(r).trim():"".concat(r,"px")),";")))}return n};function J(e,t,r,n){if(Gt(e))return[];if(et(e))return[".".concat(e.styledComponentId)];if(re(e)){if(!re(a=e)||a.prototype&&a.prototype.isReactComponent||!t)return[e];var o=e(t);return J(o,t,r,n)}var a;return e instanceof Zr?r?(e.inject(r,n),[e.getName(n)]):[e]:de(e)?Lt(e):Array.isArray(e)?Array.prototype.concat.apply(Pe,e.map(function(i){return J(i,t,r,n)})):[e.toString()]}function Kr(e){for(var t=0;t<e.length;t+=1){var r=e[t];if(re(r)&&!et(r))return!1}return!0}var en=Pt(Ne),tn=function(){function e(t,r,n){this.rules=t,this.staticRulesId="",this.isStatic=(n===void 0||n.isStatic)&&Kr(t),this.componentId=r,this.baseHash=Q(en,r),this.baseStyle=n,Tt.registerId(r)}return e.prototype.generateAndInjectStyles=function(t,r,n){var o=this.baseStyle?this.baseStyle.generateAndInjectStyles(t,r,n):"";if(this.isStatic&&!n.hash)if(this.staticRulesId&&r.hasNameForId(this.componentId,this.staticRulesId))o=W(o,this.staticRulesId);else{var a=ft(J(this.rules,t,r,n)),i=He(Q(this.baseHash,a)>>>0);if(!r.hasNameForId(this.componentId,i)){var u=n(a,".".concat(i),void 0,this.componentId);r.insertRules(this.componentId,i,u)}o=W(o,i),this.staticRulesId=i}else{for(var c=Q(this.baseHash,n.hash),l="",d=0;d<this.rules.length;d++){var p=this.rules[d];if(typeof p=="string")l+=p;else if(p){var v=ft(J(p,t,r,n));c=Q(c,v+d),l+=v}}if(l){var f=He(c>>>0);r.hasNameForId(this.componentId,f)||r.insertRules(this.componentId,f,n(l,".".concat(f),void 0,this.componentId)),o=W(o,f)}}return o},e}(),Vt=Z.createContext(void 0);Vt.Consumer;var Ge={};function rn(e,t,r){var n=et(e),o=e,a=!Me(e),i=t.attrs,u=i===void 0?Pe:i,c=t.componentId,l=c===void 0?function(R,I){var y=typeof R!="string"?"sc":ct(R);Ge[y]=(Ge[y]||0)+1;var s="".concat(y,"-").concat(_r(Ne+y+Ge[y]));return I?"".concat(I,"-").concat(s):s}(t.displayName,t.parentComponentId):c,d=t.displayName,p=d===void 0?function(R){return Me(R)?"styled.".concat(R):"Styled(".concat(Rr(R),")")}(e):d,v=t.displayName&&t.componentId?"".concat(ct(t.displayName),"-").concat(t.componentId):t.componentId||l,f=n&&o.attrs?o.attrs.concat(u).filter(Boolean):u,b=t.shouldForwardProp;if(n&&o.shouldForwardProp){var w=o.shouldForwardProp;if(t.shouldForwardProp){var E=t.shouldForwardProp;b=function(R,I){return w(R,I)&&E(R,I)}}else b=w}var $=new tn(r,v,n?o.componentStyle:void 0);function _(R,I){return function(y,s,z){var j=y.attrs,Ee=y.componentStyle,Be=y.defaultProps,Qt=y.foldedComponentIds,Zt=y.styledComponentId,qt=y.target,Kt=Z.useContext(Vt),er=gt(),Oe=y.shouldForwardProp||er.shouldForwardProp,rt=kr(s,Kt,Be)||te,U=function(fe,ae,ve){for(var ie,Y=B(B({},ae),{className:void 0,theme:ve}),Fe=0;Fe<fe.length;Fe+=1){var he=re(ie=fe[Fe])?ie(Y):ie;for(var L in he)Y[L]=L==="className"?W(Y[L],he[L]):L==="style"?B(B({},Y[L]),he[L]):he[L]}return ae.className&&(Y.className=W(Y.className,ae.className)),Y}(j,s,rt),pe=U.as||qt,oe={};for(var G in U)U[G]===void 0||G[0]==="$"||G==="as"||G==="theme"&&U.theme===rt||(G==="forwardedAs"?oe.as=U.forwardedAs:Oe&&!Oe(G,pe)||(oe[G]=U[G]));var nt=function(fe,ae){var ve=gt(),ie=fe.generateAndInjectStyles(ae,ve.styleSheet,ve.stylis);return ie}(Ee,U),De=W(Qt,Zt);return nt&&(De+=" "+nt),U.className&&(De+=" "+U.className),oe[Me(pe)&&!jt.has(pe)?"class":"className"]=De,oe.ref=z,S.createElement(pe,oe)}(x,R,I)}_.displayName=p;var x=Z.forwardRef(_);return x.attrs=f,x.componentStyle=$,x.displayName=p,x.shouldForwardProp=b,x.foldedComponentIds=n?W(o.foldedComponentIds,o.styledComponentId):"",x.styledComponentId=v,x.target=n?o.target:e,Object.defineProperty(x,"defaultProps",{get:function(){return this._foldedDefaultProps},set:function(R){this._foldedDefaultProps=n?function(I){for(var y=[],s=1;s<arguments.length;s++)y[s-1]=arguments[s];for(var z=0,j=y;z<j.length;z++)Je(I,j[z],!0);return I}({},o.defaultProps,R):R}}),tt(x,function(){return".".concat(x.styledComponentId)}),a&&Dt(x,e,{attrs:!0,componentStyle:!0,displayName:!0,foldedComponentIds:!0,shouldForwardProp:!0,styledComponentId:!0,target:!0}),x}function mt(e,t){for(var r=[e[0]],n=0,o=t.length;n<o;n+=1)r.push(t[n],e[n+1]);return r}var yt=function(e){return Object.assign(e,{isCss:!0})};function nn(e){for(var t=[],r=1;r<arguments.length;r++)t[r-1]=arguments[r];if(re(e)||de(e))return yt(J(mt(Pe,Ce([e],t,!0))));var n=e;return t.length===0&&n.length===1&&typeof n[0]=="string"?J(n):yt(J(mt(n,t)))}function Qe(e,t,r){if(r===void 0&&(r=te),!t)throw le(1,t);var n=function(o){for(var a=[],i=1;i<arguments.length;i++)a[i-1]=arguments[i];return e(t,r,nn.apply(void 0,Ce([o],a,!1)))};return n.attrs=function(o){return Qe(e,t,B(B({},r),{attrs:Array.prototype.concat(r.attrs,o).filter(Boolean)}))},n.withConfig=function(o){return Qe(e,t,B(B({},r),o))},n}var Yt=function(e){return Qe(rn,e)},g=Yt;jt.forEach(function(e){g[e]=Yt(e)});g.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: var(--vscode-badge-background);
  border: 1px solid var(--vscode-button-border);
  border-radius: 11px;
  box-sizing: border-box;
  color: var(--vscode-badge-foreground);
  font-family: var(--vscode-font-family);
  font-size: 11px;
  line-height: 16px;
  height: 16px;
  min-width: 18px;
  min-height: 18px;
  padding: 3px 6px;
  text-align: center;
`;const on=g.button`
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
`,an=({appearance:e="primary",className:t,children:r,disabled:n=!1,type:o="button",onClick:a=void 0,...i})=>C.jsx(on,{className:`vscrui-button ${e} ${t||""}`,disabled:n,onClick:a,type:o,...i,children:r});an.displayName="VSCRUI_Badge";var P=[];for(var Le=0;Le<256;++Le)P.push((Le+256).toString(16).slice(1));function sn(e,t=0){return(P[e[t+0]]+P[e[t+1]]+P[e[t+2]]+P[e[t+3]]+"-"+P[e[t+4]]+P[e[t+5]]+"-"+P[e[t+6]]+P[e[t+7]]+"-"+P[e[t+8]]+P[e[t+9]]+"-"+P[e[t+10]]+P[e[t+11]]+P[e[t+12]]+P[e[t+13]]+P[e[t+14]]+P[e[t+15]]).toLowerCase()}var me,cn=new Uint8Array(16);function un(){if(!me&&(me=typeof crypto<"u"&&crypto.getRandomValues&&crypto.getRandomValues.bind(crypto),!me))throw new Error("crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported");return me(cn)}var dn=typeof crypto<"u"&&crypto.randomUUID&&crypto.randomUUID.bind(crypto);const xt={randomUUID:dn};function ln(e,t,r){if(xt.randomUUID&&!e)return xt.randomUUID();e=e||{};var n=e.random||(e.rng||un)();return n[6]=n[6]&15|64,n[8]=n[8]&63|128,sn(n)}function Wt(){const[e,t]=S.useState("");return S.useEffect(()=>{t(ln())},[]),e}const pn=g.label`
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
`,Ht=g.svg`
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
`,fn=g.span`
  padding-left: 10px;
`,vn=({checked:e})=>C.jsx(Ht,{width:"16",height:"16",viewBox:"0 0 16 16",xmlns:"http://www.w3.org/2000/svg",fill:e?"currentColor":"transparent",children:C.jsx("path",{fillRule:"evenodd",clipRule:"evenodd",d:"M14.431 3.323l-8.47 10-.79-.036-3.35-4.77.818-.574 2.978 4.24 8.051-9.506.764.646z"})}),hn=()=>C.jsx(Ht,{width:"16",height:"16",viewBox:"0 0 16 16",xmlns:"http://www.w3.org/2000/svg",fill:"currentColor",children:C.jsx("rect",{x:"4",y:"4",height:"8",width:"8",rx:"2"})}),gn=({checked:e,children:t,className:r,indeterminate:n,disabled:o,onChange:a,...i})=>{const[u,c]=S.useState(!!e),l=S.useRef(null),d=Wt(),p=v=>{c(v.target.checked),a&&a(v.target.checked)};return S.useEffect(()=>{c(!!e)},[e]),S.useEffect(()=>{l.current&&(l.current.indeterminate=n===!0)},[n]),C.jsxs(pn,{htmlFor:d,className:`vscrui-checkbox ${r||""} ${o?"disabled":""}`,...i,children:[C.jsx("input",{id:d,ref:l,type:"checkbox",checked:u,disabled:o,onChange:p}),n===!0?C.jsx(hn,{}):C.jsx(vn,{checked:u}),t&&C.jsx(fn,{className:"vscrui-checkbox__label",children:t})]})};gn.displayName="VSCRUI_Checkbox";g.hr`
  border: none;
  border-top: 1px solid var(--vscode-settings-dropdownListBorder);
  box-sizing: content-box;
  height: 0;
  margin: 4px 0;
  width: 100%;
`;const bn=g.div`
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
`,mn=g.button`
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
`,yn=g.div`
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
`,xn=g.button`
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
`,wn=({className:e,disabled:t,open:r,value:n,options:o=[],placeholder:a="",position:i="below",onChange:u,...c})=>{const[l,d]=S.useState(void 0),[p,v]=S.useState(null),[f,b]=S.useState(r),w=S.useRef(null),E=S.useCallback(s=>{w.current&&!w.current.contains(s.target)&&(b(!1),v(null))},[w]),$=S.useCallback(s=>{if(s!==l){const z=o.find(j=>(typeof j=="string"?j:j.value)===s);d(s),u&&u(z)}b(!1)},[l]),_=S.useCallback(s=>{if(f&&s.preventDefault(),f&&s.key==="Escape")b(!1);else if(f&&s.key==="ArrowDown")v(p===null?0:Math.min(p+1,o.length-1));else if(f&&s.key==="ArrowUp")v(p===null?o.length-1:Math.max(p-1,0));else if(f&&s.key==="Enter"){const z=o[p||0],j=typeof z=="string"?z:z.value;b(!1),$(j)}},[p,f,$]),x=S.useMemo(()=>t||o.length===0,[t,o]),R=S.useMemo(()=>o.length>0?typeof o[0]=="string"?o[0]:o[0].value:"",[o]),I=S.useCallback(()=>{!t&&o.length>0&&b(!f)},[t,o,f]),y=S.useMemo(()=>{if(l&&l){const s=o.find(z=>(typeof z=="string"?z:z.value)===l);return s?typeof s=="string"?s:s.label:void 0}},[l,o]);return S.useEffect(()=>{b(!!r)},[r]),S.useEffect(()=>(f&&document.addEventListener("mousedown",E),()=>{document.removeEventListener("mousedown",E)}),[f]),S.useEffect(()=>{if(n!==void 0){const s=typeof n=="string"?n:n.value;d(s);const z=o.findIndex(j=>(typeof j=="string"?j:j.value)===n);v(z)}else d(""),v(null)},[n,o]),C.jsxs(bn,{className:`vscrui-dropdown ${x?"disabled":""} ${e||""}`,onKeyDown:_,ref:w,...c,children:[C.jsxs(mn,{className:`vscrui-checkbox__trigger ${f?"open":""}`,disabled:x,onClick:I,children:[C.jsx("span",{children:y||a||R}),C.jsx("svg",{width:"16",height:"16",viewBox:"0 0 16 16",xmlns:"http://www.w3.org/2000/svg",fill:"currentColor",children:C.jsx("path",{fillRule:"evenodd",clipRule:"evenodd",d:"M7.976 10.072l4.357-4.357.62.618L8.284 11h-.618L3 6.333l.619-.618 4.357 4.357z"})})]}),f&&!x&&C.jsx(yn,{className:"vscrui-checkbox__listbox",position:i,children:C.jsx("ul",{children:o.map((s,z)=>{const j=typeof s=="string"?s:s.value,Ee=typeof s=="string"?s:s.label,Be=typeof s=="string"?!1:s.disabled;return C.jsx("li",{onMouseEnter:()=>v(z),children:C.jsx(xn,{className:`vscrui-checkbox__listbox__item ${p===null&&l===j||p===z?"active":""}`,"aria-selected":l===j?"true":"false",disabled:Be,onClick:()=>$(j),children:Ee},z)},z)})})})]})};wn.displayName="VSCRUI_Dropdown";const kn=g.i`
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
`,Sn=({className:e,name:t,spin:r=!1,size:n=16,...o})=>{const a=S.useMemo(()=>typeof n=="number"?`${n}px`:n,[n]);return C.jsx(kn,{className:`vscrui-icon codicon codicon-${t} ${r?"codicon-spin":""} ${e||""}`,style:{fontSize:a},...o})};Sn.displayName="VSCRUI_Icon";const Cn=g.label`
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
`,Jt=({children:e,className:t,...r})=>C.jsx(Cn,{className:`vscrui-label ${t||""}`,...r,children:e});Jt.displayName="VSCRUI_Label";g.div`
  background: var(--vscode-editor-background);
  position: fixed;
  inset: 0;
  height: 100%;
  width: 100%;
  z-index: 9999;
  opacity: 0.75;
`;g.div`
  position: absolute;
  top: 0;
  width: 100%;
  height: 2px;
`;g.div`
  height: 100%;
  position: absolute;
  background: var(--vscode-activityBarBadge-background);
  animation: vscode-loader 4s ease-in-out infinite; 

  @keyframes vscode-loader {
    0% {
      left: -30px;
      width: 30px;
    }
    25% {
      width: 50px;
    }
    50% {
      width: 20px;
    }
    75% {
      width: 50px;
    }
    100% {
      width: 20px;
      left: 100%;
    }
  }
`;const $n=g.section`
  color: inherit;
  background-color: transparent;
  border: 1px solid transparent;
  box-sizing: border-box;
  font-size: var(--vscode-font-size, 13px);
  line-height: normal;
  padding: 10px 6px;
  display: ${e=>e.hidden?"none":"block"};
  height: ${e=>e.hidden?"0":"auto"};
  transition: all 0.1s;
  transition-behavior: allow-discrete;
`,Xt=({className:e,children:t,isVisible:r=!1,...n})=>C.jsx($n,{className:`vscrui-view ${e||""}`,hidden:!r,...n,children:t});Xt.displayName="VSCRUI_View";const _n=g.div`
  display: none;
  margin-left: auto;
`;g.div`
  font-family: var(--vscode-font-family);
  font-size: 11px;
  font-weight: 700;
  color: var(--vscode-sideBarSectionHeader-foreground);
  background-color: var(--vscode-sideBarSectionHeader-background);
  border-top: 1px solid var(--vscode-sideBarSectionHeader-border);
  text-transform: uppercase;

  box-sizing: border-box;
  display: flex;
  align-items: center;
  height: 22px;
  line-height: 22px;
  width: 100%;
  cursor: pointer;

  position: relative;
  overflow: hidden;
  user-select: none;

  > svg {
    color: var(--vscode-icon-foreground);
    margin: 0 2px;
  }

  &:hover {
    ${_n} {
      display: flex;
    }
  }
`;g.h3`
  font-size: 11px;
  font-weight: 700;
  min-width: 3ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin: 0;
`;g.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 100%;
`;g(Xt)`
  flex: 1;
  overflow: hidden;
  padding: unset;
`;g.button`
  all: unset;

  color: var(--vscode-icon-foreground);
  font-size: 16px;
  padding: 2px;
  margin-right: 4px;

  background: none;
  border: none;
  cursor: pointer;
  border-radius: 2px;

  align-items: center;
  display: flex;
  height: 16px;
  width: 16px;

  &:hover {
    background-color: var(--vscode-toolbar-hoverBackground);
  }
`;g.button`
  all: unset;
  color: var(--vscode-panelTitle-inactiveForeground);
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size, 13px);
  box-sizing: border-box;
  height: 28px;
  padding: 4px 0;
  fill: currentcolor;
  border-radius: 2px;
  border: 1px solid transparent;
  align-items: center;
  justify-content: center;
  grid-row: 1;
  cursor: pointer;

  &:hover, &:active, &[aria-selected='true'], &[aria-selected='true']:hover, &[aria-selected='true']:active {
    background: transparent;
    color: var(--vscode-panelTitle-activeForeground);
		fill: currentcolor;
  }

  &[aria-selected='true'] {
    border-bottom: 1px solid var(--vscode-panelTitle-activeForeground);
  }

  &:focus-visible {
    outline: none;
		border: 1px solid var(--vscode-panelTitle-activeBorder);
  }

  &:focus {
    outline: none;
  }
`;g.div`
  color: var(--vscode-badge-foreground);
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size, 13px);
  box-sizing: border-box;
  line-height: normal;
  grid-template-columns: auto 1fr auto;
  grid-template-rows: auto 1fr;
  overflow-x: auto;
`;g.div`
  display: grid;
  grid-template-rows: auto auto;
  grid-template-columns: auto;
  column-gap: 32px;
  position: relative;
  width: max-content;
  align-self: end;
  padding: 4px 4px 0;
  box-sizing: border-box;
`;g.div`
  grid-row: 2;
  grid-column-start: 1;
  grid-column-end: 4;
  position: relative;
`;g.div`
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
  color: var(--vscode-badge-foreground);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: var(--vscode-badge-background);
  border: 1px solid var(--vscode-button-border);
  border-radius: 2px;
  padding: 2px 4px;
  text-transform: uppercase;
`;const Rn=g.div`
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
  display: inline-block;
  min-width: 100px;
`,zn=g(Jt)`
  margin-bottom: 2px;
`,In=g.input`
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
`,An=({className:e,children:t,disabled:r,readonly:n,value:o,onChange:a,placeholder:i,...u})=>{const[c,l]=S.useState(o),d=Wt(),p=v=>{l(v.target.value),a&&a(v.target.value)};return S.useEffect(()=>{l(o)},[o]),C.jsxs(Rn,{className:`vscrui-textfield ${e||""}`,...u,children:[t&&C.jsx(zn,{htmlFor:d,children:t}),C.jsx(In,{type:"text",id:d,className:"vscrui-textfield__input",defaultValue:c,placeholder:i,disabled:r,readOnly:n,onChange:p})]})};An.displayName="VSCRUI_TextField";export{wn as I,gn as j,Sn as l,an as v,An as y};
