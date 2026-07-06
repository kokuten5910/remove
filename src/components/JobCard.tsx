"use client";

import { useState } from "react";
import type { ImageJob } from "@/types";
import { ImageComparison } from "./ImageComparison";
import { JobProgressBar } from "./ProcessingProgress";
import { CropModal } from "./CropModal";

interface JobCardProps {
  job: ImageJob;
  onRemove: (id: string) => void;
  onCropped: (id: string, blob: Blob) => void;
}

export function JobCard({ job, onRemove, onCropped }: JobCardProps) {
  const [zoom, setZoom] = useState(1);
  const [showCrop, setShowCrop] = useState(false);

  const handleDownload = () => {
    if (!job.resultUrl) return;
    const a = document.createElement("a");
    a.href = job.resultUrl;
    a.download = toPngName(job.fileName);
    a.click();
  };

  return (
    <div className="w-full rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
      <div className="mb-2 flex items-center justify-between">
        <p className="truncate text-sm font-medium text-neutral-700 dark:text-neutral-200">
          {job.fileName}
        </p>
        <button
          onClick={() => onRemove(job.id)}
          aria-label="削除"
          className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
        >
          ✕
        </button>
      </div>

      {job.status === "error" ? (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          <p className="font-semibold">処理に失敗しました</p>
          <p className="mt-1 text-xs opacity-80">{job.errorMessage}</p>
        </div>
      ) : job.status === "done" && job.resultUrl ? (
        <>
          <ImageComparison originalUrl={job.originalUrl} resultUrl={job.resultUrl} zoom={zoom} />

          {/* 拡大縮小コントロール */}
          <div className="mt-3 flex items-center justify-center gap-3">
            <button
              onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 text-lg dark:border-neutral-700"
              aria-label="縮小"
            >
              −
            </button>
            <span className="w-12 text-center text-xs text-neutral-500 dark:text-neutral-400">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 text-lg dark:border-neutral-700"
              aria-label="拡大"
            >
              ＋
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={handleDownload}
              className="min-h-[48px] flex-1 rounded-xl bg-brand-600 px-4 py-3 text-base font-semibold text-white shadow-sm active:scale-95"
            >
              PNGを保存
            </button>
            <button
              onClick={() => setShowCrop(true)}
              className="min-h-[48px] flex-1 rounded-xl border border-neutral-300 px-4 py-3 text-base font-semibold text-neutral-700 dark:border-neutral-600 dark:text-neutral-100"
            >
              トリミング
            </button>
          </div>
        </>
      ) : (
        <div>
          <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-xl bg-checkerboard bg-checker">
            <img
              src={job.originalUrl}
              alt="処理中の画像"
              className="absolute inset-0 h-full w-full object-contain opacity-60"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            </div>
          </div>
          <JobProgressBar status={job.status} progress={job.progress} />
        </div>
      )}

      {showCrop && job.resultUrl && (
        <CropModal
          imageUrl={job.resultUrl}
          onCancel={() => setShowCrop(false)}
          onConfirm={(blob) => {
            onCropped(job.id, blob);
            setShowCrop(false);
          }}
        />
      )}
    </div>
  );
}

function toPngName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "");
  return `${base || "image"}_透過.png`;
}
