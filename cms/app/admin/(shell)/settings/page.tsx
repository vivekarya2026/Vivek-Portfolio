import { createClient } from "@/lib/supabase/server";
import { CollectionHeader } from "@/components/admin/collection-chrome";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings - Portfolio CMS" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "resume_url")
    .maybeSingle();

  const resumeUrl = (data?.value as string | null) ?? null;

  return (
    <>
      <CollectionHeader title="Settings" />
      <div className="mx-auto max-w-2xl p-5 sm:p-8">
        <SettingsForm initialResumeUrl={resumeUrl} />
      </div>
    </>
  );
}
