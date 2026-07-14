import { expect, test, type Page } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

async function finishBattleSession(page: Page): Promise<void> {
  for (let questionNumber = 0; questionNumber < 8; questionNumber += 1) {
    const feedback = page.locator(".feedback-card");
    const availableOptions = page.locator(".answer-option:not([disabled])");
    await expect(availableOptions.first()).toBeVisible();
    if (await page.locator(".boss-badge").isVisible()) {
      await expect(page.locator(".boss-move-card")).toContainText(
        "只改變故事演出；題目、提示與 XP 規則完全相同。",
      );
    }
    await availableOptions.first().click();

    if (!(await feedback.isVisible())) {
      await page.locator(".answer-option:not([disabled])").first().click();
    }

    await expect(feedback).toBeVisible();
    await expect(feedback).not.toContainText(/Game Over|失敗|太慢|你不會/i);

    const nextAction = feedback.locator(".primary-button");
    const label = (await nextAction.textContent()) ?? "";
    await nextAction.click();

    if (/完成診斷|查看任務結果|查看修煉結果/.test(label)) return;
  }

  throw new Error("Battle session did not complete within eight questions");
}

for (const grade of [3, 4, 5, 6] as const) {
  test(`${grade} 年級可走完學生端垂直切片`, async ({ page }) => {
    await page.goto("/start");
    await page.getByRole("radio", { name: new RegExp(`${grade}\\s*年級`) }).check();
    await page.getByRole("radio", { name: /珊瑚橘/ }).check();
    await page.getByLabel("英雄暱稱").fill(`測試${grade}`);
    await page.getByRole("button", { name: "進入五題診斷戰" }).click();

    await expect(page).toHaveURL(/\/diagnostic$/);
    await finishBattleSession(page);
    await expect(page).toHaveURL(/\/island$/);
    await expect(page.getByRole("heading", { name: /地圖不是分數表/ })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole("link", { name: /前往今日任務/ }).click();
    await expect(page).toHaveURL(/\/mission$/);
    await page.getByRole("radio", { name: /探索徑/ }).click();
    await page.getByRole("radio", { name: /聲音透鏡/ }).click();
    await page.getByRole("button", { name: /開始練功/ }).click();

    await expect(page).toHaveURL(/\/battle$/);
    await expect(page.getByText("探索徑・故事線索 1")).toBeVisible();
    await finishBattleSession(page);
    await expect(page).toHaveURL(/\/result$/);
    await expect(page.getByRole("heading", { name: /學習證據/ })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /星光捷徑|共鳴小徑|夥伴營火/ }),
    ).toBeVisible();
    await expect(page.getByLabel(/島嶼亮度 3 格，共完成 1 個學習日/)).toBeVisible();
    await expect(page.locator(".result-hero .hero-accent-coral")).toBeVisible();
    await expect(page.getByRole("button", { name: "分享鼓勵卡" })).toBeVisible();
    await page.getByRole("button", { name: "封存我的方法，交給下一位" }).click();
    await expect(page.getByRole("heading", { name: "請把裝置交給下一位學伴" })).toBeVisible();
    await page.getByRole("button", { name: "我是下一位學伴，打開方法" }).click();
    await expect(page.getByRole("heading", { name: "聲音透鏡" })).toBeVisible();
    await page.getByRole("radio", { name: "下一題先找一個關鍵線索" }).check();
    await page.getByRole("button", { name: "回傳我的用法，完成共同修復" }).click();
    await expect(page.getByRole("heading", { name: "共同修復 +1" })).toBeVisible();
    await expect(page.getByText("下一位學伴的回覆：下一題先找一個關鍵線索")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole("button", { name: /安排下一次修煉/ }).click();
    await expect(page).toHaveURL(/\/training$/);
    await expect(page.getByRole("heading", { name: /換一天、換一種題目再確認/ })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole("button", { name: /回能力島/ }).click();
    await expect(page).toHaveURL(/\/island$/);
    await page.getByRole("link", { name: /進入星光秘境/ }).click();
    await expect(page).toHaveURL(/\/secret$/);
    await expect(page.getByText("可用星鑰 1 把")).toBeVisible();
    await expect(page.getByText("未知星片", { exact: true })).toHaveCount(3);
    await page.locator(".discovery-choice").first().click();
    await expect(page.getByText("已收入探索圖鑑")).toBeVisible();
    await expect(page.getByText("可用星鑰 0 把")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByRole("link", { name: "查看探索收藏" }).click();
    await expect(page).toHaveURL(/\/dex$/);
    await expect(page.getByRole("heading", { name: "星光探索收藏" })).toBeVisible();
    await expect(page.locator(".discovery-entry")).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "真人策略接力" })).toBeVisible();
    await expect(page.locator(".partner-entry")).toHaveCount(1);
    await expect(page.getByText("下一題先找一個關鍵線索", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText("下一題先找一個關鍵線索", { exact: true })).toBeVisible();
  });
}

test("鍵盤答錯後啟動護盾救援，仍可完成作答", async ({ page }) => {
  await page.goto("/start");
  await page.getByRole("radio", { name: /3\s*年級/ }).check();
  await page.getByLabel("英雄暱稱").fill("鍵盤英雄");
  await page.getByRole("button", { name: "進入五題診斷戰" }).click();

  const wrongAnswer = page.getByRole("button", { name: "q", exact: true });
  await wrongAnswer.focus();
  await page.keyboard.press("Enter");

  await expect(page.getByText(/護盾擋住了這一下/)).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/Game Over|失敗|太慢|你不會/i);

  const correctAnswer = page.getByRole("button", { name: "g", exact: true });
  await correctAnswer.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".feedback-card")).toBeVisible();
});
