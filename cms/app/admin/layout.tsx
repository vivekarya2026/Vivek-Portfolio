import { ToastProvider } from "@/components/ui/toast";

export const metadata = { title: "Portfolio CMS" };

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ToastProvider>{children}</ToastProvider>;
}
