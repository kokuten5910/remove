/**
 * ブラウザ内で完結する背景透過AIロジック。
 *
 * - すべての推論はブラウザ内（WebGPU優先、なければWASM）で実行され、
 *   画像が外部サーバーへ送信されることはありません。
 * - モデル: briaai/RMBG-1.4 （軽量・高精度・商用利用にも耐えるRMBG系モデル）
 * - 実行エンジン: @huggingface/transformers（旧 @xenova/transformers）+ ONNX Runtime Web
 *
 * モデルファイルは初回のみHugging Face CDNからダウンロードされ、
 * ブラウザのキャッシュ（Cache Storage）に保存されます。
 * 2回目以降はキャッシュから読み込まれるためオフラインでも動作します。
 */

import type { ModelLoadProgress } from "@/types";

// transformers.jsは重いため、実際に使うときだけ動的importする
type Pipeline = any;

let segmenterPromise: Promise<Pipeline> | null = null;

/** モデルの読み込み状況を通知するリスナー */
type ProgressListener = (p: ModelLoadProgress) => void;
const progressListeners = new Set<ProgressListener>();

export function onModelProgress(listener: ProgressListener): () => void {
  progressListeners.add(listener);
  return () => progressListeners.delete(listener);
}

function emitProgress(p: ModelLoadProgress) {
  progressListeners.forEach((l) => l(p));
}

/** WebGPUが使えるかどうかを判定 */
async function detectDevice(): Promise<"webgpu" | "wasm"> {
  try {
    const nav = navigator as unknown as { gpu?: { requestAdapter: () => Promise<unknown> } };
    if (nav.gpu) {
      const adapter = await nav.gpu.requestAdapter();
      if (adapter) return "webgpu";
    }
  } catch {
    // WebGPU非対応 or 取得失敗時はWASMにフォールバック
  }
  return "wasm";
}

/**
 * 背景透過用パイプラインを取得（初回のみモデルをロードし、以降は使い回す）
 */
async function getSegmenter(): Promise<Pipeline> {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");

      // ローカルモデルは使わず、Hugging Face Hubから取得してブラウザにキャッシュする
      env.allowLocalModels = false;
      env.useBrowserCache = true;

      const device = await detectDevice();

      emitProgress({ status: "initiate", progress: 0 });

      const segmenter = await pipeline("background-removal", "briaai/RMBG-1.4", {
        device,
        progress_callback: (p: ModelLoadProgress) => {
          emitProgress(p);
        },
      });

      emitProgress({ status: "ready", progress: 100 });
      return segmenter;
    })();
  }
  return segmenterPromise;
}

/**
 * 事前にモデルをロードしておく（画面表示直後などに呼び出す用）
 */
export function preloadModel(): void {
  getSegmenter().catch((err) => {
    // 事前ロード失敗時は実際の処理時に再度エラーとして扱われる
    console.warn("モデルの事前読み込みに失敗しました", err);
  });
}

export interface RemoveBackgroundResult {
  blob: Blob;
  width: number;
  height: number;
}

/**
 * 画像ファイル（またはURL）から背景を透過し、PNGのBlobを返す
 */
export async function removeBackground(
  input: File | Blob | string,
  onProgress?: (percent: number) => void
): Promise<RemoveBackgroundResult> {
  const segmenter = await getSegmenter();

  const url = typeof input === "string" ? input : URL.createObjectURL(input);

  try {
    onProgress?.(30);

    const output = await segmenter(url);

    onProgress?.(80);

    // transformers.jsのbackground-removalパイプラインはRawImage配列を返す
    const rawImage = Array.isArray(output) ? output[0] : output;

    let canvas: HTMLCanvasElement;

    if (typeof rawImage.toCanvas === "function") {
      // RawImageが持つ変換関数が使える場合はそちらを優先（最も確実）
      canvas = rawImage.toCanvas();
    } else {
      canvas = document.createElement("canvas");
      canvas.width = rawImage.width;
      canvas.height = rawImage.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvasコンテキストの取得に失敗しました");

      // RawImageのチャンネル数に応じてRGBAデータへ変換
      const { data, width, height, channels } = rawImage;
      let rgba: Uint8ClampedArray;
      if (channels === 4) {
        rgba = new Uint8ClampedArray(data);
      } else if (channels === 3) {
        rgba = new Uint8ClampedArray(width * height * 4);
        for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
          rgba[j] = data[i];
          rgba[j + 1] = data[i + 1];
          rgba[j + 2] = data[i + 2];
          rgba[j + 3] = 255;
        }
      } else {
        rgba = new Uint8ClampedArray(data);
      }

      const imageData = new ImageData(rgba, width, height);
      ctx.putImageData(imageData, 0, 0);
    }

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error("PNG変換に失敗しました"));
      }, "image/png");
    });

    onProgress?.(100);

    return { blob, width: canvas.width, height: canvas.height };
  } finally {
    if (typeof input !== "string") {
      URL.revokeObjectURL(url);
    }
  }
}
