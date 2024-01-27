import {
  isInBrowser,
  isLocalhost,
  isAutomated,
  getLocale,
  getTimezone,
  getReferrer,
  getUTMCampaign,
  getUTMMedium,
  getUTMSource,
  getPath,
} from './utils'

export interface LibOptions {
  /**
   * When set to `true`, all tracking logs will be printed to console and localhost events will be sent to server.
   */
  debug?: boolean

  /**
   * When set to `true`, the tracking library won't send any data to server.
   * Useful for development purposes when this value is set based on `.env` var.
   */
  disabled?: boolean

  /**
   * By setting this flag to `true`, we will not collect ANY kind of data about the user with the DNT setting.
   */
  respectDNT?: boolean

  /** Set a custom URL of the API server (for selfhosted variants of Swetrix). */
  apiURL?: string
}

export interface TrackEventOptions {
  /** The custom event name. */
  ev: string

  /** If set to `true`, only 1 event with the same ID will be saved per user session. */
  unique?: boolean

  /** Event-related metadata object with string values. */
  meta?: {
    [key: string]: string
  }
}

// Partial user-editable pageview payload
export interface IPageViewPayload {
  lc: string
  tz: string
  ref: string
  so: string
  me: string
  ca: string
  pg: string | null
  prev: string | null | undefined
}

/**
 * The object returned by `trackPageViews()`, used to stop tracking pages.
 */
export interface PageActions {
  /** Stops the tracking of pages. */
  stop: () => void
}

export interface PageData {
  /** Current URL path. */
  path: string

  /** The object returned by `trackPageViews()`, used to stop tracking pages. */
  actions: PageActions
}

export interface PageViewsOptions {
  /**
   * If set to `true`, only unique events will be saved.
   * This param is useful when tracking single-page landing websites.
   */
  unique?: boolean

  /** A list of Regular Expressions or string pathes to ignore. */
  ignore?: Array<string | RegExp>

  /** Do not send paths from ignore list to API. If set to `false`, the page view information will be sent to the Swetrix API, but the page will be displayed as a 'Redacted page' in the dashboard. */
  doNotAnonymise?: boolean

  /** Do not send Heartbeat requests to the server. */
  noHeartbeat?: boolean

  /** Send Heartbeat requests when the website tab is not active in the browser. */
  heartbeatOnBackground?: boolean

  /** Disable user-flow */
  noUserFlow?: boolean

  /**
   * Set to `true` to enable hash-based routing.
   * For example if you have pages like /#/path or want to track pages like /path#hash
   */
  hash?: boolean

  /**
   * Set to `true` to enable search-based routing.
   * For example if you have pages like /path?search
   */
  search?: boolean

  /** Callback to edit / prevent sending pageviews */
  callback?: (payload: IPageViewPayload, isIgnored: boolean) => IPageViewPayload | boolean
}

export const defaultPageActions = {
  stop() {},
}

const DEFAULT_API_HOST = 'https://api.swetrix.com/log'

export class Lib {
  private pageData: PageData | null = null
  private pageViewsOptions: PageViewsOptions | null | undefined = null
  private perfStatsCollected: Boolean = false
  private activePage: string | null = null

  constructor(private projectID: string, private options?: LibOptions) {
    this.trackPathChange = this.trackPathChange.bind(this)
    this.heartbeat = this.heartbeat.bind(this)
  }

  track(event: TrackEventOptions): void {
    if (!this.canTrack()) {
      return
    }

    const data = {
      pid: this.projectID,
      pg: this.activePage,
      lc: getLocale(),
      tz: getTimezone(),
      ref: getReferrer(),
      so: getUTMSource(),
      me: getUTMMedium(),
      ca: getUTMCampaign(),
      ...event,
    }
    this.sendRequest('custom', data)
  }

  trackPageViews(options?: PageViewsOptions): PageActions {
    if (!this.canTrack()) {
      return defaultPageActions
    }

    if (this.pageData) {
      return this.pageData.actions
    }

    this.pageViewsOptions = options
    let hbInterval: NodeJS.Timeout, interval: NodeJS.Timeout
    if (!options?.unique) {
      interval = setInterval(this.trackPathChange, 2000)
    }

    if (!options?.noHeartbeat) {
      setTimeout(this.heartbeat, 3000)
      hbInterval = setInterval(this.heartbeat, 28000)
    }

    const path = getPath({
      hash: options?.hash,
      search: options?.search,
    })

    this.pageData = {
      path,
      actions: {
        stop: () => {
          clearInterval(interval)
          clearInterval(hbInterval)
        },
      },
    }

    this.trackPage(path, options?.unique)
    return this.pageData.actions
  }

