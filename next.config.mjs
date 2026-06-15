/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Emit a minimal standalone server bundle for Docker / Fly.io.
  output: "standalone",
};
export default nextConfig;
