import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

const WCAG_AA_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function expectNoAutomatedWcagViolations(
  page: Page,
  testInfo: TestInfo,
  stateName: string,
): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_AA_TAGS).analyze();
  await testInfo.attach(`axe-${stateName}-results`, {
    body: JSON.stringify(results, null, 2),
    contentType: "application/json",
  });

  const seriousOrCriticalNeedsReview = results.incomplete.filter((finding) => {
    const isSeriousOrCritical = finding.impact === "serious" || finding.impact === "critical";
    const isGradientContrastIndeterminate =
      finding.id === "color-contrast" &&
      finding.nodes.length > 0 &&
      finding.nodes.every((node) =>
        node.any.some((check) => check.message.includes("background gradient")),
      );

    return isSeriousOrCritical && !isGradientContrastIndeterminate;
  });
  const blockingFindings = [...results.violations, ...seriousOrCriticalNeedsReview];

  expect(blockingFindings, JSON.stringify(blockingFindings, null, 2)).toEqual([]);
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
    const nextAction = feedback.locator(".primary-button");
    const label = (await nextAction.textContent()) ?? "";
    await nextAction.click();

    if (/完成診斷|查看任務結果|查看修煉結果/.test(label)) return;
  }

  throw new Error("Battle session did not complete within eight questions");
}

test("首頁沒有 axe 可偵測的 WCAG 2.2 A／AA 違規", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "把不熟的地方，修成自己的能力島。" }),
  ).toBeVisible();

  await expectNoAutomatedWcagViolations(page, testInfo, "homepage");
});

test("鍵盤使用者可跳到主要內容", async ({ page }) => {
  await page.goto("/");

  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "跳到主要內容" });
  await expect(skipLink).toBeVisible();
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page.locator("main#main-content")).toBeFocused();
});

test("英雄建立表單沒有 axe 可偵測的 WCAG 2.2 A／AA 違規", async ({ page }, testInfo) => {
  await page.goto("/start");
  await expect(page.getByRole("heading", { name: "選一位英雄，找到今天最適合的起點。" })).toBeVisible();

  await expectNoAutomatedWcagViolations(page, testInfo, "start");
});

test("診斷作答與答錯救援沒有 axe 可偵測的 WCAG 2.2 A／AA 違規", async ({ page }, testInfo) => {
  await page.goto("/start");
  await page.getByLabel("英雄暱稱").fill("無障礙英雄");
  await page.getByRole("button", { name: "進入五題診斷戰" }).click();
  await expect(page).toHaveURL(/\/diagnostic$/);
  await expect(page.getByRole("heading", { name: "Which lowercase letter matches G?" })).toBeVisible();
  await expectNoAutomatedWcagViolations(page, testInfo, "diagnostic-question");

  await page.getByRole("button", { name: "q", exact: true }).click();
  await expect(page.getByText(/護盾擋住了這一下/)).toBeVisible();
  await expectNoAutomatedWcagViolations(page, testInfo, "diagnostic-rescue");
});

test("提示與作答回饋出現後保留清楚的鍵盤焦點", async ({ page }) => {
  await page.goto("/start");
  await page.getByLabel("英雄暱稱").fill("鍵盤英雄");
  await page.getByRole("button", { name: "進入五題診斷戰" }).click();

  await page.getByRole("button", { name: "使用提示工具" }).click();
  const hint = page.getByRole("status", { name: "提示內容" });
  await expect(hint).toBeVisible();
  await expect(hint).toBeFocused();

  await page.getByRole("button", { name: "g", exact: true }).click();
  const feedback = page.locator(".feedback-card");
  await expect(feedback).toBeVisible();
  await expect(feedback).toBeFocused();
});

test("學生課堂安全閘門沒有 axe 可偵測的 WCAG 2.2 A／AA 違規", async ({ page }, testInfo) => {
  await page.goto("/join");
  await expect(page.getByRole("heading", { name: "課堂連線尚未設定" })).toBeVisible();

  await expectNoAutomatedWcagViolations(page, testInfo, "student-classroom-gate");
});

