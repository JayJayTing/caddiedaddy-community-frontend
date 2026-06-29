/** @type {import('next').NextConfig} */
const nextConfig = {
  // react-leaflet ships ESM; transpile it so Next 14 bundles it cleanly.
  transpilePackages: ['react-leaflet', '@react-leaflet/core'],
}
module.exports = nextConfig
