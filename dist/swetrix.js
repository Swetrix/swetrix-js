!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?e(exports):"function"==typeof define&&define.amd?define(["exports"],e):e((t="undefined"!=typeof globalThis?globalThis:t||self).swetrix={})}(this,function(n){"use strict";function t(t){return(t=location.search.match(t))&&t[2]||void 0}function r(){return void 0!==navigator.languages?navigator.languages[0]:navigator.language}function s(){try{return Intl.DateTimeFormat().resolvedOptions().timeZone}catch(t){}}function c(){return document.referrer||void 0}function u(){return t(o)}function l(){return t(d)}function p(){return t(a)}function i(){return location.pathname||""}var e=function(){return(e=Object.assign||function(t){for(var e,n=1,o=arguments.length;n<o;n++)for(var i in e=arguments[n])Object.prototype.hasOwnProperty.call(e,i)&&(t[i]=e[i]);return t}).apply(this,arguments)},o=/[?&](ref|source|utm_source)=([^?&]+)/,a=/[?&](utm_campaign)=([^?&]+)/,d=/[?&](utm_medium)=([^?&]+)/,h={stop:function(){}},g=(f.prototype.track=function(t){this.canTrack()&&(t=e({pid:this.projectID,pg:this.activePage,lc:r(),tz:s(),ref:c(),so:u(),me:l(),ca:p()},t),this.sendRequest("custom",t))},f.prototype.trackPageViews=function(t){var e,n,o;return this.canTrack()?(this.pageData||(null!=(this.pageViewsOptions=t)&&t.unique||(n=setInterval(this.trackPathChange,2e3)),null!=t&&t.noHeartbeat||(setTimeout(this.heartbeat,3e3),e=setInterval(this.heartbeat,28e3)),o=i(),this.pageData={path:o,actions:{stop:function(){clearInterval(n),clearInterval(e)}}},this.trackPage(o,null==t?void 0:t.unique)),this.pageData.actions):h},f.prototype.getPerformanceStats=function(){var t;return this.canTrack()&&!this.perfStatsCollected&&null!=(t=window.performance)&&t.getEntriesByType&&(t=window.performance.getEntriesByType("navigation")[0])?(this.perfStatsCollected=!0,{dns:t.domainLookupEnd-t.domainLookupStart,tls:t.secureConnectionStart?t.requestStart-t.secureConnectionStart:0,conn:t.secureConnectionStart?t.secureConnectionStart-t.connectStart:t.connectEnd-t.connectStart,response:t.responseEnd-t.responseStart,render:t.domComplete-t.domContentLoadedEventEnd,dom_load:t.domContentLoadedEventEnd-t.responseEnd,page_load:t.loadEventStart,ttfb:t.responseStart-t.requestStart}):{}},f.prototype.heartbeat=function(){var t;(null!=(t=this.pageViewsOptions)&&t.heartbeatOnBackground||"hidden"!==document.visibilityState)&&(t={pid:this.projectID},this.sendRequest("hb",t))},f.prototype.checkIgnore=function(t){var e,n=null==(e=this.pageViewsOptions)?void 0:e.ignore;if(Array.isArray(n))for(var o=0;o<n.length;++o){if(n[o]===t)return!0;if(n[o]instanceof RegExp&&n[o].test(t))return!0}return!1},f.prototype.trackPathChange=function(){var t;this.pageData&&(t=i(),this.pageData.path!==t)&&this.trackPage(t,!1)},f.prototype.getPreviousPage=function(){var t;if(this.activePage)return(o=this.checkIgnore(this.activePage))&&null!=(e=this.pageViewsOptions)&&e.doNotAnonymise||o?null:this.activePage;if("function"==typeof URL){var e=c();if(!e)return null;var n=location.host;try{var o,i=new URL(e),a=i.host,r=i.pathname;return n!==a?null:(o=this.checkIgnore(r))&&null!=(t=this.pageViewsOptions)&&t.doNotAnonymise||o?null:r}catch(t){}}return null},f.prototype.trackPage=function(t,e){var n,o,i,a;void 0===e&&(e=!1),this.pageData&&(this.pageData.path=t,(n=this.checkIgnore(t))&&null!=(o=this.pageViewsOptions)&&o.doNotAnonymise||(o=this.getPerformanceStats(),null!=(a=this.pageViewsOptions)&&a.noUserFlow||(i=this.getPreviousPage()),a={pid:this.projectID,lc:r(),tz:s(),ref:c(),so:u(),me:l(),ca:p(),unique:e,pg:n?null:t,perf:o,prev:i},this.activePage=t,this.sendRequest("",a)))},f.prototype.debug=function(t){var e;null!=(e=this.options)&&e.debug&&console.log("[Swetrix]",t)},f.prototype.canTrack=function(){var t;return null!=(t=this.options)&&t.disabled?(this.debug("Tracking disabled: the 'disabled' setting is set to true."),!1):"undefined"==typeof window?(this.debug("Tracking disabled: script does not run in browser environment."),!1):null!=(t=this.options)&&t.respectDNT&&"1"===(null==(t=window.navigator)?void 0:t.doNotTrack)?(this.debug("Tracking disabled: respecting user's 'Do Not Track' preference."),!1):!(!(null!=(t=this.options)&&t.debug||"localhost"!==(null===location||void 0===location?void 0:location.hostname)&&"127.0.0.1"!==(null===location||void 0===location?void 0:location.hostname)&&""!==(null===location||void 0===location?void 0:location.hostname))||null!==navigator&&void 0!==navigator&&navigator.webdriver&&(this.debug("Tracking disabled: navigation is automated by WebDriver."),1))},f.prototype.sendRequest=function(t,e){var n=(null==(n=this.options)?void 0:n.apiURL)||"https://api.swetrix.com/log",o=new XMLHttpRequest;o.open("POST","".concat(n,"/").concat(t),!0),o.setRequestHeader("Content-Type","application/json"),o.send(JSON.stringify(e))},f);function f(t,e){this.projectID=t,this.options=e,this.pageData=null,this.pageViewsOptions=null,this.perfStatsCollected=!1,this.activePage=null,this.trackPathChange=this.trackPathChange.bind(this),this.heartbeat=this.heartbeat.bind(this)}n.LIB_INSTANCE=null,n.init=function(t,e){return n.LIB_INSTANCE||(n.LIB_INSTANCE=new g(t,e)),n.LIB_INSTANCE},n.track=function(t){n.LIB_INSTANCE&&n.LIB_INSTANCE.track(t)},n.trackViews=function(e){return new Promise(function(t){n.LIB_INSTANCE?"undefined"==typeof document||"complete"===document.readyState?t(n.LIB_INSTANCE.trackPageViews(e)):window.addEventListener("load",function(){t(n.LIB_INSTANCE.trackPageViews(e))}):t(h)})},Object.defineProperty(n,"__esModule",{value:!0})});
