/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/si-production',
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: '/si-production',
  },
}

module.exports = nextConfig
