/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    // 让 server bundle 携带 prompts/ 目录，部署时 fs.readFile 能找到
    outputFileTracingIncludes: {
      "/admin/**": ["./prompts/**/*"],
      "/api/**": ["./prompts/**/*"],
    },
  },
};

export default nextConfig;
