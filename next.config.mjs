const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy: only this site and the services it actually uses may run
// scripts, load images or receive data. Add a domain here when you add a new tool.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval' " : ""}https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net https://api.trustedform.com https://cdn.trustedform.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${isDev ? "ws: " : ""}https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://www.facebook.com https://connect.facebook.net https://api.trustedform.com https://cert.trustedform.com`,
  "frame-src https://www.googletagmanager.com https://td.doubleclick.net https://www.facebook.com https://www.youtube-nocookie.com https://www.youtube.com",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "worker-src 'self' blob:",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained server in .next/standalone for the Docker image (see Dockerfile).
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          // Forces HTTPS for two years once the site is live on HTTPS. Not sent in development.
          ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
        ],
      },
      // Let browsers and CDNs keep site images for a week instead of re-downloading them.
      // If you replace an image, give the new file a new name so visitors see it straight away.
      ...["/images/:path*", "/brand/:path*"].map((source) => ({
        source,
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      })),
      // Never cache admin pages or private API responses. /api/og (share images) is cached on purpose.
      ...["/admin/:path*", "/api/admin/:path*", "/api/leads/:path*", "/api/vehicles/:path*"].map((source) => ({
        source,
        headers: [{ key: "Cache-Control", value: "no-store" }],
      })),
    ];
  },
};
export default nextConfig;
