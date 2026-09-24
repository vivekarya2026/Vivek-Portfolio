import { getPostById } from "@/lib/data/posts";
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
  const post = await getPostById(id);
  if (!post) notFound();
  return <PostEditor post={post as Post} />;
}
