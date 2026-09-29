import { expect, test } from "@playwright/test";

async function waitForFonts(page: import("@playwright/test").Page) {
  await page.evaluate(() => document.fonts.ready);
}

test.describe("Paper-accurate swap morph", () => {
  test.use({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });

  test("matches the collapsed and zeroed USDC to ETH endpoints", async ({ page }) => {
    await page.goto("/");
    await waitForFonts(page);

    const trigger = page.getByRole("button", { name: "Start a swap" });
    await expect(trigger).toHaveCSS("background-color", "oklch(0.58 0.272 344.873)");
    await expect(trigger).toHaveCSS("border-radius", "12px");
    await expect(trigger).toHaveCSS("font-family", /Open Runde/);
    await expect
      .poll(() =>
        page.locator("html").evaluate((element) =>
          getComputedStyle(element).getPropertyValue("-webkit-font-smoothing"),
        ),
      )
      .toBe("antialiased");
    expect(await trigger.boundingBox()).toEqual({ x: 660, y: 430, width: 120, height: 40 });
    await expect(page).toHaveScreenshot("start.png");

    await trigger.click();
    const form = page.getByRole("form", { name: "Swap assets" });
    const shell = page.getByTestId("swap-shell");
    const amountInput = page.getByRole("textbox", { name: "You pay" });
    await expect(amountInput).toBeFocused();
    await expect(amountInput).toHaveValue("");
    await expect(amountInput).toHaveAttribute("placeholder", "0.00");
    await expect(shell).toHaveAttribute("data-stage", "expanded");
    await expect
      .poll(async () => shell.boundingBox())
      .toEqual({ x: 480, y: 188, width: 480, height: 524 });
    expect(await form.boundingBox()).toEqual({ x: 480, y: 188, width: 480, height: 524 });
    await expect(page.getByRole("form", { name: "Swap assets" })).toHaveCount(1);
    await expect(amountInput).toHaveCSS("font-size", "40px");
    await expect(amountInput).toHaveCSS("font-variant-numeric", "tabular-nums");
    await expect(amountInput).toHaveCSS("box-shadow", "none");
    await expect(page.getByText(/Balance/)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Max" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Select asset" })).toHaveCount(0);
    await expect(page.getByText("USDC", { exact: true })).toBeVisible();
    await expect(page.getByText("ETH", { exact: true })).toBeVisible();
    await expect(page.getByTestId("receive-amount")).toHaveText("0");
    await expect(page.getByTestId("receive-amount")).toHaveCSS(
      "font-variant-numeric",
      "tabular-nums",
    );
    await expect(page.getByTestId("pay-estimate")).toHaveText("≈ $0.00");
    await expect(page.getByTestId("pay-estimate").locator(".dynamic-value")).toHaveCSS(
      "font-variant-numeric",
      "tabular-nums",
    );
    await expect(page.getByTestId("receive-estimate")).toHaveText("≈ $0.00 · estimated");
    await expect(page.getByRole("button", { name: "Prepare swap" })).toBeDisabled();
    await amountInput.evaluate((element) => element.blur());
    await expect(page).toHaveScreenshot("amount.png");
  });

  test("recalculates the Paper values as the amount changes", async ({ page }) => {
    await page.goto("/");
    await waitForFonts(page);
    await page.getByRole("button", { name: "Start a swap" }).click();

    const amountInput = page.getByRole("textbox", { name: "You pay" });
    await expect(amountInput).toBeFocused();
    await amountInput.pressSequentially("2500");
    await expect(amountInput).toHaveValue("2,500");
    await expect(page.getByTestId("swap-shell")).toHaveAttribute("data-stage", "expanded");
    await expect(page.getByTestId("pay-estimate")).toHaveText("≈ $2,500.00");
    await expect(page.getByTestId("receive-amount")).toHaveText("0.6502");
    await expect(page.getByTestId("receive-estimate")).toHaveText("≈ $2,499.38 · estimated");
  });

  test("morphs into the interactive Paper readiness checklist", async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (error) => pageErrors.push(error));
    await page.goto("/");
    await waitForFonts(page);
    await page.getByRole("button", { name: "Start a swap" }).click();

    const amountInput = page.getByRole("textbox", { name: "You pay" });
    await amountInput.fill("5000");
    await page.getByRole("button", { name: "Prepare swap" }).click();

    const shell = page.getByTestId("swap-shell");
    const checklist = page.getByRole("region", { name: "Prepare this swap" });
    await expect(shell).toHaveAttribute("data-stage", "prepare");
    await expect(checklist).toBeFocused();
    await expect(page.locator(".ready-label")).toHaveText("2 of 4 steps");
    await expect(page.getByText("Preparing 5,000 USDC to ETH")).toBeVisible();
    await expect(page.getByText("Estimated receive amount · 1.3004 ETH")).toBeVisible();
    await expect(page.getByText("Connect your wallet")).toBeVisible();
    await expect(page.getByText("Next", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled();
    await expect
      .poll(async () => shell.boundingBox())
      .toEqual({ x: 480, y: 218, width: 480, height: 464 });

    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("button", { name: /Connect your wallet/ })).toHaveAttribute(
      "data-state",
      "loading",
    );
    await expect(page.getByRole("button", { name: "Checking…", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: /Connect your wallet/ })).toHaveAttribute(
      "data-state",
      "complete",
    );
    await expect(page.locator(".ready-label")).toHaveText("3 of 4 steps");

    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("button", { name: /Check balances and fees/ })).toHaveAttribute(
      "data-state",
      "loading",
    );
    await expect(page.locator(".ready-label")).toHaveText("4 of 4 steps");
    await expect(page.locator("canvas.prepare-confetti")).toBeVisible();
    await expect(page.getByText(/Wallet connected ·/)).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test("continues from the connected wallet through the receipt", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Start a swap" }).click();
    await page.getByRole("textbox", { name: "You pay" }).fill("5000");
    await page.getByRole("button", { name: "Prepare swap" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.locator(".ready-label")).toHaveText("3 of 4 steps");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText(/Wallet connected ·/)).toBeVisible();

    await page.getByRole("button", { name: "Max" }).click();
    await expect(page.getByRole("textbox", { name: "You pay" })).toHaveValue("12,480.32");
    await page.getByRole("textbox", { name: "You pay" }).fill("5000");
    await page.getByRole("button", { name: "Review swap" }).click();
    await expect(page.getByText("1.2939 ETH")).toBeVisible();
    await page.getByRole("button", { name: "Back to swap" }).click();
    await expect(page.getByRole("textbox", { name: "You pay" })).toHaveValue("5,000");
    await page.getByRole("button", { name: "Review swap" }).click();
    await page.getByRole("button", { name: "Continue to approval" }).click();
    await page.getByRole("button", { name: "Approve USDC" }).click();
    await expect(page.locator(".signature-card").first()).toHaveAttribute("data-state", "loading");
    await expect(page.getByRole("button", { name: "Approving…" })).toBeDisabled();
    await expect(page.getByText("Step 2 of 2")).toBeVisible();
    await expect(page.locator(".signature-card").first()).toHaveAttribute("data-state", "done");
    await page.getByRole("button", { name: "Confirm swap" }).click();
    await expect(page.locator(".signature-card").last()).toHaveAttribute("data-state", "loading");
    await expect(page.locator(".signature-card[data-state='done']")).toHaveCount(2);
    await expect(page.getByRole("heading", { name: "Swapping 5,000 USDC to ETH" })).toBeVisible();
    await expect(page.locator(".progress-notice__copy")).toHaveJSProperty("innerText", "You can close this tab.\nThe swap continues without you.");
    await expect(page.locator(".progress-step").nth(1)).toHaveAttribute("data-state", "active");
    await expect(page.locator(".progress-step").nth(2)).toHaveAttribute("data-state", "pending");
    await expect(page.locator(".progress-step").nth(1)).toHaveAttribute("data-state", "done");
    await expect(page.locator(".progress-step").nth(2)).toHaveAttribute("data-state", "active");
    await expect(page.locator(".progress-step[data-state='done']")).toHaveCount(3);
    await expect(page.getByRole("heading", { name: "You now hold 1.3004 ETH" })).toBeVisible();
    await expect(page.getByText("Your wallet · 0x8f3…b21")).toBeVisible();
    await expect(page.locator("canvas.complete-confetti")).toBeVisible();
    await expect(page.getByText("1.3004 ETH", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Make another swap" }).click();
    await expect(page.getByRole("textbox", { name: "You pay" })).toHaveValue("");
  });
});

