import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Ignora los errores de ESLint (como variables no usadas o 'any') durante el build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignora los errores de tipos de TypeScript durante el build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;