/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Разрешаем оптимизацию изображений из public/photos
    remotePatterns: [],
    // Оптимизация для локальных изображений
    formats: ['image/webp', 'image/avif'],
    // Минимальное качество для оптимизации
    minimumCacheTTL: 60,
  },
}

module.exports = nextConfig



