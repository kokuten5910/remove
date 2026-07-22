"use client";

import { useEffect } from "react";
import { ImageUploader } from "@/components/ImageUploader";
import { JobCard } from "@/components/JobCard";
import { ModelLoadingBanner } from "@/components/ProcessingProgress";
import { HistoryPanel } from "@/components/HistoryPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useBackgroundRemoval } from "@/hooks/useBackgroundRemoval";
import { preloadModel } from "@/lib/model";

export default function Home() {
  const {
    jobs,
    modelStatus,
    modelPercent,
    processFiles,
    removeJob,
    clearJobs,
    setCroppedResult,
  } = useBackgroundRemoval();

  useEffect(() => {
    // ページ表示時にAIモデルの読み込みを開始しておく（体感速度向上のため）
    preloadModel();
  }, []);

  const isBusy = jobs.some(
    (j) => j.status === "processing" || j.status === "loading-model"
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-5 px-4 pb-16 pt-6 sm:px-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
            背景透過ツール
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            画像は端末内で処理され、外部には送信されません
          </p>
        </div>
        <ThemeToggle />
      </header>

      <ModelLoadingBanner status={modelStatus} percent={modelPercent} />

      <ImageUploader onFilesSelected={processFiles} disabled={false} />

      {jobs.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
            処理結果（{jobs.length}件）
          </p>
          <button
            onClick={clearJobs}
            disabled={isBusy}
            className="text-xs font-medium text-neutral-400 hover:text-neutral-600 disabled:opacity-40 dark:hover:text-neutral-200"
          >
            すべてクリア
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} onRemove={removeJob} onCropped={setCroppedResult} />
        ))}
      </div>

      <HistoryPanel />

      <footer className="mt-4 text-center text-[11px] text-neutral-400 dark:text-neutral-600">
        AIモデル: briaai/RMBG-1.4（ブラウザ内実行・完全無料・個人利用専用）
      </footer>
    </main>
  );
}
