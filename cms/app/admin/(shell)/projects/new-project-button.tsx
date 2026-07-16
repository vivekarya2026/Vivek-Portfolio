"use client";

import { Button } from "@/components/ui/button";
import { useTransition } from "react";
import { createProjectAndEdit } from "./actions";

export function NewProjectButton() {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      loading={pending}
      onClick={() => start(() => createProjectAndEdit())}
    >
      New Project
    </Button>
  );
}
