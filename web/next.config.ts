import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'out',
  transpilePackages: ['@chakra-ui/react'],
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
