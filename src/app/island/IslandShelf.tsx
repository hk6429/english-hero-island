"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { microSkillLabel } from "@/features/adventure/content-map";
import styles from "./island.module.css";

export function IslandShelf({
  collectedMicroSkills,
}: {
  collectedMicroSkills: readonly string[];
}) {
  return (
    <section className={`island-shelf ${styles.shelf}`} aria-labelledby="shelf-title">
      <div className="section-heading split-heading">
        <div>
          <p className="eyebrow">我的收藏架</p>
          <h2 id="shelf-title">已經帶回島上的能力卡</h2>
        </div>
        <Link className="text-link" href="/dex">
          查看完整圖鑑
        </Link>
      </div>
      {collectedMicroSkills.length === 0 ? (
        <p className={styles.shelfEmpty}>完成第一個任務，第一張能力卡就會擺上這座展示架。</p>
      ) : (
        <ul className={styles.shelfList} aria-label="已收藏的能力卡">
          {collectedMicroSkills.map((microSkill) => (
            <li key={microSkill} className={styles.shelfItem}>
              <Sparkles aria-hidden="true" size={16} />
              <span>{microSkillLabel(microSkill)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
