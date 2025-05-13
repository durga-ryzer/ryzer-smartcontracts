/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export', // For static export when building for production
  distDir: 'build', // Change output directory to 'build' instead of '.next'
  
  // Configure async rewrites for development mode
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/api/:path*', // Proxy API requests to backend in dev mode
      },
    ];
  },
};

module.exports = nextConfig;
