"use client";

import { useEffect, useRef, useState } from "react";

interface RetouchModalProps {
  originalUrl: string;
  resultUrl: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}

type BrushMode = "erase" | "restore";

const MAX_HISTORY = 15;

/**
 * 透過処理後の画像をブラシで手直しするモーダル。
 * - 「消す」モード: ブラシでなぞった部分を透明にする
 * - 「復元」モード: ブラシでなぞった部分を元画像のピクセルに戻す（透過を取り消す）
 */
export function RetouchModal({ originalUrl, resultUrl, onCancel, onConfirm }: RetouchModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null); // 画面に表示する作業用canvas
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null); // 元画像（復元の色ソース、非表示）
  const historyRef = useRef<ImageData[]>([]);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const [mode, setMode] = useState<BrushMode>("erase");
  const [brushSize, setBrushSize] = useState(40);
  const [ready, setReady] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [canUndo, setCanUndo] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const [originalImg, resultImg] = await Promise.all([
        loadImage(originalUrl),
        loadImage(resultUrl),
      ]);
      if (cancelled) return;

      const width = resultImg.naturalWidth;
      const height = resultImg.naturalHeight;

      const display = displayCanvasRef.current;
      if (!display) return;
      display.width = width;
      display.height = height;
      const dctx = display.getContext("2d");
      dctx?.drawImage(resultImg, 0, 0, width, height);

      const originalCanvas = document.createElement("canvas");
      originalCanvas.width = width;
      originalCanvas.height = height;
      const octx = originalCanvas.getContext("2d");
      octx?.drawImage(originalImg, 0, 0, width, height);
      originalCanvasRef.current = originalCanvas;

      historyRef.current = [];
      setCanUndo(false);
      setReady(true);
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [originalUrl, resultUrl]);

  const pushHistory = () => {
    const display = displayCanvasRef.current;
    const dctx = display?.getContext("2d");
    if (!display || !dctx) return;
    const snapshot = dctx.getImageData(0, 0, display.width, display.height);
    historyRef.current.push(snapshot);
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
    setCanUndo(true);
  };

  const handleUndo = () => {
    const display = displayCanvasRef.current;
    const dctx = display?.getContext("2d");
    const last = historyRef.current.pop();
    if (!display || !dctx || !last) return;
    dctx.putImageData(last, 0, 0);
    setCanUndo(historyRef.current.length > 0);
  };

  const getCanvasPos = (clientX: number, clientY: number) => {
    const display = displayCanvasRef.current;
    if (!display) return { x: 0, y: 0 };
    const bounds = display.getBoundingClientRect();
    const scaleX = display.width / bounds.width;
    const scaleY = display.height / bounds.height;
    return {
      x: (clientX - bounds.left) * scaleX,
      y: (clientY - bounds.top) * scaleY,
    };
  };

  const paintAt = (x: number, y: number) => {
    const display = displayCanvasRef.current;
    const dctx = display?.getContext("2d");
    const originalCanvas = originalCanvasRef.current;
    if (!display || !dctx || !originalCanvas) return;

    const radius = brushSize / 2;

    dctx.save();
    if (mode === "erase") {
      dctx.globalCompositeOperation = "destination-out";
      dctx.beginPath();
      dctx.arc(x, y, radius, 0, Math.PI * 2);
      dctx.fill();
    } else {
      dctx.globalCompositeOperation = "source-over";
      dctx.beginPath();
      dctx.arc(x, y, radius, 0, Math.PI * 2);
      dctx.clip();
      dctx.drawImage(originalCanvas, 0, 0);
    }
    dctx.restore();
  };

  const paintLine = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const step = Math.max(1, brushSize / 4);
    const steps = Math.max(1, Math.ceil(dist / step));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      paintAt(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!ready) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pushHistory();
    isDrawingRef.current = true;
    const pos = getCanvasPos(e.clientX, e.clientY);
    lastPointRef.current = pos;
    paintAt(pos.x, pos.y);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const containerBounds = containerRef.current?.getBoundingClientRect();
    if (containerBounds) {
      setCursorPos({
        x: e.clientX - containerBounds.left,
        y: e.clientY - containerBounds.top,
      });
    }
    if (!isDrawingRef.current) return;
    const pos = getCanvasPos(e.clientX, e.clientY);
    if (lastPointRef.current) paintLine(lastPointRef.current, pos);
    lastPointRef.current = pos;
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const handleConfirm = () => {
    const display = displayCanvasRef.current;
    if (!display) return;
    display.toBlob((blob) => {
      if (blob) onConfirm(blob);
    }, "image/png");
  };

  const displayBrushSize = (() => {
    const display = displayCanvasRef.current;
    if (!display) return brushSize;
    const bounds = display.getBoundingClientRect();
    if (bounds.width === 0) return brushSize;
    return brushSize * (bounds.width / display.width);
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl dark:bg-neutral-900">
        <h3 className="mb-3 text-base font-semibold text-neutral-800 dark:text-neutral-100">
          透過範囲を手直し
        </h3>

        <div className="mb-3 flex gap-2">
          <button
            onClick={() => setMode("erase")}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${
              mode === "erase"
                ? "bg-brand-600 text-white"
                : "border border-neutral-300 text-neutral-600 dark:border-neutral-600 dark:text-neutral-300"
            }`}
          >
            消す（透過にする）
          </button>
          <button
            onClick={() => setMode("restore")}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${
              mode === "restore"
                ? "bg-brand-600 text-white"
                : "border border-neutral-300 text-neutral-600 dark:border-neutral-600 dark:text-neutral-300"
            }`}
          >
            復元する（元に戻す）
          </button>
        </div>

        <div className="mb-3 flex items-center gap-3">
          <span className="w-16 shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
            ブラシサイズ
          </span>
          <input
            type="range"
            min={10}
            max={120}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="flex-1 accent-brand-600"
          />
          <span className="w-8 text-right text-xs text-neutral-500 dark:text-neutral-400">
            {brushSize}
          </span>
        </div>

        <div
          ref={containerRef}
          className="relative mx-auto touch-none select-none overflow-hidden rounded-lg bg-checkerboard bg-checker"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => {
            handlePointerUp();
            setCursorPos(null);
          }}
        >
          <canvas ref={displayCanvasRef} className="block w-full" />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-neutral-900/60">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            </div>
          )}
          {cursorPos && (
            <div
              className={`pointer-events-none absolute rounded-full border-2 ${
                mode === "erase" ? "border-red-500" : "border-green-500"
              }`}
              style={{
                left: cursorPos.x - displayBrushSize / 2,
                top: cursorPos.y - displayBrushSize / 2,
                width: displayBrushSize,
                height: displayBrushSize,
              }}
            />
          )}
        </div>

        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            指やマウスでなぞって調整してください
          </p>
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className="text-xs font-medium text-neutral-500 underline disabled:opacity-30 dark:text-neutral-400"
          >
            一つ戻す
          </button>
        </div>

        <div className="mt-4 flex justify-end gap-3">
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
  );
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
