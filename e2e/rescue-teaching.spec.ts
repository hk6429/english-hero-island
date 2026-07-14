import { expect, test, type Page } from "@playwright/test";

async function finishDiagnostic(page: Page): Promise<void> {
  for (let questionNumber = 0; questionNumber < 8; questionNumber += 1) {
    const feedback = page.locator(".feedback-card");
    const availableOptions = page.locator(".answer-option:not([disabled])");
    await expect(availableOptions.first()).toBeVisible();
    await availableOptions.first().click();

    try {
      await feedback.waitFor({ state: "visible", timeout: 1500 });
    } catch {
      await page.locator(".answer-option:not([disabled])").first().click();
    }

    await expect(feedback).toBeVisible();
    const nextAction = feedback.locator(".primary-button");
    const label = (await nextAction.textContent()) ?? "";
    await nextAction.click();
    if (/完成診斷/.test(label)) return;
  }

  throw new Error("Diagnostic did not complete within eight questions");
}

async function answerWrongTwice(page: Page, wrongTexts: readonly [string, string]): Promise<void> {
  await page.getByRole("button", { name: wrongTexts[0], exact: true }).click();
  await page.getByRole("button", { name: wrongTexts[1], exact: true }).click();
  const feedback = page.locator(".feedback-card");
  await expect(feedback).toBeVisible();
  await expect(feedback).not.toContainText(/Game Over|失敗|太慢|你不會/i);
  await feedback.locator(".primary-button").click();
}

test("護盾歸零後出現夥伴救援教學，完成救援題後護盾回到 1 格", async ({ page }) => {
  await page.goto("/start");
  await page.getByRole("radio", { name: /3\s*年級/ }).check();
  await page.getByLabel("英雄暱稱").fill("救援英雄");
  await page.getByRole("button", { name: "進入五題診斷戰" }).click();

  await expect(page).toHaveURL(/\/diagnostic$/);
  await finishDiagnostic(page);
  await expect(page).toHaveURL(/\/island$/);

  await page.getByRole("link", { name: /前往今日任務/ }).click();
  await expect(page).toHaveURL(/\/mission$/);
  await page.getByRole("radio", { name: /穩步橋/ }).click();
  await page.getByRole("radio", { name: /拆字橋/ }).click();
  await page.getByRole("button", { name: /開始練功/ }).click();
  await expect(page).toHaveURL(/\/battle$/);

  await expect(page.getByText("穩步橋・方法步驟 1")).toBeVisible();

  // 三題連續兩次選到不同線索（cvc-decoding 任務題順序固定），讓專注護盾歸零。
  await answerWrongTwice(page, ["mop", "man"]);
  await answerWrongTwice(page, ["pen", "sun"]);
  await answerWrongTwice(page, ["bad", "big"]);

  // 護盾歸零：先出現夥伴救援教學卡，有明確的繼續按鈕。
  await expect(page.getByText("夥伴救援教學")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "夥伴來了，陪你把方法接回來" }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/Game Over|失敗|太慢|你不會|倒數/i);
  await page.getByRole("button", { name: /我準備好了，開始救援任務/ }).click();

  // 救援題答對後：outcome 為夥伴協力成功，護盾回到 1 格。
  const feedback = page.locator(".feedback-card");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (await feedback.isVisible()) break;
    await page
      .locator(".rescue-card .answer-option:not([disabled])")
      .first()
      .click();
  }
  await expect(feedback).toBeVisible();
  await expect(feedback).toContainText("夥伴協力成功：救援任務完成，專注護盾回到 1 格。");
  await feedback.locator(".primary-button").click();

  await expect(page.getByText("護盾 1／3")).toBeVisible();
  await expect(page.getByText(/第 4 題／共 6 題/)).toBeVisible();
});
