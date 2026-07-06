/**
 * 処理履歴の保存・取得（IndexedDB使用、すべて端末内に保存され外部送信なし）
 */
import type { HistoryItem } from "@/types";

const DB_NAME = "bg-remove-app";
const STORE_NAME = "history";
const DB_VERSION = 1;
const MAX_HISTORY = 30;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function addHistoryItem(item: HistoryItem): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  await pruneHistory();
}

export async function getHistoryItems(): Promise<HistoryItem[]> {
  const db = await openDB();
  const items = await new Promise<HistoryItem[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as HistoryItem[]);
    req.onerror = () => reject(req.error);
  });
  return items.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteHistoryItem(id: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearHistory(): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** 古い履歴を自動で削除し、件数を一定以下に保つ */
async function pruneHistory(): Promise<void> {
  const items = await getHistoryItems();
  if (items.length <= MAX_HISTORY) return;
  const toRemove = items.slice(MAX_HISTORY);
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  toRemove.forEach((item) => store.delete(item.id));
}
