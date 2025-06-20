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
  getUTMTerm,
  getUTMContent,
  getPath,
} from './utils.js'

export interface LibOptions {
  /**
   * When set to `true`, localhost events will be sent to server.
   */
  devMode?: boolean

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
    [key: string]: string | number | boolean | null | undefined
  }
}

// Partial user-editable pageview payload
export interface IPageViewPayload {
  lc?: string
  tz?: string
  ref?: string
  so?: string
  me?: string
  ca?: string
  te?: string
  co?: string
  pg?: string | null

  /** Pageview-related metadata object with string values. */
  meta?: {
    [key: string]: string | number | boolean | null | undefined
  }
}

// Partial user-editable error payload
export interface IErrorEventPayload {
  name: string
  message?: string | null
  lineno?: number | null
  colno?: number | null
  filename?: string | null
  stackTrace?: string | null
  meta?: {
    [key: string]: string | number | boolean | null | undefined
  }
}

export interface IInternalErrorEventPayload extends IErrorEventPayload {
  lc?: string
  tz?: string
  pg?: string | null
}

interface IPerfPayload {
  dns: number
  tls: number
  conn: number
  response: number
  render: number
  dom_load: number
  page_load: number
  ttfb: number
}

/**
 * The object returned by `trackPageViews()`, used to stop tracking pages.
 */
export interface PageActions {
  /** Stops the tracking of pages. */
  stop: () => void
}

/**
 * The object returned by `trackErrors()`, used to stop tracking errors.
 */
export interface ErrorActions {
  /** Stops the tracking of errors. */
  stop: () => void
}

export interface PageData {
  /** Current URL path. */
  path: string

  /** The object returned by `trackPageViews()`, used to stop tracking pages. */
  actions: PageActions
}

export interface ErrorOptions {
  /**
   * A number that indicates how many errors should be sent to the server.
   * Accepts values between 0 and 1. For example, if set to 0.5 - only ~50% of errors will be sent to Swetrix.
   * For testing, we recommend setting this value to 1. For production, you should configure it depending on your needs as each error event counts towards your plan.
   *
   * The default value for this option is 1.
   */
  sampleRate?: number

  /**
   * Callback to edit / prevent sending errors.
   *
   * @param payload - The error payload.
   * @returns The edited payload or `false` to prevent sending the error event. If `true` is returned, the payload will be sent as-is.
   */
  callback?: (payload: IInternalErrorEventPayload) => Partial<IInternalErrorEventPayload> | boolean
}

export interface PageViewsOptions {
  /**
   * If set to `true`, only unique events will be saved.
   * This param is useful when tracking single-page landing websites.
   */
  unique?: boolean

  /** Send Heartbeat requests when the website tab is not active in the browser. */
  heartbeatOnBackground?: boolean

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

  /**
   * Callback to edit / prevent sending pageviews.
   *
   * @param payload - The pageview payload.
   * @returns The edited payload or `false` to prevent sending the pageview. If `true` is returned, the payload will be sent as-is.
   */
  callback?: (payload: IPageViewPayload) => Partial<IPageViewPayload> | boolean
}

export const defaultActions = {
  stop() {},
}

const DEFAULT_API_HOST = 'https://api.swetrix.com/log'

export class Lib {
  private pageData: PageData | null = null
  private pageViewsOptions?: PageViewsOptions | null = null
  private errorsOptions?: ErrorOptions | null = null
  private perfStatsCollected: Boolean = false
  private activePage: string | null = null
  private errorListenerExists = false

  constructor(private projectID: string, private options?: LibOptions) {
    this.trackPathChange = this.trackPathChange.bind(this)
    this.heartbeat = this.heartbeat.bind(this)
    this.captureError = this.captureError.bind(this)
  }

