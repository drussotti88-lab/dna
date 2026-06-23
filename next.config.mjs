/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Card art is self-hosted to our Supabase CDN at ingestion (one image path).
    // Remote patterns here cover the transient proxy/fallback case only.
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "images.scrydex.com" },
      { protocol: "https", hostname: "*.scrydex.com" },
    ],
  },
};

export default nextConfig;
