!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?e(exports):"function"==typeof define&&define.amd?define(["exports"],e):e((t="undefined"!=typeof globalThis?globalThis:t||self).swetrix={})}(this,function(o){"use strict";function t(t){return(t=location.search.match(t))&&t[2]||void 0}function r(){return void 0!==navigator.languages?navigator.languages[0]:navigator.language}function a(){try{return Intl.DateTimeFormat().resolvedOptions().timeZone}catch(t){}}function s(){return document.referrer||void 0}function c(){return t(e)}function u(){return t(p)}function l(){return t(n)}function i(t){var e,n=location.pathname||"";return t.hash&&(n+=-1<(e=location.hash.indexOf("?"))?location.hash.substring(0,e):location.hash),t.search&&(e=location.hash.indexOf("?"),n+=location.search||(-1<e?location.hash.substring(e):"")),n}var h=function(){return(h=Object.assign||function(t){for(var e,n=1,o=arguments.length;n<o;n++)for(var i in e=arguments[n])Object.prototype.hasOwnProperty.call(e,i)&&(t[i]=e[i]);return t}).apply(this,arguments)},e=/[?&](ref|source|utm_source)=([^?&]+)/,n=/[?&](utm_campaign)=([^?&]+)/,p=/[?&](utm_medium)=([^?&]+)/,d={stop:function(){}},f=(g.prototype.captureError=function(t){var e;"number"==typeof(null==(e=this.errorsOptions)?void 0:e.sampleRate)&&this.errorsOptions.sampleRate>Math.random()||this.submitError({filename:t.filename,lineno:t.lineno,colno:t.colno,name:(null==(e=t.error)?void 0:e.name)||"Error",message:(null==(e=t.error)?void 0:e.message)||t.message},!0)},g.prototype.trackErrors=function(t){var e=this;return this.errorListenerExists||!this.canTrack()?d:(this.errorsOptions=t,window.addEventListener("error",this.captureError),this.errorListenerExists=!0,{stop:function(){window.removeEventListener("error",e.captureError)}})},g.prototype.submitError=function(t,e){var n={pid:this.projectID},o=h({pg:this.activePage||i({hash:null==(o=this.pageViewsOptions)?void 0:o.hash,search:null==(o=this.pageViewsOptions)?void 0:o.search}),lc:r(),tz:a()},t);if(e&&null!=(t=this.errorsOptions)&&t.callback){e=this.errorsOptions.callback(o);if(!1===e)return;e&&"object"==typeof e&&Object.assign(o,e)}Object.assign(o,n),this.sendRequest("error",o)},g.prototype.track=function(t){this.canTrack()&&(t=h(h({},t),{pid:this.projectID,pg:this.activePage,lc:r(),tz:a(),ref:s(),so:c(),me:u(),ca:l()}),this.sendRequest("custom",t))},g.prototype.trackPageViews=function(t){var e,n,o;return this.canTrack()?(this.pageData||(null!=(this.pageViewsOptions=t)&&t.unique||(e=setInterval(this.trackPathChange,2e3)),setTimeout(this.heartbeat,3e3),n=setInterval(this.heartbeat,28e3),o=i({hash:null==t?void 0:t.hash,search:null==t?void 0:t.search}),this.pageData={path:o,actions:{stop:function(){clearInterval(e),clearInterval(n)}}},this.trackPage(o,null==t?void 0:t.unique)),this.pageData.actions):d},g.prototype.getPerformanceStats=function(){var t;return this.canTrack()&&!this.perfStatsCollected&&null!=(t=window.performance)&&t.getEntriesByType&&(t=window.performance.getEntriesByType("navigation")[0])?(this.perfStatsCollected=!0,{dns:t.domainLookupEnd-t.domainLookupStart,tls:t.secureConnectionStart?t.requestStart-t.secureConnectionStart:0,conn:t.secureConnectionStart?t.secureConnectionStart-t.connectStart:t.connectEnd-t.connectStart,response:t.responseEnd-t.responseStart,render:t.domComplete-t.domContentLoadedEventEnd,dom_load:t.domContentLoadedEventEnd-t.responseEnd,page_load:t.loadEventStart,ttfb:t.responseStart-t.requestStart}):{}},g.prototype.heartbeat=function(){var t;(null!=(t=this.pageViewsOptions)&&t.heartbeatOnBackground||"hidden"!==document.visibilityState)&&(t={pid:this.projectID},this.sendRequest("hb",t))},g.prototype.trackPathChange=function(){var t;this.pageData&&(t=i({hash:null==(t=this.pageViewsOptions)?void 0:t.hash,search:null==(t=this.pageViewsOptions)?void 0:t.search}),this.pageData.path!==t)&&this.trackPage(t,!1)},g.prototype.getPreviousPage=function(){if(this.activePage)return this.activePage;if("function"==typeof URL){var t=s();if(!t)return null;var e=location.host;try{var n=new URL(t),o=n.host,i=n.pathname;return e!==o?null:i}catch(t){}}return null},g.prototype.trackPage=function(t,e){var n,o;void 0===e&&(e=!1),this.pageData&&(this.pageData.path=t,n=this.getPerformanceStats(),o=this.getPreviousPage(),this.activePage=t,this.submitPageView(t,o,e,n,!0))},g.prototype.submitPageView=function(t,e,n,o,i){o={pid:this.projectID,perf:o,unique:n},n={lc:r(),tz:a(),ref:s(),so:c(),me:u(),ca:l(),pg:t,prev:e};if(i&&null!=(t=this.pageViewsOptions)&&t.callback){e=this.pageViewsOptions.callback(n);if(!1===e)return;e&&"object"==typeof e&&Object.assign(n,e)}Object.assign(n,o),this.sendRequest("",n)},g.prototype.canTrack=function(){var t;return!(null!=(t=this.options)&&t.disabled||"undefined"==typeof window||null!=(t=this.options)&&t.respectDNT&&"1"===(null==(t=window.navigator)?void 0:t.doNotTrack)||(null==(t=this.options)||!t.devMode)&&("localhost"===(null===location||void 0===location?void 0:location.hostname)||"127.0.0.1"===(null===location||void 0===location?void 0:location.hostname)||""===(null===location||void 0===location?void 0:location.hostname))||null!==navigator&&void 0!==navigator&&navigator.webdriver)},g.prototype.sendRequest=function(t,e){var n=(null==(n=this.options)?void 0:n.apiURL)||"https://api.swetrix.com/log",o=new XMLHttpRequest;o.open("POST","".concat(n,"/").concat(t),!0),o.setRequestHeader("Content-Type","application/json"),o.send(JSON.stringify(e))},g);function g(t,e){this.projectID=t,this.options=e,this.pageData=null,this.pageViewsOptions=null,this.errorsOptions=null,this.perfStatsCollected=!1,this.activePage=null,this.errorListenerExists=!1,this.trackPathChange=this.trackPathChange.bind(this),this.heartbeat=this.heartbeat.bind(this),this.captureError=this.captureError.bind(this)}o.LIB_INSTANCE=null,o.init=function(t,e){return o.LIB_INSTANCE||(o.LIB_INSTANCE=new f(t,e)),o.LIB_INSTANCE},o.track=function(t){o.LIB_INSTANCE&&o.LIB_INSTANCE.track(t)},o.trackError=function(t){o.LIB_INSTANCE&&o.LIB_INSTANCE.submitError(t,!1)},o.trackErrors=function(t){return o.LIB_INSTANCE?o.LIB_INSTANCE.trackErrors(t):d},o.trackPageview=function(t,e,n){o.LIB_INSTANCE&&o.LIB_INSTANCE.submitPageView(t,e||null,Boolean(n),{})},o.trackViews=function(e){return new Promise(function(t){o.LIB_INSTANCE?"undefined"==typeof document||"complete"===document.readyState?t(o.LIB_INSTANCE.trackPageViews(e)):window.addEventListener("load",function(){t(o.LIB_INSTANCE.trackPageViews(e))}):t(d)})},Object.defineProperty(o,"__esModule",{value:!0})});
