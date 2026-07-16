import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in - Portfolio CMS" };

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
