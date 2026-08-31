import path from 'path';

const nextConfig: import('next').NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname),
  async rewrites() {
    return [
      {
        source: '/desk',
        destination: 'http://127.0.0.1:2027/',
      },
      {
        source: '/desk/:path*',
        destination: 'http://127.0.0.1:2027/:path*',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ]
  },
};

export default nextConfig;
