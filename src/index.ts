import {
  Lib,
  LibOptions,
  TrackEventOptions,
  PageViewsOptions,
  ErrorOptions,
  PageActions,
  ErrorActions,
  defaultActions,
  IErrorEventPayload,
  IPageViewPayload,
} from './Lib'

export let LIB_INSTANCE: Lib | null = null

/**
 * Initialise the tracking library instance (other methods won't work if the library is not initialised).
 *
 * @param {string} pid The Project ID to link the instance of Swetrix.js to.
 * @param {LibOptions} options Options related to the tracking.
 * @returns {Lib} Instance of the Swetrix.js.
 */
export function init(pid: string, options?: LibOptions): Lib {
  if (!LIB_INSTANCE) {
    LIB_INSTANCE = new Lib(pid, options)
  }

  return LIB_INSTANCE
}

/**
 * With this function you are able to track any custom events you want.
 * You should never send any identifiable data (like User ID, email, session cookie, etc.) as an event name.
 * The total number of track calls and their conversion rate will be saved.
 *
 * @param {TrackEventOptions} event The options related to the custom event.
 */
export async function track(event: TrackEventOptions): Promise<void> {
  if (!LIB_INSTANCE) return

  await LIB_INSTANCE.track(event)
}

/**
 * With this function you are able to automatically track pageviews across your application.
 *
 * @param {PageViewsOptions} options Pageviews tracking options.
 * @returns {PageActions} The actions related to the tracking. Used to stop tracking pages.
 */
export function trackViews(options?: PageViewsOptions): Promise<PageActions> {
  return new Promise((resolve) => {
    if (!LIB_INSTANCE) {
      resolve(defaultActions)
      return
    }

    // We need to verify that document.readyState is complete for the performance stats to be collected correctly.
    if (typeof document === 'undefined' || document.readyState === 'complete') {
      resolve(LIB_INSTANCE.trackPageViews(options))
    } else {
      window.addEventListener('load', () => {
        // @ts-ignore
        resolve(LIB_INSTANCE.trackPageViews(options))
      })
    }
  })
}

/**
 * This function is used to set up automatic error events tracking.
 * It set's up an error listener, and whenever an error happens, it gets tracked.
 *
 * @returns {ErrorActions} The actions related to the tracking. Used to stop tracking errors.
 */
export function trackErrors(options?: ErrorOptions): ErrorActions {
  if (!LIB_INSTANCE) {
    return defaultActions
  }

  return LIB_INSTANCE.trackErrors(options)
}

/**
 * This function is used to manually track an error event.
 * It's useful if you want to track specific errors in your application.
 *
 * @param payload Swetrix error object to send.
 * @returns void
 */
export function trackError(payload: IErrorEventPayload): void {
  if (!LIB_INSTANCE) return

  LIB_INSTANCE.submitError(payload, false)
}

/**
 * This function is used to manually track a page view event.
 * It's useful if your application uses esoteric routing which is not supported by Swetrix by default.
 *
 * @deprecated This function is deprecated and will be removed soon, please use the `pageview` instead.
 * @param pg Path of the page to track (this will be sent to the Swetrix API and displayed in the dashboard).
 * @param prev Path of the previous page.
 * @param unique If set to `true`, only 1 event with the same ID will be saved per user session.
 * @returns void
 */
export function trackPageview(pg: string, prev?: string, unique?: boolean): void {
  if (!LIB_INSTANCE) return

  LIB_INSTANCE.submitPageView({ pg, prev: prev || null }, Boolean(unique), {})
}

export interface IPageviewOptions {
  payload: Partial<IPageViewPayload>
  unique?: boolean
}

export function pageview(options: IPageviewOptions): void {
  if (!LIB_INSTANCE) return

  LIB_INSTANCE.submitPageView(options.payload, Boolean(options.unique), {})
}

export {
  LibOptions,
  TrackEventOptions,
  PageViewsOptions,
  ErrorOptions,
  PageActions,
  ErrorActions,
  IErrorEventPayload,
  IPageViewPayload,
}
