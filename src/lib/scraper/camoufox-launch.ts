/**
 * Camoufox launch for KSA/SG bank portals (TLS/JA3 fingerprint bypass).
 * Set CAMOUFOX_EXECUTABLE_PATH to the Camoufox binary, or we try npx camoufox.
 */

import type { LaunchOptions } from "playwright";

/**
 * Resolve Camoufox executable path from env or system.
 */
export function getCamoufoxExecutablePath(): string | undefined {
  const fromEnv = process.env.CAMOUFOX_EXECUTABLE_PATH;
  if (fromEnv) return fromEnv;
  return undefined;
}

/**
 * Whether Camoufox is available (path set or installable).
 */
export function isCamoufoxAvailable(): boolean {
  return !!getCamoufoxExecutablePath();
}

/**
 * Merge launch options with Camoufox executablePath when useCamoufox is true.
 * Caller still uses chromium or firefox from Playwright; for true Camoufox you need
 * to launch the Camoufox binary (it may expose a CDP or Playwright-compatible endpoint).
 * Here we set executablePath so Chromium launches the Camoufox Chromium build if path points to it.
 */
export function applyCamoufoxToLaunchOptions(
  options: LaunchOptions,
  useCamoufox: boolean
): LaunchOptions {
  if (!useCamoufox) return options;
  const path = getCamoufoxExecutablePath();
  if (!path) return options;
  return {
    ...options,
    executablePath: path,
    args: [...(options.args ?? []), "--disable-blink-features=AutomationControlled"],
  };
}
