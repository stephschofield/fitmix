/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
    NEXT_PUBLIC_SPOTIFY_REDIRECT_URI: process.env.SPOTIFY_REDIRECT_URI
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  }
};

export default nextConfig;
