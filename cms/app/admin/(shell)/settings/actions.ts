"use server";

import { upsertSetting } from "@/lib/data/settings";
import { triggerSiteDeploy } from "@/lib/trigger-site-deploy";

export type ActionResult = { ok: boolean; error?: string };

export async function saveResumeUrl(url: string | null): Promise<ActionResult> {
  const value = url?.trim() ? url.trim() : null;
  try {
    await upsertSetting("resume_url", value);
    await triggerSiteDeploy("resume-url");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
