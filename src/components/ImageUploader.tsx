"use client";

import { useCallback, useRef, useState } from "react";

interface ImageUploaderProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function ImageUploader({ onFilesSelected, disabled }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const filterValidFiles = (fileList: FileList | null): File[] => {
    if (!fileList) return [];
    return Array.from(fileList).filter((f) => ACCEPTED_TYPES.includes(f.type));
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const files = filterValidFiles(e.dataTransfer.files);
      if (files.length > 0) onFilesSelected(files);
    },
    [onFilesSelected, disabled]
  );

  return (
    <div className="w-full">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-colors sm:p-12 ${
          isDragging
            ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
            : "border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900"
        } ${disabled ? "pointer-events-none opacity-50" : ""}`}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
          <UploadIcon />
        </div>
        <p className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
          画像をドラッグ＆ドロップ
        </p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          または下のボタンから選択（PNG / JPEG / WebP）
        </p>

        <div className="mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[48px] rounded-xl bg-brand-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition active:scale-95 disabled:opacity-50"
          >
            写真を選択
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => cameraInputRef.current?.click()}
            className="min-h-[48px] rounded-xl border border-neutral-300 bg-white px-6 py-3 text-base font-semibold text-neutral-700 shadow-sm transition active:scale-95 disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
          >
            カメラで撮影
          </button>
        </div>
      </div>

      {/* 通常のファイル選択（複数選択可＝一括処理対応） */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = filterValidFiles(e.target.files);
          if (files.length > 0) onFilesSelected(files);
          e.target.value = "";
        }}
      />

      {/* スマホのカメラを直接起動する入力 */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const files = filterValidFiles(e.target.files);
          if (files.length > 0) onFilesSelected(files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
    >
      <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}
