import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/api/stripe/webhook',
        headers: [
          {
            key: 'x-middleware-skip',
            value: '1',
          },
        ],
      },
    ]
  },
};

export default nextConfig;