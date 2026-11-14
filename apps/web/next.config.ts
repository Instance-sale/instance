import path from "node:path";
import dotenv from "dotenv";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Load root .env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });


const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  },

  experimental: {
    // Inline CSS in HTML to reduce render-blocking requests and critical path latency (helps LCP/FCP)
    inlineCss: true,
  },

  images: {
    // Smaller breakpoints so mobile/small viewports get smaller images (reduces over-fetch)
    deviceSizes: [320, 384, 512, 640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Allow our own domains (prod + dev) as absolute URLs in next/image
    domains: ["localhost"],
    remotePatterns: [
      { protocol: "https", hostname: "i.pravatar.cc", pathname: "/**" },
      { protocol: "https", hostname: "*.r2.dev", pathname: "/**" },
    ],
    // Cache optimized images for 1 year
    minimumCacheTTL: 31536000,
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    return [
      {
        // Proxy API routes to NestJS backend, strictly excluding all NextAuth handlers (/api/auth/*) and OpenGraph image routes
        source: '/api/:path((?!auth/(?:signin|signout|callback|session|csrf|providers|_log|error|verify-request)|og).*)',
        destination: `${apiUrl}/api/:path`,
      },
    ];
  },
  async headers() {
    return [
      {
        // Security headers and CORS for all routes
        source: "/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          },
          {
            key: "Access-Control-Allow-Credentials",
            value: "true",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, x-session-token, Cookie, RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Url",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        // Cache static images for 1 year
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Do not cache private tenant analytics in public CDN/proxies
        source: "/api/analytics/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache, no-store, must-revalidate",
          },
        ],
      },
      {
        // Do not index API routes
        source: "/api/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
