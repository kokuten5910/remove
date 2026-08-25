"use client";

import type { PreviewBackground } from "@/lib/previewBackground";

interface PreviewBackgroundPickerProps {
  value: PreviewBackground;
  onChange: (v: PreviewBackground) => void;
}

const OPTIONS: { value: PreviewBackground; label: string; swatchClass: string }[] = [
  { value: "checker", label: "市松模様", swatchClass: "bg-checkerboard bg-checker" },
  { value: "white", label: "白背景", swatchClass: "bg-white border border-neutral-300" },
  { value: "gray", label: "グレー背景", swatchClass: "bg-neutral-500" },
  { value: "black", label: "黒背景", swatchClass: "bg-black" },
];

/**
 * プレビューの背景色（市松模様／白／グレー／黒）を切り替える小さなスイッチ。
 * イラストの色によって見やすい背景が異なるため、切り替えられるようにしている。
 */
export function PreviewBackgroundPicker({ value, onChange }: PreviewBackgroundPickerProps) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="text-xs text-neutral-500 dark:text-neutral-400">背景色</span>
      <div className="flex gap-1.5">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-label={opt.label}
            title={opt.label}
            className={`h-7 w-7 rounded-full transition ${opt.swatchClass} ${
              value === opt.value
                ? "ring-2 ring-brand-500 ring-offset-2 ring-offset-white dark:ring-offset-neutral-900"
                : ""
            }`}
          />
        ))}
      </div>
    </div>
  );
}
