/** アプリ全体で使う共通の型定義 */

/** 1件の画像処理ジョブの状態 */
export type JobStatus =
  | "queued" // 待機中
  | "loading-model" // AIモデル読み込み中
  | "processing" // 背景透過処理中
  | "done" // 完了
  | "error"; // エラー

/** アップロード〜透過処理までの1ジョブを表す */
export interface ImageJob {
  id: string;
  fileName: string;
  status: JobStatus;
  progress: number; // 0-100
  originalUrl: string; // 元画像のObjectURL
  resultUrl?: string; // 透過後PNGのObjectURL
  errorMessage?: string;
  createdAt: number;
  width?: number;
  height?: number;
}

/** 履歴として保存する1件分のデータ（IndexedDB保存用） */
export interface HistoryItem {
  id: string;
  fileName: string;
  thumbnail: string; // 小さいdataURL（一覧表示用）
  resultBlob: Blob; // 透過後PNGの実データ
  createdAt: number;
}

/** モデル読み込み進捗イベント */
export interface ModelLoadProgress {
  status: string;
  file?: string;
  progress?: number;
  loaded?: number;
  total?: number;
}
