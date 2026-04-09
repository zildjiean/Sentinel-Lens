import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  experimental: {
    outputFileTracingIncludes: {
      "/api/enterprise-report/\\[id\\]/export": [
        "./node_modules/@sparticuz/chromium/bin/**",
      ],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
