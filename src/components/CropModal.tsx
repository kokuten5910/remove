"use client";

import { useEffect, useRef, useState } from "react";

interface CropModalProps {
  imageUrl: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * シンプルな矩形トリミングモーダル。
 * 画像上をドラッグして範囲を選び、「トリミングして保存」で確定します。
 */
export function CropModal({ imageUrl, onCancel, onConfirm }: CropModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    // 画面表示時に前回の選択範囲をリセット
    setRect(null);
  }, [imageUrl]);

  const getRelativePos = (clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const bounds = el.getBoundingClientRect();
    return {
      x: Math.min(Math.max(clientX - bounds.left, 0), bounds.width),
      y: Math.min(Math.max(clientY - bounds.top, 0), bounds.height),
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const pos = getRelativePos(e.clientX, e.clientY);
    setDragStart(pos);
    setRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStart) return;
    const pos = getRelativePos(e.clientX, e.clientY);
    setRect({
      x: Math.min(dragStart.x, pos.x),
      y: Math.min(dragStart.y, pos.y),
      w: Math.abs(pos.x - dragStart.x),
      h: Math.abs(pos.y - dragStart.y),
    });
  };

  const handlePointerUp = () => setDragStart(null);

  const handleConfirm = async () => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container || !rect || rect.w < 4 || rect.h < 4) {
      onCancel();
      return;
    }

    const scaleX = img.naturalWidth / container.clientWidth;
    const scaleY = img.naturalHeight / container.clientHeight;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(rect.w * scaleX);
    canvas.height = Math.round(rect.h * scaleY);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(
      img,
      rect.x * scaleX,
      rect.y * scaleY,
      rect.w * scaleX,
      rect.h * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob((blob) => {
      if (blob) onConfirm(blob);
    }, "image/png");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl dark:bg-neutral-900">
        <h3 className="mb-3 text-base font-semibold text-neutral-800 dark:text-neutral-100">
          トリミング範囲を選択
        </h3>

        <div
          ref={containerRef}
          className="relative mx-auto touch-none select-none overflow-hidden rounded-lg bg-checkerboard bg-checker"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={imageUrl}
            alt="トリミング対象"
            className="block w-full select-none"
            draggable={false}
          />
          {rect && (
            <div
              className="absolute border-2 border-brand-500 bg-brand-500/10"
              style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
            />
          )}
        </div>

        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          画像上をドラッグして範囲を指定してください
        </p>

        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            キャンセル
          </button>
          <button
            onClick={handleConfirm}
            className="min-h-[44px] rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm active:scale-95"
          >
            トリミングして保存
          </button>
        </div>
      </div>
    </div>
  );
}
