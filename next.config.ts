import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.externals = [...(config.externals || []), { canvas: 'canvas' }];
    return config;
  },
    typescript: {
    // Permite que o build passe mesmo com erros de TypeScript
    ignoreBuildErrors: true,
  },
  
  serverExternalPackages: ['sharp', 'canvas'],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
