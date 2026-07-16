/**
 * Ask Vercel to rebuild the public static site from the latest Supabase data.
 *
 * Flow: CMS publish → SITE_DEPLOY_HOOK_URL → Vercel runs `build:site:ci`
 * (reads published projects) → new HTML is live.
 *
 * No-ops locally when the hook URL is unset.
 */
export async function triggerSiteDeploy(reason: string): Promise<void> {
  const url = process.env.SITE_DEPLOY_HOOK_URL?.trim();
  if (!url) {
    if (process.env.NODE_ENV === "development") {
      console.info(
        `[site-deploy] skipped (${reason}) — set SITE_DEPLOY_HOOK_URL to auto-rebuild the public site`,
      );
    }
    return;
  }

  try {
    const res = await fetch(url, { method: "POST" });
    if (!res.ok) {
      console.error(
        `[site-deploy] hook failed (${reason}): ${res.status} ${await res.text()}`,
      );
      return;
    }
    console.info(`[site-deploy] triggered (${reason})`);
  } catch (err) {
    console.error(`[site-deploy] hook error (${reason}):`, err);
  }
}
