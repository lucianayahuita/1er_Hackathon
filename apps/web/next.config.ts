import type { NextConfig } from "next";

/**
 * API Gateway (BFF): el navegador solo habla con :3000 y Next.js
 * enruta cada prefijo a su microservicio. Sin CORS, un único punto de entrada.
 */
const services: Record<string, string> = {
  m1: process.env.MS_MODULO1_URL ?? "http://localhost:3001",
  m2: process.env.MS_MODULO2_URL ?? "http://localhost:3002",
  m3: process.env.MS_MODULO3_URL ?? "http://localhost:3003",
  m4: process.env.MS_MODULO4_URL ?? "http://localhost:3004",
};

const nextConfig: NextConfig = {
  async rewrites() {
    return Object.entries(services).map(([prefix, url]) => ({
      source: `/api/${prefix}/:path*`,
      destination: `${url}/:path*`,
    }));
  },
};

export default nextConfig;
