"use client";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, type AuthState } from "../auth-actions";

const initial: AuthState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, initial);
  const next = useSearchParams().get("next") ?? "/admin/projects";

  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-5">
      <input type="hidden" name="next" value={next} />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-ink-muted">Manage your portfolio content.</p>
      </div>

      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </Field>

      <Field label="Password" htmlFor="password" error={state.error}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
      </Field>

      <Button type="submit" loading={pending}>
        Sign in
      </Button>
    </form>
  );
}
