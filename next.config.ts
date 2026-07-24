import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    '/*': [
      './AgriSense_Tier2_Official_Market_Directory_Sample.zip',
      './AgriSense_Tier2_Market_Intelligence_Rules.zip',
    ],
  },
};

export default nextConfig;
