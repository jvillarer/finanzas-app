// Configuración de Sentry para el cliente (browser errors)
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 0.1,

  // Sin grabación de sesiones (privacidad del usuario)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
});
