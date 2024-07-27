import { isInBrowser, isLocalhost, isAutomated, getLocale, getTimezone, getReferrer, getUTMCampaign, getUTMMedium, getUTMSource, getPath, } from './utils';
export const defaultActions = {
    stop() { },
};
const DEFAULT_API_HOST = 'https://api.swetrix.com/log';
export class Lib {
    constructor(projectID, options) {
        this.projectID = projectID;
        this.options = options;
        this.pageData = null;
        this.pageViewsOptions = null;
        this.errorsOptions = null;
        this.perfStatsCollected = false;
        this.activePage = null;
        this.errorListenerExists = false;
        this.trackPathChange = this.trackPathChange.bind(this);
        this.heartbeat = this.heartbeat.bind(this);
        this.captureError = this.captureError.bind(this);
    }
    captureError(event) {
        if (typeof this.errorsOptions?.sampleRate === 'number' && this.errorsOptions.sampleRate > Math.random()) {
            return;
        }
        this.submitError({
            // The file in which error occured.
            filename: event.filename,
            // The line of code error occured on.
            lineno: event.lineno,
            // The column of code error occured on.
            colno: event.colno,
            // Name of the error, if not exists (i.e. it's a custom thrown error). The initial value of name is "Error", but just in case lets explicitly set it here too.
            name: event.error?.name || 'Error',
            // Description of the error. By default, we use message from Error object, is it does not contain the error name
            // (we want to split error name and message so we could group them together later in dashboard).
            // If message in error object does not exist - lets use a message from the Error event itself.
            message: event.error?.message || event.message,
        }, true);
    }
    trackErrors(options) {
        if (this.errorListenerExists || !this.canTrack()) {
            return defaultActions;
        }
        this.errorsOptions = options;
        window.addEventListener('error', this.captureError);
        this.errorListenerExists = true;
        return {
            stop: () => {
                window.removeEventListener('error', this.captureError);
            },
        };
    }
    submitError(payload, evokeCallback) {
        const privateData = {
            pid: this.projectID,
        };
        const errorPayload = {
            pg: this.activePage ||
                getPath({
                    hash: this.pageViewsOptions?.hash,
                    search: this.pageViewsOptions?.search,
                }),
            lc: getLocale(),
            tz: getTimezone(),
            ...payload,
        };
        if (evokeCallback && this.errorsOptions?.callback) {
            const callbackResult = this.errorsOptions.callback(errorPayload);
            if (callbackResult === false) {
                return;
            }
            if (callbackResult && typeof callbackResult === 'object') {
                Object.assign(errorPayload, callbackResult);
            }
        }
        Object.assign(errorPayload, privateData);
        this.sendRequest('error', errorPayload);
    }
    async track(event) {
        if (!this.canTrack()) {
            return;
        }
        const data = {
            ...event,
            pid: this.projectID,
            pg: this.activePage,
            lc: getLocale(),
            tz: getTimezone(),
            ref: getReferrer(),
            so: getUTMSource(),
            me: getUTMMedium(),
            ca: getUTMCampaign(),
        };
        await this.sendRequest('custom', data);
    }
    trackPageViews(options) {
        if (!this.canTrack()) {
            return defaultActions;
        }
        if (this.pageData) {
            return this.pageData.actions;
        }
        this.pageViewsOptions = options;
        let interval;
        if (!options?.unique) {
            interval = setInterval(this.trackPathChange, 2000);
        }
        setTimeout(this.heartbeat, 3000);
        const hbInterval = setInterval(this.heartbeat, 28000);
        const path = getPath({
            hash: options?.hash,
            search: options?.search,
        });
        this.pageData = {
            path,
            actions: {
                stop: () => {
                    clearInterval(interval);
                    clearInterval(hbInterval);
                },
            },
        };
        this.trackPage(path, options?.unique);
        return this.pageData.actions;
    }
    getPerformanceStats() {
        if (!this.canTrack() || this.perfStatsCollected || !window.performance?.getEntriesByType) {
            return {};
        }
        const perf = window.performance.getEntriesByType('navigation')[0];
        if (!perf) {
            return {};
        }
        this.perfStatsCollected = true;
        return {
            // Network
            dns: perf.domainLookupEnd - perf.domainLookupStart, // DNS Resolution
            tls: perf.secureConnectionStart ? perf.requestStart - perf.secureConnectionStart : 0, // TLS Setup; checking if secureConnectionStart is not 0 (it's 0 for non-https websites)
            conn: perf.secureConnectionStart
                ? perf.secureConnectionStart - perf.connectStart
                : perf.connectEnd - perf.connectStart, // Connection time
            response: perf.responseEnd - perf.responseStart, // Response Time (Download)
            // Frontend
            render: perf.domComplete - perf.domContentLoadedEventEnd, // Browser rendering the HTML time
            dom_load: perf.domContentLoadedEventEnd - perf.responseEnd, // DOM loading timing
            page_load: perf.loadEventStart, // Page load time
            // Backend
            ttfb: perf.responseStart - perf.requestStart,
        };
    }
    heartbeat() {
        if (!this.pageViewsOptions?.heartbeatOnBackground && document.visibilityState === 'hidden') {
            return;
        }
        const data = {
            pid: this.projectID,
        };
        this.sendRequest('hb', data);
    }
    // Tracking path changes. If path changes -> calling this.trackPage method
    trackPathChange() {
        if (!this.pageData)
            return;
        const newPath = getPath({
            hash: this.pageViewsOptions?.hash,
            search: this.pageViewsOptions?.search,
        });
        const { path } = this.pageData;
        if (path !== newPath) {
            this.trackPage(newPath, false);
        }
    }
    getPreviousPage() {
        // Assuming that this function is called in trackPage and this.activePage is not overwritten by new value yet
        // That method of getting previous page works for SPA websites
        if (this.activePage) {
            return this.activePage;
        }
        // Checking if URL is supported by the browser (for example, IE11 does not support it)
        if (typeof URL === 'function') {
            // That method of getting previous page works for websites with page reloads
            const referrer = getReferrer();
            if (!referrer) {
                return null;
            }
            const { host } = location;
            try {
                const url = new URL(referrer);
                const { host: refHost, pathname } = url;
                if (host !== refHost) {
                    return null;
                }
                return pathname;
            }
            catch {
                return null;
            }
        }
        return null;
    }
    trackPage(pg, unique = false) {
        if (!this.pageData)
            return;
        this.pageData.path = pg;
        const perf = this.getPerformanceStats();
        this.activePage = pg;
        this.submitPageView({ pg }, unique, perf, true);
    }
    submitPageView(payload, unique, perf, evokeCallback) {
        const prev = this.getPreviousPage();
        const privateData = {
            pid: this.projectID,
            perf,
            unique,
        };
        const pvPayload = {
            lc: getLocale(),
            tz: getTimezone(),
            ref: getReferrer(),
            so: getUTMSource(),
            me: getUTMMedium(),
            ca: getUTMCampaign(),
            prev,
            ...payload,
        };
        if (evokeCallback && this.pageViewsOptions?.callback) {
            const callbackResult = this.pageViewsOptions.callback(pvPayload);
            if (callbackResult === false) {
                return;
            }
            if (callbackResult && typeof callbackResult === 'object') {
                Object.assign(pvPayload, callbackResult);
            }
        }
        Object.assign(pvPayload, privateData);
        this.sendRequest('', pvPayload);
    }
    canTrack() {
        if (this.options?.disabled ||
            !isInBrowser() ||
            (this.options?.respectDNT && window.navigator?.doNotTrack === '1') ||
            (!this.options?.devMode && isLocalhost()) ||
            isAutomated()) {
            return false;
        }
        return true;
    }
    async sendRequest(path, body) {
        const host = this.options?.apiURL || DEFAULT_API_HOST;
        await fetch(`${host}/${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
    }
}
//# sourceMappingURL=Lib.js.map