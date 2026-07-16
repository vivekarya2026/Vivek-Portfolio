"use client";

import { Button } from "@/components/ui/button";
import { createCategoryAndEdit } from "./actions";
import { useTransition } from "react";

export function NewCategoryButton() {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      loading={pending}
      onClick={() => start(() => createCategoryAndEdit())}
    >
      New Category
    </Button>
  );
}
