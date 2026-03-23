/** @type {import('next').NextConfig} */
const useGhBasePath = process.env.USE_GH_BASE_PATH === 'true'
const basePath = useGhBasePath ? '/si-production' : ''

const nextConfig = {
  output: 'export',
  basePath,
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
}

module.exports = nextConfig
