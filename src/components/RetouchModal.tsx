"use client";

import { useEffect, useRef, useState } from "react";
import { usePreviewBackground, previewBackgroundClassName } from "@/lib/previewBackground";
import { PreviewBackgroundPicker } from "./PreviewBackgroundPicker";

interface RetouchModalProps {
  originalUrl: string;
  resultUrl: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}

type BrushMode = "erase" | "restore";
type Point = { x: number; y: number };

const MAX_HISTORY = 15;
const LOAD_TIMEOUT_MS = 15000;
const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
// 指を置いてからこの時間内に2本目が来たらピンチと判定する（描画は保留する）
const PINCH_DETECT_DELAY_MS = 120;
// この距離以上動いたら、待たずに即座に描画とみなす
const MOVE_COMMIT_THRESHOLD = 8;

/**
 * 透過処理後の画像をブラシで手直しするモーダル。
 * - 「消す」モード: ブラシでなぞった部分を透明にする
 * - 「復元」モード: ブラシでなぞった部分を元画像のピクセルに戻す（透過を取り消す）
 * - 指1本: 描画 / 指2本: つまんで拡大縮小・移動（ピンチズーム＆パン）
 */
export function RetouchModal({ originalUrl, resultUrl, onCancel, onConfirm }: RetouchModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);

  // ピンチズーム・パン用の状態
  const pointersRef = useRef<Map<number, Point>>(new Map());
  const pinchStateRef = useRef<{
    dist: number;
    zoom: number;
    mid: Point;
    pan: Point;
  } | null>(null);

  // 「描画かピンチか」を少し待って判定するための保留状態
  const pendingDrawRef = useRef<{
    pointerId: number;
    timeoutId: number;
    downPos: Point;
  } | null>(null);

  // PC: Altキー押しながらドラッグ／中央ボタンドラッグでの移動用
  const mousePanRef = useRef<{ start: Point; pan: Point } | null>(null);

  const [mode, setMode] = useState<BrushMode>("erase");
  const [brushSize, setBrushSize] = useState(40);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState<Point | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [previewBg, setPreviewBg] = usePreviewBackground();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoadError(null);
      setReady(false);
      try {
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
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setReady(true);
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setLoadError(
            err instanceof Error ? err.message : "画像の読み込みに失敗しました"
          );
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [originalUrl, resultUrl]);

  // PC: マウスホイール／トラックパッドのピンチ操作でカーソル位置を中心に拡大縮小
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const bounds = el.getBoundingClientRect();
      const cursor = { x: e.clientX - bounds.left, y: e.clientY - bounds.top };
      const factor = e.deltaY < 0 ? 1.1 : 0.9;

      setZoom((prevZoom) => {
        const newZoom = Math.min(Math.max(prevZoom * factor, MIN_ZOOM), MAX_ZOOM);
        setPan((prevPan) => {
          const contentX = (cursor.x - prevPan.x) / prevZoom;
          const contentY = (cursor.y - prevPan.y) / prevZoom;
          return {
            x: cursor.x - contentX * newZoom,
            y: cursor.y - contentY * newZoom,
          };
        });
        return newZoom;
      });
    };

    el.addEventListener("wheel", handleWheelNative, { passive: false });
    return () => el.removeEventListener("wheel", handleWheelNative);
  }, []);

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

  const paintLine = (from: Point, to: Point) => {
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const step = Math.max(1, brushSize / 4);
    const steps = Math.max(1, Math.ceil(dist / step));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      paintAt(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
    }
  };

  const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
  const midpoint = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

  /** 保留していた描画を確定する（実際にpushHistory＋描き始めを行う） */
  const commitPendingDraw = (pointerId: number) => {
    if (!pendingDrawRef.current || pendingDrawRef.current.pointerId !== pointerId) return;
    clearTimeout(pendingDrawRef.current.timeoutId);
    pendingDrawRef.current = null;

    // 確定する時点でまだ指1本だけであることを確認（2本目が来ていたら描かない）
    if (pointersRef.current.size !== 1 || !pointersRef.current.has(pointerId)) return;

    const raw = pointersRef.current.get(pointerId)!;
    const pos = getCanvasPos(raw.x, raw.y);
    pushHistory();
    isDrawingRef.current = true;
    lastPointRef.current = pos;
    paintAt(pos.x, pos.y);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // PC: 中央ボタン、またはAltキーを押しながらのドラッグは「移動」として扱う
    if (e.pointerType === "mouse" && (e.button === 1 || e.altKey)) {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      mousePanRef.current = { start: { x: e.clientX, y: e.clientY }, pan };
      return;
    }

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2) {
      // 2本目が来た＝ピンチ確定。保留していた描画開始があればキャンセルする
      if (pendingDrawRef.current) {
        clearTimeout(pendingDrawRef.current.timeoutId);
        pendingDrawRef.current = null;
      }
      isDrawingRef.current = false;
      lastPointRef.current = null;
      const pts = Array.from(pointersRef.current.values());
      pinchStateRef.current = {
        dist: distance(pts[0], pts[1]),
        zoom,
        mid: midpoint(pts[0], pts[1]),
        pan,
      };
      return;
    }

    if (pointersRef.current.size > 2) return; // 3本目以降は無視

    if (!ready) return;

    // すぐには描き始めず、少し待って2本目が来ないか確認する
    const pointerId = e.pointerId;
    const downPos = { x: e.clientX, y: e.clientY };
    const timeoutId = window.setTimeout(() => commitPendingDraw(pointerId), PINCH_DETECT_DELAY_MS);
    pendingDrawRef.current = { pointerId, timeoutId, downPos };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (mousePanRef.current) {
      const dx = e.clientX - mousePanRef.current.start.x;
      const dy = e.clientY - mousePanRef.current.start.y;
      setPan({
        x: mousePanRef.current.pan.x + dx,
        y: mousePanRef.current.pan.y + dy,
      });
      return;
    }

    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // 2本指: ピンチズーム・パン
    if (pointersRef.current.size === 2 && pinchStateRef.current) {
      const pts = Array.from(pointersRef.current.values());
      const newDist = distance(pts[0], pts[1]);
      const newMid = midpoint(pts[0], pts[1]);
      const ratio = newDist / (pinchStateRef.current.dist || 1);
      const newZoom = clamp(pinchStateRef.current.zoom * ratio, MIN_ZOOM, MAX_ZOOM);
      const dx = newMid.x - pinchStateRef.current.mid.x;
      const dy = newMid.y - pinchStateRef.current.mid.y;
      setZoom(newZoom);
      setPan({
        x: pinchStateRef.current.pan.x + dx,
        y: pinchStateRef.current.pan.y + dy,
      });
      return;
    }

    // 保留中に一定以上動いたら、待たずに即座に描画とみなして確定する
    if (
      pendingDrawRef.current &&
      pendingDrawRef.current.pointerId === e.pointerId &&
      pointersRef.current.size === 1
    ) {
      const moved = distance(pendingDrawRef.current.downPos, { x: e.clientX, y: e.clientY });
      if (moved > MOVE_COMMIT_THRESHOLD) {
        commitPendingDraw(e.pointerId);
        const pos = getCanvasPos(e.clientX, e.clientY);
        if (lastPointRef.current) paintLine(lastPointRef.current, pos);
        lastPointRef.current = pos;
      }
    }

    // 1本指: ブラシカーソル表示 ＋ 描画中ならなぞる
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

  const handlePointerUp = (e: React.PointerEvent) => {
    if (mousePanRef.current) {
      mousePanRef.current = null;
      return;
    }

    // ピンチにならないまま指が離れた（＝タップ）場合は、ここで描画を確定させる
    if (
      pendingDrawRef.current &&
      pendingDrawRef.current.pointerId === e.pointerId &&
      pointersRef.current.size === 1
    ) {
      commitPendingDraw(e.pointerId);
    } else if (pendingDrawRef.current && pendingDrawRef.current.pointerId === e.pointerId) {
      clearTimeout(pendingDrawRef.current.timeoutId);
      pendingDrawRef.current = null;
    }

    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) {
      pinchStateRef.current = null;
    }
    if (pointersRef.current.size === 0) {
      isDrawingRef.current = false;
      lastPointRef.current = null;
    }
  };

  const handleConfirm = () => {
    const display = displayCanvasRef.current;
    if (!display) return;
    display.toBlob((blob) => {
      if (blob) onConfirm(blob);
    }, "image/png");
  };

  const handleZoomButton = (delta: number) => {
    setZoom((z) => clamp(z + delta, MIN_ZOOM, MAX_ZOOM));
  };

  const handleZoomReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
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

        {loadError ? (
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
            <p className="font-semibold">画像を読み込めませんでした</p>
            <p className="mt-1 text-xs opacity-80">{loadError}</p>
            <button
              onClick={onCancel}
              className="mt-3 min-h-[40px] rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-700 dark:border-red-700 dark:text-red-200"
            >
              閉じる
            </button>
          </div>
        ) : (
          <>
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

            <div className="mb-2 flex items-center justify-between">
              <PreviewBackgroundPicker value={previewBg} onChange={setPreviewBg} />
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleZoomButton(-0.5)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 text-base dark:border-neutral-600"
                  aria-label="縮小"
                >
                  −
                </button>
                <button
                  onClick={handleZoomReset}
                  className="px-1 text-xs text-neutral-500 dark:text-neutral-400"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  onClick={() => handleZoomButton(0.5)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 text-base dark:border-neutral-600"
                  aria-label="拡大"
                >
                  ＋
                </button>
              </div>
            </div>

            {/* 描画エリア（指1本で描画、指2本でピンチズーム・移動） */}
            <div
              ref={containerRef}
              className={`relative mx-auto touch-none select-none overflow-hidden rounded-lg ${previewBackgroundClassName(
                previewBg
              )}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerLeave={() => setCursorPos(null)}
            >
              <div
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: "0 0",
                }}
              >
                <canvas ref={displayCanvasRef} className="block w-full" />
              </div>
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
                指1本でなぞる／指2本でつまんで拡大縮小・移動（PC: ホイールで拡大縮小、Alt+ドラッグまたは中央ボタンで移動）
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
          </>
        )}
      </div>
    </div>
  );
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timeoutId = setTimeout(() => {
      reject(new Error("画像の読み込みがタイムアウトしました（15秒経過）"));
    }, LOAD_TIMEOUT_MS);

    img.onload = () => {
      clearTimeout(timeoutId);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timeoutId);
      reject(new Error("画像の読み込み中にエラーが発生しました"));
    };
    img.src = url;
  });
}
