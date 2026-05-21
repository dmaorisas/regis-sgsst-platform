/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // pdf-parse uses pdfjs-dist + require('fs') which break under webpack bundling.
  // Marking as external tells Next.js to leave them as native Node.js requires.
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse'],
  },
};

export default nextConfig;
