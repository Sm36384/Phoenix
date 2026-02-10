/**
 * Launch browser with playwright-extra + puppeteer-extra-plugin-stealth when available.
 * Falls back to plain Playwright + custom evasions if stealth plugin fails.
 */

export type LaunchOptions = {
  headless?: boolean;
  proxy?: { server: string; username?: string; password?: string };
  args?: string[];
  executablePath?: string;
};

/**
 * Try to use playwright-extra with stealth plugin. Returns { browser, context } or null on failure.
 */
export async function launchWithStealth(
  options: LaunchOptions,
  contextOptions?: { userAgent?: string }
): Promise<{ browser: unknown; context: unknown } | null> {
  try {
    const playwrightExtra = (await import("playwright-extra")) as { default?: { chromium?: unknown }; chromium?: unknown };
    const stealth = (await import("puppeteer-extra-plugin-stealth")).default();
    const chromium = playwrightExtra.default?.chromium ?? playwrightExtra.chromium;
    if (!chromium || typeof (chromium as { launch: (o: unknown) => Promise<unknown> }).launch !== "function") return null;
    if (typeof (chromium as { use?: (p: unknown) => void }).use === "function") {
      (chromium as { use: (p: unknown) => void }).use(stealth);
    }
    const browser = await (chromium as { launch: (o: unknown) => Promise<{ newContext: (o: unknown) => Promise<unknown> }> }).launch({
      headless: options.headless ?? true,
      proxy: options.proxy,
      args: options.args ?? ["--disable-blink-features=AutomationControlled"],
      executablePath: options.executablePath,
    });
    const context = await browser.newContext({
      userAgent:
        contextOptions?.userAgent ??
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    return { browser, context };
  } catch {
    return null;
  }
}
