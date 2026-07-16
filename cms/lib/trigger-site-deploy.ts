/**
 * Ask the public site to rebuild from the latest Supabase data.
 *
 * Supported triggers (first match wins):
 *  1. SITE_DEPLOY_HOOK_URL — Vercel Deploy Hook (needs Git linked on the site project)
 *  2. GITHUB_REBUILD_TOKEN — GitHub repository_dispatch → .github/workflows/rebuild-site.yml
 *
 * No-ops when neither is configured (local dev).
 */

const DEFAULT_REPO = "vivekarya2026/Vivek-Portfolio";

async function triggerDeployHook(url: string, reason: string) {
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) {
    throw new Error(`Deploy hook ${res.status}: ${await res.text()}`);
  }
  console.info(`[site-deploy] deploy-hook ok (${reason})`);
}

async function triggerGithubDispatch(reason: string) {
  const token = process.env.GITHUB_REBUILD_TOKEN?.trim();
  if (!token) return false;

  const repo = process.env.GITHUB_REBUILD_REPO?.trim() || DEFAULT_REPO;
  const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "vivek-portfolio-cms",
    },
    body: JSON.stringify({
      event_type: "cms-publish",
      client_payload: { reason },
    }),
  });

  // GitHub returns 204 No Content on success.
  if (res.status !== 204 && !res.ok) {
    throw new Error(
      `GitHub dispatch ${res.status}: ${await res.text()}`,
    );
  }
  console.info(`[site-deploy] github-dispatch ok (${reason})`);
  return true;
}

export async function triggerSiteDeploy(reason: string): Promise<void> {
  const hook = process.env.SITE_DEPLOY_HOOK_URL?.trim();

  try {
    if (hook) {
      await triggerDeployHook(hook, reason);
      return;
    }
    const dispatched = await triggerGithubDispatch(reason);
    if (dispatched) return;

    if (process.env.NODE_ENV === "development") {
      console.info(
        `[site-deploy] skipped (${reason}) — set SITE_DEPLOY_HOOK_URL or GITHUB_REBUILD_TOKEN`,
      );
    }
  } catch (err) {
    console.error(`[site-deploy] failed (${reason}):`, err);
  }
}
