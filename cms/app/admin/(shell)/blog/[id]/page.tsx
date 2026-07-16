import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Post } from "@/lib/types";
import { PostEditor } from "./post-editor";

export const dynamic = "force-dynamic";

export default async function PostEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("posts").select("*").eq("id", id).single();
  if (!data) notFound();
  return <PostEditor post={data as Post} />;
}
