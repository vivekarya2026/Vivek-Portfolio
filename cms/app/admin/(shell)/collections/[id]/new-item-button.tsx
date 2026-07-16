"use client";

import { Button } from "@/components/ui/button";
import { useTransition } from "react";
import { createItemAndEdit } from "../actions";

export function NewItemButton({
  collectionId,
  label,
}: {
  collectionId: string;
  label: string;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      loading={pending}
      onClick={() => start(() => createItemAndEdit(collectionId))}
    >
      New {label}
    </Button>
  );
}
