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
    await page.getByLabel("英雄暱稱").fill(`測試${grade}`);
    await page.getByRole("button", { name: "進入五題診斷戰" }).click();

    await expect(page).toHaveURL(/\/diagnostic$/);
    await finishBattleSession(page);
    await expect(page).toHaveURL(/\/island$/);
    await expect(page.getByRole("heading", { name: /地圖不是分數表/ })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole("link", { name: /前往今日任務/ }).click();
    await expect(page).toHaveURL(/\/mission$/);
    await page.getByRole("radio", { name: /聲音透鏡/ }).click();
    await page.getByRole("button", { name: /開始練功/ }).click();

    await expect(page).toHaveURL(/\/battle$/);
    await finishBattleSession(page);
    await expect(page).toHaveURL(/\/result$/);
    await expect(page.getByRole("heading", { name: /學習證據/ })).toBeVisible();

    await page.getByRole("button", { name: /安排下一次修煉/ }).click();
    await expect(page).toHaveURL(/\/training$/);
    await expect(page.getByRole("heading", { name: /換一天、換一種題目再確認/ })).toBeVisible();
    await expectNoHorizontalOverflow(page);
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
