/** @type {import('next').NextConfig} */
const nextConfig = {
    env: {
        VITE_PAYPAL_CLIENT_ID: process.env.VITE_PAYPAL_CLIENT_ID,
        NEXT_PUBLIC_PAYPAL_CLIENT_ID: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**.supabase.co',
            },
        ],
    },
    reactStrictMode: true,
};

module.exports = nextConfig;
