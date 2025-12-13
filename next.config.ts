import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // Ignora los errores de tipos de TypeScript durante el build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;