"use client";

interface ModelLoadingBannerProps {
  status: string;
  percent: number;
}

const STATUS_LABEL: Record<string, string> = {
  idle: "待機中",
  initiate: "AIモデルを準備しています…",
  download: "AIモデルをダウンロード中…",
  progress: "AIモデルをダウンロード中…",
  done: "AIモデルの準備完了",
  ready: "AIモデルの準備完了",
};

export function ModelLoadingBanner({ status, percent }: ModelLoadingBannerProps) {
  if (status === "idle" || status === "ready" || status === "done") return null;

  return (
    <div className="w-full rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-200">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium">{STATUS_LABEL[status] ?? "準備中…"}</span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/70 dark:bg-neutral-800">
        <div
          className="h-full rounded-full bg-brand-500 transition-all duration-300"
          style={{ width: `${Math.max(4, percent)}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-brand-700/80 dark:text-brand-300/80">
        初回のみ数十MBのダウンロードが発生します。次回以降はブラウザにキャッシュされ、オフラインでも動作します。
      </p>
    </div>
  );
}

interface JobProgressBarProps {
  status: string;
  progress: number;
}

const JOB_STATUS_LABEL: Record<string, string> = {
  queued: "待機中",
  "loading-model": "AI準備中",
  processing: "背景を透過中…",
  done: "完了",
  error: "エラー",
};

export function JobProgressBar({ status, progress }: JobProgressBarProps) {
  if (status === "done") return null;
  return (
    <div className="mt-2 w-full">
      <div className="mb-1 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
        <span>{JOB_STATUS_LABEL[status] ?? status}</span>
        {status !== "error" && <span>{progress}%</span>}
      </div>
      {status !== "error" && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-300"
            style={{ width: `${Math.max(4, progress)}%` }}
          />
        </div>
      )}
    </div>
  );
}
