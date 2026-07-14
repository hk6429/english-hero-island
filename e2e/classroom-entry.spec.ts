import { expect, test, type Page } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test("首頁可進入學生課堂入口，未連線時不顯示假的加入表單", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /學生輸入活動碼/ }).click();

  await expect(page).toHaveURL(/\/join$/);
  await expect(
    page.getByRole("heading", { name: "課堂連線尚未設定" }),
  ).toBeVisible();
  await expect(page.getByLabel("六碼活動代碼")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /加入活動/ })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

test("首頁可進入教師工作區，未連線時不開放建立活動", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /教師工作區/ }).click();

  await expect(page).toHaveURL(/\/teacher$/);
  await expect(
    page.getByRole("heading", { name: "教師課堂後端尚未連線" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /建立活動/ })).toHaveCount(0);
  await expect(page.getByLabel("教師電子郵件")).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

test("首頁可進入題庫複核工作區，未連線時不偽造複核結果", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /題庫複核工作區/ }).click();

  await expect(page).toHaveURL(/\/governance$/);
  await expect(
    page.getByRole("heading", { name: "題庫治理後端尚未連線" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /通過複核/ })).toHaveCount(0);
  await expect(page.getByLabel("複核者電子郵件")).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});
