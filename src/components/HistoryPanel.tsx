"use client";

import { useEffect, useState } from "react";
import type { HistoryItem } from "@/types";
import { clearHistory, deleteHistoryItem, getHistoryItems } from "@/lib/history";

export function HistoryPanel() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const refresh = async () => {
    const list = await getHistoryItems();
    setItems(list);
    setLoaded(true);
  };

  useEffect(() => {
    if (open && !loaded) refresh();
  }, [open, loaded]);

  const handleDownload = (item: HistoryItem) => {
    const url = URL.createObjectURL(item.resultBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = toPngName(item.fileName);
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleDelete = async (id: string) => {
    await deleteHistoryItem(id);
    refresh();
  };

  const handleClear = async () => {
    if (!confirm("すべての処理履歴を削除しますか？")) return;
    await clearHistory();
    refresh();
  };

  return (
    <div className="w-full">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
      >
        <span>処理履歴{items.length > 0 ? `（${items.length}件）` : ""}</span>
        <span className={`transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="mt-3 animate-slide-up">
          {items.length === 0 ? (
            <p className="rounded-xl bg-neutral-50 p-4 text-center text-sm text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              まだ履歴がありません
            </p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="group relative overflow-hidden rounded-lg bg-checkerboard bg-checker"
                  >
                    <img
                      src={item.thumbnail}
                      alt={item.fileName}
                      className="aspect-square w-full object-contain"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-100">
                      <button
                        onClick={() => handleDownload(item)}
                        className="rounded-md bg-white px-2 py-1 text-xs font-medium text-neutral-800"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="rounded-md bg-white/90 px-2 py-1 text-xs font-medium text-red-600"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={handleClear}
                className="mt-3 w-full rounded-lg border border-red-200 py-2 text-xs font-medium text-red-600 dark:border-red-900"
              >
                履歴をすべて削除
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function toPngName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "");
  return `${base || "image"}_透過.png`;
}
