/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), "onnxruntime-node"];
    }
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    if (!isServer) {
      // onnxruntime-web内のファイルが圧縮処理(Terser)でエラーになるため、
      // クライアント向けビルドでは圧縮を無効化する（読み込み速度に若干影響するが動作を優先）
      config.optimization.minimize = false;
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
    ];
  },
};

export default nextConfig;