  getPerformanceStats(): object {
    if (!this.canTrack() || this.perfStatsCollected || !window.performance?.getEntriesByType) {
      return {}
    }

    const perf = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming

    if (!perf) {
      return {}
    }

    this.perfStatsCollected = true

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
    }
  }

  private heartbeat(): void {
    if (!this.pageViewsOptions?.heartbeatOnBackground && document.visibilityState === 'hidden') {
      return
    }

    const data = {
      pid: this.projectID,
    }

    this.sendRequest('hb', data)
  }

  private checkIgnore(path: string): boolean {
    const ignore = this.pageViewsOptions?.ignore

    if (Array.isArray(ignore)) {
      for (let i = 0; i < ignore.length; ++i) {
        if (ignore[i] === path) return true
        // @ts-ignore
        if (ignore[i] instanceof RegExp && ignore[i].test(path)) return true
      }
    }
    return false
  }

  // Tracking path changes. If path changes -> calling this.trackPage method
  private trackPathChange(): void {
    if (!this.pageData) return
    const newPath = getPath({
      hash: this.pageViewsOptions?.hash,
      search: this.pageViewsOptions?.search,
    })
    const { path } = this.pageData

    if (path !== newPath) {
      this.trackPage(newPath, false)
    }
  }

  private getPreviousPage(): string | null {
    // Assuming that this function is called in trackPage and this.activePage is not overwritten by new value yet
    // That method of getting previous page works for SPA websites
    if (this.activePage) {
      const shouldIgnore = this.checkIgnore(this.activePage)

      if (shouldIgnore && this.pageViewsOptions?.doNotAnonymise) {
        return null
      }

      return shouldIgnore ? null : this.activePage
    }

    // Checking if URL is supported by the browser (for example, IE11 does not support it)
    if (typeof URL === 'function') {
      // That method of getting previous page works for websites with page reloads
      const referrer = getReferrer()

      if (!referrer) {
        return null
      }

      const { host } = location

      try {
        const url = new URL(referrer)
        const { host: refHost, pathname } = url

        if (host !== refHost) {
          return null
        }

        const shouldIgnore = this.checkIgnore(pathname)

        if (shouldIgnore && this.pageViewsOptions?.doNotAnonymise) {
          return null
        }

        return shouldIgnore ? null : pathname
      } catch {
        return null
      }
    }

    return null
  }

  private trackPage(pg: string, unique: boolean = false): void {
    if (!this.pageData) return
    this.pageData.path = pg

    const shouldIgnore = this.checkIgnore(pg)

    if (shouldIgnore && this.pageViewsOptions?.doNotAnonymise) return

    const perf = this.getPerformanceStats()

    let prev

    if (!this.pageViewsOptions?.noUserFlow) {
      prev = this.getPreviousPage()
    }

    this.activePage = pg
    this.submitPageView(shouldIgnore ? null : pg, prev, unique, perf)
  }

  submitPageView(pg: null | string, prev: string | null | undefined, unique: boolean, perf: any): void {
    const data = {
      pid: this.projectID,
      lc: getLocale(),
      tz: getTimezone(),
      ref: getReferrer(),
      so: getUTMSource(),
      me: getUTMMedium(),
      ca: getUTMCampaign(),
      unique,
      pg,
      perf,
      prev,
    }

    this.sendRequest('', data)
  }

  private debug(message: string): void {
    if (this.options?.debug) {
      console.log('[Swetrix]', message)
    }
  }

  private canTrack(): boolean {
    if (this.options?.disabled) {
      this.debug("Tracking disabled: the 'disabled' setting is set to true.")
      return false
    }

    if (!isInBrowser()) {
      this.debug('Tracking disabled: script does not run in browser environment.')
      return false
    }

    if (this.options?.respectDNT && window.navigator?.doNotTrack === '1') {
      this.debug("Tracking disabled: respecting user's 'Do Not Track' preference.")
      return false
    }

    if (!this.options?.debug && isLocalhost()) {
      return false
    }

    if (isAutomated()) {
      this.debug('Tracking disabled: navigation is automated by WebDriver.')
      return false
    }

    return true
  }

  private sendRequest(path: string, body: object): void {
    const host = this.options?.apiURL || DEFAULT_API_HOST
    const req = new XMLHttpRequest()
    req.open('POST', `${host}/${path}`, true)
    req.setRequestHeader('Content-Type', 'application/json')
    req.send(JSON.stringify(body))
  }
}
