"use client";

import { Button } from "@/components/ui/button";
import { useTransition } from "react";
import { createPostAndEdit } from "./actions";

export function NewPostButton() {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      loading={pending}
      onClick={() => start(() => createPostAndEdit())}
    >
      New Post
    </Button>
  );
}