test("教師課堂安全閘門沒有 axe 可偵測的 WCAG 2.2 A／AA 違規", async ({ page }, testInfo) => {
  await page.goto("/teacher");
  await expect(page.getByRole("heading", { name: "教師課堂後端尚未連線" })).toBeVisible();

  await expectNoAutomatedWcagViolations(page, testInfo, "teacher-classroom-gate");
});

test("題庫治理安全閘門沒有 axe 可偵測的 WCAG 2.2 A／AA 違規", async ({ page }, testInfo) => {
  await page.goto("/governance");
  await expect(page.getByRole("heading", { name: "題庫治理後端尚未連線" })).toBeVisible();

  await expectNoAutomatedWcagViolations(page, testInfo, "governance-gate");
});

test("學生完整冒險的關鍵互動狀態沒有 axe 可偵測的 WCAG 2.2 A／AA 違規", async ({ page }, testInfo) => {
  await page.goto("/start");
  await page.getByLabel("英雄暱稱").fill("無障礙旅人");
  await page.getByRole("button", { name: "進入五題診斷戰" }).click();
  await finishBattleSession(page);

  await expect(page).toHaveURL(/\/island$/);
  await expectNoAutomatedWcagViolations(page, testInfo, "ability-island");

  await page.getByRole("link", { name: /前往今日任務/ }).click();
  const steadyRoute = page.getByRole("radio", { name: /穩步橋/ });
  const storyRoute = page.getByRole("radio", { name: /探索徑/ });
  await steadyRoute.focus();
  await page.keyboard.press("ArrowRight");
  await expect(storyRoute).toBeChecked();
  await expect(storyRoute).toBeFocused();

  const soundTool = page.getByRole("radio", { name: /聲音透鏡/ });
  const exampleTool = page.getByRole("radio", { name: /例句卡/ });
  await soundTool.focus();
  await page.keyboard.press("End");
  await expect(exampleTool).toBeChecked();
  await page.keyboard.press("Home");
  await expect(soundTool).toBeChecked();
  await expect(soundTool).toBeFocused();
  await expectNoAutomatedWcagViolations(page, testInfo, "mission-choices");
  await page.getByRole("button", { name: /開始練功/ }).click();

  await page.getByRole("button", { name: "使用提示工具" }).click();
  await expect(page.getByRole("status", { name: "提示內容" })).toBeVisible();
  await expectNoAutomatedWcagViolations(page, testInfo, "battle-hint");
  await finishBattleSession(page);

  await expect(page).toHaveURL(/\/result$/);
  await expectNoAutomatedWcagViolations(page, testInfo, "mission-result");
  await page.getByRole("button", { name: "封存我的方法，交給下一位" }).click();
  await page.getByRole("button", { name: "我是下一位學伴，打開方法" }).click();
  await page.getByRole("radio", { name: "下一題先找一個關鍵線索" }).check();
  const replyButton = page.getByRole("button", { name: "回傳我的用法，完成共同修復" });
  await expect(replyButton).toBeEnabled();
  await expectNoAutomatedWcagViolations(page, testInfo, "partner-strategy-reply");
  await page.getByRole("button", { name: "回傳我的用法，完成共同修復" }).click();

  await page.getByRole("button", { name: /安排下一次修煉/ }).click();
  await expectNoAutomatedWcagViolations(page, testInfo, "review-schedule");
  await page.getByRole("button", { name: /回能力島/ }).click();
  await page.getByRole("link", { name: /進入星光秘境/ }).click();
  await expectNoAutomatedWcagViolations(page, testInfo, "secret-before-reveal");
  await page.locator(".discovery-choice").first().click();
  await expectNoAutomatedWcagViolations(page, testInfo, "secret-after-reveal");
  await page.getByRole("link", { name: "查看探索收藏" }).click();
  await expectNoAutomatedWcagViolations(page, testInfo, "ability-dex");
});
