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
  
  // Configure timeout for Vercel Pro (800 seconds)
  experimental: {
    // Other experimental features can be added here
  },
  
  // API routes configuration
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
