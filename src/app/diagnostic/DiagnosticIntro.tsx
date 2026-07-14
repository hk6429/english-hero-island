import { Compass, Lightbulb, MapPinned, ShieldCheck, Sprout } from "lucide-react";
import Link from "next/link";
import styles from "./diagnostic.module.css";

const PROMISES = [
  {
    id: "purpose",
    Icon: MapPinned,
    text: "這是幫你找起點的尋路，不是考試，也沒有分數。",
  },
  {
    id: "shield",
    Icon: ShieldCheck,
    text: "答錯不會扣掉已完成的進度，護盾會先幫你擋著。",
  },
  {
    id: "hint",
    Icon: Lightbulb,
    text: "卡住了就換一個線索再試，提示工具隨時都在。",
  },
] as const;

export function DiagnosticIntro() {
  return (
    <header className={styles.introCard}>
      <div className={styles.introHead}>
        <span className={styles.introIcon} aria-hidden="true">
          <Compass />
        </span>
        <div className={styles.introText}>
          <p className={`eyebrow ${styles.introEyebrow}`}>起點偵測</p>
          <h1 className={styles.introTitle}>五題就好，先看看哪條路最適合你。</h1>
          <p className={styles.introLead}>回答完，能力島就會亮出最適合你的第一個任務。</p>
        </div>
      </div>
      <ul className={styles.promiseList} aria-label="安心約定">
        {PROMISES.map(({ id, Icon, text }) => (
          <li key={id} className={styles.promiseItem}>
            <span className={styles.promiseIcon} aria-hidden="true">
              <Icon />
            </span>
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </header>
  );
}

export function DiagnosticEmptyState() {
  return (
    <div className={`empty-state ${styles.emptyState}`} role="alert">
      <span className={styles.emptyIcon} aria-hidden="true">
        <Sprout />
      </span>
      <h2>診斷題還在準備中</h2>
      <p>
        這個年級的診斷題暫時不足，你的進度沒有被改動。可以先回英雄島首頁逛逛，或請老師幫忙確認題庫。
      </p>
      <Link href="/" className={styles.emptyAction}>
        回英雄島首頁
      </Link>
    </div>
  );
}
