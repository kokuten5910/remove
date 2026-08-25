"use client";

import { useEffect, useState } from "react";

export type PreviewBackground = "checker" | "white" | "gray" | "black" | "green";

const STORAGE_KEY = "bg-remove-app-preview-bg";

/**
 * トリミング・手直し・境界調整などのプレビュー背景色。
 * ユーザーが選んだ色はlocalStorageに保存され、次回以降も引き継がれる。
 */
export function usePreviewBackground(): [PreviewBackground, (v: PreviewBackground) => void] {
  const [bg, setBgState] = useState<PreviewBackground>("checker");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as PreviewBackground | null;
    if (
      saved === "checker" ||
      saved === "white" ||
      saved === "gray" ||
      saved === "black" ||
      saved === "green"
    ) {
      setBgState(saved);
    }
  }, []);

  const setBg = (v: PreviewBackground) => {
    setBgState(v);
    localStorage.setItem(STORAGE_KEY, v);
  };

  return [bg, setBg];
}

/** 背景色の種類に応じたTailwindクラス名を返す */
export function previewBackgroundClassName(bg: PreviewBackground): string {
  switch (bg) {
    case "white":
      return "bg-white";
    case "gray":
      return "bg-neutral-500";
    case "black":
      return "bg-black";
    case "green":
      // 透過部分が一目でわかる蛍光グリーン（クロマキー用途にも近い色）
      return "bg-[#39ff14]";
    case "checker":
    default:
      return "bg-checkerboard bg-checker dark:bg-checkerboard-dark";
  }
}
