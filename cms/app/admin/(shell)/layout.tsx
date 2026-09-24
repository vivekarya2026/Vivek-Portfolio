import { AdminShell } from "@/components/admin/admin-shell";
import { createSessionClient } from "@/lib/appwrite/server";
import { redirect } from "next/navigation";

export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let email = "";
  try {
    const { account } = await createSessionClient();
    const user = await account.get();
    email = user.email;
  } catch {
    redirect("/admin/login");
  }

  return <AdminShell email={email || "Admin"}>{children}</AdminShell>;
}
