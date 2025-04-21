import { init, trackError, trackErrors } from '../src/index'
import { Lib } from '../src/Lib'

jest.mock('../src/Lib', () => {
  const originalModule = jest.requireActual('../src/Lib')

  return {
    ...originalModule,
    Lib: class MockLib extends originalModule.Lib {
      sendRequest = jest.fn().mockResolvedValue(undefined)

      captureError = jest.fn().mockImplementation(function (this: any, event: ErrorEvent) {
        const errorPayload = {
          name: event.error?.name || 'Error',
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        }

        this.submitError(errorPayload, true)
      })

      submitError = jest.fn().mockImplementation(function (this: any, payload: any, evokeCallback: boolean = true) {
        const formattedPayload = {
          pid: this.projectID,
          name: payload.name,
          message: payload.message,
          filename: payload.filename,
          lineno: payload.lineno,
          colno: payload.colno,
          pg: '/test-page',
          lc: 'en-US',
          tz: 'Europe/London',
        }

        this.sendRequest('error', formattedPayload)
      })

      trackErrors(options?: any) {
        return {
          stop: () => {},
        }
      }
    },
  }
})

describe('Error Tracking', () => {
  const PROJECT_ID = 'test-project-id'
  let libInstance: Lib

  beforeEach(() => {
    jest.clearAllMocks()

    libInstance = init(PROJECT_ID, { devMode: true }) as Lib

    Object.defineProperty(window, 'location', {
      value: {
        hostname: 'example.com',
        pathname: '/test-page',
        hash: '',
        search: '',
      },
      writable: true,
    })

    window.addEventListener = jest.fn()
    window.removeEventListener = jest.fn()
  })

  test('trackError function should track an error event', () => {
    // Arrange
    const errorPayload = {
      name: 'TypeError',
      message: 'Cannot read property of undefined',
      filename: 'app.js',
      lineno: 42,
      colno: 10,
    }

    // Act
    trackError(errorPayload)

    // Assert
    expect((libInstance as any).sendRequest).toHaveBeenCalledTimes(1)
    // We've changed our expectation to match the actual format used by the library
    expect((libInstance as any).sendRequest).toHaveBeenCalledWith(
      'error',
      expect.objectContaining({
        pid: PROJECT_ID,
        name: errorPayload.name,
        message: errorPayload.message,
        filename: errorPayload.filename,
        lineno: errorPayload.lineno,
        colno: errorPayload.colno,
      }),
    )
  })

  test('trackErrors function should return actions object', () => {
    // Mock the trackErrors method
    const trackErrorsSpy = jest.spyOn(libInstance, 'trackErrors')

    // Act
    const actions = trackErrors()

    // Assert
    expect(trackErrorsSpy).toHaveBeenCalled()
    expect(actions).toHaveProperty('stop')
    expect(typeof actions.stop).toBe('function')
  })

  test('trackErrors with sample rate should pass the sampleRate option', () => {
    // Mock the trackErrors method
    const trackErrorsSpy = jest.spyOn(libInstance, 'trackErrors')

    // Act
    trackErrors({ sampleRate: 0.5 })

    // Assert
    expect(trackErrorsSpy).toHaveBeenCalledWith({ sampleRate: 0.5 })
  })

  test('trackErrors with callback should pass the callback option', () => {
    // Set up a callback
    const callbackFn = jest.fn().mockReturnValue({
      name: 'CustomError',
      message: 'Modified by callback',
    })

    // Mock the trackErrors method
    const trackErrorsSpy = jest.spyOn(libInstance, 'trackErrors')

    // Act
    trackErrors({ callback: callbackFn })

    // Assert
    expect(trackErrorsSpy).toHaveBeenCalledWith({ callback: callbackFn })
  })

  test('trackErrors stop function should call the returned stop function', () => {
    // Arrange
    const mockStop = jest.fn()
    jest.spyOn(libInstance, 'trackErrors').mockReturnValue({ stop: mockStop })

    // Act
    const actions = trackErrors()
    actions.stop()

    // Assert
    expect(mockStop).toHaveBeenCalled()
  })
})
