"use client";

import { ArrowRight, Palette, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { HeroGlyph } from "@/components/adventure/HeroGlyph";
import { AppShell } from "@/components/layout/AppShell";
import type { Grade } from "@/domain/questions/question-schema";
import { useAdventure } from "@/features/adventure/AdventureProvider";
import { HEROES, HERO_ACCENTS } from "@/features/adventure/content-map";
import type { HeroAccent, HeroId } from "@/infrastructure/progress/progress-types";
import styles from "./start.module.css";

const grades: Grade[] = [3, 4, 5, 6];

export default function StartPage() {
  const router = useRouter();
  const { ready, progress, dispatch, reset } = useAdventure();
  const [grade, setGrade] = useState<Grade>(progress.profile?.grade ?? 3);
  const [heroId, setHeroId] = useState<HeroId>(progress.profile?.heroId ?? "wave-scout");
  const [accent, setAccent] = useState<HeroAccent>(progress.profile?.accent ?? "ocean");
  const [nickname, setNickname] = useState(progress.profile?.nickname ?? "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const nicknameInputRef = useRef<HTMLInputElement>(null);

  const selectedHero = HEROES.find((hero) => hero.id === heroId) ?? HEROES[0];
  const selectedAccent = HERO_ACCENTS.find((choice) => choice.id === accent) ?? HERO_ACCENTS[0];
  const previewNickname = nickname.trim().slice(0, 12);

  async function beginAdventure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const safeNickname = nickname.trim().slice(0, 12);

    if (!safeNickname) {
      setError("請先幫英雄取一個暱稱。");
      nicknameInputRef.current?.focus();
      return;
    }

    setSubmitting(true);
    if (progress.profile) {
      await reset();
    }
    dispatch({
      type: "create_profile",
      profile: { nickname: safeNickname, grade, heroId, accent },
    });
    router.push("/diagnostic");
  }

  return (
    <AppShell pageClassName="start-page">
      <main id="main-content" className="page-main narrow-main" tabIndex={-1}>
        <div className="section-heading centered-heading">
          <p className="eyebrow">建立你的冒險檔案</p>
          <h1>選一位英雄，找到今天最適合的起點。</h1>
          <p>四個小步驟、大約一分鐘就完成；接著用五題，讓能力島推薦你的第一個任務。</p>
        </div>

        {!ready ? (
          <p className="loading-state">正在準備英雄名冊……</p>
        ) : (
          <form className="profile-form" onSubmit={beginAdventure} noValidate>
            <div className={styles.previewCard} aria-hidden="true">
              <span className={styles.previewGlyph}>
                <HeroGlyph heroId={heroId} accent={accent} size="large" />
              </span>
              <p className={styles.previewTitle}>你的英雄卡（跟著你的選擇即時更新）</p>
              <p className={styles.previewName}>
                {previewNickname || "還沒取名的英雄"}
              </p>
              <p className={styles.previewMeta}>
                {grade} 年級・{selectedHero.name}｜{selectedHero.title}・{selectedAccent.name}光環
              </p>
            </div>
            <fieldset className="form-section">
              <legend>1. 我現在是幾年級？</legend>
              <div className="grade-grid">
                {grades.map((value) => (
                  <label className={`choice-card grade-card ${grade === value ? "selected" : ""}`} key={value}>
                    <input
                      type="radio"
                      name="grade"
                      value={value}
                      checked={grade === value}
                      onChange={() => setGrade(value)}
                    />
                    <strong>{value}</strong>
                    <span>年級</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="form-section">
              <legend>2. 選擇同行英雄</legend>
              <div className="hero-choice-grid">
                {HEROES.map((hero) => (
                  <label className={`choice-card hero-choice ${heroId === hero.id ? "selected" : ""}`} key={hero.id}>
                    <input
                      type="radio"
                      name="hero"
                      value={hero.id}
                      checked={heroId === hero.id}
                      onChange={() => setHeroId(hero.id)}
                    />
                    <HeroGlyph
                      heroId={hero.id}
                      accent={heroId === hero.id ? accent : "ocean"}
                      size="large"
                    />
                    <strong>{hero.name}</strong>
                    <span>{hero.title}</span>
                    <small>{hero.description}</small>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="form-section">
              <legend>3. 選擇英雄光環</legend>
              <p className="field-intro">
                <Palette aria-hidden="true" />
                光環只改變你的收藏外觀，不影響題目、XP 或能力。
              </p>
              <div className="accent-choice-grid">
                {HERO_ACCENTS.map((choice) => (
                  <label
                    className={`choice-card accent-choice accent-${choice.id} ${accent === choice.id ? "selected" : ""}`}
                    key={choice.id}
                  >
                    <input
                      type="radio"
                      name="accent"
                      value={choice.id}
                      checked={accent === choice.id}
                      onChange={() => setAccent(choice.id)}
                    />
                    <span className="accent-swatch" aria-hidden="true" />
                    <strong>{choice.name}</strong>
                    <small>{choice.description}</small>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="form-section nickname-section">
              <label htmlFor="nickname">4. 英雄暱稱</label>
              <input
                id="nickname"
                name="nickname"
                type="text"
                value={nickname}
                maxLength={12}
                autoComplete="off"
                placeholder="例如：小海星"
                ref={nicknameInputRef}
                aria-invalid={error ? true : undefined}
                aria-describedby="nickname-help nickname-error"
                onChange={(event) => {
                  setNickname(event.target.value);
                  setError("");
                }}
              />
              <p id="nickname-help" className="field-help">
                請不要填真實姓名，最多 12 個字。
              </p>
              <p id="nickname-error" className="field-error" role="alert">
                {error}
              </p>
            </div>

            <button className="primary-button wide-action" type="submit" disabled={submitting}>
              {submitting ? "正在開啟傳送門……" : "進入五題診斷戰"}
              <ArrowRight aria-hidden="true" />
            </button>
            <p className="privacy-note centered-note">
              <ShieldCheck aria-hidden="true" />
              進度只存在這台裝置的瀏覽器，不會建立公開個人資料。
            </p>
          </form>
        )}
      </main>
    </AppShell>
  );
}
