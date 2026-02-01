import{j as m}from"./jsx-runtime-DF2Pcvd1.js";import{R as K,r as S}from"./index-B2-qRKKC.js";var B={},Ct={exports:{}},le={};/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var ct;function sr(){if(ct)return le;ct=1;var e=K,t=Symbol.for("react.element"),r=Symbol.for("react.fragment"),n=Object.prototype.hasOwnProperty,o=e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,a={key:!0,ref:!0,__self:!0,__source:!0};function i(s,l,u){var d,f={},v=null,h=null;u!==void 0&&(v=""+u),l.key!==void 0&&(v=""+l.key),l.ref!==void 0&&(h=l.ref);for(d in l)n.call(l,d)&&!a.hasOwnProperty(d)&&(f[d]=l[d]);if(s&&s.defaultProps)for(d in l=s.defaultProps,l)f[d]===void 0&&(f[d]=l[d]);return{$$typeof:t,type:s,key:v,ref:h,props:f,_owner:o.current}}return le.Fragment=r,le.jsx=i,le.jsxs=i,le}Ct.exports=sr();var R=Ct.exports,F=function(){return F=Object.assign||function(e){for(var t,r=1,n=arguments.length;r<n;r++){t=arguments[r];for(var o in t)Object.prototype.hasOwnProperty.call(t,o)&&(e[o]=t[o])}return e},F.apply(this,arguments)};function Ae(e,t,r){if(r||arguments.length===2)for(var n=0,o=t.length,a;n<o;n++)(a||!(n in t))&&(a||(a=Array.prototype.slice.call(t,0,n)),a[n]=t[n]);return e.concat(a||Array.prototype.slice.call(t))}var A="-ms-",pe="-moz-",k="-webkit-",jt="comm",Ie="rule",tt="decl",cr="@import",At="@keyframes",lr="@layer",Rt=Math.abs,rt=String.fromCharCode,Ye=Object.assign;function dr(e,t){return P(e,0)^45?(((t<<2^P(e,0))<<2^P(e,1))<<2^P(e,2))<<2^P(e,3):0}function $t(e){return e.trim()}function U(e,t){return(e=t.exec(e))?e[0]:e}function g(e,t,r){return e.replace(t,r)}function ke(e,t,r){return e.indexOf(t,r)}function P(e,t){return e.charCodeAt(t)|0}function ee(e,t,r){return e.slice(t,r)}function M(e){return e.length}function Nt(e){return e.length}function de(e,t){return t.push(e),e}function ur(e,t){return e.map(t).join("")}function lt(e,t){return e.filter(function(r){return!U(r,t)})}var ze=1,te=1,It=0,O=0,I=0,ae="";function Ee(e,t,r,n,o,a,i,s){return{value:e,root:t,parent:r,type:n,props:o,children:a,line:ze,column:te,length:i,return:"",siblings:s}}function W(e,t){return Ye(Ee("",null,null,"",null,null,0,e.siblings),e,{length:-e.length},t)}function X(e){for(;e.root;)e=W(e.root,{children:[e]});de(e,e.siblings)}function pr(){return I}function fr(){return I=O>0?P(ae,--O):0,te--,I===10&&(te=1,ze--),I}function D(){return I=O<It?P(ae,O++):0,te++,I===10&&(te=1,ze++),I}function q(){return P(ae,O)}function Se(){return O}function Pe(e,t){return ee(ae,e,t)}function Qe(e){switch(e){case 0:case 9:case 10:case 13:case 32:return 5;case 33:case 43:case 44:case 47:case 62:case 64:case 126:case 59:case 123:case 125:return 4;case 58:return 3;case 34:case 39:case 40:case 91:return 2;case 41:case 93:return 1}return 0}function hr(e){return ze=te=1,It=M(ae=e),O=0,[]}function vr(e){return ae="",e}function Ue(e){return $t(Pe(O-1,qe(e===91?e+2:e===40?e+1:e)))}function gr(e){for(;(I=q())&&I<33;)D();return Qe(e)>2||Qe(I)>3?"":" "}function mr(e,t){for(;--t&&D()&&!(I<48||I>102||I>57&&I<65||I>70&&I<97););return Pe(e,Se()+(t<6&&q()==32&&D()==32))}function qe(e){for(;D();)switch(I){case e:return O;case 34:case 39:e!==34&&e!==39&&qe(I);break;case 40:e===41&&qe(e);break;case 92:D();break}return O}function br(e,t){for(;D()&&e+I!==57&&!(e+I===84&&q()===47););return"/*"+Pe(t,O-1)+"*"+rt(e===47?e:D())}function yr(e){for(;!Qe(q());)D();return Pe(e,O)}function xr(e){return vr(_e("",null,null,null,[""],e=hr(e),0,[0],e))}function _e(e,t,r,n,o,a,i,s,l){for(var u=0,d=0,f=i,v=0,h=0,y=0,x=1,z=1,C=1,p=0,b="",j=o,N=a,_=n,c=b;z;)switch(y=p,p=D()){case 40:if(y!=108&&P(c,f-1)==58){ke(c+=g(Ue(p),"&","&\f"),"&\f",Rt(u?s[u-1]:0))!=-1&&(C=-1);break}case 34:case 39:case 91:c+=Ue(p);break;case 9:case 10:case 13:case 32:c+=gr(y);break;case 92:c+=mr(Se()-1,7);continue;case 47:switch(q()){case 42:case 47:de(wr(br(D(),Se()),t,r,l),l);break;default:c+="/"}break;case 123*x:s[u++]=M(c)*C;case 125*x:case 59:case 0:switch(p){case 0:case 125:z=0;case 59+d:C==-1&&(c=g(c,/\f/g,"")),h>0&&M(c)-f&&de(h>32?ut(c+";",n,r,f-1,l):ut(g(c," ","")+";",n,r,f-2,l),l);break;case 59:c+=";";default:if(de(_=dt(c,t,r,u,d,o,s,b,j=[],N=[],f,a),a),p===123)if(d===0)_e(c,t,_,_,j,a,f,s,N);else switch(v===99&&P(c,3)===110?100:v){case 100:case 108:case 109:case 115:_e(e,_,_,n&&de(dt(e,_,_,0,0,o,s,b,o,j=[],f,N),N),o,N,f,s,n?j:N);break;default:_e(c,_,_,_,[""],N,0,s,N)}}u=d=h=0,x=C=1,b=c="",f=i;break;case 58:f=1+M(c),h=y;default:if(x<1){if(p==123)--x;else if(p==125&&x++==0&&fr()==125)continue}switch(c+=rt(p),p*x){case 38:C=d>0?1:(c+="\f",-1);break;case 44:s[u++]=(M(c)-1)*C,C=1;break;case 64:q()===45&&(c+=Ue(D())),v=q(),d=f=M(b=c+=yr(Se())),p++;break;case 45:y===45&&M(c)==2&&(x=0)}}return a}function dt(e,t,r,n,o,a,i,s,l,u,d,f){for(var v=o-1,h=o===0?a:[""],y=Nt(h),x=0,z=0,C=0;x<n;++x)for(var p=0,b=ee(e,v+1,v=Rt(z=i[x])),j=e;p<y;++p)(j=$t(z>0?h[p]+" "+b:g(b,/&\f/g,h[p])))&&(l[C++]=j);return Ee(e,t,r,o===0?Ie:s,l,u,d,f)}function wr(e,t,r,n){return Ee(e,t,r,jt,rt(pr()),ee(e,2,-2),0,n)}function ut(e,t,r,n,o){return Ee(e,t,r,tt,ee(e,0,n),ee(e,n+1,-1),n,o)}function zt(e,t,r){switch(dr(e,t)){case 5103:return k+"print-"+e+e;case 5737:case 4201:case 3177:case 3433:case 1641:case 4457:case 2921:case 5572:case 6356:case 5844:case 3191:case 6645:case 3005:case 6391:case 5879:case 5623:case 6135:case 4599:case 4855:case 4215:case 6389:case 5109:case 5365:case 5621:case 3829:return k+e+e;case 4789:return pe+e+e;case 5349:case 4246:case 4810:case 6968:case 2756:return k+e+pe+e+A+e+e;case 5936:switch(P(e,t+11)){case 114:return k+e+A+g(e,/[svh]\w+-[tblr]{2}/,"tb")+e;case 108:return k+e+A+g(e,/[svh]\w+-[tblr]{2}/,"tb-rl")+e;case 45:return k+e+A+g(e,/[svh]\w+-[tblr]{2}/,"lr")+e}case 6828:case 4268:case 2903:return k+e+A+e+e;case 6165:return k+e+A+"flex-"+e+e;case 5187:return k+e+g(e,/(\w+).+(:[^]+)/,k+"box-$1$2"+A+"flex-$1$2")+e;case 5443:return k+e+A+"flex-item-"+g(e,/flex-|-self/g,"")+(U(e,/flex-|baseline/)?"":A+"grid-row-"+g(e,/flex-|-self/g,""))+e;case 4675:return k+e+A+"flex-line-pack"+g(e,/align-content|flex-|-self/g,"")+e;case 5548:return k+e+A+g(e,"shrink","negative")+e;case 5292:return k+e+A+g(e,"basis","preferred-size")+e;case 6060:return k+"box-"+g(e,"-grow","")+k+e+A+g(e,"grow","positive")+e;case 4554:return k+g(e,/([^-])(transform)/g,"$1"+k+"$2")+e;case 6187:return g(g(g(e,/(zoom-|grab)/,k+"$1"),/(image-set)/,k+"$1"),e,"")+e;case 5495:case 3959:return g(e,/(image-set\([^]*)/,k+"$1$`$1");case 4968:return g(g(e,/(.+:)(flex-)?(.*)/,k+"box-pack:$3"+A+"flex-pack:$3"),/s.+-b[^;]+/,"justify")+k+e+e;case 4200:if(!U(e,/flex-|baseline/))return A+"grid-column-align"+ee(e,t)+e;break;case 2592:case 3360:return A+g(e,"template-","")+e;case 4384:case 3616:return r&&r.some(function(n,o){return t=o,U(n.props,/grid-\w+-end/)})?~ke(e+(r=r[t].value),"span",0)?e:A+g(e,"-start","")+e+A+"grid-row-span:"+(~ke(r,"span",0)?U(r,/\d+/):+U(r,/\d+/)-+U(e,/\d+/))+";":A+g(e,"-start","")+e;case 4896:case 4128:return r&&r.some(function(n){return U(n.props,/grid-\w+-start/)})?e:A+g(g(e,"-end","-span"),"span ","")+e;case 4095:case 3583:case 4068:case 2532:return g(e,/(.+)-inline(.+)/,k+"$1$2")+e;case 8116:case 7059:case 5753:case 5535:case 5445:case 5701:case 4933:case 4677:case 5533:case 5789:case 5021:case 4765:if(M(e)-1-t>6)switch(P(e,t+1)){case 109:if(P(e,t+4)!==45)break;case 102:return g(e,/(.+:)(.+)-([^]+)/,"$1"+k+"$2-$3$1"+pe+(P(e,t+3)==108?"$3":"$2-$3"))+e;case 115:return~ke(e,"stretch",0)?zt(g(e,"stretch","fill-available"),t,r)+e:e}break;case 5152:case 5920:return g(e,/(.+?):(\d+)(\s*\/\s*(span)?\s*(\d+))?(.*)/,function(n,o,a,i,s,l,u){return A+o+":"+a+u+(i?A+o+"-span:"+(s?l:+l-+a)+u:"")+e});case 4949:if(P(e,t+6)===121)return g(e,":",":"+k)+e;break;case 6444:switch(P(e,P(e,14)===45?18:11)){case 120:return g(e,/(.+:)([^;\s!]+)(;|(\s+)?!.+)?/,"$1"+k+(P(e,14)===45?"inline-":"")+"box$3$1"+k+"$2$3$1"+A+"$2box$3")+e;case 100:return g(e,":",":"+A)+e}break;case 5719:case 2647:case 2135:case 3927:case 2391:return g(e,"scroll-","scroll-snap-")+e}return e}function Re(e,t){for(var r="",n=0;n<e.length;n++)r+=t(e[n],n,e,t)||"";return r}function kr(e,t,r,n){switch(e.type){case lr:if(e.children.length)break;case cr:case tt:return e.return=e.return||e.value;case jt:return"";case At:return e.return=e.value+"{"+Re(e.children,n)+"}";case Ie:if(!M(e.value=e.props.join(",")))return""}return M(r=Re(e.children,n))?e.return=e.value+"{"+r+"}":""}function Sr(e){var t=Nt(e);return function(r,n,o,a){for(var i="",s=0;s<t;s++)i+=e[s](r,n,o,a)||"";return i}}function _r(e){return function(t){t.root||(t=t.return)&&e(t)}}function Cr(e,t,r,n){if(e.length>-1&&!e.return)switch(e.type){case tt:e.return=zt(e.value,e.length,r);return;case At:return Re([W(e,{value:g(e.value,"@","@"+k)})],n);case Ie:if(e.length)return ur(r=e.props,function(o){switch(U(o,n=/(::plac\w+|:read-\w+)/)){case":read-only":case":read-write":X(W(e,{props:[g(o,/:(read-\w+)/,":"+pe+"$1")]})),X(W(e,{props:[o]})),Ye(e,{props:lt(r,n)});break;case"::placeholder":X(W(e,{props:[g(o,/:(plac\w+)/,":"+k+"input-$1")]})),X(W(e,{props:[g(o,/:(plac\w+)/,":"+pe+"$1")]})),X(W(e,{props:[g(o,/:(plac\w+)/,A+"input-$1")]})),X(W(e,{props:[o]})),Ye(e,{props:lt(r,n)});break}return""})}}var jr={animationIterationCount:1,aspectRatio:1,borderImageOutset:1,borderImageSlice:1,borderImageWidth:1,boxFlex:1,boxFlexGroup:1,boxOrdinalGroup:1,columnCount:1,columns:1,flex:1,flexGrow:1,flexPositive:1,flexShrink:1,flexNegative:1,flexOrder:1,gridRow:1,gridRowEnd:1,gridRowSpan:1,gridRowStart:1,gridColumn:1,gridColumnEnd:1,gridColumnSpan:1,gridColumnStart:1,msGridRow:1,msGridRowSpan:1,msGridColumn:1,msGridColumnSpan:1,fontWeight:1,lineHeight:1,opacity:1,order:1,orphans:1,tabSize:1,widows:1,zIndex:1,zoom:1,WebkitLineClamp:1,fillOpacity:1,floodOpacity:1,stopOpacity:1,strokeDasharray:1,strokeDashoffset:1,strokeMiterlimit:1,strokeOpacity:1,strokeWidth:1},re=typeof process<"u"&&B!==void 0&&(B.REACT_APP_SC_ATTR||B.SC_ATTR)||"data-styled",Et="active",Pt="data-styled-version",Te="6.1.13",nt=`/*!sc*/
`,$e=typeof window<"u"&&"HTMLElement"in window,Ar=!!(typeof SC_DISABLE_SPEEDY=="boolean"?SC_DISABLE_SPEEDY:typeof process<"u"&&B!==void 0&&B.REACT_APP_SC_DISABLE_SPEEDY!==void 0&&B.REACT_APP_SC_DISABLE_SPEEDY!==""?B.REACT_APP_SC_DISABLE_SPEEDY!=="false"&&B.REACT_APP_SC_DISABLE_SPEEDY:typeof process<"u"&&B!==void 0&&B.SC_DISABLE_SPEEDY!==void 0&&B.SC_DISABLE_SPEEDY!==""&&B.SC_DISABLE_SPEEDY!=="false"&&B.SC_DISABLE_SPEEDY),Fe=Object.freeze([]),ne=Object.freeze({});function Rr(e,t,r){return r===void 0&&(r=ne),e.theme!==r.theme&&e.theme||t||r.theme}var Tt=new Set(["a","abbr","address","area","article","aside","audio","b","base","bdi","bdo","big","blockquote","body","br","button","canvas","caption","cite","code","col","colgroup","data","datalist","dd","del","details","dfn","dialog","div","dl","dt","em","embed","fieldset","figcaption","figure","footer","form","h1","h2","h3","h4","h5","h6","header","hgroup","hr","html","i","iframe","img","input","ins","kbd","keygen","label","legend","li","link","main","map","mark","menu","menuitem","meta","meter","nav","noscript","object","ol","optgroup","option","output","p","param","picture","pre","progress","q","rp","rt","ruby","s","samp","script","section","select","small","source","span","strong","style","sub","summary","sup","table","tbody","td","textarea","tfoot","th","thead","time","tr","track","u","ul","use","var","video","wbr","circle","clipPath","defs","ellipse","foreignObject","g","image","line","linearGradient","marker","mask","path","pattern","polygon","polyline","radialGradient","rect","stop","svg","text","tspan"]),$r=/[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~-]+/g,Nr=/(^-|-$)/g;function pt(e){return e.replace($r,"-").replace(Nr,"")}var Ir=/(a)(d)/gi,ye=52,ft=function(e){return String.fromCharCode(e+(e>25?39:97))};function Je(e){var t,r="";for(t=Math.abs(e);t>ye;t=t/ye|0)r=ft(t%ye)+r;return(ft(t%ye)+r).replace(Ir,"$1-$2")}var Ve,Ft=5381,Z=function(e,t){for(var r=t.length;r;)e=33*e^t.charCodeAt(--r);return e},Bt=function(e){return Z(Ft,e)};function zr(e){return Je(Bt(e)>>>0)}function Er(e){return e.displayName||e.name||"Component"}function Ge(e){return typeof e=="string"&&!0}var Ot=typeof Symbol=="function"&&Symbol.for,Dt=Ot?Symbol.for("react.memo"):60115,Pr=Ot?Symbol.for("react.forward_ref"):60112,Tr={childContextTypes:!0,contextType:!0,contextTypes:!0,defaultProps:!0,displayName:!0,getDefaultProps:!0,getDerivedStateFromError:!0,getDerivedStateFromProps:!0,mixins:!0,propTypes:!0,type:!0},Fr={name:!0,length:!0,prototype:!0,caller:!0,callee:!0,arguments:!0,arity:!0},Mt={$$typeof:!0,compare:!0,defaultProps:!0,displayName:!0,propTypes:!0,type:!0},Br=((Ve={})[Pr]={$$typeof:!0,render:!0,defaultProps:!0,displayName:!0,propTypes:!0},Ve[Dt]=Mt,Ve);function ht(e){return("type"in(t=e)&&t.type.$$typeof)===Dt?Mt:"$$typeof"in e?Br[e.$$typeof]:Tr;var t}var Or=Object.defineProperty,Dr=Object.getOwnPropertyNames,vt=Object.getOwnPropertySymbols,Mr=Object.getOwnPropertyDescriptor,Lr=Object.getPrototypeOf,gt=Object.prototype;function Lt(e,t,r){if(typeof t!="string"){if(gt){var n=Lr(t);n&&n!==gt&&Lt(e,n,r)}var o=Dr(t);vt&&(o=o.concat(vt(t)));for(var a=ht(e),i=ht(t),s=0;s<o.length;++s){var l=o[s];if(!(l in Fr||r&&r[l]||i&&l in i||a&&l in a)){var u=Mr(t,l);try{Or(e,l,u)}catch{}}}}return e}function oe(e){return typeof e=="function"}function ot(e){return typeof e=="object"&&"styledComponentId"in e}function Q(e,t){return e&&t?"".concat(e," ").concat(t):e||t||""}function mt(e,t){if(e.length===0)return"";for(var r=e[0],n=1;n<e.length;n++)r+=e[n];return r}function fe(e){return e!==null&&typeof e=="object"&&e.constructor.name===Object.name&&!("props"in e&&e.$$typeof)}function Xe(e,t,r){if(r===void 0&&(r=!1),!r&&!fe(e)&&!Array.isArray(e))return t;if(Array.isArray(t))for(var n=0;n<t.length;n++)e[n]=Xe(e[n],t[n]);else if(fe(t))for(var n in t)e[n]=Xe(e[n],t[n]);return e}function at(e,t){Object.defineProperty(e,"toString",{value:t})}function he(e){for(var t=[],r=1;r<arguments.length;r++)t[r-1]=arguments[r];return new Error("An error occurred. See https://github.com/styled-components/styled-components/blob/main/packages/styled-components/src/utils/errors.md#".concat(e," for more information.").concat(t.length>0?" Args: ".concat(t.join(", ")):""))}var Ur=function(){function e(t){this.groupSizes=new Uint32Array(512),this.length=512,this.tag=t}return e.prototype.indexOfGroup=function(t){for(var r=0,n=0;n<t;n++)r+=this.groupSizes[n];return r},e.prototype.insertRules=function(t,r){if(t>=this.groupSizes.length){for(var n=this.groupSizes,o=n.length,a=o;t>=a;)if((a<<=1)<0)throw he(16,"".concat(t));this.groupSizes=new Uint32Array(a),this.groupSizes.set(n),this.length=a;for(var i=o;i<a;i++)this.groupSizes[i]=0}for(var s=this.indexOfGroup(t+1),l=(i=0,r.length);i<l;i++)this.tag.insertRule(s,r[i])&&(this.groupSizes[t]++,s++)},e.prototype.clearGroup=function(t){if(t<this.length){var r=this.groupSizes[t],n=this.indexOfGroup(t),o=n+r;this.groupSizes[t]=0;for(var a=n;a<o;a++)this.tag.deleteRule(n)}},e.prototype.getGroup=function(t){var r="";if(t>=this.length||this.groupSizes[t]===0)return r;for(var n=this.groupSizes[t],o=this.indexOfGroup(t),a=o+n,i=o;i<a;i++)r+="".concat(this.tag.getRule(i)).concat(nt);return r},e}(),Ce=new Map,Ne=new Map,je=1,xe=function(e){if(Ce.has(e))return Ce.get(e);for(;Ne.has(je);)je++;var t=je++;return Ce.set(e,t),Ne.set(t,e),t},Vr=function(e,t){je=t+1,Ce.set(e,t),Ne.set(t,e)},Gr="style[".concat(re,"][").concat(Pt,'="').concat(Te,'"]'),Wr=new RegExp("^".concat(re,'\\.g(\\d+)\\[id="([\\w\\d-]+)"\\].*?"([^"]*)')),Hr=function(e,t,r){for(var n,o=r.split(","),a=0,i=o.length;a<i;a++)(n=o[a])&&e.registerName(t,n)},Yr=function(e,t){for(var r,n=((r=t.textContent)!==null&&r!==void 0?r:"").split(nt),o=[],a=0,i=n.length;a<i;a++){var s=n[a].trim();if(s){var l=s.match(Wr);if(l){var u=0|parseInt(l[1],10),d=l[2];u!==0&&(Vr(d,u),Hr(e,d,l[3]),e.getTag().insertRules(u,o)),o.length=0}else o.push(s)}}},bt=function(e){for(var t=document.querySelectorAll(Gr),r=0,n=t.length;r<n;r++){var o=t[r];o&&o.getAttribute(re)!==Et&&(Yr(e,o),o.parentNode&&o.parentNode.removeChild(o))}};function Qr(){return typeof __webpack_nonce__<"u"?__webpack_nonce__:null}var Ut=function(e){var t=document.head,r=e||t,n=document.createElement("style"),o=function(s){var l=Array.from(s.querySelectorAll("style[".concat(re,"]")));return l[l.length-1]}(r),a=o!==void 0?o.nextSibling:null;n.setAttribute(re,Et),n.setAttribute(Pt,Te);var i=Qr();return i&&n.setAttribute("nonce",i),r.insertBefore(n,a),n},qr=function(){function e(t){this.element=Ut(t),this.element.appendChild(document.createTextNode("")),this.sheet=function(r){if(r.sheet)return r.sheet;for(var n=document.styleSheets,o=0,a=n.length;o<a;o++){var i=n[o];if(i.ownerNode===r)return i}throw he(17)}(this.element),this.length=0}return e.prototype.insertRule=function(t,r){try{return this.sheet.insertRule(r,t),this.length++,!0}catch{return!1}},e.prototype.deleteRule=function(t){this.sheet.deleteRule(t),this.length--},e.prototype.getRule=function(t){var r=this.sheet.cssRules[t];return r&&r.cssText?r.cssText:""},e}(),Jr=function(){function e(t){this.element=Ut(t),this.nodes=this.element.childNodes,this.length=0}return e.prototype.insertRule=function(t,r){if(t<=this.length&&t>=0){var n=document.createTextNode(r);return this.element.insertBefore(n,this.nodes[t]||null),this.length++,!0}return!1},e.prototype.deleteRule=function(t){this.element.removeChild(this.nodes[t]),this.length--},e.prototype.getRule=function(t){return t<this.length?this.nodes[t].textContent:""},e}(),Xr=function(){function e(t){this.rules=[],this.length=0}return e.prototype.insertRule=function(t,r){return t<=this.length&&(this.rules.splice(t,0,r),this.length++,!0)},e.prototype.deleteRule=function(t){this.rules.splice(t,1),this.length--},e.prototype.getRule=function(t){return t<this.length?this.rules[t]:""},e}(),yt=$e,Zr={isServer:!$e,useCSSOMInjection:!Ar},Vt=function(){function e(t,r,n){t===void 0&&(t=ne),r===void 0&&(r={});var o=this;this.options=F(F({},Zr),t),this.gs=r,this.names=new Map(n),this.server=!!t.isServer,!this.server&&$e&&yt&&(yt=!1,bt(this)),at(this,function(){return function(a){for(var i=a.getTag(),s=i.length,l="",u=function(f){var v=function(C){return Ne.get(C)}(f);if(v===void 0)return"continue";var h=a.names.get(v),y=i.getGroup(f);if(h===void 0||!h.size||y.length===0)return"continue";var x="".concat(re,".g").concat(f,'[id="').concat(v,'"]'),z="";h!==void 0&&h.forEach(function(C){C.length>0&&(z+="".concat(C,","))}),l+="".concat(y).concat(x,'{content:"').concat(z,'"}').concat(nt)},d=0;d<s;d++)u(d);return l}(o)})}return e.registerId=function(t){return xe(t)},e.prototype.rehydrate=function(){!this.server&&$e&&bt(this)},e.prototype.reconstructWithOptions=function(t,r){return r===void 0&&(r=!0),new e(F(F({},this.options),t),this.gs,r&&this.names||void 0)},e.prototype.allocateGSInstance=function(t){return this.gs[t]=(this.gs[t]||0)+1},e.prototype.getTag=function(){return this.tag||(this.tag=(t=function(r){var n=r.useCSSOMInjection,o=r.target;return r.isServer?new Xr(o):n?new qr(o):new Jr(o)}(this.options),new Ur(t)));var t},e.prototype.hasNameForId=function(t,r){return this.names.has(t)&&this.names.get(t).has(r)},e.prototype.registerName=function(t,r){if(xe(t),this.names.has(t))this.names.get(t).add(r);else{var n=new Set;n.add(r),this.names.set(t,n)}},e.prototype.insertRules=function(t,r,n){this.registerName(t,r),this.getTag().insertRules(xe(t),n)},e.prototype.clearNames=function(t){this.names.has(t)&&this.names.get(t).clear()},e.prototype.clearRules=function(t){this.getTag().clearGroup(xe(t)),this.clearNames(t)},e.prototype.clearTag=function(){this.tag=void 0},e}(),Kr=/&/g,en=/^\s*\/\/.*$/gm;function Gt(e,t){return e.map(function(r){return r.type==="rule"&&(r.value="".concat(t," ").concat(r.value),r.value=r.value.replaceAll(",",",".concat(t," ")),r.props=r.props.map(function(n){return"".concat(t," ").concat(n)})),Array.isArray(r.children)&&r.type!=="@keyframes"&&(r.children=Gt(r.children,t)),r})}function tn(e){var t,r,n,o=ne,a=o.options,i=a===void 0?ne:a,s=o.plugins,l=s===void 0?Fe:s,u=function(v,h,y){return y.startsWith(r)&&y.endsWith(r)&&y.replaceAll(r,"").length>0?".".concat(t):v},d=l.slice();d.push(function(v){v.type===Ie&&v.value.includes("&")&&(v.props[0]=v.props[0].replace(Kr,r).replace(n,u))}),i.prefix&&d.push(Cr),d.push(kr);var f=function(v,h,y,x){h===void 0&&(h=""),y===void 0&&(y=""),x===void 0&&(x="&"),t=x,r=h,n=new RegExp("\\".concat(r,"\\b"),"g");var z=v.replace(en,""),C=xr(y||h?"".concat(y," ").concat(h," { ").concat(z," }"):z);i.namespace&&(C=Gt(C,i.namespace));var p=[];return Re(C,Sr(d.concat(_r(function(b){return p.push(b)})))),p};return f.hash=l.length?l.reduce(function(v,h){return h.name||he(15),Z(v,h.name)},Ft).toString():"",f}var rn=new Vt,Ze=tn(),Wt=K.createContext({shouldForwardProp:void 0,styleSheet:rn,stylis:Ze});Wt.Consumer;K.createContext(void 0);function xt(){return S.useContext(Wt)}var nn=function(){function e(t,r){var n=this;this.inject=function(o,a){a===void 0&&(a=Ze);var i=n.name+a.hash;o.hasNameForId(n.id,i)||o.insertRules(n.id,i,a(n.rules,i,"@keyframes"))},this.name=t,this.id="sc-keyframes-".concat(t),this.rules=r,at(this,function(){throw he(12,String(n.name))})}return e.prototype.getName=function(t){return t===void 0&&(t=Ze),this.name+t.hash},e}(),on=function(e){return e>="A"&&e<="Z"};function wt(e){for(var t="",r=0;r<e.length;r++){var n=e[r];if(r===1&&n==="-"&&e[0]==="-")return e;on(n)?t+="-"+n.toLowerCase():t+=n}return t.startsWith("ms-")?"-"+t:t}var Ht=function(e){return e==null||e===!1||e===""},Yt=function(e){var t,r,n=[];for(var o in e){var a=e[o];e.hasOwnProperty(o)&&!Ht(a)&&(Array.isArray(a)&&a.isCss||oe(a)?n.push("".concat(wt(o),":"),a,";"):fe(a)?n.push.apply(n,Ae(Ae(["".concat(o," {")],Yt(a),!1),["}"],!1)):n.push("".concat(wt(o),": ").concat((t=o,(r=a)==null||typeof r=="boolean"||r===""?"":typeof r!="number"||r===0||t in jr||t.startsWith("--")?String(r).trim():"".concat(r,"px")),";")))}return n};function J(e,t,r,n){if(Ht(e))return[];if(ot(e))return[".".concat(e.styledComponentId)];if(oe(e)){if(!oe(a=e)||a.prototype&&a.prototype.isReactComponent||!t)return[e];var o=e(t);return J(o,t,r,n)}var a;return e instanceof nn?r?(e.inject(r,n),[e.getName(n)]):[e]:fe(e)?Yt(e):Array.isArray(e)?Array.prototype.concat.apply(Fe,e.map(function(i){return J(i,t,r,n)})):[e.toString()]}function an(e){for(var t=0;t<e.length;t+=1){var r=e[t];if(oe(r)&&!ot(r))return!1}return!0}var sn=Bt(Te),cn=function(){function e(t,r,n){this.rules=t,this.staticRulesId="",this.isStatic=(n===void 0||n.isStatic)&&an(t),this.componentId=r,this.baseHash=Z(sn,r),this.baseStyle=n,Vt.registerId(r)}return e.prototype.generateAndInjectStyles=function(t,r,n){var o=this.baseStyle?this.baseStyle.generateAndInjectStyles(t,r,n):"";if(this.isStatic&&!n.hash)if(this.staticRulesId&&r.hasNameForId(this.componentId,this.staticRulesId))o=Q(o,this.staticRulesId);else{var a=mt(J(this.rules,t,r,n)),i=Je(Z(this.baseHash,a)>>>0);if(!r.hasNameForId(this.componentId,i)){var s=n(a,".".concat(i),void 0,this.componentId);r.insertRules(this.componentId,i,s)}o=Q(o,i),this.staticRulesId=i}else{for(var l=Z(this.baseHash,n.hash),u="",d=0;d<this.rules.length;d++){var f=this.rules[d];if(typeof f=="string")u+=f;else if(f){var v=mt(J(f,t,r,n));l=Z(l,v+d),u+=v}}if(u){var h=Je(l>>>0);r.hasNameForId(this.componentId,h)||r.insertRules(this.componentId,h,n(u,".".concat(h),void 0,this.componentId)),o=Q(o,h)}}return o},e}(),Qt=K.createContext(void 0);Qt.Consumer;var We={};function ln(e,t,r){var n=ot(e),o=e,a=!Ge(e),i=t.attrs,s=i===void 0?Fe:i,l=t.componentId,u=l===void 0?function(j,N){var _=typeof j!="string"?"sc":pt(j);We[_]=(We[_]||0)+1;var c="".concat(_,"-").concat(zr(Te+_+We[_]));return N?"".concat(N,"-").concat(c):c}(t.displayName,t.parentComponentId):l,d=t.displayName,f=d===void 0?function(j){return Ge(j)?"styled.".concat(j):"Styled(".concat(Er(j),")")}(e):d,v=t.displayName&&t.componentId?"".concat(pt(t.displayName),"-").concat(t.componentId):t.componentId||u,h=n&&o.attrs?o.attrs.concat(s).filter(Boolean):s,y=t.shouldForwardProp;if(n&&o.shouldForwardProp){var x=o.shouldForwardProp;if(t.shouldForwardProp){var z=t.shouldForwardProp;y=function(j,N){return x(j,N)&&z(j,N)}}else y=x}var C=new cn(r,v,n?o.componentStyle:void 0);function p(j,N){return function(_,c,$){var E=_.attrs,Be=_.componentStyle,Oe=_.defaultProps,rr=_.foldedComponentIds,nr=_.styledComponentId,or=_.target,ar=K.useContext(Qt),ir=xt(),De=_.shouldForwardProp||ir.shouldForwardProp,it=Rr(c,ar,Oe)||ne,L=function(ge,se,me){for(var ce,Y=F(F({},se),{className:void 0,theme:me}),Le=0;Le<ge.length;Le+=1){var be=oe(ce=ge[Le])?ce(Y):ce;for(var G in be)Y[G]=G==="className"?Q(Y[G],be[G]):G==="style"?F(F({},Y[G]),be[G]):be[G]}return se.className&&(Y.className=Q(Y.className,se.className)),Y}(E,c,it),ve=L.as||or,ie={};for(var V in L)L[V]===void 0||V[0]==="$"||V==="as"||V==="theme"&&L.theme===it||(V==="forwardedAs"?ie.as=L.forwardedAs:De&&!De(V,ve)||(ie[V]=L[V]));var st=function(ge,se){var me=xt(),ce=ge.generateAndInjectStyles(se,me.styleSheet,me.stylis);return ce}(Be,L),Me=Q(rr,nr);return st&&(Me+=" "+st),L.className&&(Me+=" "+L.className),ie[Ge(ve)&&!Tt.has(ve)?"class":"className"]=Me,ie.ref=$,S.createElement(ve,ie)}(b,j,N)}p.displayName=f;var b=K.forwardRef(p);return b.attrs=h,b.componentStyle=C,b.displayName=f,b.shouldForwardProp=y,b.foldedComponentIds=n?Q(o.foldedComponentIds,o.styledComponentId):"",b.styledComponentId=v,b.target=n?o.target:e,Object.defineProperty(b,"defaultProps",{get:function(){return this._foldedDefaultProps},set:function(j){this._foldedDefaultProps=n?function(N){for(var _=[],c=1;c<arguments.length;c++)_[c-1]=arguments[c];for(var $=0,E=_;$<E.length;$++)Xe(N,E[$],!0);return N}({},o.defaultProps,j):j}}),at(b,function(){return".".concat(b.styledComponentId)}),a&&Lt(b,e,{attrs:!0,componentStyle:!0,displayName:!0,foldedComponentIds:!0,shouldForwardProp:!0,styledComponentId:!0,target:!0}),b}function kt(e,t){for(var r=[e[0]],n=0,o=t.length;n<o;n+=1)r.push(t[n],e[n+1]);return r}var St=function(e){return Object.assign(e,{isCss:!0})};function dn(e){for(var t=[],r=1;r<arguments.length;r++)t[r-1]=arguments[r];if(oe(e)||fe(e))return St(J(kt(Fe,Ae([e],t,!0))));var n=e;return t.length===0&&n.length===1&&typeof n[0]=="string"?J(n):St(J(kt(n,t)))}function Ke(e,t,r){if(r===void 0&&(r=ne),!t)throw he(1,t);var n=function(o){for(var a=[],i=1;i<arguments.length;i++)a[i-1]=arguments[i];return e(t,r,dn.apply(void 0,Ae([o],a,!1)))};return n.attrs=function(o){return Ke(e,t,F(F({},r),{attrs:Array.prototype.concat(r.attrs,o).filter(Boolean)}))},n.withConfig=function(o){return Ke(e,t,F(F({},r),o))},n}var qt=function(e){return Ke(ln,e)},w=qt;Tt.forEach(function(e){w[e]=qt(e)});w.span`
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
`;const un=w.button`
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
`,H=({appearance:e="primary",className:t,children:r,disabled:n=!1,type:o="button",onClick:a=void 0,...i})=>R.jsx(un,{className:`vscrui-button ${e} ${t||""}`,disabled:n,onClick:a,type:o,...i,children:r});H.displayName="VSCRUI_Badge";var T=[];for(var He=0;He<256;++He)T.push((He+256).toString(16).slice(1));function pn(e,t=0){return(T[e[t+0]]+T[e[t+1]]+T[e[t+2]]+T[e[t+3]]+"-"+T[e[t+4]]+T[e[t+5]]+"-"+T[e[t+6]]+T[e[t+7]]+"-"+T[e[t+8]]+T[e[t+9]]+"-"+T[e[t+10]]+T[e[t+11]]+T[e[t+12]]+T[e[t+13]]+T[e[t+14]]+T[e[t+15]]).toLowerCase()}var we,fn=new Uint8Array(16);function hn(){if(!we&&(we=typeof crypto<"u"&&crypto.getRandomValues&&crypto.getRandomValues.bind(crypto),!we))throw new Error("crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported");return we(fn)}var vn=typeof crypto<"u"&&crypto.randomUUID&&crypto.randomUUID.bind(crypto);const _t={randomUUID:vn};function gn(e,t,r){if(_t.randomUUID&&!e)return _t.randomUUID();e=e||{};var n=e.random||(e.rng||hn)();return n[6]=n[6]&15|64,n[8]=n[8]&63|128,pn(n)}function Jt(){const[e,t]=S.useState("");return S.useEffect(()=>{t(gn())},[]),e}const mn=w.label`
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
`,Xt=w.svg`
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
`,bn=w.span`
  padding-left: 10px;
`,yn=({checked:e})=>R.jsx(Xt,{width:"16",height:"16",viewBox:"0 0 16 16",xmlns:"http://www.w3.org/2000/svg",fill:e?"currentColor":"transparent",children:R.jsx("path",{fillRule:"evenodd",clipRule:"evenodd",d:"M14.431 3.323l-8.47 10-.79-.036-3.35-4.77.818-.574 2.978 4.24 8.051-9.506.764.646z"})}),xn=()=>R.jsx(Xt,{width:"16",height:"16",viewBox:"0 0 16 16",xmlns:"http://www.w3.org/2000/svg",fill:"currentColor",children:R.jsx("rect",{x:"4",y:"4",height:"8",width:"8",rx:"2"})}),et=({checked:e,children:t,className:r,indeterminate:n,disabled:o,onChange:a,...i})=>{const[s,l]=S.useState(!!e),u=S.useRef(null),d=Jt(),f=v=>{l(v.target.checked),a&&a(v.target.checked)};return S.useEffect(()=>{l(!!e)},[e]),S.useEffect(()=>{u.current&&(u.current.indeterminate=n===!0)},[n]),R.jsxs(mn,{htmlFor:d,className:`vscrui-checkbox ${r||""} ${o?"disabled":""}`,...i,children:[R.jsx("input",{id:d,ref:u,type:"checkbox",checked:s,disabled:o,onChange:f}),n===!0?R.jsx(xn,{}):R.jsx(yn,{checked:s}),t&&R.jsx(bn,{className:"vscrui-checkbox__label",children:t})]})};et.displayName="VSCRUI_Checkbox";w.hr`
  border: none;
  border-top: 1px solid var(--vscode-settings-dropdownListBorder);
  box-sizing: content-box;
  height: 0;
  margin: 4px 0;
  width: 100%;
`;const wn=w.div`
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
`,kn=w.button`
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
`,Sn=w.div`
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
`,_n=w.button`
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
`,Zt=({className:e,disabled:t,open:r,value:n,options:o=[],placeholder:a="",position:i="below",onChange:s,...l})=>{const[u,d]=S.useState(void 0),[f,v]=S.useState(null),[h,y]=S.useState(r),x=S.useRef(null),z=S.useCallback(c=>{x.current&&!x.current.contains(c.target)&&(y(!1),v(null))},[x]),C=S.useCallback(c=>{if(c!==u){const $=o.find(E=>(typeof E=="string"?E:E.value)===c);d(c),s&&s($)}y(!1)},[u]),p=S.useCallback(c=>{if(h&&c.preventDefault(),h&&c.key==="Escape")y(!1);else if(h&&c.key==="ArrowDown")v(f===null?0:Math.min(f+1,o.length-1));else if(h&&c.key==="ArrowUp")v(f===null?o.length-1:Math.max(f-1,0));else if(h&&c.key==="Enter"){const $=o[f||0],E=typeof $=="string"?$:$.value;y(!1),C(E)}},[f,h,C]),b=S.useMemo(()=>t||o.length===0,[t,o]),j=S.useMemo(()=>o.length>0?typeof o[0]=="string"?o[0]:o[0].value:"",[o]),N=S.useCallback(()=>{!t&&o.length>0&&y(!h)},[t,o,h]),_=S.useMemo(()=>{if(u&&u){const c=o.find($=>(typeof $=="string"?$:$.value)===u);return c?typeof c=="string"?c:c.label:void 0}},[u,o]);return S.useEffect(()=>{y(!!r)},[r]),S.useEffect(()=>(h&&document.addEventListener("mousedown",z),()=>{document.removeEventListener("mousedown",z)}),[h]),S.useEffect(()=>{if(n!==void 0){const c=typeof n=="string"?n:n.value;d(c);const $=o.findIndex(E=>(typeof E=="string"?E:E.value)===n);v($)}else d(""),v(null)},[n,o]),R.jsxs(wn,{className:`vscrui-dropdown ${b?"disabled":""} ${e||""}`,onKeyDown:p,ref:x,...l,children:[R.jsxs(kn,{className:`vscrui-checkbox__trigger ${h?"open":""}`,disabled:b,onClick:N,children:[R.jsx("span",{children:_||a||j}),R.jsx("svg",{width:"16",height:"16",viewBox:"0 0 16 16",xmlns:"http://www.w3.org/2000/svg",fill:"currentColor",children:R.jsx("path",{fillRule:"evenodd",clipRule:"evenodd",d:"M7.976 10.072l4.357-4.357.62.618L8.284 11h-.618L3 6.333l.619-.618 4.357 4.357z"})})]}),h&&!b&&R.jsx(Sn,{className:"vscrui-checkbox__listbox",position:i,children:R.jsx("ul",{children:o.map((c,$)=>{const E=typeof c=="string"?c:c.value,Be=typeof c=="string"?c:c.label,Oe=typeof c=="string"?!1:c.disabled;return R.jsx("li",{onMouseEnter:()=>v($),children:R.jsx(_n,{className:`vscrui-checkbox__listbox__item ${f===null&&u===E||f===$?"active":""}`,"aria-selected":u===E?"true":"false",disabled:Oe,onClick:()=>C(E),children:Be},$)},$)})})})]})};Zt.displayName="VSCRUI_Dropdown";const Cn=w.i`
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
`,ue=({className:e,name:t,spin:r=!1,size:n=16,...o})=>{const a=S.useMemo(()=>typeof n=="number"?`${n}px`:n,[n]);return R.jsx(Cn,{className:`vscrui-icon codicon codicon-${t} ${r?"codicon-spin":""} ${e||""}`,style:{fontSize:a},...o})};ue.displayName="VSCRUI_Icon";const jn=w.label`
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
`,Kt=({children:e,className:t,...r})=>R.jsx(jn,{className:`vscrui-label ${t||""}`,...r,children:e});Kt.displayName="VSCRUI_Label";w.div`
  background: var(--vscode-editor-background);
  position: fixed;
  inset: 0;
  height: 100%;
  width: 100%;
  z-index: 9999;
  opacity: 0.75;
`;w.div`
  position: absolute;
  top: 0;
  width: 100%;
  height: 2px;
`;w.div`
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
`;const An=w.section`
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
`,er=({className:e,children:t,isVisible:r=!1,...n})=>R.jsx(An,{className:`vscrui-view ${e||""}`,hidden:!r,...n,children:t});er.displayName="VSCRUI_View";const Rn=w.div`
  display: none;
  margin-left: auto;
`;w.div`
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
    ${Rn} {
      display: flex;
    }
  }
`;w.h3`
  font-size: 11px;
  font-weight: 700;
  min-width: 3ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin: 0;
`;w.div`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 100%;
`;w(er)`
  flex: 1;
  overflow: hidden;
  padding: unset;
`;w.button`
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
`;w.button`
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
`;w.div`
  color: var(--vscode-badge-foreground);
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size, 13px);
  box-sizing: border-box;
  line-height: normal;
  grid-template-columns: auto 1fr auto;
  grid-template-rows: auto 1fr;
  overflow-x: auto;
`;w.div`
  display: grid;
  grid-template-rows: auto auto;
  grid-template-columns: auto;
  column-gap: 32px;
  position: relative;
  width: max-content;
  align-self: end;
  padding: 4px 4px 0;
  box-sizing: border-box;
`;w.div`
  grid-row: 2;
  grid-column-start: 1;
  grid-column-end: 4;
  position: relative;
`;w.div`
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
`;const $n=w.div`
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
  display: inline-block;
  min-width: 100px;
`,Nn=w(Kt)`
  margin-bottom: 2px;
`,In=w.input`
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
`,tr=({className:e,children:t,disabled:r,readonly:n,value:o,onChange:a,placeholder:i,...s})=>{const[l,u]=S.useState(o),d=Jt(),f=v=>{u(v.target.value),a&&a(v.target.value)};return S.useEffect(()=>{u(o)},[o]),R.jsxs($n,{className:`vscrui-textfield ${e||""}`,...s,children:[t&&R.jsx(Nn,{htmlFor:d,children:t}),R.jsx(In,{type:"text",id:d,className:"vscrui-textfield__input",defaultValue:l,placeholder:i,disabled:r,readOnly:n,onChange:f})]})};tr.displayName="VSCRUI_TextField";const zn={textQuery:"",searchScope:{name:!0,type:!0,platform:!0,attachments:!1},featureTypes:{},visibility:"all",temporal:{before:null,after:null}};function Bn(e){if(e.textQuery!==""||e.visibility!=="all"||e.temporal.before!==null||e.temporal.after!==null)return!0;for(const t of Object.values(e.featureTypes))if(!t)return!0;return!1}const En={delete:"Delete",toggleVisibility:"Toggle Visibility",run:"Run",filter:"Filter",associatedFiles:"Associated Files",searchPlaceholder:"Search features...",searchScopeName:"Name",searchScopeType:"Type",searchScopePlatform:"Platform",searchScopeAttachments:"Attachments",featureTypesTitle:"Feature types",visibilityAll:"All",visibilityHiddenOnly:"Hidden only",visibilityVisibleOnly:"Visible only",temporalAfter:"Features after",temporalBefore:"Features before",applySelectAll:"Select all",applySelectMatched:"Select matched",applyAddMatched:"Add matched to selection",applyRemoveMatched:"Remove matched from selection",clearAllFilters:"Clear all filters",fileCategory:"File",editCategory:"Edit",viewCategory:"View",analysisCategory:"Analysis",noToolsAvailable:"No tools available",exportSelection:"Export Selection",exportGeoJSON:"Export to GeoJSON",exportCSV:"Export to CSV",duplicate:"Duplicate",rename:"Rename",lockUnlock:"Lock/Unlock",zoomToSelection:"Zoom to Selection",panToFeature:"Pan to Feature",centerMap:"Center Map",sources:"Sources",results:"Results",open:"Open",openWith:"Open With...",revealInExplorer:"Reveal in Explorer",deleteFile:"Delete",provenanceWarning:"Warning: Removing source data breaks provenance chain",noFiles:"No files",showHidden:"Show hidden features",hideHidden:"Hide hidden features"};function Pn({featureKinds:e,filterState:t,onFilterChange:r,onApplyToSelection:n,hasActiveFilter:o=!1,allSelected:a=!1,labels:i}){const s={...En,...i},[l,u]=S.useState(t.textQuery),d=S.useRef(null);S.useEffect(()=>{u(t.textQuery)},[t.textQuery]);const f=S.useCallback(p=>{u(p),d.current&&clearTimeout(d.current),d.current=setTimeout(()=>{r({...t,textQuery:p})},150)},[t,r]);S.useEffect(()=>()=>{d.current&&clearTimeout(d.current)},[]);const v=(p,b)=>{r({...t,searchScope:{...t.searchScope,[p]:b}})},h=(p,b)=>{r({...t,featureTypes:{...t.featureTypes,[p]:b}})},y=p=>{r({...t,visibility:p})},x=(p,b)=>{r({...t,temporal:{...t.temporal,[p]:b}})},z=()=>{u(""),r(zn)},C=[{label:s.visibilityAll,value:"all"},{label:s.visibilityHiddenOnly,value:"hidden-only"},{label:s.visibilityVisibleOnly,value:"visible-only"}];return m.jsxs("div",{className:"debrief-filter-dropdown",children:[m.jsxs("div",{className:"debrief-filter-dropdown__action-row",children:[n&&m.jsxs(m.Fragment,{children:[m.jsx(H,{appearance:"icon",onClick:()=>n("selectAll"),disabled:a,title:s.applySelectAll,"aria-label":s.applySelectAll,children:m.jsx(ue,{name:"check-all"})}),m.jsx(H,{appearance:"icon",onClick:()=>n("select"),disabled:!o,title:s.applySelectMatched,"aria-label":s.applySelectMatched,children:m.jsx(ue,{name:"check"})}),m.jsx(H,{appearance:"icon",onClick:()=>n("add"),disabled:!o,title:s.applyAddMatched,"aria-label":s.applyAddMatched,children:m.jsx(ue,{name:"add"})}),m.jsx(H,{appearance:"icon",onClick:()=>n("remove"),disabled:!o,title:s.applyRemoveMatched,"aria-label":s.applyRemoveMatched,children:m.jsx(ue,{name:"remove"})})]}),m.jsx("div",{className:"debrief-filter-dropdown__action-spacer"}),m.jsx(H,{appearance:"icon",onClick:z,disabled:!o,title:s.clearAllFilters,"aria-label":s.clearAllFilters,children:m.jsx("svg",{width:"14",height:"14",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round",children:m.jsx("path",{d:"M4 14h8M7.5 14l5.3-5.3a2 2 0 0 0 0-2.8L10.1 3.1a2 2 0 0 0-2.8 0L2.6 7.8a2 2 0 0 0 0 2.8L5 13.1"})})})]}),m.jsx("div",{className:"debrief-filter-dropdown__divider"}),m.jsxs("div",{className:"debrief-filter-dropdown__section",children:[m.jsx(tr,{placeholder:s.searchPlaceholder,value:l,onChange:f}),m.jsx("div",{className:"debrief-filter-dropdown__scope-row",children:[["name",s.searchScopeName],["type",s.searchScopeType],["platform",s.searchScopePlatform],["attachments",s.searchScopeAttachments]].map(([p,b])=>m.jsx(et,{label:b,checked:t.searchScope[p],onChange:j=>v(p,j)},p))})]}),m.jsx("div",{className:"debrief-filter-dropdown__divider"}),e.length>0&&m.jsxs("div",{className:"debrief-filter-dropdown__section",children:[m.jsx("div",{className:"debrief-filter-dropdown__section-title",children:s.featureTypesTitle}),m.jsx("div",{className:"debrief-filter-dropdown__checkbox-grid",children:e.map(p=>m.jsx(et,{label:p,checked:t.featureTypes[p]??!0,onChange:b=>h(p,b)},p))})]}),m.jsx("div",{className:"debrief-filter-dropdown__divider"}),m.jsx("div",{className:"debrief-filter-dropdown__section",children:m.jsx(Zt,{options:C,value:t.visibility,onChange:p=>y(p)})}),m.jsx("div",{className:"debrief-filter-dropdown__divider"}),m.jsxs("div",{className:"debrief-filter-dropdown__section",children:[m.jsxs("label",{className:"debrief-filter-dropdown__temporal-label",children:[s.temporalAfter,m.jsxs("div",{className:"debrief-filter-dropdown__temporal-row",children:[m.jsx("input",{type:"datetime-local",className:"debrief-filter-dropdown__temporal-input",value:t.temporal.after??"",onChange:p=>x("after",p.target.value||null)}),t.temporal.after&&m.jsx(H,{appearance:"icon",onClick:()=>x("after",null),"aria-label":"Clear after filter",children:"×"})]})]}),m.jsxs("label",{className:"debrief-filter-dropdown__temporal-label",children:[s.temporalBefore,m.jsxs("div",{className:"debrief-filter-dropdown__temporal-row",children:[m.jsx("input",{type:"datetime-local",className:"debrief-filter-dropdown__temporal-input",value:t.temporal.before??"",onChange:p=>x("before",p.target.value||null)}),t.temporal.before&&m.jsx(H,{appearance:"icon",onClick:()=>x("before",null),"aria-label":"Clear before filter",children:"×"})]})]})]})]})}Pn.__docgenInfo={description:`FilterDropdown provides text search, feature type checkboxes,
visibility filters, temporal range, and apply-to-selection actions.

Selection action buttons appear as a row of small icon buttons at
the top of the panel. "Select all" is always enabled unless all
items are already selected. The filter-dependent actions (Select
matched, Add matched, Remove matched) are only enabled when a
filter is active.

Controlled component: parent owns FilterState, this component
fires onFilterChange on every interaction.`,methods:[],displayName:"FilterDropdown",props:{featureKinds:{required:!0,tsType:{name:"Array",elements:[{name:"string"}],raw:"string[]"},description:"Sorted list of unique kind values from the current features"},filterState:{required:!0,tsType:{name:"FilterState"},description:"Current filter state"},onFilterChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(state: FilterState) => void",signature:{arguments:[{type:{name:"FilterState"},name:"state"}],return:{name:"void"}}},description:"Called when any filter changes"},onApplyToSelection:{required:!1,tsType:{name:"signature",type:"function",raw:"(action: SelectionApplyAction) => void",signature:{arguments:[{type:{name:"union",raw:"'selectAll' | 'select' | 'add' | 'remove'",elements:[{name:"literal",value:"'selectAll'"},{name:"literal",value:"'select'"},{name:"literal",value:"'add'"},{name:"literal",value:"'remove'"}]},name:"action"}],return:{name:"void"}}},description:"Called when apply-to-selection action is triggered"},hasActiveFilter:{required:!1,tsType:{name:"boolean"},description:"Whether any filter is currently active (enables filter-dependent actions)",defaultValue:{value:"false",computed:!1}},allSelected:{required:!1,tsType:{name:"boolean"},description:"Whether all features are already selected (disables Select All)",defaultValue:{value:"false",computed:!1}},labels:{required:!1,tsType:{name:"Partial",elements:[{name:"ToolbarLabels"}],raw:"Partial<ToolbarLabels>"},description:"Externalisable labels"}}};export{zn as D,Pn as F,En as a,Bn as i,ue as l,H as v};
