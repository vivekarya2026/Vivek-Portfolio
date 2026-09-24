import { getSetting } from "@/lib/data/settings";
import { CollectionHeader } from "@/components/admin/collection-chrome";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings - Portfolio CMS" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const resumeUrl = await getSetting("resume_url");

  return (
    <>
      <CollectionHeader title="Settings" />
      <div className="mx-auto max-w-2xl p-5 sm:p-8">
        <SettingsForm initialResumeUrl={resumeUrl} />
      </div>
    </>
  );
}
