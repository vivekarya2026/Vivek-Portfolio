"use server";

import { createClient } from "@/lib/supabase/server";
import { triggerSiteDeploy } from "@/lib/trigger-site-deploy";

export type ActionResult = { ok: boolean; error?: string };

export async function saveResumeUrl(url: string | null): Promise<ActionResult> {
  const supabase = await createClient();
  const value = url?.trim() ? url.trim() : null;

  const { error } = await supabase
    .from("settings")
    .upsert({ key: "resume_url", value }, { onConflict: "key" });

  if (error) return { ok: false, error: error.message };
  await triggerSiteDeploy("resume-url");
  return { ok: true };
}
