/** Value saved in audit_logs.source_platform for an operation done on a PC without Internet. */
export const OFFLINE_DESKTOP_PLATFORM = "desktop-hors-ligne";

export function isOfflineAuditPlatform(platform: string | null | undefined) {
  return platform === OFFLINE_DESKTOP_PLATFORM;
}

/** Platform shown next to the user's name (the offline mark is shown separately). */
export function displayAuditPlatform(platform: string | null | undefined) {
  return isOfflineAuditPlatform(platform) ? "desktop" : platform ?? "";
}

/** True when a sync error means "no Internet" rather than a data or account problem. */
export function isNetworkErrorMessage(message: string) {
  return /failed to fetch|fetch failed|networkerror|network request|load failed|timed? ?out|enotfound|econn|eai_again|internet|hors ligne/i.test(
    message
  );
}
