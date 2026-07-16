"use client";

import { Button } from "@/components/ui/button";
import { useTransition } from "react";
import { createCollectionAndEdit } from "./actions";

export function NewCollectionButton() {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      loading={pending}
      onClick={() => start(() => createCollectionAndEdit())}
    >
      New Collection
    </Button>
  );
}
