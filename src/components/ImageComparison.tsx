"use client";

import { useState } from "react";

interface ImageComparisonProps {
  originalUrl: string;
  resultUrl: string;
  zoom: number;
}

/**
 * 元画像と透過後画像をスライダーで比較表示するコンポーネント。
 * 透過部分は市松模様（チェッカーボード）で表示され、透過範囲が視認しやすい。
 */
export function ImageComparison({ originalUrl, resultUrl, zoom }: ImageComparisonProps) {
  const [sliderPos, setSliderPos] = useState(50);

  return (
    <div className="w-full">
      <div
        className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-xl bg-checkerboard bg-checker dark:bg-checkerboard-dark"
        style={{ backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px" }}
      >
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
        >
          {/* 透過後画像（全面） */}
          <img
            src={resultUrl}
            alt="透過後"
            className="absolute inset-0 h-full w-full object-contain"
            draggable={false}
          />
          {/* 元画像（スライダー位置までのみ表示） */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
          >
            <img
              src={originalUrl}
              alt="元画像"
              className="absolute inset-0 h-full w-full object-contain"
              draggable={false}
            />
          </div>
        </div>

        {/* スライダーのハンドル線 */}
        <div
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.2)]"
          style={{ left: `${sliderPos}%` }}
        />
      </div>

      <input
        type="range"
        min={0}
        max={100}
        value={sliderPos}
        onChange={(e) => setSliderPos(Number(e.target.value))}
        className="mt-3 w-full max-w-md accent-brand-600"
        aria-label="元画像と透過後画像の比較スライダー"
      />
      <div className="mt-1 flex max-w-md justify-between text-xs text-neutral-500 dark:text-neutral-400">
        <span>元画像</span>
        <span>透過後</span>
      </div>
    </div>
  );
}
