/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // AIモデルやonnxruntime-webはブラウザ内でのみ実行するため、
  // サーバーサイドバンドルには含めない
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
    return config;
  },
  // SharedArrayBuffer を使った WASM マルチスレッドを有効化するためのヘッダー
  // （対応ブラウザでは処理が高速化されます。未対応でも動作します）
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
