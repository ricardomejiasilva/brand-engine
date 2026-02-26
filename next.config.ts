import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.webstaurantstore.com",
      },
    ],
  },
  serverExternalPackages: ["sharp", "@napi-rs/canvas"],
};

export default nextConfig;