  captureError(event: ErrorEvent): void {
    if (typeof this.errorsOptions?.sampleRate === 'number' && this.errorsOptions.sampleRate > Math.random()) {
      return
    }

    this.submitError(
      {
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

        // Stack trace of the error, if available.
        stackTrace: event.error?.stack,
      },
      true,
    )
  }

  trackErrors(options?: ErrorOptions): ErrorActions {
    if (this.errorListenerExists || !this.canTrack()) {
      return defaultActions
    }

    this.errorsOptions = options

    window.addEventListener('error', this.captureError)
    this.errorListenerExists = true

    return {
      stop: () => {
        window.removeEventListener('error', this.captureError)
      },
    }
  }

  submitError(payload: IErrorEventPayload, evokeCallback?: boolean): void {
    const privateData = {
      pid: this.projectID,
    }

    const errorPayload = {
      pg:
        this.activePage ||
        getPath({
          hash: this.pageViewsOptions?.hash,
          search: this.pageViewsOptions?.search,
        }),
      lc: getLocale(),
      tz: getTimezone(),
      ...payload,
    }

    if (evokeCallback && this.errorsOptions?.callback) {
      const callbackResult = this.errorsOptions.callback(errorPayload)

      if (callbackResult === false) {
        return
      }

      if (callbackResult && typeof callbackResult === 'object') {
        Object.assign(errorPayload, callbackResult)
      }
    }

    Object.assign(errorPayload, privateData)

    this.sendRequest('error', errorPayload)
  }

  async track(event: TrackEventOptions): Promise<void> {
    if (!this.canTrack()) {
      return
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
      te: getUTMTerm(),
      co: getUTMContent(),
    }
    await this.sendRequest('custom', data)
  }

  trackPageViews(options?: PageViewsOptions): PageActions {
    if (!this.canTrack()) {
      return defaultActions
    }

    if (this.pageData) {
      return this.pageData.actions
    }

    this.pageViewsOptions = options
    let interval: NodeJS.Timeout

    if (!options?.unique) {
      interval = setInterval(this.trackPathChange, 2000)
    }

    setTimeout(this.heartbeat, 3000)
    const hbInterval = setInterval(this.heartbeat, 28000)

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

  getPerformanceStats(): IPerfPayload | {} {
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

  private trackPage(pg: string, unique: boolean = false): void {
    if (!this.pageData) return
    this.pageData.path = pg

    const perf = this.getPerformanceStats()

    this.activePage = pg
    this.submitPageView({ pg }, unique, perf, true)
  }

  submitPageView(
    payload: Partial<IPageViewPayload>,
    unique: boolean,
    perf: IPerfPayload | {},
    evokeCallback?: boolean,
  ): void {
    const privateData = {
      pid: this.projectID,
      perf,
      unique,
    }

    const pvPayload = {
      lc: getLocale(),
      tz: getTimezone(),
      ref: getReferrer(),
      so: getUTMSource(),
      me: getUTMMedium(),
      ca: getUTMCampaign(),
      te: getUTMTerm(),
      co: getUTMContent(),
      ...payload,
    }

    if (evokeCallback && this.pageViewsOptions?.callback) {
      const callbackResult = this.pageViewsOptions.callback(pvPayload as IPageViewPayload)

      if (callbackResult === false) {
        return
      }

      if (callbackResult && typeof callbackResult === 'object') {
        Object.assign(pvPayload, callbackResult)
      }
    }

    Object.assign(pvPayload, privateData)

    this.sendRequest('', pvPayload)
  }

  private canTrack(): boolean {
    if (
      this.options?.disabled ||
      !isInBrowser() ||
      (this.options?.respectDNT && window.navigator?.doNotTrack === '1') ||
      (!this.options?.devMode && isLocalhost()) ||
      isAutomated()
    ) {
      return false
    }

    return true
  }

  private async sendRequest(path: string, body: object): Promise<void> {
    const host = this.options?.apiURL || DEFAULT_API_HOST
    await fetch(`${host}/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  }
}
