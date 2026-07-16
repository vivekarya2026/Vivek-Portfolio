"use client";

import { cn } from "@/lib/cn";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type Toast = { id: number; message: string; kind: "success" | "error" };
type ToastContext = { notify: (message: string, kind?: Toast["kind"]) => void };

const Ctx = createContext<ToastContext | null>(null);

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback(
    (message: string, kind: Toast["kind"] = "success") => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, message, kind }]);
      setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, 3200);
    },
    [],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-5 left-1/2 z-[--z-toast] flex -translate-x-1/2 flex-col items-center gap-2"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-center gap-2 rounded-[--radius-md] border px-4 py-2.5 text-sm shadow-lg backdrop-blur",
              "animate-[toast-in_var(--dur-moderate)_var(--ease-out)]",
              t.kind === "success"
                ? "border-success/30 bg-surface text-ink"
                : "border-danger/40 bg-surface text-ink",
            )}
            role="status"
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                t.kind === "success" ? "bg-success" : "bg-danger",
              )}
              aria-hidden
            />
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
