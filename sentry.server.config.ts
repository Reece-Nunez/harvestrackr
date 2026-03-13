import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Filter out sensitive data
  beforeSend(event) {
    // Scrub sensitive headers
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["cookie"];
      delete event.request.headers["x-supabase-auth"];
    }

    // Scrub sensitive data from event extras
    if (event.extra) {
      const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'apiKey'];
      Object.keys(event.extra).forEach(key => {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
          event.extra![key] = '[FILTERED]';
        }
      });
    }

    return event;
  },

  // Ignore certain errors that are not actionable
  ignoreErrors: [
    // Database connection issues that are temporary
    "ECONNRESET",
    "ETIMEDOUT",
    // Rate limiting
    "Too Many Requests",
  ],
});
