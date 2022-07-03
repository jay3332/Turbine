/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  styledComponents: true,
  experimental: {
    images: {
      allowFutureImage: true,
    },
  },
  compiler: {
    styledComponents: true,
  },
}

module.exports = nextConfig
