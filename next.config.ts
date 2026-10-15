import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  webpack(config) {
    config.resolve.extensionAlias = { ...config.resolve.extensionAlias, '.js': ['.ts','.tsx','.js'] };
    return config;
  },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
    ] }];
  },
};
export default config;
