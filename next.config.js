/** @type {import('next').NextConfig} */
const { withSentryConfig } = require("@sentry/nextjs");

const nextConfig = {
  // Activa el hook instrumentation.ts para inicializar Sentry en server/edge
  experimental: {
    instrumentationHook: true,
  },

  // PWA headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
        ],
      },
    ];
  },
};

module.exports = withSentryConfig(nextConfig, {
  // Silencia logs de Sentry durante el build
  silent: true,
  disableLogger: true,

  // Sin subida de source maps (no requiere SENTRY_AUTH_TOKEN)
  sourcemaps: {
    disable: true,
  },
});
