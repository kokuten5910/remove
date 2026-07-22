"use client";

import { useCallback, useRef, useState } from "react";
import type { ImageJob, ModelLoadProgress } from "@/types";
import { onModelProgress, removeBackground } from "@/lib/model";
import { addHistoryItem } from "@/lib/history";

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useBackgroundRemoval() {
  const [jobs, setJobs] = useState<ImageJob[]>([]);
  const [modelStatus, setModelStatus] = useState<string>("idle");
  const [modelPercent, setModelPercent] = useState<number>(0);
  const listenerAttached = useRef(false);

  const attachModelListener = useCallback(() => {
    if (listenerAttached.current) return;
    listenerAttached.current = true;
    onModelProgress((p: ModelLoadProgress) => {
      setModelStatus(p.status);
      if (typeof p.progress === "number") {
        setModelPercent(Math.round(p.progress));
      } else if (p.loaded && p.total) {
        setModelPercent(Math.round((p.loaded / p.total) * 100));
      }
    });
  }, []);

  const updateJob = useCallback((id: string, patch: Partial<ImageJob>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      attachModelListener();

      const id = createId();
      const originalUrl = URL.createObjectURL(file);

      const newJob: ImageJob = {
        id,
        fileName: file.name || "画像",
        status: "loading-model",
        progress: 0,
        originalUrl,
        createdAt: Date.now(),
      };
      setJobs((prev) => [newJob, ...prev]);

      try {
        updateJob(id, { status: "processing", progress: 10 });

        const { blob, width, height } = await removeBackground(file, (percent) => {
          updateJob(id, { progress: percent });
        });

        const resultUrl = URL.createObjectURL(blob);
        updateJob(id, {
          status: "done",
          progress: 100,
          resultUrl,
          width,
          height,
        });

        // 履歴へ保存（サムネイルは縮小して軽量化）
        const thumbnail = await makeThumbnail(blob);
        await addHistoryItem({
          id,
          fileName: newJob.fileName,
          thumbnail,
          resultBlob: blob,
          createdAt: Date.now(),
        });
      } catch (err) {
        console.error(err);
        updateJob(id, {
          status: "error",
          errorMessage:
            err instanceof Error ? err.message : "処理中に不明なエラーが発生しました",
        });
      }
    },
    [attachModelListener, updateJob]
  );

  const processFiles = useCallback(
    async (files: File[]) => {
      // 一括処理: 逐次実行（メモリ負荷とWASMスレッド競合を避けるため）
      for (const file of files) {
        await processFile(file);
      }
    },
    [processFile]
  );

  const setCroppedResult = useCallback(
    (id: string, blob: Blob) => {
      setJobs((prev) => {
        const target = prev.find((j) => j.id === id);
        if (target?.resultUrl) URL.revokeObjectURL(target.resultUrl);
        const newUrl = URL.createObjectURL(blob);
        return prev.map((j) => (j.id === id ? { ...j, resultUrl: newUrl } : j));
      });
    },
    []
  );

  const removeJob = useCallback((id: string) => {
    setJobs((prev) => {
      const target = prev.find((j) => j.id === id);
      if (target) {
        URL.revokeObjectURL(target.originalUrl);
        if (target.resultUrl) URL.revokeObjectURL(target.resultUrl);
      }
      return prev.filter((j) => j.id !== id);
    });
  }, []);

  const clearJobs = useCallback(() => {
    setJobs((prev) => {
      prev.forEach((j) => {
        URL.revokeObjectURL(j.originalUrl);
        if (j.resultUrl) URL.revokeObjectURL(j.resultUrl);
      });
      return [];
    });
  }, []);

  return {
    jobs,
    modelStatus,
    modelPercent,
    processFile,
    processFiles,
    removeJob,
    clearJobs,
    setCroppedResult,
  };
}

async function makeThumbnail(blob: Blob, maxSize = 160): Promise<string> {
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx?.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL("image/png");
}
