const STORAGE_KEY = "english-hero-island:sound-enabled";

// 預設關閉：共用教室裝置常被靜音，答對音效第一次出現若沒被期待，
// 對容易緊張的補救學生反而是干擾，寧可讓學生自己選擇打開。
export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
  } catch {
    // 私密瀏覽模式或儲存空間已滿時，安靜放棄即可，不影響其他功能。
  }
}