test.describe("responsive fit", () => {
  test.use({ reducedMotion: "reduce", viewport: { width: 390, height: 844 } });

  test("fits the form inside sixteen-pixel mobile gutters", async ({ page }) => {
    await page.goto("/");
    await waitForFonts(page);
    await page.getByRole("button", { name: "Start a swap" }).click();

    const form = page.getByRole("form", { name: "Swap assets" });
    await expect(page.getByRole("textbox", { name: "You pay" })).toBeFocused();
    await expect
      .poll(async () => form.boundingBox())
      .toEqual({ x: 16, y: 160, width: 358, height: 524 });

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);

    const amountBox = await form.boundingBox();
    expect(amountBox?.x).toBe(16);
    expect(amountBox?.width).toBe(358);
    expect(amountBox?.y).toBeGreaterThanOrEqual(16);
    expect((amountBox?.y ?? 0) + (amountBox?.height ?? 0)).toBeLessThanOrEqual(828);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    ).toBe(0);
  });

  test("fits the readiness checklist inside mobile gutters", async ({ page }) => {
    await page.goto("/");
    await waitForFonts(page);
    await page.getByRole("button", { name: "Start a swap" }).click();
    await page.getByRole("textbox", { name: "You pay" }).fill("5000");
    await page.getByRole("button", { name: "Prepare swap" }).click();

    const checklist = page.getByRole("region", { name: "Prepare this swap" });
    await expect(checklist).toBeFocused();
    await expect
      .poll(async () => {
        const box = await checklist.boundingBox();
        return box ? { x: box.x, width: box.width } : null;
      })
      .toEqual({ x: 16, width: 358 });
    const checklistBox = await checklist.boundingBox();
    expect(checklistBox?.y).toBeGreaterThanOrEqual(16);
    expect((checklistBox?.y ?? 0) + (checklistBox?.height ?? 0)).toBeLessThanOrEqual(828);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    ).toBe(0);
  });
});

