// Configuración de Sentry para el servidor (API routes, server components)
// Solo activo si se configura la variable SENTRY_DSN en Vercel
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: !!process.env.SENTRY_DSN,

  // Captura el 10% de trazas de performance (suficiente para detectar lentitud)
  tracesSampleRate: 0.1,

  // Agrupa errores similares para no inundar la bandeja
  environment: process.env.VERCEL_ENV ?? "development",
});
