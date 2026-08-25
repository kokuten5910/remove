"use client";

import { useEffect, useRef, useState } from "react";
import { usePreviewBackground, previewBackgroundClassName } from "@/lib/previewBackground";
import { PreviewBackgroundPicker } from "./PreviewBackgroundPicker";

interface EdgeAdjustModalProps {
  resultUrl: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}

const DEFAULT_LOW = 60;
const DEFAULT_HIGH = 200;

/**
 * 背景透過後の境界に残る「もやもや」（半透明のグラデーション部分）を
 * スライダーで調整するモーダル。
 */
export function EdgeAdjustModal({ resultUrl, onCancel, onConfirm }: EdgeAdjustModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalDataRef = useRef<ImageData | null>(null);

  const [lowThreshold, setLowThreshold] = useState(DEFAULT_LOW);
  const [highThreshold, setHighThreshold] = useState(DEFAULT_HIGH);
  const [ready, setReady] = useState(false);
  const [previewBg, setPreviewBg] = usePreviewBackground();

  useEffect(() => {
    let cancelled = false;

    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      originalDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setReady(true);
    };
    img.src = resultUrl;

    return () => {
      cancelled = true;
    };
  }, [resultUrl]);

  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    const original = originalDataRef.current;
    if (!canvas || !original) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const data = new Uint8ClampedArray(original.data);
    for (let i = 3; i < data.length; i += 4) {
      const a = data[i];
      if (a < lowThreshold) {
        data[i] = 0;
      } else if (a > highThreshold) {
        data[i] = 255;
      }
    }
    ctx.putImageData(new ImageData(data, canvas.width, canvas.height), 0, 0);
  }, [lowThreshold, highThreshold, ready]);

  const handleReset = () => {
    setLowThreshold(DEFAULT_LOW);
    setHighThreshold(DEFAULT_HIGH);
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) onConfirm(blob);
    }, "image/png");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl dark:bg-neutral-900">
        <h3 className="mb-1 text-base font-semibold text-neutral-800 dark:text-neutral-100">
          境界を調整
        </h3>
        <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
          輪郭ぎわの半透明部分を、透明・不透明のどちらに寄せるか調整できます
        </p>

        <PreviewBackgroundPicker value={previewBg} onChange={setPreviewBg} />

        <div
          className={`relative mx-auto overflow-hidden rounded-lg ${previewBackgroundClassName(
            previewBg
          )}`}
        >
          <canvas ref={canvasRef} className="block w-full" />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-neutral-900/60">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            </div>
          )}
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-300">
              <span>透明にする強さ（低いしきい値）</span>
              <span>{lowThreshold}</span>
            </div>
            <input
              type="range"
              min={0}
              max={254}
              value={lowThreshold}
              onChange={(e) => {
                const v = Number(e.target.value);
                setLowThreshold(Math.min(v, highThreshold - 1));
              }}
              className="w-full accent-brand-600"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-300">
              <span>不透明にする強さ（高いしきい値）</span>
              <span>{highThreshold}</span>
            </div>
            <input
              type="range"
              min={1}
              max={255}
              value={highThreshold}
              onChange={(e) => {
                const v = Number(e.target.value);
                setHighThreshold(Math.max(v, lowThreshold + 1));
              }}
              className="w-full accent-brand-600"
            />
          </div>

          <p className="text-[11px] leading-relaxed text-neutral-400 dark:text-neutral-500">
            2つの数値の幅を狭めるほど輪郭がくっきりします（イラスト向き）。幅を広げるほど元のなだらかな仕上がりに近づきます（髪の毛など細かい部分がある写真向き）。
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            onClick={handleReset}
            className="text-xs font-medium text-neutral-500 underline dark:text-neutral-400"
          >
            初期値に戻す
          </button>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              キャンセル
            </button>
            <button
              onClick={handleConfirm}
              disabled={!ready}
              className="min-h-[44px] rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm active:scale-95 disabled:opacity-50"
            >
              この内容で保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