test.describe("new screens on a narrow phone", () => {
  test.use({ reducedMotion: "reduce", viewport: { width: 320, height: 700 } });

  test("keeps every stage reachable without horizontal overflow", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Start a swap" }).click();
    await page.getByRole("textbox", { name: "You pay" }).fill("5000");
    await page.getByRole("button", { name: "Prepare swap" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText(/Wallet connected ·/)).toBeVisible();

    const expectFit = async (stage: string) => {
      await expect(page.getByTestId("swap-shell")).toHaveAttribute("data-stage", stage);
      await expect.poll(async () => {
        return page.evaluate(() => {
          const shell = document.querySelector(".morph-shell")?.getBoundingClientRect();
          if (!shell) return false;
          return document.documentElement.scrollWidth === document.documentElement.clientWidth &&
            shell.top >= 15 && shell.bottom <= document.documentElement.scrollHeight - 15;
        });
      }).toBe(true);
    };

    await expectFit("connected");
    await page.getByRole("button", { name: "Review swap" }).click();
    await expectFit("review");
    await page.getByRole("button", { name: "Continue to approval" }).click();
    await expectFit("authorize");
    await page.getByRole("button", { name: "Approve USDC" }).click();
    await page.getByRole("button", { name: "Confirm swap" }).click();
    await expectFit("progress");
    await expect(page.getByRole("heading", { name: "You now hold 1.3004 ETH" })).toBeVisible();
    await expectFit("complete");
  });
});

test.describe("fold-width phone", () => {
  test.use({ reducedMotion: "reduce", viewport: { width: 280, height: 700 } });

  test("shows the full Max amount without horizontal scrolling", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Start a swap" }).click();
    await page.getByRole("textbox", { name: "You pay" }).fill("5000");
    await page.getByRole("button", { name: "Prepare swap" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText(/Wallet connected ·/)).toBeVisible();

    await page.getByRole("button", { name: "Max" }).click();
    const amount = page.getByRole("textbox", { name: "You pay" });
    await expect(amount).toHaveValue("12,480.32");
    expect(await amount.evaluate((input) => input.scrollWidth <= input.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
});

test.describe("full motion", () => {
  test.use({ reducedMotion: "no-preference", viewport: { width: 1440, height: 900 } });

  test("reveals the form from the trigger origin before settling", async ({ page }) => {
    await page.goto("/");
    await waitForFonts(page);

    const shell = page.getByTestId("swap-shell");
    await expect(shell).toHaveAttribute("data-motion", "full");
    await page.getByRole("button", { name: "Start a swap" }).click();

    const originStayedAttached = await page.evaluate(async () => {
      const shellElement = document.querySelector<HTMLElement>("[data-testid='swap-shell']");
      const formElement = document.querySelector<HTMLElement>(".swap-form");

      if (!shellElement || !formElement) return false;

      for (let frame = 0; frame < 12; frame += 1) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        const shellBox = shellElement.getBoundingClientRect();
        const formBox = formElement.getBoundingClientRect();
        const shellCenter = {
          x: shellBox.left + shellBox.width / 2,
          y: shellBox.top + shellBox.height / 2,
        };
        const formCenter = {
          x: formBox.left + formBox.width / 2,
          y: formBox.top + formBox.height / 2,
        };

        if (
          Math.abs(shellCenter.x - formCenter.x) > 1 ||
          Math.abs(shellCenter.y - formCenter.y) > 1
        ) {
          return false;
        }
      }

      return true;
    });

    expect(originStayedAttached).toBe(true);
    await expect(shell).toHaveCSS("overflow", "visible");

    await expect
      .poll(async () => shell.boundingBox())
      .toEqual({ x: 480, y: 188, width: 480, height: 524 });
  });
});
