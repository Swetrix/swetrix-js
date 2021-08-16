import { isInBrowser, isLocalhost, isAutomated, getLocale, getTimezone, getReferrer, getUTMCampaign, getUTMMedium, getUTMSource, getPath, } from './utils';
const host = 'https://api.swetrix.com/log';
export class Lib {
    constructor(projectID, options) {
        this.projectID = projectID;
        this.options = options;
        this.pageData = null;
        this.trackPathChange = this.trackPathChange.bind(this);
    }
    // Tracks a custom event
    track(event) {
        if (!this.canTrack()) {
            return;
        }
        const data = {
            pid: this.projectID,
            ...event,
        };
        this.submitCustom(data);
    }
    // Tracks page views
    trackPageViews(options) {
        if (!this.canTrack()) {
            return;
        }
        if (this.pageData) {
            return this.pageData.actions;
        }
        const interval = setInterval(this.trackPathChange, 2000);
        const path = getPath();
        this.pageData = {
            path,
            actions: {
                stop: () => clearInterval(interval)
            },
        };
        this.trackPage(path);
        return this.pageData.actions;
    }
    // Tracking path changes. If path changes -> calling this.trackPage method
    trackPathChange() {
        if (!this.pageData)
            return;
        const newPath = getPath();
        const { path } = this.pageData;
        if (path !== newPath) {
            this.trackPage(newPath);
        }
    }
    trackPage(pg) {
        if (!this.pageData)
            return;
        this.pageData.path = pg;
        const data = {
            pid: this.projectID,
            lc: getLocale(),
            tz: getTimezone(),
            ref: getReferrer(),
            so: getUTMSource(),
            me: getUTMMedium(),
            ca: getUTMCampaign(),
            pg,
        };
        this.submitData(data);
    }
    debug(message) {
        if (this.options?.debug) {
            console.log('[Swetrix]', message);
        }
    }
    canTrack() {
        if (!isInBrowser()) {
            this.debug('Tracking disabled: script does not run in browser environment.');
            return false;
        }
        if (this.options?.respectDNT && window.navigator?.doNotTrack === '1') {
            this.debug('Tracking disabled: respecting user\'s \'Do Not Track\' preference.');
            return false;
        }
        if (!this.options?.debug && isLocalhost()) {
            return false;
        }
        if (isAutomated()) {
            this.debug('Tracking disabled: navigation is automated by WebDriver.');
            return false;
        }
        return true;
    }
    submitData(body) {
        return fetch(host, {
            method: 'post',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
    }
    submitCustom(body) {
        return fetch(`${host}/custom`, {
            method: 'post',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
    }
}
//# sourceMappingURL=Lib.js.map