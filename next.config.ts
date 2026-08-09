import type { NextConfig } from 'next';
import path from 'path';

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
    reactStrictMode: !isDev,
    images: {
        unoptimized: true,
    },
    productionBrowserSourceMaps: false, // 🚫 Tắt source map khi build

    webpack: (config) => {
        config.resolve.alias['~'] = path.resolve(__dirname, 'src');

        // ✅ Bỏ qua lỗi từ MetaMask (và các extension khác)
        if (isDev) {
            config.ignoreWarnings = [
                ...(config.ignoreWarnings || []),
                /Failed to connect to MetaMask/,
                /chrome-extension/,
            ];
        }

        return config;
    },
};

export default nextConfig;

// import type { NextConfig } from 'next';
// import path from 'path';

// const nextConfig: NextConfig = {
//     // output: 'export', // Comment hoặc xóa dòng này
//     images: {
//         unoptimized: true,
//     },
//     /* config options here */
//     webpack: (config) => {
//         config.resolve.alias['~'] = path.resolve(__dirname, 'src');
//         return config;
//     },
// };

// export default nextConfig;
