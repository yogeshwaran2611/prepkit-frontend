/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The API is a separate deployable (the brief asks for both to be reachable), so the
  // browser talks to it directly over CORS with a credentialed cookie.
  env: { NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000' },
  eslint: { ignoreDuringBuilds: true },
};
export default nextConfig;
