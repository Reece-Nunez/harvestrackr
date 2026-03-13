import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Enable Session Replay for error sessions
  replaysOnErrorSampleRate: 1.0,

  // Sample rate for general session recording (not just errors)
  replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,

  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration
      maskAllText: false,
      blockAllMedia: false,
      // Mask sensitive inputs like passwords
      maskAllInputs: true,
    }),
    Sentry.browserTracingIntegration(),
  ],

  // Filter out sensitive data
  beforeSend(event) {
    // Scrub sensitive data from error events
    if (event.request?.headers) {
      delete event.request.headers["Authorization"];
      delete event.request.headers["Cookie"];
    }

    // Scrub passwords and tokens from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
        if (breadcrumb.data) {
          const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth'];
          Object.keys(breadcrumb.data).forEach(key => {
            if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
              breadcrumb.data![key] = '[FILTERED]';
            }
          });
        }
        return breadcrumb;
      });
    }

    return event;
  },

  // Ignore certain errors that are not actionable
  ignoreErrors: [
    // Browser extensions
    /extensions\//i,
    /^chrome:\/\//i,
    // Network errors that are expected
    "Network request failed",
    "Failed to fetch",
    "Load failed",
    // User cancellation
    "AbortError",
    "The operation was aborted",
  ],
});
